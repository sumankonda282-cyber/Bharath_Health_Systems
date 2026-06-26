from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import Optional
from datetime import date as dt, timedelta

from app.db.session import get_db
from app.core.security import get_current_staff
from app.core.config import settings
from app.core import ids
from app.models.models import (
    Staff, Patient, Appointment, DoctorProfile,
    Vitals, SoapNote, Prescription, PrescriptionItem,
    LabOrder, LabOrderItem, Medicine, LabTest, FollowUpReminder
)

router = APIRouter(prefix="/doctor", tags=["doctor-desk"])

DOCTOR_ROLES = ['doctor', 'clinic_admin']


def require_doctor(current=Depends(get_current_staff)):
    if current.role not in DOCTOR_ROLES:
        raise HTTPException(status_code=403, detail="Doctor access required")
    return current


def _age(patient):
    if patient.date_of_birth:
        return (dt.today() - patient.date_of_birth).days // 365
    return None


@router.get("/queue")
def get_queue(
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    current: Staff = Depends(require_doctor),
):
    target = dt.fromisoformat(date) if date else dt.today()
    profile = db.query(DoctorProfile).filter(DoctorProfile.staff_id == current.id).first()

    q = db.query(Appointment).options(
        joinedload(Appointment.patient),
        joinedload(Appointment.vitals),
    ).filter(
        Appointment.clinic_id == current.clinic_id,
        Appointment.appointment_date == target,
    )
    if profile:
        q = q.filter(Appointment.doctor_id == profile.id)
    if current.branch_id:
        q = q.filter(Appointment.branch_id == current.branch_id)

    appointments = q.order_by(Appointment.token_number).all()

    vitals_map = {}
    for a in appointments:
        if a.vitals:
            v = a.vitals
            vitals_map[a.id] = {
                "bp":     f"{v.blood_pressure_systolic}/{v.blood_pressure_diastolic}" if getattr(v, 'blood_pressure_systolic', None) and getattr(v, 'blood_pressure_diastolic', None) else None,
                "temp":   str(v.temperature) if getattr(v, 'temperature', None) else None,
                "spo2":   str(v.oxygen_saturation) if getattr(v, 'oxygen_saturation', None) else None,
                "weight": str(v.weight_kg) if getattr(v, 'weight_kg', None) else None,
                "pulse":  str(v.pulse_rate) if getattr(v, 'pulse_rate', None) else None,
            }

    return [
        {
            "id":               a.id,
            "token_number":     a.token_number,
            "appointment_time": a.appointment_time,
            "appointment_date": str(a.appointment_date),
            "status":           a.status,
            "mode":             a.mode,
            "reason":           a.reason,
            "vitals_recorded":  a.vitals is not None,
            "vitals":           vitals_map.get(a.id),
            "patient_id":       a.patient.id if a.patient else None,
            "patient_uhid":     a.patient.uhid if a.patient else None,
            "patient_name":     a.patient.full_name if a.patient else None,
            "patient": {
                "id":          a.patient.id,
                "uhid":        a.patient.uhid,
                "full_name":   a.patient.full_name,
                "mobile":      a.patient.mobile,
                "gender":      a.patient.gender,
                "blood_group": a.patient.blood_group,
                "allergies":   a.patient.allergies,
                "age":         _age(a.patient),
            } if a.patient else None,
        }
        for a in appointments
    ]


