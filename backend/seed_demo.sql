-- ============================================================================
-- BharatCliniq — SQL companion seed (quick core fixtures)
-- ============================================================================
-- A fast, direct-to-Postgres loader for the *foundational* rows: one clinic,
-- a branch, a clinic-admin + doctor (with a real bcrypt password hash so they
-- can log in), the doctor's weekly schedule, a few patients and today's
-- appointments. Use this when you just want the Provider portal to have a
-- clinic + patients to click around immediately.
--
-- For the FULL real-world dataset (vitals, SOAP, prescriptions, lab + imaging
-- results, billing, inpatient charts, telehealth, referrals) run the API seed
-- instead — it goes through real endpoints so every generated ID, status
-- transition and validation is correct:
--     python seed_demo.py --api <url>
--
-- SAFETY
--   * Wrapped in a single transaction — if ANY statement errors, the whole
--     thing rolls back and your database is left untouched.
--   * No hardcoded primary keys — rows are chained with RETURNING, so serial
--     sequences are never bypassed (no future id collisions).
--   * Idempotent — re-running is a no-op (the clinic slug ON CONFLICT gate
--     short-circuits the whole chain).
--
-- LOGIN (after running)
--   Admin :  sqladmin@demo.bharatcliniq.com   /  Test@1234
--   Doctor:  sqldoctor@demo.bharatcliniq.com  /  Test@1234
--
-- RUN
--   psql "$DATABASE_URL" -f seed_demo.sql
-- ============================================================================

BEGIN;

WITH c AS (
    INSERT INTO clinics (
        name, slug, specialty, phone, email, city, state, pincode,
        is_active, is_verified, status, org_type,
        has_pharmacy, has_lab, has_imaging, has_inpatient, has_telehealth, wards_enabled,
        subscription_plan, subscription_status, clinic_prefix, hc_id
    )
    VALUES (
        'BharatCliniq Demo Hospital (SQL)', 'demo-hospital-sql', 'Multi-Speciality',
        '9876500001', 'sqlclinic@demo.bharatcliniq.com', 'Bengaluru', 'Karnataka', '560025',
        TRUE, TRUE, 'active', 'hospital',
        TRUE, TRUE, TRUE, TRUE, TRUE, TRUE,
        'free', 'active', 'DHSQL', 'HC90001'
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id
),
b AS (
    INSERT INTO branches (clinic_id, name, city, phone, is_active, branch_code)
    SELECT id, 'Main Branch', 'Bengaluru', '9876500001', TRUE, 'HC90001-B01' FROM c
    RETURNING id, clinic_id
),
admin AS (
    INSERT INTO staff (
        clinic_id, branch_id, full_name, email, mobile, hashed_password, role,
        is_active, is_first_login, employee_id
    )
    SELECT b.clinic_id, b.id, 'Demo Admin (SQL)', 'sqladmin@demo.bharatcliniq.com', '9000090001',
           '$2b$12$kN8cV5GBM.TTXV87IpzLGuDd0xv7Df06J6g24MVg/LnVC9xK6LHZu',
           'clinic_admin', TRUE, FALSE, 'EMP-SQL-001'
    FROM b
    RETURNING id
),
doc_staff AS (
    INSERT INTO staff (
        clinic_id, branch_id, full_name, email, mobile, hashed_password, role,
        is_active, is_first_login, employee_id, qualification
    )
    SELECT b.clinic_id, b.id, 'Dr. Sql Sharma', 'sqldoctor@demo.bharatcliniq.com', '9000090002',
           '$2b$12$kN8cV5GBM.TTXV87IpzLGuDd0xv7Df06J6g24MVg/LnVC9xK6LHZu',
           'doctor', TRUE, FALSE, 'EMP-SQL-002', 'MBBS, MD'
    FROM b
    RETURNING id, clinic_id
),
dp AS (
    INSERT INTO doctor_profiles (
        staff_id, clinic_id, specialty, qualification, mci_number,
        experience_years, consultation_fee, is_active, accepting_appointments
    )
    SELECT doc_staff.id, doc_staff.clinic_id, 'General Medicine', 'MBBS, MD', 'KMC-SQL-1',
           9, 500, TRUE, TRUE
    FROM doc_staff
    RETURNING id
),
sched AS (
    INSERT INTO doctor_schedules (
        doctor_id, branch_id, day_of_week, start_time, end_time,
        slot_minutes, max_patients, is_active, online_slots, online_auto_confirm, telehealth_slots
    )
    SELECT dp.id, b.id, d.day, '09:00', '17:00', 15, 24, TRUE, 6, 3, 4
    FROM dp, b, (VALUES ('monday'),('tuesday'),('wednesday'),('thursday'),('friday'),('saturday')) AS d(day)
    RETURNING id
),
pats AS (
    INSERT INTO patients (
        clinic_id, branch_id, full_name, gender, date_of_birth, mobile,
        city, state, blood_group, clinic_patient_id, bh_id, is_active
    )
    SELECT b.clinic_id, b.id, p.full_name, p.gender, p.dob::date, p.mobile,
           'Bengaluru', 'Karnataka', p.bg, p.cpid, p.bh, TRUE
    FROM b, (VALUES
        ('Anita Desai (SQL)',  'female', '1990-02-10', '9222200001', 'B+', 'DHSQL-00001', 'BH590000001'),
        ('Suresh Babu (SQL)',  'male',   '1978-06-22', '9222200002', 'O+', 'DHSQL-00002', 'BH590000002'),
        ('Reema Joseph (SQL)', 'female', '1995-12-01', '9222200003', 'A+', 'DHSQL-00003', 'BH590000003')
    ) AS p(full_name, gender, dob, mobile, bg, cpid, bh)
    RETURNING id, clinic_id, branch_id
),
pats_ranked AS (
    SELECT id, clinic_id, branch_id, row_number() OVER (ORDER BY id)::int AS rn FROM pats
),
appt AS (
    INSERT INTO appointments (
        clinic_id, branch_id, patient_id, doctor_id, appointment_date,
        appointment_time, status, mode, reason, fee, visit_type
    )
    SELECT p.clinic_id, p.branch_id, p.id, dp.id, CURRENT_DATE,
           (ARRAY['09:30','10:00','10:30'])[p.rn],
           (ARRAY['confirmed','pending','completed'])[p.rn],
           'offline',
           (ARRAY['Fever and cough','Routine check-up','Follow-up visit'])[p.rn],
           500, 'fresh'
    FROM dp, pats_ranked p
    RETURNING id
)
SELECT
    (SELECT count(*) FROM pats)  AS patients_inserted,
    (SELECT count(*) FROM appt)  AS appointments_inserted;

COMMIT;
