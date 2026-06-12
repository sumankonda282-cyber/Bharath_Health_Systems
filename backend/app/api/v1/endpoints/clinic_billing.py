from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.security import get_current_staff
from app.db.session import get_db
from app.models.models import (
    Appointment, BillingOverrideRequest, BillingWaiverLog,
    DoctorProfile, InsuranceClaim, Invoice, InvoiceItem,
    InvoicePayment, Patient,
)

router = APIRouter(prefix="/clinic/billing", tags=["clinic-billing"])


def _require_manager(current=Depends(get_current_staff)):
    if current.role not in ("clinic_manager", "clinic_admin", "receptionist"):
        raise HTTPException(403, "Access denied")
    return current


def _inv_number(db, clinic_id: int) -> str:
    from datetime import datetime as dtt
    pfx = f"INV{dtt.now().year}{dtt.now().month:02d}"
    n = db.query(Invoice).filter(
        Invoice.clinic_id == clinic_id,
        Invoice.invoice_number.like(f"{pfx}%"),
    ).count()
    return f"{pfx}{n + 1:04d}"


def _recalc(db, inv: Invoice):
    items = db.query(InvoiceItem).filter(InvoiceItem.invoice_id == inv.id).all()
    sub = sum(Decimal(str(i.unit_price or 0)) * int(i.quantity or 1) for i in items)
    item_disc = sum(Decimal(str(i.discount_amount or 0)) for i in items)
    gst = sum(Decimal(str(i.gst_amount or 0)) for i in items)
    header_disc = Decimal(str(inv.discount or 0))
    inv.subtotal = sub
    inv.gst_amount = gst
    inv.total = max(Decimal("0"), sub - item_disc + gst - header_disc)


# ─── Operations list ──────────────────────────────────────────────────────────

@router.get("/operations")
def operations_list(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    doctor_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    visit_type: Optional[str] = Query(None),
    billing_status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(200),
    db: Session = Depends(get_db),
    current=Depends(_require_manager),
):
    from datetime import date as date_type
    today = date_type.today().isoformat()
    df = date_from or today
    dt = date_to or today

    q = db.query(Appointment).filter(
        Appointment.clinic_id == current.clinic_id,
        Appointment.appointment_date >= df,
        Appointment.appointment_date <= dt,
    )
    if doctor_id:
        q = q.filter(Appointment.doctor_id == doctor_id)
    if status:
        q = q.filter(Appointment.status == status)
    if visit_type:
        q = q.filter(Appointment.visit_type == visit_type)

    appts = q.order_by(
        Appointment.appointment_date.desc(),
        Appointment.appointment_time.desc(),
    ).limit(limit).all()

    rows = []
    for a in appts:
        patient = db.query(Patient).filter(Patient.id == a.patient_id).first() if a.patient_id else None
        doc = db.query(DoctorProfile).filter(DoctorProfile.id == a.doctor_id).first() if a.doctor_id else None
        inv = db.query(Invoice).filter(Invoice.appointment_id == a.id).first()

        if not inv:
            bill_st = "no_invoice"
        elif inv.status == "paid":
            bill_st = "paid"
        else:
            claim = db.query(InsuranceClaim).filter(InsuranceClaim.appointment_id == a.id).first()
            paid = float(inv.amount_paid or 0)
            total = float(inv.total or 0)
            if claim:
                bill_st = f"scheme_{claim.claim_status}"
            elif paid >= total > 0:
                bill_st = "paid"
            elif paid > 0:
                bill_st = "partial"
            else:
                bill_st = "pending"

        if billing_status and not bill_st.startswith(billing_status):
            continue

        p_name = patient.full_name if patient else "—"
        if search and search.lower() not in p_name.lower():
            if not (patient and patient.mobile and search in (patient.mobile or "")):
                continue

        rows.append({
            "appointment_id": a.id,
            "token_number": a.token_number,
            "patient_id": a.patient_id,
            "patient_name": p_name,
            "patient_mobile": patient.mobile if patient else None,
            "bh_id": patient.bh_id if patient else None,
            "date": str(a.appointment_date),
            "time": a.appointment_time,
            "status": a.status,
            "visit_type": a.visit_type or "walk_in",
            "mode": a.mode or "offline",
            "doctor_name": doc.staff.full_name if doc and doc.staff else None,
            "invoice_id": inv.id if inv else None,
            "billing_status": bill_st,
            "total": float(inv.total or 0) if inv else 0,
            "amount_paid": float(inv.amount_paid or 0) if inv else 0,
            "balance": float((inv.total or 0) - (inv.amount_paid or 0)) if inv else 0,
        })

    return rows