@router.get("/encounter/{appointment_id}")
def get_encounter(
    appointment_id: int,
    db: Session = Depends(get_db),
    current: Staff = Depends(require_doctor),
):
    try:
        appt = db.query(Appointment).options(
            joinedload(Appointment.patient),
            joinedload(Appointment.vitals),
            joinedload(Appointment.soap_note),
            joinedload(Appointment.prescriptions).joinedload(Prescription.items),
            joinedload(Appointment.lab_orders).joinedload(LabOrder.items),
        ).filter(
            Appointment.id == appointment_id,
            Appointment.clinic_id == current.clinic_id,
        ).first()
    except Exception as e:
        # Column missing in DB — try loading without soap/prescriptions
        db.rollback()
        appt = db.query(Appointment).options(
            joinedload(Appointment.patient),
            joinedload(Appointment.vitals),
        ).filter(
            Appointment.id == appointment_id,
            Appointment.clinic_id == current.clinic_id,
        ).first()
        if not appt:
            raise HTTPException(status_code=404, detail="Appointment not found")
        return {
            "id": appt.id,
            "appointment_date": str(appt.appointment_date),
            "appointment_time": appt.appointment_time,
            "status": appt.status, "mode": appt.mode, "reason": appt.reason,
            "triage_complaint": appt.reason,
            "patient": {
                "id": appt.patient.id, "full_name": appt.patient.full_name,
                "gender": appt.patient.gender, "mobile": appt.patient.mobile,
                "date_of_birth": str(appt.patient.date_of_birth) if appt.patient and appt.patient.date_of_birth else None,
                "age": _age(appt.patient),
                "blood_group": appt.patient.blood_group if appt.patient else None,
                "allergies": appt.patient.allergies if appt.patient else None,
                "clinic_patient_id": getattr(appt.patient, 'clinic_patient_id', None),
            } if appt.patient else None,
            "vitals": None, "soap_note": None, "prescriptions": [], "lab_orders": [],
            "_db_warn": str(e)[:200],
        }
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    p = appt.patient
    sn = appt.soap_note
    return {
        "id":               appt.id,
        "appointment_date": str(appt.appointment_date),
        "appointment_time": appt.appointment_time,
        "status":           appt.status,
        "mode":             appt.mode,
        "reason":           appt.reason,
        "triage_complaint": appt.reason,
        "patient": {
            "id":               p.id, "uhid": p.uhid, "bh_id": p.bh_id,
            "clinic_patient_id": p.clinic_patient_id,
            "full_name":        p.full_name, "mobile": p.mobile, "email": p.email,
            "gender":           p.gender, "blood_group": p.blood_group,
            "allergies":        p.allergies,
            "date_of_birth":    str(p.date_of_birth) if p.date_of_birth else None,
            "age":              _age(p),
        } if p else None,
        "vitals": {
            "blood_pressure_systolic":  appt.vitals.blood_pressure_systolic,
            "blood_pressure_diastolic": appt.vitals.blood_pressure_diastolic,
            "pulse_rate":               appt.vitals.pulse_rate,
            "temperature":              str(appt.vitals.temperature) if appt.vitals.temperature else None,
            "weight_kg":                str(appt.vitals.weight_kg) if appt.vitals.weight_kg else None,
            "height_cm":                str(appt.vitals.height_cm) if appt.vitals.height_cm else None,
            "oxygen_saturation":        appt.vitals.oxygen_saturation,
            "blood_sugar":              str(appt.vitals.blood_sugar) if appt.vitals.blood_sugar else None,
        } if appt.vitals else None,
        "soap_note": {
            "reason_for_visit":        sn.reason_for_visit,
            "patient_complaints":      sn.patient_complaints,
            "past_history":            sn.past_history,
            "investigations_findings": sn.investigations_findings,
            "discharge_assessment":    sn.discharge_assessment,
            "cautions_followup":       sn.cautions_followup,
            "subjective":    sn.subjective,
            "objective":     sn.objective,
            "assessment":    sn.assessment,
            "plan":          sn.plan,
            "follow_up_days":sn.follow_up_days,
            "is_locked":     sn.is_locked,
        } if sn else None,
        "prescriptions": [
            {
                "id":     pr.id,
                "status": pr.status,
                "items":  [{"medicine_name": i.medicine_name, "dosage": i.dosage, "frequency": i.frequency, "duration": i.duration, "instructions": i.instructions} for i in pr.items]
            } for pr in appt.prescriptions
        ],
        "lab_orders": [
            {
                "id":     lo.id,
                "status": lo.status,
                "items":  [{"test_name": i.test_name, "result_value": i.result_value, "is_abnormal": i.is_abnormal} for i in lo.items]
            } for lo in appt.lab_orders
        ],
    }


