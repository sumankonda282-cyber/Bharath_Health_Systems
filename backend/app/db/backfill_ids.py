"""
One-shot, idempotent backfill + uniqueness hardening for the standardized
identifier system:

  * Health Center ID   — clinics.hc_id            (HC00001)
  * Branch code        — branches.branch_code     (HC00001-B01)
  * Employee ID        — staff.employee_id         (HC00001-DR0001, replace-all)
  * Encounter number   — appointments/admissions.encounter_no (HC00001-ENC-000123)
  * MRN                — patients.clinic_patient_id (APL-00001, prefix auto-derived)
  * branch_id          — propagated onto clinical tables from their parent row

Invoked from start.sh on every deploy (``python -m app.db.backfill_ids``), AFTER
the column DDL has run. There is no Alembic — start.sh is the only migration
driver, and this module is the data half of that migration.

Every step is idempotent (guarded on NULL / non-conforming values) and
non-fatal: a failure is logged and the next step still runs, matching the
platform's existing on-deploy migration philosophy. Uniqueness indexes are
created last, each in its own transaction, so a pre-existing duplicate in one
key can never block the others or crash the deploy.
"""
import re

from sqlalchemy import text

from app.db.session import engine
from app.core.ids import derive_mrn_prefix, emp_prefix_for_role, next_employee_id

# Role → employee-ID prefix as a SQL CASE, for the set-based seed query.
_ROLE_CASE = (
    "CASE lower(coalesce(s.role,'')) "
    "WHEN 'doctor' THEN 'DR' "
    "WHEN 'clinic_manager' THEN 'MG' "
    "WHEN 'clinic_admin' THEN 'MR' "
    "WHEN 'nurse' THEN 'NR' "
    "WHEN 'receptionist' THEN 'RC' "
    "WHEN 'pharmacist' THEN 'PH' "
    "WHEN 'lab_technician' THEN 'LB' "
    "WHEN 'lab_tech' THEN 'LB' "
    "WHEN 'imaging_tech' THEN 'IM' "
    "WHEN 'pathologist' THEN 'PT' "
    "WHEN 'radiologist' THEN 'RD' "
    "ELSE 'EM' END"
)


def _step(label, statements):
    """Run statements in one transaction; log and swallow any error."""
    try:
        with engine.begin() as conn:
            for sql in statements:
                conn.execute(text(sql))
        print(f"[id-backfill] {label}: ok")
    except Exception as e:  # noqa: BLE001 — migrations are intentionally non-fatal
        print(f"[id-backfill] {label}: WARN {str(e)[:180]}")


def ensure_sequences_table():
    _step("ensure id_sequences", [
        "CREATE TABLE IF NOT EXISTS id_sequences ("
        " id SERIAL PRIMARY KEY,"
        " scope_type VARCHAR(30) NOT NULL,"
        " scope_id INTEGER NOT NULL DEFAULT 0,"
        " kind VARCHAR(40) NOT NULL,"
        " next_val INTEGER NOT NULL DEFAULT 1,"
        " updated_at TIMESTAMP DEFAULT NOW(),"
        " CONSTRAINT uq_id_sequences_scope UNIQUE (scope_type, scope_id, kind))",
    ])


def backfill_hc_ids():
    _step("hc_ids", [
        "WITH mx AS ("
        "  SELECT COALESCE(MAX(CAST(SUBSTRING(hc_id FROM 3) AS INTEGER)),0) AS m"
        "  FROM clinics WHERE hc_id ~ '^HC[0-9]+$'"
        "), numbered AS ("
        "  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn"
        "  FROM clinics WHERE hc_id IS NULL"
        ") UPDATE clinics c"
        "  SET hc_id = 'HC' || LPAD((mx.m + numbered.rn)::text, 5, '0')"
        "  FROM numbered, mx WHERE c.id = numbered.id",
    ])


