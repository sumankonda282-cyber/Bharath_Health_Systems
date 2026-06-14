"""
Staff Scheduler — shift types, groups, schedule board, leaves, patterns, publish.

Scoping rules:
  - clinic_admin: sees and manages ALL groups in the clinic
  - clinic_manager: sees groups they own (manager_id == them) plus unowned groups
"""
from datetime import datetime, date, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.db.session import get_db
from app.models.models import (
    Staff, Clinic, Department,
    ShiftType, StaffGroup, StaffGroupMember, ScheduleEntry,
    LeaveRequest, SchedulePattern, SchedulePublishLog, SchedulerSettings,
)
from app.core.security import get_current_staff
from app.services.email_service import send_schedule_email, send_whatsapp_schedule

router = APIRouter(prefix="/scheduler", tags=["scheduler"])

MANAGER_ROLES = ["clinic_admin", "clinic_manager"]

DEFAULT_LEAVE_QUOTAS = {"casual": 12, "sick": 10, "pto": 15, "earned": 15}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _require_manager(current: Staff):
    if current.role not in MANAGER_ROLES:
        raise HTTPException(status_code=403, detail="Manager access required")


def _visible_group_ids(db: Session, current: Staff) -> Optional[List[int]]:
    """None = all groups visible (admin). Otherwise list of group ids the manager owns + unowned."""
    if current.role == "clinic_admin":
        return None
    groups = db.query(StaffGroup).filter(StaffGroup.clinic_id == current.clinic_id).all()
    return [g.id for g in groups if g.manager_id in (None, current.id)]


def _group_dict(g: StaffGroup, db: Session) -> dict:
    members = [
        {
            "id": m.id,
            "staff_id": m.staff_id,
            "full_name": m.staff.full_name if m.staff else None,
            "role": m.staff.role if m.staff else None,
        }
        for m in g.members
    ]
    manager = db.query(Staff).filter(Staff.id == g.manager_id).first() if g.manager_id else None
    dept = db.query(Department).filter(Department.id == g.department_id).first() if g.department_id else None
    return {
        "id": g.id,
        "name": g.name,
        "department_id": g.department_id,
        "department_name": dept.name if dept else None,
        "manager_id": g.manager_id,
        "manager_name": manager.full_name if manager else None,
        "members": members,
        "member_count": len(members),
    }


def _entry_dict(e: ScheduleEntry) -> dict:
    return {
        "id": e.id,
        "staff_id": e.staff_id,
        "staff_name": e.staff.full_name if e.staff else None,
        "group_id": e.group_id,
        "shift_type_id": e.shift_type_id,
        "shift_name": e.shift_type.name if e.shift_type else None,
        "shift_start": e.shift_type.start_time if e.shift_type else None,
        "shift_end": e.shift_type.end_time if e.shift_type else None,
        "shift_color": e.shift_type.color_hex if e.shift_type else None,
        "work_date": e.work_date.isoformat() if e.work_date else None,
        "status": e.status,
        "notes": e.notes,
    }


def _leave_dict(lv: LeaveRequest) -> dict:
    return {
        "id": lv.id,
        "staff_id": lv.staff_id,
        "staff_name": lv.staff.full_name if lv.staff else None,
        "leave_type": lv.leave_type,
        "from_date": lv.from_date.isoformat() if lv.from_date else None,
        "to_date": lv.to_date.isoformat() if lv.to_date else None,
        "reason": lv.reason,
        "status": lv.status,
        "decided_by": lv.decided_by,
        "decided_at": lv.decided_at,
        "decision_note": lv.decision_note,
        "created_at": lv.created_at,
    }


def _get_settings(db: Session, clinic_id: int) -> SchedulerSettings:
    s = db.query(SchedulerSettings).filter(SchedulerSettings.clinic_id == clinic_id).first()
    if not s:
        s = SchedulerSettings(clinic_id=clinic_id, leave_quotas=DEFAULT_LEAVE_QUOTAS)
        db.add(s)
        db.commit()
        db.refresh(s)
    return s


