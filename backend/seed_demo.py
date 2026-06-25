#!/usr/bin/env python3
"""
BharatCliniq — Full Demo Clinic Seed
====================================
Builds a complete, realistic clinic over the LIVE API so every Provider-portal
feature has real, DB-backed data to exercise. Everything is created through real
endpoints (no direct DB writes), so generated IDs (HC/MRN/encounter/BH), branch
scoping and tenancy all come out correct — exactly like real-world use.

What it creates
---------------
- 1 clinic + clinic-admin, verified (best-effort) via platform admin
- Staff: doctor, receptionist, nurse, pharmacist, lab-tech, imaging-tech
- A full weekly schedule for the doctor (with online + telehealth slots)
- 6 patients, each with a different real-world journey:
    * Completed OPD encounter  -> vitals, SOAP, prescription, lab + imaging, paid bill
    * Confirmed walk-in queue   -> vitals taken, waiting to be seen
    * Pending online booking    -> awaiting confirmation
    * Telehealth visit          -> mode=telehealth appointment
    * Inpatient admission       -> ward/bed, vitals, nursing notes, med orders, MAR,
                                   ward round, progress note, diet & peri-op charts
    * Cross-clinic referral
- Pharmacy medicines (so dispensing/stock screens are populated)

Idempotent: re-running skips any patient whose mobile already exists, so it is
safe to run repeatedly. Resilient: every step is independent and logs a clear
status; one failure never aborts the rest.

Usage
-----
    python seed_demo.py                       # defaults to the production API
    python seed_demo.py --api http://localhost:8000
    python seed_demo.py --api https://bharatcliniq-api.onrender.com

NOTE: pharmacist / lab-tech / imaging-tech are created INACTIVE by the backend
(activate them in the clinic-admin portal to log in as them). All their data is
seeded here using the admin + doctor tokens, so the Provider portal is fully
populated regardless.
"""
import sys
import json
import time
import base64
import argparse
import urllib.parse
import urllib.request
import urllib.error
from datetime import date, datetime, timedelta

API_BASE = "https://bharatcliniq-api.onrender.com"

# Shared demo password for every seeded staff account
PWD = "Test@1234"
# A tiny but valid 1-page PDF, base64 — used to create imaging result rows
TINY_PDF_B64 = base64.b64encode(b"%PDF-1.0\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF").decode()


# ── HTTP plumbing ──────────────────────────────────────────────────────────────
def _parse(raw):
    try:
        return json.loads(raw) if raw else {}
    except Exception:
        return {"detail": raw.decode(errors="replace") if raw else ""}


def call(method, base, path, token=None, body=None, params=None):
    """Returns (data, status). Never raises on HTTP error."""
    url = base + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            return _parse(r.read()), r.status
    except urllib.error.HTTPError as e:
        return _parse(e.read()), e.code
    except Exception as e:  # network / timeout
        return {"detail": str(e)}, 0


def ok(status):
    return status in (200, 201)


class Step:
    """Tiny progress logger."""
    n = 0

    @classmethod
    def head(cls, title):
        cls.n += 1
        print(f"\n{cls.n}. {title}")

    @staticmethod
    def good(msg):
        print(f"   ✅ {msg}")

    @staticmethod
    def info(msg):
        print(f"   ℹ️  {msg}")

    @staticmethod
    def warn(msg):
        print(f"   ⚠️  {msg}")


# ── date helpers ────────────────────────────────────────────────────────────────
def today_str():
    return date.today().isoformat()


def days_ago(n):
    return (date.today() - timedelta(days=n)).isoformat()


def days_ahead(n):
    return (date.today() + timedelta(days=n)).isoformat()


def iso_now():
    return datetime.now().isoformat()


# ── Seed routines ────────────────────────────────────────────────────────────────
def register_clinic(base):
    Step.head("Registering demo clinic + admin")
    res, st = call("POST", base, "/api/v1/public/register-clinic", body={
        "clinic": {
            "name": "BharatCliniq Demo Hospital",
            "specialty": "Multi-Speciality",
            "phone": "9876500000",
            "email": "clinic@demo.bharatcliniq.com",
            "address": "45 Residency Road",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560025",
        },
        "doctor": {"full_name": "Demo Admin"},
        "admin_email": "admin@demo.bharatcliniq.com",
        "admin_password": PWD,
    })
    if ok(st):
        Step.good("Clinic registered")
    elif "exist" in str(res.get("detail", "")).lower():
        Step.info("Clinic/admin already exists — continuing")
    else:
        Step.warn(f"register-clinic: {st} {res.get('detail', res)}")


