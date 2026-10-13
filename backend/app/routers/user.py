import uuid

from math import ceil

from supabase import create_client, Client
from app.core.config import settings

from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user

from app.models.user import User
from app.models.user_profile import UserProfile

from app.schemas.user_profile import (
    UserProfileUpdate,
    UserProfileResponse,
    ProfilePhotoUploadResponse,
    MemberSearchItem,
    MemberSearchResponse
)


router = APIRouter(
    prefix="/users",
    tags=["Users"],
)

supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SECRET_KEY
)

@router.get(
    "/me",
    response_model=UserProfileResponse,
    status_code=status.HTTP_200_OK,
)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.scalar(
        select(UserProfile).where(
            UserProfile.user_id == current_user.id
        )
    )

    if not profile:
        profile = UserProfile(
            user_id=current_user.id
        )

        db.add(profile)
        db.commit()
        db.refresh(profile)

    profile_photo_signed_url = None

    if profile.profile_photo_url:
        try:
            result = (
                supabase.storage
                .from_(settings.SUPABASE_STORAGE_BUCKET)
                .create_signed_url(
                    profile.profile_photo_url,
                    3600,
                )
            )

            profile_photo_signed_url = result["signedURL"]

        except Exception as e:
            print("SUPABASE SIGNED URL ERROR:", repr(e))

    return {
        "user_id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "profile_photo_url": profile.profile_photo_url,
        "profile_photo_signed_url": profile_photo_signed_url,
        "phone_number": profile.phone_number,
        "bio": profile.bio,
        "description": profile.description,
        "github_url": profile.github_url,
        "linkedin_url": profile.linkedin_url,
        "instagram_url": profile.instagram_url,
        "website_url": profile.website_url,
    }


@router.patch(
    "/me",
    response_model=UserProfileResponse,
    status_code=status.HTTP_200_OK,
)
def update_my_profile(
    profile_data: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.scalar(
        select(UserProfile).where(
            UserProfile.user_id == current_user.id
        )
    )

    if not profile:
        profile = UserProfile(
            user_id=current_user.id
        )

        db.add(profile)

    update_data = profile_data.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)

    profile_photo_signed_url = None

    if profile.profile_photo_url:
        try:
            result = (
                supabase.storage
                .from_(settings.SUPABASE_STORAGE_BUCKET)
                .create_signed_url(
                    profile.profile_photo_url,
                    3600,
                )
            )

            profile_photo_signed_url = result["signedURL"]

        except Exception as e:
            print("SUPABASE SIGNED URL ERROR:", repr(e))

    return {
        "user_id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "profile_photo_url": profile.profile_photo_url,
        "profile_photo_signed_url": profile_photo_signed_url,
        "phone_number": profile.phone_number,
        "bio": profile.bio,
        "description": profile.description,
        "github_url": profile.github_url,
        "linkedin_url": profile.linkedin_url,
        "instagram_url": profile.instagram_url,
        "website_url": profile.website_url,
    }

@router.post(
    "/me/profile-photo/upload-url",
    response_model=ProfilePhotoUploadResponse,
    status_code=status.HTTP_200_OK
)
def create_profile_photo_upload_url(
    current_user: User = Depends(get_current_user)
):
    file_path = (
        f"users/{current_user.id}"
        f"{uuid.uuid4()}.jpg"
    )

    try:
        result = supabase.storage.from_(
            settings.SUPABASE_STORAGE_BUCKET
        ).create_signed_upload_url(
            file_path
        )

        return {
            "path": file_path,
            "token": result["token"],
            "signed_url": result["signed_url"]
        }

    except Exception as e:
        print("SUPABASE ERROR:", repr(e))

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create profile photo upload url"
        ) from e

@router.get(
    "/search",
    response_model=MemberSearchResponse,
    status_code=status.HTTP_200_OK
)
def search_members(
    q: str = "",
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if page < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Page must be at least 1"
        )

    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit must be between 1 and 100"
        )

    conditions = [
        User.is_active.is_(True)
    ]

    keyword = q.strip()

    if keyword:
        pattern = f"%{keyword}%"
        conditions.append(
            or_(
                User.name.ilike(pattern),
                User.email.ilike(pattern)
            )
        )

    total = db.scalar(
        select(func.count(User.id)).where(*conditions)
    ) or 0

    users = db.scalars(
        select(User)
        .where(*conditions)
        .order_by(User.name.asc(), User.id.asc())
        .offset((page - 1) * limit)
        .limit(limit)
    ).all()

    if not users:
        return MemberSearchResponse(
            items=[],
            total=0,
            page=page,
            limit=limit,
            total_pages=0
        )

    user_ids = [user.id for user in users]

    profiles = {}

    if user_ids:
        profile_rows = db.scalars(
            select(UserProfile).where(
                UserProfile.user_id.in_(user_ids)
            )
        ).all()

        profiles = {
            profile.user_id: profile
            for profile in profile_rows
        }

        items = []

        for user in users:
            profile = profiles.get(user.id)

            signed_url = None
            photo_path = profile.profile_photo_url if profile else None

            if photo_path:
                try:
                    result = (
                        supabase.storage
                        .from_(settings.SUPABASE_STORAGE_BUCKET)
                        .create_signed_url(photo_path, 3600)
                    )
                    signed_url = result["signedURL"]
                except Exception as e:
                    print("SUPABASE SIGNED URL ERROR:", repr(e))

            items.append(
                MemberSearchItem(
                    user_id=user.id,
                    name=user.name,
                    email=user.email,
                    profile_photo_url=photo_path,
                    profile_photo_signed_url=signed_url,
                    bio=profile.bio if profile else None
                )
            )

    return MemberSearchResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=ceil(total / limit) if total else 0
    )