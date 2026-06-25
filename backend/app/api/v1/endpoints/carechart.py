"""
CareChart-specific routes: care-forms (nursing care plans) and provider forms proxy.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.db.session import get_db
from app.core.security import get_current_staff
from typing import Optional
from datetime import datetime
import secrets
from app.models.models import (
    Staff, FormAssignment, AssessmentForm, Patient, Appointment,
    FormSubmission, iViewFlowsheet, iViewObservation, FormAlert,
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
def get_provider_forms_pool(db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    """Published assessment forms visible to this clinic (global templates +
    this clinic's own published forms)."""
    forms = db.query(AssessmentForm).filter(
        AssessmentForm.status == "published",
        or_(
            AssessmentForm.clinic_id == current.clinic_id,
            AssessmentForm.clinic_id.is_(None),
            AssessmentForm.is_template == True,
        ),
    ).order_by(AssessmentForm.category, AssessmentForm.title).all()
    return [{
        "id": f.id,
        "title": f.title,
        "category": f.category,
        "iview_enabled": bool(f.is_iview_enabled),
        "is_iview_enabled": bool(f.is_iview_enabled),
        "estimated_minutes": f.time_limit_minutes,
    } for f in forms]


@router.post("/provider/forms/assign")
def assign_provider_form(body: dict, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    """Assign an assessment form to a patient (QuickAssign)."""
    form_id = body.get("form_id")
    patient_id = body.get("patient_id")
    if not form_id or not patient_id:
        raise HTTPException(status_code=400, detail="form_id and patient_id are required")
    due_at = None
    if body.get("due_at"):
        try:
            due_at = datetime.fromisoformat(str(body["due_at"]).replace("Z", "+00:00"))
        except (ValueError, TypeError):
            due_at = None
    a = FormAssignment(
        form_id=form_id,
        clinic_id=current.clinic_id,
        patient_id=patient_id,
        appointment_id=body.get("appointment_id"),
        admission_id=body.get("admission_id"),
        assigned_by=current.id,
        assigned_to_role=body.get("assigned_to_role"),
        priority=body.get("priority", "routine"),
        due_at=due_at,
        status="pending",
        notes=body.get("notes"),
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return {"id": a.id, "ok": True}


@router.post("/provider/forms/previsit/send")
def send_previsit_link(body: dict, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    """Generate a tokenised pre-visit form link for a patient's appointment."""
    appt_id = body.get("appointment_id")
    if not appt_id:
        raise HTTPException(status_code=400, detail="appointment_id is required")
    appt = db.query(Appointment).filter(
        Appointment.id == appt_id,
        Appointment.clinic_id == current.clinic_id,
    ).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    token = appt.previsit_token or secrets.token_urlsafe(24)
    appt.previsit_token = token
    pd = appt.previsit_data or {}
    if body.get("form_id"):
        pd["form_id"] = body.get("form_id")
    appt.previsit_data = pd
    db.commit()
    base = (body.get("public_base_url") or "https://www.bharathhealthsystems.com").rstrip("/")
    return {"link": f"{base}/previsit/{token}", "token": token}


@router.get("/provider/forms/iview/{form_id}")
def get_provider_form_iview(
    form_id: int,
    patient_id: Optional[int] = None,
    admission_id: Optional[int] = None,
    band: str = "4h",
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Load an iView flowsheet: per-form config + the patient's charted observations."""
    fs = db.query(iViewFlowsheet).filter(iViewFlowsheet.form_id == form_id).first()
    form = db.query(AssessmentForm).filter(AssessmentForm.id == form_id).first()
    config = {
        "form_id": form_id,
        "title": form.title if form else None,
        "time_band": (fs.time_band if fs else None) or band,
        "rows": (fs.row_config if fs else None) or (form.iview_config if form else None) or [],
    }
    q = db.query(iViewObservation).filter(
        iViewObservation.form_id == form_id,
        iViewObservation.clinic_id == current.clinic_id,
    )
    if patient_id:
        q = q.filter(iViewObservation.patient_id == patient_id)
    obs = q.order_by(iViewObservation.recorded_at.desc().nullslast()).limit(500).all()
    entries = [{
        "field_id": o.field_id,
        "label": o.label,
        "value": o.value_text if o.value_text is not None else (float(o.value_numeric) if o.value_numeric is not None else None),
        "unit": o.unit,
        "recorded_at": o.recorded_at.isoformat() if o.recorded_at else None,
    } for o in obs]
    return {"flowsheet_config": config, "config": config, "entries": entries}


@router.post("/provider/forms/submit")
def submit_provider_form_cell(body: dict, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    """Persist an iView flowsheet cell (or a small form submission)."""
    form_id = body.get("form_id")
    patient_id = body.get("patient_id")
    if not form_id or not patient_id:
        raise HTTPException(status_code=400, detail="form_id and patient_id are required")
    data = body.get("data") or {}
    charted_at = None
    if body.get("charted_at"):
        try:
            charted_at = datetime.fromisoformat(str(body["charted_at"]).replace("Z", "+00:00"))
        except (ValueError, TypeError):
            charted_at = None
    charted_at = charted_at or datetime.utcnow()

    sub = FormSubmission(
        form_id=form_id,
        clinic_id=current.clinic_id,
        branch_id=getattr(current, "branch_id", None),
        patient_id=patient_id,
        admission_id=body.get("admission_id"),
        submitted_by=current.id,
        data=data,
        is_draft=False,
        submitted_at=charted_at,
        charted_at=charted_at,
        source="provider",
    )
    db.add(sub)
    db.flush()
    for fid, val in (data.items() if isinstance(data, dict) else []):
        num = None
        try:
            num = float(val)
        except (TypeError, ValueError):
            num = None
        db.add(iViewObservation(
            clinic_id=current.clinic_id,
            form_id=form_id,
            submission_id=sub.id,
            patient_id=patient_id,
            field_id=str(fid),
            value_text=None if num is not None else (str(val) if val is not None else None),
            value_numeric=num,
            recorded_at=charted_at,
        ))
    db.commit()
    return {"id": sub.id, "ok": True}


@router.post("/provider/forms/alerts/{alert_id}/acknowledge")
def acknowledge_form_alert(alert_id: int, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    a = db.query(FormAlert).filter(
        FormAlert.id == alert_id, FormAlert.clinic_id == current.clinic_id,
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")
    a.acknowledged_by = current.id
    a.acknowledged_at = datetime.utcnow()
    db.commit()
    return {"ok": True}


def _load_submission(submission_id: int, clinic_id: int, db: Session):
    sub = db.query(FormSubmission).filter(
        FormSubmission.id == submission_id, FormSubmission.clinic_id == clinic_id,
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    form = db.query(AssessmentForm).filter(AssessmentForm.id == sub.form_id).first()
    return sub, form


@router.get("/provider/forms/submissions/{submission_id}/pdf-data")
def submission_pdf_data(submission_id: int, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    sub, form = _load_submission(submission_id, current.clinic_id, db)
    data = sub.data or {}
    schema = (form.schema if form else {}) or {}
    sections = []
    for sec in schema.get("sections", []):
        fields = [{"label": f.get("label", f.get("id")), "value": data.get(f.get("id"))}
                  for f in sec.get("fields", [])]
        sections.append({"title": sec.get("title", ""), "fields": fields})
    if not sections and data:
        sections = [{"title": "Responses", "fields": [{"label": k, "value": v} for k, v in data.items()]}]
    if isinstance(sub.scores, dict):
        scores = [{"name": k, "value": v} for k, v in sub.scores.items()]
    elif isinstance(sub.scores, list):
        scores = sub.scores
    else:
        scores = []
    alerts = [{"field_label": al.field_label, "field_id": al.field_id, "message": al.message}
              for al in db.query(FormAlert).filter(FormAlert.submission_id == submission_id).all()]
    return {
        "form_title": form.title if form else None,
        "category": form.category if form else None,
        "patient_id": sub.patient_id,
        "submitted_at": str(sub.submitted_at) if sub.submitted_at else None,
        "submitted_by": sub.submitted_by,
        "sections": sections,
        "scores": scores,
        "alerts": alerts,
    }


@router.get("/provider/forms/submissions/{submission_id}/fhir")
def submission_fhir(submission_id: int, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    sub, form = _load_submission(submission_id, current.clinic_id, db)
    return {
        "resourceType": "QuestionnaireResponse",
        "id": str(sub.id),
        "status": "completed",
        "questionnaire": f"AssessmentForm/{sub.form_id}",
        "subject": {"reference": f"Patient/{sub.patient_id}"},
        "authored": str(sub.submitted_at) if sub.submitted_at else None,
        "item": [{"linkId": k, "answer": [{"valueString": str(v)}]} for k, v in (sub.data or {}).items()],
    }


@router.get("/provider/forms/submissions/{submission_id}/abdm")
def submission_abdm(submission_id: int, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    sub, form = _load_submission(submission_id, current.clinic_id, db)
    return {
        "resourceType": "Bundle",
        "type": "document",
        "meta": {"profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle"]},
        "entry": [{"resource": {
            "resourceType": "QuestionnaireResponse",
            "id": str(sub.id),
            "status": "completed",
            "subject": {"reference": f"Patient/{sub.patient_id}"},
            "item": [{"linkId": k, "answer": [{"valueString": str(v)}]} for k, v in (sub.data or {}).items()],
        }}],
    }


@router.get("/provider/forms/submissions")
def get_provider_forms_submissions(
    ward_id: int = None,
    patient_id: int = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Return recent form submissions for this clinic (nursing view)."""
    q = db.query(FormSubmission).filter(FormSubmission.clinic_id == current.clinic_id)
    if patient_id:
        q = q.filter(FormSubmission.patient_id == patient_id)
    subs = q.order_by(FormSubmission.created_at.desc()).limit(limit).all()
    out = []
    for s in subs:
        form = db.query(AssessmentForm).filter(AssessmentForm.id == s.form_id).first()
        patient = db.query(Patient).filter(Patient.id == s.patient_id).first()
        out.append({
            "id": s.id,
            "form_id": s.form_id,
            "form_title": form.title if form else None,
            "patient_id": s.patient_id,
            "patient_name": patient.full_name if patient else None,
            "scores": s.scores,
            "is_draft": s.is_draft,
            "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        })
    return out
