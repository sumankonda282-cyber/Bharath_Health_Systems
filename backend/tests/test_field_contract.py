"""Field-key CONTRACT test — guards the write↔read connection across portals.

The whole class of "data disappears" bugs came from one root cause: a concept was
keyed one way when WRITTEN and another way when READ (bp_systolic vs
blood_pressure_systolic; lab_order.tests vs lab_orders; a unit/flag stored but not
returned). Labels may differ across portals, but the FIELD KEY that carries a concept
between backend and frontend must be canonical and stable.

This test pins the canonical keys that frontends read off the high-traffic clinical
surfaces. If someone renames or drops one of these response keys, this test fails —
so the break is caught here, not silently in production. Extend CONTRACTS as new
shared surfaces are hardened.

Run: python backend/tests/test_field_contract.py
"""
import os, sys, types
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SECRET_KEY", "test")
os.environ.setdefault("JWT_SECRET_KEY", "test")

_sec = types.ModuleType("app.core.security")
for _n in ("get_current_staff", "require_billing_waive", "require_lab_access",
           "require_imaging_access", "require_doctor"):
    setattr(_sec, _n, lambda *a, **k: None)
sys.modules["app.core.security"] = _sec

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from types import SimpleNamespace
import app.db.session as _s
from app.models.models import (
    Base, Clinic, Patient, Staff, LabOrder, LabOrderItem, ImagingOrder, VitalSign,
)

_eng = create_engine("sqlite://")
_s.engine = _eng
_s.SessionLocal = sessionmaker(bind=_eng)


def _seed():
    Base.metadata.create_all(_eng)
    db = _s.SessionLocal()
    db.add(Clinic(id=1, name="C", slug="c"))
    db.add(Patient(id=1, clinic_id=1, full_name="P One"))
    db.add(Staff(id=1, clinic_id=1, full_name="Dr", role="clinic_admin", hashed_password="x"))
    db.add(LabOrder(id=1, order_id="LAB-1", clinic_id=1, patient_id=1, ordered_by=1, status="ordered"))
    db.add(LabOrderItem(id=1, order_id=1, test_name="CBC", result_value="12",
                        unit="g/dL", reference_range="11-15", flag="N"))
    db.add(ImagingOrder(id=1, order_id="IMG-1", clinic_id=1, patient_id=1,
                        ordered_by=1, status="ordered", modality="CT"))
    db.commit()
    return db


# canonical keys that a frontend reads off each surface. Add rows as surfaces harden.
def test_vitals_contract():
    """Inpatient vitals must carry BOTH the flat and the shared-shell key names."""
    from app.api.v1.endpoints.inpatient import _vital_dict
    v = VitalSign(admission_id=1, bp_systolic=120, bp_diastolic=80,
                  respiration_rate=18, pulse=72, spo2=98, temperature=37.0)
    out = _vital_dict(v)
    required = {
        "bp_systolic", "bp_diastolic", "respiration_rate",         # flat readers
        "blood_pressure_systolic", "blood_pressure_diastolic",     # shared shell readers
        "respiratory_rate", "pulse", "spo2", "temperature",
    }
    missing = required - set(out)
    assert not missing, f"vitals response missing canonical keys: {missing}"
    assert out["blood_pressure_systolic"] == out["bp_systolic"] == 120
    assert out["respiratory_rate"] == out["respiration_rate"] == 18


def test_lab_result_contract():
    """Lab result items must return the per-result unit/range/flag the UI reads."""
    from app.api.v1.endpoints.pharmacy_lab_billing import list_lab_orders
    db = _seed()
    staff = SimpleNamespace(clinic_id=1, id=1, role="clinic_admin", branch_id=1)
    rows = list_lab_orders(status=None, limit=30, db=db, current=staff)
    assert rows, "no lab orders returned"
    item = rows[0]["items"][0]
    required = {"result_value", "result_notes", "reference_range", "unit", "flag", "is_abnormal"}
    missing = required - set(item)
    assert not missing, f"lab item response missing canonical keys: {missing}"
    # must reflect the STORED per-result values, not the catalogue defaults
    assert item["unit"] == "g/dL" and item["reference_range"] == "11-15" and item["flag"] == "N"


if __name__ == "__main__":
    test_vitals_contract()
    test_lab_result_contract()
    print("ALL CONTRACT ASSERTIONS PASSED")
