"""
Telehealth session lifecycle — join gating, slot-anchored expiry, completion.

The room name is deterministic (bc-{appointment_id}) so the patient's link
never changes. Access control comes from:
  1. Token issuance gating below (state + time window)
  2. Room existence on Daily.co — deleted at completion, link dies instantly
  3. Knocking — a patient alone in a room waits until the doctor admits them

States: scheduled → ready(T-15) → in_progress → completed
                                              → expired (window passed, never completed)
Rejoin: doctor grants a time-boxed window at completion (reopened_until) or
        later via the reopen flow (Phase 2) — same room name, same link.
"""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_current_staff
from app.db.session import get_db
from app.models.models import (
    Appointment, TelehealthSession, TelehealthSessionEvent, DoctorProfile,
)
from app.utils.video import (
    get_or_create_room, create_meeting_token, delete_room,
    update_room_exp, jitsi_fallback_url,
)

router = APIRouter(prefix="/telehealth", tags=["telehealth"])

# Appointments are stored as naive IST (date + "HH:MM"); Daily.co wants UTC epochs.
IST_OFFSET = timedelta(hours=5, minutes=30)
SLOT_MINUTES = 30          # default visit length until per-schedule durations are wired
GRACE_MINUTES = 30         # join allowed this long past slot end
READY_BEFORE_MINUTES = 15  # join opens this early
MAX_REJOIN_MINUTES = 120


def _now_ist() -> datetime:
    return datetime.utcnow() + IST_OFFSET


def _ist_to_epoch(dt: datetime) -> int:
    return int((dt - IST_OFFSET).replace(tzinfo=timezone.utc).timestamp())


def _log_event(db, session_id, event_type, actor_type=None, actor_id=None, payload=None):
    db.add(TelehealthSessionEvent(
        session_id=session_id, event_type=event_type,
        actor_type=actor_type, actor_id=actor_id, payload=payload,
    ))


def get_or_create_session(db: Session, appt: Appointment) -> TelehealthSession:
    sess = db.query(TelehealthSession).filter(
        TelehealthSession.appointment_id == appt.id
    ).first()
    if sess:
        return sess
    hh, mm = (appt.appointment_time or "09:00").split(":")[:2]
    slot_start = datetime.combine(appt.appointment_date, datetime.min.time()).replace(
        hour=int(hh), minute=int(mm)
    )
    sess = TelehealthSession(
        appointment_id=appt.id,
        clinic_id=appt.clinic_id,
        room_name=f"bc-{appt.id}",
        state="scheduled",
        slot_start=slot_start,
        slot_end=slot_start + timedelta(minutes=SLOT_MINUTES),
    )
    db.add(sess)
    db.flush()
    _log_event(db, sess.id, "created", actor_type="system")
    return sess


