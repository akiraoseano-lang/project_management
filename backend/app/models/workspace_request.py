from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

class WorkspaceRequest(Base):
    __tablename__ = "workspace_requests"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    workspace_id: Mapped[int] = mapped_column(
        ForeignKey(
            "workspaces.id",
            ondelete="CASCADE",
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
        String(50),
        nullable=False
    )

    target_user_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    payload: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True
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

    workspace = relationship(
        "Workspace",
        back_populates="requests"
    )

    requester = relationship(
        "User",
        foreign_keys=[requested_by],
        back_populates="workspace_requests"
    )

    target_user = relationship(
        "User",
        foreign_keys=[target_user_id]
    )

    reviewer = relationship(
        "User",
        foreign_keys=[reviewed_by]
    )