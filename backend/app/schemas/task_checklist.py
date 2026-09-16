from datetime import datetime

from pydantic import BaseModel, ConfigDict

class TaskChecklistCreate(BaseModel):
    title: str

class TaskChecklistResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    title: str
    is_completed: bool
    created_at: datetime
    updated_at: datetime