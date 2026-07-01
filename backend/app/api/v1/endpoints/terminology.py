"""
Medical terminology + clinical decision support API.

Single dynamic source for diseases, symptoms, allergens, specialties and
drugs — replaces every hardcoded list in the frontends. All endpoints are
staff-authenticated and return platform-global rows plus the caller's
clinic-specific custom rows.
"""
import json as _json
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import text, func
from sqlalchemy.orm import Session
from typing import Optional, List

from app.db.session import get_db
from app.core.security import get_current_staff
from app.models.models import Staff, DoctorProfile, Drug, DrugInteraction, DrugDoseRange, DrugContraindication, DrugCounselling, DiseaseCounselling, DrugPregnancyCategory, FoodDrugInteraction, Medicine, Branch

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
    scope: str = Query("all", description="all = full catalog with in-stock flag; in_stock = only drugs stocked at this tenant"),
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Unified, brand-first drug search — the single source every portal calls.

    India-first: matches brand (primary_brand + brands) AND generic AND ATC, so a
    doctor typing 'Dolo' or 'Augmentin' finds the concept. Each result carries a
    live in-stock flag for the caller's tenant (join drugs → this branch's
    medicines). scope='in_stock' returns only stocked drugs (pharmacy stock search);
    scope='all' returns the whole catalog with availability flagged (provider /
    carechart / pharmacy new-order search). Backward compatible — only adds fields.
    """
    q = q.strip()
    like = f"%{q}%"
    starts = f"{q}%"

    # Tenant's branch set: the caller's branch, else all branches of their clinic.
    branch_ids: list = []
    if getattr(current, "branch_id", None):
        branch_ids = [current.branch_id]
    elif getattr(current, "clinic_id", None):
        branch_ids = [b.id for b in db.query(Branch.id).filter(Branch.clinic_id == current.clinic_id).all()]

    # Per-drug on-hand for this tenant, aggregated once (avoids N+1).
    stock_by_drug: dict = {}
    if branch_ids:
        srows = (
            db.query(Medicine.drug_id, func.coalesce(func.sum(Medicine.stock_quantity), 0))
            .filter(
                Medicine.is_active == True,
                Medicine.drug_id.isnot(None),
                Medicine.branch_id.in_(branch_ids),
            )
            .group_by(Medicine.drug_id)
            .all()
        )
        stock_by_drug = {drug_id: int(qty or 0) for drug_id, qty in srows}

    base = db.query(Drug).filter(
        Drug.is_active == True,
        (Drug.clinic_id == None) | (Drug.clinic_id == current.clinic_id),
        (Drug.generic.ilike(like)) | (Drug.brands.ilike(like)) | (Drug.primary_brand.ilike(like)) | (Drug.atc.ilike(starts)),
    )
    if scope == "in_stock":
        stocked_ids = [did for did, qty in stock_by_drug.items() if qty > 0]
        if not stocked_ids:
            return []
        base = base.filter(Drug.id.in_(stocked_ids))

    # Rank: brand/generic prefix hits first (what the clinician typed), then name.
    rows = (
        base.order_by(
            (Drug.primary_brand.ilike(starts)).desc(),
            (Drug.generic.ilike(starts)).desc(),
            Drug.generic,
        )
        .limit(limit).all()
    )
    return [{
        "id": d.id,
        "drug_id": d.id,
        "generic": d.generic,
        "name": d.primary_brand or d.generic,   # brand-first display for India
        "generic_name": d.generic,
        "atc": d.atc,
        "drug_class": d.drug_class,
        "routes": d.routes,
        "brands_raw": d.brands,
        "brands": d.brands.split("|") if d.brands else [],
        "primary_brand": d.primary_brand,
        "rx_only": d.rx_only,
        "formulations": _json.loads(d.formulations) if d.formulations else [],
        "in_stock": stock_by_drug.get(d.id, 0) > 0,
        "stock_qty": stock_by_drug.get(d.id, 0),
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


@router.get("/drugs/pregnancy")
def get_drug_pregnancy_info(
    generic: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Return pregnancy category and India schedule classification for a drug."""
    g = generic.strip().lower()
    row = (
        db.query(DrugPregnancyCategory)
        .filter(DrugPregnancyCategory.generic.ilike(g))
        .first()
    )
    if not row:
        # Try partial match on first word (handles branded names like "metformin hcl")
        first_word = g.split()[0]
        row = (
            db.query(DrugPregnancyCategory)
            .filter(DrugPregnancyCategory.generic.ilike(f"{first_word}%"))
            .first()
        )
    if not row:
        return {"generic": generic, "category": None, "schedule": None, "notes": None}
    return {
        "generic": row.generic,
        "category": row.category,
        "schedule": row.schedule,
        "notes": row.notes,
    }


