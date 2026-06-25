"""
BHarath Health — Smart Assessment Forms (PowerForms) API
Provides admin/platform form management and provider-facing submission endpoints.
"""
import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db

try:
    from app.core.security import get_current_staff
except ImportError:
    def get_current_staff():
        return None

from app.models.models import (
    AssessmentForm,
    AssessmentFormVersion,
    FormAlert,
    FormAssignment,
    FormCoSign,
    FormPool,
    FormSubmission,
    iViewFlowsheet,
)

router = APIRouter(tags=["Assessment Forms"])


# ---------------------------------------------------------------------------
# Scoring Engine
# ---------------------------------------------------------------------------

def run_scoring(
    form_id: int,
    schema: dict,
    data: dict,
    scoring_config: Optional[dict],
) -> dict:
    """
    Compute scores for well-known instruments and custom bands.

    Supported built-in types (detected via scoring_config['type'] or schema['scoring_type']):
        phq9, gad7, gcs, morse, apgar

    Returns a dict:
        {
            "total": <int|float>,
            "interpretation": <str>,
            "band": <str>,
            "recommended_action": <str>,
            "subscores": { ... }   # optional, instrument-specific
        }
    """
    if not scoring_config:
        return {}

    scoring_type = (scoring_config.get("type") or "").lower()

    # ── PHQ-9 ───────────────────────────────────────────────────────────────
    if scoring_type == "phq9":
        item_ids = scoring_config.get(
            "item_ids",
            ["phq1", "phq2", "phq3", "phq4", "phq5", "phq6", "phq7", "phq8", "phq9"],
        )
        try:
            total = sum(int(data.get(fid, 0) or 0) for fid in item_ids)
        except (TypeError, ValueError):
            total = 0
        if total <= 4:
            band, interp, action = "minimal",   "Minimal depression",  "Routine care"
        elif total <= 9:
            band, interp, action = "mild",      "Mild depression",     "Watchful waiting"
        elif total <= 14:
            band, interp, action = "moderate",  "Moderate depression", "Treatment plan"
        elif total <= 19:
            band, interp, action = "mod_severe","Moderately severe",   "Active treatment"
        else:
            band, interp, action = "severe",    "Severe depression",   "Immediate referral"
        return {"total": total, "interpretation": interp, "band": band, "recommended_action": action}

    # ── GAD-7 ───────────────────────────────────────────────────────────────
    if scoring_type == "gad7":
        item_ids = scoring_config.get(
            "item_ids",
            ["gad1", "gad2", "gad3", "gad4", "gad5", "gad6", "gad7"],
        )
        try:
            total = sum(int(data.get(fid, 0) or 0) for fid in item_ids)
        except (TypeError, ValueError):
            total = 0
        if total <= 4:
            band, interp, action = "minimal",  "Minimal anxiety",  "Monitor"
        elif total <= 9:
            band, interp, action = "mild",     "Mild anxiety",     "Watchful waiting"
        elif total <= 14:
            band, interp, action = "moderate", "Moderate anxiety", "Treatment plan"
        else:
            band, interp, action = "severe",   "Severe anxiety",   "Immediate referral"
        return {"total": total, "interpretation": interp, "band": band, "recommended_action": action}

    # ── GCS ──────────────────────────────────────────────────────────────────
    if scoring_type == "gcs":
        try:
            eyes    = int(data.get("gcs_eye",    0) or 0)
            verbal  = int(data.get("gcs_verbal", 0) or 0)
            motor   = int(data.get("gcs_motor",  0) or 0)
            total   = eyes + verbal + motor
        except (TypeError, ValueError):
            total, eyes, verbal, motor = 0, 0, 0, 0
        if total <= 8:
            band, interp, action = "severe",   "Severe TBI",   "Emergency management"
        elif total <= 12:
            band, interp, action = "moderate", "Moderate TBI", "Urgent neurology"
        else:
            band, interp, action = "mild",     "Mild TBI",     "Observe / neuro check"
        return {
            "total": total,
            "interpretation": interp,
            "band": band,
            "recommended_action": action,
            "subscores": {"eyes": eyes, "verbal": verbal, "motor": motor},
        }

    # ── Morse Fall Scale ──────────────────────────────────────────────────────
    if scoring_type == "morse":
        fields = scoring_config.get("item_ids", [
            "morse_fall_history", "morse_secondary_dx", "morse_ambulatory_aid",
            "morse_iv", "morse_gait", "morse_mental_status",
        ])
        try:
            total = sum(int(data.get(f, 0) or 0) for f in fields)
        except (TypeError, ValueError):
            total = 0
        if total < 25:
            band, interp, action = "low",      "Low risk",    "Standard precautions"
        elif total < 51:
            band, interp, action = "medium",   "Medium risk", "Implement fall programme"
        else:
            band, interp, action = "high",     "High risk",   "High-risk fall protocol"
        return {"total": total, "interpretation": interp, "band": band, "recommended_action": action}

    # ── APGAR ────────────────────────────────────────────────────────────────
    if scoring_type == "apgar":
        fields = scoring_config.get("item_ids", [
            "apgar_color", "apgar_pulse", "apgar_grimace",
            "apgar_activity", "apgar_respiration",
        ])
        try:
            total = sum(int(data.get(f, 0) or 0) for f in fields)
        except (TypeError, ValueError):
            total = 0
        if total >= 7:
            band, interp, action = "normal",   "Normal",         "Routine newborn care"
        elif total >= 4:
            band, interp, action = "moderate", "Moderate concern","Stimulate / O2"
        else:
            band, interp, action = "critical", "Requires help",   "Immediate resuscitation"
        return {"total": total, "interpretation": interp, "band": band, "recommended_action": action}

    # ── Generic bands ───────────────────────────────────────────────────────
    item_ids = scoring_config.get("item_ids", [])
    if item_ids:
        try:
            total = sum(float(data.get(fid, 0) or 0) for fid in item_ids)
        except (TypeError, ValueError):
            total = 0.0
        bands = scoring_config.get("bands", [])
        for b in bands:
            lo = b.get("min", 0)
            hi = b.get("max", float("inf"))
            if lo <= total <= hi:
                return {
                    "total": total,
                    "interpretation": b.get("label", ""),
                    "band":  b.get("band", ""),
                    "recommended_action": b.get("recommended_action", ""),
                }
        return {"total": total, "interpretation": "", "band": "", "recommended_action": ""}

    return {}


