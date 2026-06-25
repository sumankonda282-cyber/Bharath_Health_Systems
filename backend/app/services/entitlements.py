"""Resolve a health center's effective subscription entitlements.

Single source of truth for "what can this clinic access right now":
  - modules  → which apps/portals are unlocked (provider, reception, pharmacy, …)
  - limits   → numeric caps (max_doctors, …)
  - status   → active | grace | expired | suspended | comped

Resolution order: ClinicSubscription snapshot → live Plan (by key) → safe default,
then per-clinic ``entitlement_overrides`` merged on top. The snapshot is what makes
plan edits safe (grandfathering): changing a Plan never silently re-scopes or
re-prices an existing subscriber.

This module only READS — it never enforces. Enforcement (Phase 1) consumes
``get_entitlements`` and decides whether to block.
"""
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.models import Clinic, Plan, ClinicSubscription

# Canonical app/module catalog. ``clinic_flag`` mirrors the legacy Clinic.has_*
# column so plan assignment can keep those in sync for backward compatibility.
MODULE_CATALOG = {
    "provider":   {"label": "Provider / Doctor",     "clinic_flag": None},
    "reception":  {"label": "Reception / Front Desk", "clinic_flag": None},
    "pharmacy":   {"label": "Pharmacy",               "clinic_flag": "has_pharmacy"},
    "lab":        {"label": "Laboratory",             "clinic_flag": "has_lab"},
    "imaging":    {"label": "Imaging / Radiology",    "clinic_flag": "has_imaging"},
    "carechart":  {"label": "Inpatient / CareChart",  "clinic_flag": "has_inpatient"},
    "telehealth": {"label": "Telehealth",             "clinic_flag": "has_telehealth"},
}
ALL_MODULES = list(MODULE_CATALOG.keys())

# Which module unlocks each staff-facing portal (used by Phase 1 gating).
PORTAL_MODULE = {
    "provider":  "provider",
    "staff":     "reception",
    "carechart": "carechart",
    "pharmacy":  "pharmacy",
    "lab":       "lab",
    "imaging":   "imaging",
}

DEFAULT_GRACE_DAYS = 7

# Statuses that still permit normal use of unlocked apps.
ACTIVE_STATUSES = ("active", "comped", "grace")


def _as_date(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    return value


def _merge_overrides(modules: dict, overrides) -> dict:
    """Apply per-clinic module overrides ({"modules": {"lab": true}})."""
    if isinstance(overrides, dict) and isinstance(overrides.get("modules"), dict):
        out = dict(modules)
        for k, v in overrides["modules"].items():
            out[k] = bool(v)
        return out
    return modules


def _resolve_status(clinic: Clinic, sub):
    """Return (status, expires_date, in_grace, is_waived)."""
    today = date.today()
    waived = bool(sub.is_waived) if sub else False

    # Explicit suspension/revocation wins over everything.
    if (clinic.status or "").lower() in ("suspended", "revoked"):
        return "suspended", None, False, waived

    # Comped (manual waiver / free trial substitute).
    if sub and sub.status == "comped":
        wu = _as_date(sub.waived_until)
        if wu and wu < today:
            return "expired", wu, False, waived
        return "comped", wu, False, True

    # Expiry from subscription period, else legacy clinic column.
    expires = _as_date(sub.current_period_end) if sub and sub.current_period_end else None
    if not expires and clinic.subscription_expires_at:
        expires = _as_date(clinic.subscription_expires_at)
    grace_until = _as_date(sub.grace_until) if sub and sub.grace_until else None

    if expires:
        if today <= expires:
            return "active", expires, False, waived
        # Grace: explicit grace_until, else the configured default window.
        grace_end = grace_until or (expires + timedelta(days=getattr(settings, "SUBSCRIPTION_GRACE_DAYS", 7) or 7))
        if today <= grace_end:
            return "grace", expires, True, waived
        return "expired", expires, False, waived

    # No expiry set → treat as active (free / legacy clinics).
    return "active", None, False, waived


def get_entitlements(db: Session, clinic: Clinic) -> dict:
    """Effective entitlements + live status for a clinic.

    Returns::

        {
          "plan_key": str | None,
          "status": "active|grace|expired|suspended|comped",
          "active": bool,            # convenience: status in ACTIVE_STATUSES
          "in_grace": bool,
          "is_waived": bool,
          "expires_at": "YYYY-MM-DD" | None,
          "modules": {name: bool, …},
          "limits": {…},
        }

    Fails OPEN on any unexpected error so a resolver bug can never lock a clinic
    out — enforcement layers are expected to honor that.
    """
    try:
        sub = (
            db.query(ClinicSubscription)
            .filter(ClinicSubscription.clinic_id == clinic.id)
            .first()
        )

        modules, limits, plan_key = {}, {}, None
        if sub and isinstance(sub.entitlements_snapshot, dict):
            snap = sub.entitlements_snapshot
            modules = dict(snap.get("modules") or {})
            limits = dict(snap.get("limits") or {})
            plan_key = sub.plan_key
        else:
            plan_key = (sub.plan_key if sub and sub.plan_key else clinic.subscription_plan) or "free"
            plan = db.query(Plan).filter(Plan.key == plan_key).first()
            if plan:
                modules = {k: bool(v) for k, v in (plan.modules or {}).items()}
                limits = dict(plan.limits or {})

        # Normalize to the full known module set, then apply per-clinic overrides.
        modules = {m: bool(modules.get(m, False)) for m in ALL_MODULES}
        modules = _merge_overrides(modules, clinic.entitlement_overrides)

        status, expires, in_grace, waived = _resolve_status(clinic, sub)

        return {
            "plan_key": plan_key,
            "status": status,
            "active": status in ACTIVE_STATUSES,
            "in_grace": in_grace,
            "is_waived": waived,
            "expires_at": expires.isoformat() if expires else None,
            "modules": modules,
            "limits": limits,
        }
    except Exception:
        # Fail open — never lock anyone out on a bug.
        return {
            "plan_key": getattr(clinic, "subscription_plan", None),
            "status": "active",
            "active": True,
            "in_grace": False,
            "is_waived": False,
            "expires_at": None,
            "modules": {m: True for m in ALL_MODULES},
            "limits": {},
        }


def snapshot_entitlements(plan: Plan) -> dict:
    """Freeze a plan's modules+limits for storing on a subscription."""
    modules = {m: bool((plan.modules or {}).get(m, False)) for m in ALL_MODULES}
    return {"modules": modules, "limits": dict(plan.limits or {})}


def sync_clinic_flags(clinic: Clinic, modules: dict) -> None:
    """Mirror entitlement modules onto the legacy Clinic.has_* columns."""
    for name, meta in MODULE_CATALOG.items():
        flag = meta.get("clinic_flag")
        if flag:
            setattr(clinic, flag, bool(modules.get(name, False)))
