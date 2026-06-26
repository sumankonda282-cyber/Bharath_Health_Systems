from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload
from app.db.session import get_db
from app.core.security import get_current_staff, get_current_patient_user
from app.models.models import (
    Prescription, PrescriptionItem, LabOrder, LabOrderItem,
    Invoice, Patient, Branch, Clinic, Staff, Appointment, SoapNote, Vitals,
    ImagingOrder, ImagingResult,
)
from app.services.pdf_service import (
    generate_prescription_pdf,
    generate_lab_report_pdf,
    generate_invoice_pdf,
    generate_encounter_summary_pdf,
    generate_imaging_report_pdf,
)
from datetime import date

router = APIRouter(prefix="/pdf", tags=["pdf"])


def _clinic_data(patient: Patient, db: Session, doctor_staff_id: int = None) -> dict:
    branch = db.query(Branch).filter(Branch.id == patient.branch_id).first()
    clinic = db.query(Clinic).filter(Clinic.id == patient.clinic_id).first()
    doctor_name = ""
    if doctor_staff_id:
        doc = db.query(Staff).filter(Staff.id == doctor_staff_id).first()
        if doc:
            doctor_name = doc.full_name
    address = ", ".join(filter(None, [
        branch.address if branch else None,
        branch.city if branch else None,
        branch.state if branch else None,
    ]))
    return {
        "clinic_name":  clinic.name if clinic else "BHarath Health",
        "branch_name":  branch.name if branch else "",
        "address":      address,
        "doctor_name":  doctor_name,
        "hc_id":        (clinic.hc_id if clinic else "") or "",
    }


def _patient_data(patient: Patient) -> dict:
    age = None
    if patient.date_of_birth:
        age = (date.today() - patient.date_of_birth).days // 365
    return {
        "full_name": patient.full_name,
        "uhid":      patient.uhid,
        "age":       f"{age} yrs" if age else "—",
        "gender":    patient.gender or "—",      # String, not Enum
        "allergies": patient.allergies,
    }


# ── Staff-facing PDF routes ───────────────────────────────────────────────────

