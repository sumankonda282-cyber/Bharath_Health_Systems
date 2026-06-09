"""Add parent_clinic_id to clinics for hospital-attached pharmacy/diagnostic

Revision ID: 0011_clinic_association
Revises: 0010_payment_gateway
Create Date: 2026-06-09
"""

from alembic import op
import sqlalchemy as sa

revision = '0011_clinic_association'
down_revision = '0010_payment_gateway'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('clinics', sa.Column('parent_clinic_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_clinics_parent_clinic_id',
        'clinics', 'clinics',
        ['parent_clinic_id'], ['id'],
        ondelete='SET NULL',
    )


def downgrade():
    op.drop_constraint('fk_clinics_parent_clinic_id', 'clinics', type_='foreignkey')
    op.drop_column('clinics', 'parent_clinic_id')
