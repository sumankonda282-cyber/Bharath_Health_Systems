"""
Clinical encounters, patient tags, and clinic prefix management.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta

from app.db.session import get_db
from app.core.security import get_current_staff
from app.models.models import (
    Patient, Clinic, Staff, DoctorProfile,
    Appointment, SoapNote, Vitals, Prescription, PrescriptionItem,
    LabOrder, LabOrderItem, ImagingOrder, Admission,
    ClinicPatientTag, PatientTag, EncounterAccessLog,
)

router = APIRouter(tags=["encounters"])

CLINICAL_ROLES = ["clinic_admin", "clinic_manager", "doctor", "receptionist", "nurse"]
DOCTOR_ROLES   = ["clinic_admin", "clinic_manager", "doctor"]


@router.get("/encounters/resolve/{encounter_no}")
def resolve_encounter(
    encounter_no: str,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Resolve a unified encounter number to its source OPD appointment or IPD
    admission. New, additive — never replaces the existing display logic."""
    appt = db.query(Appointment).filter(
        Appointment.encounter_no == encounter_no,
        Appointment.clinic_id == current.clinic_id,
    ).first()
    if appt:
        return {
            "encounter_no":   encounter_no,
            "type":           "opd",
            "appointment_id": appt.id,
            "patient_id":     appt.patient_id,
            "branch_id":      appt.branch_id,
            "date":           str(appt.appointment_date),
            "status":         appt.status,
        }
    adm = db.query(Admission).filter(
        Admission.encounter_no == encounter_no,
        Admission.clinic_id == current.clinic_id,
    ).first()
    if adm:
        return {
            "encounter_no":     encounter_no,
            "type":             "ipd",
            "admission_id":     adm.id,
            "admission_number": adm.admission_number,
            "patient_id":       adm.patient_id,
            "branch_id":        adm.branch_id,
            "status":           adm.status,
        }
    raise HTTPException(404, "Encounter not found")

# ── Specialty tag suggestions (hardcoded, ICD-10 mapped) ─────────────────────

SPECIALTY_TAGS = {
    "cardiology": [
        {"tag": "Hypertensive",        "icd10": "I10"},
        {"tag": "CAD",                 "icd10": "I25.1"},
        {"tag": "Heart Failure",       "icd10": "I50"},
        {"tag": "Atrial Fibrillation", "icd10": "I48"},
        {"tag": "Post-CABG",           "icd10": "Z95.1"},
        {"tag": "Pacemaker",           "icd10": "Z95.0"},
        {"tag": "Dyslipidemia",        "icd10": "E78.5"},
        {"tag": "Rheumatic HD",        "icd10": "I05"},
    ],
    "endocrinology": [
        {"tag": "T2DM",                "icd10": "E11"},
        {"tag": "T1DM",                "icd10": "E10"},
        {"tag": "Hypothyroid",         "icd10": "E03.9"},
        {"tag": "Hyperthyroid",        "icd10": "E05.9"},
        {"tag": "PCOS",                "icd10": "E28.2"},
        {"tag": "Obesity",             "icd10": "E66"},
        {"tag": "Adrenal Insufficiency","icd10": "E27.4"},
    ],
    "nephrology": [
        {"tag": "CKD",                 "icd10": "N18"},
        {"tag": "Dialysis",            "icd10": "Z99.2"},
        {"tag": "Post-Transplant",     "icd10": "Z94.0"},
        {"tag": "Nephrotic Syndrome",  "icd10": "N04"},
        {"tag": "Renal HTN",           "icd10": "I12"},
    ],
    "pulmonology": [
        {"tag": "Asthma",              "icd10": "J45"},
        {"tag": "COPD",                "icd10": "J44"},
        {"tag": "TB",                  "icd10": "A15"},
        {"tag": "ILD",                 "icd10": "J84"},
        {"tag": "OSA",                 "icd10": "G47.3"},
        {"tag": "Post-COVID Lung",     "icd10": "U09.9"},
    ],
    "neurology": [
        {"tag": "Epilepsy",            "icd10": "G40"},
        {"tag": "Stroke",              "icd10": "I63"},
        {"tag": "Parkinson's",         "icd10": "G20"},
        {"tag": "Migraine",            "icd10": "G43"},
        {"tag": "Neuropathy",          "icd10": "G62.9"},
        {"tag": "Dementia",            "icd10": "F03"},
    ],
    "orthopedics": [
        {"tag": "Post-op",             "icd10": "Z96.9"},
        {"tag": "Osteoarthritis",      "icd10": "M19"},
        {"tag": "Osteoporosis",        "icd10": "M81"},
        {"tag": "Spondylosis",         "icd10": "M47"},
        {"tag": "Joint Replacement",   "icd10": "Z96.6"},
    ],
    "gastroenterology": [
        {"tag": "IBD",                 "icd10": "K50"},
        {"tag": "Cirrhosis",           "icd10": "K74"},
        {"tag": "GERD",                "icd10": "K21"},
        {"tag": "IBS",                 "icd10": "K58"},
        {"tag": "Hepatitis B",         "icd10": "B18.1"},
        {"tag": "Hepatitis C",         "icd10": "B18.2"},
    ],
    "gynecology": [
        {"tag": "PCOS",                "icd10": "E28.2"},
        {"tag": "Pregnant",            "icd10": "Z34"},
        {"tag": "Post-partum",         "icd10": "Z39"},
        {"tag": "Endometriosis",       "icd10": "N80"},
        {"tag": "Menopausal",          "icd10": "N95.1"},
        {"tag": "Post-hysterectomy",   "icd10": "Z90.7"},
    ],
    "pediatrics": [
        {"tag": "Preterm",             "icd10": "P07"},
        {"tag": "Malnourished",        "icd10": "E44"},
        {"tag": "Congenital",          "icd10": "Q89.9"},
        {"tag": "Asthmatic",           "icd10": "J45"},
        {"tag": "Febrile Seizures",    "icd10": "R56.0"},
    ],
    "psychiatry": [
        {"tag": "Depression",          "icd10": "F32"},
        {"tag": "Anxiety",             "icd10": "F41"},
        {"tag": "Bipolar",             "icd10": "F31"},
        {"tag": "Schizophrenia",       "icd10": "F20"},
        {"tag": "ADHD",                "icd10": "F90"},
        {"tag": "Substance Use",       "icd10": "F19"},
    ],
    "oncology": [
        {"tag": "Chemotherapy",        "icd10": "Z51.1"},
        {"tag": "Radiotherapy",        "icd10": "Z51.0"},
        {"tag": "Post-op Oncology",    "icd10": "Z85"},
        {"tag": "Palliative",          "icd10": "Z51.5"},
        {"tag": "Remission",           "icd10": "Z85.9"},
    ],
    "general_medicine": [
        {"tag": "Diabetic",            "icd10": "E11"},
        {"tag": "Hypertensive",        "icd10": "I10"},
        {"tag": "Asthmatic",           "icd10": "J45"},
        {"tag": "Anemic",              "icd10": "D64.9"},
        {"tag": "Hypothyroid",         "icd10": "E03.9"},
        {"tag": "CKD",                 "icd10": "N18"},
        {"tag": "Alcoholic",           "icd10": "F10"},
    ],
    "dermatology": [
        {"tag": "Psoriasis",           "icd10": "L40"},
        {"tag": "Eczema",              "icd10": "L20"},
        {"tag": "Vitiligo",            "icd10": "L80"},
        {"tag": "SLE",                 "icd10": "M32"},
        {"tag": "Immunosuppressed",    "icd10": "D84.9"},
    ],
    "ophthalmology": [
        {"tag": "Diabetic Retinopathy","icd10": "E11.3"},
        {"tag": "Glaucoma",            "icd10": "H40"},
        {"tag": "Cataract",            "icd10": "H26"},
        {"tag": "Macular Degeneration","icd10": "H35.3"},
    ],
    "ent": [
        {"tag": "Chronic Sinusitis",   "icd10": "J32"},
        {"tag": "Hearing Loss",        "icd10": "H91"},
        {"tag": "Vertigo",             "icd10": "H81"},
        {"tag": "Sleep Apnea",         "icd10": "G47.3"},
    ],
    "urology": [
        {"tag": "BPH",                 "icd10": "N40"},
        {"tag": "Renal Calculi",       "icd10": "N20"},
        {"tag": "Bladder Cancer",      "icd10": "C67"},
        {"tag": "Incontinence",        "icd10": "R32"},
    ],
}