def backfill_branch_codes():
    _step("branch_codes", [
        "WITH base AS ("
        "  SELECT clinic_id, COALESCE(MAX(CAST(SUBSTRING(branch_code FROM '[0-9]+$') AS INTEGER)),0) AS m"
        "  FROM branches WHERE branch_code ~ '-B[0-9]+$' GROUP BY clinic_id"
        "), numbered AS ("
        "  SELECT b.id, b.clinic_id, c.hc_id,"
        "         ROW_NUMBER() OVER (PARTITION BY b.clinic_id ORDER BY b.id) AS rn"
        "  FROM branches b JOIN clinics c ON c.id = b.clinic_id"
        "  WHERE b.branch_code IS NULL AND c.hc_id IS NOT NULL"
        ") UPDATE branches b"
        "  SET branch_code = numbered.hc_id || '-B' || LPAD((COALESCE(base.m,0) + numbered.rn)::text, 2, '0')"
        "  FROM numbered LEFT JOIN base ON base.clinic_id = numbered.clinic_id"
        "  WHERE b.id = numbered.id",
    ])


def derive_mrn_prefixes():
    """Give every prefix-less clinic that has NO patients yet a name-derived MRN
    prefix (editable until their first patient). Clinics that already issued
    patients under the CLN fallback are left untouched for consistency."""
    try:
        with engine.begin() as conn:
            rows = conn.execute(text(
                "SELECT id, name FROM clinics "
                "WHERE (clinic_prefix IS NULL OR clinic_prefix = '') "
                "AND COALESCE(patient_id_counter,0) = 0"
            )).fetchall()
            for cid, name in rows:
                prefix = derive_mrn_prefix(conn, name, cid)
                conn.execute(
                    text("UPDATE clinics SET clinic_prefix = :p WHERE id = :i"),
                    {"p": prefix, "i": cid},
                )
        print(f"[id-backfill] mrn_prefixes: ok ({len(rows)} derived)")
    except Exception as e:  # noqa: BLE001
        print(f"[id-backfill] mrn_prefixes: WARN {str(e)[:180]}")


def backfill_mrn():
    """Assign clinic_patient_id (MRN) to patients missing one, continuing each
    clinic's counter, then advance the clinic counter past the highest MRN."""
    _step("mrn", [
        "WITH base AS ("
        "  SELECT c.id AS clinic_id,"
        "         GREATEST(COALESCE(c.patient_id_counter,0),"
        "                  COALESCE((SELECT MAX(CAST(SUBSTRING(p2.clinic_patient_id FROM '[0-9]+$') AS INTEGER))"
        "                            FROM patients p2 WHERE p2.clinic_id = c.id AND p2.clinic_patient_id ~ '-[0-9]+$'),0)) AS cnt,"
        "         COALESCE(NULLIF(c.clinic_prefix,''),'CLN') AS px"
        "  FROM clinics c"
        "), numbered AS ("
        "  SELECT p.id, b.px, b.cnt,"
        "         ROW_NUMBER() OVER (PARTITION BY p.clinic_id ORDER BY p.id) AS rn"
        "  FROM patients p JOIN base b ON b.clinic_id = p.clinic_id"
        "  WHERE p.clinic_patient_id IS NULL OR p.clinic_patient_id = ''"
        ") UPDATE patients p"
        "  SET clinic_patient_id = numbered.px || '-' || LPAD((numbered.cnt + numbered.rn)::text, 5, '0')"
        "  FROM numbered WHERE p.id = numbered.id",
        # advance each clinic counter past the highest assigned MRN
        "UPDATE clinics c"
        "  SET patient_id_counter = GREATEST(COALESCE(c.patient_id_counter,0), sub.mx)"
        "  FROM (SELECT clinic_id, MAX(CAST(SUBSTRING(clinic_patient_id FROM '[0-9]+$') AS INTEGER)) AS mx"
        "        FROM patients WHERE clinic_patient_id ~ '-[0-9]+$' GROUP BY clinic_id) sub"
        "  WHERE c.id = sub.clinic_id",
    ])


