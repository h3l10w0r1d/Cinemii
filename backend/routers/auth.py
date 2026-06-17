"""Authentication: email/password signup & login, Google OAuth, /me."""

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from deps import get_current_user
from models import User
from schemas import GoogleIn, LoginIn, SignupIn, TokenOut, UserOut
from security import (
    create_access_token,
    hash_password,
    verify_2fa,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Google's endpoint validates the ID token's signature, audience and expiry
# for us, so we never trust an unverified client-side token.
_GOOGLE_TOKENINFO = "https://oauth2.googleapis.com/tokeninfo"


def _issue(user: User) -> TokenOut:
    token = create_access_token(user.id)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.post("/signup", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def signup(body: SignupIn, db: Session = Depends(get_db)):
    email = body.email.lower().strip()

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        name=body.name.strip(),
        email=email,
        hashed_password=hash_password(body.password),
        provider="Email",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _issue(user)


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    email = body.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()

    # Same error whether the email is unknown or the password is wrong, so we
    # don't leak which accounts exist.
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    # Second factor, when enabled. Password is already verified at this point,
    # so prompting for the code here doesn't leak account existence.
    if user.two_factor_enabled:
        if not body.otp_code:
            # Signal the client to collect a code, without issuing a token.
            return {"requires_2fa": True}
        if not verify_2fa(user.two_factor_secret, body.otp_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid two-factor code.",
            )

    return _issue(user)


@router.post("/google", response_model=TokenOut)
async def google_login(body: GoogleIn, db: Session = Depends(get_db)):
    """Verify a Google ID token server-side, then upsert the user."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            _GOOGLE_TOKENINFO, params={"id_token": body.credential}
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token.",
        )

    info = resp.json()
    email = (info.get("email") or "").lower().strip()
    if not email or info.get("email_verified") not in ("true", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google account email not verified.",
        )

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            name=info.get("name") or email.split("@")[0],
            email=email,
            provider="Google",
            picture=info.get("picture"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return _issue(user)


@router.get("/me", response_model=UserOut)
def me(current: User = Depends(get_current_user)):
    return current
