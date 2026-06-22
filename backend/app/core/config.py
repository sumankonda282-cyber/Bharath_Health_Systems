from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24h

    OTP_MOCK: bool = True

    # ── SMS / OTP ──────────────────────────────────────────────────────────────
    FAST2SMS_API_KEY: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""          # E.164, e.g. +14155551234
    TWILIO_WHATSAPP_FROM: str = ""        # whatsapp:+14155551234
    SMS_PROVIDER: str = "fast2sms"        # "fast2sms" | "twilio"

    # ── Email / Resend ─────────────────────────────────────────────────────────
    RESEND_API_KEY: str = ""
    EMAIL_FROM_ADDRESS: str = "noreply@bharathhealthsystems.com"
    EMAIL_FROM_NAME: str = "BHarath Health"
    EMAIL_ENABLED: bool = False           # set True once RESEND_API_KEY is set

    # ── Legacy SMTP (kept for fallback reference, not used when Resend is active) ──
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_TLS: bool = True
    SMTP_SSL: bool = False
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    CORS_ORIGINS: str = (
        "http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:5175,"
        "https://bharathhealthsystems.com,https://www.bharathhealthsystems.com,"
        "https://provider.bharathhealthsystems.com,https://my.bharathhealthsystems.com,"
        "https://lab.bharathhealthsystems.com,https://pharmacy.bharathhealthsystems.com,"
        "https://staff.bharathhealthsystems.com,https://admin.bharathhealthsystems.com,"
        "https://imaging.bharathhealthsystems.com,https://carechart.bharathhealthsystems.com,"
        "https://bharath-health-public.vercel.app,https://bharath-health-provider.vercel.app,"
        "https://bharath-health-patient.vercel.app,https://bharath-health-lab.vercel.app,"
        "https://bharath-health-imaging.vercel.app,https://bharath-health-pharmacy.vercel.app,"
        "https://bharath-health-staff.vercel.app,https://bharath-health-admin.vercel.app"
    )

    DEBUG: bool = False
    FREE_PLAN_MAX_DOCTORS: int = 2
    FREE_PLAN_MAX_BRANCHES: int = 1
    UPLOAD_DIR: str = "uploads"
    APP_NAME: str = "BHarath Health"
    APP_VERSION: str = "2.0.0"

    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    DAILY_API_KEY: str = ""
    DAILY_DOMAIN: str = "bharathhealthsystems.daily.co"

    @property
    def cors_origins_list(self) -> List[str]:
        defaults = [
            "https://bharathhealthsystems.com",
            "https://www.bharathhealthsystems.com",
            "https://provider.bharathhealthsystems.com",
            "https://my.bharathhealthsystems.com",
            "https://lab.bharathhealthsystems.com",
            "https://pharmacy.bharathhealthsystems.com",
            "https://staff.bharathhealthsystems.com",
            "https://admin.bharathhealthsystems.com",
            "https://imaging.bharathhealthsystems.com",
            "https://carechart.bharathhealthsystems.com",
            "https://bharath-health-public.vercel.app",
            "https://bharath-health-provider.vercel.app",
            "https://bharath-health-patient.vercel.app",
            "https://bharath-health-lab.vercel.app",
            "https://bharath-health-imaging.vercel.app",
            "https://bharath-health-pharmacy.vercel.app",
            "https://bharath-health-staff.vercel.app",
            "https://bharath-health-admin.vercel.app",
            "https://bhs-staff.pages.dev",
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:5175",
            "http://localhost:5176",
            "http://localhost:5177",
            "http://localhost:5178",
            "http://localhost:5179",
        ]
        if self.CORS_ORIGINS:
            extras = [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
            return list(set(defaults + extras))
        return defaults

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
