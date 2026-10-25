from datetime import datetime

from pydantic import BaseModel

from app.schemas.workspace import WorkspaceResponse


class WorkspaceAnalyticsStats(BaseModel):
    total_projects: int
    total_tasks: int
    todo_tasks: int
    in_progress_tasks: int
    done_tasks: int
    unassigned_tasks: int
    my_tasks: int
    total_members: int
    completion_rate: float


class WorkspaceProjectSummary(BaseModel):
    id: int
    name: str
    description: str | None
    status: str
    owner_id: int
    created_at: datetime
    updated_at: datetime
    total_tasks: int
    todo_tasks: int
    in_progress_tasks: int
    done_tasks: int
    progress: float
    member_count: int


class WorkspaceTaskSummary(BaseModel):
    id: int
    project_id: int
    project_name: str
    title: str
    description: str | None
    status: str
    created_by: int
    creator_name: str | None
    assigned_to: int | None
    assignee_name: str | None
    created_at: datetime
    updated_at: datetime


class WorkspaceMemberSummary(BaseModel):
    id: int
    user_id: int
    name: str
    email: str
    role: str
    joined_at: datetime


class WorkspaceAnalyticsResponse(BaseModel):
    workspace: WorkspaceResponse
    role: str
    stats: WorkspaceAnalyticsStats
    projects: list[WorkspaceProjectSummary]
    members: list[WorkspaceMemberSummary]
    recent_tasks: list[WorkspaceTaskSummary]
