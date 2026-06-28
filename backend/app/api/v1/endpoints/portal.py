from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import or_
from jose import JWTError, jwt
from app.db.session import get_db
from app.core.config import settings
from app.models.models import PatientUser, Patient, BHProfile, DrugCounselling

router = APIRouter(prefix="/portal", tags=["patient-portal"])
security = HTTPBearer()


def _decode_patient_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("user_type") != "patient":
            raise HTTPException(status_code=401, detail="Not a patient token")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_current_patient(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    payload = _decode_patient_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="No user ID in token")
    user = db.query(PatientUser).filter(PatientUser.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    # Active BH profile from the token (the patient currently selected in the portal).
    # Stamped onto the principal so every data read can isolate per-patient — even when
    # several patients share one phone / login.
    user.active_profile_id = None
    user.active_bh_id = None
    _bhp = payload.get("bh_profile_id")
    if _bhp:
        _prof = db.query(BHProfile).filter(
            BHProfile.id == int(_bhp), BHProfile.patient_user_id == user.id
        ).first()
        if _prof:
            user.active_profile_id = _prof.id
            user.active_bh_id = _prof.bh_id
    return user


def _active_patient_ids(db, current):
    """Patient rows for the ACTIVE BH profile only — never the whole phone/family.
    Falls back to all of the user's patients only when the token carries no profile
    (legacy tokens; the portal always sends one after login/switch)."""
    q = db.query(Patient.id).filter(Patient.portal_user_id == current.id)
    pid = getattr(current, "active_profile_id", None)
    bhid = getattr(current, "active_bh_id", None)
    if pid or bhid:
        q = q.filter(or_(Patient.bhid_profile_id == pid, Patient.bh_id == bhid))
    return [x for (x,) in q.all()]


def get_current_patient_with_profile(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Returns (PatientUser, BHProfile|None) tuple."""
    payload = _decode_patient_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="No user ID in token")
    user = db.query(PatientUser).filter(PatientUser.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    profile = None
    bh_profile_id = payload.get("bh_profile_id")
    if bh_profile_id:
        profile = db.query(BHProfile).filter(
            BHProfile.id == int(bh_profile_id),
            BHProfile.patient_user_id == user.id,
        ).first()
    return user, profile


@router.get("/me")
def portal_me(
    auth=Depends(get_current_patient_with_profile),
    db: Session = Depends(get_db)
):
    from datetime import date
    current, bh_profile = auth
    all_patients = db.query(Patient).filter(Patient.portal_user_id == current.id).all()
    # Isolate to the ACTIVE BH profile's patient rows so the Health-ID card never
    # mixes demographics/clinical data from another patient sharing this phone/login.
    if bh_profile:
        patients = [
            p for p in all_patients
            if p.bhid_profile_id == bh_profile.id
            or (bh_profile.bh_id and p.bh_id == bh_profile.bh_id)
        ]
    else:
        patients = all_patients

    full_name = current.full_name or ""
    bh_id = None
    if bh_profile:
        full_name = f"{bh_profile.first_name} {bh_profile.last_name}"
        bh_id = bh_profile.bh_id
    elif patients:
        bh_id = patients[0].bh_id

    # Patients for whom this user is registered as guardian (keyed to the phone
    # owner, returned as a separate labelled list — never merged into the card above)
    guardian_patients = db.query(Patient).filter(
        Patient.guardian_mobile == current.mobile
    ).all()

    def _age(p):
        if p.date_of_birth:
            return (date.today() - p.date_of_birth).days // 365
        return None

    # Pull patient profile fields from the ACTIVE profile's linked Patient record
    primary = patients[0] if patients else None

    return {
        "id": current.id,
        "full_name": full_name,
        "mobile": current.mobile,
        "email": current.email,
        "preferred_language": current.preferred_language,
        "bh_id": bh_id,
        "linked_clinics": len(patients),
        # Patient profile fields (populated from primary linked Patient record)
        "date_of_birth": str(primary.date_of_birth) if primary and primary.date_of_birth else None,
        "gender": primary.gender if primary else None,
        "blood_group": primary.blood_group if primary else None,
        "address": primary.address if primary else None,
        "city": primary.city if primary else None,
        "state": primary.state if primary else None,
        "pincode": primary.pincode if primary else None,
        # Patient's contact number — the card/UI reads `phone`; fall back to the login mobile.
        "phone": (primary.mobile if (primary and primary.mobile) else current.mobile),
        "allergies": primary.allergies if primary else None,
        "chronic_conditions": (
            [s.strip() for s in str(primary.chronic_conditions or "").replace("\n", ",").split(",") if s.strip()]
            if primary else []
        ),
        "emergency_contact_name": primary.emergency_contact_name if primary else None,
        "emergency_contact_phone": primary.emergency_contact_phone if primary else None,
        "guardian_of": [
            {
                "id": p.id,
                "full_name": p.full_name,
                "bh_id": p.bh_id,
                "age": _age(p),
                "gender": p.gender,
            }
            for p in guardian_patients
        ],
    }

@router.get("/appointments")
def portal_appointments(current=Depends(get_current_patient), db: Session = Depends(get_db)):
    from app.models.models import Appointment, DoctorProfile, Clinic, OnlineBooking
    patient_ids = _active_patient_ids(db, current)

    result = []
    converted_booking_ids = set()

    if patient_ids:
        appts = db.query(Appointment).filter(
            Appointment.patient_id.in_(patient_ids)
        ).order_by(Appointment.appointment_date.desc()).limit(50).all()
        for a in appts:
            if a.online_booking_id:
                converted_booking_ids.add(a.online_booking_id)
            doc = db.query(DoctorProfile).filter(DoctorProfile.id == a.doctor_id).first()
            clinic = db.query(Clinic).filter(Clinic.id == a.clinic_id).first()
            result.append({
                "id": a.id,
                "date": str(a.appointment_date),
                "time": a.appointment_time,
                "status": str(a.status) if a.status else None,
                "doctor_name": doc.staff.full_name if doc and doc.staff else "Unknown",
                "clinic_name": clinic.name if clinic else "Unknown",
                "clinic_address": clinic.address if clinic else None,
                "clinic_city": clinic.city if clinic else None,
                "reason": a.reason,
                "token_number": a.token_number,
                "mode": a.mode or "offline",
                "source": "clinic",
                "doctor_profile_id": a.doctor_id,
            })

    # Online bookings for the ACTIVE patient only — matched by their BH-ID
    # (bh_id_ref), so a shared phone never leaks another patient's bookings.
    # Visible even before the health center confirms.
    _abh = getattr(current, "active_bh_id", None)
    _bq = db.query(OnlineBooking)
    if _abh:
        _bq = _bq.filter(OnlineBooking.bh_id_ref == _abh)
    else:
        _bq = _bq.filter(
            (OnlineBooking.patient_user_id == current.id) |
            (OnlineBooking.patient_mobile == current.mobile)
        )
    bookings = _bq.order_by(OnlineBooking.booking_date.desc()).limit(50).all()
    for b in bookings:
        if b.id in converted_booking_ids:
            continue  # already shown as a clinic-confirmed appointment
        doc = db.query(DoctorProfile).filter(DoctorProfile.id == b.doctor_id).first() if b.doctor_id else None
        clinic = db.query(Clinic).filter(Clinic.id == b.clinic_id).first()
        result.append({
            "id": f"ob-{b.id}",
            "date": str(b.booking_date),
            "time": b.booking_time,
            "status": b.status or "pending",
            "doctor_name": doc.staff.full_name if doc and doc.staff else "Doctor",
            "clinic_name": clinic.name if clinic else "Unknown",
            "clinic_address": clinic.address if clinic else None,
            "clinic_city": clinic.city if clinic else None,
            "reason": b.reason,
            "token_number": None,
            "mode": b.mode or "offline",
            "source": "online_booking",
            "confirmation_code": b.confirmation_code,
            "patient_name": b.patient_name,
            "first_name": b.first_name,
            "last_name": b.last_name,
            "doctor_profile_id": b.doctor_id,
            "payment_mode": b.payment_mode or "pay_at_clinic",
            "payment_status": b.payment_status or "pending",
            "amount_due": float(b.amount_due) if b.amount_due else None,
            "patient_state": b.patient_state,
            "bh_id_ref": b.bh_id_ref,
            "booking_id": b.id,
        })

    result.sort(key=lambda x: ((x["date"] or ""), (x["time"] or "")), reverse=True)
    return {"appointments": result}


@router.get("/clinical-history")
def portal_clinical_history(current=Depends(get_current_patient), db: Session = Depends(get_db)):
    """Full clinical record of every completed visit — SOAP notes, vitals,
    tests, prescriptions — one call, chronological, newest first."""
    from app.models.models import (
        Appointment, DoctorProfile, Clinic, SoapNote, Vitals,
        Prescription, PrescriptionItem, LabOrder,
    )
    patient_ids = _active_patient_ids(db, current)
    if not patient_ids:
        return {"visits": []}

    appts = db.query(Appointment).filter(
        Appointment.patient_id.in_(patient_ids)
    ).order_by(Appointment.appointment_date.desc()).limit(200).all()

    visits = []
    for a in appts:
        doc = db.query(DoctorProfile).filter(DoctorProfile.id == a.doctor_id).first()
        clinic = db.query(Clinic).filter(Clinic.id == a.clinic_id).first()
        soap = db.query(SoapNote).filter(SoapNote.appointment_id == a.id).first()
        vit = db.query(Vitals).filter(Vitals.appointment_id == a.id).first()

        vitals = None
        if vit:
            vitals = {
                "bp": f"{vit.blood_pressure_systolic}/{vit.blood_pressure_diastolic}"
                      if vit.blood_pressure_systolic and vit.blood_pressure_diastolic else None,
                "pulse": vit.pulse_rate,
                "temperature": float(vit.temperature) if vit.temperature else None,
                "weight_kg": float(vit.weight_kg) if vit.weight_kg else None,
                "height_cm": float(vit.height_cm) if vit.height_cm else None,
                "spo2": vit.oxygen_saturation,
                "blood_sugar": float(vit.blood_sugar) if vit.blood_sugar else None,
            }
            if not any(vitals.values()):
                vitals = None

        medications = []
        rxs = db.query(Prescription).filter(Prescription.appointment_id == a.id).all()
        for rx in rxs:
            for item in db.query(PrescriptionItem).filter(
                PrescriptionItem.prescription_id == rx.id
            ).all():
                medications.append({
                    "name": item.medicine_name or (item.medicine.name if item.medicine else "Medicine"),
                    "dosage": item.dosage,
                    "frequency": item.frequency,
                    "duration": item.duration,
                    "instructions": item.instructions,
                })

        tests = []
        for order in db.query(LabOrder).filter(LabOrder.appointment_id == a.id).all():
            tests.append({
                "order_id": order.order_id,
                "test_names": order.test_names or [],
                "status": order.status,
                "clinical_notes": order.clinical_notes,
            })

        note = None
        if soap:
            note = {
                "reason_for_visit": soap.reason_for_visit,
                "complaints": soap.patient_complaints or soap.subjective,
                "past_history": soap.past_history,
                "examination": soap.objective,
                "investigations": soap.investigations_findings,
                "assessment": soap.discharge_assessment or soap.assessment,
                "medications_text": soap.medications_prescribed,
                "plan_counselling": soap.cautions_followup or soap.plan,
                "follow_up_days": soap.follow_up_days,
            }
            if not any(v for v in note.values()):
                note = None

        visits.append({
            "appointment_id": a.id,
            "date": str(a.appointment_date),
            "time": a.appointment_time,
            "status": str(a.status) if a.status else None,
            "mode": a.mode or "offline",
            "visit_type": a.visit_type,
            "reason": a.reason,
            "doctor_name": doc.staff.full_name if doc and doc.staff else "Unknown",
            "doctor_specialty": doc.specialty if doc else None,
            "clinic_name": clinic.name if clinic else "Unknown",
            "clinic_city": clinic.city if clinic else None,
            "vitals": vitals,
            "note": note,
            "medications": medications,
            "tests": tests,
            "has_documentation": bool(note or vitals or medications or tests),
        })

    return {"visits": visits}


@router.post("/appointments/{appointment_id}/join")
async def portal_join_telehealth(
    appointment_id: int,
    current=Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    """Patient joins their telehealth visit — gated by session state machine."""
    from app.models.models import Appointment
    from app.api.v1.endpoints.telehealth import issue_join

    patient_ids = _active_patient_ids(db, current)
    if not patient_ids:
        raise HTTPException(404, "Appointment not found")
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.patient_id.in_(patient_ids),
    ).first()
    if not appt:
        raise HTTPException(404, "Appointment not found")
    return await issue_join(db, appt, role="patient", actor_id=current.id)


@router.post("/book")
def portal_book_appointment(
    body: dict,
    current: PatientUser = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    """
    Book an appointment from inside the patient portal.
    Reuses the public booking flow, with name/mobile taken from the
    logged-in account so the booking is always linked to it.
    """
    from app.schemas.schemas import OnlineBookingCreate
    from app.api.v1.endpoints.public import book_appointment_online

    # Resolve first_name/last_name from body or full_name
    _first = (body.get("first_name") or "").strip()
    _last = (body.get("last_name") or "").strip()
    if not _first and not _last:
        _parts = (body.get("patient_name") or current.full_name or "Patient").strip().split(" ", 1)
        _first = _parts[0]
        _last = _parts[1] if len(_parts) > 1 else ""

    try:
        payload = OnlineBookingCreate(
            clinic_id=body.get("clinic_id"),
            branch_id=body.get("branch_id"),
            doctor_id=body.get("doctor_id"),
            first_name=_first,
            last_name=_last,
            patient_mobile=current.mobile,
            patient_email=body.get("patient_email") or current.email or None,
            booking_date=body.get("booking_date"),
            booking_time=body.get("booking_time"),
            reason=body.get("reason"),
            mode=body.get("mode", "offline"),
            patient_state=body.get("patient_state"),
            bh_id_ref=body.get("bh_id_ref"),
            payment_mode=body.get("payment_mode", "pay_at_clinic"),
            payment_status="pending",
            amount_due=body.get("amount_due"),
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid booking details: {e}")

    result = book_appointment_online(payload, db)
    # result is now a dict from the updated endpoint
    return {
        "id": result["id"],
        "confirmation_code": result["confirmation_code"],
        "status": result["status"],
        "booking_date": result["booking_date"],
        "booking_time": result["booking_time"],
        "bh_id": result.get("bh_id"),
        "is_new_patient": result.get("is_new_patient"),
    }


@router.post("/bookings/{booking_id}/cancel")
def portal_cancel_booking(
    booking_id: int,
    current: PatientUser = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    from app.models.models import OnlineBooking, Appointment
    # Try online booking first
    booking = db.query(OnlineBooking).filter(
        OnlineBooking.id == booking_id,
        ((OnlineBooking.bh_id_ref == current.active_bh_id) if getattr(current, "active_bh_id", None) else ((OnlineBooking.patient_user_id == current.id) | (OnlineBooking.patient_mobile == current.mobile)))
    ).first()
    if booking:
        if booking.status in ('pending', 'confirmed', 'in_progress'):
            booking.status = 'cancelled'
            db.commit()
            return {"cancelled": True, "type": "online_booking"}
        raise HTTPException(status_code=400, detail="Cannot cancel this booking")
    raise HTTPException(status_code=404, detail="Booking not found")

@router.post("/appointments/{appointment_id}/cancel")
def portal_cancel_appointment(
    appointment_id: int,
    current: PatientUser = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    from app.models.models import Appointment, Patient
    patient_ids = _active_patient_ids(db, current)
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.patient_id.in_(patient_ids)
    ).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appt.status in ('pending', 'confirmed', 'in_progress'):
        appt.status = 'cancelled'
        db.commit()
        return {"cancelled": True}
    raise HTTPException(status_code=400, detail="Cannot cancel this appointment")

@router.put("/bookings/{booking_id}/reschedule")
def portal_reschedule_booking(
    booking_id: int,
    body: dict,
    current: PatientUser = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    from app.models.models import OnlineBooking
    booking = db.query(OnlineBooking).filter(
        OnlineBooking.id == booking_id,
        ((OnlineBooking.bh_id_ref == current.active_bh_id) if getattr(current, "active_bh_id", None) else ((OnlineBooking.patient_user_id == current.id) | (OnlineBooking.patient_mobile == current.mobile)))
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status not in ('pending', 'confirmed'):
        raise HTTPException(status_code=400, detail="Cannot reschedule this booking")
    if body.get("booking_date"):
        booking.booking_date = body["booking_date"]
    if body.get("booking_time"):
        booking.booking_time = body["booking_time"]
    db.commit()
    return {"rescheduled": True, "booking_date": str(booking.booking_date), "booking_time": booking.booking_time}


@router.get("/prescriptions")
def portal_prescriptions(current=Depends(get_current_patient), db: Session = Depends(get_db)):
    from app.models.models import Prescription, DoctorProfile, Clinic
    patient_ids = _active_patient_ids(db, current)
    if not patient_ids:
        return {"prescriptions": []}
    prescriptions = db.query(Prescription).filter(
        Prescription.patient_id.in_(patient_ids)
    ).order_by(Prescription.created_at.desc()).limit(50).all()
    result = []
    for rx in prescriptions:
        doc = db.query(DoctorProfile).filter(DoctorProfile.id == rx.prescribed_by).first() if rx.prescribed_by else None
        clinic = db.query(Clinic).filter(Clinic.id == rx.clinic_id).first()
        items = [{"medicine_name": i.medicine_name, "dosage": i.dosage, "frequency": i.frequency,
                  "duration": i.duration, "instructions": i.instructions} for i in rx.items]
        result.append({
            "id": rx.id,
            "date": str(rx.created_at.date()) if rx.created_at else None,
            "doctor_name": doc.staff.full_name if doc and doc.staff else "Unknown",
            "clinic_name": clinic.name if clinic else "Unknown",
            "items": items,
            "notes": rx.notes,
        })
    return {"prescriptions": result}


@router.get("/bills")
def portal_bills(current=Depends(get_current_patient), db: Session = Depends(get_db)):
    from app.models.models import Invoice, Clinic, Appointment, DoctorProfile, Staff
    patient_ids = _active_patient_ids(db, current)
    if not patient_ids:
        return {"bills": []}
    invoices = db.query(Invoice).filter(
        Invoice.patient_id.in_(patient_ids)
    ).order_by(Invoice.created_at.desc()).limit(50).all()
    result = []
    for inv in invoices:
        clinic = db.query(Clinic).filter(Clinic.id == inv.clinic_id).first()
        # resolve doctor from linked appointment
        doctor_name = None
        if inv.appointment_id:
            appt = db.query(Appointment).filter(Appointment.id == inv.appointment_id).first()
            if appt and appt.doctor_id:
                doc = db.query(DoctorProfile).filter(DoctorProfile.id == appt.doctor_id).first()
                if doc and doc.staff:
                    doctor_name = doc.staff.full_name
        items = [
            {
                "description": i.description or "—",
                "item_type": i.item_type,
                "quantity": i.quantity,
                "unit_price": float(i.unit_price or 0),
                "discount": float(i.discount_amount or 0),
                "amount": float(i.total or 0),
            }
            for i in inv.items
        ]
        result.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "date": str(inv.created_at.date()) if inv.created_at else None,
            "clinic_name": clinic.name if clinic else "Unknown",
            "doctor_name": doctor_name,
            "total": float(inv.total or 0),
            "amount_paid": float(inv.amount_paid or 0),
            "amount_due": float((inv.total or 0) - (inv.amount_paid or 0)),
            "status": str(inv.status) if inv.status else "pending",
            "payment_method": inv.payment_method,
            "items": items,
        })
    return {"bills": result}


@router.get("/lab-results")
def portal_lab_results(current=Depends(get_current_patient), db: Session = Depends(get_db)):
    from app.models.models import LabOrder, LabResult, Staff, Clinic
    patient_ids = _active_patient_ids(db, current)
    if not patient_ids:
        return {"lab_results": []}
    orders = db.query(LabOrder).filter(
        LabOrder.patient_id.in_(patient_ids),
        LabOrder.status == 'signed',
    ).order_by(LabOrder.created_at.desc()).limit(30).all()
    result = []
    for lo in orders:
        doc = db.query(Staff).filter(Staff.id == lo.ordered_by).first() if lo.ordered_by else None
        clinic = db.query(Clinic).filter(Clinic.id == lo.clinic_id).first()
        res = lo.result
        result.append({
            "id": lo.id,
            "order_id": lo.order_id,
            "date": str(lo.created_at.date()) if lo.created_at else None,
            "doctor_name": doc.full_name if doc else "Unknown",
            "clinic_name": clinic.name if clinic else "Unknown",
            "status": lo.status,
            "test_names": lo.test_names or [],
            "result": {
                "observations": res.observations or [],
                "interpretation": res.interpretation,
                "signed_at": res.signed_at.isoformat() if res.signed_at else None,
                "report_hash": res.report_hash,
                "has_pdf": bool(res.pdf_b64),
            } if res else None,
        })
    return {"lab_results": result}


@router.get("/imaging-results")
def portal_imaging_results(current=Depends(get_current_patient), db: Session = Depends(get_db)):
    from app.models.models import ImagingOrder, ImagingResult, Staff, Clinic
    MODALITY_LABELS = {
        'CR': 'X-Ray', 'DX': 'X-Ray (Digital)', 'CT': 'CT Scan',
        'MR': 'MRI', 'US': 'Ultrasound', 'NM': 'Nuclear Medicine',
        'PT': 'PET Scan', 'MG': 'Mammography', 'RF': 'Fluoroscopy',
        'XA': 'Angiography', 'OT': 'Other',
    }
    patient_ids = _active_patient_ids(db, current)
    if not patient_ids:
        return {"imaging_results": []}
    orders = db.query(ImagingOrder).filter(
        ImagingOrder.patient_id.in_(patient_ids),
        ImagingOrder.status == 'signed',
    ).order_by(ImagingOrder.created_at.desc()).limit(30).all()
    result = []
    for io in orders:
        doc = db.query(Staff).filter(Staff.id == io.ordered_by).first() if io.ordered_by else None
        clinic = db.query(Clinic).filter(Clinic.id == io.clinic_id).first()
        res = io.result
        result.append({
            "id": io.id,
            "order_id": io.order_id,
            "date": str(io.created_at.date()) if io.created_at else None,
            "doctor_name": doc.full_name if doc else "Unknown",
            "clinic_name": clinic.name if clinic else "Unknown",
            "modality": io.modality,
            "modality_label": MODALITY_LABELS.get(io.modality or '', io.modality or ''),
            "body_part": io.body_part,
            "study_description": io.study_description,
            "status": io.status,
            "result": {
                "findings": res.findings,
                "impression": res.impression,
                "signed_at": res.signed_at.isoformat() if res.signed_at else None,
                "report_hash": res.report_hash,
                "has_pdf": bool(res.pdf_b64),
            } if res else None,
        })
    return {"imaging_results": result}


@router.put("/profile")
def update_profile(
    body: dict,
    current: PatientUser = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    from app.models.models import Patient
    from datetime import date

    if body.get("full_name"):
        current.full_name = body["full_name"]
    if body.get("email"):
        current.email = body["email"]
    if body.get("preferred_language"):
        current.preferred_language = body["preferred_language"]
    db.commit()

    _apids = _active_patient_ids(db, current)
    patient = db.query(Patient).filter(Patient.id.in_(_apids)).first() if _apids else None

    if patient:
        if body.get("date_of_birth"):
            try:
                patient.date_of_birth = date.fromisoformat(body["date_of_birth"])
            except Exception:
                pass
        if body.get("gender"):
            patient.gender = body["gender"]
        if body.get("blood_group"):
            patient.blood_group = body["blood_group"]
        if body.get("emergency_contact_phone") or body.get("emergency_contact"):
            patient.emergency_contact_phone = body.get("emergency_contact_phone") or body.get("emergency_contact")
        if body.get("emergency_contact_name"):
            patient.emergency_contact_name = body["emergency_contact_name"]
        if body.get("allergies"):
            patient.allergies = body["allergies"]
        if body.get("chronic_conditions") is not None:
            patient.chronic_conditions = body["chronic_conditions"]
        if body.get("address"):
            patient.address = body["address"]
        if body.get("abha_id"):
            patient.abha_id = body["abha_id"]
        db.commit()

    db.refresh(current)
    return {"message": "Profile updated successfully"}

import random
from datetime import timedelta
from app.core.security import hash_password, verify_password

PIN_TTL_MINUTES = 60

def _generate_pin():
    return str(random.randint(100000, 999999))

def _fresh_expiry():
    from datetime import datetime
    return datetime.utcnow() + timedelta(minutes=PIN_TTL_MINUTES)

@router.get("/pin")
def get_pin(current: PatientUser = Depends(get_current_patient), db: Session = Depends(get_db)):
    """
    Always generates a fresh PIN (plaintext never stored in DB).
    Returns PIN in response only — patient must note it down immediately.
    """
    raw = _generate_pin()
    current.disclosure_pin        = hash_password(raw)
    current.disclosure_pin_expiry = _fresh_expiry()
    db.commit()
    from datetime import datetime
    expires_in = PIN_TTL_MINUTES * 60
    return {
        "pin":              raw,
        "expires_at":       current.disclosure_pin_expiry.isoformat(),
        "expires_in_seconds": expires_in,
    }

@router.post("/pin/generate")
def generate_new_pin(current: PatientUser = Depends(get_current_patient), db: Session = Depends(get_db)):
    """Generate a fresh one-time PIN valid for 60 minutes. Plaintext never stored."""
    raw = _generate_pin()
    current.disclosure_pin        = hash_password(raw)
    current.disclosure_pin_expiry = _fresh_expiry()
    db.commit()
    return {
        "pin":              raw,
        "expires_at":       current.disclosure_pin_expiry.isoformat(),
        "expires_in_seconds": PIN_TTL_MINUTES * 60,
    }

@router.get("/drug-counselling")
def portal_drug_counselling(
    generic: str,
    current: PatientUser = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    """Return patient counselling tips for a drug generic name."""
    rows = (
        db.query(DrugCounselling)
        .filter(DrugCounselling.generic.ilike(generic.strip()))
        .order_by(DrugCounselling.sort_order)
        .all()
    )
    return {"generic": generic, "tips": [r.tip for r in rows]}

@router.post("/seed-demo")
def seed_demo_data(current: PatientUser = Depends(get_current_patient), db: Session = Depends(get_db)):
    """Seed demo prescriptions and lab results for the current patient (for review/testing only)."""
    from app.models.models import (
        Patient, Prescription, PrescriptionItem, LabOrder, LabResult,
        Appointment, Clinic, DoctorProfile, Staff, Invoice, InvoiceItem
    )
    from datetime import date, timedelta, datetime as _dt

    _apids = _active_patient_ids(db, current)
    patient = db.query(Patient).filter(Patient.id.in_(_apids)).first() if _apids else None
    if not patient:
        raise HTTPException(status_code=404, detail="No linked patient profile found")

    clinic = db.query(Clinic).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="No clinic found in system")
    doc = db.query(DoctorProfile).join(Staff).first()

    today = date.today()

    # --- Seed 3 prescriptions ---
    rx_data = [
        {
            "date_offset": 0,
            "notes": "Hypertension management",
            "items": [
                {"medicine_name": "Amlodipine", "dosage": "5 mg", "frequency": "Once daily", "duration": "30 days", "instructions": "Take in the morning"},
                {"medicine_name": "Telmisartan", "dosage": "40 mg", "frequency": "Once daily", "duration": "30 days", "instructions": "Take with or without food"},
            ]
        },
        {
            "date_offset": -45,
            "notes": "Upper respiratory infection",
            "items": [
                {"medicine_name": "Amoxicillin", "dosage": "500 mg", "frequency": "Thrice daily", "duration": "7 days", "instructions": "Complete full course"},
                {"medicine_name": "Cetirizine", "dosage": "10 mg", "frequency": "Once daily at night", "duration": "5 days", "instructions": "May cause drowsiness"},
                {"medicine_name": "Paracetamol", "dosage": "650 mg", "frequency": "As needed (max 4/day)", "duration": "5 days", "instructions": "For fever/pain relief"},
            ]
        },
        {
            "date_offset": -120,
            "notes": "Vitamin deficiency",
            "items": [
                {"medicine_name": "Vitamin D3", "dosage": "60,000 IU", "frequency": "Once weekly", "duration": "8 weeks", "instructions": "Take after meals with milk"},
                {"medicine_name": "Methylcobalamin", "dosage": "500 mcg", "frequency": "Twice daily", "duration": "60 days", "instructions": "Take with meals"},
            ]
        },
    ]

    created_rx = 0
    for rx in rx_data:
        rx_date = _dt.combine(today + timedelta(days=rx["date_offset"]), _dt.min.time())
        p = Prescription(
            clinic_id=clinic.id,
            patient_id=patient.id,
            prescribed_by=doc.staff.id if doc else None,
            status="dispensed",
            notes=rx["notes"],
            created_at=rx_date,
        )
        db.add(p)
        db.flush()
        for item in rx["items"]:
            db.add(PrescriptionItem(
                prescription_id=p.id,
                medicine_name=item["medicine_name"],
                dosage=item["dosage"],
                frequency=item["frequency"],
                duration=item["duration"],
                instructions=item["instructions"],
            ))
        created_rx += 1

    # --- Seed 2 lab orders with results ---
    lab_data = [
        {
            "order_id": "LO-DEMO-001",
            "date_offset": -10,
            "test_names": ["Complete Blood Picture (CBP)"],
            "observations": [
                {"test_name": "Haemoglobin (Hb)", "value": "11.2", "unit": "g/dL", "ref_range": "12.0–16.0", "flag": "L"},
                {"test_name": "WBC Count", "value": "8200", "unit": "cells/μL", "ref_range": "4000–11000", "flag": "N"},
                {"test_name": "Platelet Count", "value": "210000", "unit": "cells/μL", "ref_range": "150000–400000", "flag": "N"},
                {"test_name": "RBC Count", "value": "3.8", "unit": "million/μL", "ref_range": "4.0–5.5", "flag": "L"},
            ],
            "interpretation": "Mild anaemia noted. Haemoglobin and RBC count are below normal range. Suggest iron studies and dietary review.",
        },
        {
            "order_id": "LO-DEMO-002",
            "date_offset": -10,
            "test_names": ["Lipid Profile"],
            "observations": [
                {"test_name": "Total Cholesterol", "value": "210", "unit": "mg/dL", "ref_range": "<200", "flag": "H"},
                {"test_name": "LDL Cholesterol", "value": "138", "unit": "mg/dL", "ref_range": "<100", "flag": "H"},
                {"test_name": "HDL Cholesterol", "value": "48", "unit": "mg/dL", "ref_range": ">50", "flag": "L"},
                {"test_name": "Triglycerides", "value": "145", "unit": "mg/dL", "ref_range": "<150", "flag": "N"},
            ],
            "interpretation": "Borderline high cholesterol with elevated LDL. Lifestyle modification and dietary changes recommended. Consider statin therapy if no improvement in 3 months.",
        },
    ]

    created_lab = 0
    if doc:  # ordered_by is NOT NULL — skip lab orders when no doctor exists
        for lab in lab_data:
            if db.query(LabOrder).filter(LabOrder.order_id == lab["order_id"]).first():
                continue  # already seeded, skip to avoid unique constraint error
            lab_date = today + timedelta(days=lab["date_offset"])
            lab_dt = _dt.combine(lab_date, _dt.min.time())
            lo = LabOrder(
                order_id=lab["order_id"],
                patient_id=patient.id,
                clinic_id=clinic.id,
                ordered_by=doc.staff.id,
                test_names=lab["test_names"],
                status="signed",
                created_at=lab_dt,
            )
            db.add(lo)
            db.flush()
            result = LabResult(
                order_id=lo.id,
                observations=lab["observations"],
                interpretation=lab["interpretation"],
                signed_at=lab_dt,
                status="signed",
            )
            db.add(result)
            created_lab += 1

    # --- Seed 3 invoices ---
    bill_data = [
        {
            "date_offset": -3,
            "invoice_number": "INV-DEMO-001",
            "status": "paid",
            "payment_method": "UPI",
            "total": 1200.0,
            "amount_paid": 1200.0,
            "items": [
                {"description": "Consultation Fee", "item_type": "consultation", "quantity": 1, "unit_price": 800.0, "total": 800.0},
                {"description": "ECG", "item_type": "procedure", "quantity": 1, "unit_price": 250.0, "total": 250.0},
                {"description": "Blood Pressure Monitoring", "item_type": "procedure", "quantity": 1, "unit_price": 150.0, "total": 150.0},
            ],
        },
        {
            "date_offset": -48,
            "invoice_number": "INV-DEMO-002",
            "status": "partial",
            "payment_method": "Cash",
            "total": 2850.0,
            "amount_paid": 1500.0,
            "items": [
                {"description": "Consultation Fee", "item_type": "consultation", "quantity": 1, "unit_price": 800.0, "total": 800.0},
                {"description": "Complete Blood Picture (CBP)", "item_type": "lab", "quantity": 1, "unit_price": 450.0, "total": 450.0},
                {"description": "Lipid Profile", "item_type": "lab", "quantity": 1, "unit_price": 700.0, "total": 700.0},
                {"description": "Amoxicillin 500mg (10 tabs)", "item_type": "medicine", "quantity": 10, "unit_price": 12.0, "total": 120.0},
                {"description": "Cetirizine 10mg (10 tabs)", "item_type": "medicine", "quantity": 10, "unit_price": 8.0, "total": 80.0},
                {"description": "Paracetamol 650mg (10 tabs)", "item_type": "medicine", "quantity": 10, "unit_price": 7.0, "total": 70.0},
                {"description": "Nursing charges", "item_type": "other", "quantity": 1, "unit_price": 630.0, "total": 630.0},
            ],
        },
        {
            "date_offset": -123,
            "invoice_number": "INV-DEMO-003",
            "status": "pending",
            "payment_method": None,
            "total": 650.0,
            "amount_paid": 0.0,
            "items": [
                {"description": "Consultation Fee", "item_type": "consultation", "quantity": 1, "unit_price": 500.0, "total": 500.0},
                {"description": "Vitamin D3 60000 IU (8 caps)", "item_type": "medicine", "quantity": 8, "unit_price": 18.75, "total": 150.0},
            ],
        },
    ]

    created_bills = 0
    for bill in bill_data:
        if db.query(Invoice).filter(
            Invoice.patient_id == patient.id,
            Invoice.invoice_number == bill["invoice_number"]
        ).first():
            continue  # already seeded, skip to avoid duplicates
        bill_dt = _dt.combine(today + timedelta(days=bill["date_offset"]), _dt.min.time())
        inv = Invoice(
            clinic_id=clinic.id,
            patient_id=patient.id,
            invoice_number=bill["invoice_number"],
            status=bill["status"],
            payment_method=bill["payment_method"],
            total=bill["total"],
            amount_paid=bill["amount_paid"],
            created_at=bill_dt,
            paid_at=bill_dt if bill["status"] == "paid" else None,
        )
        db.add(inv)
        db.flush()
        for it in bill["items"]:
            db.add(InvoiceItem(
                invoice_id=inv.id,
                description=it["description"],
                item_type=it["item_type"],
                quantity=it["quantity"],
                unit_price=it["unit_price"],
                total=it["total"],
            ))
        created_bills += 1

    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save demo data: {exc}")
    return {"seeded": True, "prescriptions": created_rx, "lab_orders": created_lab, "bills": created_bills}


@router.get("/patient-profile")
def portal_patient_profile(auth=Depends(get_current_patient_with_profile), db: Session = Depends(get_db)):
    """Returns the BHProfile linked to the logged-in patient user."""
    current, bh_profile = auth

    if not bh_profile:
        # Try to get first profile
        bh_profile = db.query(BHProfile).filter(
            BHProfile.patient_user_id == current.id,
            BHProfile.is_active == True,
        ).first()

    if not bh_profile:
        return {
            "found": False,
            "mobile": current.mobile,
            "email": current.email,
        }

    return {
        "found": True,
        "id": bh_profile.id,
        "bh_id": bh_profile.bh_id,
        "first_name": bh_profile.first_name,
        "last_name": bh_profile.last_name,
        "full_name": f"{bh_profile.first_name} {bh_profile.last_name}".strip(),
        "gender": bh_profile.gender,
        "date_of_birth": str(bh_profile.date_of_birth) if bh_profile.date_of_birth else None,
        "state": bh_profile.state,
        "mobile": current.mobile,
        "email": current.email,
    }


@router.patch("/patient-profile")
def portal_update_patient_profile(
    body: dict,
    auth=Depends(get_current_patient_with_profile),
    db: Session = Depends(get_db),
):
    """Update BHProfile for the logged-in patient user. Creates one if not exists."""
    from app.api.v1.endpoints.auth import _get_state_digit, _next_bh_seq, _make_bh_id
    from datetime import date as date_type

    current, bh_profile = auth

    if not bh_profile:
        bh_profile = db.query(BHProfile).filter(
            BHProfile.patient_user_id == current.id,
            BHProfile.is_active == True,
        ).first()

    if not bh_profile:
        state = body.get("state", "")
        digit = _get_state_digit(state, db) if state else 9
        seq = _next_bh_seq(digit, db)
        bh_id = _make_bh_id(digit, seq)
        bh_profile = BHProfile(
            patient_user_id = current.id,
            bh_id           = bh_id,
            first_name      = body.get("first_name", ""),
            last_name       = body.get("last_name", ""),
            gender          = body.get("gender"),
            state           = state,
            state_digit     = digit,
        )
        if body.get("date_of_birth"):
            try:
                bh_profile.date_of_birth = date_type.fromisoformat(body["date_of_birth"])
            except Exception:
                pass
        db.add(bh_profile)
    else:
        for field in ("first_name", "last_name", "gender", "state"):
            if body.get(field) is not None:
                setattr(bh_profile, field, body[field])
        if body.get("date_of_birth"):
            try:
                bh_profile.date_of_birth = date_type.fromisoformat(body["date_of_birth"])
            except Exception:
                pass

    if body.get("email") and not current.email:
        current.email = body["email"]

    db.commit()
    db.refresh(bh_profile)

    return {
        "id": bh_profile.id,
        "bh_id": bh_profile.bh_id,
        "full_name": f"{bh_profile.first_name} {bh_profile.last_name}".strip(),
        "state": bh_profile.state,
        "gender": bh_profile.gender,
        "date_of_birth": str(bh_profile.date_of_birth) if bh_profile.date_of_birth else None,
    }
