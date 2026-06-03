from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import Optional
from datetime import datetime, date, timedelta
from app.db.session import get_db
from app.core.security import get_current_platform_admin, hash_password
from app.models.models import Clinic, Branch, Staff, Patient, Appointment, PlatformAdmin, AuditLog, Invoice

import re
import secrets
import string as _string

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

# ── Rate Card ─────────────────────────────────────────────────────────────────
RATE_CARD = {
    "free":       {"price_per_doctor": 0,    "max_doctors": 2,   "label": "Free"},
    "basic":      {"price_per_doctor": 999,  "max_doctors": 10,  "label": "Basic"},
    "pro":        {"price_per_doctor": 799,  "max_doctors": 999, "label": "Pro"},
    "enterprise": {"price_per_doctor": 0,    "max_doctors": 999, "label": "Enterprise"},
}

ROLES_NEEDING_VERIFICATION = ['pharmacist', 'lab_technician', 'imaging_tech', 'nurse']

SUSPENSION_REASONS = [
    "license_cancelled",
    "payment_failed",
    "compliance_issue",
    "other",
]

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


def _clinic_summary(c, db):
    admin = db.query(Staff).filter(Staff.clinic_id == c.id, Staff.role == "clinic_admin").first()
    doctors = _doctor_count(db, c.id)
    plan = c.subscription_plan or "free"
    rate = RATE_CARD.get(plan, RATE_CARD["free"])
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
        "doctor_count":  doctors,
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
    clinics = db.query(Clinic).filter(Clinic.status == "active").all()
    mrr = 0
    for c in clinics:
        plan = c.subscription_plan or "free"
        rate = RATE_CARD.get(plan, RATE_CARD["free"])
        doctors = _doctor_count(db, c.id)
        mrr += doctors * rate["price_per_doctor"]

    return {
        "total_clinics":    total,
        "active_clinics":   active,
        "pending_clinics":  pending,
        "suspended_clinics": suspended,
        "revoked_clinics":  revoked,
        "total_doctors":    total_doctors,
        "total_patients":   total_patients,
        "pending_staff":    pending_staff,
        "new_this_month":   new_this_month,
        "mrr":              mrr,
        "rate_card":        RATE_CARD,
    }


# ── Clinics ───────────────────────────────────────────────────────────────────

@router.get("/clinics/pending")
def pending_clinics(db: Session = Depends(get_db), current=Depends(get_current_platform_admin)):
    clinics = db.query(Clinic).filter(
        Clinic.status == "pending"
    ).order_by(Clinic.created_at.desc()).all()
    return [_clinic_summary(c, db) for c in clinics]


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
    return [_clinic_summary(c, db) for c in clinics]


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
    plan = clinic.subscription_plan or "free"
    rate = RATE_CARD.get(plan, RATE_CARD["free"])
    doctor_count = _doctor_count(db, clinic_id)
    summary["billing"] = {
        "plan":              plan,
        "price_per_doctor":  rate["price_per_doctor"],
        "active_doctors":    doctor_count,
        "monthly_total":     doctor_count * rate["price_per_doctor"],
        "rate_card":         RATE_CARD,
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

    print(f"[MANAGER CREATED] {manager.full_name} | username: {manager.username} | temp_password: {temp_password} | expires: 48h")

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
        print(f"[CLINIC APPROVED] {clinic.name} | admin: {admin_staff.full_name} | username: {admin_staff.username} | temp_password: {temp_password}")

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
    if plan not in RATE_CARD:
        raise HTTPException(400, f"Plan must be one of {list(RATE_CARD.keys())}")
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(404, "Clinic not found")
    old_plan = clinic.subscription_plan
    active_doctors = _doctor_count(db, clinic_id)
    max_allowed = RATE_CARD[plan]["max_doctors"]
    if active_doctors > max_allowed:
        raise HTTPException(400,
            f"Cannot downgrade to {plan}: clinic has {active_doctors} active doctors "
            f"but {plan} plan allows max {max_allowed}. Deactivate excess doctors first.")
    clinic.subscription_plan = plan
    clinic.subscription_status = "active"
    _log(db, "changed_plan", "clinic", clinic_id, clinic.name, current,
         reason=f"{old_plan} → {plan}")
    db.commit()
    return {"message": f"Plan changed to {plan}", "monthly_bill": active_doctors * RATE_CARD[plan]["price_per_doctor"]}


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
    print(f"[CREDENTIAL ISSUE] {staff.full_name} | role: {staff.role} | username: {staff.username} | temp_password: {temp_password} | expires: 48h")

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

    print(f"[PASSWORD REISSUE] {staff.full_name} | username: {staff.username} | temp_password: {temp_password} | expires: 48h")

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
    if date_from:
        q = q.filter(AuditLog.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        q = q.filter(AuditLog.created_at <= datetime.fromisoformat(date_to))
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
    if date_from:
        start = datetime.fromisoformat(date_from)
    if date_to:
        end = datetime.fromisoformat(date_to)

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
    plan_dist = {}
    for plan in RATE_CARD:
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
        rate = RATE_CARD.get(plan, RATE_CARD["free"])
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

    return {
        "period":          {"from": str(start.date()), "to": str(end.date())},
        "monthly_registrations": sorted(monthly_reg.items()),
        "status_distribution":   status_dist,
        "plan_distribution":     plan_dist,
        "top_cities":            top_cities,
        "billing_summary":       billing_rows[:20],
        "total_mrr":             total_mrr,
        "staff_verified_period": verified_count,
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
