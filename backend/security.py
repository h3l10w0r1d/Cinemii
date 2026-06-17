"""Password hashing (bcrypt), JWT (PyJWT) and TOTP 2FA (pyotp)."""

import base64
import io
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
import pyotp
import qrcode
import qrcode.image.svg

from config import ACCESS_TOKEN_EXPIRE_MINUTES, JWT_ALGORITHM, SECRET_KEY

# bcrypt only hashes the first 72 bytes; truncate explicitly so long inputs
# don't raise and behaviour stays predictable.
_BCRYPT_MAX_BYTES = 72


def hash_password(password: str) -> str:
    pw = password.encode("utf-8")[:_BCRYPT_MAX_BYTES]
    return bcrypt.hashpw(pw, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: Optional[str]) -> bool:
    if not hashed:
        return False
    pw = password.encode("utf-8")[:_BCRYPT_MAX_BYTES]
    try:
        return bcrypt.checkpw(pw, hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(subject: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(subject),
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None


# --- TOTP two-factor (Google Authenticator compatible) ----------------------

_ISSUER = "Cinemii"


def generate_2fa_secret() -> str:
    """A fresh base32 TOTP secret."""
    return pyotp.random_base32()


def totp_uri(secret: str, account: str) -> str:
    """otpauth:// provisioning URI to seed an authenticator app."""
    return pyotp.TOTP(secret).provisioning_uri(name=account, issuer_name=_ISSUER)


def verify_2fa(secret: Optional[str], code: str) -> bool:
    """Validate a 6-digit TOTP code (±1 step for clock drift)."""
    if not secret or not code:
        return False
    try:
        return pyotp.TOTP(secret).verify(str(code).strip(), valid_window=1)
    except Exception:
        return False


def qr_svg_data_uri(uri: str) -> str:
    """Render the provisioning URI as an inline SVG data URI (no Pillow needed)."""
    img = qrcode.make(uri, image_factory=qrcode.image.svg.SvgPathImage)
    buf = io.BytesIO()
    img.save(buf)
    encoded = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/svg+xml;base64,{encoded}"