@router.post("/encounter/{appointment_id}/complete")
def complete_encounter(
    appointment_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current: Staff = Depends(require_doctor),
):
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.clinic_id == current.clinic_id,
    ).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Not found")

    # Accept both "soap" and "soap_note" keys
    soap_data = body.get("soap") or body.get("soap_note")
    if soap_data:
        allowed = ["subjective", "objective", "assessment", "plan", "follow_up_days"]
        existing = db.query(SoapNote).filter(SoapNote.appointment_id == appointment_id).first()
        if existing:
            for k in allowed:
                if k in soap_data:
                    setattr(existing, k, soap_data[k])
        else:
            db.add(SoapNote(appointment_id=appointment_id, branch_id=current.branch_id, **{k: soap_data.get(k) for k in allowed}))

    # Prescription
    rx_data = body.get("prescription")
    if rx_data and rx_data.get("items"):
        rx = Prescription(
            clinic_id=appt.clinic_id,
            branch_id=current.branch_id,
            patient_id=appt.patient_id,
            appointment_id=appointment_id,
            prescribed_by=current.id,
            notes=rx_data.get("notes"),
        )
        db.add(rx)
        db.flush()
        for item in rx_data["items"]:
            med_name = (item.get("medicine_name") or "").strip()
            if med_name:
                db.add(PrescriptionItem(
                    prescription_id=rx.id,
                    medicine_name=med_name,
                    dosage=item.get("dosage", ""),
                    frequency=item.get("frequency", ""),
                    duration=item.get("duration", ""),
                    instructions=item.get("instructions", ""),
                ))

    # Lab order — accept "items" or "tests"
    lab_data = body.get("lab_order")
    if lab_data:
        tests = lab_data.get("items") or lab_data.get("tests") or []
        if tests:
            lo = LabOrder(
                order_id=ids.next_lab_order_no(db, appt.clinic_id),
                clinic_id=appt.clinic_id,
                branch_id=current.branch_id,
                patient_id=appt.patient_id,
                appointment_id=appointment_id,
                ordered_by=current.id,
                clinical_notes=lab_data.get("clinical_notes") or lab_data.get("notes"),
            )
            db.add(lo)
            db.flush()
            for t in tests:
                test_name = (t.get("test_name") or "").strip()
                if test_name:
                    db.add(LabOrderItem(order_id=lo.id, test_name=test_name))

    appt.status = "completed"
    db.commit()

    # Create follow-up reminder if follow_up_days was set
    if soap_data and soap_data.get("follow_up_days"):
        try:
            days = int(soap_data["follow_up_days"])
            due = dt.today() + timedelta(days=days)
            patient = db.query(Patient).filter(Patient.id == appt.patient_id).first()
            doctor_staff = db.query(Staff).filter(Staff.id == current.id).first()
            reminder = FollowUpReminder(
                appointment_id=appointment_id,
                clinic_id=appt.clinic_id,
                patient_name=patient.full_name if patient else "Unknown",
                patient_mobile=patient.mobile if patient else None,
                doctor_name=doctor_staff.full_name if doctor_staff else current.full_name,
                due_date=due,
                follow_up_days=days,
                notes=soap_data.get("plan") or None,
                status="pending",
            )
            db.add(reminder)
            db.commit()

            # Send patient SMS
            mobile = patient.mobile if patient else None
            if mobile and settings.FAST2SMS_API_KEY and not settings.OTP_MOCK:
                try:
                    import requests
                    clinic_name = "your clinic"
                    sms_msg = (
                        f"Dear {patient.full_name if patient else 'Patient'}, "
                        f"Dr. {reminder.doctor_name} recommends a follow-up visit in {days} days "
                        f"(by {due.strftime('%d %b %Y')}). "
                        f"Our team will call to schedule your appointment. - BharatCliniq"
                    )
                    requests.post(
                        "https://www.fast2sms.com/dev/bulkV2",
                        headers={"authorization": settings.FAST2SMS_API_KEY},
                        data={"message": sms_msg, "language": "english", "route": "q", "numbers": mobile},
                        timeout=5,
                    )
                except Exception:
                    pass
        except Exception:
            pass

    return {"message": "Encounter completed successfully"}


