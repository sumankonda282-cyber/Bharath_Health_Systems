"""Add Razorpay columns to invoices

Revision ID: 0010_payment_gateway
Revises: 0009_pharmacy_dispense_tables
Create Date: 2026-06-09
"""

from alembic import op
import sqlalchemy as sa

revision = '0010_payment_gateway'
down_revision = '0009_pharmacy_dispense_tables'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('invoices', sa.Column('razorpay_order_id',   sa.String(100), nullable=True))
    op.add_column('invoices', sa.Column('razorpay_payment_id', sa.String(100), nullable=True))
    op.create_index('ix_invoices_razorpay_order_id', 'invoices', ['razorpay_order_id'])


def downgrade():
    op.drop_index('ix_invoices_razorpay_order_id', table_name='invoices')
    op.drop_column('invoices', 'razorpay_payment_id')
    op.drop_column('invoices', 'razorpay_order_id')
