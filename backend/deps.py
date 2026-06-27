"""Shared FastAPI dependencies — notably the authenticated-user guard."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from config import ADMIN_EMAILS
from database import get_db
from models import User
from security import decode_access_token

# auto_error=False so we can raise a consistent 401 ourselves.
_bearer = HTTPBearer(auto_error=False)

_CREDENTIALS_EXC = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None or not creds.credentials:
        raise _CREDENTIALS_EXC

    payload = decode_access_token(creds.credentials)
    if not payload:
        raise _CREDENTIALS_EXC

    user_id = payload.get("sub")
    if user_id is None:
        raise _CREDENTIALS_EXC

    user = db.get(User, int(user_id)) if str(user_id).isdigit() else None
    if user is None:
        raise _CREDENTIALS_EXC

    return user


def user_is_admin(user: User) -> bool:
    """Effective admin check.

    True if the user is flagged admin, or their email is in the configured
    allowlist. As a LOCAL DEV convenience, when no allowlist is configured the
    first account (id=1) is treated as admin so the CMS is reachable without
    setup. Set CINEMII_ADMIN_EMAILS in any real deployment.
    """
    if getattr(user, "is_admin", False):
        return True
    if ADMIN_EMAILS:
        return (user.email or "").lower() in ADMIN_EMAILS
    return user.id == 1


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user_is_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return user
