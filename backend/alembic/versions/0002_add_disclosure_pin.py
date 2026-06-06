"""add disclosure pin to patient_users

Revision ID: 0002_add_disclosure_pin
Revises: 0001_initial_v2
Create Date: 2026-05-31
"""
from alembic import op
import sqlalchemy as sa

revision = '0002_add_disclosure_pin'
down_revision = '0001_initial_v2'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE patient_users ADD COLUMN IF NOT EXISTS disclosure_pin VARCHAR(255)")
    op.execute("ALTER TABLE patient_users ADD COLUMN IF NOT EXISTS disclosure_pin_plain VARCHAR(10)")


def downgrade():
    op.execute("ALTER TABLE patient_users DROP COLUMN IF EXISTS disclosure_pin_plain")
    op.execute("ALTER TABLE patient_users DROP COLUMN IF EXISTS disclosure_pin")
