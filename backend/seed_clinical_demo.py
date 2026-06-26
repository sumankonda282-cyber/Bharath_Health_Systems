"""
Comprehensive clinical demo seed for the Apollo Demo Clinic.
===========================================================
Extends the base ``seed.py`` (which creates ``drpriya@apollodemo.com`` and the
Apollo Demo Clinic) with *rich, real-world* data so every feature of all nine
portals can be exercised by a tester — Provider, CareChart, Reception/Manager
(staff), Pharmacy, Lab, Imaging, Patient, Public and Admin — including
telehealth.

Design
------
* **Direct-DB, idempotent, fast.** Runs inside the same session as ``seed.py``
  (called at the end of ``seed()``), so it inherits the committed clinic/staff.
* **Self-skipping.** A sentinel ``PlatformSetting`` key short-circuits re-runs
  after the first successful pass, so deploys stay fast.
* **Section-isolated.** Every block commits independently and, on any error,
  rolls back just that block and logs — one failure never aborts the rest, and
  critical auth data committed by ``seed.py`` is never touched.
* **Correct IDs.** Human-readable identifiers (encounter, lab/imaging order,
  invoice numbers …) are minted through ``app.core.ids`` exactly like the live
  API, so the seeded rows are indistinguishable from real ones.

Re-running is safe: patients are matched by (clinic, mobile) and child data is
only added when a patient has none, so a partial run can be resumed cleanly.
"""
from datetime import datetime, date, timedelta

from app.core import ids
from app.models.models import (
    Clinic, Branch, Staff, DoctorProfile, Patient, PatientUser, BHProfile,
    Appointment, OnlineBooking, Vitals, SoapNote, Prescription, PrescriptionItem,
    Invoice, InvoiceItem, InvoicePayment, FollowUpReminder,
    Medicine, LabTest, LabOrder, LabOrderItem, LabResult, LabCriticalAlert,
    ImagingOrder, ImagingResult, ImagingReportTemplate, ImagingCriticalAlert,
    ReferringDoctor, BarcodeMaster,
    Supplier, PurchaseOrder, PurchaseOrderItem, MedicineBatch, StockTransaction,
    PharmacyOrder, DispenseSession, DispenseItem, SalesReturn, SalesReturnItem,
    DrugRegister,
    Department, Ward, Bed, Admission, AdmissionTransfer, VitalSign, NursingNote,
    MedicationOrder, MedicationAdministration, WardRound, ProgressNote,
    ClinicalOrder, DischargeSummary, InpatientCharge, InpatientBill,
    DocumentationSession, VisitorPolicy, VisitorPass,
    TelehealthSession, TelehealthSessionEvent,
    ShiftType, StaffGroup, StaffGroupMember, ScheduleEntry, LeaveRequest,
    SchedulerSettings,
    ChatRoom, ChatRoomMember, InternalMessage,
    InpatientReferral, PatientReferral,
    MaintenanceRequest, Feedback, DoctorRating, InsuranceClaim,
    ClinicPatientTag, PatientTag, FormTemplate, FormResponse, BillingWaiverLog,
)

SENTINEL_KEY = "demo_clinical_seeded_v1"
APOLLO_SLUG = "apollo-demo-clinic"


# ── small helpers ────────────────────────────────────────────────────────────
def _today():
    return date.today()


def _day(n):
    return date.today() + timedelta(days=n)


def _dt(days=0, hour=9, minute=0):
    base = datetime.now() + timedelta(days=days)
    return base.replace(hour=hour, minute=minute, second=0, microsecond=0)


def _ref(db, clinic_id, kind):
    """A small per-clinic atomic counter for demo business numbers."""
    return ids.next_sequence(db, "clinic", clinic_id, f"demo_{kind}")


def _already_seeded(db):
    from sqlalchemy import text
    row = db.execute(
        text("SELECT 1 FROM platform_settings WHERE key = :k"),
        {"k": SENTINEL_KEY},
    ).first()
    return row is not None


def _mark_seeded(db):
    from sqlalchemy import text
    db.execute(
        text("INSERT INTO platform_settings (key, value) VALUES (:k, :v) "
             "ON CONFLICT (key) DO UPDATE SET value = :v"),
        {"k": SENTINEL_KEY, "v": '{"seeded": true}'},
    )
    db.commit()


def _get_patient(db, clinic_id, mobile):
    return db.query(Patient).filter_by(clinic_id=clinic_id, mobile=mobile).first()


def _new_invoice(db, clinic, branch, *, patient=None, appointment_id=None,
                 admission_id=None, sale_type="consultation", encounter_type="OP",
                 items=None, paid="full", method="cash", received_by=None):
    """Create an Invoice + items (+ optional payment). ``items`` are dicts:
    {description, item_type, quantity, unit_price, gst_rate, hsn_code?}.
    ``paid`` ∈ {full, partial, none}. Returns the Invoice."""
    items = items or []
    subtotal = 0.0
    gst_total = 0.0
    inv = Invoice(
        clinic_id=clinic.id, branch_id=branch.id,
        patient_id=patient.id if patient else None,
        appointment_id=appointment_id, admission_id=admission_id,
        encounter_type=encounter_type, sale_type=sale_type,
        invoice_number=ids.next_clinic_invoice_no(db, clinic.id),
        customer_name=(patient.full_name if patient else None),
        customer_mobile=(patient.mobile if patient else None),
        status="pending",
    )
    db.add(inv)
    db.flush()
    for it in items:
        qty = it.get("quantity", 1)
        up = float(it.get("unit_price", 0))
        line = up * qty
        gst_rate = float(it.get("gst_rate", 0))
        gst_amt = round(line * gst_rate / 100, 2)
        subtotal += line
        gst_total += gst_amt
        db.add(InvoiceItem(
            invoice_id=inv.id, description=it.get("description"),
            item_type=it.get("item_type"), quantity=qty, unit_price=up,
            mrp=it.get("mrp", up), hsn_code=it.get("hsn_code"),
            gst_rate=gst_rate, gst_amount=gst_amt, total=round(line + gst_amt, 2),
        ))
    total = round(subtotal + gst_total, 2)
    inv.subtotal = round(subtotal, 2)
    inv.gst_amount = round(gst_total, 2)
    inv.tax = round(gst_total, 2)
    inv.total = total
    if paid == "full":
        inv.amount_paid = total
        inv.status = "paid"
        inv.payment_method = method
        inv.paid_at = datetime.now()
    elif paid == "partial":
        inv.amount_paid = round(total / 2, 2)
        inv.status = "partial"
        inv.payment_method = method
    else:
        inv.amount_paid = 0
        inv.status = "pending"
    db.flush()
    if inv.amount_paid and inv.amount_paid > 0:
        db.add(InvoicePayment(
            invoice_id=inv.id, clinic_id=clinic.id, amount=inv.amount_paid,
            method=method, reference=("TXN" + str(inv.id).zfill(6)),
            received_by=received_by,
        ))
    return inv


