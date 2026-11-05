
"""preserve activity logs after workspace deletion

Revision ID: fdd4975c6ddd
Revises: 6e9c3587fc37
"""

from typing import Sequence, Union

from alembic import op


revision: str = "fdd4975c6ddd"
down_revision: Union[str, Sequence[str], None] = "6e9c3587fc37"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint(
        "activity_log_workspace_id_fkey",
        "activity_log",
        type_="foreignkey",
    )


def downgrade() -> None:
    op.create_foreign_key(
        "activity_log_workspace_id_fkey",
        "activity_log",
        "workspaces",
        ["workspace_id"],
        ["id"],
        ondelete="CASCADE",
    )
