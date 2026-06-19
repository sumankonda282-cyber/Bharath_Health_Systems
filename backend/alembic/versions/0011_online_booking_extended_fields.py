"""Add booking extended fields: mode, patient_state, bh_id_ref, payment columns

Revision ID: 0011_online_booking_extended_fields
Revises: 0010_patient_profile_fields
Create Date: 2026-06-19
"""
from alembic import op
import sqlalchemy as sa

revision = '0011_online_booking_extended_fields'
down_revision = '0010_patient_profile_fields'
branch_labels = None
depends_on = None

_NEW_COLS = [
    ('mode',           'VARCHAR(20)',   "'offline'"),
    ('patient_state',  'VARCHAR(100)',  'NULL'),
    ('bh_id_ref',      'VARCHAR(20)',   'NULL'),
    ('payment_mode',   'VARCHAR(30)',   "'pay_at_clinic'"),
    ('payment_status', 'VARCHAR(30)',   "'pending'"),
    ('amount_due',     'NUMERIC(10,2)', 'NULL'),
]

def upgrade():
    conn = op.get_bind()
    existing = {row[0] for row in conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns WHERE table_name='online_bookings'"
    ))}
    for col, typ, default in _NEW_COLS:
        if col not in existing:
            default_clause = f" DEFAULT {default}" if default != 'NULL' else ''
            conn.execute(sa.text(
                f"ALTER TABLE online_bookings ADD COLUMN IF NOT EXISTS {col} {typ}{default_clause}"
            ))

def downgrade():
    conn = op.get_bind()
    for col, _, _ in _NEW_COLS:
        conn.execute(sa.text(
            f"ALTER TABLE online_bookings DROP COLUMN IF EXISTS {col}"
        ))
