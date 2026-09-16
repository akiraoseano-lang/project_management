from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyCookie
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_acces_token
from app.models.user import User


acces_token_cookie = APIKeyCookie(
    name="access_token"
)


def get_current_user(
    access_token: str = Depends(acces_token_cookie),
    db: Session = Depends(get_db)
) -> User:

    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    try:
        payload = decode_acces_token(access_token)

        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    user = db.get(User, int(user_id))

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User is inactive"
        )

    return user