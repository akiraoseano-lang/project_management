from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    func
)

from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base

class ActivityLogs(Base):
    __tablename__ = "activity_log"

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True
    )

    workspace_id = Column(
        Integer,
        nullable=False
    )

    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True
    )

    task_id = Column (
        Integer,
        ForeignKey("tasks.id", ondelete="SET NULL"),
        nullable=True
    )

    actor_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL")
    )

    action = Column(
        String(100),
        nullable=False
    )

    entity_type = Column(
        String(50),
        nullable=False
    )

    entity_id = Column(
        Integer,
        nullable=True
    )

    details = Column(
        "metadata",
        JSONB,
        nullable=False,
        server_default="{}"
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    __table_args__ = (
        Index(
            "ix_activity_logs_workspace_created",
            "workspace_id",
            "created_at"
        ),
        Index(
            "ix_activity_logs_project_created",
            "project_id",
            "created_at"
        ),
        Index(
            "ix_activity_logs_task_created",
            "task_id",
            "created_at"
        ),
        Index(
            "ix_activity_logs_actor_created",
            "actor_id",
            "created_at"
        ),
    )