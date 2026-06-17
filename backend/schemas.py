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
    picture: Optional[str] = Field(default=None, max_length=512)


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


class DeleteAccountIn(BaseModel):
    password: Optional[str] = Field(default=None, max_length=128)


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
