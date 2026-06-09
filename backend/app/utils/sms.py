import logging
import httpx
from app.core.config import settings

log = logging.getLogger(__name__)


async def send_otp_sms(mobile: str, otp: str) -> bool:
    """
    Send OTP via 2Factor.in (free 10k/month tier).
    Returns True if successfully queued, False if unconfigured or failed.
    Only call this when the user explicitly provides a phone number.
    Otherwise use email OTP to avoid SMS cost.
    """
    if not settings.TWO_FACTOR_API_KEY:
        return False
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"https://2factor.in/API/V1/{settings.TWO_FACTOR_API_KEY}/SMS/{mobile}/{otp}/OTP1",
                timeout=10.0,
            )
            data = r.json()
            if data.get("Status") == "Success":
                return True
            log.warning(f"[sms] 2Factor.in non-success for ...{mobile[-4:]}: {data}")
            return False
    except Exception as e:
        log.error(f"[sms] Send failed for ...{mobile[-4:]}: {e}")
        return False
