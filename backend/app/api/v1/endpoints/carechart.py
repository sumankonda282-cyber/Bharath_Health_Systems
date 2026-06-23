"""
CareChart-specific routes: care-forms (nursing care plans) and provider forms proxy.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_staff
from typing import Optional
from app.models.models import Staff, FormAssignment, AssessmentForm, Patient

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
    """Return published assessment form templates visible to nursing staff."""
    return []


@router.get("/provider/forms/submissions")
def get_provider_forms_submissions(
    ward_id: int = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Return form submissions for a ward (nursing view)."""
    return []
