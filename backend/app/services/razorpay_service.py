"""Razorpay integration (raw httpx — no SDK dependency, consistent with the
Resend email service). Every function degrades gracefully when the keys are not
configured, so the app runs fine until RAZORPAY_* env vars are set.
"""
import hmac
import hashlib

import httpx

from app.core.config import settings

BASE_URL = "https://api.razorpay.com/v1"


def is_configured() -> bool:
    return bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET)


def _auth():
    return (settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)


async def create_order(amount_paise: int, receipt: str, notes=None):
    """Create a Razorpay order. Returns the order dict, or None if not configured
    or the call fails (caller falls back to bank transfer)."""
    if not is_configured() or amount_paise <= 0:
        return None
    payload = {
        "amount": int(amount_paise),
        "currency": "INR",
        "receipt": receipt[:40],
        "payment_capture": 1,
    }
    if notes:
        payload["notes"] = notes
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(f"{BASE_URL}/orders", json=payload, auth=_auth())
        if resp.status_code in (200, 201):
            return resp.json()
    except Exception:
        pass
    return None


def verify_payment_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """Verify the Checkout success signature: HMAC_SHA256(order_id|payment_id)."""
    if not is_configured() or not (order_id and payment_id and signature):
        return False
    msg = f"{order_id}|{payment_id}".encode()
    expected = hmac.new(settings.RAZORPAY_KEY_SECRET.encode(), msg, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def verify_webhook_signature(raw_body: bytes, signature: str) -> bool:
    """Verify an inbound webhook against RAZORPAY_WEBHOOK_SECRET."""
    secret = settings.RAZORPAY_WEBHOOK_SECRET
    if not secret or not signature:
        return False
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
