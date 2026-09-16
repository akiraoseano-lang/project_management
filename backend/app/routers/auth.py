from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy import select, delete
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import secrets
from fastapi.responses import JSONResponse, RedirectResponse

from app.core.database import get_db
from app.core.security import (
    create_acces_token,
    hash_password,
    verifiy_password,
    generate_refresh_token,
    hash_refresh_token,
    generate_csrf_token
)

from app.core.config import settings

from app.dependencies.auth import get_current_user
from app.dependencies.csrf import csrf_protect
from app.dependencies.rate_limit import (
    LoginRateLimiter,
    IPRateLimiter
)
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    UserResponse
)

from app.services.oauth import (
    google_client,
    github_client,
    discord_client
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

login_rate_limiter = LoginRateLimiter(
    limit=5,
    window=60
)

register_rate_limiter = IPRateLimiter(
    limit=3,
    window=60,
    key_prefix="register"
)

refresh_rate_limiter = IPRateLimiter(
    limit=10,
    window=60,
    key_prefix="refresh"
)

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(register_rate_limiter)
    ]
)
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db)
):

    existing_user = db.scalar(
        select(User).where(User.email == data.email)
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password)
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user

@router.post("/login")
def login(
    data: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    login_rate_limiter.check(
        request,
        data.email
    )
    
    user = db.scalar(
        select(User).where(User.email == data.email)
    )

    if not user or not verifiy_password(
        data.password,
        user.password_hash
    ):
        login_rate_limiter.record_failure(
            request,
            data.email
        )
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive"
        )

    token = create_acces_token(user.id)

    refresh_token = generate_refresh_token()

    refresh_token_hash = hash_refresh_token(
        refresh_token
    )

    csrf_token = generate_csrf_token()

    now = datetime.now(timezone.utc)

    db_refresh_token = RefreshToken(
        user_id=user.id,
        token_hash=refresh_token_hash,
        expires_at=now + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
    )

    db.add(db_refresh_token)
    db.commit()

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,  # True ketika HTTPS production
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,  # True ketika HTTPS production
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/"
    )

    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/"
    )

    return {
        "message": "Login successful"
    }

@router.get(
    "/me",
    response_model=UserResponse
)
def get_me(
    current_user: User = Depends(get_current_user)
):
    return current_user

@router.post("/logout", dependencies=[Depends(csrf_protect)])
async def logout(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.execute(
        delete(RefreshToken).where(RefreshToken.user_id == current_user.id)
    )
    db.commit()

    response = JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "Logout berhasil."}
    )

    response.delete_cookie(
        key="access_token",
        path="/",
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax"
    )
    
    response.delete_cookie(
        key="refresh_token",
        path="/",
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax"
    )
    
    response.delete_cookie(
        key="csrf_token",
        path="/",
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite="lax"
    )

    return response

@router.post("/refresh", dependencies=[
    Depends(csrf_protect),
    Depends(refresh_rate_limiter)
])
def refresh_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    refresh_token = request.cookies.get("refresh_token")

    if not refresh_token:
        raise HTTPException(
            status_code=401,
            detail="Refresh token missing"
        )

    token_hash = hash_refresh_token(refresh_token)

    stored_token = db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    ).scalar_one_or_none()

    if stored_token is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid refresh token"
        )

    now = datetime.now(timezone.utc)

    if stored_token.revoked_at is not None:
        db.execute(
            delete(RefreshToken).where(RefreshToken.user_id == stored_token.user_id)
        )
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The session was cancelled due to a detected indication of a token leak. Please log in again."
    )

    if stored_token.expires_at <= now:
        raise HTTPException(
            status_code=401,
            detail="Refresh token expired"
        )

    user = stored_token.user

    if not user.is_active:
        raise HTTPException(
            status_code=401,
            detail="User account is inactive"
        )

    stored_token.revoked_at = now

    new_access_token = create_acces_token(user.id)

    new_refresh_token = generate_refresh_token()

    new_csrf_token = generate_csrf_token()

    new_refresh_token_hash = hash_refresh_token(
        new_refresh_token
    )

    new_refresh_token_db = RefreshToken(
        user_id=user.id,
        token_hash=new_refresh_token_hash,
        expires_at=now + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
    )

    db.add(new_refresh_token_db)

    db.commit()

    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )

    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/"
    )

    response.set_cookie(
        key="csrf_token",
        value=new_csrf_token,
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/"
    )

    return {
        "message": "Token refreshed succesfully"
    }

@router.get("/google")
async def google_login(request: Request):
    redirect_uri = settings.GOOGLE_REDIRECT_URI

    return await google_client.authorize_redirect(
        request,
        redirect_uri
    )

