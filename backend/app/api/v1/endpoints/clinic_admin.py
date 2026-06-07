from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os, shutil, calendar, secrets, string
from datetime import date, datetime

def _generate_temp_password() -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    while True:
        pwd = ''.join(secrets.choice(alphabet) for _ in range(12))
        if (any(c.isupper() for c in pwd) and any(c.islower() for c in pwd)
                and any(c.isdigit() for c in pwd) and any(c in "!@#$%" for c in pwd)):
            return pwd

from app.db.session import get_db
from app.core.security import get_current_staff, hash_password
from app.core.config import settings
from app.models.models import (
    Clinic, Branch, Staff, DoctorProfile, DoctorSchedule,
    Appointment, Invoice, Patient, OnlineBooking, AuditLog, PasswordResetRequest
)
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
    db.commit()
    db.refresh(branch)
    return branch


# ── Staff Management ──────────────────────────────────────────────────────────

@router.get("/staff", response_model=List[StaffOut])
def list_staff(
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current=Depends(require_clinic_admin),
):
    q = db.query(Staff).filter(Staff.clinic_id == current.clinic_id)
    if role:
        q = q.filter(Staff.role == role)
    return q.order_by(Staff.full_name).all()


@router.post("/staff")
def create_staff(
    body: dict,
    db: Session = Depends(get_db),
    current=Depends(require_clinic_admin),
):
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
        # Pharmacy/lab/imaging staff need SaaS provider license verification before login
        is_active       = body.get("role") not in ['pharmacist', 'lab_technician', 'imaging_tech'],
    )
    db.add(new_staff)
    db.flush()

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
    for field in ["full_name", "mobile", "is_active", "branch_id", "role"]:
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
    staff.is_active = not staff.is_active
    db.commit()
    return {"id": staff.id, "is_active": staff.is_active}


@router.put("/staff/{staff_id}/inpatient-access")
def set_inpatient_access(
    staff_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current=Depends(require_clinic_admin),
):
    """Grant or revoke CareChart inpatient access for a doctor. Hospital managers only."""
    clinic = db.query(Clinic).filter(Clinic.id == current.clinic_id).first()
    if not clinic or str(clinic.org_type) not in ("hospital",):
        raise HTTPException(403, "Inpatient access management is only available for hospitals")
    if not clinic.wards_enabled:
        raise HTTPException(403, "Wards are not enabled for this clinic")

    staff = db.query(Staff).filter(Staff.id == staff_id, Staff.clinic_id == current.clinic_id).first()
    if not staff:
        raise HTTPException(404, "Staff not found")
    if staff.role not in ("doctor", "nurse"):
        raise HTTPException(400, "Inpatient access can only be granted to doctors or nurses")

    grant = bool(body.get("grant", True))
    staff.has_inpatient_access = grant
    db.commit()
    return {"id": staff.id, "has_inpatient_access": staff.has_inpatient_access}


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
    } for d in doctors]


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
    doctor = db.query(DoctorProfile).filter(DoctorProfile.id == doctor_profile_id).first()
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


# ── Staff Security Management ─────────────────────────────────────────────────

PROTECTED_ROLES = ["clinic_admin", "clinic_manager"]

@router.post("/staff/{staff_id}/reset-password")
def clinic_reset_staff_password(
    staff_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff)
):
    """Clinic manager resets a staff member's password (issues temp password)."""
    staff = db.query(Staff).filter(Staff.id == staff_id, Staff.clinic_id == current.clinic_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    if staff.id == current.id:
        raise HTTPException(status_code=400, detail="Cannot reset your own password here — use change-password")

    temp_pw = _generate_temp_password()
    staff.hashed_password = hash_password(temp_pw)
    staff.token_version = (staff.token_version or 1) + 1
    staff.is_first_login = True  # force password change on next login

    # Resolve any pending reset requests for this staff
    db.query(PasswordResetRequest).filter(
        PasswordResetRequest.staff_id == staff_id,
        PasswordResetRequest.status == "pending"
    ).update({"status": "resolved", "resolved_at": datetime.utcnow(), "resolved_by": current.id})

    log = AuditLog(
        actor_id=current.id, actor_type="staff",
        action="reset_staff_password",
        target_type="staff", target_id=staff_id,
        clinic_id=current.clinic_id,
        details=f"Temporary password issued by manager {current.full_name}"
    )
    db.add(log)
    db.commit()
    return {"message": "Password reset. Staff must change on next login.", "temp_password": temp_pw}


@router.post("/staff/{staff_id}/revoke-all-access")
def clinic_revoke_all_access(
    staff_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff)
):
    """Deactivate account + kick all sessions + clear PIN. For terminated/resigned staff."""
    reason = (body.get("reason") or "").strip()
    if not reason:
        raise HTTPException(status_code=400, detail="Reason is required for access revocation")

    staff = db.query(Staff).filter(Staff.id == staff_id, Staff.clinic_id == current.clinic_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    if staff.id == current.id:
        raise HTTPException(status_code=400, detail="Cannot revoke your own access")

    staff.is_active = False
    staff.token_version = (staff.token_version or 1) + 1
    staff.pin_hash = None
    staff.pin_set_at = None

    log = AuditLog(
        actor_id=current.id, actor_type="staff",
        action="revoke_all_access",
        target_type="staff", target_id=staff_id,
        clinic_id=current.clinic_id,
        details=f"Reason: {reason}. Revoked by {current.full_name}."
    )
    db.add(log)
    db.commit()
    return {"message": f"All access revoked for {staff.full_name}"}


@router.post("/staff/{staff_id}/reset-pin")
def clinic_reset_staff_pin(
    staff_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff)
):
    """Clear staff PIN and force re-setup."""
    staff = db.query(Staff).filter(Staff.id == staff_id, Staff.clinic_id == current.clinic_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    staff.pin_hash = None
    staff.pin_set_at = None
    staff.pin_reset_required = True
    staff.pin_failed_attempts = 0
    staff.pin_locked_until = None

    log = AuditLog(
        actor_id=current.id, actor_type="staff",
        action="reset_staff_pin",
        target_type="staff", target_id=staff_id,
        clinic_id=current.clinic_id,
        details=f"PIN cleared by manager {current.full_name}"
    )
    db.add(log)
    db.commit()
    return {"message": "PIN cleared. Staff must set a new PIN before chart access."}


@router.get("/staff/password-reset-requests")
def clinic_get_reset_requests(
    db: Session = Depends(get_db),
    current=Depends(get_current_staff)
):
    """List pending forgot-password requests from staff in this clinic."""
    requests = db.query(PasswordResetRequest).filter(
        PasswordResetRequest.clinic_id == current.clinic_id,
        PasswordResetRequest.status == "pending"
    ).order_by(PasswordResetRequest.requested_at.desc()).all()

    result = []
    for r in requests:
        staff = db.query(Staff).filter(Staff.id == r.staff_id).first()
        result.append({
            "id": r.id,
            "staff_id": r.staff_id,
            "staff_name": staff.full_name if staff else "Unknown",
            "staff_role": staff.role if staff else None,
            "requested_at": r.requested_at,
            "note": r.note,
        })
    return result
    return {"message": f"Booking {new_status}", "id": booking_id}