# ── Settings (setup wizard) ───────────────────────────────────────────────────

@router.get("/settings")
def get_settings(db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    _require_manager(current)
    s = _get_settings(db, current.clinic_id)
    return {
        "min_rest_hours": s.min_rest_hours,
        "max_shifts_per_week": s.max_shifts_per_week,
        "weekly_off_day": s.weekly_off_day,
        "leave_quotas": s.leave_quotas or DEFAULT_LEAVE_QUOTAS,
        "setup_complete": s.setup_complete,
    }


@router.put("/settings")
def update_settings(body: dict, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    _require_manager(current)
    s = _get_settings(db, current.clinic_id)
    for field in ["min_rest_hours", "max_shifts_per_week", "weekly_off_day", "leave_quotas", "setup_complete"]:
        if field in body:
            setattr(s, field, body[field])
    db.commit()
    return {"ok": True}


# ── Shift Types ───────────────────────────────────────────────────────────────

@router.get("/shift-types")
def list_shift_types(db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    _require_manager(current)
    rows = db.query(ShiftType).filter(
        ShiftType.clinic_id == current.clinic_id, ShiftType.is_active == True  # noqa: E712
    ).order_by(ShiftType.start_time).all()
    return [
        {"id": r.id, "name": r.name, "start_time": r.start_time,
         "end_time": r.end_time, "color_hex": r.color_hex}
        for r in rows
    ]


@router.post("/shift-types")
def create_shift_type(body: dict, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    _require_manager(current)
    if not body.get("name") or not body.get("start_time") or not body.get("end_time"):
        raise HTTPException(status_code=400, detail="name, start_time, end_time required")
    st = ShiftType(
        clinic_id=current.clinic_id,
        name=body["name"],
        start_time=body["start_time"],
        end_time=body["end_time"],
        color_hex=body.get("color_hex", "#0F2557"),
    )
    db.add(st)
    db.commit()
    db.refresh(st)
    return {"id": st.id}


@router.patch("/shift-types/{shift_id}")
def update_shift_type(shift_id: int, body: dict, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    _require_manager(current)
    st = db.query(ShiftType).filter(ShiftType.id == shift_id, ShiftType.clinic_id == current.clinic_id).first()
    if not st:
        raise HTTPException(status_code=404, detail="Shift type not found")
    for field in ["name", "start_time", "end_time", "color_hex"]:
        if field in body:
            setattr(st, field, body[field])
    db.commit()
    return {"ok": True}


@router.delete("/shift-types/{shift_id}")
def delete_shift_type(shift_id: int, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    _require_manager(current)
    st = db.query(ShiftType).filter(ShiftType.id == shift_id, ShiftType.clinic_id == current.clinic_id).first()
    if not st:
        raise HTTPException(status_code=404, detail="Shift type not found")
    st.is_active = False  # soft delete — entries may reference it
    db.commit()
    return {"ok": True}


# ── Staff list (for group assignment) ─────────────────────────────────────────

@router.get("/staff")
def list_clinic_staff(db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    _require_manager(current)
    rows = db.query(Staff).filter(
        Staff.clinic_id == current.clinic_id, Staff.is_active == True  # noqa: E712
    ).order_by(Staff.full_name).all()
    return [
        {"id": s.id, "full_name": s.full_name, "role": s.role, "email": s.email, "mobile": s.mobile}
        for s in rows
    ]


# ── Groups ────────────────────────────────────────────────────────────────────

@router.get("/groups")
def list_groups(db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    _require_manager(current)
    visible = _visible_group_ids(db, current)
    q = db.query(StaffGroup).filter(StaffGroup.clinic_id == current.clinic_id)
    if visible is not None:
        q = q.filter(StaffGroup.id.in_(visible)) if visible else q.filter(False)
    return [_group_dict(g, db) for g in q.order_by(StaffGroup.name).all()]


@router.post("/groups")
def create_group(body: dict, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    _require_manager(current)
    if not body.get("name"):
        raise HTTPException(status_code=400, detail="name required")
    g = StaffGroup(
        clinic_id=current.clinic_id,
        name=body["name"],
        department_id=body.get("department_id"),
        # managers own groups they create; admin can assign explicitly
        manager_id=body.get("manager_id") if current.role == "clinic_admin" else current.id,
    )
    db.add(g)
    db.commit()
    db.refresh(g)
    return {"id": g.id}


@router.patch("/groups/{group_id}")
def update_group(group_id: int, body: dict, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    _require_manager(current)
    g = db.query(StaffGroup).filter(StaffGroup.id == group_id, StaffGroup.clinic_id == current.clinic_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    if "name" in body:
        g.name = body["name"]
    if "department_id" in body:
        g.department_id = body["department_id"]
    if "manager_id" in body and current.role == "clinic_admin":
        g.manager_id = body["manager_id"]
    db.commit()
    return {"ok": True}


@router.delete("/groups/{group_id}")
def delete_group(group_id: int, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    _require_manager(current)
    g = db.query(StaffGroup).filter(StaffGroup.id == group_id, StaffGroup.clinic_id == current.clinic_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    db.delete(g)
    db.commit()
    return {"ok": True}


@router.post("/groups/{group_id}/members")
def add_members(group_id: int, body: dict, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    _require_manager(current)
    g = db.query(StaffGroup).filter(StaffGroup.id == group_id, StaffGroup.clinic_id == current.clinic_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    staff_ids = body.get("staff_ids", [])
    existing = {m.staff_id for m in g.members}
    added = 0
    for sid in staff_ids:
        if sid not in existing:
            db.add(StaffGroupMember(group_id=group_id, staff_id=sid))
            added += 1
    db.commit()
    return {"added": added}


@router.delete("/groups/{group_id}/members/{staff_id}")
def remove_member(group_id: int, staff_id: int, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    _require_manager(current)
    m = db.query(StaffGroupMember).filter(
        StaffGroupMember.group_id == group_id, StaffGroupMember.staff_id == staff_id
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(m)
    db.commit()
    return {"ok": True}


# ── Schedule grid ─────────────────────────────────────────────────────────────

@router.get("/schedule")
def get_schedule(
    start: date = Query(...),
    end: date = Query(...),
    group_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    _require_manager(current)
    q = db.query(ScheduleEntry).filter(
        ScheduleEntry.clinic_id == current.clinic_id,
        ScheduleEntry.work_date >= start,
        ScheduleEntry.work_date <= end,
    )
    if group_id:
        q = q.filter(ScheduleEntry.group_id == group_id)
    entries = [_entry_dict(e) for e in q.all()]

    leaves = db.query(LeaveRequest).filter(
        LeaveRequest.clinic_id == current.clinic_id,
        LeaveRequest.status == "approved",
        LeaveRequest.from_date <= end,
        LeaveRequest.to_date >= start,
    ).all()

    return {"entries": entries, "leaves": [_leave_dict(lv) for lv in leaves]}


def _conflicts_for(db: Session, clinic_id: int, staff_id: int, work_date: date,
                   settings: SchedulerSettings) -> Optional[str]:
    """Return a conflict reason string, or None if assignment is allowed."""
    on_leave = db.query(LeaveRequest).filter(
        LeaveRequest.clinic_id == clinic_id,
        LeaveRequest.staff_id == staff_id,
        LeaveRequest.status == "approved",
        LeaveRequest.from_date <= work_date,
        LeaveRequest.to_date >= work_date,
    ).first()
    if on_leave:
        return f"On approved {on_leave.leave_type} leave"

    same_day = db.query(ScheduleEntry).filter(
        ScheduleEntry.clinic_id == clinic_id,
        ScheduleEntry.staff_id == staff_id,
        ScheduleEntry.work_date == work_date,
    ).count()
    if same_day >= 1:
        return "Already has a shift this day"

    week_start = work_date - timedelta(days=work_date.weekday())
    week_count = db.query(ScheduleEntry).filter(
        ScheduleEntry.clinic_id == clinic_id,
        ScheduleEntry.staff_id == staff_id,
        ScheduleEntry.work_date >= week_start,
        ScheduleEntry.work_date <= week_start + timedelta(days=6),
    ).count()
    if settings.max_shifts_per_week and week_count >= settings.max_shifts_per_week:
        return f"Already at max {settings.max_shifts_per_week} shifts this week"

    return None


@router.post("/schedule/entries")
def create_entries(body: dict, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    """Bulk-assign shifts. body: {entries: [{staff_id, group_id, shift_type_id, work_date}], force: bool}"""
    _require_manager(current)
    settings = _get_settings(db, current.clinic_id)
    force = body.get("force", False)
    results = []
    for item in body.get("entries", []):
        wd = date.fromisoformat(item["work_date"])
        conflict = _conflicts_for(db, current.clinic_id, item["staff_id"], wd, settings)
        if conflict and not force:
            results.append({"ok": False, "work_date": item["work_date"],
                            "staff_id": item["staff_id"], "error": conflict})
            continue
        entry = ScheduleEntry(
            clinic_id=current.clinic_id,
            group_id=item.get("group_id"),
            staff_id=item["staff_id"],
            shift_type_id=item["shift_type_id"],
            work_date=wd,
            status="draft",
            notes=item.get("notes"),
            created_by=current.id,
        )
        db.add(entry)
        db.flush()
        results.append({"ok": True, "id": entry.id, "work_date": item["work_date"],
                        "staff_id": item["staff_id"], "warning": conflict if force else None})
    db.commit()
    return {"results": results}


@router.delete("/schedule/entries/{entry_id}")
def delete_entry(entry_id: int, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    _require_manager(current)
    e = db.query(ScheduleEntry).filter(
        ScheduleEntry.id == entry_id, ScheduleEntry.clinic_id == current.clinic_id
    ).first()
    if not e:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(e)
    db.commit()
    return {"ok": True}


# ── Publish ───────────────────────────────────────────────────────────────────

WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


@router.post("/schedule/publish")
def publish_schedule(
    body: dict,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """body: {start, end, group_id?} — mark draft entries published + email each staff their week."""
    _require_manager(current)
    start = date.fromisoformat(body["start"])
    end = date.fromisoformat(body["end"])
    group_id = body.get("group_id")

    q = db.query(ScheduleEntry).filter(
        ScheduleEntry.clinic_id == current.clinic_id,
        ScheduleEntry.work_date >= start,
        ScheduleEntry.work_date <= end,
    )
    if group_id:
        q = q.filter(ScheduleEntry.group_id == group_id)
    entries = q.all()
    if not entries:
        raise HTTPException(status_code=400, detail="No entries to publish in this range")

    for e in entries:
        e.status = "published"

    clinic = db.query(Clinic).filter(Clinic.id == current.clinic_id).first()
    clinic_name = (clinic.brand_name or clinic.name) if clinic else "Your Clinic"

    # Group shifts per staff for the notification email
    by_staff = {}
    for e in entries:
        by_staff.setdefault(e.staff_id, []).append(e)

    recipients = []
    for staff_id, staff_entries in by_staff.items():
        st = db.query(Staff).filter(Staff.id == staff_id).first()
        if not st:
            continue
        shifts = [
            {
                "date": e.work_date.strftime("%d %b"),
                "day": WEEKDAYS[e.work_date.weekday()],
                "shift": e.shift_type.name if e.shift_type else "Shift",
                "time": f"{e.shift_type.start_time}–{e.shift_type.end_time}" if e.shift_type else "",
            }
            for e in sorted(staff_entries, key=lambda x: x.work_date)
        ]
        sent = False
        if st.email:
            background.add_task(
                send_schedule_email, st.email, st.full_name, clinic_name,
                start.strftime("%d %b"), end.strftime("%d %b"), shifts,
            )
            sent = True
        if st.mobile:
            background.add_task(send_whatsapp_schedule, st.mobile, st.full_name, shifts)
        recipients.append({"staff_id": staff_id, "name": st.full_name,
                           "email": st.email, "sent": sent})

    log = SchedulePublishLog(
        clinic_id=current.clinic_id,
        group_id=group_id,
        week_start=start,
        week_end=end,
        published_by=current.id,
        recipients=recipients,
    )
    db.add(log)
    db.commit()
    return {"published": len(entries), "notified": len(recipients)}


@router.get("/publish-log")
def publish_log(db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    _require_manager(current)
    rows = db.query(SchedulePublishLog).filter(
        SchedulePublishLog.clinic_id == current.clinic_id
    ).order_by(SchedulePublishLog.published_at.desc()).limit(50).all()
    out = []
    for r in rows:
        publisher = db.query(Staff).filter(Staff.id == r.published_by).first()
        group = db.query(StaffGroup).filter(StaffGroup.id == r.group_id).first() if r.group_id else None
        out.append({
            "id": r.id,
            "week_start": r.week_start.isoformat(),
            "week_end": r.week_end.isoformat(),
            "group_name": group.name if group else "All groups",
            "published_by": publisher.full_name if publisher else None,
            "published_at": r.published_at,
            "recipients": r.recipients or [],
        })
    return out


# ── Leaves ────────────────────────────────────────────────────────────────────

@router.get("/leaves")
def list_leaves(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    _require_manager(current)
    q = db.query(LeaveRequest).filter(LeaveRequest.clinic_id == current.clinic_id)
    if status:
        q = q.filter(LeaveRequest.status == status)
    return [_leave_dict(lv) for lv in q.order_by(LeaveRequest.created_at.desc()).limit(200).all()]


@router.post("/leaves")
def create_leave(body: dict, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    """Manager files leave on behalf of staff (phone requests), or staff files their own."""
    staff_id = body.get("staff_id") or current.id
    if staff_id != current.id:
        _require_manager(current)
    lv = LeaveRequest(
        clinic_id=current.clinic_id,
        staff_id=staff_id,
        leave_type=body.get("leave_type", "casual"),
        from_date=date.fromisoformat(body["from_date"]),
        to_date=date.fromisoformat(body["to_date"]),
        reason=body.get("reason"),
        # manager-filed leave is auto-approved
        status="approved" if (current.role in MANAGER_ROLES and body.get("auto_approve")) else "pending",
        decided_by=current.id if (current.role in MANAGER_ROLES and body.get("auto_approve")) else None,
        decided_at=datetime.utcnow() if (current.role in MANAGER_ROLES and body.get("auto_approve")) else None,
    )
    db.add(lv)
    db.commit()
    db.refresh(lv)
    return {"id": lv.id, "status": lv.status}


@router.patch("/leaves/{leave_id}")
def decide_leave(leave_id: int, body: dict, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    """body: {status: approved|rejected, decision_note?}"""
    _require_manager(current)
    lv = db.query(LeaveRequest).filter(
        LeaveRequest.id == leave_id, LeaveRequest.clinic_id == current.clinic_id
    ).first()
    if not lv:
        raise HTTPException(status_code=404, detail="Leave request not found")
    new_status = body.get("status")
    if new_status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="status must be approved or rejected")
    lv.status = new_status
    lv.decided_by = current.id
    lv.decided_at = datetime.utcnow()
    lv.decision_note = body.get("decision_note")
    db.commit()
    return {"ok": True}


@router.get("/leaves/balances")
def leave_balances(db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    _require_manager(current)
    settings = _get_settings(db, current.clinic_id)
    quotas = settings.leave_quotas or DEFAULT_LEAVE_QUOTAS
    year_start = date(date.today().year, 1, 1)

    staff_rows = db.query(Staff).filter(
        Staff.clinic_id == current.clinic_id, Staff.is_active == True  # noqa: E712
    ).all()
    out = []
    for st in staff_rows:
        used = {}
        leaves = db.query(LeaveRequest).filter(
            LeaveRequest.staff_id == st.id,
            LeaveRequest.status == "approved",
            LeaveRequest.from_date >= year_start,
        ).all()
        for lv in leaves:
            days = (lv.to_date - lv.from_date).days + 1
            used[lv.leave_type] = used.get(lv.leave_type, 0) + days
        out.append({
            "staff_id": st.id,
            "full_name": st.full_name,
            "role": st.role,
            "quotas": quotas,
            "used": used,
        })
    return out


# ── Patterns ──────────────────────────────────────────────────────────────────

@router.get("/patterns")
def list_patterns(db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    _require_manager(current)
    rows = db.query(SchedulePattern).filter(
        SchedulePattern.clinic_id == current.clinic_id
    ).order_by(SchedulePattern.created_at.desc()).all()
    out = []
    for r in rows:
        group = db.query(StaffGroup).filter(StaffGroup.id == r.group_id).first() if r.group_id else None
        out.append({
            "id": r.id,
            "name": r.name,
            "recurrence": r.recurrence,
            "group_id": r.group_id,
            "group_name": group.name if group else "All groups",
            "entry_count": len(r.pattern_data or []),
            "created_at": r.created_at,
        })
    return out


@router.post("/patterns")
def save_pattern(body: dict, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    """Save a week as a reusable pattern.
    body: {name, recurrence, group_id?, week_start} — captures that week's entries as weekday templates."""
    _require_manager(current)
    if not body.get("name") or not body.get("week_start"):
        raise HTTPException(status_code=400, detail="name and week_start required")
    start = date.fromisoformat(body["week_start"])
    end = start + timedelta(days=6)

    q = db.query(ScheduleEntry).filter(
        ScheduleEntry.clinic_id == current.clinic_id,
        ScheduleEntry.work_date >= start,
        ScheduleEntry.work_date <= end,
    )
    if body.get("group_id"):
        q = q.filter(ScheduleEntry.group_id == body["group_id"])
    entries = q.all()
    if not entries:
        raise HTTPException(status_code=400, detail="No entries in that week to save")

    pattern_data = [
        {"staff_id": e.staff_id, "weekday": e.work_date.weekday(),
         "shift_type_id": e.shift_type_id, "group_id": e.group_id}
        for e in entries
    ]
    p = SchedulePattern(
        clinic_id=current.clinic_id,
        group_id=body.get("group_id"),
        name=body["name"],
        recurrence=body.get("recurrence", "manual"),
        pattern_data=pattern_data,
        created_by=current.id,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"id": p.id, "entries_saved": len(pattern_data)}


@router.post("/patterns/{pattern_id}/apply")
def apply_pattern(pattern_id: int, body: dict, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    """body: {week_start} — applies the pattern onto that week as draft entries (skips conflicts)."""
    _require_manager(current)
    p = db.query(SchedulePattern).filter(
        SchedulePattern.id == pattern_id, SchedulePattern.clinic_id == current.clinic_id
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pattern not found")
    week_start = date.fromisoformat(body["week_start"])
    if week_start.weekday() != 0:
        week_start = week_start - timedelta(days=week_start.weekday())

    settings = _get_settings(db, current.clinic_id)
    created, skipped = 0, []
    for item in (p.pattern_data or []):
        wd = week_start + timedelta(days=item["weekday"])
        conflict = _conflicts_for(db, current.clinic_id, item["staff_id"], wd, settings)
        if conflict:
            skipped.append({"staff_id": item["staff_id"], "date": wd.isoformat(), "reason": conflict})
            continue
        db.add(ScheduleEntry(
            clinic_id=current.clinic_id,
            group_id=item.get("group_id"),
            staff_id=item["staff_id"],
            shift_type_id=item["shift_type_id"],
            work_date=wd,
            status="draft",
            created_by=current.id,
        ))
        db.flush()
        created += 1
    db.commit()
    return {"created": created, "skipped": skipped}


@router.delete("/patterns/{pattern_id}")
def delete_pattern(pattern_id: int, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    _require_manager(current)
    p = db.query(SchedulePattern).filter(
        SchedulePattern.id == pattern_id, SchedulePattern.clinic_id == current.clinic_id
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pattern not found")
    db.delete(p)
    db.commit()
    return {"ok": True}


# ── Doctor Availability (weekly schedule + blocked slots) ─────────────────────

from app.models.models import DoctorProfile, DoctorSchedule
from pydantic import BaseModel as _BM
from typing import Any, Dict


class AvailabilityPayload(_BM):
    schedule: Dict[str, Any]       # { "Monday": {start_time, end_time, slot_duration, blocked, breaks, ...} }
    blocked_slots: list = []       # [{date, start, end, reason}]


@router.get("/availability")
def get_availability(db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    profile = db.query(DoctorProfile).filter(DoctorProfile.staff_id == current.id).first()
    if not profile:
        return {"schedule": {}, "blocked_slots": []}

    rows = db.query(DoctorSchedule).filter(
        DoctorSchedule.doctor_id == profile.id,
        DoctorSchedule.is_active == True,
    ).all()

    schedule = {}
    for r in rows:
        day = r.day_of_week.title()   # "monday" → "Monday"
        schedule[day] = {
            "start_time":          r.start_time,
            "end_time":            r.end_time,
            "slot_duration":       r.slot_minutes,
            "blocked":             False,
            "online_booking":      False,
            "online_window_start": r.start_time,
            "online_window_end":   r.end_time,
            "breaks":              [],
        }

    # Merge richer data stored in working_hours JSONB
    wh = profile.working_hours or {}
    for day, data in wh.get("schedule", {}).items():
        if day not in schedule:
            schedule[day] = data
        else:
            schedule[day].update(data)

    blocked_slots = wh.get("blocked_slots", [])
    return {"schedule": schedule, "blocked_slots": blocked_slots}


@router.put("/availability")
def save_availability(
    payload: AvailabilityPayload,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    profile = db.query(DoctorProfile).filter(DoctorProfile.staff_id == current.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Doctor profile not found. Contact your clinic admin.")

    DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    # Upsert DoctorSchedule rows for non-blocked days
    for day in DAYS:
        day_data = payload.schedule.get(day, {})
        existing = db.query(DoctorSchedule).filter(
            DoctorSchedule.doctor_id == profile.id,
            DoctorSchedule.day_of_week == day.lower(),
        ).first()

        is_blocked = day_data.get("blocked", False)

        if is_blocked:
            if existing:
                existing.is_active = False
        else:
            start = day_data.get("start_time", "09:00")
            end   = day_data.get("end_time", "17:00")
            slot  = int(day_data.get("slot_duration", 15))
            if existing:
                existing.start_time   = start
                existing.end_time     = end
                existing.slot_minutes = slot
                existing.is_active    = True
            else:
                db.add(DoctorSchedule(
                    doctor_id    = profile.id,
                    day_of_week  = day.lower(),
                    start_time   = start,
                    end_time     = end,
                    slot_minutes = slot,
                    is_active    = True,
                ))

    # Persist full rich schedule + blocked_slots in working_hours JSONB
    wh = profile.working_hours or {}
    wh["schedule"]      = payload.schedule
    wh["blocked_slots"] = payload.blocked_slots
    from sqlalchemy import text as _text
    from app.db.session import engine as _engine
    # Use ORM update (working_hours is a JSONB column added via ALTER TABLE)
    db.execute(
        _text("UPDATE doctor_profiles SET working_hours = :wh::jsonb WHERE id = :id"),
        {"wh": __import__("json").dumps(wh), "id": profile.id},
    )

    db.commit()
    return {"ok": True, "days_saved": len(payload.schedule), "blocked_slots": len(payload.blocked_slots)}
