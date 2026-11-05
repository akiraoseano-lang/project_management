from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.task import Task
from app.models.task_checklist import TaskCheckList
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.schemas.task_checklist import TaskChecklistCreate, TaskChecklistResponse
from app.schemas.task import TaskCreate, TaskResponse, TaskUpdate
from app.schemas.pagination import PaginatedResponse
from app.dependencies.auth import get_current_user
from app.utils.workspace_permission import get_workspace_member
from app.utils.pagination import get_pagination
from app.services.activity_log import log_activity

VALID_TASK_STATUSES = {"TODO", "IN_PROGRESS", "DONE"}

router = APIRouter(
    prefix="/projects",
    tags=["Tasks"]
)

workspace_task_router = APIRouter(
    prefix="/workspaces",
    tags=["Tasks"]
)

@router.post(
    "/{project_id}/tasks",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED
)
def create_task(
    project_id: int,
    task_data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.scalar(
        select(Project).where(
            Project.id == project_id
        )
    )

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    if project.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project is not active"
        )

    workspace_member = get_workspace_member(
        db=db,
        workspace_id=project.workspace_id,
        user_id=current_user.id
    )

    if not workspace_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not member of this workspace"
        )

    project_member = db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id
        )
    )

    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not member of this project"
        )

    if workspace_member.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owner or admin can create tasks"
        )

    if task_data.assigned_to is not None:

        target_member = db.scalar(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == task_data.assigned_to
            )
        )

        if not target_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned user is not a member of this project"
            )

    task = Task(
        project_id=project_id,
        title=task_data.title,
        description=task_data.description,
        created_by=current_user.id,
        assigned_to=task_data.assigned_to,
        status="IN_PROGRESS" if task_data.assigned_to is not None else "TODO"
    )

    db.add(task)
    db.flush()

    log_activity(
        db=db,
        workspace_id=project.workspace_id,
        project_id=project.id,
        task_id=task.id,
        actor_id=current_user.id,
        action="TASK_CREATED",
        entity_type="TASK",
        entity_id=task.id,
        details={
            "task_title": task.title,
            "created_by": current_user.id,
            "assigned_to": task.assigned_to,
            "status": task.status,
        }
    )

    if task.assigned_to is not None:
        log_activity(
            db=db,
            workspace_id=project.workspace_id,
            project_id=project.id,
            task_id=task.id,
            actor_id=current_user.id,
            action="TASK_ASSIGNED",
            entity_type="TASK",
            entity_id=task.id,
            details={
                "task_title": task.title,
                "assigned_to": task.assigned_to,
                "assigned_by": current_user.id,
                "source": "TASK_CREATION"
            }
        )

    db.commit()
    db.refresh(task)

    return task

@router.get(
    "/{project_id}/tasks",
    response_model=PaginatedResponse[TaskResponse],
    status_code=status.HTTP_200_OK
)
def get_project_tasks(
    project_id: int,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.scalar(
        select(Project).where(
            Project.id == project_id
        )
    )

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    if project.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project is not active"
        )

    workspace_member = get_workspace_member(
        db=db,
        workspace_id=project.workspace_id,
        user_id=current_user.id
    )

    if not workspace_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace"
        )

    project_member = db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id
        )
    )

    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this project"
        )

    total = db.scalar(
        select(func.count(Task.id))
        .where(
            Task.project_id == project_id
        )
    ) or 0

    offset, total_pages = get_pagination(
        page=page,
        page_size=page_size,
        total=total
    )

    tasks = db.scalars(
        select(Task)
        .where(
            Task.project_id == project_id
        )
        .order_by(
            Task.created_at.desc()
        )
        .offset(offset)
        .limit(page_size)
    ).all()

    return {
        "items": tasks,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages
    }

