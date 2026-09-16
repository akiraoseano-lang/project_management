import secrets
from fastapi import Request, Header, HTTPException, status

def csrf_protect(
    request: Request,

    x_csrf_token: str | None = Header(None, alias="X-CSRF-Token")
):
    csrf_cookie = request.cookies.get("csrf_token")

    if csrf_cookie is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token missing from cookie"
        )

    if x_csrf_token is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token missing from header"
        )

    if not secrets.compare_digest(csrf_cookie, x_csrf_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid CSRF token"
        )