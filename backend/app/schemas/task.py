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
    status: str | None = None

class TaskSummaryResponse(BaseModel):
    """Task row enriched with project, workspace, and checklist info."""

    id: int
    project_id: int
    project_name: str
    workspace_id: int
    workspace_name: str
    title: str
    description: str | None
    status: str
    created_by: int
    creator_name: str | None
    assigned_to: int | None
    assignee_name: str | None
    checklist_total: int
    checklist_done: int
    created_at: datetime
    updated_at: datetime