@router.get("/patient/{patient_id}/chart")
def patient_chart(
    patient_id: int,
    db: Session = Depends(get_db),
    current: Staff = Depends(require_doctor),
):
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.clinic_id == current.clinic_id,
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    visits = db.query(Appointment).options(
        joinedload(Appointment.vitals),
        joinedload(Appointment.soap_note),
    ).filter(Appointment.patient_id == patient_id).order_by(desc(Appointment.appointment_date)).limit(20).all()

    prescriptions = db.query(Prescription).options(
        joinedload(Prescription.items)
    ).filter(Prescription.patient_id == patient_id).order_by(desc(Prescription.created_at)).limit(10).all()

    lab_orders = db.query(LabOrder).options(
        joinedload(LabOrder.items)
    ).filter(LabOrder.patient_id == patient_id).order_by(desc(LabOrder.created_at)).limit(10).all()

    return {
        "patient": {
            "id": patient.id, "uhid": patient.uhid, "full_name": patient.full_name,
            "age": _age(patient), "gender": patient.gender,
            "blood_group": patient.blood_group, "allergies": patient.allergies,
        },
        "visits": [
            {"id": v.id, "date": str(v.appointment_date), "status": v.status, "reason": v.reason,
             "soap": {"assessment": v.soap_note.assessment, "plan": v.soap_note.plan} if v.soap_note else None}
            for v in visits
        ],
        "prescriptions": [
            {"id": p.id, "date": str(p.created_at.date()), "status": p.status,
             "items": [{"medicine": i.medicine_name, "dosage": i.dosage, "duration": i.duration} for i in p.items]}
            for p in prescriptions
        ],
        "lab_orders": [
            {"id": lo.id, "date": str(lo.created_at.date()), "status": lo.status,
             "tests": [{"name": i.test_name, "result": i.result_value, "abnormal": i.is_abnormal} for i in lo.items]}
            for lo in lab_orders
        ],
    }


@router.get("/profile")
def get_my_doctor_profile(db: Session = Depends(get_db), current: Staff = Depends(require_doctor)):
    profile = db.query(DoctorProfile).filter(DoctorProfile.staff_id == current.id).first()
    # qualifications: split the stored comma-separated text field into a list
    qualifications = None
    if profile and profile.qualification:
        qualifications = [q.strip() for q in profile.qualification.split(',') if q.strip()]
    return {
        "id":                  current.id,
        "full_name":           current.full_name,
        "email":               current.email,
        "mobile":              current.mobile,
        "specialty":           profile.specialty if profile else None,
        "qualification":       profile.qualification if profile else None,
        "qualifications":      qualifications or [],
        "mci_number":          profile.mci_number if profile else None,
        "experience_years":    profile.experience_years if profile else 0,
        "consultation_fee":    float(profile.consultation_fee) if profile and profile.consultation_fee else 0,
        "bio":                 profile.bio if profile else None,
        "languages":           [l.strip() for l in profile.languages.split(',') if l.strip()] if profile and profile.languages else [],
        "telehealth_enabled":  profile.telehealth_enabled if profile else False,
        "telehealth_available": profile.telehealth_enabled if profile else False,
        # is_online / achievements / working_hours are not columns on DoctorProfile;
        # return safe defaults so the contract holds without crashing.
        "is_online":           getattr(profile, "is_online", False) if profile else False,
        "achievements":        getattr(profile, "achievements", []) if profile else [],
        "working_hours":       getattr(profile, "working_hours", {}) if profile else {},
        "doctor_profile_id":   profile.id if profile else None,
        "input_mode":          profile.input_mode if profile else 'type',
    }


