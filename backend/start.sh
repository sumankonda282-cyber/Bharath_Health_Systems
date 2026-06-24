#!/bin/bash
set -e

# ── Synchronous critical migrations (fast, must complete before serving traffic) ──
# These are columns on tables touched by EVERY authenticated request.
# Failure here is non-fatal; uvicorn still starts.
echo "[startup] Running critical synchronous migrations..."
python -c "
from sqlalchemy import text
from app.db.session import engine

critical = [
    # platform_admins — queried by get_current_platform_admin on EVERY admin request
    'ALTER TABLE platform_admins ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 1',
    'ALTER TABLE platform_admins ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6)',
    'ALTER TABLE platform_admins ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMP WITHOUT TIME ZONE',
    # clinics — queried by platform_dashboard, list_all_clinics, _clinic_summary on every admin page
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(20) DEFAULT \'free\'',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT \'active\'',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITHOUT TIME ZONE',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMP WITHOUT TIME ZONE',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS clinic_prefix VARCHAR(10)',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS suspension_reason VARCHAR(100)',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS suspension_comment TEXT',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS rejection_reason TEXT',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS license_document_url VARCHAR(500)',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS has_pharmacy BOOLEAN DEFAULT FALSE',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS has_lab BOOLEAN DEFAULT FALSE',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS has_imaging BOOLEAN DEFAULT FALSE',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS has_inpatient BOOLEAN DEFAULT FALSE',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS has_emergency BOOLEAN DEFAULT FALSE',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS has_blood_bank BOOLEAN DEFAULT FALSE',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS has_ambulance BOOLEAN DEFAULT FALSE',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS has_telehealth BOOLEAN DEFAULT FALSE',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS total_beds INTEGER DEFAULT 0',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS icu_beds INTEGER DEFAULT 0',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS ot_count INTEGER DEFAULT 0',
    # location + capacity — queried via Clinic model on every staff login (line 103 auth.py)
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7)',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7)',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS capacity_description TEXT',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS nabl_accredited BOOLEAN DEFAULT FALSE',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS nabl_number VARCHAR(100)',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS parent_clinic_id INTEGER REFERENCES clinics(id)',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS patient_id_counter INTEGER DEFAULT 0',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS website VARCHAR(300)',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS operating_hours VARCHAR(200)',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS reg_number VARCHAR(100)',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS accreditation VARCHAR(100)',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS google_maps_url TEXT',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500)',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS org_type VARCHAR(20) DEFAULT \'clinic\'',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS wards_enabled BOOLEAN DEFAULT FALSE',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS admission_sequence INTEGER DEFAULT 0',
    'ALTER TABLE clinics ADD COLUMN IF NOT EXISTS modules JSONB',
    # feedback — queried by /platform/feedback
    'ALTER TABLE feedback ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE',
    # doctor_schedules — quota system for online booking
    'ALTER TABLE doctor_schedules ADD COLUMN IF NOT EXISTS online_auto_confirm INTEGER DEFAULT 0',
    'ALTER TABLE doctor_schedules ADD COLUMN IF NOT EXISTS max_patients INTEGER DEFAULT 20',
]
ok = 0; failed = 0
for sql in critical:
    try:
        with engine.begin() as conn:
            conn.execute(text(sql))
        ok += 1
    except Exception as e:
        failed += 1
        print(f'[critical-migration] WARN: {str(e)[:120]}')
print(f'[critical-migration] Done: {ok} ok, {failed} skipped/failed.')
" || echo "[startup] Critical migration script failed — continuing anyway"
echo "[startup] Critical migrations complete."

