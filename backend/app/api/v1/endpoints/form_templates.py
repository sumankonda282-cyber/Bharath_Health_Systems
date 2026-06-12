from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from pydantic import BaseModel

from app.db.session import get_db
from app.api.v1.endpoints.auth import get_current_staff
from app.models.models import FormTemplate, FormResponse

router = APIRouter(tags=["forms"])


def _accessible(db, clinic_id):
    return db.query(FormTemplate).filter(
        FormTemplate.is_active == True,
        or_(FormTemplate.clinic_id == clinic_id, FormTemplate.is_global == True)
    )


@router.get("/forms/templates")
def search_templates(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
    staff=Depends(get_current_staff),
):
    q = _accessible(db, staff.clinic_id)
    if search:
        term = f"%{search}%"
        q = q.filter(or_(FormTemplate.name.ilike(term), FormTemplate.category.ilike(term)))
    if category:
        q = q.filter(FormTemplate.category == category)
    templates = q.order_by(FormTemplate.name).limit(limit).all()
    return [_tpl(t) for t in templates]


@router.get("/forms/templates/{template_id}")
def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    staff=Depends(get_current_staff),
):
    t = db.query(FormTemplate).filter(FormTemplate.id == template_id).first()
    if not t:
        raise HTTPException(404, "Template not found")
    return _tpl(t)


class ResponseIn(BaseModel):
    template_id: int
    appointment_id: Optional[int] = None
    patient_id: Optional[int] = None
    data: dict


@router.post("/forms/responses")
def save_response(
    body: ResponseIn,
    db: Session = Depends(get_db),
    staff=Depends(get_current_staff),
):
    existing = db.query(FormResponse).filter(
        FormResponse.template_id == body.template_id,
        FormResponse.appointment_id == body.appointment_id,
    ).first()
    if existing:
        existing.data = body.data
        existing.filled_by = staff.id
        db.commit()
        return {"id": existing.id, "updated": True}
    r = FormResponse(
        template_id=body.template_id,
        appointment_id=body.appointment_id,
        patient_id=body.patient_id,
        data=body.data,
        filled_by=staff.id,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return {"id": r.id, "updated": False}


@router.get("/forms/responses")
def list_responses(
    appointment_id: Optional[int] = Query(None),
    patient_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    staff=Depends(get_current_staff),
):
    if not appointment_id and not patient_id:
        raise HTTPException(400, "appointment_id or patient_id required")
    q = db.query(FormResponse, FormTemplate).join(
        FormTemplate, FormResponse.template_id == FormTemplate.id
    )
    if appointment_id:
        q = q.filter(FormResponse.appointment_id == appointment_id)
    elif patient_id:
        q = q.filter(FormResponse.patient_id == patient_id)
    rows = q.order_by(FormResponse.filled_at.desc()).all()
    return [{
        "id": r.FormResponse.id,
        "template_id": r.FormResponse.template_id,
        "template_name": r.FormTemplate.name,
        "template_category": r.FormTemplate.category,
        "schema": r.FormTemplate.schema,
        "data": r.FormResponse.data,
        "filled_at": r.FormResponse.filled_at.isoformat() if r.FormResponse.filled_at else None,
        "appointment_id": r.FormResponse.appointment_id,
    } for r in rows]


def _tpl(t):
    return {
        "id": t.id,
        "name": t.name,
        "category": t.category,
        "description": t.description,
        "schema": t.schema,
        "estimated_minutes": t.estimated_minutes,
        "is_global": t.is_global,
    }
