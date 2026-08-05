"""add split leave days

Revision ID: 6f7g8h9i0j1k
Revises: 3a2b1c0d4e5f
Create Date: 2026-08-05 13:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6f7g8h9i0j1k'
down_revision: Union[str, Sequence[str], None] = '3a2b1c0d4e5f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('leave_requests', sa.Column('sick_leave_days', sa.Numeric(5, 2), nullable=True))
    op.add_column('leave_requests', sa.Column('annual_leave_days', sa.Numeric(5, 2), nullable=True))


def downgrade() -> None:
    op.drop_column('leave_requests', 'annual_leave_days')
    op.drop_column('leave_requests', 'sick_leave_days')