# Run migrations + seed in background so uvicorn binds the port immediately.
# Render's port scan times out after ~5 min if uvicorn doesn't start first.
(
set +e  # don't let migration failures kill the background job
echo "[bg-migrations] Applying safe column additions (idempotent)..."
python -c "
from sqlalchemy import text
from app.db.session import engine

safe_cols = [
    \"ALTER TABLE admissions ADD COLUMN IF NOT EXISTS primary_doctor_id INTEGER REFERENCES staff(id)\",
    \"ALTER TABLE admissions ADD COLUMN IF NOT EXISTS discharge_type VARCHAR(50)\",
    \"ALTER TABLE appointments ADD COLUMN IF NOT EXISTS previsit_token VARCHAR(64)\",
    \"ALTER TABLE appointments ADD COLUMN IF NOT EXISTS previsit_data JSONB\",
    \"ALTER TABLE appointments ADD COLUMN IF NOT EXISTS previsit_submitted_at TIMESTAMP WITHOUT TIME ZONE\",
    \"ALTER TABLE patient_users ADD COLUMN IF NOT EXISTS otp_verified_token VARCHAR(255)\",
    \"ALTER TABLE patient_users ADD COLUMN IF NOT EXISTS otp_token_expiry TIMESTAMP WITHOUT TIME ZONE\",
    \"ALTER TABLE patient_users ADD COLUMN IF NOT EXISTS disclosure_pin VARCHAR(255)\",
    \"ALTER TABLE patient_users ADD COLUMN IF NOT EXISTS disclosure_pin_plain VARCHAR(10)\",
    \"ALTER TABLE patient_users ADD COLUMN IF NOT EXISTS disclosure_pin_expiry TIMESTAMP WITHOUT TIME ZONE\",
    \"ALTER TABLE patient_users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(20) DEFAULT 'en'\",
    \"ALTER TABLE patient_users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE\",
    \"ALTER TABLE patient_users ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 1\",
    \"ALTER TABLE patients ADD COLUMN IF NOT EXISTS guardian_name VARCHAR(200)\",
    \"ALTER TABLE patients ADD COLUMN IF NOT EXISTS guardian_mobile VARCHAR(20)\",
    \"ALTER TABLE patients ADD COLUMN IF NOT EXISTS guardian_relationship VARCHAR(50)\",
    \"ALTER TABLE patients ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)\",
    \"ALTER TABLE patients ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)\",
    \"ALTER TABLE patients ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20)\",
    \"ALTER TABLE patients ADD COLUMN IF NOT EXISTS marital_status VARCHAR(30)\",
    \"ALTER TABLE patients ADD COLUMN IF NOT EXISTS occupation VARCHAR(150)\",
    \"ALTER TABLE patients ADD COLUMN IF NOT EXISTS nationality VARCHAR(100)\",
    \"ALTER TABLE patients ADD COLUMN IF NOT EXISTS religion VARCHAR(100)\",
    \"ALTER TABLE patients ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(50)\",
    \"ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_type VARCHAR(30)\",
    \"ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_provider VARCHAR(150)\",
    \"ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_policy_number VARCHAR(100)\",
    \"ALTER TABLE patients ADD COLUMN IF NOT EXISTS govt_scheme_name VARCHAR(150)\",
    \"ALTER TABLE patients ADD COLUMN IF NOT EXISTS govt_beneficiary_id VARCHAR(100)\",
    \"ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(50)\",
    \"ALTER TABLE appointments ADD COLUMN IF NOT EXISTS telehealth_room VARCHAR(100)\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS username VARCHAR(30)\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT FALSE\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS temp_pw_expiry TIMESTAMP WITHOUT TIME ZONE\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 1\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITHOUT TIME ZONE\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITHOUT TIME ZONE\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255)\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS pin_set_at TIMESTAMP WITHOUT TIME ZONE\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS pin_reset_required BOOLEAN DEFAULT FALSE\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS pin_failed_attempts INTEGER DEFAULT 0\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMP WITHOUT TIME ZONE\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS has_inpatient_access BOOLEAN DEFAULT FALSE\",
    \"UPDATE staff SET is_first_login = FALSE WHERE is_first_login IS NULL\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS bridge_api_key VARCHAR(64)\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS brand_name VARCHAR(200)\",
    \"ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS input_mode VARCHAR(20) DEFAULT 'type'\",
    \"ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS achievements JSONB\",
    \"ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS working_hours JSONB\",
    \"ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE\",
    \"ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS qualifications_list JSONB\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS brand_color VARCHAR(20)\",
    \"CREATE TABLE IF NOT EXISTS lab_orders (id SERIAL PRIMARY KEY, order_id VARCHAR(20) UNIQUE NOT NULL, clinic_id INTEGER REFERENCES clinics(id), patient_id INTEGER REFERENCES patients(id), appointment_id INTEGER REFERENCES appointments(id), ordered_by INTEGER REFERENCES staff(id), test_names JSONB DEFAULT '[]', clinical_notes TEXT, priority VARCHAR(20) DEFAULT 'routine', specimen_type VARCHAR(100), status VARCHAR(30) DEFAULT 'pending', collected_at TIMESTAMP, abha_id VARCHAR(50), created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS lab_results (id SERIAL PRIMARY KEY, order_id INTEGER UNIQUE REFERENCES lab_orders(id), raw_format VARCHAR(20), observations JSONB DEFAULT '[]', fhir_report JSONB, pdf_b64 TEXT, interpretation TEXT, status VARCHAR(30) DEFAULT 'pending_review', signed_by INTEGER REFERENCES staff(id), signed_at TIMESTAMP, report_hash VARCHAR(64), source VARCHAR(30) DEFAULT 'bridge', created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS imaging_orders (id SERIAL PRIMARY KEY, order_id VARCHAR(20) UNIQUE NOT NULL, clinic_id INTEGER REFERENCES clinics(id), patient_id INTEGER REFERENCES patients(id), appointment_id INTEGER REFERENCES appointments(id), ordered_by INTEGER REFERENCES staff(id), modality VARCHAR(10), body_part VARCHAR(100), study_description TEXT, clinical_notes TEXT, priority VARCHAR(20) DEFAULT 'routine', status VARCHAR(30) DEFAULT 'pending', abha_id VARCHAR(50), created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS imaging_results (id SERIAL PRIMARY KEY, order_id INTEGER UNIQUE REFERENCES imaging_orders(id), modality VARCHAR(10), study_uid VARCHAR(200), series_uid VARCHAR(200), dicom_metadata JSONB, fhir_report JSONB, key_image_paths JSONB DEFAULT '[]', pdf_b64 TEXT, findings TEXT, impression TEXT, status VARCHAR(30) DEFAULT 'pending_review', signed_by INTEGER REFERENCES staff(id), signed_at TIMESTAMP, report_hash VARCHAR(64), source VARCHAR(30) DEFAULT 'bridge', created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS unmatched_results (id SERIAL PRIMARY KEY, clinic_id INTEGER REFERENCES clinics(id), source VARCHAR(30), raw_format VARCHAR(20), parsed_data JSONB, patient_hint VARCHAR(200), resolved BOOLEAN DEFAULT FALSE, resolved_by INTEGER REFERENCES staff(id), resolved_at TIMESTAMP, linked_lab_order_id INTEGER REFERENCES lab_orders(id), linked_imaging_order_id INTEGER REFERENCES imaging_orders(id), created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS billing_waiver_logs (id SERIAL PRIMARY KEY, invoice_id INTEGER REFERENCES invoices(id), clinic_id INTEGER REFERENCES clinics(id), waived_by INTEGER REFERENCES staff(id), waiver_amount NUMERIC(10,2) NOT NULL, reason VARCHAR(50) NOT NULL, notes TEXT, created_at TIMESTAMP DEFAULT NOW())\",
    \"ALTER TABLE medicines ADD COLUMN IF NOT EXISTS form VARCHAR(50)\",
    \"ALTER TABLE medicines ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20)\",
    \"ALTER TABLE medicines ADD COLUMN IF NOT EXISTS schedule VARCHAR(10)\",
    \"ALTER TABLE medicines ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2)\",
    \"ALTER TABLE medicines ADD COLUMN IF NOT EXISTS mrp NUMERIC(10,2)\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS drug_license_number VARCHAR(100)\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS gstin VARCHAR(20)\",
    \"ALTER TABLE invoices ALTER COLUMN patient_id DROP NOT NULL\",
    \"ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_name VARCHAR(200)\",
    \"ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_mobile VARCHAR(20)\",
    \"ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sale_type VARCHAR(20) DEFAULT 'prescription'\",
    \"ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(10,2) DEFAULT 0\",
    \"ALTER TABLE invoices ADD COLUMN IF NOT EXISTS prescription_ref VARCHAR(100)\",
    \"ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20)\",
    \"ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2)\",
    \"ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(10,2)\",
    \"ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS medicine_id INTEGER REFERENCES medicines(id)\",
    \"ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0\",
    \"ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS mrp NUMERIC(10,2)\",
    \"CREATE TABLE IF NOT EXISTS stock_transactions (id SERIAL PRIMARY KEY, clinic_id INTEGER REFERENCES clinics(id), branch_id INTEGER REFERENCES branches(id), medicine_id INTEGER REFERENCES medicines(id) NOT NULL, transaction_type VARCHAR(20) NOT NULL, quantity INTEGER NOT NULL, quantity_before INTEGER NOT NULL, quantity_after INTEGER NOT NULL, batch_number VARCHAR(50), expiry_date DATE, unit_cost NUMERIC(10,2), supplier_name VARCHAR(200), notes TEXT, performed_by INTEGER REFERENCES staff(id), created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS chat_rooms (id SERIAL PRIMARY KEY, clinic_id INTEGER REFERENCES clinics(id), room_type VARCHAR(20) DEFAULT 'direct', name VARCHAR(200), created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS chat_room_members (id SERIAL PRIMARY KEY, room_id INTEGER REFERENCES chat_rooms(id), staff_id INTEGER REFERENCES staff(id), joined_at TIMESTAMP DEFAULT NOW(), UNIQUE(room_id, staff_id))\",
    \"CREATE TABLE IF NOT EXISTS internal_messages (id SERIAL PRIMARY KEY, room_id INTEGER REFERENCES chat_rooms(id), sender_id INTEGER REFERENCES staff(id), body TEXT NOT NULL, msg_type VARCHAR(20) DEFAULT 'text', created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS message_reads (id SERIAL PRIMARY KEY, message_id INTEGER REFERENCES internal_messages(id), staff_id INTEGER REFERENCES staff(id), read_at TIMESTAMP DEFAULT NOW(), UNIQUE(message_id, staff_id))\",
    \"CREATE TABLE IF NOT EXISTS suppliers (id SERIAL PRIMARY KEY, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, name VARCHAR(200) NOT NULL, contact_person VARCHAR(200), mobile VARCHAR(20), email VARCHAR(150), address TEXT, gstin VARCHAR(20), drug_license_number VARCHAR(100), payment_terms INTEGER DEFAULT 30, notes TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS purchase_orders (id SERIAL PRIMARY KEY, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, branch_id INTEGER REFERENCES branches(id), supplier_id INTEGER REFERENCES suppliers(id), po_number VARCHAR(50), status VARCHAR(20) DEFAULT 'draft', expected_date DATE, notes TEXT, total_amount NUMERIC(12,2) DEFAULT 0, created_by INTEGER REFERENCES staff(id), created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS purchase_order_items (id SERIAL PRIMARY KEY, po_id INTEGER REFERENCES purchase_orders(id) NOT NULL, medicine_id INTEGER REFERENCES medicines(id), medicine_name VARCHAR(200), quantity_ordered INTEGER DEFAULT 0, quantity_received INTEGER DEFAULT 0, unit_cost NUMERIC(10,2), total_cost NUMERIC(10,2), batch_number VARCHAR(50), expiry_date DATE)\",
    \"CREATE TABLE IF NOT EXISTS sales_returns (id SERIAL PRIMARY KEY, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, invoice_id INTEGER REFERENCES invoices(id), return_number VARCHAR(50), reason VARCHAR(100), total_refund NUMERIC(10,2) DEFAULT 0, refund_method VARCHAR(50), processed_by INTEGER REFERENCES staff(id), created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS sales_return_items (id SERIAL PRIMARY KEY, return_id INTEGER REFERENCES sales_returns(id) NOT NULL, medicine_id INTEGER REFERENCES medicines(id), medicine_name VARCHAR(200), quantity INTEGER DEFAULT 0, unit_price NUMERIC(10,2), total NUMERIC(10,2))\",
    \"CREATE TABLE IF NOT EXISTS drug_register (id SERIAL PRIMARY KEY, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, invoice_id INTEGER REFERENCES invoices(id), medicine_id INTEGER REFERENCES medicines(id), medicine_name VARCHAR(200), schedule VARCHAR(10), patient_name VARCHAR(200), patient_age INTEGER, patient_address TEXT, doctor_name VARCHAR(200), doctor_reg_number VARCHAR(100), quantity INTEGER DEFAULT 0, batch_number VARCHAR(50), sold_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS medicine_batches (id SERIAL PRIMARY KEY, medicine_id INTEGER REFERENCES medicines(id) NOT NULL, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, branch_id INTEGER REFERENCES branches(id), batch_number VARCHAR(50), expiry_date DATE, quantity INTEGER DEFAULT 0, unit_cost NUMERIC(10,2), supplier_id INTEGER REFERENCES suppliers(id), received_at TIMESTAMP DEFAULT NOW())\",
    \"ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS acquired_by INTEGER REFERENCES staff(id)\",
    \"ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS acquired_at TIMESTAMP\",
    \"ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS technician_notes TEXT\",
    \"ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS contrast_used BOOLEAN DEFAULT FALSE\",
    \"ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS contrast_agent VARCHAR(100)\",
    \"ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS contrast_volume_ml NUMERIC(6,2)\",
    \"ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS radiation_dose_mgy NUMERIC(8,3)\",
    \"ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS film_count INTEGER DEFAULT 0\",
    \"ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS referring_doctor VARCHAR(200)\",
    \"ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS referring_doctor_reg VARCHAR(100)\",
    \"ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS order_id VARCHAR(20)\",
    \"ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS study_description TEXT\",
    \"ALTER TABLE imaging_orders ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'routine'\",
    \"ALTER TABLE online_bookings ADD COLUMN IF NOT EXISTS patient_user_id INTEGER REFERENCES patient_users(id)\",
    \"ALTER TABLE online_bookings ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'offline'\",
    \"ALTER TABLE online_bookings ADD COLUMN IF NOT EXISTS patient_state VARCHAR(100)\",
    \"ALTER TABLE online_bookings ADD COLUMN IF NOT EXISTS bh_id_ref VARCHAR(20)\",
    \"ALTER TABLE online_bookings ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(30) DEFAULT 'pay_at_clinic'\",
    \"ALTER TABLE online_bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) DEFAULT 'pending'\",
    \"ALTER TABLE online_bookings ADD COLUMN IF NOT EXISTS amount_due NUMERIC(10,2)\",
    \"ALTER TABLE online_bookings ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)\",
    \"ALTER TABLE online_bookings ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)\",
    \"ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS auto_confirm BOOLEAN DEFAULT true\",
    \"ALTER TABLE doctor_schedules ADD COLUMN IF NOT EXISTS online_slots INTEGER DEFAULT 0\",
    \"ALTER TABLE doctor_schedules ADD COLUMN IF NOT EXISTS online_auto_confirm INTEGER DEFAULT 0\",
    \"ALTER TABLE doctor_schedules ADD COLUMN IF NOT EXISTS walk_in_slots INTEGER DEFAULT 0\",
    \"ALTER TABLE doctor_schedules ADD COLUMN IF NOT EXISTS telehealth_slots INTEGER DEFAULT 0\",
    \"ALTER TABLE doctor_schedules ADD COLUMN IF NOT EXISTS telehealth_auto_confirm INTEGER DEFAULT 0\",
    \"CREATE TABLE IF NOT EXISTS follow_up_reminders (id SERIAL PRIMARY KEY, appointment_id INTEGER NOT NULL REFERENCES appointments(id), clinic_id INTEGER NOT NULL REFERENCES clinics(id), patient_name VARCHAR(200) NOT NULL, patient_mobile VARCHAR(20), doctor_name VARCHAR(200), due_date DATE NOT NULL, follow_up_days INTEGER NOT NULL, notes TEXT, status VARCHAR(20) DEFAULT 'pending', called_by INTEGER REFERENCES staff(id), called_at TIMESTAMP, scheduled_appointment_id INTEGER REFERENCES appointments(id), created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS imaging_report_templates (id SERIAL PRIMARY KEY, clinic_id INTEGER REFERENCES clinics(id), modality VARCHAR(10) NOT NULL, name VARCHAR(200) NOT NULL, findings_template TEXT, impression_template TEXT, body_part VARCHAR(100), is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS imaging_critical_alerts (id SERIAL PRIMARY KEY, clinic_id INTEGER REFERENCES clinics(id), order_id INTEGER REFERENCES imaging_orders(id), alert_type VARCHAR(50), description TEXT, alerted_by INTEGER REFERENCES staff(id), alerted_at TIMESTAMP DEFAULT NOW(), acknowledged_by INTEGER REFERENCES staff(id), acknowledged_at TIMESTAMP)\",
    \"CREATE TABLE IF NOT EXISTS referring_doctors (id SERIAL PRIMARY KEY, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, name VARCHAR(200) NOT NULL, registration_number VARCHAR(100), specialization VARCHAR(200), hospital VARCHAR(200), mobile VARCHAR(20), email VARCHAR(150), address TEXT, notes TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS imaging_slots (id SERIAL PRIMARY KEY, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, date DATE NOT NULL, time VARCHAR(5) NOT NULL, modality VARCHAR(10) NOT NULL, capacity INTEGER DEFAULT 1, created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS imaging_bookings (id SERIAL PRIMARY KEY, slot_id INTEGER REFERENCES imaging_slots(id) NOT NULL, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, patient_name VARCHAR(200) NOT NULL, patient_mobile VARCHAR(20), modality VARCHAR(10), study_description TEXT, referring_doctor VARCHAR(200), priority VARCHAR(20) DEFAULT 'routine', notes TEXT, order_id INTEGER REFERENCES imaging_orders(id), created_at TIMESTAMP DEFAULT NOW())\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS org_type VARCHAR(20) DEFAULT 'clinic'\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS wards_enabled BOOLEAN DEFAULT FALSE\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS admission_sequence INTEGER DEFAULT 0\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(20) DEFAULT 'free'\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active'\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMP\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS clinic_prefix VARCHAR(10)\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS suspension_reason VARCHAR(100)\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS suspension_comment TEXT\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS rejection_reason TEXT\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS license_document_url VARCHAR(500)\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS has_pharmacy BOOLEAN DEFAULT FALSE\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS has_lab BOOLEAN DEFAULT FALSE\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS has_imaging BOOLEAN DEFAULT FALSE\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS has_inpatient BOOLEAN DEFAULT FALSE\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS has_emergency BOOLEAN DEFAULT FALSE\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS has_blood_bank BOOLEAN DEFAULT FALSE\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS has_ambulance BOOLEAN DEFAULT FALSE\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS has_telehealth BOOLEAN DEFAULT FALSE\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS total_beds INTEGER DEFAULT 0\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS icu_beds INTEGER DEFAULT 0\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS ot_count INTEGER DEFAULT 0\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS nabl_accredited BOOLEAN DEFAULT FALSE\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS nabl_number VARCHAR(100)\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS parent_clinic_id INTEGER REFERENCES clinics(id)\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS patient_id_counter INTEGER DEFAULT 0\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS website VARCHAR(300)\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS operating_hours VARCHAR(200)\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS reg_number VARCHAR(100)\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS accreditation VARCHAR(100)\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS google_maps_url TEXT\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500)\",
    \"ALTER TABLE patients ADD COLUMN IF NOT EXISTS bhid_profile_id INTEGER REFERENCES bh_profiles(id)\",
    \"CREATE TABLE IF NOT EXISTS appointment_token_sequences (id SERIAL PRIMARY KEY, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, branch_id INTEGER REFERENCES branches(id) NOT NULL, doctor_id INTEGER REFERENCES staff(id) NOT NULL, date DATE NOT NULL, last_token INTEGER NOT NULL DEFAULT 0, UNIQUE(clinic_id, branch_id, doctor_id, date))\",
    \"CREATE TABLE IF NOT EXISTS departments (id SERIAL PRIMARY KEY, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, name VARCHAR(200) NOT NULL, code VARCHAR(10), dept_type VARCHAR(20) DEFAULT 'clinical', head_doctor_id INTEGER REFERENCES staff(id), color_hex VARCHAR(7), is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS staff_departments (id SERIAL PRIMARY KEY, staff_id INTEGER REFERENCES staff(id) NOT NULL, department_id INTEGER REFERENCES departments(id) NOT NULL, is_primary BOOLEAN DEFAULT TRUE, UNIQUE(staff_id, department_id))\",
    \"CREATE TABLE IF NOT EXISTS wards (id SERIAL PRIMARY KEY, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, department_id INTEGER REFERENCES departments(id) NOT NULL, name VARCHAR(200) NOT NULL, floor VARCHAR(20), wing VARCHAR(50), ward_type VARCHAR(20) DEFAULT 'general', total_beds INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS beds (id SERIAL PRIMARY KEY, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, ward_id INTEGER REFERENCES wards(id) NOT NULL, bed_number VARCHAR(20) NOT NULL, bed_type VARCHAR(20) DEFAULT 'general', status VARCHAR(20) DEFAULT 'vacant', current_admission_id INTEGER, created_at TIMESTAMP DEFAULT NOW(), UNIQUE(ward_id, bed_number))\",
    \"CREATE TABLE IF NOT EXISTS admissions (id SERIAL PRIMARY KEY, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, patient_id INTEGER REFERENCES patients(id) NOT NULL, admission_number VARCHAR(30) UNIQUE NOT NULL, admission_sequence INTEGER NOT NULL, department_id INTEGER REFERENCES departments(id), ward_id INTEGER REFERENCES wards(id), bed_id INTEGER REFERENCES beds(id), admission_type VARCHAR(20) DEFAULT 'opd_referred', source_appointment_id INTEGER REFERENCES appointments(id), admitting_doctor_id INTEGER REFERENCES staff(id) NOT NULL, primary_diagnosis TEXT, admitted_at TIMESTAMP DEFAULT NOW(), discharged_at TIMESTAMP, expected_discharge DATE, status VARCHAR(20) DEFAULT 'active', tpa_id VARCHAR(50), insurance_company VARCHAR(200), policy_number VARCHAR(100), pre_auth_number VARCHAR(100), created_by INTEGER REFERENCES staff(id), created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS admission_transfers (id SERIAL PRIMARY KEY, admission_id INTEGER REFERENCES admissions(id) NOT NULL, from_department_id INTEGER REFERENCES departments(id), from_ward_id INTEGER REFERENCES wards(id), from_bed_id INTEGER REFERENCES beds(id), to_department_id INTEGER REFERENCES departments(id), to_ward_id INTEGER REFERENCES wards(id), to_bed_id INTEGER REFERENCES beds(id), transferred_at TIMESTAMP DEFAULT NOW(), transferred_by INTEGER REFERENCES staff(id), reason TEXT)\",
    \"CREATE TABLE IF NOT EXISTS referrals (id SERIAL PRIMARY KEY, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, patient_id INTEGER REFERENCES patients(id) NOT NULL, bhid VARCHAR(15), referral_number VARCHAR(30) UNIQUE NOT NULL, referring_type VARCHAR(20) DEFAULT 'internal', referring_doctor_id INTEGER REFERENCES staff(id), referring_doctor_name VARCHAR(200), referring_doctor_reg VARCHAR(100), referring_org_name VARCHAR(200), referred_to_type VARCHAR(20) DEFAULT 'external_outside', referred_to_clinic_id INTEGER REFERENCES clinics(id), referred_to_doctor_id INTEGER REFERENCES staff(id), referred_to_doctor_name VARCHAR(200), referred_to_specialty VARCHAR(100), referred_to_org_name VARCHAR(200), urgency VARCHAR(20) DEFAULT 'routine', reason TEXT, clinical_summary TEXT, current_medications TEXT, relevant_investigations TEXT, source_appointment_id INTEGER REFERENCES appointments(id), source_admission_id INTEGER REFERENCES admissions(id), status VARCHAR(20) DEFAULT 'draft', referred_at TIMESTAMP DEFAULT NOW(), accepted_at TIMESTAMP, completed_at TIMESTAMP, rejection_reason TEXT, outcome_notes TEXT, resulted_in_admission BOOLEAN DEFAULT FALSE, destination_admission_id INTEGER REFERENCES admissions(id), created_by INTEGER REFERENCES staff(id), created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS vital_signs (id SERIAL PRIMARY KEY, admission_id INTEGER REFERENCES admissions(id) NOT NULL, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, recorded_by INTEGER REFERENCES staff(id) NOT NULL, recorded_at TIMESTAMP DEFAULT NOW(), temperature FLOAT, pulse INTEGER, respiration_rate INTEGER, bp_systolic INTEGER, bp_diastolic INTEGER, spo2 FLOAT, weight FLOAT, height FLOAT, pain_score INTEGER, notes TEXT, created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS nursing_notes (id SERIAL PRIMARY KEY, admission_id INTEGER REFERENCES admissions(id) NOT NULL, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, note_type VARCHAR(30) DEFAULT 'general', note_text TEXT NOT NULL, written_by INTEGER REFERENCES staff(id) NOT NULL, written_at TIMESTAMP DEFAULT NOW(), shift VARCHAR(10), is_handoff BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS medication_administrations (id SERIAL PRIMARY KEY, admission_id INTEGER REFERENCES admissions(id) NOT NULL, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, medicine_name VARCHAR(200) NOT NULL, dose VARCHAR(100), route VARCHAR(50), scheduled_time TIMESTAMP, administered_at TIMESTAMP, administered_by INTEGER REFERENCES staff(id), status VARCHAR(20) DEFAULT 'scheduled', reason_held VARCHAR(200), notes TEXT, created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS ward_rounds (id SERIAL PRIMARY KEY, admission_id INTEGER REFERENCES admissions(id) NOT NULL, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, doctor_id INTEGER REFERENCES staff(id) NOT NULL, round_date DATE NOT NULL, subjective TEXT, objective TEXT, assessment TEXT, plan TEXT, created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS discharge_summaries (id SERIAL PRIMARY KEY, admission_id INTEGER REFERENCES admissions(id) UNIQUE NOT NULL, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, written_by INTEGER REFERENCES staff(id) NOT NULL, admission_diagnosis TEXT, final_diagnosis TEXT, procedures_done TEXT, hospital_course TEXT, condition_at_discharge VARCHAR(50), discharge_instructions TEXT, follow_up_date DATE, follow_up_with VARCHAR(200), diet_advice TEXT, activity_restrictions TEXT, discharge_medications TEXT, status VARCHAR(20) DEFAULT 'draft', finalized_at TIMESTAMP, finalized_by INTEGER REFERENCES staff(id), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS progress_notes (id SERIAL PRIMARY KEY, admission_id INTEGER REFERENCES admissions(id) NOT NULL, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, written_by INTEGER REFERENCES staff(id) NOT NULL, note_date DATE NOT NULL, note_time TIMESTAMP DEFAULT NOW(), subjective TEXT, objective TEXT, assessment TEXT, plan TEXT, note_type VARCHAR(30) DEFAULT 'progress', is_significant BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS inpatient_charges (id SERIAL PRIMARY KEY, admission_id INTEGER REFERENCES admissions(id) NOT NULL, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, charge_date DATE NOT NULL, charge_type VARCHAR(30) NOT NULL, description VARCHAR(300) NOT NULL, quantity NUMERIC(10,2) DEFAULT 1, unit_price NUMERIC(10,2) NOT NULL, total NUMERIC(10,2) NOT NULL, gst_rate NUMERIC(5,2) DEFAULT 0, gst_amount NUMERIC(10,2) DEFAULT 0, added_by INTEGER REFERENCES staff(id), is_voided BOOLEAN DEFAULT FALSE, void_reason VARCHAR(200), created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS inpatient_bills (id SERIAL PRIMARY KEY, admission_id INTEGER REFERENCES admissions(id) UNIQUE NOT NULL, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, invoice_id INTEGER REFERENCES invoices(id), bill_number VARCHAR(30) UNIQUE NOT NULL, room_charges NUMERIC(10,2) DEFAULT 0, procedure_charges NUMERIC(10,2) DEFAULT 0, consultation_charges NUMERIC(10,2) DEFAULT 0, lab_charges NUMERIC(10,2) DEFAULT 0, imaging_charges NUMERIC(10,2) DEFAULT 0, pharmacy_charges NUMERIC(10,2) DEFAULT 0, misc_charges NUMERIC(10,2) DEFAULT 0, subtotal NUMERIC(10,2) DEFAULT 0, gst_amount NUMERIC(10,2) DEFAULT 0, discount NUMERIC(10,2) DEFAULT 0, total NUMERIC(10,2) DEFAULT 0, insurance_claim_amount NUMERIC(10,2) DEFAULT 0, tpa_approved_amount NUMERIC(10,2) DEFAULT 0, patient_payable NUMERIC(10,2) DEFAULT 0, amount_paid NUMERIC(10,2) DEFAULT 0, payment_method VARCHAR(50), status VARCHAR(20) DEFAULT 'draft', notes TEXT, generated_by INTEGER REFERENCES staff(id), finalized_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS medication_orders (id SERIAL PRIMARY KEY, admission_id INTEGER REFERENCES admissions(id) NOT NULL, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, drug_name VARCHAR(200) NOT NULL, generic_name VARCHAR(200), dose VARCHAR(100), route VARCHAR(30), frequency VARCHAR(30), duration_days INTEGER, instructions TEXT, is_prn BOOLEAN DEFAULT FALSE, prn_reason VARCHAR(200), is_stat BOOLEAN DEFAULT FALSE, is_continuous BOOLEAN DEFAULT FALSE, iv_rate VARCHAR(50), iv_fluid VARCHAR(100), iv_volume_ml VARCHAR(50), notes TEXT, status VARCHAR(20) DEFAULT 'active', ordered_by INTEGER REFERENCES staff(id), ordered_at TIMESTAMP DEFAULT NOW(), discontinued_by INTEGER REFERENCES staff(id), discontinued_at TIMESTAMP, discontinue_reason VARCHAR(300), created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS clinical_orders (id SERIAL PRIMARY KEY, admission_id INTEGER REFERENCES admissions(id) NOT NULL, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, order_type VARCHAR(30) NOT NULL, order_detail VARCHAR(500) NOT NULL, priority VARCHAR(20) DEFAULT 'routine', instructions TEXT, status VARCHAR(20) DEFAULT 'pending', ordered_by INTEGER REFERENCES staff(id), ordered_at TIMESTAMP DEFAULT NOW(), acknowledged_by INTEGER REFERENCES staff(id), acknowledged_at TIMESTAMP, completed_by INTEGER REFERENCES staff(id), completed_at TIMESTAMP, result_notes TEXT, cancelled_by INTEGER REFERENCES staff(id), cancelled_at TIMESTAMP, cancel_reason VARCHAR(300), created_at TIMESTAMP DEFAULT NOW())\",
    \"ALTER TABLE invoices ADD COLUMN IF NOT EXISTS admission_id INTEGER REFERENCES admissions(id)\",
    \"ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sale_type_inpatient BOOLEAN DEFAULT FALSE\",
    \"CREATE TABLE IF NOT EXISTS documentation_sessions (id SERIAL PRIMARY KEY, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, admission_id INTEGER REFERENCES admissions(id) NOT NULL, signed_by INTEGER REFERENCES staff(id) NOT NULL, signed_at TIMESTAMP DEFAULT NOW(), shift VARCHAR(20), note TEXT)\",
    \"CREATE TABLE IF NOT EXISTS assessment_templates (id SERIAL PRIMARY KEY, name VARCHAR(200) NOT NULL, specialty VARCHAR(100) NOT NULL, description TEXT, fields JSONB NOT NULL DEFAULT '[]', scope VARCHAR(20) DEFAULT 'platform', clinic_id INTEGER REFERENCES clinics(id), is_active BOOLEAN DEFAULT TRUE, created_by_admin INTEGER REFERENCES platform_admins(id), created_by_staff INTEGER REFERENCES staff(id), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS template_assignments (id SERIAL PRIMARY KEY, template_id INTEGER REFERENCES assessment_templates(id) NOT NULL, scope VARCHAR(20) NOT NULL, clinic_id INTEGER REFERENCES clinics(id), department_id INTEGER REFERENCES departments(id), assigned_by INTEGER REFERENCES platform_admins(id), assigned_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS pharmacy_orders (id SERIAL PRIMARY KEY, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, branch_id INTEGER REFERENCES branches(id), patient_id INTEGER REFERENCES patients(id), source VARCHAR(20) NOT NULL, status VARCHAR(30) NOT NULL DEFAULT 'pending_fill', prescription_image_url VARCHAR(500), prescription_id INTEGER REFERENCES prescriptions(id), patient_name VARCHAR(200), patient_mobile VARCHAR(20), notes TEXT, created_by INTEGER REFERENCES staff(id), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS dispense_sessions (id SERIAL PRIMARY KEY, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, branch_id INTEGER REFERENCES branches(id), order_id INTEGER REFERENCES pharmacy_orders(id), patient_id INTEGER REFERENCES patients(id), dispense_number INTEGER NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'draft', subtotal NUMERIC(10,2) DEFAULT 0, gst_total NUMERIC(10,2) DEFAULT 0, total_amount NUMERIC(10,2) DEFAULT 0, amount_paid NUMERIC(10,2) DEFAULT 0, balance_due NUMERIC(10,2) DEFAULT 0, payment_method VARCHAR(50), dispensed_by INTEGER REFERENCES staff(id), dispensed_at TIMESTAMP, invoice_id INTEGER REFERENCES invoices(id), patient_name VARCHAR(200), patient_mobile VARCHAR(20), notes TEXT, created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS dispense_items (id SERIAL PRIMARY KEY, session_id INTEGER REFERENCES dispense_sessions(id) NOT NULL, medicine_id INTEGER REFERENCES medicines(id), medicine_name VARCHAR(200) NOT NULL, batch_number VARCHAR(50), expiry_date DATE, ordered_qty INTEGER DEFAULT 0, dispensed_qty INTEGER DEFAULT 0, unit_price NUMERIC(10,2) DEFAULT 0, mrp NUMERIC(10,2), gst_percent NUMERIC(5,2) DEFAULT 0, gst_amount NUMERIC(10,2) DEFAULT 0, line_total NUMERIC(10,2) DEFAULT 0, is_schedule_h BOOLEAN DEFAULT FALSE, gathered BOOLEAN DEFAULT FALSE)\",
    \"CREATE TABLE IF NOT EXISTS shift_types (id SERIAL PRIMARY KEY, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, name VARCHAR(100) NOT NULL, start_time VARCHAR(5) NOT NULL, end_time VARCHAR(5) NOT NULL, color_hex VARCHAR(7) DEFAULT '#0F2557', is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS staff_groups (id SERIAL PRIMARY KEY, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, name VARCHAR(200) NOT NULL, department_id INTEGER REFERENCES departments(id), manager_id INTEGER REFERENCES staff(id), created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS staff_group_members (id SERIAL PRIMARY KEY, group_id INTEGER REFERENCES staff_groups(id) NOT NULL, staff_id INTEGER REFERENCES staff(id) NOT NULL, created_at TIMESTAMP DEFAULT NOW(), UNIQUE(group_id, staff_id))\",
    \"CREATE TABLE IF NOT EXISTS schedule_entries (id SERIAL PRIMARY KEY, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, group_id INTEGER REFERENCES staff_groups(id), staff_id INTEGER REFERENCES staff(id) NOT NULL, shift_type_id INTEGER REFERENCES shift_types(id) NOT NULL, work_date DATE NOT NULL, status VARCHAR(20) DEFAULT 'draft', notes VARCHAR(300), created_by INTEGER REFERENCES staff(id), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW(), UNIQUE(staff_id, work_date, shift_type_id))\",
    \"CREATE TABLE IF NOT EXISTS leave_requests (id SERIAL PRIMARY KEY, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, staff_id INTEGER REFERENCES staff(id) NOT NULL, leave_type VARCHAR(20) DEFAULT 'casual', from_date DATE NOT NULL, to_date DATE NOT NULL, reason VARCHAR(500), status VARCHAR(20) DEFAULT 'pending', decided_by INTEGER REFERENCES staff(id), decided_at TIMESTAMP, decision_note VARCHAR(300), created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS schedule_patterns (id SERIAL PRIMARY KEY, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, group_id INTEGER REFERENCES staff_groups(id), name VARCHAR(200) NOT NULL, recurrence VARCHAR(20) DEFAULT 'manual', pattern_data JSONB DEFAULT '[]', created_by INTEGER REFERENCES staff(id), created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS schedule_publish_logs (id SERIAL PRIMARY KEY, clinic_id INTEGER REFERENCES clinics(id) NOT NULL, group_id INTEGER REFERENCES staff_groups(id), week_start DATE NOT NULL, week_end DATE NOT NULL, published_by INTEGER REFERENCES staff(id), published_at TIMESTAMP DEFAULT NOW(), recipients JSONB DEFAULT '[]')\",
    \"CREATE TABLE IF NOT EXISTS scheduler_settings (id SERIAL PRIMARY KEY, clinic_id INTEGER REFERENCES clinics(id) UNIQUE NOT NULL, min_rest_hours INTEGER DEFAULT 8, max_shifts_per_week INTEGER DEFAULT 6, weekly_off_day VARCHAR(10), leave_quotas JSONB DEFAULT '{}', setup_complete BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS employee_id VARCHAR(30)\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS designation VARCHAR(100)\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS department VARCHAR(100)\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS ward VARCHAR(100)\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS reporting_manager_id INTEGER REFERENCES staff(id)\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS employment_type VARCHAR(20)\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS join_date DATE\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS date_of_birth DATE\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS gender VARCHAR(10)\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(200)\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS emergency_contact_mobile VARCHAR(20)\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS qualification VARCHAR(200)\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100)\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS license_expiry_date DATE\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS address TEXT\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS modules JSONB\",
    \"CREATE TABLE IF NOT EXISTS feedback (id SERIAL PRIMARY KEY, name VARCHAR(200) NOT NULL, email VARCHAR(150), message TEXT NOT NULL, type VARCHAR(50), is_read BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP DEFAULT NOW())\",
    \"ALTER TABLE feedback ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS secondary_roles JSONB DEFAULT '[]'\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS scheduled_removal_date DATE\",
    \"ALTER TABLE staff ADD COLUMN IF NOT EXISTS removal_reason VARCHAR(200)\",
    \"CREATE TABLE IF NOT EXISTS insurance_claims (id SERIAL PRIMARY KEY, clinic_id INTEGER NOT NULL REFERENCES clinics(id), invoice_id INTEGER REFERENCES invoices(id), appointment_id INTEGER REFERENCES appointments(id), patient_id INTEGER NOT NULL REFERENCES patients(id), scheme_category VARCHAR(30) NOT NULL, scheme_name VARCHAR(200) NOT NULL, card_number VARCHAR(100), policy_holder_name VARCHAR(200), tpa_name VARCHAR(200), pre_auth_ref VARCHAR(100), pre_auth_amount NUMERIC(10,2), pre_auth_status VARCHAR(30), pre_auth_submitted_at TIMESTAMP, pre_auth_decided_at TIMESTAMP, pre_auth_notes TEXT, claim_ref VARCHAR(100), claimed_amount NUMERIC(10,2), approved_amount NUMERIC(10,2), claim_status VARCHAR(30) DEFAULT 'draft', claim_submitted_at TIMESTAMP, claim_decided_at TIMESTAMP, claim_notes TEXT, created_by INTEGER REFERENCES staff(id), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS billing_override_requests (id SERIAL PRIMARY KEY, clinic_id INTEGER NOT NULL REFERENCES clinics(id), invoice_id INTEGER REFERENCES invoices(id), appointment_id INTEGER REFERENCES appointments(id), patient_id INTEGER NOT NULL REFERENCES patients(id), from_module VARCHAR(50) NOT NULL, requested_by INTEGER REFERENCES staff(id), items JSONB NOT NULL, total_amount NUMERIC(10,2) NOT NULL, notes TEXT, status VARCHAR(20) DEFAULT 'pending', reviewed_by INTEGER REFERENCES staff(id), review_notes TEXT, reviewed_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS invoice_payments (id SERIAL PRIMARY KEY, invoice_id INTEGER NOT NULL REFERENCES invoices(id), clinic_id INTEGER NOT NULL REFERENCES clinics(id), amount NUMERIC(10,2) NOT NULL, method VARCHAR(50) NOT NULL, reference VARCHAR(200), notes TEXT, received_by INTEGER REFERENCES staff(id), received_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE INDEX IF NOT EXISTS idx_insurance_claims_appt ON insurance_claims(appointment_id)\",
    \"CREATE INDEX IF NOT EXISTS idx_insurance_claims_patient ON insurance_claims(patient_id, clinic_id)\",
    \"CREATE INDEX IF NOT EXISTS idx_override_requests_clinic ON billing_override_requests(clinic_id, status)\",
    \"CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments(invoice_id)\",
    \"CREATE TABLE IF NOT EXISTS telehealth_sessions (id SERIAL PRIMARY KEY, appointment_id INTEGER UNIQUE NOT NULL REFERENCES appointments(id), clinic_id INTEGER NOT NULL REFERENCES clinics(id), room_name VARCHAR(100) NOT NULL, state VARCHAR(30) NOT NULL DEFAULT 'scheduled', slot_start TIMESTAMP NOT NULL, slot_end TIMESTAMP NOT NULL, room_expires_at TIMESTAMP, doctor_first_joined_at TIMESTAMP, patient_first_joined_at TIMESTAMP, completed_at TIMESTAMP, completed_by INTEGER REFERENCES staff(id), reopen_count INTEGER DEFAULT 0, reopened_until TIMESTAMP, created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS telehealth_session_events (id SERIAL PRIMARY KEY, session_id INTEGER NOT NULL REFERENCES telehealth_sessions(id), event_type VARCHAR(50) NOT NULL, actor_type VARCHAR(20), actor_id INTEGER, payload JSONB, created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE INDEX IF NOT EXISTS idx_telehealth_sessions_appt ON telehealth_sessions(appointment_id)\",
    \"CREATE INDEX IF NOT EXISTS idx_telehealth_sessions_clinic_state ON telehealth_sessions(clinic_id, state)\",
    \"ALTER TABLE appointments ADD COLUMN IF NOT EXISTS telehealth_joined_at TIMESTAMP\",
    \"ALTER TABLE appointments ADD COLUMN IF NOT EXISTS telehealth_room VARCHAR(120)\",
    \"CREATE TABLE IF NOT EXISTS form_templates (id SERIAL PRIMARY KEY, clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE, name VARCHAR(200) NOT NULL, category VARCHAR(100), description TEXT, schema JSONB DEFAULT '[]', estimated_minutes INTEGER DEFAULT 2, is_active BOOLEAN DEFAULT TRUE, is_global BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS form_responses (id SERIAL PRIMARY KEY, template_id INTEGER NOT NULL REFERENCES form_templates(id), appointment_id INTEGER REFERENCES appointments(id) ON DELETE CASCADE, patient_id INTEGER REFERENCES patients(id), data JSONB DEFAULT '{}', filled_by INTEGER REFERENCES staff(id), filled_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE INDEX IF NOT EXISTS idx_form_responses_appt ON form_responses(appointment_id)\",
    \"CREATE INDEX IF NOT EXISTS idx_form_responses_patient ON form_responses(patient_id)\",
    \"CREATE INDEX IF NOT EXISTS idx_form_templates_clinic ON form_templates(clinic_id)\",
    \"CREATE TABLE IF NOT EXISTS medical_terms (id SERIAL PRIMARY KEY, system VARCHAR(80) DEFAULT 'http://hl7.org/fhir/sid/icd-10', code VARCHAR(20), display VARCHAR(300) NOT NULL, category VARCHAR(30) DEFAULT 'condition', specialty VARCHAR(60), synonyms TEXT, tier VARCHAR(20) DEFAULT 'curated', group_label VARCHAR(60), clinic_id INTEGER REFERENCES clinics(id), is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS drugs (id SERIAL PRIMARY KEY, generic VARCHAR(200) NOT NULL, atc VARCHAR(10), drug_class VARCHAR(150), routes VARCHAR(150), brands TEXT, rx_only BOOLEAN DEFAULT TRUE, clinic_id INTEGER REFERENCES clinics(id), is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS drug_interactions (id SERIAL PRIMARY KEY, drug_a VARCHAR(200) NOT NULL, drug_b VARCHAR(200) NOT NULL, severity VARCHAR(20) NOT NULL, effect TEXT, management TEXT, created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS drug_dose_ranges (id SERIAL PRIMARY KEY, generic VARCHAR(200) NOT NULL, route VARCHAR(40) DEFAULT 'oral', population VARCHAR(20) DEFAULT 'adult', max_single_mg NUMERIC(12,3), max_daily_mg NUMERIC(12,3), unit VARCHAR(10) DEFAULT 'mg', note TEXT, created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS drug_contraindications (id SERIAL PRIMARY KEY, generic VARCHAR(200) NOT NULL, icd10_prefix VARCHAR(10) NOT NULL, condition VARCHAR(200), severity VARCHAR(20) DEFAULT 'serious', reason TEXT, created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE INDEX IF NOT EXISTS idx_medterms_category ON medical_terms(category, specialty)\",
    \"CREATE INDEX IF NOT EXISTS idx_medterms_code ON medical_terms(code)\",
    \"CREATE INDEX IF NOT EXISTS idx_drugs_generic ON drugs(generic)\",
    \"CREATE INDEX IF NOT EXISTS idx_drug_interactions_pair ON drug_interactions(drug_a, drug_b)\",
    \"CREATE INDEX IF NOT EXISTS idx_drug_contra_generic ON drug_contraindications(generic)\",
    \"ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS reason_for_visit TEXT\",
    \"ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS patient_complaints TEXT\",
    \"ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS past_history TEXT\",
    \"ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS investigations_findings TEXT\",
    \"ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS medications_prescribed TEXT\",
    \"ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS discharge_assessment TEXT\",
    \"ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS cautions_followup TEXT\",
    \"ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE\",
    \"ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITHOUT TIME ZONE\",
    \"ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES staff(id)\",
    \"ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS appointment_id INTEGER REFERENCES appointments(id)\",
    \"ALTER TABLE lab_order_items ADD COLUMN IF NOT EXISTS result_value TEXT\",
    \"ALTER TABLE lab_order_items ADD COLUMN IF NOT EXISTS is_abnormal BOOLEAN DEFAULT FALSE\",
    \"ALTER TABLE lab_order_items ADD COLUMN IF NOT EXISTS reference_range VARCHAR(100)\",
    \"ALTER TABLE lab_order_items ADD COLUMN IF NOT EXISTS unit VARCHAR(50)\",
    \"ALTER TABLE appointments ADD COLUMN IF NOT EXISTS online_booking_id INTEGER\",
    \"ALTER TABLE patients ADD COLUMN IF NOT EXISTS clinic_patient_id VARCHAR(20)\",
    \"ALTER TABLE patients ADD COLUMN IF NOT EXISTS portal_user_id INTEGER\",
    \"ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45)\",
\"ALTER TABLE drug_interactions ADD COLUMN IF NOT EXISTS interaction_type VARCHAR(30) DEFAULT 'drug-drug'\",
    \"CREATE TABLE IF NOT EXISTS imaging_catalog (id SERIAL PRIMARY KEY, name VARCHAR(200) NOT NULL, modality VARCHAR(20) NOT NULL, body_part VARCHAR(100), category VARCHAR(100), turnaround_hours INTEGER DEFAULT 24, preparation TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE INDEX IF NOT EXISTS idx_imaging_catalog_modality ON imaging_catalog(modality)\",
    \"CREATE TABLE IF NOT EXISTS disease_counselling (id SERIAL PRIMARY KEY, icd10_prefix VARCHAR(10) NOT NULL, condition VARCHAR(200), tip TEXT NOT NULL, sort_order INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE INDEX IF NOT EXISTS idx_disease_counsel_prefix ON disease_counselling(icd10_prefix)\",
    \"CREATE TABLE IF NOT EXISTS pregnancy_categories (id SERIAL PRIMARY KEY, generic VARCHAR(200) NOT NULL, category VARCHAR(5), schedule VARCHAR(10), notes TEXT, created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE INDEX IF NOT EXISTS idx_pregnancy_cat_generic ON pregnancy_categories(generic)\",
    \"CREATE TABLE IF NOT EXISTS food_drug_interactions (id SERIAL PRIMARY KEY, generic VARCHAR(200) NOT NULL, food TEXT NOT NULL, effect TEXT, severity VARCHAR(20), created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE INDEX IF NOT EXISTS idx_food_drug_generic ON food_drug_interactions(generic)\",
    \"ALTER TABLE drug_dose_ranges ADD COLUMN IF NOT EXISTS pediatric_dose_mg_kg_min FLOAT\",
    \"ALTER TABLE drug_dose_ranges ADD COLUMN IF NOT EXISTS pediatric_dose_mg_kg_max FLOAT\",
    \"ALTER TABLE drug_dose_ranges ADD COLUMN IF NOT EXISTS renal_adjustment BOOLEAN DEFAULT FALSE\",
    \"ALTER TABLE drug_dose_ranges ADD COLUMN IF NOT EXISTS hepatic_adjustment BOOLEAN DEFAULT FALSE\",
    \"ALTER TABLE drug_dose_ranges ADD COLUMN IF NOT EXISTS pregnancy_category VARCHAR(5)\",
    \"ALTER TABLE drugs ADD COLUMN IF NOT EXISTS formulations TEXT\",
    \"UPDATE drugs SET is_active = TRUE WHERE is_active IS NULL\",
    \"UPDATE lab_tests SET is_active = TRUE WHERE is_active IS NULL\",
    \"UPDATE imaging_catalog SET is_active = TRUE WHERE is_active IS NULL\",
    \"INSERT INTO form_templates (name, category, description, schema, estimated_minutes, is_global) SELECT 'Pain Assessment', 'Clinical', 'Assess pain severity, location, and character', '[{\\\"id\\\":\\\"pain_score\\\",\\\"type\\\":\\\"scale\\\",\\\"label\\\":\\\"Pain Score (0 = no pain, 10 = worst)\\\",\\\"min\\\":0,\\\"max\\\":10,\\\"required\\\":true},{\\\"id\\\":\\\"location\\\",\\\"type\\\":\\\"select\\\",\\\"label\\\":\\\"Location\\\",\\\"options\\\":[\\\"Head\\\",\\\"Chest\\\",\\\"Abdomen\\\",\\\"Back\\\",\\\"Leg\\\",\\\"Arm\\\",\\\"Neck\\\",\\\"Other\\\"]},{\\\"id\\\":\\\"character\\\",\\\"type\\\":\\\"radio\\\",\\\"label\\\":\\\"Character\\\",\\\"options\\\":[\\\"Sharp\\\",\\\"Dull\\\",\\\"Burning\\\",\\\"Throbbing\\\",\\\"Aching\\\",\\\"Stabbing\\\"]},{\\\"id\\\":\\\"onset\\\",\\\"type\\\":\\\"radio\\\",\\\"label\\\":\\\"Onset\\\",\\\"options\\\":[\\\"Sudden\\\",\\\"Gradual\\\",\\\"Intermittent\\\"]},{\\\"id\\\":\\\"duration\\\",\\\"type\\\":\\\"select\\\",\\\"label\\\":\\\"Duration\\\",\\\"options\\\":[\\\"< 1 hour\\\",\\\"1-6 hours\\\",\\\"6-24 hours\\\",\\\"1-3 days\\\",\\\"4-7 days\\\",\\\"> 1 week\\\"]},{\\\"id\\\":\\\"notes\\\",\\\"type\\\":\\\"textarea\\\",\\\"label\\\":\\\"Additional Notes\\\",\\\"placeholder\\\":\\\"Any other details about the pain...\\\"}]', 2, TRUE WHERE NOT EXISTS (SELECT 1 FROM form_templates WHERE name = 'Pain Assessment' AND is_global = TRUE)\",

    \"INSERT INTO form_templates (name, category, description, schema, estimated_minutes, is_global) SELECT 'Chief Complaint & Triage', 'Triage', 'Record presenting complaint and assign triage priority', '[{\\\"id\\\":\\\"chief_complaint\\\",\\\"type\\\":\\\"textarea\\\",\\\"label\\\":\\\"Chief Complaint\\\",\\\"placeholder\\\":\\\"Describe the main reason for this visit...\\\",\\\"required\\\":true},{\\\"id\\\":\\\"triage_level\\\",\\\"type\\\":\\\"radio\\\",\\\"label\\\":\\\"Triage Level\\\",\\\"options\\\":[\\\"Green - Normal\\\",\\\"Yellow - Moderate\\\",\\\"Red - Urgent\\\"],\\\"required\\\":true},{\\\"id\\\":\\\"onset\\\",\\\"type\\\":\\\"select\\\",\\\"label\\\":\\\"Symptom Onset\\\",\\\"options\\\":[\\\"< 1 hour\\\",\\\"1-6 hours\\\",\\\"6-24 hours\\\",\\\"1-3 days\\\",\\\"4-7 days\\\",\\\"> 1 week\\\"]},{\\\"id\\\":\\\"referred_by\\\",\\\"type\\\":\\\"select\\\",\\\"label\\\":\\\"Referred By\\\",\\\"options\\\":[\\\"Self\\\",\\\"Family / Friend\\\",\\\"GP Referral\\\",\\\"Specialist Referral\\\",\\\"Emergency Services\\\",\\\"Other\\\"]},{\\\"id\\\":\\\"allergies\\\",\\\"type\\\":\\\"text\\\",\\\"label\\\":\\\"Known Allergies\\\",\\\"placeholder\\\":\\\"NKDA or list allergies...\\\"}]', 1, TRUE WHERE NOT EXISTS (SELECT 1 FROM form_templates WHERE name = 'Chief Complaint & Triage' AND is_global = TRUE)\",
    \"INSERT INTO form_templates (name, category, description, schema, estimated_minutes, is_global) SELECT 'Falls Risk - Morse Scale', 'Safety', 'Morse Falls Scale to assess patient fall risk', '[{\\\"type\\\":\\\"section_header\\\",\\\"label\\\":\\\"Morse Falls Scale\\\"},{\\\"id\\\":\\\"fall_history\\\",\\\"type\\\":\\\"radio\\\",\\\"label\\\":\\\"History of falling in past 3 months\\\",\\\"options\\\":[\\\"No (0 pts)\\\",\\\"Yes (25 pts)\\\"],\\\"required\\\":true},{\\\"id\\\":\\\"secondary_diagnosis\\\",\\\"type\\\":\\\"radio\\\",\\\"label\\\":\\\"Secondary diagnosis present\\\",\\\"options\\\":[\\\"No (0 pts)\\\",\\\"Yes (15 pts)\\\"],\\\"required\\\":true},{\\\"id\\\":\\\"ambulatory_aid\\\",\\\"type\\\":\\\"radio\\\",\\\"label\\\":\\\"Ambulatory aid used\\\",\\\"options\\\":[\\\"None / Bedrest / Nurse assist (0 pts)\\\",\\\"Crutches / Cane / Walker (15 pts)\\\",\\\"Holds furniture (30 pts)\\\"],\\\"required\\\":true},{\\\"id\\\":\\\"iv_access\\\",\\\"type\\\":\\\"radio\\\",\\\"label\\\":\\\"IV access / Heparin lock\\\",\\\"options\\\":[\\\"No (0 pts)\\\",\\\"Yes (20 pts)\\\"],\\\"required\\\":true},{\\\"id\\\":\\\"gait\\\",\\\"type\\\":\\\"radio\\\",\\\"label\\\":\\\"Gait / Transferring\\\",\\\"options\\\":[\\\"Normal / Bedrest / Immobile (0 pts)\\\",\\\"Weak (10 pts)\\\",\\\"Impaired (20 pts)\\\"],\\\"required\\\":true},{\\\"id\\\":\\\"mental_status\\\",\\\"type\\\":\\\"radio\\\",\\\"label\\\":\\\"Mental status\\\",\\\"options\\\":[\\\"Oriented to own ability (0 pts)\\\",\\\"Overestimates or forgets limitations (15 pts)\\\"],\\\"required\\\":true},{\\\"id\\\":\\\"risk_notes\\\",\\\"type\\\":\\\"textarea\\\",\\\"label\\\":\\\"Risk Mitigation Notes\\\",\\\"placeholder\\\":\\\"Describe fall prevention measures in place...\\\"}]', 3, TRUE WHERE NOT EXISTS (SELECT 1 FROM form_templates WHERE name = 'Falls Risk - Morse Scale' AND is_global = TRUE)\",
    \"INSERT INTO form_templates (name, category, description, schema, estimated_minutes, is_global) SELECT 'General Nurse Notes', 'Nursing', 'General nursing assessment and notes', '[{\\\"type\\\":\\\"section_header\\\",\\\"label\\\":\\\"Nursing Assessment\\\"},{\\\"id\\\":\\\"presenting_complaint\\\",\\\"type\\\":\\\"textarea\\\",\\\"label\\\":\\\"Presenting Complaint\\\",\\\"placeholder\\\":\\\"Describe the patient complaint in detail...\\\",\\\"rows\\\":3},{\\\"id\\\":\\\"relevant_history\\\",\\\"type\\\":\\\"textarea\\\",\\\"label\\\":\\\"Relevant Medical History\\\",\\\"placeholder\\\":\\\"Past medical/surgical history relevant to this visit...\\\",\\\"rows\\\":2},{\\\"id\\\":\\\"current_medications\\\",\\\"type\\\":\\\"textarea\\\",\\\"label\\\":\\\"Current Medications\\\",\\\"placeholder\\\":\\\"List all current medications with dosage...\\\",\\\"rows\\\":2},{\\\"id\\\":\\\"allergies\\\",\\\"type\\\":\\\"text\\\",\\\"label\\\":\\\"Allergies\\\",\\\"placeholder\\\":\\\"NKDA or list drug/food allergies...\\\"},{\\\"id\\\":\\\"special_needs\\\",\\\"type\\\":\\\"text\\\",\\\"label\\\":\\\"Special Needs / Assistance\\\",\\\"placeholder\\\":\\\"Wheelchair, interpreter, other needs...\\\"},{\\\"id\\\":\\\"nurse_notes\\\",\\\"type\\\":\\\"textarea\\\",\\\"label\\\":\\\"Nurse Observations\\\",\\\"placeholder\\\":\\\"Any additional observations...\\\",\\\"rows\\\":3}]', 3, TRUE WHERE NOT EXISTS (SELECT 1 FROM form_templates WHERE name = 'General Nurse Notes' AND is_global = TRUE)\",

    \"\"\"CREATE TABLE IF NOT EXISTS barcode_master (
        id SERIAL PRIMARY KEY,
        barcode VARCHAR(100) NOT NULL UNIQUE,
        medicine_id INTEGER REFERENCES medicines(id) ON DELETE SET NULL,
        drug_name VARCHAR(200) NOT NULL,
        generic_name VARCHAR(200),
        manufacturer VARCHAR(200),
        form VARCHAR(50),
        strength VARCHAR(50),
        pack_size VARCHAR(50),
        mrp NUMERIC(10,2),
        hsn_code VARCHAR(20),
        gst_rate NUMERIC(5,2),
        scan_count INTEGER DEFAULT 1,
        added_by INTEGER REFERENCES staff(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    )\"\"\",
    \"CREATE INDEX IF NOT EXISTS idx_barcode_master_barcode ON barcode_master(barcode)\",
    \"ALTER TABLE drugs ADD COLUMN IF NOT EXISTS primary_brand VARCHAR(100)\",

    # ── tables present in models.py but previously missing from start.sh ──
    \"CREATE TABLE IF NOT EXISTS clinic_patient_tags (id SERIAL PRIMARY KEY, clinic_id INTEGER NOT NULL REFERENCES clinics(id), tag_name VARCHAR(100) NOT NULL, icd10_code VARCHAR(20), specialty VARCHAR(100), usage_count INTEGER DEFAULT 0, created_by INTEGER REFERENCES staff(id), created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS patient_tags (id SERIAL PRIMARY KEY, patient_id INTEGER NOT NULL REFERENCES patients(id), clinic_id INTEGER NOT NULL REFERENCES clinics(id), tag_name VARCHAR(100) NOT NULL, icd10_code VARCHAR(20), saved_tag_id INTEGER REFERENCES clinic_patient_tags(id), assigned_by INTEGER REFERENCES staff(id), assigned_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS encounter_access_logs (id SERIAL PRIMARY KEY, patient_id INTEGER NOT NULL REFERENCES patients(id), accessed_by INTEGER NOT NULL REFERENCES staff(id), accessing_clinic_id INTEGER NOT NULL REFERENCES clinics(id), session_expires_at TIMESTAMP, accessed_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS doctor_ratings (id SERIAL PRIMARY KEY, doctor_id INTEGER NOT NULL REFERENCES doctor_profiles(id), patient_id INTEGER NOT NULL REFERENCES patients(id), appointment_id INTEGER REFERENCES appointments(id), rating INTEGER NOT NULL, review TEXT, is_visible BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS subscription_payments (id SERIAL PRIMARY KEY, clinic_id INTEGER NOT NULL REFERENCES clinics(id), amount NUMERIC(12,2) NOT NULL, method VARCHAR(20) NOT NULL DEFAULT 'cash', reference VARCHAR(200), notes TEXT, period_from DATE, period_to DATE, recorded_by INTEGER, created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS visitor_policies (id SERIAL PRIMARY KEY, clinic_id INTEGER NOT NULL REFERENCES clinics(id), ward_id INTEGER REFERENCES wards(id), visit_start VARCHAR(5) DEFAULT '10:00', visit_end VARCHAR(5) DEFAULT '20:00', max_active INTEGER DEFAULT 5, max_persons INTEGER DEFAULT 2, attender_allowed BOOLEAN DEFAULT TRUE, lockdown BOOLEAN DEFAULT FALSE, updated_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS visitor_passes (id SERIAL PRIMARY KEY, clinic_id INTEGER NOT NULL REFERENCES clinics(id), pass_code VARCHAR(12) UNIQUE NOT NULL, pass_type VARCHAR(10) DEFAULT 'visit', admission_id INTEGER NOT NULL REFERENCES admissions(id), patient_id INTEGER NOT NULL REFERENCES patients(id), visitor_name VARCHAR(200) NOT NULL, relation VARCHAR(50), visitor_mobile VARCHAR(20), id_proof_type VARCHAR(50), id_proof_number VARCHAR(100), persons INTEGER DEFAULT 1, valid_from TIMESTAMP NOT NULL, valid_until TIMESTAMP NOT NULL, status VARCHAR(20) DEFAULT 'active', checked_in_at TIMESTAMP, checked_out_at TIMESTAMP, revoked_by INTEGER REFERENCES staff(id), created_by INTEGER REFERENCES staff(id), created_at TIMESTAMP DEFAULT NOW())\",

    # ── platform_settings (key-value config, queried by _get_rate_card on every clinic endpoint) ──
    \"CREATE TABLE IF NOT EXISTS platform_settings (key VARCHAR(100) PRIMARY KEY, value JSONB NOT NULL DEFAULT '{}', updated_at TIMESTAMP DEFAULT NOW(), updated_by INTEGER REFERENCES platform_admins(id))\",

    # ── assessment_forms family (PowerForms / CareChart assessments) ──
    \"\"\"CREATE TABLE IF NOT EXISTS assessment_forms (
        id SERIAL PRIMARY KEY,
        title VARCHAR(300) NOT NULL,
        description TEXT,
        category VARCHAR(100) DEFAULT 'general',
        subcategory VARCHAR(100),
        icon VARCHAR(100),
        schema JSONB DEFAULT '{}',
        scoring_config JSONB,
        iview_config JSONB,
        alert_rules JSONB,
        translations JSONB,
        status VARCHAR(20) DEFAULT 'draft',
        version INTEGER DEFAULT 1,
        is_template BOOLEAN DEFAULT FALSE,
        is_iview_enabled BOOLEAN DEFAULT FALSE,
        requires_cosign BOOLEAN DEFAULT FALSE,
        time_limit_minutes INTEGER,
        created_by INTEGER REFERENCES staff(id),
        created_by_admin INTEGER,
        clinic_id INTEGER REFERENCES clinics(id),
        parent_form_id INTEGER,
        published_at TIMESTAMP,
        retired_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    )\"\"\",
    \"CREATE INDEX IF NOT EXISTS idx_assessment_forms_category ON assessment_forms(category)\",
    \"CREATE INDEX IF NOT EXISTS idx_assessment_forms_status ON assessment_forms(status)\",

    \"\"\"CREATE TABLE IF NOT EXISTS assessment_form_versions (
        id SERIAL PRIMARY KEY,
        form_id INTEGER NOT NULL REFERENCES assessment_forms(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        schema JSONB DEFAULT '{}',
        scoring_config JSONB,
        published_by INTEGER,
        published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
    )\"\"\",
    \"CREATE INDEX IF NOT EXISTS idx_afv_form_id ON assessment_form_versions(form_id)\",

    \"\"\"CREATE TABLE IF NOT EXISTS form_pool (
        id SERIAL PRIMARY KEY,
        form_id INTEGER NOT NULL REFERENCES assessment_forms(id) ON DELETE CASCADE,
        clinic_id INTEGER REFERENCES clinics(id),
        assigned_by INTEGER,
        assigned_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE
    )\"\"\",
    \"CREATE INDEX IF NOT EXISTS idx_form_pool_form_id ON form_pool(form_id)\",
    \"CREATE INDEX IF NOT EXISTS idx_form_pool_clinic_id ON form_pool(clinic_id)\",

    \"\"\"CREATE TABLE IF NOT EXISTS form_assignments (
        id SERIAL PRIMARY KEY,
        form_id INTEGER NOT NULL REFERENCES assessment_forms(id) ON DELETE CASCADE,
        form_version INTEGER DEFAULT 1,
        clinic_id INTEGER NOT NULL REFERENCES clinics(id),
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
        admission_id INTEGER,
        assigned_by INTEGER NOT NULL,
        assigned_to_role VARCHAR(50),
        due_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'pending',
        priority VARCHAR(20) DEFAULT 'routine',
        notes TEXT,
        assigned_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
    )\"\"\",
    \"CREATE INDEX IF NOT EXISTS idx_form_assignments_form_id ON form_assignments(form_id)\",
    \"CREATE INDEX IF NOT EXISTS idx_form_assignments_clinic_id ON form_assignments(clinic_id)\",
    \"CREATE INDEX IF NOT EXISTS idx_form_assignments_patient_id ON form_assignments(patient_id)\",
    \"CREATE INDEX IF NOT EXISTS idx_form_assignments_status ON form_assignments(status)\",

    \"\"\"CREATE TABLE IF NOT EXISTS form_submissions (
        id SERIAL PRIMARY KEY,
        form_id INTEGER NOT NULL REFERENCES assessment_forms(id) ON DELETE CASCADE,
        form_version INTEGER DEFAULT 1,
        assignment_id INTEGER REFERENCES form_assignments(id) ON DELETE SET NULL,
        clinic_id INTEGER NOT NULL REFERENCES clinics(id),
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
        admission_id INTEGER,
        submitted_by INTEGER NOT NULL,
        cosigned_by INTEGER,
        cosigned_at TIMESTAMP,
        data JSONB DEFAULT '{}',
        scores JSONB,
        alerts_fired JSONB DEFAULT '[]',
        is_draft BOOLEAN DEFAULT FALSE,
        submitted_at TIMESTAMP,
        charted_at TIMESTAMP,
        source VARCHAR(30) DEFAULT 'provider',
        created_at TIMESTAMP DEFAULT NOW()
    )\"\"\",
    \"CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id)\",
    \"CREATE INDEX IF NOT EXISTS idx_form_submissions_clinic_id ON form_submissions(clinic_id)\",
    \"CREATE INDEX IF NOT EXISTS idx_form_submissions_patient_id ON form_submissions(patient_id)\",

    \"\"\"CREATE TABLE IF NOT EXISTS form_alerts (
        id SERIAL PRIMARY KEY,
        submission_id INTEGER NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
        clinic_id INTEGER NOT NULL REFERENCES clinics(id),
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        field_id VARCHAR(100),
        field_label VARCHAR(200),
        value VARCHAR(200),
        severity VARCHAR(20) DEFAULT 'warning',
        message TEXT,
        notified_staff JSONB DEFAULT '[]',
        acknowledged_by INTEGER,
        acknowledged_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
    )\"\"\",
    \"CREATE INDEX IF NOT EXISTS idx_form_alerts_submission_id ON form_alerts(submission_id)\",
    \"CREATE INDEX IF NOT EXISTS idx_form_alerts_clinic_id ON form_alerts(clinic_id)\",
    \"CREATE INDEX IF NOT EXISTS idx_form_alerts_patient_id ON form_alerts(patient_id)\",

    \"\"\"CREATE TABLE IF NOT EXISTS form_cosigns (
        id SERIAL PRIMARY KEY,
        submission_id INTEGER NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
        requested_by INTEGER NOT NULL,
        requested_from INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        note TEXT,
        responded_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
    )\"\"\",
    \"CREATE INDEX IF NOT EXISTS idx_form_cosigns_submission_id ON form_cosigns(submission_id)\",

    \"\"\"CREATE TABLE IF NOT EXISTS iview_flowsheets (
        id SERIAL PRIMARY KEY,
        form_id INTEGER NOT NULL UNIQUE REFERENCES assessment_forms(id) ON DELETE CASCADE,
        time_band VARCHAR(10) DEFAULT '4h',
        row_config JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    )\"\"\",
    \"CREATE INDEX IF NOT EXISTS idx_iview_flowsheets_form_id ON iview_flowsheets(form_id)\",
    \"CREATE TABLE IF NOT EXISTS stock_adjustments (id SERIAL PRIMARY KEY, clinic_id INTEGER NOT NULL REFERENCES clinics(id), branch_id INTEGER REFERENCES branches(id), medicine_id INTEGER NOT NULL REFERENCES medicines(id), batch_id INTEGER REFERENCES medicine_batches(id), adjustment_type VARCHAR(30) NOT NULL, quantity_before INTEGER NOT NULL, quantity_change INTEGER NOT NULL, quantity_after INTEGER NOT NULL, reason VARCHAR(100) NOT NULL, notes TEXT, performed_by INTEGER REFERENCES staff(id), created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS cash_reconciliations (id SERIAL PRIMARY KEY, clinic_id INTEGER NOT NULL REFERENCES clinics(id), branch_id INTEGER REFERENCES branches(id), shift_date DATE NOT NULL, shift VARCHAR(20) DEFAULT 'day', opening_cash NUMERIC(10,2) DEFAULT 0, expected_cash NUMERIC(10,2) DEFAULT 0, actual_cash NUMERIC(10,2) DEFAULT 0, cash_sales NUMERIC(10,2) DEFAULT 0, card_sales NUMERIC(10,2) DEFAULT 0, upi_sales NUMERIC(10,2) DEFAULT 0, credit_sales NUMERIC(10,2) DEFAULT 0, total_returns NUMERIC(10,2) DEFAULT 0, difference NUMERIC(10,2) DEFAULT 0, status VARCHAR(20) DEFAULT 'open', notes TEXT, closed_by INTEGER REFERENCES staff(id), closed_at TIMESTAMP WITHOUT TIME ZONE, created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS supplier_payments (id SERIAL PRIMARY KEY, clinic_id INTEGER NOT NULL REFERENCES clinics(id), supplier_id INTEGER NOT NULL REFERENCES suppliers(id), purchase_order_id INTEGER REFERENCES purchase_orders(id), amount NUMERIC(10,2) NOT NULL, payment_date DATE NOT NULL, payment_mode VARCHAR(30), reference_number VARCHAR(100), notes TEXT, created_by INTEGER REFERENCES staff(id), created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS discount_schemes (id SERIAL PRIMARY KEY, clinic_id INTEGER NOT NULL REFERENCES clinics(id), name VARCHAR(100) NOT NULL, scheme_type VARCHAR(30) DEFAULT 'percentage', discount_value NUMERIC(5,2) NOT NULL, applies_to VARCHAR(20) DEFAULT 'all', is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS credit_accounts (id SERIAL PRIMARY KEY, clinic_id INTEGER NOT NULL REFERENCES clinics(id), customer_name VARCHAR(200) NOT NULL, customer_mobile VARCHAR(20), credit_limit NUMERIC(10,2) DEFAULT 5000, outstanding_balance NUMERIC(10,2) DEFAULT 0, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS credit_transactions (id SERIAL PRIMARY KEY, clinic_id INTEGER NOT NULL REFERENCES clinics(id), credit_account_id INTEGER NOT NULL REFERENCES credit_accounts(id), invoice_id INTEGER REFERENCES invoices(id), transaction_type VARCHAR(20) NOT NULL, amount NUMERIC(10,2) NOT NULL, balance_after NUMERIC(10,2) NOT NULL, notes TEXT, created_by INTEGER REFERENCES staff(id), created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS supplier_returns (id SERIAL PRIMARY KEY, clinic_id INTEGER NOT NULL REFERENCES clinics(id), supplier_id INTEGER NOT NULL REFERENCES suppliers(id), purchase_order_id INTEGER REFERENCES purchase_orders(id), return_date DATE NOT NULL, reason VARCHAR(100) NOT NULL, status VARCHAR(20) DEFAULT 'pending', notes TEXT, created_by INTEGER REFERENCES staff(id), created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS supplier_return_items (id SERIAL PRIMARY KEY, return_id INTEGER NOT NULL REFERENCES supplier_returns(id), medicine_id INTEGER NOT NULL REFERENCES medicines(id), batch_number VARCHAR(50), quantity INTEGER NOT NULL, unit_cost NUMERIC(10,2), total_value NUMERIC(10,2))\",

    # ── relax NOT NULL on wards.department_id — wards can exist without a department ──
    \"ALTER TABLE wards ALTER COLUMN department_id DROP NOT NULL\",
    # ── invoice: IP/OP tracking ──
    \"ALTER TABLE invoices ADD COLUMN IF NOT EXISTS admission_id INTEGER REFERENCES admissions(id)\",
    \"ALTER TABLE invoices ADD COLUMN IF NOT EXISTS encounter_type VARCHAR(2) DEFAULT 'OP'\",
    # ── pharmacy shared cart ──
    \"\"\"CREATE TABLE IF NOT EXISTS pharmacy_cart_items (
        id SERIAL PRIMARY KEY,
        clinic_id INTEGER NOT NULL REFERENCES clinics(id),
        branch_id INTEGER REFERENCES branches(id),
        source_type VARCHAR(20) NOT NULL,
        source_id INTEGER NOT NULL,
        patient_id INTEGER REFERENCES patients(id),
        admission_id INTEGER REFERENCES admissions(id),
        encounter_type VARCHAR(2) DEFAULT 'OP',
        medicine_name VARCHAR(200) NOT NULL,
        generic_name VARCHAR(200),
        dose VARCHAR(100),
        route VARCHAR(50),
        frequency VARCHAR(100),
        duration VARCHAR(100),
        quantity INTEGER DEFAULT 1,
        instructions TEXT,
        is_stat BOOLEAN DEFAULT FALSE,
        medicine_id INTEGER REFERENCES medicines(id),
        added_by INTEGER REFERENCES staff(id),
        added_at TIMESTAMP DEFAULT NOW()
    )\"\"\",
    \"CREATE TABLE IF NOT EXISTS stock_adjustments (id SERIAL PRIMARY KEY, clinic_id INTEGER NOT NULL REFERENCES clinics(id), branch_id INTEGER REFERENCES branches(id), medicine_id INTEGER NOT NULL REFERENCES medicines(id), batch_id INTEGER REFERENCES medicine_batches(id), adjustment_type VARCHAR(30) NOT NULL, quantity_before INTEGER NOT NULL, quantity_change INTEGER NOT NULL, quantity_after INTEGER NOT NULL, reason VARCHAR(100) NOT NULL, notes TEXT, performed_by INTEGER REFERENCES staff(id), created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS cash_reconciliations (id SERIAL PRIMARY KEY, clinic_id INTEGER NOT NULL REFERENCES clinics(id), branch_id INTEGER REFERENCES branches(id), shift_date DATE NOT NULL, shift VARCHAR(20) DEFAULT 'day', opening_cash NUMERIC(10,2) DEFAULT 0, expected_cash NUMERIC(10,2) DEFAULT 0, actual_cash NUMERIC(10,2) DEFAULT 0, cash_sales NUMERIC(10,2) DEFAULT 0, card_sales NUMERIC(10,2) DEFAULT 0, upi_sales NUMERIC(10,2) DEFAULT 0, credit_sales NUMERIC(10,2) DEFAULT 0, total_returns NUMERIC(10,2) DEFAULT 0, difference NUMERIC(10,2) DEFAULT 0, status VARCHAR(20) DEFAULT 'open', notes TEXT, closed_by INTEGER REFERENCES staff(id), closed_at TIMESTAMP WITHOUT TIME ZONE, created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS supplier_payments (id SERIAL PRIMARY KEY, clinic_id INTEGER NOT NULL REFERENCES clinics(id), supplier_id INTEGER NOT NULL REFERENCES suppliers(id), purchase_order_id INTEGER REFERENCES purchase_orders(id), amount NUMERIC(10,2) NOT NULL, payment_date DATE NOT NULL, payment_mode VARCHAR(30), reference_number VARCHAR(100), notes TEXT, created_by INTEGER REFERENCES staff(id), created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS discount_schemes (id SERIAL PRIMARY KEY, clinic_id INTEGER NOT NULL REFERENCES clinics(id), name VARCHAR(100) NOT NULL, scheme_type VARCHAR(30) DEFAULT 'percentage', discount_value NUMERIC(5,2) NOT NULL, applies_to VARCHAR(20) DEFAULT 'all', is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS credit_accounts (id SERIAL PRIMARY KEY, clinic_id INTEGER NOT NULL REFERENCES clinics(id), customer_name VARCHAR(200) NOT NULL, customer_mobile VARCHAR(20), credit_limit NUMERIC(10,2) DEFAULT 5000, outstanding_balance NUMERIC(10,2) DEFAULT 0, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS credit_transactions (id SERIAL PRIMARY KEY, clinic_id INTEGER NOT NULL REFERENCES clinics(id), credit_account_id INTEGER NOT NULL REFERENCES credit_accounts(id), invoice_id INTEGER REFERENCES invoices(id), transaction_type VARCHAR(20) NOT NULL, amount NUMERIC(10,2) NOT NULL, balance_after NUMERIC(10,2) NOT NULL, notes TEXT, created_by INTEGER REFERENCES staff(id), created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS supplier_returns (id SERIAL PRIMARY KEY, clinic_id INTEGER NOT NULL REFERENCES clinics(id), supplier_id INTEGER NOT NULL REFERENCES suppliers(id), purchase_order_id INTEGER REFERENCES purchase_orders(id), return_date DATE NOT NULL, reason VARCHAR(100) NOT NULL, status VARCHAR(20) DEFAULT 'pending', notes TEXT, created_by INTEGER REFERENCES staff(id), created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS supplier_return_items (id SERIAL PRIMARY KEY, return_id INTEGER NOT NULL REFERENCES supplier_returns(id), medicine_id INTEGER NOT NULL REFERENCES medicines(id), batch_number VARCHAR(50), quantity INTEGER NOT NULL, unit_cost NUMERIC(10,2), total_value NUMERIC(10,2))\",
]
ok = 0
failed = 0
for sql in safe_cols:
    try:
        with engine.begin() as conn:
            conn.execute(text(sql))
        ok += 1
    except Exception as e:
        failed += 1
        print(f'[startup] WARN skipped: {str(e)[:120]}')