@router.get(
    "/tasks/{task_id}",
    response_model=TaskResponse,
    status_code=status.HTTP_200_OK
)
def get_tasks(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.scalar(
        select(Task).where(
            Task.id == task_id
        )
    )

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    project = db.scalar(
        select(Project).where(
            Project.id == task.project_id
        )
    )

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    workspace_member = get_workspace_member(
        db=db,
        workspace_id=project.workspace_id,
        user_id=current_user.id
    )

    if not workspace_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace"
        )

    project_member = db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == current_user.id
        )
    )

    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this project"
        )

    if project.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project is not active"
        )

    return task

@router.patch(
    "/tasks/{task_id}",
    response_model=TaskResponse,
    status_code=status.HTTP_200_OK
)
def update_task(
    task_id: int,
    task_data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.scalar(
        select(Task).where(
            Task.id == task_id
        )
    )

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    old_title = task.title
    old_description = task.description
    old_status = task.status

    project = db.scalar(
        select(Project).where(
            Project.id == task.project_id
        )
    )

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    if project.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project is not active"
        )

    workspace_member = get_workspace_member(
        db=db,
        workspace_id=project.workspace_id,
        user_id=current_user.id
    )

    if not workspace_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace"
        )

    is_workspace_owner = workspace_member.role == "OWNER"
    is_project_owner = project.owner_id == current_user.id
    is_assignee = task.assigned_to == current_user.id

    changes_content = (
        task_data.title is not None
        or task_data.description is not None
    )
    changes_status = task_data.status is not None

    if changes_content and not (is_workspace_owner or is_project_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this task"
        )

    if changes_status and not (
        is_workspace_owner or is_project_owner or is_assignee
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assignee, project owner, or workspace owner can change the task status"
        )

    if changes_status:
        normalized_status = task_data.status.strip().upper()

        if normalized_status not in VALID_TASK_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid task status"
            )

        task.status = normalized_status

    if task_data.title is not None:
        task.title = task_data.title

    if task_data.description is not None:
        task.description = task_data.description

    if task.title != old_title or task.description != old_description:
        log_activity(
            db=db,
            workspace_id=project.workspace_id,
            project_id=project.id,
            task_id=task.id,
            actor_id=current_user.id,
            action="TASK_UPDATED",
            entity_type="TASK",
            entity_id=task.id,
            details={
                "old_title": old_title,
                "new_title": task.title,
                "old_description": old_description,
                "new_description": task.description,
                "updated_by": current_user.id,
            }
        )

    if task.status != old_status:
        log_activity(
            db=db,
            workspace_id=project.workspace_id,
            project_id=project.id,
            task_id=task.id,
            actor_id=current_user.id,
            action="TASK_STATUS_UPDATED",
            entity_type="TASK",
            entity_id=task.id,
            details={
                "task_title": task.title,
                "old_status": old_status,
                "new_status": task.status,
                "changed_by": current_user.id
            }
        )

    db.commit()
    db.refresh(task)

    return task

@router.delete(
        "/task/{task_id}",
        status_code=status.HTTP_200_OK
)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.scalar(
        select(Task).where(
            Task.id == task_id
        )
    )

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    project = db.scalar(
        select(Project).where(
            Project.id == task.project_id
        )
    )

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    if project.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project is not active"
        )

    workspace_member = get_workspace_member(
        db=db,
        workspace_id=project.workspace_id,
        user_id=current_user.id
    )

    if not workspace_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace"
        )

    is_workspace_owner = workspace_member.role == "OWNER"
    is_project_owner = project.owner_id == current_user.id

    if not (is_workspace_owner or is_project_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owner or project owner can delete tasks"
        )

    log_activity(
        db=db,
        workspace_id=project.workspace_id,
        project_id=project.id,
        task_id=task.id,
        actor_id=current_user.id,
        action="TASK_DELETED",
        entity_type="TASK",
        entity_id=task.id,
        details={
            "task_title": task.title,
            "task_description": task.description,
            "assigned_to": task.assigned_to,
            "status": task.status,
            "deleted_by": current_user.id
        }
    )

    db.delete(task)
    db.commit()

    return {
        "message": "Task deleted successfully",
        "task_id": task_id
    }

