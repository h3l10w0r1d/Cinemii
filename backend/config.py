"""Central configuration for the CINEMII backend.

Secrets are read from the environment so nothing sensitive is hard-coded.
For local staging a development fallback is used, but a loud warning is
printed so it never silently ships to production.
"""

import os
import secrets

# --- JWT / crypto -----------------------------------------------------------

SECRET_KEY = os.environ.get("CINEMII_SECRET")

if not SECRET_KEY:
    # Ephemeral key for local staging. Tokens become invalid on restart,
    # which is exactly what we want for a throwaway dev environment.
    SECRET_KEY = secrets.token_urlsafe(48)
    print(
        "\n[CINEMII] WARNING: CINEMII_SECRET not set — using a random "
        "ephemeral key.\n          Set CINEMII_SECRET in the environment "
        "for any real deployment.\n"
    )

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.environ.get("CINEMII_TOKEN_TTL_MIN", 60 * 24 * 7)  # 7 days
)

# --- Database ---------------------------------------------------------------

_DB_PATH = os.path.join(os.path.dirname(__file__), "cinemii.db")
# Render/Heroku expose Postgres as CINEMII_DATABASE_URL or DATABASE_URL.
DATABASE_URL = (
    os.environ.get("CINEMII_DATABASE_URL")
    or os.environ.get("DATABASE_URL")
    or f"sqlite:///{_DB_PATH}"
)
# SQLAlchemy 2.x needs the "postgresql://" scheme, not the legacy "postgres://".
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# --- CORS -------------------------------------------------------------------
# The static front-end is typically served from a simple HTTP server on 8080.
# Add any other origin you serve the front-end from here.

ALLOWED_ORIGINS = os.environ.get(
    "CINEMII_ALLOWED_ORIGINS",
    "http://localhost:8080,http://127.0.0.1:8080,"
    "http://localhost:5500,http://127.0.0.1:5500,"
    "http://localhost:3000,http://127.0.0.1:3000,"
    "http://localhost:3001,http://127.0.0.1:3001,"
    "http://localhost:3003,http://127.0.0.1:3003,"
    "http://localhost:5173,http://127.0.0.1:5173",
).split(",")

# Regex allowlist so every Vercel preview/production domain is accepted without
# having to enumerate each one. Override via CINEMII_ALLOWED_ORIGIN_REGEX.
ALLOWED_ORIGIN_REGEX = os.environ.get(
    "CINEMII_ALLOWED_ORIGIN_REGEX", r"https://.*\.vercel\.app"
)

# --- Admin / CMS ------------------------------------------------------------
# Comma-separated emails granted admin (licensing CMS) access. These accounts
# are promoted to admin on startup and at login. In LOCAL DEV, if this is left
# empty, the very first user (id=1) is treated as admin so you can get in
# without configuration — see deps.user_is_admin.
ADMIN_EMAILS = [
    e.strip().lower()
    for e in os.environ.get("CINEMII_ADMIN_EMAILS", "").split(",")
    if e.strip()
]

# --- TMDB -------------------------------------------------------------------
# Kept server-side so the key is never shipped in the frontend bundle.
TMDB_API_KEY = os.environ.get(
    "CINEMII_TMDB_KEY", "47729336f5fe1d690418538825a71879"
)
TMDB_BASE = "https://api.themoviedb.org/3"

# --- Frontend / email (password reset) --------------------------------------
# Where the reset link should point (your deployed frontend).
FRONTEND_URL = os.environ.get("CINEMII_FRONTEND_URL", "http://localhost:3000")

# SMTP is optional: if unset, reset links are logged to the server console so
# staging still works (read the link from the Render logs).
SMTP_HOST = os.environ.get("CINEMII_SMTP_HOST")
SMTP_PORT = int(os.environ.get("CINEMII_SMTP_PORT", "587"))
SMTP_USER = os.environ.get("CINEMII_SMTP_USER")
SMTP_PASS = os.environ.get("CINEMII_SMTP_PASS")
SMTP_FROM = os.environ.get("CINEMII_SMTP_FROM", "Cinemii <no-reply@cinemii.app>")
