import random
import secrets
import httpx
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.config import settings
from app.core.security import create_access_token
from app.core.limiter import limiter
from app.models.models import PatientUser

OTP_VERIFIED_TOKEN_TTL_MINUTES = 30

router = APIRouter(prefix="/otp", tags=["otp"])

OTP_TTL_MINUTES = 10


@router.post("/send")
@limiter.limit("3/minute")
async def send_otp(request: Request, body: dict, db: Session = Depends(get_db)):
    mobile = str(body.get("mobile", "")).strip()
    if not mobile or len(mobile) != 10 or not mobile.isdigit():
        raise HTTPException(400, "Enter a valid 10-digit mobile number")

    otp = "1234" if settings.OTP_MOCK else str(random.randint(100000, 999999))

    # Persist OTP in DB — survives server restarts
    user = db.query(PatientUser).filter(PatientUser.mobile == mobile).first()
    if not user:
        user = PatientUser(mobile=mobile, is_active=True, full_name="")
        db.add(user)
        db.flush()

    user.otp_code   = otp
    user.otp_expiry = datetime.utcnow() + timedelta(minutes=OTP_TTL_MINUTES)
    db.commit()

    if not settings.OTP_MOCK and settings.FAST2SMS_API_KEY:
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    "https://www.fast2sms.com/dev/bulkV2",
                    headers={"authorization": settings.FAST2SMS_API_KEY},
                    data={"variables_values": otp, "route": "otp", "numbers": mobile},
                    timeout=10.0,
                )
        except Exception as e:
            # Log failure server-side only — never expose to client
            import logging
            logging.getLogger(__name__).error(f"SMS send failed for {mobile[-4:]}: {e}")

    resp = {"message": "OTP sent", "mobile": mobile}
    if settings.OTP_MOCK:
        resp["dev_otp"] = otp
    return resp


@router.post("/verify")
@limiter.limit("5/minute")
def verify_otp(request: Request, body: dict, db: Session = Depends(get_db)):
    mobile = str(body.get("mobile", "")).strip()
    otp    = str(body.get("otp", "")).strip()

    user = db.query(PatientUser).filter(PatientUser.mobile == mobile).first()
    if not user:
        raise HTTPException(400, "Mobile not found. Please request an OTP first.")

    if settings.OTP_MOCK:
        if otp != "1234":
            raise HTTPException(400, "Invalid OTP. Use 1234 in testing mode.")
    else:
        if not user.otp_code or not user.otp_expiry:
            raise HTTPException(400, "No OTP pending. Please request a new one.")
        if datetime.utcnow() > user.otp_expiry:
            raise HTTPException(400, "OTP expired. Please request a new one.")
        if otp != user.otp_code:
            raise HTTPException(400, "Invalid OTP.")

    # Clear OTP after use
    user.otp_code   = None
    user.otp_expiry = None
    if not user.is_active:
        user.is_active = True

    # Issue a short-lived verified_token so /public/patient-profile can be called
    verified_token = secrets.token_urlsafe(32)
    user.otp_verified_token = verified_token
    user.otp_token_expiry   = datetime.utcnow() + timedelta(minutes=OTP_VERIFIED_TOKEN_TTL_MINUTES)

    db.commit()

    token = create_access_token({
        "sub":       str(user.id),
        "user_type": "patient",
        "mobile":    mobile,
    })

    return {
        "access_token":   token,
        "token_type":     "bearer",
        "verified_token": verified_token,
        "is_new_user":    False,
    }
