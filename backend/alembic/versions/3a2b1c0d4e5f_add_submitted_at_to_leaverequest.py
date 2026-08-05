"""add submitted_at to LeaveRequest

Revision ID: 3a2b1c0d4e5f
Revises: 212e807955c9
Create Date: 2026-08-05 12:22:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3a2b1c0d4e5f'
down_revision: Union[str, Sequence[str], None] = '212e807955c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('leave_requests', sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('leave_requests', 'submitted_at')