# ---------------------------------------------------------------------------
# Alert Engine
# ---------------------------------------------------------------------------

def evaluate_alerts(
    schema: dict,
    data: dict,
    alert_rules: Optional[list],
) -> List[dict]:
    """
    Evaluate field-level and composite alert rules.

    Returns a list of fired alerts:
        [ {"field_id": ..., "message": ..., "severity": ..., "rule_type": ...}, ... ]
    """
    fired: List[dict] = []

    if not alert_rules:
        return fired

    for rule in alert_rules:
        rule_type = rule.get("type", "threshold")
        field_id  = rule.get("field_id")
        value     = data.get(field_id)

        if rule_type == "threshold" and field_id:
            try:
                fval = float(value or 0)
            except (TypeError, ValueError):
                continue

            crit_low  = rule.get("critical_low")
            crit_high = rule.get("critical_high")
            warn_low  = rule.get("warn_low")
            warn_high = rule.get("warn_high")

            if crit_low  is not None and fval < crit_low:
                fired.append({"field_id": field_id, "message": rule.get("critical_message", f"{field_id} critically low"),  "severity": "critical", "rule_type": "threshold"})
            elif crit_high is not None and fval > crit_high:
                fired.append({"field_id": field_id, "message": rule.get("critical_message", f"{field_id} critically high"), "severity": "critical", "rule_type": "threshold"})
            elif warn_low  is not None and fval < warn_low:
                fired.append({"field_id": field_id, "message": rule.get("warn_message",     f"{field_id} low"),             "severity": "warning",  "rule_type": "threshold"})
            elif warn_high is not None and fval > warn_high:
                fired.append({"field_id": field_id, "message": rule.get("warn_message",     f"{field_id} high"),            "severity": "warning",  "rule_type": "threshold"})

        elif rule_type == "required" and field_id:
            if value in (None, "", [], {}):
                fired.append({"field_id": field_id, "message": rule.get("message", f"{field_id} is required"), "severity": "info", "rule_type": "required"})

        elif rule_type == "pattern" and field_id:
            import re
            pattern = rule.get("pattern", "")
            if pattern and value is not None:
                if not re.fullmatch(pattern, str(value)):
                    fired.append({"field_id": field_id, "message": rule.get("message", f"{field_id} format invalid"), "severity": "warning", "rule_type": "pattern"})

    return fired


