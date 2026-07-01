#!/usr/bin/env python3
"""
Fresh curated library — form #1: the single canonical "Vital Signs" form.

Part of the clean-slate rebuild (see docs/care-form-design-standard.md v3.0):
start.sh retires ALL legacy forms (soft-delete, reversible) and then seeds only
our curated forms. This is the first. Built to the design standard:

- One vertical spine, sections grow downward: Hemodynamics, Temperature,
  Anthropometrics, Pain (algorithmic expansion), Metabolic.
- Canonical field_ids ONLY (Master Field Registry): heart_rate (not pulse_rate),
  pain_score (not pain_scale), bp_systolic, bp_diastolic, spo2, temperature,
  respiratory_rate, weight, height, bmi, pain_location…  Same concept = same id
  everywhere, so vitals stay portable across reception, nursing and doctors.
- Searchable dropdowns for site/rhythm/timing (option count is not a constraint).
- Numbers carry unit + min/max + reference_range (drives chart badges).
- BMI is calculated with the engine's {field} interpolation syntax (NOT Python).
- Anatomy fields use body_site_search (not free text).
- Nursing flowsheet preserved: is_iview_enabled + iview_config + alert_rules,
  same field_ids the CareChart vitals board already reads.

Idempotent: finds "Vital Signs" by title (even if soft-deleted), revives it,
and refreshes its schema — so charted submissions are preserved. Safe to re-run.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if not os.getenv("DATABASE_URL"):
    print("[vital-signs] DATABASE_URL not set — skipping")
    sys.exit(0)

from datetime import datetime
from app.db.session import SessionLocal
from app.models.models import AssessmentForm, AssessmentFormVersion

CANON_TITLE = "Vital Signs"

# Reference ranges reused in both the field and the iView row config.
RR_BP_SYS   = {"critical_low": 70, "normal_low": 90,  "normal_high": 140, "critical_high": 180}
RR_BP_DIA   = {"critical_low": 40, "normal_low": 60,  "normal_high": 90,  "critical_high": 120}
RR_HR       = {"critical_low": 40, "normal_low": 60,  "normal_high": 100, "critical_high": 150}
RR_SPO2     = {"critical_low": 85, "normal_low": 95,  "normal_high": 100}
RR_TEMP     = {"critical_low": 35, "normal_low": 36.1,"normal_high": 37.2,"critical_high": 39.5}
RR_RR       = {"critical_low": 8,  "normal_low": 12,  "normal_high": 20,  "critical_high": 30}
RR_GLUCOSE  = {"critical_low": 54, "normal_low": 70,  "normal_high": 140, "critical_high": 400}

SCHEMA = {
    "sections": [
        # ── HEMODYNAMICS — 2 rows: site + systolic + diastolic / hr + rhythm + spo2 + rr
        {
            "id": "s_hemodynamics", "title": "Hemodynamics", "layout": 4,
            "fields": [
                {"id": "bp_site", "field_id": "bp_site", "type": "dropdown", "label": "BP Site",
                 "col_span": 2, "searchable": True, "default_value": "left_arm", "required": False,
                 "options": [
                     {"label": "Left Arm", "value": "left_arm"}, {"label": "Right Arm", "value": "right_arm"},
                     {"label": "Left Leg", "value": "left_leg"}, {"label": "Right Leg", "value": "right_leg"},
                     {"label": "Wrist", "value": "wrist"}, {"label": "Femoral", "value": "femoral"},
                 ]},
                {"id": "bp_systolic", "field_id": "bp_systolic", "type": "number", "label": "Systolic BP",
                 "unit": "mmHg", "col_span": 1, "min": 40, "max": 300, "step": 1, "placeholder": "90–140",
                 "required": False, "reference_range": RR_BP_SYS, "ref_range": RR_BP_SYS},
                {"id": "bp_diastolic", "field_id": "bp_diastolic", "type": "number", "label": "Diastolic BP",
                 "unit": "mmHg", "col_span": 1, "min": 20, "max": 200, "step": 1, "placeholder": "60–90",
                 "required": False, "reference_range": RR_BP_DIA, "ref_range": RR_BP_DIA},
                {"id": "heart_rate", "field_id": "heart_rate", "type": "number", "label": "Heart Rate",
                 "unit": "/min", "col_span": 1, "min": 20, "max": 300, "step": 1, "placeholder": "60–100",
                 "required": False, "reference_range": RR_HR, "ref_range": RR_HR},
                {"id": "pulse_rhythm", "field_id": "pulse_rhythm", "type": "dropdown", "label": "Pulse Rhythm",
                 "col_span": 1, "searchable": True, "required": False,
                 "options": [
                     {"label": "Regular", "value": "regular"}, {"label": "Irregular", "value": "irregular"},
                     {"label": "Regularly Irregular", "value": "regularly_irregular"},
                     {"label": "Irregularly Irregular", "value": "irregularly_irregular"},
                 ]},
                {"id": "spo2", "field_id": "spo2", "type": "number", "label": "SpO₂",
                 "unit": "%", "col_span": 1, "min": 50, "max": 100, "step": 1, "placeholder": "95–100",
                 "required": False, "reference_range": RR_SPO2, "ref_range": RR_SPO2},
                {"id": "respiratory_rate", "field_id": "respiratory_rate", "type": "number", "label": "Respiratory Rate",
                 "unit": "/min", "col_span": 1, "min": 5, "max": 60, "step": 1, "placeholder": "12–20",
                 "required": False, "reference_range": RR_RR, "ref_range": RR_RR},
            ],
        },
        # ── TEMPERATURE — 1 row: site + temp
        {
            "id": "s_temperature", "title": "Temperature", "layout": 4,
            "fields": [
                {"id": "temp_site", "field_id": "temp_site", "type": "dropdown", "label": "Temp Site",
                 "col_span": 2, "searchable": True, "default_value": "oral", "required": False,
                 "options": [
                     {"label": "Oral", "value": "oral"}, {"label": "Axillary", "value": "axillary"},
                     {"label": "Rectal", "value": "rectal"}, {"label": "Tympanic", "value": "tympanic"},
                     {"label": "Temporal", "value": "temporal"},
                 ]},
                {"id": "temperature", "field_id": "temperature", "type": "number", "label": "Temperature",
                 "unit": "°C", "col_span": 1, "min": 30.0, "max": 43.0, "step": 0.1, "decimal_places": 1,
                 "placeholder": "36.1–37.2", "required": False, "reference_range": RR_TEMP, "ref_range": RR_TEMP},
            ],
        },
        # ── ANTHROPOMETRICS — 1 row: weight + height + BMI (calculated, engine {field} syntax)
        {
            "id": "s_anthropometrics", "title": "Anthropometrics", "layout": 4,
            "fields": [
                {"id": "weight", "field_id": "weight", "type": "number", "label": "Weight",
                 "unit": "kg", "col_span": 1, "min": 0.5, "max": 500, "step": 0.1, "decimal_places": 1,
                 "placeholder": "kg", "required": False},
                {"id": "height", "field_id": "height", "type": "number", "label": "Height",
                 "unit": "cm", "col_span": 1, "min": 30, "max": 250, "step": 0.1, "decimal_places": 1,
                 "placeholder": "cm", "required": False},
                {"id": "bmi", "field_id": "bmi", "type": "calculated", "label": "BMI", "unit": "kg/m²",
                 "col_span": 2, "decimal_places": 1,
                 "formula": "{weight} / (({height} / 100) * ({height} / 100))"},
            ],
        },
        # ── PAIN — scale full width, algorithmic expansion when pain_score > 0
        {
            "id": "s_pain", "title": "Pain", "layout": 4,
            "fields": [
                {"id": "pain_score", "field_id": "pain_score", "type": "scale", "label": "Pain Score",
                 "col_span": 4, "min": 0, "max": 10, "left_label": "No Pain", "right_label": "Worst Pain",
                 "scale_style": "nrs", "required": False},
                {"id": "pain_character", "field_id": "pain_character", "type": "dropdown", "label": "Pain Character",
                 "col_span": 2, "searchable": True, "required": False,
                 "conditions": [{"field_id": "pain_score", "operator": "greater_than", "value": 0}],
                 "options": [
                     {"label": "Aching", "value": "aching"}, {"label": "Burning", "value": "burning"},
                     {"label": "Cramping", "value": "cramping"}, {"label": "Dull", "value": "dull"},
                     {"label": "Pressure", "value": "pressure"}, {"label": "Sharp", "value": "sharp"},
                     {"label": "Shooting", "value": "shooting"}, {"label": "Stabbing", "value": "stabbing"},
                     {"label": "Throbbing", "value": "throbbing"}, {"label": "Tingling", "value": "tingling"},
                 ]},
                {"id": "pain_location", "field_id": "pain_location", "type": "body_site_search",
                 "search_category": "anatomy", "label": "Pain Location", "col_span": 4,
                 "placeholder": "Search body site…", "required": False,
                 "conditions": [{"field_id": "pain_score", "operator": "greater_than", "value": 0}]},
                {"id": "pain_radiation", "field_id": "pain_radiation", "type": "yes_no", "label": "Radiation",
                 "col_span": 2, "display_style": "button_group", "required": False,
                 "conditions": [{"field_id": "pain_score", "operator": "greater_than", "value": 0}]},
                {"id": "pain_radiation_target", "field_id": "pain_radiation_target", "type": "body_site_search",
                 "search_category": "anatomy", "label": "Radiates To", "col_span": 4,
                 "placeholder": "Search body site…", "required": False,
                 "conditions": [
                     {"field_id": "pain_score", "operator": "greater_than", "value": 0},
                     {"field_id": "pain_radiation", "operator": "equals", "value": "yes"},
                 ]},
            ],
        },
        # ── METABOLIC — 1 row: glucose timing + value (optional)
        {
            "id": "s_metabolic", "title": "Metabolic", "layout": 4,
            "fields": [
                {"id": "glucose_timing", "field_id": "glucose_timing", "type": "dropdown", "label": "Glucose Timing",
                 "col_span": 2, "searchable": True, "required": False,
                 "options": [
                     {"label": "Fasting", "value": "fasting"}, {"label": "Random", "value": "random"},
                     {"label": "Post-Prandial (1 h)", "value": "pp_1h"}, {"label": "Post-Prandial (2 h)", "value": "pp_2h"},
                     {"label": "Pre-Meal", "value": "pre_meal"}, {"label": "OGTT (1 h)", "value": "ogtt_1h"},
                     {"label": "OGTT (2 h)", "value": "ogtt_2h"},
                 ]},
                {"id": "blood_glucose", "field_id": "blood_glucose", "type": "number", "label": "Blood Glucose",
                 "unit": "mg/dL", "col_span": 1, "min": 20, "max": 600, "step": 1, "placeholder": "70–140",
                 "required": False, "reference_range": RR_GLUCOSE, "ref_range": RR_GLUCOSE},
            ],
        },
        # ── NOTES
        {
            "id": "s_notes", "title": "Notes", "layout": 1,
            "fields": [
                {"id": "notes", "field_id": "notes", "type": "textarea", "label": "Notes",
                 "col_span": 4, "required": False, "enable_dictation": True},
            ],
        },
    ]
}

# Nursing flowsheet (CareChart vitals board) reads these field_ids over time.
IVIEW_CONFIG = {
    "time_band": "4h",
    "row_config": [
        {"field_id": "bp_systolic",      "label": "BP Systolic",      "unit": "mmHg",  "ref_range": RR_BP_SYS},
        {"field_id": "bp_diastolic",     "label": "BP Diastolic",     "unit": "mmHg",  "ref_range": RR_BP_DIA},
        {"field_id": "heart_rate",       "label": "Heart Rate",       "unit": "/min",  "ref_range": RR_HR},
        {"field_id": "spo2",             "label": "SpO2",             "unit": "%",     "ref_range": RR_SPO2},
        {"field_id": "temperature",      "label": "Temperature",      "unit": "°C",    "ref_range": RR_TEMP},
        {"field_id": "respiratory_rate", "label": "Respiratory Rate", "unit": "/min",  "ref_range": RR_RR},
        {"field_id": "pain_score",       "label": "Pain Score",       "unit": "/10",   "ref_range": {"normal_low": 0, "normal_high": 3, "critical_high": 7}},
    ],
}

ALERT_RULES = [
    {"field_id": "bp_systolic",  "operator": "greater_than", "value": 180,  "severity": "critical", "message": "BP Systolic critically high"},
    {"field_id": "bp_systolic",  "operator": "less_than",    "value": 70,   "severity": "critical", "message": "BP Systolic critically low"},
    {"field_id": "spo2",         "operator": "less_than",    "value": 90,   "severity": "critical", "message": "SpO2 critically low"},
    {"field_id": "heart_rate",   "operator": "greater_than", "value": 150,  "severity": "critical", "message": "Heart rate critically high"},
    {"field_id": "heart_rate",   "operator": "less_than",    "value": 40,   "severity": "critical", "message": "Heart rate critically low"},
    {"field_id": "temperature",  "operator": "greater_than", "value": 39.5, "severity": "high",     "message": "High temperature — possible fever"},
    {"field_id": "blood_glucose","operator": "greater_than", "value": 400,  "severity": "critical", "message": "Blood glucose critically high"},
    {"field_id": "blood_glucose","operator": "less_than",    "value": 54,   "severity": "critical", "message": "Blood glucose critically low"},
    {"field_id": "pain_score",   "operator": "greater_than", "value": 7,    "severity": "high",     "message": "Severe pain score reported"},
]


def run():
    db = SessionLocal()
    try:
        # Find by title even if soft-deleted, so we revive & preserve submissions.
        form = db.query(AssessmentForm).filter(AssessmentForm.title == CANON_TITLE).first()
        now = datetime.utcnow()
        if form:
            form.description      = "Standard vital signs — the single vitals record used by reception, nursing and doctors, embeddable in any care form."
            form.category         = "vitals"
            form.subcategory      = "vital-signs"
            form.icon             = "🩺"
            form.schema           = SCHEMA
            form.iview_config     = IVIEW_CONFIG
            form.alert_rules      = ALERT_RULES
            form.is_iview_enabled = True
            form.is_template      = True
            form.status           = "published"
            form.clinic_id        = None
            form.deleted_at       = None   # revive if the retire step soft-deleted it
            if not form.published_at:
                form.published_at = now
            form.updated_at       = now
            db.commit()
            print(f"[vital-signs] Refreshed & revived canonical 'Vital Signs' (id={form.id}).")
        else:
            form = AssessmentForm(
                title=CANON_TITLE,
                description="Standard vital signs — the single vitals record used by reception, nursing and doctors, embeddable in any care form.",
                category="vitals", subcategory="vital-signs", icon="🩺",
                schema=SCHEMA, iview_config=IVIEW_CONFIG, alert_rules=ALERT_RULES,
                scoring_config=None, is_template=True, is_iview_enabled=True,
                status="published", clinic_id=None, version=1, published_at=now,
                created_at=now, updated_at=now,
            )
            db.add(form)
            db.flush()
            db.add(AssessmentFormVersion(form_id=form.id, version=1, schema=SCHEMA, published_at=now))
            db.commit()
            print(f"[vital-signs] Created canonical 'Vital Signs' (id={form.id}).")
    except Exception as e:  # noqa: BLE001
        db.rollback()
        print(f"[vital-signs] seed failed (non-fatal): {e}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
