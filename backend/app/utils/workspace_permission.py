from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.workspace_member import WorkspaceMember

def get_workspace_member(
        db: Session,
        workspace_id: int,
        user_id: int
) -> WorkspaceMember:
    member = db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id
        )
    )

    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace"
        )

    return member

def require_workspace_owner(
        db: Session,
        workspace_id: int,
        user_id: int
) -> WorkspaceMember:
    member = get_workspace_member(
        db,
        workspace_id,
        user_id
    )

    if member.role != "OWNER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owner can perform this action"
        )

    return member

def require_workspace_admin_or_owner(
        db: Session,
        workspace_id: int,
        user_id: int
) -> WorkspaceMember:
    member = get_workspace_member(
        db,
        workspace_id,
        user_id
    )

    if member.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owner or admin can perform this action"
        )

    return member 