@router.put("/profile")
def update_my_doctor_profile(body: dict, db: Session = Depends(get_db), current: Staff = Depends(require_doctor)):
    if body.get("full_name"):
        current.full_name = body["full_name"]
    profile = db.query(DoctorProfile).filter(DoctorProfile.staff_id == current.id).first()
    if not profile:
        profile = DoctorProfile(staff_id=current.id, clinic_id=current.clinic_id)
        db.add(profile)

    # Scalar fields
    for field in ["specialty", "qualification", "mci_number", "experience_years",
                  "consultation_fee", "bio", "telehealth_enabled", "input_mode",
                  "is_online"]:
        if field in body:
            setattr(profile, field, body[field])

    # telehealth_available maps to telehealth_enabled
    if "telehealth_available" in body:
        profile.telehealth_enabled = body["telehealth_available"]

    # languages: accept list or comma string
    if "languages" in body:
        langs = body["languages"]
        if isinstance(langs, list):
            profile.languages = ', '.join(langs)
        else:
            profile.languages = langs

    # qualifications: accept list, store in both JSON list and text field
    if "qualifications" in body:
        quals = body["qualifications"]
        if isinstance(quals, list):
            profile.qualifications_list = quals
            profile.qualification = ', '.join(quals)
        else:
            profile.qualification = quals

    # JSON fields
    for field in ["achievements", "working_hours"]:
        if field in body:
            setattr(profile, field, body[field])

    db.commit()
    return {"message": "Profile updated"}


@router.post("/queue/{appointment_id}/approve")
def approve_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current: Staff = Depends(require_doctor),
):
    """Doctor approves a pending online booking."""
    from app.models.models import OnlineBooking as OB
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.clinic_id == current.clinic_id,
    ).first()
    if not appt:
        raise HTTPException(404, "Appointment not found")
    appt.status = "confirmed"
    ob = db.query(OB).filter(
        OB.doctor_id == appt.doctor_id,
        OB.booking_date == appt.appointment_date,
        OB.booking_time == appt.appointment_time,
        OB.status == "pending",
    ).first()
    if ob:
        ob.status = "confirmed"
    db.commit()
    return {"success": True, "status": "confirmed"}


@router.post("/queue/{appointment_id}/decline")
def decline_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current: Staff = Depends(require_doctor),
):
    """Doctor declines a pending online booking."""
    from app.models.models import OnlineBooking as OB
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.clinic_id == current.clinic_id,
    ).first()
    if not appt:
        raise HTTPException(404, "Appointment not found")
    appt.status = "cancelled"
    ob = db.query(OB).filter(
        OB.doctor_id == appt.doctor_id,
        OB.booking_date == appt.appointment_date,
        OB.booking_time == appt.appointment_time,
        OB.status == "pending",
    ).first()
    if ob:
        ob.status = "cancelled"
    db.commit()
    return {"success": True, "status": "cancelled"}


@router.get("/my-patients")
def get_my_patients(
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current: Staff = Depends(require_doctor),
):
    """Return patients who have had appointments with this doctor only."""
    profile = db.query(DoctorProfile).filter(DoctorProfile.staff_id == current.id).first()
    if not profile:
        return []

    subq = db.query(Appointment.patient_id).filter(
        Appointment.doctor_id == profile.id,
        Appointment.clinic_id == current.clinic_id,
        Appointment.patient_id.isnot(None),
    ).distinct().subquery()

    q = db.query(Patient).filter(Patient.id.in_(subq))
    if search:
        q = q.filter(
            Patient.full_name.ilike(f"%{search}%") |
            Patient.mobile.ilike(f"%{search}%") |
            Patient.uhid.ilike(f"%{search}%")
        )

    patients = q.order_by(Patient.id.desc()).offset(skip).limit(limit).all()

    result = []
    for p in patients:
        last_appt = db.query(Appointment).filter(
            Appointment.patient_id == p.id,
            Appointment.doctor_id == profile.id,
        ).order_by(Appointment.appointment_date.desc()).first()
        result.append({
            "id": p.id,
            "uhid": p.uhid,
            "full_name": p.full_name,
            "mobile": p.mobile,
            "gender": p.gender,
            "blood_group": p.blood_group,
            "age": _age(p),
            "last_visit": str(last_appt.appointment_date) if last_appt else None,
            "last_reason": last_appt.reason if last_appt else None,
        })
    return result


