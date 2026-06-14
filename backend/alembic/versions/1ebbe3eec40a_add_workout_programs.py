"""add_workout_programs

Revision ID: 1ebbe3eec40a
Revises: d0ba858292cb
Create Date: 2026-06-10 11:43:45.534832

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1ebbe3eec40a'
down_revision: Union[str, Sequence[str], None] = 'd0ba858292cb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create workout_programs table
    op.create_table('workout_programs',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('difficulty', sa.String(length=20), nullable=True),
        sa.Column('goal_tag', sa.String(length=30), nullable=True),
        sa.Column('is_published', sa.Boolean(), nullable=True),
        sa.Column('created_by', sa.Uuid(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create user_program_selections table
    op.create_table('user_program_selections',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=True),
        sa.Column('program_id', sa.Uuid(), nullable=True),
        sa.Column('selected_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['program_id'], ['workout_programs.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )

    # Add program_id column to workout_days (SQLite supports ADD COLUMN)
    op.add_column('workout_days', sa.Column('program_id', sa.Uuid(), nullable=True))

    # NOTE: SQLite does not support ALTER COLUMN TYPE.
    # The type changes for exercises.name (100->150), exercises.sets (INT->VARCHAR),
    # workout_days.day_label (50->100), workout_days.focus (100->150) are skipped here.
    # SQLite is dynamically typed so the existing columns will work correctly
    # with the new string values without a schema change.


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('workout_days', 'program_id')
    op.drop_table('user_program_selections')
    op.drop_table('workout_programs')
