"""Database models: users, watch progress and favorites."""

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from database import Base


def _utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    # Optional unique @handle, distinct from the display name.
    username = Column(String(40), unique=True, nullable=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    # Nullable: OAuth (Google) users never set a local password.
    hashed_password = Column(String(255), nullable=True)
    provider = Column(String(40), nullable=False, default="Email")
    picture = Column(String(512), nullable=True)
    bio = Column(String(300), nullable=True)
    date_of_birth = Column(String(10), nullable=True)  # ISO 'YYYY-MM-DD'
    # TOTP two-factor (Google Authenticator compatible).
    two_factor_enabled = Column(Boolean, nullable=False, default=False)
    two_factor_secret = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=_utcnow)

    progress = relationship(
        "WatchProgress", back_populates="user", cascade="all, delete-orphan"
    )
    favorites = relationship(
        "Favorite", back_populates="user", cascade="all, delete-orphan"
    )

    @property
    def has_password(self) -> bool:
        return bool(self.hashed_password)


class WatchProgress(Base):
    __tablename__ = "watch_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "media_type", "media_id", name="uq_progress"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    media_type = Column(String(10), nullable=False, default="movie")
    media_id = Column(String(32), nullable=False)
    title = Column(String(300), nullable=True)
    poster_path = Column(String(300), nullable=True)
    position_seconds = Column(Float, nullable=False, default=0.0)
    duration_seconds = Column(Float, nullable=False, default=0.0)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    user = relationship("User", back_populates="progress")


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (
        UniqueConstraint("user_id", "media_type", "media_id", name="uq_favorite"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    media_type = Column(String(10), nullable=False, default="movie")
    media_id = Column(String(32), nullable=False)
    title = Column(String(300), nullable=True)
    poster_path = Column(String(300), nullable=True)
    created_at = Column(DateTime, default=_utcnow)

    user = relationship("User", back_populates="favorites")
