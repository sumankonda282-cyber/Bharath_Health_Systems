from datetime import datetime, timedelta
from typing import Optional, List
from jose import JWTError, jwt
from pwdlib import PasswordHash
from pwdlib.hashers.bcrypt import BcryptHasher
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import get_db

_pwd_hasher = PasswordHash((BcryptHasher(),))


def hash_password(password: str) -> str:
    return _pwd_hasher.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_hasher.verify(plain, hashed)


oauth2_scheme         = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/staff/login")
oauth2_scheme_patient = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/patient/login")

# ── Role definitions ───────────────────────────────────────────────────────────

CLINICAL_ROLES      = {'doctor', 'nurse', 'pathologist', 'radiologist'}
LAB_ROLES           = {'doctor', 'nurse', 'pathologist', 'lab_technician', 'lab_tech', 'clinic_admin'}
IMAGING_ROLES       = {'doctor', 'nurse', 'radiologist', 'imaging_tech', 'imaging_technician', 'clinic_admin'}
PHARMACY_ROLES      = {'doctor', 'nurse', 'pharmacist'}
SIGN_LAB_ROLES      = {'pathologist', 'doctor'}       # who can sign lab reports
SIGN_IMAGING_ROLES  = {'radiologist', 'doctor'}       # who can sign imaging reports
ADMIN_ROLES         = {'clinic_admin', 'clinic_manager'}
ALL_STAFF_ROLES     = CLINICAL_ROLES | LAB_ROLES | IMAGING_ROLES | PHARMACY_ROLES | ADMIN_ROLES

# Roles that must NEVER see clinical data
NON_CLINICAL_ROLES  = {'receptionist', 'clinic_manager', 'clinic_admin'}


def _role(user) -> str:
    return str(user.role) if user.role else ''


def _require_roles(user, allowed: set, detail: str = 'Access denied'):
    if _role(user) not in allowed:
        raise HTTPException(status_code=403, detail=detail)
    return user


# ── Convenience role guards (use as FastAPI Depends) ──────────────────────────

