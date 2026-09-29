from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.task import Task
from app.models.task_checklist import TaskCheckList
from app.schemas.task_checklist import TaskChecklistCreate, TaskChecklistResponse
from app.schemas.task import TaskCreate, TaskResponse, TaskUpdate
from app.dependencies.auth import get_current_user
from app.utils.workspace_permission import get_workspace_member

router = APIRouter(
    prefix="/projects",
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
        status="TODO"
    )

    db.add(task)
    db.commit()
    db.refresh(task)

    return task

@router.get(
    "/{project_id}/tasks",
    response_model=list[TaskResponse]
)
def get_project_tasks(
    project_id: int,
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

    tasks = db.scalars(
        select(Task)
        .where(Task.project_id == project_id)
        .order_by(Task.created_at.desc())
    ).all()

    return tasks

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

    if not is_workspace_owner and not is_project_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this task"
        )

    if task_data.title is not None:
        task.title = task_data.title

    if task_data.description is not None:
        task.description = task_data.description

    db.commit()
    db.refresh(task)

    return task

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

    task.assigned_to = current_user.id
    task.status = "IN_PROGRESS"

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

    db.commit()
    db.refresh(task)

    return task