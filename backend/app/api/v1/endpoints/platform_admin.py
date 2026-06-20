from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, text
from typing import Optional
from datetime import datetime, date, timedelta
def _years_between(d1: date, d2: date) -> int:
    years = d1.year - d2.year
    if (d1.month, d1.day) < (d2.month, d2.day):
        years -= 1
    return years
from sqlalchemy import or_
from app.db.session import get_db
from app.core.security import get_current_platform_admin, hash_password
from app.models.models import Clinic, Branch, Staff, Patient, Appointment, PlatformAdmin, AuditLog, Invoice, Feedback, Department, Ward, Bed, PlatformSetting, SubscriptionPayment, PatientTag, LabOrder, Prescription, DoctorProfile, PatientUser

import re
import secrets
import string as _string
from decimal import Decimal

router = APIRouter(prefix="/platform", tags=["platform-admin"])


def _generate_temp_password() -> str:
    """8 chars: 3 upper + 2 lower + 2 digits + 1 special. Always meets complexity."""
    special = "!@#$%^&*"
    while True:
        pwd = (
            ''.join(secrets.choice(_string.ascii_uppercase) for _ in range(3)) +
            ''.join(secrets.choice(_string.ascii_lowercase) for _ in range(2)) +
            ''.join(secrets.choice(_string.digits) for _ in range(2)) +
            secrets.choice(special)
        )
        # Shuffle to avoid predictable pattern
        chars = list(pwd)
        secrets.SystemRandom().shuffle(chars)
        result = ''.join(chars)
        # Verify it still meets requirements after shuffle
        if (any(c.isupper() for c in result) and
            any(c.islower() for c in result) and
            any(c.isdigit() for c in result) and
            any(c in special for c in result)):
            return result


def _generate_username(full_name: str, db) -> str:
    """4 letters of first name + 2 random digits. Retries on collision."""
    first = ''.join(c for c in full_name.strip().split()[0].lower() if c.isalpha())[:4]
    first = first.ljust(4, 'x')  # pad if name shorter than 4 chars
    for _ in range(20):
        suffix = ''.join(secrets.choice(_string.digits) for _ in range(2))
        username = first + suffix
        exists = db.query(Staff).filter(Staff.username == username).first()
        if not exists:
            return username
    # Fallback: 4 digit suffix
    for _ in range(20):
        suffix = ''.join(secrets.choice(_string.digits) for _ in range(4))
        username = first + suffix
        if not db.query(Staff).filter(Staff.username == username).first():
            return username
    raise Exception("Could not generate unique username")

# ── Rate Card (fallback — authoritative copy lives in platform_settings table) ─
RATE_CARD = {
    "free":       {"price_per_doctor": 0,    "max_doctors": 2,   "label": "Free"},
    "basic":      {"price_per_doctor": 999,  "max_doctors": 10,  "label": "Basic"},
    "pro":        {"price_per_doctor": 799,  "max_doctors": 999, "label": "Pro"},
    "enterprise": {"price_per_doctor": 0,    "max_doctors": 999, "label": "Enterprise"},
}

DEFAULT_PLAN_CONFIG = {
    "plans": {
        "free": {
            "label": "Free",
            "color": "#6B7280",
            "price_per_doctor": 0,
            "max_doctors": 2,
            "trial_days": 0,
            "features": ["OPD", "Basic Reports"],
        },
        "basic": {
            "label": "Basic",
            "color": "#3B82F6",
            "price_per_doctor": 999,
            "max_doctors": 10,
            "trial_days": 14,
            "features": ["OPD", "Appointments", "Patient Records", "Reports", "SMS Alerts"],
        },
        "pro": {
            "label": "Pro",
            "color": "#8B5CF6",
            "price_per_doctor": 799,
            "max_doctors": 999,
            "trial_days": 14,
            "features": ["OPD", "IPD", "Lab", "Pharmacy", "Imaging", "Telehealth", "Reports", "API Access"],
        },
        "enterprise": {
            "label": "Enterprise",
            "color": "#F59E0B",
            "price_per_doctor": 0,
            "max_doctors": 999,
            "trial_days": 30,
            "features": ["All Pro Features", "Dedicated Support", "Custom Integrations", "SLA Guarantee", "Custom Branding"],
        },
    },
    "modules": {
        "has_pharmacy":  {"label": "Pharmacy",   "description": "Pharmacy inventory and billing"},
        "has_lab":       {"label": "Laboratory",  "description": "Lab orders and reports"},
        "has_imaging":   {"label": "Imaging",     "description": "Radiology and imaging"},
        "has_telehealth":{"label": "Telehealth",  "description": "Video consultations"},
        "has_inpatient": {"label": "Inpatient",   "description": "IPD / ward management"},
    },
}

ROLES_NEEDING_VERIFICATION = ['pharmacist', 'lab_technician', 'imaging_tech', 'nurse']

SUSPENSION_REASONS = [
    "license_cancelled",
    "payment_failed",
    "compliance_issue",
    "other",
]

# ── Plan Config Helpers ───────────────────────────────────────────────────────

def _get_plan_config(db) -> dict:
    """Return plan config from DB; fall back to DEFAULT_PLAN_CONFIG."""
    row = db.query(PlatformSetting).filter(PlatformSetting.key == "plan_config").first()
    if row and isinstance(row.value, dict):
        return row.value
    return DEFAULT_PLAN_CONFIG


