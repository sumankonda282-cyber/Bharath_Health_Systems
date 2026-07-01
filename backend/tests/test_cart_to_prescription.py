"""Integration test: signed medication_order cart → ONE pharmacy prescription.

India model — the whole patient med list submitted together is a SINGLE order with
one item per drug. Verifies creation, idempotent re-sign (items replaced, not
duplicated; still one prescription), and cart-clear retraction of a pending order.

Run: python backend/tests/test_cart_to_prescription.py
"""
import os, sys, types
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SECRET_KEY", "test")
os.environ.setdefault("JWT_SECRET_KEY", "test")

_sec = types.ModuleType("app.core.security")
_sec.get_current_staff = lambda *a, **k: None
sys.modules.setdefault("app.core.security", _sec)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from types import SimpleNamespace
from app.models.models import Base, Prescription, PrescriptionItem
from app.api.v1.endpoints.assessment_forms import sync_prescription_from_submission

SCHEMA = {"sections": [{"fields": [
    {"field_id": "rx", "type": "medication_order"},
    {"field_id": "bp", "type": "number"},
]}]}


def _session():
    eng = create_engine("sqlite://")
    Base.metadata.create_all(eng, tables=[Base.metadata.tables[n] for n in [
        "clinics", "prescriptions", "prescription_items",
    ]])
    return sessionmaker(bind=eng)()


def _sub(sid, cart):
    return SimpleNamespace(id=sid, patient_id=42, branch_id=1, data={"rx": cart, "bp": 120})


def test_cart_to_prescription():
    S = _session()
    doc = SimpleNamespace(clinic_id=1, branch_id=1, id=7)
    form = SimpleNamespace(schema=SCHEMA)

    cart = [
        {"drug": "Amoxicillin", "generic": "Amoxicillin", "brand": "Mox",
         "dose_label": "500 mg", "frequency": "TID", "duration_days": 5,
         "quantity": 15, "instructions": "Finish full course", "is_refill": False},
        {"drug": "Paracetamol", "generic": "Paracetamol", "brand": "Dolo 650",
         "dose_label": "650 mg", "frequency": "SOS", "duration_days": 3, "quantity": 9},
    ]
    rid = sync_prescription_from_submission(S, _sub(1, cart), form, doc); S.commit()

    # ONE prescription, TWO items (not two orders).
    assert S.query(Prescription).count() == 1
    rx = S.query(Prescription).get(rid)
    assert rx.source_submission_id == 1 and rx.status == "pending" and rx.patient_id == 42
    items = S.query(PrescriptionItem).filter_by(prescription_id=rid).all()
    assert len(items) == 2
    amox = next(i for i in items if i.medicine_name == "Mox")
    assert amox.dosage == "500 mg" and amox.frequency == "TID" and amox.duration == "5 days"
    assert amox.quantity_prescribed == 15

    # Re-sign with an edited cart → still ONE prescription, items replaced.
    cart2 = [{"drug": "Amoxicillin", "generic": "Amoxicillin", "brand": "Mox",
              "dose_label": "500 mg", "frequency": "BID", "duration_days": 7, "is_refill": True}]
    sync_prescription_from_submission(S, _sub(1, cart2), form, doc); S.commit()
    assert S.query(Prescription).count() == 1
    items = S.query(PrescriptionItem).filter_by(prescription_id=rid).all()
    assert len(items) == 1 and items[0].frequency == "BID" and items[0].is_refill is True

    # Cart cleared on re-sign → pending order retracted.
    sync_prescription_from_submission(S, _sub(1, []), form, doc); S.commit()
    assert S.query(Prescription).count() == 0
    assert S.query(PrescriptionItem).count() == 0


def test_dispensing_order_not_rewritten():
    S = _session()
    doc = SimpleNamespace(clinic_id=1, branch_id=1, id=7)
    form = SimpleNamespace(schema=SCHEMA)
    cart = [{"drug": "Amoxicillin", "generic": "Amoxicillin", "brand": "Mox", "dose_label": "500 mg"}]
    rid = sync_prescription_from_submission(S, _sub(2, cart), form, doc); S.commit()

    # Pharmacist starts filling.
    S.query(Prescription).get(rid).status = "dispensed"; S.commit()

    # A re-sign must NOT rewrite what the pharmacy is already handling.
    cart2 = [{"drug": "Ibuprofen", "generic": "Ibuprofen", "brand": "Brufen", "dose_label": "400 mg"}]
    sync_prescription_from_submission(S, _sub(2, cart2), form, doc); S.commit()
    items = S.query(PrescriptionItem).filter_by(prescription_id=rid).all()
    assert len(items) == 1 and items[0].medicine_name == "Mox"  # unchanged


if __name__ == "__main__":
    test_cart_to_prescription()
    test_dispensing_order_not_rewritten()
    print("ALL ASSERTIONS PASSED")
