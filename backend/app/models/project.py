from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

class Project(Base):

    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    workspace_id: Mapped[int] = mapped_column(
        ForeignKey(
            "workspaces.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    created_by: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        ),
        nullable=False
    )

    owner_id: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="ACTIVE",
        nullable=False,
        index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    workspace = relationship(
        "Workspace",
        back_populates="projects"
    )

    creator = relationship(
        "User",
        foreign_keys=[created_by],
        back_populates="created_project"
    )

    members = relationship(
        "ProjectMember",
        back_populates="project",
        cascade="all, delete-orphan"
    )

    tasks = relationship(
        "Task",
        back_populates="project",
        cascade="all, delete-orphan"
    )

    owner = relationship(
        "User",
        foreign_keys=[owner_id],
        back_populates="owned_projects"
    )

    requests = relationship(
        "ProjectRequest",
        back_populates="project",
        cascade="all, delete-orphan"
    )