"""Licensing CMS — admin CRUD over licensed titles + the public source gate.

This is the rights allowlist. Playback is gated here: the public
GET /api/stream/source/{tmdb_id} endpoint returns a playable source ONLY when
an active, non-expired licensed_titles row exists for the requested title.
There is no fallback to unlicensed content.

Admin endpoints are guarded by deps.require_admin. The source endpoint is
public (the player calls it before playing) but only ever reveals authorized
sources.
"""

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from deps import require_admin
from models import LicensedTitle
from schemas import LicensedTitleIn, LicensedTitleOut, StreamSourceOut

ALLOWED_SOURCE_TYPES = {"webtorrent", "mp4", "hls", "file"}

# Admin CMS — every route requires an admin.
admin_router = APIRouter(
    prefix="/api/admin/catalog",
    tags=["admin-catalog"],
    dependencies=[Depends(require_admin)],
)

# Public — the player's authorization check.
public_router = APIRouter(prefix="/api/stream", tags=["stream"])


def _validate_payload(body: LicensedTitleIn) -> None:
    if body.source_type not in ALLOWED_SOURCE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"source_type must be one of {sorted(ALLOWED_SOURCE_TYPES)}.",
        )
    url = body.source_url.strip()
    if body.source_type == "webtorrent" and not url.startswith("magnet:"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="webtorrent source_url must be a magnet: URI.",
        )
    if body.source_type in ("mp4", "hls") and not url.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{body.source_type} source_url must be an http(s) URL.",
        )


def _apply(row: LicensedTitle, body: LicensedTitleIn) -> None:
    for field, value in body.model_dump().items():
        setattr(row, field, value)
    row.tmdb_id = str(row.tmdb_id)
    row.source_url = body.source_url.strip()


# --- Admin CRUD -------------------------------------------------------------

@admin_router.get("", response_model=List[LicensedTitleOut])
def list_titles(db: Session = Depends(get_db)):
    return (
        db.query(LicensedTitle)
        .order_by(LicensedTitle.updated_at.desc())
        .all()
    )


@admin_router.post("", response_model=LicensedTitleOut, status_code=status.HTTP_201_CREATED)
def create_title(body: LicensedTitleIn, db: Session = Depends(get_db)):
    _validate_payload(body)
    exists = (
        db.query(LicensedTitle)
        .filter(
            LicensedTitle.media_type == body.media_type,
            LicensedTitle.tmdb_id == str(body.tmdb_id),
        )
        .first()
    )
    if exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This title is already in the catalog. Edit the existing entry.",
        )
    row = LicensedTitle()
    _apply(row, body)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@admin_router.put("/{title_id}", response_model=LicensedTitleOut)
def update_title(title_id: int, body: LicensedTitleIn, db: Session = Depends(get_db)):
    _validate_payload(body)
    row = db.get(LicensedTitle, title_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found.")
    _apply(row, body)
    db.commit()
    db.refresh(row)
    return row


@admin_router.delete("/{title_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_title(title_id: int, db: Session = Depends(get_db)):
    row = db.get(LicensedTitle, title_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found.")
    db.delete(row)
    db.commit()


# --- Public source gate -----------------------------------------------------

def _expired(expires_at: Optional[datetime]) -> bool:
    if expires_at is None:
        return False
    exp = expires_at
    if exp.tzinfo is not None:
        exp = exp.astimezone(timezone.utc).replace(tzinfo=None)
    return exp < datetime.utcnow()


@public_router.get("/source/{tmdb_id}", response_model=StreamSourceOut)
def get_source(
    tmdb_id: str,
    media_type: str = "movie",
    db: Session = Depends(get_db),
):
    """Return an authorized source for a title, or 403 if not licensed.

    The frontend treats any non-2xx here as 'no authorized source' and shows a
    friendly message (or, in dev only, falls back to the local test map).
    """
    row = (
        db.query(LicensedTitle)
        .filter(
            LicensedTitle.media_type == media_type,
            LicensedTitle.tmdb_id == str(tmdb_id),
            LicensedTitle.is_active.is_(True),
        )
        .first()
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This title isn't licensed for streaming.",
        )
    if _expired(row.expires_at):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The license for this title has expired.",
        )

    out = StreamSourceOut(
        source_type=row.source_type,
        tmdb_id=row.tmdb_id,
        is_authorized=True,
        title=row.title,
        license=row.license_type,
    )
    if row.source_type == "webtorrent":
        out.magnet_uri = row.source_url
    elif row.source_type == "file":
        out.url = f"/api/stream/file/{row.source_url}"
    else:  # mp4 | hls
        out.url = row.source_url
    return out
