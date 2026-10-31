from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import Session, joinedload, aliased
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.models.workspace_request import WorkspaceRequest
from app.schemas.workspace import WorkspaceCreate, WorkspaceResponse, WorkspaceUpdate, WorkspaceDiscoverResponse
from app.schemas.workspace_member import WorkspaceMemberResponse, AddWorkspaceMemberRequest, UpdateWorkspaceMemberRequest
from app.schemas.workspace_request import WorkspaceRequestCreate, WorkspaceRequestResponse
from app.schemas.pagination import PaginatedResponse
from app.schemas.workspace_analytics import (
    WorkspaceAnalyticsResponse,
    WorkspaceAnalyticsStats,
    WorkspaceMemberSummary,
    WorkspaceProjectSummary,
    WorkspaceTaskSummary,
)
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
    ) or 0

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
    "/search",
    response_model=PaginatedResponse[WorkspaceResponse],
    status_code=status.HTTP_200_OK
)
def search_workspaces(
    q: str,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    search_term = q.strip()

    if not search_term:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query cannot be empty"
        )

    page = max(page, 1)
    page_size = max(1, min(page_size, 100))
    search_pattern = f"%{search_term}%"

    conditions = or_(
        Workspace.name.ilike(search_pattern),
        Workspace.description.ilike(search_pattern)
    )

    total = db.scalar(
        select(func.count(Workspace.id))
        .join(WorkspaceMember)
        .where(
            WorkspaceMember.user_id == current_user.id,
            conditions,
        )
    ) or 0

    offset, total_pages = get_pagination(
        page=page,
        page_size=page_size,
        total=total
    )

    workspaces = db.scalars(
        select(Workspace)
        .join(WorkspaceMember)
        .where(
            WorkspaceMember.user_id == current_user.id,
            conditions,
        )
        .order_by(Workspace.created_at.desc())
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
    "/discover",
    response_model=PaginatedResponse[WorkspaceDiscoverResponse],
    status_code=status.HTTP_200_OK
)
def discover_workspaces(
    q: str = "",
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    search_term = q.strip()
    page = max(page, 1)
    page_size = max(1, min(page_size, 100))

    conditions = []

    if search_term:
        search_pattern = f"%{search_term}%"
        conditions.append(
            or_(
                Workspace.name.ilike(search_pattern),
                Workspace.description.ilike(search_pattern)
            )
        )

    total = db.scalar(
        select(func.count(Workspace.id))
        .where(*conditions)
    ) or 0

    offset, total_pages = get_pagination(
        page=page,
        page_size=page_size,
        total=total
    )

    membership = aliased(WorkspaceMember)

    join_status_subquery = (
        select(WorkspaceRequest.status)
        .where(
            WorkspaceRequest.workspace_id == Workspace.id,
            WorkspaceRequest.requested_by == current_user.id,
            WorkspaceRequest.action == "JOIN"
        )
        .order_by(WorkspaceRequest.created_at.desc())
        .limit(1)
        .correlate(Workspace)
        .scalar_subquery()
    )

    rows = db.execute(
        select(
            Workspace,
            membership.id.label("membership_id"),
            join_status_subquery.label("join_status")
        )
        .outerjoin(
            membership,
            and_(
                membership.workspace_id == Workspace.id,
                membership.user_id == current_user.id
            )
        )
        .where(*conditions)
        .order_by(Workspace.name.asc())
        .offset(offset)
        .limit(page_size)
    ).all()

    items = [
        WorkspaceDiscoverResponse(
            id=workspace.id,
            name=workspace.name,
            description=workspace.description,
            owner_id=workspace.owner_id,
            created_at=workspace.created_at,
            updated_at=workspace.updated_at,
            is_member=membership_id is not None,
            join_status=join_status
        )
        for workspace, membership_id, join_status in rows
    ]

    return {
        "items": items,
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

@router.patch(
    "/{workspace_id}/members/{user_id}",
    response_model=WorkspaceMemberResponse,
    status_code=status.HTTP_200_OK
)
def update_workspace_member_role(
    workspace_id: int,
    user_id: int,
    payload: UpdateWorkspaceMemberRequest,
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
            detail="Only workspace owner can change member roles"
        )

    member = db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id
        )
    )

    if member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )

    if member.role == "OWNER":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workspace owner role cannot be changed"
        )

    new_role = payload.role.strip().upper()

    if new_role not in ["ADMIN", "COLLABORATOR"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid workspace role"
        )

    if member.role == new_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has this role"
        )

    member.role = new_role

    db.commit()
    db.refresh(member)

    member = db.execute(
        select(WorkspaceMember)
        .options(
            joinedload(WorkspaceMember.user)
        )
        .where(
            WorkspaceMember.id == member.id
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
    "/{workspace_id}/join",
    response_model=WorkspaceRequestResponse,
    status_code=status.HTTP_201_CREATED
)
def request_join_workspace(
    workspace_id: int,
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

    member = db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == current_user.id
        )
    )

    if member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of this workspace"
        )

    pending_request = db.scalar(
        select(WorkspaceRequest).where(
            WorkspaceRequest.workspace_id == workspace_id,
            WorkspaceRequest.requested_by == current_user.id,
            WorkspaceRequest.action == "JOIN",
            WorkspaceRequest.status == "PENDING"
        )
    )

    if pending_request:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a pending join request"
        )

    join_request = WorkspaceRequest(
        workspace_id=workspace_id,
        requested_by=current_user.id,
        action="JOIN",
        status="PENDING"
    )

    db.add(join_request)
    db.commit()
    db.refresh(join_request)

    return join_request

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
        .options(
            joinedload(WorkspaceRequest.requester),
            joinedload(WorkspaceRequest.target_user)
        )
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

    if workspace_request.action == "JOIN":

        existing_member = db.scalar(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == workspace_request.requested_by
            )
        )

        if existing_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Requester is already a member of this workspace"
            )

        db.add(
            WorkspaceMember(
                workspace_id=workspace_id,
                user_id=workspace_request.requested_by,
                role="COLLABORATOR"
            )
        )

    elif workspace_request.action == "REMOVE_MEMBER":

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


