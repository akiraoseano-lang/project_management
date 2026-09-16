from datetime import datetime 

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

class ProjectRequest(Base):
    __tablename__ = "project_requests"

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

    requested_by: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    action: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="PENDING",
        nullable=False,
        index=True
    )

    reviewed_by: Mapped[int | None] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    project = relationship(
        "Project",
        back_populates="requests"
    )

    requester = relationship(
        "User",
        foreign_keys=[requested_by]
    )

    reviewer = relationship(
        "User",
        foreign_keys=[reviewed_by]
    )