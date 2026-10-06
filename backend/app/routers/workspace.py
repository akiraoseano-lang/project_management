from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.models.workspace_request import WorkspaceRequest
from app.schemas.workspace import WorkspaceCreate, WorkspaceResponse, WorkspaceUpdate
from app.schemas.workspace_member import WorkspaceMemberResponse, AddWorkspaceMemberRequest
from app.schemas.workspace_request import WorkspaceRequestCreate, WorkspaceRequestResponse
from app.schemas.pagination import PaginatedResponse
from app.dependencies.auth import get_current_user
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.task import Task
from app.utils.pagination import get_pagination

from app.utils.workspace_permission import get_workspace_member

router = APIRouter(
    prefix="/workspaces",
    tags=["Workspaces"]
)

@router.post(
    "",
    response_model=WorkspaceResponse,
    status_code=status.HTTP_201_CREATED
)
def create_workspace(
    data: WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workspace = Workspace(
        name=data.name,
        description=data.description,
        owner_id=current_user.id
    )

    db.add(workspace)
    db.flush()

    workspace_member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=current_user.id,
        role="OWNER"
    )

    db.add(workspace_member)

    db.commit()
    db.refresh(workspace)

    return workspace

@router.get(
    "",
    response_model=PaginatedResponse[WorkspaceResponse],
    status_code=status.HTTP_200_OK
)
def get_workspaces(
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total = db.scalar(
        select(func.count(Workspace.id))
        .join(WorkspaceMember)
        .where(
            WorkspaceMember.user_id == current_user.id
        )
    )

    offset, total_pages = get_pagination(
        page=page,
        page_size=page_size,
        total=total
    )

    workspaces = db.scalars(
        select(Workspace)
        .join(WorkspaceMember)
        .where(
            WorkspaceMember.user_id == current_user.id
        )
        .order_by(
            Workspace.created_at.desc()
        )
        .offset(offset)
        .limit(page_size)
    ).all()

    return {
        "items": workspaces,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages
    }


@router.get(
    "/{workspace_id}",
    response_model=WorkspaceResponse
)
def get_workspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    statement = (
        select(Workspace)
        .join(WorkspaceMember)
        .where(
            Workspace.id == workspace_id,
            WorkspaceMember.user_id == current_user.id
        )
    )

    result = db.execute(statement)

    workspace = result.scalar_one_or_none()

    if workspace is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )

    return workspace

@router.patch(
    "/{workspace_id}",
    response_model=WorkspaceResponse
)
def update_workspace(
    workspace_id: int,
    data: WorkspaceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    statement = (
        select(Workspace)
        .join(WorkspaceMember)
        .where(
            Workspace.id == workspace_id,
            WorkspaceMember.user_id == current_user.id
        )
    )

    workspace = db.execute(
        statement
    ).scalar_one_or_none()

    if workspace is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )

    if workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owner can update this workspace"
        )

    update_data = data.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(workspace, field, value)

    db.commit()
    db.refresh(workspace)

    return workspace

@router.delete(
    "/{workspace_id}",
    status_code=status.HTTP_200_OK
)
def delete_workspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    statement = (
        select(Workspace)
        .join(WorkspaceMember)
        .where(
            Workspace.id == workspace_id,
            WorkspaceMember.user_id == current_user.id
        )
    )

    workspace = db.execute(
        statement
    ).scalar_one_or_none()

    if workspace is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )

    if workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owner can delete this workspace"
        )

    db.delete(workspace)
    db.commit()

    return {
        "message": "Workspace deleted successfully"
    }

@router.get(
    "/{workspace_id}/members",
    response_model=PaginatedResponse[WorkspaceMemberResponse]
)
def get_workspace_members(
    workspace_id: int,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workspace = db.get(Workspace, workspace_id)

    if workspace is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )

    current_member = db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == current_user.id
        )
    )

    if current_member is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace"
        )

    total = db.scalar(
        select(func.count(WorkspaceMember.id))
        .where(
            WorkspaceMember.workspace_id == workspace_id
        )
    ) or 0

    offset, total_pages = get_pagination(
        page=page,
        page_size=page_size,
        total=total
    )

    members = db.scalars(
        select(WorkspaceMember)
        .options(
            joinedload(WorkspaceMember.user)
        )
        .where(
            WorkspaceMember.workspace_id == workspace_id
        )
        .order_by(
            WorkspaceMember.joined_at.desc()
        )
        .offset(offset)
        .limit(page_size)
    ).all()

    return {
        "items": members,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages
    }

