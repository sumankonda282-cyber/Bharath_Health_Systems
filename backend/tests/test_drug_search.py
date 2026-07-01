"""Integration test for the unified brand-first, tenant-scoped drug search.

Runs against in-memory SQLite with the real models — no external DB needed.
Verifies: brand search (India), generic search, ATC search, in-stock flag,
scope=in_stock filtering, no-match, and multi-tenant isolation.

Run: python backend/tests/test_drug_search.py   (or via pytest)
"""
import os, sys, types
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SECRET_KEY", "test")
os.environ.setdefault("JWT_SECRET_KEY", "test")

# Stub auth so the endpoint import doesn't require jose/cryptography.
_sec = types.ModuleType("app.core.security")
_sec.get_current_staff = lambda *a, **k: None
sys.modules.setdefault("app.core.security", _sec)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from types import SimpleNamespace
import json
from app.models.models import (
    Base, Drug, Medicine, DrugDoseRange, Prescription, PrescriptionItem,
)
from app.api.v1.endpoints.terminology import search_drugs


def _session():
    eng = create_engine("sqlite://")
    Base.metadata.create_all(eng, tables=[Base.metadata.tables[n] for n in [
        "clinics", "branches", "drugs", "medicines", "drug_dose_ranges",
        "prescriptions", "prescription_items",
    ]])
    S = sessionmaker(bind=eng)()
    d1 = Drug(generic="Paracetamol", primary_brand="Dolo 650",
              brands="Dolo 650|Calpol|Crocin", atc="N02BE01", rx_only=False, is_active=True,
              formulations=json.dumps([{"form": "tab", "route": "PO", "unit": "mg", "doses": [500, 650]}]))
    d2 = Drug(generic="Amoxicillin", primary_brand="Mox",
              brands="Mox|Novamox", atc="J01CA04", rx_only=True, is_active=True)
    S.add_all([d1, d2]); S.flush()
    S.add(Medicine(branch_id=1, drug_id=d1.id, name="Dolo 650",
                   generic_name="Paracetamol", stock_quantity=50, is_active=True))
    S.add(DrugDoseRange(generic="Paracetamol", route="oral", population="pediatric",
                        unit="mg/kg", max_single_mg=15, max_daily_mg=60))
    S.commit()
    return S


def test_unified_drug_search():
    S = _session()
    t1 = SimpleNamespace(clinic_id=1, branch_id=1)
    run = lambda q, scope="all", staff=t1: search_drugs(q=q, limit=10, scope=scope, db=S, current=staff)

    r = run("Dolo")                                     # brand-first (India)
    assert r and r[0]["generic_name"] == "Paracetamol" and r[0]["in_stock"] and r[0]["stock_qty"] == 50
    assert run("parace")[0]["generic_name"] == "Paracetamol"   # generic
    assert any(x["generic_name"] == "Amoxicillin" for x in run("J01"))  # ATC
    assert run("Mox", scope="in_stock") == []           # unstocked excluded
    assert run("Dolo", scope="in_stock")[0]["in_stock"]  # stocked included
    assert run("nonexistentxyz") == []                  # no match
    # multi-tenant isolation: a different branch sees it out of stock
    assert run("Dolo", staff=SimpleNamespace(clinic_id=1, branch_id=2))[0]["in_stock"] is False


def test_usage_rank_and_inline_dose():
    S = _session()
    doctor = SimpleNamespace(clinic_id=1, branch_id=1, id=7)

    # No usage yet → usage score 0
    r = search_drugs(q="para", limit=10, db=S, current=doctor)
    assert r and r[0]["usage"] == 0

    # Record the doctor prescribing Paracetamol twice → usage rank reflects it
    p = Prescription(clinic_id=1, patient_id=1, prescribed_by=7); S.add(p); S.flush()
    S.add_all([
        PrescriptionItem(prescription_id=p.id, medicine_name="Paracetamol 500"),
        PrescriptionItem(prescription_id=p.id, medicine_name="Dolo 650"),
    ])
    S.commit()
    r = search_drugs(q="para", limit=10, db=S, current=doctor)
    assert r[0]["usage"] >= 1, r[0]["usage"]

    # Inline best-fit dose when weight/age supplied (5y, 16kg → ~240mg → 500mg tab)
    r = search_drugs(q="para", limit=10, weight_kg=16, age_years=5, db=S, current=doctor)
    assert r[0]["suggested_dose"], "inline dose should be populated with age/weight"

    # Without age/weight, no inline dose (keeps search light)
    r = search_drugs(q="para", limit=10, db=S, current=doctor)
    assert r[0]["suggested_dose"] is None


if __name__ == "__main__":
    test_unified_drug_search()
    test_usage_rank_and_inline_dose()
    print("ALL ASSERTIONS PASSED")