# ── main entry ───────────────────────────────────────────────────────────────
def seed_clinical_demo(db):
    if _already_seeded(db):
        print("[seed]   ✓ Clinical demo already seeded — skipping (sentinel set)")
        return

    clinic = db.query(Clinic).filter_by(slug=APOLLO_SLUG).first()
    if not clinic:
        print("[seed]   ⚠ Apollo demo clinic not found — skipping clinical demo")
        return
    branch = db.query(Branch).filter_by(clinic_id=clinic.id).first()
    if not branch:
        print("[seed]   ⚠ Apollo demo branch not found — skipping clinical demo")
        return

    hc_id = ids.ensure_hc_id(db, clinic)

    # Staff lookup by email (created/committed by seed.py before this runs)
    staff = {s.email: s for s in db.query(Staff).filter_by(clinic_id=clinic.id).all()}
    drpriya = staff.get("drpriya@apollodemo.com")
    drrajan = staff.get("drrajan@apollodemo.com")
    ravi = staff.get("ravi@apollodemo.com")          # receptionist
    meera = staff.get("meera@apollodemo.com")         # pharmacist
    arjun = staff.get("arjun@apollodemo.com")         # lab tech
    kiran = staff.get("kiran@apollodemo.com")         # imaging tech
    drsuresh = staff.get("drsuresh@apollodemo.com")   # radiologist
    manager = staff.get("manager@apollodemo.com")     # clinic manager
    nurse = staff.get("sister@apollodemo.com") or staff.get("nurse@apollodemo.com")

    if not drpriya:
        print("[seed]   ⚠ drpriya not found — skipping clinical demo")
        return

    # DoctorProfile ids (appointments reference doctor_profiles.id, not staff.id)
    dp_priya = db.query(DoctorProfile).filter_by(staff_id=drpriya.id).first()
    dp_rajan = db.query(DoctorProfile).filter_by(staff_id=drrajan.id).first() if drrajan else None
    priya_profile_id = dp_priya.id if dp_priya else None
    rajan_profile_id = dp_rajan.id if dp_rajan else priya_profile_id

    # Defensive: ensure demo doctor profiles are clinic-scoped (older seeds may
    # have left clinic_id NULL, which would hide them from clinic doctor lists).
    for _dp in (dp_priya, dp_rajan):
        if _dp and not _dp.clinic_id:
            _dp.clinic_id = clinic.id
    db.commit()

    # ── Clinic capabilities — turn every module on for the demo ──────────────
    try:
        clinic.has_pharmacy = True
        clinic.has_lab = True
        clinic.has_imaging = True
        clinic.has_inpatient = True
        clinic.has_emergency = True
        clinic.has_telehealth = True
        clinic.wards_enabled = True
        clinic.org_type = "hospital"
        clinic.total_beds = clinic.total_beds or 30
        clinic.icu_beds = clinic.icu_beds or 6
        clinic.ot_count = clinic.ot_count or 2
        clinic.clinic_prefix = clinic.clinic_prefix or "APL"
        clinic.gstin = clinic.gstin or "36AAPCA1234A1Z5"
        clinic.drug_license_number = clinic.drug_license_number or "TS/20B/2021/1234"
        clinic.nabl_accredited = True
        clinic.nabl_number = clinic.nabl_number or "MC-2024-APL-01"
        clinic.bridge_api_key = clinic.bridge_api_key or "apollo-demo-bridge-key-0001"
        clinic.modules = {
            "pharmacy": True, "lab": True, "imaging": True, "inpatient": True,
            "telehealth": True, "emergency": True, "scheduler": True, "billing": True,
        }
        # Make staff inpatient-capable so CareChart loads for them
        for s in (drpriya, drrajan, nurse, ravi, manager):
            if s:
                s.has_inpatient_access = True
        db.commit()
        print("[seed]   ✓ Apollo clinic capabilities enabled (all modules)")
    except Exception as e:
        db.rollback()
        print(f"[seed]   ⚠ clinic capabilities skipped: {e}")

    # ── Pharmacy: extended medicine catalogue + batches + suppliers ──────────
    med_by_name = {}
    try:
        for m in db.query(Medicine).filter_by(branch_id=branch.id).all():
            med_by_name[m.name] = m
        catalogue = [
            dict(name="Azithromycin 500mg", generic_name="Azithromycin", category="Antibiotic",
                 form="Tablet", strength="500mg", manufacturer="Cipla", unit_price=9.0, mrp=15.0,
                 stock_quantity=240, reorder_level=40, hsn_code="3004", schedule="H", gst_rate=12),
            dict(name="Pantoprazole 40mg", generic_name="Pantoprazole", category="Antacid",
                 form="Tablet", strength="40mg", manufacturer="Sun Pharma", unit_price=3.2, mrp=5.5,
                 stock_quantity=300, reorder_level=40, hsn_code="3004", gst_rate=12),
            dict(name="Ceftriaxone 1g Injection", generic_name="Ceftriaxone", category="Antibiotic",
                 form="Injection", strength="1g", manufacturer="Alkem", unit_price=28.0, mrp=45.0,
                 stock_quantity=80, reorder_level=20, hsn_code="3004", schedule="H", gst_rate=12),
            dict(name="Insulin Glargine 100IU", generic_name="Insulin Glargine", category="Antidiabetic",
                 form="Injection", strength="100IU/ml", manufacturer="Novo Nordisk", unit_price=240.0,
                 mrp=320.0, stock_quantity=18, reorder_level=10, hsn_code="3004", schedule="H", gst_rate=5),
            dict(name="Salbutamol Inhaler", generic_name="Salbutamol", category="Respiratory",
                 form="Inhaler", strength="100mcg", manufacturer="Cipla", unit_price=110.0, mrp=160.0,
                 stock_quantity=12, reorder_level=15, hsn_code="3004", gst_rate=12),  # below reorder
            dict(name="ORS Sachet", generic_name="Oral Rehydration Salts", category="Electrolyte",
                 form="Sachet", strength="21.8g", manufacturer="FDC", unit_price=4.0, mrp=7.0,
                 stock_quantity=500, reorder_level=50, hsn_code="3004", gst_rate=0),
        ]
        for m in catalogue:
            ex = med_by_name.get(m["name"])
            if not ex:
                ex = Medicine(branch_id=branch.id, expiry_date=_day(420), batch_number="B-DEMO", **m)
                db.add(ex)
                db.flush()
                med_by_name[m["name"]] = ex
        # also map the base medicines seeded by seed.py
        for m in db.query(Medicine).filter_by(branch_id=branch.id).all():
            med_by_name[m.name] = m

        supplier = db.query(Supplier).filter_by(clinic_id=clinic.id, name="MediSupply Distributors").first()
        if not supplier:
            supplier = Supplier(
                clinic_id=clinic.id, name="MediSupply Distributors",
                contact_person="Ramesh Gupta", mobile="9845012345",
                email="sales@medisupply.in", address="Plot 7, Industrial Area, Hyderabad",
                gstin="36AAACM1234B1Z9", drug_license_number="TS/21B/2020/5678", payment_terms=30,
            )
            db.add(supplier)
            db.flush()

        # Batches + opening-stock transactions for a few meds
        for nm in ["Paracetamol 500mg", "Amoxicillin 500mg", "Azithromycin 500mg"]:
            med = med_by_name.get(nm)
            if not med:
                continue
            if not db.query(MedicineBatch).filter_by(medicine_id=med.id, batch_number="BATCH-A1").first():
                db.add(MedicineBatch(
                    medicine_id=med.id, clinic_id=clinic.id, branch_id=branch.id,
                    batch_number="BATCH-A1", expiry_date=_day(540),
                    quantity=med.stock_quantity or 100, unit_cost=float(med.unit_price or 1),
                    supplier_id=supplier.id,
                ))
                db.add(StockTransaction(
                    clinic_id=clinic.id, branch_id=branch.id, medicine_id=med.id,
                    transaction_type="purchase", quantity=(med.stock_quantity or 100),
                    quantity_before=0, quantity_after=(med.stock_quantity or 100),
                    batch_number="BATCH-A1", expiry_date=_day(540),
                    unit_cost=float(med.unit_price or 1), supplier_name=supplier.name,
                    notes="Opening stock (demo)", performed_by=meera.id if meera else None,
                ))

        # A received purchase order
        if not db.query(PurchaseOrder).filter_by(clinic_id=clinic.id).first():
            po = PurchaseOrder(
                clinic_id=clinic.id, branch_id=branch.id, supplier_id=supplier.id,
                po_number=ids.next_po_no(db, clinic.id), status="received",
                expected_date=_day(-3), notes="Monthly antibiotic restock",
                total_amount=0, created_by=meera.id if meera else None,
            )
            db.add(po)
            db.flush()
            po_total = 0.0
            for nm, qty, cost in [("Azithromycin 500mg", 200, 9.0), ("Ceftriaxone 1g Injection", 60, 28.0)]:
                med = med_by_name.get(nm)
                line = qty * cost
                po_total += line
                db.add(PurchaseOrderItem(
                    po_id=po.id, medicine_id=med.id if med else None, medicine_name=nm,
                    quantity_ordered=qty, quantity_received=qty, unit_cost=cost,
                    total_cost=line, batch_number="PO-2406", expiry_date=_day(600),
                ))
            po.total_amount = po_total

        # Barcode master (self-learning scan map)
        if not db.query(BarcodeMaster).filter_by(barcode="8901234567890").first():
            pcm = med_by_name.get("Paracetamol 500mg")
            db.add(BarcodeMaster(
                barcode="8901234567890", medicine_id=pcm.id if pcm else None,
                drug_name="Paracetamol 500mg", generic_name="Paracetamol",
                manufacturer="GSK", form="Tablet", strength="500mg", pack_size="10 tablets",
                mrp=2.0, hsn_code="3004", gst_rate=12, added_by=meera.id if meera else None,
            ))
        db.commit()
        print("[seed]   ✓ Pharmacy catalogue, batches, supplier, PO, barcode seeded")
    except Exception as e:
        db.rollback()
        print(f"[seed]   ⚠ pharmacy section skipped: {e}")

    # ── Lab & imaging reference data ─────────────────────────────────────────
    try:
        lab_extra = [
            dict(name="Liver Function Test", code="LFT", category="Biochemistry", price=450,
                 normal_range="Various", turnaround_hours=6),
            dict(name="Serum Creatinine", code="CREAT", category="Biochemistry", price=120,
                 normal_range="0.6-1.3", unit="mg/dL", turnaround_hours=3),
            dict(name="Serum Electrolytes", code="LYTES", category="Biochemistry", price=300,
                 normal_range="Various", turnaround_hours=3),
        ]
        for t in lab_extra:
            if not db.query(LabTest).filter_by(branch_id=branch.id, code=t["code"]).first():
                db.add(LabTest(branch_id=branch.id, **t))

        if not db.query(ReferringDoctor).filter_by(clinic_id=clinic.id).first():
            db.add(ReferringDoctor(
                clinic_id=clinic.id, name="Dr. Mahesh Gupta", registration_number="AP-MED-99887",
                specialization="Orthopedics", hospital="City Ortho Care", mobile="9849011223",
                email="mahesh@cityortho.in",
            ))
        if not db.query(ImagingReportTemplate).filter_by(clinic_id=clinic.id).first():
            db.add(ImagingReportTemplate(
                clinic_id=clinic.id, modality="CR", name="Chest X-Ray (Normal)",
                body_part="Chest",
                findings_template="Lung fields are clear. No focal consolidation, effusion or "
                                  "pneumothorax. Cardiac silhouette is normal. Bony thorax intact.",
                impression_template="No acute cardiopulmonary abnormality.",
            ))
        db.commit()
        print("[seed]   ✓ Lab tests + referring doctor + imaging template seeded")
    except Exception as e:
        db.rollback()
        print(f"[seed]   ⚠ lab/imaging reference skipped: {e}")

    # ── Patients (idempotent by mobile) ──────────────────────────────────────
    pt = {}
    patient_specs = [
        dict(key="aarav", mobile="9300000001", full_name="Aarav Sharma", gender="male",
             dob=date(1990, 3, 14), blood_group="O+", city="Hyderabad", state="Telangana",
             occupation="Software Engineer", marital_status="married", portal=True),
        dict(key="diya", mobile="9300000002", full_name="Diya Patel", gender="female",
             dob=date(1996, 7, 2), blood_group="A+", city="Hyderabad", state="Telangana",
             occupation="Teacher", portal=True),
        dict(key="kabir", mobile="9300000003", full_name="Kabir Reddy", gender="male",
             dob=date(1979, 11, 9), blood_group="B+", city="Secunderabad", state="Telangana",
             occupation="Businessman"),
        dict(key="ananya", mobile="9300000004", full_name="Ananya Iyer", gender="female",
             dob=date(1972, 1, 22), blood_group="AB+", city="Hyderabad", state="Telangana",
             allergies="Sulfa drugs", occupation="Bank Manager", portal=True),
        dict(key="vivaan", mobile="9300000005", full_name="Vivaan Nair", gender="male",
             dob=date(2017, 5, 30), blood_group="O+", city="Hyderabad", state="Telangana",
             guardian_name="Lakshmi Nair", guardian_mobile="9300000015", guardian_relationship="Mother"),
        dict(key="ishaan", mobile="9300000006", full_name="Ishaan Gupta", gender="male",
             dob=date(1964, 9, 18), blood_group="B-", city="Hyderabad", state="Telangana",
             occupation="Retired Govt. Officer", insurance_type="govt_scheme",
             govt_scheme_name="CGHS", govt_beneficiary_id="CGHS-HYD-44521"),
        dict(key="saanvi", mobile="9300000007", full_name="Saanvi Rao", gender="female",
             dob=date(2005, 2, 11), blood_group="A-", city="Warangal", state="Telangana",
             occupation="Student"),
        dict(key="aditya", mobile="9300000008", full_name="Aditya Menon", gender="male",
             dob=date(1986, 6, 25), blood_group="O-", city="Hyderabad", state="Telangana",
             occupation="Architect"),
        dict(key="myra", mobile="9300000009", full_name="Myra Joshi", gender="female",
             dob=date(1983, 12, 5), blood_group="AB-", city="Hyderabad", state="Telangana",
             occupation="Pharmacist"),
        dict(key="reyansh", mobile="9300000010", full_name="Reyansh Kumar", gender="male",
             dob=_day(-150), blood_group="O+", city="Hyderabad", state="Telangana",
             guardian_name="Sneha Kumar", guardian_mobile="9300000016", guardian_relationship="Mother"),
        dict(key="aarohi", mobile="9300000011", full_name="Aarohi Singh", gender="female",
             dob=date(1958, 8, 8), blood_group="B+", city="Hyderabad", state="Telangana",
             insurance_type="private", insurance_provider="Star Health",
             insurance_policy_number="SH-2023-778812"),
        dict(key="kiara", mobile="9300000012", full_name="Kiara Bose", gender="female",
             dob=date(1994, 4, 17), blood_group="A+", city="Hyderabad", state="Telangana",
             occupation="Designer", portal=True),
    ]
    try:
        counter = clinic.patient_id_counter or 0
        for spec in patient_specs:
            existing = _get_patient(db, clinic.id, spec["mobile"])
            if existing:
                pt[spec["key"]] = existing
                continue
            counter += 1
            portal_user = None
            if spec.get("portal"):
                portal_user = db.query(PatientUser).filter_by(mobile=spec["mobile"]).first()
                if not portal_user:
                    portal_user = PatientUser(
                        full_name=spec["full_name"], mobile=spec["mobile"],
                        is_active=True, is_verified=True, preferred_language="en",
                    )
                    db.add(portal_user)
                    db.flush()
                    parts = spec["full_name"].split()
                    db.add(BHProfile(
                        patient_user_id=portal_user.id,
                        bh_id="BH5" + str(10000000 + counter)[-8:],
                        first_name=parts[0], last_name=parts[-1],
                        gender=spec["gender"], date_of_birth=spec["dob"],
                        state=spec.get("state"), state_digit=5,
                    ))
            p = Patient(
                clinic_id=clinic.id, branch_id=branch.id,
                portal_user_id=portal_user.id if portal_user else None,
                clinic_patient_id=f"{clinic.clinic_prefix or 'APL'}-{str(counter).zfill(5)}",
                bh_id=("BH5" + str(10000000 + counter)[-8:]) if portal_user else None,
                full_name=spec["full_name"], date_of_birth=spec["dob"],
                gender=spec["gender"], mobile=spec["mobile"],
                email=f"{spec['key']}@example.com", blood_group=spec.get("blood_group"),
                city=spec.get("city"), state=spec.get("state"),
                allergies=spec.get("allergies"), occupation=spec.get("occupation"),
                marital_status=spec.get("marital_status"),
                guardian_name=spec.get("guardian_name"),
                guardian_mobile=spec.get("guardian_mobile"),
                guardian_relationship=spec.get("guardian_relationship"),
                insurance_type=spec.get("insurance_type"),
                insurance_provider=spec.get("insurance_provider"),
                insurance_policy_number=spec.get("insurance_policy_number"),
                govt_scheme_name=spec.get("govt_scheme_name"),
                govt_beneficiary_id=spec.get("govt_beneficiary_id"),
            )
            db.add(p)
            db.flush()
            pt[spec["key"]] = p
        clinic.patient_id_counter = counter
        db.commit()
        print(f"[seed]   ✓ {len(pt)} demo patients ready")
    except Exception as e:
        db.rollback()
        print(f"[seed]   ⚠ patients section failed: {e}")
        return  # nothing else makes sense without patients

    def _enc(db):
        return ids.next_encounter_no(db, clinic.id, hc_id)

    def _appt(patient, profile_id, *, days, hour, minute=0, status="completed",
              mode="offline", reason="", visit_type="fresh", fee=500, token=None):
        a = Appointment(
            clinic_id=clinic.id, branch_id=branch.id, encounter_no=_enc(db),
            patient_id=patient.id, doctor_id=profile_id, staff_id=drpriya.id,
            appointment_date=_day(days), appointment_time=f"{hour:02d}:{minute:02d}",
            token_number=token, status=status, mode=mode, reason=reason,
            visit_type=visit_type, fee=fee,
        )
        db.add(a)
        db.flush()
        return a

    # ── 1) Aarav — rich completed OPD encounter ──────────────────────────────
    try:
        if not db.query(Appointment).filter_by(patient_id=pt["aarav"].id).first():
            a = _appt(pt["aarav"], priya_profile_id, days=-2, hour=9, minute=30,
                      status="completed", reason="Cough, fever, fatigue x4 days", token=1)
            db.add(Vitals(patient_id=pt["aarav"].id, appointment_id=a.id, branch_id=branch.id,
                          blood_pressure_systolic=122, blood_pressure_diastolic=80, pulse_rate=84,
                          temperature=38.3, weight_kg=72, height_cm=176, oxygen_saturation=96,
                          blood_sugar=98))
            db.add(SoapNote(appointment_id=a.id, branch_id=branch.id, created_by=drpriya.id,
                            subjective="4-day history of productive cough, fever and fatigue.",
                            objective="Temp 38.3°C, crepitations right base. SpO2 96% RA.",
                            assessment="Community-acquired pneumonia (right lower lobe).",
                            plan="Oral antibiotics, antipyretics. Review in 3 days with CXR + CBC.",
                            follow_up_days=3))
            rx = Prescription(clinic_id=clinic.id, patient_id=pt["aarav"].id, appointment_id=a.id,
                              branch_id=branch.id, prescribed_by=drpriya.id, status="dispensed",
                              notes="Complete the full antibiotic course.")
            db.add(rx)
            db.flush()
            for nm, dose, freq, dur in [
                ("Azithromycin 500mg", "1 tab", "OD", "5 days"),
                ("Paracetamol 500mg", "1 tab", "SOS", "5 days"),
                ("Pantoprazole 40mg", "1 tab", "OD before food", "5 days"),
            ]:
                med = med_by_name.get(nm)
                db.add(PrescriptionItem(prescription_id=rx.id, medicine_id=med.id if med else None,
                                        medicine_name=nm, dosage=dose, frequency=freq, duration=dur,
                                        quantity_prescribed=5))
            # Lab order — signed with observations
            lo = LabOrder(order_id=ids.next_lab_order_no(db, clinic.id), clinic_id=clinic.id,
                          branch_id=branch.id, patient_id=pt["aarav"].id, appointment_id=a.id,
                          ordered_by=drpriya.id, test_names=["Complete Blood Count", "Blood Glucose Fasting"],
                          clinical_notes="r/o infection", priority="routine",
                          specimen_type="Blood", status="signed", collected_at=datetime.now() - timedelta(days=1))
            db.add(lo)
            db.flush()
            obs = [
                dict(test_name="Hemoglobin", value="13.4", unit="g/dL", ref_range="13-17", flag="N"),
                dict(test_name="WBC", value="12800", unit="/µL", ref_range="4000-11000", flag="H"),
                dict(test_name="Fasting Glucose", value="98", unit="mg/dL", ref_range="70-100", flag="N"),
            ]
            for o in obs:
                db.add(LabOrderItem(order_id=lo.id, test_name=o["test_name"], result_value=o["value"],
                                    unit=o["unit"], reference_range=o["ref_range"], flag=o["flag"],
                                    is_abnormal=(o["flag"] != "N"), completed_at=datetime.now()))
            db.add(LabResult(order_id=lo.id, raw_format="MANUAL", observations=obs,
                             interpretation="Leukocytosis consistent with bacterial infection.",
                             status="signed", signed_by=arjun.id if arjun else drpriya.id,
                             signed_at=datetime.now(), source="manual"))
            # Imaging order — signed
            io = ImagingOrder(order_id=ids.next_imaging_order_no(db, clinic.id), clinic_id=clinic.id,
                              branch_id=branch.id, patient_id=pt["aarav"].id, appointment_id=a.id,
                              ordered_by=drpriya.id, modality="CR", body_part="Chest",
                              study_description="Chest X-ray PA view", clinical_notes="r/o pneumonia",
                              priority="routine", status="signed",
                              acquired_by=kiran.id if kiran else None,
                              acquired_at=datetime.now() - timedelta(hours=20))
            db.add(io)
            db.flush()
            db.add(ImagingResult(order_id=io.id, modality="CR",
                                 findings="Patchy opacity in the right lower zone. No effusion or pneumothorax.",
                                 impression="Right lower lobe pneumonia.",
                                 status="signed", signed_by=drsuresh.id if drsuresh else drpriya.id,
                                 signed_at=datetime.now(), source="manual"))
            # Paid invoice
            _new_invoice(db, clinic, branch, patient=pt["aarav"], appointment_id=a.id,
                         sale_type="consultation", items=[
                             dict(description="Consultation — General Medicine", item_type="service",
                                  unit_price=500, gst_rate=0),
                             dict(description="CBC", item_type="lab", unit_price=250, gst_rate=0),
                             dict(description="Chest X-ray PA", item_type="imaging", unit_price=400, gst_rate=0),
                         ], paid="full", method="upi", received_by=ravi.id if ravi else None)
            # Follow-up reminder + patient tag + doctor rating
            db.add(FollowUpReminder(appointment_id=a.id, clinic_id=clinic.id,
                                    patient_name=pt["aarav"].full_name, patient_mobile=pt["aarav"].mobile,
                                    doctor_name=drpriya.full_name, due_date=_day(1), follow_up_days=3,
                                    notes="Review CXR + symptoms", status="pending"))
            tag = db.query(ClinicPatientTag).filter_by(clinic_id=clinic.id, tag_name="Pneumonia").first()
            if not tag:
                tag = ClinicPatientTag(clinic_id=clinic.id, tag_name="Pneumonia", icd10_code="J18.9",
                                       specialty="General Medicine", usage_count=1,
                                       created_by=drpriya.id)
                db.add(tag)
                db.flush()
            db.add(PatientTag(patient_id=pt["aarav"].id, clinic_id=clinic.id, tag_name="Pneumonia",
                              icd10_code="J18.9", saved_tag_id=tag.id, assigned_by=drpriya.id))
            if priya_profile_id:
                db.add(DoctorRating(doctor_id=priya_profile_id, patient_id=pt["aarav"].id,
                                    appointment_id=a.id, rating=5,
                                    review="Very thorough and caring. Explained everything clearly."))
        db.commit()
        print("[seed]   ✓ Aarav: full completed OPD encounter (vitals→SOAP→Rx→lab→imaging→bill)")
    except Exception as e:
        db.rollback()
        print(f"[seed]   ⚠ Aarav encounter skipped: {e}")

    # ── 2) Diya — telehealth (ready today) + completed history ───────────────
    try:
        if not db.query(Appointment).filter_by(patient_id=pt["diya"].id).first():
            a = _appt(pt["diya"], priya_profile_id, days=0, hour=15, minute=0,
                      status="confirmed", mode="telehealth", reason="Follow-up — thyroid",
                      visit_type="followup", fee=400, token=5)
            a.telehealth_room = f"bc-{a.id}"
            db.add(Vitals(patient_id=pt["diya"].id, appointment_id=a.id, branch_id=branch.id,
                          blood_pressure_systolic=118, blood_pressure_diastolic=76, pulse_rate=72,
                          weight_kg=58, height_cm=162))
            ses = TelehealthSession(appointment_id=a.id, clinic_id=clinic.id, room_name=f"bc-{a.id}",
                                    state="ready", slot_start=_dt(0, 15, 0), slot_end=_dt(0, 15, 30),
                                    room_expires_at=_dt(0, 16, 0))
            db.add(ses)
            db.flush()
            db.add(TelehealthSessionEvent(session_id=ses.id, event_type="created", actor_type="system"))
            _new_invoice(db, clinic, branch, patient=pt["diya"], appointment_id=a.id,
                         sale_type="consultation", items=[
                             dict(description="Telehealth Consultation", item_type="service",
                                  unit_price=400, gst_rate=0)], paid="full", method="upi",
                         received_by=ravi.id if ravi else None)

            # A completed telehealth in the past (history with events)
            a2 = _appt(pt["diya"], priya_profile_id, days=-20, hour=11, minute=0,
                       status="completed", mode="telehealth", reason="Thyroid review",
                       visit_type="followup", fee=400, token=4)
            a2.telehealth_room = f"bc-{a2.id}"
            a2.telehealth_joined_at = _dt(-20, 11, 2)
            ses2 = TelehealthSession(appointment_id=a2.id, clinic_id=clinic.id, room_name=f"bc-{a2.id}",
                                     state="completed", slot_start=_dt(-20, 11, 0), slot_end=_dt(-20, 11, 30),
                                     doctor_first_joined_at=_dt(-20, 11, 1),
                                     patient_first_joined_at=_dt(-20, 11, 2),
                                     completed_at=_dt(-20, 11, 28), completed_by=drpriya.id)
            db.add(ses2)
            db.flush()
            for ev, actor in [("created", "system"), ("doctor_joined", "staff"),
                              ("patient_joined", "patient"), ("completed", "staff")]:
                db.add(TelehealthSessionEvent(session_id=ses2.id, event_type=ev, actor_type=actor))
        db.commit()
        print("[seed]   ✓ Diya: telehealth session ready today + completed history")
    except Exception as e:
        db.rollback()
        print(f"[seed]   ⚠ Diya telehealth skipped: {e}")

    # ── 3) Kabir — confirmed walk-in in today's queue (vitals taken) ─────────
    try:
        if not db.query(Appointment).filter_by(patient_id=pt["kabir"].id).first():
            a = _appt(pt["kabir"], priya_profile_id, days=0, hour=10, minute=30,
                      status="confirmed", reason="Fever and body ache", token=2)
            db.add(Vitals(patient_id=pt["kabir"].id, appointment_id=a.id, branch_id=branch.id,
                          blood_pressure_systolic=128, blood_pressure_diastolic=84, pulse_rate=88,
                          temperature=38.1, weight_kg=78, height_cm=172, oxygen_saturation=98))
        db.commit()
        print("[seed]   ✓ Kabir: confirmed walk-in waiting in queue")
    except Exception as e:
        db.rollback()
        print(f"[seed]   ⚠ Kabir queue skipped: {e}")

    # ── 5) Vivaan — pending online booking + scheduled future appt ───────────
    try:
        if not db.query(OnlineBooking).filter_by(clinic_id=clinic.id, patient_mobile=pt["vivaan"].mobile).first():
            db.add(OnlineBooking(
                clinic_id=clinic.id, branch_id=branch.id, doctor_id=priya_profile_id,
                patient_name=pt["vivaan"].full_name, patient_mobile=pt["vivaan"].mobile,
                patient_email="vivaan@example.com", booking_date=_day(1), booking_time="11:15",
                reason="Child — recurrent cold", status="pending", mode="offline",
                confirmation_code="BK" + str(_ref(db, clinic.id, "booking")).zfill(5),
                patient_state="Telangana",
            ))
            _appt(pt["vivaan"], priya_profile_id, days=3, hour=11, minute=30,
                  status="scheduled", reason="Pediatric review", visit_type="followup",
                  fee=500, token=3)
        db.commit()
        print("[seed]   ✓ Vivaan: pending online booking + scheduled appointment")
    except Exception as e:
        db.rollback()
        print(f"[seed]   ⚠ Vivaan booking skipped: {e}")

    # ── 6) Ishaan — completed cardiology encounter + insurance claim (partial bill)
    try:
        if not db.query(Appointment).filter_by(patient_id=pt["ishaan"].id).first():
            a = _appt(pt["ishaan"], rajan_profile_id, days=-5, hour=16, minute=0,
                      status="completed", reason="Chest discomfort on exertion",
                      fee=800, token=1)
            db.add(Vitals(patient_id=pt["ishaan"].id, appointment_id=a.id, branch_id=branch.id,
                          blood_pressure_systolic=148, blood_pressure_diastolic=92, pulse_rate=80,
                          weight_kg=82, height_cm=170, oxygen_saturation=97))
            db.add(SoapNote(appointment_id=a.id, branch_id=branch.id,
                            created_by=(drrajan.id if drrajan else drpriya.id),
                            subjective="Exertional chest discomfort for 2 weeks.",
                            objective="BP 148/92. S1S2 normal, no murmurs. ECG: mild ST changes.",
                            assessment="Stable angina; uncontrolled hypertension.",
                            plan="Start anti-anginal + antihypertensive. TMT advised. Review 1 week.",
                            follow_up_days=7))
            inv = _new_invoice(db, clinic, branch, patient=pt["ishaan"], appointment_id=a.id,
                               sale_type="consultation", items=[
                                   dict(description="Consultation — Cardiology", item_type="service",
                                        unit_price=800, gst_rate=0),
                                   dict(description="ECG", item_type="procedure", unit_price=150, gst_rate=0),
                               ], paid="partial", method="cash", received_by=ravi.id if ravi else None)
            db.add(InsuranceClaim(
                clinic_id=clinic.id, invoice_id=inv.id, appointment_id=a.id, patient_id=pt["ishaan"].id,
                scheme_category="central_govt", scheme_name="CGHS",
                card_number="CGHS-HYD-44521", policy_holder_name=pt["ishaan"].full_name,
                tpa_name="CGHS Cell", pre_auth_ref="PA-2406-0012", pre_auth_amount=950,
                pre_auth_status="approved", pre_auth_submitted_at=datetime.now() - timedelta(days=5),
                pre_auth_decided_at=datetime.now() - timedelta(days=4),
                claim_ref="CLM-2406-0012", claimed_amount=950, approved_amount=900,
                claim_status="submitted", claim_submitted_at=datetime.now() - timedelta(days=4),
                created_by=ravi.id if ravi else None))
        db.commit()
        print("[seed]   ✓ Ishaan: cardiology encounter + CGHS insurance claim (partial bill)")
    except Exception as e:
        db.rollback()
        print(f"[seed]   ⚠ Ishaan encounter skipped: {e}")

    # ── 7) Saanvi — lab order pending collection (lab queue) ─────────────────
    try:
        if not db.query(LabOrder).filter_by(patient_id=pt["saanvi"].id).first():
            a = _appt(pt["saanvi"], priya_profile_id, days=0, hour=9, minute=45,
                      status="completed", reason="Fatigue, possible anemia", token=6)
            lo = LabOrder(order_id=ids.next_lab_order_no(db, clinic.id), clinic_id=clinic.id,
                          branch_id=branch.id, patient_id=pt["saanvi"].id, appointment_id=a.id,
                          ordered_by=drpriya.id, test_names=["Complete Blood Count", "Thyroid Profile (T3/T4/TSH)"],
                          clinical_notes="r/o anemia / thyroid", priority="routine", status="pending")
            db.add(lo)
            db.flush()
            for nm in ["Complete Blood Count", "Thyroid Profile (T3/T4/TSH)"]:
                db.add(LabOrderItem(order_id=lo.id, test_name=nm))
        db.commit()
        print("[seed]   ✓ Saanvi: lab order pending collection")
    except Exception as e:
        db.rollback()
        print(f"[seed]   ⚠ Saanvi lab skipped: {e}")

    # ── 8) Aditya — imaging order acquired, pending review (imaging queue) ───
    try:
        if not db.query(ImagingOrder).filter_by(patient_id=pt["aditya"].id).first():
            a = _appt(pt["aditya"], priya_profile_id, days=-1, hour=12, minute=0,
                      status="completed", reason="Knee pain after fall", token=7)
            io = ImagingOrder(order_id=ids.next_imaging_order_no(db, clinic.id), clinic_id=clinic.id,
                              branch_id=branch.id, patient_id=pt["aditya"].id, appointment_id=a.id,
                              ordered_by=drpriya.id, modality="CR", body_part="Knee (Right)",
                              study_description="X-ray Right Knee AP/Lateral",
                              clinical_notes="r/o fracture", priority="routine",
                              status="pending_review", acquired_by=kiran.id if kiran else None,
                              acquired_at=datetime.now() - timedelta(hours=3),
                              technician_notes="2 views acquired. Patient cooperative.")
            db.add(io)
            db.flush()
            db.add(ImagingResult(order_id=io.id, modality="CR", status="pending_review", source="manual"))
        db.commit()
        print("[seed]   ✓ Aditya: imaging acquired, pending radiologist review")
    except Exception as e:
        db.rollback()
        print(f"[seed]   ⚠ Aditya imaging skipped: {e}")

    # ── 9) Myra — pharmacy walk-in dispense (paid) + sales return ────────────
    try:
        if not db.query(PharmacyOrder).filter_by(clinic_id=clinic.id, patient_id=pt["myra"].id).first():
            po = PharmacyOrder(clinic_id=clinic.id, branch_id=branch.id, patient_id=pt["myra"].id,
                               source="walkin", status="dispensed", patient_name=pt["myra"].full_name,
                               patient_mobile=pt["myra"].mobile, created_by=meera.id if meera else None)
            db.add(po)
            db.flush()
            dispense_no = _ref(db, clinic.id, "dispense")
            ds = DispenseSession(clinic_id=clinic.id, branch_id=branch.id, order_id=po.id,
                                 patient_id=pt["myra"].id, dispense_number=dispense_no, status="paid",
                                 payment_method="cash", dispensed_by=meera.id if meera else None,
                                 dispensed_at=datetime.now(), patient_name=pt["myra"].full_name,
                                 patient_mobile=pt["myra"].mobile)
            db.add(ds)
            db.flush()
            sub = gst = tot = 0.0
            for nm, qty in [("Pantoprazole 40mg", 10), ("ORS Sachet", 5)]:
                med = med_by_name.get(nm)
                up = float(med.unit_price) if med and med.unit_price else 5.0
                gpct = float(med.gst_rate) if med and med.gst_rate is not None else 12.0
                line = up * qty
                gamt = round(line * gpct / 100, 2)
                sub += line
                gst += gamt
                tot += line + gamt
                db.add(DispenseItem(session_id=ds.id, medicine_id=med.id if med else None,
                                    medicine_name=nm, batch_number="BATCH-A1", expiry_date=_day(400),
                                    ordered_qty=qty, dispensed_qty=qty, unit_price=up,
                                    mrp=float(med.mrp) if med and med.mrp else up,
                                    gst_percent=gpct, gst_amount=gamt, line_total=round(line + gamt, 2),
                                    gathered=True))
            ds.subtotal = round(sub, 2)
            ds.gst_total = round(gst, 2)
            ds.total_amount = round(tot, 2)
            ds.amount_paid = round(tot, 2)
            ds.balance_due = 0
            inv = _new_invoice(db, clinic, branch, patient=pt["myra"], sale_type="pharmacy",
                               items=[dict(description="Pharmacy dispense", item_type="medicine",
                                           unit_price=round(sub, 2), gst_rate=12)], paid="full",
                               method="cash", received_by=meera.id if meera else None)
            ds.invoice_id = inv.id
            # Sales return for part of it
            sr = SalesReturn(clinic_id=clinic.id, invoice_id=inv.id,
                             return_number=ids.next_return_no(db, clinic.id), reason="Patient returned extra strip",
                             total_refund=20.0, refund_method="cash", processed_by=meera.id if meera else None)
            db.add(sr)
            db.flush()
            db.add(SalesReturnItem(return_id=sr.id, medicine_name="ORS Sachet", quantity=2,
                                   unit_price=4.0, total=8.0))
            # Schedule-H drug register entry
            db.add(DrugRegister(clinic_id=clinic.id, invoice_id=inv.id, medicine_name="Azithromycin 500mg",
                                schedule="H", patient_name=pt["myra"].full_name, patient_age=41,
                                doctor_name=drpriya.full_name, doctor_reg_number="AP-MED-12345",
                                quantity=5, batch_number="BATCH-A1"))
        db.commit()
        print("[seed]   ✓ Myra: pharmacy dispense (paid) + sales return + drug register")
    except Exception as e:
        db.rollback()
        print(f"[seed]   ⚠ Myra pharmacy skipped: {e}")

    # ── Department / Ward / Beds (structural, idempotent by name) ─────────────
    dept = ward = None
    beds = {}
    try:
        dept = db.query(Department).filter_by(clinic_id=clinic.id, name="General Medicine").first()
        if not dept:
            dept = Department(clinic_id=clinic.id, name="General Medicine", code="GMED",
                              dept_type="clinical", head_doctor_id=drpriya.id, color_hex="#0F2557")
            db.add(dept)
            db.flush()
        ward = db.query(Ward).filter_by(clinic_id=clinic.id, name="Ward A").first()
        if not ward:
            ward = Ward(clinic_id=clinic.id, department_id=dept.id, name="Ward A", floor="1",
                        wing="East", ward_type="general", total_beds=10)
            db.add(ward)
            db.flush()
        for bn, btype in [("A-101", "general"), ("A-102", "general"), ("A-103", "general"),
                          ("ICU-01", "icu")]:
            b = db.query(Bed).filter_by(ward_id=ward.id, bed_number=bn).first()
            if not b:
                b = Bed(clinic_id=clinic.id, ward_id=ward.id, bed_number=bn, bed_type=btype,
                        status="vacant")
                db.add(b)
                db.flush()
            beds[bn] = b
        if not db.query(VisitorPolicy).filter_by(clinic_id=clinic.id, ward_id=ward.id).first():
            db.add(VisitorPolicy(clinic_id=clinic.id, ward_id=ward.id, visit_start="10:00",
                                 visit_end="20:00", max_active=5, max_persons=2, attender_allowed=True))
        db.commit()
        print("[seed]   ✓ Inpatient structure: department, ward, 4 beds, visitor policy")
    except Exception as e:
        db.rollback()
        print(f"[seed]   ⚠ inpatient structure skipped: {e}")

    def _admit(patient, bed_key, *, diagnosis, dtype="opd_referred", days_ago=2,
               status="active"):
        seq = _ref(db, clinic.id, "admission")
        bed = beds.get(bed_key)
        adm = Admission(
            clinic_id=clinic.id, branch_id=branch.id, patient_id=patient.id,
            admission_number=f"{hc_id}-IP-{seq:05d}", admission_sequence=seq,
            encounter_no=_enc(db), department_id=dept.id if dept else None,
            ward_id=ward.id if ward else None, bed_id=bed.id if bed else None,
            admission_type=dtype, admitting_doctor_id=drpriya.id, primary_doctor_id=drpriya.id,
            primary_diagnosis=diagnosis, admitted_at=_dt(-days_ago, 8, 0), status=status,
            expected_discharge=_day(2), created_by=ravi.id if ravi else None,
        )
        db.add(adm)
        db.flush()
        if bed and status == "active":
            bed.status = "occupied"
            bed.current_admission_id = adm.id
        return adm

    # ── 4) Ananya — ACTIVE inpatient with full CareChart documentation ───────
    try:
        if not db.query(Admission).filter_by(patient_id=pt["ananya"].id).first():
            adm = _admit(pt["ananya"], "A-101", diagnosis="Community-acquired pneumonia",
                         days_ago=2, status="active")
            rec_by = nurse.id if nurse else drpriya.id
            # vitals trend
            for h, t, p, spo2 in [(-2, 38.6, 98, 93), (-1, 38.0, 92, 95), (0, 37.4, 84, 97)]:
                db.add(VitalSign(admission_id=adm.id, clinic_id=clinic.id, branch_id=branch.id,
                                 recorded_by=rec_by, recorded_at=_dt(h, 8, 0), temperature=t, pulse=p,
                                 respiration_rate=20, bp_systolic=124, bp_diastolic=80, spo2=spo2,
                                 weight=64, height=165, pain_score=2, blood_sugar=110,
                                 notes="Routine monitoring"))
            db.add(NursingNote(admission_id=adm.id, clinic_id=clinic.id, branch_id=branch.id,
                               note_type="assessment", note_text="Admitted with fever and productive cough. "
                               "IV antibiotics started. Monitoring 4th hourly.", written_by=rec_by,
                               written_at=_dt(-2, 9, 0), shift="morning"))
            db.add(NursingNote(admission_id=adm.id, clinic_id=clinic.id, branch_id=branch.id,
                               note_type="shift_handoff", note_text="Tolerating orals. SpO2 improved to 97% RA. "
                               "Chest physio advised. Continue IV antibiotics.", written_by=rec_by,
                               written_at=_dt(-1, 19, 0), shift="evening", is_handoff=True))
            # Medication orders + MAR
            mo = MedicationOrder(admission_id=adm.id, clinic_id=clinic.id, drug_name="Ceftriaxone",
                                 generic_name="Ceftriaxone", dose="1g", route="IV", frequency="BD",
                                 duration_days=5, instructions="Infuse over 30 min", is_continuous=True,
                                 status="active", ordered_by=drpriya.id, ordered_at=_dt(-2, 8, 30))
            db.add(mo)
            db.add(MedicationOrder(admission_id=adm.id, clinic_id=clinic.id, drug_name="Paracetamol",
                                   dose="650mg", route="PO", frequency="SOS", is_prn=True,
                                   prn_reason="Temp > 38.5°C", status="active", ordered_by=drpriya.id))
            for h, st in [(-2, "given"), (-1, "given"), (0, "scheduled")]:
                db.add(MedicationAdministration(admission_id=adm.id, clinic_id=clinic.id, branch_id=branch.id,
                                                medicine_name="Ceftriaxone 1g IV", dose="1g", route="IV",
                                                scheduled_time=_dt(h, 8, 0),
                                                administered_at=(_dt(h, 8, 5) if st == "given" else None),
                                                administered_by=(rec_by if st == "given" else None),
                                                status=st))
            db.add(WardRound(admission_id=adm.id, clinic_id=clinic.id, doctor_id=drpriya.id,
                             round_date=_day(0), subjective="Feeling better, less cough",
                             objective="Afebrile, chest clearing", assessment="CAP — improving",
                             plan="Continue IV antibiotics, review in AM"))
            db.add(ProgressNote(admission_id=adm.id, clinic_id=clinic.id, written_by=drpriya.id,
                                note_date=_day(0), subjective="Day 2 — improving", objective="T 37.4, SpO2 97% RA",
                                assessment="Responding to treatment", plan="Step down to oral antibiotics if stable",
                                is_significant=True))
            db.add(ClinicalOrder(admission_id=adm.id, clinic_id=clinic.id, branch_id=branch.id,
                                 order_type="lab", order_detail="Repeat CBC + CRP in AM", priority="routine",
                                 status="pending", ordered_by=drpriya.id))
            db.add(ClinicalOrder(admission_id=adm.id, clinic_id=clinic.id, branch_id=branch.id,
                                 order_type="diet", order_detail="High-protein soft diet", priority="routine",
                                 status="acknowledged", ordered_by=drpriya.id,
                                 acknowledged_by=rec_by, acknowledged_at=_dt(-1, 10, 0)))
            # running charges + draft bill
            for ctype, desc, qty, price in [("room", "Ward A bed charge", 2, 1500),
                                            ("procedure", "IV cannulation", 1, 200),
                                            ("pharmacy", "Ceftriaxone 1g x4", 4, 45),
                                            ("consultation", "Daily visit", 2, 500)]:
                db.add(InpatientCharge(admission_id=adm.id, clinic_id=clinic.id, charge_date=_day(0),
                                       charge_type=ctype, description=desc, quantity=qty, unit_price=price,
                                       total=qty * price, added_by=ravi.id if ravi else None))
            bill_no = f"{hc_id}-IPB-{_ref(db, clinic.id, 'ipbill'):05d}"
            db.add(InpatientBill(admission_id=adm.id, clinic_id=clinic.id, bill_number=bill_no,
                                 room_charges=3000, procedure_charges=200, pharmacy_charges=180,
                                 consultation_charges=1000, subtotal=4380, total=4380,
                                 patient_payable=4380, status="draft",
                                 generated_by=ravi.id if ravi else None))
            db.add(DocumentationSession(clinic_id=clinic.id, admission_id=adm.id, signed_by=rec_by,
                                        signed_at=_dt(-1, 19, 30), shift="evening",
                                        note="Evening shift documentation signed off."))
            # Visitor pass
            db.add(VisitorPass(clinic_id=clinic.id, pass_code=f"VP{_ref(db, clinic.id, 'vpass'):06d}",
                               pass_type="visit", admission_id=adm.id, patient_id=pt["ananya"].id,
                               visitor_name="Suresh Iyer", relation="Husband", visitor_mobile="9300000017",
                               id_proof_type="Aadhaar", id_proof_number="XXXX-XXXX-1234", persons=1,
                               valid_from=_dt(0, 10, 0), valid_until=_dt(0, 20, 0), status="active",
                               issued_by=ravi.id if ravi else None))
        db.commit()
        print("[seed]   ✓ Ananya: ACTIVE inpatient — vitals/MAR/notes/rounds/orders/charges/visitor")
    except Exception as e:
        db.rollback()
        print(f"[seed]   ⚠ Ananya inpatient skipped: {e}")

    # ── 11) Aarohi — discharged inpatient with summary + finalized bill ──────
    try:
        if not db.query(Admission).filter_by(patient_id=pt["aarohi"].id).first():
            adm = _admit(pt["aarohi"], "A-102", diagnosis="Acute gastroenteritis with dehydration",
                         days_ago=6, status="discharged")
            adm.discharged_at = _dt(-1, 11, 0)
            adm.discharge_destination = "Home"
            rec_by = nurse.id if nurse else drpriya.id
            db.add(VitalSign(admission_id=adm.id, clinic_id=clinic.id, branch_id=branch.id,
                             recorded_by=rec_by, recorded_at=_dt(-5, 8, 0), temperature=37.8, pulse=98,
                             respiration_rate=18, bp_systolic=110, bp_diastolic=70, spo2=98, pain_score=1))
            db.add(WardRound(admission_id=adm.id, clinic_id=clinic.id, doctor_id=drpriya.id,
                             round_date=_day(-2), subjective="Stools settled", objective="Hydrated, stable",
                             assessment="Improved", plan="Plan discharge tomorrow"))
            db.add(DischargeSummary(admission_id=adm.id, clinic_id=clinic.id, written_by=drpriya.id,
                                    admission_diagnosis="Acute gastroenteritis with dehydration",
                                    final_diagnosis="Acute gastroenteritis — resolved",
                                    hospital_course="Admitted with vomiting and loose stools. Rehydrated with IV "
                                    "fluids and antiemetics. Symptoms settled by day 3.",
                                    condition_at_discharge="stable",
                                    discharge_instructions="Oral fluids, bland diet, complete probiotics.",
                                    follow_up_date=_day(5), follow_up_with="Dr. Priya Sharma",
                                    diet_advice="Bland diet for 3 days", status="finalized",
                                    finalized_at=_dt(-1, 10, 30), finalized_by=drpriya.id,
                                    discharge_medications="ORS, Probiotics x5 days"))
            bill_no = f"{hc_id}-IPB-{_ref(db, clinic.id, 'ipbill'):05d}"
            inv = _new_invoice(db, clinic, branch, patient=pt["aarohi"], admission_id=adm.id,
                               sale_type="inpatient", encounter_type="IP", items=[
                                   dict(description="Room charges (4 days)", item_type="room",
                                        quantity=4, unit_price=1500, gst_rate=0),
                                   dict(description="IV fluids & medication", item_type="pharmacy",
                                        unit_price=1200, gst_rate=12),
                                   dict(description="Doctor visits", item_type="consultation",
                                        quantity=4, unit_price=500, gst_rate=0),
                               ], paid="full", method="card", received_by=ravi.id if ravi else None)
            db.add(InpatientBill(admission_id=adm.id, clinic_id=clinic.id, invoice_id=inv.id,
                                 bill_number=bill_no, room_charges=6000, pharmacy_charges=1200,
                                 consultation_charges=2000, subtotal=9200, gst_amount=144, total=9344,
                                 patient_payable=9344, amount_paid=9344, payment_method="card",
                                 status="paid", finalized_at=_dt(-1, 11, 0),
                                 generated_by=ravi.id if ravi else None))
        db.commit()
        print("[seed]   ✓ Aarohi: discharged inpatient + discharge summary + finalized bill")
    except Exception as e:
        db.rollback()
        print(f"[seed]   ⚠ Aarohi discharge skipped: {e}")

    # ── Referrals (inpatient `referrals` + outpatient patient_referrals) ─────
    try:
        if not db.query(InpatientReferral).filter_by(clinic_id=clinic.id).first():
            db.add(InpatientReferral(
                clinic_id=clinic.id, patient_id=pt["aarav"].id,
                referral_number=f"{hc_id}-REF-{_ref(db, clinic.id, 'ref'):05d}",
                referring_type="internal", referring_doctor_id=drpriya.id,
                referring_doctor_name=drpriya.full_name, referred_to_type="external_outside",
                referred_to_specialty="Pulmonology", referred_to_org_name="City Chest Hospital",
                urgency="routine", reason="Recurrent pneumonia — further evaluation",
                clinical_summary="Second episode in 6 months. Consider bronchoscopy + CT chest.",
                status="pending"))
        if not db.query(PatientReferral).filter_by(from_clinic_id=clinic.id).first():
            db.add(PatientReferral(
                from_clinic_id=clinic.id, from_doctor_id=priya_profile_id, patient_id=pt["ishaan"].id,
                to_clinic_name="HeartCare Cardiac Center", to_specialty="Cardiology",
                to_doctor_name="Dr. Suresh Babu", reason="Stable angina — specialist opinion",
                urgency="routine", clinical_notes="Uncontrolled HTN + exertional angina. For TMT / angiography.",
                status="pending", referral_code="PR" + str(_ref(db, clinic.id, "pref")).zfill(5),
                patient_bh_id=pt["ishaan"].bh_id))
        db.commit()
        print("[seed]   ✓ Referrals: inpatient + outpatient cross-center")
    except Exception as e:
        db.rollback()
        print(f"[seed]   ⚠ referrals skipped: {e}")

    # ── Scheduler: shift types, group, entries, leave, settings ──────────────
    try:
        if not db.query(ShiftType).filter_by(clinic_id=clinic.id).first():
            shifts = {}
            for nm, st, et, col in [("Morning", "08:00", "16:00", "#0F2557"),
                                    ("Evening", "16:00", "22:00", "#7C3AED"),
                                    ("Night", "22:00", "08:00", "#1E293B")]:
                s = ShiftType(clinic_id=clinic.id, name=nm, start_time=st, end_time=et, color_hex=col)
                db.add(s)
                db.flush()
                shifts[nm] = s
            grp = StaffGroup(clinic_id=clinic.id, name="Front Desk & Nursing",
                             department_id=dept.id if dept else None,
                             manager_id=manager.id if manager else None)
            db.add(grp)
            db.flush()
            for s in (ravi, nurse, meera):
                if s:
                    db.add(StaffGroupMember(group_id=grp.id, staff_id=s.id))
            # one published week of entries
            for i, s in enumerate([ravi, nurse]):
                if not s:
                    continue
                for d in range(5):
                    db.add(ScheduleEntry(clinic_id=clinic.id, group_id=grp.id, staff_id=s.id,
                                         shift_type_id=shifts["Morning"].id if i == 0 else shifts["Evening"].id,
                                         work_date=_day(d), status="published",
                                         created_by=manager.id if manager else None))
            if nurse:
                db.add(LeaveRequest(clinic_id=clinic.id, staff_id=nurse.id, leave_type="casual",
                                    from_date=_day(10), to_date=_day(11), reason="Family function",
                                    status="pending"))
            db.add(SchedulerSettings(clinic_id=clinic.id, min_rest_hours=8, max_shifts_per_week=6,
                                     weekly_off_day="sunday",
                                     leave_quotas={"casual": 12, "sick": 10, "pto": 15, "earned": 15},
                                     setup_complete=True))
        db.commit()
        print("[seed]   ✓ Scheduler: shifts, group, published week, leave, settings")
    except Exception as e:
        db.rollback()
        print(f"[seed]   ⚠ scheduler skipped: {e}")

    # ── Internal chat: a group room + a direct room with messages ────────────
    try:
        if not db.query(ChatRoom).filter_by(clinic_id=clinic.id).first():
            grp = ChatRoom(clinic_id=clinic.id, room_type="group", name="Apollo Demo — General")
            db.add(grp)
            db.flush()
            members = [s for s in (drpriya, drrajan, ravi, nurse, meera, manager) if s]
            for s in members:
                db.add(ChatRoomMember(room_id=grp.id, staff_id=s.id))
            db.add(InternalMessage(room_id=grp.id, sender_id=manager.id if manager else drpriya.id,
                                   body="Good morning team — OPD starts at 9. Please confirm coverage."))
            db.add(InternalMessage(room_id=grp.id, sender_id=ravi.id if ravi else drpriya.id,
                                   body="Front desk ready. 6 appointments confirmed for today."))
            if drrajan:
                direct = ChatRoom(clinic_id=clinic.id, room_type="direct")
                db.add(direct)
                db.flush()
                db.add(ChatRoomMember(room_id=direct.id, staff_id=drpriya.id))
                db.add(ChatRoomMember(room_id=direct.id, staff_id=drrajan.id))
                db.add(InternalMessage(room_id=direct.id, sender_id=drrajan.id,
                                       body="Can you review the ECG for bed A-101 when free?"))
        db.commit()
        print("[seed]   ✓ Internal chat: group + direct rooms with messages")
    except Exception as e:
        db.rollback()
        print(f"[seed]   ⚠ chat skipped: {e}")

    # ── Misc: maintenance request, feedback, form response, waiver log ───────
    try:
        if not db.query(MaintenanceRequest).filter_by(clinic_id=clinic.id).first():
            db.add(MaintenanceRequest(clinic_id=clinic.id, title="AC not cooling in Ward A",
                                      description="Ward A air-conditioning needs servicing.",
                                      category="facility", priority="high", status="new",
                                      location="Ward A", portal_source="carechart",
                                      submitted_by=nurse.id if nurse else drpriya.id))
            db.add(MaintenanceRequest(clinic_id=clinic.id, title="Printer offline at reception",
                                      description="Token printer not responding.", category="it_software",
                                      priority="medium", status="in_progress", location="Reception",
                                      portal_source="staff", submitted_by=ravi.id if ravi else None,
                                      assigned_to=manager.id if manager else None))
        if not db.query(Feedback).filter_by(email="aarav@example.com").first():
            db.add(Feedback(name="Aarav Sharma", email="aarav@example.com",
                            message="Great experience with the online booking and reports.", type="compliment"))
        # Form response on Aarav's appointment using a global template
        tmpl = db.query(FormTemplate).filter_by(name="Chief Complaint & Triage").first()
        aarav_appt = db.query(Appointment).filter_by(patient_id=pt["aarav"].id).first()
        if tmpl and aarav_appt and not db.query(FormResponse).filter_by(appointment_id=aarav_appt.id).first():
            db.add(FormResponse(template_id=tmpl.id, appointment_id=aarav_appt.id,
                                patient_id=pt["aarav"].id,
                                data={"chief_complaint": "Cough and fever x4 days",
                                      "triage_level": "Yellow - Moderate", "onset": "4-7 days",
                                      "allergies": "NKDA"},
                                filled_by=ravi.id if ravi else None))
        db.commit()
        print("[seed]   ✓ Misc: maintenance, feedback, intake form response")
    except Exception as e:
        db.rollback()
        print(f"[seed]   ⚠ misc section skipped: {e}")

    _mark_seeded(db)
    print("[seed]   ✓✓ Comprehensive clinical demo seed complete (sentinel set)")