print(f'[startup] Safe column additions: {ok} ok, {failed} skipped.')

# Auto-verify all active clinics so they appear on the public portal
try:
    with engine.begin() as conn:
        conn.execute(text(\"UPDATE clinics SET is_verified = TRUE WHERE is_active = TRUE AND is_verified = FALSE\"))
    print('[startup] Auto-verified active clinics.')
except Exception as e:
    print(f'[startup] Clinic verify migration warning: {e}')

# Migrate existing patient_name to first_name/last_name
try:
    _sql = (
        \"UPDATE online_bookings \"
        \"SET first_name = SPLIT_PART(patient_name, ' ', 1), \"
        \"last_name = TRIM(SUBSTRING(patient_name FROM POSITION(' ' IN patient_name) + 1)) \"
        \"WHERE (first_name IS NULL OR first_name = '') \"
        \"AND patient_name IS NOT NULL AND patient_name != ''\"
    )
    with engine.begin() as conn:
        conn.execute(text(_sql))
    print('Migrated patient_name to first_name/last_name')
except Exception as e:
    print(f'Migration warning (non-fatal): {e}')

for _sql in [
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7)\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7)\",
    \"ALTER TABLE clinics ADD COLUMN IF NOT EXISTS capacity_description TEXT\",
    \"CREATE TABLE IF NOT EXISTS specialties (id SERIAL PRIMARY KEY, name VARCHAR(200) NOT NULL UNIQUE, category VARCHAR(100), is_active BOOLEAN DEFAULT TRUE, sort_order INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW())\",
    \"CREATE TABLE IF NOT EXISTS doctor_specialties (id SERIAL PRIMARY KEY, doctor_profile_id INTEGER NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE, specialty_name VARCHAR(200) NOT NULL, is_primary BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT NOW(), UNIQUE(doctor_profile_id, specialty_name))\",
    \"CREATE INDEX IF NOT EXISTS idx_doctor_specialties_doctor ON doctor_specialties(doctor_profile_id)\",
]:
    try:
        with engine.begin() as conn:
            conn.execute(text(_sql))
    except Exception as e:
        print(f'Schema addition warning (non-fatal): {e}')

