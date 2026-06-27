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
    Text,
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
    # Text (not VARCHAR) so it can hold an uploaded avatar as a data URI.
    picture = Column(Text, nullable=True)
    bio = Column(String(300), nullable=True)
    date_of_birth = Column(String(10), nullable=True)  # ISO 'YYYY-MM-DD'
    # TOTP two-factor (Google Authenticator compatible).
    two_factor_enabled = Column(Boolean, nullable=False, default=False)
    two_factor_secret = Column(String(64), nullable=True)
    # JSON array of bcrypt-hashed one-time recovery codes.
    backup_codes = Column(String(2000), nullable=True)
    # Grants access to the licensing CMS (admin-only endpoints).
    is_admin = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=_utcnow)
    last_seen = Column(DateTime, nullable=True)

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


class WatchlistItem(Base):
    __tablename__ = "watchlist"
    __table_args__ = (
        UniqueConstraint("user_id", "media_type", "media_id", name="uq_watchlist"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    media_type = Column(String(10), nullable=False, default="movie")
    media_id = Column(String(32), nullable=False)
    title = Column(String(300), nullable=True)
    poster_path = Column(String(300), nullable=True)
    created_at = Column(DateTime, default=_utcnow)


class Follow(Base):
    __tablename__ = "follows"
    __table_args__ = (
        UniqueConstraint("follower_id", "following_id", name="uq_follow"),
    )

    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    following_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=_utcnow)


class EpisodeWatch(Base):
    __tablename__ = "episode_watch"
    __table_args__ = (
        UniqueConstraint("user_id", "tv_id", "season", "episode", name="uq_episode"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    tv_id = Column(String(32), nullable=False, index=True)
    season = Column(Integer, nullable=False)
    episode = Column(Integer, nullable=False)
    watched_at = Column(DateTime, default=_utcnow)


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint("user_id", "media_type", "media_id", name="uq_review"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    media_type = Column(String(10), nullable=False, default="movie")
    media_id = Column(String(32), nullable=False)
    title = Column(String(300), nullable=True)
    poster_path = Column(String(300), nullable=True)
    rating = Column(Float, nullable=False, default=0.0)   # 0.5–5 stars
    review = Column(String(2000), nullable=True)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)
class FriendRequest(Base):
    __tablename__ = "friend_requests"

    __table_args__ = (
        UniqueConstraint(
            "from_user_id",
            "to_user_id",
            name="uq_friend_request",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    from_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    to_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    status = Column(String(20), nullable=False, default="pending")
    created_at = Column(DateTime, default=_utcnow)

    from_user = relationship("User", foreign_keys=[from_user_id])
    to_user = relationship("User", foreign_keys=[to_user_id])


class Friendship(Base):
    __tablename__ = "friendships"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "friend_id",
            name="uq_friendship",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    friend_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    created_at = Column(DateTime, default=_utcnow)

    user = relationship("User", foreign_keys=[user_id])
    friend = relationship("User", foreign_keys=[friend_id])


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)

    from_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    to_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    text = Column(String(1000), nullable=False)
    created_at = Column(DateTime, default=_utcnow)
    read_at = Column(DateTime, nullable=True)

    from_user = relationship("User", foreign_keys=[from_user_id])
    to_user = relationship("User", foreign_keys=[to_user_id])


class LicensedTitle(Base):
    """A title the operator is cleared to stream, and how it's delivered.

    This is the CMS-backed rights allowlist that GATES playback. The public
    /api/stream/source endpoint returns a playable source ONLY when an active,
    non-expired row exists here for the requested title. There is deliberately
    no fallback to unlicensed content — if it isn't in this table, it doesn't
    play.
    """

    __tablename__ = "licensed_titles"
    __table_args__ = (
        UniqueConstraint("media_type", "tmdb_id", name="uq_licensed_title"),
    )

    id = Column(Integer, primary_key=True, index=True)
    media_type = Column(String(10), nullable=False, default="movie")
    tmdb_id = Column(String(32), nullable=False, index=True)
    title = Column(String(300), nullable=True)
    poster_path = Column(String(300), nullable=True)

    # Delivery — how this title is served to the player:
    #   webtorrent -> source_url is a magnet: URI (use ONLY for CC / owned content)
    #   mp4 | hls  -> source_url is an https URL to your own CDN / storage
    #   file       -> source_url is a filename served by /api/stream/file/<name>
    source_type = Column(String(20), nullable=False, default="webtorrent")
    source_url = Column(Text, nullable=False)

    # Provenance — why we are allowed to stream this.
    license_type = Column(String(60), nullable=True)   # "CC-BY" | "Owned" | "Distributor" | ...
    rights_holder = Column(String(200), nullable=True)
    license_ref = Column(Text, nullable=True)          # note / URL to the agreement or proof
    expires_at = Column(DateTime, nullable=True)       # null = no expiry

    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)
