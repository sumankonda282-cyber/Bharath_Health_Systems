from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_staff
from app.models.models import Staff, MaintenanceRequest

router = APIRouter(prefix="/support", tags=["support"])


@router.post("/maintenance-request")
def submit_maintenance_request(
    body: dict,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Persist a ward/facility maintenance request submitted from any portal."""
    req = MaintenanceRequest(
        clinic_id     = current.clinic_id,
        title         = (body.get("title") or body.get("subject") or "Maintenance request").strip(),
        description   = body.get("description") or body.get("details"),
        category      = body.get("category") or "facility",
        priority      = body.get("priority") or "medium",
        location      = body.get("location"),
        portal_source = body.get("portal_source") or body.get("source"),
        submitted_by  = current.id,
        status        = "new",
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return {"ok": True, "id": req.id, "message": "Maintenance request received"}


@router.post("/access-request")
def submit_access_request(body: dict):
    """Accept staff access requests from login portal."""
    return {"ok": True, "message": "Access request received. You will be contacted shortly."}
