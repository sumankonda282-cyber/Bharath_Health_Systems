"""Problem list endpoints (gap B6).

A longitudinal, coded, status-tracked list of a patient's conditions — the
maintained clinical record that patient_tags (flat quick-labels) is not. New
router, new table; no existing endpoint is modified.

Routes (all under /api/v1/problems):
  GET    /problems?patient_id=&status=      list a patient's problems
  POST   /problems                          add a problem
  PATCH  /problems/{id}                      edit / resolve / reactivate
  DELETE /problems/{id}                      remove (hard delete — audited via updated_at)
"""
from datetime import date, datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_staff
from app.models.models import ProblemList, Staff

router = APIRouter(prefix="/problems", tags=["problems"])

VALID_STATUS = {"active", "resolved", "inactive"}


def _out(p: ProblemList) -> dict:
    return {
        "id": p.id,
        "patient_id": p.patient_id,
        "clinic_id": p.clinic_id,
        "problem": p.problem,
        "code": p.code,
        "code_system": p.code_system,
        "status": p.status,
        "onset_date": p.onset_date.isoformat() if p.onset_date else None,
        "resolved_date": p.resolved_date.isoformat() if p.resolved_date else None,
        "note": p.note,
        "recorded_by": p.recorded_by,
        "recorded_by_name": p.recorded_by_name,
        "encounter_id": p.encounter_id,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


def _parse_date(v: Optional[str]) -> Optional[date]:
    if not v:
        return None
    try:
        return date.fromisoformat(str(v)[:10])
    except ValueError:
        return None


@router.get("/problems")
def list_problems(
    patient_id: int = Query(...),
    status: Optional[str] = Query(None, description="active | resolved | inactive"),
    db: Session = Depends(get_db),
    staff: Staff = Depends(get_current_staff),
):
    q = db.query(ProblemList).filter(ProblemList.patient_id == patient_id)
    if status:
        q = q.filter(ProblemList.status == status)
    # Active first, then most-recently updated.
    rows = q.order_by(ProblemList.status.asc(), ProblemList.updated_at.desc()).all()
    return {"items": [_out(p) for p in rows]}


@router.post("/problems", status_code=201)
def create_problem(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    staff: Staff = Depends(get_current_staff),
):
    if not payload.get("patient_id") or not (payload.get("problem") or "").strip():
        raise HTTPException(status_code=400, detail="patient_id and problem are required")
    status = payload.get("status") or "active"
    if status not in VALID_STATUS:
        raise HTTPException(status_code=400, detail=f"status must be one of {sorted(VALID_STATUS)}")
    p = ProblemList(
        patient_id=int(payload["patient_id"]),
        clinic_id=getattr(staff, "clinic_id", None),
        problem=payload["problem"].strip()[:300],
        code=(payload.get("code") or None),
        code_system=(payload.get("code_system") or None),
        status=status,
        onset_date=_parse_date(payload.get("onset_date")),
        resolved_date=_parse_date(payload.get("resolved_date")),
        note=(payload.get("note") or None),
        recorded_by=getattr(staff, "id", None),
        recorded_by_name=getattr(staff, "name", None) or getattr(staff, "full_name", None),
        encounter_id=(payload.get("encounter_id") or None),
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return _out(p)


@router.patch("/problems/{problem_id}")
def update_problem(
    problem_id: int,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    staff: Staff = Depends(get_current_staff),
):
    p = db.query(ProblemList).filter(ProblemList.id == problem_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Problem not found")
    if "problem" in payload and (payload["problem"] or "").strip():
        p.problem = payload["problem"].strip()[:300]
    for k in ("code", "code_system", "note", "encounter_id"):
        if k in payload:
            setattr(p, k, payload[k] or None)
    if "status" in payload:
        if payload["status"] not in VALID_STATUS:
            raise HTTPException(status_code=400, detail=f"status must be one of {sorted(VALID_STATUS)}")
        p.status = payload["status"]
        # Auto-stamp the resolution date when moving to resolved (if not supplied).
        if p.status == "resolved" and not payload.get("resolved_date") and not p.resolved_date:
            p.resolved_date = datetime.utcnow().date()
    if "onset_date" in payload:
        p.onset_date = _parse_date(payload.get("onset_date"))
    if "resolved_date" in payload:
        p.resolved_date = _parse_date(payload.get("resolved_date"))
    db.commit()
    db.refresh(p)
    return _out(p)


@router.delete("/problems/{problem_id}", status_code=204)
def delete_problem(
    problem_id: int,
    db: Session = Depends(get_db),
    staff: Staff = Depends(get_current_staff),
):
    p = db.query(ProblemList).filter(ProblemList.id == problem_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Problem not found")
    db.delete(p)
    db.commit()
    return None
