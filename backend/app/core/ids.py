"""
Centralized identifier generation for Bharath Health Systems.

Every human-readable business identifier — Health Center ID, Branch code,
Employee ID, Encounter number — and the previously COUNT-based order/invoice
numbers are minted here through a single atomic counter table (``id_sequences``)
so they never collide under concurrency.

Design
------
* ``id_sequences(scope_type, scope_id, kind, next_val)`` holds exactly one
  counter row per ``(scope_type, scope_id, kind)``. ``next_val`` is the NEXT
  value to hand out.
* :func:`next_sequence` inserts the row if missing (optionally seeded), locks it
  ``FOR UPDATE``, returns the current value and increments — mirroring the
  atomic row-lock pattern already used for BH IDs in ``auth.py``.
* ``scope_id = 0`` is reserved for global counters (e.g. HC IDs).
* Globally-prefixed keys embed the clinic's HC ID, e.g. ``HC00001-DR0001``.

This module is purely additive. It never renames, reuses or deletes an existing
identifier; the increment participates in the caller's transaction, so a minted
number commits atomically with the row that consumes it.
"""
from datetime import datetime

from sqlalchemy import text
from sqlalchemy.orm import Session

# ─── Role → employee-ID prefix map ────────────────────────────────────────────
# Doctors → DR, clinic managers → MG, clinic admins → MR (per product owner).
# The remainder are the agreed best-fit two-letter codes. Any future/unmapped
# role falls back to EM so generation never fails.
ROLE_PREFIX = {
    "doctor":         "DR",
    "clinic_manager": "MG",
    "clinic_admin":   "MR",
    "nurse":          "NR",
    "receptionist":   "RC",
    "pharmacist":     "PH",
    "lab_technician": "LB",
    "lab_tech":       "LB",
    "imaging_tech":   "IM",
    "pathologist":    "PT",
    "radiologist":    "RD",
}
DEFAULT_EMP_PREFIX = "EM"


# ─── Atomic counter ───────────────────────────────────────────────────────────
def next_sequence(db: Session, scope_type: str, scope_id: int, kind: str,
                  seed_val: int = 0) -> int:
    """Atomically return the next integer for ``(scope_type, scope_id, kind)``.

    The counter row is created on first use (seeded to ``seed_val + 1`` so a
    freshly-converted legacy generator continues above its current maximum) and
    then locked ``FOR UPDATE`` on every call, so concurrent requests can never
    receive the same value.
    """
    scope_id = scope_id or 0
    start = (seed_val or 0) + 1
    db.execute(text(
        "INSERT INTO id_sequences (scope_type, scope_id, kind, next_val) "
        "VALUES (:st, :sid, :k, :start) "
        "ON CONFLICT (scope_type, scope_id, kind) DO NOTHING"
    ), {"st": scope_type, "sid": scope_id, "k": kind, "start": start})
    row = db.execute(text(
        "SELECT next_val FROM id_sequences "
        "WHERE scope_type = :st AND scope_id = :sid AND kind = :k FOR UPDATE"
    ), {"st": scope_type, "sid": scope_id, "k": kind}).first()
    current = int(row[0])
    db.execute(text(
        "UPDATE id_sequences SET next_val = next_val + 1, updated_at = NOW() "
        "WHERE scope_type = :st AND scope_id = :sid AND kind = :k"
    ), {"st": scope_type, "sid": scope_id, "k": kind})
    return current


# ─── Health Center ID (global) ────────────────────────────────────────────────
def make_hc_id(seq: int) -> str:
    return f"HC{seq:05d}"


def next_hc_id(db: Session) -> str:
    """Mint the next global Health Center ID, e.g. ``HC00001``."""
    return make_hc_id(next_sequence(db, "global", 0, "hc_id"))


def ensure_hc_id(db: Session, clinic) -> str:
    """Return ``clinic.hc_id``, minting and assigning one if absent.

    Used everywhere a globally-prefixed child key is built, so a clinic that
    predates HC-ID assignment still yields a valid prefix on demand.
    """
    existing = getattr(clinic, "hc_id", None)
    if existing:
        return existing
    hc = next_hc_id(db)
    clinic.hc_id = hc
    db.flush()
    return hc


