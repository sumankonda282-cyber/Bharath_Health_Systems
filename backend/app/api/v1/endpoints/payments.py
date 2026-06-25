"""Subscription payments — online checkout (Razorpay) + bank transfer.

Self-service for clinics (admin / manager / doctor can pay). Amounts are always
computed server-side from the plan; the client never dictates the price. Degrades
gracefully when Razorpay isn't configured: the order endpoint returns a
bank-transfer fallback instead of a gateway order.

This router is allowlisted by the subscription gate, so a lapsed clinic can
always reach it to pay its way back in.
"""
import json
from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.config import settings
from app.core.security import get_current_staff
from app.models.models import Clinic, Plan, Staff, SubscriptionInvoice, WebhookEvent, ClinicSubscription
from app.services import razorpay_service
from app.services.subscription import compute_price, activate_paid
from app.services.entitlements import get_entitlements
from app.services.dunning import notify_receipt

router = APIRouter(prefix="/payments", tags=["payments"])

_BILLING_ROLES = ("clinic_admin", "clinic_manager", "doctor")


def _require_billing_actor(current=Depends(get_current_staff)):
    role = (getattr(current, "role", "") or "").lower()
    if role not in _BILLING_ROLES:
        raise HTTPException(403, "Only a clinic admin, manager, or doctor can manage billing.")
    return current


def _plan_or_404(db, plan_key):
    plan = db.query(Plan).filter(Plan.key == (plan_key or "").strip().lower()).first()
    if not plan or not plan.is_active:
        raise HTTPException(404, "Plan not found or not available")
    return plan


def _active_doctor_count(db, clinic_id) -> int:
    return db.query(Staff).filter(
        Staff.clinic_id == clinic_id, Staff.role == "doctor", Staff.is_active == True  # noqa: E712
    ).count()


def _resolve_seats(db, clinic_id, seats):
    return _active_doctor_count(db, clinic_id) if seats is None else max(0, int(seats))


def _invoice_out(i):
    return {
        "id": i.id, "clinic_id": i.clinic_id, "plan_key": i.plan_key,
        "billing_cycle": i.billing_cycle, "seats": i.seats,
        "amount": float(i.amount or 0), "currency": i.currency,
        "status": i.status, "method": i.method, "reference": i.reference,
        "period_from": str(i.period_from) if i.period_from else None,
        "period_to": str(i.period_to) if i.period_to else None,
        "paid_at": str(i.paid_at) if i.paid_at else None,
        "created_at": str(i.created_at) if i.created_at else None,
    }


def _plan_public(p):
    return {
        "key": p.key, "name": p.name, "description": p.description, "color": p.color,
        "currency": p.currency,
        "monthly_price": float(p.monthly_price or 0), "annual_price": float(p.annual_price or 0),
        "monthly_price_per_seat": float(p.monthly_price_per_seat or 0),
        "annual_price_per_seat": float(p.annual_price_per_seat or 0),
        "modules": p.modules or {}, "limits": p.limits or {}, "features": p.features or [],
    }


@router.get("/config")
def payment_config(current=Depends(_require_billing_actor)):
    """What the checkout UI needs to know."""
    return {
        "gateway": "razorpay",
        "online_enabled": razorpay_service.is_configured(),
        "key_id": settings.RAZORPAY_KEY_ID or None,
        "methods": ["razorpay", "bank_transfer"] if razorpay_service.is_configured() else ["bank_transfer"],
    }


@router.get("/plans")
def available_plans(db: Session = Depends(get_db), current=Depends(_require_billing_actor)):
    """Plans a clinic can choose from (public + active)."""
    rows = db.query(Plan).filter(Plan.is_active == True, Plan.is_public == True)\
        .order_by(Plan.sort_order, Plan.id).all()  # noqa: E712
    return [_plan_public(p) for p in rows]


@router.get("/subscription/me")
def my_subscription(db: Session = Depends(get_db), current=Depends(_require_billing_actor)):
    """The caller's clinic: current plan, status, usage, billing contact."""
    clinic = db.query(Clinic).filter(Clinic.id == current.clinic_id).first()
    if not clinic:
        raise HTTPException(404, "Clinic not found")
    sub = db.query(ClinicSubscription).filter(ClinicSubscription.clinic_id == clinic.id).first()
    return {
        "clinic_name": clinic.name,
        "billing_email": clinic.billing_email or clinic.email,
        "active_doctors": _active_doctor_count(db, clinic.id),
        "entitlements": get_entitlements(db, clinic),
        "subscription": None if not sub else {
            "plan_key": sub.plan_key, "status": sub.status, "billing_cycle": sub.billing_cycle,
            "seats": sub.seats, "price_snapshot": float(sub.price_snapshot or 0),
            "current_period_end": str(sub.current_period_end) if sub.current_period_end else None,
            "is_waived": bool(sub.is_waived), "auto_renew": bool(sub.auto_renew),
        },
    }


