from fastapi import APIRouter, Depends, HTTPException, status

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.workspace import Workspace
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.project_request import ProjectRequest
from app.schemas.project import ProjectCreate, ProjectResponse
from app.schemas.project_member import ProjectMemberResponse
from app.utils.workspace_permission import get_workspace_member

router = APIRouter(
    prefix="/workspaces",
    tags=["Projects"]
)


@router.post(
    "/{workspace_id}/projects",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED
)
def create_project(
    workspace_id: int,
    project_data: ProjectCreate,
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

    workspace_member = get_workspace_member(
        db=db,
        workspace_id=workspace_id,
        user_id=current_user.id
    )

    if not workspace_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace"
        )

    if workspace_member.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owner or admin can create projects"
        )

    if workspace_member.role == "OWNER":
        project = Project(
            workspace_id=workspace_id,
            name=project_data.name,
            description=project_data.description,
            created_by=current_user.id,
            owner_id=current_user.id,
            status="ACTIVE"
        )

        db.add(project)
        db.flush()

        project_member = ProjectMember(
            project_id=project.id,
            user_id=current_user.id,
            added_by=current_user.id
        )

        db.add(project_member)

        db.commit()
        db.refresh(project)

        return project

    project = Project(
        workspace_id=workspace_id,
        name=project_data.name,
        description=project_data.description,
        created_by=current_user.id,
        owner_id=current_user.id,
        status="PENDING"
    )

    db.add(project)
    db.flush()

    project_request = ProjectRequest(
        project_id=project.id,
        requested_by=current_user.id,
        action="CREATE",
        status="PENDING"
    )

    db.add(project_request)

    db.commit()
    db.refresh(project)

    return project

@router.post(
    "/projects/{project_id}/join",
    status_code=status.HTTP_201_CREATED
)
def request_join_project(
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
            detail="Projet not found"
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

    if project_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of this project"
        )

    existing_request = db.scalar(
        select(ProjectRequest).where(
            ProjectRequest.project_id == project_id,
            ProjectRequest.requested_by == current_user.id,
            ProjectRequest.action == "JOIN",
            ProjectRequest.status == "PENDING"
        )
    )

    if existing_request:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a pending join request"
        )

    request = ProjectRequest(
        project_id=project_id,
        requested_by=current_user.id,
        action="JOIN",
        status="PENDING"
    )

    db.add(request)
    db.commit()
    db.refresh(request)

    return {
        "message": "Join request sent",
        "request_id": request.id,
        "project_id": project_id,
        "status": request.status
    }

@router.get(
    "/{project_id}",
    status_code=status.HTTP_200_OK
)
def get_project(
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

    if project.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project is not active"
        )

    return project

@router.get(
    "/{project_id}/members",
    response_model=list[ProjectMemberResponse],
    status_code=status.HTTP_200_OK
)
def get_project_members(
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
    ).all()

    return [
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

@router.delete(
    "/{project_id}/members/{user_id}",
    status_code=status.HTTP_200_OK
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

    if project.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project is not active"
        )

    if project.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owner can remove members"
        )

    if project.owner_id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project owner cannot be removed" 
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

    db.delete(project_member)
    db.commit()

    return {
        "message": "Project member removed",
        "project_id": project_id,
        "user_id": user_id
    }