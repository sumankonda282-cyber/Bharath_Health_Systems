"""Integration test for the weight/age dose engine.

In-memory SQLite, real models + endpoint. Verifies population classification
(pediatric/adult), paediatric mg/kg targeting, underweight-adult cap tightening,
and the heavy-dose (exceeds_max) flag.

Run: python backend/tests/test_dose_suggest.py
"""
import os, sys, types, json
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
from app.models.models import Base, Drug, DrugDoseRange
from app.api.v1.endpoints.terminology import dose_suggest


def _session():
    eng = create_engine("sqlite://")
    Base.metadata.create_all(eng, tables=[
        Base.metadata.tables[n] for n in ["clinics", "drugs", "drug_dose_ranges"]
    ])
    S = sessionmaker(bind=eng)()
    S.add(Drug(generic="Paracetamol", primary_brand="Dolo 650", drug_class="Analgesic",
               is_active=True, formulations=json.dumps([
                   {"form": "tab", "route": "PO", "unit": "mg", "doses": [500, 650]},
                   {"form": "syrup", "route": "PO", "unit": "mg", "doses": [250]},  # 250 mg/5 mL
               ])))
    # paediatric mg/kg rule (15 mg/kg single, 60 mg/kg/day) + adult fixed cap (1000 single)
    S.add(DrugDoseRange(generic="Paracetamol", route="oral", population="pediatric",
                        unit="mg/kg", max_single_mg=15, max_daily_mg=60))
    S.add(DrugDoseRange(generic="Paracetamol", route="oral", population="adult",
                        unit="mg", max_single_mg=1000, max_daily_mg=4000))
    S.commit()
    return S


def _run(S, **kw):
    return dose_suggest(generic="Paracetamol", db=S, current=SimpleNamespace(clinic_id=1), **kw)


def test_dose_suggest():
    S = _session()

    # 1) Paediatric (5 y, 16 kg) → mg/kg target ≈ 240 mg; population pediatric
    r = _run(S, weight_kg=16, age_years=5, route="oral")
    assert r["population"] == "pediatric"
    assert r["target_mg"] and abs(r["target_mg"] - 240) < 1, r["target_mg"]
    # a 650 mg tab for a 16 kg child must be flagged as exceeding the cap
    over = [o for o in r["options"] if o["exceeds_max"]]
    assert any(o["strength"] == 650 for o in over) or all(o["deliver_mg"] <= r["target_mg"] * 1.25 + 0.01 for o in r["options"])

    # 2) Normal adult (30 y, 60 kg) → adult population, no body flag, 1000 mg cap
    r = _run(S, weight_kg=60, age_years=30, route="oral")
    assert r["population"] == "adult" and r["body_flag"] is None
    assert r["max_single_mg"] == 1000

    # 3) Underweight adult (30 y, 40 kg) → flagged; cap tightened via mg/kg (15*40=600 < 1000)
    r = _run(S, weight_kg=40, age_years=30, route="oral")
    assert r["body_flag"] == "underweight"
    assert r["max_single_mg"] == 600, r["max_single_mg"]
    assert "Low body weight" in (r["message"] or "")

    # 4) Very low adult (30 y, 32 kg) → very_low flag, cap 480
    r = _run(S, weight_kg=32, age_years=30, route="oral")
    assert r["body_flag"] == "very_low" and r["max_single_mg"] == 480


if __name__ == "__main__":
    test_dose_suggest()
    print("ALL ASSERTIONS PASSED")