@router.post(
    "/{workspace_id}/members",
    response_model=WorkspaceMemberResponse,
    status_code=status.HTTP_201_CREATED
)
def add_workspace_member(
    workspace_id: int,
    payload: AddWorkspaceMemberRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workspace = db.get(
        Workspace,
        workspace_id
    )

    if workspace is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )

    if workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owner can add members"
        )

    user = db.get(
        User,
        payload.user_id
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    existing_member = db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == payload.user_id
        )
    ).scalar_one_or_none()

    if existing_member is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this workspace"
        )

    member = WorkspaceMember(
        workspace_id=workspace_id,
        user_id=payload.user_id,
        role="COLLABORATOR"
    )

    db.add(member)
    db.commit()
    db.refresh(member)

    member = db.execute(
        select(WorkspaceMember)
        .options(
            joinedload(WorkspaceMember.user)
        )
        .where(
            WorkspaceMember.id  == member.id
        )
    ).scalar_one()

    return member

@router.delete(
    "/{workspace_id}/members/me",
    status_code=status.HTTP_200_OK 
)
def leave_workspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workspace = db.get(
        Workspace,
        workspace_id
    )

    if workspace is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )

    if workspace.owner_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workspace owner cannot leave the workspace"
        )

    membership = db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == current_user.id
        )
    ).scalar_one_or_none()

    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace"
        )

    owned_projects = db.scalars(
        select(Project).where(
            Project.workspace_id == workspace_id,
            Project.owner_id == current_user.id
        )
    ).all()

    if owned_projects:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot leave the workspace while you are a project owner"
        )

    assigned_tasks = db.scalars(
        select(Task)
        .join(Project, Task.project_id == Project.id)
        .where(
            Project.workspace_id == workspace_id,
            Task.assigned_to == current_user.id
        )
    ).all()

    for task in assigned_tasks:
        task.assigned_to = None
        task.status = "TODO"

    project_memberships = db.scalars(
        select(ProjectMember)
        .join(Project, ProjectMember.project_id == Project.id)
        .where(
            Project.workspace_id == workspace_id,
            ProjectMember.user_id == current_user.id
        )
    ).all()

    for project_member in project_memberships:
        db.delete(project_member)

    db.delete(membership)

    db.commit()

    return {
        "message": "You have left the workspace successfully"
    }
    
@router.delete(
    "/{workspace_id}/members/{user_id}",
    status_code=status.HTTP_200_OK
)
def remove_workspace_member(
    workspace_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workspace = db.get(
        Workspace,
        workspace_id
    )

    if workspace is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )

    if workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owner can remove members"
        )

    if user_id == workspace.owner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workspace owner cannot be removed"
        )

    member = db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id
        )
    ).scalar_one_or_none()

    if member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not a member of this workspace"
        )

    owned_projects = db.scalars(
        select(Project).where(
            Project.workspace_id == workspace_id,
            Project.owner_id == user_id
        )
    ).all()

    if owned_projects:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This member cannot be removed while they are a project owner"
        )

    assigned_tasks = db.scalars(
        select(Task)
        .join(Project, Task.project_id == Project.id)
        .where(
            Project.workspace_id == workspace_id,
            Task.assigned_to == user_id
        )
    ).all()

    for task in assigned_tasks:
        task.assigned_to = None
        task.status = "TODO"

    project_memberships = db.scalars(
        select(ProjectMember)
        .join(Project, ProjectMember.project_id == Project.id)
        .where(
            Project.workspace_id == workspace_id,
            ProjectMember.user_id == user_id
        )
    ).all()

    for project_member in project_memberships:
        db.delete(project_member)

    db.delete(member)

    db.commit()

    return {
        "message": "Member removed successfully"
    }

@router.post(
    "/{workspace_id}/requests",
    response_model=WorkspaceRequestResponse,
    status_code=status.HTTP_201_CREATED
)
def create_workspace_request(
    workspace_id: int,
    request_data: WorkspaceRequestCreate,
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
    
    member = get_workspace_member(
        db=db,
        workspace_id=workspace_id,
        user_id=current_user.id
    )

    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace"
        )

    if member.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace admin can create approval requests"
        )

    workspace_request = WorkspaceRequest(
        workspace_id=workspace_id,
        requested_by=current_user.id,
        action=request_data.action,
        target_user_id=request_data.target_user_id,
        payload=request_data.payload,
        status="PENDING"
    )

    db.add(workspace_request)
    db.commit()
    db.refresh(workspace_request)

    return workspace_request

