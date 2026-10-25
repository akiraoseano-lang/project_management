from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session, aliased

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.task import Task
from app.models.task_checklist import TaskCheckList
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.pagination import PaginatedResponse
from app.schemas.task import TaskSummaryResponse
from app.utils.pagination import get_pagination

my_task_router = APIRouter(
    prefix="/tasks",
    tags=["My Tasks"],
)

VALID_TASK_STATUSES = {"TODO", "IN_PROGRESS", "DONE"}


def _normalize_status_filter(status_filter: str | None) -> str | None:
    if status_filter is None:
        return None

    normalized = status_filter.strip().upper()

    if not normalized or normalized == "ALL":
        return None

    if normalized not in VALID_TASK_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid task status filter",
        )

    return normalized


def _build_conditions(
    current_user_id: int,
    status_filter: str | None,
    project_id: int | None,
    workspace_id: int | None,
    q: str | None,
    only_mine: bool,
):
    conditions = [
        Project.status == "ACTIVE",
        ProjectMember.user_id == current_user_id,
    ]

    normalized_status = _normalize_status_filter(status_filter)

    if normalized_status is not None:
        conditions.append(Task.status == normalized_status)

    if project_id is not None:
        conditions.append(Task.project_id == project_id)

    if workspace_id is not None:
        conditions.append(Project.workspace_id == workspace_id)

    if q and q.strip():
        search_pattern = f"%{q.strip()}%"
        conditions.append(
            or_(
                Task.title.ilike(search_pattern),
                Task.description.ilike(search_pattern),
                Project.name.ilike(search_pattern),
            )
        )

    # The "my tasks" feed must always be scoped to the current user.
    if only_mine:
        conditions.append(Task.assigned_to == current_user_id)

    return conditions


def _checklist_count_subquery():
    return (
        select(
            TaskCheckList.task_id.label("task_id"),
            func.count(TaskCheckList.id).label("total"),
            func.coalesce(
                func.sum(
                    case(
                        (TaskCheckList.is_completed.is_(True), 1),
                        else_=0,
                    )
                ),
                0,
            ).label("done"),
        )
        .group_by(TaskCheckList.task_id)
        .subquery()
    )


def _paginated_task_feed(
    db: Session,
    current_user: User,
    page: int,
    page_size: int,
    status_filter: str | None,
    project_id: int | None,
    workspace_id: int | None,
    q: str | None,
    only_mine: bool,
) -> dict:
    page = max(page, 1)
    page_size = max(1, min(page_size, 100))

    conditions = _build_conditions(
        current_user_id=current_user.id,
        status_filter=status_filter,
        project_id=project_id,
        workspace_id=workspace_id,
        q=q,
        only_mine=only_mine,
    )

    total = db.scalar(
        select(func.count(Task.id))
        .join(Project, Task.project_id == Project.id)
        .join(
            ProjectMember,
            ProjectMember.project_id == Project.id,
        )
        .where(*conditions)
    ) or 0

    offset, total_pages = get_pagination(
        page=page,
        page_size=page_size,
        total=total,
    )

    checklist_counts = _checklist_count_subquery()
    assignee = aliased(User)
    creator = aliased(User)

    rows = db.execute(
        select(
            Task,
            Project.name,
            Project.workspace_id,
            Workspace.name,
            creator.name,
            assignee.name,
            func.coalesce(checklist_counts.c.total, 0),
            func.coalesce(checklist_counts.c.done, 0),
        )
        .join(Project, Task.project_id == Project.id)
        .join(Workspace, Project.workspace_id == Workspace.id)
        .join(
            ProjectMember,
            ProjectMember.project_id == Project.id,
        )
        .join(creator, Task.created_by == creator.id)
        .outerjoin(assignee, Task.assigned_to == assignee.id)
        .outerjoin(
            checklist_counts,
            checklist_counts.c.task_id == Task.id,
        )
        .where(*conditions)
        .order_by(Task.updated_at.desc())
        .offset(offset)
        .limit(page_size)
    ).all()

    items = [
        TaskSummaryResponse(
            id=task.id,
            project_id=task.project_id,
            project_name=project_name,
            workspace_id=project_workspace_id,
            workspace_name=workspace_name,
            title=task.title,
            description=task.description,
            status=task.status,
            created_by=task.created_by,
            creator_name=creator_name,
            assigned_to=task.assigned_to,
            assignee_name=assignee_name,
            checklist_total=checklist_total,
            checklist_done=checklist_done,
            created_at=task.created_at,
            updated_at=task.updated_at,
        )
        for (
            task,
            project_name,
            project_workspace_id,
            workspace_name,
            creator_name,
            assignee_name,
            checklist_total,
            checklist_done,
        ) in rows
    ]

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
    }


@my_task_router.get(
    "/my",
    response_model=PaginatedResponse[TaskSummaryResponse],
    status_code=status.HTTP_200_OK,
)
def get_my_tasks(
    page: int = 1,
    page_size: int = 10,
    status_filter: str | None = Query(default=None, alias="status"),
    project_id: int | None = None,
    workspace_id: int | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tasks that are assigned to the authenticated user only."""

    return _paginated_task_feed(
        db=db,
        current_user=current_user,
        page=page,
        page_size=page_size,
        status_filter=status_filter,
        project_id=project_id,
        workspace_id=workspace_id,
        q=q,
        only_mine=True,
    )


@my_task_router.get(
    "",
    response_model=PaginatedResponse[TaskSummaryResponse],
    status_code=status.HTTP_200_OK,
)
def get_all_tasks(
    page: int = 1,
    page_size: int = 10,
    status_filter: str | None = Query(default=None, alias="status"),
    project_id: int | None = None,
    workspace_id: int | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Every task inside projects the authenticated user belongs to."""

    return _paginated_task_feed(
        db=db,
        current_user=current_user,
        page=page,
        page_size=page_size,
        status_filter=status_filter,
        project_id=project_id,
        workspace_id=workspace_id,
        q=q,
        only_mine=False,
    )