def verify_clinic(base, clinic_id):
    """Best-effort: approve the clinic so it appears in public search."""
    if not clinic_id:
        return
    res, st = call("POST", base, "/api/v1/auth/platform/login", body={
        "identifier": "admin@bharathhealthsystems.com", "password": "Admin@1234",
    })
    if not ok(st):
        Step.info("No platform-admin login — verify the clinic manually if needed")
        return
    ptok = res.get("access_token")
    _, st = call("PUT", base, f"/api/v1/platform/clinics/{clinic_id}/verify", token=ptok, body={})
    Step.good("Clinic verified") if ok(st) else Step.info("Clinic verify skipped")


def login(base, identifier):
    res, st = call("POST", base, "/api/v1/auth/staff/login",
                   body={"identifier": identifier, "password": PWD})
    if not ok(st):
        return None, None
    return res.get("access_token"), res.get("clinic_id")


def create_staff(base, admin, branch_id):
    Step.head("Creating staff")
    roster = [
        {"full_name": "Dr. Priya Sharma", "email": "doctor@demo.bharatcliniq.com",
         "mobile": "9000010001", "role": "doctor", "specialty": "General Medicine",
         "mci_number": "KMC12345", "experience_years": 9, "consultation_fee": 500,
         "bio": "Consultant Physician, 9 years' experience."},
        {"full_name": "Ravi Kumar", "email": "reception@demo.bharatcliniq.com",
         "mobile": "9000010002", "role": "receptionist"},
        {"full_name": "Sister Anitha", "email": "nurse@demo.bharatcliniq.com",
         "mobile": "9000010003", "role": "nurse"},
        {"full_name": "Meena Patel", "email": "pharmacy@demo.bharatcliniq.com",
         "mobile": "9000010004", "role": "pharmacist"},
        {"full_name": "Arjun Singh", "email": "lab@demo.bharatcliniq.com",
         "mobile": "9000010005", "role": "lab_technician"},
        {"full_name": "Sneha Rao", "email": "imaging@demo.bharatcliniq.com",
         "mobile": "9000010006", "role": "imaging_tech"},
    ]
    for s in roster:
        payload = {**s, "password": PWD, "branch_id": branch_id}
        res, st = call("POST", base, "/api/v1/clinic/staff", token=admin, body=payload)
        if ok(st):
            Step.good(f"{s['role']}: {s['full_name']}")
        elif "exist" in str(res.get("detail", "")).lower():
            Step.info(f"{s['role']}: already exists")
        else:
            Step.warn(f"{s['role']}: {st} {res.get('detail', res)}")


def get_doctor_profile_id(base, admin):
    res, _ = call("GET", base, "/api/v1/clinic/doctors", token=admin)
    docs = res if isinstance(res, list) else []
    for d in docs:
        if d.get("email") == "doctor@demo.bharatcliniq.com":
            return d.get("profile_id")
    return docs[0].get("profile_id") if docs else None


def set_schedule(base, admin, profile_id, branch_id):
    Step.head("Setting doctor weekly schedule")
    if not profile_id:
        Step.warn("No doctor profile id — skipping schedule")
        return
    days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    done = 0
    for day in days:
        _, st = call("POST", base, f"/api/v1/clinic/doctors/{profile_id}/schedule",
                     token=admin, body={
                         "day_of_week": day, "start_time": "09:00", "end_time": "17:00",
                         "branch_id": branch_id, "slot_minutes": 15, "max_patients": 24,
                         "is_active": True, "online_slots": 6, "online_auto_confirm": 3,
                         "telehealth_slots": 4, "telehealth_auto_confirm": 2,
                     })
        if ok(st):
            done += 1
    Step.good(f"Schedule saved for {done}/{len(days)} days")


def existing_mobiles(base, admin):
    res, _ = call("GET", base, "/api/v1/patients", token=admin, params={"limit": 500})
    rows = res if isinstance(res, list) else res.get("items", []) if isinstance(res, dict) else []
    return {str(p.get("mobile")) for p in rows if isinstance(p, dict)}


