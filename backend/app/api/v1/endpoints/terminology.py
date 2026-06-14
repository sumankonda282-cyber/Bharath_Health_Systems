"""
Medical terminology + clinical decision support API.

Single dynamic source for diseases, symptoms, allergens, specialties and
drugs — replaces every hardcoded list in the frontends. All endpoints are
staff-authenticated and return platform-global rows plus the caller's
clinic-specific custom rows.
"""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import Optional, List

from app.db.session import get_db
from app.core.security import get_current_staff
from app.models.models import Staff, DoctorProfile, Drug, DrugInteraction, DrugDoseRange, DrugContraindication, DrugCounselling

router = APIRouter(prefix="/terminology", tags=["terminology"])

# Maps fragments of free-text doctor specialties ("Cardiology", "Gen Med & Peds")
# onto the canonical specialty keys used in medical_terms.specialty. This is
# string-normalisation glue, not medical data — the terms themselves live in DB.
SPECIALTY_KEYWORDS = [
    ("cardio", "cardiology"), ("endocrin", "endocrinology"), ("diabet", "endocrinology"),
    ("nephro", "nephrology"), ("kidney", "nephrology"), ("pulmo", "pulmonology"),
    ("respir", "pulmonology"), ("chest", "pulmonology"), ("neuro", "neurology"),
    ("ortho", "orthopedics"), ("physio", "orthopedics"), ("gastro", "gastroenterology"),
    ("hepat", "gastroenterology"), ("gyn", "gynecology"), ("obst", "obstetrics"),
    ("paed", "pediatrics"), ("pedia", "pediatrics"), ("child", "pediatrics"),
    ("psych", "psychiatry"), ("onco", "oncology"), ("cancer", "oncology"),
    ("derm", "dermatology"), ("skin", "dermatology"), ("cosmet", "dermatology"),
    ("ophthal", "ophthalmology"), ("eye", "ophthalmology"), ("dent", "dental"),
    ("otorhin", "ent"), ("uro", "urology"), ("rheum", "rheumatology"),
    ("hemat", "hematology"), ("infect", "infectious_disease"),
    ("surg", "surgery"), ("general", "general_medicine"), ("internal", "general_medicine"),
    ("family", "general_medicine"), ("physician", "general_medicine"),
]


def normalize_specialty(raw: Optional[str]) -> str:
    import re as _re
    s = (raw or "").lower()
    for frag, canonical in SPECIALTY_KEYWORDS:
        if frag in s:
            return canonical
    # "ent" only as a standalone word — it's a substring of too many words
    if _re.search(r"\bent\b", s):
        return "ent"
    return "general_medicine"


def _term_out(r):
    return {
        "id": r.id, "system": r.system, "code": r.code, "display": r.display,
        "category": r.category, "specialty": r.specialty, "tier": r.tier,
        "group_label": r.group_label,
    }


