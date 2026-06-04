"""add guardian fields to patients

Revision ID: 0003_add_guardian_fields_to_patients
Revises: 0006_staff_credentials
Create Date: 2026-06-03
"""
from alembic import op
import sqlalchemy as sa

revision = '0003_add_guardian_fields_to_patients'
down_revision = '0006_staff_credentials'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('patients', sa.Column('guardian_name', sa.String(200), nullable=True))
    op.add_column('patients', sa.Column('guardian_mobile', sa.String(20), nullable=True))


def downgrade():
    op.drop_column('patients', 'guardian_name')
    op.drop_column('patients', 'guardian_mobile')
