"""Transactional SMS via Fast2SMS (same provider as OTP). Sync + best-effort:
returns False and logs when unconfigured or on failure; never raises.
"""
import logging
import httpx

from app.core.config import settings

log = logging.getLogger("sms_service")
FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2"


def is_configured() -> bool:
    return bool(settings.FAST2SMS_API_KEY)


def send_sms(mobile: str, message: str) -> bool:
    if not is_configured() or not mobile or not message:
        return False
    digits = "".join(ch for ch in str(mobile) if ch.isdigit())[-10:]
    if len(digits) != 10:
        return False
    try:
        resp = httpx.post(
            FAST2SMS_URL,
            headers={"authorization": settings.FAST2SMS_API_KEY},
            data={"message": message, "language": "english", "route": "q", "numbers": digits},
            timeout=15,
        )
        return resp.status_code == 200
    except Exception as e:
        log.error(f"[sms] send failed: {e}")
        return False
