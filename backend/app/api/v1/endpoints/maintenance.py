from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from app.db.session import get_db
from app.core.security import get_current_platform_admin, hash_password

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


class UpdateAdminRequest(BaseModel):
    email: str
    full_name: str = ""
    new_password: str = ""


@router.post("/update-superadmin")
def update_superadmin(
    payload: UpdateAdminRequest,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    """Update super admin email, name, and/or password."""
    from app.models.models import PlatformAdmin
    admin = db.query(PlatformAdmin).filter(PlatformAdmin.id == current.id).first()
    if payload.email:
        admin.email = payload.email.lower().strip()
    if payload.full_name:
        admin.full_name = payload.full_name
    if payload.new_password:
        admin.hashed_password = hash_password(payload.new_password)
        admin.token_version = (admin.token_version or 1) + 1
    db.commit()
    return {"status": "updated", "email": admin.email, "full_name": admin.full_name}


@router.post("/reset-to-superadmin")
def reset_to_superadmin(
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    """
    Delete ALL data except the super admin account.
    Keeps: platform_admins, bh_state_groups, bh_id_sequences (reference data).
    Wipes: clinics, branches, staff, patients, appointments, encounters, everything else.
    """
    tables_to_clear = [
        # Child tables first (FK order)
        "chat_messages",
        "chat_sessions",
        "ward_round_notes",
        "nursing_notes",
        "medication_administration_records",
        "inpatient_medication_orders",
        "inpatient_clinical_orders",
        "inpatient_admissions",
        "ward_beds",
        "wards",
        "assessment_submissions",
        "assessment_form_items",
        "assessment_forms",
        "lab_results",
        "lab_order_items",
        "lab_orders",
        "imaging_order_items",
        "imaging_orders",
        "prescription_items",
        "prescriptions",
        "invoice_items",
        "invoices",
        "soap_notes",
        "vitals",
        "encounter_access_logs",
        "patient_tags",
        "clinic_patient_tags",
        "online_bookings",
        "appointments",
        "patient_referrals",
        "bh_profiles",
        "patient_users",
        "patients",
        "doctor_desk_assignments",
        "doctor_schedules",
        "doctor_profiles",
        "staff",
        "branches",
        "clinics",
        "staff_shift_assignments",
        "shift_templates",
        "weekly_schedules",
        "support_tickets",
        "audit_logs",
        "telehealth_sessions",
        "form_templates",
    ]

    cleared = []
    skipped = []

    for table in tables_to_clear:
        try:
            db.execute(text(f'DELETE FROM "{table}"'))
            cleared.append(table)
        except Exception:
            db.rollback()
            skipped.append(table)

    db.commit()

    return {
        "status": "done",
        "message": "All data cleared. Only super admin account remains.",
        "cleared": cleared,
        "skipped_not_found": skipped,
    }