def backfill_employee_ids():
    """Replace every non-conforming staff.employee_id with a globally-prefixed,
    role-coded id (HC00001-DR0001). Already-conforming ids are kept, and the
    per-(clinic,role) counter is seeded above the highest existing one first, so
    re-runs and runtime-minted ids never collide."""
    try:
        with engine.begin() as conn:
            # seed counters above any already-conforming employee ids
            conn.execute(text(
                "INSERT INTO id_sequences (scope_type, scope_id, kind, next_val) "
                "SELECT 'clinic', s.clinic_id, 'emp_' || (" + _ROLE_CASE + "), "
                "       MAX(CAST(SUBSTRING(s.employee_id FROM '[0-9]+$') AS INTEGER)) + 1 "
                "FROM staff s JOIN clinics c ON c.id = s.clinic_id "
                "WHERE c.hc_id IS NOT NULL "
                "  AND s.employee_id ~ ('^' || c.hc_id || '-' || (" + _ROLE_CASE + ") || '[0-9]{4}$') "
                "GROUP BY s.clinic_id, (" + _ROLE_CASE + ") "
                "ON CONFLICT (scope_type, scope_id, kind) "
                "DO UPDATE SET next_val = GREATEST(id_sequences.next_val, EXCLUDED.next_val)"
            ))
            clinics = conn.execute(text(
                "SELECT id, hc_id FROM clinics WHERE hc_id IS NOT NULL ORDER BY id"
            )).fetchall()
            assigned = 0
            for cid, hc in clinics:
                staff_rows = conn.execute(text(
                    "SELECT id, role, employee_id FROM staff WHERE clinic_id = :c ORDER BY id"
                ), {"c": cid}).fetchall()
                for sid, role, emp in staff_rows:
                    px = emp_prefix_for_role(role)
                    pattern = "^" + re.escape(hc) + "-" + px + r"[0-9]{4}$"
                    if emp and re.match(pattern, emp):
                        continue  # already conforming — keep
                    new_id = next_employee_id(conn, cid, hc, role)
                    conn.execute(
                        text("UPDATE staff SET employee_id = :e WHERE id = :i"),
                        {"e": new_id, "i": sid},
                    )
                    assigned += 1
        print(f"[id-backfill] employee_ids: ok ({assigned} assigned)")
    except Exception as e:  # noqa: BLE001
        print(f"[id-backfill] employee_ids: WARN {str(e)[:180]}")


def backfill_encounter_no():
    """Give every appointment and admission a unified per-clinic encounter_no,
    numbered chronologically across both tables from one shared counter."""
    try:
        with engine.begin() as conn:
            conn.execute(text("DROP TABLE IF EXISTS _enc_bf"))
            conn.execute(text(
                "CREATE TEMP TABLE _enc_bf AS "
                "WITH base AS ("
                "  SELECT clinic_id, MAX(n) AS mx FROM ("
                "    SELECT clinic_id, CAST(SUBSTRING(encounter_no FROM '[0-9]+$') AS INTEGER) AS n"
                "      FROM appointments WHERE encounter_no ~ 'ENC-[0-9]+$'"
                "    UNION ALL"
                "    SELECT clinic_id, CAST(SUBSTRING(encounter_no FROM '[0-9]+$') AS INTEGER) AS n"
                "      FROM admissions WHERE encounter_no ~ 'ENC-[0-9]+$'"
                "  ) z GROUP BY clinic_id"
                "), combined AS ("
                "  SELECT 'appt'::text AS src, a.id, a.clinic_id, a.created_at AS ts"
                "    FROM appointments a WHERE a.encounter_no IS NULL"
                "  UNION ALL"
                "  SELECT 'adm'::text AS src, ad.id, ad.clinic_id, ad.created_at AS ts"
                "    FROM admissions ad WHERE ad.encounter_no IS NULL"
                ") SELECT cb.src, cb.id, c.hc_id,"
                "       (COALESCE(b.mx,0) + ROW_NUMBER() OVER (PARTITION BY cb.clinic_id ORDER BY cb.ts, cb.src, cb.id)) AS num"
                "  FROM combined cb"
                "  JOIN clinics c ON c.id = cb.clinic_id AND c.hc_id IS NOT NULL"
                "  LEFT JOIN base b ON b.clinic_id = cb.clinic_id"
            ))
            conn.execute(text(
                "UPDATE appointments a SET encounter_no = e.hc_id || '-ENC-' || LPAD(e.num::text, 6, '0') "
                "FROM _enc_bf e WHERE e.src = 'appt' AND a.id = e.id"
            ))
            conn.execute(text(
                "UPDATE admissions ad SET encounter_no = e.hc_id || '-ENC-' || LPAD(e.num::text, 6, '0') "
                "FROM _enc_bf e WHERE e.src = 'adm' AND ad.id = e.id"
            ))
            conn.execute(text("DROP TABLE IF EXISTS _enc_bf"))
        print("[id-backfill] encounter_no: ok")
    except Exception as e:  # noqa: BLE001
        print(f"[id-backfill] encounter_no: WARN {str(e)[:180]}")