@router.post("/subscription/quote")
def quote(body: dict, db: Session = Depends(get_db), current=Depends(_require_billing_actor)):
    plan = _plan_or_404(db, body.get("plan_key"))
    cycle = "annual" if body.get("billing_cycle") == "annual" else "monthly"
    seats = _resolve_seats(db, current.clinic_id, body.get("seats"))
    amount = compute_price(plan, cycle, seats)
    return {"plan_key": plan.key, "billing_cycle": cycle, "seats": seats,
            "amount": float(amount), "currency": plan.currency}


@router.post("/subscription/order")
async def create_subscription_order(body: dict, db: Session = Depends(get_db),
                                    current=Depends(_require_billing_actor)):
    clinic = db.query(Clinic).filter(Clinic.id == current.clinic_id).first()
    if not clinic:
        raise HTTPException(404, "Clinic not found")
    plan = _plan_or_404(db, body.get("plan_key"))
    cycle = "annual" if body.get("billing_cycle") == "annual" else "monthly"
    seats = _resolve_seats(db, clinic.id, body.get("seats"))
    amount = compute_price(plan, cycle, seats)

    inv = SubscriptionInvoice(
        clinic_id=clinic.id, plan_id=plan.id, plan_key=plan.key,
        billing_cycle=cycle, seats=seats, amount=amount, currency=plan.currency,
        status="pending", method="razorpay", period_from=date.today(), created_by=current.id,
    )
    db.add(inv)
    db.flush()

    if razorpay_service.is_configured() and amount > 0:
        order = await razorpay_service.create_order(
            int(amount * 100), receipt=f"subinv_{inv.id}",
            notes={"clinic_id": str(clinic.id), "plan": plan.key, "invoice_id": str(inv.id)},
        )
        if not order:
            db.rollback()
            raise HTTPException(502, "Could not start online payment. Please use bank transfer.")
        inv.gateway_order_id = order.get("id")
        db.commit()
        return {
            "invoice_id": inv.id, "online_enabled": True,
            "order_id": order.get("id"), "amount": float(amount),
            "amount_paise": int(amount * 100), "currency": plan.currency,
            "key_id": settings.RAZORPAY_KEY_ID,
            "prefill": {"name": clinic.name, "email": clinic.billing_email or clinic.email or ""},
        }

    # Razorpay not configured → bank-transfer fallback.
    inv.method = None
    db.commit()
    return {
        "invoice_id": inv.id, "online_enabled": False, "amount": float(amount),
        "currency": plan.currency, "bank_transfer": True,
        "message": "Online payment isn't enabled yet. Pay by bank transfer and submit the reference.",
    }


@router.post("/subscription/verify")
def verify_subscription_payment(body: dict, db: Session = Depends(get_db),
                                current=Depends(_require_billing_actor)):
    inv = db.query(SubscriptionInvoice).filter(
        SubscriptionInvoice.id == body.get("invoice_id"),
        SubscriptionInvoice.clinic_id == current.clinic_id,
    ).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    if inv.status == "paid":
        clinic0 = db.query(Clinic).filter(Clinic.id == inv.clinic_id).first()
        return {"status": "paid", "message": "Already paid", "entitlements": get_entitlements(db, clinic0)}

    if not razorpay_service.verify_payment_signature(
        body.get("razorpay_order_id"), body.get("razorpay_payment_id"), body.get("razorpay_signature")
    ):
        raise HTTPException(400, "Payment verification failed")

    clinic = db.query(Clinic).filter(Clinic.id == inv.clinic_id).first()
    plan = db.query(Plan).filter(Plan.id == inv.plan_id).first() or _plan_or_404(db, inv.plan_key)
    inv.gateway_payment_id = body.get("razorpay_payment_id")
    inv.status = "paid"
    inv.paid_at = datetime.utcnow()
    period_end = activate_paid(db, clinic, plan, cycle=inv.billing_cycle, seats=inv.seats,
                               amount=inv.amount, method="razorpay", reference=inv.gateway_payment_id,
                               period_from=inv.period_from)
    inv.period_to = period_end
    db.commit()
    try:
        notify_receipt(db, clinic, inv)
    except Exception:
        pass
    return {"status": "paid", "entitlements": get_entitlements(db, clinic)}


