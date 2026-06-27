from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os, shutil, calendar, secrets, string
from datetime import date

def _generate_temp_password() -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    while True:
        pwd = ''.join(secrets.choice(alphabet) for _ in range(12))
        if (any(c.isupper() for c in pwd) and any(c.islower() for c in pwd)
                and any(c.isdigit() for c in pwd) and any(c in "!@#$%" for c in pwd)):
            return pwd

from app.db.session import get_db
from app.core.security import (
    get_current_staff, hash_password,
    staff_is_restricted, staff_has_duty, staff_can_manage_role, staff_department_limit,
    assert_can_manage,
)
from app.core import ids
from app.core.config import settings
from app.models.models import (
    Clinic, Branch, Staff, DoctorProfile, DoctorSchedule,
    Appointment, Invoice, Patient, OnlineBooking, DoctorDeskAssignment,
    FollowUpReminder, Department, StaffDepartment, Admission, Bed
)
from app.services.email_service import send_welcome_email
from app.services.sms_service import send_sms
from datetime import datetime, timedelta

STAFF_PORTAL_URL = "https://staff.bharathhealthsystems.com"
MANAGER_SCOPE_LABELS = {"center": "Health Center Supervisor", "department": "Health Center Manager"}


def _normalize_mobile(raw) -> str:
    if raw in (None, ""):
        return ""
    digits = "".join(ch for ch in str(raw) if ch.isdigit())
    return digits[-10:] if len(digits) >= 10 else digits


def _cap_permissions(requested: dict, ceiling) -> dict:
    """A supervisor can't grant access they don't hold themselves. Intersect the
    requested permission map with the creator's. clinic_admin passes ceiling=None
    (no cap)."""
    if not isinstance(ceiling, dict) or not ceiling:
        return requested
    req = requested if isinstance(requested, dict) else {}
    out = {"modules": {}, "duties": {}, "manageable_roles": []}
    for grp in ("modules", "duties"):
        cap = ceiling.get(grp) or {}
        for k, v in (req.get(grp) or {}).items():
            out[grp][k] = bool(v) and bool(cap.get(k, False))
    cap_roles = set(ceiling.get("manageable_roles") or [])
    out["manageable_roles"] = [r for r in (req.get("manageable_roles") or []) if r in cap_roles]
    return out
from app.schemas.schemas import (
    ClinicUpdate, BranchCreate, BranchOut,
    StaffCreate, StaffOut, DoctorProfileCreate,
    DoctorProfileOut, DoctorScheduleCreate
)

router = APIRouter(prefix="/clinic", tags=["clinic-admin"])

CLINIC_ADMIN_ROLES = ["clinic_admin", "clinic_manager"]
ADMIN_OR_RECEPTIONIST = ["clinic_admin", "clinic_manager", "receptionist"]


def require_clinic_admin(current=Depends(get_current_staff)):
    if current.role not in CLINIC_ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Clinic manager access required")
    return current


def require_admin_or_receptionist(current=Depends(get_current_staff)):
    if current.role not in ADMIN_OR_RECEPTIONIST:
        raise HTTPException(status_code=403, detail="Access denied")
    return current


# ── Dashboard KPIs ────────────────────────────────────────────────────────────

