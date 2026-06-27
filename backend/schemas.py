"""Pydantic request/response schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


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
    license_type: Optional[str] = Field(default=None, max_length=60)
    rights_holder: Optional[str] = Field(default=None, max_length=200)
    license_ref: Optional[str] = Field(default=None, max_length=4000)
    expires_at: Optional[datetime] = None
    is_active: bool = True


class LicensedTitleOut(LicensedTitleIn):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


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
