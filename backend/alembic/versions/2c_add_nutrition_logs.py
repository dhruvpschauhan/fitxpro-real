"""add nutrition logs

Revision ID: 2c_add_nutrition_logs
Revises: 2b_add_week_day
Create Date: 2026-06-16 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '2c_add_nutrition_logs'
down_revision = '2b_add_week_day'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('user_nutrition_logs',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=True),
        sa.Column('log_date', sa.Date(), nullable=False),
        sa.Column('logged_food', sa.JSON(), nullable=True),
        sa.Column('water_glasses', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade() -> None:
    op.drop_table('user_nutrition_logs')
