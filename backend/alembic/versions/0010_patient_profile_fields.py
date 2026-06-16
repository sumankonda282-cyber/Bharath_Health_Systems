"""Add extended patient profile fields

Revision ID: 0010_patient_profile_fields
Revises: 0009_add_missing_tables
Create Date: 2026-06-16
"""
from alembic import op

revision = '0010_patient_profile_fields'
down_revision = '0009_add_missing_tables'
branch_labels = None
depends_on = None

_NEW_COLS = [
    ('first_name',                    'VARCHAR(100)'),
    ('last_name',                     'VARCHAR(100)'),
    ('whatsapp',                      'VARCHAR(20)'),
    ('marital_status',                'VARCHAR(30)'),
    ('occupation',                    'VARCHAR(150)'),
    ('nationality',                   'VARCHAR(100)'),
    ('religion',                      'VARCHAR(100)'),
    ('preferred_language',            'VARCHAR(50)'),
    ('insurance_type',                'VARCHAR(30)'),
    ('insurance_provider',            'VARCHAR(150)'),
    ('insurance_policy_number',       'VARCHAR(100)'),
    ('govt_scheme_name',              'VARCHAR(150)'),
    ('govt_beneficiary_id',           'VARCHAR(100)'),
    ('emergency_contact_relationship','VARCHAR(50)'),
    ('guardian_relationship',         'VARCHAR(50)'),
]


def upgrade():
    for col_name, col_type in _NEW_COLS:
        try:
            op.execute(
                f'ALTER TABLE patients ADD COLUMN IF NOT EXISTS {col_name} {col_type}'
            )
        except Exception:
            pass


def downgrade():
    pass
