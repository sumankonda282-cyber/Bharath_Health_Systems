from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from app.db.session import get_db
from app.core.security import get_current_platform_admin, get_current_staff, hash_password
from app.models.models import Staff, MaintenanceRequest
from datetime import datetime

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


def _maint_out(r: MaintenanceRequest):
    return {
        "id": r.id, "title": r.title, "description": r.description,
        "category": r.category, "priority": r.priority, "status": r.status,
        "location": r.location, "portal_source": r.portal_source,
        "submitted_by": r.submitted_by, "assigned_to": r.assigned_to,
        "notes": r.notes,
        "resolved_at": str(r.resolved_at) if r.resolved_at else None,
        "created_at": str(r.created_at) if r.created_at else None,
    }


@router.get("/requests")
def list_maintenance_requests(
    status: str = None,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Maintenance/facility requests for the current clinic."""
    q = db.query(MaintenanceRequest).filter(MaintenanceRequest.clinic_id == current.clinic_id)
    if status:
        q = q.filter(MaintenanceRequest.status == status)
    rows = q.order_by(MaintenanceRequest.created_at.desc()).limit(200).all()
    return [_maint_out(r) for r in rows]


@router.post("/requests")
def create_maintenance_request(
    body: dict,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Create a maintenance/facility request from any staff portal."""
    req = MaintenanceRequest(
        clinic_id     = current.clinic_id,
        title         = (body.get("title") or body.get("subject") or "Maintenance request").strip(),
        description   = body.get("description") or body.get("details"),
        category      = body.get("category") or "facility",
        priority      = body.get("priority") or "medium",
        location      = body.get("location"),
        portal_source = body.get("portal_source") or body.get("source"),
        submitted_by  = current.id,
        status        = "new",
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return _maint_out(req)


@router.get("/requests/badge")
def maintenance_badge(
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Open-request count for the nav badge."""
    from sqlalchemy import func
    count = db.query(func.count(MaintenanceRequest.id)).filter(
        MaintenanceRequest.clinic_id == current.clinic_id,
        MaintenanceRequest.status.in_(["new", "in_progress"]),
    ).scalar() or 0
    return {"count": int(count)}


@router.patch("/requests/{req_id}")
def update_maintenance_request(
    req_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    req = db.query(MaintenanceRequest).filter(
        MaintenanceRequest.id == req_id,
        MaintenanceRequest.clinic_id == current.clinic_id,
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    for f in ("title", "description", "category", "priority", "status", "location", "notes", "assigned_to"):
        if f in body:
            setattr(req, f, body[f])
    if body.get("status") in ("resolved", "closed") and not req.resolved_at:
        req.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(req)
    return _maint_out(req)


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
