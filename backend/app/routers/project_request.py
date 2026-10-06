from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select,func
from sqlalchemy.orm import Session, aliased

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.project_request import ProjectRequest
from app.utils.workspace_permission import get_workspace_member
from app.utils.pagination import get_pagination
from app.schemas.project_request import ProjectJoinRequestResponse, ProjectRequestResponse
from app.schemas.pagination import PaginatedResponse

Reviewer = aliased(User)

router = APIRouter(
    prefix="/project_requests",
    tags=["Project Requests"]
)

@router.post(
    "/{request_id}/approve",
    status_code=status.HTTP_200_OK
)
def approve_project_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    request = db.scalar(
        select(ProjectRequest).where(
            ProjectRequest.id == request_id
        )
    )

    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project request not found"
        )

    if request.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This request has already been reviewed"
        )

    if request.action != "CREATE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint only handles CREATE requests"
        )

    project = db.scalar(
        select(Project).where(
            Project.id == request.project_id
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

    if workspace_member.role != "OWNER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owner can approve project creation"
        )

    project.status = "ACTIVE"

    project_member = db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == request.requested_by
        )
    )

    if not project_member:
        project_member = ProjectMember(
            project_id=project.id,
            user_id=request.requested_by,
            added_by=current_user.id
        )

        db.add(project_member)

    request.status = "APPROVED"
    request.reviewed_by = current_user.id
    request.reviewed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(project)

    return {
        "message": "Project creation request approved",
        "project_id": project.id,
        "status": project.status
    }

@router.post(
    "/{request_id}/reject",
    status_code=status.HTTP_200_OK
)
def reject_project_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    request = db.scalar(
        select(ProjectRequest).where(
            ProjectRequest.id == request_id
        )
    )

    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project request not found"
        )

    if request.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This request has already been reviewed"
        )

    if request.action != "CREATE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint only handles CREATE requests"
        )

    project = db.scalar(
        select(Project).where(
            Project.id == request.project_id
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

    if workspace_member.role != "OWNER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owner can reject project creation"
        )

    request.status = "REJECTED"
    request.reviewed_by = current_user.id
    request.reviewed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(project)

    return {
        "message": "Project creation request rejected",
        "project_id": project.id,
        "status": request.status
    }

@router.get(
    "/projects/{project_id}/join",
    response_model=PaginatedResponse[ProjectJoinRequestResponse],
    status_code=status.HTTP_200_OK
)
def get_pending_join_requests(
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

    if project.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owner can view join requests"
        )

    total = db.scalar(
        select(func.count(ProjectRequest.id))
        .where(
            ProjectRequest.project_id == project_id,
            ProjectRequest.action == "JOIN",
            ProjectRequest.status == "PENDING"
        )
    ) or 0

    offset, total_pages = get_pagination(
        page=page,
        page_size=page_size,
        total=total
    )

    results = db.execute(
        select(
            ProjectRequest.id,
            ProjectRequest.project_id,
            User.id.label("user_id"),
            User.name,
            User.email,
            ProjectRequest.created_at
        )
        .join(
            User,
            User.id == ProjectRequest.requested_by
        )
        .where(
            ProjectRequest.project_id == project_id,
            ProjectRequest.action == "JOIN",
            ProjectRequest.status == "PENDING"
        )
        .order_by(
            ProjectRequest.created_at.desc()
        )
        .offset(offset)
        .limit(page_size)
    ).all()

    requests = [
        {
            "id": row.id,
            "project_id": row.project_id,
            "user_id": row.user_id,
            "name": row.name,
            "email": row.email,
            "created_at": row.created_at
        }
        for row in results
    ]

    return {
        "items": requests,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages
    }

@router.post(
    "/{request_id}/approve-join",
    status_code=status.HTTP_200_OK
)
def approve_join_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    request = db.scalar(
        select(ProjectRequest).where(
            ProjectRequest.id == request_id
        )
    )

    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project request not found"
        )

    if request.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This request has already been reviewed"
        )

    if request.action != "JOIN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint only handles JOIN requests"
        )

    project = db.scalar(
        select(Project).where(
            Project.id == request.project_id
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
            detail="Only project owner can approve join requests"
        )

    workspace_member = get_workspace_member(
        db=db,
        workspace_id=project.workspace_id,
        user_id=current_user.id
    )

    if not workspace_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Requester is no longer a member of this workspace"
        )

    project_member = db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == request.requested_by
        )
    )

    if project_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this project"
        )

    project_member = ProjectMember(
        project_id=project.id,
        user_id=request.requested_by,
        added_by=current_user.id
    )

    db.add(project_member)

    request.status = "APPROVED"
    request.reviewed_by = current_user.id
    request.reviewed_at = datetime.now(timezone.utc)

    db.commit()

    return {
        "message": "Project join request approved",
        "project_id": project.id,
        "user_id": request.requested_by,
        "status": request.status
    }