def backfill_branch_id():
    """Propagate branch_id onto clinical tables from their parent row
    (appointment / admission / accessing staff) wherever it can be derived."""
    _step("branch_id propagation", [
        "UPDATE vitals v SET branch_id = a.branch_id FROM appointments a "
        "WHERE v.appointment_id = a.id AND v.branch_id IS NULL AND a.branch_id IS NOT NULL",
        "UPDATE soap_notes s SET branch_id = a.branch_id FROM appointments a "
        "WHERE s.appointment_id = a.id AND s.branch_id IS NULL AND a.branch_id IS NOT NULL",
        "UPDATE prescriptions pr SET branch_id = a.branch_id FROM appointments a "
        "WHERE pr.appointment_id = a.id AND pr.branch_id IS NULL AND a.branch_id IS NOT NULL",
        "UPDATE lab_orders l SET branch_id = a.branch_id FROM appointments a "
        "WHERE l.appointment_id = a.id AND l.branch_id IS NULL AND a.branch_id IS NOT NULL",
        "UPDATE imaging_orders im SET branch_id = a.branch_id FROM appointments a "
        "WHERE im.appointment_id = a.id AND im.branch_id IS NULL AND a.branch_id IS NOT NULL",
        "UPDATE form_submissions f SET branch_id = a.branch_id FROM appointments a "
        "WHERE f.appointment_id = a.id AND f.branch_id IS NULL AND a.branch_id IS NOT NULL",
        "UPDATE admissions ad SET branch_id = a.branch_id FROM appointments a "
        "WHERE ad.source_appointment_id = a.id AND ad.branch_id IS NULL AND a.branch_id IS NOT NULL",
        "UPDATE vital_signs vs SET branch_id = ad.branch_id FROM admissions ad "
        "WHERE vs.admission_id = ad.id AND vs.branch_id IS NULL AND ad.branch_id IS NOT NULL",
        "UPDATE nursing_notes nn SET branch_id = ad.branch_id FROM admissions ad "
        "WHERE nn.admission_id = ad.id AND nn.branch_id IS NULL AND ad.branch_id IS NOT NULL",
        "UPDATE medication_administrations ma SET branch_id = ad.branch_id FROM admissions ad "
        "WHERE ma.admission_id = ad.id AND ma.branch_id IS NULL AND ad.branch_id IS NOT NULL",
        "UPDATE clinical_orders co SET branch_id = ad.branch_id FROM admissions ad "
        "WHERE co.admission_id = ad.id AND co.branch_id IS NULL AND ad.branch_id IS NOT NULL",
        "UPDATE discharge_summaries ds SET branch_id = ad.branch_id FROM admissions ad "
        "WHERE ds.admission_id = ad.id AND ds.branch_id IS NULL AND ad.branch_id IS NOT NULL",
        "UPDATE form_submissions f SET branch_id = ad.branch_id FROM admissions ad "
        "WHERE f.admission_id = ad.id AND f.branch_id IS NULL AND ad.branch_id IS NOT NULL",
        "UPDATE encounter_access_logs e SET branch_id = s.branch_id FROM staff s "
        "WHERE e.accessed_by = s.id AND e.branch_id IS NULL AND s.branch_id IS NOT NULL",
    ])


def sync_bh_id():
    """Keep the denormalized inpatient referral BH-ID copy aligned with the
    patient's canonical bh_id (fills blanks only; never mints a new BH ID)."""
    _step("bh_id sync", [
        "UPDATE referrals r SET bhid = p.bh_id FROM patients p "
        "WHERE r.patient_id = p.id AND p.bh_id IS NOT NULL AND (r.bhid IS NULL OR r.bhid = '')",
    ])


def ensure_doctor_profiles():
    """Additive doctor-identity bridge: guarantee every doctor Staff row has a
    matching DoctorProfile (1:1). Combined with resolve_doctor() in core/ids.py
    this lets callers move between the staff.id (inpatient) and
    doctor_profiles.id (outpatient) FK conventions without rewiring any FK."""
    _step("doctor profile integrity", [
        "INSERT INTO doctor_profiles (staff_id, clinic_id, created_at) "
        "SELECT s.id, s.clinic_id, NOW() FROM staff s "
        "WHERE lower(coalesce(s.role,'')) = 'doctor' "
        "AND NOT EXISTS (SELECT 1 FROM doctor_profiles dp WHERE dp.staff_id = s.id)",
    ])


