from datetime import datetime

from pydantic import BaseModel, ConfigDict

class AddWorkspaceMemberRequest(BaseModel):
    user_id: int

class MemberUserResponse(BaseModel):
    id: int
    name: str
    email: str

    model_config = ConfigDict(
        from_attributes=True
    )

class WorkspaceMemberResponse(BaseModel):
    id: int
    role: str
    joined_at: datetime

    user: MemberUserResponse

    model_config = ConfigDict(
        from_attributes=True
    )