# ─── Appointment billing detail ───────────────────────────────────────────────

@router.get("/appointment/{appointment_id}")
def appointment_detail(
    appointment_id: int,
    db: Session = Depends(get_db),
    current=Depends(_require_manager),
):
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.clinic_id == current.clinic_id,
    ).first()
    if not appt:
        raise HTTPException(404, "Appointment not found")

    patient = db.query(Patient).filter(Patient.id == appt.patient_id).first() if appt.patient_id else None
    doc = db.query(DoctorProfile).filter(DoctorProfile.id == appt.doctor_id).first() if appt.doctor_id else None
    inv = db.query(Invoice).filter(Invoice.appointment_id == appointment_id).first()

    items = []
    waivers = []
    payments = []
    if inv:
        for i in inv.items:
            items.append({
                "id": i.id, "description": i.description, "item_type": i.item_type,
                "quantity": i.quantity, "unit_price": float(i.unit_price or 0),
                "discount_amount": float(i.discount_amount or 0),
                "gst_rate": float(i.gst_rate or 0), "gst_amount": float(i.gst_amount or 0),
                "total": float(i.total or 0),
                "source_module": getattr(i, "source_module", "manual") or "manual",
            })
        for w in db.query(BillingWaiverLog).filter(BillingWaiverLog.invoice_id == inv.id).all():
            waivers.append({
                "id": w.id, "waiver_amount": float(w.waiver_amount),
                "reason": w.reason, "notes": w.notes,
                "created_at": w.created_at.isoformat() if w.created_at else None,
            })
        for p in db.query(InvoicePayment).filter(InvoicePayment.invoice_id == inv.id).all():
            payments.append({
                "id": p.id, "amount": float(p.amount), "method": p.method,
                "reference": p.reference, "notes": p.notes,
                "received_at": p.received_at.isoformat() if p.received_at else None,
            })

    claims = []
    for c in db.query(InsuranceClaim).filter(InsuranceClaim.appointment_id == appointment_id).all():
        claims.append({
            "id": c.id, "scheme_category": c.scheme_category, "scheme_name": c.scheme_name,
            "card_number": c.card_number, "policy_holder_name": c.policy_holder_name,
            "tpa_name": c.tpa_name,
            "pre_auth_ref": c.pre_auth_ref, "pre_auth_amount": float(c.pre_auth_amount or 0),
            "pre_auth_status": c.pre_auth_status, "pre_auth_notes": c.pre_auth_notes,
            "pre_auth_submitted_at": c.pre_auth_submitted_at.isoformat() if c.pre_auth_submitted_at else None,
            "claim_ref": c.claim_ref, "claimed_amount": float(c.claimed_amount or 0),
            "approved_amount": float(c.approved_amount or 0), "claim_status": c.claim_status,
            "claim_notes": c.claim_notes,
            "claim_submitted_at": c.claim_submitted_at.isoformat() if c.claim_submitted_at else None,
        })

    overrides = []
    for o in db.query(BillingOverrideRequest).filter(
        BillingOverrideRequest.appointment_id == appointment_id,
        BillingOverrideRequest.clinic_id == current.clinic_id,
    ).all():
        overrides.append({
            "id": o.id, "from_module": o.from_module, "items": o.items,
            "total_amount": float(o.total_amount), "notes": o.notes, "status": o.status,
            "review_notes": o.review_notes,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        })

    return {
        "appointment": {
            "id": appt.id, "date": str(appt.appointment_date), "time": appt.appointment_time,
            "status": appt.status, "visit_type": appt.visit_type, "mode": appt.mode or "offline",
            "reason": appt.reason, "token_number": appt.token_number,
        },
        "patient": {
            "id": patient.id, "full_name": patient.full_name, "mobile": patient.mobile,
            "bh_id": patient.bh_id, "age": patient.age, "gender": patient.gender,
        } if patient else None,
        "doctor": {
            "name": doc.staff.full_name if doc and doc.staff else None,
            "specialty": doc.specialty if doc else None,
        } if doc else None,
        "invoice": {
            "id": inv.id, "invoice_number": inv.invoice_number, "status": inv.status,
            "subtotal": float(inv.subtotal or 0), "discount": float(inv.discount or 0),
            "gst_amount": float(inv.gst_amount or 0), "total": float(inv.total or 0),
            "amount_paid": float(inv.amount_paid or 0),
            "balance": float((inv.total or 0) - (inv.amount_paid or 0)),
            "notes": inv.notes,
        } if inv else None,
        "items": items,
        "waivers": waivers,
        "payments": payments,
        "claims": claims,
        "overrides": overrides,
    }