def seed_sequences():
    """Advance the shared counters to one past the highest value already in use,
    so runtime generation continues cleanly after the backfill."""
    _step("seed hc_id sequence", [
        "INSERT INTO id_sequences (scope_type, scope_id, kind, next_val) "
        "SELECT 'global', 0, 'hc_id', COALESCE(MAX(CAST(SUBSTRING(hc_id FROM 3) AS INTEGER)),0)+1 "
        "FROM clinics WHERE hc_id ~ '^HC[0-9]+$' "
        "ON CONFLICT (scope_type, scope_id, kind) "
        "DO UPDATE SET next_val = GREATEST(id_sequences.next_val, EXCLUDED.next_val)",
    ])
    _step("seed branch_code sequences", [
        "INSERT INTO id_sequences (scope_type, scope_id, kind, next_val) "
        "SELECT 'clinic', clinic_id, 'branch_code', MAX(CAST(SUBSTRING(branch_code FROM '[0-9]+$') AS INTEGER))+1 "
        "FROM branches WHERE branch_code ~ '-B[0-9]+$' GROUP BY clinic_id "
        "ON CONFLICT (scope_type, scope_id, kind) "
        "DO UPDATE SET next_val = GREATEST(id_sequences.next_val, EXCLUDED.next_val)",
    ])
    _step("seed encounter sequences", [
        "INSERT INTO id_sequences (scope_type, scope_id, kind, next_val) "
        "SELECT 'clinic', clinic_id, 'encounter', MAX(n)+1 FROM ("
        "  SELECT clinic_id, CAST(SUBSTRING(encounter_no FROM '[0-9]+$') AS INTEGER) AS n"
        "    FROM appointments WHERE encounter_no ~ 'ENC-[0-9]+$'"
        "  UNION ALL"
        "  SELECT clinic_id, CAST(SUBSTRING(encounter_no FROM '[0-9]+$') AS INTEGER) AS n"
        "    FROM admissions WHERE encounter_no ~ 'ENC-[0-9]+$'"
        ") z GROUP BY clinic_id "
        "ON CONFLICT (scope_type, scope_id, kind) "
        "DO UPDATE SET next_val = GREATEST(id_sequences.next_val, EXCLUDED.next_val)",
    ])


def unique_indexes():
    """Create the uniqueness guards last, each in its own transaction so a
    pre-existing duplicate in one key cannot block the others or crash deploy."""
    for name, sql in [
        ("uq_clinics_hc_id",
         "CREATE UNIQUE INDEX IF NOT EXISTS uq_clinics_hc_id ON clinics(hc_id) WHERE hc_id IS NOT NULL"),
        ("uq_branches_code",
         "CREATE UNIQUE INDEX IF NOT EXISTS uq_branches_code ON branches(clinic_id, branch_code) WHERE branch_code IS NOT NULL"),
        ("uq_staff_employee",
         "CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_employee ON staff(clinic_id, employee_id) WHERE employee_id IS NOT NULL"),
        ("uq_patients_mrn",
         "CREATE UNIQUE INDEX IF NOT EXISTS uq_patients_mrn ON patients(clinic_id, clinic_patient_id) WHERE clinic_patient_id IS NOT NULL"),
        ("uq_patients_bh_id",
         "CREATE UNIQUE INDEX IF NOT EXISTS uq_patients_bh_id ON patients(bh_id) WHERE bh_id IS NOT NULL"),
        ("uq_appointments_encounter",
         "CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_encounter ON appointments(encounter_no) WHERE encounter_no IS NOT NULL"),
        ("uq_admissions_encounter",
         "CREATE UNIQUE INDEX IF NOT EXISTS uq_admissions_encounter ON admissions(encounter_no) WHERE encounter_no IS NOT NULL"),
    ]:
        _step(f"index {name}", [sql])


def run():
    print("[id-backfill] starting identifier standardization backfill...")
    ensure_sequences_table()
    backfill_hc_ids()
    backfill_branch_codes()
    derive_mrn_prefixes()
    backfill_mrn()
    backfill_employee_ids()
    backfill_encounter_no()
    backfill_branch_id()
    sync_bh_id()
    ensure_doctor_profiles()
    seed_sequences()
    unique_indexes()
    print("[id-backfill] done.")


if __name__ == "__main__":
    run()