# Seed Indian medical specialties
try:
    from sqlalchemy import text as _text
    _specialties = [
        ('General Medicine', 'Outpatient', 1), ('Family Medicine', 'Outpatient', 2),
        ('Internal Medicine', 'Outpatient', 3), ('Emergency Medicine', 'Outpatient', 4),
        ('Cardiology', 'Specialty', 10), ('Interventional Cardiology', 'Specialty', 11),
        ('Cardiac Surgery', 'Surgery', 12), ('Dermatology', 'Specialty', 20),
        ('Dermatology & Cosmetology', 'Specialty', 21), ('Paediatrics', 'Specialty', 30),
        ('Neonatology', 'Specialty', 31), ('Paediatric Surgery', 'Surgery', 32),
        ('Orthopaedics', 'Specialty', 40), ('Orthopaedic Surgery', 'Surgery', 41),
        ('Spine Surgery', 'Surgery', 42), ('Gynaecology & Obstetrics', 'Specialty', 50),
        ('Reproductive Medicine', 'Specialty', 51), ('Maternal-Fetal Medicine', 'Specialty', 52),
        ('Neurology', 'Specialty', 60), ('Neurosurgery', 'Surgery', 61),
        ('Neuroradiology', 'Radiology', 62), ('Ophthalmology', 'Specialty', 70),
        ('Vitreoretinal Surgery', 'Surgery', 71), ('ENT (Ear, Nose & Throat)', 'Specialty', 80),
        ('Head & Neck Surgery', 'Surgery', 81), ('Psychiatry & Mental Health', 'Specialty', 90),
        ('Clinical Psychology', 'Allied', 91), ('Dentistry', 'Specialty', 100),
        ('Orthodontics', 'Specialty', 101), ('Periodontics', 'Specialty', 102),
        ('Endodontics', 'Specialty', 103), ('Oral & Maxillofacial Surgery', 'Surgery', 104),
        ('Urology', 'Specialty', 110), ('Andrology', 'Specialty', 111),
        ('Nephrology', 'Specialty', 120), ('Transplant Surgery', 'Surgery', 121),
        ('Gastroenterology', 'Specialty', 130), ('Hepatology', 'Specialty', 131),
        ('GI Surgery', 'Surgery', 132), ('Laparoscopic Surgery', 'Surgery', 133),
        ('Endocrinology & Diabetology', 'Specialty', 140), ('Thyroid Surgery', 'Surgery', 141),
        ('Pulmonology', 'Specialty', 150), ('Thoracic Surgery', 'Surgery', 151),
        ('Oncology', 'Specialty', 160), ('Surgical Oncology', 'Surgery', 161),
        ('Radiation Oncology', 'Specialty', 162), ('Haematology', 'Specialty', 163),
        ('Haematological Oncology', 'Specialty', 164), ('Rheumatology', 'Specialty', 170),
        ('General Surgery', 'Surgery', 180), ('Vascular Surgery', 'Surgery', 181),
        ('Plastic & Reconstructive Surgery', 'Surgery', 182), ('Burns & Plastic Surgery', 'Surgery', 183),
        ('Anaesthesiology', 'Specialty', 190), ('Pain Medicine', 'Specialty', 191),
        ('Critical Care Medicine', 'Specialty', 200), ('Intensive Care', 'Specialty', 201),
        ('Radiology & Imaging', 'Radiology', 210), ('Interventional Radiology', 'Radiology', 211),
        ('Pathology & Lab Medicine', 'Diagnostic', 220), ('Microbiology', 'Diagnostic', 221),
        ('Biochemistry', 'Diagnostic', 222), ('Immunology', 'Diagnostic', 223),
        ('Nuclear Medicine', 'Diagnostic', 224), ('Physiotherapy & Rehabilitation', 'Allied', 230),
        ('Occupational Therapy', 'Allied', 231), ('Speech Therapy', 'Allied', 232),
        ('Sports Medicine', 'Allied', 233), ('Nutrition & Dietetics', 'Allied', 234),
        ('Ayurveda', 'AYUSH', 240), ('Panchakarma', 'AYUSH', 241),
        ('Homeopathy', 'AYUSH', 250), ('Naturopathy & Yoga', 'AYUSH', 251),
        ('Unani', 'AYUSH', 260), ('Siddha', 'AYUSH', 261),
        ('Geriatric Medicine', 'Specialty', 270), ('Palliative Care', 'Specialty', 271),
        ('Infectious Disease', 'Specialty', 280), ('Travel Medicine', 'Specialty', 281),
        ('Community Medicine', 'Public Health', 290), ('Public Health', 'Public Health', 291),
        ('Forensic Medicine', 'Other', 300), ('Aviation Medicine', 'Other', 301),
        ('Hyperbaric Medicine', 'Other', 302),
    ]
    with engine.begin() as conn:
        for name, category, sort_order in _specialties:
            conn.execute(_text(
                \"INSERT INTO specialties (name, category, sort_order) VALUES (:n, :c, :s) ON CONFLICT (name) DO NOTHING\"
            ), {'n': name, 'c': category, 's': sort_order})
    print('[startup] Specialties seeded.')
