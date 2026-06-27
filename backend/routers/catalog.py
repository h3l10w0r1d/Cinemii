"""Licensing CMS — admin CRUD over licensed titles + the public source gate.

This is the rights allowlist. Playback is gated here: the public
GET /api/stream/source/{tmdb_id} endpoint returns a playable source ONLY when
an active, non-expired licensed_titles row exists for the requested title.
There is no fallback to unlicensed content.

Admin endpoints are guarded by deps.require_admin. The source endpoint is
public (the player calls it before playing) but only ever reveals authorized
sources.
"""

import json
import os
from datetime import datetime, timezone
from typing import List, Optional
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import config
from database import get_db
from deps import require_admin
from models import LicensedTitle, User
from schemas import (
    LicensedTitleIn,
    LicensedTitleOut,
    MovieStreamOut,
    StreamSourceOut,
)

ALLOWED_SOURCE_TYPES = {"webtorrent", "mp4", "hls", "file"}
ALLOWED_QUALITIES = {"480p", "720p", "1080p", "4K"}

# Extensions we treat as playable video when auto-listing your own libraries.
VIDEO_EXTS = {"mp4", "webm", "m4v", "mov", "mkv", "m3u8", "ogg", "ogv"}

# Local media folder (same one stream.py serves via /api/stream/file/<name>).
MEDIA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "media")


def _ext(name: str) -> str:
    return name.rsplit(".", 1)[-1].lower() if "." in name else ""


def _list_media_sources() -> list[dict]:
    """Video files in backend/media/ — served as source_type 'file'."""
    items: list[dict] = []
    try:
        for name in sorted(os.listdir(MEDIA_DIR)):
            path = os.path.join(MEDIA_DIR, name)
            if not os.path.isfile(path) or _ext(name) not in VIDEO_EXTS:
                continue
            items.append(
                {
                    "name": name,
                    "size": os.path.getsize(path),
                    "source_type": "file",
                    "source_url": name,  # CMS stores the filename
                }
            )
    except FileNotFoundError:
        pass
    return items


def _list_bucket_sources() -> dict:
    """Video objects in your configured S3/R2 bucket (content you control)."""
    if not config.S3_BUCKET:
        return {"configured": False, "items": [], "error": None}
    try:
        import boto3  # lazy: only needed when a bucket is configured
    except Exception:
        return {"configured": False, "items": [], "error": "boto3 not installed on the server."}

    try:
        client = boto3.session.Session().client(
            "s3",
            endpoint_url=config.S3_ENDPOINT_URL or None,
            region_name=config.S3_REGION or None,
            aws_access_key_id=config.S3_ACCESS_KEY_ID or None,
            aws_secret_access_key=config.S3_SECRET_ACCESS_KEY or None,
        )
        public_base = (config.S3_PUBLIC_BASE_URL or "").rstrip("/")
        resp = client.list_objects_v2(Bucket=config.S3_BUCKET, Prefix=config.S3_PREFIX or "")
        items: list[dict] = []
        for obj in resp.get("Contents", []):
            key = obj["Key"]
            ext = _ext(key)
            if ext not in VIDEO_EXTS:
                continue
            if public_base:
                url, ephemeral = f"{public_base}/{key}", False
            else:
                url = client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": config.S3_BUCKET, "Key": key},
                    ExpiresIn=3600,
                )
                ephemeral = True
            items.append(
                {
                    "key": key,
                    "size": obj.get("Size", 0),
                    "source_type": "hls" if ext == "m3u8" else "mp4",
                    "source_url": url,
                    "ephemeral": ephemeral,
                }
            )
        return {"configured": True, "items": items, "error": None}
    except Exception as e:  # noqa: BLE001 - surface listing errors to the admin UI
        return {"configured": True, "items": [], "error": str(e)[:200]}

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
    if body.quality and body.quality not in ALLOWED_QUALITIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"quality must be one of {sorted(ALLOWED_QUALITIES)}.",
        )


def _apply(row: LicensedTitle, body: LicensedTitleIn) -> None:
    data = body.model_dump()
    # subtitles is a list in the API but stored as a JSON string.
    subs = data.pop("subtitles", None)
    for field, value in data.items():
        setattr(row, field, value)
    row.subtitles = json.dumps(subs) if subs else None
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


@admin_router.get("/sources")
def list_sources():
    """Auto-list playable sources you control, to pick from in the CMS:
    the server media folder and your configured cloud bucket. This only ever
    surfaces YOUR storage — it does not search the public internet."""
    return {"media": _list_media_sources(), "bucket": _list_bucket_sources()}


# --- Internet Archive search (public-domain / Creative-Commons films) -------
# A LEGAL "search" source: archive.org hosts public-domain and CC media with a
# public API. We search the `movies` mediatype and expose playable files. The
# admin must still confirm each item's rights (archive.org also hosts some
# content under other licenses) — we surface the item's license/details URL.

_IA_SEARCH = "https://archive.org/advancedsearch.php"
_IA_METADATA = "https://archive.org/metadata"


@admin_router.get("/archive/search")
def archive_search(q: str):
    if not q.strip():
        return []
    # First-pass filter to items that DECLARE a license. NOTE: archive.org
    # license tags are user-set and unreliable (copyrighted uploads are often
    # mislabeled CC/public-domain), so this only reduces noise — the admin must
    # still verify each item's actual rights. We surface the reported license.
    params = {
        "q": f"({q}) AND mediatype:movies AND licenseurl:*",
        "fl[]": ["identifier", "title", "year", "licenseurl"],
        "rows": 15,
        "page": 1,
        "output": "json",
    }
    try:
        with httpx.Client(timeout=12, headers={"User-Agent": "Cinemii-CMS"}) as client:
            r = client.get(_IA_SEARCH, params=params)
            r.raise_for_status()
            docs = r.json().get("response", {}).get("docs", [])
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Internet Archive search failed: {str(e)[:120]}")
    return [
        {
            "identifier": d["identifier"],
            "title": d.get("title") or d["identifier"],
            "year": d.get("year"),
            "license_url": d.get("licenseurl"),  # REPORTED, not verified
        }
        for d in docs
        if d.get("identifier")
    ]


@admin_router.get("/archive/files/{identifier}")
def archive_files(identifier: str):
    try:
        with httpx.Client(timeout=12, headers={"User-Agent": "Cinemii-CMS"}) as client:
            r = client.get(f"{_IA_METADATA}/{identifier}")
            r.raise_for_status()
            data = r.json()
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Internet Archive metadata failed: {str(e)[:120]}")

    meta = data.get("metadata") or {}
    files = []
    for f in data.get("files", []):
        name = f.get("name", "")
        ext = _ext(name)
        if ext not in VIDEO_EXTS:
            continue
        try:
            size = int(f.get("size") or 0)
        except (TypeError, ValueError):
            size = 0
        files.append(
            {
                "name": name,
                "size": size,
                "source_type": "hls" if ext == "m3u8" else "mp4",
                "source_url": f"https://archive.org/download/{quote(identifier)}/{quote(name)}",
            }
        )
    return {
        "identifier": identifier,
        "title": meta.get("title") or identifier,
        "details_url": f"https://archive.org/details/{identifier}",
        "license_url": meta.get("licenseurl"),
        "files": files,
    }


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
