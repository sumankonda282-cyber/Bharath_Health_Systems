"""Integration test for class-based red-flag counselling.

In-memory SQLite, real models + endpoint. Verifies seeded tips are returned and
that class-derived red-flag safety warnings are auto-generated per drug class.

Run: python backend/tests/test_counselling.py
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
from app.models.models import Base, Drug, DrugCounselling
from app.api.v1.endpoints.terminology import get_drug_counselling


def _session():
    eng = create_engine("sqlite://")
    Base.metadata.create_all(eng, tables=[
        Base.metadata.tables[n] for n in ["clinics", "drugs", "drug_counselling"]
    ])
    S = sessionmaker(bind=eng)()
    S.add_all([
        Drug(generic="Amoxicillin", drug_class="Penicillin antibiotic", is_active=True),
        Drug(generic="Ibuprofen", drug_class="NSAID", is_active=True),
        Drug(generic="Warfarin", drug_class="Anticoagulant", is_active=True),
        Drug(generic="Paracetamol", drug_class="Analgesic", is_active=True),
    ])
    S.add(DrugCounselling(generic="Amoxicillin", tip="Take at evenly spaced times", sort_order=0))
    S.commit()
    return S


def _c(S, g):
    return get_drug_counselling(generic=g, db=S, current=SimpleNamespace(clinic_id=1))


def test_counselling():
    S = _session()

    # 1) Antibiotic → seeded tip + rash red-flag + finish-course red-flag
    r = _c(S, "Amoxicillin")
    assert "Take at evenly spaced times" in r["tips"]
    assert any("rash" in t.lower() for t in r["red_flags"])
    assert any("full course" in t.lower() for t in r["red_flags"])

    # 2) NSAID → GI-bleed red-flag
    r = _c(S, "Ibuprofen")
    assert any("tarry stools" in t.lower() or "vomiting blood" in t.lower() for t in r["red_flags"])

    # 3) Anticoagulant → bleeding red-flag
    r = _c(S, "Warfarin")
    assert any("bleeding" in t.lower() for t in r["red_flags"])

    # 4) Plain analgesic → no risky-class red flag
    r = _c(S, "Paracetamol")
    assert r["red_flags"] == []


if __name__ == "__main__":
    test_counselling()
    print("ALL ASSERTIONS PASSED")
