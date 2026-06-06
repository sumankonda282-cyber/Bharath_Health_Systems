"""Add clinical records: clinic prefix, clinic_patient_id, encounters, tags

Revision ID: 0005_clinical_records
Revises: 0004_add_missing_columns_safe
Create Date: 2026-06-03
"""
from alembic import op
import sqlalchemy as sa

revision = '0005_clinical_records'
down_revision = '0004_add_missing_columns_safe'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    # ── Clinics: prefix + counter ─────────────────────────────────────────────
    conn.execute(sa.text(
        "ALTER TABLE clinics ADD COLUMN IF NOT EXISTS clinic_prefix VARCHAR(10)"
    ))
    conn.execute(sa.text(
        "ALTER TABLE clinics ADD COLUMN IF NOT EXISTS patient_id_counter INTEGER DEFAULT 0"
    ))

    # ── Patients: clinic_patient_id replaces uhid ─────────────────────────────
    conn.execute(sa.text(
        "ALTER TABLE patients ADD COLUMN IF NOT EXISTS clinic_patient_id VARCHAR(20)"
    ))
    # Migrate existing uhid values into clinic_patient_id
    conn.execute(sa.text(
        "UPDATE patients SET clinic_patient_id = uhid WHERE clinic_patient_id IS NULL AND uhid IS NOT NULL"
    ))

    # ── Appointments: triage fields from receptionist ─────────────────────────
    conn.execute(sa.text(
        "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS triage_complaint TEXT"
    ))
    conn.execute(sa.text(
        "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS visit_type VARCHAR(20) DEFAULT 'fresh'"
    ))

    # ── SoapNote: extend with 7-field clinical format ─────────────────────────
    conn.execute(sa.text(
        "ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS reason_for_visit TEXT"
    ))
    conn.execute(sa.text(
        "ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS patient_complaints TEXT"
    ))
    conn.execute(sa.text(
        "ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS past_history TEXT"
    ))
    conn.execute(sa.text(
        "ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS investigations_findings TEXT"
    ))
    conn.execute(sa.text(
        "ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS medications_prescribed TEXT"
    ))
    conn.execute(sa.text(
        "ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS discharge_assessment TEXT"
    ))
    conn.execute(sa.text(
        "ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS cautions_followup TEXT"
    ))
    conn.execute(sa.text(
        "ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE"
    ))
    conn.execute(sa.text(
        "ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITHOUT TIME ZONE"
    ))
    conn.execute(sa.text(
        "ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS created_by INTEGER"
    ))

    # ── clinic_patient_tags: saved tag library per clinic ─────────────────────
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS clinic_patient_tags (
            id           SERIAL PRIMARY KEY,
            clinic_id    INTEGER NOT NULL REFERENCES clinics(id),
            tag_name     VARCHAR(100) NOT NULL,
            icd10_code   VARCHAR(20),
            specialty    VARCHAR(100),
            usage_count  INTEGER DEFAULT 0,
            created_by   INTEGER REFERENCES staff(id),
            created_at   TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
            UNIQUE(clinic_id, tag_name)
        )
    """))

    # ── patient_tags: tags applied to individual patients ─────────────────────
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS patient_tags (
            id            SERIAL PRIMARY KEY,
            patient_id    INTEGER NOT NULL REFERENCES patients(id),
            clinic_id     INTEGER NOT NULL REFERENCES clinics(id),
            tag_name      VARCHAR(100) NOT NULL,
            icd10_code    VARCHAR(20),
            saved_tag_id  INTEGER REFERENCES clinic_patient_tags(id),
            assigned_by   INTEGER REFERENCES staff(id),
            assigned_at   TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
            UNIQUE(patient_id, clinic_id, tag_name)
        )
    """))

    # ── encounter_access_log: audit trail for BHID unlock ────────────────────
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS encounter_access_logs (
            id                 SERIAL PRIMARY KEY,
            patient_id         INTEGER NOT NULL REFERENCES patients(id),
            accessed_by        INTEGER NOT NULL REFERENCES staff(id),
            accessing_clinic_id INTEGER NOT NULL REFERENCES clinics(id),
            session_expires_at TIMESTAMP WITHOUT TIME ZONE,
            accessed_at        TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
        )
    """))


def downgrade():
    pass