def ensure_hc_id_by_clinic_id(db: Session, clinic_id: int) -> str:
    """Return the clinic's HC ID by id, minting + persisting one if absent.

    Lets a wiring site that only holds a ``clinic_id`` obtain a guaranteed
    HC-ID prefix in one call (raw SQL, no ORM object required)."""
    row = db.execute(text("SELECT hc_id FROM clinics WHERE id = :c"),
                     {"c": clinic_id}).first()
    if row and row[0]:
        return row[0]
    hc = next_hc_id(db)
    db.execute(text("UPDATE clinics SET hc_id = :h WHERE id = :c"),
               {"h": hc, "c": clinic_id})
    return hc


# ─── Branch code (per clinic) ─────────────────────────────────────────────────
def next_branch_code(db: Session, clinic_id: int, hc_id: str) -> str:
    """e.g. ``HC00001-B01`` — a per-clinic running branch number."""
    seq = next_sequence(db, "clinic", clinic_id, "branch_code")
    return f"{hc_id}-B{seq:02d}"


# ─── Employee ID (per clinic, per role) ───────────────────────────────────────
def emp_prefix_for_role(role: str) -> str:
    return ROLE_PREFIX.get((role or "").strip().lower(), DEFAULT_EMP_PREFIX)


def next_employee_id(db: Session, clinic_id: int, hc_id: str, role: str) -> str:
    """e.g. ``HC00001-DR0001`` — per-clinic, per-role running employee number."""
    prefix = emp_prefix_for_role(role)
    seq = next_sequence(db, "clinic", clinic_id, f"emp_{prefix}")
    return f"{hc_id}-{prefix}{seq:04d}"


# ─── Encounter number (per clinic, spans OPD appointments + IPD admissions) ────
def next_encounter_no(db: Session, clinic_id: int, hc_id: str) -> str:
    """e.g. ``HC00001-ENC-000123`` — one unified key for every visit/stay."""
    seq = next_sequence(db, "clinic", clinic_id, "encounter")
    return f"{hc_id}-ENC-{seq:06d}"


# ─── MRN prefix derivation (auto from org name, editable) ─────────────────────
_NON_ALPHA = None  # lazy regex compile guard


def derive_mrn_prefix(db: Session, name: str, exclude_clinic_id: int = 0) -> str:
    """Suggest a unique 3-letter MRN prefix from the organization name.

    ``'Apollo Clinic' -> 'APO'``. Uniqueness is enforced against
    ``clinics.clinic_prefix`` (case-insensitive) by varying the trailing
    character, so the value is safe to assign immediately while remaining
    editable by the clinic until their first patient is registered.
    """
    import re
    base = re.sub(r"[^A-Za-z]", "", name or "").upper()
    base = (base + "CLN")[:3]            # pad short / empty names to 3 chars
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    candidates = [base]
    candidates += [base[:2] + c for c in alphabet]       # vary 3rd char
    candidates += [base[:1] + c + base[2:3] for c in alphabet]  # vary 2nd char
    for cand in candidates:
        taken = db.execute(text(
            "SELECT 1 FROM clinics WHERE UPPER(clinic_prefix) = :p "
            "AND id <> :cid LIMIT 1"
        ), {"p": cand, "cid": exclude_clinic_id or 0}).first()
        if not taken:
            return cand
    return base  # pathological fallback (every variant taken)


# ─── Atomic conversions of the legacy COUNT-based generators ──────────────────
# Each preserves its EXISTING format and scope; the only change is that the
# counter is now a locked row instead of a racy COUNT(*). On first use after
# deploy the row self-seeds from the current COUNT so numbering never regresses.
def next_lab_order_no(db: Session, clinic_id: int) -> str:
    seed = db.execute(text(
        "SELECT COUNT(*) FROM lab_orders WHERE clinic_id = :c"
    ), {"c": clinic_id}).scalar() or 0
    n = next_sequence(db, "clinic", clinic_id, "lab_order", seed_val=seed)
    return f"LAB-{n:05d}"


def next_imaging_order_no(db: Session, clinic_id: int) -> str:
    seed = db.execute(text(
        "SELECT COUNT(*) FROM imaging_orders WHERE clinic_id = :c"
    ), {"c": clinic_id}).scalar() or 0
    n = next_sequence(db, "clinic", clinic_id, "imaging_order", seed_val=seed)
    return f"IMG-{n:05d}"