@router.get("/search")
def search_terms(
    q: str = Query(..., min_length=2),
    category: Optional[str] = Query(None, description="condition|symptom|allergy"),
    specialty: Optional[str] = None,
    limit: int = Query(12, le=50),
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Search-as-you-type over the library. Curated terms rank above the
    full ICD-10 reference; falls back to trigram fuzzy match for typos."""
    params = {
        "q_any": f"%{q}%", "q_pre": f"{q}%", "clinic": current.clinic_id,
        "limit": limit * 3,
    }
    filters = "is_active AND (clinic_id IS NULL OR clinic_id = :clinic)"
    if category:
        filters += " AND category = :category"
        params["category"] = category
    if specialty:
        filters += " AND (specialty = :specialty OR specialty IS NULL)"
        params["specialty"] = normalize_specialty(specialty)

    rows = db.execute(text(f"""
        SELECT id, system, code, display, category, specialty, tier, group_label
        FROM medical_terms
        WHERE {filters}
          AND (display ILIKE :q_any OR synonyms ILIKE :q_any OR code ILIKE :q_pre)
        ORDER BY (display ILIKE :q_pre) DESC, (tier = 'curated') DESC, length(display) ASC
        LIMIT :limit
    """), params).fetchall()

    if not rows and len(q) >= 4:
        try:
            rows = db.execute(text(f"""
                SELECT id, system, code, display, category, specialty, tier, group_label
                FROM medical_terms
                WHERE {filters} AND similarity(display, :raw) > 0.25
                ORDER BY similarity(display, :raw) DESC, (tier = 'curated') DESC
                LIMIT :limit
            """), {**params, "raw": q}).fetchall()
        except Exception:
            db.rollback()
            rows = []

    seen, out = set(), []
    for r in rows:
        key = (r.code or r.display.lower(), r.category)
        if key in seen:
            continue
        seen.add(key)
        out.append(_term_out(r))
        if len(out) >= limit:
            break
    return out


@router.get("/specialties")
def list_specialties(
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Distinct specialties present in the library — drives dynamic dropdowns."""
    rows = db.execute(text(
        "SELECT DISTINCT specialty FROM medical_terms "
        "WHERE specialty IS NOT NULL AND is_active ORDER BY specialty"
    )).fetchall()
    return [r.specialty for r in rows]


@router.get("/conditions")
def conditions_for_specialty(
    specialty: Optional[str] = Query(None, description="Raw doctor specialty string — normalised server-side"),
    limit: int = Query(14, le=40),
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Checkbox shortlist for registration/intake forms, specialty-aware."""
    canonical = normalize_specialty(specialty)
    rows = db.execute(text("""
        SELECT id, system, code, display, category, specialty, tier, group_label
        FROM medical_terms
        WHERE is_active AND tier = 'curated' AND category = 'condition'
          AND specialty = :sp AND (clinic_id IS NULL OR clinic_id = :clinic)
        ORDER BY length(display) ASC LIMIT :limit
    """), {"sp": canonical, "clinic": current.clinic_id, "limit": limit}).fetchall()
    if not rows and canonical != "general_medicine":
        rows = db.execute(text("""
            SELECT id, system, code, display, category, specialty, tier, group_label
            FROM medical_terms
            WHERE is_active AND tier = 'curated' AND category = 'condition'
              AND specialty = 'general_medicine' AND (clinic_id IS NULL OR clinic_id = :clinic)
            ORDER BY length(display) ASC LIMIT :limit
        """), {"clinic": current.clinic_id, "limit": limit}).fetchall()
    return {"specialty": canonical, "conditions": [_term_out(r) for r in rows]}


@router.get("/drugs/search")
def search_drugs(
    q: str = Query(..., min_length=2),
    limit: int = Query(10, le=30),
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    like = f"%{q}%"
    rows = (
        db.query(Drug)
        .filter(Drug.is_active == True,
                (Drug.generic.ilike(like)) | (Drug.brands.ilike(like)))
        .order_by(Drug.generic.ilike(f"{q}%").desc(), Drug.generic)
        .limit(limit).all()
    )
    return [{
        "id": d.id, "generic": d.generic, "atc": d.atc, "drug_class": d.drug_class,
        "routes": d.routes, "brands": d.brands, "rx_only": d.rx_only,
    } for d in rows]


@router.get("/drugs/counselling")
def get_drug_counselling(
    generic: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Return patient counselling tips for a drug by generic name (case-insensitive)."""
    rows = (
        db.query(DrugCounselling)
        .filter(DrugCounselling.generic.ilike(generic.strip()))
        .order_by(DrugCounselling.sort_order)
        .all()
    )
    return {"generic": generic, "tips": [r.tip for r in rows]}


@router.get("/drugs/interactions")
def get_drug_interactions(
    generic: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Return drug interactions (drug-drug, drug-food, drug-condition) for a generic name."""
    g = generic.strip().lower()
    rows = (
        db.query(DrugInteraction)
        .filter(
            DrugInteraction.drug_a.ilike(f"%{g}%") |
            DrugInteraction.drug_b.ilike(f"%{g}%")
        )
        .order_by(DrugInteraction.severity)
        .limit(20)
        .all()
    )
    return [
        {
            "drug_a": r.drug_a,
            "drug_b": r.drug_b,
            "severity": r.severity,
            "interaction_type": getattr(r, "interaction_type", "drug-drug"),
            "effect": r.effect,
            "management": r.management,
        }
        for r in rows
    ]


# ── Clinical Decision Support ────────────────────────────────────────────────

class CdsDrug(BaseModel):
    name: str
    dose_mg: Optional[float] = None
    route: Optional[str] = None


class CdsCheckRequest(BaseModel):
    drugs: List[CdsDrug] = []
    diagnoses: List[str] = []   # ICD-10 codes


@router.post("/cds/check")
def cds_check(
    payload: CdsCheckRequest,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Rule-based prescription safety check: drug-drug interactions,
    therapeutic duplication (same ATC subgroup), max-dose breaches and
    drug-diagnosis contraindications."""
    warnings = []
    names = [d.name.strip() for d in payload.drugs if d.name.strip()]
    lower = [n.lower() for n in names]

    # Resolve to library rows for ATC-based checks
    resolved = {}
    if names:
        rows = db.query(Drug).filter(Drug.generic.in_(names)).all()
        by_lower = {r.generic.lower(): r for r in rows}
        missing = [n for n in names if n.lower() not in by_lower]
        for n in missing:
            r = db.query(Drug).filter(Drug.generic.ilike(n)).first()
            if r:
                by_lower[n.lower()] = r
        resolved = by_lower

    # 1. Drug-drug interactions
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            a, b = lower[i], lower[j]
            hit = db.query(DrugInteraction).filter(
                ((DrugInteraction.drug_a.ilike(a)) & (DrugInteraction.drug_b.ilike(b))) |
                ((DrugInteraction.drug_a.ilike(b)) & (DrugInteraction.drug_b.ilike(a)))
            ).first()
            if hit:
                warnings.append({
                    "type": "interaction", "severity": hit.severity,
                    "drugs": [names[i], names[j]],
                    "message": hit.effect or "Known drug interaction",
                    "management": hit.management,
                })

    # 2. Therapeutic duplication — same ATC chemical subgroup (first 5 chars)
    seen_atc = {}
    for n in names:
        r = resolved.get(n.lower())
        if r and r.atc and len(r.atc) >= 5:
            key = r.atc[:5]
            if key in seen_atc and seen_atc[key].lower() != n.lower():
                warnings.append({
                    "type": "duplication", "severity": "moderate",
                    "drugs": [seen_atc[key], n],
                    "message": f"Both belong to the same therapeutic class ({r.drug_class or key})",
                    "management": "Review whether both are intended; consider dose consolidation",
                })
            else:
                seen_atc[key] = n

    # 3. Max dose
    for d in payload.drugs:
        if not d.dose_mg:
            continue
        rng = db.query(DrugDoseRange).filter(
            DrugDoseRange.generic.ilike(d.name.strip()),
            DrugDoseRange.population == "adult",
        )
        rng = rng.filter(DrugDoseRange.route == d.route) if d.route else rng
        rng = rng.first()
        if rng and rng.max_single_mg and float(d.dose_mg) > float(rng.max_single_mg):
            warnings.append({
                "type": "dose", "severity": "serious", "drugs": [d.name],
                "message": f"Dose {d.dose_mg}{rng.unit} exceeds max single dose {rng.max_single_mg}{rng.unit}",
                "management": rng.note,
            })

    # 4. Drug-diagnosis contraindications (ICD-10 prefix match)
    codes = [c.strip().upper() for c in payload.diagnoses if c and c.strip()]
    if names and codes:
        contras = db.query(DrugContraindication).filter(
            DrugContraindication.generic.in_([resolved[n].generic if n in resolved else n for n in lower])
        ).all() if resolved else []
        if not contras:
            contras = []
            for n in names:
                contras += db.query(DrugContraindication).filter(
                    DrugContraindication.generic.ilike(n)).all()
        for c in contras:
            for code in codes:
                if code.startswith(c.icd10_prefix.upper()):
                    warnings.append({
                        "type": "contraindication", "severity": c.severity,
                        "drugs": [c.generic], "diagnosis": code,
                        "message": f"{c.generic} in {c.condition or c.icd10_prefix}: {c.reason or 'contraindicated'}",
                        "management": None,
                    })
                    break

    order = {"contraindicated": 0, "serious": 1, "moderate": 2, "minor": 3}
    warnings.sort(key=lambda w: order.get(w["severity"], 9))
    return {"warnings": warnings, "checked_drugs": names, "checked_diagnoses": codes}