def get_current_staff(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    from app.models.models import Staff
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if not payload or payload.get("user_type") != "staff":
        raise exc
    user_id = payload.get("sub")
    if not user_id:
        raise exc
    user = db.query(Staff).filter(Staff.id == int(user_id)).first()
    if not user or not user.is_active:
        raise exc
    # Validate token version — allows forced logout by bumping token_version in DB
    if payload.get("token_version") and user.token_version:
        if int(payload["token_version"]) != user.token_version:
            raise exc
    return user


def require_clinical(current=Depends(get_current_staff)):
    """Doctor, nurse, pathologist, radiologist."""
    return _require_roles(current, CLINICAL_ROLES | {'pathologist', 'radiologist', 'lab_technician', 'lab_tech', 'imaging_tech'},
                          'Clinical data access denied. Your role does not permit viewing patient records.')


def require_doctor(current=Depends(get_current_staff)):
    """Doctor only — encounters, prescriptions, ordering tests."""
    return _require_roles(current, {'doctor'},
                          'This action requires doctor access.')


def require_doctor_or_nurse(current=Depends(get_current_staff)):
    return _require_roles(current, {'doctor', 'nurse'},
                          'Doctor or nurse access required.')


def require_lab_access(current=Depends(get_current_staff)):
    """Roles that can view/manage lab orders and results."""
    return _require_roles(current, LAB_ROLES | {'lab_technician', 'lab_tech'},
                          'Lab access denied.')


def require_lab_sign(current=Depends(get_current_staff)):
    """Only pathologist or doctor can sign lab reports."""
    return _require_roles(current, SIGN_LAB_ROLES,
                          'Only a pathologist or doctor can sign lab reports.')


def require_imaging_access(current=Depends(get_current_staff)):
    return _require_roles(current, IMAGING_ROLES | {'imaging_tech'},
                          'Imaging access denied.')


def require_imaging_sign(current=Depends(get_current_staff)):
    return _require_roles(current, SIGN_IMAGING_ROLES,
                          'Only a radiologist or doctor can sign imaging reports.')


def require_pharmacy(current=Depends(get_current_staff)):
    return _require_roles(current, PHARMACY_ROLES,
                          'Pharmacy access denied.')


def require_admin(current=Depends(get_current_staff)):
    """Clinic admin only — staff management, settings."""
    return _require_roles(current, {'clinic_admin'},
                          'Clinic admin access required.')


def require_admin_or_manager(current=Depends(get_current_staff)):
    return _require_roles(current, ADMIN_ROLES,
                          'Admin or manager access required.')


def require_billing_view(current=Depends(get_current_staff)):
    """Everyone except lab/imaging/pharmacy techs can view billing."""
    return _require_roles(current, {'clinic_admin', 'clinic_manager', 'doctor', 'receptionist'},
                          'Billing access denied.')


def require_billing_waive(current=Depends(get_current_staff)):
    """Only doctor or manager can apply waivers/discounts."""
    return _require_roles(current, {'doctor', 'clinic_admin', 'clinic_manager'},
                          'Only doctors or managers can apply fee waivers.')


def require_any_staff(current=Depends(get_current_staff)):
    """Any authenticated staff member."""
    return current


# ── Health Center Manager permissions (scope + module/duty access) ──────────────
# A staff member is RESTRICTED only when they carry a non-empty ``permissions`` map
# (set when an admin/supervisor creates a Health Center Manager). Everyone else —
# clinic_admin, legacy managers, doctors, receptionists, service-desk staff — has no
# map and is treated as UNRESTRICTED, so the other portals are entirely unaffected.
# clinic_admin (the owner) is always unrestricted.

def _effective_permissions(staff):
    if getattr(staff, 'role', None) == 'clinic_admin':
        return None
    perms = getattr(staff, 'permissions', None)
    return perms if isinstance(perms, dict) and perms else None


def staff_is_restricted(staff) -> bool:
    """True only for a scoped Health Center Manager (carries a permissions map)."""
    return _effective_permissions(staff) is not None


def staff_has_module(staff, module: str) -> bool:
    perms = _effective_permissions(staff)
    return True if perms is None else bool((perms.get('modules') or {}).get(module, False))


def staff_has_duty(staff, duty: str) -> bool:
    perms = _effective_permissions(staff)
    return True if perms is None else bool((perms.get('duties') or {}).get(duty, False))


def staff_can_manage_role(staff, role: str) -> bool:
    perms = _effective_permissions(staff)
    return True if perms is None else (role in (perms.get('manageable_roles') or []))


def staff_department_limit(staff):
    """Department a manager is confined to, or None when unrestricted / center-scoped."""
    if _effective_permissions(staff) is None:
        return None
    if getattr(staff, 'manager_scope', None) == 'department':
        return getattr(staff, 'department', None)
    return None


def role_rank(role: str, manager_scope: str = None) -> int:
    """Org-hierarchy precedence for downward-only management.

    A staff member may only edit / deactivate / reset-password staff of a STRICTLY
    lower rank — never a peer or someone above them (no upward control).
    clinic_admin(100) > center supervisor(85) > department manager(80) > everyone else(50).
    """
    if role == 'clinic_admin':
        return 100
    if role == 'clinic_manager':
        return 85 if manager_scope == 'center' else 80
    return 50


def assert_can_manage(actor, target):
    """403 unless ``actor`` outranks ``target`` (downward-only). Self is always allowed."""
    if getattr(actor, 'id', None) == getattr(target, 'id', None):
        return
    if role_rank(getattr(target, 'role', None), getattr(target, 'manager_scope', None)) >= \
       role_rank(getattr(actor, 'role', None), getattr(actor, 'manager_scope', None)):
        raise HTTPException(status_code=403,
                            detail="You can only manage staff below your level, not peers or supervisors.")


def require_duty(duty: str):
    """Dependency factory — 403 unless the actor holds ``duty`` (unrestricted actors pass)."""
    def _dep(current=Depends(get_current_staff)):
        if not staff_has_duty(current, duty):
            raise HTTPException(status_code=403, detail=f"Permission denied: {duty.replace('_', ' ')}.")
        return current
    return _dep


# ── Token helpers ──────────────────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict):
    return create_access_token(data, expires_delta=timedelta(days=7))


def decode_token(token: str):
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


def get_current_patient_user(token: str = Depends(oauth2_scheme_patient), db: Session = Depends(get_db)):
    from app.models.models import PatientUser
    exc = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
    payload = decode_token(token)
    if not payload or payload.get("user_type") != "patient":
        raise exc
    user_id = payload.get("sub")
    if not user_id:
        raise exc
    user = db.query(PatientUser).filter(PatientUser.id == int(user_id)).first()
    if not user or not user.is_active:
        raise exc
    return user


def get_current_platform_admin(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    from app.models.models import PlatformAdmin
    exc = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
    payload = decode_token(token)
    if not payload or payload.get("user_type") != "platform_admin":
        raise exc
    user_id = payload.get("sub")
    if not user_id:
        raise exc
    user = db.query(PlatformAdmin).filter(PlatformAdmin.id == int(user_id)).first()
    if not user or not user.is_active:
        raise exc
    return user

