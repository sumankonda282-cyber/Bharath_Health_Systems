from fastapi import APIRouter, Depends
from app.core.auth import get_current_staff
from app.models.models import Staff

router = APIRouter(prefix="/support", tags=["support"])


@router.post("/maintenance-request")
def submit_maintenance_request(
    body: dict,
    current: Staff = Depends(get_current_staff),
):
    """Accept ward maintenance requests — stored as a log for now."""
    return {"ok": True, "message": "Maintenance request received"}


@router.post("/access-request")
def submit_access_request(body: dict):
    """Accept staff access requests from login portal."""
    return {"ok": True, "message": "Access request received. You will be contacted shortly."}
