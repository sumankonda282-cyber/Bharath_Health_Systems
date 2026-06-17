"""
Email sender via Resend API (https://resend.com).
Falls back silently when RESEND_API_KEY is not set.
"""
import logging
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

RESEND_SEND_URL = "https://api.resend.com/emails"


def send_email(to: str, subject: str, html_body: str) -> bool:
    """Send one HTML email via Resend. Returns True if sent, False if skipped/failed."""
    if not settings.RESEND_API_KEY:
        logger.info(f"[email] RESEND_API_KEY not set — skipping email to {to}: {subject}")
        return False

    from_field = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS}>"
    try:
        resp = httpx.post(
            RESEND_SEND_URL,
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={"from": from_field, "to": [to], "subject": subject, "html": html_body},
            timeout=20,
        )
        if resp.status_code in (200, 201):
            return True
        logger.error(f"[email] Resend error {resp.status_code}: {resp.text}")
        return False
    except Exception as e:
        logger.error(f"[email] Failed to send to {to}: {e}")
        return False


def send_password_reset_email(to: str, name: str, reset_url: str) -> bool:
    html = f"""
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#0F2557;color:#fff;padding:16px 24px;border-radius:12px 12px 0 0">
        <h2 style="margin:0;font-size:18px">Reset Your Password</h2>
        <p style="margin:4px 0 0;font-size:13px;color:#cbd5e1">BHarath Health Systems</p>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px">
        <p style="font-size:14px">Hi <b>{name}</b>,</p>
        <p style="font-size:14px">Click the button below to reset your password. This link expires in <b>30 minutes</b>.</p>
        <a href="{reset_url}"
           style="display:inline-block;margin:16px 0;padding:12px 28px;background:#065F46;color:#fff;
                  border-radius:8px;font-weight:600;font-size:14px;text-decoration:none">
          Reset Password
        </a>
        <p style="font-size:12px;color:#6b7280">
          If you didn't request this, ignore this email — your password won't change.<br/>
          — BHarath Health Systems
        </p>
      </div>
    </div>
    """
    return send_email(to, "Reset your BHarath Health password", html)


def send_welcome_email(to: str, name: str, role: str, temp_password: str, login_url: str) -> bool:
    html = f"""
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#0F2557;color:#fff;padding:16px 24px;border-radius:12px 12px 0 0">
        <h2 style="margin:0;font-size:18px">Welcome to BHarath Health</h2>
        <p style="margin:4px 0 0;font-size:13px;color:#cbd5e1">Your account is ready</p>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px">
        <p style="font-size:14px">Hi <b>{name}</b>,</p>
        <p style="font-size:14px">Your <b>{role}</b> account has been created.</p>
        <table style="font-size:13px;border-collapse:collapse;width:100%;margin:12px 0">
          <tr><td style="padding:6px 0;color:#6b7280">Login URL</td><td><a href="{login_url}">{login_url}</a></td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Email</td><td>{to}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Temp Password</td><td><b>{temp_password}</b></td></tr>
        </table>
        <p style="font-size:13px;color:#CC1414;font-weight:600">Please change your password on first login.</p>
        <p style="font-size:12px;color:#6b7280">— BHarath Health Systems</p>
      </div>
    </div>
    """
    return send_email(to, "Your BHarath Health account is ready", html)


def send_schedule_email(to: str, staff_name: str, clinic_name: str,
                        week_start: str, week_end: str, shifts: list) -> bool:
    rows = "".join(
        f"<tr><td style='padding:6px 12px;border:1px solid #e5e7eb'>{s['day']} {s['date']}</td>"
        f"<td style='padding:6px 12px;border:1px solid #e5e7eb'><b>{s['shift']}</b></td>"
        f"<td style='padding:6px 12px;border:1px solid #e5e7eb'>{s['time']}</td></tr>"
        for s in shifts
    ) or "<tr><td colspan='3' style='padding:6px 12px'>No shifts this week — you are off.</td></tr>"

    html = f"""
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#0F2557;color:#fff;padding:16px 24px;border-radius:12px 12px 0 0">
        <h2 style="margin:0;font-size:18px">Your Schedule — {clinic_name}</h2>
        <p style="margin:4px 0 0;font-size:13px;color:#cbd5e1">{week_start} to {week_end}</p>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;padding:20px 24px;border-radius:0 0 12px 12px">
        <p style="font-size:14px">Hi <b>{staff_name}</b>, your shifts for the week have been published:</p>
        <table style="border-collapse:collapse;width:100%;font-size:13px">
          <tr style="background:#f1f5f9">
            <th style="padding:6px 12px;border:1px solid #e5e7eb;text-align:left">Date</th>
            <th style="padding:6px 12px;border:1px solid #e5e7eb;text-align:left">Shift</th>
            <th style="padding:6px 12px;border:1px solid #e5e7eb;text-align:left">Timing</th>
          </tr>
          {rows}
        </table>
        <p style="font-size:12px;color:#6b7280;margin-top:16px">
          Questions about your schedule? Contact your manager.<br/>
          — BHarath Health Scheduler
        </p>
      </div>
    </div>
    """
    return send_email(to, f"Your shifts: {week_start} – {week_end} · {clinic_name}", html)


def send_whatsapp_schedule(mobile: str, staff_name: str, shifts: list) -> bool:
    logger.info(f"[whatsapp] Stub — would send schedule to {mobile} ({staff_name})")
    return False
