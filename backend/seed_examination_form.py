#!/usr/bin/env python3
"""
Curated library — form #3: the canonical "Adult OPD Examination (Objective)" form.

The Objective (O) record of the SOAP encounter (companion to Vital Signs): general
inspection, then a systematic systemic examination where each system is an
algorithmic gate — Normal/Abnormal → an Abnormal answer reveals the findings
dropdown + a narrative box downward. Built to docs/care-form-design-standard.md v3.0:

- Canonical field_ids ONLY (Master Field Registry): general_appearance,
  consciousness_level, pallor, icterus, cyanosis, clubbing, oedema,
  lymphadenopathy … plus per-system exam gates (cvs_exam, resp_exam, abdo_exam,
  cns_exam) and their finding sub-fields. Same concept = same id everywhere.
- Algorithmic expansion: each systemic gate (single_choice Normal/Abnormal)
  reveals its findings only when Abnormal — the form grows down, mirroring the
  clinical decision path, not a flat checklist.
- Inspection signs are yes_no button groups; a positive general sign reveals a
  qualifier. Searchable finding dropdowns (option count is not a limit).
- Narrative findings carry dictation (mic). Label-left compact layout via col_span.

Idempotent: finds the form by title (even if soft-deleted), revives it, and
refreshes its schema — charted submissions preserved. Mirrors seed_vital_signs.py.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if not os.getenv("DATABASE_URL"):
    print("[exam-form] DATABASE_URL not set — skipping")
    sys.exit(0)

from datetime import datetime
from app.db.session import SessionLocal
from app.models.models import AssessmentForm, AssessmentFormVersion

CANON_TITLE = "Adult OPD Examination (Objective)"


# A systemic exam gate: Normal/Abnormal single_choice → Abnormal reveals a
# searchable findings dropdown (multi) + a dictation narrative, growing downward.
def system_gate(sys_id, label, findings):
    show_if_abnormal = [{"field_id": f"{sys_id}_exam", "operator": "equals", "value": "abnormal"}]
    return [
        {"id": f"{sys_id}_exam", "field_id": f"{sys_id}_exam", "type": "single_choice",
         "label": label, "col_span": 2, "display_style": "button_group",
         "default_value": "normal", "required": False,
         "options": [{"label": "Normal", "value": "normal"}, {"label": "Abnormal", "value": "abnormal"}]},
        {"id": f"{sys_id}_findings", "field_id": f"{sys_id}_findings", "type": "dropdown",
         "label": f"{label} — findings", "col_span": 2, "searchable": True, "multi_select": True,
         "required": False, "conditions": show_if_abnormal,
         "options": [{"label": lbl, "value": val} for lbl, val in findings]},
        {"id": f"{sys_id}_note", "field_id": f"{sys_id}_note", "type": "textarea",
         "label": f"{label} — note", "col_span": 4, "rows": 2, "enable_dictation": True,
         "required": False, "conditions": show_if_abnormal},
    ]


# An inspection sign: yes_no → Yes reveals a short qualifier text.
def sign(sys_id, label):
    return {"id": sys_id, "field_id": sys_id, "type": "yes_no", "label": label,
            "col_span": 1, "display_style": "button_group", "required": False}


SCHEMA = {
    "sections": [
        # ── GENERAL INSPECTION — appearance + consciousness, then a row of signs
        {
            "id": "s_general", "title": "General Inspection", "layout": 4,
            "fields": [
                {"id": "general_appearance", "field_id": "general_appearance", "type": "textarea",
                 "label": "General Appearance", "col_span": 4, "rows": 2, "enable_dictation": True,
                 "required": False,
                 "placeholder": "e.g. Well-built, well-nourished, not in acute distress…"},
                {"id": "consciousness_level", "field_id": "consciousness_level", "type": "dropdown",
                 "label": "Consciousness (AVPU)", "col_span": 2, "searchable": True,
                 "default_value": "alert", "required": False,
                 "options": [
                     {"label": "Alert", "value": "alert"}, {"label": "Responds to Voice", "value": "verbal"},
                     {"label": "Responds to Pain", "value": "pain"}, {"label": "Unresponsive", "value": "unresponsive"},
                 ]},
                {"id": "hydration", "field_id": "hydration", "type": "dropdown",
                 "label": "Hydration", "col_span": 2, "searchable": True, "default_value": "adequate",
                 "required": False,
                 "options": [
                     {"label": "Adequate", "value": "adequate"}, {"label": "Mild dehydration", "value": "mild"},
                     {"label": "Moderate dehydration", "value": "moderate"}, {"label": "Severe dehydration", "value": "severe"},
                 ]},
                sign("pallor", "Pallor"),
                sign("icterus", "Icterus"),
                sign("cyanosis", "Cyanosis"),
                sign("clubbing", "Clubbing"),
                sign("oedema", "Oedema"),
                sign("lymphadenopathy", "Lymphadenopathy"),
            ],
        },
        # ── SYSTEMIC EXAMINATION — each system an algorithmic Normal/Abnormal gate
        {
            "id": "s_systemic", "title": "Systemic Examination", "layout": 4,
            "fields": [
                *system_gate("cvs", "Cardiovascular (CVS)", [
                    ("Murmur", "murmur"), ("Gallop (S3/S4)", "gallop"), ("Raised JVP", "raised_jvp"),
                    ("Muffled heart sounds", "muffled"), ("Irregular rhythm", "irregular"),
                    ("Pedal oedema", "pedal_oedema"),
                ]),
                *system_gate("resp", "Respiratory (RS)", [
                    ("Crepitations", "crepitations"), ("Rhonchi / wheeze", "rhonchi"),
                    ("Reduced air entry", "reduced_air_entry"), ("Bronchial breathing", "bronchial"),
                    ("Pleural rub", "pleural_rub"), ("Dull percussion note", "dull_note"),
                ]),
                *system_gate("abdo", "Abdomen (P/A)", [
                    ("Tenderness", "tenderness"), ("Guarding / rigidity", "guarding"),
                    ("Hepatomegaly", "hepatomegaly"), ("Splenomegaly", "splenomegaly"),
                    ("Ascites / free fluid", "ascites"), ("Palpable mass", "mass"),
                    ("Exaggerated bowel sounds", "bowel_sounds"),
                ]),
                *system_gate("cns", "Central Nervous System (CNS)", [
                    ("Focal neurological deficit", "focal_deficit"), ("Neck stiffness", "neck_stiffness"),
                    ("Altered tone", "tone"), ("Altered reflexes", "reflexes"),
                    ("Cranial nerve palsy", "cranial_nerve"), ("Abnormal plantar", "plantar"),
                ]),
            ],
        },
        # ── LOCAL / OTHER — free objective note for site-specific examination
        {
            "id": "s_local", "title": "Local / Other Examination", "layout": 1,
            "fields": [
                {"id": "local_examination", "field_id": "local_examination", "type": "textarea",
                 "label": "Local Examination", "col_span": 4, "rows": 3, "enable_dictation": True,
                 "required": False,
                 "placeholder": "Site-specific examination — inspection, palpation, percussion, auscultation…"},
            ],
        },
    ],
}


def run():
    db = SessionLocal()
    try:
        form = db.query(AssessmentForm).filter(AssessmentForm.title == CANON_TITLE).first()
        now = datetime.utcnow()
        desc = ("Objective record — general inspection and a systematic systemic "
                "examination with algorithmic Normal/Abnormal gates per system.")
        if form:
            form.description      = desc
            form.category         = "clinical"
            form.subcategory      = "objective"
            form.icon             = "🔍"
            form.schema           = SCHEMA
            form.alert_rules      = []
            form.is_iview_enabled = False
            form.is_template      = True
            form.status           = "published"
            form.clinic_id        = None
            form.deleted_at       = None
            if not form.published_at:
                form.published_at = now
            form.updated_at       = now
            db.commit()
            print(f"[exam-form] Refreshed & revived canonical '{CANON_TITLE}' (id={form.id}).")
        else:
            form = AssessmentForm(
                title=CANON_TITLE, description=desc,
                category="clinical", subcategory="objective", icon="🔍",
                schema=SCHEMA, alert_rules=[], scoring_config=None,
                is_template=True, is_iview_enabled=False,
                status="published", clinic_id=None, version=1, published_at=now,
                created_at=now, updated_at=now,
            )
            db.add(form)
            db.flush()
            db.add(AssessmentFormVersion(form_id=form.id, version=1, schema=SCHEMA, published_at=now))
            db.commit()
            print(f"[exam-form] Created canonical '{CANON_TITLE}' (id={form.id}).")
    except Exception as e:  # noqa: BLE001
        db.rollback()
        print(f"[exam-form] seed failed (non-fatal): {e}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