# ─── Create invoice ───────────────────────────────────────────────────────────

@router.post("/appointment/{appointment_id}/invoice")
def create_invoice(
    appointment_id: int,
    db: Session = Depends(get_db),
    current=Depends(_require_manager),
):
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.clinic_id == current.clinic_id,
    ).first()
    if not appt:
        raise HTTPException(404, "Appointment not found")
    existing = db.query(Invoice).filter(Invoice.appointment_id == appointment_id).first()
    if existing:
        return {"id": existing.id, "invoice_number": existing.invoice_number}
    inv = Invoice(
        clinic_id=current.clinic_id,
        appointment_id=appointment_id,
        patient_id=appt.patient_id,
        invoice_number=_inv_number(db, current.clinic_id),
        status="pending",
        subtotal=0, discount=0, tax=0, gst_amount=0, total=0, amount_paid=0,
    )
    db.add(inv)
    db.commit()
    return {"id": inv.id, "invoice_number": inv.invoice_number}


# ─── Line items ───────────────────────────────────────────────────────────────

@router.post("/invoice/{invoice_id}/items")
def add_item(invoice_id: int, body: dict, db: Session = Depends(get_db), current=Depends(_require_manager)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.clinic_id == current.clinic_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    qty = int(body.get("quantity", 1))
    up = Decimal(str(body.get("unit_price", 0)))
    disc = Decimal(str(body.get("discount_amount", 0)))
    gst_r = Decimal(str(body.get("gst_rate", 0)))
    taxable = up * qty - disc
    gst_a = (taxable * gst_r / 100).quantize(Decimal("0.01"))
    total = taxable + gst_a
    item = InvoiceItem(
        invoice_id=invoice_id,
        description=body.get("description", ""),
        item_type=body.get("item_type", "service"),
        quantity=qty, unit_price=up, discount_amount=disc,
        gst_rate=gst_r, gst_amount=gst_a, total=total,
    )
    db.add(item)
    _recalc(db, inv)
    db.commit()
    return {"id": item.id, "total": float(total)}


@router.put("/invoice/{invoice_id}/items/{item_id}")
def update_item(invoice_id: int, item_id: int, body: dict, db: Session = Depends(get_db), current=Depends(_require_manager)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.clinic_id == current.clinic_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    item = db.query(InvoiceItem).filter(InvoiceItem.id == item_id, InvoiceItem.invoice_id == invoice_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    for f in ("description", "item_type", "quantity", "unit_price", "discount_amount", "gst_rate"):
        if f in body:
            setattr(item, f, body[f])
    qty = int(item.quantity or 1)
    up = Decimal(str(item.unit_price or 0))
    disc = Decimal(str(item.discount_amount or 0))
    gst_r = Decimal(str(item.gst_rate or 0))
    taxable = up * qty - disc
    item.gst_amount = (taxable * gst_r / 100).quantize(Decimal("0.01"))
    item.total = taxable + item.gst_amount
    _recalc(db, inv)
    db.commit()
    return {"message": "Updated"}


@router.delete("/invoice/{invoice_id}/items/{item_id}")
def delete_item(invoice_id: int, item_id: int, db: Session = Depends(get_db), current=Depends(_require_manager)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.clinic_id == current.clinic_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    item = db.query(InvoiceItem).filter(InvoiceItem.id == item_id, InvoiceItem.invoice_id == invoice_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    db.delete(item)
    _recalc(db, inv)
    db.commit()
    return {"message": "Deleted"}


# ─── Waiver ───────────────────────────────────────────────────────────────────

@router.post("/invoice/{invoice_id}/waiver")
def apply_waiver(invoice_id: int, body: dict, db: Session = Depends(get_db), current=Depends(_require_manager)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.clinic_id == current.clinic_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    amount = Decimal(str(body.get("waiver_amount", 0)))
    reason = body.get("reason", "")
    if not reason:
        raise HTTPException(400, "Reason required")
    if amount <= 0:
        raise HTTPException(400, "Amount must be positive")
    db.add(BillingWaiverLog(
        invoice_id=invoice_id, clinic_id=current.clinic_id, waived_by=current.id,
        waiver_amount=amount, reason=reason, notes=body.get("notes", ""),
    ))
    inv.discount = Decimal(str(inv.discount or 0)) + amount
    inv.total = max(Decimal("0"), Decimal(str(inv.total or 0)) - amount)
    db.commit()
    return {"message": "Waiver applied", "new_total": float(inv.total)}


# ─── Payments ─────────────────────────────────────────────────────────────────

@router.post("/invoice/{invoice_id}/payment")
def add_payment(invoice_id: int, body: dict, db: Session = Depends(get_db), current=Depends(_require_manager)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.clinic_id == current.clinic_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    amount = Decimal(str(body.get("amount", 0)))
    if amount <= 0:
        raise HTTPException(400, "Amount must be positive")
    db.add(InvoicePayment(
        invoice_id=invoice_id, clinic_id=current.clinic_id,
        amount=amount, method=body.get("method", "cash"),
        reference=body.get("reference", ""), notes=body.get("notes", ""),
        received_by=current.id,
    ))
    inv.amount_paid = Decimal(str(inv.amount_paid or 0)) + amount
    if inv.amount_paid >= inv.total:
        inv.status = "paid"
        inv.paid_at = datetime.utcnow()
        inv.payment_method = body.get("method", "cash")
    else:
        inv.status = "partial"
    db.commit()
    return {
        "message": "Payment recorded",
        "amount_paid": float(inv.amount_paid),
        "balance": float(max(Decimal("0"), (inv.total or Decimal("0")) - inv.amount_paid)),
        "status": inv.status,
    }


# ─── Insurance / Scheme claims ────────────────────────────────────────────────

@router.post("/insurance-claim")
def create_claim(body: dict, db: Session = Depends(get_db), current=Depends(_require_manager)):
    if not body.get("patient_id") or not body.get("scheme_name") or not body.get("scheme_category"):
        raise HTTPException(400, "patient_id, scheme_category and scheme_name required")
    claim = InsuranceClaim(
        clinic_id=current.clinic_id,
        invoice_id=body.get("invoice_id"),
        appointment_id=body.get("appointment_id"),
        patient_id=body["patient_id"],
        scheme_category=body["scheme_category"],
        scheme_name=body["scheme_name"],
        card_number=body.get("card_number"),
        policy_holder_name=body.get("policy_holder_name"),
        tpa_name=body.get("tpa_name"),
        pre_auth_amount=body.get("pre_auth_amount"),
        claim_status="draft",
        created_by=current.id,
    )
    db.add(claim)
    db.commit()
    return {"id": claim.id, "message": "Claim created"}


@router.put("/insurance-claim/{claim_id}")
def update_claim(claim_id: int, body: dict, db: Session = Depends(get_db), current=Depends(_require_manager)):
    claim = db.query(InsuranceClaim).filter(
        InsuranceClaim.id == claim_id,
        InsuranceClaim.clinic_id == current.clinic_id,
    ).first()
    if not claim:
        raise HTTPException(404, "Claim not found")
    for f in (
        "scheme_name", "scheme_category", "card_number", "policy_holder_name", "tpa_name",
        "pre_auth_ref", "pre_auth_amount", "pre_auth_status", "pre_auth_notes",
        "claim_ref", "claimed_amount", "approved_amount", "claim_status", "claim_notes",
    ):
        if f in body:
            setattr(claim, f, body[f])
    if body.get("pre_auth_status") and not claim.pre_auth_submitted_at:
        claim.pre_auth_submitted_at = datetime.utcnow()
    if body.get("pre_auth_status") in ("approved", "rejected", "partial"):
        claim.pre_auth_decided_at = datetime.utcnow()
    if body.get("claim_status") == "submitted" and not claim.claim_submitted_at:
        claim.claim_submitted_at = datetime.utcnow()
    if body.get("claim_status") in ("approved", "rejected", "partial", "paid"):
        claim.claim_decided_at = datetime.utcnow()
    db.commit()
    return {"message": "Updated"}


# ─── Override requests ────────────────────────────────────────────────────────

@router.get("/override-requests")
def list_overrides(
    status: str = Query("pending"),
    db: Session = Depends(get_db),
    current=Depends(_require_manager),
):
    rows = db.query(BillingOverrideRequest).filter(
        BillingOverrideRequest.clinic_id == current.clinic_id,
        BillingOverrideRequest.status == status,
    ).order_by(BillingOverrideRequest.created_at.desc()).all()
    return [{
        "id": r.id, "appointment_id": r.appointment_id, "patient_id": r.patient_id,
        "from_module": r.from_module, "items": r.items,
        "total_amount": float(r.total_amount), "notes": r.notes, "status": r.status,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in rows]


@router.put("/override-requests/{req_id}")
def decide_override(req_id: int, body: dict, db: Session = Depends(get_db), current=Depends(_require_manager)):
    req = db.query(BillingOverrideRequest).filter(
        BillingOverrideRequest.id == req_id,
        BillingOverrideRequest.clinic_id == current.clinic_id,
    ).first()
    if not req:
        raise HTTPException(404, "Not found")
    action = body.get("action")
    if action not in ("approve", "reject"):
        raise HTTPException(400, "action must be approve or reject")
    req.status = "approved" if action == "approve" else "rejected"
    req.reviewed_by = current.id
    req.review_notes = body.get("review_notes", "")
    req.reviewed_at = datetime.utcnow()
    if action == "approve" and req.invoice_id:
        inv = db.query(Invoice).filter(Invoice.id == req.invoice_id).first()
        if inv:
            for it in (req.items or []):
                db.add(InvoiceItem(
                    invoice_id=inv.id,
                    description=it.get("description", ""),
                    item_type=it.get("item_type", "service"),
                    quantity=int(it.get("quantity", 1)),
                    unit_price=Decimal(str(it.get("unit_price", 0))),
                    total=Decimal(str(it.get("total", 0))),
                ))
            _recalc(db, inv)
    db.commit()
    return {"message": f"Request {req.status}"}
