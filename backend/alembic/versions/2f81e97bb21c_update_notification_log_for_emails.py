"""update_notification_log_for_emails

Revision ID: 2f81e97bb21c
Revises: 2b_add_week_day
Create Date: 2026-06-10 18:25:07.604120

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2f81e97bb21c'
down_revision: Union[str, Sequence[str], None] = '2b_add_week_day'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use batch_alter_table for SQLite compatibility
    with op.batch_alter_table('notification_log', schema=None) as batch_op:
        batch_op.add_column(sa.Column('recipient_email', sa.String(length=150), nullable=False, server_default="unknown@example.com"))
        batch_op.add_column(sa.Column('triggered_by', sa.Uuid(), nullable=True))
        batch_op.create_foreign_key('fk_notification_log_users', 'users', ['triggered_by'], ['id'])
        batch_op.drop_column('type')

def downgrade() -> None:
    with op.batch_alter_table('notification_log', schema=None) as batch_op:
        batch_op.add_column(sa.Column('type', sa.VARCHAR(length=50), nullable=True))
        batch_op.drop_constraint('fk_notification_log_users', type_='foreignkey')
        batch_op.drop_column('triggered_by')
        batch_op.drop_column('recipient_email')