def _workspace_task_summary(
    task: Task,
    project_name: str,
    creator_name: str | None,
    assignee_name: str | None,
) -> WorkspaceTaskSummary:
    return WorkspaceTaskSummary(
        id=task.id,
        project_id=task.project_id,
        project_name=project_name,
        title=task.title,
        description=task.description,
        status=task.status,
        created_by=task.created_by,
        creator_name=creator_name,
        assigned_to=task.assigned_to,
        assignee_name=assignee_name,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.get(
    "/{workspace_id}/analytics",
    response_model=WorkspaceAnalyticsResponse,
    status_code=status.HTTP_200_OK,
)
def get_workspace_analytics(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = db.get(Workspace, workspace_id)

    if workspace is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found",
        )

    current_member = get_workspace_member(
        db=db,
        workspace_id=workspace_id,
        user_id=current_user.id,
    )

    if current_member is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace",
        )

    projects = db.scalars(
        select(Project)
        .where(
            Project.workspace_id == workspace_id,
            Project.status == "ACTIVE",
        )
        .order_by(Project.created_at.desc())
    ).all()

    project_ids = [project.id for project in projects]

    assignee = aliased(User)
    creator = aliased(User)

    task_rows = []
    member_counts: dict[int, int] = {}

    if project_ids:
        task_rows = db.execute(
            select(
                Task,
                Project.name,
                creator.name,
                assignee.name,
            )
            .join(Project, Task.project_id == Project.id)
            .join(creator, Task.created_by == creator.id)
            .outerjoin(assignee, Task.assigned_to == assignee.id)
            .where(
                Project.workspace_id == workspace_id,
                Project.status == "ACTIVE",
            )
            .order_by(Task.updated_at.desc())
        ).all()

        member_counts = {
            project_id: count
            for project_id, count in db.execute(
                select(
                    ProjectMember.project_id,
                    func.count(ProjectMember.id),
                )
                .where(ProjectMember.project_id.in_(project_ids))
                .group_by(ProjectMember.project_id)
            ).all()
        }

    tasks_by_project: dict[int, list[Task]] = {
        project_id: [] for project_id in project_ids
    }

    for task, _, _, _ in task_rows:
        tasks_by_project.setdefault(task.project_id, []).append(task)

    total_tasks = len(task_rows)
    todo_tasks = sum(1 for task, _, _, _ in task_rows if task.status == "TODO")
    in_progress_tasks = sum(
        1 for task, _, _, _ in task_rows if task.status == "IN_PROGRESS"
    )
    done_tasks = sum(1 for task, _, _, _ in task_rows if task.status == "DONE")
    unassigned_tasks = sum(
        1 for task, _, _, _ in task_rows if task.assigned_to is None
    )
    my_tasks = sum(
        1
        for task, _, _, _ in task_rows
        if task.assigned_to == current_user.id
    )

    member_rows = db.execute(
        select(WorkspaceMember, User)
        .join(User, WorkspaceMember.user_id == User.id)
        .where(WorkspaceMember.workspace_id == workspace_id)
        .order_by(WorkspaceMember.joined_at.asc())
    ).all()

    members = [
        WorkspaceMemberSummary(
            id=member.id,
            user_id=member.user_id,
            name=user.name,
            email=user.email,
            role=member.role,
            joined_at=member.joined_at,
        )
        for member, user in member_rows
    ]

    project_summaries = []

    for project in projects:
        project_tasks = tasks_by_project.get(project.id, [])
        project_total = len(project_tasks)
        project_done = sum(
            1 for task in project_tasks if task.status == "DONE"
        )

        project_summaries.append(
            WorkspaceProjectSummary(
                id=project.id,
                name=project.name,
                description=project.description,
                status=project.status,
                owner_id=project.owner_id,
                created_at=project.created_at,
                updated_at=project.updated_at,
                total_tasks=project_total,
                todo_tasks=sum(
                    1 for task in project_tasks if task.status == "TODO"
                ),
                in_progress_tasks=sum(
                    1
                    for task in project_tasks
                    if task.status == "IN_PROGRESS"
                ),
                done_tasks=project_done,
                progress=(
                    round(project_done / project_total * 100, 1)
                    if project_total
                    else 0.0
                ),
                member_count=member_counts.get(project.id, 0),
            )
        )

    recent_tasks = [
        _workspace_task_summary(task, project_name, creator_name, assignee_name)
        for task, project_name, creator_name, assignee_name in task_rows[:5]
    ]

    return WorkspaceAnalyticsResponse(
        workspace=WorkspaceResponse.model_validate(workspace),
        role=current_member.role,
        stats=WorkspaceAnalyticsStats(
            total_projects=len(projects),
            total_tasks=total_tasks,
            todo_tasks=todo_tasks,
            in_progress_tasks=in_progress_tasks,
            done_tasks=done_tasks,
            unassigned_tasks=unassigned_tasks,
            my_tasks=my_tasks,
            total_members=len(members),
            completion_rate=(
                round(done_tasks / total_tasks * 100, 1)
                if total_tasks
                else 0.0
            ),
        ),
        projects=project_summaries,
        members=members,
        recent_tasks=recent_tasks,
    )


