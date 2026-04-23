"""
Authentication routes — register, login, logout, change-password.

Uses stdlib only (hashlib + secrets) — no external JWT/crypto packages required.
Tokens are stored in the DB and expire after TOKEN_EXPIRE_DAYS days.
"""
import datetime
import hashlib
import hmac
import os
import secrets

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.user_model import User
from backend.schemas.user_schema import (
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserAuthResponse,
)

router = APIRouter()

TOKEN_EXPIRE_DAYS = 30


# ── Crypto helpers ─────────────────────────────────────────────────────────────

def _hash_password(password: str) -> str:
    """PBKDF2-HMAC-SHA256 with a random 32-byte salt. Returns 'salt_hex:key_hex'."""
    salt = os.urandom(32)
    key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
    return f"{salt.hex()}:{key.hex()}"


def _verify_password(stored: str, candidate: str) -> bool:
    """Constant-time comparison to prevent timing attacks."""
    try:
        salt_hex, key_hex = stored.split(":")
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(key_hex)
        actual = hashlib.pbkdf2_hmac("sha256", candidate.encode(), salt, 200_000)
        return hmac.compare_digest(expected, actual)
    except Exception:
        return False


def _new_token() -> str:
    return secrets.token_urlsafe(40)


def _token_expiry() -> str:
    return (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=TOKEN_EXPIRE_DAYS)).isoformat()


# ── Auth dependency ────────────────────────────────────────────────────────────

def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)) -> User:
    """Validates Bearer token from Authorization header. Used by protected routes."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization[7:]
    user = db.query(User).filter(User.auth_token == token).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if user.token_expires_at:
        try:
            exp = datetime.datetime.fromisoformat(user.token_expires_at)
            if datetime.datetime.now(datetime.timezone.utc) > exp:
                raise HTTPException(status_code=401, detail="Token expired — please log in again")
        except ValueError:
            # Malformed expiry stored in DB — deny access rather than silently accept
            import logging
            logging.getLogger(__name__).warning(
                "Malformed token_expires_at for user_id=%d: %r", user.id, user.token_expires_at
            )
            raise HTTPException(status_code=401, detail="Invalid session — please log in again")
    return user


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    if not data.name.strip():
        raise HTTPException(status_code=422, detail="Name cannot be empty")
    if len(data.password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters")

    existing = db.query(User).filter(User.email == data.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    token = _new_token()
    user = User(
        name=data.name.strip(),
        email=data.email.lower().strip(),
        hashed_password=_hash_password(data.password),
        auth_token=token,
        token_expires_at=_token_expiry(),
        timezone="UTC",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return TokenResponse(
        access_token=token,
        user=UserAuthResponse(id=user.id, name=user.name, email=user.email),
    )


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower().strip()).first()
    # Use generic message to avoid email enumeration
    if not user or not user.hashed_password or not _verify_password(user.hashed_password, data.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Rotate token on every login
    token = _new_token()
    user.auth_token = token
    user.token_expires_at = _token_expiry()
    db.commit()

    return TokenResponse(
        access_token=token,
        user=UserAuthResponse(id=user.id, name=user.name, email=user.email),
    )


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.auth_token = None
    current_user.token_expires_at = None
    db.commit()
    return {"message": "Logged out"}


@router.post("/change-password", response_model=TokenResponse)
def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if len(data.new_password) < 6:
        raise HTTPException(status_code=422, detail="New password must be at least 6 characters")
    if not current_user.hashed_password or not _verify_password(current_user.hashed_password, data.current_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    # Update password and rotate token
    new_token = _new_token()
    current_user.hashed_password = _hash_password(data.new_password)
    current_user.auth_token = new_token
    current_user.token_expires_at = _token_expiry()
    db.commit()

    return TokenResponse(
        access_token=new_token,
        user=UserAuthResponse(id=current_user.id, name=current_user.name, email=current_user.email),
    )