def _gate(sess: TelehealthSession, now: datetime):
    """Returns (allowed, reason_if_denied, window_end)."""
    if sess.state == "cancelled":
        return False, "This appointment was cancelled.", None

    # Doctor-approved rejoin window overrides completed/expired
    if sess.reopened_until and now <= sess.reopened_until:
        return True, None, sess.reopened_until

    if sess.state == "completed":
        return False, ("This visit has ended. If you need to reconnect today, "
                       "ask your doctor to reopen the session or book a follow-up."), None

    opens_at = sess.slot_start - timedelta(minutes=READY_BEFORE_MINUTES)
    closes_at = sess.slot_end + timedelta(minutes=GRACE_MINUTES)

    if now < opens_at:
        mins = int((opens_at - now).total_seconds() // 60) + 1
        return False, f"The join window opens 15 minutes before your appointment (in about {mins} min).", None
    if now > closes_at:
        return False, ("The join window for this appointment has passed. "
                       "Please request a rejoin or book a follow-up."), None
    return True, None, closes_at


async def issue_join(db: Session, appt: Appointment, role: str, actor_id: int) -> dict:
    """Shared join logic for doctor and patient. role: 'doctor' | 'patient'."""
    if appt.mode != "telehealth":
        raise HTTPException(400, "This is not a telehealth appointment")

    sess = get_or_create_session(db, appt)
    now = _now_ist()

    allowed, reason, window_end = _gate(sess, now)
    if not allowed:
        if sess.state not in ("completed", "cancelled") and now > sess.slot_end + timedelta(minutes=GRACE_MINUTES):
            if sess.state != "expired":
                sess.state = "expired"
                _log_event(db, sess.id, "expired", actor_type="system")
                db.commit()
        raise HTTPException(403, reason)

    exp_epoch = _ist_to_epoch(window_end)

    if settings.DAILY_API_KEY:
        room = await get_or_create_room(sess.room_name, exp_at=exp_epoch)
        if not room:
            raise HTTPException(502, "Video service unavailable. Please try again.")
        token = await create_meeting_token(sess.room_name, is_owner=(role == "doctor"), exp_at=exp_epoch)
        url = room.get("url", f"https://{settings.DAILY_DOMAIN}/{sess.room_name}")
        provider = "daily.co"
    else:
        # Dev/demo fallback — public Jitsi, no token security. Gating above still applies.
        token = None
        url = jitsi_fallback_url(sess.room_name)
        provider = "jitsi"

    if role == "doctor":
        if not sess.doctor_first_joined_at:
            sess.doctor_first_joined_at = now
        if sess.state in ("scheduled", "ready"):
            sess.state = "in_progress"
        appt.status = "in_progress"
        appt.telehealth_joined_at = datetime.utcnow()
        _log_event(db, sess.id, "doctor_joined", actor_type="staff", actor_id=actor_id)
    else:
        if not sess.patient_first_joined_at:
            sess.patient_first_joined_at = now
        if sess.state == "scheduled":
            sess.state = "ready"
        _log_event(db, sess.id, "patient_joined", actor_type="patient", actor_id=actor_id)

    if not appt.telehealth_room:
        appt.telehealth_room = sess.room_name
    sess.room_expires_at = window_end
    db.commit()

    return {
        "provider": provider,
        "room": sess.room_name,
        "url": url,
        "token": token,
        "state": sess.state,
        "window_ends_at": window_end.isoformat(),
    }


def _staff_appt(db: Session, appointment_id: int, staff) -> Appointment:
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.clinic_id == staff.clinic_id,
    ).first()
    if not appt:
        raise HTTPException(404, "Appointment not found")
    return appt


def _my_doctor_profile(db: Session, staff):
    return db.query(DoctorProfile).filter(DoctorProfile.staff_id == staff.id).first()


def _assert_can_join(db: Session, appt: Appointment, staff):
    """Doctor-level isolation: a doctor may act on a telehealth visit only if it
    is assigned to them. Clinic admins/managers are allowed (oversight). Use the
    transfer endpoint to reassign a visit to a covering doctor. Clinic isolation
    is already enforced by _staff_appt."""
    role = (getattr(staff, "role", "") or "").lower()
    if role == "doctor":
        dp = _my_doctor_profile(db, staff)
        if not dp or appt.doctor_id != dp.id:
            raise HTTPException(
                403,
                "This telehealth visit is assigned to another doctor. "
                "Ask the front desk to transfer it to you.",
            )


# ── Staff endpoints ───────────────────────────────────────────────────────────