@router.get(
    "/{workspace_id}/requests",
    response_model=PaginatedResponse[WorkspaceRequestResponse],
    status_code=status.HTTP_200_OK
)
def get_workspace_requests(
    workspace_id: int,
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

    member = get_workspace_member(
        db=db,
        workspace_id=workspace_id,
        user_id=current_user.id
    )

    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace"
        )

    if member.role != "OWNER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owner can view approval requests"
        )

    total = db.scalar(
        select(func.count(WorkspaceRequest.id))
        .where(
            WorkspaceRequest.workspace_id == workspace_id
        )
    ) or 0

    offset, total_pages = get_pagination(
        page=page,
        page_size=page_size,
        total=total
    )

    requests = db.scalars(
        select(WorkspaceRequest)
        .where(
            WorkspaceRequest.workspace_id == workspace_id
        )
        .order_by(
            WorkspaceRequest.created_at.desc()
        )
        .offset(offset)
        .limit(page_size)
    ).all()

    return {
        "items": requests,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages
    }

@router.patch(
    "/{workspace_id}/requests/{request_id}/approve",
    response_model=WorkspaceRequestResponse
)
def approve_workspace_request(
    workspace_id: int,
    request_id: int,
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

    member = get_workspace_member(
        db=db,
        workspace_id=workspace_id,
        user_id=current_user.id
    )

    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace"
        )

    if member.role != "OWNER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owner can approve requests"
        )

    workspace_request = db.scalar(
        select(WorkspaceRequest).where(
            WorkspaceRequest.id == request_id,
            WorkspaceRequest.workspace_id == workspace_id
        )
    )

    if not workspace_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace request not found"
        )

    if workspace_request.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This request has already been reviewed"
        )

    if workspace_request.action == "REMOVE_MEMBER":

        target_member = db.scalar(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == workspace_request.target_user_id
            )
        )

        if not target_member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target user is not member of this workspace"
            )

        if target_member.role == "OWNER":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Workspace owner cannot be removed"
            )

        owned_projects = db.scalars(
            select(Project).where(
                Project.workspace_id == workspace_id,
                Project.owner_id == workspace_request.target_user_id
            )
        ).all()

        if owned_projects:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This member cannot be removed while they are a project owner"
            )

        assigned_tasks = db.scalars(
            select(Task)
            .join(Project, Task.project_id == Project.id)
            .where(
                Project.workspace_id == workspace_id,
                Task.assigned_to == workspace_request.target_user_id
            )
        ).all()

        for task in assigned_tasks:
            task.assigned_to = None
            task.status = "TODO"

        project_memberships = db.scalars(
            select(ProjectMember)
            .join(Project, ProjectMember.project_id == Project.id)
            .where(
                Project.workspace_id == workspace_id,
                ProjectMember.user_id == workspace_request.target_user_id
            )
        ).all()

        for project_member in project_memberships:
            db.delete(project_member)

        db.delete(target_member)

    elif workspace_request.action == "CHANGE_ROLE":

        target_member = db.scalar(
                    select(WorkspaceMember).where(
                        WorkspaceMember.workspace_id == workspace_id,
                        WorkspaceMember.user_id == workspace_request.target_user_id
                    )
                )
        
        if not target_member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target user is not member of this workspace"
            )

        if not workspace_request.payload:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Role change payload is required"
            )

        new_role = workspace_request.payload.get("new_role")

        if new_role not in ["ADMIN", "COLLABORATOR"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid workspace role"
            )

        if target_member.role == "OWNER":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Workspace owner role cannot be changed"
            )

        if target_member.role == new_role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already has this role"
            )

        target_member.role = new_role

    elif workspace_request.action == "UPDATE_WORKSPACE":

        if not workspace_request.payload:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Workspace update payload is required"
            )

        name = workspace_request.payload.get("name")
        description = workspace_request.payload.get("description")

        if name is None and description is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Name or description is required"
            )

        if name is not None:
            workspace.name = name

        if description is not None:
            workspace.description = description

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported workspace request action"
        )

    workspace_request.status = "APPROVED"
    workspace_request.reviewed_by = current_user.id
    workspace_request.reviewed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(workspace_request)

    return workspace_request

@router.patch(
    "/{workspace_id}/requests/{request_id}/reject",
    response_model=WorkspaceRequestResponse
)
def reject_workspace_request(
    workspace_id: int,
    request_id: int,
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

    member = get_workspace_member(
        db=db,
        workspace_id=workspace_id,
        user_id=current_user.id
    )

    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace"
        )

    if member.role != "OWNER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owner can reject requests"
        )

    workspace_request = db.scalar(
        select(WorkspaceRequest).where(
            WorkspaceRequest.id == request_id,
            WorkspaceRequest.workspace_id == workspace_id
        )
    )

    if not workspace_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace request not found"
        )

    if workspace_request.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This request has already been reviewed"
        )

    workspace_request.status = "REJECTED"
    workspace_request.reviewed_by = current_user.id
    workspace_request.reviewed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(workspace_request)

    return workspace_request 