def make_patient(base, admin, branch_id, spec):
    res, st = call("POST", base, "/api/v1/patients/", token=admin,
                   params={"branch_id": branch_id} if branch_id else None, body=spec)
    if ok(st):
        return res.get("id"), res
    Step.warn(f"patient {spec['full_name']}: {st} {res.get('detail', res)}")
    return None, None


def book_appt(base, tok, branch_id, patient_id, doctor_id, when, time_s, reason, mode="offline"):
    res, st = call("POST", base, "/api/v1/appointments/", token=tok,
                   params={"branch_id": branch_id} if branch_id else None, body={
                       "patient_id": patient_id, "doctor_id": doctor_id,
                       "appointment_date": when, "appointment_time": time_s,
                       "reason": reason, "mode": mode, "visit_type": "fresh", "fee": 500,
                   })
    return (res.get("id"), res) if ok(st) else (None, res)


def add_vitals(base, tok, patient_id, appt_id, v):
    call("POST", base, "/api/v1/appointments/vitals", token=tok,
         body={"patient_id": patient_id, "appointment_id": appt_id, **v})


def complete_encounter(base, doctor, appt_id, soap, rx_items, lab_tests):
    """Doctor-desk one-shot: SOAP + prescription + lab order, marks appt completed."""
    body = {"soap": soap}
    if rx_items:
        body["prescription"] = {"notes": "As advised", "items": rx_items}
    if lab_tests:
        body["lab_order"] = {"tests": lab_tests}
    _, st = call("POST", base, f"/api/v1/doctor/encounter/{appt_id}/complete",
                 token=doctor, body=body)
    return ok(st)


def lab_journey(base, doctor, admin, patient_id, appt_id, tests):
    res, st = call("POST", base, "/api/v1/lab-orders", token=doctor, body={
        "patient_id": patient_id, "appointment_id": appt_id,
        "test_names": tests, "clinical_notes": "Routine workup", "priority": "routine",
    })
    if not ok(st):
        return False
    oid = res.get("id")
    items = res.get("items") or res.get("order_items") or []
    # collect -> result
    call("PUT", base, f"/api/v1/lab/orders/{oid}/status", token=admin,
         params={"status": "sample_collected"})
    results = []
    samples = {"Complete Blood Count": ("13.4 g/dL", "13-17 g/dL", False),
               "Fasting Blood Sugar": ("142 mg/dL", "70-110 mg/dL", True),
               "Lipid Profile": ("210 mg/dL", "<200 mg/dL", True)}
    for it in items:
        nm = it.get("test_name", "")
        val, ref, abn = samples.get(nm, ("Normal", "-", False))
        results.append({"item_id": it.get("id"), "result": val,
                        "reference_range": ref, "is_abnormal": abn})
    if results:
        call("PUT", base, f"/api/v1/lab/orders/{oid}/results", token=admin,
             body={"results": results})
    return True


def imaging_journey(base, doctor, patient_id, appt_id, modality, body_part, desc):
    res, st = call("POST", base, "/api/v1/imaging-orders", token=doctor, body={
        "patient_id": patient_id, "appointment_id": appt_id, "modality": modality,
        "body_part": body_part, "study_description": desc,
        "clinical_notes": "Clinically indicated", "priority": "routine",
    })
    if not ok(st):
        return False
    code = res.get("order_id") or res.get("id")
    # create a result row (upload), then radiologist/doctor signs it
    call("POST", base, f"/api/v1/imaging-orders/{code}/upload-pdf",
         token=doctor, body={"pdf_b64": TINY_PDF_B64})
    call("POST", base, f"/api/v1/imaging-orders/{code}/sign", token=doctor, body={
        "findings": f"{body_part}: no acute abnormality. Lung fields clear, "
                    "cardiac silhouette normal.",
        "impression": "Normal study.",
    })
    return True


def bill(base, admin, branch_id, patient_id, appt_id, items):
    res, st = call("POST", base, "/api/v1/billing/invoices", token=admin,
                   params={"branch_id": branch_id} if branch_id else None, body={
                       "patient_id": patient_id, "appointment_id": appt_id,
                       "sale_type": "prescription", "items": items,
                   })
    if not ok(st):
        return
    inv_id = res.get("id")
    total = res.get("total") or sum(i["unit_price"] * i.get("quantity", 1) for i in items)
    call("POST", base, f"/api/v1/billing/invoices/{inv_id}/pay", token=admin,
         params={"amount": total, "payment_method": "cash"})


