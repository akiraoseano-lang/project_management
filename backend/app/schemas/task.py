from datetime import datetime

from pydantic import BaseModel, ConfigDict

class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    assigned_to: int | None = None

class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    title: str
    description: str | None
    created_by: int
    assigned_to: int | None
    status: str
    created_at: datetime
    updated_at: datetime

class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    assigned_to: int | None = None
    status: str | None = None