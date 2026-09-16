"""add project owner and status

Revision ID: 677082ff12bd
Revises: ce8411858865
Create Date: 2026-09-04 20:56:31.451666
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '677082ff12bd'
down_revision: Union[str, Sequence[str], None] = 'ce8411858865'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'projects',
        sa.Column('owner_id', sa.Integer(), nullable=True)
    )

    op.execute(
        'UPDATE projects SET owner_id = created_by'
    )

    op.alter_column(
        'projects',
        'owner_id',
        existing_type=sa.Integer(),
        nullable=False
    )

    op.add_column(
        'projects',
        sa.Column(
            'status',
            sa.String(length=30),
            nullable=True
        )
    )

    op.execute(
        "UPDATE projects SET status = 'ACTIVE'"
    )

    op.alter_column(
        'projects',
        'status',
        existing_type=sa.String(length=30),
        nullable=False
    )

    op.create_index(
        op.f('ix_projects_owner_id'),
        'projects',
        ['owner_id'],
        unique=False
    )

    op.create_index(
        op.f('ix_projects_status'),
        'projects',
        ['status'],
        unique=False
    )

    op.create_foreign_key(
        'fk_projects_owner_id_users',
        'projects',
        'users',
        ['owner_id'],
        ['id'],
        ondelete='CASCADE'
    )


def downgrade() -> None:
    op.drop_constraint(
        'fk_projects_owner_id_users',
        'projects',
        type_='foreignkey'
    )

    op.drop_index(
        op.f('ix_projects_status'),
        table_name='projects'
    )

    op.drop_index(
        op.f('ix_projects_owner_id'),
        table_name='projects'
    )

    op.drop_column('projects', 'status')
    op.drop_column('projects', 'owner_id')