def pharmacy_stock(base, admin, branch_id):
    Step.head("Stocking pharmacy")
    meds = [
        {"name": "Paracetamol 500mg", "generic_name": "Paracetamol", "form": "Tablet",
         "strength": "500mg", "unit_price": 1.2, "mrp": 2.0, "stock_quantity": 800,
         "gst_rate": 12, "hsn_code": "3004"},
        {"name": "Amoxicillin 500mg", "generic_name": "Amoxicillin", "form": "Capsule",
         "strength": "500mg", "unit_price": 4.5, "mrp": 7.0, "stock_quantity": 400,
         "gst_rate": 12, "hsn_code": "3004", "schedule": "H"},
        {"name": "Metformin 500mg", "generic_name": "Metformin", "form": "Tablet",
         "strength": "500mg", "unit_price": 1.8, "mrp": 3.0, "stock_quantity": 600,
         "gst_rate": 12, "hsn_code": "3004"},
        {"name": "Pantoprazole 40mg", "generic_name": "Pantoprazole", "form": "Tablet",
         "strength": "40mg", "unit_price": 3.2, "mrp": 5.5, "stock_quantity": 300,
         "gst_rate": 12, "hsn_code": "3004"},
        {"name": "Amlodipine 5mg", "generic_name": "Amlodipine", "form": "Tablet",
         "strength": "5mg", "unit_price": 1.5, "mrp": 2.8, "stock_quantity": 500,
         "gst_rate": 12, "hsn_code": "3004"},
    ]
    made = 0
    for m in meds:
        _, st = call("POST", base, "/api/v1/pharmacy/medicines", token=admin,
                     params={"branch_id": branch_id} if branch_id else None, body=m)
        if ok(st):
            made += 1
    Step.good(f"{made}/{len(meds)} medicines in stock")