@router.post(
    "/tasks/{task_id}/checklist",
    response_model=TaskChecklistResponse,
    status_code=status.HTTP_200_OK
)
def create_task_checklist(
    task_id: int,
    data: TaskChecklistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.scalar(
        select(Task).where(
            Task.id == task_id
        )
    )

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    project = db.scalar(
        select(Project).where(
            Project.id == task.project_id
        )
    )

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    if project.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project is not active"
        )

    workspace_member = get_workspace_member(
        db=db,
        workspace_id=project.workspace_id,
        user_id=current_user.id
    )

    if not workspace_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace"
        )

    if workspace_member.role != "OWNER" and project.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owner or project owner can create checklist"
        )

    checklist = TaskCheckList(
        task_id=task.id,
        title=data.title,
        is_completed=False
    )

    db.add(checklist)
    db.flush()

    log_activity(
        db=db,
        workspace_id=project.workspace_id,
        project_id=project.id,
        task_id=task.id,
        actor_id=current_user.id,
        action="TASK_CHECKLIST_CREATION",
        entity_type="TASK_CHECKLIST",
        entity_id=checklist.id,
        details={
            "task_title": task.title,
            "checklist_title": checklist.title,
            "created_by": current_user.id
        }
    )

    db.commit()
    db.refresh(checklist)

    return checklist

@router.get(
    "/tasks/{task_id}/checklist",
    response_model=list[TaskChecklistResponse],
    status_code=status.HTTP_200_OK
)
def get_task_checklist(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.scalar(
        select(Task).where(
            Task.id == task_id
        )
    )

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    project = db.scalar(
        select(Project).where(
            Project.id == task.project_id
        )
    )

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    if project.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project is not active"
        )

    workspace_member = get_workspace_member(
        db=db,
        workspace_id=project.workspace_id,
        user_id=current_user.id
    )

    if not workspace_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace"
        )

    project_member = db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == current_user.id
        )
    )

    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this project"
        )

    checklist_items = db.scalars(
        select(TaskCheckList)
        .where(TaskCheckList.task_id == task_id)
        .order_by(TaskCheckList.created_at.asc())
    ).all()

    return checklist_items

@router.post(
        "/tasks/checklist/{checklist_id}/toggle",
        response_model=TaskChecklistResponse,
        status_code=status.HTTP_200_OK
)
def toggle_task_checklist(
    checklist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    checklist = db.scalar(
        select(TaskCheckList).where(
            TaskCheckList.id == checklist_id
        )
    )

    if not checklist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Checklist not found"
        )

    task = db.scalar(
        select(Task).where(
            Task.id == checklist.task_id
        )
    )

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    project = db.scalar(
        select(Project).where(
            Project.id == task.project_id
        )
    )

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    if project.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project is not active"
        )

    workspace_member = get_workspace_member(
        db=db,
        workspace_id=project.workspace_id,
        user_id=current_user.id
    )

    if not workspace_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace"
        )

    project_member = db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == current_user.id
        )
    )

    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this project"
        )

    if task.assigned_to != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned user can update checklist"
        )

    old_checklist_status = checklist.is_completed,
    old_task_status = task.status

    checklist.is_completed = not checklist.is_completed

    db.flush()

    checklist_items = db.scalars(
        select(TaskCheckList).where(
            TaskCheckList.task_id == task.id
        )
    ).all()

    if checklist_items and all(
        item.is_completed for item in checklist_items
    ):
        task.status = "DONE"
    elif task.status == "DONE":
        task.status = "IN_PROGRESS"

    log_activity(
        db=db,
        workspace_id=project.workspace_id,
        project_id=project.id,
        task_id=task.id,
        actor_id=current_user.id,
        action="TASK_CHECKLIST_TOGGLED",
        entity_type="TASK_CHECKLIST",
        entity_id=checklist.id,
        details={
            "task_title": task.title,
            "checklist_title": checklist.title,
            "old_completed": old_checklist_status,
            "new_completed": checklist.is_completed,
            "changed_by": current_user.id,
        }
    )

    db.commit()
    db.refresh(checklist)

    return checklist

