"""
BharatCliniq Seed Script — idempotent, safe to run on every deploy.
Commits in stages so a failure in demo data never rolls back critical auth records.
Run: python seed.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text
from app.db.session import SessionLocal, engine, Base
from app.models.models import (
    PlatformAdmin, Clinic, Branch, Staff, DoctorProfile,
    DoctorSchedule, Patient, Medicine, LabTest,
    Department, Ward, Bed, Admission,
)
from app.core.security import hash_password
from datetime import date, datetime, timedelta


def _exists(db, model, **filters):
    return db.query(model).filter_by(**filters).first() is not None


def _seed_critical(db):
    """Platform admin + clinic staff. Committed independently."""
    print("[seed] Starting BharatCliniq seed...")

    # ── Platform Superadmin ───────────────────────────────────────────
    if not _exists(db, PlatformAdmin, email="superadmin@bharathealth.com"):
        db.add(PlatformAdmin(
            full_name="BharatCliniq Admin",
            email="superadmin@bharathealth.com",
            hashed_password=hash_password("SuperAdmin@123"),
            is_active=True,
        ))
        print("[seed]   ✓ Platform admin created")
    else:
        admin = db.query(PlatformAdmin).filter_by(email="superadmin@bharathealth.com").first()
        admin.hashed_password = hash_password("SuperAdmin@123")
        admin.is_active = True
        print("[seed]   ✓ Platform admin password refreshed")

    db.commit()

    # ── Demo Clinic ───────────────────────────────────────────────────
    clinic = db.query(Clinic).filter_by(slug="apollo-demo-clinic").first()
    if not clinic:
        clinic = Clinic(
            name="Apollo Demo Clinic",
            slug="apollo-demo-clinic",
            specialty="Multi-Specialty",
            description="A demo multi-specialty clinic on BharatCliniq platform.",
            email="info@apollodemo.com",
            phone="040-12345678",
            address="123 Jubilee Hills",
            city="Hyderabad",
            state="Telangana",
            pincode="500033",
            is_active=True,
            is_verified=True,
            subscription_plan='pro',
            subscription_status='active',
            subscription_expiry=datetime.now() + timedelta(days=365),
        )
        db.add(clinic)
        db.commit()
        db.refresh(clinic)
        print("[seed]   ✓ Demo clinic created")

    # ── Branches ──────────────────────────────────────────────────────
    branch_main = db.query(Branch).filter_by(clinic_id=clinic.id, name="Main Branch - Jubilee Hills").first()
    if not branch_main:
        branch_main = Branch(
            clinic_id=clinic.id,
            name="Main Branch - Jubilee Hills",
            address="123 Jubilee Hills Road",
            city="Hyderabad", state="Telangana", pincode="500033",
            phone="040-12345678", email="main@apollodemo.com",
        )
        db.add(branch_main)
        db.commit()
        db.refresh(branch_main)
        print("[seed]   ✓ Main branch created")

    # ── Staff ─────────────────────────────────────────────────────────
    staff_defs = [
        dict(email="drpriya@apollodemo.com",  mobile="9000000002", full_name="Dr. Priya Sharma",  role="clinic_admin",       password="Doctor@123",    username="priy17"),  # Owner (founding doctor)
        dict(email="drrajan@apollodemo.com",  mobile="9000000006", full_name="Dr. Rajan Mehta",   role="doctor",             password="Doctor@123",    username="raja83"),
        dict(email="manager@apollodemo.com",  mobile="9000000007", full_name="Sunita Verma",      role="clinic_manager",     password="Manager@123",   username="suni42"),
        dict(email="ravi@apollodemo.com",     mobile="9000000003", full_name="Ravi Kumar",        role="receptionist",       password="Reception@123", username="ravi56"),
        dict(email="meera@apollodemo.com",    mobile="9000000004", full_name="Meera Patel",       role="pharmacist",         password="Pharmacy@123",  username="meer29"),
        dict(email="arjun@apollodemo.com",    mobile="9000000005", full_name="Arjun Singh",       role="lab_tech",           password="Lab@123",       username="arju74"),
        dict(email="kiran@apollodemo.com",    mobile="9000000008", full_name="Kiran Rao",         role="imaging_technician", password="Imaging@123",   username="kira38"),
        dict(email="drsuresh@apollodemo.com", mobile="9000000009", full_name="Dr. Suresh Nair",   role="radiologist",        password="Radio@123",     username="sure91"),
        dict(email="demo@bharatcliniq.com",   mobile="9000000099", full_name="Dr. Rajesh Kumar",  role="clinic_admin",       password="Demo@1234",     username="raje61"),
        dict(email="nurse.ananya@apollodemo.com", mobile="9000000010", full_name="Ananya Thomas", role="nurse",              password="Nurse@123",     username="anan55"),
        dict(email="nurse.kavitha@apollodemo.com", mobile="9000000011", full_name="Kavitha Menon", role="nurse",             password="Nurse@123",     username="kavi33"),
    ]

    doctor1 = None
    doctor2 = None
    for s in staff_defs:
        existing = db.query(Staff).filter_by(email=s["email"]).first()
        if existing:
            existing.hashed_password = hash_password(s["password"])
            existing.is_active = True
            existing.is_first_login = False
            if s.get("username") and not existing.username:
                existing.username = s["username"]
        else:
            new_staff = Staff(
                clinic_id=clinic.id, branch_id=branch_main.id,
                full_name=s["full_name"], email=s["email"], mobile=s["mobile"],
                hashed_password=hash_password(s["password"]),
                role=s["role"], is_active=True,
                username=s.get("username"), is_first_login=False,
            )
            db.add(new_staff)
            db.flush()
            existing = new_staff
        if s["email"] == "drpriya@apollodemo.com":
            doctor1 = existing
        if s["email"] == "drrajan@apollodemo.com":
            doctor2 = existing

    db.commit()
    print("[seed]   ✓ All staff passwords set/refreshed")

    # ── Demo PINs (set for all clinic staff if not already set) ──────
    DEMO_PIN = "2580"
    all_staff = db.query(Staff).filter_by(clinic_id=clinic.id).all()
    for st in all_staff:
        if not getattr(st, 'pin_hash', None):
            st.pin_hash = hash_password(DEMO_PIN)
    db.commit()
    print(f"[seed]   ✓ Demo PIN set: {DEMO_PIN} (for all staff who had none)")

    # ── Doctor Profiles ───────────────────────────────────────────────
    if doctor1 and not _exists(db, DoctorProfile, staff_id=doctor1.id):
        db.add(DoctorProfile(
            staff_id=doctor1.id, specialty="General Medicine",
            qualification="MBBS, MD (Internal Medicine)", mci_number="AP-MED-12345",
            experience_years=8, consultation_fee=500,
            bio="Dr. Priya Sharma is an experienced general physician.",
            languages=["English", "Telugu", "Hindi"],
            accepts_online_booking=True, avg_consultation_minutes=15,
        ))

    if doctor2 and not _exists(db, DoctorProfile, staff_id=doctor2.id):
        db.add(DoctorProfile(
            staff_id=doctor2.id, specialty="Cardiology",
            qualification="MBBS, MD, DM (Cardiology)", mci_number="AP-MED-67890",
            experience_years=12, consultation_fee=800,
            bio="Dr. Rajan Mehta is a senior cardiologist.",
            languages=["English", "Telugu", "Hindi"],
            accepts_online_booking=True, avg_consultation_minutes=20,
        ))

    db.commit()

    # ── Demo Patients ─────────────────────────────────────────────────
    if not _exists(db, Patient, uhid="BH202400001"):
        db.add(Patient(
            clinic_id=clinic.id, branch_id=branch_main.id,
            uhid="BH202400001", full_name="Amit Verma",
            date_of_birth=date(1985, 5, 20), gender='male',
            mobile="9111111111", email="amit.verma@email.com",
            blood_group="B+", city="Hyderabad", state="Telangana",
        ))
    if not _exists(db, Patient, uhid="BH202400002"):
        db.add(Patient(
            clinic_id=clinic.id, branch_id=branch_main.id,
            uhid="BH202400002", full_name="Sunita Devi",
            date_of_birth=date(1992, 8, 15), gender='female',
            mobile="9222222222", blood_group="O+",
            city="Hyderabad", state="Telangana", allergies="Penicillin",
        ))
    db.commit()

    return branch_main


def _seed_demo_data(db, branch_main):
    """Medicines and lab tests — non-critical, failures are logged but ignored."""

    medicine_defs = [
        dict(name="Paracetamol 500mg",  generic_name="Paracetamol",  category="Analgesic",        form="Tablet",  strength="500mg", unit_price=2.50,  stock_quantity=500, reorder_level=50),
        dict(name="Amoxicillin 500mg",  generic_name="Amoxicillin",  category="Antibiotic",       form="Capsule", strength="500mg", unit_price=12.00, stock_quantity=200, reorder_level=30),
        dict(name="Metformin 500mg",    generic_name="Metformin",    category="Antidiabetic",     form="Tablet",  strength="500mg", unit_price=3.50,  stock_quantity=300, reorder_level=40),
        dict(name="Atorvastatin 10mg",  generic_name="Atorvastatin", category="Cardiac",          form="Tablet",  strength="10mg",  unit_price=8.00,  stock_quantity=150, reorder_level=20),
        dict(name="Omeprazole 20mg",    generic_name="Omeprazole",   category="Antacid",          form="Capsule", strength="20mg",  unit_price=5.00,  stock_quantity=180, reorder_level=25),
        dict(name="Cetirizine 10mg",    generic_name="Cetirizine",   category="Antihistamine",    form="Tablet",  strength="10mg",  unit_price=4.00,  stock_quantity=200, reorder_level=25),
        dict(name="Amlodipine 5mg",     generic_name="Amlodipine",   category="Antihypertensive", form="Tablet",  strength="5mg",   unit_price=6.50,  stock_quantity=120, reorder_level=20),
    ]
    try:
        for m in medicine_defs:
            if not _exists(db, Medicine, branch_id=branch_main.id, name=m["name"]):
                db.add(Medicine(branch_id=branch_main.id, **m))
        db.commit()
        print("[seed]   ✓ Medicines seeded")
    except Exception as e:
        db.rollback()
        print(f"[seed]   ⚠ Medicines skipped: {e}")

    lab_defs = [
        dict(name="Complete Blood Count",        code="CBC",    category="Haematology",   price=250, normal_range="Various", turnaround_hours=4),
        dict(name="Blood Glucose Fasting",       code="FBS",    category="Biochemistry",  price=80,  normal_range="70-100",  unit="mg/dL", turnaround_hours=2),
        dict(name="HbA1c",                       code="HBA1C",  category="Biochemistry",  price=350, normal_range="< 5.7",   unit="%", turnaround_hours=6),
        dict(name="Lipid Profile",               code="LIPID",  category="Biochemistry",  price=400, normal_range="Various", turnaround_hours=4),
        dict(name="Urine Routine",               code="URE",    category="Urology",       price=60,  normal_range="Normal",  turnaround_hours=2),
        dict(name="Thyroid Profile (T3/T4/TSH)", code="TFT",    category="Endocrinology", price=500, normal_range="Various", turnaround_hours=6),
        dict(name="ECG",                         code="ECG",    category="Cardiology",    price=150, normal_range="Normal sinus rhythm", turnaround_hours=1),
    ]
    try:
        for t in lab_defs:
            if not _exists(db, LabTest, branch_id=branch_main.id, code=t["code"]):
                db.add(LabTest(branch_id=branch_main.id, **t))
        db.commit()
        print("[seed]   ✓ Lab tests seeded")
    except Exception as e:
        db.rollback()
        print(f"[seed]   ⚠ Lab tests skipped: {e}")


def _seed_inpatient(db):
    """Seed departments, wards, beds, and demo admissions for Apollo demo clinic."""
    clinic = db.query(Clinic).filter_by(slug="apollo-demo-clinic").first()
    if not clinic:
        return

    # Enable hospital features
    try:
        clinic.org_type      = 'hospital'
        clinic.wards_enabled = True
        db.commit()
    except Exception:
        db.rollback()

    # ── Departments ──────────────────────────────────────────────────────────
    dept_defs = [
        dict(name="General Medicine",    code="GM",   dept_type="clinical",   color_hex="#3B82F6"),
        dict(name="Cardiology",          code="CARD", dept_type="clinical",   color_hex="#EF4444"),
        dict(name="Orthopaedics",        code="ORTH", dept_type="clinical",   color_hex="#8B5CF6"),
        dict(name="Obstetrics & Gynaecology", code="OBG", dept_type="clinical", color_hex="#EC4899"),
        dict(name="Paediatrics",         code="PAED", dept_type="clinical",   color_hex="#F59E0B"),
        dict(name="Emergency",           code="ER",   dept_type="emergency",  color_hex="#DC2626"),
        dict(name="ICU",                 code="ICU",  dept_type="critical",   color_hex="#7C3AED"),
        dict(name="Surgery",             code="SURG", dept_type="clinical",   color_hex="#059669"),
    ]
    depts = {}
    try:
        for d in dept_defs:
            obj = db.query(Department).filter_by(clinic_id=clinic.id, code=d["code"]).first()
            if not obj:
                obj = Department(clinic_id=clinic.id, is_active=True, **d)
                db.add(obj)
                db.flush()
            depts[d["code"]] = obj
        db.commit()
        print("[seed]   ✓ Departments seeded")
    except Exception as e:
        db.rollback()
        print(f"[seed]   ⚠ Departments skipped: {e}")
        return

    # ── Wards ────────────────────────────────────────────────────────────────
    ward_defs = [
        dict(code="GM",   name="General Ward A",      floor="1", ward_type="general",    total_beds=10),
        dict(code="GM",   name="General Ward B",      floor="1", ward_type="general",    total_beds=10),
        dict(code="CARD", name="Cardiac Care Unit",   floor="2", ward_type="semi_private", total_beds=8),
        dict(code="ORTH", name="Ortho Ward",          floor="2", ward_type="general",    total_beds=8),
        dict(code="OBG",  name="Maternity Ward",      floor="3", ward_type="general",    total_beds=10),
        dict(code="PAED", name="Paediatric Ward",     floor="3", ward_type="general",    total_beds=8),
        dict(code="ICU",  name="Medical ICU",         floor="4", ward_type="icu",        total_beds=6),
        dict(code="SURG", name="Surgical Ward",       floor="2", ward_type="general",    total_beds=8),
        dict(code="ER",   name="Emergency Ward",      floor="G", ward_type="emergency",  total_beds=6),
    ]
    wards = {}
    try:
        for w in ward_defs:
            dept = depts.get(w["code"])
            if not dept:
                continue
            obj = db.query(Ward).filter_by(clinic_id=clinic.id, name=w["name"]).first()
            if not obj:
                obj = Ward(
                    clinic_id=clinic.id, department_id=dept.id,
                    name=w["name"], floor=w["floor"],
                    ward_type=w["ward_type"], total_beds=w["total_beds"],
                    is_active=True,
                )
                db.add(obj)
                db.flush()
            wards[w["name"]] = obj
        db.commit()
        print("[seed]   ✓ Wards seeded")
    except Exception as e:
        db.rollback()
        print(f"[seed]   ⚠ Wards skipped: {e}")
        return

    # ── Beds ─────────────────────────────────────────────────────────────────
    try:
        for ward_name, ward in wards.items():
            for i in range(1, ward.total_beds + 1):
                bed_num = f"{i:02d}"
                if not db.query(Bed).filter_by(ward_id=ward.id, bed_number=bed_num).first():
                    db.add(Bed(
                        clinic_id=clinic.id, ward_id=ward.id,
                        bed_number=bed_num, bed_type="general", status="vacant",
                    ))
        db.commit()
        print("[seed]   ✓ Beds seeded")
    except Exception as e:
        db.rollback()
        print(f"[seed]   ⚠ Beds skipped: {e}")
        return

    # ── Demo Patients & Admissions ───────────────────────────────────────────
    doctor = db.query(Staff).filter_by(clinic_id=clinic.id, role="doctor").first()
    admin  = db.query(Staff).filter_by(clinic_id=clinic.id, role="clinic_admin").first()
    admitting_doctor_id = (doctor or admin).id if (doctor or admin) else None
    if not admitting_doctor_id:
        return

    demo_patients = [
        dict(
            full_name="Ramesh Iyer",        mobile="9811100001", gender="male",
            date_of_birth=date(1958, 4, 12), blood_group="B+",
            ward="General Ward A",          bed="01", dept="GM",
            diagnosis="Hypertensive crisis with mild renal impairment",
            admitted_days=3,
        ),
        dict(
            full_name="Lakshmi Devi",       mobile="9811100002", gender="female",
            date_of_birth=date(1965, 8, 22), blood_group="O+",
            ward="Cardiac Care Unit",       bed="01", dept="CARD",
            diagnosis="Unstable angina — NSTEMI workup",
            admitted_days=2,
        ),
        dict(
            full_name="Arjun Sharma",       mobile="9811100003", gender="male",
            date_of_birth=date(1985, 1, 30), blood_group="A+",
            ward="Ortho Ward",              bed="02", dept="ORTH",
            diagnosis="Right femur fracture — post ORIF Day 2",
            admitted_days=2,
        ),
        dict(
            full_name="Sunita Reddy",       mobile="9811100004", gender="female",
            date_of_birth=date(1992, 11, 5), blood_group="AB+",
            ward="Maternity Ward",          bed="03", dept="OBG",
            diagnosis="Primigravida 38 weeks — elective LSCS",
            admitted_days=1,
        ),
        dict(
            full_name="Mohammed Saleem",    mobile="9811100005", gender="male",
            date_of_birth=date(1945, 3, 18), blood_group="O-",
            ward="Medical ICU",             bed="01", dept="ICU",
            diagnosis="Acute exacerbation COPD with type 2 respiratory failure",
            admitted_days=4,
        ),
        dict(
            full_name="Preethi Nair",       mobile="9811100006", gender="female",
            date_of_birth=date(1978, 6, 14), blood_group="B+",
            ward="Surgical Ward",           bed="04", dept="SURG",
            diagnosis="Acute appendicitis — post laparoscopic appendicectomy",
            admitted_days=1,
        ),
    ]

    try:
        seq = getattr(clinic, 'admission_sequence', 0) or 0
        for pd in demo_patients:
            # Create patient if not exists
            pat = db.query(Patient).filter_by(clinic_id=clinic.id, mobile=pd["mobile"]).first()
            if not pat:
                pat = Patient(
                    clinic_id=clinic.id,
                    full_name=pd["full_name"], mobile=pd["mobile"],
                    gender=pd["gender"], date_of_birth=pd["date_of_birth"],
                    blood_group=pd["blood_group"],
                )
                db.add(pat)
                db.flush()

            # Skip if already admitted
            existing_adm = db.query(Admission).filter_by(
                clinic_id=clinic.id, patient_id=pat.id, status='active'
            ).first()
            if existing_adm:
                continue

            # Get ward and bed
            ward = wards.get(pd["ward"])
            if not ward:
                continue
            bed = db.query(Bed).filter_by(ward_id=ward.id, bed_number=pd["bed"]).first()
            dept = depts.get(pd["dept"])

            seq += 1
            adm_number = f"IP{clinic.id:03d}{seq:05d}"
            admitted_at = datetime.utcnow() - timedelta(days=pd["admitted_days"])

            adm = Admission(
                clinic_id=clinic.id, patient_id=pat.id,
                admission_number=adm_number, admission_sequence=seq,
                department_id=dept.id if dept else None,
                ward_id=ward.id if ward else None,
                bed_id=bed.id if bed else None,
                admitting_doctor_id=admitting_doctor_id,
                primary_diagnosis=pd["diagnosis"],
                admitted_at=admitted_at,
                status="active",
                created_by=admitting_doctor_id,
            )
            db.add(adm)
            db.flush()

            # Mark bed as occupied
            if bed:
                bed.status = "occupied"
                bed.current_admission_id = adm.id

        clinic.admission_sequence = seq
        db.commit()
        print(f"[seed]   ✓ Demo admissions seeded ({seq} total)")
    except Exception as e:
        db.rollback()
        print(f"[seed]   ⚠ Admissions skipped: {e}")


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        branch_main = _seed_critical(db)
        _seed_demo_data(db, branch_main)
        _seed_inpatient(db)
        print("[seed] ✓ Seed complete!")
        print("=" * 55)
        print("  LOGIN CREDENTIALS")
        print("=" * 55)
        print("  Platform Admin  : superadmin@bharathealth.com / SuperAdmin@123")
        print("  Clinic Admin    : admin@apollodemo.com / Admin@123")
        print("  Doctor          : drpriya@apollodemo.com / Doctor@123")
        print("  Receptionist    : ravi@apollodemo.com / Reception@123")
        print("  Pharmacist      : meera@apollodemo.com / Pharmacy@123")
        print("  Lab Technician  : arjun@apollodemo.com / Lab@123")
        print("  Nurse (1)       : nurse.ananya@apollodemo.com / Nurse@123")
        print("  Nurse (2)       : nurse.kavitha@apollodemo.com / Nurse@123")
        print("  Demo Provider   : demo@bharatcliniq.com / Demo@1234")
        print("=" * 55)
        print("  CareChat PIN    : 2580  (all staff)")
        print("=" * 55)
    except Exception as e:
        db.rollback()
        print(f"[seed] FAILED: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
