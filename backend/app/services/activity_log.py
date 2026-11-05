from typing import Any

from sqlalchemy.orm import Session

from app.models.activity_logs import ActivityLogs

def log_activity(
        db: Session,
        workspace_id: int,
        actor_id: int | None,
        action: str,
        entity_type: str,
        entity_id: int | None = None,
        project_id: int | None = None,
        task_id: int | None = None,
        details: dict[str, Any] | None = None
) -> ActivityLogs:
    activity = ActivityLogs(
        workspace_id=workspace_id,
        project_id=project_id,
        task_id=task_id,
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details or {},
    )

    db.add(activity)

    return activity