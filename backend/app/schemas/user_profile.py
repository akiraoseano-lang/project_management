from pydantic import BaseModel, ConfigDict

class UserProfileUpdate(BaseModel):
    profile_photo_url: str | None = None
    phone_number: str | None = None
    bio: str | None = None
    description: str | None = None
    github_url: str | None = None
    linkedin_url: str | None = None
    instagram_url: str | None = None
    website_url: str | None = None

class UserProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    name: str
    email: str

    profile_photo_url: str | None
    phone_number: str | None
    bio: str | None
    description: str | None

    github_url: str | None
    linkedin_url: str | None
    instagram_url: str | None
    website_url: str | None