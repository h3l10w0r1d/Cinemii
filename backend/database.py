"""SQLAlchemy engine, session factory and FastAPI session dependency."""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from config import DATABASE_URL

# check_same_thread is only needed for SQLite + the threaded dev server.
_connect_args = (
    {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

engine = create_engine(DATABASE_URL, connect_args=_connect_args, future=True)

SessionLocal = sessionmaker(
    bind=engine, autocommit=False, autoflush=False, future=True
)

Base = declarative_base()


def get_db():
    """Yield a request-scoped DB session and always close it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_user_columns():
    """Lightweight migration: add new `users` columns to an existing DB.

    `Base.metadata.create_all` only creates missing *tables*, never new columns
    on a table that already exists. This adds the profile/2FA columns in place
    so upgrading doesn't require dropping the database. Works on SQLite + Postgres.
    """
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    if "users" not in insp.get_table_names():
        return  # fresh DB — create_all already built the full table

    existing = {c["name"] for c in insp.get_columns("users")}
    is_pg = engine.dialect.name == "postgresql"
    false_default = "FALSE" if is_pg else "0"

    column_defs = {
        "username": "VARCHAR(40)",
        "bio": "VARCHAR(300)",
        "date_of_birth": "VARCHAR(10)",
        "two_factor_enabled": f"BOOLEAN NOT NULL DEFAULT {false_default}",
        "two_factor_secret": "VARCHAR(64)",
        "backup_codes": "VARCHAR(2000)",
    }

    with engine.begin() as conn:
        for name, ddl in column_defs.items():
            if name not in existing:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {name} {ddl}"))
        try:
            conn.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username "
                    "ON users (username)"
                )
            )
        except Exception:
            pass  # index may already exist under a different name

        # Widen picture VARCHAR(512) -> TEXT so it can hold uploaded avatars.
        # SQLite ignores declared length, so this only matters on Postgres.
        if is_pg:
            try:
                conn.execute(text("ALTER TABLE users ALTER COLUMN picture TYPE TEXT"))
            except Exception:
                pass
    # Lightweight migration for messages table.
    if "messages" in insp.get_table_names():
        existing_messages = {c["name"] for c in insp.get_columns("messages")}

        with engine.begin() as conn:
            if "read_at" not in existing_messages:
                conn.execute(text("ALTER TABLE messages ADD COLUMN read_at TIMESTAMP"))