@router.post("/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    """Authoritative payment confirmation from Razorpay (signature-verified,
    idempotent). No auth dependency — Razorpay calls it directly."""
    raw = await request.body()
    sig = request.headers.get("x-razorpay-signature", "")
    if not razorpay_service.verify_webhook_signature(raw, sig):
        raise HTTPException(400, "Invalid signature")
    try:
        event = json.loads(raw.decode())
    except Exception:
        raise HTTPException(400, "Invalid payload")

    evt_id = event.get("id") or request.headers.get("x-razorpay-event-id")
    if evt_id and db.query(WebhookEvent).filter(WebhookEvent.event_id == evt_id).first():
        return {"ok": True, "duplicate": True}

    we = WebhookEvent(provider="razorpay", event_id=evt_id,
                      event_type=event.get("event"), payload=event)
    db.add(we)

    handled = False
    receipt_ctx = None
    if event.get("event") in ("payment.captured", "order.paid"):
        payload = event.get("payload") or {}
        pay_entity = ((payload.get("payment") or {}).get("entity")) or {}
        order_entity = ((payload.get("order") or {}).get("entity")) or {}
        order_id = pay_entity.get("order_id") or order_entity.get("id")
        pay_id = pay_entity.get("id")
        if order_id:
            inv = db.query(SubscriptionInvoice).filter(
                SubscriptionInvoice.gateway_order_id == order_id).first()
            if inv and inv.status != "paid":
                clinic = db.query(Clinic).filter(Clinic.id == inv.clinic_id).first()
                plan = db.query(Plan).filter(Plan.id == inv.plan_id).first() or \
                    db.query(Plan).filter(Plan.key == inv.plan_key).first()
                if clinic and plan:
                    inv.gateway_payment_id = pay_id
                    inv.status = "paid"
                    inv.paid_at = datetime.utcnow()
                    inv.period_to = activate_paid(
                        db, clinic, plan, cycle=inv.billing_cycle, seats=inv.seats,
                        amount=inv.amount, method="razorpay", reference=pay_id,
                        period_from=inv.period_from)
                    handled = True
                    receipt_ctx = (clinic, inv)
    we.processed = handled
    db.commit()
    if receipt_ctx:
        try:
            notify_receipt(db, *receipt_ctx)
        except Exception:
            pass
    return {"ok": True, "handled": handled}


@router.post("/subscription/bank-transfer")
def submit_bank_transfer(body: dict, db: Session = Depends(get_db),
                         current=Depends(_require_billing_actor)):
    """Clinic submits a UPI/NEFT/IMPS reference; access activates once the
    platform confirms the transfer (POST /platform/invoices/{id}/confirm)."""
    clinic = db.query(Clinic).filter(Clinic.id == current.clinic_id).first()
    if not clinic:
        raise HTTPException(404, "Clinic not found")
    if not body.get("reference"):
        raise HTTPException(400, "A payment reference is required")

    inv_id = body.get("invoice_id")
    if inv_id:
        inv = db.query(SubscriptionInvoice).filter(
            SubscriptionInvoice.id == inv_id, SubscriptionInvoice.clinic_id == clinic.id).first()
        if not inv:
            raise HTTPException(404, "Invoice not found")
    else:
        plan = _plan_or_404(db, body.get("plan_key"))
        cycle = "annual" if body.get("billing_cycle") == "annual" else "monthly"
        seats = _resolve_seats(db, clinic.id, body.get("seats"))
        inv = SubscriptionInvoice(
            clinic_id=clinic.id, plan_id=plan.id, plan_key=plan.key, billing_cycle=cycle,
            seats=seats, amount=compute_price(plan, cycle, seats), currency=plan.currency,
            period_from=date.today(), created_by=current.id,
        )
        db.add(inv)
        db.flush()

    inv.method = "bank_transfer"
    inv.reference = body.get("reference")
    inv.notes = body.get("notes")
    inv.status = "pending_verification"
    db.commit()
    return {"invoice_id": inv.id, "status": "pending_verification",
            "message": "Reference submitted. Access activates once the platform confirms the transfer."}


@router.get("/subscription/invoices")
def my_invoices(db: Session = Depends(get_db), current=Depends(_require_billing_actor)):
    rows = db.query(SubscriptionInvoice).filter(
        SubscriptionInvoice.clinic_id == current.clinic_id
    ).order_by(SubscriptionInvoice.created_at.desc()).limit(50).all()
    return [_invoice_out(i) for i in rows]


@router.post("/cron/dunning")
def cron_dunning(x_cron_key: str = Header(None), db: Session = Depends(get_db)):
    """Render Cron entry point for the daily dunning pass. Auth = X-Cron-Key
    header matching CRON_SECRET (no user login). Allowlisted by the gate."""
    if not settings.CRON_SECRET or x_cron_key != settings.CRON_SECRET:
        raise HTTPException(403, "Invalid cron key")
    from app.services.dunning import run_dunning
    return run_dunning(db)
