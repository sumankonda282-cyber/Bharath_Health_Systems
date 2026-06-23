"""
Idempotent loader for the medical terminology library.

Loads on every boot but skips any section that is already populated, so a
normal restart adds nothing. Sources:
  - Full WHO ICD-10 reference (~12k codes) from the `simple-icd-10` package
  - Curated India-priority data from app/seed_data/* (diseases, symptoms,
    allergies, drugs, interactions, dose ranges, contraindications)

Every curated ICD-10 code is validated against the package before insert;
invalid codes are skipped and logged, never inserted.
"""
import re
from sqlalchemy import text
from app.db.session import engine

ICD10_URI = "http://hl7.org/fhir/sid/icd-10"
SNOMED_URI = "http://snomed.info/sct"
BATCH = 500


def _count(conn, sql, **params):
    return conn.execute(text(sql), params).scalar() or 0


def _batched_insert(conn, sql, rows):
    for i in range(0, len(rows), BATCH):
        conn.execute(text(sql), rows[i:i + BATCH])


def _ensure_trgm(conn):
    """Best-effort fuzzy-search support; search degrades to ILIKE without it."""
    for sql in [
        "CREATE EXTENSION IF NOT EXISTS pg_trgm",
        "CREATE INDEX IF NOT EXISTS idx_medterms_display_trgm ON medical_terms USING gin (display gin_trgm_ops)",
        "CREATE INDEX IF NOT EXISTS idx_medterms_syn_trgm ON medical_terms USING gin (synonyms gin_trgm_ops)",
    ]:
        try:
            conn.execute(text(sql))
        except Exception as e:
            print(f"[medlib] trgm setup skipped: {e}")


def seed_icd10_reference():
    import simple_icd_10 as icd
    with engine.begin() as conn:
        existing = _count(conn, "SELECT count(*) FROM medical_terms WHERE tier='reference'")
        if existing >= 10000:
            print(f"[medlib] ICD-10 reference already loaded ({existing} rows) — skipping")
            return
        codes = [c for c in icd.get_all_codes(True) if re.match(r"^[A-Z]\d{2}", c)]
        rows = [
            {"system": ICD10_URI, "code": c, "display": icd.get_description(c)[:300]}
            for c in codes
        ]
        _batched_insert(
            conn,
            "INSERT INTO medical_terms (system, code, display, category, tier, is_active) "
            "VALUES (:system, :code, :display, 'condition', 'reference', TRUE)",
            rows,
        )
        print(f"[medlib] ICD-10 reference loaded: {len(rows)} codes")