@router.post("/appointments/{appointment_id}/join")
async def staff_join(
    appointment_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    """Doctor/staff joins — owner token (can admit knocking patients, mute, remove)."""
    appt = _staff_appt(db, appointment_id, current)
    _assert_can_join(db, appt, current)
    return await issue_join(db, appt, role="doctor", actor_id=current.id)


@router.post("/appointments/{appointment_id}/complete")
async def complete_session(
    appointment_id: int,
    body: dict = None,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    """
    End the visit. Deletes the Daily room so the link dies instantly.
    Optional body: {"allow_rejoin_minutes": 15|30|60} pre-approves a same-day
    rejoin window — the room stays alive (same link) until the window closes.
    """
    body = body or {}
    appt = _staff_appt(db, appointment_id, current)
    _assert_can_join(db, appt, current)
    sess = get_or_create_session(db, appt)
    now = _now_ist()

    if sess.state == "completed" and not body.get("allow_rejoin_minutes"):
        return {"state": "completed", "note": "already completed"}

    sess.state = "completed"
    sess.completed_at = now
    sess.completed_by = current.id
    appt.status = "completed"

    allow = int(body.get("allow_rejoin_minutes") or 0)
    if allow > 0:
        allow = min(allow, MAX_REJOIN_MINUTES)
        sess.reopened_until = now + timedelta(minutes=allow)
        sess.reopen_count = (sess.reopen_count or 0) + 1
        if settings.DAILY_API_KEY:
            exp_epoch = _ist_to_epoch(sess.reopened_until)
            updated = await update_room_exp(sess.room_name, exp_epoch)
            if not updated:
                await get_or_create_room(sess.room_name, exp_at=exp_epoch)
        _log_event(db, sess.id, "rejoin_window", actor_type="staff", actor_id=current.id,
                   payload={"minutes": allow})
    else:
        sess.reopened_until = None
        if settings.DAILY_API_KEY:
            await delete_room(sess.room_name)
        _log_event(db, sess.id, "room_deleted", actor_type="staff", actor_id=current.id)

    _log_event(db, sess.id, "completed", actor_type="staff", actor_id=current.id)
    db.commit()

    return {
        "state": "completed",
        "rejoin_until": sess.reopened_until.isoformat() if sess.reopened_until else None,
    }


@router.get("/appointments/{appointment_id}/status")
def session_status(
    appointment_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    """Live session state for UI chips (provider portal)."""
    appt = _staff_appt(db, appointment_id, current)
    sess = get_or_create_session(db, appt)
    now = _now_ist()
    allowed, reason, window_end = _gate(sess, now)
    db.commit()
    return {
        "state": sess.state,
        "can_join": allowed,
        "reason": reason,
        "slot_start": sess.slot_start.isoformat(),
        "slot_end": sess.slot_end.isoformat(),
        "doctor_joined": sess.doctor_first_joined_at is not None,
        "patient_joined": sess.patient_first_joined_at is not None,
        "rejoin_until": sess.reopened_until.isoformat() if sess.reopened_until else None,
        "reopen_count": sess.reopen_count or 0,
    }


@router.post("/appointments/{appointment_id}/transfer")
def transfer_appointment(
    appointment_id: int,
    body: dict = None,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    """Reassign a telehealth visit to another doctor in the same clinic.

    Allowed for the front desk (receptionist / clinic_admin / clinic_manager) or
    the currently-assigned doctor handing off when unavailable. Clinic isolation
    is preserved (target must belong to this clinic); the room name is per
    appointment, so the patient's link is unchanged after the transfer.
    """
    body = body or {}
    appt = _staff_appt(db, appointment_id, current)

    to_id = body.get("to_doctor_id")
    if not to_id:
        raise HTTPException(400, "to_doctor_id is required")

    # Accept a doctor_profile id or a staff id; must be in this clinic.
    target = db.query(DoctorProfile).filter(
        DoctorProfile.id == to_id,
        DoctorProfile.clinic_id == current.clinic_id,
    ).first()
    if not target:
        target = db.query(DoctorProfile).filter(
            DoctorProfile.staff_id == to_id,
            DoctorProfile.clinic_id == current.clinic_id,
        ).first()
    if not target:
        raise HTTPException(404, "Target doctor not found in this clinic")

    role = (getattr(current, "role", "") or "").lower()
    mine = _my_doctor_profile(db, current)
    is_front_desk = role in ("receptionist", "clinic_admin", "clinic_manager")
    is_assigned_doctor = role == "doctor" and mine is not None and appt.doctor_id == mine.id
    if not (is_front_desk or is_assigned_doctor):
        raise HTTPException(403, "Only the front desk or the assigned doctor can transfer this visit.")

    prev_doctor_id = appt.doctor_id
    appt.doctor_id = target.id

    sess = get_or_create_session(db, appt)
    _log_event(db, sess.id, "transferred", actor_type="staff", actor_id=current.id,
               payload={"from_doctor_id": prev_doctor_id, "to_doctor_id": target.id})
    db.commit()

    return {
        "ok": True,
        "appointment_id": appt.id,
        "to_doctor_id": target.id,
        "to_doctor_name": target.staff.full_name if target.staff else None,
    }