except Exception as e:
    print(f'[startup] Specialties seed warning (non-fatal): {e}')

indexes = [
    \"CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date ON appointments(clinic_id, booking_date)\",
    \"CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(clinic_id, status)\",
    \"CREATE INDEX IF NOT EXISTS idx_staff_clinic ON staff(clinic_id)\",
    \"CREATE INDEX IF NOT EXISTS idx_patients_clinic ON patients(clinic_id)\",
    \"CREATE INDEX IF NOT EXISTS idx_invoices_clinic ON invoices(clinic_id)\",
    \"CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(clinic_id, created_at)\",
    \"CREATE INDEX IF NOT EXISTS idx_admissions_clinic_status ON admissions(clinic_id, status)\",
    \"CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON audit_logs(admin_id)\",
    \"CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_logs(created_at)\",
    \"CREATE INDEX IF NOT EXISTS idx_medicines_clinic ON medicines(clinic_id)\",
    \"CREATE INDEX IF NOT EXISTS idx_lab_orders_clinic ON lab_orders(clinic_id)\",
    \"CREATE INDEX IF NOT EXISTS idx_imaging_orders_clinic ON imaging_orders(clinic_id)\",
    \"CREATE INDEX IF NOT EXISTS idx_internal_messages_room ON internal_messages(room_id, created_at)\",
    \"CREATE INDEX IF NOT EXISTS idx_chat_room_members_staff ON chat_room_members(staff_id)\",
    \"CREATE INDEX IF NOT EXISTS idx_password_reset_requests_clinic ON password_reset_requests(clinic_id, status)\",
]
try:
    with engine.begin() as conn:
        for sql in indexes:
            conn.execute(text(sql))
    print('[startup] Indexes created/verified.')
except Exception as e:
    print(f'[startup] Index creation failed: {e}')
" || echo "[bg-migrations] Column migrations failed — continuing"

echo "[bg-migrations] Loading medical terminology library (idempotent)..."
timeout 120 python -m app.seed_medical_library || echo "[bg-migrations] Medical library load failed (non-fatal)"
echo "[bg-migrations] Done."
) &

echo "[startup] Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 1
