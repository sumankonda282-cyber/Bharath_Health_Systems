"""
BHarath Health — Smart Assessment Forms (PowerForms) API
Provides admin/platform form management and provider-facing submission endpoints.
"""
import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.db.session import get_db

try:
    from app.core.security import get_current_staff
except ImportError:
    def get_current_staff():
        return None

from app.models.models import (
    AssessmentForm,
    AssessmentFormAudit,
    AssessmentFormVersion,
    FormAlert,
    FormAssignment,
    FormCoSign,
    FormPool,
    FormSubmission,
    FormSubmissionComment,
    iViewFlowsheet,
    iViewObservation,
    StaffFormFavorite,
)

router = APIRouter(tags=["Assessment Forms"])

TRASH_RETENTION_DAYS = 30


def _form_actor(request: Request, db: Session):
    """Best-effort: identify whoever made a change from the bearer token, for the audit
    trail. Returns (actor_id, actor_name, actor_type). Never raises — the form CRUD
    endpoints are not auth-gated, so a missing/invalid token just yields 'Unknown'."""
    try:
        from app.core.security import decode_token
        from app.models.models import Staff, PlatformAdmin
        auth = request.headers.get("authorization") or ""
        if not auth.lower().startswith("bearer "):
            return (None, "Unknown", None)
        payload = decode_token(auth.split(" ", 1)[1]) or {}
        sub = payload.get("sub")
        try:
            sid = int(sub)
        except (TypeError, ValueError):
            return (None, "Unknown", None)
        ttype = (payload.get("type") or payload.get("scope") or "").lower()
        if "platform" in ttype or "admin" in ttype:
            pa = db.query(PlatformAdmin).filter(PlatformAdmin.id == sid).first()
            if pa:
                return (pa.id, pa.full_name, "platform_admin")
        st = db.query(Staff).filter(Staff.id == sid).first()
        if st:
            return (st.id, st.full_name, "staff")
        pa = db.query(PlatformAdmin).filter(PlatformAdmin.id == sid).first()
        if pa:
            return (pa.id, pa.full_name, "platform_admin")
        return (sid, "Unknown", None)
    except Exception:
        return (None, "Unknown", None)


def _form_audit(db: Session, form, action: str, actor, detail: str = None):
    """Append an audit row. Caller commits."""
    aid, aname, atype = actor if actor else (None, "Unknown", None)
    db.add(AssessmentFormAudit(
        form_id=form.id, form_title=getattr(form, "title", None),
        action=action, actor_id=aid, actor_name=aname, actor_type=atype, detail=detail,
    ))


def _purge_expired_trash(db: Session):
    """Hard-delete forms that have sat in Trash beyond the retention window AND carry no
    clinical data (submissions / iview observations). Safe to call opportunistically."""
    cutoff = datetime.utcnow() - timedelta(days=TRASH_RETENTION_DAYS)
    expired = db.query(AssessmentForm).filter(
        AssessmentForm.deleted_at.isnot(None),
        AssessmentForm.deleted_at < cutoff,
    ).all()
    purged = 0
    for f in expired:
        has_data = (db.query(FormSubmission.id).filter(FormSubmission.form_id == f.id).first()
                    or db.query(iViewObservation.id).filter(iViewObservation.form_id == f.id).first())
        if has_data:
            continue  # never destroy clinical data — keep in Trash
        for model in (AssessmentFormVersion, FormPool, FormAssignment, StaffFormFavorite, iViewFlowsheet):
            db.query(model).filter(model.form_id == f.id).delete(synchronize_session=False)
        db.delete(f)
        purged += 1
    if purged:
        db.commit()
    return purged


# ---------------------------------------------------------------------------
# ── Form favorites (personal + organization), tenant-isolated by clinic_id ──
# Declared BEFORE /assessment-forms/{form_id} so "favorites" is never parsed
# as a form id.
# ---------------------------------------------------------------------------

@router.get("/assessment-forms/favorites")
def list_favorites(
    ward_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current = Depends(get_current_staff),
):
    """Favorite form ids for the current staff's clinic:
    `personal` (this staff member only), `organization` (shared across the whole
    clinic/health center, all branches) and, when `ward_id` is supplied, `ward`
    (shared by everyone working in that ward)."""
    if not current:
        raise HTTPException(status_code=401, detail="Authentication required")
    rows = db.query(StaffFormFavorite).filter(
        StaffFormFavorite.clinic_id == current.clinic_id
    ).all()
    personal     = [r.form_id for r in rows if r.scope == "personal" and r.staff_id == current.id]
    organization = [r.form_id for r in rows if r.scope == "organization"]
    ward         = [r.form_id for r in rows if r.scope == "ward" and ward_id and r.ward_id == ward_id]
    return {"personal": personal, "organization": organization, "ward": ward}


@router.post("/assessment-forms/favorites/{form_id}", status_code=201)
def add_favorite(
    form_id: int,
    scope:   str = Query("personal"),
    ward_id: Optional[int] = Query(None),
    db:      Session = Depends(get_db),
    current = Depends(get_current_staff),
):
    """Star a form. scope=personal → only this staff member; scope=organization
    → everyone in the clinic; scope=ward → everyone working in `ward_id`. Any
    clinical staff may set an organization or ward favorite. Idempotent."""
    if not current:
        raise HTTPException(status_code=401, detail="Authentication required")
    if scope not in ("personal", "organization", "ward"):
        raise HTTPException(status_code=400, detail="scope must be 'personal', 'organization' or 'ward'")
    if scope == "ward" and not ward_id:
        raise HTTPException(status_code=400, detail="ward_id is required for scope='ward'")
    if not db.query(AssessmentForm).filter(AssessmentForm.id == form_id).first():
        raise HTTPException(status_code=404, detail="Form not found")
    q = db.query(StaffFormFavorite).filter(
        StaffFormFavorite.clinic_id == current.clinic_id,
        StaffFormFavorite.form_id == form_id,
        StaffFormFavorite.scope == scope,
    )
    if scope == "personal":
        q = q.filter(StaffFormFavorite.staff_id == current.id)
    if scope == "ward":
        q = q.filter(StaffFormFavorite.ward_id == ward_id)
    if not q.first():
        db.add(StaffFormFavorite(
            clinic_id = current.clinic_id,
            staff_id  = current.id,
            form_id   = form_id,
            scope     = scope,
            ward_id   = ward_id if scope == "ward" else None,
        ))
        db.commit()
    return {"status": "ok", "form_id": form_id, "scope": scope, "ward_id": ward_id if scope == "ward" else None}


