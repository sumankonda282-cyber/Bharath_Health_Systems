"""Clinical Decision Support endpoints — medication-order safety screening.

New, additive router (no existing endpoint modified). The prescribe UI calls this
before signing an order; it returns tiered alerts (interaction + allergy). The UI
shows hard-stop alerts interruptively (override + reason) and soft alerts as
advisories — the Epic BestPractice-alert pattern.
"""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_staff
from app.models.models import Staff
from app.services.cds import screen_medication_order

router = APIRouter(prefix="/cds", tags=["cds"])


class ScreenDrug(BaseModel):
    drug_id: Optional[int] = None
    generic: Optional[str] = None
    name: Optional[str] = None


class ScreenRequest(BaseModel):
    drugs: List[ScreenDrug] = []
    allergies: List[str] = []           # recorded patient allergies (strings)
    patient_id: Optional[int] = None    # reserved: server-side allergy lookup later


@router.post("/medication-screen")
def medication_screen(
    payload: ScreenRequest = Body(...),
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    drugs: List[Dict[str, Any]] = [d.model_dump() for d in payload.drugs]
    return screen_medication_order(db, drugs, payload.allergies)
