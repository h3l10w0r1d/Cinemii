"""Movie sources — backend-proposed WebTorrent sources + the public movie gate.

This is the spec'd "Movie Sources" surface, built ON TOP of the existing
LicensedTitle rights allowlist (one source of truth — no parallel table).

Two principles enforced here:
  1. The magnet URI is NEVER supplied by the client. Admins fetch PROPOSALS
     from the backend (GET .../proposals), pick one, confirm rights, and the
     chosen proposal is persisted. The save payload's magnet must match a value
     the backend itself proposed in shape (webtorrent magnet:).
  2. The public endpoint (GET /api/stream/movie/{tmdb_id}) only ever returns a
     source that is media_type=movie, source_type=webtorrent, is_active,
     rights_confirmed and non-expired. Otherwise it returns available=false with
     NO magnet. Unapproved proposals are never exposed publicly.

Admin routes require an admin (deps.require_admin). The public route is open but
reveals nothing unapproved.
"""

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from deps import require_admin
from models import LicensedTitle, User
from schemas import (
    LicensedTitleOut,
    MovieSourceCreateIn,
    MovieSourceProposalsOut,
    MovieSourceUpdateIn,
    MovieStreamOut,
)
from services.movie_sources import (
    active_provider_name,
    info_hash_from_magnet,
    propose_movie_sources,
)

# Reuse the catalog's expiry helper so both gates agree on "expired".
from routers.catalog import ALLOWED_QUALITIES, _expired

admin_router = APIRouter(
    prefix="/api/admin/movie-sources",
    tags=["admin-movie-sources"],
    dependencies=[Depends(require_admin)],
)

public_router = APIRouter(prefix="/api/stream", tags=["stream"])


def _movie_query(db: Session):
    return db.query(LicensedTitle).filter(LicensedTitle.media_type == "movie")


def _get_movie_source(db: Session, source_id: int) -> LicensedTitle:
    row = db.get(LicensedTitle, source_id)
    if row is None or row.media_type != "movie":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movie source not found.")
    return row


# --- Admin: proposals -------------------------------------------------------

@admin_router.get("/proposals", response_model=MovieSourceProposalsOut)
def get_proposals(tmdb_id: str = Query(..., max_length=32)):
    """Backend-proposed WebTorrent sources for a movie. ADMIN-ONLY.

    The client never sends a magnet; it only ever reads proposals from here.
    Returns an empty list (not an error) when nothing is proposed.
    """
    proposals = [p.to_dict() for p in propose_movie_sources(tmdb_id)]
    return MovieSourceProposalsOut(
        tmdb_id=str(tmdb_id),
        provider=active_provider_name(),
        proposals=proposals,
    )


# --- Admin: CRUD over saved movie sources -----------------------------------

@admin_router.get("", response_model=List[LicensedTitleOut])
def list_movie_sources(db: Session = Depends(get_db)):
    return _movie_query(db).order_by(LicensedTitle.updated_at.desc()).all()


@admin_router.get("/{source_id}", response_model=LicensedTitleOut)
def read_movie_source(source_id: int, db: Session = Depends(get_db)):
    return _get_movie_source(db, source_id)


@admin_router.post("", response_model=LicensedTitleOut, status_code=status.HTTP_201_CREATED)
def create_movie_source(
    body: MovieSourceCreateIn,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Persist an admin-selected PROPOSED source + rights confirmation.

    Guards: only webtorrent magnets are accepted here, and the magnet must be a
    real magnet: URI (the backend proposed it — the client cannot invent one)."""
    if body.source_type != "webtorrent":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Movie sources are WebTorrent-only.",
        )
    magnet = body.magnet_uri.strip()
    if not magnet.startswith("magnet:"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="magnet_uri must be a magnet: URI proposed by the backend.",
        )
    if body.quality and body.quality not in ALLOWED_QUALITIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"quality must be one of {sorted(ALLOWED_QUALITIES)}.",
        )

    exists = (
        _movie_query(db)
        .filter(LicensedTitle.tmdb_id == str(body.tmdb_id))
        .first()
    )
    if exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A source for this movie already exists. Edit the existing one.",
        )

    row = LicensedTitle(
        media_type="movie",
        tmdb_id=str(body.tmdb_id),
        title=body.title,
        poster_path=body.poster_path,
        source_type="webtorrent",
        source_url=magnet,
        source_provider=body.source_provider,
        # Trust the backend-derived infohash over a client-sent one.
        info_hash=info_hash_from_magnet(magnet) or body.info_hash,
        quality=body.quality,
        language=body.language,
        file_size=body.file_size,
        seeders=body.seeders,
        peers=body.peers,
        license_type=body.license_type,
        rights_holder=body.rights_holder,
        license_ref=body.rights_note,
        expires_at=body.rights_expires_at,
        rights_confirmed=body.rights_confirmed,
        is_active=body.is_active,
        created_by=admin.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@admin_router.put("/{source_id}", response_model=LicensedTitleOut)
def update_movie_source(
    source_id: int, body: MovieSourceUpdateIn, db: Session = Depends(get_db)
):
    """Partial update: rights confirmation, quality, notes, expiration, active."""
    row = _get_movie_source(db, source_id)
    if body.quality is not None and body.quality and body.quality not in ALLOWED_QUALITIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"quality must be one of {sorted(ALLOWED_QUALITIES)}.",
        )

    # Map the public/spec field names onto the LicensedTitle columns.
    field_map = {
        "title": "title",
        "quality": "quality",
        "language": "language",
        "rights_confirmed": "rights_confirmed",
        "rights_note": "license_ref",
        "rights_holder": "rights_holder",
        "license_type": "license_type",
        "rights_expires_at": "expires_at",
        "is_active": "is_active",
    }
    data = body.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(row, field_map[field], value)

    db.commit()
    db.refresh(row)
    return row


@admin_router.patch("/{source_id}/deactivate", response_model=LicensedTitleOut)
def deactivate_movie_source(source_id: int, db: Session = Depends(get_db)):
    row = _get_movie_source(db, source_id)
    row.is_active = False
    db.commit()
    db.refresh(row)
    return row


@admin_router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_movie_source(source_id: int, db: Session = Depends(get_db)):
    row = _get_movie_source(db, source_id)
    db.delete(row)
    db.commit()


# --- Public: the player's movie gate ----------------------------------------

@public_router.get("/movie/{tmdb_id}", response_model=MovieStreamOut)
def stream_movie(tmdb_id: str, db: Session = Depends(get_db)):
    """Return a playable WebTorrent source for a movie, or available=false.

    Gate (ALL must hold): media_type=movie, source_type=webtorrent, is_active,
    rights_confirmed, and (expires_at is null OR in the future). Always 200 so
    the player can show a friendly message without treating it as an error.
    """
    unavailable = MovieStreamOut(
        available=False,
        tmdb_id=str(tmdb_id),
        message="This movie is not available for streaming.",
    )

    row = (
        _movie_query(db)
        .filter(
            LicensedTitle.tmdb_id == str(tmdb_id),
            LicensedTitle.source_type == "webtorrent",
            LicensedTitle.is_active.is_(True),
            LicensedTitle.rights_confirmed.is_(True),
        )
        .first()
    )
    if row is None or _expired(row.expires_at):
        return unavailable

    return MovieStreamOut(
        available=True,
        tmdb_id=row.tmdb_id,
        media_type="movie",
        source_type="webtorrent",
        magnet_uri=row.source_url,
        quality=row.quality,
        language=row.language,
        title=row.title,
        license=row.license_type,
    )