def inpatient_admission(base, admin, doctor, branch_id, patient_id, doctor_staff_id):
    """Full inpatient journey incl. the diet & peri-op JSONB blobs the charts read."""
    Step.head("Inpatient admission (ward, notes, MAR, rounds, diet & peri-op charts)")
    # department -> ward -> bed (admin-gated)
    dept, st = call("POST", base, "/api/v1/inpatient/departments", token=admin,
                    body={"name": "General Medicine", "code": "GMED", "dept_type": "clinical"})
    dept_id = dept.get("id") if ok(st) else None
    if not dept_id:
        res, _ = call("GET", base, "/api/v1/inpatient/departments", token=admin)
        dept_id = (res[0].get("id") if isinstance(res, list) and res else None)
    ward, st = call("POST", base, "/api/v1/inpatient/wards", token=admin, body={
        "department_id": dept_id, "name": "Ward A", "ward_type": "general", "total_beds": 10})
    ward_id = ward.get("id") if ok(st) else None
    bed, st = call("POST", base, "/api/v1/inpatient/beds", token=admin, body={
        "ward_id": ward_id, "bed_number": "A-101", "bed_type": "general"})
    bed_id = bed.get("id") if ok(st) else None

    adm, st = call("POST", base, "/api/v1/inpatient/admissions", token=admin, body={
        "patient_id": patient_id, "branch_id": branch_id, "department_id": dept_id,
        "ward_id": ward_id, "bed_id": bed_id, "admission_type": "opd_referred",
        "admitting_doctor_id": doctor_staff_id, "primary_diagnosis": "Community-acquired pneumonia",
        "status": "active",
    })
    if not ok(st):
        Step.warn(f"admission: {st} {adm.get('detail', adm)}")
        return
    aid = adm.get("id")
    Step.good(f"Admitted to Ward A / A-101 (admission #{aid})")

    call("POST", base, f"/api/v1/inpatient/admissions/{aid}/vitals", token=admin, body={
        "temperature": 38.4, "pulse": 96, "respiration_rate": 22, "bp_systolic": 124,
        "bp_diastolic": 82, "spo2": 94, "pain_score": 3, "notes": "Febrile on admission"})
    for note in [
        {"note_text": "Patient admitted with fever and productive cough. Started on IV "
                      "antibiotics. Vitals monitored 4th hourly.", "note_type": "assessment",
         "shift": "morning"},
        {"note_text": "Tolerating orals. SpO2 improved to 95% on room air. Chest "
                      "physiotherapy advised.", "note_type": "intervention", "shift": "evening",
         "is_handoff": True},
    ]:
        call("POST", base, f"/api/v1/inpatient/admissions/{aid}/notes", token=admin, body=note)

    call("POST", base, f"/api/v1/inpatient/admissions/{aid}/orders", token=admin, body={
        "drug_name": "Ceftriaxone", "dose": "1g", "route": "IV", "frequency": "BD",
        "duration_days": 5, "instructions": "Infuse over 30 min"})
    call("POST", base, f"/api/v1/inpatient/admissions/{aid}/mar", token=admin, body={
        "medicine_name": "Ceftriaxone 1g IV", "dose": "1g", "route": "IV",
        "scheduled_time": "08:00", "status": "given"})
    call("POST", base, f"/api/v1/inpatient/admissions/{aid}/rounds", token=doctor, body={
        "round_date": today_str(), "subjective": "Feeling better, less cough",
        "objective": "Afebrile, chest clearing", "assessment": "CAP — improving",
        "plan": "Continue IV antibiotics, review in AM"})
    call("POST", base, f"/api/v1/inpatient/admissions/{aid}/progress-notes", token=doctor, body={
        "note_date": today_str(), "subjective": "Day 2 — improving",
        "objective": "T 37.2, SpO2 96% RA", "assessment": "Responding to treatment",
        "plan": "Step down to oral antibiotics tomorrow if stable", "is_significant": True})

    # Diet & nutrition blob (feeds the Diet & Nutrition chart)
    call("POST", base, f"/api/v1/inpatient/admissions/{aid}/diet", token=admin, body={
        "diet_order": {"type": "High-Protein Soft Diet", "calorie_target": 1800,
                       "fluid_target": 1500, "ordered_by": "Dr. Priya Sharma",
                       "ordered_at": iso_now(), "status": "active",
                       "instructions": "Small frequent meals. Encourage fluids."},
        "restrictions": [{"id": 1, "type": "allergy", "label": "Penicillin", "severity": "high"}],
        "meals": [{"id": 1, "slot": "Breakfast", "time": iso_now(),
                   "served": "Idli x2, Sambar", "pct": 80, "kcal": 320, "by": "AN", "notes": ""}],
        "fluids": [{"id": 1, "time": iso_now(), "type": "Water", "volume": 200, "by": "AN"}],
        "supplements": [{"id": 1, "name": "Protein powder", "type": "Oral", "dose": "30g",
                         "frequency": "BD", "route": "Oral", "status": "active",
                         "ordered_by": "Dietitian", "ordered_at": iso_now()}],
        "assessment": {"must_score": 1, "weight_kg": 64, "weight_admission": 66,
                       "height_cm": 165, "bmi": 23.5, "last_assessed": iso_now(),
                       "assessed_by": "Sister Anitha"},
        "dietitian": {"status": "referred", "name": "Dietitian Kavya",
                      "notes": "High-protein plan started"},
    })
    # Peri-op blob (feeds the Pre/Post-op chart)
    call("POST", base, f"/api/v1/inpatient/admissions/{aid}/periop", token=admin, body={
        "procedure": {"name": "Diagnostic Bronchoscopy", "surgeon": "Dr. Priya Sharma",
                      "anaesthesia_type": "Local + sedation", "ot_number": "OT-2",
                      "scheduled_at": days_ahead(1) + "T10:00:00", "urgency": "elective",
                      "expected_duration_min": 45},
        "preop": {"vitals": {"bp": "124/82", "pulse": 88, "temp": 37.2, "spo2": 95},
                  "asa": 2, "comorbidities": ["Hypertension"], "fasting_confirmed": True,
                  "nbm_since": iso_now()},
    })
    Step.good("Charts populated: vitals, notes, orders, MAR, round, progress, diet, peri-op")

    # Cross-clinic referral for this patient
    call("POST", base, "/api/v1/inpatient/referrals", token=doctor, body={
        "patient_id": patient_id, "referring_type": "internal",
        "referred_to_type": "external_outside", "referred_to_specialty": "Pulmonology",
        "urgency": "routine", "reason": "Further evaluation of recurrent pneumonia",
        "clinical_summary": "Second episode in 6 months. Consider bronchoscopy + CT chest."})