# ---------------------------------------------------------------------------
# iView / Flowsheet helpers
# ---------------------------------------------------------------------------

def save_iview_row(db: Session, submission: "FormSubmission") -> None:
    """
    Persist flowsheet values from a submission that has iView enabled.
    Each field flagged in iview_config.row_config becomes one iViewFlowsheet row.
    """
    form: "AssessmentForm" = submission.form
    if not form or not form.is_iview_enabled:
        return

    cfg   = form.iview_config or {}
    rows  = cfg.get("row_config", [])
    fdata = submission.form_data or {}

    for row in rows:
        fid   = row.get("field_id")
        if not fid:
            continue
        val = fdata.get(fid)
        if val is None:
            continue
        try:
            num_val = float(val)
        except (TypeError, ValueError):
            num_val = None

        entry = iViewFlowsheet(
            patient_id    = submission.patient_id,
            encounter_id  = submission.encounter_id,
            form_id       = form.id,
            submission_id = submission.id,
            field_id      = fid,
            label         = row.get("label", fid),
            value_text    = str(val),
            value_numeric = num_val,
            unit          = row.get("unit"),
            ref_range     = json.dumps(row.get("ref_range")) if row.get("ref_range") else None,
            recorded_at   = submission.submitted_at or datetime.utcnow(),
        )
        db.add(entry)


# ---------------------------------------------------------------------------
# ── Admin / Platform routes ──
# ---------------------------------------------------------------------------

@router.get("/assessment-forms/")
def list_forms(
    db:          Session = Depends(get_db),
    status:      Optional[str] = Query(None),
    category:    Optional[str] = Query(None),
    subcategory: Optional[str] = Query(None),
    q:           Optional[str] = Query(None),
    limit:       int           = Query(50,  ge=1, le=500),
    offset:      int           = Query(0,   ge=0),
):
    query = db.query(AssessmentForm)
    if status:      query = query.filter(AssessmentForm.status      == status)
    if category:    query = query.filter(AssessmentForm.category    == category)
    if subcategory: query = query.filter(AssessmentForm.subcategory == subcategory)
    if q:
        like = f"%{q}%"
        query = query.filter(
            AssessmentForm.title.ilike(like) |
            AssessmentForm.description.ilike(like)
        )
    total = query.count()
    forms = query.order_by(AssessmentForm.created_at.desc()).offset(offset).limit(limit).all()
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "forms": [
            {
                "id":              f.id,
                "title":           f.title,
                "description":     f.description,
                "category":        f.category,
                "subcategory":     f.subcategory,
                "status":          f.status,
                "is_template":     f.is_template,
                "icon":            f.icon,
                "version_number":  f.version,
                "is_iview_enabled":f.is_iview_enabled,
                "question_count":  len((f.schema or {}).get("fields", [])),
                "created_at":      f.created_at.isoformat() if f.created_at else None,
                "updated_at":      f.updated_at.isoformat() if f.updated_at else None,
            }
            for f in forms
        ],
    }


