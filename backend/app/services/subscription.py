"""Subscription mutation helpers — the single place that writes a clinic's
subscription, freezes its entitlement snapshot, syncs the legacy clinic columns,
and records payments. Shared by the platform admin tools and the self-service
payment flow so there is exactly one source of truth.
"""
import calendar
from datetime import date, datetime, timedelta
from decimal import Decimal

from app.models.models import ClinicSubscription, SubscriptionPayment
from app.services.entitlements import snapshot_entitlements, sync_clinic_flags


def add_months(d: date, months: int) -> date:
    """Calendar-correct month addition (clamps day to month length)."""
    m = d.month - 1 + months
    year = d.year + m // 12
    month = m % 12 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def compute_price(plan, cycle: str, seats: int) -> Decimal:
    """Server-side price = base + per-seat × seats, for the chosen cycle."""
    seats = max(0, int(seats or 0))
    if cycle == "annual":
        base, per = (plan.annual_price or 0), (plan.annual_price_per_seat or 0)
    else:
        base, per = (plan.monthly_price or 0), (plan.monthly_price_per_seat or 0)
    return Decimal(str(base)) + Decimal(str(per)) * seats


def upsert_subscription(db, clinic, plan, *, status, cycle="monthly", seats=0,
                        period_end=None, price=None, waived=False,
                        waived_reason=None, waived_by=None, waived_until=None):
    """Write/refresh the clinic's single subscription row with a frozen
    entitlement snapshot, and sync the legacy clinic columns + has_* flags."""
    sub = db.query(ClinicSubscription).filter(ClinicSubscription.clinic_id == clinic.id).first()
    if not sub:
        sub = ClinicSubscription(clinic_id=clinic.id)
        db.add(sub)
    snap = snapshot_entitlements(plan)
    sub.plan_id = plan.id
    sub.plan_key = plan.key
    sub.status = status
    sub.billing_cycle = cycle
    sub.seats = seats or 0
    sub.entitlements_snapshot = snap
    if price is not None:
        sub.price_snapshot = Decimal(str(price))
    sub.current_period_start = date.today()
    sub.current_period_end = period_end
    sub.is_waived = waived
    sub.waived_reason = waived_reason
    sub.waived_by = waived_by
    sub.waived_until = waived_until

    clinic.subscription_plan = plan.key
    clinic.subscription_status = "active" if status in ("active", "comped", "grace") else status
    eff_end = period_end or waived_until
    if eff_end:
        clinic.subscription_expires_at = datetime.combine(eff_end, datetime.min.time())
    sync_clinic_flags(clinic, snap["modules"])
    return sub


def activate_paid(db, clinic, plan, *, cycle, seats, amount, method, reference=None, period_from=None):
    """Mark a clinic active after a confirmed payment. Stacks onto any remaining
    period so renewing early never loses days. Records a SubscriptionPayment and
    returns the new period_end."""
    today = date.today()
    sub = db.query(ClinicSubscription).filter(ClinicSubscription.clinic_id == clinic.id).first()
    base = today
    if sub and sub.current_period_end and sub.current_period_end > today:
        base = sub.current_period_end
    period_end = add_months(base, 12 if cycle == "annual" else 1)

    upsert_subscription(db, clinic, plan, status="active", cycle=cycle, seats=seats,
                        period_end=period_end, price=amount)

    db.add(SubscriptionPayment(
        clinic_id=clinic.id,
        amount=Decimal(str(amount)),
        method=(method or "razorpay")[:20],
        reference=reference,
        period_from=period_from or today,
        period_to=period_end,
        notes="Subscription payment",
    ))
    return period_end