@router.get(
    "/{workspace_id}/tasks",
    response_model=PaginatedResponse[WorkspaceTaskSummary],
    status_code=status.HTTP_200_OK,
)
def get_workspace_tasks(
    workspace_id: int,
    page: int = 1,
    page_size: int = 10,
    status_filter: str | None = Query(default=None, alias="status"),
    project_id: int | None = None,
    mine: bool = False,
    q: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = db.get(Workspace, workspace_id)

    if workspace is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found",
        )

    current_member = get_workspace_member(
        db=db,
        workspace_id=workspace_id,
        user_id=current_user.id,
    )

    if current_member is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace",
        )

    conditions = [
        Project.workspace_id == workspace_id,
        Project.status == "ACTIVE",
    ]

    if status_filter:
        normalized_status = status_filter.strip().upper()

        if normalized_status not in {"ALL", "TODO", "IN_PROGRESS", "DONE"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid task status filter",
            )

        if normalized_status != "ALL":
            conditions.append(Task.status == normalized_status)

    if project_id is not None:
        conditions.append(Task.project_id == project_id)

    if mine:
        conditions.append(Task.assigned_to == current_user.id)

    if q and q.strip():
        search_pattern = f"%{q.strip()}%"
        conditions.append(
            or_(
                Task.title.ilike(search_pattern),
                Task.description.ilike(search_pattern),
            )
        )

    total = db.scalar(
        select(func.count(Task.id))
        .join(Project, Task.project_id == Project.id)
        .where(*conditions)
    ) or 0

    offset, total_pages = get_pagination(
        page=page,
        page_size=page_size,
        total=total,
    )

    assignee = aliased(User)
    creator = aliased(User)

    task_rows = db.execute(
        select(
            Task,
            Project.name,
            creator.name,
            assignee.name,
        )
        .join(Project, Task.project_id == Project.id)
        .join(creator, Task.created_by == creator.id)
        .outerjoin(assignee, Task.assigned_to == assignee.id)
        .where(*conditions)
        .order_by(Task.created_at.desc())
        .offset(offset)
        .limit(page_size)
    ).all()

    return {
        "items": [
            _workspace_task_summary(
                task,
                project_name,
                creator_name,
                assignee_name,
            )
            for task, project_name, creator_name, assignee_name in task_rows
        ],
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
    }

