"""Clinical Decision Support (CDS) — medication-order safety screening.

A mini, India-scaled version of the Epic/FDB pattern: given a set of ordered
drugs + the patient's known allergies, return tiered alerts (drug-drug
interactions and drug-allergy conflicts). Severity maps to an alert *tier* so the
prescribe UI can decide interruptive (hard-stop, needs override reason) vs
advisory (soft) vs info — exactly how Epic's BestPractice alerts behave.

Design seams (so this stays swappable to FDB/Medi-Span later):
- `_find_interactions()` is the ONLY place the interaction knowledge base is
  queried. Swap its body for an FDB call and nothing else changes.
- Matching is by normalized generic name AND drug_id, so both name-based seed
  data and concept-linked rows fire.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

from sqlalchemy import or_, and_, func
from sqlalchemy.orm import Session

from app.models.models import Drug, DrugInteraction


# Severity → alert tier (Epic-style). 'hard' = interruptive + override reason.
SEVERITY_TIER = {
    "contraindicated": "hard",
    "major":           "hard",
    "serious":         "hard",
    "moderate":        "soft",
    "minor":           "info",
}

# Modest cross-sensitivity groups relevant to Indian OPD/IPD. An allergy to the
# key flags any drug whose generic/class matches a listed token. Extend as needed;
# a licensed KB (FDB) would replace this with full allergen-group cross-mapping.
ALLERGEN_GROUPS = {
    "penicillin":    ["penicillin", "amoxicillin", "ampicillin", "piperacillin", "cloxacillin", "amoxiclav", "co-amoxiclav"],
    "cephalosporin": ["cephalosporin", "cefixime", "ceftriaxone", "cefuroxime", "cephalexin", "cefpodoxime"],
    "sulfa":         ["sulfa", "sulfamethoxazole", "cotrimoxazole", "sulfasalazine", "sulphonamide"],
    "nsaid":         ["nsaid", "ibuprofen", "diclofenac", "aceclofenac", "naproxen", "aspirin", "ketorolac", "indomethacin"],
    "aspirin":       ["aspirin", "acetylsalicylic"],
    "macrolide":     ["macrolide", "azithromycin", "erythromycin", "clarithromycin"],
    "quinolone":     ["quinolone", "ciprofloxacin", "levofloxacin", "ofloxacin", "norfloxacin"],
    "opioid":        ["opioid", "morphine", "tramadol", "codeine", "fentanyl", "pethidine"],
}


def _norm(s: Optional[str]) -> str:
    if not s:
        return ""
    s = s.lower()
    s = re.sub(r"\(.*?\)", " ", s)          # drop parentheticals
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def _resolve_drug(db: Session, item: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize an input order item to {id, generic, name, drug_class, brands}.
    Resolves from the drugs catalog by id or generic when possible."""
    row = None
    if item.get("drug_id"):
        row = db.query(Drug).filter(Drug.id == item["drug_id"]).first()
    gen = item.get("generic") or item.get("generic_name") or item.get("name")
    if row is None and gen:
        row = db.query(Drug).filter(func.lower(Drug.generic) == _norm(gen)).first()
    if row is not None:
        return {
            "id": row.id,
            "generic": row.generic,
            "name": row.primary_brand or row.generic,
            "drug_class": row.drug_class or "",
            "brands": row.brands or "",
        }
    return {"id": item.get("drug_id"), "generic": gen or "", "name": item.get("name") or gen or "",
            "drug_class": "", "brands": ""}


def _find_interactions(db: Session, drugs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """The single interaction-KB query seam (swap for FDB later).

    Returns unique pairwise interactions among the given drugs, matched by
    normalized generic name OR concept id, deduped keeping the most severe."""
    order = {"contraindicated": 0, "major": 1, "serious": 1, "moderate": 2, "minor": 3}
    best: Dict[tuple, Dict[str, Any]] = {}
    n = len(drugs)
    for i in range(n):
        for j in range(i + 1, n):
            a, b = drugs[i], drugs[j]
            na, nb = _norm(a["generic"]), _norm(b["generic"])
            if not na or not nb or na == nb:
                continue
            conds = [
                and_(func.lower(DrugInteraction.drug_a).contains(na), func.lower(DrugInteraction.drug_b).contains(nb)),
                and_(func.lower(DrugInteraction.drug_a).contains(nb), func.lower(DrugInteraction.drug_b).contains(na)),
            ]
            if a.get("id") and b.get("id"):
                conds.append(and_(DrugInteraction.drug_a_id == a["id"], DrugInteraction.drug_b_id == b["id"]))
                conds.append(and_(DrugInteraction.drug_a_id == b["id"], DrugInteraction.drug_b_id == a["id"]))
            rows = (
                db.query(DrugInteraction)
                .filter(DrugInteraction.interaction_type == "drug-drug", or_(*conds))
                .all()
            )
            key = tuple(sorted([na, nb]))
            for r in rows:
                sev = (r.severity or "moderate").lower()
                cur = best.get(key)
                if cur is None or order.get(sev, 9) < order.get(cur["severity"], 9):
                    best[key] = {
                        "type": "interaction",
                        "severity": sev,
                        "tier": SEVERITY_TIER.get(sev, "soft"),
                        "drugs": [a["name"], b["name"]],
                        "message": r.effect or f"Interaction between {a['name']} and {b['name']}",
                        "management": r.management,
                        "source": "bhs-interactions",
                    }
    return list(best.values())


def _allergy_conflicts(drugs: List[Dict[str, Any]], allergies: List[str]) -> List[Dict[str, Any]]:
    """Flag ordered drugs that conflict with a recorded allergy — direct match on
    generic/class/brand, plus modest cross-sensitivity groups."""
    alerts: List[Dict[str, Any]] = []
    norm_allergies = [(_norm(a), a) for a in allergies if _norm(a)]
    for d in drugs:
        hay = " ".join([_norm(d["generic"]), _norm(d["drug_class"]), _norm(d["brands"])])
        for na, raw in norm_allergies:
            hit = na and na in hay
            if not hit:
                # cross-sensitivity: allergy names a group → does the drug fall in it?
                for grp, members in ALLERGEN_GROUPS.items():
                    if (na == grp or na in members) and any(m in hay for m in members):
                        hit = True
                        break
            if hit:
                alerts.append({
                    "type": "allergy",
                    "severity": "contraindicated",
                    "tier": "hard",
                    "drugs": [d["name"]],
                    "allergen": raw,
                    "message": f"{d['name']} conflicts with recorded allergy: {raw}",
                    "management": "Confirm allergy; select an alternative agent if the reaction was significant.",
                    "source": "bhs-allergy",
                })
                break
    return alerts


def screen_medication_order(
    db: Session,
    drugs: List[Dict[str, Any]],
    allergies: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Run the full medication-order screen. Returns {alerts, has_hard_stop, counts}."""
    resolved = [_resolve_drug(db, d) for d in (drugs or []) if (d.get("generic") or d.get("name") or d.get("drug_id"))]
    alerts = _find_interactions(db, resolved) + _allergy_conflicts(resolved, allergies or [])
    # Most severe first.
    tier_rank = {"hard": 0, "soft": 1, "info": 2}
    alerts.sort(key=lambda a: tier_rank.get(a["tier"], 3))
    return {
        "alerts": alerts,
        "has_hard_stop": any(a["tier"] == "hard" for a in alerts),
        "counts": {
            "interaction": sum(1 for a in alerts if a["type"] == "interaction"),
            "allergy": sum(1 for a in alerts if a["type"] == "allergy"),
        },
    }