def next_invoice_no(db: Session) -> str:
    """Standard monthly invoice number ``INV<YYYY><MM><NNNN>``.

    Preserves the legacy GLOBAL-per-month scope (counter shared across clinics)
    so existing numbering is unchanged — only the race is removed.
    """
    now = datetime.now()
    period = f"{now.year}{now.month:02d}"
    prefix = f"INV{period}"
    seed = db.execute(text(
        "SELECT COUNT(*) FROM invoices WHERE invoice_number LIKE :p"
    ), {"p": prefix + "%"}).scalar() or 0
    n = next_sequence(db, "global", 0, f"invoice_{period}", seed_val=seed)
    return f"{prefix}{n:04d}"


def next_clinic_invoice_no(db: Session, clinic_id: int) -> str:
    """Per-clinic monthly invoice number ``INV<YYYY><MM><NNNN>`` (clinic_billing
    scope — counter is per clinic, unlike :func:`next_invoice_no`)."""
    now = datetime.now()
    period = f"{now.year}{now.month:02d}"
    prefix = f"INV{period}"
    seed = db.execute(text(
        "SELECT COUNT(*) FROM invoices WHERE invoice_number LIKE :p AND clinic_id = :c"
    ), {"p": prefix + "%", "c": clinic_id}).scalar() or 0
    n = next_sequence(db, "clinic", clinic_id, f"invoice_{period}", seed_val=seed)
    return f"{prefix}{n:04d}"


def next_rx_invoice_no(db: Session, clinic_id: int) -> str:
    """Pharmacy RX invoice number ``RX-<clinic_id>-<NNNNNN>`` (per clinic)."""
    seed = db.execute(text(
        "SELECT COUNT(*) FROM invoices WHERE clinic_id = :c"
    ), {"c": clinic_id}).scalar() or 0
    n = next_sequence(db, "clinic", clinic_id, "invoice_rx", seed_val=seed)
    return f"RX-{clinic_id}-{n:06d}"


def next_po_no(db: Session, clinic_id: int) -> str:
    """Purchase order number ``BH-PO-<YYYYMMDD>-<NNN>`` (per clinic, per day)."""
    day = datetime.now().strftime("%Y%m%d")
    prefix = f"BH-PO-{day}"
    seed = db.execute(text(
        "SELECT COUNT(*) FROM purchase_orders "
        "WHERE po_number LIKE :p AND clinic_id = :c"
    ), {"p": prefix + "%", "c": clinic_id}).scalar() or 0
    n = next_sequence(db, "clinic", clinic_id, f"po_{day}", seed_val=seed)
    return f"{prefix}-{n:03d}"


def next_return_no(db: Session, clinic_id: int) -> str:
    """Sales return / credit note ``CR<YYYYMMDD><NNNN>`` (per clinic, per day)."""
    day = datetime.now().strftime("%Y%m%d")
    prefix = f"CR{day}"
    seed = db.execute(text(
        "SELECT COUNT(*) FROM sales_returns "
        "WHERE return_number LIKE :p AND clinic_id = :c"
    ), {"p": prefix + "%", "c": clinic_id}).scalar() or 0
    n = next_sequence(db, "clinic", clinic_id, f"return_{day}", seed_val=seed)
    return f"{prefix}{n:04d}"


# ─── Doctor identity bridge ───────────────────────────────────────────────────
def resolve_doctor(db: Session, *, staff_id: int = None, profile_id: int = None):
    """Resolve a doctor across the two historical FK conventions.

    The schema references doctors as ``staff.id`` in inpatient tables and
    ``doctor_profiles.id`` in outpatient tables. Given either id this returns a
    dict ``{"staff_id", "doctor_profile_id", "clinic_id", "full_name"}`` (or
    ``None``), so callers can move between the two without rewiring any FK.
    """
    if staff_id:
        row = db.execute(text(
            "SELECT s.id, dp.id, s.clinic_id, s.full_name "
            "FROM staff s LEFT JOIN doctor_profiles dp ON dp.staff_id = s.id "
            "WHERE s.id = :sid"
        ), {"sid": staff_id}).first()
    elif profile_id:
        row = db.execute(text(
            "SELECT s.id, dp.id, s.clinic_id, s.full_name "
            "FROM doctor_profiles dp JOIN staff s ON s.id = dp.staff_id "
            "WHERE dp.id = :pid"
        ), {"pid": profile_id}).first()
    else:
        return None
    if not row:
        return None
    return {
        "staff_id":          row[0],
        "doctor_profile_id": row[1],
        "clinic_id":         row[2],
        "full_name":         row[3],
    }
