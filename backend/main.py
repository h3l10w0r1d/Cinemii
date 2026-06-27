"""CINEMII FastAPI application entry point.

Run (from the backend/ directory):
    uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from config import ALLOWED_ORIGINS, ALLOWED_ORIGIN_REGEX
from database import Base, engine, ensure_admins, ensure_user_columns
from routers import (
    account, auth, catalog, content, friends, library, messages,
    movie_sources, realtime, social, stream, tmdb_proxy,
)

# Create tables on startup (fine for SQLite/staging; use Alembic for prod).
Base.metadata.create_all(bind=engine)
# Add any newly-introduced user columns to a pre-existing database.
ensure_user_columns()
# Promote configured admin emails (CINEMII_ADMIN_EMAILS).
ensure_admins()

app = FastAPI(title="CINEMII API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS if o.strip()],
    allow_origin_regex=ALLOWED_ORIGIN_REGEX or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Baseline hardening headers on every response."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response


app.include_router(auth.router)
app.include_router(account.router)
app.include_router(library.router)
app.include_router(content.router)
app.include_router(social.router)
app.include_router(social.feed_router)
app.include_router(stream.router)
app.include_router(realtime.router)
app.include_router(tmdb_proxy.router)
app.include_router(friends.router)
app.include_router(messages.router)
app.include_router(catalog.admin_router)
app.include_router(catalog.public_router)
app.include_router(movie_sources.admin_router)
app.include_router(movie_sources.public_router)


@app.get("/api/health", tags=["meta"])
def health():
    return {"status": "ok", "service": "cinemii-api"}
