from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, date as dt_date
from decimal import Decimal

from app.db.session import get_db
from app.core.security import get_current_staff, require_billing_waive
from app.models.models import (
    Medicine, Prescription, PrescriptionItem,
    LabTest, LabOrder, LabOrderItem,
    Invoice, InvoiceItem, Staff, StockTransaction,
    Supplier, PurchaseOrder, PurchaseOrderItem,
    SalesReturn, SalesReturnItem, DrugRegister, MedicineBatch
)
from app.schemas.schemas import (
    MedicineCreate, MedicineOut,
    LabTestCreate,
    InvoiceCreate, InvoiceOut, LabResultUpdate
)

# ── Pharmacy ──────────────────────────────────────────────────────────────────
pharmacy_router = APIRouter(prefix="/pharmacy", tags=["pharmacy"])


@pharmacy_router.post("/medicines", response_model=MedicineOut)
def add_medicine(
    payload: MedicineCreate,
    branch_id: int = Query(...),
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    allowed = ['clinic_admin', 'pharmacist']
    if current.role not in allowed:
        raise HTTPException(status_code=403, detail="Access denied")
    med = Medicine(branch_id=branch_id, **payload.model_dump())
    db.add(med)
    db.commit()
    db.refresh(med)
    return med


@pharmacy_router.put("/medicines/{med_id}")
def edit_medicine(
    med_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    allowed = ['clinic_admin', 'pharmacist']
    if current.role not in allowed:
        raise HTTPException(status_code=403, detail="Access denied")
    med = db.query(Medicine).filter(Medicine.id == med_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")
    editable = [
        'name', 'generic_name', 'category', 'form', 'strength',
        'manufacturer', 'unit_price', 'mrp', 'hsn_code', 'schedule',
        'gst_rate', 'reorder_level', 'is_active',
    ]
    for field in editable:
        if field in body:
            setattr(med, field, body[field])
    db.commit()
    db.refresh(med)
    return {
        "id": med.id, "name": med.name, "generic_name": med.generic_name,
        "category": med.category, "form": med.form, "strength": med.strength,
        "manufacturer": med.manufacturer, "unit_price": float(med.unit_price) if med.unit_price else None,
        "mrp": float(med.mrp) if med.mrp else None, "hsn_code": med.hsn_code,
        "schedule": med.schedule, "gst_rate": float(med.gst_rate) if med.gst_rate else None,
        "stock_quantity": med.stock_quantity, "reorder_level": med.reorder_level,
        "is_active": med.is_active,
    }


@pharmacy_router.get("/medicines/search")
def search_medicines(
    q: str = Query(""),
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    effective_branch = branch_id or current.branch_id
    query = db.query(Medicine).filter(Medicine.is_active == True)
    if effective_branch:
        query = query.filter(Medicine.branch_id == effective_branch)
    if q:
        query = query.filter(
            Medicine.name.ilike(f"%{q}%") |
            Medicine.generic_name.ilike(f"%{q}%")
        )
    results = query.order_by(Medicine.name).limit(15).all()
    return [
        {
            "id": m.id,
            "name": m.name,
            "generic_name": m.generic_name,
            "form": m.form,
            "strength": m.strength,
            "unit_price": float(m.unit_price) if m.unit_price else None,
            "mrp": float(m.mrp) if m.mrp else None,
            "stock_quantity": m.stock_quantity,
            "schedule": m.schedule,
            "gst_rate": float(m.gst_rate) if m.gst_rate else None,
            "hsn_code": m.hsn_code,
            "in_stock": (m.stock_quantity or 0) > 0,
        }
        for m in results
    ]


@pharmacy_router.get("/medicines/suggest-generic")
def suggest_generic(
    name: str = Query(""),
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    source = db.query(Medicine).filter(
        Medicine.name.ilike(f"%{name}%"),
        Medicine.is_active == True,
    ).first()
    if not source or not source.generic_name:
        return []
    alternatives = db.query(Medicine).filter(
        Medicine.generic_name.ilike(f"%{source.generic_name}%"),
        Medicine.is_active == True,
        Medicine.id != source.id,
    ).all()
    result = []
    for m in alternatives:
        if m.unit_price and source.unit_price and m.unit_price < source.unit_price:
            result.append({
                "id": m.id, "name": m.name, "generic_name": m.generic_name,
                "unit_price": float(m.unit_price), "stock_quantity": m.stock_quantity,
            })
    return result


@pharmacy_router.get("/medicines", response_model=List[MedicineOut])
def list_medicines(
    search: Optional[str] = None,
    low_stock: bool = False,
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    q = db.query(Medicine).filter(Medicine.is_active == True)
    if branch_id:
        q = q.filter(Medicine.branch_id == branch_id)
    elif current.branch_id:
        q = q.filter(Medicine.branch_id == current.branch_id)
    if search:
        q = q.filter(
            Medicine.name.ilike(f"%{search}%") |
            Medicine.generic_name.ilike(f"%{search}%")
        )
    if low_stock:
        q = q.filter(Medicine.stock_quantity <= Medicine.reorder_level)
    return q.order_by(Medicine.name).all()


class StockUpdateBody(BaseModel):
    quantity: int
    operation: Optional[str] = "add"
    batch_number: Optional[str] = None
    expiry_date: Optional[str] = None
    notes: Optional[str] = None
    unit_cost: Optional[Decimal] = None
    supplier_name: Optional[str] = None


@pharmacy_router.put("/medicines/{med_id}/stock")
def update_stock(
    med_id: int,
    body: StockUpdateBody,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    med = db.query(Medicine).filter(Medicine.id == med_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")
    qty_before = med.stock_quantity or 0
    if body.operation == "set":
        med.stock_quantity = body.quantity
    elif body.operation == "subtract":
        if qty_before < body.quantity:
            raise HTTPException(status_code=400, detail="Insufficient stock")
        med.stock_quantity = qty_before - body.quantity
    else:
        med.stock_quantity = qty_before + body.quantity
    qty_after = med.stock_quantity

    from datetime import date as dt_date
    expiry = None
    if body.expiry_date:
        try:
            expiry = dt_date.fromisoformat(body.expiry_date)
        except Exception:
            pass

    txn = StockTransaction(
        clinic_id=current.clinic_id,
        branch_id=current.branch_id,
        medicine_id=med.id,
        transaction_type=body.operation or "add",
        quantity=body.quantity,
        quantity_before=qty_before,
        quantity_after=qty_after,
        batch_number=body.batch_number,
        expiry_date=expiry,
        unit_cost=body.unit_cost,
        supplier_name=body.supplier_name,
        notes=body.notes,
        performed_by=current.id,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return {
        "id": med.id,
        "stock_quantity": med.stock_quantity,
        "transaction_id": txn.id,
        "quantity_before": qty_before,
        "quantity_after": qty_after,
    }


@pharmacy_router.get("/stock-transactions")
def list_stock_transactions(
    branch_id: Optional[int] = None,
    limit: int = 200,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    q = db.query(StockTransaction).filter(
        StockTransaction.clinic_id == current.clinic_id
    )
    if branch_id:
        q = q.filter(StockTransaction.branch_id == branch_id)
    elif current.branch_id:
        q = q.filter(StockTransaction.branch_id == current.branch_id)
    txns = q.order_by(StockTransaction.created_at.desc()).limit(limit).all()
    result = []
    for t in txns:
        med = db.query(Medicine).filter(Medicine.id == t.medicine_id).first()
        staff = db.query(Staff).filter(Staff.id == t.performed_by).first() if t.performed_by else None
        result.append({
            "id": t.id,
            "medicine_name": med.name if med else "Unknown",
            "transaction_type": t.transaction_type,
            "quantity": t.quantity,
            "quantity_before": t.quantity_before,
            "quantity_after": t.quantity_after,
            "batch_number": t.batch_number,
            "expiry_date": str(t.expiry_date) if t.expiry_date else None,
            "unit_cost": float(t.unit_cost) if t.unit_cost else None,
            "supplier_name": t.supplier_name,
            "notes": t.notes,
            "performed_by_name": staff.full_name if staff else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })
    return result


@pharmacy_router.get("/prescriptions/{pres_id}")
def get_prescription(pres_id: int, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    pres = db.query(Prescription).options(
        joinedload(Prescription.items).joinedload(PrescriptionItem.medicine)
    ).filter(Prescription.id == pres_id).first()
    if not pres:
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "id": pres.id, "status": str(pres.status), "notes": pres.notes,
        "patient_id": pres.patient_id, "created_at": pres.created_at,
        "items": [
            {"id": i.id, "medicine_name": i.medicine.name if i.medicine else "?",
             "medicine_id": i.medicine_id, "dosage": i.dosage, "frequency": i.frequency,
             "duration": i.duration, "instructions": i.instructions,
             "quantity_prescribed": i.quantity_prescribed, "quantity_dispensed": i.quantity_dispensed}
            for i in pres.items
        ]
    }


@pharmacy_router.post("/prescriptions/{pres_id}/dispense")
def dispense_prescription(pres_id: int, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    allowed = ['clinic_admin', 'pharmacist']
    if current.role not in allowed:
        raise HTTPException(status_code=403, detail="Only pharmacists can dispense")
    pres = db.query(Prescription).options(
        joinedload(Prescription.items).joinedload(PrescriptionItem.medicine)
    ).filter(Prescription.id == pres_id).first()
    if not pres:
        raise HTTPException(status_code=404, detail="Not found")
    if pres.status == 'dispensed':
        raise HTTPException(status_code=400, detail="Already dispensed")
    for item in pres.items:
        med = item.medicine
        if med:
            if med.stock_quantity < item.quantity_prescribed:
                raise HTTPException(status_code=400, detail=f"Insufficient stock for {med.name}")
            med.stock_quantity -= item.quantity_prescribed
            item.quantity_dispensed = item.quantity_prescribed
    pres.status = 'dispensed'
    pres.dispensed_at = datetime.utcnow()
    db.commit()
    return {"message": "Dispensed successfully"}


# ── Lab ───────────────────────────────────────────────────────────────────────
lab_router = APIRouter(prefix="/lab", tags=["laboratory"])


@lab_router.get("/tests/search")
def search_lab_tests(
    q: str = Query(""),
    type: str = Query("lab"),
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    effective_branch = branch_id or current.branch_id
    query = db.query(LabTest).filter(LabTest.is_active == True)
    if effective_branch:
        query = query.filter(LabTest.branch_id == effective_branch)
    from sqlalchemy import or_
    imaging_keywords = ['imaging', 'radiology', 'scan', 'x-ray', 'xray', 'mri', 'ct', 'ultrasound']
    imaging_filter = or_(*[LabTest.category.ilike(f"%{kw}%") for kw in imaging_keywords])
    if type == "imaging":
        query = query.filter(imaging_filter)
    else:
        query = query.filter(~imaging_filter)
    if q:
        query = query.filter(
            LabTest.name.ilike(f"%{q}%") |
            LabTest.code.ilike(f"%{q}%")
        )
    results = query.order_by(LabTest.name).limit(15).all()
    return [
        {
            "id": t.id,
            "name": t.name,
            "code": t.code,
            "category": t.category,
            "price": float(t.price) if t.price else None,
            "available": True,
        }
        for t in results
    ]


@lab_router.post("/tests")
def add_lab_test(
    payload: LabTestCreate,
    branch_id: int = Query(...),
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    if current.role not in ['clinic_admin']:
        raise HTTPException(status_code=403, detail="Access denied")
    test = LabTest(branch_id=branch_id, **payload.model_dump())
    db.add(test)
    db.commit()
    db.refresh(test)
    return test


@lab_router.get("/tests")
def list_lab_tests(
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    q = db.query(LabTest).filter(LabTest.is_active == True)
    if branch_id:
        q = q.filter(LabTest.branch_id == branch_id)
    elif current.branch_id:
        q = q.filter(LabTest.branch_id == current.branch_id)
    return q.order_by(LabTest.name).all()


@lab_router.get("/orders/{order_id}")
def get_lab_order(order_id: int, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    order = db.query(LabOrder).options(
        joinedload(LabOrder.items).joinedload(LabOrderItem.test)
    ).filter(LabOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "id": order.id, "patient_id": order.patient_id,
        "status": str(order.status), "notes": order.notes,
        "created_at": order.created_at,
        "items": [
            {"id": i.id, "test_id": i.test_id,
             "test_name": i.test.name if i.test else "?",
             "normal_range": i.test.normal_range if i.test else None,
             "unit": i.test.unit if i.test else None,
             "result_value": i.result_value, "result_notes": i.result_notes,
             "is_abnormal": i.is_abnormal, "completed_at": i.completed_at}
            for i in order.items
        ]
    }


@lab_router.put("/orders/{order_id}/status")
def update_order_status(
    order_id: int, status: str,
    db: Session = Depends(get_db), current: Staff = Depends(get_current_staff),
):
    order = db.query(LabOrder).filter(LabOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Not found")
    order.status = status
    if status == 'sample_collected':
        order.sample_collected_at = datetime.utcnow()
    db.commit()
    return {"message": f"Status → {str(status)}"}


@lab_router.put("/orders/{order_id}/items/{item_id}/result")
def enter_result(
    order_id: int, item_id: int,
    payload: LabResultUpdate,
    db: Session = Depends(get_db), current: Staff = Depends(get_current_staff),
):
    allowed = ['lab_technician', 'clinic_admin']
    if current.role not in allowed:
        raise HTTPException(status_code=403, detail="Access denied")
    item = db.query(LabOrderItem).filter(
        LabOrderItem.id == item_id, LabOrderItem.order_id == order_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    item.result_value = payload.result_value
    item.result_notes = payload.result_notes
    item.is_abnormal = payload.is_abnormal
    item.completed_at = datetime.utcnow()
    order = db.query(LabOrder).filter(LabOrder.id == order_id).first()
    if all(i.completed_at for i in order.items):
        order.status = 'completed'
    db.commit()
    return {"message": "Result saved"}


# ── Billing ───────────────────────────────────────────────────────────────────
billing_router = APIRouter(prefix="/billing", tags=["billing"])


def _invoice_number(db, clinic_id):
    from datetime import datetime as dtt
    prefix = f"INV{dtt.now().year}{dtt.now().month:02d}"
    count = db.query(Invoice).filter(Invoice.invoice_number.like(f"{prefix}%")).count()
    return f"{prefix}{count + 1:04d}"


@billing_router.post("/invoices", response_model=InvoiceOut)
def create_invoice(
    payload: InvoiceCreate,
    branch_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    if not branch_id:
        branch_id = current.branch_id or 1
    allowed = ['clinic_admin', 'receptionist', 'pharmacist']
    if current.role not in allowed:
        raise HTTPException(status_code=403, detail="Access denied")

    sale_type = payload.sale_type or 'prescription'
    if sale_type == 'prescription' and not payload.patient_id:
        raise HTTPException(status_code=400, detail="patient_id required for prescription sale")

    total_gst = Decimal("0")
    item_rows = []
    subtotal = Decimal("0")
    for item in payload.items:
        item_subtotal = item.unit_price * item.quantity
        item_disc = item.discount_amount or Decimal("0")
        taxable = item_subtotal - item_disc
        gst_rate = item.gst_rate or Decimal("0")
        item_gst = (taxable * gst_rate / 100).quantize(Decimal("0.01"))
        item_total = taxable + item_gst
        subtotal += item_subtotal
        total_gst += item_gst
        item_rows.append((item, item_gst, item_total))

    disc = payload.discount or Decimal("0")
    tax = payload.tax or Decimal("0")
    total = subtotal - disc + tax + total_gst

    inv = Invoice(
        clinic_id=current.clinic_id,
        branch_id=branch_id,
        patient_id=payload.patient_id,
        appointment_id=payload.appointment_id,
        invoice_number=_invoice_number(db, current.clinic_id),
        status='pending',
        subtotal=subtotal,
        discount=disc,
        tax=tax,
        total=total,
        payment_method=payload.payment_method,
        notes=payload.notes,
        customer_name=payload.customer_name,
        customer_mobile=payload.customer_mobile,
        sale_type=sale_type,
        gst_amount=total_gst,
        prescription_ref=payload.prescription_ref,
    )
    db.add(inv)
    db.flush()

    for item, item_gst, item_total in item_rows:
        db.add(InvoiceItem(
            invoice_id=inv.id,
            description=item.description,
            item_type=item.item_type,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total=item_total,
            hsn_code=item.hsn_code,
            gst_rate=item.gst_rate,
            gst_amount=item_gst,
            medicine_id=item.medicine_id,
            discount_amount=item.discount_amount or Decimal("0"),
            mrp=item.mrp,
        ))
        if item.medicine_id and sale_type == 'otc':
            med = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
            if med:
                qty_before = med.stock_quantity or 0
                med.stock_quantity = max(0, qty_before - item.quantity)
                db.add(StockTransaction(
                    clinic_id=current.clinic_id,
                    branch_id=branch_id,
                    medicine_id=med.id,
                    transaction_type='dispense',
                    quantity=item.quantity,
                    quantity_before=qty_before,
                    quantity_after=med.stock_quantity,
                    notes=f"OTC invoice {inv.invoice_number}",
                    performed_by=current.id,
                ))

    db.commit()
    db.refresh(inv)
    return inv


@billing_router.get("/invoices", response_model=List[InvoiceOut])
def list_invoices(
    patient_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = 0, limit: int = 50,
    db: Session = Depends(get_db), current: Staff = Depends(get_current_staff),
):
    q = db.query(Invoice).filter(Invoice.clinic_id == current.clinic_id)
    if patient_id:
        q = q.filter(Invoice.patient_id == patient_id)
    if status:
        q = q.filter(Invoice.status == status)
    invoices = q.order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()
    result = []
    for inv in invoices:
        from app.models.models import Patient
        patient = db.query(Patient).filter(Patient.id == inv.patient_id).first() if inv.patient_id else None
        result.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "patient_id": inv.patient_id,
            "patient_name": patient.full_name if patient else (inv.customer_name or "Walk-in"),
            "customer_name": inv.customer_name,
            "customer_mobile": inv.customer_mobile,
            "sale_type": inv.sale_type,
            "status": str(inv.status) if inv.status else "pending",
            "payment_status": str(inv.status) if inv.status else "pending",
            "subtotal": float(inv.subtotal or 0),
            "discount": float(inv.discount or 0),
            "tax": float(inv.tax or 0),
            "gst_amount": float(inv.gst_amount or 0),
            "total": float(inv.total or 0),
            "total_amount": float(inv.total or 0),
            "amount_paid": float(inv.amount_paid or 0),
            "payment_method": inv.payment_method,
            "created_at": str(inv.created_at),
        })
    return result


@billing_router.get("/invoices/{inv_id}")
def get_invoice(inv_id: int, db: Session = Depends(get_db), current: Staff = Depends(get_current_staff)):
    inv = db.query(Invoice).options(joinedload(Invoice.items)).filter(
        Invoice.id == inv_id, Invoice.clinic_id == current.clinic_id
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Not found")
    from app.models.models import Patient
    patient = db.query(Patient).filter(Patient.id == inv.patient_id).first() if inv.patient_id else None
    items_out = []
    for i in inv.items:
        med = db.query(Medicine).filter(Medicine.id == i.medicine_id).first() if i.medicine_id else None
        items_out.append({
            "id": i.id, "description": i.description, "item_type": i.item_type,
            "quantity": i.quantity, "unit_price": float(i.unit_price) if i.unit_price else 0,
            "total": float(i.total) if i.total else 0,
            "hsn_code": i.hsn_code, "gst_rate": float(i.gst_rate) if i.gst_rate else 0,
            "gst_amount": float(i.gst_amount) if i.gst_amount else 0,
            "discount_amount": float(i.discount_amount) if i.discount_amount else 0,
            "mrp": float(i.mrp) if i.mrp else None,
            "medicine_id": i.medicine_id,
            "medicine_name": med.name if med else None,
        })
    gst_breakup = {}
    for i in inv.items:
        rate = str(float(i.gst_rate) if i.gst_rate else 0)
        if rate not in gst_breakup:
            gst_breakup[rate] = {"taxable": 0, "gst": 0}
        taxable = float(i.unit_price or 0) * (i.quantity or 1) - float(i.discount_amount or 0)
        gst_breakup[rate]["taxable"] += taxable
        gst_breakup[rate]["gst"] += float(i.gst_amount or 0)
    return {
        "id": inv.id,
        "invoice_number": inv.invoice_number,
        "patient_id": inv.patient_id,
        "patient_name": patient.full_name if patient else None,
        "patient_mobile": patient.mobile if patient else None,
        "customer_name": inv.customer_name,
        "customer_mobile": inv.customer_mobile,
        "sale_type": inv.sale_type,
        "prescription_ref": inv.prescription_ref,
        "status": str(inv.status),
        "subtotal": float(inv.subtotal or 0),
        "discount": float(inv.discount or 0),
        "tax": float(inv.tax or 0),
        "gst_amount": float(inv.gst_amount or 0),
        "total": float(inv.total or 0),
        "amount_paid": float(inv.amount_paid or 0),
        "payment_method": inv.payment_method,
        "notes": inv.notes,
        "created_at": inv.created_at.isoformat() if inv.created_at else None,
        "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
        "items": items_out,
        "gst_breakup": gst_breakup,
    }


@billing_router.post("/invoices/{inv_id}/pay")
def record_payment(
    inv_id: int, amount: float, payment_method: str,
    db: Session = Depends(get_db), current: Staff = Depends(get_current_staff),
):
    inv = db.query(Invoice).filter(
        Invoice.id == inv_id, Invoice.clinic_id == current.clinic_id
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Not found")
    inv.amount_paid = Decimal(str(amount))
    inv.payment_method = payment_method
    inv.status = 'paid' if inv.amount_paid >= inv.total else 'partially_paid'
    if inv.status == 'paid':
        inv.paid_at = datetime.utcnow()
    db.commit()
    return {"status": str(inv.status)}


WAIVER_REASONS = {'economic_hardship', 'bpl_card', 'procedure_adjustment', 'staff_family', 'other'}


class WaiverRequest(BaseModel):
    waiver_amount: Decimal
    reason:        str
    notes:         Optional[str] = None


@billing_router.post("/invoices/{inv_id}/waiver")
def apply_waiver(
    inv_id: int,
    body:   WaiverRequest,
    db:     Session = Depends(get_db),
    current: Staff = Depends(require_billing_waive),
):
    if body.reason not in WAIVER_REASONS:
        raise HTTPException(400, f'reason must be one of: {", ".join(WAIVER_REASONS)}')

    inv = db.query(Invoice).filter_by(id=inv_id, clinic_id=current.clinic_id).first()
    if not inv:
        raise HTTPException(404, 'Invoice not found')
    if str(inv.status) in ('paid',):
        raise HTTPException(400, 'Cannot waive a fully paid invoice')

    waiver = body.waiver_amount
    if waiver > inv.total:
        raise HTTPException(400, 'Waiver amount cannot exceed invoice total')

    from app.models.models import BillingWaiverLog
    inv.discount    = (inv.discount or Decimal('0')) + waiver
    inv.total       = inv.subtotal - inv.discount + (inv.tax or Decimal('0'))
    db.add(BillingWaiverLog(
        invoice_id    = inv.id,
        clinic_id     = current.clinic_id,
        waived_by     = current.id,
        waiver_amount = waiver,
        reason        = body.reason,
        notes         = body.notes or '',
    ))
    db.commit()
    return {
        'status': 'waiver_applied',
        'new_total': float(inv.total),
        'total_discount': float(inv.discount),
    }


@billing_router.get("/waivers")
def list_waivers(
    db:      Session = Depends(get_db),
    current: Staff = Depends(require_billing_waive),
):
    from app.models.models import BillingWaiverLog, Patient
    rows = db.query(BillingWaiverLog).filter_by(clinic_id=current.clinic_id)\
        .order_by(BillingWaiverLog.created_at.desc()).limit(200).all()
    result = []
    for r in rows:
        inv = db.query(Invoice).filter_by(id=r.invoice_id).first()
        patient = db.query(Patient).filter_by(id=inv.patient_id).first() if inv and inv.patient_id else None
        staff = db.query(Staff).filter_by(id=r.waived_by).first()
        result.append({
            'id':            r.id,
            'invoice_id':    r.invoice_id,
            'patient_name':  patient.full_name if patient else (inv.customer_name if inv else '—'),
            'waived_by':     staff.full_name if staff else '—',
            'waiver_amount': float(r.waiver_amount),
            'reason':        r.reason,
            'notes':         r.notes,
            'created_at':    r.created_at.isoformat() if r.created_at else None,
        })
    return result


@billing_router.get("/revenue")
def get_revenue(
    month: Optional[str] = None,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from sqlalchemy import text
    params = {"clinic_id": current.clinic_id}
    date_filter = ""
    if month:
        params["month_start"] = f"{month}-01"
        params["month_end"]   = f"{month}-31"
        date_filter = " AND i.created_at BETWEEN :month_start AND :month_end"

    total_sql = text(f"""
        SELECT
            COALESCE(SUM(i.total), 0) as total_revenue,
            COALESCE(SUM(i.amount_paid), 0) as collected,
            COALESCE(SUM(i.total - COALESCE(i.amount_paid,0)), 0) as outstanding
        FROM invoices i
        WHERE i.clinic_id = :clinic_id{date_filter}
        AND i.status != 'cancelled'
    """)
    totals = db.execute(total_sql, params).fetchone()

    pay_sql = text(f"""
        SELECT i.payment_method, COUNT(*) as count, COALESCE(SUM(i.amount_paid),0) as revenue
        FROM invoices i
        WHERE i.clinic_id = :clinic_id{date_filter}
        AND i.status = 'paid' AND i.payment_method IS NOT NULL
        GROUP BY i.payment_method ORDER BY revenue DESC
    """)
    by_payment = [dict(r._mapping) for r in db.execute(pay_sql, params).fetchall()]

    return {
        "total_revenue":     float(totals.total_revenue) if totals else 0,
        "collected":         float(totals.collected) if totals else 0,
        "outstanding":       float(totals.outstanding) if totals else 0,
        "by_doctor":         [],
        "by_service":        [],
        "by_payment_method": by_payment,
        "top_patients":      [],
    }


# ── Lab orders list ───────────────────────────────────────────────

@lab_router.get("/orders")
def list_lab_orders(
    status: str = None,
    limit: int = 30,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    from app.models.models import LabOrder, LabOrderItem, LabTest, Patient, Staff, DoctorProfile
    q = db.query(LabOrder).filter(LabOrder.clinic_id == current.clinic_id)
    if status:
        q = q.filter(LabOrder.status == status)
    orders = q.order_by(LabOrder.created_at.desc()).limit(limit).all()
    result = []
    for lo in orders:
        patient = db.query(Patient).filter(Patient.id == lo.patient_id).first()
        staff = db.query(Staff).filter(Staff.id == lo.ordered_by).first()
        items = []
        for item in lo.items:
            test = db.query(LabTest).filter(LabTest.id == item.test_id).first()
            items.append({
                "id":              item.id,
                "test_name":       test.name if test else "Unknown",
                "result":          item.result_value,
                "reference_range": test.normal_range if test else None,
                "unit":            test.unit if test else None,
                "is_abnormal":     item.is_abnormal,
            })
        result.append({
            "id":           lo.id,
            "patient_name": patient.full_name if patient else "Unknown",
            "patient_uhid": patient.uhid if patient else None,
            "doctor_name":  staff.full_name if staff else "Unknown",
            "status":       str(lo.status),
            "created_at":   str(lo.created_at),
            "items":        items,
        })
    return result


@lab_router.put("/orders/{order_id}/results")
def save_lab_results(
    order_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    from app.models.models import LabOrder, LabOrderItem
    order = db.query(LabOrder).filter(
        LabOrder.id == order_id,
        LabOrder.clinic_id == current.clinic_id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    for r in body.get("results", []):
        item = db.query(LabOrderItem).filter(LabOrderItem.id == r.get("item_id")).first()
        if item:
            item.result_value = r.get("result", "")
            item.result_notes = r.get("reference_range", "")
            item.is_abnormal = bool(r.get("is_abnormal", False))

    order.status = 'completed'
    db.commit()
    return {"message": "Results saved"}


@lab_router.put("/orders/{order_id}/complete")
def complete_lab_order(
    order_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    from app.models.models import LabOrder
    order = db.query(LabOrder).filter(
        LabOrder.id == order_id,
        LabOrder.clinic_id == current.clinic_id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = 'completed'
    db.commit()
    return {"message": "Order completed"}


# ── Pharmacy pending list ──────────────────────────────────────────

@pharmacy_router.get("/pending")
def list_pending_prescriptions(
    limit: int = 30,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    from app.models.models import Prescription, PrescriptionItem, Medicine, Patient, Staff
    prescriptions = db.query(Prescription).filter(
        Prescription.clinic_id == current.clinic_id,
        Prescription.status == 'pending',
    ).order_by(Prescription.created_at.desc()).limit(limit).all()

    result = []
    for rx in prescriptions:
        patient = db.query(Patient).filter(Patient.id == rx.patient_id).first()
        staff = db.query(Staff).filter(Staff.id == rx.prescribed_by).first()
        items = []
        for item in rx.items:
            med = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
            items.append({
                "id":            item.id,
                "medicine_name": med.name if med else "Unknown",
                "dosage":        item.dosage,
                "frequency":     item.frequency,
                "duration":      item.duration,
                "instructions":  item.instructions,
            })
        result.append({
            "id":           rx.id,
            "patient_name": patient.full_name if patient else "Unknown",
            "patient_uhid": patient.uhid if patient else None,
            "doctor_name":  staff.full_name if staff else "Unknown",
            "status":       str(rx.status),
            "created_at":   str(rx.created_at),
            "items":        items,
        })
    return result


@pharmacy_router.put("/prescriptions/{pres_id}/dispense")
def dispense_prescription_by_id(
    pres_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    from app.models.models import Prescription
    rx = db.query(Prescription).filter(
        Prescription.id == pres_id,
        Prescription.clinic_id == current.clinic_id,
    ).first()
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    rx.status = 'dispensed'
    rx.dispensed_at = datetime.utcnow()
    db.commit()
    return {"message": "Dispensed successfully"}


@pharmacy_router.get("/all")
def get_all_prescriptions(
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from sqlalchemy import text
    sql = text("""
        SELECT p.id, p.status, p.notes, p.created_at,
               pat.full_name as patient_name, pat.id as patient_id,
               s.full_name as doctor_name
        FROM prescriptions p
        JOIN patients pat ON p.patient_id = pat.id
        LEFT JOIN staff s ON p.prescribed_by = s.id
        WHERE p.clinic_id = :clinic_id
        ORDER BY p.created_at DESC
        LIMIT 100
    """)
    rows = db.execute(sql, {"clinic_id": current.clinic_id}).fetchall()
    return [dict(r._mapping) for r in rows]


# ══════════════════════════════════════════════════════════════
# Imaging Router — /imaging
# ══════════════════════════════════════════════════════════════
imaging_router = APIRouter(prefix="/imaging", tags=["imaging"])


@imaging_router.get("/orders")
def list_imaging_orders(
    status: Optional[str] = None,
    patient_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from app.models.models import ImagingOrder, Patient as Pt, Staff as St
    q = db.query(ImagingOrder).filter(ImagingOrder.clinic_id == current.clinic_id)
    if status:
        q = q.filter(ImagingOrder.status == status)
    if patient_id:
        q = q.filter(ImagingOrder.patient_id == patient_id)
    orders = q.order_by(ImagingOrder.created_at.desc()).offset(skip).limit(limit).all()
    result = []
    for o in orders:
        patient = db.query(Pt).filter(Pt.id == o.patient_id).first()
        doctor  = db.query(St).filter(St.id == o.ordered_by).first()
        result.append({
            "id":               o.id,
            "patient_id":       o.patient_id,
            "patient_name":     patient.full_name if patient else "Unknown",
            "patient_uhid":     patient.uhid if patient else None,
            "doctor_name":      doctor.full_name if doctor else None,
            "modality":         o.modality,
            "body_part":        o.body_part,
            "clinical_notes":   o.clinical_notes,
            "status":           o.status,
            "created_at":       str(o.created_at),
        })
    return result


@imaging_router.post("/orders")
def create_imaging_order(
    body: dict,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from app.models.models import ImagingOrder, Patient as Pt
    patient = db.query(Pt).filter(
        Pt.id == body.get("patient_id"),
        Pt.clinic_id == current.clinic_id
    ).first()
    if not patient:
        raise HTTPException(404, "Patient not found")

    order = ImagingOrder(
        clinic_id      = current.clinic_id,
        patient_id     = body["patient_id"],
        appointment_id = body.get("appointment_id"),
        ordered_by     = current.id,
        modality       = body.get("modality", "X-Ray"),
        body_part      = body.get("body_part"),
        clinical_notes = body.get("clinical_notes"),
        status         = "ordered",
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return {"id": order.id, "message": "Imaging order created"}


@imaging_router.put("/orders/{order_id}")
def update_imaging_order(
    order_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from app.models.models import ImagingOrder
    order = db.query(ImagingOrder).filter(
        ImagingOrder.id == order_id,
        ImagingOrder.clinic_id == current.clinic_id,
    ).first()
    if not order:
        raise HTTPException(404, "Order not found")
    for field in ["status", "body_part", "modality", "clinical_notes"]:
        if field in body:
            setattr(order, field, body[field])
    db.commit()
    return {"message": "Updated successfully"}


@imaging_router.get("/orders/{order_id}")
def get_imaging_order(
    order_id: int,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from app.models.models import ImagingOrder, Patient as Pt, Staff as St
    order = db.query(ImagingOrder).filter(
        ImagingOrder.id == order_id,
        ImagingOrder.clinic_id == current.clinic_id,
    ).first()
    if not order:
        raise HTTPException(404, "Order not found")
    patient = db.query(Pt).filter(Pt.id == order.patient_id).first()
    doctor  = db.query(St).filter(St.id == order.ordered_by).first()
    return {
        "id":             order.id,
        "patient_id":     order.patient_id,
        "patient_name":   patient.full_name if patient else None,
        "doctor_name":    doctor.full_name if doctor else None,
        "modality":       order.modality,
        "body_part":      order.body_part,
        "clinical_notes": order.clinical_notes,
        "status":         order.status,
        "created_at":     str(order.created_at),
    }


# ══════════════════════════════════════════════════════════════
# Imaging Phase 1 — Report Templates
# ══════════════════════════════════════════════════════════════

@imaging_router.get("/templates")
def list_imaging_templates(
    modality: Optional[str] = None,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from app.models.models import ImagingReportTemplate
    q = db.query(ImagingReportTemplate).filter(
        ImagingReportTemplate.clinic_id == current.clinic_id,
        ImagingReportTemplate.is_active == True,
    )
    if modality:
        q = q.filter(ImagingReportTemplate.modality == modality)
    templates = q.order_by(ImagingReportTemplate.modality, ImagingReportTemplate.name).all()
    return [
        {
            "id":                  t.id,
            "modality":            t.modality,
            "name":                t.name,
            "findings_template":   t.findings_template,
            "impression_template": t.impression_template,
            "body_part":           t.body_part,
            "is_active":           t.is_active,
            "created_at":          str(t.created_at),
        }
        for t in templates
    ]


@imaging_router.post("/templates")
def create_imaging_template(
    body: dict,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from app.models.models import ImagingReportTemplate
    allowed = ['clinic_admin', 'radiologist', 'imaging_technician']
    if current.role not in allowed:
        raise HTTPException(403, "Access denied")
    t = ImagingReportTemplate(
        clinic_id           = current.clinic_id,
        modality            = body.get("modality", "OT"),
        name                = body.get("name", "Unnamed Template"),
        findings_template   = body.get("findings_template"),
        impression_template = body.get("impression_template"),
        body_part           = body.get("body_part"),
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return {"id": t.id, "message": "Template created"}


@imaging_router.put("/templates/{template_id}")
def update_imaging_template(
    template_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from app.models.models import ImagingReportTemplate
    allowed = ['clinic_admin', 'radiologist', 'imaging_technician']
    if current.role not in allowed:
        raise HTTPException(403, "Access denied")
    t = db.query(ImagingReportTemplate).filter(
        ImagingReportTemplate.id == template_id,
        ImagingReportTemplate.clinic_id == current.clinic_id,
    ).first()
    if not t:
        raise HTTPException(404, "Template not found")
    for field in ["modality", "name", "findings_template", "impression_template", "body_part", "is_active"]:
        if field in body:
            setattr(t, field, body[field])
    db.commit()
    return {"message": "Updated"}


@imaging_router.delete("/templates/{template_id}")
def delete_imaging_template(
    template_id: int,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from app.models.models import ImagingReportTemplate
    allowed = ['clinic_admin', 'radiologist']
    if current.role not in allowed:
        raise HTTPException(403, "Access denied")
    t = db.query(ImagingReportTemplate).filter(
        ImagingReportTemplate.id == template_id,
        ImagingReportTemplate.clinic_id == current.clinic_id,
    ).first()
    if not t:
        raise HTTPException(404, "Template not found")
    t.is_active = False
    db.commit()
    return {"message": "Deleted"}


# ══════════════════════════════════════════════════════════════
# Imaging Phase 1 — Acquire (Technician workflow)
# ══════════════════════════════════════════════════════════════

@imaging_router.post("/orders/{order_id}/acquire")
def acquire_imaging_order(
    order_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from app.models.models import ImagingOrder
    allowed = ['clinic_admin', 'imaging_technician']
    if current.role not in allowed:
        raise HTTPException(403, "Only imaging technicians or admins can acquire studies")
    order = db.query(ImagingOrder).filter(
        ImagingOrder.id == order_id,
        ImagingOrder.clinic_id == current.clinic_id,
    ).first()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.status not in ('pending', 'scheduled'):
        raise HTTPException(400, f"Cannot acquire order in status '{order.status}'")
    order.status              = 'acquired'
    order.acquired_by         = current.id
    order.acquired_at         = datetime.utcnow()
    order.technician_notes    = body.get("technician_notes")
    order.contrast_used       = bool(body.get("contrast_used", False))
    order.contrast_agent      = body.get("contrast_agent")
    order.contrast_volume_ml  = body.get("contrast_volume_ml")
    order.radiation_dose_mgy  = body.get("radiation_dose_mgy")
    order.film_count          = body.get("film_count", 0)
    db.commit()
    return {"message": "Study marked as acquired", "status": "acquired"}


# ══════════════════════════════════════════════════════════════
# Imaging Phase 1 — Critical Alerts
# ══════════════════════════════════════════════════════════════

CRITICAL_ALERT_TYPES = ['mass_lesion', 'pneumothorax', 'hemorrhage', 'fracture', 'foreign_body', 'other']


@imaging_router.post("/orders/{order_id}/critical-alert")
def flag_critical_alert(
    order_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from app.models.models import ImagingOrder, ImagingCriticalAlert
    order = db.query(ImagingOrder).filter(
        ImagingOrder.id == order_id,
        ImagingOrder.clinic_id == current.clinic_id,
    ).first()
    if not order:
        raise HTTPException(404, "Order not found")
    alert_type = body.get("alert_type", "other")
    if alert_type not in CRITICAL_ALERT_TYPES:
        raise HTTPException(400, f"Invalid alert_type. Valid: {CRITICAL_ALERT_TYPES}")
    alert = ImagingCriticalAlert(
        clinic_id   = current.clinic_id,
        order_id    = order_id,
        alert_type  = alert_type,
        description = body.get("description"),
        alerted_by  = current.id,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return {"id": alert.id, "message": "Critical alert created"}


@imaging_router.get("/critical-alerts/count")
def get_critical_alert_count(
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from app.models.models import ImagingCriticalAlert
    count = db.query(ImagingCriticalAlert).filter(
        ImagingCriticalAlert.clinic_id == current.clinic_id,
        ImagingCriticalAlert.acknowledged_at == None,
    ).count()
    return {"count": count}


@imaging_router.get("/critical-alerts")
def list_critical_alerts(
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from app.models.models import ImagingCriticalAlert, ImagingOrder, Patient as Pt
    alerts = db.query(ImagingCriticalAlert).filter(
        ImagingCriticalAlert.clinic_id == current.clinic_id,
        ImagingCriticalAlert.acknowledged_at == None,
    ).order_by(ImagingCriticalAlert.alerted_at.desc()).all()
    result = []
    for a in alerts:
        order = db.query(ImagingOrder).filter(ImagingOrder.id == a.order_id).first()
        patient = db.query(Pt).filter(Pt.id == order.patient_id).first() if order else None
        alerted_by_staff = db.query(Staff).filter(Staff.id == a.alerted_by).first()
        result.append({
            "id":              a.id,
            "order_id":        a.order_id,
            "order_ref":       order.order_id if order else None,
            "patient_name":    patient.full_name if patient else "Unknown",
            "modality":        order.modality if order else None,
            "alert_type":      a.alert_type,
            "description":     a.description,
            "alerted_by_name": alerted_by_staff.full_name if alerted_by_staff else None,
            "alerted_at":      str(a.alerted_at),
        })
    return result


@imaging_router.post("/critical-alerts/{alert_id}/acknowledge")
def acknowledge_critical_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from app.models.models import ImagingCriticalAlert
    alert = db.query(ImagingCriticalAlert).filter(
        ImagingCriticalAlert.id == alert_id,
        ImagingCriticalAlert.clinic_id == current.clinic_id,
    ).first()
    if not alert:
        raise HTTPException(404, "Alert not found")
    alert.acknowledged_by  = current.id
    alert.acknowledged_at  = datetime.utcnow()
    db.commit()
    return {"message": "Alert acknowledged"}


# ══════════════════════════════════════════════════════════════
# Imaging Phase 1 — Analytics Reports
# ══════════════════════════════════════════════════════════════

@imaging_router.get("/reports/modality-volume")
def report_modality_volume(
    from_date: str = Query(...),
    to_date: str = Query(...),
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from sqlalchemy import text
    sql = text("""
        SELECT
            COALESCE(modality, 'Unknown') AS modality,
            COUNT(*) AS total_orders,
            COUNT(*) FILTER (WHERE status IN ('signed', 'pending_review', 'acquired')) AS completed_count
        FROM imaging_orders
        WHERE clinic_id = :clinic_id
          AND DATE(created_at) BETWEEN :from_date AND :to_date
        GROUP BY modality
        ORDER BY total_orders DESC
    """)
    rows = db.execute(sql, {"clinic_id": current.clinic_id, "from_date": from_date, "to_date": to_date}).fetchall()
    return [
        {
            "modality":         r.modality,
            "total_orders":     int(r.total_orders),
            "completed_count":  int(r.completed_count),
            "completion_rate":  round(int(r.completed_count) / int(r.total_orders) * 100, 1) if int(r.total_orders) > 0 else 0,
        }
        for r in rows
    ]


@imaging_router.get("/reports/tat")
def report_tat(
    from_date: str = Query(...),
    to_date: str = Query(...),
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from sqlalchemy import text
    sql = text("""
        SELECT
            COALESCE(modality, 'Unknown') AS modality,
            COUNT(*) FILTER (WHERE status = 'acquired' AND acquired_at IS NOT NULL) AS acquired_count,
            AVG(EXTRACT(EPOCH FROM (acquired_at - created_at))/3600)
                FILTER (WHERE status = 'acquired' AND acquired_at IS NOT NULL) AS avg_acquire_tat_hrs,
            COUNT(*) FILTER (WHERE status IN ('signed') AND ir.signed_at IS NOT NULL) AS signed_count,
            AVG(EXTRACT(EPOCH FROM (ir.signed_at - io.created_at))/3600)
                FILTER (WHERE io.status = 'signed' AND ir.signed_at IS NOT NULL) AS avg_sign_tat_hrs
        FROM imaging_orders io
        LEFT JOIN imaging_results ir ON ir.order_id = io.id
        WHERE io.clinic_id = :clinic_id
          AND DATE(io.created_at) BETWEEN :from_date AND :to_date
        GROUP BY modality
        ORDER BY modality
    """)
    rows = db.execute(sql, {"clinic_id": current.clinic_id, "from_date": from_date, "to_date": to_date}).fetchall()
    return [
        {
            "modality":           r.modality,
            "acquired_count":     int(r.acquired_count or 0),
            "avg_acquire_tat_hrs": round(float(r.avg_acquire_tat_hrs or 0), 2),
            "signed_count":       int(r.signed_count or 0),
            "avg_sign_tat_hrs":   round(float(r.avg_sign_tat_hrs or 0), 2),
        }
        for r in rows
    ]


@imaging_router.get("/reports/technician-productivity")
def report_technician_productivity(
    from_date: str = Query(...),
    to_date: str = Query(...),
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from sqlalchemy import text
    sql = text("""
        SELECT
            s.full_name AS technician_name,
            COUNT(*) AS acquisitions,
            COUNT(*) FILTER (WHERE io.contrast_used = TRUE) AS contrast_studies
        FROM imaging_orders io
        JOIN staff s ON s.id = io.acquired_by
        WHERE io.clinic_id = :clinic_id
          AND io.acquired_by IS NOT NULL
          AND DATE(io.acquired_at) BETWEEN :from_date AND :to_date
        GROUP BY s.full_name
        ORDER BY acquisitions DESC
    """)
    rows = db.execute(sql, {"clinic_id": current.clinic_id, "from_date": from_date, "to_date": to_date}).fetchall()
    return [
        {
            "technician_name":  r.technician_name,
            "acquisitions":     int(r.acquisitions),
            "contrast_studies": int(r.contrast_studies),
        }
        for r in rows
    ]


@imaging_router.get("/reports/contrast-usage")
def report_contrast_usage(
    from_date: str = Query(...),
    to_date: str = Query(...),
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from sqlalchemy import text
    sql = text("""
        SELECT
            COUNT(*) FILTER (WHERE contrast_used = TRUE) AS total_contrast_studies,
            COUNT(*) AS total_studies,
            COALESCE(contrast_agent, 'Unspecified') AS agent,
            COUNT(*) FILTER (WHERE contrast_used = TRUE) AS agent_count,
            SUM(contrast_volume_ml) FILTER (WHERE contrast_used = TRUE) AS total_volume_ml
        FROM imaging_orders
        WHERE clinic_id = :clinic_id
          AND DATE(created_at) BETWEEN :from_date AND :to_date
        GROUP BY contrast_agent
        ORDER BY agent_count DESC
    """)
    rows = db.execute(sql, {"clinic_id": current.clinic_id, "from_date": from_date, "to_date": to_date}).fetchall()
    total_contrast = sum(int(r.total_contrast_studies or 0) for r in rows)
    total_all      = sum(int(r.total_studies or 0) for r in rows)
    agents = [
        {
            "agent":        r.agent,
            "count":        int(r.agent_count or 0),
            "total_volume_ml": float(r.total_volume_ml or 0),
        }
        for r in rows if int(r.agent_count or 0) > 0
    ]
    return {
        "total_studies":         total_all,
        "total_contrast_studies": total_contrast,
        "contrast_rate_pct":     round(total_contrast / total_all * 100, 1) if total_all > 0 else 0,
        "agents":                agents,
    }


@imaging_router.get("/reports/radiation-dose")
def report_radiation_dose(
    from_date: str = Query(...),
    to_date: str = Query(...),
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from sqlalchemy import text
    sql = text("""
        SELECT
            COALESCE(modality, 'Unknown') AS modality,
            COUNT(*) FILTER (WHERE radiation_dose_mgy IS NOT NULL) AS studies_with_dose,
            AVG(radiation_dose_mgy) FILTER (WHERE radiation_dose_mgy IS NOT NULL) AS avg_dose_mgy,
            MAX(radiation_dose_mgy) AS max_dose_mgy
        FROM imaging_orders
        WHERE clinic_id = :clinic_id
          AND DATE(created_at) BETWEEN :from_date AND :to_date
        GROUP BY modality
        ORDER BY avg_dose_mgy DESC NULLS LAST
    """)
    rows = db.execute(sql, {"clinic_id": current.clinic_id, "from_date": from_date, "to_date": to_date}).fetchall()
    return [
        {
            "modality":          r.modality,
            "studies_with_dose": int(r.studies_with_dose or 0),
            "avg_dose_mgy":      round(float(r.avg_dose_mgy or 0), 3),
            "max_dose_mgy":      round(float(r.max_dose_mgy or 0), 3),
        }
        for r in rows
    ]


@imaging_router.get("/reports/referral-source")
def report_referral_source(
    from_date: str = Query(...),
    to_date: str = Query(...),
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from sqlalchemy import text
    sql = text("""
        SELECT
            COALESCE(referring_doctor, 'Unknown') AS referring_doctor,
            MAX(referring_doctor_reg) AS referring_doctor_reg,
            COUNT(*) AS study_count,
            MODE() WITHIN GROUP (ORDER BY modality) AS top_modality
        FROM imaging_orders
        WHERE clinic_id = :clinic_id
          AND DATE(created_at) BETWEEN :from_date AND :to_date
        GROUP BY referring_doctor
        ORDER BY study_count DESC
        LIMIT 50
    """)
    rows = db.execute(sql, {"clinic_id": current.clinic_id, "from_date": from_date, "to_date": to_date}).fetchall()
    return [
        {
            "referring_doctor":     r.referring_doctor,
            "referring_doctor_reg": r.referring_doctor_reg,
            "study_count":          int(r.study_count),
            "top_modality":         r.top_modality,
        }
        for r in rows
    ]


# ══════════════════════════════════════════════════════════════
# Supplier Router
# ══════════════════════════════════════════════════════════════

class SupplierCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    drug_license_number: Optional[str] = None
    payment_terms: Optional[int] = 30
    notes: Optional[str] = None


@pharmacy_router.get("/suppliers")
def list_suppliers(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    q = db.query(Supplier).filter(Supplier.clinic_id == current.clinic_id, Supplier.is_active == True)
    if search:
        q = q.filter(Supplier.name.ilike(f"%{search}%"))
    suppliers = q.order_by(Supplier.name).all()
    return [
        {
            "id": s.id, "name": s.name, "contact_person": s.contact_person,
            "mobile": s.mobile, "email": s.email, "address": s.address,
            "gstin": s.gstin, "drug_license_number": s.drug_license_number,
            "payment_terms": s.payment_terms, "notes": s.notes,
            "is_active": s.is_active, "created_at": str(s.created_at),
        }
        for s in suppliers
    ]


@pharmacy_router.post("/suppliers")
def create_supplier(
    payload: SupplierCreate,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    allowed = ['clinic_admin', 'pharmacist']
    if current.role not in allowed:
        raise HTTPException(status_code=403, detail="Access denied")
    sup = Supplier(clinic_id=current.clinic_id, **payload.model_dump())
    db.add(sup)
    db.commit()
    db.refresh(sup)
    return {"id": sup.id, "name": sup.name, "message": "Supplier created"}


@pharmacy_router.put("/suppliers/{sup_id}")
def update_supplier(
    sup_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    allowed = ['clinic_admin', 'pharmacist']
    if current.role not in allowed:
        raise HTTPException(status_code=403, detail="Access denied")
    sup = db.query(Supplier).filter(Supplier.id == sup_id, Supplier.clinic_id == current.clinic_id).first()
    if not sup:
        raise HTTPException(status_code=404, detail="Supplier not found")
    editable = ['name', 'contact_person', 'mobile', 'email', 'address', 'gstin',
                'drug_license_number', 'payment_terms', 'notes', 'is_active']
    for f in editable:
        if f in body:
            setattr(sup, f, body[f])
    db.commit()
    return {"message": "Updated"}


@pharmacy_router.delete("/suppliers/{sup_id}")
def delete_supplier(
    sup_id: int,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    allowed = ['clinic_admin', 'pharmacist']
    if current.role not in allowed:
        raise HTTPException(status_code=403, detail="Access denied")
    sup = db.query(Supplier).filter(Supplier.id == sup_id, Supplier.clinic_id == current.clinic_id).first()
    if not sup:
        raise HTTPException(status_code=404, detail="Supplier not found")
    sup.is_active = False
    db.commit()
    return {"message": "Supplier deactivated"}


# ══════════════════════════════════════════════════════════════
# Purchase Orders Router
# ══════════════════════════════════════════════════════════════

def _po_number(db, clinic_id):
    from datetime import datetime as dtt
    prefix = f"BH-PO-{dtt.now().strftime('%Y%m%d')}"
    count = db.query(PurchaseOrder).filter(
        PurchaseOrder.po_number.like(f"{prefix}%"),
        PurchaseOrder.clinic_id == clinic_id
    ).count()
    return f"{prefix}-{count + 1:03d}"


class POItemIn(BaseModel):
    medicine_id: Optional[int] = None
    medicine_name: Optional[str] = None
    quantity_ordered: int
    unit_cost: Optional[Decimal] = None


class POCreate(BaseModel):
    supplier_id: Optional[int] = None
    expected_date: Optional[str] = None
    notes: Optional[str] = None
    items: List[POItemIn] = []


@pharmacy_router.get("/purchase-orders")
def list_purchase_orders(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    q = db.query(PurchaseOrder).filter(PurchaseOrder.clinic_id == current.clinic_id)
    if status:
        q = q.filter(PurchaseOrder.status == status)
    orders = q.order_by(PurchaseOrder.created_at.desc()).limit(200).all()
    result = []
    for po in orders:
        sup = db.query(Supplier).filter(Supplier.id == po.supplier_id).first() if po.supplier_id else None
        result.append({
            "id": po.id, "po_number": po.po_number, "status": po.status,
            "supplier_id": po.supplier_id,
            "supplier_name": sup.name if sup else None,
            "expected_date": str(po.expected_date) if po.expected_date else None,
            "notes": po.notes, "total_amount": float(po.total_amount or 0),
            "created_at": str(po.created_at),
            "items": [
                {
                    "id": i.id, "medicine_id": i.medicine_id, "medicine_name": i.medicine_name,
                    "quantity_ordered": i.quantity_ordered, "quantity_received": i.quantity_received,
                    "unit_cost": float(i.unit_cost) if i.unit_cost else None,
                    "total_cost": float(i.total_cost) if i.total_cost else None,
                    "batch_number": i.batch_number,
                    "expiry_date": str(i.expiry_date) if i.expiry_date else None,
                }
                for i in po.items
            ],
        })
    return result


@pharmacy_router.post("/purchase-orders")
def create_purchase_order(
    payload: POCreate,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    allowed = ['clinic_admin', 'pharmacist']
    if current.role not in allowed:
        raise HTTPException(status_code=403, detail="Access denied")

    exp_date = None
    if payload.expected_date:
        try:
            exp_date = dt_date.fromisoformat(payload.expected_date)
        except Exception:
            pass

    total = sum(
        (i.quantity_ordered * float(i.unit_cost or 0)) for i in payload.items
    )

    po = PurchaseOrder(
        clinic_id=current.clinic_id,
        branch_id=current.branch_id,
        supplier_id=payload.supplier_id,
        po_number=_po_number(db, current.clinic_id),
        status="draft",
        expected_date=exp_date,
        notes=payload.notes,
        total_amount=Decimal(str(total)),
        created_by=current.id,
    )
    db.add(po)
    db.flush()

    for item in payload.items:
        med = db.query(Medicine).filter(Medicine.id == item.medicine_id).first() if item.medicine_id else None
        line_total = item.quantity_ordered * float(item.unit_cost or 0)
        db.add(PurchaseOrderItem(
            po_id=po.id,
            medicine_id=item.medicine_id,
            medicine_name=item.medicine_name or (med.name if med else None),
            quantity_ordered=item.quantity_ordered,
            quantity_received=0,
            unit_cost=item.unit_cost,
            total_cost=Decimal(str(line_total)),
        ))

    db.commit()
    db.refresh(po)
    return {"id": po.id, "po_number": po.po_number, "status": po.status}


@pharmacy_router.put("/purchase-orders/{po_id}")
def update_purchase_order(
    po_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    allowed = ['clinic_admin', 'pharmacist']
    if current.role not in allowed:
        raise HTTPException(status_code=403, detail="Access denied")
    po = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == po_id, PurchaseOrder.clinic_id == current.clinic_id
    ).first()
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    for f in ['status', 'notes', 'supplier_id', 'expected_date']:
        if f in body:
            setattr(po, f, body[f])
    db.commit()
    return {"message": "Updated"}


class ReceiveItemIn(BaseModel):
    item_id: int
    quantity_received: int
    batch_number: Optional[str] = None
    expiry_date: Optional[str] = None


class ReceivePOBody(BaseModel):
    items: List[ReceiveItemIn]


@pharmacy_router.post("/purchase-orders/{po_id}/receive")
def receive_purchase_order(
    po_id: int,
    body: ReceivePOBody,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    allowed = ['clinic_admin', 'pharmacist']
    if current.role not in allowed:
        raise HTTPException(status_code=403, detail="Access denied")
    po = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == po_id, PurchaseOrder.clinic_id == current.clinic_id
    ).first()
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    if po.status == 'received':
        raise HTTPException(status_code=400, detail="PO already received")

    for recv in body.items:
        poi = db.query(PurchaseOrderItem).filter(
            PurchaseOrderItem.id == recv.item_id, PurchaseOrderItem.po_id == po.id
        ).first()
        if not poi:
            continue
        poi.quantity_received = recv.quantity_received
        if recv.batch_number:
            poi.batch_number = recv.batch_number
        if recv.expiry_date:
            try:
                poi.expiry_date = dt_date.fromisoformat(recv.expiry_date)
            except Exception:
                pass

        if poi.medicine_id and recv.quantity_received > 0:
            med = db.query(Medicine).filter(Medicine.id == poi.medicine_id).first()
            if med:
                qty_before = med.stock_quantity or 0
                med.stock_quantity = qty_before + recv.quantity_received
                db.add(StockTransaction(
                    clinic_id=current.clinic_id,
                    branch_id=current.branch_id,
                    medicine_id=med.id,
                    transaction_type='receive',
                    quantity=recv.quantity_received,
                    quantity_before=qty_before,
                    quantity_after=med.stock_quantity,
                    batch_number=recv.batch_number,
                    expiry_date=poi.expiry_date,
                    unit_cost=poi.unit_cost,
                    notes=f"GRN from PO {po.po_number}",
                    performed_by=current.id,
                ))
                # Update or create medicine batch
                existing_batch = None
                if recv.batch_number:
                    existing_batch = db.query(MedicineBatch).filter(
                        MedicineBatch.medicine_id == poi.medicine_id,
                        MedicineBatch.clinic_id == current.clinic_id,
                        MedicineBatch.batch_number == recv.batch_number,
                    ).first()
                if existing_batch:
                    existing_batch.quantity += recv.quantity_received
                else:
                    db.add(MedicineBatch(
                        medicine_id=poi.medicine_id,
                        clinic_id=current.clinic_id,
                        branch_id=current.branch_id,
                        batch_number=recv.batch_number,
                        expiry_date=poi.expiry_date,
                        quantity=recv.quantity_received,
                        unit_cost=poi.unit_cost,
                        supplier_id=po.supplier_id,
                    ))

    po.status = 'received'
    db.commit()
    return {"message": "PO received and stock updated"}


# ══════════════════════════════════════════════════════════════
# Sales Returns Router
# ══════════════════════════════════════════════════════════════

class ReturnItemIn(BaseModel):
    medicine_id: Optional[int] = None
    medicine_name: Optional[str] = None
    quantity: int
    unit_price: Optional[Decimal] = None


class SalesReturnCreate(BaseModel):
    invoice_id: Optional[int] = None
    reason: str
    refund_method: Optional[str] = "cash"
    items: List[ReturnItemIn]


@pharmacy_router.post("/returns")
def create_sales_return(
    payload: SalesReturnCreate,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    allowed = ['clinic_admin', 'pharmacist']
    if current.role not in allowed:
        raise HTTPException(status_code=403, detail="Access denied")

    total_refund = sum(
        (i.quantity * float(i.unit_price or 0)) for i in payload.items
    )

    # Generate return number
    prefix = f"CR{datetime.utcnow().strftime('%Y%m%d')}"
    count = db.query(SalesReturn).filter(
        SalesReturn.return_number.like(f"{prefix}%"),
        SalesReturn.clinic_id == current.clinic_id,
    ).count()
    return_number = f"{prefix}{count + 1:04d}"

    ret = SalesReturn(
        clinic_id=current.clinic_id,
        invoice_id=payload.invoice_id,
        return_number=return_number,
        reason=payload.reason,
        total_refund=Decimal(str(total_refund)),
        refund_method=payload.refund_method,
        processed_by=current.id,
    )
    db.add(ret)
    db.flush()

    for item in payload.items:
        item_total = item.quantity * float(item.unit_price or 0)
        db.add(SalesReturnItem(
            return_id=ret.id,
            medicine_id=item.medicine_id,
            medicine_name=item.medicine_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total=Decimal(str(item_total)),
        ))
        # Return stock
        if item.medicine_id and item.quantity > 0:
            med = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
            if med:
                qty_before = med.stock_quantity or 0
                med.stock_quantity = qty_before + item.quantity
                db.add(StockTransaction(
                    clinic_id=current.clinic_id,
                    branch_id=current.branch_id,
                    medicine_id=med.id,
                    transaction_type='return',
                    quantity=item.quantity,
                    quantity_before=qty_before,
                    quantity_after=med.stock_quantity,
                    notes=f"Sales return {return_number}",
                    performed_by=current.id,
                ))

    db.commit()
    db.refresh(ret)
    return {"id": ret.id, "return_number": ret.return_number, "total_refund": float(ret.total_refund)}


@pharmacy_router.get("/returns")
def list_sales_returns(
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    returns = db.query(SalesReturn).filter(
        SalesReturn.clinic_id == current.clinic_id
    ).order_by(SalesReturn.created_at.desc()).limit(200).all()
    result = []
    for r in returns:
        inv = db.query(Invoice).filter(Invoice.id == r.invoice_id).first() if r.invoice_id else None
        result.append({
            "id": r.id, "return_number": r.return_number,
            "invoice_id": r.invoice_id,
            "invoice_number": inv.invoice_number if inv else None,
            "reason": r.reason, "total_refund": float(r.total_refund or 0),
            "refund_method": r.refund_method, "created_at": str(r.created_at),
            "items": [
                {
                    "id": i.id, "medicine_name": i.medicine_name,
                    "quantity": i.quantity, "unit_price": float(i.unit_price or 0),
                    "total": float(i.total or 0),
                }
                for i in r.items
            ],
        })
    return result


# ══════════════════════════════════════════════════════════════
# Drug Register
# ══════════════════════════════════════════════════════════════

@pharmacy_router.get("/drug-register")
def get_drug_register(
    schedule: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    q = db.query(DrugRegister).filter(DrugRegister.clinic_id == current.clinic_id)
    if schedule:
        q = q.filter(DrugRegister.schedule == schedule)
    if from_date:
        try:
            q = q.filter(DrugRegister.sold_at >= dt_date.fromisoformat(from_date))
        except Exception:
            pass
    if to_date:
        try:
            q = q.filter(DrugRegister.sold_at <= datetime.fromisoformat(to_date + "T23:59:59"))
        except Exception:
            pass
    entries = q.order_by(DrugRegister.sold_at.desc()).limit(500).all()
    return [
        {
            "id": e.id, "medicine_name": e.medicine_name, "schedule": e.schedule,
            "patient_name": e.patient_name, "patient_age": e.patient_age,
            "patient_address": e.patient_address, "doctor_name": e.doctor_name,
            "doctor_reg_number": e.doctor_reg_number, "quantity": e.quantity,
            "batch_number": e.batch_number,
            "sold_at": e.sold_at.isoformat() if e.sold_at else None,
            "invoice_id": e.invoice_id,
        }
        for e in entries
    ]


# ══════════════════════════════════════════════════════════════
# Medicine Batches
# ══════════════════════════════════════════════════════════════

@pharmacy_router.get("/medicines/{med_id}/batches")
def get_medicine_batches(
    med_id: int,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    batches = db.query(MedicineBatch).filter(
        MedicineBatch.medicine_id == med_id,
        MedicineBatch.clinic_id == current.clinic_id,
    ).order_by(MedicineBatch.expiry_date.asc().nullslast()).all()
    return [
        {
            "id": b.id, "batch_number": b.batch_number,
            "expiry_date": str(b.expiry_date) if b.expiry_date else None,
            "quantity": b.quantity,
            "unit_cost": float(b.unit_cost) if b.unit_cost else None,
            "received_at": str(b.received_at),
        }
        for b in batches
    ]


# ══════════════════════════════════════════════════════════════
# Alerts
# ══════════════════════════════════════════════════════════════

@pharmacy_router.get("/alerts")
def get_alerts(
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from datetime import timedelta
    today = dt_date.today()
    thirty_days = today + timedelta(days=30)
    three_days_ago = datetime.utcnow() - timedelta(days=3)

    low_stock = db.query(Medicine).filter(
        Medicine.clinic_id == None,  # medicines are branch-scoped but check all active
        Medicine.is_active == True,
        Medicine.stock_quantity <= Medicine.reorder_level,
    ).all() if False else db.query(Medicine).filter(
        Medicine.is_active == True,
        Medicine.branch_id == current.branch_id,
        Medicine.stock_quantity <= Medicine.reorder_level,
    ).all() if current.branch_id else db.query(Medicine).filter(
        Medicine.is_active == True,
        Medicine.stock_quantity <= Medicine.reorder_level,
    ).limit(50).all()

    expiring_soon = db.query(MedicineBatch).filter(
        MedicineBatch.clinic_id == current.clinic_id,
        MedicineBatch.expiry_date != None,
        MedicineBatch.expiry_date <= thirty_days,
        MedicineBatch.expiry_date >= today,
        MedicineBatch.quantity > 0,
    ).all()

    expired = db.query(MedicineBatch).filter(
        MedicineBatch.clinic_id == current.clinic_id,
        MedicineBatch.expiry_date != None,
        MedicineBatch.expiry_date < today,
        MedicineBatch.quantity > 0,
    ).all()

    pending_pos = db.query(PurchaseOrder).filter(
        PurchaseOrder.clinic_id == current.clinic_id,
        PurchaseOrder.status == 'draft',
        PurchaseOrder.created_at <= three_days_ago,
    ).all()

    def med_name(med_id):
        m = db.query(Medicine).filter(Medicine.id == med_id).first()
        return m.name if m else "Unknown"

    return {
        "low_stock": [
            {"id": m.id, "name": m.name, "stock_quantity": m.stock_quantity, "reorder_level": m.reorder_level}
            for m in low_stock
        ],
        "expiring_soon": [
            {
                "id": b.id, "medicine_name": med_name(b.medicine_id),
                "batch_number": b.batch_number, "expiry_date": str(b.expiry_date),
                "quantity": b.quantity,
            }
            for b in expiring_soon
        ],
        "expired": [
            {
                "id": b.id, "medicine_name": med_name(b.medicine_id),
                "batch_number": b.batch_number, "expiry_date": str(b.expiry_date),
                "quantity": b.quantity,
            }
            for b in expired
        ],
        "pending_pos": [
            {"id": po.id, "po_number": po.po_number, "created_at": str(po.created_at)}
            for po in pending_pos
        ],
        "total_count": len(low_stock) + len(expiring_soon) + len(expired) + len(pending_pos),
    }


# ══════════════════════════════════════════════════════════════
# Enhanced Reports
# ══════════════════════════════════════════════════════════════

@pharmacy_router.get("/reports/profit-loss")
def profit_loss_report(
    from_date: str = Query(...),
    to_date: str = Query(...),
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from sqlalchemy import text
    sql = text("""
        SELECT
            ii.description as medicine_name,
            ii.medicine_id,
            SUM(ii.quantity) as qty_sold,
            SUM(ii.total) as revenue,
            COALESCE(SUM(ii.quantity * st.unit_cost), 0) as cogs,
            SUM(ii.gst_amount) as gst_collected
        FROM invoice_items ii
        JOIN invoices inv ON ii.invoice_id = inv.id
        LEFT JOIN LATERAL (
            SELECT unit_cost FROM stock_transactions
            WHERE medicine_id = ii.medicine_id AND clinic_id = :clinic_id
            AND transaction_type = 'receive'
            ORDER BY created_at DESC LIMIT 1
        ) st ON TRUE
        WHERE inv.clinic_id = :clinic_id
        AND inv.status != 'cancelled'
        AND DATE(inv.created_at) BETWEEN :from_date AND :to_date
        AND ii.medicine_id IS NOT NULL
        GROUP BY ii.description, ii.medicine_id
        ORDER BY revenue DESC
        LIMIT 200
    """)
    rows = db.execute(sql, {
        "clinic_id": current.clinic_id,
        "from_date": from_date,
        "to_date": to_date,
    }).fetchall()

    result = []
    total_rev = 0
    total_cogs = 0
    for r in rows:
        rev = float(r.revenue or 0)
        cogs = float(r.cogs or 0)
        profit = rev - cogs
        margin = (profit / rev * 100) if rev > 0 else 0
        total_rev += rev
        total_cogs += cogs
        result.append({
            "medicine_name": r.medicine_name,
            "qty_sold": int(r.qty_sold or 0),
            "revenue": rev,
            "cogs": cogs,
            "gross_profit": profit,
            "margin_pct": round(margin, 2),
        })

    return {
        "items": result,
        "summary": {
            "total_revenue": total_rev,
            "total_cogs": total_cogs,
            "gross_profit": total_rev - total_cogs,
        },
    }


@pharmacy_router.get("/reports/supplier-purchases")
def supplier_purchase_report(
    from_date: str = Query(...),
    to_date: str = Query(...),
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    orders = db.query(PurchaseOrder).filter(
        PurchaseOrder.clinic_id == current.clinic_id,
        PurchaseOrder.status.in_(['sent', 'received']),
    ).all()

    by_supplier = {}
    for po in orders:
        if not po.created_at:
            continue
        po_date = po.created_at.date().isoformat()
        if po_date < from_date or po_date > to_date:
            continue
        sid = po.supplier_id or 0
        sup = db.query(Supplier).filter(Supplier.id == sid).first() if sid else None
        sname = sup.name if sup else "Unknown"
        if sid not in by_supplier:
            by_supplier[sid] = {"supplier_name": sname, "total_pos": 0, "total_value": 0, "medicines": set()}
        by_supplier[sid]["total_pos"] += 1
        by_supplier[sid]["total_value"] += float(po.total_amount or 0)
        for item in po.items:
            if item.medicine_name:
                by_supplier[sid]["medicines"].add(item.medicine_name)

    return [
        {
            "supplier_id": sid,
            "supplier_name": data["supplier_name"],
            "total_pos": data["total_pos"],
            "total_value": data["total_value"],
            "medicines_count": len(data["medicines"]),
        }
        for sid, data in by_supplier.items()
    ]


@pharmacy_router.get("/reports/abc-analysis")
def abc_analysis(
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from sqlalchemy import text
    sql = text("""
        SELECT ii.medicine_id, ii.description as medicine_name,
               SUM(ii.total) as sales_value, SUM(ii.quantity) as qty_sold
        FROM invoice_items ii
        JOIN invoices inv ON ii.invoice_id = inv.id
        WHERE inv.clinic_id = :clinic_id AND inv.status != 'cancelled'
        AND ii.medicine_id IS NOT NULL
        GROUP BY ii.medicine_id, ii.description
        ORDER BY sales_value DESC
    """)
    rows = db.execute(sql, {"clinic_id": current.clinic_id}).fetchall()
    total_value = sum(float(r.sales_value or 0) for r in rows)
    result = []
    cumulative = 0
    for r in rows:
        val = float(r.sales_value or 0)
        cumulative += val
        pct = (cumulative / total_value * 100) if total_value > 0 else 0
        if pct <= 80:
            category = 'A'
        elif pct <= 95:
            category = 'B'
        else:
            category = 'C'
        result.append({
            "medicine_id": r.medicine_id,
            "medicine_name": r.medicine_name,
            "sales_value": val,
            "qty_sold": int(r.qty_sold or 0),
            "category": category,
        })
    return result


@pharmacy_router.get("/reports/hsn-gst")
def hsn_gst_report(
    from_date: str = Query(...),
    to_date: str = Query(...),
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from sqlalchemy import text
    sql = text("""
        SELECT
            COALESCE(ii.hsn_code, 'Unclassified') as hsn_code,
            ii.gst_rate,
            COUNT(DISTINCT inv.id) as invoice_count,
            SUM(ii.quantity * ii.unit_price - COALESCE(ii.discount_amount, 0)) as taxable_value,
            SUM(ii.gst_amount) as total_gst,
            SUM(ii.gst_amount) / 2 as cgst,
            SUM(ii.gst_amount) / 2 as sgst
        FROM invoice_items ii
        JOIN invoices inv ON ii.invoice_id = inv.id
        WHERE inv.clinic_id = :clinic_id
        AND inv.status != 'cancelled'
        AND DATE(inv.created_at) BETWEEN :from_date AND :to_date
        GROUP BY ii.hsn_code, ii.gst_rate
        ORDER BY taxable_value DESC
    """)
    rows = db.execute(sql, {
        "clinic_id": current.clinic_id,
        "from_date": from_date,
        "to_date": to_date,
    }).fetchall()
    return [
        {
            "hsn_code": r.hsn_code,
            "gst_rate": float(r.gst_rate or 0),
            "invoice_count": int(r.invoice_count or 0),
            "taxable_value": float(r.taxable_value or 0),
            "cgst": float(r.cgst or 0),
            "sgst": float(r.sgst or 0),
            "igst": 0.0,
            "total_gst": float(r.total_gst or 0),
        }
        for r in rows
    ]


# ── Referring Doctors ─────────────────────────────────────────────────────────

@imaging_router.get("/referring-doctors")
def list_referring_doctors(
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from app.models.models import ReferringDoctor, ImagingOrder
    from sqlalchemy import func as sqlfunc
    doctors = db.query(ReferringDoctor).filter(
        ReferringDoctor.clinic_id == current.clinic_id,
        ReferringDoctor.is_active == True,
    ).order_by(ReferringDoctor.name).all()
    result = []
    for d in doctors:
        count = db.query(sqlfunc.count(ImagingOrder.id)).filter(
            ImagingOrder.clinic_id == current.clinic_id,
            ImagingOrder.referring_doctor == d.name,
        ).scalar() or 0
        result.append({
            "id": d.id, "name": d.name, "registration_number": d.registration_number,
            "specialization": d.specialization, "hospital": d.hospital,
            "mobile": d.mobile, "email": d.email, "address": d.address,
            "notes": d.notes, "is_active": d.is_active, "referral_count": count,
        })
    return result


@imaging_router.post("/referring-doctors")
def create_referring_doctor(
    body: dict,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from app.models.models import ReferringDoctor
    doc = ReferringDoctor(
        clinic_id=current.clinic_id,
        name=body.get("name","").strip(),
        registration_number=body.get("registration_number"),
        specialization=body.get("specialization"),
        hospital=body.get("hospital"),
        mobile=body.get("mobile"),
        email=body.get("email"),
        address=body.get("address"),
        notes=body.get("notes"),
    )
    db.add(doc); db.commit(); db.refresh(doc)
    return {"id": doc.id, "name": doc.name}


@imaging_router.put("/referring-doctors/{doctor_id}")
def update_referring_doctor(
    doctor_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from app.models.models import ReferringDoctor
    doc = db.query(ReferringDoctor).filter(
        ReferringDoctor.id == doctor_id,
        ReferringDoctor.clinic_id == current.clinic_id,
    ).first()
    if not doc:
        raise HTTPException(404, "Doctor not found")
    for k in ("name","registration_number","specialization","hospital","mobile","email","address","notes","is_active"):
        if k in body:
            setattr(doc, k, body[k])
    db.commit(); db.refresh(doc)
    return {"id": doc.id, "name": doc.name}


# ── Imaging Schedule ──────────────────────────────────────────────────────────

@imaging_router.get("/schedule/slots")
def list_imaging_slots(
    date: str = Query(...),
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from app.models.models import ImagingSlot, ImagingBooking
    slots = db.query(ImagingSlot).filter(
        ImagingSlot.clinic_id == current.clinic_id,
        ImagingSlot.date == date,
    ).order_by(ImagingSlot.time).all()
    result = []
    for s in slots:
        bookings = db.query(ImagingBooking).filter(ImagingBooking.slot_id == s.id).all()
        result.append({
            "id": s.id, "date": str(s.date), "time": s.time,
            "modality": s.modality, "capacity": s.capacity,
            "bookings": [
                {
                    "patient_name": b.patient_name, "patient_mobile": b.patient_mobile,
                    "referring_doctor": b.referring_doctor, "priority": b.priority,
                    "study_description": b.study_description,
                }
                for b in bookings
            ],
        })
    return result


@imaging_router.post("/schedule/slots")
def create_imaging_slot(
    body: dict,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from app.models.models import ImagingSlot
    slot = ImagingSlot(
        clinic_id=current.clinic_id,
        date=body.get("date"),
        time=body.get("time","09:00"),
        modality=body.get("modality","CT"),
        capacity=int(body.get("capacity",1)),
    )
    db.add(slot); db.commit(); db.refresh(slot)
    return {"id": slot.id}


@imaging_router.post("/schedule/book")
def book_imaging_slot(
    body: dict,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    from app.models.models import ImagingSlot, ImagingBooking
    slot_id = body.get("slot_id")
    slot = db.query(ImagingSlot).filter(
        ImagingSlot.id == slot_id,
        ImagingSlot.clinic_id == current.clinic_id,
    ).first()
    if not slot:
        raise HTTPException(404, "Slot not found")
    booked_count = db.query(ImagingBooking).filter(ImagingBooking.slot_id == slot_id).count()
    if booked_count >= slot.capacity:
        raise HTTPException(400, "Slot is fully booked")
    booking = ImagingBooking(
        slot_id=slot_id,
        clinic_id=current.clinic_id,
        patient_name=body.get("patient_name",""),
        patient_mobile=body.get("patient_mobile"),
        modality=slot.modality,
        study_description=body.get("study_description"),
        referring_doctor=body.get("referring_doctor"),
        priority=body.get("priority","routine"),
        notes=body.get("notes"),
    )
    db.add(booking); db.commit(); db.refresh(booking)
    return {"id": booking.id}
