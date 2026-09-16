from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )

    password_hash: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    role: Mapped[str] = mapped_column(
        String(30),
        default="member",
        nullable=False
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    refresh_tokens = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    owned_workspaces = relationship(
        "Workspace",
        back_populates="owner"
    )

    workspace_memberships = relationship(
        "WorkspaceMember",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    workspace_requests = relationship(
        "WorkspaceRequest",
        foreign_keys="WorkspaceRequest.requested_by",
        back_populates="requester"
    )

    created_project = relationship(
        "Project",
        foreign_keys="Project.created_by",
        back_populates="creator"
    )

    project_memberships = relationship(
        "ProjectMember",
        foreign_keys="ProjectMember.user_id",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    created_tasks = relationship(
        "Task",
        foreign_keys="Task.created_by"
    )

    assigned_tasks = relationship(
        "Task",
        foreign_keys="Task.assigned_to"
    )

    added_project_members = relationship(
        "ProjectMember",
        foreign_keys="ProjectMember.added_by",
        back_populates="added_by_user"
    )

    owned_projects = relationship(
        "Project",
        foreign_keys="Project.owner_id",
        back_populates="owner"
    )