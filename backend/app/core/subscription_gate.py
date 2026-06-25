"""Subscription / entitlement enforcement gate (Phase 1).

A pure-ASGI middleware (mirrors SecurityHeadersMiddleware) that maps each API
path to the app-module it belongs to and blocks the request when the caller's
health center isn't entitled — either because the subscription has lapsed
(expired / suspended) or because the plan doesn't include that module
(e.g. a provider-only plan calling ``/pharmacy/*``). Enforcement is clinic-level:
one active subscription unlocks the whole health center per its plan.

SAFETY (this is deliberately conservative):
  * Controlled by ``settings.SUBSCRIPTION_ENFORCEMENT``:
      "off"  (default) → no-op, zero overhead.
      "soft"           → never blocks; logs what it *would* block (observe first).
      "hard"           → returns 402 for blocked requests, with CORS headers so
                         the browser sees the 402 (not a CORS error).
  * Fails OPEN: any error → the request passes through untouched.
  * Only staff bearer tokens are inspected; patient / platform-admin / device
    traffic is ignored.
  * A generous allowlist keeps auth, billing self-service, support, platform,
    public and patient traffic always reachable so a lapsed clinic can pay.
"""
import json
import logging

from starlette.types import ASGIApp, Scope, Receive, Send

from app.core.config import settings
from app.core.security import decode_token
from app.db.session import SessionLocal
from app.models.models import Staff, Clinic
from app.services.entitlements import get_entitlements

log = logging.getLogger("subscription_gate")

# First path segment under /api/v1 that is NEVER gated.
_ALLOWLIST = {
    "auth", "otp", "public", "platform", "portal", "payments", "support",
    "bridge", "pdf", "chat", "maintenance", "terminology", "telehealth",
}

# Always-open full prefixes (self-service billing must stay reachable when lapsed).
_OPEN_PREFIXES = ("/api/v1/clinic/subscription",)

# First segment → modules that satisfy it; allowed if ANY is entitled. Anything
# not listed (patients, encounters, billing, forms, …) is treated as shared core:
# allowed whenever the subscription is active, blocked only when it has lapsed.
_MODULE_MAP = {
    "pharmacy": ("pharmacy",),
    "lab": ("lab",), "lab-orders": ("lab",),
    "imaging": ("imaging",), "imaging-orders": ("imaging",),
    "inpatient": ("carechart",), "carechart": ("carechart",),
    "assessment-forms": ("carechart",), "submissions": ("carechart",),
    "form-pool": ("carechart",), "iview": ("carechart",),
    "doctor": ("provider",), "provider": ("provider",), "referrals": ("provider",),
    "clinic": ("reception",),
    "scheduler": ("reception", "provider"),
    "appointments": ("reception", "provider"),
}


def _segment(path: str) -> str:
    parts = path.split("/", 4)          # ['', 'api', 'v1', '<seg>', 'rest…']
    return parts[3] if len(parts) > 3 else ""


def _header(scope, name: bytes) -> str:
    for k, v in scope.get("headers", []):
        if k == name:
            return v.decode("latin-1")
    return ""


def _bearer(scope) -> str:
    val = _header(scope, b"authorization")
    return val[7:] if val.lower().startswith("bearer ") else val


def _evaluate(token: str, seg: str):
    """Return (blocked, reason, info). Fails open (passes) on any error."""
    db = SessionLocal()
    try:
        payload = decode_token(token)
        if not payload or payload.get("user_type") != "staff":
            return False, None, None
        sid = payload.get("sub")
        if not sid:
            return False, None, None
        staff = db.query(Staff).filter(Staff.id == int(sid)).first()
        if not staff or not staff.clinic_id:
            return False, None, None
        clinic = db.query(Clinic).filter(Clinic.id == staff.clinic_id).first()
        if not clinic:
            return False, None, None

        ent = get_entitlements(db, clinic)
        status = ent.get("status")
        modules = ent.get("modules", {})
        info = {"status": status, "plan_key": ent.get("plan_key"), "expires_at": ent.get("expires_at")}

        if status in ("expired", "suspended"):
            return True, f"subscription_{status}", info

        required = _MODULE_MAP.get(seg)
        if required and not any(modules.get(m) for m in required):
            info["required"] = list(required)
            return True, "module_not_in_plan", info
        return False, None, info
    except Exception:
        log.exception("subscription_gate: failing open")
        return False, None, None
    finally:
        db.close()


class SubscriptionGateMiddleware:
    """See module docstring. Pure ASGI; off by default."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        mode = (settings.SUBSCRIPTION_ENFORCEMENT or "off").lower()
        if scope["type"] != "http" or mode == "off":
            return await self.app(scope, receive, send)

        path = scope.get("path", "")
        method = scope.get("method", "GET")
        if method == "OPTIONS" or not path.startswith("/api/v1/"):
            return await self.app(scope, receive, send)
        if any(path.startswith(p) for p in _OPEN_PREFIXES):
            return await self.app(scope, receive, send)

        # /clinic/billing is clinical billing (shared core), not the reception app.
        seg = "billing" if path.startswith("/api/v1/clinic/billing") else _segment(path)
        if seg in _ALLOWLIST:
            return await self.app(scope, receive, send)

        token = _bearer(scope)
        if not token:
            return await self.app(scope, receive, send)

        blocked, reason, info = _evaluate(token, seg)
        if not blocked:
            return await self.app(scope, receive, send)

        if mode == "soft":
            log.warning("subscription_gate(soft) would block %s — %s (%s)", path, reason, info)
            return await self.app(scope, receive, send)

        # hard → short-circuit with a CORS-safe 402
        body = json.dumps({
            "detail": "Your health center's subscription does not cover this. "
                      "Renew or upgrade to continue.",
            "error": "subscription_required",
            "reason": reason,
            "status": (info or {}).get("status"),
            "plan_key": (info or {}).get("plan_key"),
        }).encode()
        origin = _header(scope, b"origin")
        headers = [
            (b"content-type", b"application/json"),
            (b"content-length", str(len(body)).encode()),
            (b"x-subscription-block", (reason or "").encode()),
        ]
        if origin:
            headers += [
                (b"access-control-allow-origin", origin.encode("latin-1")),
                (b"access-control-allow-credentials", b"true"),
                (b"vary", b"Origin"),
            ]
        await send({"type": "http.response.start", "status": 402, "headers": headers})
        await send({"type": "http.response.body", "body": body})