@router.post("/encounter/{appointment_id}/save-draft")
def save_encounter_draft(
    appointment_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current: Staff = Depends(require_doctor),
):
    """Save SOAP, prescriptions and lab orders without completing the encounter."""
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.clinic_id == current.clinic_id,
    ).first()
    if not appt:
        raise HTTPException(404, "Appointment not found")

    if appt.status in ("confirmed", "pending"):
        appt.status = "in_progress"

    soap_data = body.get("soap") or {}
    if soap_data:
        allowed = ["subjective", "objective", "assessment", "plan", "follow_up_days"]
        note = db.query(SoapNote).filter(SoapNote.appointment_id == appointment_id).first()
        if note:
            for k in allowed:
                if k in soap_data:
                    setattr(note, k, soap_data[k])
        else:
            filtered = {k: soap_data[k] for k in allowed if k in soap_data}
            if filtered:
                db.add(SoapNote(appointment_id=appointment_id, branch_id=current.branch_id, **filtered))

    rx_items = (body.get("prescription") or {}).get("items") or []
    if rx_items:
        rx = db.query(Prescription).filter(Prescription.appointment_id == appointment_id).first()
        if not rx:
            rx = Prescription(
                clinic_id=appt.clinic_id, branch_id=current.branch_id, patient_id=appt.patient_id,
                appointment_id=appointment_id, prescribed_by=current.id,
            )
            db.add(rx)
            db.flush()
        else:
            db.query(PrescriptionItem).filter(PrescriptionItem.prescription_id == rx.id).delete()
            db.flush()
        for item in rx_items:
            med_name = (item.get("medicine_name") or "").strip()
            if med_name:
                db.add(PrescriptionItem(
                    prescription_id=rx.id,
                    medicine_name=med_name,
                    dosage=item.get("dosage", ""),
                    frequency=item.get("frequency", ""),
                    duration=item.get("duration", ""),
                    instructions=item.get("instructions", ""),
                ))

    lab_tests = (body.get("lab_order") or {}).get("tests") or []
    if lab_tests:
        lo = db.query(LabOrder).filter(LabOrder.appointment_id == appointment_id).first()
        if not lo:
            lo = LabOrder(
                clinic_id=appt.clinic_id, branch_id=current.branch_id, patient_id=appt.patient_id,
                appointment_id=appointment_id, ordered_by=current.id,
            )
            db.add(lo)
            db.flush()
        else:
            db.query(LabOrderItem).filter(LabOrderItem.order_id == lo.id).delete()
            db.flush()
        for t in lab_tests:
            test_name = (t.get("test_name") or "").strip()
            if test_name:
                db.add(LabOrderItem(order_id=lo.id, test_name=test_name))

    db.commit()
    return {"message": "Draft saved", "status": appt.status}


@router.post("/queue/{appointment_id}/send-investigations")
def send_for_investigations(
    appointment_id: int,
    db: Session = Depends(get_db),
    current: Staff = Depends(require_doctor),
):
    """Mark appointment as investigations_pending — doctor has sent patient for lab/imaging."""
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.clinic_id == current.clinic_id,
    ).first()
    if not appt:
        raise HTTPException(404, "Appointment not found")
    appt.status = "investigations_pending"
    db.commit()
    return {"success": True, "status": "investigations_pending"}


