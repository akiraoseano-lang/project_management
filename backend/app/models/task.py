from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

class Task(Base):

    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    project_id: Mapped[int] = mapped_column(
        ForeignKey(
            "projects.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    created_by: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
        ),
        nullable=False
    )

    assigned_to: Mapped[int | None] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="TODO",
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

    project = relationship(
        "Project",
        back_populates="tasks"
    )

    creator = relationship(
        "User",
        foreign_keys=[created_by]
    )

    assignee = relationship(
        "User",
        foreign_keys=[assigned_to]
    )

    checklist_items = relationship(
        "TaskCheckList",
        back_populates="task",
        cascade="all, delete-orphan"
    )