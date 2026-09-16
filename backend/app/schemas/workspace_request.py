from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

class WorkspaceRequestCreate(BaseModel):
    action: str = Field(
        min_length=3,
        max_length=50
    )

    target_user_id: int | None = None

    payload: dict | None = None

class WorkspaceRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    workspace_id: int
    requested_by: int
    action: str
    target_user_id: int | None
    payload: dict | None
    status: str
    reviewed_by: int | None
    created_at: datetime
    reviewed_at: datetime | None