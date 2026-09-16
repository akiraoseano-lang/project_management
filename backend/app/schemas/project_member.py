from datetime import datetime 

from pydantic import BaseModel, ConfigDict

class ProjectMemberCreate(BaseModel):
    user_id: int

class ProjectMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    user_id: int
    added_by: int | None
    created_at: datetime