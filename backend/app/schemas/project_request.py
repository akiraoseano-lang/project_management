from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProjectJoinRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    user_id: int
    name: str
    email: str
    created_at: datetime

class ProjectRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    project_name: str
    requested_by: int
    requester_name: str
    requester_email: str
    action: str
    status: str
    reviewed_by: int | None
    reviewer_name: str | None
    created_at: datetime
    reviewed_at: datetime | None