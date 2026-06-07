"""Add pharmacy_orders, dispense_sessions, dispense_items tables

Revision ID: 0009_pharmacy_dispense_tables
Revises: 0008_merge_heads
Create Date: 2026-06-07
"""

from alembic import op
import sqlalchemy as sa

revision = '0009_pharmacy_dispense_tables'
down_revision = '0008_merge_heads'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'pharmacy_orders',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('clinic_id', sa.Integer(), sa.ForeignKey('clinics.id'), nullable=False),
        sa.Column('branch_id', sa.Integer(), sa.ForeignKey('branches.id'), nullable=True),
        sa.Column('patient_id', sa.Integer(), sa.ForeignKey('patients.id'), nullable=True),
        sa.Column('source', sa.String(20), nullable=False),
        sa.Column('status', sa.String(30), nullable=False, server_default='pending_fill'),
        sa.Column('prescription_image_url', sa.String(500), nullable=True),
        sa.Column('prescription_id', sa.Integer(), sa.ForeignKey('prescriptions.id'), nullable=True),
        sa.Column('patient_name', sa.String(200), nullable=True),
        sa.Column('patient_mobile', sa.String(20), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('staff.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        'dispense_sessions',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('clinic_id', sa.Integer(), sa.ForeignKey('clinics.id'), nullable=False),
        sa.Column('branch_id', sa.Integer(), sa.ForeignKey('branches.id'), nullable=True),
        sa.Column('order_id', sa.Integer(), sa.ForeignKey('pharmacy_orders.id'), nullable=True),
        sa.Column('patient_id', sa.Integer(), sa.ForeignKey('patients.id'), nullable=True),
        sa.Column('dispense_number', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='draft'),
        sa.Column('subtotal', sa.Numeric(10, 2), server_default='0'),
        sa.Column('gst_total', sa.Numeric(10, 2), server_default='0'),
        sa.Column('total_amount', sa.Numeric(10, 2), server_default='0'),
        sa.Column('amount_paid', sa.Numeric(10, 2), server_default='0'),
        sa.Column('balance_due', sa.Numeric(10, 2), server_default='0'),
        sa.Column('payment_method', sa.String(50), nullable=True),
        sa.Column('dispensed_by', sa.Integer(), sa.ForeignKey('staff.id'), nullable=True),
        sa.Column('dispensed_at', sa.DateTime(), nullable=True),
        sa.Column('invoice_id', sa.Integer(), sa.ForeignKey('invoices.id'), nullable=True),
        sa.Column('patient_name', sa.String(200), nullable=True),
        sa.Column('patient_mobile', sa.String(20), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        'dispense_items',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('session_id', sa.Integer(), sa.ForeignKey('dispense_sessions.id'), nullable=False),
        sa.Column('medicine_id', sa.Integer(), sa.ForeignKey('medicines.id'), nullable=True),
        sa.Column('medicine_name', sa.String(200), nullable=False),
        sa.Column('batch_number', sa.String(50), nullable=True),
        sa.Column('expiry_date', sa.Date(), nullable=True),
        sa.Column('ordered_qty', sa.Integer(), server_default='0'),
        sa.Column('dispensed_qty', sa.Integer(), server_default='0'),
        sa.Column('unit_price', sa.Numeric(10, 2), server_default='0'),
        sa.Column('mrp', sa.Numeric(10, 2), nullable=True),
        sa.Column('gst_percent', sa.Numeric(5, 2), server_default='0'),
        sa.Column('gst_amount', sa.Numeric(10, 2), server_default='0'),
        sa.Column('line_total', sa.Numeric(10, 2), server_default='0'),
        sa.Column('is_schedule_h', sa.Boolean(), server_default='false'),
        sa.Column('gathered', sa.Boolean(), server_default='false'),
    )


def downgrade():
    op.drop_table('dispense_items')
    op.drop_table('dispense_sessions')
    op.drop_table('pharmacy_orders')