@router.get("/google/callback")
async def google_callback(
    request: Request,
    db: Session = Depends(get_db)
):
    try:
        token = await google_client.authorize_access_token(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google OAuth gagal: {str(e)}"
        )

    user_info = token.get("userinfo")

    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to get user info from Google"
        )

    email = user_info.get("email")
    name = user_info.get("name")

    user = db.scalar(select(User).where(User.email == email))

    if not user:
        random_password = secrets.token_urlsafe(32)

        user = User(
            name=name,
            email=email,
            password_hash=hash_password(random_password)
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive User"
        )

    access_token = create_acces_token(user.id)
    refresh_token = generate_refresh_token()
    refresh_token_hash = hash_refresh_token(refresh_token)
    csrf_token = generate_csrf_token()
    now = datetime.now(timezone.utc)

    db_refresh_token = RefreshToken(
        user_id=user.id,
        token_hash=refresh_token_hash,
        expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(db_refresh_token)
    db.commit()

    response = RedirectResponse(
        url="http://127.0.0.1:5173/dashboard"
    )

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/"
    )

    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/"
    )

    return response

@router.get("/github")
async def github_login(request: Request):
    redirect_uri = settings.GITHUB_REDIRECT_URI

    return await github_client.authorize_redirect(
        request,
        redirect_uri
    )

@router.get("/github/callback")
async def github_callback(
    request: Request,
    db: Session = Depends(get_db)
):
    try:
        token = await github_client.authorize_access_token(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Github OAuth failed: {str(e)}"
        )

    user_response = await github_client.get("user", token=token)

    if user_response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to get user info from Github"
        )

    user_info = user_response.json()

    email_response = await github_client.get(
        "user/emails",
        token=token
    )

    if email_response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to get email from Github"
        )

    emails = email_response.json()

    primary_email = next(
        (
            email for email in emails
            if email.get("primary") and email.get("verified")
        ),
        None
    )

    if not primary_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verified primary email found on Github"
        )

    email = primary_email["email"]
    name = user_info.get("name") or user_info.get("login")

    user = db.scalar(
        select(User).where(User.email == email)
    )

    if not user:
        random_password = secrets.token_urlsafe(32)

        user = User(
            name=name,
            email=email,
            password_hash=hash_password(random_password)
        )

        db.add(user)
        db.commit()
        db.refresh(user)

    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )

    access_token = create_acces_token(user.id)
    refresh_token = generate_refresh_token()
    refresh_token_hash = hash_refresh_token(refresh_token)
    csrf_token = generate_csrf_token()

    now = datetime.now(timezone.utc)

    db_refresh_token = RefreshToken(
        user_id=user.id,
        token_hash=refresh_token_hash,
        expires_at=now + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
    )

    db.add(db_refresh_token)
    db.commit()

    response = RedirectResponse(
        url="http://127.0.0.1:5173/dashboard"
    )

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/"
    )

    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/"
    )

    return response

@router.get("/discord")
async def discord_login(request: Request):
    redirect_uri = settings.DISCORD_REDIRECT_URI

    return await discord_client.authorize_redirect(
        request,
        redirect_uri
    )

@router.get("/discord/callback")
async def discord_callback(
    request: Request,
    db: Session = Depends(get_db)
):
    try:
        token = await discord_client.authorize_access_token(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Discord OAuth2 failed: {str(e)}"
        )

    user_response = await discord_client.get("users/@me", token=token)

    if user_response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to get user info from Discord"
        )

    user_info = user_response.json()

    email = user_info.get("email")
    is_verified = user_info.get("verified")

    if not email or not is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verified email found on Discord account"
        )

    name = user_info.get("global_name") or user_info.get("username")

    user = db.scalar(
        select(User).where(User.email == email)
    )

    if not user:
        random_password = secrets.token_urlsafe(32)

        user = User(
            name=name,
            email=email,
            password_hash=hash_password(random_password)
        )

        db.add(user)
        db.commit()
        db.refresh(user)

    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )

    access_token = create_acces_token(user.id)
    refresh_token = generate_refresh_token()
    refresh_token_hash = hash_refresh_token(refresh_token)
    csrf_token = generate_csrf_token()

    now = datetime.now(timezone.utc)

    db_refresh_token = RefreshToken(
        user_id=user.id,
        token_hash=refresh_token_hash,
        expires_at=now + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
    )

    db.add(db_refresh_token)
    db.commit()

    response = RedirectResponse(
        url="http://127.0.0.1:5173/dashboard"
    )

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/"
    )

    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/"
    )

    return response