@router.get("/dashboard-stats")
def get_dashboard_stats(
    period: str = "today",
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    """Aggregate KPIs for the provider dashboard over a rolling window.
    period: today | week (last 7 days) | month (last 30 days)."""
    from datetime import timedelta
    from sqlalchemy import func

    today = date.today()
    if period == "week":
        date_from, span = today - timedelta(days=6), 7
    elif period == "month":
        date_from, span = today - timedelta(days=29), 30
    else:
        period, date_from, span = "today", today, 1
    date_to = today
    cid = current.clinic_id

    appts = db.query(Appointment).filter(
        Appointment.clinic_id == cid,
        Appointment.appointment_date >= date_from,
        Appointment.appointment_date <= date_to,
    ).all()

    def _count(pred):
        return sum(1 for a in appts if pred(a))

    by_status = {s: _count(lambda a, s=s: a.status == s)
                 for s in ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']}
    by_mode = {m: _count(lambda a, m=m: (a.mode or 'offline') == m)
               for m in ['offline', 'online', 'telehealth']}
    total_appts = len(appts)
    completed = by_status['completed']

    # New + total patients
    new_patients = db.query(func.count(Patient.id)).filter(
        Patient.clinic_id == cid,
        Patient.created_at >= datetime.combine(date_from, datetime.min.time()),
    ).scalar() or 0
    total_patients = db.query(func.count(Patient.id)).filter(
        Patient.clinic_id == cid,
        Patient.is_active == True,
    ).scalar() or 0

    # Revenue in window (invoices created in range)
    rev = db.query(
        func.coalesce(func.sum(Invoice.total), 0),
        func.coalesce(func.sum(Invoice.amount_paid), 0),
    ).filter(
        Invoice.clinic_id == cid,
        Invoice.created_at >= datetime.combine(date_from, datetime.min.time()),
        Invoice.status != 'cancelled',
    ).first()
    billed = float(rev[0]) if rev else 0.0
    collected = float(rev[1]) if rev else 0.0

    # Pending online bookings awaiting confirmation (always "now", not windowed)
    pending_online = db.query(func.count(OnlineBooking.id)).filter(
        OnlineBooking.clinic_id == cid,
        OnlineBooking.status == 'pending',
    ).scalar() or 0

    # Daily trend
    counts_by_date = {}
    for a in appts:
        k = str(a.appointment_date)
        counts_by_date[k] = counts_by_date.get(k, 0) + 1
    trend = []
    for i in range(span):
        d = date_from + timedelta(days=i)
        trend.append({
            "date":   str(d),
            "label":  d.strftime("%a") if span <= 7 else d.strftime("%d"),
            "count":  counts_by_date.get(str(d), 0),
            "isToday": d == today,
        })

    return {
        "period":          period,
        "date_from":       str(date_from),
        "date_to":         str(date_to),
        "appointments":    total_appts,
        "completed":       completed,
        "waiting":         by_status['pending'] + by_status['confirmed'],
        "in_progress":     by_status['in_progress'],
        "cancelled":       by_status['cancelled'],
        "by_status":       by_status,
        "by_mode":         by_mode,
        "telehealth":      by_mode['telehealth'],
        "online":          by_mode['online'],
        "walk_in":         by_mode['offline'],
        "new_patients":    int(new_patients),
        "total_patients":  int(total_patients),
        "revenue_billed":  billed,
        "revenue_collected": collected,
        "revenue_outstanding": round(billed - collected, 2),
        "pending_online":  int(pending_online),
        "completion_rate": round((completed / total_appts) * 100) if total_appts else 0,
        "trend":           trend,
    }


# ── Clinic Profile ────────────────────────────────────────────────────────────

@router.get("/profile")
def get_clinic_profile(db: Session = Depends(get_db), current=Depends(get_current_staff)):
    clinic = db.query(Clinic).filter(Clinic.id == current.clinic_id).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    return {
        "id":                clinic.id,
        "name":              clinic.name,
        "slug":              clinic.slug,
        "specialty":         clinic.specialty,
        "phone":             clinic.phone,
        "email":             clinic.email,
        "address":           clinic.address,
        "city":              clinic.city,
        "state":             clinic.state,
        "pincode":           clinic.pincode,
        "description":       clinic.description,
        "logo_url":          clinic.logo_url,
        "brand_name":        clinic.brand_name,
        "brand_color":       clinic.brand_color,
        "is_active":         clinic.is_active,
        "is_verified":       clinic.is_verified,
        "subscription_plan": clinic.subscription_plan,
        "subscription_status": clinic.subscription_status,
    }


@router.put("/profile")
def update_clinic_profile(
    payload: ClinicUpdate,
    db: Session = Depends(get_db),
    current=Depends(require_clinic_admin),
):
    clinic = db.query(Clinic).filter(Clinic.id == current.clinic_id).first()
    for key, val in payload.model_dump(exclude_unset=True).items():
        setattr(clinic, key, val)
    db.commit()
    db.refresh(clinic)
    return clinic


@router.post("/profile/logo")
def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current=Depends(require_clinic_admin),
):
    os.makedirs(f"{settings.UPLOAD_DIR}/logos", exist_ok=True)
    ext = file.filename.split(".")[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "webp"]:
        raise HTTPException(400, "Only JPG/PNG/WEBP allowed")
    filename = f"clinic_{current.clinic_id}.{ext}"
    path = f"{settings.UPLOAD_DIR}/logos/{filename}"
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    clinic = db.query(Clinic).filter(Clinic.id == current.clinic_id).first()
    clinic.logo_url = f"/uploads/logos/{filename}"
    db.commit()
    return {"logo_url": clinic.logo_url}


# ── Device Bridge (HL7 / ASTM / DICOM ingest key) ─────────────────────────────

@router.get("/bridge-config")
def get_bridge_config(db: Session = Depends(get_db), current=Depends(require_clinic_admin)):
    """Return this health center's device-bridge connection settings so the
    on-site bridge agent (lab/imaging machines) can be configured. The API key
    authenticates HL7/ASTM/DICOM/PDF result ingestion for this health center only."""
    clinic = db.query(Clinic).filter(Clinic.id == current.clinic_id).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Health center not found")
    return {
        "clinic_id":         clinic.id,
        "health_center":     clinic.name,
        "bridge_api_key":    clinic.bridge_api_key,   # null until generated
        "has_key":           bool(clinic.bridge_api_key),
        "last_seen":         clinic.bridge_last_seen.isoformat() if clinic.bridge_last_seen else None,
        "default_hl7_port":  2575,
        "default_astm_port": 2576,
    }


@router.post("/bridge-key/rotate")
def rotate_bridge_key(db: Session = Depends(get_db), current=Depends(require_clinic_admin)):
    """Generate (or regenerate) the device-bridge API key for this health center.
    Regenerating immediately invalidates the previous key — the on-site bridge
    agent must then be updated with the new key."""
    clinic = db.query(Clinic).filter(Clinic.id == current.clinic_id).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Health center not found")
    clinic.bridge_api_key = secrets.token_hex(32)   # 64 hex chars, fits VARCHAR(64)
    db.commit()
    db.refresh(clinic)
    return {
        "clinic_id":      clinic.id,
        "bridge_api_key": clinic.bridge_api_key,
        "message":        "Bridge API key generated. Update your on-site bridge agent with this key.",
    }


# ── Branches ──────────────────────────────────────────────────────────────────

@router.get("/branches", response_model=List[BranchOut])
def list_branches(db: Session = Depends(get_db), current=Depends(get_current_staff)):
    return db.query(Branch).filter(
        Branch.clinic_id == current.clinic_id,
        Branch.is_active == True
    ).all()


@router.post("/branches", response_model=BranchOut)
def create_branch(
    payload: BranchCreate,
    db: Session = Depends(get_db),
    current=Depends(require_clinic_admin),
):
    clinic = db.query(Clinic).filter(Clinic.id == current.clinic_id).first()
    if clinic.subscription_plan == "free":
        count = db.query(Branch).filter(
            Branch.clinic_id == current.clinic_id, Branch.is_active == True
        ).count()
        if count >= settings.FREE_PLAN_MAX_BRANCHES:
            raise HTTPException(403, f"Free plan allows {settings.FREE_PLAN_MAX_BRANCHES} branch. Upgrade to add more.")
    branch = Branch(clinic_id=current.clinic_id, **payload.model_dump())
    db.add(branch)
    db.flush()
    _hc = ids.ensure_hc_id_by_clinic_id(db, current.clinic_id)
    branch.branch_code = ids.next_branch_code(db, current.clinic_id, _hc)
    db.commit()
    db.refresh(branch)
    return branch


# ── Staff Management ──────────────────────────────────────────────────────────

@router.get("/staff")
def list_staff(
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current=Depends(require_clinic_admin),
):
    q = db.query(Staff).filter(Staff.clinic_id == current.clinic_id)
    dept_limit = staff_department_limit(current)
    if dept_limit:  # department-scoped managers only see their own department
        q = q.filter(Staff.department == dept_limit)
    if role:
        q = q.filter(Staff.role == role)
    rows = q.order_by(Staff.full_name).all()
    return [{
        "id": s.id, "full_name": s.full_name, "email": s.email,
        "mobile": s.mobile, "role": s.role, "is_active": s.is_active,
        "branch_id": s.branch_id, "created_at": s.created_at,
        "employee_id": s.employee_id, "designation": s.designation,
        "department": s.department, "ward": s.ward,
        "reporting_manager_id": s.reporting_manager_id,
        "employment_type": s.employment_type,
        "join_date": str(s.join_date) if s.join_date else None,
        "date_of_birth": str(s.date_of_birth) if s.date_of_birth else None,
        "gender": s.gender,
        "emergency_contact_name": s.emergency_contact_name,
        "emergency_contact_mobile": s.emergency_contact_mobile,
        "qualification": s.qualification,
        "registration_number": s.registration_number,
        "license_expiry_date": str(s.license_expiry_date) if s.license_expiry_date else None,
        "address": s.address, "modules": s.modules,
        "avatar_url": s.avatar_url,
        "secondary_roles": s.secondary_roles,
        "scheduled_removal_date": str(s.scheduled_removal_date) if s.scheduled_removal_date else None,
        "removal_reason": s.removal_reason,
    } for s in rows]


@router.post("/staff")
def create_staff(
    body: dict,
    db: Session = Depends(get_db),
    current=Depends(require_clinic_admin),
):
    target_role = body.get("role", "receptionist")
    if staff_is_restricted(current):  # scoped Health Center Manager
        if not staff_has_duty(current, "create_staff"):
            raise HTTPException(403, "You do not have permission to create staff.")
        if target_role in ("clinic_admin", "clinic_manager"):
            raise HTTPException(403, "Managers are created from Manage Managers, not here.")
        if not staff_can_manage_role(current, target_role):
            raise HTTPException(403, f"You are not allowed to create '{target_role}' accounts.")
        _dl = staff_department_limit(current)
        if _dl:  # force the new hire into the manager's own department
            body["department"] = _dl
    clinic = db.query(Clinic).filter(Clinic.id == current.clinic_id).first()
    if body.get("role") == "doctor" and clinic.subscription_plan == "free":
        doc_count = db.query(Staff).filter(
            Staff.clinic_id == current.clinic_id,
            Staff.role == "doctor",
            Staff.is_active == True,
        ).count()
        if doc_count >= settings.FREE_PLAN_MAX_DOCTORS:
            raise HTTPException(403, f"Free plan allows {settings.FREE_PLAN_MAX_DOCTORS} doctors. Upgrade to add more.")

    email = body.get("email")
    mobile = body.get("mobile")
    if email and db.query(Staff).filter(Staff.email == email).first():
        raise HTTPException(400, "Email already registered")
    if mobile and db.query(Staff).filter(Staff.mobile == mobile).first():
        raise HTTPException(400, "Mobile already registered")

    new_staff = Staff(
        clinic_id       = current.clinic_id,
        branch_id       = body.get("branch_id") or current.branch_id,
        full_name       = body.get("full_name"),
        email           = email,
        mobile          = mobile,
        hashed_password = hash_password(body.get("password") or _generate_temp_password()),
        role            = body.get("role", "receptionist"),
        is_active       = body.get("role") not in ['pharmacist', 'lab_technician', 'lab_tech', 'imaging_tech', 'imaging_technician'],
        designation              = body.get("designation"),
        department               = body.get("department"),
        ward                     = body.get("ward"),
        reporting_manager_id     = body.get("reporting_manager_id"),
        employment_type          = body.get("employment_type"),
        join_date                = body.get("join_date"),
        date_of_birth            = body.get("date_of_birth"),
        gender                   = body.get("gender"),
        emergency_contact_name   = body.get("emergency_contact_name"),
        emergency_contact_mobile = body.get("emergency_contact_mobile"),
        qualification            = body.get("qualification"),
        registration_number      = body.get("registration_number"),
        license_expiry_date      = body.get("license_expiry_date"),
        address                  = body.get("address"),
        modules                  = body.get("modules"),
        secondary_roles          = body.get("secondary_roles") or [],
        scheduled_removal_date   = body.get("scheduled_removal_date") or None,
        removal_reason           = body.get("removal_reason"),
    )
    db.add(new_staff)
    db.flush()

    # Standardized, role-prefixed employee ID (e.g. HC00001-DR0001)
    _hc = ids.ensure_hc_id_by_clinic_id(db, current.clinic_id)
    new_staff.employee_id = ids.next_employee_id(db, current.clinic_id, _hc, new_staff.role)

    if body.get("role") == "doctor":
        dp = DoctorProfile(
            staff_id         = new_staff.id,
            clinic_id        = current.clinic_id,
            specialty        = body.get("specialty", "General Medicine"),
            qualification    = body.get("qualification"),
            mci_number       = body.get("mci_number"),
            experience_years = int(body.get("experience_years") or 0),
            consultation_fee = float(body.get("consultation_fee") or 500),
            is_active        = True,
        )
        db.add(dp)

    db.commit()
    return {
        "id":        new_staff.id,
        "full_name": new_staff.full_name,
        "email":     new_staff.email,
        "role":      new_staff.role,
        "message":   "Staff added successfully",
    }


@router.put("/staff/{staff_id}")
def update_staff(
    staff_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current=Depends(require_clinic_admin),
):
    s = db.query(Staff).filter(Staff.id == staff_id, Staff.clinic_id == current.clinic_id).first()
    if not s:
        raise HTTPException(404, "Staff not found")
    assert_can_manage(current, s)  # downward-only: never edit a peer or someone above you
    if staff_is_restricted(current):
        if not staff_has_duty(current, "edit_staff"):
            raise HTTPException(403, "You do not have permission to edit staff.")
        if s.role in ("clinic_admin", "clinic_manager"):
            raise HTTPException(403, "You cannot edit managers or admins.")
        _dl = staff_department_limit(current)
        if _dl and s.department != _dl:
            raise HTTPException(403, "You can only edit staff in your department.")
        if "role" in body and not staff_can_manage_role(current, body["role"]):
            raise HTTPException(403, "You cannot assign that role.")
        if _dl:
            body.pop("department", None)  # cannot move staff out of their department
    updatable = [
        "full_name", "mobile", "is_active", "branch_id", "role",
        "employee_id", "designation", "department", "ward",
        "reporting_manager_id", "employment_type", "join_date",
        "date_of_birth", "gender", "emergency_contact_name",
        "emergency_contact_mobile", "qualification", "registration_number",
        "license_expiry_date", "address", "modules",
        "secondary_roles", "scheduled_removal_date", "removal_reason",
    ]
    for field in updatable:
        if field in body:
            setattr(s, field, body[field])
    db.commit()
    return {"message": "Updated successfully"}


@router.put("/staff/{staff_id}/toggle")
def toggle_staff(
    staff_id: int,
    db: Session = Depends(get_db),
    current=Depends(require_clinic_admin),
):
    staff = db.query(Staff).filter(Staff.id == staff_id, Staff.clinic_id == current.clinic_id).first()
    if not staff:
        raise HTTPException(404, "Staff not found")
    assert_can_manage(current, staff)  # downward-only
    if staff_is_restricted(current):
        if not staff_has_duty(current, "deactivate_staff"):
            raise HTTPException(403, "You do not have permission to deactivate staff.")
        if staff.role in ("clinic_admin", "clinic_manager"):
            raise HTTPException(403, "You cannot deactivate managers or admins.")
        _dl = staff_department_limit(current)
        if _dl and staff.department != _dl:
            raise HTTPException(403, "You can only manage staff in your department.")
    staff.is_active = not staff.is_active
    db.commit()
    return {"id": staff.id, "is_active": staff.is_active}


@router.post("/staff/{staff_id}/reset-password")
def reset_staff_password_clinic(
    staff_id: int,
    db: Session = Depends(get_db),
    current=Depends(require_clinic_admin),
):
    """Clinic-side password reset by an admin/manager (gated by the reset_passwords duty).
    Issues a fresh temp password (forced change on first login) and delivers it."""
    if staff_is_restricted(current) and not staff_has_duty(current, "reset_passwords"):
        raise HTTPException(403, "You do not have permission to reset passwords.")
    s = db.query(Staff).filter(Staff.id == staff_id, Staff.clinic_id == current.clinic_id).first()
    if not s:
        raise HTTPException(404, "Staff not found")
    assert_can_manage(current, s)  # downward-only: cannot reset a peer's or supervisor's password
    if staff_is_restricted(current):
        if s.role in ("clinic_admin", "clinic_manager"):
            raise HTTPException(403, "You cannot reset a manager's password.")
        _dl = staff_department_limit(current)
        if _dl and s.department != _dl:
            raise HTTPException(403, "You can only reset staff in your department.")
    temp_password = _generate_temp_password()
    s.hashed_password = hash_password(temp_password)
    s.is_first_login = True
    s.temp_pw_expiry = datetime.utcnow() + timedelta(hours=48)
    db.commit()
    email_sent = sms_sent = False
    if s.email:
        try:
            email_sent = send_welcome_email(s.email, s.full_name, s.role, temp_password, STAFF_PORTAL_URL)
        except Exception:
            email_sent = False
    if s.mobile:
        try:
            sms_sent = send_sms(s.mobile, f"BHarath Health: your password was reset. Temp password: {temp_password}. Sign in at {STAFF_PORTAL_URL} and change it on first login.")
        except Exception:
            sms_sent = False
    return {"staff_name": s.full_name, "temp_password": temp_password, "email_sent": email_sent, "sms_sent": sms_sent}


@router.get("/staff/by-code/{code}")
def resolve_staff_by_code(code: str, db: Session = Depends(get_db), current=Depends(get_current_staff)):
    """Resolve a 4-digit staff code (the numeric suffix of employee_id) to the individual,
    scoped to the caller's health center. Used across portals to attribute documentation
    to the person who performed it (they enter their 4 digits)."""
    digits = "".join(ch for ch in (code or "") if ch.isdigit())
    if not digits:
        raise HTTPException(400, "Enter the 4-digit staff code")
    digits = digits[-4:].zfill(4)
    rows = db.query(Staff).filter(Staff.clinic_id == current.clinic_id).all()
    matches = [s for s in rows if (s.employee_id or "")[-4:] == digits]
    if not matches:
        raise HTTPException(404, "No staff with that code in this health center")
    if len(matches) > 1:
        # center-wide unique by design; expose any legacy collisions rather than guessing
        return {"ambiguous": True, "candidates": [
            {"id": s.id, "full_name": s.full_name, "role": s.role,
             "employee_id": s.employee_id, "is_active": s.is_active} for s in matches]}
    s = matches[0]
    return {"id": s.id, "full_name": s.full_name, "role": s.role,
            "employee_id": s.employee_id, "department": s.department, "is_active": s.is_active}


@router.get("/my-supervisor")
def my_supervisor(db: Session = Depends(get_db), current=Depends(get_current_staff)):
    """The single manager/admin this staff member reports to (read-only) — so a manager
    can see whom they report to without seeing peers or the rest of the org."""
    if not current.reporting_manager_id:
        return {"reporting_to": None}
    sup = db.query(Staff).filter(Staff.id == current.reporting_manager_id).first()
    if not sup:
        return {"reporting_to": None}
    role_label = MANAGER_SCOPE_LABELS.get(
        sup.manager_scope or "",
        (sup.role or "manager").replace("_", " ").title())
    return {"reporting_to": {
        "id": sup.id, "full_name": sup.full_name, "role": sup.role,
        "scope_label": role_label, "department": sup.department,
        "employee_id": sup.employee_id,
    }}


def _generate_username(full_name: str, db) -> str:
    first = ''.join(c for c in (full_name or 'user').strip().split()[0].lower() if c.isalpha())[:4].ljust(4, 'x')
    for _ in range(40):
        username = first + ''.join(secrets.choice(string.digits) for _ in range(2))
        if not db.query(Staff).filter(Staff.username == username).first():
            return username
    for _ in range(40):
        username = first + ''.join(secrets.choice(string.digits) for _ in range(4))
        if not db.query(Staff).filter(Staff.username == username).first():
            return username
    raise HTTPException(500, "Could not generate a unique username")


def _can_manage_managers(current) -> bool:
    """clinic_admin / legacy admins, or a center-scope supervisor with the create_managers duty."""
    if not staff_is_restricted(current):
        return True
    return current.manager_scope == "center" and staff_has_duty(current, "create_managers")


@router.get("/managers")
def list_clinic_managers(db: Session = Depends(get_db), current=Depends(require_clinic_admin)):
    if not _can_manage_managers(current):
        raise HTTPException(403, "Supervisor access required.")
    q = db.query(Staff).filter(
        Staff.clinic_id == current.clinic_id, Staff.role == "clinic_manager"
    )
    if current.role != "clinic_admin":
        # Downward-only: a supervisor sees ONLY the managers reporting to them — never
        # peers or the managers above them. clinic_admin (the owner) sees everyone.
        q = q.filter(Staff.reporting_manager_id == current.id)
    rows = q.order_by(Staff.full_name).all()
    return [{
        "id": s.id, "full_name": s.full_name, "email": s.email, "mobile": s.mobile,
        "manager_scope": s.manager_scope,
        "scope_label": MANAGER_SCOPE_LABELS.get(s.manager_scope or "", "Manager"),
        "department": s.department, "is_active": s.is_active,
        "employee_id": s.employee_id, "username": s.username,
    } for s in rows]


@router.post("/managers")
def create_clinic_manager(body: dict, db: Session = Depends(get_db), current=Depends(require_clinic_admin)):
    """A Health Center Supervisor (or clinic_admin) creates a department manager."""
    if not _can_manage_managers(current):
        raise HTTPException(403, "You do not have permission to create managers.")

    full_name = (body.get("full_name") or "").strip()
    if not full_name:
        raise HTTPException(400, "full_name is required")
    email = (body.get("email") or "").strip() or None
    mobile = None
    if body.get("mobile") not in (None, ""):
        mobile = _normalize_mobile(body.get("mobile"))
        if len(mobile) != 10:
            raise HTTPException(400, "Mobile must be a 10-digit number")
    if email and db.query(Staff).filter(Staff.email == email).first():
        raise HTTPException(400, "Email already registered")
    if mobile and db.query(Staff).filter(Staff.mobile == mobile).first():
        raise HTTPException(400, "Mobile already registered")

    # A non-admin supervisor can only create DEPARTMENT managers (no privilege escalation).
    scope = body.get("scope") if body.get("scope") in ("center", "department") else "department"
    if scope == "center" and current.role != "clinic_admin":
        scope = "department"

    permissions = body.get("permissions") if isinstance(body.get("permissions"), dict) else None
    if staff_is_restricted(current) and permissions is not None:
        permissions = _cap_permissions(permissions, current.permissions)  # can't grant beyond own

    department_name = (body.get("department") or "").strip() or None
    dept = None
    if body.get("department_id"):
        dept = db.query(Department).filter(
            Department.id == body["department_id"], Department.clinic_id == current.clinic_id
        ).first()
        if dept:
            department_name = dept.name

    temp_password = _generate_temp_password()
    manager = Staff(
        clinic_id            = current.clinic_id,
        full_name            = full_name,
        email                = email,
        mobile               = mobile,
        hashed_password      = hash_password(temp_password),
        role                 = "clinic_manager",
        manager_scope        = scope,
        department           = department_name if scope == "department" else None,
        permissions          = permissions,
        reporting_manager_id = current.id,
        is_active            = True,
        is_first_login       = True,
        temp_pw_expiry       = datetime.utcnow() + timedelta(hours=48),
    )
    db.add(manager)
    db.flush()
    manager.username = _generate_username(full_name, db)
    # Role-prefixed, center-unique employee ID (e.g. HC00001-MG0001) — same scheme as create_staff.
    _hc = ids.ensure_hc_id_by_clinic_id(db, current.clinic_id)
    manager.employee_id = ids.next_employee_id(db, current.clinic_id, _hc, "clinic_manager")
    if scope == "department" and dept:
        db.add(StaffDepartment(staff_id=manager.id, department_id=dept.id, is_primary=True))
    db.commit()
    db.refresh(manager)

    role_label = MANAGER_SCOPE_LABELS.get(scope, "Health Center Manager")
    email_sent = sms_sent = False
    if email:
        try:
            email_sent = send_welcome_email(email, full_name, role_label, temp_password, STAFF_PORTAL_URL)
        except Exception:
            email_sent = False
    if mobile:
        try:
            sms_sent = send_sms(mobile, f"BHarath Health: {role_label} account created. Username: {manager.username}, Temp password: {temp_password}. Sign in at {STAFF_PORTAL_URL} and change it on first login.")
        except Exception:
            sms_sent = False

    return {
        "id": manager.id, "full_name": manager.full_name, "email": manager.email,
        "mobile": manager.mobile, "username": manager.username, "scope": scope,
        "scope_label": role_label, "department": manager.department,
        "employee_id": manager.employee_id,
        "temp_password": temp_password, "email_sent": email_sent, "sms_sent": sms_sent,
        "login_url": STAFF_PORTAL_URL,
    }


# ── Doctor Profiles & Schedules ───────────────────────────────────────────────

@router.get("/doctors")
def list_doctors(db: Session = Depends(get_db), current=Depends(get_current_staff)):
    doctors = db.query(Staff).filter(
        Staff.clinic_id == current.clinic_id,
        Staff.role == "doctor",
        Staff.is_active == True,
    ).all()
    return [{
        "id":                 d.id,
        "full_name":          d.full_name,
        "email":              d.email,
        "mobile":             d.mobile,
        "specialty":          d.doctor_profile.specialty if d.doctor_profile else None,
        "profile_id":         d.doctor_profile.id if d.doctor_profile else None,
        "consultation_fee":   float(d.doctor_profile.consultation_fee) if d.doctor_profile and d.doctor_profile.consultation_fee else 0,
        "telehealth_enabled": d.doctor_profile.telehealth_enabled if d.doctor_profile else False,
        "telehealth_fee":     float(d.doctor_profile.telehealth_fee) if d.doctor_profile and d.doctor_profile.telehealth_fee else None,
        "accepting_appointments": d.doctor_profile.accepting_appointments if d.doctor_profile and d.doctor_profile.accepting_appointments is not None else True,
    } for d in doctors]


@router.put("/doctors/{doctor_profile_id}/accepting")
def toggle_doctor_accepting(
    doctor_profile_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current=Depends(require_admin_or_receptionist),
):
    """Enable/block new bookings for a doctor (receptionist control)."""
    profile = db.query(DoctorProfile).filter(
        DoctorProfile.id == doctor_profile_id,
        DoctorProfile.clinic_id == current.clinic_id,
    ).first()
    if not profile:
        raise HTTPException(404, "Doctor profile not found")
    profile.accepting_appointments = bool(body.get("accepting", True))
    db.commit()
    return {"doctor_id": profile.id, "accepting_appointments": profile.accepting_appointments}


# ── Doctor Slot Board ─────────────────────────────────────────────────────────

ACTIVE_APPT_STATUSES = ('cancelled', 'no_show')  # excluded = slot consumed


def _slot_count(schedule) -> int:
    from datetime import datetime as _dt
    try:
        start = _dt.strptime(schedule.start_time, "%H:%M")
        end = _dt.strptime(schedule.end_time, "%H:%M")
        mins = max(int((end - start).total_seconds() // 60), 0)
        return mins // (schedule.slot_minutes or 15)
    except Exception:
        return 0


@router.get("/slot-board")
def slot_board(
    date_from: date = None,
    date_to: date = None,
    db: Session = Depends(get_db),
    current=Depends(require_admin_or_receptionist),
):
    """
    Per-doctor, per-day slot summary over a date range.
    Powers the receptionist Doctor Slot Board: totals, booked, requested, open,
    live status (today), accepting flag, pin/lock assignments, advance requests.
    """
    from datetime import timedelta as _td
    today = date.today()
    if not date_from:
        date_from = today
    if not date_to:
        date_to = date_from
    if date_to < date_from:
        date_from, date_to = date_to, date_from
    if (date_to - date_from).days > 31:
        date_to = date_from + _td(days=31)

    days = []
    d = date_from
    while d <= date_to:
        days.append(d)
        d += _td(days=1)

    doctors = db.query(Staff).filter(
        Staff.clinic_id == current.clinic_id,
        Staff.role == "doctor",
        Staff.is_active == True,
    ).all()
    profile_ids = [s.doctor_profile.id for s in doctors if s.doctor_profile]

    # Bulk fetch everything once
    schedules = db.query(DoctorSchedule).filter(
        DoctorSchedule.doctor_id.in_(profile_ids or [0]),
        DoctorSchedule.is_active == True,
    ).all()
    sched_map = {}
    for s in schedules:
        sched_map.setdefault((s.doctor_id, s.day_of_week), s)

    appts = db.query(
        Appointment.doctor_id, Appointment.appointment_date,
        Appointment.status,
    ).filter(
        Appointment.clinic_id == current.clinic_id,
        Appointment.doctor_id.in_(profile_ids or [0]),
        Appointment.appointment_date >= date_from,
        Appointment.appointment_date <= date_to,
    ).all()

    pending_bookings = db.query(OnlineBooking).filter(
        OnlineBooking.clinic_id == current.clinic_id,
        OnlineBooking.status == "pending",
    ).all()

    assignments = db.query(DoctorDeskAssignment).filter(
        DoctorDeskAssignment.clinic_id == current.clinic_id,
    ).all()
    staff_names = {s.id: s.full_name for s in db.query(Staff).filter(Staff.clinic_id == current.clinic_id).all()}

    out = []
    for s in doctors:
        dp = s.doctor_profile
        if not dp:
            continue
        day_rows, tot_total, tot_booked, tot_requested = [], 0, 0, 0
        waiting_today = in_progress_today = completed_today = 0
        for d in days:
            day_name = d.strftime("%A").lower()
            sched = sched_map.get((dp.id, day_name))
            total = _slot_count(sched) if sched else 0
            booked = sum(1 for a in appts if a.doctor_id == dp.id and a.appointment_date == d
                         and a.status not in ACTIVE_APPT_STATUSES)
            requested = sum(1 for b in pending_bookings if b.doctor_id == dp.id and b.booking_date == d)
            if d == today:
                waiting_today = sum(1 for a in appts if a.doctor_id == dp.id and a.appointment_date == d
                                    and a.status in ('scheduled', 'waiting', 'confirmed', 'pending'))
                in_progress_today = sum(1 for a in appts if a.doctor_id == dp.id and a.appointment_date == d
                                        and a.status == 'in_progress')
                completed_today = sum(1 for a in appts if a.doctor_id == dp.id and a.appointment_date == d
                                      and a.status == 'completed')
            open_slots = max(total - booked - requested, 0)
            day_rows.append({
                "date": str(d), "total": total, "booked": booked,
                "requested": requested, "open": open_slots,
                "no_schedule": sched is None,
            })
            tot_total += total; tot_booked += booked; tot_requested += requested

        # Live status (today)
        if in_progress_today > 0:
            live = "busy"
        elif waiting_today > 0:
            live = "waiting"
        elif completed_today > 0:
            live = "done"
        else:
            live = "available"

        advance = sum(1 for b in pending_bookings if b.doctor_id == dp.id and b.booking_date > today)
        my_assign = next((a for a in assignments if a.doctor_id == dp.id and a.staff_id == current.id), None)
        lock_row = next((a for a in assignments if a.doctor_id == dp.id and a.locked), None)

        out.append({
            "staff_id": s.id,
            "profile_id": dp.id,
            "full_name": s.full_name,
            "specialty": dp.specialty or "General",
            "accepting": dp.accepting_appointments if dp.accepting_appointments is not None else True,
            "live_status": live,
            "waiting_today": waiting_today,
            "in_progress_today": in_progress_today,
            "days": day_rows,
            "totals": {
                "total": tot_total, "booked": tot_booked,
                "requested": tot_requested,
                "open": max(tot_total - tot_booked - tot_requested, 0),
            },
            "advance_requests": advance,
            "pinned": bool(my_assign and my_assign.pinned),
            "locked_by": {
                "staff_id": lock_row.staff_id,
                "name": staff_names.get(lock_row.staff_id, "Staff"),
                "me": lock_row.staff_id == current.id,
            } if lock_row else None,
        })

    return {
        "date_from": str(date_from),
        "date_to": str(date_to),
        "doctors": out,
        "pending_requests": [{
            "id": b.id,
            "doctor_id": b.doctor_id,
            "patient_name": b.patient_name,
            "patient_mobile": b.patient_mobile,
            "booking_date": str(b.booking_date),
            "booking_time": b.booking_time,
            "reason": b.reason,
        } for b in sorted(pending_bookings, key=lambda b: (b.booking_date, b.booking_time or ""))],
    }


@router.post("/desk-assignments")
def set_desk_assignment(
    body: dict,
    db: Session = Depends(get_db),
    current=Depends(require_admin_or_receptionist),
):
    """Pin a doctor to my list, or lock/unlock a doctor (shared across receptionists)."""
    doctor_id = body.get("doctor_id")
    profile = db.query(DoctorProfile).filter(
        DoctorProfile.id == doctor_id,
        DoctorProfile.clinic_id == current.clinic_id,
    ).first()
    if not profile:
        raise HTTPException(404, "Doctor profile not found")

    row = db.query(DoctorDeskAssignment).filter(
        DoctorDeskAssignment.doctor_id == doctor_id,
        DoctorDeskAssignment.staff_id == current.id,
    ).first()
    if not row:
        row = DoctorDeskAssignment(
            clinic_id=current.clinic_id, doctor_id=doctor_id,
            staff_id=current.id, pinned=False, locked=False,
        )
        db.add(row)

    if "pinned" in body:
        row.pinned = bool(body["pinned"])

    if "locked" in body:
        want = bool(body["locked"])
        other_lock = db.query(DoctorDeskAssignment).filter(
            DoctorDeskAssignment.doctor_id == doctor_id,
            DoctorDeskAssignment.locked == True,
            DoctorDeskAssignment.staff_id != current.id,
        ).first()
        if want and other_lock:
            if current.role in CLINIC_ADMIN_ROLES:
                other_lock.locked = False  # manager override steals the lock
            else:
                raise HTTPException(409, f"Already locked by {staff_name_of(db, other_lock.staff_id)}")
        if not want and other_lock and current.role in CLINIC_ADMIN_ROLES:
            other_lock.locked = False  # manager unlock for someone else
        row.locked = want

    db.commit()
    return {"doctor_id": doctor_id, "pinned": row.pinned, "locked": row.locked}


def staff_name_of(db, staff_id: int) -> str:
    s = db.query(Staff).filter(Staff.id == staff_id).first()
    return s.full_name if s else "another receptionist"


@router.put("/doctors/{doctor_profile_id}/telehealth")
def update_doctor_telehealth(
    doctor_profile_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current=Depends(require_clinic_admin),
):
    profile = db.query(DoctorProfile).filter(
        DoctorProfile.id == doctor_profile_id,
        DoctorProfile.clinic_id == current.clinic_id,
    ).first()
    if not profile:
        raise HTTPException(404, "Doctor profile not found")
    if "telehealth_enabled" in body:
        profile.telehealth_enabled = bool(body["telehealth_enabled"])
    if "telehealth_fee" in body:
        profile.telehealth_fee = body["telehealth_fee"] if body["telehealth_fee"] else None
    db.commit()
    return {"message": "Telehealth settings updated"}


@router.post("/staff/{staff_id}/doctor-profile", response_model=DoctorProfileOut)
def upsert_doctor_profile(
    staff_id: int,
    payload: DoctorProfileCreate,
    db: Session = Depends(get_db),
    current=Depends(require_clinic_admin),
):
    staff = db.query(Staff).filter(
        Staff.id == staff_id,
        Staff.clinic_id == current.clinic_id,
        Staff.role == "doctor",
    ).first()
    if not staff:
        raise HTTPException(404, "Doctor staff member not found")

    existing = db.query(DoctorProfile).filter(DoctorProfile.staff_id == staff_id).first()
    if existing:
        for k, v in payload.model_dump(exclude_unset=True).items():
            setattr(existing, k, v)
        db.commit()
        return existing

    profile = DoctorProfile(staff_id=staff_id, clinic_id=current.clinic_id, **payload.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.post("/doctors/{doctor_profile_id}/schedule")
def set_doctor_schedule(
    doctor_profile_id: int,
    payload: DoctorScheduleCreate,
    db: Session = Depends(get_db),
    current=Depends(require_clinic_admin),
):
    doctor = db.query(DoctorProfile).filter(
        DoctorProfile.id == doctor_profile_id,
        DoctorProfile.clinic_id == current.clinic_id,
    ).first()
    if not doctor:
        raise HTTPException(404, "Doctor profile not found")

    existing = db.query(DoctorSchedule).filter(
        DoctorSchedule.doctor_id == doctor_profile_id,
        DoctorSchedule.branch_id == payload.branch_id,
        DoctorSchedule.day_of_week == payload.day_of_week,
    ).first()

    if existing:
        for k, v in payload.model_dump().items():
            setattr(existing, k, v)
        existing.is_active = payload.is_active
        db.commit()
        return existing

    schedule = DoctorSchedule(doctor_id=doctor_profile_id, **payload.model_dump())
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


@router.get("/doctors/{doctor_profile_id}/schedules")
def get_doctor_schedules(
    doctor_profile_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    # Scope via the doctor profile's clinic (robust even if legacy schedule rows
    # have a null clinic_id).
    doctor = db.query(DoctorProfile).filter(
        DoctorProfile.id == doctor_profile_id,
        DoctorProfile.clinic_id == current.clinic_id,
    ).first()
    if not doctor:
        raise HTTPException(404, "Doctor profile not found")
    return db.query(DoctorSchedule).filter(DoctorSchedule.doctor_id == doctor_profile_id).all()


# ── Subscription ──────────────────────────────────────────────────────────────

@router.get("/subscription")
def get_subscription(db: Session = Depends(get_db), current=Depends(get_current_staff)):
    clinic = db.query(Clinic).filter(Clinic.id == current.clinic_id).first()
    doc_count = db.query(Staff).filter(
        Staff.clinic_id == current.clinic_id, Staff.role == "doctor", Staff.is_active == True
    ).count()
    branch_count = db.query(Branch).filter(
        Branch.clinic_id == current.clinic_id, Branch.is_active == True
    ).count()
    plan = clinic.subscription_plan or "free"
    limits = {
        "free":       {"doctors": 2,   "branches": 1,   "patients": 100},
        "basic":      {"doctors": 10,  "branches": 3,   "patients": 1000},
        "pro":        {"doctors": 999, "branches": 999, "patients": 999999},
        "enterprise": {"doctors": 999, "branches": 999, "patients": 999999},
        "trial":      {"doctors": 2,   "branches": 1,   "patients": 50},
    }
    return {
        "plan":    plan,
        "status":  clinic.subscription_status,
        "expiry":  clinic.subscription_expiry,
        "usage":   {"doctors": doc_count, "branches": branch_count},
        "limits":  limits.get(plan, limits["free"]),
    }


# ── Revenue Analytics ─────────────────────────────────────────────────────────

@router.get("/revenue")
def get_revenue(
    month: str,
    db: Session = Depends(get_db),
    current=Depends(require_clinic_admin),
):
    try:
        year, mon = int(month.split("-")[0]), int(month.split("-")[1])
    except Exception:
        raise HTTPException(400, "Invalid month format. Use YYYY-MM")

    last_day = calendar.monthrange(year, mon)[1]
    date_from = date(year, mon, 1)
    date_to = date(year, mon, last_day)

    invoices = db.query(Invoice).filter(
        Invoice.clinic_id == current.clinic_id,
        Invoice.status == "paid",
        Invoice.paid_at >= date_from,
        Invoice.paid_at <= date_to,
    ).all()

    total = sum(float(inv.total) for inv in invoices)
    count = len(invoices)
    avg = round(total / count, 2) if count else 0

    doctor_map = {}
    for inv in invoices:
        if not inv.appointment_id:
            continue
        appt = db.query(Appointment).filter(Appointment.id == inv.appointment_id).first()
        if not appt:
            continue
        dp = db.query(DoctorProfile).filter(DoctorProfile.id == appt.doctor_id).first()
        if not dp:
            continue
        doc_name = dp.staff.full_name if dp.staff else "Unknown"
        did = appt.doctor_id
        if did not in doctor_map:
            doctor_map[did] = {"doctor_name": doc_name, "total": 0.0, "count": 0}
        doctor_map[did]["total"] += float(inv.total)
        doctor_map[did]["count"] += 1

    billing = []
    for inv in sorted(invoices, key=lambda x: x.paid_at or date_from, reverse=True):
        patient = db.query(Patient).filter(Patient.id == inv.patient_id).first()
        doctor_name = None
        if inv.appointment_id:
            appt = db.query(Appointment).filter(Appointment.id == inv.appointment_id).first()
            if appt:
                dp = db.query(DoctorProfile).filter(DoctorProfile.id == appt.doctor_id).first()
                if dp and dp.staff:
                    doctor_name = dp.staff.full_name
        billing.append({
            "invoice_number": inv.invoice_number,
            "patient_name":   patient.full_name if patient else "-",
            "doctor_name":    doctor_name or "-",
            "payment_mode":   inv.payment_method,
            "amount":         float(inv.total),
            "billed_at":      str(inv.paid_at.date()) if inv.paid_at else str(date_from),
        })

    return {
        "month":     month,
        "totals":    {"total": total, "count": count, "avg": avg},
        "by_doctor": sorted(doctor_map.values(), key=lambda x: x["total"], reverse=True),
        "billing":   billing,
    }


@router.get("/analytics/overview")
def analytics_overview(
    period: str = "month",
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current=Depends(require_clinic_admin),
):
    """Rich business-analytics breakdowns for the Manager dashboard — appointment status/type
    mix, revenue trend, payment-mode & billing-status mix, new-vs-returning patients, and
    admissions/occupancy. Each block ships the aggregate so charts can drill into a table."""
    from datetime import timedelta
    from sqlalchemy import func

    today = date.today()
    if date_from and date_to:
        try:
            d_from, d_to = date.fromisoformat(date_from), date.fromisoformat(date_to)
        except ValueError:
            raise HTTPException(400, "Invalid date_from/date_to (use YYYY-MM-DD)")
        period = "custom"
    elif period == "today":
        d_from = d_to = today
    elif period == "week":
        d_from, d_to = today - timedelta(days=6), today
    elif period == "year":
        d_from, d_to = today - timedelta(days=364), today
    else:
        period, d_from, d_to = "month", today - timedelta(days=29), today

    cid = current.clinic_id
    start_dt = datetime.combine(d_from, datetime.min.time())
    end_dt = datetime.combine(d_to, datetime.max.time())

    appts = db.query(Appointment).filter(
        Appointment.clinic_id == cid,
        Appointment.appointment_date >= d_from,
        Appointment.appointment_date <= d_to,
    ).all()
    appt_status, appt_type = {}, {}
    for a in appts:
        s = a.status or "unknown"
        appt_status[s] = appt_status.get(s, 0) + 1
        t = getattr(a, "visit_type", None) or getattr(a, "mode", None) or "walk_in"
        appt_type[t] = appt_type.get(t, 0) + 1

    invoices = db.query(Invoice).filter(
        Invoice.clinic_id == cid,
        Invoice.created_at >= start_dt, Invoice.created_at <= end_dt,
        Invoice.status != "cancelled",
    ).all()
    billed = sum(float(i.total or 0) for i in invoices)
    collected = sum(float(i.amount_paid or 0) for i in invoices)
    pay_modes, bill_status, rev_by_day = {}, {}, {}
    for i in invoices:
        pm = i.payment_method or "unpaid"
        pay_modes[pm] = round(pay_modes.get(pm, 0) + float(i.amount_paid or 0), 2)
        bs = i.status or "pending"
        bill_status[bs] = bill_status.get(bs, 0) + 1
        k = str((i.created_at or start_dt).date())
        rev_by_day[k] = rev_by_day.get(k, 0) + float(i.total or 0)

    span = (d_to - d_from).days + 1
    trend = []
    for n in range(min(span, 90)):
        dd = d_from + timedelta(days=n)
        trend.append({"date": str(dd), "label": dd.strftime("%d %b"),
                      "revenue": round(rev_by_day.get(str(dd), 0), 2)})

    new_patients = db.query(func.count(Patient.id)).filter(
        Patient.clinic_id == cid, Patient.created_at >= start_dt, Patient.created_at <= end_dt).scalar() or 0
    total_patients = db.query(func.count(Patient.id)).filter(
        Patient.clinic_id == cid, Patient.is_active == True).scalar() or 0

    active_adm = db.query(func.count(Admission.id)).filter(
        Admission.clinic_id == cid, Admission.status == "active").scalar() or 0
    period_adm = db.query(func.count(Admission.id)).filter(
        Admission.clinic_id == cid, Admission.admitted_at >= start_dt, Admission.admitted_at <= end_dt).scalar() or 0
    beds = db.query(Bed).filter(Bed.clinic_id == cid).all()
    occ = {"vacant": 0, "occupied": 0, "maintenance": 0}
    for b in beds:
        occ[b.status] = occ.get(b.status, 0) + 1
    dept_names = {d.id: d.name for d in db.query(Department).filter(Department.clinic_id == cid).all()}
    adm_by_dept = {}
    for a in db.query(Admission).filter(Admission.clinic_id == cid, Admission.status == "active").all():
        dn = dept_names.get(getattr(a, "department_id", None), "Unassigned") or "Unassigned"
        adm_by_dept[dn] = adm_by_dept.get(dn, 0) + 1

    return {
        "period": period, "date_from": str(d_from), "date_to": str(d_to),
        "kpis": {
            "total_patients": int(total_patients), "new_patients": int(new_patients),
            "appointments": len(appts), "completed": appt_status.get("completed", 0),
            "billed": round(billed, 2), "collected": round(collected, 2),
            "pending": round(max(billed - collected, 0), 2),
            "active_admissions": int(active_adm), "period_admissions": int(period_adm),
            "beds_total": len(beds), "beds_occupied": occ.get("occupied", 0), "beds_vacant": occ.get("vacant", 0),
        },
        "appointments_by_status": appt_status,
        "appointments_by_type": appt_type,
        "revenue_trend": trend,
        "payment_modes": pay_modes,
        "billing_status": bill_status,
        "patients": {"new": int(new_patients), "returning": max(int(total_patients) - int(new_patients), 0)},
        "occupancy": occ,
        "admissions_by_department": adm_by_dept,
    }


# ── Online Bookings ───────────────────────────────────────────────────────────

@router.get("/online-bookings")
def list_online_bookings(
    status: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current=Depends(require_admin_or_receptionist),
):
    q = db.query(OnlineBooking).filter(OnlineBooking.clinic_id == current.clinic_id)
    if status:
        q = q.filter(OnlineBooking.status == status)
    bookings = q.order_by(OnlineBooking.created_at.desc()).limit(limit).all()
    return [{
        "id":                b.id,
        "patient_name":      b.patient_name,
        "mobile":            b.patient_mobile,
        "email":             b.patient_email,
        "booking_date":      str(b.booking_date),
        "booking_time":      b.booking_time,
        "reason":            b.reason,
        "status":            b.status,
        "confirmation_code": b.confirmation_code,
        "doctor_name":       b.doctor.staff.full_name if b.doctor and b.doctor.staff else "Unknown",
        "created_at":        str(b.created_at),
    } for b in bookings]


@router.put("/online-bookings/{booking_id}")
def update_online_booking(
    booking_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current=Depends(require_admin_or_receptionist),
):
    booking = db.query(OnlineBooking).filter(
        OnlineBooking.id == booking_id,
        OnlineBooking.clinic_id == current.clinic_id,
    ).first()
    if not booking:
        raise HTTPException(404, "Booking not found")

    new_status = body.get("status")
    if new_status not in ["confirmed", "cancelled", "pending"]:
        raise HTTPException(400, "Invalid status")

    booking.status = new_status
    if body.get("notes"):
        booking.notes = body["notes"]

    if new_status == "confirmed":
        patient = db.query(Patient).filter(
            Patient.mobile == booking.patient_mobile,
            Patient.clinic_id == current.clinic_id,
        ).first()
        if not patient:
            import random, string
            uhid = "BC-" + "".join(random.choices(string.digits, k=6))
            patient = Patient(
                clinic_id  = current.clinic_id,
                branch_id  = booking.branch_id,
                full_name  = booking.patient_name,
                mobile     = booking.patient_mobile,
                email      = booking.patient_email,
                uhid       = uhid,
                is_active  = True,
            )
            db.add(patient)
            db.flush()
        existing_count = db.query(Appointment).filter(
            Appointment.doctor_id == booking.doctor_id,
            Appointment.appointment_date == booking.booking_date,
            Appointment.branch_id == booking.branch_id,
        ).count()
        appt = Appointment(
            clinic_id        = current.clinic_id,
            branch_id        = booking.branch_id,
            patient_id       = patient.id,
            doctor_id        = booking.doctor_id,
            appointment_date = booking.booking_date,
            appointment_time = booking.booking_time,
            token_number     = existing_count + 1,
            status           = "confirmed",
            mode             = "online",
            reason           = booking.reason,
            online_booking_id = booking.id,
        )
        db.add(appt)

    db.commit()
    return {"message": f"Booking {new_status}", "id": booking_id}


# ── Follow-up Reminders ───────────────────────────────────────────────────────

@router.get("/follow-up-reminders")
def list_follow_up_reminders(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    from datetime import date as today_date
    q = db.query(FollowUpReminder).filter(
        FollowUpReminder.clinic_id == current.clinic_id
    )
    if status:
        q = q.filter(FollowUpReminder.status == status)
    reminders = q.order_by(FollowUpReminder.due_date.asc()).all()
    today = today_date.today()
    result = []
    for r in reminders:
        days_until = (r.due_date - today).days
        result.append({
            "id":             r.id,
            "appointment_id": r.appointment_id,
            "patient_name":   r.patient_name,
            "patient_mobile": r.patient_mobile,
            "doctor_name":    r.doctor_name,
            "due_date":       str(r.due_date),
            "follow_up_days": r.follow_up_days,
            "notes":          r.notes,
            "status":         r.status,
            "called_at":      str(r.called_at) if r.called_at else None,
            "created_at":     str(r.created_at) if r.created_at else None,
            "days_until":     days_until,
            "urgency":        "overdue" if days_until < 0 else ("today" if days_until == 0 else ("soon" if days_until <= 3 else "upcoming")),
        })
    return result


@router.patch("/follow-up-reminders/{reminder_id}")
def update_follow_up_reminder(
    reminder_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    reminder = db.query(FollowUpReminder).filter(
        FollowUpReminder.id == reminder_id,
        FollowUpReminder.clinic_id == current.clinic_id,
    ).first()
    if not reminder:
        raise HTTPException(404, "Reminder not found")

    allowed = ["status", "notes", "scheduled_appointment_id"]
    for k in allowed:
        if k in body:
            setattr(reminder, k, body[k])

    if body.get("status") in ("called", "scheduled", "dismissed") and not reminder.called_at:
        reminder.called_by = current.id
        reminder.called_at = datetime.utcnow()

    db.commit()
    return {"message": "Updated"}