def _get_rate_card(db) -> dict:
    """Flatten plan config into the legacy RATE_CARD shape."""
    cfg = _get_plan_config(db)
    return {
        key: {
            "price_per_doctor": plan.get("price_per_doctor", 0),
            "max_doctors":      plan.get("max_doctors", 999),
            "label":            plan.get("label", key.capitalize()),
        }
        for key, plan in cfg.get("plans", {}).items()
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _sync_clinic_status(clinic: Clinic):
    """Keep is_active/is_verified in sync with status for backward compat."""
    if clinic.status == "active":
        clinic.is_active = True
        clinic.is_verified = True
    elif clinic.status == "pending":
        clinic.is_active = True
        clinic.is_verified = False
    else:  # suspended | revoked
        clinic.is_active = False
        clinic.is_verified = False


def _log(db, action, target_type, target_id, target_name, admin, reason=None, comment=None):
    entry = AuditLog(
        action=action,
        target_type=target_type,
        target_id=target_id,
        target_name=target_name,
        admin_id=admin.id if admin else None,
        admin_name=admin.full_name if admin else "System",
        reason=reason,
        comment=comment,
    )
    db.add(entry)


def _doctor_count(db, clinic_id):
    return db.query(func.count(Staff.id)).filter(
        Staff.clinic_id == clinic_id,
        Staff.role == "doctor",
        Staff.is_active == True,
    ).scalar()


def _clinic_summary(c, db, rate_card: dict = None):
    if rate_card is None:
        rate_card = _get_rate_card(db)
    admin = db.query(Staff).filter(Staff.clinic_id == c.id, Staff.role == "clinic_admin").first()
    doctors = _doctor_count(db, c.id)
    patient_count = db.query(func.count(Patient.id)).filter(Patient.clinic_id == c.id).scalar()
    plan = c.subscription_plan or "free"
    rate = rate_card.get(plan, {"price_per_doctor": 0, "max_doctors": 2, "label": "Free"})
    monthly_bill = doctors * rate["price_per_doctor"]
    return {
        "id":            c.id,
        "name":          c.name,
        "slug":          c.slug,
        "specialty":     c.specialty,
        "city":          c.city,
        "state":         c.state,
        "phone":         c.phone,
        "email":         c.email,
        "status":        c.status or ("active" if c.is_verified else "pending"),
        "plan":          plan,
        "subscription_status":     c.subscription_status or "active",
        "subscription_expires_at": str(c.subscription_expires_at) if c.subscription_expires_at else None,
        "doctor_count":  doctors,
        "patient_count": patient_count,
        "monthly_bill":  monthly_bill,
        "is_active":     c.is_active,
        "is_verified":   c.is_verified,
        "suspension_reason":  c.suspension_reason,
        "suspension_comment": c.suspension_comment,
        "rejection_reason":   c.rejection_reason,
        "license_document_url": c.license_document_url,
        "created_at":    str(c.created_at),
        "admin_name":    admin.full_name if admin else None,
        "admin_email":   admin.email if admin else None,
        "admin_mobile":  admin.mobile if admin else None,
        "has_pharmacy":  bool(c.has_pharmacy),
        "has_lab":       bool(c.has_lab),
        "has_imaging":   bool(c.has_imaging),
        "has_telehealth":bool(c.has_telehealth),
        "has_inpatient": bool(c.has_inpatient),
    }


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard")
def platform_dashboard(db: Session = Depends(get_db), current=Depends(get_current_platform_admin)):
    total     = db.query(func.count(Clinic.id)).scalar()
    active    = db.query(func.count(Clinic.id)).filter(Clinic.status == "active").scalar()
    pending   = db.query(func.count(Clinic.id)).filter(Clinic.status == "pending").scalar()
    suspended = db.query(func.count(Clinic.id)).filter(Clinic.status == "suspended").scalar()
    revoked   = db.query(func.count(Clinic.id)).filter(Clinic.status == "revoked").scalar()

    total_doctors  = db.query(func.count(Staff.id)).filter(Staff.role == "doctor", Staff.is_active == True).scalar()
    total_patients = db.query(func.count(Patient.id)).scalar()

    # Pending staff verifications
    pending_staff = db.query(func.count(Staff.id)).filter(
        Staff.role.in_(ROLES_NEEDING_VERIFICATION), Staff.is_active == False
    ).scalar()

    # This month's new registrations
    month_start = date.today().replace(day=1)
    new_this_month = db.query(func.count(Clinic.id)).filter(
        Clinic.created_at >= month_start
    ).scalar()

    # Estimated MRR across all active clinics
    rc = _get_rate_card(db)
    clinics = db.query(Clinic).filter(Clinic.status == "active").all()
    mrr = 0
    for c in clinics:
        plan = c.subscription_plan or "free"
        rate = rc.get(plan, {"price_per_doctor": 0})
        doctors = _doctor_count(db, c.id)
        mrr += doctors * rate["price_per_doctor"]

    # Today's activity metrics
    today = date.today()
    appts_today = db.query(func.count(Appointment.id)).filter(
        Appointment.appointment_date == today
    ).scalar()
    invoices_today = db.query(func.count(Invoice.id)).filter(
        func.date(Invoice.created_at) == today
    ).scalar()
    new_patients_today = db.query(func.count(Patient.id)).filter(
        func.date(Patient.created_at) == today
    ).scalar()

    # Module adoption percentages across active clinics
    module_adoption = {}
    for mod, field in [
        ("pharmacy",   "has_pharmacy"),
        ("lab",        "has_lab"),
        ("imaging",    "has_imaging"),
        ("telehealth", "has_telehealth"),
        ("inpatient",  "has_inpatient"),
    ]:
        count = db.query(func.count(Clinic.id)).filter(
            Clinic.status == "active",
            getattr(Clinic, field) == True,
        ).scalar()
        module_adoption[mod] = round((count / active) * 100, 1) if active else 0

    # Expiring within 7 days
    week_ahead = datetime.utcnow() + timedelta(days=7)
    expiring_soon = db.query(func.count(Clinic.id)).filter(
        Clinic.status == 'active',
        Clinic.subscription_expires_at != None,
        Clinic.subscription_expires_at <= week_ahead,
        Clinic.subscription_expires_at >= datetime.utcnow(),
    ).scalar()

    # Approval SLA: oldest pending clinic
    oldest_pending = db.query(func.min(Clinic.created_at)).filter(Clinic.status == 'pending').scalar()
    oldest_pending_days = None
    if oldest_pending:
        oldest_pending_days = (datetime.utcnow() - oldest_pending).days

    return {
        "total_clinics":       total,
        "active_clinics":      active,
        "pending_clinics":     pending,
        "suspended_clinics":   suspended,
        "revoked_clinics":     revoked,
        "total_doctors":       total_doctors,
        "total_patients":      total_patients,
        "pending_staff":       pending_staff,
        "new_this_month":      new_this_month,
        "mrr":                 mrr,
        "rate_card":           rc,
        "appointments_today":  appts_today,
        "invoices_today":      invoices_today,
        "new_patients_today":  new_patients_today,
        "module_adoption":     module_adoption,
        "expiring_soon":       expiring_soon,
        "oldest_pending_days": oldest_pending_days,
    }


# ── Clinics ───────────────────────────────────────────────────────────────────

@router.get("/clinics/pending")
def pending_clinics(db: Session = Depends(get_db), current=Depends(get_current_platform_admin)):
    clinics = db.query(Clinic).filter(
        Clinic.status == "pending"
    ).order_by(Clinic.created_at.desc()).all()
    rc = _get_rate_card(db)
    return [_clinic_summary(c, db, rc) for c in clinics]


@router.get("/clinics")
def list_all_clinics(
    status: Optional[str] = None,
    search: Optional[str] = None,
    plan: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    q = db.query(Clinic)
    if status:
        q = q.filter(Clinic.status == status)
    if search:
        q = q.filter(Clinic.name.ilike(f"%{search}%") | Clinic.city.ilike(f"%{search}%"))
    if plan:
        q = q.filter(Clinic.subscription_plan == plan)
    clinics = q.order_by(Clinic.created_at.desc()).offset(skip).limit(limit).all()
    rc = _get_rate_card(db)
    return [_clinic_summary(c, db, rc) for c in clinics]


@router.get("/clinics/{clinic_id}")
def get_clinic_detail(
    clinic_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(404, "Clinic not found")

    summary = _clinic_summary(clinic, db)

    # All staff
    staff_list = db.query(Staff).filter(Staff.clinic_id == clinic_id).order_by(Staff.role).all()
    summary["staff"] = [{
        "id":            s.id,
        "full_name":     s.full_name,
        "email":         s.email,
        "mobile":        s.mobile,
        "role":          s.role,
        "is_active":     s.is_active,
        "license_number": s.license_number,
        "created_at":    str(s.created_at),
    } for s in staff_list]

    # Branches
    branches = db.query(Branch).filter(Branch.clinic_id == clinic_id).all()
    summary["branches"] = [{"id": b.id, "name": b.name, "city": b.city, "is_active": b.is_active} for b in branches]

    # Billing breakdown
    rc = _get_rate_card(db)
    plan = clinic.subscription_plan or "free"
    rate = rc.get(plan, {"price_per_doctor": 0, "max_doctors": 2, "label": "Free"})
    doctor_count = _doctor_count(db, clinic_id)
    summary["billing"] = {
        "plan":              plan,
        "price_per_doctor":  rate["price_per_doctor"],
        "active_doctors":    doctor_count,
        "monthly_total":     doctor_count * rate["price_per_doctor"],
        "rate_card":         rc,
    }

    # Audit log for this clinic
    logs = db.query(AuditLog).filter(
        AuditLog.target_type == "clinic", AuditLog.target_id == clinic_id
    ).order_by(AuditLog.created_at.desc()).limit(20).all()
    summary["audit_log"] = [{
        "action":     l.action,
        "admin_name": l.admin_name,
        "reason":     l.reason,
        "comment":    l.comment,
        "created_at": str(l.created_at),
    } for l in logs]

    return summary


# ── Clinic Actions ────────────────────────────────────────────────────────────

@router.post("/clinics/{clinic_id}/create-manager")
def create_clinic_manager(
    clinic_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    """Super admin creates a Clinic Manager account for an approved clinic."""
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(404, "Clinic not found")

    email  = body.get("email")
    mobile = body.get("mobile")
    if not body.get("full_name"):
        raise HTTPException(400, "full_name is required")
    if email and db.query(Staff).filter(Staff.email == email).first():
        raise HTTPException(400, "Email already registered")
    if mobile and db.query(Staff).filter(Staff.mobile == mobile).first():
        raise HTTPException(400, "Mobile already registered")

    temp_password = _generate_temp_password()

    manager = Staff(
        clinic_id       = clinic_id,
        full_name       = body["full_name"],
        email           = email,
        mobile          = mobile,
        hashed_password = hash_password(temp_password),
        role            = "clinic_manager",
        is_active       = True,
        is_first_login  = True,
        temp_pw_expiry  = datetime.utcnow() + timedelta(hours=48),
    )
    db.add(manager)
    db.flush()
    manager.username = _generate_username(body["full_name"], db)
    _log(db, "created_manager", "staff", clinic_id, body["full_name"], current)
    db.commit()
    db.refresh(manager)

    # Temp password returned in response only — not logged

    return {
        "id":            manager.id,
        "full_name":     manager.full_name,
        "email":         manager.email,
        "role":          manager.role,
        "username":      manager.username,
        "temp_password": temp_password,
        "message":       "Clinic Manager created. Share credentials immediately — shown only once.",
    }


@router.put("/clinics/{clinic_id}/approve")
def approve_clinic(clinic_id: int, db: Session = Depends(get_db), current=Depends(get_current_platform_admin)):
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(404, "Clinic not found")
    clinic.status = "active"
    _sync_clinic_status(clinic)

    # Issue credentials to clinic_admin (first doctor/owner)
    admin_staff = db.query(Staff).filter(
        Staff.clinic_id == clinic_id,
        Staff.role == "clinic_admin",
    ).first()

    issued = None
    if admin_staff:
        if not admin_staff.username:
            admin_staff.username = _generate_username(admin_staff.full_name, db)
        temp_password = _generate_temp_password()
        admin_staff.hashed_password = hash_password(temp_password)
        admin_staff.is_first_login  = True
        admin_staff.temp_pw_expiry  = datetime.utcnow() + timedelta(hours=48)
        admin_staff.is_active       = True
        issued = {"username": admin_staff.username, "temp_password": temp_password, "staff_name": admin_staff.full_name}
        pass  # temp_password returned in response only — not logged

    _log(db, "approved_clinic", "clinic", clinic_id, clinic.name, current)
    db.commit()

    response = {"message": f"{clinic.name} approved and is now live"}
    if issued:
        response["credentials"] = issued
        response["note"] = "Share these credentials with the clinic owner. Temp password expires in 48 hours."
    return response


@router.put("/clinics/{clinic_id}/reject")
def reject_clinic(
    clinic_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(404, "Clinic not found")
    clinic.status = "revoked"
    clinic.rejection_reason = body.get("reason", "")
    _sync_clinic_status(clinic)
    _log(db, "rejected_clinic", "clinic", clinic_id, clinic.name, current,
         reason=body.get("reason"), comment=body.get("comment"))
    db.commit()
    return {"message": f"{clinic.name} rejected"}


@router.put("/clinics/{clinic_id}/suspend")
def suspend_clinic(
    clinic_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(404, "Clinic not found")
    reason = body.get("reason", "")
    if reason not in SUSPENSION_REASONS:
        raise HTTPException(400, f"reason must be one of {SUSPENSION_REASONS}")
    clinic.status = "suspended"
    clinic.suspension_reason = reason
    clinic.suspension_comment = body.get("comment", "")
    _sync_clinic_status(clinic)
    db.query(Staff).filter(Staff.clinic_id == clinic_id).update({"is_active": False})
    _log(db, "suspended_clinic", "clinic", clinic_id, clinic.name, current,
         reason=reason, comment=body.get("comment"))
    db.commit()
    return {"message": f"{clinic.name} suspended"}


@router.put("/clinics/{clinic_id}/revoke")
def revoke_clinic(
    clinic_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(404, "Clinic not found")
    clinic.status = "revoked"
    clinic.suspension_reason = body.get("reason", "")
    clinic.suspension_comment = body.get("comment", "")
    _sync_clinic_status(clinic)
    db.query(Staff).filter(Staff.clinic_id == clinic_id).update({"is_active": False})
    _log(db, "revoked_clinic", "clinic", clinic_id, clinic.name, current,
         reason=body.get("reason"), comment=body.get("comment"))
    db.commit()
    return {"message": f"{clinic.name} revoked"}


@router.put("/clinics/{clinic_id}/reactivate")
def reactivate_clinic(clinic_id: int, db: Session = Depends(get_db), current=Depends(get_current_platform_admin)):
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(404, "Clinic not found")
    clinic.status = "active"
    clinic.suspension_reason = None
    clinic.suspension_comment = None
    _sync_clinic_status(clinic)
    roles_auto_activate = ['clinic_admin', 'clinic_manager', 'doctor', 'receptionist']
    db.query(Staff).filter(
        Staff.clinic_id == clinic_id, Staff.role.in_(roles_auto_activate)
    ).update({"is_active": True})
    _log(db, "reactivated_clinic", "clinic", clinic_id, clinic.name, current)
    db.commit()
    return {"message": f"{clinic.name} reactivated"}


@router.put("/clinics/{clinic_id}/plan")
def change_plan(
    clinic_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    plan = body.get("plan")
    rc = _get_rate_card(db)
    if plan not in rc:
        raise HTTPException(400, f"Plan must be one of {list(rc.keys())}")
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(404, "Clinic not found")
    old_plan = clinic.subscription_plan
    active_doctors = _doctor_count(db, clinic_id)
    max_allowed = rc[plan]["max_doctors"]
    if active_doctors > max_allowed:
        raise HTTPException(400,
            f"Cannot downgrade to {plan}: clinic has {active_doctors} active doctors "
            f"but {plan} plan allows max {max_allowed}. Deactivate excess doctors first.")
    clinic.subscription_plan = plan
    clinic.subscription_status = "active"
    _log(db, "changed_plan", "clinic", clinic_id, clinic.name, current,
         reason=f"{old_plan} → {plan}")
    db.commit()
    return {"message": f"Plan changed to {plan}", "monthly_bill": active_doctors * rc[plan]["price_per_doctor"]}


# ── Staff Verification ────────────────────────────────────────────────────────

@router.get("/staff/pending")
def pending_staff(db: Session = Depends(get_db), current=Depends(get_current_platform_admin)):
    staff_list = db.query(Staff).filter(
        Staff.role.in_(ROLES_NEEDING_VERIFICATION), Staff.is_active == False
    ).order_by(Staff.created_at.desc()).all()
    result = []
    for s in staff_list:
        clinic = db.query(Clinic).filter(Clinic.id == s.clinic_id).first()
        result.append({
            "id":            s.id,
            "full_name":     s.full_name,
            "email":         s.email,
            "mobile":        s.mobile,
            "role":          s.role,
            "clinic_id":     s.clinic_id,
            "clinic_name":   clinic.name if clinic else "—",
            "license_number": s.license_number,
            "license_document_url": s.license_document_url,
            "created_at":    str(s.created_at),
            "is_reapplicant": False,
        })
    return result


@router.put("/staff/{staff_id}/verify")
def verify_staff(staff_id: int, db: Session = Depends(get_db), current=Depends(get_current_platform_admin)):
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(404, "Staff not found")

    # Generate username if not already set
    if not staff.username:
        staff.username = _generate_username(staff.full_name, db)

    # Issue temporary password
    temp_password = _generate_temp_password()
    staff.hashed_password = hash_password(temp_password)
    staff.is_first_login  = True
    staff.temp_pw_expiry  = datetime.utcnow() + timedelta(hours=48)
    staff.is_active = True

    _log(db, "verified_staff", "staff", staff_id, staff.full_name, current)
    db.commit()

    # Log credentials to console (email/SMS to be wired in Phase 2)
    # Temp password returned in response only — not logged

    return {
        "message":      f"{staff.full_name} ({staff.role}) verified",
        "username":     staff.username,
        "temp_password": temp_password,
        "note":         "Share these credentials with the staff member. Temp password expires in 48 hours.",
    }


@router.post("/staff/{staff_id}/reset-password")
def reset_staff_password(
    staff_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    """Reissue temporary password. Forces password reset on next login. Old password immediately invalidated."""
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    temp_password = _generate_temp_password()
    staff.hashed_password = hash_password(temp_password)
    staff.is_first_login  = True
    staff.temp_pw_expiry  = datetime.utcnow() + timedelta(hours=48)
    db.commit()
    _log(db, "reset_password", "staff", staff_id, staff.full_name, current)

    # Temp password returned in response only — not logged

    return {
        "message":       f"New temporary password issued for {staff.full_name}",
        "username":      staff.username,
        "temp_password": temp_password,
        "note":          "Share this immediately. It expires in 48 hours and is invalidated after first use.",
    }


@router.post("/platform-admin/reset-password")
def reset_platform_admin_password(
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    """Reset own platform admin password."""
    temp_password = (
        secrets.choice(_string.ascii_uppercase) +
        ''.join(secrets.choice(_string.ascii_lowercase) for _ in range(4)) +
        '-' +
        ''.join(secrets.choice(_string.digits) for _ in range(4)) +
        '-' +
        secrets.choice(_string.ascii_uppercase) +
        ''.join(secrets.choice(_string.ascii_lowercase) for _ in range(4))
    )
    current.hashed_password = hash_password(temp_password)
    db.commit()
    return {"temp_password": temp_password, "note": "Save this immediately."}


@router.put("/staff/{staff_id}/reject")
def reject_staff(
    staff_id: int,
    body: dict = {},
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(404, "Staff not found")
    staff.is_active = False
    _log(db, "rejected_staff", "staff", staff_id, staff.full_name, current,
         reason=body.get("reason"), comment=body.get("comment"))
    db.commit()
    return {"message": f"{staff.full_name} rejected"}


# ── Audit Log ─────────────────────────────────────────────────────────────────

@router.get("/audit-log")
def get_audit_log(
    target_type: Optional[str] = None,
    action: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    clinic_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    q = db.query(AuditLog)
    if target_type:
        q = q.filter(AuditLog.target_type == target_type)
    if action:
        q = q.filter(AuditLog.action == action)
    if clinic_id:
        q = q.filter(AuditLog.target_id == clinic_id)
    try:
        if date_from:
            q = q.filter(AuditLog.created_at >= datetime.fromisoformat(date_from))
        if date_to:
            q = q.filter(AuditLog.created_at <= datetime.fromisoformat(date_to))
    except ValueError:
        raise HTTPException(400, "Invalid date format. Use ISO 8601 (YYYY-MM-DD)")
    logs = q.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    return [{
        "id":          l.id,
        "action":      l.action,
        "target_type": l.target_type,
        "target_id":   l.target_id,
        "target_name": l.target_name,
        "admin_name":  l.admin_name,
        "reason":      l.reason,
        "comment":     l.comment,
        "created_at":  str(l.created_at),
    } for l in logs]


# ── Reports ───────────────────────────────────────────────────────────────────

@router.get("/reports")
def get_reports(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    # Default: last 30 days
    end = datetime.utcnow()
    start = end - timedelta(days=30)
    try:
        if date_from:
            start = datetime.fromisoformat(date_from)
        if date_to:
            end = datetime.fromisoformat(date_to)
    except ValueError:
        raise HTTPException(400, "Invalid date format. Use ISO 8601 (YYYY-MM-DD)")

    # Clinics registered over time (by month)
    all_clinics = db.query(Clinic).all()
    monthly_reg = {}
    for c in all_clinics:
        if c.created_at:
            key = c.created_at.strftime("%Y-%m")
            monthly_reg[key] = monthly_reg.get(key, 0) + 1

    # Status distribution
    status_dist = {
        "active":    db.query(func.count(Clinic.id)).filter(Clinic.status == "active").scalar(),
        "pending":   db.query(func.count(Clinic.id)).filter(Clinic.status == "pending").scalar(),
        "suspended": db.query(func.count(Clinic.id)).filter(Clinic.status == "suspended").scalar(),
        "revoked":   db.query(func.count(Clinic.id)).filter(Clinic.status == "revoked").scalar(),
    }

    # Plan distribution
    rc = _get_rate_card(db)
    plan_dist = {}
    for plan in rc:
        plan_dist[plan] = db.query(func.count(Clinic.id)).filter(
            Clinic.subscription_plan == plan, Clinic.status == "active"
        ).scalar()

    # Top cities
    cities_raw = db.query(Clinic.city, func.count(Clinic.id)).filter(
        Clinic.status == "active", Clinic.city != None
    ).group_by(Clinic.city).order_by(func.count(Clinic.id).desc()).limit(10).all()
    top_cities = [{"city": c, "count": n} for c, n in cities_raw]

    # Billing summary per active clinic
    active_clinics = db.query(Clinic).filter(Clinic.status == "active").all()
    billing_rows = []
    total_mrr = 0
    for c in active_clinics:
        plan = c.subscription_plan or "free"
        rate = rc.get(plan, {"price_per_doctor": 0})
        doctors = _doctor_count(db, c.id)
        bill = doctors * rate["price_per_doctor"]
        total_mrr += bill
        billing_rows.append({
            "clinic_name": c.name,
            "city":        c.city,
            "plan":        plan,
            "doctors":     doctors,
            "monthly_bill": bill,
        })
    billing_rows.sort(key=lambda x: x["monthly_bill"], reverse=True)

    # Staff verified this period
    verified_count = db.query(func.count(AuditLog.id)).filter(
        AuditLog.action == "verified_staff",
        AuditLog.created_at >= start,
        AuditLog.created_at <= end,
    ).scalar()

    # ── Additional aggregates for the admin Reports UI ──────────────────
    total_doctors  = db.query(func.count(Staff.id)).filter(
        Staff.role == "doctor", Staff.is_active == True
    ).scalar()
    total_patients = db.query(func.count(Patient.id)).scalar()
    new_registrations = db.query(func.count(Clinic.id)).filter(
        Clinic.created_at >= start, Clinic.created_at <= end
    ).scalar()

    # Billing aggregated by plan (one row per plan)
    by_plan = {}
    for c in active_clinics:
        plan = c.subscription_plan or "free"
        rate = rc.get(plan, {"price_per_doctor": 0})
        doctors = _doctor_count(db, c.id)
        agg = by_plan.setdefault(plan, {
            "plan": plan,
            "clinic_count": 0,
            "total_doctors": 0,
            "price_per_doctor": rate["price_per_doctor"],
            "revenue": 0,
        })
        agg["clinic_count"]  += 1
        agg["total_doctors"] += doctors
        agg["revenue"]       += doctors * rate["price_per_doctor"]
    billing_by_plan = list(by_plan.values())

    return {
        "period":          {"from": str(start.date()), "to": str(end.date())},
        "monthly_registrations": sorted(monthly_reg.items()),
        "status_distribution":   status_dist,
        "plan_distribution":     plan_dist,
        "top_cities":            top_cities,
        "billing_summary":       billing_rows[:20],
        "total_mrr":             total_mrr,
        "staff_verified_period": verified_count,
        # Aliases / extra keys consumed by the admin Reports page
        "clinic_status_distribution": status_dist,
        "mrr":                   total_mrr,
        "total_doctors":         total_doctors,
        "total_patients":        total_patients,
        "new_registrations":     new_registrations,
        "billing_by_plan":       billing_by_plan,
    }


# ── Platform Admin Management ─────────────────────────────────────────────────

@router.post("/admins")
def create_platform_admin(
    body: dict,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    existing = db.query(PlatformAdmin).filter(PlatformAdmin.email == body.get("email")).first()
    if existing:
        raise HTTPException(400, "Email already registered")
    admin = PlatformAdmin(
        full_name=body.get("full_name"),
        email=body.get("email"),
        hashed_password=hash_password(body.get("password")),
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return {"id": admin.id, "email": admin.email, "message": "Platform admin created"}


@router.get("/bhid/{bh_id}")
def platform_bhid_lookup(
    bh_id: str,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    """Look up a patient by BH ID across all clinics."""
    from app.models.models import Patient, PatientUser

    patients = db.query(Patient).filter(
        Patient.bh_id == bh_id.upper()
    ).all()

    if not patients:
        patients = db.query(Patient).filter(
            Patient.uhid == bh_id.upper()
        ).all()

    if not patients:
        raise HTTPException(status_code=404, detail="No patient found with this BH ID")

    result = []
    for p in patients:
        clinic = db.query(Clinic).filter(Clinic.id == p.clinic_id).first()
        portal_user = db.query(PatientUser).filter(PatientUser.mobile == p.mobile).first() if p.mobile else None
        result.append({
            "patient_id": p.id,
            "bh_id": p.bh_id,
            "uhid": p.uhid,
            "full_name": p.full_name,
            "mobile": p.mobile,
            "email": p.email,
            "gender": p.gender,
            "date_of_birth": str(p.date_of_birth) if p.date_of_birth else None,
            "clinic_name": clinic.name if clinic else "Unknown",
            "clinic_id": p.clinic_id,
            "has_portal_account": portal_user is not None,
            "portal_active": portal_user.is_active if portal_user else False,
            "created_at": str(p.created_at),
        })

    return {"bh_id": bh_id.upper(), "records": result, "total": len(result)}


@router.get("/feedback")
def get_unread_feedback(
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    """Return unread feedback entries, newest first, up to 50."""
    entries = (
        db.query(Feedback)
        .filter(Feedback.is_read == False)
        .order_by(Feedback.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id":         e.id,
            "name":       e.name,
            "email":      e.email,
            "message":    e.message,
            "type":       e.type,
            "is_read":    e.is_read,
            "created_at": str(e.created_at),
        }
        for e in entries
    ]


@router.post("/feedback/{feedback_id}/read")
def mark_feedback_read(
    feedback_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    """Mark a feedback entry as read."""
    entry = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not entry:
        raise HTTPException(404, "Feedback not found")
    entry.is_read = True
    db.commit()
    return {"success": True}


@router.get("/clinics/{clinic_id}/staff")
def get_clinic_staff(
    clinic_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    """Get all staff members for a clinic."""
    staff = db.query(Staff).filter(Staff.clinic_id == clinic_id).order_by(Staff.role, Staff.full_name).all()
    return [
        {
            "id": s.id,
            "full_name": s.full_name,
            "email": s.email,
            "mobile": s.mobile,
            "role": s.role,
            "is_active": s.is_active,
            "branch_id": s.branch_id,
            "created_at": str(s.created_at),
        }
        for s in staff
    ]


# ── Hospital / Inpatient Settings (platform-admin level) ──────────────────────

@router.get("/clinics/{clinic_id}/org-config")
def admin_get_org_config(
    clinic_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(404, "Clinic not found")
    return {
        "org_type":     getattr(clinic, "org_type", "clinic"),
        "wards_enabled": getattr(clinic, "wards_enabled", False),
        "clinic_prefix": clinic.clinic_prefix,
    }


@router.put("/clinics/{clinic_id}/org-config")
def admin_update_org_config(
    clinic_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(404, "Clinic not found")
    if "org_type" in body:
        clinic.org_type = body["org_type"]
    if "wards_enabled" in body:
        clinic.wards_enabled = body["wards_enabled"]
    if "clinic_prefix" in body:
        clinic.clinic_prefix = body["clinic_prefix"]
    db.commit()
    return {"detail": "org config updated"}


@router.get("/clinics/{clinic_id}/departments")
def admin_list_departments(
    clinic_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    depts = db.query(Department).filter(Department.clinic_id == clinic_id).all()
    return [
        {"id": d.id, "name": d.name, "code": d.code, "dept_type": d.dept_type, "color_hex": d.color_hex, "is_active": d.is_active}
        for d in depts
    ]


@router.post("/clinics/{clinic_id}/departments")
def admin_create_department(
    clinic_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    dept = Department(
        clinic_id=clinic_id,
        name=body["name"],
        code=body.get("code"),
        dept_type=body.get("dept_type", "clinical"),
        color_hex=body.get("color_hex"),
        is_active=body.get("is_active", True),
    )
    db.add(dept); db.commit(); db.refresh(dept)
    return {"id": dept.id, "name": dept.name}


@router.put("/clinics/{clinic_id}/departments/{dept_id}")
def admin_update_department(
    clinic_id: int, dept_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    dept = db.query(Department).filter(Department.id == dept_id, Department.clinic_id == clinic_id).first()
    if not dept:
        raise HTTPException(404, "Department not found")
    for field in ("name", "code", "dept_type", "color_hex", "is_active"):
        if field in body:
            setattr(dept, field, body[field])
    db.commit()
    return {"detail": "updated"}


@router.delete("/clinics/{clinic_id}/departments/{dept_id}")
def admin_delete_department(
    clinic_id: int, dept_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    dept = db.query(Department).filter(Department.id == dept_id, Department.clinic_id == clinic_id).first()
    if not dept:
        raise HTTPException(404, "Department not found")
    db.delete(dept); db.commit()
    return {"detail": "deleted"}


@router.get("/clinics/{clinic_id}/wards")
def admin_list_wards(
    clinic_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    wards = db.query(Ward).filter(Ward.clinic_id == clinic_id).all()
    return [
        {"id": w.id, "name": w.name, "floor": w.floor, "wing": w.wing, "ward_type": w.ward_type, "total_beds": w.total_beds, "department_id": w.department_id}
        for w in wards
    ]


@router.post("/clinics/{clinic_id}/wards")
def admin_create_ward(
    clinic_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    ward = Ward(
        clinic_id=clinic_id,
        name=body["name"],
        floor=body.get("floor"),
        wing=body.get("wing"),
        ward_type=body.get("ward_type", "general"),
        total_beds=int(body.get("total_beds") or 0),
        department_id=body.get("department_id"),
    )
    db.add(ward); db.commit(); db.refresh(ward)
    return {"id": ward.id, "name": ward.name}


@router.put("/clinics/{clinic_id}/wards/{ward_id}")
def admin_update_ward(
    clinic_id: int, ward_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    ward = db.query(Ward).filter(Ward.id == ward_id, Ward.clinic_id == clinic_id).first()
    if not ward:
        raise HTTPException(404, "Ward not found")
    for field in ("name", "floor", "wing", "ward_type", "total_beds", "department_id"):
        if field in body:
            setattr(ward, field, body[field])
    db.commit()
    return {"detail": "updated"}


@router.delete("/clinics/{clinic_id}/wards/{ward_id}")
def admin_delete_ward(
    clinic_id: int, ward_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    ward = db.query(Ward).filter(Ward.id == ward_id, Ward.clinic_id == clinic_id).first()
    if not ward:
        raise HTTPException(404, "Ward not found")
    db.delete(ward); db.commit()
    return {"detail": "deleted"}


@router.get("/clinics/{clinic_id}/beds")
def admin_list_beds(
    clinic_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    beds = db.query(Bed).filter(Bed.clinic_id == clinic_id).all()
    return [
        {"id": b.id, "bed_number": b.bed_number, "bed_type": b.bed_type, "status": b.status, "ward_id": b.ward_id}
        for b in beds
    ]


@router.post("/clinics/{clinic_id}/beds")
def admin_create_bed(
    clinic_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    bed = Bed(
        clinic_id=clinic_id,
        bed_number=body["bed_number"],
        bed_type=body.get("bed_type", "general"),
        status="vacant",
        ward_id=int(body["ward_id"]),
    )
    db.add(bed); db.commit(); db.refresh(bed)
    return {"id": bed.id, "bed_number": bed.bed_number}


@router.put("/clinics/{clinic_id}/beds/{bed_id}")
def admin_update_bed(
    clinic_id: int, bed_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    bed = db.query(Bed).filter(Bed.id == bed_id, Bed.clinic_id == clinic_id).first()
    if not bed:
        raise HTTPException(404, "Bed not found")
    for field in ("bed_number", "bed_type", "status", "ward_id"):
        if field in body:
            setattr(bed, field, body[field])
    db.commit()
    return {"detail": "updated"}


# ── Plan Config (editable pricing) ───────────────────────────────────────────

@router.get("/plan-config")
def get_plan_config(
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    return _get_plan_config(db)


@router.put("/plan-config")
def update_plan_config(
    body: dict,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    if "plans" not in body:
        raise HTTPException(400, "Body must contain a 'plans' key")
    row = db.query(PlatformSetting).filter(PlatformSetting.key == "plan_config").first()
    if row:
        row.value = body
    else:
        row = PlatformSetting(key="plan_config", value=body)
        db.add(row)
    _log(db, "updated_plan_config", "platform", 0, "plan_config", current)
    db.commit()
    return {"message": "Plan configuration saved", "config": body}


# ── Subscription Payments ─────────────────────────────────────────────────────

@router.post("/clinics/{clinic_id}/payment")
def record_payment(
    clinic_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(404, "Clinic not found")

    amount = body.get("amount")
    if not amount or float(amount) <= 0:
        raise HTTPException(400, "amount must be > 0")

    method = body.get("method", "cash")
    valid_methods = ["upi", "neft", "imps", "cash", "cheque", "razorpay", "bank_transfer"]
    if method not in valid_methods:
        raise HTTPException(400, f"method must be one of {valid_methods}")

    payment = SubscriptionPayment(
        clinic_id   = clinic_id,
        amount      = Decimal(str(amount)),
        method      = method,
        reference   = body.get("reference"),
        notes       = body.get("notes"),
        period_from = body.get("period_from"),
        period_to   = body.get("period_to"),
        recorded_by = current.id,
    )
    db.add(payment)

    # Optionally activate or extend the subscription
    if body.get("activate"):
        clinic.subscription_status = "active"
        if body.get("period_to"):
            try:
                clinic.subscription_expires_at = datetime.fromisoformat(str(body["period_to"]))
            except Exception:
                pass

    _log(db, "recorded_payment", "clinic", clinic_id, clinic.name, current,
         reason=f"₹{amount} via {method}", comment=body.get("notes"))
    db.commit()
    db.refresh(payment)
    return {
        "id":          payment.id,
        "clinic_id":   payment.clinic_id,
        "amount":      float(payment.amount),
        "method":      payment.method,
        "reference":   payment.reference,
        "period_from": str(payment.period_from) if payment.period_from else None,
        "period_to":   str(payment.period_to) if payment.period_to else None,
        "created_at":  str(payment.created_at),
        "message":     "Payment recorded",
    }


@router.get("/clinics/{clinic_id}/payments")
def get_clinic_payments(
    clinic_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(404, "Clinic not found")
    payments = db.query(SubscriptionPayment).filter(
        SubscriptionPayment.clinic_id == clinic_id
    ).order_by(SubscriptionPayment.created_at.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id":          p.id,
            "amount":      float(p.amount),
            "method":      p.method,
            "reference":   p.reference,
            "notes":       p.notes,
            "period_from": str(p.period_from) if p.period_from else None,
            "period_to":   str(p.period_to) if p.period_to else None,
            "created_at":  str(p.created_at),
        }
        for p in payments
    ]


@router.get("/payments")
def get_all_payments(
    method: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    q = db.query(SubscriptionPayment)
    if method:
        q = q.filter(SubscriptionPayment.method == method)
    if date_from:
        q = q.filter(SubscriptionPayment.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        q = q.filter(SubscriptionPayment.created_at <= datetime.fromisoformat(date_to))
    payments = q.order_by(SubscriptionPayment.created_at.desc()).offset(skip).limit(limit).all()
    result = []
    for p in payments:
        clinic = db.query(Clinic).filter(Clinic.id == p.clinic_id).first()
        result.append({
            "id":           p.id,
            "clinic_id":    p.clinic_id,
            "clinic_name":  clinic.name if clinic else "—",
            "clinic_city":  clinic.city if clinic else None,
            "amount":       float(p.amount),
            "method":       p.method,
            "reference":    p.reference,
            "notes":        p.notes,
            "period_from":  str(p.period_from) if p.period_from else None,
            "period_to":    str(p.period_to) if p.period_to else None,
            "created_at":   str(p.created_at),
        })
    total = db.query(func.sum(SubscriptionPayment.amount)).scalar() or 0
    return {"payments": result, "total_collected": float(total)}


@router.put("/clinics/{clinic_id}/extend")
def extend_subscription(
    clinic_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(404, "Clinic not found")
    days = int(body.get("days", 30))
    if days <= 0:
        raise HTTPException(400, "days must be > 0")
    base = clinic.subscription_expires_at or datetime.utcnow()
    if base < datetime.utcnow():
        base = datetime.utcnow()
    clinic.subscription_expires_at = base + timedelta(days=days)
    clinic.subscription_status = "active"
    _log(db, "extended_subscription", "clinic", clinic_id, clinic.name, current,
         reason=f"+{days} days")
    db.commit()
    return {
        "message": f"Subscription extended by {days} days",
        "new_expiry": str(clinic.subscription_expires_at.date()),
    }


# ── Patient Lookup (platform-wide) ────────────────────────────────────────────

@router.get("/patients/search")
def search_patients(
    q: Optional[str] = None,
    clinic_id: Optional[int] = None,
    state: Optional[str] = None,
    city: Optional[str] = None,
    gender: Optional[str] = None,
    age_from: Optional[int] = None,
    age_to: Optional[int] = None,
    reg_date_from: Optional[str] = None,
    reg_date_to: Optional[str] = None,
    has_portal_account: Optional[str] = None,
    blood_group: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
    current=Depends(get_current_platform_admin),
):
    q_obj = db.query(Patient)
    if q:
        q_obj = q_obj.filter(or_(
            Patient.full_name.ilike(f"%{q}%"),
            Patient.mobile.ilike(f"%{q}%"),
            Patient.bh_id.ilike(f"%{q}%"),
            Patient.uhid.ilike(f"%{q}%"),
        ))
    if clinic_id:
        q_obj = q_obj.filter(Patient.clinic_id == clinic_id)
    if state:
        q_obj = q_obj.filter(Patient.state == state)
    if city:
        q_obj = q_obj.filter(Patient.city.ilike(f"%{city}%"))
    if gender:
        q_obj = q_obj.filter(Patient.gender == gender)
    if blood_group:
        q_obj = q_obj.filter(Patient.blood_group == blood_group)
    if age_from:
        today = date.today()
        cutoff = today.replace(year=today.year - age_from)
        q_obj = q_obj.filter(Patient.date_of_birth <= cutoff)
    if age_to:
        today = date.today()
        cutoff = today.replace(year=today.year - age_to)
        q_obj = q_obj.filter(Patient.date_of_birth >= cutoff)
    if reg_date_from:
        q_obj = q_obj.filter(Patient.created_at >= reg_date_from)
    if reg_date_to:
        q_obj = q_obj.filter(Patient.created_at <= reg_date_to + "T23:59:59")
    if has_portal_account == "yes":
        q_obj = q_obj.filter(Patient.portal_user_id != None)
    elif has_portal_account == "no":
        q_obj = q_obj.filter(Patient.portal_user_id == None)

    total = q_obj.count()
    page = max(1, page)
    patients = q_obj.order_by(Patient.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    results = []
    for p in patients:
        clinic = db.query(Clinic).filter(Clinic.id == p.clinic_id).first()
        last_visit = db.query(func.max(Appointment.appointment_date)).filter(Appointment.patient_id == p.id).scalar()
        age = None
        if p.date_of_birth:
            age = _years_between(date.today(), p.date_of_birth)
        results.append({
            "patient_id": p.id, "bh_id": p.bh_id or "", "uhid": p.uhid or "",
            "full_name": p.full_name, "mobile": p.mobile or "", "gender": p.gender or "",
            "age": age, "blood_group": p.blood_group or "",
            "clinic_name": clinic.name if clinic else "", "city": p.city or "",
            "state": p.state or "", "created_at": str(p.created_at.date()) if p.created_at else "",
            "has_portal_account": p.portal_user_id is not None,
            "last_visit": str(last_visit) if last_visit else None,
        })
    return {"total": total, "page": page, "page_size": page_size, "results": results}


@router.get("/patients/states")
def get_patient_states(db: Session = Depends(get_db), current=Depends(get_current_platform_admin)):
    rows = db.query(Patient.state).filter(
        Patient.state != None, Patient.state != ""
    ).distinct().order_by(Patient.state).all()
    return [r[0] for r in rows]


@router.get("/patients/{patient_id}/detail")
def get_patient_detail(patient_id: int, db: Session = Depends(get_db), current=Depends(get_current_platform_admin)):
    p = db.query(Patient).filter(Patient.id == patient_id).first()
    if not p:
        raise HTTPException(404, "Patient not found")
    clinic = db.query(Clinic).filter(Clinic.id == p.clinic_id).first()
    age = _years_between(date.today(), p.date_of_birth) if p.date_of_birth else None

    appts = db.query(Appointment).filter(Appointment.patient_id == p.id).order_by(Appointment.appointment_date.desc()).limit(25).all()
    timeline = [{
        "id": a.id, "date": str(a.appointment_date) if a.appointment_date else "",
        "status": a.status or "", "clinic_id": a.clinic_id,
    } for a in appts]

    tags = db.query(PatientTag.tag_name, PatientTag.icd10_code).filter(PatientTag.patient_id == p.id).all()
    diagnoses = [{"tag_name": t, "icd10_code": c or ""} for t, c in tags]

    total_appts = db.query(func.count(Appointment.id)).filter(Appointment.patient_id == p.id).scalar() or 0
    total_lab = db.query(func.count(LabOrder.id)).filter(LabOrder.patient_id == p.id).scalar() or 0
    total_rx = db.query(func.count(Prescription.id)).filter(Prescription.patient_id == p.id).scalar() or 0

    invoiced = db.query(func.sum(Invoice.total)).filter(Invoice.patient_id == p.id).scalar() or 0
    collected = db.query(func.sum(Invoice.amount_paid)).filter(Invoice.patient_id == p.id).scalar() or 0

    # All clinics where this patient appears (by bh_id across all patient records + appointments)
    clinic_ids = set()
    if p.clinic_id:
        clinic_ids.add(p.clinic_id)
    if p.bh_id:
        bh_clinic_rows = db.query(Patient.clinic_id).filter(
            Patient.bh_id == p.bh_id,
            Patient.clinic_id != None,
        ).distinct().all()
        for (cid,) in bh_clinic_rows:
            clinic_ids.add(cid)
    appt_clinic_ids = db.query(Appointment.clinic_id).filter(
        Appointment.patient_id == p.id, Appointment.clinic_id != None
    ).distinct().all()
    for (cid,) in appt_clinic_ids:
        clinic_ids.add(cid)
    hc_rows = db.query(Clinic).filter(Clinic.id.in_(clinic_ids)).all() if clinic_ids else []
    health_centers = [{"clinic_id": c.id, "name": c.name, "city": c.city or ""} for c in hc_rows]

    return {
        "patient_id": p.id, "full_name": p.full_name, "bh_id": p.bh_id or "", "uhid": p.uhid or "",
        "mobile": p.mobile or "", "email": p.email or "", "gender": p.gender or "", "age": age,
        "date_of_birth": str(p.date_of_birth) if p.date_of_birth else "", "blood_group": p.blood_group or "",
        "address": p.address or "", "city": p.city or "", "state": p.state or "", "pincode": p.pincode or "",
        "emergency_contact_name": p.emergency_contact_name or "", "emergency_contact_phone": p.emergency_contact_phone or "",
        "abha_id": p.abha_id or "", "has_portal_account": p.portal_user_id is not None,
        "created_at": str(p.created_at.date()) if p.created_at else "",
        "primary_clinic": clinic.name if clinic else "",
        "health_centers": health_centers,
        "timeline": timeline,
        "clinical": {
            "diagnoses": diagnoses,
            "total_appointments": total_appts,
            "total_lab_orders": total_lab,
            "total_prescriptions": total_rx,
        },
        "financial": {
            "total_invoiced": float(invoiced),
            "total_collected": float(collected),
            "outstanding": float(invoiced) - float(collected),
        },
    }


# ── Population Analytics ──────────────────────────────────────────────────────

@router.get("/analytics/population")
def get_population_analytics(db: Session = Depends(get_db), current=Depends(get_current_platform_admin)):
    today = date.today()

    gender = db.query(Patient.gender, func.count(Patient.id)).group_by(Patient.gender).all()

    blood = db.query(Patient.blood_group, func.count(Patient.id)).filter(
        Patient.blood_group != None
    ).group_by(Patient.blood_group).all()

    states = db.query(
        Patient.state, func.count(Patient.id).label('cnt')
    ).filter(Patient.state != None).group_by(Patient.state).order_by(func.count(Patient.id).desc()).limit(10).all()
    total_pts = db.query(func.count(Patient.id)).scalar() or 1

    all_pts = db.query(Patient.date_of_birth).filter(Patient.date_of_birth != None).all()
    age_buckets = {"0-10": 0, "11-20": 0, "21-30": 0, "31-40": 0, "41-50": 0, "51-60": 0, "61-70": 0, "71-80": 0, "81+": 0}
    for (dob,) in all_pts:
        age = _years_between(today, dob)
        if age <= 10: age_buckets["0-10"] += 1
        elif age <= 20: age_buckets["11-20"] += 1
        elif age <= 30: age_buckets["21-30"] += 1
        elif age <= 40: age_buckets["31-40"] += 1
        elif age <= 50: age_buckets["41-50"] += 1
        elif age <= 60: age_buckets["51-60"] += 1
        elif age <= 70: age_buckets["61-70"] += 1
        elif age <= 80: age_buckets["71-80"] += 1
        else: age_buckets["81+"] += 1

    try:
        tags = db.query(
            PatientTag.tag_name, func.count(func.distinct(PatientTag.patient_id)).label('cnt')
        ).group_by(PatientTag.tag_name).order_by(func.count(func.distinct(PatientTag.patient_id)).desc()).limit(20).all()
        disease_burden = [{"tag_name": t, "count": c} for t, c in tags]
    except Exception:
        disease_burden = []

    hc_perf = db.query(
        Patient.clinic_id, func.count(Patient.id).label('cnt')
    ).group_by(Patient.clinic_id).order_by(func.count(Patient.id).desc()).limit(20).all()
    hc_data = []
    for cid, cnt in hc_perf:
        c = db.query(Clinic).filter(Clinic.id == cid).first()
        if c:
            doctors = _doctor_count(db, cid)
            hc_data.append({"clinic_id": cid, "name": c.name, "city": c.city or "", "patient_count": cnt, "doctor_count": doctors})

    portal_pts = db.query(func.count(Patient.id)).filter(Patient.portal_user_id != None).scalar() or 0

    return {
        "gender_split": [{"gender": g or "unknown", "count": c} for g, c in gender],
        "blood_groups": [{"group": b, "count": c} for b, c in blood],
        "age_distribution": age_buckets,
        "top_states": [{"state": s, "count": c, "pct": round(c / total_pts * 100, 1)} for s, c in states],
        "disease_burden": disease_burden,
        "hc_performance": hc_data,
        "portal_adoption": {"total": total_pts, "portal_users": portal_pts, "pct": round(portal_pts / total_pts * 100, 1) if total_pts else 0},
    }


# ── Analytics Query (flexible report explorer) ────────────────────────────────

# Whitelist of tables allowed in dynamic column queries (all model tables).
_ALLOWED_TABLES = {
    "platform_admins", "clinics", "branches", "staff", "doctor_profiles",
    "doctor_schedules", "doctor_desk_assignments", "patients", "patient_users",
    "bh_state_groups", "bh_id_sequences", "bh_profiles", "appointments",
    "online_bookings", "vitals", "soap_notes", "clinic_patient_tags",
    "patient_tags", "encounter_access_logs", "barcode_master", "medicines",
    "prescriptions", "prescription_items", "lab_tests", "invoices",
    "invoice_items", "patient_referrals", "lab_orders", "lab_order_items",
    "lab_results", "imaging_orders", "imaging_results", "unmatched_results",
    "doctor_ratings", "audit_logs", "billing_waiver_logs", "suppliers",
    "purchase_orders", "purchase_order_items", "sales_returns",
    "sales_return_items", "drug_register", "medicine_batches",
    "stock_transactions", "chat_rooms", "chat_room_members",
    "internal_messages", "message_reads", "imaging_report_templates",
    "imaging_critical_alerts", "referring_doctors", "imaging_slots",
    "imaging_bookings", "departments", "wards", "beds", "admissions",
    "admission_transfers", "staff_departments", "appointment_token_sequences",
    "referrals", "vital_signs", "nursing_notes", "medication_administrations",
    "ward_rounds", "discharge_summaries", "progress_notes", "inpatient_charges",
    "inpatient_bills", "medication_orders", "clinical_orders",
    "documentation_sessions", "assessment_templates", "template_assignments",
    "password_reset_requests", "pharmacy_orders", "dispense_sessions",
    "dispense_items", "maintenance_requests", "platform_settings",
    "telehealth_sessions", "telehealth_session_events", "shift_types",
    "staff_groups", "staff_group_members", "schedule_entries", "leave_requests",
    "schedule_patterns", "schedule_publish_logs", "scheduler_settings",
    "insurance_claims", "billing_override_requests", "invoice_payments",
    "feedback", "form_templates", "form_responses", "assessment_forms",
    "assessment_form_versions", "form_pool", "form_assignments",
    "form_submissions", "form_alerts", "form_cosigns", "iview_flowsheets",
    "medical_terms", "drugs", "drug_interactions", "drug_dose_ranges",
    "drug_contraindications", "drug_counselling", "imaging_catalog",
    "visitor_policies", "visitor_passes", "disease_counselling",
    "subscription_payments",
}

# Column name validation: only allow identifiers (letters, digits, underscores).
_IDENT_RE = re.compile(r'^[a-zA-Z_][a-zA-Z0-9_]*$')


def _validate_identifier(name: str) -> str:
    """Raise 400 if name is not a safe SQL identifier; return it otherwise."""
    if not _IDENT_RE.match(name):
        raise HTTPException(status_code=400, detail=f"Invalid identifier: {name!r}")
    return name


@router.post("/analytics/query")
def run_analytics_query(body: dict, db: Session = Depends(get_db), current=Depends(get_current_platform_admin)):
    # ── Dynamic column-based query (frontend format) ──────────────────────────
    columns_req = body.get("columns")
    if columns_req:
        filters = body.get("filters", {}) or {}
        date_from = filters.get("date_from") or body.get("date_from")
        date_to = filters.get("date_to") or body.get("date_to")
        clinic_id = filters.get("clinic_id")

        # Validate and group columns by table.
        by_table: dict[str, list[str]] = {}
        for item in columns_req:
            tbl = item.get("table") or item.get("col", "").split(".")[0]
            col = item.get("col") or item.get("column")
            if not tbl or not col:
                raise HTTPException(status_code=400, detail="Each column entry must have 'table' and 'col'.")
            if tbl not in _ALLOWED_TABLES:
                raise HTTPException(status_code=400, detail=f"Table not allowed: {tbl!r}")
            _validate_identifier(tbl)
            _validate_identifier(col)
            by_table.setdefault(tbl, [])
            if col not in by_table[tbl]:
                by_table[tbl].append(col)

        if not by_table:
            return {"columns": [], "rows": [], "total": 0}

        # Build SELECT across tables using UNIONs — one SELECT per table, aligned
        # on a common set of output column keys.  Each table contributes rows with
        # columns that exist in that table; missing columns come out as NULL.
        all_col_keys = []
        seen = set()
        for tbl, cols in by_table.items():
            for c in cols:
                key = f"{tbl}.{c}"
                if key not in seen:
                    all_col_keys.append({"key": key, "label": f"{tbl}.{c}", "table": tbl, "col": c})
                    seen.add(key)

        union_parts = []
        params: dict = {}

        for tbl, cols in by_table.items():
            select_exprs = []
            for ck in all_col_keys:
                if ck["table"] == tbl and ck["col"] in cols:
                    select_exprs.append(f'CAST("{ck["col"]}" AS TEXT) AS "{ck["key"]}"')
                else:
                    select_exprs.append(f'NULL AS "{ck["key"]}"')

            where_clauses = ["1=1"]

            # Apply clinic_id filter if the table has a clinic_id column.
            # We do a safe check: only add if explicitly requested table has the column.
            # Since we cannot introspect without risk, we attempt it via SQL try approach —
            # instead, we conservatively apply only to known clinic-scoped tables.
            _clinic_scoped = {
                "clinics", "patients", "appointments", "online_bookings", "vitals",
                "soap_notes", "prescriptions", "lab_orders", "imaging_orders",
                "invoices", "admissions", "referrals", "pharmacy_orders",
                "discharge_summaries", "ward_rounds", "progress_notes",
                "inpatient_charges", "inpatient_bills", "clinical_orders",
                "medication_orders", "maintenance_requests", "staff", "branches",
            }
            if clinic_id and tbl in _clinic_scoped:
                param_key = f"clinic_id_{tbl}"
                where_clauses.append(f'clinic_id = :{param_key}')
                params[param_key] = int(clinic_id)

            if date_from:
                # Apply date filter on created_at if column exists conceptually; we use
                # a subquery-safe approach — only apply to tables known to have created_at.
                _has_created_at = {
                    "clinics", "patients", "appointments", "online_bookings",
                    "prescriptions", "lab_orders", "imaging_orders", "invoices",
                    "admissions", "referrals", "pharmacy_orders", "staff",
                    "audit_logs", "internal_messages",
                }
                if tbl in _has_created_at:
                    param_key = f"date_from_{tbl}"
                    where_clauses.append(f"created_at >= :{param_key}")
                    params[param_key] = date_from

            if date_to:
                _has_created_at = {
                    "clinics", "patients", "appointments", "online_bookings",
                    "prescriptions", "lab_orders", "imaging_orders", "invoices",
                    "admissions", "referrals", "pharmacy_orders", "staff",
                    "audit_logs", "internal_messages",
                }
                if tbl in _has_created_at:
                    param_key = f"date_to_{tbl}"
                    where_clauses.append(f"created_at <= :{param_key}")
                    params[param_key] = date_to + "T23:59:59"

            where_str = " AND ".join(where_clauses)
            select_str = ", ".join(select_exprs)
            union_parts.append(f'SELECT {select_str} FROM "{tbl}" WHERE {where_str}')

        full_sql = " UNION ALL ".join(union_parts) + " LIMIT 1000"
        result = db.execute(text(full_sql), params)
        col_names = list(result.keys())
        raw_rows = result.fetchall()

        out_rows = []
        for row in raw_rows:
            out_rows.append({col_names[i]: row[i] for i in range(len(col_names))})

        return {
            "columns": [{"key": ck["key"], "label": ck["label"]} for ck in all_col_keys],
            "rows": out_rows,
            "total": len(out_rows),
        }

    # ── Legacy dataset-based query (backward compat) ──────────────────────────
    dataset = body.get("dataset", "health_centers")
    date_from = body.get("date_from")
    date_to = body.get("date_to")
    filters = body.get("filters", {}) or {}

    if dataset == "health_centers":
        q = db.query(Clinic)
        if filters.get("status"):
            q = q.filter(Clinic.status.in_(filters["status"]))
        if filters.get("plan"):
            q = q.filter(Clinic.subscription_plan.in_(filters["plan"]))
        if date_from:
            q = q.filter(Clinic.created_at >= date_from)
        if date_to:
            q = q.filter(Clinic.created_at <= date_to + "T23:59:59")
        rows = q.all()
        return {
            "columns": [{"key": "name", "label": "Name"}, {"key": "status", "label": "Status"}, {"key": "plan", "label": "Plan"}, {"key": "city", "label": "City"}, {"key": "state", "label": "State"}],
            "rows": [{"name": r.name, "status": r.status, "plan": r.subscription_plan or "free", "city": r.city or "", "state": r.state or ""} for r in rows],
            "total_rows": len(rows),
            "total": len(rows),
        }

    elif dataset == "patients":
        q = db.query(Patient)
        if filters.get("clinic_ids"):
            q = q.filter(Patient.clinic_id.in_(filters["clinic_ids"]))
        if filters.get("gender"):
            q = q.filter(Patient.gender.in_(filters["gender"]))
        if date_from:
            q = q.filter(Patient.created_at >= date_from)
        if date_to:
            q = q.filter(Patient.created_at <= date_to + "T23:59:59")
        total = q.count()
        portal = q.filter(Patient.portal_user_id != None).count()
        rows = q.limit(500).all()
        return {
            "columns": [{"key": "full_name", "label": "Name"}, {"key": "gender", "label": "Gender"}, {"key": "city", "label": "City"}, {"key": "state", "label": "State"}, {"key": "created_at", "label": "Registered"}],
            "rows": [{"full_name": r.full_name, "gender": r.gender or "", "city": r.city or "", "state": r.state or "", "created_at": str(r.created_at.date()) if r.created_at else ""} for r in rows],
            "total_rows": total, "total": total, "portal_pct": round(portal / total * 100, 1) if total else 0,
        }

    elif dataset == "appointments":
        q = db.query(Appointment)
        if filters.get("clinic_ids"):
            q = q.filter(Appointment.clinic_id.in_(filters["clinic_ids"]))
        if filters.get("status"):
            q = q.filter(Appointment.status.in_(filters["status"]))
        if date_from:
            q = q.filter(Appointment.appointment_date >= date_from)
        if date_to:
            q = q.filter(Appointment.appointment_date <= date_to)
        total = q.count()
        completed = q.filter(Appointment.status == "completed").count()
        return {
            "columns": [{"key": "count", "label": "Total"}, {"key": "completed", "label": "Completed"}, {"key": "completion_pct", "label": "Completion %"}],
            "rows": [{"count": total, "completed": completed, "completion_pct": round(completed / total * 100, 1) if total else 0}],
            "total_rows": total,
            "total": total,
        }

    elif dataset == "revenue":
        q = db.query(Invoice)
        if filters.get("clinic_ids"):
            q = q.filter(Invoice.clinic_id.in_(filters["clinic_ids"]))
        if date_from:
            q = q.filter(Invoice.created_at >= date_from)
        if date_to:
            q = q.filter(Invoice.created_at <= date_to + "T23:59:59")
        invoiced = q.with_entities(func.sum(Invoice.total)).scalar() or 0
        collected = q.with_entities(func.sum(Invoice.amount_paid)).scalar() or 0
        return {
            "columns": [{"key": "invoiced", "label": "Total Invoiced"}, {"key": "collected", "label": "Collected"}, {"key": "outstanding", "label": "Outstanding"}],
            "rows": [{"invoiced": float(invoiced), "collected": float(collected), "outstanding": float(invoiced) - float(collected)}],
            "total_rows": 1,
            "total": 1,
        }

    return {"columns": [], "rows": [], "total_rows": 0, "total": 0}


# ── Clinic Clinical Stats ─────────────────────────────────────────────────────

@router.get("/clinics/{clinic_id}/clinical-stats")
def get_clinic_clinical_stats(clinic_id: int, db: Session = Depends(get_db), current=Depends(get_current_platform_admin)):
    total_patients = db.query(func.count(Patient.id)).filter(Patient.clinic_id == clinic_id).scalar() or 0
    total_appts = db.query(func.count(Appointment.id)).filter(Appointment.clinic_id == clinic_id).scalar() or 0
    total_lab = db.query(func.count(LabOrder.id)).filter(LabOrder.clinic_id == clinic_id).scalar() or 0
    total_rx = db.query(func.count(Prescription.id)).filter(Prescription.clinic_id == clinic_id).scalar() or 0

    top_docs = db.query(
        Staff.full_name, func.count(Appointment.id).label('cnt')
    ).join(DoctorProfile, DoctorProfile.staff_id == Staff.id
    ).join(Appointment, Appointment.doctor_id == DoctorProfile.id
    ).filter(Appointment.clinic_id == clinic_id
    ).group_by(Staff.id).order_by(func.count(Appointment.id).desc()).limit(10).all()

    return {
        "total_patients": total_patients, "total_appointments": total_appts,
        "total_lab_orders": total_lab, "total_prescriptions": total_rx,
        "top_doctors": [{"name": n, "appointments": c} for n, c in top_docs],
    }


# ── Clinic Billing Config ─────────────────────────────────────────────────────

@router.get("/clinics/{clinic_id}/billing-config")
def get_clinic_billing_config(clinic_id: int, db: Session = Depends(get_db), current=Depends(get_current_platform_admin)):
    setting = db.query(PlatformSetting).filter(PlatformSetting.key == f"billing_config_{clinic_id}").first()
    if not setting:
        return {
            "currency": "INR", "tax_rate": 18, "consultation_fee": 500,
            "enable_insurance": False, "payment_gateway": "razorpay",
            "auto_billing": False, "billing_cycle": "monthly",
            "late_fee_pct": 2, "discount_pct": 0,
        }
    return setting.value


@router.put("/clinics/{clinic_id}/billing-config")
def update_clinic_billing_config(clinic_id: int, body: dict, db: Session = Depends(get_db), current=Depends(get_current_platform_admin)):
    key = f"billing_config_{clinic_id}"
    setting = db.query(PlatformSetting).filter(PlatformSetting.key == key).first()
    if setting:
        setting.value = body
        setting.updated_at = datetime.utcnow()
        setting.updated_by = current.id
    else:
        setting = PlatformSetting(key=key, value=body, updated_at=datetime.utcnow(), updated_by=current.id)
        db.add(setting)
    db.commit()
    return {"ok": True, "key": key}
