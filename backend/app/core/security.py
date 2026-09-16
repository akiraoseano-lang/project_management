from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from fastapi.security import HTTPBearer
import hashlib
import secrets

from app.core.config import settings

bearer_scheme = HTTPBearer()

password_hasher = PasswordHasher()

def hash_password(password: str):
    return password_hasher.hash(password)

def verifiy_password(password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(
            password_hash,
            password
        )
    except Exception:
        return False

def create_acces_token(user_id: int) -> str:
    expires_at = (
        datetime.now(timezone.utc)
        + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )

    payload = {
        "sub": str(user_id),
        "exp": expires_at
    }

    return jwt.encode(
        payload,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM
    )

def decode_acces_token(token: str) -> dict:
    return jwt.decode(
        token,
        settings.JWT_SECRET,
        algorithms=[settings.JWT_ALGORITHM]
    )

def generate_refresh_token() -> str:
    return secrets.token_urlsafe(64)

def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()

def generate_csrf_token() -> str:
    return secrets.token_urlsafe(
        32)
