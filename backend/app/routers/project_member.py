from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.schemas.project_member import (
    ProjectMemberCreate,
    ProjectMemberResponse,
)
from app.schemas.pagination import PaginatedResponse
from app.utils.pagination import get_pagination
from app.utils.workspace_permission import get_workspace_member

router = APIRouter(
    prefix="/projects",
    tags=["Project Members"]
)

@router.post(
    "/{project_id}/members",
    response_model=ProjectMemberResponse,
    status_code=status.HTTP_201_CREATED
)
def add_project_member(
    project_id: int,
    data: ProjectMemberCreate,
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

    workspace = db.scalar(
        select(Workspace).where(
            Workspace.id == project.workspace_id
        )
    )

    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )

    current_member = db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.user_id == current_user.id
        )
    )

    if not current_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not member of this workspace"
        )

    if current_member.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owner or admin can add project members"
        )

    if data.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of this project"
        )


    user = db.scalar(
        select(User).where(
            User.id == data.user_id
        )
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    target_workspace_member = db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.user_id == data.user_id
        )
    )

    if not target_workspace_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not a member of this workspace"
        )

    existing_member = db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == data.user_id
        )
    )

    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this project"
        )

    project_member = ProjectMember(
        project_id=project_id,
        user_id=data.user_id,
        added_by=current_user.id
    )

    db.add(project_member)
    db.commit()
    db.refresh(project_member)

    return project_member

@router.get(
    "/{project_id}/members",
    response_model=PaginatedResponse[ProjectMemberResponse],
    status_code=status.HTTP_200_OK
)
def get_project_members(
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
            detail="You are not member of this workspace"
        )

    total = db.scalar(
        select(func.count(ProjectMember.id))
        .where(
            ProjectMember.project_id == project_id
        )
    ) or 0

    offset, total_pages = get_pagination(
        page=page,
        page_size=page_size,
        total=total
    )

    results = db.execute(
        select(
            ProjectMember.id,
            ProjectMember.project_id,
            User.id.label("user_id"),
            User.name,
            User.email,
            ProjectMember.added_by,
            ProjectMember.created_at
        )
        .join(
            User,
            User.id == ProjectMember.user_id
        )
        .where(
            ProjectMember.project_id == project_id
        )
        .order_by(
            ProjectMember.created_at.asc()
        )
        .offset(offset)
        .limit(page_size)
    ).all()

    members = [
        {
            "id": row.id,
            "project_id": row.project_id,
            "user_id": row.user_id,
            "name": row.name,
            "email": row.email,
            "added_by": row.added_by,
            "created_at": row.created_at
        }
        for row in results
    ]

    return {
        "items": members,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages
    }

@router.delete(
    "/{project_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def remove_project_member(
    project_id: int,
    user_id: int,
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

    current_member = db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == project.workspace_id,
            WorkspaceMember.user_id == current_user.id
        )
    )

    if not current_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace"
        )

    if current_member.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owner or admin can remove project member"
        )

    project_member = db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id
        )
    )

    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project member not found"
        )

    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove yourself from the workspace"
        )

    db.delete(project_member)
    db.commit()

    return None