def patient_journeys(base, admin, doctor, branch_id, doctor_id, doctor_staff_id):
    Step.head("Creating patients + clinical journeys")
    seen = existing_mobiles(base, admin)

    patients = [
        # 1) Completed OPD encounter — the richest journey
        {"full_name": "Anjali Verma", "mobile": "9111100001", "gender": "female",
         "date_of_birth": "1989-04-12", "city": "Bengaluru", "state": "Karnataka",
         "blood_group": "B+", "journey": "encounter"},
        # 2) Confirmed walk-in, waiting in queue
        {"full_name": "Vikram Reddy", "mobile": "9111100002", "gender": "male",
         "date_of_birth": "1975-11-03", "city": "Bengaluru", "state": "Karnataka",
         "blood_group": "O+", "journey": "queue"},
        # 3) Pending online booking
        {"full_name": "Fatima Khan", "mobile": "9111100003", "gender": "female",
         "date_of_birth": "1998-07-21", "city": "Bengaluru", "state": "Karnataka",
         "blood_group": "A+", "journey": "online"},
        # 4) Telehealth visit
        {"full_name": "Rajesh Iyer", "mobile": "9111100004", "gender": "male",
         "date_of_birth": "1982-01-30", "city": "Mysuru", "state": "Karnataka",
         "blood_group": "AB+", "journey": "telehealth"},
        # 5) Inpatient admission
        {"full_name": "Lakshmi Nair", "mobile": "9111100005", "gender": "female",
         "date_of_birth": "1968-09-09", "city": "Bengaluru", "state": "Karnataka",
         "blood_group": "O-", "journey": "inpatient"},
        # 6) Simple registered patient, no encounter yet
        {"full_name": "Karthik Menon", "mobile": "9111100006", "gender": "male",
         "date_of_birth": "2001-03-15", "city": "Bengaluru", "state": "Karnataka",
         "blood_group": "B-", "journey": "register"},
    ]

    for spec in patients:
        journey = spec.pop("journey")
        if spec["mobile"] in seen:
            Step.info(f"{spec['full_name']} already seeded — skipping")
            continue
        pid, _ = make_patient(base, admin, branch_id, spec)
        if not pid:
            continue
        name = spec["full_name"]

        if journey == "register":
            Step.good(f"{name}: registered")
            continue

        if journey == "queue":
            aid, _ = book_appt(base, admin, branch_id, pid, doctor_id, today_str(),
                               "10:30", "Fever and body ache")
            if aid:
                call("PUT", base, f"/api/v1/appointments/{aid}", token=admin,
                     body={"status": "confirmed"})
                add_vitals(base, admin, pid, aid, {
                    "blood_pressure_systolic": 128, "blood_pressure_diastolic": 84,
                    "pulse_rate": 86, "temperature": 38.1, "weight_kg": 72,
                    "height_cm": 174, "oxygen_saturation": 98})
            Step.good(f"{name}: confirmed walk-in, vitals taken (waiting in queue)")
            continue

        if journey == "online":
            book_appt(base, admin, branch_id, pid, doctor_id, days_ahead(1),
                      "11:15", "General consultation", mode="online")
            Step.good(f"{name}: pending online booking")
            continue

        if journey == "telehealth":
            aid, _ = book_appt(base, admin, branch_id, pid, doctor_id, today_str(),
                               "15:00", "Follow-up — diabetes", mode="telehealth")
            if aid:
                add_vitals(base, admin, pid, aid, {
                    "blood_pressure_systolic": 132, "blood_pressure_diastolic": 86,
                    "pulse_rate": 78, "blood_sugar": 156, "weight_kg": 80, "height_cm": 176})
            Step.good(f"{name}: telehealth visit booked")
            continue

        if journey == "inpatient":
            inpatient_admission(base, admin, doctor, branch_id, pid, doctor_staff_id)
            continue

        if journey == "encounter":
            aid, _ = book_appt(base, admin, branch_id, pid, doctor_id, today_str(),
                               "09:30", "Cough, fever, fatigue x4 days")
            if not aid:
                Step.warn(f"{name}: could not book appointment")
                continue
            add_vitals(base, admin, pid, aid, {
                "blood_pressure_systolic": 122, "blood_pressure_diastolic": 80,
                "pulse_rate": 84, "temperature": 38.3, "weight_kg": 60, "height_cm": 162,
                "oxygen_saturation": 96, "blood_sugar": 142})
            complete_encounter(
                base, doctor, aid,
                soap={"subjective": "4-day history of productive cough, fever, fatigue.",
                      "objective": "Temp 38.3, crepitations right base. SpO2 96%.",
                      "assessment": "Community-acquired pneumonia (right lower lobe).",
                      "plan": "Oral antibiotics, antipyretics, review in 3 days. CXR + CBC.",
                      "follow_up_days": 3},
                rx_items=[
                    {"medicine_name": "Amoxicillin 500mg", "dosage": "1 cap",
                     "frequency": "TDS", "duration": "5 days", "instructions": "After food"},
                    {"medicine_name": "Paracetamol 500mg", "dosage": "1 tab",
                     "frequency": "SOS", "duration": "5 days", "instructions": "If fever > 100F"},
                    {"medicine_name": "Pantoprazole 40mg", "dosage": "1 tab",
                     "frequency": "OD", "duration": "5 days", "instructions": "Before breakfast"},
                ],
                lab_tests=None,
            )
            lab_journey(base, doctor, admin, pid, aid, ["Complete Blood Count", "Fasting Blood Sugar"])
            imaging_journey(base, doctor, pid, aid, "CR", "Chest", "Chest X-ray PA view")
            bill(base, admin, branch_id, pid, aid, [
                {"description": "Consultation", "item_type": "service", "quantity": 1,
                 "unit_price": 500, "gst_rate": 0},
                {"description": "CBC", "item_type": "lab", "quantity": 1,
                 "unit_price": 300, "gst_rate": 0},
                {"description": "Chest X-ray", "item_type": "imaging", "quantity": 1,
                 "unit_price": 400, "gst_rate": 0},
            ])
            Step.good(f"{name}: full encounter — vitals, SOAP, Rx, lab, imaging, paid bill")