@router.delete("/assessment-forms/favorites/{form_id}")
def remove_favorite(
    form_id: int,
    scope:   str = Query("personal"),
    ward_id: Optional[int] = Query(None),
    db:      Session = Depends(get_db),
    current = Depends(get_current_staff),
):
    """Unstar a form. personal removes only this staff member's star;
    organization removes the clinic-wide star; ward removes the ward's star
    (any clinical staff may remove an organization or ward star)."""
    if not current:
        raise HTTPException(status_code=401, detail="Authentication required")
    if scope not in ("personal", "organization", "ward"):
        raise HTTPException(status_code=400, detail="scope must be 'personal', 'organization' or 'ward'")
    if scope == "ward" and not ward_id:
        raise HTTPException(status_code=400, detail="ward_id is required for scope='ward'")
    q = db.query(StaffFormFavorite).filter(
        StaffFormFavorite.clinic_id == current.clinic_id,
        StaffFormFavorite.form_id == form_id,
        StaffFormFavorite.scope == scope,
    )
    if scope == "personal":
        q = q.filter(StaffFormFavorite.staff_id == current.id)
    if scope == "ward":
        q = q.filter(StaffFormFavorite.ward_id == ward_id)
    q.delete(synchronize_session=False)
    db.commit()
    return {"status": "ok", "form_id": form_id, "scope": scope, "ward_id": ward_id if scope == "ward" else None}


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

def _to_num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def _alert_op_match(op: str, value, rule: dict) -> bool:
    """Evaluate one builder-authored operator rule against a field value.

    Mirrors the operators offered by the admin Form Builder's AlertRulesEditor
    (gt/gte/lt/lte/eq/neq/between/includes/excludes/contains/is_empty/is_not_empty)
    so a rule a clinician authors in the builder actually fires on submission."""
    if op == "is_empty":
        return value in (None, "", [], {})
    if op == "is_not_empty":
        return value not in (None, "", [], {})
    if op == "contains":
        needle = str(rule.get("value", "")).strip()
        return bool(needle) and value is not None and needle.lower() in str(value).lower()
    if op == "eq":
        return str(value) == str(rule.get("value", rule.get("threshold", "")))
    if op == "neq":
        return str(value) != str(rule.get("value", rule.get("threshold", "")))
    if op in ("includes", "excludes"):
        vals = value if isinstance(value, list) else [value]
        target = rule.get("value")
        present = (target in vals) or (str(target) in [str(v) for v in vals])
        return present if op == "includes" else (not present)

    # Numeric comparisons.
    fv = _to_num(value)
    if fv is None:
        return False
    if op == "between":
        lo, hi = _to_num(rule.get("threshold_low")), _to_num(rule.get("threshold_high"))
        return lo is not None and hi is not None and lo <= fv <= hi
    threshold = _to_num(rule.get("threshold", rule.get("value")))
    if threshold is None:
        return False
    if op == "gt":  return fv >  threshold
    if op == "gte": return fv >= threshold
    if op == "lt":  return fv <  threshold
    if op == "lte": return fv <= threshold
    return False


