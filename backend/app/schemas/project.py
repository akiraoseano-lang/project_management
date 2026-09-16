from datetime import datetime

from pydantic import BaseModel, ConfigDict

class ProjectCreate(BaseModel):
    name: str
    description: str | None

class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    workspace_id: int
    name: str
    description: str | None
    created_by: int
    owner_id: int
    status: str
    created_at: datetime
    updated_at: datetime