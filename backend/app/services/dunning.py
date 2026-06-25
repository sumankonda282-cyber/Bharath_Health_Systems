"""Subscription dunning: renewal reminders, lapse -> grace -> suspend notices,
and payment receipts. Sync, pure functions over a DB session; idempotent via the
notification log, so it's safe to run repeatedly. Trigger via
POST /platform/dunning/run (admin) or POST /payments/cron/dunning (X-Cron-Key).
"""
import logging
from datetime import date, timedelta

from app.core.config import settings
from app.models.models import Clinic, ClinicSubscription
from app.services.notifications import notify, email_shell

log = logging.getLogger("dunning")


def _renewal_html(clinic, sub, days):
    return email_shell(
        f"Your subscription renews in {days} day(s)",
        f"<p>Hi {clinic.name},</p><p>Your <b>{sub.plan_key}</b> plan ({sub.billing_cycle}) "
        f"is due on <b>{sub.current_period_end}</b>. Renew from your portal to avoid any "
        f"interruption.</p>")


def _grace_html(clinic, sub, grace_end):
    return email_shell(
        "Action needed — your subscription has expired",
        f"<p>Hi {clinic.name},</p><p>Your <b>{sub.plan_key}</b> plan expired on "
        f"<b>{sub.current_period_end}</b>. You have until <b>{grace_end}</b> to renew before "
        f"access is restricted. Pay now to keep everything running.</p>")


def _suspended_html(clinic, sub):
    return email_shell(
        "Your subscription is suspended",
        f"<p>Hi {clinic.name},</p><p>Access to your apps is now limited because the "
        f"<b>{sub.plan_key}</b> subscription lapsed. Your data is safe — renew any time to "
        f"restore full access immediately.</p>")


def _comp_html(clinic, sub, days):
    return email_shell(
        f"Your free access ends in {days} day(s)",
        f"<p>Hi {clinic.name},</p><p>Your complimentary access ends on <b>{sub.waived_until}</b>. "
        f"Choose a plan from your portal to continue without interruption.</p>")


def _receipt_html(clinic, invoice):
    return email_shell(
        "Payment received — thank you",
        f"<p>Hi {clinic.name},</p><p>We've received <b>₹{invoice.amount}</b> for the "
        f"<b>{invoice.plan_key}</b> plan ({invoice.billing_cycle}). Your subscription is active "
        f"through <b>{invoice.period_to}</b>.</p>"
        f"<p style='color:#6b7280;font-size:12px'>Invoice #{invoice.id} · "
        f"{invoice.method or 'payment'} · ref {invoice.reference or '—'}</p>")


def notify_receipt(db, clinic, invoice) -> bool:
    """Send a payment receipt (best-effort, idempotent per invoice)."""
    if not clinic or not invoice:
        return False
    return notify(
        db, clinic, kind="receipt", subject="Payment received — Bharath Health Systems",
        html=_receipt_html(clinic, invoice),
        sms_text=f"{clinic.name}: payment of Rs.{invoice.amount} received. Plan active till {invoice.period_to}.",
        dedup_key=f"receipt:{invoice.id}")


def run_dunning(db) -> dict:
    """Send due reminders / lapse notices for every clinic subscription. Idempotent:
    each notice is keyed by clinic + period + kind. Returns a summary count."""
    today = date.today()
    grace_days = settings.SUBSCRIPTION_GRACE_DAYS or 7
    summary = {"renewal_reminders": 0, "grace_notices": 0, "suspended": 0, "comp_ending": 0, "scanned": 0}

    for sub in db.query(ClinicSubscription).all():
        summary["scanned"] += 1
        clinic = db.query(Clinic).filter(Clinic.id == sub.clinic_id).first()
        if not clinic:
            continue
        try:
            if sub.status == "comped" and sub.waived_until:
                d = (sub.waived_until - today).days
                if d in (3, 1) and notify(db, clinic, kind=f"comp_ending_{d}",
                        subject="Your free access is ending soon", html=_comp_html(clinic, sub, d),
                        sms_text=f"{clinic.name}: free access ends in {d} day(s). Choose a plan to continue.",
                        dedup_key=f"comp:{clinic.id}:{sub.waived_until}:{d}"):
                    summary["comp_ending"] += 1
                continue

            end = sub.current_period_end
            if not end:
                continue
            d = (end - today).days

            if d in (7, 3, 1):
                if notify(db, clinic, kind=f"renewal_{d}",
                        subject=f"Your subscription renews in {d} day(s)", html=_renewal_html(clinic, sub, d),
                        sms_text=f"{clinic.name}: subscription due in {d} day(s). Renew to avoid interruption.",
                        dedup_key=f"renew:{clinic.id}:{end}:{d}"):
                    summary["renewal_reminders"] += 1
            elif d < 0:
                grace_end = sub.grace_until or (end + timedelta(days=grace_days))
                if today <= grace_end:
                    if sub.status not in ("grace", "suspended"):
                        sub.status = "grace"
                        sub.grace_until = grace_end
                        db.commit()
                    if notify(db, clinic, kind="grace", subject="Action needed: subscription expired",
                            html=_grace_html(clinic, sub, grace_end),
                            sms_text=f"{clinic.name}: subscription expired. Pay by {grace_end} to keep access.",
                            dedup_key=f"grace:{clinic.id}:{end}"):
                        summary["grace_notices"] += 1
                else:
                    if sub.status != "suspended":
                        sub.status = "suspended"
                        db.commit()
                    if notify(db, clinic, kind="suspended", subject="Subscription suspended",
                            html=_suspended_html(clinic, sub),
                            sms_text=f"{clinic.name}: subscription suspended. Renew to restore access.",
                            dedup_key=f"suspended:{clinic.id}:{end}"):
                        summary["suspended"] += 1
        except Exception as e:
            db.rollback()
            log.error(f"[dunning] clinic {sub.clinic_id} failed: {e}")
    return summary
