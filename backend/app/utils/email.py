import logging
import httpx
from app.core.config import settings

log = logging.getLogger(__name__)


async def send_email(to: str, subject: str, html: str, text: str = "") -> bool:
    """Send transactional email via Brevo. Returns True if delivered, False otherwise."""
    if not settings.BREVO_API_KEY:
        log.warning(f"[email] BREVO_API_KEY not set — skipped: {subject!r} → {to}")
        return False
    payload = {
        "sender": {"name": settings.BREVO_SENDER_NAME, "email": settings.BREVO_SENDER_EMAIL},
        "to": [{"email": to}],
        "subject": subject,
        "htmlContent": html,
    }
    if text:
        payload["textContent"] = text
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={"api-key": settings.BREVO_API_KEY, "Content-Type": "application/json"},
                json=payload,
                timeout=10.0,
            )
            r.raise_for_status()
            return True
    except Exception as e:
        log.error(f"[email] Failed to send {subject!r} to {to}: {e}")
        return False


# ── Pre-built templates ────────────────────────────────────────────────────────

def _base_html(title: str, body_html: str) -> str:
    return f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#1f2937">
      <div style="background:#0F2557;padding:16px 24px;border-radius:10px 10px 0 0">
        <span style="color:#fff;font-size:18px;font-weight:700">BharatCliniq</span>
      </div>
      <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px">
        <h2 style="color:#0F2557;margin-top:0">{title}</h2>
        {body_html}
        <p style="font-size:12px;color:#9ca3af;margin-top:24px">
          BharatCliniq · India's Clinic &amp; Hospital Management Platform
        </p>
      </div>
    </div>"""


async def send_clinic_credentials(
    to: str,
    clinic_name: str,
    username: str,
    temp_password: str,
    portal_url: str = "https://staff.bharathhealthsystems.com",
) -> bool:
    html = _base_html(
        "Your Clinic Admin Credentials",
        f"""
        <p>Your clinic <strong>{clinic_name}</strong> has been registered on BharatCliniq.</p>
        <table style="border-collapse:collapse;width:100%;margin:16px 0">
          <tr><td style="padding:8px;background:#eff6ff;font-weight:600;width:140px">Portal URL</td>
              <td style="padding:8px;background:#eff6ff"><a href="{portal_url}">{portal_url}</a></td></tr>
          <tr><td style="padding:8px;background:#fff;font-weight:600">Username</td>
              <td style="padding:8px;background:#fff;font-family:monospace">{username}</td></tr>
          <tr><td style="padding:8px;background:#eff6ff;font-weight:600">Temp Password</td>
              <td style="padding:8px;background:#eff6ff;font-family:monospace">{temp_password}</td></tr>
        </table>
        <p style="color:#d97706;background:#fffbeb;padding:10px;border-radius:6px;border:1px solid #fcd34d">
          ⚠ You will be prompted to change this password on first login. It expires in <strong>7 days</strong>.
        </p>""",
    )
    return await send_email(to, f"BharatCliniq — Clinic Admin Credentials for {clinic_name}", html)


async def send_otp_email(to: str, otp: str) -> bool:
    html = _base_html(
        "Your Login OTP",
        f"""
        <p>Use the OTP below to log in. It expires in <strong>10 minutes</strong>.</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#0F2557;
                    text-align:center;padding:16px;background:#eff6ff;border-radius:8px;margin:16px 0">
          {otp}
        </div>
        <p style="color:#6b7280;font-size:13px">If you did not request this, ignore this email.</p>""",
    )
    return await send_email(to, "BharatCliniq — Your Login OTP", html)


async def send_appointment_confirmation(
    to: str,
    patient_name: str,
    doctor_name: str,
    clinic_name: str,
    appt_date: str,
    appt_time: str,
    mode: str = "in-person",
) -> bool:
    mode_label = "Telehealth (Video)" if mode == "telehealth" else "In-Person"
    html = _base_html(
        "Appointment Confirmed",
        f"""
        <p>Hi <strong>{patient_name}</strong>, your appointment is confirmed.</p>
        <table style="border-collapse:collapse;width:100%;margin:16px 0">
          <tr><td style="padding:8px;background:#eff6ff;font-weight:600;width:120px">Doctor</td>
              <td style="padding:8px;background:#eff6ff">Dr. {doctor_name}</td></tr>
          <tr><td style="padding:8px;background:#fff;font-weight:600">Clinic</td>
              <td style="padding:8px;background:#fff">{clinic_name}</td></tr>
          <tr><td style="padding:8px;background:#eff6ff;font-weight:600">Date</td>
              <td style="padding:8px;background:#eff6ff">{appt_date}</td></tr>
          <tr><td style="padding:8px;background:#fff;font-weight:600">Time</td>
              <td style="padding:8px;background:#fff">{appt_time}</td></tr>
          <tr><td style="padding:8px;background:#eff6ff;font-weight:600">Mode</td>
              <td style="padding:8px;background:#eff6ff">{mode_label}</td></tr>
        </table>""",
    )
    return await send_email(to, f"Appointment Confirmed — Dr. {doctor_name}", html)