@router.post("/queue/{appointment_id}/mark-review-ready")
def mark_review_ready(
    appointment_id: int,
    db: Session = Depends(get_db),
    current: Staff = Depends(require_doctor),
):
    """Mark appointment as review_pending — results are back, patient needs to return."""
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.clinic_id == current.clinic_id,
    ).first()
    if not appt:
        raise HTTPException(404, "Appointment not found")
    appt.status = "review_pending"
    db.commit()
    return {"success": True, "status": "review_pending"}


@router.get("/patient/{patient_id}/visits")
def get_patient_visits(
    patient_id: int,
    limit: int = 20,
    db: Session = Depends(get_db),
    current: Staff = Depends(require_doctor),
):
    """Full visit history for a patient with doctor context — used by OPD chart past visits."""
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.clinic_id == current.clinic_id,
    ).first()
    if not patient:
        raise HTTPException(404, "Patient not found")

    my_profile = db.query(DoctorProfile).filter(DoctorProfile.staff_id == current.id).first()
    my_profile_id = my_profile.id if my_profile else None

    visits = db.query(Appointment).options(
        joinedload(Appointment.soap_note),
        joinedload(Appointment.prescriptions).joinedload(Prescription.items),
        joinedload(Appointment.lab_orders).joinedload(LabOrder.items),
    ).filter(
        Appointment.patient_id == patient_id,
        Appointment.clinic_id == current.clinic_id,
        Appointment.status.in_(["completed", "investigations_pending", "review_pending"]),
    ).order_by(desc(Appointment.appointment_date)).limit(limit).all()

    result = []
    for v in visits:
        doc_name = None
        if v.doctor_id:
            dp = db.query(DoctorProfile).filter(DoctorProfile.id == v.doctor_id).first()
            if dp:
                ds = db.query(Staff).filter(Staff.id == dp.staff_id).first()
                doc_name = ds.full_name if ds else None

        is_mine = (v.doctor_id == my_profile_id) if my_profile_id else False
        sn = v.soap_note

        entry = {
            "id":         v.id,
            "date":       str(v.appointment_date),
            "time":       v.appointment_time,
            "status":     v.status,
            "reason":     v.reason,
            "visit_type": v.visit_type,
            "mode":       v.mode,
            "doctor_id":  v.doctor_id,
            "doctor_name":doc_name,
            "is_mine":    is_mine,
            "soap": {
                "subjective": sn.subjective,
                "objective":  sn.objective,
                "assessment": sn.assessment,
                "plan":       sn.plan,
                "follow_up_days": sn.follow_up_days,
            } if sn else None,
            "prescriptions": [
                {"items": [{"medicine_name": i.medicine_name, "dosage": i.dosage, "frequency": i.frequency, "duration": i.duration} for i in p.items]}
                for p in v.prescriptions
            ] if is_mine else [],
            "lab_orders": [
                {"items": [{"test_name": i.test_name, "result_value": i.result_value, "is_abnormal": i.is_abnormal} for i in lo.items]}
                for lo in v.lab_orders
            ] if is_mine else [],
        }
        result.append(entry)

    return result


@router.post("/encounter/{appointment_id}/join-telehealth")
def log_telehealth_join(
    appointment_id: int,
    db: Session = Depends(get_db),
    current: Staff = Depends(require_doctor),
):
    """Log when a doctor joins a telehealth session — compliance requirement (Telemedicine Guidelines 2020)."""
    from datetime import datetime as _dt
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.clinic_id == current.clinic_id,
    ).first()
    if not appt:
        raise HTTPException(404, "Appointment not found")
    if appt.mode != "telehealth":
        raise HTTPException(400, "This is not a telehealth appointment")
    appt.telehealth_joined_at = _dt.utcnow()
    appt.status = "in_progress"
    db.commit()
    return {
        "room": f"bhs-appt-{appointment_id}",
        "url":  f"https://meet.jit.si/bhs-appt-{appointment_id}",
        "joined_at": appt.telehealth_joined_at.isoformat(),
    }
