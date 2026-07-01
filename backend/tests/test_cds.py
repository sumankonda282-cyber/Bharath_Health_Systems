"""Integration test for the CDS medication-order screen.

In-memory SQLite, real models, real service. Verifies drug-drug interaction
detection (both name order + severity→tier), drug-allergy direct + cross-
sensitivity, dedup, and the safe (no-alert) case.

Run: python backend/tests/test_cds.py
"""
import os, sys, types
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SECRET_KEY", "test")
os.environ.setdefault("JWT_SECRET_KEY", "test")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.models import Base, Drug, DrugInteraction
from app.services.cds import screen_medication_order


def _session():
    eng = create_engine("sqlite://")
    Base.metadata.create_all(eng, tables=[
        Base.metadata.tables[n] for n in ["clinics", "drugs", "drug_interactions"]
    ])
    S = sessionmaker(bind=eng)()
    S.add_all([
        Drug(generic="Warfarin", primary_brand="Warf", drug_class="Anticoagulant", is_active=True),
        Drug(generic="Aspirin", primary_brand="Ecosprin", drug_class="NSAID/Antiplatelet", is_active=True),
        Drug(generic="Amoxicillin", primary_brand="Mox", drug_class="Penicillin antibiotic", is_active=True),
        Drug(generic="Paracetamol", primary_brand="Dolo 650", drug_class="Analgesic", is_active=True),
    ])
    S.add(DrugInteraction(drug_a="Warfarin", drug_b="Aspirin", severity="contraindicated",
                          interaction_type="drug-drug", effect="Major bleeding risk",
                          management="Avoid; if essential monitor INR + PPI"))
    # duplicate row (different wording) — must be deduped to one alert
    S.add(DrugInteraction(drug_a="Aspirin", drug_b="Warfarin", severity="major",
                          interaction_type="drug-drug", effect="Bleeding", management="Avoid"))
    S.commit()
    return S


def test_cds_screen():
    S = _session()

    # 1) Interaction fires, deduped to ONE, tier=hard, most-severe kept
    r = screen_medication_order(S, [{"generic": "Warfarin"}, {"generic": "Aspirin"}], [])
    inter = [a for a in r["alerts"] if a["type"] == "interaction"]
    assert len(inter) == 1, f"expected 1 deduped interaction, got {len(inter)}"
    assert inter[0]["severity"] == "contraindicated" and inter[0]["tier"] == "hard"
    assert r["has_hard_stop"] is True

    # 2) Drug-allergy direct match (Amoxicillin vs 'amoxicillin')
    r = screen_medication_order(S, [{"generic": "Amoxicillin"}], ["Amoxicillin"])
    assert any(a["type"] == "allergy" and a["tier"] == "hard" for a in r["alerts"])

    # 3) Cross-sensitivity: penicillin allergy flags Amoxicillin (via class/group)
    r = screen_medication_order(S, [{"generic": "Amoxicillin"}], ["Penicillin"])
    assert any(a["type"] == "allergy" for a in r["alerts"]), "penicillin→amoxicillin cross-sensitivity missed"

    # 4) Safe case: unrelated drug, no allergy → no alerts
    r = screen_medication_order(S, [{"generic": "Paracetamol"}], ["Penicillin"])
    assert r["alerts"] == [] and r["has_hard_stop"] is False

    # 5) Both together: interaction + allergy in one screen, hard-stop set
    r = screen_medication_order(S, [{"generic": "Warfarin"}, {"generic": "Aspirin"}, {"generic": "Amoxicillin"}], ["Penicillin"])
    assert r["counts"]["interaction"] == 1 and r["counts"]["allergy"] == 1
    assert r["alerts"][0]["tier"] == "hard"  # sorted most-severe first


if __name__ == "__main__":
    test_cds_screen()
    print("ALL ASSERTIONS PASSED")
