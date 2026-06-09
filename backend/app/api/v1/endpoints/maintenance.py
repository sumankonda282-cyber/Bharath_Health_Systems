"""
Maintenance Request API — any staff member can submit requests;
clinic managers/admins can list, filter, and update them.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.db.session import get_db
from app.models.models import MaintenanceRequest, Staff
from app.core.security import get_current_staff

router = APIRouter(prefix="/maintenance", tags=["maintenance"])

VALID_CATEGORIES = {"facility", "equipment", "it_software", "other"}
VALID_PRIORITIES  = {"urgent", "high", "medium", "low"}
VALID_STATUSES    = {"new", "in_progress", "resolved", "closed"}


class RequestCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str = "facility"
    priority: str = "medium"
    location: Optional[str] = None
    portal_source: Optional[str] = None


class RequestUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[int] = None
    notes: Optional[str] = None
    priority: Optional[str] = None


def _serialize(r: "MaintenanceRequest") -> dict:
    return {
        "id": r.id,
        "title": r.title,
        "description": r.description,
        "category": r.category,
        "priority": r.priority,
        "status": r.status,
        "location": r.location,
        "portal_source": r.portal_source,
        "submitted_by": r.submitted_by,
        "submitter_name": r.submitter.full_name if r.submitter else "Unknown",
        "assigned_to": r.assigned_to,
        "assignee_name": r.assignee.full_name if r.assignee else None,
        "notes": r.notes,
        "resolved_at": r.resolved_at.isoformat() if r.resolved_at else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@router.post("/requests")
def create_request(
    body: RequestCreate,
    db: Session = Depends(get_db),
    staff: Staff = Depends(get_current_staff),
):
    if body.category not in VALID_CATEGORIES:
        raise HTTPException(400, f"category must be one of {sorted(VALID_CATEGORIES)}")
    if body.priority not in VALID_PRIORITIES:
        raise HTTPException(400, f"priority must be one of {sorted(VALID_PRIORITIES)}")
    req = MaintenanceRequest(
        clinic_id=staff.clinic_id,
        title=body.title.strip(),
        description=body.description,
        category=body.category,
        priority=body.priority,
        status="new",
        location=body.location,
        portal_source=body.portal_source,
        submitted_by=staff.id,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return {"id": req.id, "status": "created"}


@router.get("/requests/badge")
def badge_count(
    db: Session = Depends(get_db),
    staff: Staff = Depends(get_current_staff),
):
    count = (
        db.query(MaintenanceRequest)
        .filter(
            MaintenanceRequest.clinic_id == staff.clinic_id,
            MaintenanceRequest.status == "new",
        )
        .count()
    )
    return {"count": count}


@router.get("/requests")
def list_requests(
    status: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db),
    staff: Staff = Depends(get_current_staff),
):
    q = (
        db.query(MaintenanceRequest)
        .options(
            joinedload(MaintenanceRequest.submitter),
            joinedload(MaintenanceRequest.assignee),
        )
        .filter(MaintenanceRequest.clinic_id == staff.clinic_id)
    )
    if status:
        q = q.filter(MaintenanceRequest.status == status)
    if category:
        q = q.filter(MaintenanceRequest.category == category)
    if priority:
        q = q.filter(MaintenanceRequest.priority == priority)
    return [_serialize(r) for r in q.order_by(MaintenanceRequest.created_at.desc()).all()]


@router.patch("/requests/{req_id}")
def update_request(
    req_id: int,
    body: RequestUpdate,
    db: Session = Depends(get_db),
    staff: Staff = Depends(get_current_staff),
):
    req = (
        db.query(MaintenanceRequest)
        .options(
            joinedload(MaintenanceRequest.submitter),
            joinedload(MaintenanceRequest.assignee),
        )
        .filter(
            MaintenanceRequest.id == req_id,
            MaintenanceRequest.clinic_id == staff.clinic_id,
        )
        .first()
    )
    if not req:
        raise HTTPException(404, "Request not found")
    if body.status:
        if body.status not in VALID_STATUSES:
            raise HTTPException(400, f"status must be one of {sorted(VALID_STATUSES)}")
        req.status = body.status
        if body.status == "resolved" and not req.resolved_at:
            req.resolved_at = datetime.utcnow()
    if body.assigned_to is not None:
        req.assigned_to = body.assigned_to if body.assigned_to > 0 else None
    if body.notes is not None:
        req.notes = body.notes
    if body.priority:
        if body.priority not in VALID_PRIORITIES:
            raise HTTPException(400, f"priority must be one of {sorted(VALID_PRIORITIES)}")
        req.priority = body.priority
    db.commit()
    db.refresh(req)
    return _serialize(req)
