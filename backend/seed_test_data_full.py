"""
BharatCliniq Full Test Data Seed
Creates: 2 test clinics + 3 test hospitals with full staff, patients, admissions, appointments.
Idempotent — safe to re-run.
Usage:  python seed_test_data_full.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.db.session import SessionLocal, engine, Base
from app.models.models import (
    Clinic, Branch, Staff, DoctorProfile,
    Patient, Department, Ward, Bed, Admission, Appointment,
)
from app.core.security import hash_password
from datetime import date, datetime, timedelta

# ── Global counters ───────────────────────────────────────────────────────────

_pin_val        = 1110   # increments to 1111 on first call
_staff_mobile   = 8000000000
_patient_mobile = 8100000000

def _next_pin():
    global _pin_val
    _pin_val += 1
    return str(_pin_val)

def _next_staff_mobile():
    global _staff_mobile
    _staff_mobile += 1
    return str(_staff_mobile)

def _next_patient_mobile():
    global _patient_mobile
    _patient_mobile += 1
    return str(_patient_mobile)

# ── Credential log ────────────────────────────────────────────────────────────

CRED_LOG = []   # (org_name, full_name, email, password, pin)

def _log(org_name, full_name, email, password, pin):
    CRED_LOG.append((org_name, full_name, email, password, pin))

# ── Helpers ───────────────────────────────────────────────────────────────────

def _get(db, model, **kw):
    return db.query(model).filter_by(**kw).first()

def _exists(db, model, **kw):
    return _get(db, model, **kw) is not None

# ── Builders ──────────────────────────────────────────────────────────────────

def _make_org(db, name, slug, org_type):
    org = _get(db, Clinic, slug=slug)
    if not org:
        org = Clinic(
            name=name, slug=slug,
            specialty="Multi-Specialty",
            description=f"BharatCliniq QA — {name}",
            email=f"info@{slug}.test",
            phone="0000000000",
            address="1 Test Lane, Hyderabad",
            city="Hyderabad", state="Telangana", pincode="500001",
            is_active=True, is_verified=True, status="active",
            subscription_plan="pro", subscription_status="active",
            subscription_expiry=datetime.now() + timedelta(days=365),
            org_type=org_type,
            wards_enabled=(org_type == "hospital"),
            has_inpatient=(org_type == "hospital"),
            has_telehealth=True, has_pharmacy=True,
            has_lab=True,
            has_imaging=(org_type == "hospital"),
            has_emergency=(org_type == "hospital"),
            total_beds=40 if org_type == "hospital" else 0,
            icu_beds=10  if org_type == "hospital" else 0,
            admission_sequence=0,
            patient_id_counter=0,
        )
        db.add(org)
        db.flush()
        print(f"    + Created {org_type}: {name}")
    else:
        if org_type == "hospital":
            org.wards_enabled = True
            org.has_inpatient = True
            org.has_telehealth = True
        print(f"    ~ {name} already exists")
    return org


def _make_branch(db, org):
    branch = _get(db, Branch, clinic_id=org.id, name="Main Branch")
    if not branch:
        branch = Branch(
            clinic_id=org.id, name="Main Branch",
            address="1 Test Lane, Hyderabad",
            city="Hyderabad", phone="0000000000", is_active=True,
        )
        db.add(branch)
        db.flush()
    return branch


def _make_staff(db, org, branch, full_name, email, role, password="Test@1234"):
    pin = _next_pin()
    existing = _get(db, Staff, email=email)
    if existing:
        existing.hashed_password   = hash_password(password)
        existing.pin_hash          = hash_password(pin)
        existing.is_active         = True
        existing.is_first_login    = False
        _log(org.name, full_name, email, password, pin)
        return existing, pin
    staff = Staff(
        clinic_id=org.id, branch_id=branch.id,
        full_name=full_name, email=email,
        mobile=_next_staff_mobile(),
        hashed_password=hash_password(password),
        role=role, is_active=True, is_first_login=False,
        has_inpatient_access=(role in ("doctor","nurse","clinic_admin","clinic_manager")),
        pin_hash=hash_password(pin),
    )
    db.add(staff)
    db.flush()
    _log(org.name, full_name, email, password, pin)
    return staff, pin


def _make_doctor_profile(db, staff, org, specialty, telehealth=True):
    existing = _get(db, DoctorProfile, staff_id=staff.id)
    if existing:
        return existing
    prof = DoctorProfile(
        staff_id=staff.id, clinic_id=org.id,
        specialty=specialty,
        qualification="MBBS, MD",
        mci_number=f"MCI-{org.id}-{staff.id}",
        experience_years=6, consultation_fee=500,
        languages="English, Telugu, Hindi",
        telehealth_enabled=telehealth, telehealth_fee=300,
        accepts_online_booking=True, avg_consultation_minutes=15,
        is_active=True,
    )
    db.add(prof)
    db.flush()
    return prof


def _make_patient(db, org, branch, full_name, mobile, gender, dob, blood_group, seq):
    existing = _get(db, Patient, clinic_id=org.id, mobile=mobile)
    if existing:
        return existing
    pat = Patient(
        clinic_id=org.id, branch_id=branch.id,
        clinic_patient_id=f"{org.id:03d}-{seq:04d}",
        full_name=full_name, mobile=mobile,
        gender=gender, date_of_birth=dob,
        blood_group=blood_group,
        city="Hyderabad", state="Telangana",
    )
    db.add(pat)
    db.flush()
    return pat


# ── Seed helpers ──────────────────────────────────────────────────────────────

_GENDERS   = ["male","female","male","female","male","female","male","female","male","female"]
_BGROUPS   = ["B+","O+","A+","AB+","O-","B-","A-","B+","O+","A+"]
_DIAGNOSES = [
    "Type 2 Diabetes Mellitus with peripheral neuropathy",
    "Hypertensive urgency — BP 190/110 mmHg",
    "Community-acquired pneumonia — right lower lobe consolidation",
    "Acute chest pain — rule out NSTEMI",
    "Post-op day 1 — laparoscopic cholecystectomy",
    "Dengue fever with thrombocytopenia (platelets 48k)",
    "COPD acute exacerbation — moderate severity",
    "Ischaemic stroke — right MCA territory",
    "Acute kidney injury — stage 2 (creatinine 3.1)",
    "Urosepsis — gram-negative bacteraemia",
    "Decompensated cardiac failure — EF 28%",
    "Deep vein thrombosis — left lower limb",
    "Cerebral malaria — P. falciparum",
    "Fracture right neck of femur — awaiting THR",
    "Acute pancreatitis — Ranson score 3",
    "Upper GI bleed — duodenal ulcer",
    "Viral hepatitis B — fulminant form",
    "Acute respiratory failure — type 1",
    "Preterm labour — 32 weeks gestation",
    "Paediatric febrile seizure — under observation",
]
_DIAG_IDX = 0

def _next_diag():
    global _DIAG_IDX
    d = _DIAGNOSES[_DIAG_IDX % len(_DIAGNOSES)]
    _DIAG_IDX += 1
    return d


# ── Seed one clinic ───────────────────────────────────────────────────────────

def seed_clinic(db, name, slug, tag):
    print(f"\n[seed] ── {name} ──")
    org    = _make_org(db, name, slug, "clinic")
    db.commit()
    branch = _make_branch(db, org)
    db.commit()

    # Staff
    _make_staff(db, org, branch, f"{tag.upper()} Admin",          f"{tag}admin@testbharat.com",  "clinic_admin")
    _make_staff(db, org, branch, f"{tag.upper()} Manager",        f"{tag}manager@testbharat.com","clinic_manager")

    doctor_profiles = []
    specialties_c = ["General Medicine", "Dentistry"]
    for i in range(1, 3):
        st, _ = _make_staff(db, org, branch, f"Dr. {tag.upper()} Doctor {i}", f"{tag}doctor{i}@testbharat.com", "doctor")
        prof = _make_doctor_profile(db, st, org, specialty=specialties_c[i-1], telehealth=(i == 1))
        doctor_profiles.append(prof)

    _make_staff(db, org, branch, f"{tag.upper()} Receptionist 1", f"{tag}recept1@testbharat.com",  "receptionist")
    _make_staff(db, org, branch, f"{tag.upper()} Nurse 1",        f"{tag}nurse1@testbharat.com",   "nurse")
    _make_staff(db, org, branch, f"{tag.upper()} Pharmacist 1",   f"{tag}pharma1@testbharat.com",  "pharmacist")
    _make_staff(db, org, branch, f"{tag.upper()} Lab Tech 1",     f"{tag}labtech1@testbharat.com", "lab_tech")
    db.commit()

    # 10 patients
    patients = []
    for i in range(1, 11):
        pat = _make_patient(
            db, org, branch,
            full_name=f"{tag.upper()} Patient {i}",
            mobile=_next_patient_mobile(),
            gender=_GENDERS[i % 10],
            dob=date(1990 - i * 2, (i % 12) + 1, (i % 28) + 1),
            blood_group=_BGROUPS[i % 10],
            seq=i,
        )
        patients.append(pat)
    db.commit()

    # 7 appointments today: 5 OPD + 2 telehealth
    today  = date.today()
    slots  = ["09:00","09:30","10:00","10:30","11:00","14:00","14:30"]
    modes  = ["offline","offline","offline","offline","offline","telehealth","telehealth"]
    for i, pat in enumerate(patients[:7]):
        dr = doctor_profiles[i % len(doctor_profiles)]
        if not _exists(db, Appointment, clinic_id=org.id, patient_id=pat.id, appointment_date=today):
            db.add(Appointment(
                clinic_id=org.id, branch_id=branch.id,
                patient_id=pat.id, doctor_id=dr.id,
                appointment_date=today, appointment_time=slots[i],
                token_number=i + 1, status="confirmed",
                mode=modes[i], reason="Test consultation",
                fee=500, visit_type="fresh",
            ))
    db.commit()
    print(f"    ✓ 10 patients · 5 OPD + 2 telehealth appointments today")


# ── Seed one hospital ─────────────────────────────────────────────────────────

_SPECIALTIES_H = ["General Medicine","Cardiology","Orthopaedics","Pulmonology","Nephrology"]

def seed_hospital(db, name, slug, tag):
    print(f"\n[seed] ── {name} ──")
    org    = _make_org(db, name, slug, "hospital")
    db.commit()
    branch = _make_branch(db, org)
    db.commit()

    # ── Staff ──────────────────────────────────────────────────────────────
    _make_staff(db, org, branch, f"{tag.upper()} Admin",   f"{tag}admin@testbharat.com",   "clinic_admin")
    _make_staff(db, org, branch, f"{tag.upper()} Manager", f"{tag}manager@testbharat.com", "clinic_manager")

    doctor_profiles = []
    for i in range(1, 6):
        st, _ = _make_staff(db, org, branch, f"Dr. {tag.upper()} Doctor {i}", f"{tag}doctor{i}@testbharat.com", "doctor")
        prof  = _make_doctor_profile(db, st, org, specialty=_SPECIALTIES_H[i-1], telehealth=True)
        doctor_profiles.append(prof)

    for i in range(1, 4):
        _make_staff(db, org, branch, f"{tag.upper()} Nurse {i}",         f"{tag}nurse{i}@testbharat.com",  "nurse")
    for i in range(1, 3):
        _make_staff(db, org, branch, f"{tag.upper()} Receptionist {i}",  f"{tag}recept{i}@testbharat.com", "receptionist")
    _make_staff(db, org, branch, f"{tag.upper()} Pharmacist 1",  f"{tag}pharma1@testbharat.com",  "pharmacist")
    _make_staff(db, org, branch, f"{tag.upper()} Lab Tech 1",    f"{tag}labtech1@testbharat.com", "lab_tech")
    db.commit()

    # ── Departments ────────────────────────────────────────────────────────
    dept_defs = [
        dict(name="General Medicine", code=f"{tag.upper()}_GM",   dept_type="clinical", color_hex="#3B82F6"),
        dict(name="Cardiology",       code=f"{tag.upper()}_CARD", dept_type="clinical", color_hex="#EF4444"),
    ]
    depts = {}
    for d in dept_defs:
        obj = _get(db, Department, clinic_id=org.id, code=d["code"])
        if not obj:
            obj = Department(clinic_id=org.id, is_active=True, **d)
            db.add(obj)
            db.flush()
        depts[d["code"]] = obj
    db.commit()

    # ── Wards (2 per department = 4 total) ─────────────────────────────────
    ward_defs = [
        dict(dept_key=f"{tag.upper()}_GM",   name=f"{tag.upper()} General Ward A",  floor="1", ward_type="general"),
        dict(dept_key=f"{tag.upper()}_GM",   name=f"{tag.upper()} General Ward B",  floor="1", ward_type="general"),
        dict(dept_key=f"{tag.upper()}_CARD", name=f"{tag.upper()} Cardiac Ward A",  floor="2", ward_type="semi_private"),
        dict(dept_key=f"{tag.upper()}_CARD", name=f"{tag.upper()} Cardiac Ward B",  floor="2", ward_type="semi_private"),
    ]
    wards = []
    for w in ward_defs:
        obj = _get(db, Ward, clinic_id=org.id, name=w["name"])
        if not obj:
            obj = Ward(
                clinic_id=org.id,
                department_id=depts[w["dept_key"]].id,
                name=w["name"], floor=w["floor"],
                ward_type=w["ward_type"], total_beds=10,
                is_active=True,
            )
            db.add(obj)
            db.flush()
        wards.append(obj)
    db.commit()

    # ── Beds (10 per ward = 40 total) ──────────────────────────────────────
    ward_beds = {}
    for ward in wards:
        ward_beds[ward.id] = []
        for i in range(1, 11):
            bn  = f"{i:02d}"
            bed = _get(db, Bed, ward_id=ward.id, bed_number=bn)
            if not bed:
                bed = Bed(
                    clinic_id=org.id, ward_id=ward.id,
                    bed_number=bn, bed_type="general", status="vacant",
                )
                db.add(bed)
                db.flush()
            ward_beds[ward.id].append(bed)
    db.commit()

    # ── Patients & active admissions (5 per ward = 20 total) ──────────────
    seq     = org.admission_sequence or 0
    pat_seq = 0

    for ward in wards:
        dept = _get(db, Department, id=ward.department_id)
        for slot in range(5):       # 5 admissions per ward
            pat_seq += 1
            pat = _make_patient(
                db, org, branch,
                full_name=f"{tag.upper()} Patient {pat_seq}",
                mobile=_next_patient_mobile(),
                gender=_GENDERS[pat_seq % 10],
                dob=date(1990 - (pat_seq % 40), (pat_seq % 12) + 1, (pat_seq % 28) + 1),
                blood_group=_BGROUPS[pat_seq % 10],
                seq=pat_seq,
            )

            if _exists(db, Admission, clinic_id=org.id, patient_id=pat.id, status="active"):
                continue

            bed    = ward_beds[ward.id][slot]   # beds 01–05 per ward
            dr     = doctor_profiles[slot % len(doctor_profiles)]
            seq   += 1
            adm    = Admission(
                clinic_id=org.id,
                patient_id=pat.id,
                admission_number=f"IP{org.id:03d}{seq:05d}",
                admission_sequence=seq,
                department_id=dept.id,
                ward_id=ward.id,
                bed_id=bed.id,
                admitting_doctor_id=dr.staff_id,
                primary_diagnosis=_next_diag(),
                admitted_at=datetime.utcnow() - timedelta(days=(slot + 1)),
                status="active",
                created_by=dr.staff_id,
            )
            db.add(adm)
            db.flush()

            bed.status             = "occupied"
            bed.current_admission_id = adm.id

    org.admission_sequence = seq
    db.commit()
    print(f"    ✓ 20 patients admitted (5 per ward × 4 wards)")

    # ── 6 telehealth appointments today ────────────────────────────────────
    today    = date.today()
    t_slots  = ["09:30","10:00","10:30","14:00","14:30","15:00"]
    all_pats = db.query(Patient).filter_by(clinic_id=org.id).limit(6).all()
    for i, pat in enumerate(all_pats):
        dr = doctor_profiles[i % len(doctor_profiles)]
        if not _exists(db, Appointment, clinic_id=org.id, patient_id=pat.id,
                       appointment_date=today, mode="telehealth"):
            db.add(Appointment(
                clinic_id=org.id, branch_id=branch.id,
                patient_id=pat.id, doctor_id=dr.id,
                appointment_date=today, appointment_time=t_slots[i],
                token_number=i + 1, status="confirmed",
                mode="telehealth",
                reason="Virtual ward round — post-admission follow-up",
                fee=300, visit_type="followup",
            ))
    db.commit()
    print(f"    ✓ 6 telehealth appointments today")


# ── Main ──────────────────────────────────────────────────────────────────────

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print("\n[seed] ═══════════════════════════════════════════")
        print("[seed]  BharatCliniq — Full Test Data Seed")
        print("[seed] ═══════════════════════════════════════════")

        seed_clinic(db,   "Test Clinic 1",   "test-clinic-1",   "tc1")
        seed_clinic(db,   "Test Clinic 2",   "test-clinic-2",   "tc2")
        seed_hospital(db, "Test Hospital 1", "test-hospital-1", "th1")
        seed_hospital(db, "Test Hospital 2", "test-hospital-2", "th2")
        seed_hospital(db, "Test Hospital 3", "test-hospital-3", "th3")

        # ── Credential table ───────────────────────────────────────────────
        print("\n")
        W = 100
        print("═" * W)
        print(f"  {'ORG':<22}  {'NAME':<28}  {'EMAIL':<38}  {'PASSWORD':<12}  PIN")
        print("─" * W)
        last_org = None
        for org_name, full_name, email, password, pin in CRED_LOG:
            if org_name != last_org:
                if last_org is not None:
                    print("─" * W)
                last_org = org_name
            print(f"  {org_name:<22}  {full_name:<28}  {email:<38}  {password:<12}  {pin}")
        print("═" * W)
        first_pin = CRED_LOG[0][4]  if CRED_LOG else "—"
        last_pin  = CRED_LOG[-1][4] if CRED_LOG else "—"
        print(f"  Total staff : {len(CRED_LOG)}")
        print(f"  PINs        : {first_pin} → {last_pin}")
        print(f"  Password    : Test@1234 (all staff)")
        print("═" * W)

    except Exception as e:
        db.rollback()
        print(f"\n[seed] FAILED: {e}")
        import traceback; traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
