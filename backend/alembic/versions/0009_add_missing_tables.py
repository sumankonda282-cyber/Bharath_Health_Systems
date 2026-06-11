"""Add all tables that exist in models but have no prior migration

Revision ID: 0009_add_missing_tables
Revises: 0008_merge_heads
Create Date: 2026-06-11
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0009_add_missing_tables'
down_revision = '0008_merge_heads'
branch_labels = None
depends_on = None


def _table_exists(name: str) -> bool:
    conn = op.get_bind()
    return conn.dialect.has_table(conn, name)


def upgrade():
    # Each block is guarded so re-running is safe

    if not _table_exists('audit_logs'):
        op.create_table('audit_logs',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('clinic_id', sa.Integer(), sa.ForeignKey('clinics.id'), nullable=True),
            sa.Column('staff_id', sa.Integer(), sa.ForeignKey('staff.id'), nullable=True),
            sa.Column('action', sa.String(100), nullable=False),
            sa.Column('entity', sa.String(100), nullable=True),
            sa.Column('entity_id', sa.Integer(), nullable=True),
            sa.Column('detail', sa.Text(), nullable=True),
            sa.Column('ip_address', sa.String(50), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('billing_waiver_logs'):
        op.create_table('billing_waiver_logs',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('invoice_id', sa.Integer(), sa.ForeignKey('invoices.id'), nullable=False),
            sa.Column('staff_id', sa.Integer(), sa.ForeignKey('staff.id'), nullable=True),
            sa.Column('waiver_amount', sa.Numeric(10, 2), nullable=False),
            sa.Column('reason', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('suppliers'):
        op.create_table('suppliers',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('clinic_id', sa.Integer(), sa.ForeignKey('clinics.id'), nullable=False),
            sa.Column('name', sa.String(200), nullable=False),
            sa.Column('contact_person', sa.String(200), nullable=True),
            sa.Column('phone', sa.String(20), nullable=True),
            sa.Column('email', sa.String(150), nullable=True),
            sa.Column('address', sa.Text(), nullable=True),
            sa.Column('gstin', sa.String(20), nullable=True),
            sa.Column('is_active', sa.Boolean(), default=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('purchase_orders'):
        op.create_table('purchase_orders',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('clinic_id', sa.Integer(), sa.ForeignKey('clinics.id'), nullable=False),
            sa.Column('supplier_id', sa.Integer(), sa.ForeignKey('suppliers.id'), nullable=True),
            sa.Column('po_number', sa.String(50), nullable=True),
            sa.Column('status', sa.String(50), default='draft'),
            sa.Column('total_amount', sa.Numeric(12, 2), nullable=True),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('purchase_order_items'):
        op.create_table('purchase_order_items',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('po_id', sa.Integer(), sa.ForeignKey('purchase_orders.id'), nullable=False),
            sa.Column('medicine_id', sa.Integer(), sa.ForeignKey('medicines.id'), nullable=True),
            sa.Column('quantity', sa.Integer(), nullable=False),
            sa.Column('unit_price', sa.Numeric(10, 2), nullable=True),
            sa.Column('total_price', sa.Numeric(10, 2), nullable=True),
        )

    if not _table_exists('sales_returns'):
        op.create_table('sales_returns',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('clinic_id', sa.Integer(), sa.ForeignKey('clinics.id'), nullable=False),
            sa.Column('invoice_id', sa.Integer(), sa.ForeignKey('invoices.id'), nullable=True),
            sa.Column('patient_id', sa.Integer(), sa.ForeignKey('patients.id'), nullable=True),
            sa.Column('return_date', sa.Date(), nullable=True),
            sa.Column('reason', sa.Text(), nullable=True),
            sa.Column('total_amount', sa.Numeric(12, 2), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('sales_return_items'):
        op.create_table('sales_return_items',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('return_id', sa.Integer(), sa.ForeignKey('sales_returns.id'), nullable=False),
            sa.Column('medicine_id', sa.Integer(), sa.ForeignKey('medicines.id'), nullable=True),
            sa.Column('quantity', sa.Integer(), nullable=False),
            sa.Column('unit_price', sa.Numeric(10, 2), nullable=True),
        )

    if not _table_exists('drug_register'):
        op.create_table('drug_register',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('clinic_id', sa.Integer(), sa.ForeignKey('clinics.id'), nullable=False),
            sa.Column('medicine_id', sa.Integer(), sa.ForeignKey('medicines.id'), nullable=True),
            sa.Column('transaction_type', sa.String(50), nullable=False),
            sa.Column('quantity', sa.Integer(), nullable=False),
            sa.Column('balance', sa.Integer(), nullable=True),
            sa.Column('reference', sa.String(100), nullable=True),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('medicine_batches'):
        op.create_table('medicine_batches',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('medicine_id', sa.Integer(), sa.ForeignKey('medicines.id'), nullable=False),
            sa.Column('batch_number', sa.String(50), nullable=True),
            sa.Column('expiry_date', sa.Date(), nullable=True),
            sa.Column('quantity', sa.Integer(), nullable=False),
            sa.Column('unit_price', sa.Numeric(10, 2), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('stock_transactions'):
        op.create_table('stock_transactions',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('clinic_id', sa.Integer(), sa.ForeignKey('clinics.id'), nullable=False),
            sa.Column('medicine_id', sa.Integer(), sa.ForeignKey('medicines.id'), nullable=True),
            sa.Column('batch_id', sa.Integer(), sa.ForeignKey('medicine_batches.id'), nullable=True),
            sa.Column('transaction_type', sa.String(50), nullable=False),
            sa.Column('quantity', sa.Integer(), nullable=False),
            sa.Column('reference_id', sa.Integer(), nullable=True),
            sa.Column('reference_type', sa.String(50), nullable=True),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('chat_rooms'):
        op.create_table('chat_rooms',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('clinic_id', sa.Integer(), sa.ForeignKey('clinics.id'), nullable=False),
            sa.Column('name', sa.String(200), nullable=True),
            sa.Column('room_type', sa.String(50), default='group'),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('chat_room_members'):
        op.create_table('chat_room_members',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('room_id', sa.Integer(), sa.ForeignKey('chat_rooms.id'), nullable=False),
            sa.Column('staff_id', sa.Integer(), sa.ForeignKey('staff.id'), nullable=False),
            sa.Column('joined_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('internal_messages'):
        op.create_table('internal_messages',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('room_id', sa.Integer(), sa.ForeignKey('chat_rooms.id'), nullable=False),
            sa.Column('sender_id', sa.Integer(), sa.ForeignKey('staff.id'), nullable=False),
            sa.Column('content', sa.Text(), nullable=False),
            sa.Column('message_type', sa.String(50), default='text'),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('message_reads'):
        op.create_table('message_reads',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('message_id', sa.Integer(), sa.ForeignKey('internal_messages.id'), nullable=False),
            sa.Column('staff_id', sa.Integer(), sa.ForeignKey('staff.id'), nullable=False),
            sa.Column('read_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('imaging_report_templates'):
        op.create_table('imaging_report_templates',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('clinic_id', sa.Integer(), sa.ForeignKey('clinics.id'), nullable=False),
            sa.Column('modality', sa.String(50), nullable=True),
            sa.Column('body_part', sa.String(100), nullable=True),
            sa.Column('template_name', sa.String(200), nullable=False),
            sa.Column('content', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('imaging_critical_alerts'):
        op.create_table('imaging_critical_alerts',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('imaging_order_id', sa.Integer(), sa.ForeignKey('imaging_orders.id'), nullable=False),
            sa.Column('alert_text', sa.Text(), nullable=False),
            sa.Column('alerted_by', sa.Integer(), sa.ForeignKey('staff.id'), nullable=True),
            sa.Column('acknowledged_by', sa.Integer(), sa.ForeignKey('staff.id'), nullable=True),
            sa.Column('acknowledged_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('referring_doctors'):
        op.create_table('referring_doctors',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('clinic_id', sa.Integer(), sa.ForeignKey('clinics.id'), nullable=False),
            sa.Column('name', sa.String(200), nullable=False),
            sa.Column('specialty', sa.String(100), nullable=True),
            sa.Column('phone', sa.String(20), nullable=True),
            sa.Column('email', sa.String(150), nullable=True),
            sa.Column('hospital', sa.String(200), nullable=True),
            sa.Column('city', sa.String(100), nullable=True),
            sa.Column('is_active', sa.Boolean(), default=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('imaging_slots'):
        op.create_table('imaging_slots',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('clinic_id', sa.Integer(), sa.ForeignKey('clinics.id'), nullable=False),
            sa.Column('branch_id', sa.Integer(), sa.ForeignKey('branches.id'), nullable=True),
            sa.Column('modality', sa.String(50), nullable=False),
            sa.Column('slot_date', sa.Date(), nullable=False),
            sa.Column('slot_time', sa.String(8), nullable=False),
            sa.Column('duration_minutes', sa.Integer(), default=30),
            sa.Column('is_booked', sa.Boolean(), default=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('imaging_bookings'):
        op.create_table('imaging_bookings',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('imaging_order_id', sa.Integer(), sa.ForeignKey('imaging_orders.id'), nullable=True),
            sa.Column('imaging_slot_id', sa.Integer(), sa.ForeignKey('imaging_slots.id'), nullable=True),
            sa.Column('patient_id', sa.Integer(), sa.ForeignKey('patients.id'), nullable=True),
            sa.Column('status', sa.String(50), default='scheduled'),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('departments'):
        op.create_table('departments',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('clinic_id', sa.Integer(), sa.ForeignKey('clinics.id'), nullable=False),
            sa.Column('name', sa.String(200), nullable=False),
            sa.Column('code', sa.String(20), nullable=True),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('is_active', sa.Boolean(), default=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('wards'):
        op.create_table('wards',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('clinic_id', sa.Integer(), sa.ForeignKey('clinics.id'), nullable=False),
            sa.Column('department_id', sa.Integer(), sa.ForeignKey('departments.id'), nullable=True),
            sa.Column('name', sa.String(200), nullable=False),
            sa.Column('ward_type', sa.String(50), nullable=True),
            sa.Column('total_beds', sa.Integer(), default=0),
            sa.Column('is_active', sa.Boolean(), default=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('beds'):
        op.create_table('beds',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('ward_id', sa.Integer(), sa.ForeignKey('wards.id'), nullable=False),
            sa.Column('bed_number', sa.String(20), nullable=False),
            sa.Column('bed_type', sa.String(50), nullable=True),
            sa.Column('status', sa.String(50), default='available'),
            sa.Column('is_active', sa.Boolean(), default=True),
        )

    if not _table_exists('admissions'):
        op.create_table('admissions',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('clinic_id', sa.Integer(), sa.ForeignKey('clinics.id'), nullable=False),
            sa.Column('patient_id', sa.Integer(), sa.ForeignKey('patients.id'), nullable=False),
            sa.Column('bed_id', sa.Integer(), sa.ForeignKey('beds.id'), nullable=True),
            sa.Column('ward_id', sa.Integer(), sa.ForeignKey('wards.id'), nullable=True),
            sa.Column('department_id', sa.Integer(), sa.ForeignKey('departments.id'), nullable=True),
            sa.Column('admitting_doctor_id', sa.Integer(), sa.ForeignKey('doctor_profiles.id'), nullable=True),
            sa.Column('admission_date', sa.DateTime(), nullable=False),
            sa.Column('expected_discharge_date', sa.Date(), nullable=True),
            sa.Column('actual_discharge_date', sa.DateTime(), nullable=True),
            sa.Column('admission_type', sa.String(50), default='elective'),
            sa.Column('chief_complaint', sa.Text(), nullable=True),
            sa.Column('diagnosis', sa.Text(), nullable=True),
            sa.Column('status', sa.String(50), default='active'),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('admission_transfers'):
        op.create_table('admission_transfers',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('admission_id', sa.Integer(), sa.ForeignKey('admissions.id'), nullable=False),
            sa.Column('from_bed_id', sa.Integer(), sa.ForeignKey('beds.id'), nullable=True),
            sa.Column('to_bed_id', sa.Integer(), sa.ForeignKey('beds.id'), nullable=True),
            sa.Column('reason', sa.Text(), nullable=True),
            sa.Column('transferred_by', sa.Integer(), sa.ForeignKey('staff.id'), nullable=True),
            sa.Column('transferred_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('staff_departments'):
        op.create_table('staff_departments',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('staff_id', sa.Integer(), sa.ForeignKey('staff.id'), nullable=False),
            sa.Column('department_id', sa.Integer(), sa.ForeignKey('departments.id'), nullable=False),
            sa.Column('is_primary', sa.Boolean(), default=False),
        )

    if not _table_exists('appointment_token_sequences'):
        op.create_table('appointment_token_sequences',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('clinic_id', sa.Integer(), sa.ForeignKey('clinics.id'), nullable=False),
            sa.Column('branch_id', sa.Integer(), sa.ForeignKey('branches.id'), nullable=True),
            sa.Column('doctor_id', sa.Integer(), sa.ForeignKey('doctor_profiles.id'), nullable=False),
            sa.Column('appt_date', sa.Date(), nullable=False),
            sa.Column('last_token', sa.Integer(), default=0),
        )

    if not _table_exists('vital_signs'):
        op.create_table('vital_signs',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('admission_id', sa.Integer(), sa.ForeignKey('admissions.id'), nullable=False),
            sa.Column('recorded_by', sa.Integer(), sa.ForeignKey('staff.id'), nullable=True),
            sa.Column('temperature', sa.Numeric(5, 2), nullable=True),
            sa.Column('pulse', sa.Integer(), nullable=True),
            sa.Column('respiratory_rate', sa.Integer(), nullable=True),
            sa.Column('bp_systolic', sa.Integer(), nullable=True),
            sa.Column('bp_diastolic', sa.Integer(), nullable=True),
            sa.Column('spo2', sa.Numeric(5, 2), nullable=True),
            sa.Column('weight', sa.Numeric(6, 2), nullable=True),
            sa.Column('height', sa.Numeric(5, 2), nullable=True),
            sa.Column('recorded_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('nursing_notes'):
        op.create_table('nursing_notes',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('admission_id', sa.Integer(), sa.ForeignKey('admissions.id'), nullable=False),
            sa.Column('nurse_id', sa.Integer(), sa.ForeignKey('staff.id'), nullable=True),
            sa.Column('note', sa.Text(), nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('medication_administrations'):
        op.create_table('medication_administrations',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('admission_id', sa.Integer(), sa.ForeignKey('admissions.id'), nullable=False),
            sa.Column('medicine_id', sa.Integer(), sa.ForeignKey('medicines.id'), nullable=True),
            sa.Column('administered_by', sa.Integer(), sa.ForeignKey('staff.id'), nullable=True),
            sa.Column('dose', sa.String(100), nullable=True),
            sa.Column('route', sa.String(50), nullable=True),
            sa.Column('administered_at', sa.DateTime(), server_default=sa.func.now()),
            sa.Column('notes', sa.Text(), nullable=True),
        )

    if not _table_exists('ward_rounds'):
        op.create_table('ward_rounds',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('admission_id', sa.Integer(), sa.ForeignKey('admissions.id'), nullable=False),
            sa.Column('doctor_id', sa.Integer(), sa.ForeignKey('doctor_profiles.id'), nullable=True),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('plan', sa.Text(), nullable=True),
            sa.Column('round_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('discharge_summaries'):
        op.create_table('discharge_summaries',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('admission_id', sa.Integer(), sa.ForeignKey('admissions.id'), nullable=False),
            sa.Column('doctor_id', sa.Integer(), sa.ForeignKey('doctor_profiles.id'), nullable=True),
            sa.Column('diagnosis', sa.Text(), nullable=True),
            sa.Column('procedure', sa.Text(), nullable=True),
            sa.Column('medications', sa.Text(), nullable=True),
            sa.Column('follow_up', sa.Text(), nullable=True),
            sa.Column('instructions', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('progress_notes'):
        op.create_table('progress_notes',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('admission_id', sa.Integer(), sa.ForeignKey('admissions.id'), nullable=False),
            sa.Column('staff_id', sa.Integer(), sa.ForeignKey('staff.id'), nullable=True),
            sa.Column('note', sa.Text(), nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('inpatient_charges'):
        op.create_table('inpatient_charges',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('admission_id', sa.Integer(), sa.ForeignKey('admissions.id'), nullable=False),
            sa.Column('description', sa.String(300), nullable=False),
            sa.Column('amount', sa.Numeric(10, 2), nullable=False),
            sa.Column('charge_type', sa.String(50), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('inpatient_bills'):
        op.create_table('inpatient_bills',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('admission_id', sa.Integer(), sa.ForeignKey('admissions.id'), nullable=False),
            sa.Column('total_amount', sa.Numeric(12, 2), nullable=True),
            sa.Column('paid_amount', sa.Numeric(12, 2), default=0),
            sa.Column('status', sa.String(50), default='pending'),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('inpatient_referrals'):
        op.create_table('inpatient_referrals',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('admission_id', sa.Integer(), sa.ForeignKey('admissions.id'), nullable=False),
            sa.Column('referring_doctor_id', sa.Integer(), sa.ForeignKey('doctor_profiles.id'), nullable=True),
            sa.Column('referred_to', sa.String(200), nullable=True),
            sa.Column('reason', sa.Text(), nullable=True),
            sa.Column('status', sa.String(50), default='pending'),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('assessment_forms'):
        op.create_table('assessment_forms',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('clinic_id', sa.Integer(), sa.ForeignKey('clinics.id'), nullable=True),
            sa.Column('name', sa.String(200), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('form_type', sa.String(50), default='custom'),
            sa.Column('is_system', sa.Boolean(), default=False),
            sa.Column('is_active', sa.Boolean(), default=True),
            sa.Column('schema', sa.JSON(), nullable=True),
            sa.Column('created_by', sa.Integer(), sa.ForeignKey('staff.id'), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('assessment_form_versions'):
        op.create_table('assessment_form_versions',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('form_id', sa.Integer(), sa.ForeignKey('assessment_forms.id'), nullable=False),
            sa.Column('version', sa.Integer(), nullable=False),
            sa.Column('schema', sa.JSON(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('form_pool'):
        op.create_table('form_pool',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('form_id', sa.Integer(), sa.ForeignKey('assessment_forms.id'), nullable=False),
            sa.Column('clinic_id', sa.Integer(), sa.ForeignKey('clinics.id'), nullable=True),
            sa.Column('is_enabled', sa.Boolean(), default=True),
        )

    if not _table_exists('form_assignments'):
        op.create_table('form_assignments',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('form_id', sa.Integer(), sa.ForeignKey('assessment_forms.id'), nullable=False),
            sa.Column('patient_id', sa.Integer(), sa.ForeignKey('patients.id'), nullable=True),
            sa.Column('admission_id', sa.Integer(), sa.ForeignKey('admissions.id'), nullable=True),
            sa.Column('appointment_id', sa.Integer(), sa.ForeignKey('appointments.id'), nullable=True),
            sa.Column('assigned_by', sa.Integer(), sa.ForeignKey('staff.id'), nullable=True),
            sa.Column('due_date', sa.DateTime(), nullable=True),
            sa.Column('status', sa.String(50), default='pending'),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('form_submissions'):
        op.create_table('form_submissions',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('assignment_id', sa.Integer(), sa.ForeignKey('form_assignments.id'), nullable=True),
            sa.Column('form_id', sa.Integer(), sa.ForeignKey('assessment_forms.id'), nullable=False),
            sa.Column('patient_id', sa.Integer(), sa.ForeignKey('patients.id'), nullable=True),
            sa.Column('admission_id', sa.Integer(), sa.ForeignKey('admissions.id'), nullable=True),
            sa.Column('appointment_id', sa.Integer(), sa.ForeignKey('appointments.id'), nullable=True),
            sa.Column('submitted_by', sa.Integer(), sa.ForeignKey('staff.id'), nullable=True),
            sa.Column('responses', sa.JSON(), nullable=True),
            sa.Column('score', sa.Numeric(8, 2), nullable=True),
            sa.Column('status', sa.String(50), default='submitted'),
            sa.Column('submitted_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('form_alerts'):
        op.create_table('form_alerts',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('submission_id', sa.Integer(), sa.ForeignKey('form_submissions.id'), nullable=False),
            sa.Column('alert_type', sa.String(100), nullable=False),
            sa.Column('severity', sa.String(50), default='info'),
            sa.Column('message', sa.Text(), nullable=True),
            sa.Column('acknowledged_by', sa.Integer(), sa.ForeignKey('staff.id'), nullable=True),
            sa.Column('acknowledged_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('iview_flowsheets'):
        op.create_table('iview_flowsheets',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('admission_id', sa.Integer(), sa.ForeignKey('admissions.id'), nullable=False),
            sa.Column('recorded_by', sa.Integer(), sa.ForeignKey('staff.id'), nullable=True),
            sa.Column('data', sa.JSON(), nullable=True),
            sa.Column('recorded_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('form_cosigns'):
        op.create_table('form_cosigns',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('submission_id', sa.Integer(), sa.ForeignKey('form_submissions.id'), nullable=False),
            sa.Column('cosigned_by', sa.Integer(), sa.ForeignKey('staff.id'), nullable=False),
            sa.Column('cosigned_at', sa.DateTime(), server_default=sa.func.now()),
            sa.Column('notes', sa.Text(), nullable=True),
        )

    if not _table_exists('feedback'):
        op.create_table('feedback',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('name', sa.String(200), nullable=True),
            sa.Column('email', sa.String(150), nullable=True),
            sa.Column('mobile', sa.String(20), nullable=True),
            sa.Column('category', sa.String(100), nullable=True),
            sa.Column('message', sa.Text(), nullable=False),
            sa.Column('status', sa.String(50), default='new'),
            sa.Column('admin_notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    # Safe column additions for tables that already exist
    conn = op.get_bind()

    def col_exists(table, column):
        result = conn.execute(sa.text(
            "SELECT 1 FROM information_schema.columns WHERE table_name=:t AND column_name=:c"
        ), {"t": table, "c": column}).fetchone()
        return result is not None

    extra_cols = [
        ("online_bookings", "patient_user_id", "INTEGER REFERENCES patient_users(id)"),
        ("clinic_patient_tags", "tag_id", "INTEGER REFERENCES patient_tags(id)"),
        ("encounter_access_logs", "accessed_by", "INTEGER REFERENCES staff(id)"),
        ("encounter_access_logs", "patient_id", "INTEGER REFERENCES patients(id)"),
        ("encounter_access_logs", "appointment_id", "INTEGER REFERENCES appointments(id)"),
        ("encounter_access_logs", "reason", "TEXT"),
        ("encounter_access_logs", "accessed_at", "TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()"),
    ]
    for table, col, col_def in extra_cols:
        if not col_exists(table, col):
            try:
                conn.execute(sa.text(f'ALTER TABLE {table} ADD COLUMN {col} {col_def}'))
                conn.commit()
            except Exception:
                conn.rollback()

    # Ensure clinic_patient_tags and patient_tags exist
    if not _table_exists('patient_tags'):
        op.create_table('patient_tags',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('clinic_id', sa.Integer(), sa.ForeignKey('clinics.id'), nullable=False),
            sa.Column('name', sa.String(100), nullable=False),
            sa.Column('color', sa.String(20), nullable=True),
        )

    if not _table_exists('clinic_patient_tags'):
        op.create_table('clinic_patient_tags',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('patient_id', sa.Integer(), sa.ForeignKey('patients.id'), nullable=False),
            sa.Column('tag_id', sa.Integer(), sa.ForeignKey('patient_tags.id'), nullable=False),
            sa.Column('clinic_id', sa.Integer(), sa.ForeignKey('clinics.id'), nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('encounter_access_logs'):
        op.create_table('encounter_access_logs',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('accessed_by', sa.Integer(), sa.ForeignKey('staff.id'), nullable=True),
            sa.Column('patient_id', sa.Integer(), sa.ForeignKey('patients.id'), nullable=True),
            sa.Column('appointment_id', sa.Integer(), sa.ForeignKey('appointments.id'), nullable=True),
            sa.Column('reason', sa.Text(), nullable=True),
            sa.Column('accessed_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('bh_state_groups'):
        op.create_table('bh_state_groups',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('state_code', sa.String(10), nullable=False),
            sa.Column('state_name', sa.String(100), nullable=False),
            sa.Column('group_code', sa.String(10), nullable=False),
        )

    if not _table_exists('bh_id_sequences'):
        op.create_table('bh_id_sequences',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('state_group', sa.String(10), nullable=False),
            sa.Column('last_seq', sa.Integer(), default=0),
        )

    if not _table_exists('bh_profiles'):
        op.create_table('bh_profiles',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('bh_id', sa.String(20), nullable=False, unique=True),
            sa.Column('patient_user_id', sa.Integer(), sa.ForeignKey('patient_users.id'), nullable=True),
            sa.Column('first_name', sa.String(100), nullable=True),
            sa.Column('last_name', sa.String(100), nullable=True),
            sa.Column('date_of_birth', sa.Date(), nullable=True),
            sa.Column('gender', sa.String(10), nullable=True),
            sa.Column('blood_group', sa.String(5), nullable=True),
            sa.Column('state_code', sa.String(10), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    if not _table_exists('unmatched_results'):
        op.create_table('unmatched_results',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('clinic_id', sa.Integer(), sa.ForeignKey('clinics.id'), nullable=False),
            sa.Column('result_type', sa.String(50), nullable=True),
            sa.Column('raw_data', sa.JSON(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )


def downgrade():
    pass