@router.post("/assessment-forms/", status_code=status.HTTP_201_CREATED)
def create_form(
    payload: Dict[str, Any] = Body(...),
    db:      Session        = Depends(get_db),
):
    form = AssessmentForm(
        title           = payload.get("title", "Untitled Form"),
        description     = payload.get("description"),
        category        = payload.get("category", "general"),
        subcategory     = payload.get("subcategory"),
        status          = payload.get("status", "draft"),
        schema          = payload.get("schema", {}),
        scoring_config  = payload.get("scoring_config"),
        alert_rules     = payload.get("alert_rules"),
        is_template     = payload.get("is_template", False),
        is_iview_enabled= payload.get("is_iview_enabled", False),
        iview_config    = payload.get("iview_config"),
        icon            = payload.get("icon", "📋"),
        version         = 1,
        created_at      = datetime.utcnow(),
        updated_at      = datetime.utcnow(),
    )
    db.add(form)
    db.commit()
    db.refresh(form)
    return {"id": form.id, "title": form.title, "status": form.status}


@router.get("/assessment-forms/{form_id}")
def get_form(form_id: int, db: Session = Depends(get_db)):
    form = db.query(AssessmentForm).filter(AssessmentForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    return {
        "id":               form.id,
        "title":            form.title,
        "description":      form.description,
        "category":         form.category,
        "subcategory":      form.subcategory,
        "status":           form.status,
        "schema":           form.schema,
        "scoring_config":   form.scoring_config,
        "alert_rules":      form.alert_rules,
        "is_template":      form.is_template,
        "is_iview_enabled": form.is_iview_enabled,
        "iview_config":     form.iview_config,
        "icon":             form.icon,
        "version_number":   form.version,
        "created_at":       form.created_at.isoformat() if form.created_at else None,
        "updated_at":       form.updated_at.isoformat() if form.updated_at else None,
    }


@router.patch("/assessment-forms/{form_id}")
def update_form(
    form_id: int,
    payload: Dict[str, Any] = Body(...),
    db:      Session        = Depends(get_db),
):
    form = db.query(AssessmentForm).filter(AssessmentForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    updatable = [
        "title", "description", "category", "subcategory", "status",
        "schema", "scoring_config", "alert_rules", "is_template",
        "is_iview_enabled", "iview_config", "icon",
        "requires_cosign", "time_limit_minutes",
    ]
    for field in updatable:
        if field in payload:
            setattr(form, field, payload[field])

    # Bump version on schema changes
    if "schema" in payload:
        form.version = (form.version or 1) + 1

    form.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(form)
    return {"id": form.id, "title": form.title, "status": form.status, "version_number": form.version}


@router.delete("/assessment-forms/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_form(form_id: int, db: Session = Depends(get_db)):
    """
    Permanently delete an assessment form and its associated versions.
    Returns 204 No Content on success, 404 if not found.
    """
    form = db.query(AssessmentForm).filter(AssessmentForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    # Delete child versions first to avoid FK constraint violations
    db.query(AssessmentFormVersion).filter(
        AssessmentFormVersion.form_id == form_id
    ).delete(synchronize_session=False)

    db.delete(form)
    db.commit()
    return


@router.post("/assessment-forms/{form_id}/duplicate", status_code=status.HTTP_201_CREATED)
def duplicate_form(form_id: int, db: Session = Depends(get_db)):
    original = db.query(AssessmentForm).filter(AssessmentForm.id == form_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Form not found")

    copy = AssessmentForm(
        title            = f"{original.title} (Copy)",
        description      = original.description,
        category         = original.category,
        subcategory      = original.subcategory,
        status           = "draft",
        schema           = original.schema,
        scoring_config   = original.scoring_config,
        alert_rules      = original.alert_rules,
        is_template      = original.is_template,
        is_iview_enabled = original.is_iview_enabled,
        iview_config     = original.iview_config,
        icon             = original.icon,
        version          = 1,
        created_at       = datetime.utcnow(),
        updated_at       = datetime.utcnow(),
    )
    db.add(copy)
    db.commit()
    db.refresh(copy)
    return {"id": copy.id, "title": copy.title, "status": copy.status}


@router.post("/assessment-forms/{form_id}/publish")
def publish_form(form_id: int, db: Session = Depends(get_db)):
    form = db.query(AssessmentForm).filter(AssessmentForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    form.status     = "published"
    form.updated_at = datetime.utcnow()
    db.commit()
    return {"id": form.id, "status": form.status}


@router.post("/assessment-forms/{form_id}/retire")
def retire_form(form_id: int, db: Session = Depends(get_db)):
    form = db.query(AssessmentForm).filter(AssessmentForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    form.status     = "retired"
    form.updated_at = datetime.utcnow()
    db.commit()
    return {"id": form.id, "status": form.status}


# ---------------------------------------------------------------------------
# Versions
# ---------------------------------------------------------------------------

@router.get("/assessment-forms/{form_id}/versions")
def list_versions(form_id: int, db: Session = Depends(get_db)):
    form = db.query(AssessmentForm).filter(AssessmentForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    versions = (
        db.query(AssessmentFormVersion)
        .filter(AssessmentFormVersion.form_id == form_id)
        .order_by(AssessmentFormVersion.version.desc())
        .all()
    )
    return [
        {
            "id":             v.id,
            "version_number": v.version,
            "created_at":     v.created_at.isoformat() if v.created_at else None,
        }
        for v in versions
    ]


@router.post("/assessment-forms/{form_id}/versions")
def create_version(
    form_id: int,
    payload: Dict[str, Any] = Body(...),
    db:      Session        = Depends(get_db),
):
    form = db.query(AssessmentForm).filter(AssessmentForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    ver = AssessmentFormVersion(
        form_id        = form_id,
        version        = (form.version or 1),
        schema         = form.schema,
        created_at     = datetime.utcnow(),
    )
    db.add(ver)
    form.version    = (form.version or 1) + 1
    form.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ver)
    return {"id": ver.id, "version_number": ver.version}


# ---------------------------------------------------------------------------
# Assignments
# ---------------------------------------------------------------------------

@router.get("/assessment-forms/{form_id}/assignments")
def list_assignments(form_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(FormAssignment)
        .filter(FormAssignment.form_id == form_id)
        .all()
    )
    return [
        {
            "id":           r.id,
            "entity_type":  r.entity_type,
            "entity_id":    r.entity_id,
            "assigned_at":  r.assigned_at.isoformat() if r.assigned_at else None,
        }
        for r in rows
    ]


@router.post("/assessment-forms/{form_id}/assignments", status_code=201)
def create_assignment(
    form_id: int,
    payload: Dict[str, Any] = Body(...),
    db:      Session        = Depends(get_db),
):
    form = db.query(AssessmentForm).filter(AssessmentForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    row = FormAssignment(
        form_id     = form_id,
        entity_type = payload.get("entity_type", "ward"),
        entity_id   = payload.get("entity_id", ""),
        assigned_at = datetime.utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "form_id": form_id, "entity_type": row.entity_type, "entity_id": row.entity_id}


# ---------------------------------------------------------------------------
# Provider submission routes
# ---------------------------------------------------------------------------

@router.post("/assessment-forms/{form_id}/submit", status_code=201)
def submit_form(
    form_id:  int,
    payload:  Dict[str, Any] = Body(...),
    db:       Session        = Depends(get_db),
):
    """
    Provider-facing: submit a filled form for a patient.
    Runs scoring + alerts, persists a FormSubmission, optionally writes iView rows.
    """
    form = db.query(AssessmentForm).filter(AssessmentForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    if form.status != "published":
        raise HTTPException(status_code=400, detail="Form is not published")

    form_data     = payload.get("form_data", {})
    scoring_result= run_scoring(form_id, form.schema or {}, form_data, form.scoring_config)
    alerts_fired  = evaluate_alerts(form.schema or {}, form_data, form.alert_rules)

    sub = FormSubmission(
        form_id       = form_id,
        patient_id    = payload.get("patient_id"),
        encounter_id  = payload.get("encounter_id"),
        submitted_by  = payload.get("submitted_by"),
        form_data     = form_data,
        score_result  = scoring_result or None,
        status        = "submitted",
        submitted_at  = datetime.utcnow(),
    )
    db.add(sub)
    db.flush()   # get sub.id before commit

    # Persist alert records
    for a in alerts_fired:
        alert = FormAlert(
            submission_id = sub.id,
            form_id       = form_id,
            field_id      = a.get("field_id"),
            severity      = a.get("severity", "info"),
            message       = a.get("message", ""),
            rule_type     = a.get("rule_type", "threshold"),
            triggered_at  = datetime.utcnow(),
        )
        db.add(alert)

    db.commit()
    db.refresh(sub)

    # iView flowsheet rows
    if form.is_iview_enabled:
        save_iview_row(db, sub)
        db.commit()

    return {
        "submission_id":  sub.id,
        "status":         sub.status,
        "score_result":   scoring_result,
        "alerts_fired":   alerts_fired,
        "submitted_at":   sub.submitted_at.isoformat(),
    }


@router.get("/assessment-forms/{form_id}/submissions")
def list_submissions(
    form_id:     int,
    db:          Session        = Depends(get_db),
    patient_id:  Optional[str]  = Query(None),
    encounter_id:Optional[str]  = Query(None),
    limit:       int            = Query(50, ge=1, le=500),
    offset:      int            = Query(0, ge=0),
):
    q = db.query(FormSubmission).filter(FormSubmission.form_id == form_id)
    if patient_id:   q = q.filter(FormSubmission.patient_id   == patient_id)
    if encounter_id: q = q.filter(FormSubmission.encounter_id == encounter_id)
    total = q.count()
    rows  = q.order_by(FormSubmission.submitted_at.desc()).offset(offset).limit(limit).all()
    return {
        "total":  total,
        "items": [
            {
                "id":           r.id,
                "patient_id":   r.patient_id,
                "encounter_id": r.encounter_id,
                "submitted_by": r.submitted_by,
                "score_result": r.score_result,
                "status":       r.status,
                "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None,
            }
            for r in rows
        ],
    }


@router.get("/submissions/{submission_id}")
def get_submission(submission_id: int, db: Session = Depends(get_db)):
    sub = db.query(FormSubmission).filter(FormSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    alerts = (
        db.query(FormAlert)
        .filter(FormAlert.submission_id == submission_id)
        .all()
    )
    return {
        "id":           sub.id,
        "form_id":      sub.form_id,
        "patient_id":   sub.patient_id,
        "encounter_id": sub.encounter_id,
        "submitted_by": sub.submitted_by,
        "form_data":    sub.form_data,
        "score_result": sub.score_result,
        "status":       sub.status,
        "submitted_at": sub.submitted_at.isoformat() if sub.submitted_at else None,
        "alerts": [
            {
                "id":           a.id,
                "field_id":     a.field_id,
                "severity":     a.severity,
                "message":      a.message,
                "rule_type":    a.rule_type,
                "triggered_at": a.triggered_at.isoformat() if a.triggered_at else None,
            }
            for a in alerts
        ],
    }


@router.patch("/submissions/{submission_id}/cosign")
def cosign_submission(
    submission_id: int,
    payload:       Dict[str, Any] = Body(...),
    db:            Session        = Depends(get_db),
):
    sub = db.query(FormSubmission).filter(FormSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    cosign = FormCoSign(
        submission_id  = submission_id,
        cosigned_by    = payload.get("cosigned_by"),
        cosigned_at    = datetime.utcnow(),
        cosign_comment = payload.get("comment"),
    )
    db.add(cosign)
    db.commit()
    return {"submission_id": submission_id, "cosigned_by": cosign.cosigned_by}


# ---------------------------------------------------------------------------
# Form Pool (pool = library of reusable form templates)
# ---------------------------------------------------------------------------

@router.get("/form-pool/")
def list_pool(
    db:       Session = Depends(get_db),
    category: Optional[str] = Query(None),
    q:        Optional[str] = Query(None),
    limit:    int           = Query(50,  ge=1, le=500),
    offset:   int           = Query(0,   ge=0),
):
    query = db.query(FormPool)
    if category: query = query.filter(FormPool.category == category)
    if q:
        like = f"%{q}%"
        query = query.filter(
            FormPool.title.ilike(like) | FormPool.description.ilike(like)
        )
    total = query.count()
    items = query.order_by(FormPool.title).offset(offset).limit(limit).all()
    return {
        "total":  total,
        "offset": offset,
        "limit":  limit,
        "items": [
            {
                "id":          i.id,
                "title":       i.title,
                "description": i.description,
                "category":    i.category,
                "icon":        i.icon,
                "schema":      i.schema,
            }
            for i in items
        ],
    }


@router.post("/form-pool/{pool_id}/instantiate", status_code=201)
def instantiate_from_pool(
    pool_id: int,
    payload: Dict[str, Any] = Body(default={}),
    db:      Session        = Depends(get_db),
):
    """
    Create a new AssessmentForm from a FormPool template.
    Caller may override title, category, etc. via payload.
    """
    template = db.query(FormPool).filter(FormPool.id == pool_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Pool template not found")

    form = AssessmentForm(
        title            = payload.get("title",       template.title),
        description      = payload.get("description", template.description),
        category         = payload.get("category",    template.category),
        status           = "draft",
        schema           = template.schema,
        scoring_config   = template.schema.get("scoring_config") if template.schema else None,
        alert_rules      = template.schema.get("alert_rules")    if template.schema else None,
        is_template      = False,
        is_iview_enabled = bool(template.schema and template.schema.get("is_iview_enabled")),
        iview_config     = template.schema.get("iview_config")   if template.schema else None,
        icon             = payload.get("icon",        template.icon),
        version          = 1,
        created_at       = datetime.utcnow(),
        updated_at       = datetime.utcnow(),
    )
    db.add(form)
    db.commit()
    db.refresh(form)
    return {"id": form.id, "title": form.title, "status": form.status}


# ---------------------------------------------------------------------------
# iView Flowsheet
# ---------------------------------------------------------------------------

@router.get("/iview/{patient_id}")
def get_iview(
    patient_id:   str,
    db:           Session       = Depends(get_db),
    encounter_id: Optional[str] = Query(None),
    form_id:      Optional[int] = Query(None),
    limit:        int           = Query(200, ge=1, le=2000),
):
    q = db.query(iViewFlowsheet).filter(iViewFlowsheet.patient_id == patient_id)
    if encounter_id: q = q.filter(iViewFlowsheet.encounter_id == encounter_id)
    if form_id:      q = q.filter(iViewFlowsheet.form_id       == form_id)
    rows = q.order_by(iViewFlowsheet.recorded_at.desc()).limit(limit).all()
    return [
        {
            "id":            r.id,
            "form_id":       r.form_id,
            "submission_id": r.submission_id,
            "field_id":      r.field_id,
            "label":         r.label,
            "value_text":    r.value_text,
            "value_numeric": r.value_numeric,
            "unit":          r.unit,
            "ref_range":     r.ref_range,
            "recorded_at":   r.recorded_at.isoformat() if r.recorded_at else None,
        }
        for r in rows
    ]


# ---------------------------------------------------------------------------
# FormPool schema export (for builder re-use)
# ---------------------------------------------------------------------------

@router.get("/assessment-forms/{form_id}/export-schema")
def export_schema(form_id: int, db: Session = Depends(get_db)):
    form = db.query(AssessmentForm).filter(AssessmentForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    result = []
    for field in (form.schema or {}).get("fields", []):
        result.append({
            "field_id":  field.get("id", ""),
            "label":     field.get("label", ""),
            "type":      field.get("type", ""),
            "required":  field.get("required", False),
            "ref_range": field.get("ref_range", ""),
        })
    return result