@router.post(
    "/tasks/{task_id}/claim",
    response_model=TaskResponse,
    status_code=status.HTTP_200_OK
)
def claim_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.scalar(
        select(Task).where(
            Task.id == task_id
        )
    )

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    project = db.scalar(
        select(Project).where(
            Project.id == task.project_id
        )
    )

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    if project.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project is not active"
        )

    workspace_member = get_workspace_member(
        db=db,
        workspace_id=project.workspace_id,
        user_id=current_user.id
    )

    if not workspace_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace"
        )

    project_member = db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == current_user.id
        )
    )

    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this project"
        )

    if task.assigned_to is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task is already assigned"
        )

    if task.status == "DONE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Completed task cannot be claimed"
        )

    old_status = task.status

    task.assigned_to = current_user.id
    task.status = "IN_PROGRESS"

    log_activity(
        db=db,
        workspace_id=project.workspace_id,
        project_id=project.id,
        task_id=task.id,
        actor_id=current_user.id,
        action="TASK_ASSIGNED",
        entity_type="TASK",
        entity_id=task.id,
        details={
            "task_title": task.title,
            "assigned_to": current_user.id,
            "source": "CLAIM",
        }
    )

    if old_status != task.status:
        log_activity(
            db=db,
            workspace_id=project.workspace_id,
            project_id=project.id,
            task_id=task.id,
            actor_id=current_user.id,
            action="TASK_STATUS_CHANGED",
            entity_type="TASK",
            entity_id=task.id,
            details={
                "task_title": task.title,
                "old_status": old_status,
                "new_status": task.status,
                "source": "CLAIM",
            }
        )

    db.commit()
    db.refresh(task)

    return task

@router.post(
    "/tasks/{task_id}/unclaim",
    response_model=TaskResponse,
    status_code=status.HTTP_200_OK
)
def unclaim_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.scalar(
        select(Task).where(
            Task.id == task_id
        )
    )

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    project = db.scalar(
        select(Project).where(
            Project.id == task.project_id
        )
    )

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    if project.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project is not active"
        )

    workspace_member = get_workspace_member(
        db=db,
        workspace_id=project.workspace_id,
        user_id=current_user.id
    )

    if not workspace_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace"
        )

    project_member = db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == current_user.id
        )
    )

    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this project"
        )

    if task.assigned_to != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this task"
        )

    task.assigned_to = None
    task.status = "TODO"

    log_activity(
        db=db,
        workspace_id=project.workspace_id,
        project_id=project.id,
        task_id=task.id,
        actor_id=current_user.id,
        action="TASK_UNCLAIMED",
        entity_type="TASK",
        entity_id=task.id,
        details={
            "task_title": task.title,
            "previous_assignee": current_user.id,
            "unclaimed_by": current_user.id,
        }
    )

    db.commit()
    db.refresh(task)

    return task

@workspace_task_router.get(
    "/{workspace_id}/tasks/search",
    response_model=PaginatedResponse[TaskResponse],
    status_code=status.HTTP_200_OK
)
def search_workspace_tasks(
    workspace_id: int,
    q: str,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workspace = db.scalar(
        select(Workspace).where(
            Workspace.id == workspace_id
        )
    )

    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )

    get_workspace_member(
        db=db,
        workspace_id=workspace_id,
        user_id=current_user.id
    )

    search_pattern = f"%{q.strip()}%"

    base_query = (
        select(Task)
        .join(Project, Task.project_id == Project.id)
        .where(
            Project.workspace_id == workspace_id,
            Project.status == "ACTIVE",
            or_(
                Task.title.ilike(search_pattern),
                Task.description.ilike(search_pattern)
            )
        )
    )

    total = db.scalar(
        select(func.count()).select_from(
            base_query.subquery()
        )
    ) or 0

    offset, total_pages = get_pagination(
        page=page,
        page_size=page_size,
        total=total
    )

    page = max(page, 1)
    page_size = max(1, min(page_size, 100))

    tasks = db.scalars(
        base_query
        .order_by(Task.created_at.desc())
        .offset(offset)
        .limit(page_size)
    ).all()

    return {
        "items": tasks,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages
    }