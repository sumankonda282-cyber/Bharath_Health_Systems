from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_staff
from app.models.models import Staff, MaintenanceRequest, Ward

router = APIRouter(prefix="/support", tags=["support"])


@router.post("/maintenance-request")
def submit_maintenance_request(
    body: dict,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Persist a ward/facility maintenance request submitted from any portal.
    Captures the structured ward/bed/issue context CareChart's form sends."""
    ward_id = body.get("ward_id")
    floor = body.get("floor")
    if ward_id and not floor:
        w = db.query(Ward).filter(Ward.id == ward_id, Ward.clinic_id == current.clinic_id).first()
        if w:
            floor = w.floor
    issue_type = body.get("issue_type")
    bed_number = body.get("bed_number")
    title = (body.get("title") or body.get("subject") or "").strip()
    if not title:
        if issue_type:
            title = issue_type.replace("_", " ").title() + (f" — Bed {bed_number}" if bed_number else "")
        else:
            title = "Maintenance request"
    req = MaintenanceRequest(
        clinic_id      = current.clinic_id,
        title          = title,
        description    = body.get("description") or body.get("details"),
        category       = body.get("category") or "facility",
        priority       = body.get("priority") or "medium",
        location       = body.get("location"),
        ward_id        = ward_id,
        floor          = floor,
        branch_id      = body.get("branch_id") or current.branch_id,
        bed_number     = bed_number,
        issue_type     = issue_type,
        submitter_name = body.get("submitter_name") or body.get("submitted_by_name") or current.full_name,
        portal_source  = body.get("portal_source") or body.get("source"),
        submitted_by   = current.id,
        status         = "new",
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return {"ok": True, "id": req.id, "message": "Maintenance request received"}


@router.post("/access-request")
def submit_access_request(body: dict):
    """Accept staff access requests from login portal."""
    return {"ok": True, "message": "Access request received. You will be contacted shortly."}
