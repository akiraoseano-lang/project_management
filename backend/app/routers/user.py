from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user

from app.models.user import User
from app.models.user_profile import UserProfile

from app.schemas.user_profile import (
    UserProfileUpdate,
    UserProfileResponse,
)


router = APIRouter(
    prefix="/users",
    tags=["Users"],
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

    return {
        "user_id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,

        "profile_photo_url": profile.profile_photo_url,
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

    return {
        "user_id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,

        "profile_photo_url": profile.profile_photo_url,
        "phone_number": profile.phone_number,
        "bio": profile.bio,
        "description": profile.description,

        "github_url": profile.github_url,
        "linkedin_url": profile.linkedin_url,
        "instagram_url": profile.instagram_url,
        "website_url": profile.website_url,
    }