@router.post(
    "/{request_id}/reject-join",
    status_code=status.HTTP_200_OK
)
def reject_join_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    request = db.scalar(
        select(ProjectRequest).where(
            ProjectRequest.id == request_id
        )
    )

    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project request not found"
        )

    if request.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This request has already been reviewed"
        )

    if request.action != "JOIN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint only handles JOIN requests"
        )

    project = db.scalar(
        select(Project).where(
            Project.id == request.project_id
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
            detail="Only project owner can reject join requests"
        )

    request.status = "REJECTED"
    request.reviewed_by = current_user.id
    request.reviewed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(request)

    return {
        "message": "Project join request rejected",
        "project_id": project.id,
        "user_id": request.requested_by,
        "status": request.status
    }

@router.get(
    "/workspaces/{workspace_id}",
    response_model=PaginatedResponse[ProjectRequestResponse],
    status_code=status.HTTP_200_OK
)
def get_workspace_project_requests(
    workspace_id: int,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
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

    if workspace_member.role != "OWNER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owner can view project requests"
        )

    total = db.scalar(
        select(func.count(ProjectRequest.id))
        .join(
            Project,
            Project.id == ProjectRequest.project_id
        )
        .where(
            Project.workspace_id == workspace_id
        )
    ) or 0

    offset, total_pages = get_pagination(
        page=page,
        page_size=page_size,
        total=total
    )

    results = db.execute(
        select(
            ProjectRequest.id,
            ProjectRequest.project_id,
            Project.name.label("project_name"),

            ProjectRequest.requested_by,
            User.name.label("requester_name"),
            User.email.label("requester_email"),

            ProjectRequest.action,
            ProjectRequest.status,

            ProjectRequest.reviewed_by,
            Reviewer.name.label("reviewer_name"),

            ProjectRequest.created_at,
            ProjectRequest.reviewed_at
        )
        .join(
            Project,
            Project.id == ProjectRequest.project_id
        )
        .join(
            User,
            User.id == ProjectRequest.requested_by
        )
        .outerjoin(
            Reviewer,
            Reviewer.id == ProjectRequest.reviewed_by
        )
        .where(
            Project.workspace_id == workspace_id
        )
        .order_by(
            ProjectRequest.created_at.desc()
        )
        .offset(offset)
        .limit(page_size)
    ).all()

    requests = [
        {
            "id": row.id,
            "project_id": row.project_id,
            "project_name": row.project_name,
            "requested_by": row.requested_by,
            "requester_name": row.requester_name,
            "requester_email": row.requester_email,
            "action": row.action,
            "status": row.status,
            "reviewed_by": row.reviewed_by,
            "reviewer_name": row.reviewer_name,
            "created_at": row.created_at,
            "reviewed_at": row.reviewed_at
        }
        for row in results
    ]

    return {
        "items": requests,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages
    }

@router.get(
    "/projects/{project_id}",
    response_model=PaginatedResponse[ProjectRequestResponse],
    status_code=status.HTTP_200_OK
)
def get_project_requests(
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

    if project.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owner can view project requests"
        )

    total = db.scalar(
        select(func.count(ProjectRequest.id))
        .where(
            ProjectRequest.project_id == project_id
        )
    ) or 0

    offset, total_pages = get_pagination(
        page=page,
        page_size=page_size,
        total=total
    )

    results = db.execute(
        select(
            ProjectRequest.id,
            ProjectRequest.project_id,
            Project.name.label("project_name"),

            ProjectRequest.requested_by,
            User.name.label("requester_name"),
            User.email.label("requester_email"),

            ProjectRequest.action,
            ProjectRequest.status,

            ProjectRequest.reviewed_by,
            Reviewer.name.label("reviewer_name"),

            ProjectRequest.created_at,
            ProjectRequest.reviewed_at
        )
        .join(
            Project,
            Project.id == ProjectRequest.project_id
        )
        .join(
            User,
            User.id == ProjectRequest.requested_by
        )
        .outerjoin(
            Reviewer,
            Reviewer.id == ProjectRequest.reviewed_by
        )
        .where(
            ProjectRequest.project_id == project_id
        )
        .order_by(
            ProjectRequest.created_at.desc()
        )
        .offset(offset)
        .limit(page_size)
    ).all()

    requests = [
        {
            "id": row.id,
            "project_id": row.project_id,
            "project_name": row.project_name,
            "requested_by": row.requested_by,
            "requester_name": row.requester_name,
            "requester_email": row.requester_email,
            "action": row.action,
            "status": row.status,
            "reviewed_by": row.reviewed_by,
            "reviewer_name": row.reviewer_name,
            "created_at": row.created_at,
            "reviewed_at": row.reviewed_at
        }
        for row in results
    ]

    return {
        "items": requests,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages
    }