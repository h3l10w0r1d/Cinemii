"""Pydantic request/response schemas."""

import json
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


# --- Auth -------------------------------------------------------------------

class SignupIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)
    otp_code: Optional[str] = Field(default=None, max_length=10)


class GoogleIn(BaseModel):
    credential: str  # Google ID token (JWT) from the GSI client


class UserOut(BaseModel):
    id: int
    name: str
    username: Optional[str] = None
    email: EmailStr
    provider: str
    picture: Optional[str] = None
    bio: Optional[str] = None
    date_of_birth: Optional[str] = None
    two_factor_enabled: bool = False
    has_password: bool = False
    is_admin: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# --- Account / profile management -------------------------------------------

class ProfileUpdateIn(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    username: Optional[str] = Field(default=None, min_length=3, max_length=40)
    bio: Optional[str] = Field(default=None, max_length=300)
    date_of_birth: Optional[str] = Field(default=None, max_length=10)
    # Either an https URL or an uploaded-avatar data URI (~up to ~2 MB).
    picture: Optional[str] = Field(default=None, max_length=2_500_000)


class EmailChangeIn(BaseModel):
    new_email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class PasswordChangeIn(BaseModel):
    # current_password is optional so Google users can *set* a first password.
    current_password: Optional[str] = Field(default=None, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class TwoFASetupOut(BaseModel):
    secret: str
    otpauth_uri: str
    qr_svg: str  # inline data URI


class TwoFACodeIn(BaseModel):
    code: str = Field(min_length=6, max_length=10)


class TwoFAEnableOut(BaseModel):
    user: UserOut
    backup_codes: list[str]


class BackupCodesOut(BaseModel):
    backup_codes: list[str]


class DeleteAccountIn(BaseModel):
    password: Optional[str] = Field(default=None, max_length=128)


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


# --- Watchlist & reviews ----------------------------------------------------

class WatchlistIn(BaseModel):
    media_type: str = Field(default="movie", max_length=10)
    media_id: str = Field(max_length=32)
    title: Optional[str] = Field(default=None, max_length=300)
    poster_path: Optional[str] = Field(default=None, max_length=300)


class WatchlistOut(WatchlistIn):
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewIn(BaseModel):
    media_type: str = Field(default="movie", max_length=10)
    media_id: str = Field(max_length=32)
    title: Optional[str] = Field(default=None, max_length=300)
    poster_path: Optional[str] = Field(default=None, max_length=300)
    rating: float = Field(ge=0, le=5)
    review: Optional[str] = Field(default=None, max_length=2000)


class ReviewOut(ReviewIn):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Watch progress ---------------------------------------------------------

class ProgressIn(BaseModel):
    media_type: str = Field(default="movie", max_length=10)
    media_id: str = Field(max_length=32)
    title: Optional[str] = Field(default=None, max_length=300)
    poster_path: Optional[str] = Field(default=None, max_length=300)
    position_seconds: float = Field(default=0.0, ge=0)
    duration_seconds: float = Field(default=0.0, ge=0)


class ProgressOut(BaseModel):
    media_type: str
    media_id: str
    title: Optional[str] = None
    poster_path: Optional[str] = None
    position_seconds: float
    duration_seconds: float
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Favorites --------------------------------------------------------------

class FavoriteIn(BaseModel):
    media_type: str = Field(default="movie", max_length=10)
    media_id: str = Field(max_length=32)
    title: Optional[str] = Field(default=None, max_length=300)
    poster_path: Optional[str] = Field(default=None, max_length=300)


class FavoriteOut(BaseModel):
    media_type: str
    media_id: str
    title: Optional[str] = None
    poster_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Streaming --------------------------------------------------------------

class StreamInfoOut(BaseModel):
    media_type: str
    media_id: str
    source: str          # playable URL (legal/sample content)
    mime_type: str
    title: Optional[str] = None
    resume_seconds: float = 0.0
    license: str


# --- Licensing CMS ----------------------------------------------------------

class LicensedTitleIn(BaseModel):
    media_type: str = Field(default="movie", max_length=10)
    tmdb_id: str = Field(max_length=32)
    title: Optional[str] = Field(default=None, max_length=300)
    poster_path: Optional[str] = Field(default=None, max_length=300)
    source_type: str = Field(default="webtorrent", max_length=20)
    source_url: str = Field(min_length=1, max_length=4000)
    quality: Optional[str] = Field(default=None, max_length=10)
    language: Optional[str] = Field(default=None, max_length=20)
    subtitles: Optional[list[str]] = None
    license_type: Optional[str] = Field(default=None, max_length=60)
    rights_holder: Optional[str] = Field(default=None, max_length=200)
    license_ref: Optional[str] = Field(default=None, max_length=4000)  # rights_note
    expires_at: Optional[datetime] = None  # rights_expires_at
    rights_confirmed: bool = False
    is_active: bool = True

    @field_validator("subtitles", mode="before")
    @classmethod
    def _parse_subtitles(cls, v):
        # The DB stores subtitles as a JSON string; the API exposes a list.
        if v is None or isinstance(v, list):
            return v
        if isinstance(v, str):
            s = v.strip()
            if not s:
                return None
            try:
                parsed = json.loads(s)
                return parsed if isinstance(parsed, list) else [str(parsed)]
            except (ValueError, TypeError):
                return [s]
        return v


class LicensedTitleOut(LicensedTitleIn):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    # Proposal provenance (populated for backend-proposed WebTorrent sources).
    source_provider: Optional[str] = None
    info_hash: Optional[str] = None
    file_size: Optional[int] = None
    seeders: Optional[int] = None
    peers: Optional[int] = None

    class Config:
        from_attributes = True


# --- Movie source proposals (backend-proposed WebTorrent sources) -----------

class ProposedSourceOut(BaseModel):
    """One admin-only proposed WebTorrent source. Returned by the proposal feed;
    NEVER exposed to the public/player API."""
    source_type: str = "webtorrent"
    magnet_uri: str
    source_provider: str
    info_hash: Optional[str] = None
    title: Optional[str] = None
    quality: Optional[str] = None
    file_size: Optional[int] = None
    language: Optional[str] = None
    seeders: Optional[int] = None
    peers: Optional[int] = None
    license_hint: Optional[str] = None
    is_test: bool = False


class MovieSourceProposalsOut(BaseModel):
    tmdb_id: str
    media_type: str = "movie"
    provider: str
    proposals: list[ProposedSourceOut] = []


class MovieSourceCreateIn(BaseModel):
    """Persist an admin-selected proposed source + rights confirmation.

    The magnet/provenance comes from a backend proposal (the admin pastes
    nothing). The admin contributes only the rights decision and notes.
    """
    tmdb_id: str = Field(max_length=32)
    title: Optional[str] = Field(default=None, max_length=300)
    poster_path: Optional[str] = Field(default=None, max_length=300)

    # The selected proposal (echoed back from the proposals endpoint).
    source_type: str = Field(default="webtorrent", max_length=20)
    magnet_uri: str = Field(min_length=1, max_length=4000)
    source_provider: Optional[str] = Field(default=None, max_length=80)
    info_hash: Optional[str] = Field(default=None, max_length=64)
    quality: Optional[str] = Field(default=None, max_length=10)
    language: Optional[str] = Field(default=None, max_length=20)
    file_size: Optional[int] = Field(default=None, ge=0)
    seeders: Optional[int] = Field(default=None, ge=0)
    peers: Optional[int] = Field(default=None, ge=0)

    # Admin rights decision.
    rights_confirmed: bool = False
    rights_note: Optional[str] = Field(default=None, max_length=4000)   # -> license_ref
    rights_holder: Optional[str] = Field(default=None, max_length=200)
    license_type: Optional[str] = Field(default=None, max_length=60)
    rights_expires_at: Optional[datetime] = None                        # -> expires_at
    is_active: bool = True


class MovieSourceUpdateIn(BaseModel):
    """Partial update of a saved movie source (all fields optional)."""
    title: Optional[str] = Field(default=None, max_length=300)
    quality: Optional[str] = Field(default=None, max_length=10)
    language: Optional[str] = Field(default=None, max_length=20)
    rights_confirmed: Optional[bool] = None
    rights_note: Optional[str] = Field(default=None, max_length=4000)
    rights_holder: Optional[str] = Field(default=None, max_length=200)
    license_type: Optional[str] = Field(default=None, max_length=60)
    rights_expires_at: Optional[datetime] = None
    is_active: Optional[bool] = None


class StreamSourceOut(BaseModel):
    """Authorized playable source returned to the player. Mirrors the shape the
    frontend's resolveMovieSource() expects."""
    source_type: str
    tmdb_id: str
    is_authorized: bool = True
    magnet_uri: Optional[str] = None   # for source_type == "webtorrent"
    url: Optional[str] = None          # for mp4 / hls / file
    title: Optional[str] = None
    license: Optional[str] = None
    quality: Optional[str] = None
    language: Optional[str] = None


class MovieStreamOut(BaseModel):
    """Public player response for GET /api/stream/movie/{tmdb_id} (spec shape).

    Always HTTP 200. `available` tells the player whether a rights-cleared,
    active, non-expired source exists. When false, only `available` + `message`
    are set and NO magnet is exposed."""
    available: bool
    tmdb_id: str
    media_type: str = "movie"
    source_type: Optional[str] = None
    magnet_uri: Optional[str] = None
    quality: Optional[str] = None
    language: Optional[str] = None
    title: Optional[str] = None
    license: Optional[str] = None
    message: Optional[str] = None