def main(base):
    print("\n🏥  BharatCliniq — Full Demo Clinic Seed")
    print(f"    API: {base}")

    # connectivity probe
    _, st = call("GET", base, "/api/v1/public/clinics")
    if st == 0:
        print("\n❌ Cannot reach the API. Check --api and your network, then retry.")
        sys.exit(1)

    register_clinic(base)

    Step.head("Logging in as clinic admin")
    admin, clinic_id = login(base, "admin@demo.bharatcliniq.com")
    if not admin:
        print("\n❌ Clinic-admin login failed — cannot continue.")
        sys.exit(1)
    Step.good(f"clinic_id={clinic_id}")
    verify_clinic(base, clinic_id)

    res, _ = call("GET", base, "/api/v1/clinic/branches", token=admin)
    branches = res if isinstance(res, list) else []
    branch_id = branches[0]["id"] if branches else None
    Step.info(f"branch_id={branch_id}")

    create_staff(base, admin, branch_id)
    profile_id = get_doctor_profile_id(base, admin)
    set_schedule(base, admin, profile_id, branch_id)

    # doctor token + staff id (for doctor-scoped writes & admitting doctor)
    doctor, _ = login(base, "doctor@demo.bharatcliniq.com")
    res, _ = call("GET", base, "/api/v1/clinic/doctors", token=admin)
    docs = res if isinstance(res, list) else []
    doc = next((d for d in docs if d.get("email") == "doctor@demo.bharatcliniq.com"),
               docs[0] if docs else {})
    doctor_id = doc.get("profile_id") or doc.get("id")
    doctor_staff_id = doc.get("id")
    if not doctor:
        Step.warn("Doctor login failed — doctor-scoped data (Rx, orders) will be limited")

    pharmacy_stock(base, admin, branch_id)
    patient_journeys(base, admin, doctor or admin, branch_id, doctor_id, doctor_staff_id)

    print("\n" + "=" * 60)
    print("✅  DEMO SEED COMPLETE")
    print("=" * 60)
    print(f"\n  Provider portal — log in as the doctor or admin:")
    print(f"    Doctor    : doctor@demo.bharatcliniq.com  /  {PWD}")
    print(f"    Admin     : admin@demo.bharatcliniq.com   /  {PWD}")
    print(f"    Reception : reception@demo.bharatcliniq.com  /  {PWD}")
    print(f"    Nurse     : nurse@demo.bharatcliniq.com   /  {PWD}")
    print(f"\n  Pharmacist / Lab / Imaging accounts are created INACTIVE —")
    print(f"  activate them in Clinic Admin → Staff to log in to those portals.")
    print(f"\n  Re-running is safe: patients already seeded are skipped.\n")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Seed a full demo clinic over the live API")
    ap.add_argument("--api", default=API_BASE, help="Backend API base URL")
    args = ap.parse_args()
    main(args.api.rstrip("/"))
