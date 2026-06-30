#!/usr/bin/env python3
"""
Seeds the canonical Vitals care section as a global published AssessmentForm.

Design standard followed (docs/care-form-design-standard.md v3.0):
- Single vertical spine — form grows downward only, no side-by-side sections
- Horizontal consolidation — Hemodynamics 2 rows (7 params), Temp 1 row, Anthro 1 row
- Algorithmic conditional expansion — Pain > 0 expands character/onset/location/radiation
- Nested conditional — Radiation Yes expands radiation target
- Field IDs from Master Field Registry (fieldRegistry.js) — permanent, canonical
- All dropdowns 4+ options are searchable
- Numbers carry unit, min, max, step, reference_range, placeholder = normal range
- col_span matches field width need (numbers=1, site dropdowns=2, full-width=4)
- Global (clinic_id=None) — available in Provider, CareChart, Staff portals
- Category "Vitals" routes to Objective (O) bucket in OPD chart SOAP rendering

Idempotent — skips insert if non-deleted form with this title already exists.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    print("[seed_vitals] DATABASE_URL not set — skipping")
    sys.exit(0)

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://") and "+psycopg2" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
elif "postgresql+asyncpg" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg", "postgresql+psycopg2")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.models import AssessmentForm
from datetime import datetime

engine = create_engine(DATABASE_URL, pool_pre_ping=True,
                       connect_args={"options": "-c prepared_statement_cache_size=0"})
Session = sessionmaker(bind=engine)

FORM_TITLE = "Vitals — Standard"

FORM = {
    "title":       FORM_TITLE,
    "description": "Standard vitals section — Hemodynamics, Temperature, Anthropometrics, Pain, and Metabolic. Global. Suitable for OPD, IPD, and any comprehensive care form.",
    "category":    "Vitals",
    "subcategory": "objective",
    "status":      "published",
    "icon":        "🩺",
    "clinic_id":   None,      # global — all clinics, all portals
    "is_template": True,
    "schema": {
        "sections": [

            # ─── HEMODYNAMICS ─────────────────────────────────────────────────
            # 2 rows: bp_site(2) + systolic(1) + diastolic(1) / pulse(1) + rhythm(2) + spo2(1) + rr(1)
            # location qualifier (bp_site) sits left of its measurements on same row
            {
                "id":     "s_hemodynamics",
                "title":  "Hemodynamics",
                "layout": 4,
                "fields": [
                    {
                        "id":           "bp_site",
                        "field_id":     "bp_site",
                        "label":        "BP Site",
                        "type":         "dropdown",
                        "col_span":     2,
                        "searchable":   True,
                        "default_value": "left_arm",
                        "options": [
                            {"label": "Left Arm",  "value": "left_arm"},
                            {"label": "Right Arm", "value": "right_arm"},
                            {"label": "Left Leg",  "value": "left_leg"},
                            {"label": "Right Leg", "value": "right_leg"},
                            {"label": "Wrist",     "value": "wrist"},
                            {"label": "Femoral",   "value": "femoral"},
                        ],
                        "required": False,
                    },
                    {
                        "id":        "bp_systolic",
                        "field_id":  "bp_systolic",
                        "label":     "Systolic BP",
                        "type":      "number",
                        "unit":      "mmHg",
                        "col_span":  1,
                        "min":       40,
                        "max":       300,
                        "step":      1,
                        "placeholder": "90–140",
                        "reference_range": {
                            "normal_low":    90,
                            "normal_high":   140,
                            "critical_low":  70,
                            "critical_high": 180,
                        },
                        "required": False,
                    },
                    {
                        "id":        "bp_diastolic",
                        "field_id":  "bp_diastolic",
                        "label":     "Diastolic BP",
                        "type":      "number",
                        "unit":      "mmHg",
                        "col_span":  1,
                        "min":       20,
                        "max":       200,
                        "step":      1,
                        "placeholder": "60–90",
                        "reference_range": {
                            "normal_low":    60,
                            "normal_high":   90,
                            "critical_low":  40,
                            "critical_high": 120,
                        },
                        "required": False,
                    },
                    # Row 2 — Pulse + Rhythm + SpO2 + RR
                    {
                        "id":        "pulse_rate",
                        "field_id":  "pulse_rate",
                        "label":     "Pulse Rate",
                        "type":      "number",
                        "unit":      "bpm",
                        "col_span":  1,
                        "min":       20,
                        "max":       300,
                        "step":      1,
                        "placeholder": "60–100",
                        "reference_range": {
                            "normal_low":    60,
                            "normal_high":   100,
                            "critical_low":  40,
                            "critical_high": 150,
                        },
                        "required": False,
                    },
                    {
                        "id":         "pulse_rhythm",
                        "field_id":   "pulse_rhythm",
                        "label":      "Pulse Rhythm",
                        "type":       "dropdown",
                        "col_span":   2,
                        "searchable": True,
                        "options": [
                            {"label": "Regular",                "value": "regular"},
                            {"label": "Irregular",              "value": "irregular"},
                            {"label": "Regularly Irregular",    "value": "regularly_irregular"},
                            {"label": "Irregularly Irregular",  "value": "irregularly_irregular"},
                        ],
                        "required": False,
                    },
                    {
                        "id":        "spo2",
                        "field_id":  "spo2",
                        "label":     "SpO₂",
                        "type":      "number",
                        "unit":      "%",
                        "col_span":  1,
                        "min":       50,
                        "max":       100,
                        "step":      1,
                        "placeholder": "95–100",
                        "reference_range": {
                            "normal_low":   95,
                            "normal_high":  100,
                            "critical_low": 88,
                        },
                        "required": False,
                    },
                    {
                        "id":        "respiratory_rate",
                        "field_id":  "respiratory_rate",
                        "label":     "Respiratory Rate",
                        "type":      "number",
                        "unit":      "/min",
                        "col_span":  1,
                        "min":       5,
                        "max":       60,
                        "step":      1,
                        "placeholder": "12–20",
                        "reference_range": {
                            "normal_low":    12,
                            "normal_high":   20,
                            "critical_low":  8,
                            "critical_high": 30,
                        },
                        "required": False,
                    },
                ],
            },

            # ─── TEMPERATURE ─────────────────────────────────────────────────
            # 1 row: site(2) + temp(1)
            {
                "id":     "s_temperature",
                "title":  "Temperature",
                "layout": 4,
                "fields": [
                    {
                        "id":           "temp_site",
                        "field_id":     "temp_site",
                        "label":        "Temp Site",
                        "type":         "dropdown",
                        "col_span":     2,
                        "searchable":   True,
                        "default_value": "oral",
                        "options": [
                            {"label": "Oral",     "value": "oral"},
                            {"label": "Axillary", "value": "axillary"},
                            {"label": "Rectal",   "value": "rectal"},
                            {"label": "Tympanic", "value": "tympanic"},
                            {"label": "Temporal", "value": "temporal"},
                        ],
                        "required": False,
                    },
                    {
                        "id":        "temperature",
                        "field_id":  "temperature",
                        "label":     "Temperature",
                        "type":      "number",
                        "unit":      "°C",
                        "col_span":  1,
                        "min":       30.0,
                        "max":       43.0,
                        "step":      0.1,
                        "placeholder": "36.1–37.2",
                        "reference_range": {
                            "normal_low":    36.1,
                            "normal_high":   37.2,
                            "critical_low":  35.0,
                            "critical_high": 39.5,
                        },
                        "required": False,
                    },
                ],
            },

            # ─── ANTHROPOMETRICS ──────────────────────────────────────────────
            # 1 row: weight(1) + height(1) + BMI calculated(2)
            {
                "id":     "s_anthropometrics",
                "title":  "Anthropometrics",
                "layout": 4,
                "fields": [
                    {
                        "id":        "weight",
                        "field_id":  "weight",
                        "label":     "Weight",
                        "type":      "number",
                        "unit":      "kg",
                        "col_span":  1,
                        "min":       0.5,
                        "max":       500.0,
                        "step":      0.1,
                        "placeholder": "kg",
                        "required":  False,
                    },
                    {
                        "id":        "height",
                        "field_id":  "height",
                        "label":     "Height",
                        "type":      "number",
                        "unit":      "cm",
                        "col_span":  1,
                        "min":       30.0,
                        "max":       250.0,
                        "step":      0.1,
                        "placeholder": "cm",
                        "required":  False,
                    },
                    {
                        # Calculated — auto from weight + height, col_span 2 (rest of row)
                        "id":       "bmi",
                        "field_id": "bmi",
                        "label":    "BMI",
                        "type":     "calculated",
                        "col_span": 2,
                        "unit":     "kg/m²",
                        "formula":  "round(weight / ((height / 100) ** 2), 1)",
                        "depends_on": ["weight", "height"],
                        "required": False,
                    },
                ],
            },

            # ─── PAIN ─────────────────────────────────────────────────────────
            # Scale full width
            # Conditionally expands if pain_scale > 0:
            #   character (dropdown+search), onset (dropdown)
            #   location (text+search anatomy)
            #   radiation yes_no → if yes expands radiation_target
            {
                "id":     "s_pain",
                "title":  "Pain",
                "layout": 4,
                "fields": [
                    {
                        "id":       "pain_scale",
                        "field_id": "pain_scale",
                        "label":    "Pain Score",
                        "type":     "scale",
                        "col_span": 4,
                        "min":      0,
                        "max":      10,
                        "labels":   {"0": "None", "5": "Moderate", "10": "Worst"},
                        "required": False,
                    },
                    # ── Conditional block — visible only when pain_scale > 0 ──
                    {
                        "id":         "pain_character",
                        "field_id":   "pain_character",
                        "label":      "Pain Character",
                        "type":       "dropdown",
                        "col_span":   2,
                        "searchable": True,
                        "multi_select": False,
                        "options": [
                            {"label": "Aching",      "value": "aching"},
                            {"label": "Burning",     "value": "burning"},
                            {"label": "Cramping",    "value": "cramping"},
                            {"label": "Dull",        "value": "dull"},
                            {"label": "Gnawing",     "value": "gnawing"},
                            {"label": "Pressure",    "value": "pressure"},
                            {"label": "Sharp",       "value": "sharp"},
                            {"label": "Shooting",    "value": "shooting"},
                            {"label": "Stabbing",    "value": "stabbing"},
                            {"label": "Throbbing",   "value": "throbbing"},
                            {"label": "Tingling",    "value": "tingling"},
                        ],
                        "conditions": [
                            {"field_id": "pain_scale", "operator": "greater_than", "value": "0"}
                        ],
                        "required": False,
                        "conditional_indent": True,
                    },
                    {
                        "id":         "pain_onset",
                        "field_id":   "pain_onset",
                        "label":      "Onset",
                        "type":       "dropdown",
                        "col_span":   2,
                        "searchable": False,
                        "options": [
                            {"label": "Sudden",   "value": "sudden"},
                            {"label": "Gradual",  "value": "gradual"},
                            {"label": "Episodic", "value": "episodic"},
                        ],
                        "conditions": [
                            {"field_id": "pain_scale", "operator": "greater_than", "value": "0"}
                        ],
                        "required": False,
                        "conditional_indent": True,
                    },
                    {
                        "id":          "pain_location",
                        "field_id":    "pain_location",
                        "label":       "Pain Location",
                        "type":        "text",
                        "col_span":    4,
                        "search_type": "anatomy",
                        "placeholder": "Search body site or describe location…",
                        "conditions": [
                            {"field_id": "pain_scale", "operator": "greater_than", "value": "0"}
                        ],
                        "required": False,
                        "conditional_indent": True,
                    },
                    {
                        "id":       "pain_radiation",
                        "field_id": "pain_radiation",
                        "label":    "Radiation",
                        "type":     "yes_no",
                        "col_span": 2,
                        "display_style": "button_group",
                        "conditions": [
                            {"field_id": "pain_scale", "operator": "greater_than", "value": "0"}
                        ],
                        "required": False,
                        "conditional_indent": True,
                    },
                    # ── Nested conditional — visible only when radiation = yes ──
                    {
                        "id":          "pain_radiation_target",
                        "field_id":    "pain_radiation_target",
                        "label":       "Radiates To",
                        "type":        "text",
                        "col_span":    4,
                        "search_type": "anatomy",
                        "placeholder": "Search body site or describe…",
                        "conditions": [
                            {"field_id": "pain_scale",     "operator": "greater_than", "value": "0"},
                            {"field_id": "pain_radiation", "operator": "equals",        "value": "yes"},
                        ],
                        "required": False,
                        "conditional_indent": True,
                        "conditional_depth": 2,
                    },
                ],
            },

            # ─── METABOLIC ────────────────────────────────────────────────────
            # 1 row: glucose_timing(2) + blood_glucose(1)
            # Optional section — not required
            {
                "id":     "s_metabolic",
                "title":  "Metabolic",
                "layout": 4,
                "fields": [
                    {
                        "id":           "glucose_timing",
                        "field_id":     "glucose_timing",
                        "label":        "Glucose Timing",
                        "type":         "dropdown",
                        "col_span":     2,
                        "searchable":   True,
                        "options": [
                            {"label": "Fasting",             "value": "fasting"},
                            {"label": "Random",              "value": "random"},
                            {"label": "Post-Prandial (1 h)", "value": "pp_1h"},
                            {"label": "Post-Prandial (2 h)", "value": "pp_2h"},
                            {"label": "Pre-Meal",            "value": "pre_meal"},
                            {"label": "OGTT (1 h)",          "value": "ogtt_1h"},
                            {"label": "OGTT (2 h)",          "value": "ogtt_2h"},
                        ],
                        "required": False,
                    },
                    {
                        "id":        "blood_glucose",
                        "field_id":  "blood_glucose",
                        "label":     "Blood Glucose",
                        "type":      "number",
                        "unit":      "mg/dL",
                        "col_span":  1,
                        "min":       20,
                        "max":       600,
                        "step":      1,
                        "placeholder": "70–140",
                        "reference_range": {
                            "normal_low":    70,
                            "normal_high":   140,
                            "critical_low":  54,
                            "critical_high": 400,
                        },
                        "required": False,
                    },
                ],
            },

        ]  # end sections
    },  # end schema
}


def seed():
    db = Session()
    try:
        existing = db.query(AssessmentForm).filter(
            AssessmentForm.title == FORM_TITLE,
            AssessmentForm.deleted_at.is_(None),
        ).first()

        if existing:
            # Always update schema so rule changes propagate on next deploy
            existing.schema      = FORM["schema"]
            existing.description = FORM["description"]
            existing.updated_at  = datetime.utcnow()
            db.commit()
            print(f"[seed_vitals] Updated existing id={existing.id} — schema refreshed.")
            return

        now = datetime.utcnow()
        form = AssessmentForm(
            title        = FORM["title"],
            description  = FORM["description"],
            category     = FORM["category"],
            subcategory  = FORM["subcategory"],
            status       = FORM["status"],
            icon         = FORM["icon"],
            clinic_id    = FORM["clinic_id"],
            is_template  = FORM["is_template"],
            schema       = FORM["schema"],
            version      = 1,
            published_at = now,
            created_at   = now,
            updated_at   = now,
        )
        db.add(form)
        db.commit()
        db.refresh(form)
        print(f"[seed_vitals] Created: id={form.id} title='{form.title}' status='{form.status}'")
    except Exception as e:
        db.rollback()
        print(f"[seed_vitals] Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
