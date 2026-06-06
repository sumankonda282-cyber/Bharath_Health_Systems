"""Add username, is_first_login, temp_pw_expiry to staff

Revision ID: 0006_staff_credentials
Revises: 0005_clinical_records
Create Date: 2026-06-03
"""
from alembic import op
import sqlalchemy as sa

revision = '0006_staff_credentials'
down_revision = '0005_clinical_records'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE staff ADD COLUMN IF NOT EXISTS username VARCHAR(30) UNIQUE")
    op.execute("ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT TRUE")
    op.execute("ALTER TABLE staff ADD COLUMN IF NOT EXISTS temp_pw_expiry TIMESTAMP WITHOUT TIME ZONE")


def downgrade():
    op.execute("ALTER TABLE staff DROP COLUMN IF EXISTS username")
    op.execute("ALTER TABLE staff DROP COLUMN IF EXISTS is_first_login")
    op.execute("ALTER TABLE staff DROP COLUMN IF EXISTS temp_pw_expiry")
