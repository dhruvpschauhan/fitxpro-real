"""add week_day to workout_days

Revision ID: 2b_add_week_day
Revises: 2a_add_exercise_library
Create Date: 2026-06-10 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '2b_add_week_day'
down_revision = '2a_add_exercise_library'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    result = conn.execute(sa.text("PRAGMA table_info(workout_days)"))
    columns = [row[1] for row in result]
    if 'week_day' not in columns:
        with op.batch_alter_table('workout_days', schema=None) as batch_op:
            batch_op.add_column(sa.Column('week_day', sa.String(20), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('workout_days', schema=None) as batch_op:
        batch_op.drop_column('week_day')
