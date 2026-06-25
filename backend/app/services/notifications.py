"""Billing notifications over the existing rails (Resend email + Fast2SMS SMS),
with an idempotent log so a reminder/receipt is never sent twice.

Sync + best-effort: every send is wrapped; a failure is logged and recorded but
never raised, so notifications can't break a payment flow or a cron run.
"""
import logging

from app.models.models import NotificationLog
from app.services.email_service import send_email
from app.services.sms_service import send_sms

log = logging.getLogger("notifications")


def already_sent(db, dedup_key: str) -> bool:
    if not dedup_key:
        return False
    return db.query(NotificationLog).filter(NotificationLog.dedup_key == dedup_key).first() is not None


def email_shell(title: str, body_html: str) -> str:
    return (
        '<div style="font-family:system-ui,Arial,sans-serif;max-width:540px;margin:auto;'
        'border:1px solid #eee;border-radius:12px;overflow:hidden">'
        '<div style="background:#0F2557;padding:16px 20px;color:#fff;font-weight:700">'
        'Bharath Health Systems</div>'
        '<div style="padding:20px;color:#1f2937;font-size:14px;line-height:1.6">'
        f'<h2 style="margin:0 0 10px;color:#0F2557;font-size:18px">{title}</h2>{body_html}'
        '<p style="margin-top:18px;color:#6b7280;font-size:12px">Manage your plan from the '
        'Plan &amp; Billing tab in your portal.</p></div></div>'
    )


def notify(db, clinic, *, kind, subject, html, sms_text=None, dedup_key=None,
           email_to=None, sms_to=None) -> bool:
    """Send email (+ optional SMS) to a clinic's billing contact. Idempotent by
    dedup_key. Commits its own log rows. Returns True if anything was sent."""
    if already_sent(db, dedup_key):
        return False
    to_email = email_to or (clinic.billing_email or clinic.email if clinic else None)
    to_sms = sms_to or (getattr(clinic, "phone", None) if clinic else None)
    cid = getattr(clinic, "id", None)
    sent_any = False
    try:
        if to_email:
            ok = send_email(to_email, subject, html)
            db.add(NotificationLog(clinic_id=cid, kind=kind, channel="email", dedup_key=dedup_key,
                                   recipient=to_email, subject=subject, status="sent" if ok else "failed"))
            sent_any = sent_any or ok
        if sms_text and to_sms:
            ok = send_sms(to_sms, sms_text)
            db.add(NotificationLog(clinic_id=cid, kind=kind, channel="sms",
                                   dedup_key=(dedup_key + ":sms") if dedup_key else None,
                                   recipient=to_sms, subject=subject, status="sent" if ok else "failed"))
            sent_any = sent_any or ok
        db.commit()
    except Exception as e:
        db.rollback()
        log.error(f"[notify] {kind} for clinic {cid} failed: {e}")
        return False
    return sent_any
