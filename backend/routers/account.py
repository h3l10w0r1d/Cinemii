"""Account management: profile edits, email/password change, 2FA, deletion."""

import re

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from deps import get_current_user
from models import User
from schemas import (
    DeleteAccountIn,
    EmailChangeIn,
    PasswordChangeIn,
    ProfileUpdateIn,
    TwoFACodeIn,
    TwoFASetupOut,
    UserOut,
)
from security import (
    generate_2fa_secret,
    hash_password,
    qr_svg_data_uri,
    totp_uri,
    verify_2fa,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["account"])

_USERNAME_RE = re.compile(r"^[a-zA-Z0-9_.]+$")
_DOB_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


@router.patch("/profile", response_model=UserOut)
def update_profile(
    body: ProfileUpdateIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if body.name is not None:
        current.name = body.name.strip()

    if body.username is not None:
        handle = body.username.strip().lower()
        if not _USERNAME_RE.match(handle):
            raise HTTPException(400, "Username may only contain letters, numbers, '.' and '_'.")
        clash = (
            db.query(User)
            .filter(User.username == handle, User.id != current.id)
            .first()
        )
        if clash:
            raise HTTPException(409, "That username is taken.")
        current.username = handle

    if body.bio is not None:
        current.bio = body.bio.strip() or None

    if body.date_of_birth is not None:
        dob = body.date_of_birth.strip()
        if dob and not _DOB_RE.match(dob):
            raise HTTPException(400, "Date of birth must be YYYY-MM-DD.")
        current.date_of_birth = dob or None

    if body.picture is not None:
        current.picture = body.picture.strip() or None

    db.commit()
    db.refresh(current)
    return current


@router.post("/change-email", response_model=UserOut)
def change_email(
    body: EmailChangeIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    # Require the current password to confirm identity.
    if not current.hashed_password:
        raise HTTPException(400, "Set a password first before changing your email.")
    if not verify_password(body.password, current.hashed_password):
        raise HTTPException(401, "Incorrect password.")

    new_email = body.new_email.lower().strip()
    if new_email == current.email:
        raise HTTPException(400, "That is already your email.")
    if db.query(User).filter(User.email == new_email).first():
        raise HTTPException(409, "That email is already in use.")

    current.email = new_email
    db.commit()
    db.refresh(current)
    return current


@router.post("/change-password", response_model=UserOut)
def change_password(
    body: PasswordChangeIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    # If a password already exists, the current one must match. Google users
    # with no password can set one for the first time without it.
    if current.hashed_password:
        if not body.current_password or not verify_password(
            body.current_password, current.hashed_password
        ):
            raise HTTPException(401, "Current password is incorrect.")

    current.hashed_password = hash_password(body.new_password)
    db.commit()
    db.refresh(current)
    return current


# --- Two-factor (TOTP) ------------------------------------------------------

@router.post("/2fa/setup", response_model=TwoFASetupOut)
def twofa_setup(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Generate (but don't yet enable) a TOTP secret + QR for the user."""
    if current.two_factor_enabled:
        raise HTTPException(400, "Two-factor is already enabled.")
    secret = generate_2fa_secret()
    current.two_factor_secret = secret  # stored, enabled only after verify
    db.commit()
    uri = totp_uri(secret, current.email)
    return TwoFASetupOut(secret=secret, otpauth_uri=uri, qr_svg=qr_svg_data_uri(uri))


@router.post("/2fa/enable", response_model=UserOut)
def twofa_enable(
    body: TwoFACodeIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if current.two_factor_enabled:
        raise HTTPException(400, "Two-factor is already enabled.")
    if not verify_2fa(current.two_factor_secret, body.code):
        raise HTTPException(400, "That code is incorrect. Try again.")
    current.two_factor_enabled = True
    db.commit()
    db.refresh(current)
    return current


@router.post("/2fa/disable", response_model=UserOut)
def twofa_disable(
    body: TwoFACodeIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if not current.two_factor_enabled:
        raise HTTPException(400, "Two-factor is not enabled.")
    if not verify_2fa(current.two_factor_secret, body.code):
        raise HTTPException(400, "That code is incorrect.")
    current.two_factor_enabled = False
    current.two_factor_secret = None
    db.commit()
    db.refresh(current)
    return current


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    body: DeleteAccountIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    # Confirm with password when the account has one.
    if current.hashed_password:
        if not body.password or not verify_password(
            body.password, current.hashed_password
        ):
            raise HTTPException(401, "Incorrect password.")
    db.delete(current)
    db.commit()
    return None