def seed_curated_terms():
    import simple_icd_10 as icd

    def valid(code):
        try:
            return bool(code) and icd.is_valid_item(code)
        except Exception:
            return False

    sections = []
    try:
        from app.seed_data.diseases import DISEASES
        sections.append(("condition", DISEASES, True))
    except ImportError as e:
        print(f"[medlib] diseases seed missing: {e}")
    try:
        from app.seed_data.symptoms import SYMPTOMS
        sections.append(("symptom", SYMPTOMS, False))
    except ImportError as e:
        print(f"[medlib] symptoms seed missing: {e}")

    with engine.begin() as conn:
        for category, items, code_required in sections:
            existing = _count(
                conn,
                "SELECT count(*) FROM medical_terms WHERE tier='curated' AND category=:c",
                c=category,
            )
            if existing >= min(50, len(items) // 2):
                print(f"[medlib] curated {category}s already loaded ({existing}) — skipping")
                continue
            rows, skipped = [], 0
            for it in items:
                code = (it.get("icd10") or "").strip() or None
                if code and not valid(code):
                    skipped += 1
                    code = None
                if code_required and code is None:
                    continue
                rows.append({
                    "system": ICD10_URI if code else "custom",
                    "code": code,
                    "display": it["display"][:300],
                    "category": category,
                    "specialty": it.get("specialty"),
                    "synonyms": it.get("synonyms"),
                })
            _batched_insert(
                conn,
                "INSERT INTO medical_terms (system, code, display, category, specialty, synonyms, tier, is_active) "
                "VALUES (:system, :code, :display, :category, :specialty, :synonyms, 'curated', TRUE)",
                rows,
            )
            print(f"[medlib] curated {category}s loaded: {len(rows)} (invalid ICD-10 dropped/kept-uncoded: {skipped})")

    try:
        from app.seed_data.allergies import ALLERGENS
    except ImportError as e:
        print(f"[medlib] allergies seed missing: {e}")
        return
    with engine.begin() as conn:
        existing = _count(conn, "SELECT count(*) FROM medical_terms WHERE category='allergy'")
        if existing >= 40:
            print(f"[medlib] allergens already loaded ({existing}) — skipping")
            return
        rows = [{
            "system": SNOMED_URI if a.get("snomed") else "custom",
            "code": a.get("snomed"),
            "display": a["display"][:300],
            "group_label": a.get("group"),
        } for a in ALLERGENS]
        _batched_insert(
            conn,
            "INSERT INTO medical_terms (system, code, display, category, group_label, tier, is_active) "
            "VALUES (:system, :code, :display, 'allergen', :group_label, 'curated', TRUE)",
            rows,
        )
        print(f"[medlib] allergens loaded: {len(rows)}")


def seed_extra_terms():
    """Load anatomy, procedure, and exam_finding terms into medical_terms."""
    extra_sections = []
    try:
        from app.seed_data.anatomy import ANATOMY
        extra_sections.append(("anatomy", ANATOMY))
    except ImportError as e:
        print(f"[medlib] anatomy seed missing: {e}")
    try:
        from app.seed_data.procedures import PROCEDURES
        extra_sections.append(("procedure", PROCEDURES))
    except ImportError as e:
        print(f"[medlib] procedures seed missing: {e}")
    try:
        from app.seed_data.exam_findings import EXAM_FINDINGS
        extra_sections.append(("exam_finding", EXAM_FINDINGS))
    except ImportError as e:
        print(f"[medlib] exam_findings seed missing: {e}")

    with engine.begin() as conn:
        for category, items in extra_sections:
            existing = _count(
                conn,
                "SELECT count(*) FROM medical_terms WHERE tier='curated' AND category=:c",
                c=category,
            )
            if existing >= min(20, len(items) // 2):
                print(f"[medlib] {category} terms already loaded ({existing}) — skipping")
                continue
            rows = [{
                "system": "custom",
                "code": None,
                "display": it["display"][:300],
                "category": category,
                "specialty": it.get("specialty"),
                "synonyms": it.get("synonyms"),
            } for it in items]
            _batched_insert(
                conn,
                "INSERT INTO medical_terms (system, code, display, category, specialty, synonyms, tier, is_active) "
                "VALUES (:system, :code, :display, :category, :specialty, :synonyms, 'curated', TRUE)",
                rows,
            )
            print(f"[medlib] {category} terms loaded: {len(rows)}")


def seed_drug_data():
    loaders = []
    try:
        from app.seed_data.drugs import DRUGS
        loaders.append((
            "drugs", DRUGS, 4500,
            "INSERT INTO drugs (generic, atc, drug_class, routes, brands, primary_brand, rx_only) "
            "VALUES (:generic, :atc, :drug_class, :routes, :brands, :primary_brand, :rx_only) "
            "ON CONFLICT DO NOTHING",
            lambda d: {
                "generic": d["generic"][:200], "atc": d.get("atc"),
                "drug_class": d.get("drug_class"), "routes": d.get("routes"),
                "brands": d.get("brands"), "primary_brand": d.get("primary_brand"),
                "rx_only": d.get("rx_only", True),
            },
        ))
    except ImportError as e:
        print(f"[medlib] drugs seed missing: {e}")
    try:
        from app.seed_data.interactions import INTERACTIONS
        loaders.append((
            "drug_interactions", INTERACTIONS, 200,
            "INSERT INTO drug_interactions (drug_a, drug_b, severity, effect, management, interaction_type) "
            "VALUES (:drug_a, :drug_b, :severity, :effect, :management, :interaction_type)",
            lambda d: {
                "drug_a": d["drug_a"][:200], "drug_b": d["drug_b"][:200],
                "severity": d["severity"], "effect": d.get("effect"),
                "management": d.get("management"),
                "interaction_type": d.get("interaction_type", "drug-drug"),
            },
        ))
    except ImportError as e:
        print(f"[medlib] interactions seed missing: {e}")
    try:
        from app.seed_data.dose_ranges import DOSE_RANGES
        loaders.append((
            "drug_dose_ranges", DOSE_RANGES, 100,
            "INSERT INTO drug_dose_ranges (generic, route, population, max_single_mg, max_daily_mg, unit, note, "
            "pediatric_dose_mg_kg_min, pediatric_dose_mg_kg_max, renal_adjustment, hepatic_adjustment, pregnancy_category) "
            "VALUES (:generic, :route, :population, :max_single_mg, :max_daily_mg, :unit, :note, "
            ":pediatric_dose_mg_kg_min, :pediatric_dose_mg_kg_max, :renal_adjustment, :hepatic_adjustment, :pregnancy_category)",
            lambda d: {
                "generic": d["generic"][:200], "route": d.get("route", "oral"),
                "population": d.get("population", "adult"),
                "max_single_mg": d.get("max_single_mg"), "max_daily_mg": d.get("max_daily_mg"),
                "unit": d.get("unit", "mg"), "note": d.get("note"),
                "pediatric_dose_mg_kg_min": d.get("pediatric_dose_mg_kg_min"),
                "pediatric_dose_mg_kg_max": d.get("pediatric_dose_mg_kg_max"),
                "renal_adjustment": d.get("renal_adjustment", False),
                "hepatic_adjustment": d.get("hepatic_adjustment", False),
                "pregnancy_category": d.get("pregnancy_category"),
            },
        ))
    except ImportError as e:
        print(f"[medlib] dose ranges seed missing: {e}")
    try:
        from app.seed_data.contraindications import CONTRAINDICATIONS
        loaders.append((
            "drug_contraindications", CONTRAINDICATIONS, 40,
            "INSERT INTO drug_contraindications (generic, icd10_prefix, condition, severity, reason) "
            "VALUES (:generic, :icd10_prefix, :condition, :severity, :reason)",
            lambda d: {
                "generic": d["generic"][:200], "icd10_prefix": d["icd10_prefix"][:10],
                "condition": d.get("condition"), "severity": d.get("severity", "serious"),
                "reason": d.get("reason"),
            },
        ))
    except ImportError as e:
        print(f"[medlib] contraindications seed missing: {e}")
    try:
        from app.seed_data.drug_counselling import DRUG_COUNSELLING
        rows = []
        for entry in DRUG_COUNSELLING:
            for i, tip in enumerate(entry["tips"]):
                rows.append({"generic": entry["generic"][:200], "tip": tip, "sort_order": i})
        loaders.append((
            "drug_counselling", rows, 50,
            "INSERT INTO drug_counselling (generic, tip, sort_order) "
            "VALUES (:generic, :tip, :sort_order)",
            lambda d: d,
        ))
    except ImportError as e:
        print(f"[medlib] drug counselling seed missing: {e}")
    try:
        from app.seed_data.pregnancy_categories import PREGNANCY_CATEGORIES
        loaders.append((
            "pregnancy_categories", PREGNANCY_CATEGORIES, 50,
            "INSERT INTO pregnancy_categories (generic, category, schedule, notes) "
            "VALUES (:generic, :category, :schedule, :notes)",
            lambda d: {
                "generic": d["generic"][:200],
                "category": d.get("category"),
                "schedule": d.get("schedule"),
                "notes": d.get("notes"),
            },
        ))
    except ImportError as e:
        print(f"[medlib] pregnancy_categories seed missing: {e}")
    try:
        from app.seed_data.food_interactions import FOOD_INTERACTIONS
        loaders.append((
            "food_drug_interactions", FOOD_INTERACTIONS, 30,
            "INSERT INTO food_drug_interactions (generic, food, effect, severity) "
            "VALUES (:generic, :food, :effect, :severity)",
            lambda d: {
                "generic": d["generic"][:200],
                "food": d["food"],
                "effect": d.get("effect"),
                "severity": d.get("severity", "moderate"),
            },
        ))
    except ImportError as e:
        print(f"[medlib] food_interactions seed missing: {e}")

    for table, items, floor, sql, mapper in loaders:
        with engine.begin() as conn:
            existing = _count(conn, f"SELECT count(*) FROM {table}")
            if existing >= floor:
                print(f"[medlib] {table} already loaded ({existing}) — skipping")
                continue
            rows = [mapper(d) for d in items]
            _batched_insert(conn, sql, rows)
            print(f"[medlib] {table} loaded: {len(rows)}")


def seed_lab_tests():
    try:
        from app.seed_data.lab_tests import LAB_TESTS
    except ImportError as e:
        print(f"[medlib] lab_tests seed missing: {e}")
        return
    with engine.begin() as conn:
        existing = _count(conn, "SELECT count(*) FROM lab_tests")
        if existing >= 100:
            print(f"[medlib] lab_tests already loaded ({existing}) — skipping")
            return
        rows = [{
            "name": t["name"][:200],
            "code": t.get("code", "")[:50],
            "category": t.get("category", "")[:100],
            "normal_range": t.get("normal_range", "")[:200],
            "unit": t.get("unit", "")[:50],
            "turnaround_hours": t.get("turnaround_hours"),
        } for t in LAB_TESTS]
        _batched_insert(
            conn,
            "INSERT INTO lab_tests (name, code, category, normal_range, unit, turnaround_hours) "
            "VALUES (:name, :code, :category, :normal_range, :unit, :turnaround_hours)",
            rows,
        )
        print(f"[medlib] lab_tests loaded: {len(rows)}")


def seed_imaging_catalog():
    try:
        from app.seed_data.imaging_catalog import IMAGING_STUDIES
    except ImportError as e:
        print(f"[medlib] imaging_catalog seed missing: {e}")
        return
    with engine.begin() as conn:
        # Check if table exists first
        try:
            existing = _count(conn, "SELECT count(*) FROM imaging_catalog")
        except Exception:
            print("[medlib] imaging_catalog table not yet created — skipping")
            return
        if existing >= 50:
            print(f"[medlib] imaging_catalog already loaded ({existing}) — skipping")
            return
        rows = [{
            "name": s["name"][:200],
            "modality": s.get("modality", "")[:20],
            "body_part": s.get("body_part", "")[:100],
            "category": s.get("category", "")[:100],
            "turnaround_hours": s.get("turnaround_hours", 24),
            "preparation": s.get("preparation", ""),
        } for s in IMAGING_STUDIES]
        _batched_insert(
            conn,
            "INSERT INTO imaging_catalog (name, modality, body_part, category, turnaround_hours, preparation) "
            "VALUES (:name, :modality, :body_part, :category, :turnaround_hours, :preparation)",
            rows,
        )
        print(f"[medlib] imaging_catalog loaded: {len(rows)}")


def seed_disease_counselling():
    try:
        from app.seed_data.disease_counselling import DISEASE_COUNSELLING
    except ImportError as e:
        print(f"[medlib] disease_counselling seed missing: {e}")
        return
    with engine.begin() as conn:
        try:
            existing = _count(conn, "SELECT count(*) FROM disease_counselling")
        except Exception:
            print("[medlib] disease_counselling table not yet created — skipping")
            return
        if existing >= 100:
            print(f"[medlib] disease_counselling already loaded ({existing}) — skipping")
            return
        rows = []
        for entry in DISEASE_COUNSELLING:
            for i, tip in enumerate(entry["tips"]):
                rows.append({
                    "icd10_prefix": entry["icd10_prefix"][:10],
                    "condition": entry.get("condition", "")[:200],
                    "tip": tip,
                    "sort_order": i,
                })
        _batched_insert(
            conn,
            "INSERT INTO disease_counselling (icd10_prefix, condition, tip, sort_order) "
            "VALUES (:icd10_prefix, :condition, :tip, :sort_order)",
            rows,
        )
        print(f"[medlib] disease_counselling loaded: {len(rows)} tips")


def main():
    steps = [
        ("icd10 reference", seed_icd10_reference),
        ("curated terms", seed_curated_terms),
        ("extra terms", seed_extra_terms),
        ("drug data", seed_drug_data),
        ("lab tests", seed_lab_tests),
        ("imaging catalog", seed_imaging_catalog),
        ("disease counselling", seed_disease_counselling),
    ]
    for name, fn in steps:
        try:
            fn()
        except Exception as e:
            print(f"[medlib] {name} failed (non-fatal): {e}")
    try:
        with engine.begin() as conn:
            _ensure_trgm(conn)
    except Exception as e:
        print(f"[medlib] trgm setup failed (non-fatal): {e}")
    print("[medlib] Medical library load complete.")


if __name__ == "__main__":
    main()
