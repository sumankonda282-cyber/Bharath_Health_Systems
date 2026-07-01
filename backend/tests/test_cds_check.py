"""Integration test for the canonical CDS endpoint /terminology/cds/check.

In-memory SQLite, real models + endpoint. Verifies drug-drug interaction,
therapeutic duplication (same ATC subgroup), adult max-dose breach, and the
CDSCO Schedule H1/X flags folded in during consolidation.

Run: python backend/tests/test_cds_check.py
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
from app.models.models import (
    Base, Drug, DrugInteraction, DrugDoseRange, DrugPregnancyCategory,
)
from app.api.v1.endpoints.terminology import cds_check, CdsCheckRequest, CdsDrug


def _session():
    eng = create_engine("sqlite://")
    Base.metadata.create_all(eng, tables=[Base.metadata.tables[n] for n in [
        "clinics", "drugs", "drug_interactions", "drug_dose_ranges", "pregnancy_categories",
    ]])
    S = sessionmaker(bind=eng)()
    S.add_all([
        Drug(generic="Warfarin", atc="B01AA03", drug_class="Anticoagulant", is_active=True),
        Drug(generic="Aspirin", atc="B01AC06", drug_class="Antiplatelet", is_active=True),
        Drug(generic="Amoxicillin", atc="J01CA04", drug_class="Penicillin", is_active=True),
        Drug(generic="Ibuprofen", atc="M01AE01", drug_class="NSAID", is_active=True),
        Drug(generic="Naproxen", atc="M01AE02", drug_class="NSAID", is_active=True),
        Drug(generic="Alprazolam", atc="N05BA12", drug_class="Benzodiazepine", is_active=True),
    ])
    S.add(DrugInteraction(drug_a="Warfarin", drug_b="Aspirin", severity="contraindicated",
                          interaction_type="drug-drug", effect="Bleeding risk", management="Avoid"))
    S.add(DrugDoseRange(generic="Amoxicillin", route="oral", population="adult",
                        unit="mg", max_single_mg=1000, max_daily_mg=3000))
    S.add_all([
        DrugPregnancyCategory(generic="Amoxicillin", category="B", schedule="H1"),
        DrugPregnancyCategory(generic="Alprazolam", category="D", schedule="X"),
    ])
    S.commit()
    return S


def _check(S, drugs, **kw):
    req = CdsCheckRequest(drugs=[CdsDrug(**d) for d in drugs], **kw)
    return cds_check(payload=req, db=S, current=SimpleNamespace(clinic_id=1))


def test_cds_check():
    S = _session()

    # 1) Interaction
    w = _check(S, [{"name": "Warfarin"}, {"name": "Aspirin"}])["warnings"]
    assert any(x["type"] == "interaction" and x["severity"] == "contraindicated" for x in w)

    # 2) Therapeutic duplication — two NSAIDs share ATC subgroup M01AE
    w = _check(S, [{"name": "Ibuprofen"}, {"name": "Naproxen"}])["warnings"]
    assert any(x["type"] == "duplication" for x in w)

    # 3) Adult max-dose breach (Amoxicillin 1500 > 1000 single)
    w = _check(S, [{"name": "Amoxicillin", "dose_mg": 1500, "route": "oral"}], patient_age=30)["warnings"]
    assert any(x["type"] == "dose" for x in w)

    # 4) CDSCO Schedule H1 flag (Amoxicillin)
    w = _check(S, [{"name": "Amoxicillin"}])["warnings"]
    assert any(x["type"] == "schedule" and x.get("schedule") == "H1" for x in w)

    # 5) CDSCO Schedule X flag (Alprazolam)
    w = _check(S, [{"name": "Alprazolam"}])["warnings"]
    assert any(x["type"] == "schedule" and x.get("schedule") == "X" for x in w)


if __name__ == "__main__":
    test_cds_check()
    print("ALL ASSERTIONS PASSED")