@router.get("/drugs/food-interactions")
def get_food_interactions(
    generic: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Return food-drug interactions for a generic drug name."""
    _sev = {"major": 0, "serious": 1, "moderate": 2, "minor": 3}
    g = generic.strip().lower()
    rows = (
        db.query(FoodDrugInteraction)
        .filter(FoodDrugInteraction.generic.ilike(g))
        .all()
    )
    if not rows:
        first_word = g.split()[0]
        rows = (
            db.query(FoodDrugInteraction)
            .filter(FoodDrugInteraction.generic.ilike(f"{first_word}%"))
            .all()
        )
    rows.sort(key=lambda r: _sev.get(r.severity or "minor", 4))
    return [
        {"food": r.food, "effect": r.effect, "severity": r.severity}
        for r in rows
    ]


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


class InteractionCheckRequest(BaseModel):
    generics: List[str] = []


@router.post("/drugs/check-interactions")
def check_drug_interactions(
    payload: InteractionCheckRequest,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Check pair-wise drug-drug interactions for a list of generic names.
    Used by the prescription form to flag conflicts against the current med chart."""
    names = [n.strip().lower() for n in payload.generics if n.strip()]
    if len(names) < 2:
        return []

    from sqlalchemy import or_, and_
    results = []
    seen = set()
    for i, drug_a in enumerate(names):
        for drug_b in names[i + 1:]:
            pair = tuple(sorted([drug_a, drug_b]))
            if pair in seen:
                continue
            seen.add(pair)
            rows = (
                db.query(DrugInteraction)
                .filter(
                    or_(
                        and_(
                            DrugInteraction.drug_a.ilike(f"%{drug_a}%"),
                            DrugInteraction.drug_b.ilike(f"%{drug_b}%"),
                        ),
                        and_(
                            DrugInteraction.drug_a.ilike(f"%{drug_b}%"),
                            DrugInteraction.drug_b.ilike(f"%{drug_a}%"),
                        ),
                    )
                )
                .order_by(DrugInteraction.severity)
                .all()
            )
            for r in rows:
                results.append({
                    "drug_a": r.drug_a,
                    "drug_b": r.drug_b,
                    "severity": r.severity,
                    "interaction_type": getattr(r, "interaction_type", "drug-drug"),
                    "effect": r.effect,
                    "management": r.management,
                })
    _sev_order = {"contraindicated": 0, "major": 1, "moderate": 2, "minor": 3}
    results.sort(key=lambda x: _sev_order.get(x["severity"] or "minor", 4))
    return results


@router.get("/counselling/suggest")
def suggest_disease_counselling(
    icd10: str = Query(..., min_length=2, description="ICD-10 code or prefix, e.g. E11 or E11.9"),
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Return counselling tips matching an ICD-10 prefix (longest match first)."""
    code = icd10.strip().upper()
    # Try progressively shorter prefixes: E11.9 → E11 → E1
    results = []
    for length in [len(code), 3, 2]:
        prefix = code[:length]
        rows = (
            db.query(DiseaseCounselling)
            .filter(DiseaseCounselling.icd10_prefix == prefix)
            .order_by(DiseaseCounselling.sort_order)
            .all()
        )
        if rows:
            results = rows
            break
    return {
        "icd10": icd10,
        "condition": results[0].condition if results else None,
        "tips": [r.tip for r in results],
    }


# ── Clinical Decision Support ────────────────────────────────────────────────

class CdsDrug(BaseModel):
    name: str
    dose_mg: Optional[float] = None
    route: Optional[str] = None


class CdsCheckRequest(BaseModel):
    drugs: List[CdsDrug] = []
    diagnoses: List[str] = []       # ICD-10 codes
    patient_age: Optional[int] = None
    patient_weight_kg: Optional[float] = None


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

    # 3. Max dose — adult and paediatric
    is_paed = payload.patient_age is not None and payload.patient_age < 18
    for d in payload.drugs:
        if not d.dose_mg:
            continue
        if is_paed and payload.patient_weight_kg:
            rng = db.query(DrugDoseRange).filter(
                DrugDoseRange.generic.ilike(d.name.strip()),
                DrugDoseRange.population == "pediatric",
            )
            rng = rng.filter(DrugDoseRange.route == d.route) if d.route else rng
            rng = rng.first()
            if rng and rng.pediatric_dose_mg_kg_max:
                max_dose = float(rng.pediatric_dose_mg_kg_max) * float(payload.patient_weight_kg)
                if float(d.dose_mg) > max_dose:
                    warnings.append({
                        "type": "dose", "severity": "serious", "drugs": [d.name],
                        "message": (
                            f"Dose {d.dose_mg}{rng.unit} exceeds paediatric max "
                            f"{rng.pediatric_dose_mg_kg_max} mg/kg × {payload.patient_weight_kg} kg"
                            f" = {max_dose:.1f}{rng.unit}"
                        ),
                        "management": rng.note,
                    })
        else:
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


# ─── Dose suggestion (weight/age-aware, nearest available formulations) ──────────

def _fmt_num(x):
    try:
        xf = float(x)
        return str(int(xf)) if xf.is_integer() else str(round(xf, 2))
    except Exception:
        return str(x)


def _round_half(x):
    return round(x * 2) / 2.0


def _dose_label(form, strength, unit, qty, qunit, deliver):
    sg, dl = _fmt_num(strength), _fmt_num(round(deliver, 1))
    if qunit == "mL":
        return f"{_fmt_num(qty)} mL {form} ({sg}{unit}/5mL) → {dl}{unit}"
    q = "½" if qty == 0.5 else _fmt_num(qty)
    return f"{q} {form} ({sg}{unit}) → {dl}{unit}"


_LIQUID_FORMS = {"syr", "syrup", "susp", "suspension", "drops", "soln", "solution", "elixir", "liquid"}


@router.get("/drugs/dose-suggest")
def dose_suggest(
    generic: str = Query(...),
    weight_kg: Optional[float] = Query(None),
    age_years: Optional[float] = Query(None),
    age_months: Optional[int] = Query(None),
    route: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Suggest a weight/age-appropriate dose and the nearest available formulations
    (incl. half-tablet / syrup-mL). Reads DrugDoseRange (mg/kg for paediatric +
    max single/daily caps) and the Drug formulation library. NEW endpoint — purely
    additive, does not change existing /drugs routes. Clinician confirms the dose;
    this is decision support, not an order."""
    g = (generic or "").strip()
    if not g:
        return {"generic": g, "options": [], "message": "No drug specified."}

    # Defensive: ignore anything that isn't a real number (robust to bad input).
    weight_kg = weight_kg if isinstance(weight_kg, (int, float)) and not isinstance(weight_kg, bool) else None
    age_years = age_years if isinstance(age_years, (int, float)) and not isinstance(age_years, bool) else None
    age_months = age_months if isinstance(age_months, int) and not isinstance(age_months, bool) else None

    yrs = age_years if age_years is not None else (age_months / 12.0 if age_months is not None else None)
    population = "pediatric" if (yrs is not None and yrs < 12) else "adult"

    rules = db.query(DrugDoseRange).filter(DrugDoseRange.generic.ilike(g)).all()

    def pick_rule(pop, rt):
        for r in rules:
            if (r.population or "adult") == pop and (not rt or (r.route or "").lower() == rt.lower()):
                return r
        return None

    rule = (pick_rule(population, route) or pick_rule(population, None)
            or pick_rule("adult", route) or pick_rule("adult", None))

    drug = db.query(Drug).filter(Drug.generic.ilike(g)).first()
    forms = []
    if drug and drug.formulations:
        try:
            forms = _json.loads(drug.formulations) or []
        except Exception:
            forms = []
    if route:
        forms = [f for f in forms if (f.get("route") or "").lower() == route.lower()] or forms

    target_mg = max_single = max_daily = None
    is_mgkg = bool(rule and (rule.unit or "").lower() == "mg/kg")
    if rule:
        ms = float(rule.max_single_mg) if rule.max_single_mg is not None else None
        md = float(rule.max_daily_mg) if rule.max_daily_mg is not None else None
        if is_mgkg and weight_kg:
            target_mg = ms * weight_kg if ms else None
            max_single = ms * weight_kg if ms else None
            max_daily = md * weight_kg if md else None
        else:
            max_single, max_daily = ms, md

    # Flag threshold: for paediatric mg/kg the single-dose rate IS the target, so
    # allow a rounding tolerance (a 16 kg child's 250 mg tab ≈ 15.6 mg/kg is fine).
    # For adults the absolute single-dose cap is hard.
    cap_flag = (target_mg * 1.25) if (is_mgkg and target_mg) else max_single

    options = []
    for f in forms:
        form = (f.get("form") or "").strip()
        unit = f.get("unit") or "mg"
        rt = f.get("route") or ""
        fl = form.lower()
        if unit != "mg":      # skip %-strength topicals etc. for systemic dosing
            continue
        for s in (f.get("doses") or []):
            try:
                strength = float(s)
            except Exception:
                continue
            if not strength:
                continue
            if target_mg:
                if fl in _LIQUID_FORMS:
                    ml = _round_half((target_mg / strength) * 5)   # strength assumed mg per 5 mL
                    if ml <= 0:
                        continue
                    deliver = (ml / 5.0) * strength
                    qty, qunit = ml, "mL"
                else:
                    n = _round_half(target_mg / strength)
                    if n < 0.5 or n > 6:
                        continue
                    deliver = n * strength
                    qty, qunit = n, form
                closeness = abs(deliver - target_mg)
            else:
                deliver, qty, qunit = strength, 1, form
                closeness = abs(strength - (max_single or strength))
            options.append({
                "form": form, "route": rt, "strength": strength, "unit": unit,
                "quantity": qty, "quantity_unit": qunit, "deliver_mg": round(deliver, 1),
                "exceeds_max": bool(cap_flag and deliver > cap_flag + 0.01),
                "label": _dose_label(form, strength, unit, qty, qunit, deliver),
                "_close": closeness,
            })

    options.sort(key=lambda o: (o["exceeds_max"], o["_close"]))
    nearest = options[:3]
    for o in nearest:
        o.pop("_close", None)

    msg = None
    if population == "pediatric" and is_mgkg and not weight_kg:
        msg = "Enter the patient's weight for paediatric (mg/kg) dosing."
    elif not rule:
        msg = "No dose rule on file; showing available formulations only."
    elif not nearest:
        msg = "No matching formulation found for this route."

    return {
        "generic": g,
        "population": population,
        "route": route,
        "weight_kg": weight_kg,
        "age_years": yrs,
        "target_mg": round(target_mg, 1) if target_mg else None,
        "max_single_mg": round(max_single, 1) if max_single else None,
        "max_daily_mg": round(max_daily, 1) if max_daily else None,
        "rule": ({
            "unit": rule.unit,
            "note": rule.note,
            "renal_adjustment": bool(rule.renal_adjustment),
            "hepatic_adjustment": bool(rule.hepatic_adjustment),
            "pregnancy_category": rule.pregnancy_category,
        } if rule else None),
        "options": nearest,
        "message": msg,
    }


# ─── Allergy cross-check (drug vs patient's recorded allergies) ──────────────────

class AllergyCheckIn(BaseModel):
    drug: str
    allergies: List[str] = []


# (allergy keywords, generic/class substrings that imply cross-reactivity, severity, basis)
_CROSS_REACT = [
    (["penicillin", "pencillin", "amoxicillin", "ampicillin", "augmentin", "amoxyclav", "amoxiclav", "betalactam", "beta-lactam"],
     ["cillin", "penicillin", "amoxyclav", "piperacillin", "tazobactam"], "high", "Beta-lactam (penicillin) cross-reactivity"),
    (["penicillin", "betalactam", "beta-lactam"],
     ["cef", "ceph"], "moderate", "Possible penicillin–cephalosporin cross-reactivity"),
    (["cephalosporin", "cephalexin", "cefixime", "ceftriaxone", "cefuroxime"],
     ["cef", "ceph"], "high", "Cephalosporin allergy"),
    (["sulfa", "sulpha", "sulphonamide", "sulfonamide", "cotrimoxazole", "bactrim", "septran"],
     ["sulfa", "sulpha", "cotrimoxazole", "sulfamethoxazole", "sulfasalazine", "sulphadiazine"], "high", "Sulfonamide allergy"),
    (["nsaid", "aspirin", "ibuprofen", "diclofenac", "brufen", "aceclofenac", "naproxen"],
     ["ibuprofen", "diclofenac", "aspirin", "naproxen", "ketorolac", "aceclofenac", "indomethacin", "etoricoxib", "nsaid"], "moderate", "NSAID cross-sensitivity"),
    (["codeine", "morphine", "opioid", "tramadol", "fentanyl"],
     ["codeine", "morphine", "tramadol", "fentanyl", "oxycodone", "opioid"], "moderate", "Opioid cross-sensitivity"),
    (["quinolone", "ciprofloxacin", "levofloxacin", "fluoroquinolone"],
     ["floxacin", "quinolone"], "high", "Fluoroquinolone allergy"),
    (["macrolide", "erythromycin", "azithromycin", "clarithromycin"],
     ["thromycin", "macrolide"], "high", "Macrolide allergy"),
]


@router.post("/drugs/check-allergy")
def check_allergy(
    payload: AllergyCheckIn,
    db: Session = Depends(get_db),
    current: Staff = Depends(get_current_staff),
):
    """Cross-check a drug against a patient's recorded allergies — direct name
    matches plus class cross-reactivity (penicillins, sulfonamides, NSAIDs, …).
    Decision support; the clinician makes the call. NEW additive endpoint."""
    import re
    drug = (payload.drug or "").strip()
    if not drug:
        return {"drug": drug, "has_match": False, "matches": []}

    # Enrich with the drug's generic + class for class-based matching.
    d = db.query(Drug).filter(
        (Drug.generic.ilike(drug)) | (Drug.primary_brand.ilike(drug))
    ).first()
    hay = " ".join([
        drug.lower(),
        (d.generic or "").lower() if d else "",
        (d.drug_class or "").lower() if d else "",
    ]).strip()

    matches = []
    for raw in (payload.allergies or []):
        a = (raw or "").strip().lower()
        if not a or a in {"nkda", "nka", "none", "nil", "n/a"}:
            continue
        # Direct match: allergy term appears in the drug name/generic, or vice versa.
        toks = [t for t in re.split(r"[^a-z0-9]+", a) if len(t) > 3]
        if (a in hay) or any(t in hay for t in toks) or any(w in a for w in hay.split() if len(w) > 4):
            matches.append({"allergy": raw, "severity": "high", "basis": "Direct match to prescribed drug"})
            continue
        # Class cross-reactivity.
        for keys, subs, sev, basis in _CROSS_REACT:
            if any(k in a for k in keys) and any(s in hay for s in subs):
                matches.append({"allergy": raw, "severity": sev, "basis": basis})
                break

    # Highest severity first.
    order = {"high": 0, "moderate": 1, "low": 2}
    matches.sort(key=lambda m: order.get(m["severity"], 9))
    return {"drug": drug, "generic": (d.generic if d else None), "has_match": bool(matches), "matches": matches}
