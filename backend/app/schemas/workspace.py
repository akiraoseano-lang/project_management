from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

class WorkspaceCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=150
    )

    description: str | None = Field(
        default=None,
        max_length=2000
    )

class WorkspaceUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=150
    )

    description: str | None = Field(
        default=None,
        max_length=2000
    )

class WorkspaceMemberResponse(BaseModel):
    id: int
    user_id: int
    workspace_id: int
    role: str
    joined_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )

class WorkspaceResponse(BaseModel):
    id: int
    name: str
    description: str | None
    owner_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )