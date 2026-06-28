"""
CareChart-specific routes: care-forms (nursing care plans) and provider forms proxy.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_staff
from typing import Optional
from app.models.models import (
    Staff, FormAssignment, AssessmentForm, Patient,
    FormSubmission, FormAlert, FormCoSign,
)

router = APIRouter(tags=["carechart"])


# ── Care Forms (nursing care plans stored against the clinic) ─────────────────

_care_forms_store: dict = {}  # In-memory fallback; replace with DB table when schema allows


@router.get("/carechart/care-forms")
def list_care_forms(db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    forms = _care_forms_store.get(current.clinic_id, [])
    return forms


@router.post("/carechart/care-forms")
def create_care_form(body: dict, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    import uuid
    form_id = str(uuid.uuid4())
    form = {**body, "id": form_id, "clinic_id": current.clinic_id, "published": False}
    _care_forms_store.setdefault(current.clinic_id, []).append(form)
    return form


@router.put("/carechart/care-forms/{form_id}")
def update_care_form(form_id: str, body: dict, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    forms = _care_forms_store.get(current.clinic_id, [])
    for i, f in enumerate(forms):
        if str(f.get("id")) == form_id:
            forms[i] = {**f, **body, "id": form_id}
            return forms[i]
    raise HTTPException(status_code=404, detail="Care form not found")


@router.delete("/carechart/care-forms/{form_id}")
def delete_care_form(form_id: str, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    forms = _care_forms_store.get(current.clinic_id, [])
    _care_forms_store[current.clinic_id] = [f for f in forms if str(f.get("id")) != form_id]
    return {"ok": True}


@router.post("/carechart/care-forms/{form_id}/publish")
def publish_care_form(form_id: str, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    forms = _care_forms_store.get(current.clinic_id, [])
    for i, f in enumerate(forms):
        if str(f.get("id")) == form_id:
            forms[i]["published"] = True
            return forms[i]
    raise HTTPException(status_code=404, detail="Care form not found")


@router.post("/carechart/care-forms/{form_id}/unpublish")
def unpublish_care_form(form_id: str, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    forms = _care_forms_store.get(current.clinic_id, [])
    for i, f in enumerate(forms):
        if str(f.get("id")) == form_id:
            forms[i]["published"] = False
            return forms[i]
    raise HTTPException(status_code=404, detail="Care form not found")


# ── Provider Forms proxy (read-only for nurses) ───────────────────────────────

@router.get("/provider/forms/assignments")
def get_provider_forms_assignments(
    patient_id: Optional[int] = None,
    status: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Return form assignments for this clinic (provider view), optionally filtered by patient."""
    q = db.query(FormAssignment).filter(FormAssignment.clinic_id == current.clinic_id)
    if patient_id:
        q = q.filter(FormAssignment.patient_id == patient_id)
    if status:
        q = q.filter(FormAssignment.status == status)
    assignments = q.order_by(FormAssignment.assigned_at.desc()).limit(limit).all()

    result = []
    for a in assignments:
        form = db.query(AssessmentForm).filter(AssessmentForm.id == a.form_id).first()
        patient = db.query(Patient).filter(Patient.id == a.patient_id).first()
        result.append({
            "id": a.id,
            "form_id": a.form_id,
            "form_title": form.title if form else None,
            "form": {
                "title": form.title if form else None,
                "category": form.category if form else None,
            } if form else None,
            "patient_id": a.patient_id,
            "patient_name": patient.full_name if patient else None,
            "bhid": patient.uhid if patient else None,
            "appointment_id": a.appointment_id,
            "admission_id": a.admission_id,
            "status": a.status,
            "priority": a.priority,
            "due_at": a.due_at.isoformat() if a.due_at else None,
            "assigned_at": a.assigned_at.isoformat() if a.assigned_at else None,
            "completed_at": a.completed_at.isoformat() if a.completed_at else None,
            "notes": a.notes,
            "iview_enabled": False,
        })
    return result


@router.get("/provider/forms/pool")
def get_provider_forms_pool(
    category: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 200,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Return published assessment forms available for assignment."""
    query = db.query(AssessmentForm).filter(
        AssessmentForm.status == "published",
        AssessmentForm.is_template == False,
    )
    if category:
        query = query.filter(AssessmentForm.category == category)
    if q:
        query = query.filter(AssessmentForm.title.ilike(f"%{q}%"))
    forms = query.order_by(AssessmentForm.title).limit(limit).all()
    return [
        {
            "id": f.id,
            "title": f.title,
            "description": f.description,
            "category": f.category,
            "icon": f.icon,
            "is_iview_enabled": f.is_iview_enabled,
            "requires_cosign": f.requires_cosign,
            "time_limit_minutes": f.time_limit_minutes,
            "estimated_minutes": f.time_limit_minutes,
            "version": f.version,
            "published_at": f.published_at.isoformat() if f.published_at else None,
        }
        for f in forms
    ]


@router.post("/provider/forms/assign")
def assign_form_to_patient(
    body: dict,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Assign a published assessment form to a patient."""
    form_id = body.get("form_id")
    patient_id = body.get("patient_id")
    if not form_id or not patient_id:
        raise HTTPException(status_code=422, detail="form_id and patient_id are required")

    form = db.query(AssessmentForm).filter(
        AssessmentForm.id == form_id,
        AssessmentForm.status == "published",
    ).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found or not published")

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    due_at = None
    if body.get("due_at"):
        try:
            due_at = datetime.fromisoformat(body["due_at"].replace("Z", "+00:00"))
        except ValueError:
            pass

    assignment = FormAssignment(
        form_id=form_id,
        form_version=form.version,
        clinic_id=current.clinic_id,
        patient_id=patient_id,
        appointment_id=body.get("appointment_id"),
        admission_id=body.get("admission_id"),
        assigned_by=current.id,
        assigned_to_role=body.get("assigned_to_role", "nurse"),
        priority=body.get("priority", "routine"),
        notes=body.get("notes"),
        due_at=due_at,
        status="pending",
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return {
        "id": assignment.id,
        "form_id": assignment.form_id,
        "form_title": form.title,
        "patient_id": assignment.patient_id,
        "patient_name": patient.full_name,
        "status": assignment.status,
        "priority": assignment.priority,
        "assigned_to_role": assignment.assigned_to_role,
        "due_at": assignment.due_at.isoformat() if assignment.due_at else None,
        "assigned_at": assignment.assigned_at.isoformat() if assignment.assigned_at else None,
    }


@router.get("/provider/forms/submissions")
def get_provider_forms_submissions(
    patient_id: Optional[int] = None,
    form_id: Optional[int] = None,
    ward_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Return form submissions for this clinic (provider/nursing view)."""
    q = db.query(FormSubmission).filter(FormSubmission.clinic_id == current.clinic_id)
    if patient_id:
        q = q.filter(FormSubmission.patient_id == patient_id)
    if form_id:
        q = q.filter(FormSubmission.form_id == form_id)
    submissions = q.order_by(FormSubmission.submitted_at.desc()).limit(limit).all()

    result = []
    for s in submissions:
        form = db.query(AssessmentForm).filter(AssessmentForm.id == s.form_id).first()
        patient = db.query(Patient).filter(Patient.id == s.patient_id).first()
        submitter = db.query(Staff).filter(Staff.id == s.submitted_by).first()
        result.append({
            "id": s.id,
            "form_id": s.form_id,
            "form_title": form.title if form else None,
            "patient_id": s.patient_id,
            "patient_name": patient.full_name if patient else None,
            "submitted_by_name": submitter.full_name if submitter else None,
            "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
            "is_draft": s.is_draft,
            "scores": s.scores,
            "alerts_fired": s.alerts_fired,
        })
    return result


@router.get("/provider/forms/submissions/{submission_id}")
def get_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Return a single form submission with full details."""
    s = db.query(FormSubmission).filter(
        FormSubmission.id == submission_id,
        FormSubmission.clinic_id == current.clinic_id,
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Submission not found")

    form = db.query(AssessmentForm).filter(AssessmentForm.id == s.form_id).first()
    patient = db.query(Patient).filter(Patient.id == s.patient_id).first()
    submitter = db.query(Staff).filter(Staff.id == s.submitted_by).first()
    cosigner = db.query(Staff).filter(Staff.id == s.cosigned_by).first() if s.cosigned_by else None

    alerts = db.query(FormAlert).filter(FormAlert.submission_id == s.id).all()

    return {
        "id": s.id,
        "form_id": s.form_id,
        "form_title": form.title if form else None,
        "form_category": form.category if form else None,
        "form_schema": form.schema if form else {},
        "patient_id": s.patient_id,
        "patient_name": patient.full_name if patient else None,
        "appointment_id": s.appointment_id,
        "admission_id": s.admission_id,
        "submitted_by": s.submitted_by,
        "submitted_by_name": submitter.full_name if submitter else None,
        "cosigned_by": s.cosigned_by,
        "cosigned_by_name": cosigner.full_name if cosigner else None,
        "cosigned_at": s.cosigned_at.isoformat() if s.cosigned_at else None,
        "data": s.data,
        "scores": s.scores,
        "alerts_fired": [
            {
                "id": a.id,
                "field_id": a.field_id,
                "field_label": a.field_label,
                "value": a.value,
                "severity": a.severity,
                "message": a.message,
                "acknowledged": a.acknowledged_by is not None,
                "acknowledged_at": a.acknowledged_at.isoformat() if a.acknowledged_at else None,
            }
            for a in alerts
        ],
        "is_draft": s.is_draft,
        "source": s.source,
        "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


@router.get("/provider/forms/submissions/{submission_id}/pdf-data")
def get_submission_pdf_data(
    submission_id: int,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Return submission data structured for client-side PDF generation."""
    s = db.query(FormSubmission).filter(
        FormSubmission.id == submission_id,
        FormSubmission.clinic_id == current.clinic_id,
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Submission not found")

    form = db.query(AssessmentForm).filter(AssessmentForm.id == s.form_id).first()
    patient = db.query(Patient).filter(Patient.id == s.patient_id).first()
    submitter = db.query(Staff).filter(Staff.id == s.submitted_by).first()
    alerts = db.query(FormAlert).filter(FormAlert.submission_id == s.id).all()

    schema = (form.schema if form else {}) or {}
    form_data = s.data or {}
    sections = []
    for sec in schema.get("sections", []):
        fields_out = []
        for field in sec.get("fields", []):
            fid = field.get("id")
            fields_out.append({
                "label": field.get("label", fid),
                "value": form_data.get(fid),
            })
        sections.append({"title": sec.get("title", ""), "fields": fields_out})

    return {
        "form_title": form.title if form else "Clinical Assessment",
        "category": form.category if form else None,
        "patient_id": s.patient_id,
        "patient_name": patient.full_name if patient else None,
        "submitted_by": submitter.full_name if submitter else None,
        "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
        "sections": sections,
        "scores": s.scores or [],
        "alerts": [
            {
                "field_id": a.field_id,
                "field_label": a.field_label,
                "message": a.message,
                "severity": a.severity,
            }
            for a in alerts
        ],
    }


@router.post("/provider/forms/alerts/{alert_id}/acknowledge")
def acknowledge_form_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Acknowledge a form alert."""
    alert = db.query(FormAlert).filter(
        FormAlert.id == alert_id,
        FormAlert.clinic_id == current.clinic_id,
    ).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.acknowledged_by = current.id
    alert.acknowledged_at = datetime.utcnow()
    db.commit()
    return {"ok": True, "acknowledged_at": alert.acknowledged_at.isoformat()}


@router.post("/provider/forms/cosign/{submission_id}")
def request_cosign(
    submission_id: int,
    body: dict = None,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Request a co-signature on a form submission."""
    s = db.query(FormSubmission).filter(
        FormSubmission.id == submission_id,
        FormSubmission.clinic_id == current.clinic_id,
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Submission not found")

    body = body or {}
    requested_from = body.get("requested_from", current.id)
    cosign = FormCoSign(
        submission_id=submission_id,
        requested_by=current.id,
        requested_from=requested_from,
        note=body.get("note"),
        status="pending",
    )
    db.add(cosign)
    db.commit()
    db.refresh(cosign)
    return {"ok": True, "cosign_id": cosign.id, "status": cosign.status}
