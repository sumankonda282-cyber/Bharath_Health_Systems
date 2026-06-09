import random
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.config import settings
from app.core.security import create_access_token
from app.core.limiter import limiter
from app.models.models import PatientUser
from app.utils.sms import send_otp_sms
from app.utils.email import send_otp_email

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

    if not settings.OTP_MOCK:
        # Try SMS first (only when user explicitly enters phone — saves SMS cost)
        sms_sent = await send_otp_sms(mobile, otp)
        # If SMS failed and patient has a registered email, fall back to email OTP
        if not sms_sent and user.email:
            await send_otp_email(user.email, otp)

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
    db.commit()

    token = create_access_token({
        "sub":       str(user.id),
        "user_type": "patient",
        "mobile":    mobile,
    })

    return {
        "access_token": token,
        "token_type":   "bearer",
        "is_new_user":  False,
    }
