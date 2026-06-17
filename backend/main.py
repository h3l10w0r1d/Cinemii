"""CINEMII FastAPI application entry point.

Run (from the backend/ directory):
    uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import ALLOWED_ORIGINS, ALLOWED_ORIGIN_REGEX
from database import Base, engine, ensure_user_columns
from routers import account, auth, library, stream, realtime, tmdb_proxy

# Create tables on startup (fine for SQLite/staging; use Alembic for prod).
Base.metadata.create_all(bind=engine)
# Add any newly-introduced user columns to a pre-existing database.
ensure_user_columns()

app = FastAPI(title="CINEMII API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS if o.strip()],
    allow_origin_regex=ALLOWED_ORIGIN_REGEX or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(account.router)
app.include_router(library.router)
app.include_router(stream.router)
app.include_router(realtime.router)
app.include_router(tmdb_proxy.router)


@app.get("/api/health", tags=["meta"])
def health():
    return {"status": "ok", "service": "cinemii-api"}