# ── Clinic prefix + sequential patient ID ────────────────────────────────────

class ClinicPrefixRequest(BaseModel):
    prefix: str  # 2-4 uppercase letters

@router.post("/clinic/prefix")
def set_clinic_prefix(
    payload: ClinicPrefixRequest,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    if current.role not in ["clinic_admin", "clinic_manager"]:
        raise HTTPException(403, "Access denied")
    prefix = payload.prefix.strip().upper()
    if not prefix.isalpha() or not 2 <= len(prefix) <= 4:
        raise HTTPException(400, "Prefix must be 2-4 letters only")
    existing = db.query(Clinic).filter(
        Clinic.clinic_prefix == prefix,
        Clinic.id != current.clinic_id
    ).first()
    if existing:
        raise HTTPException(400, f"Prefix '{prefix}' is already taken by another clinic")
    clinic = db.query(Clinic).filter(Clinic.id == current.clinic_id).first()
    if clinic.clinic_prefix and clinic.patient_id_counter > 0:
        raise HTTPException(400, "Prefix cannot be changed after patients have been registered")
    clinic.clinic_prefix = prefix
    db.commit()
    return {"prefix": prefix, "message": f"Clinic prefix set to {prefix}"}


def _assign_clinic_patient_id(clinic: Clinic, db: Session) -> str:
    """Generate next sequential clinic patient ID like APL-00001 (atomic)."""
    prefix = clinic.clinic_prefix or "CLN"
    # Reload with row-level lock to prevent duplicate IDs under concurrent requests
    db.refresh(clinic)
    locked = db.query(Clinic).filter(Clinic.id == clinic.id).with_for_update().first()
    locked.patient_id_counter = (locked.patient_id_counter or 0) + 1
    db.flush()
    return f"{prefix}-{str(locked.patient_id_counter).zfill(5)}"


# ── Tags ─────────────────────────────────────────────────────────────────────

@router.get("/clinic/tags")
def get_tags(
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    """Return clinic's saved tags + specialty suggestions not yet in clinic library."""
    saved = db.query(ClinicPatientTag).filter(
        ClinicPatientTag.clinic_id == current.clinic_id
    ).order_by(ClinicPatientTag.tag_name).all()
    saved_names = {t.tag_name.lower() for t in saved}

    # Get doctor's specialty for suggestions
    raw_specialty = None
    if current.role == "doctor" and current.doctor_profile:
        raw_specialty = current.doctor_profile.specialty

    # Dynamic source: medical_terms library; hardcoded dict is fallback only
    suggestions = []
    if raw_specialty:
        from sqlalchemy import text as _text
        from app.api.v1.endpoints.terminology import normalize_specialty
        canonical = normalize_specialty(raw_specialty)
        try:
            rows = db.execute(_text(
                "SELECT display, code FROM medical_terms "
                "WHERE is_active AND tier='curated' AND category='condition' "
                "AND specialty = :sp AND (clinic_id IS NULL OR clinic_id = :clinic) "
                "ORDER BY length(display) LIMIT 12"
            ), {"sp": canonical, "clinic": current.clinic_id}).fetchall()
            suggestions = [
                {"tag": r.display, "icd10": r.code}
                for r in rows if r.display.lower() not in saved_names
            ]
        except Exception:
            db.rollback()
        if not suggestions:
            legacy_key = (raw_specialty or "").lower().replace(" ", "_")
            for s in SPECIALTY_TAGS.get(canonical, SPECIALTY_TAGS.get(legacy_key, [])):
                if s["tag"].lower() not in saved_names:
                    suggestions.append(s)

    return {
        "saved": [{"id": t.id, "tag_name": t.tag_name, "icd10_code": t.icd10_code} for t in saved],
        "suggestions": suggestions,
    }


class SaveTagRequest(BaseModel):
    tag_name:   str
    icd10_code: Optional[str] = None
    specialty:  Optional[str] = None

@router.post("/clinic/tags")
def save_tag(
    payload: SaveTagRequest,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    if current.role not in DOCTOR_ROLES:
        raise HTTPException(403, "Access denied")
    tag_name = payload.tag_name.strip()
    existing = db.query(ClinicPatientTag).filter(
        ClinicPatientTag.clinic_id == current.clinic_id,
        ClinicPatientTag.tag_name == tag_name,
    ).first()
    if existing:
        return {"id": existing.id, "tag_name": existing.tag_name, "icd10_code": existing.icd10_code}
    tag = ClinicPatientTag(
        clinic_id  = current.clinic_id,
        tag_name   = tag_name,
        icd10_code = payload.icd10_code,
        specialty  = payload.specialty,
        created_by = current.id,
    )
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return {"id": tag.id, "tag_name": tag.tag_name, "icd10_code": tag.icd10_code}


@router.delete("/clinic/tags/{tag_id}")
def delete_saved_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    tag = db.query(ClinicPatientTag).filter(
        ClinicPatientTag.id == tag_id,
        ClinicPatientTag.clinic_id == current.clinic_id,
    ).first()
    if not tag:
        raise HTTPException(404, "Tag not found")
    db.delete(tag)
    db.commit()
    return {"message": "Deleted"}


# ── Patient tags ──────────────────────────────────────────────────────────────

class AssignTagRequest(BaseModel):
    tag_name:     str
    icd10_code:   Optional[str] = None
    save_to_clinic: bool = False

@router.post("/patients/{patient_id}/tags")
def assign_patient_tag(
    patient_id: int,
    payload: AssignTagRequest,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    patient = db.query(Patient).filter(
        Patient.id == patient_id, Patient.clinic_id == current.clinic_id
    ).first()
    if not patient:
        raise HTTPException(404, "Patient not found")

    tag_name = payload.tag_name.strip()
    existing = db.query(PatientTag).filter(
        PatientTag.patient_id == patient_id,
        PatientTag.clinic_id  == current.clinic_id,
        PatientTag.tag_name   == tag_name,
    ).first()
    if existing:
        return {"id": existing.id, "tag_name": existing.tag_name}

    saved_tag_id = None
    icd10 = payload.icd10_code

    # Check if it's already a saved clinic tag
    saved = db.query(ClinicPatientTag).filter(
        ClinicPatientTag.clinic_id == current.clinic_id,
        ClinicPatientTag.tag_name  == tag_name,
    ).first()
    if saved:
        saved_tag_id = saved.id
        icd10 = saved.icd10_code
        saved.usage_count = (saved.usage_count or 0) + 1
    elif payload.save_to_clinic:
        new_saved = ClinicPatientTag(
            clinic_id  = current.clinic_id,
            tag_name   = tag_name,
            icd10_code = icd10,
            created_by = current.id,
            usage_count = 1,
        )
        db.add(new_saved)
        db.flush()
        saved_tag_id = new_saved.id

    pt = PatientTag(
        patient_id   = patient_id,
        clinic_id    = current.clinic_id,
        tag_name     = tag_name,
        icd10_code   = icd10,
        saved_tag_id = saved_tag_id,
        assigned_by  = current.id,
    )
    db.add(pt)
    db.commit()
    db.refresh(pt)
    return {"id": pt.id, "tag_name": pt.tag_name, "icd10_code": pt.icd10_code}


@router.delete("/patients/{patient_id}/tags/{tag_id}")
def remove_patient_tag(
    patient_id: int,
    tag_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    pt = db.query(PatientTag).filter(
        PatientTag.id         == tag_id,
        PatientTag.patient_id == patient_id,
        PatientTag.clinic_id  == current.clinic_id,
    ).first()
    if not pt:
        raise HTTPException(404, "Tag not found")
    db.delete(pt)
    db.commit()
    return {"message": "Removed"}


# ── Patient list (clinic view — no mobile/email) ──────────────────────────────

@router.get("/patients/list")
def list_patients_clinical(
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 30,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    """Patient list for doctor/clinical view — no mobile/email exposed."""
    from datetime import date
    q = db.query(Patient).filter(
        Patient.clinic_id == current.clinic_id,
        Patient.is_active  == True,
    )
    if search:
        q = q.filter(
            Patient.full_name.ilike(f"%{search}%") |
            Patient.clinic_patient_id.ilike(f"%{search}%")
        )
    patients = q.order_by(Patient.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for p in patients:
        tags = db.query(PatientTag).filter(
            PatientTag.patient_id == p.id,
            PatientTag.clinic_id  == current.clinic_id,
        ).all()
        age = None
        if p.date_of_birth:
            age = (date.today() - p.date_of_birth).days // 365
        result.append({
            "id":               p.id,
            "clinic_patient_id": p.clinic_patient_id or p.uhid or f"#{p.id}",
            "full_name":        p.full_name,
            "age":              age,
            "gender":           p.gender,
            "blood_group":      p.blood_group,
            "tags":             [{"id": t.id, "tag_name": t.tag_name, "icd10_code": t.icd10_code} for t in tags],
            "last_visit":       None,  # filled below
        })
    return result


# ── Patient full view (3 sections) ───────────────────────────────────────────

@router.get("/patients/{patient_id}/clinical")
def get_patient_clinical(
    patient_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    """Full patient view: demographics, visit history (this clinic), external encounters (locked)."""
    from datetime import date
    p = db.query(Patient).filter(Patient.id == patient_id).first()
    # Accept patients registered at this clinic OR who have appointments at this clinic
    if not p or (
        p.clinic_id != current.clinic_id
        and not db.query(Appointment).filter(
            Appointment.patient_id == p.id,
            Appointment.clinic_id == current.clinic_id,
        ).first()
    ):
        raise HTTPException(404, "Patient not found")

    # Section 1 — Demographics (full, including contact)
    age = (date.today() - p.date_of_birth).days // 365 if p.date_of_birth else None
    home_clinic = db.query(Clinic).filter(Clinic.id == p.clinic_id).first()
    demographics = {
        "clinic_patient_id":   p.clinic_patient_id or p.uhid or f"#{p.id}",
        "bh_id":               p.bh_id,
        "hc_id":               home_clinic.hc_id if home_clinic else None,
        "full_name":           p.full_name,
        "date_of_birth":       str(p.date_of_birth) if p.date_of_birth else None,
        "age":                 age,
        "gender":              p.gender,
        "blood_group":         p.blood_group,
        "allergies":           p.allergies,
        "mobile":              p.mobile,
        "email":               p.email,
        "address":             p.address,
        "city":                p.city,
        "state":               p.state,
        "pincode":             p.pincode,
        "emergency_contact":   p.emergency_contact_name,
        "emergency_phone":     p.emergency_contact_phone,
    }

    # Tags
    tags = db.query(PatientTag).filter(
        PatientTag.patient_id == p.id,
        PatientTag.clinic_id  == current.clinic_id,
    ).all()

    # Section 2 — Visit history at THIS clinic
    appointments = db.query(Appointment).filter(
        Appointment.patient_id == p.id,
        Appointment.clinic_id  == current.clinic_id,
    ).order_by(Appointment.appointment_date.desc()).all()

    visits = []
    for appt in appointments:
        # Defensive: one malformed appointment must not blank the whole chart.
        try:
            soap = appt.soap_note
            vitals = appt.vitals
            doc = appt.doctor
            doc_name = doc.staff.full_name if doc and doc.staff else "Unknown"

            rxs = []
            for rx in (appt.prescriptions or []):
                for item in (rx.items or []):
                    rxs.append(f"{item.medicine_name} {item.dosage or ''} — {item.duration or ''}".strip())

            labs = []
            for lo in (appt.lab_orders or []):
                for item in (lo.items or []):
                    labs.append({
                        "test":   item.test_name,
                        "result": item.result_value,
                        "status": "abnormal" if item.is_abnormal else "normal",
                        "done_at": str(item.completed_at) if item.completed_at else None,
                    })

            vitals_data = None
            if vitals:
                vitals_data = {
                    "bp":      f"{vitals.blood_pressure_systolic}/{vitals.blood_pressure_diastolic}" if vitals.blood_pressure_systolic else None,
                    "pulse":   vitals.pulse_rate,
                    "temp":    str(vitals.temperature) if vitals.temperature else None,
                    "spo2":    vitals.oxygen_saturation,
                    "weight":  str(vitals.weight_kg) if vitals.weight_kg else None,
                    "height":  str(vitals.height_cm) if vitals.height_cm else None,
                    "sugar":   str(vitals.blood_sugar) if vitals.blood_sugar else None,
                }

            visits.append({
                "encounter_id":           appt.encounter_no or f"ENC-{str(appt.appointment_date).replace('-','')}-{appt.id:04d}",
                "appointment_id":         appt.id,
                "visit_date":             str(appt.appointment_date),
                "visit_time":             appt.appointment_time,
                "visit_type":             appt.visit_type or "fresh",
                "doctor_name":            doc_name,
                "token_number":           appt.token_number,
                "status":                 appt.status,
                "vitals":                 vitals_data,
                "triage_complaint":       appt.triage_complaint,
                "reason_for_visit":       soap.reason_for_visit if soap else None,
                "patient_complaints":     soap.patient_complaints if soap else None,
                "past_history":           soap.past_history if soap else None,
                "investigations_findings":soap.investigations_findings if soap else None,
                "medications_prescribed": soap.medications_prescribed if soap else None,
                "discharge_assessment":   soap.discharge_assessment if soap else None,
                "cautions_followup":      soap.cautions_followup if soap else None,
                "is_locked":              soap.is_locked if soap else False,
                "prescriptions":          rxs,
                "lab_results":            labs,
            })
        except Exception:
            continue

    # Section 3 — External encounters at OTHER health centres (locked, by HC ID)
    external = []
    if p.bh_id:
        try:
            external_appts = db.query(Appointment).join(
                Patient, Appointment.patient_id == Patient.id
            ).filter(
                Patient.bh_id == p.bh_id,
                Appointment.clinic_id != current.clinic_id,
            ).order_by(Appointment.appointment_date.desc()).all()
            for appt in external_appts:
                ext_clinic = db.query(Clinic).filter(Clinic.id == appt.clinic_id).first()
                external.append({
                    "visit_date":   str(appt.appointment_date),
                    "clinic_name":  ext_clinic.name if ext_clinic else "Unknown Clinic",
                    "hc_id":        ext_clinic.hc_id if ext_clinic else None,
                    "locked":       True,
                })
        except Exception:
            external = []

    return {
        "demographics": demographics,
        "tags":         [{"id": t.id, "tag_name": t.tag_name, "icd10_code": t.icd10_code} for t in tags],
        "visits":       visits,
        "external":     external,
    }


# ── Encounter save / update ───────────────────────────────────────────────────

class EncounterSaveRequest(BaseModel):
    appointment_id:          int
    reason_for_visit:        Optional[str] = None
    patient_complaints:      Optional[str] = None
    past_history:            Optional[str] = None
    investigations_findings: Optional[str] = None
    medications_prescribed:  Optional[str] = None
    discharge_assessment:    Optional[str] = None
    cautions_followup:       Optional[str] = None
    lock:                    bool = False  # True = end consultation, lock record

@router.post("/encounters/save")
def save_encounter(
    payload: EncounterSaveRequest,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    if current.role not in DOCTOR_ROLES:
        raise HTTPException(403, "Only doctors can save encounter notes")
    appt = db.query(Appointment).filter(
        Appointment.id        == payload.appointment_id,
        Appointment.clinic_id == current.clinic_id,
    ).first()
    if not appt:
        raise HTTPException(404, "Appointment not found")

    soap = appt.soap_note
    if soap and soap.is_locked:
        raise HTTPException(400, "Encounter is locked. Use addendum.")

    if not soap:
        soap = SoapNote(appointment_id=appt.id, created_by=current.id, branch_id=current.branch_id)
        db.add(soap)
        db.flush()

    fields = [
        "reason_for_visit", "patient_complaints", "past_history",
        "investigations_findings", "medications_prescribed",
        "discharge_assessment", "cautions_followup",
    ]
    for f in fields:
        val = getattr(payload, f)
        if val is not None:
            setattr(soap, f, val)

    if payload.lock:
        soap.is_locked = True
        soap.locked_at = datetime.utcnow()
        appt.status    = "completed"

    db.commit()
    return {"message": "Saved", "encounter_id": f"ENC-{str(appt.appointment_date).replace('-','')}-{appt.id:04d}", "is_locked": soap.is_locked}


class AddendumRequest(BaseModel):
    appointment_id: int
    addendum:       str

@router.post("/encounters/addendum")
def add_addendum(
    payload: AddendumRequest,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    if current.role not in DOCTOR_ROLES:
        raise HTTPException(403, "Access denied")
    appt = db.query(Appointment).filter(
        Appointment.id == payload.appointment_id,
        Appointment.clinic_id == current.clinic_id,
    ).first()
    if not appt:
        raise HTTPException(404, "Appointment not found")
    soap = appt.soap_note
    if not soap:
        raise HTTPException(400, "No encounter record to add addendum to")
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
    addendum_text = f"\n\n[ADDENDUM {timestamp} — {current.full_name}]\n{payload.addendum}"
    soap.cautions_followup = (soap.cautions_followup or "") + addendum_text
    db.commit()
    return {"message": "Addendum added"}


# ── Triage entry (receptionist) ───────────────────────────────────────────────

class TriageRequest(BaseModel):
    appointment_id:   int
    triage_complaint: Optional[str] = None
    visit_type:       Optional[str] = "fresh"
    bp:               Optional[str] = None
    pulse:            Optional[int] = None
    temperature:      Optional[float] = None
    spo2:             Optional[int] = None
    weight_kg:        Optional[float] = None
    height_cm:        Optional[float] = None
    blood_sugar:      Optional[float] = None

@router.post("/triage")
def save_triage(
    payload: TriageRequest,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    if current.role not in ["clinic_admin", "clinic_manager", "receptionist", "nurse"]:
        raise HTTPException(403, "Access denied")
    appt = db.query(Appointment).filter(
        Appointment.id        == payload.appointment_id,
        Appointment.clinic_id == current.clinic_id,
    ).first()
    if not appt:
        raise HTTPException(404, "Appointment not found")

    if payload.triage_complaint:
        appt.triage_complaint = payload.triage_complaint
    if payload.visit_type:
        appt.visit_type = payload.visit_type

    # Save vitals
    if any([payload.bp, payload.pulse, payload.temperature, payload.spo2, payload.weight_kg]):
        vitals = appt.vitals
        if not vitals:
            vitals = Vitals(patient_id=appt.patient_id, appointment_id=appt.id, branch_id=current.branch_id)
            db.add(vitals)
            db.flush()
        if payload.bp:
            parts = payload.bp.split("/")
            if len(parts) == 2:
                try:
                    vitals.blood_pressure_systolic  = int(parts[0])
                    vitals.blood_pressure_diastolic = int(parts[1])
                except ValueError:
                    pass
        if payload.pulse:       vitals.pulse_rate         = payload.pulse
        if payload.temperature: vitals.temperature        = payload.temperature
        if payload.spo2:        vitals.oxygen_saturation  = payload.spo2
        if payload.weight_kg:   vitals.weight_kg          = payload.weight_kg
        if payload.height_cm:   vitals.height_cm          = payload.height_cm
        if payload.blood_sugar: vitals.blood_sugar         = payload.blood_sugar

    db.commit()
    return {"message": "Triage saved"}