def evaluate_alerts(
    schema: dict,
    data: dict,
    alert_rules: Optional[list],
) -> List[dict]:
    """
    Evaluate form-level alert rules.

    Supports the legacy threshold/required/pattern shapes AND a ``composite``
    cross-field rule (Discern-style CDS): ``{"type":"composite","match":"all"|"any",
    "conditions":[{"field_id","operator","threshold"|"value"}], "message","severity"}``.

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

        elif rule_type == "composite":
            conds = rule.get("conditions") or []
            if conds:
                results = [_alert_op_match(c.get("operator", "gt"), (data or {}).get(c.get("field_id")), c) for c in conds]
                hit = all(results) if rule.get("match", "all") == "all" else any(results)
                if hit:
                    fired.append({
                        "field_id":    rule.get("field_id") or conds[0].get("field_id"),
                        "field_label": rule.get("label") or "Clinical rule",
                        "message":     rule.get("message", "Clinical decision rule triggered"),
                        "severity":    rule.get("severity", "warning"),
                        "rule_type":   "composite",
                    })

    return fired


def evaluate_field_alerts(schema: dict, data: dict) -> List[dict]:
    """Evaluate the per-field alert rules authored in the admin Form Builder
    (``field.alert_rules`` with the operator/threshold shape). These live in the
    form SCHEMA, not in the form-level ``alert_rules`` column, so without this the
    rules a clinician sets up in the builder would never fire on submission."""
    fired: List[dict] = []
    for section in (schema or {}).get("sections", []):
        for f in section.get("fields", []):
            fid   = f.get("id") or f.get("field_id")
            rules = f.get("alert_rules") or []
            if not fid or not rules:
                continue
            value = (data or {}).get(fid)
            for rule in rules:
                op = rule.get("operator")
                if not op:
                    continue
                try:
                    if _alert_op_match(op, value, rule):
                        fired.append({
                            "field_id":    fid,
                            "field_label": f.get("label") or fid,
                            "message":     rule.get("message") or f"{f.get('label', fid)} alert",
                            "severity":    rule.get("severity", "warning"),
                            "rule_type":   "field",
                        })
                except Exception:  # noqa: BLE001 — one malformed rule must not break submission
                    continue
    return fired


# ---------------------------------------------------------------------------
# iView / Flowsheet helpers
# ---------------------------------------------------------------------------

def save_iview_row(db: Session, submission, form) -> None:
    """
    Persist flowsheet observations from a submission that has iView enabled.
    Each field flagged in iview_config.row_config becomes one iview_observations
    row. (iview_flowsheets holds the per-form config; this writes the values.)
    """
    if not form or not form.is_iview_enabled:
        return

    cfg   = form.iview_config or {}
    rows  = cfg.get("row_config", [])
    fdata = submission.data or {}

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

        db.add(iViewObservation(
            clinic_id     = submission.clinic_id,
            form_id       = form.id,
            submission_id = submission.id,
            patient_id    = submission.patient_id,
            encounter_id  = submission.encounter_id,
            field_id      = fid,
            label         = row.get("label", fid),
            value_text    = str(val),
            value_numeric = num_val,
            unit          = row.get("unit"),
            ref_range     = json.dumps(row.get("ref_range")) if row.get("ref_range") else None,
            recorded_at   = submission.submitted_at or datetime.utcnow(),
        ))


# ---------------------------------------------------------------------------
# ── Admin / Platform routes ──
# ---------------------------------------------------------------------------

def _form_field_count(form) -> int:
    """Total fields across all sections — the real question count (schema is
    sectioned: schema.sections[].fields, NOT a top-level schema.fields)."""
    sections = (form.schema or {}).get("sections") or []
    return sum(len((s or {}).get("fields") or []) for s in sections)


@router.get("/assessment-forms/")
def list_forms(
    db:           Session = Depends(get_db),
    status:       Optional[str] = Query(None),
    category:     Optional[str] = Query(None),
    subcategory:  Optional[str] = Query(None),
    q:            Optional[str] = Query(None),
    clinic_id:    Optional[int] = Query(None),    # scope: return global forms + this clinic's forms
    include_empty: bool         = Query(False),  # empty (0-field) forms are hidden from search by default
    limit:        int           = Query(50,  ge=1, le=1000),
    offset:       int           = Query(0,   ge=0),
):
    query = db.query(AssessmentForm).filter(AssessmentForm.deleted_at.is_(None))
    if status:      query = query.filter(AssessmentForm.status      == status)
    if category:    query = query.filter(AssessmentForm.category    == category)
    if subcategory: query = query.filter(AssessmentForm.subcategory == subcategory)
    # Scope: a portal passes its clinic_id to see global forms (clinic_id NULL) plus its
    # own health-center forms only. Admin omits it → sees every form. Purely additive.
    if clinic_id is not None:
        query = query.filter(
            (AssessmentForm.clinic_id.is_(None)) | (AssessmentForm.clinic_id == clinic_id)
        )
    if q:
        like = f"%{q}%"
        query = query.filter(
            AssessmentForm.title.ilike(like) |
            AssessmentForm.description.ilike(like)
        )
    rows = query.order_by(AssessmentForm.created_at.desc()).all()
    # Empty forms (no fields) are unusable for documentation — keep them out of search
    # unless explicitly requested (e.g. an admin auditing the library).
    if not include_empty:
        rows = [f for f in rows if _form_field_count(f) > 0]
    total = len(rows)
    forms = rows[offset:offset + limit]
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
                "clinic_id":       f.clinic_id,   # null = global; set = health-center-scoped
                "question_count":  _form_field_count(f),
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
        clinic_id       = payload.get("clinic_id"),   # null = global; set = health-center-scoped
        version         = 1,
        created_at      = datetime.utcnow(),
        updated_at      = datetime.utcnow(),
    )
    db.add(form)
    db.commit()
    db.refresh(form)
    return {"id": form.id, "title": form.title, "status": form.status, "clinic_id": form.clinic_id}


@router.get("/assessment-forms/trash")
def list_trash(db: Session = Depends(get_db)):
    """Forms currently in Trash (soft-deleted, recoverable). Opportunistically purges any
    that have passed the 30-day window and carry no clinical data. Defined before the
    /{form_id} route so the literal path wins."""
    _purge_expired_trash(db)
    rows = db.query(AssessmentForm).filter(
        AssessmentForm.deleted_at.isnot(None)
    ).order_by(AssessmentForm.deleted_at.desc()).all()
    today = datetime.utcnow()
    out = []
    for f in rows:
        days_left = TRASH_RETENTION_DAYS - (today - f.deleted_at).days if f.deleted_at else None
        has_data = bool(db.query(FormSubmission.id).filter(FormSubmission.form_id == f.id).first())
        out.append({
            "id": f.id, "title": f.title, "category": f.category, "subcategory": f.subcategory,
            "deleted_at": f.deleted_at.isoformat() if f.deleted_at else None,
            "deleted_by_name": f.deleted_by_name,
            "days_left": max(0, days_left) if days_left is not None else None,
            "has_submissions": has_data,
        })
    return {"trash": out, "retention_days": TRASH_RETENTION_DAYS}


@router.get("/assessment-forms/{form_id}")
def get_form(form_id: int, db: Session = Depends(get_db)):
    form = db.query(AssessmentForm).filter(
        AssessmentForm.id == form_id, AssessmentForm.deleted_at.is_(None)
    ).first()
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
        "clinic_id":        form.clinic_id,   # null = global; set = health-center-scoped
        "version_number":   form.version,
        "created_at":       form.created_at.isoformat() if form.created_at else None,
        "updated_at":       form.updated_at.isoformat() if form.updated_at else None,
    }


@router.patch("/assessment-forms/{form_id}")
def update_form(
    form_id: int,
    request: Request,
    payload: Dict[str, Any] = Body(...),
    db:      Session        = Depends(get_db),
    current                 = Depends(get_current_staff),
):
    form = db.query(AssessmentForm).filter(AssessmentForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    updatable = [
        "title", "description", "category", "subcategory", "status",
        "schema", "scoring_config", "alert_rules", "is_template",
        "is_iview_enabled", "iview_config", "icon",
        "requires_cosign", "time_limit_minutes",
        # clinic_id: only platform admins may change scope — staff editors are excluded
        # to prevent cross-tenant form reassignment.
    ]
    # Allow platform admins (no clinic_id on their JWT) to change scope
    if payload.get("clinic_id") is not None and hasattr(current, "clinic_id") and current.clinic_id is None:
        updatable = updatable + ["clinic_id"]
    changed = []
    for field in updatable:
        if field in payload:
            setattr(form, field, payload[field])
            changed.append(field)

    # Bump version on schema changes
    if "schema" in payload:
        form.version = (form.version or 1) + 1

    form.updated_at = datetime.utcnow()
    _form_audit(db, form, "edited", _form_actor(request, db), ", ".join(changed) if changed else None)
    db.commit()
    db.refresh(form)
    return {"id": form.id, "title": form.title, "status": form.status, "version_number": form.version}


@router.delete("/assessment-forms/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_form(form_id: int, request: Request, db: Session = Depends(get_db)):
    """Soft-delete → Trash. The form and all its data are kept (recoverable for 30 days),
    just hidden from the pool/search. Audited. Use ?permanent=1 only for an empty form with
    no submissions."""
    permanent = request.query_params.get("permanent") in ("1", "true", "yes")
    form = db.query(AssessmentForm).filter(AssessmentForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    actor = _form_actor(request, db)

    if permanent:
        has_data = (db.query(FormSubmission.id).filter(FormSubmission.form_id == form_id).first()
                    or db.query(iViewObservation.id).filter(iViewObservation.form_id == form_id).first())
        if has_data:
            raise HTTPException(status_code=409, detail="Form has clinical submissions — cannot permanently delete. It can only be moved to Trash.")
        _form_audit(db, form, "deleted", actor, "permanent")
        for model in (AssessmentFormVersion, FormPool, FormAssignment, StaffFormFavorite, iViewFlowsheet):
            db.query(model).filter(model.form_id == form_id).delete(synchronize_session=False)
        db.delete(form)
        db.commit()
        return

    if not form.deleted_at:
        form.deleted_at      = datetime.utcnow()
        form.deleted_by      = actor[0]
        form.deleted_by_name = actor[1]
        _form_audit(db, form, "deleted", actor)
        db.commit()
    return


@router.post("/assessment-forms/{form_id}/restore")
def restore_form(form_id: int, request: Request, db: Session = Depends(get_db)):
    """Restore a form from Trash."""
    form = db.query(AssessmentForm).filter(AssessmentForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    actor = _form_actor(request, db)
    form.deleted_at = None
    form.deleted_by = None
    form.deleted_by_name = None
    _form_audit(db, form, "restored", actor)
    db.commit()
    return {"id": form.id, "title": form.title, "status": form.status}


@router.get("/assessment-forms/{form_id}/audit")
def form_audit_trail(form_id: int, db: Session = Depends(get_db)):
    """Who created / edited / deleted / restored this form, and when."""
    rows = db.query(AssessmentFormAudit).filter(
        AssessmentFormAudit.form_id == form_id
    ).order_by(AssessmentFormAudit.created_at.desc(), AssessmentFormAudit.id.desc()).all()
    return {"audit": [{
        "action": r.action, "actor_name": r.actor_name, "actor_type": r.actor_type,
        "detail": r.detail, "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in rows]}


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
    current = Depends(get_current_staff),
):
    """
    Provider-facing: save or sign a filled form for a patient.

    Save-states (PowerForm parity):
      • ``is_draft=True``  → save-in-progress. Upserts a single draft row (one per
        form+patient+author), bumps ``updated_at``. Alerts and iView flowsheet rows
        are **previewed in the response but NOT persisted** — an unsigned draft must
        never fire clinical alerts or trend on the flowsheet.
      • ``is_draft=False`` → SIGN / finalize. Promotes the draft (or creates a fresh
        signed row), stamps ``submitted_at`` / ``charted_at`` / ``signed_at`` /
        ``signed_by``, then idempotently (re)writes FormAlert + iView rows.

    To resume/replace an existing draft, the client passes ``submission_id`` (or
    ``draft_id``). A row that is already signed is immutable here — it is never
    mutated (Phase 3 amendments handle changes to signed records); the request
    falls through to a new row instead.

    clinic_id / submitted_by / branch_id come from the authenticated staff
    (tenant isolation) — never trusted from the request body.
    """
    if not current:
        raise HTTPException(status_code=401, detail="Authentication required")
    form = db.query(AssessmentForm).filter(AssessmentForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    if form.status != "published":
        raise HTTPException(status_code=400, detail="Form is not published")

    form_data      = payload.get("form_data", {})
    patient_id     = payload.get("patient_id")
    is_draft       = bool(payload.get("is_draft", False))
    scoring_result = run_scoring(form_id, form.schema or {}, form_data, form.scoring_config)
    # Always evaluated so the client can preview what *would* fire; only persisted on sign.
    # Form-level rules (incl. composite CDS) + per-field rules authored in the builder.
    alerts_fired   = (evaluate_alerts(form.schema or {}, form_data, form.alert_rules)
                      + evaluate_field_alerts(form.schema or {}, form_data))
    now            = datetime.utcnow()

    # ── Resolve the upsert target: an existing *draft* the client is continuing. ──
    target_id = payload.get("submission_id") or payload.get("draft_id")
    sub = None
    if target_id:
        sub = (
            db.query(FormSubmission)
            .filter(
                FormSubmission.id        == target_id,
                FormSubmission.form_id   == form_id,
                FormSubmission.clinic_id == current.clinic_id,
            )
            .first()
        )
        # A signed record is immutable through this endpoint — start a new row instead.
        if sub is not None and not sub.is_draft:
            sub = None

    if sub is not None:
        # Update the in-progress draft in place.
        sub.data           = form_data
        sub.scores         = scoring_result or None
        sub.patient_id     = patient_id or sub.patient_id
        sub.encounter_id   = payload.get("encounter_id",   sub.encounter_id)
        sub.appointment_id = payload.get("appointment_id", sub.appointment_id)
        sub.admission_id   = payload.get("admission_id",   sub.admission_id)
        sub.updated_at     = now
    else:
        if not patient_id:
            raise HTTPException(status_code=400, detail="patient_id is required")
        sub = FormSubmission(
            form_id        = form_id,
            clinic_id      = current.clinic_id,
            branch_id      = current.branch_id,
            patient_id     = patient_id,
            encounter_id   = payload.get("encounter_id"),
            appointment_id = payload.get("appointment_id"),
            admission_id   = payload.get("admission_id"),
            submitted_by   = current.id,
            data           = form_data,
            scores         = scoring_result or None,
            source         = payload.get("source", "provider"),
            is_draft       = True,
            created_at     = now,
            updated_at     = now,
        )
        db.add(sub)
    db.flush()   # ensure sub.id
    if sub.root_id is None:
        sub.root_id = sub.id   # an original submission roots its own version chain

    if is_draft:
        # Save-in-progress: persist values only; never fire alerts / iView while unsigned.
        sub.is_draft     = True
        sub.alerts_fired = []
        db.commit()
        db.refresh(sub)
        return {
            "submission_id":   sub.id,
            "status":          "draft",
            "score_result":    scoring_result,
            "alerts_fired":    [],
            "alerts_preview":  alerts_fired,   # what would fire on sign (not persisted)
            "updated_at":      sub.updated_at.isoformat() if sub.updated_at else None,
        }

    # ── SIGN / finalize ──────────────────────────────────────────────────────
    sub.is_draft     = False
    sub.alerts_fired = alerts_fired or []
    sub.submitted_at = sub.submitted_at or now
    sub.charted_at   = sub.charted_at or now
    sub.signed_at    = now
    sub.signed_by    = current.id
    sub.updated_at   = now

    # Idempotent rewrite (a promoted draft has none; a re-sign would otherwise duplicate).
    db.query(FormAlert).filter(FormAlert.submission_id == sub.id).delete(synchronize_session=False)
    for a in alerts_fired:
        fid = a.get("field_id")
        db.add(FormAlert(
            submission_id = sub.id,
            clinic_id     = current.clinic_id,
            patient_id    = sub.patient_id,
            field_id      = fid,
            field_label   = a.get("field_label") or fid,
            value         = (str(form_data.get(fid)) if fid in (form_data or {}) else None),
            severity      = a.get("severity", "warning"),
            message       = a.get("message", ""),
        ))

    if form.is_iview_enabled:
        db.query(iViewObservation).filter(
            iViewObservation.submission_id == sub.id
        ).delete(synchronize_session=False)
        save_iview_row(db, sub, form)

    db.commit()
    db.refresh(sub)

    return {
        "submission_id":  sub.id,
        "status":         "submitted",
        "score_result":   scoring_result,
        "alerts_fired":   alerts_fired,
        "submitted_at":   sub.submitted_at.isoformat() if sub.submitted_at else None,
        "signed_at":      sub.signed_at.isoformat()    if sub.signed_at    else None,
    }


@router.get("/assessment-forms/{form_id}/draft")
def get_active_draft(
    form_id:      int,
    db:           Session        = Depends(get_db),
    current = Depends(get_current_staff),
    patient_id:   Optional[int]  = Query(None),
    encounter_id: Optional[str]  = Query(None),
    admission_id: Optional[int]  = Query(None),
):
    """
    Return the current author's most-recent *unsigned* draft for this form and
    patient (used to resume an interrupted charting session). ``{"draft": null}``
    when none exists. Tenant- and author-scoped — a draft belongs only to the
    staff member who started it.
    """
    if not current:
        raise HTTPException(status_code=401, detail="Authentication required")
    q = db.query(FormSubmission).filter(
        FormSubmission.form_id      == form_id,
        FormSubmission.clinic_id    == current.clinic_id,
        FormSubmission.submitted_by == current.id,
        FormSubmission.is_draft.is_(True),
    )
    if patient_id   is not None: q = q.filter(FormSubmission.patient_id   == patient_id)
    if encounter_id is not None: q = q.filter(FormSubmission.encounter_id == encounter_id)
    if admission_id is not None: q = q.filter(FormSubmission.admission_id == admission_id)
    row = q.order_by(FormSubmission.updated_at.desc(), FormSubmission.id.desc()).first()
    if not row:
        return {"draft": None}
    return {
        "draft": {
            "submission_id": row.id,
            "form_id":       row.form_id,
            "patient_id":    row.patient_id,
            "encounter_id":  row.encounter_id,
            "appointment_id":row.appointment_id,
            "admission_id":  row.admission_id,
            "form_data":     row.data or {},
            "score_result":  row.scores,
            "updated_at":    row.updated_at.isoformat() if row.updated_at else None,
        }
    }


@router.get("/assessment-forms/{form_id}/submissions")
def list_submissions(
    form_id:     int,
    db:          Session        = Depends(get_db),
    patient_id:  Optional[str]  = Query(None),
    encounter_id:Optional[str]  = Query(None),
    include_drafts: bool        = Query(False),
    include_history: bool       = Query(False),
    include_data: bool          = Query(False),
    limit:       int            = Query(50, ge=1, le=500),
    offset:      int            = Query(0, ge=0),
):
    """Finalized (signed) submissions for a form. Unsigned drafts are excluded by
    default so autosaved work-in-progress never pollutes the clinical history
    (``include_drafts=true`` to see them). Superseded (amended) and in-error
    (uncharted) versions are also hidden by default — only the latest *active*
    record per chain is returned; pass ``include_history=true`` for the full audit."""
    q = db.query(FormSubmission).filter(FormSubmission.form_id == form_id)
    if patient_id:   q = q.filter(FormSubmission.patient_id   == patient_id)
    if encounter_id: q = q.filter(FormSubmission.encounter_id == encounter_id)
    if not include_drafts:
        q = q.filter(FormSubmission.is_draft.is_(False))
    if not include_history:
        q = q.filter(FormSubmission.record_status == "active")
    total = q.count()
    rows  = q.order_by(FormSubmission.submitted_at.desc()).offset(offset).limit(limit).all()
    def _item(r):
        d = {
            "id":            r.id,
            "patient_id":    r.patient_id,
            "encounter_id":  r.encounter_id,
            "submitted_by":  r.submitted_by,
            "score_result":  r.scores,
            "status":        "draft" if r.is_draft else "submitted",
            "record_status": r.record_status or "active",
            "amends_id":     r.amends_id,
            "root_id":       r.root_id or r.id,
            "submitted_at":  r.submitted_at.isoformat() if r.submitted_at else None,
        }
        if include_data:
            d["form_data"] = r.data or {}
        return d
    return {"total": total, "items": [_item(r) for r in rows]}


def _comment_out(c: "FormSubmissionComment") -> dict:
    return {
        "id":          c.id,
        "field_id":    c.field_id,
        "author_id":   c.author_id,
        "author_name": c.author_name,
        "comment":     c.comment,
        "flag":        c.flag,
        "created_at":  c.created_at.isoformat() if c.created_at else None,
    }


@router.get("/submissions")
def list_patient_submissions(
    db:              Session       = Depends(get_db),
    current                        = Depends(get_current_staff),
    patient_id:      Optional[str] = Query(None),
    encounter_id:    Optional[str] = Query(None),
    date_from:       Optional[str] = Query(None),
    date_to:         Optional[str] = Query(None),
    include_drafts:  bool          = Query(False),
    limit:           int           = Query(100, ge=1, le=500),
    offset:          int           = Query(0, ge=0),
):
    """Signed (and optionally draft) submissions scoped to the caller's clinic.
    Pass include_drafts=true to also return the caller's in-progress drafts for
    the given encounter — used to show draft indicators in the chart panel."""
    if not current:
        raise HTTPException(status_code=401, detail="Authentication required")
    q = (
        db.query(FormSubmission, AssessmentForm.title.label("form_title"), AssessmentForm.category.label("form_category"))
        .outerjoin(AssessmentForm, AssessmentForm.id == FormSubmission.form_id)
        .filter(
            FormSubmission.record_status == "active",
            FormSubmission.clinic_id == current.clinic_id,
        )
    )
    if include_drafts:
        # Return both signed submissions AND this staff member's own drafts
        q = q.filter(
            (FormSubmission.is_draft.is_(False)) |
            ((FormSubmission.is_draft.is_(True)) & (FormSubmission.submitted_by == current.id))
        )
    else:
        q = q.filter(FormSubmission.is_draft.is_(False))
    if patient_id:
        q = q.filter(FormSubmission.patient_id == patient_id)
    if encounter_id:
        q = q.filter(FormSubmission.encounter_id == encounter_id)
    if date_from:
        try:
            q = q.filter(FormSubmission.submitted_at >= datetime.fromisoformat(date_from))
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid date_from format: {date_from}")
    if date_to:
        try:
            q = q.filter(FormSubmission.submitted_at <= datetime.fromisoformat(date_to))
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid date_to format: {date_to}")
    total = q.count()
    rows = q.order_by(FormSubmission.submitted_at.desc()).offset(offset).limit(limit).all()
    return {
        "total": total,
        "items": [
            {
                "id":            sub.id,
                "form_id":       sub.form_id,
                "form_title":    form_title or "Assessment Form",
                "form_category": form_category or "",
                "patient_id":    sub.patient_id,
                "encounter_id":  sub.encounter_id,
                "admission_id":  sub.admission_id,
                "submitted_by":  sub.submitted_by,
                "status":        "draft" if sub.is_draft else "submitted",
                "submitted_at":  sub.submitted_at.isoformat() if sub.submitted_at else None,
                "updated_at":    sub.updated_at.isoformat() if sub.updated_at else None,
            }
            for sub, form_title, form_category in rows
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
    comments = (
        db.query(FormSubmissionComment)
        .filter(FormSubmissionComment.submission_id == submission_id)
        .order_by(FormSubmissionComment.created_at.asc())
        .all()
    )
    form = db.query(AssessmentForm).filter(AssessmentForm.id == sub.form_id).first() if sub.form_id else None
    return {
        "id":            sub.id,
        "form_id":       sub.form_id,
        "form_title":    form.title if form else None,
        "form_category": form.category if form else None,
        "form_schema":   form.schema if form else None,
        "patient_id":    sub.patient_id,
        "encounter_id":  sub.encounter_id,
        "submitted_by":  sub.submitted_by,
        "form_data":     sub.data,
        "score_result":  sub.scores,
        "status":        "draft" if sub.is_draft else "submitted",
        "record_status": sub.record_status or "active",
        "amends_id":     sub.amends_id,
        "root_id":       sub.root_id or sub.id,
        "amend_reason":  sub.amend_reason,
        "amended_by":    sub.amended_by,
        "amended_at":    sub.amended_at.isoformat() if sub.amended_at else None,
        "signed_at":     sub.signed_at.isoformat() if sub.signed_at else None,
        "signed_by":     sub.signed_by,
        "cosigned_by":   sub.cosigned_by,
        "cosigned_at":   sub.cosigned_at.isoformat() if sub.cosigned_at else None,
        "submitted_at":  sub.submitted_at.isoformat() if sub.submitted_at else None,
        "comments":      [_comment_out(c) for c in comments],
        "alerts": [
            {
                "id":           a.id,
                "field_id":     a.field_id,
                "severity":     a.severity,
                "message":      a.message,
                "rule_type":    None,
                "triggered_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in alerts
        ],
    }


@router.patch("/submissions/{submission_id}/cosign")
def cosign_submission(
    submission_id: int,
    payload:       Dict[str, Any] = Body(...),
    db:            Session        = Depends(get_db),
    current = Depends(get_current_staff),
):
    """Co-sign a submission. Stamps the submission's own cosigned_by/cosigned_at
    columns (the FormCoSign table models a request/approve workflow with different
    columns, so we never construct it here)."""
    sub = db.query(FormSubmission).filter(FormSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    cosigner = payload.get("cosigned_by") or (current.id if current else None)
    sub.cosigned_by = cosigner
    sub.cosigned_at = datetime.utcnow()
    # An optional co-sign note is kept as a submission comment (additive, audited).
    note = payload.get("comment")
    if note:
        db.add(FormSubmissionComment(
            submission_id = submission_id,
            clinic_id     = sub.clinic_id,
            author_id     = cosigner,
            author_name   = getattr(current, "full_name", None) if current else None,
            comment       = note,
            flag          = "cosign",
        ))
    db.commit()
    return {"submission_id": submission_id, "cosigned_by": sub.cosigned_by,
            "cosigned_at": sub.cosigned_at.isoformat() if sub.cosigned_at else None}


# ---------------------------------------------------------------------------
# Amendments — modify / unchart (in-error) / comment / version history
# (PowerForm parity: a signed record is immutable; changes create lineage)
# ---------------------------------------------------------------------------

def _retire_clinical_side_effects(db: Session, submission_id: int) -> None:
    """Remove the flowsheet observations + fired alerts of a submission that is
    no longer the active truth (superseded by an amendment, or charted in error),
    so an erroneous/old value never trends on iView or shows as a live alert."""
    db.query(iViewObservation).filter(
        iViewObservation.submission_id == submission_id
    ).delete(synchronize_session=False)
    db.query(FormAlert).filter(
        FormAlert.submission_id == submission_id
    ).delete(synchronize_session=False)


@router.post("/submissions/{submission_id}/amend", status_code=201)
def amend_submission(
    submission_id: int,
    payload:  Dict[str, Any] = Body(...),
    db:       Session        = Depends(get_db),
    current = Depends(get_current_staff),
):
    """Modify a signed result. The original is immutable, so this creates a NEW
    signed version (record_status='active'), marks the original 'superseded', and
    links them via amends_id / shared root_id. Alerts + iView are re-evaluated for
    the new version; the superseded version's observations/alerts are retired."""
    if not current:
        raise HTTPException(status_code=401, detail="Authentication required")
    orig = db.query(FormSubmission).filter(FormSubmission.id == submission_id).first()
    if not orig:
        raise HTTPException(status_code=404, detail="Submission not found")
    if orig.clinic_id != current.clinic_id:
        raise HTTPException(status_code=403, detail="Cross-clinic amendment denied")
    if orig.is_draft:
        raise HTTPException(status_code=400, detail="Drafts are edited directly, not amended")
    if orig.record_status == "in_error":
        raise HTTPException(status_code=400, detail="A charted-in-error record cannot be amended")
    if orig.record_status == "superseded":
        raise HTTPException(status_code=400, detail="This version was already amended; amend the latest version")

    form = db.query(AssessmentForm).filter(AssessmentForm.id == orig.form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    form_data = payload.get("form_data", orig.data or {})
    reason    = (payload.get("reason") or "").strip()
    if not reason:
        raise HTTPException(status_code=400, detail="An amendment reason is required")

    now            = datetime.utcnow()
    scoring_result = run_scoring(form.id, form.schema or {}, form_data, form.scoring_config)
    alerts_fired   = (evaluate_alerts(form.schema or {}, form_data, form.alert_rules)
                      + evaluate_field_alerts(form.schema or {}, form_data))

    new = FormSubmission(
        form_id        = orig.form_id,
        form_version   = orig.form_version,
        clinic_id      = orig.clinic_id,
        branch_id      = orig.branch_id,
        patient_id     = orig.patient_id,
        appointment_id = orig.appointment_id,
        admission_id   = orig.admission_id,
        encounter_id   = orig.encounter_id,
        submitted_by   = current.id,
        data           = form_data,
        scores         = scoring_result or None,
        alerts_fired   = alerts_fired or [],
        is_draft       = False,
        source         = orig.source or "provider",
        submitted_at   = now,
        charted_at     = now,
        signed_at      = now,
        signed_by      = current.id,
        updated_at     = now,
        record_status  = "active",
        amends_id      = orig.id,
        root_id        = orig.root_id or orig.id,
        amend_reason   = reason,
        amended_by     = current.id,
        amended_at     = now,
    )
    db.add(new)
    db.flush()

    # The original is retired from the active view but kept for audit.
    orig.record_status = "superseded"
    orig.amended_by    = current.id
    orig.amended_at    = now
    if not orig.amend_reason:
        orig.amend_reason = reason
    _retire_clinical_side_effects(db, orig.id)

    # Re-fire alerts + iView for the new active version.
    for a in alerts_fired:
        fid = a.get("field_id")
        db.add(FormAlert(
            submission_id = new.id,
            clinic_id     = new.clinic_id,
            patient_id    = new.patient_id,
            field_id      = fid,
            field_label   = a.get("field_label") or fid,
            value         = (str(form_data.get(fid)) if fid in (form_data or {}) else None),
            severity      = a.get("severity", "warning"),
            message       = a.get("message", ""),
        ))
    if form.is_iview_enabled:
        save_iview_row(db, new, form)

    db.commit()
    db.refresh(new)
    return {
        "submission_id":   new.id,
        "amends_id":       orig.id,
        "root_id":         new.root_id,
        "record_status":   "active",
        "score_result":    scoring_result,
        "alerts_fired":    alerts_fired,
        "signed_at":       new.signed_at.isoformat() if new.signed_at else None,
    }


@router.post("/submissions/{submission_id}/in-error")
def mark_submission_in_error(
    submission_id: int,
    payload:  Dict[str, Any] = Body(...),
    db:       Session        = Depends(get_db),
    current = Depends(get_current_staff),
):
    """Unchart a signed result (chart-in-error). The row is kept for audit but
    marked 'in_error' with a reason, and its flowsheet observations + alerts are
    retired so it no longer trends or alerts. Never deletes clinical data."""
    if not current:
        raise HTTPException(status_code=401, detail="Authentication required")
    sub = db.query(FormSubmission).filter(FormSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    if sub.clinic_id != current.clinic_id:
        raise HTTPException(status_code=403, detail="Cross-clinic action denied")
    if sub.is_draft:
        raise HTTPException(status_code=400, detail="Delete the draft instead of uncharting it")
    reason = (payload.get("reason") or "").strip()
    if not reason:
        raise HTTPException(status_code=400, detail="A reason is required to chart in error")

    sub.record_status = "in_error"
    sub.amend_reason  = reason
    sub.amended_by    = current.id
    sub.amended_at    = datetime.utcnow()
    _retire_clinical_side_effects(db, sub.id)
    db.commit()
    return {"submission_id": sub.id, "record_status": "in_error",
            "amended_at": sub.amended_at.isoformat() if sub.amended_at else None}


@router.post("/submissions/{submission_id}/comment", status_code=201)
def add_submission_comment(
    submission_id: int,
    payload:  Dict[str, Any] = Body(...),
    db:       Session        = Depends(get_db),
    current = Depends(get_current_staff),
):
    """Annotate a submission with a comment / flag (additive — never mutates the
    underlying result). Optionally scoped to a single field via field_id."""
    if not current:
        raise HTTPException(status_code=401, detail="Authentication required")
    sub = db.query(FormSubmission).filter(FormSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    if sub.clinic_id != current.clinic_id:
        raise HTTPException(status_code=403, detail="Cross-clinic action denied")
    text = (payload.get("comment") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Comment text is required")
    c = FormSubmissionComment(
        submission_id = sub.id,
        clinic_id     = sub.clinic_id,
        field_id      = payload.get("field_id"),
        author_id     = current.id,
        author_name   = getattr(current, "full_name", None),
        comment       = text,
        flag          = payload.get("flag"),
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return _comment_out(c)


@router.get("/submissions/{submission_id}/history")
def submission_history(submission_id: int, db: Session = Depends(get_db)):
    """Full version lineage for a submission (every version in its chain, oldest
    first), each with its amendment metadata and comments — the audit trail."""
    sub = db.query(FormSubmission).filter(FormSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    root = sub.root_id or sub.id
    versions = (
        db.query(FormSubmission)
        .filter((FormSubmission.root_id == root) | (FormSubmission.id == root))
        .order_by(FormSubmission.created_at.asc(), FormSubmission.id.asc())
        .all()
    )
    sub_ids = [v.id for v in versions]
    comments = (
        db.query(FormSubmissionComment)
        .filter(FormSubmissionComment.submission_id.in_(sub_ids))
        .order_by(FormSubmissionComment.created_at.asc())
        .all()
    ) if sub_ids else []
    by_sub: Dict[int, list] = {}
    for c in comments:
        by_sub.setdefault(c.submission_id, []).append(_comment_out(c))
    return {
        "root_id": root,
        "versions": [
            {
                "id":            v.id,
                "record_status": v.record_status or "active",
                "amends_id":     v.amends_id,
                "submitted_by":  v.submitted_by,
                "signed_by":     v.signed_by,
                "amend_reason":  v.amend_reason,
                "amended_by":    v.amended_by,
                "amended_at":    v.amended_at.isoformat() if v.amended_at else None,
                "submitted_at":  v.submitted_at.isoformat() if v.submitted_at else None,
                "comments":      by_sub.get(v.id, []),
            }
            for v in versions
        ],
    }


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
    # FormPool is a join table (form_id -> assessment_forms); display fields
    # (title/description/category/icon/schema) live on the AssessmentForm.
    query = db.query(FormPool, AssessmentForm).join(
        AssessmentForm, AssessmentForm.id == FormPool.form_id
    ).filter(FormPool.is_active == True)
    if category: query = query.filter(AssessmentForm.category == category)
    if q:
        like = f"%{q}%"
        query = query.filter(
            AssessmentForm.title.ilike(like) | AssessmentForm.description.ilike(like)
        )
    total = query.count()
    rows = query.order_by(AssessmentForm.title).offset(offset).limit(limit).all()
    return {
        "total":  total,
        "offset": offset,
        "limit":  limit,
        "items": [
            {
                "id":          pool.id,
                "form_id":     form.id,
                "title":       form.title,
                "description": form.description,
                "category":    form.category,
                "icon":        form.icon,
                "schema":      form.schema,
            }
            for pool, form in rows
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
    # FormPool only references a form_id; the real definition is the AssessmentForm.
    src = db.query(AssessmentForm).filter(AssessmentForm.id == template.form_id).first()
    if not src:
        raise HTTPException(status_code=404, detail="Pool source form not found")

    form = AssessmentForm(
        title            = payload.get("title",       src.title),
        description      = payload.get("description", src.description),
        category         = payload.get("category",    src.category),
        status           = "draft",
        schema           = src.schema,
        scoring_config   = src.scoring_config,
        alert_rules      = src.alert_rules,
        is_template      = False,
        is_iview_enabled = bool(src.is_iview_enabled),
        iview_config     = src.iview_config,
        icon             = payload.get("icon",        src.icon),
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
    q = db.query(iViewObservation).filter(iViewObservation.patient_id == patient_id)
    if encounter_id: q = q.filter(iViewObservation.encounter_id == encounter_id)
    if form_id:      q = q.filter(iViewObservation.form_id       == form_id)
    rows = q.order_by(iViewObservation.recorded_at.desc()).limit(limit).all()
    return [
        {
            "id":            r.id,
            "form_id":       r.form_id,
            "submission_id": r.submission_id,
            "field_id":      r.field_id,
            "label":         r.label,
            "value_text":    r.value_text,
            "value_numeric": float(r.value_numeric) if r.value_numeric is not None else None,
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