@router.get("/prescription/{pres_id}")
def download_prescription(
    pres_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    pres = db.query(Prescription).options(
        joinedload(Prescription.items).joinedload(PrescriptionItem.medicine)
    ).filter(Prescription.id == pres_id).first()
    if not pres:
        raise HTTPException(status_code=404, detail="Not found")

    patient = db.query(Patient).filter(Patient.id == pres.patient_id).first()
    clinic_data = _clinic_data(patient, db, pres.prescribed_by)
    pres_dict = {
        "notes": pres.notes,
        "items": [
            {
                "medicine_name": i.medicine_name or (i.medicine.name if i.medicine else "—"),
                "dosage":        i.dosage,
                "frequency":     i.frequency,
                "duration":      i.duration,
                "instructions":  i.instructions,
            }
            for i in pres.items
        ]
    }
    pdf = generate_prescription_pdf(pres_dict, _patient_data(patient), clinic_data)
    return Response(
        content=pdf, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=prescription_{pres_id}.pdf"}
    )


@router.get("/lab-report/{order_id}")
def download_lab_report(
    order_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    order = db.query(LabOrder).options(
        joinedload(LabOrder.items).joinedload(LabOrderItem.test)
    ).filter(LabOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Not found")

    patient = db.query(Patient).filter(Patient.id == order.patient_id).first()
    clinic_data = _clinic_data(patient, db, order.ordered_by)
    order_dict = {
        "items": [
            {
                "test_name":    i.test_name or (i.test.name if i.test else "—"),
                "result_value": i.result_value or "Pending",
                "unit":         i.test.unit if i.test else "",
                "normal_range": i.test.normal_range if i.test else "",
                "is_abnormal":  i.is_abnormal,
            }
            for i in order.items
        ]
    }
    pdf = generate_lab_report_pdf(order_dict, _patient_data(patient), clinic_data)
    return Response(
        content=pdf, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=lab_report_{order_id}.pdf"}
    )


def _imaging_study_dict(order: ImagingOrder, result, db: Session) -> dict:
    radiologist = ""
    if result and result.signed_by:
        rdoc = db.query(Staff).filter(Staff.id == result.signed_by).first()
        radiologist = f"Dr. {rdoc.full_name}" if rdoc else ""
    return {
        "modality":          order.modality,
        "body_part":         order.body_part,
        "study_description": order.study_description,
        "status":            (result.status if result else order.status),
        "contrast":          getattr(order, "contrast_agent", None) if getattr(order, "contrast_used", None) else None,
        "findings":          result.findings if result else None,
        "impression":        result.impression if result else None,
        "radiologist":       radiologist,
    }


@router.get("/imaging-report/{order_id}")
def download_imaging_report(
    order_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    order = db.query(ImagingOrder).filter(ImagingOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Not found")
    result = db.query(ImagingResult).filter(ImagingResult.order_id == order_id).first()
    patient = db.query(Patient).filter(Patient.id == order.patient_id).first()
    clinic_data = _clinic_data(patient, db, order.ordered_by)
    pdf = generate_imaging_report_pdf(_imaging_study_dict(order, result, db), _patient_data(patient), clinic_data)
    return Response(
        content=pdf, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=imaging_report_{order_id}.pdf"}
    )


@router.get("/invoice/{invoice_id}")
def download_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    inv = db.query(Invoice).options(joinedload(Invoice.items)).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Not found")

    patient = db.query(Patient).filter(Patient.id == inv.patient_id).first()
    clinic_data = _clinic_data(patient, db)
    inv_dict = {
        "invoice_number": inv.invoice_number,
        "date":           inv.created_at.strftime("%d %b %Y"),
        "payment_method": inv.payment_method or "",
        "subtotal":       float(inv.subtotal),
        "discount":       float(inv.discount),
        "tax":            float(inv.tax),
        "total":          float(inv.total),
        "amount_paid":    float(inv.amount_paid),
        "items": [
            {"description": i.description, "item_type": i.item_type,
             "quantity": i.quantity, "unit_price": float(i.unit_price or 0),
             "total": float(i.total or 0)}
            for i in inv.items
        ]
    }
    pdf = generate_invoice_pdf(inv_dict, _patient_data(patient), clinic_data)
    return Response(
        content=pdf, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={inv.invoice_number or f'invoice_{invoice_id}'}.pdf"}
    )


@router.get("/encounter/{appointment_id}")
def download_encounter_summary(
    appointment_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_staff),
):
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    patient = db.query(Patient).filter(Patient.id == appt.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    sn = db.query(SoapNote).filter(SoapNote.appointment_id == appointment_id).first()
    vitals = db.query(Vitals).filter(Vitals.appointment_id == appointment_id).first()

    # Prescriptions for this appointment
    pres_list = db.query(Prescription).filter(
        Prescription.appointment_id == appointment_id
    ).options(joinedload(Prescription.items).joinedload(PrescriptionItem.medicine)).all()
    rx_items = []
    for pres in pres_list:
        for item in pres.items:
            rx_items.append({
                "medicine_name": item.medicine_name or (item.medicine.name if item.medicine else "—"),
                "dosage":        item.dosage or "",
                "frequency":     item.frequency or "",
                "duration":      item.duration or "",
                "instructions":  item.instructions or "",
            })

    # Lab orders for this appointment
    lab_orders = db.query(LabOrder).filter(
        LabOrder.appointment_id == appointment_id
    ).all()
    lab_list = [{"test_names": lo.test_names or [], "status": lo.status} for lo in lab_orders]

    # Build doctor name
    doctor_staff_id = None
    if appt.doctor:
        doctor_staff_id = appt.doctor.staff_id if hasattr(appt.doctor, "staff_id") else None
    clinic_data = _clinic_data(patient, db, doctor_staff_id)

    # Vitals dict
    v = None
    if vitals:
        bp = None
        if vitals.blood_pressure_systolic and vitals.blood_pressure_diastolic:
            bp = f"{vitals.blood_pressure_systolic}/{vitals.blood_pressure_diastolic}"
        v = {
            "bp":     bp,
            "pulse":  vitals.pulse_rate,
            "temp":   float(vitals.temperature) if vitals.temperature else None,
            "spo2":   vitals.oxygen_saturation,
            "weight": float(vitals.weight_kg) if vitals.weight_kg else None,
            "height": float(vitals.height_cm) if vitals.height_cm else None,
            "rbs":    float(vitals.blood_sugar) if vitals.blood_sugar else None,
        }

    enc = {
        "date":                  appt.appointment_date.strftime("%d %b %Y") if appt.appointment_date else "",
        "reason_for_visit":      sn.reason_for_visit if sn else (appt.triage_complaint or ""),
        "patient_complaints":    sn.patient_complaints if sn else "",
        "past_history":          sn.past_history if sn else "",
        "investigations_findings": sn.investigations_findings if sn else (sn.objective if sn else ""),
        "discharge_assessment":  sn.discharge_assessment if sn else (sn.assessment if sn else ""),
        "cautions_followup":     sn.cautions_followup if sn else (sn.plan if sn else ""),
        "diagnosis_codes":       sn.diagnosis_codes if sn else None,
        "follow_up_days":        sn.follow_up_days if sn else None,
        "counselling":           None,
        "vitals":                v,
        "prescriptions":         rx_items,
        "lab_orders":            lab_list,
    }

    pdf = generate_encounter_summary_pdf(enc, _patient_data(patient), clinic_data)
    fname = f"encounter_{appointment_id}_{patient.full_name.replace(' ', '_') if patient.full_name else 'summary'}.pdf"
    return Response(
        content=pdf, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={fname}"}
    )


# ── Patient portal PDF routes ─────────────────────────────────────────────────

@router.get("/portal/prescription/{pres_id}")
def patient_download_prescription(
    pres_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_patient_user),
):
    pres = db.query(Prescription).options(
        joinedload(Prescription.items)
    ).filter(Prescription.id == pres_id).first()
    if not pres:
        raise HTTPException(status_code=404, detail="Not found")

    patient = db.query(Patient).filter(
        Patient.id == pres.patient_id,
        Patient.portal_user_id == current.id
    ).first()
    if not patient:
        raise HTTPException(status_code=403, detail="Access denied")

    clinic_data = _clinic_data(patient, db, pres.prescribed_by)
    pres_dict = {
        "notes": pres.notes,
        "items": [
            {"medicine_name": i.medicine_name, "dosage": i.dosage,
             "frequency": i.frequency, "duration": i.duration,
             "instructions": i.instructions}
            for i in pres.items
        ]
    }
    pdf = generate_prescription_pdf(pres_dict, _patient_data(patient), clinic_data)
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename=prescription_{pres_id}.pdf"})


@router.get("/portal/lab-report/{order_id}")
def patient_download_lab_report(
    order_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_patient_user),
):
    order = db.query(LabOrder).options(
        joinedload(LabOrder.items)
    ).filter(LabOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Not found")

    patient = db.query(Patient).filter(
        Patient.id == order.patient_id,
        Patient.portal_user_id == current.id
    ).first()
    if not patient:
        raise HTTPException(status_code=403, detail="Access denied")

    clinic_data = _clinic_data(patient, db, order.ordered_by)
    order_dict = {
        "items": [
            {"test_name": i.test_name, "result_value": i.result_value or "Pending",
             "unit": "", "normal_range": "", "is_abnormal": i.is_abnormal}
            for i in order.items
        ]
    }
    pdf = generate_lab_report_pdf(order_dict, _patient_data(patient), clinic_data)
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename=lab_report_{order_id}.pdf"})


@router.get("/portal/imaging-report/{order_id}")
def patient_download_imaging_report(
    order_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_patient_user),
):
    order = db.query(ImagingOrder).filter(ImagingOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Not found")
    patient = db.query(Patient).filter(
        Patient.id == order.patient_id,
        Patient.portal_user_id == current.id
    ).first()
    if not patient:
        raise HTTPException(status_code=403, detail="Access denied")
    result = db.query(ImagingResult).filter(ImagingResult.order_id == order_id).first()
    clinic_data = _clinic_data(patient, db, order.ordered_by)
    pdf = generate_imaging_report_pdf(_imaging_study_dict(order, result, db), _patient_data(patient), clinic_data)
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename=imaging_report_{order_id}.pdf"})


@router.get("/portal/invoice/{invoice_id}")
def patient_download_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_patient_user),
):
    inv = db.query(Invoice).options(joinedload(Invoice.items)).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Not found")
    patient = db.query(Patient).filter(
        Patient.id == inv.patient_id,
        Patient.portal_user_id == current.id
    ).first()
    if not patient:
        raise HTTPException(status_code=403, detail="Access denied")
    clinic_data = _clinic_data(patient, db)
    inv_dict = {
        "invoice_number": inv.invoice_number,
        "date":           inv.created_at.strftime("%d %b %Y") if inv.created_at else "",
        "payment_method": inv.payment_method or "",
        "subtotal":       float(inv.subtotal or 0),
        "discount":       float(inv.discount or 0),
        "tax":            float(inv.tax or 0),
        "total":          float(inv.total or 0),
        "amount_paid":    float(inv.amount_paid or 0),
        "items": [
            {"description": i.description, "item_type": i.item_type,
             "quantity": i.quantity, "unit_price": float(i.unit_price or 0),
             "total": float(i.total or 0)}
            for i in inv.items
        ]
    }
    pdf = generate_invoice_pdf(inv_dict, _patient_data(patient), clinic_data)
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename=invoice_{inv.invoice_number or invoice_id}.pdf"})
