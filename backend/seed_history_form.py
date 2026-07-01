#!/usr/bin/env python3
"""
Curated library — form #2: the canonical "Adult OPD History (Subjective)" form.

The Subjective (S) record of the SOAP encounter: chief complaint, HPI qualifiers,
past/surgical/family/social history, allergies and current medications, and a
gated Review of Systems. Built to docs/care-form-design-standard.md v3.0:

- Canonical field_ids ONLY (Master Field Registry): chief_complaint,
  complaint_duration, complaint_onset, past_medical_history, surgical_history,
  family_history, social_history, known_allergies, current_medications … Same
  concept = same id everywhere, so history stays portable across portals.
- Searchable dropdowns for onset/severity/timing (option count is not a limit).
- allergy_search / medication_search compound fields (never a plain text box).
- Algorithmic expansion: Review-of-Systems gate (yes_no) reveals its detail
  field only when the clinician flags a positive finding — the form grows down.
- Narrative fields carry dictation (mic). Label-left compact layout via col_span.

Idempotent: finds "Adult OPD History (Subjective)" by title (even if soft-
deleted), revives it, and refreshes its schema — charted submissions preserved.
Safe to re-run. Mirrors seed_vital_signs.py conventions exactly.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if not os.getenv("DATABASE_URL"):
    print("[history-form] DATABASE_URL not set — skipping")
    sys.exit(0)

from datetime import datetime
from app.db.session import SessionLocal
from app.models.models import AssessmentForm, AssessmentFormVersion

CANON_TITLE = "Adult OPD History (Subjective)"

# A yes_no gate that reveals a detail textarea when flagged positive.
def ros_gate(sys_id, label):
    return [
        {"id": f"ros_{sys_id}", "field_id": f"ros_{sys_id}", "type": "yes_no",
         "label": label, "col_span": 2, "display_style": "button_group",
         "options": [{"label": "Positive", "value": "yes"}, {"label": "Negative", "value": "no"}],
         "required": False},
        {"id": f"ros_{sys_id}_detail", "field_id": f"ros_{sys_id}_detail", "type": "textarea",
         "label": f"{label} — detail", "col_span": 4, "rows": 2, "enable_dictation": True,
         "required": False,
         "conditions": [{"field_id": f"ros_{sys_id}", "operator": "equals", "value": "yes"}]},
    ]

SCHEMA = {
    "sections": [
        # ── PRESENTING COMPLAINT — complaint full width, then qualifiers on one row
        {
            "id": "s_complaint", "title": "Presenting Complaint", "layout": 4,
            "fields": [
                {"id": "chief_complaint", "field_id": "chief_complaint", "type": "textarea",
                 "label": "Chief Complaint", "col_span": 4, "rows": 2, "enable_dictation": True,
                 "required": True,
                 "placeholder": "Patient's primary presenting complaint in their own words…"},
                {"id": "complaint_duration", "field_id": "complaint_duration", "type": "text",
                 "label": "Duration", "col_span": 1, "placeholder": "e.g. 3 days", "required": False},
                {"id": "complaint_onset", "field_id": "complaint_onset", "type": "dropdown",
                 "label": "Onset", "col_span": 1, "searchable": True, "required": False,
                 "options": [
                     {"label": "Sudden", "value": "sudden"}, {"label": "Gradual", "value": "gradual"},
                     {"label": "Episodic", "value": "episodic"},
                 ]},
                {"id": "complaint_severity", "field_id": "complaint_severity", "type": "dropdown",
                 "label": "Severity", "col_span": 1, "searchable": True, "required": False,
                 "options": [
                     {"label": "Mild", "value": "mild"}, {"label": "Moderate", "value": "moderate"},
                     {"label": "Severe", "value": "severe"},
                 ]},
                {"id": "complaint_timing", "field_id": "complaint_timing", "type": "dropdown",
                 "label": "Timing", "col_span": 1, "searchable": True, "required": False,
                 "options": [
                     {"label": "Constant", "value": "constant"}, {"label": "Intermittent", "value": "intermittent"},
                     {"label": "Worse in morning", "value": "morning"}, {"label": "Worse at night", "value": "night"},
                     {"label": "After meals", "value": "post_meal"}, {"label": "With activity", "value": "exertional"},
                 ]},
                {"id": "hpi_narrative", "field_id": "hpi_narrative", "type": "textarea",
                 "label": "History of Presenting Illness", "col_span": 4, "rows": 3,
                 "enable_dictation": True, "required": False,
                 "placeholder": "Chronological account — onset, progression, aggravating/relieving factors, associated symptoms…"},
            ],
        },
        # ── ALLERGIES & MEDICATIONS — compound search fields (permanent, auto-carry)
        {
            "id": "s_allergy_meds", "title": "Allergies & Medications", "layout": 4,
            "fields": [
                {"id": "known_allergies", "field_id": "known_allergies", "type": "allergy_search",
                 "label": "Known Allergies", "col_span": 2, "multi_select": True,
                 "include_severity": True, "include_reaction": True, "required": False,
                 "placeholder": "Search allergen…"},
                {"id": "current_medications", "field_id": "current_medications", "type": "medication_search",
                 "label": "Current Medications", "col_span": 2, "multi_select": True,
                 "required": False, "placeholder": "Search medication…"},
            ],
        },
        # ── PAST HISTORY — collapsible; narratives with dictation
        {
            "id": "s_history", "title": "Past History", "layout": 4, "collapsible": True,
            "fields": [
                {"id": "past_medical_history", "field_id": "past_medical_history", "type": "textarea",
                 "label": "Past Medical History", "col_span": 4, "rows": 2, "enable_dictation": True,
                 "required": False, "placeholder": "Chronic illnesses, prior admissions, comorbidities…"},
                {"id": "surgical_history", "field_id": "surgical_history", "type": "textarea",
                 "label": "Surgical History", "col_span": 4, "rows": 2, "enable_dictation": True,
                 "required": False, "placeholder": "Prior operations with dates…"},
                {"id": "family_history", "field_id": "family_history", "type": "textarea",
                 "label": "Family History", "col_span": 2, "rows": 2, "enable_dictation": True,
                 "required": False},
                {"id": "social_history", "field_id": "social_history", "type": "textarea",
                 "label": "Social History", "col_span": 2, "rows": 2, "enable_dictation": True,
                 "required": False, "placeholder": "Smoking, alcohol, occupation, living situation…"},
            ],
        },
        # ── REVIEW OF SYSTEMS — gated: each system flag reveals a detail box downward
        {
            "id": "s_ros", "title": "Review of Systems", "layout": 4, "collapsible": True, "collapsed": True,
            "fields": [
                *ros_gate("cardiac",      "Cardiovascular"),
                *ros_gate("respiratory",  "Respiratory"),
                *ros_gate("gi",           "Gastrointestinal"),
                *ros_gate("neuro",        "Neurological"),
                *ros_gate("gu",           "Genitourinary"),
                *ros_gate("msk",          "Musculoskeletal"),
            ],
        },
    ],
}


def run():
    db = SessionLocal()
    try:
        form = db.query(AssessmentForm).filter(AssessmentForm.title == CANON_TITLE).first()
        now = datetime.utcnow()
        desc = ("Subjective record — chief complaint, HPI, past/surgical/family/social "
                "history, allergies, current medications and review of systems.")
        if form:
            form.description      = desc
            form.category         = "history"
            form.subcategory      = "subjective"
            form.icon             = "📋"
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
            print(f"[history-form] Refreshed & revived canonical '{CANON_TITLE}' (id={form.id}).")
        else:
            form = AssessmentForm(
                title=CANON_TITLE, description=desc,
                category="history", subcategory="subjective", icon="📋",
                schema=SCHEMA, alert_rules=[], scoring_config=None,
                is_template=True, is_iview_enabled=False,
                status="published", clinic_id=None, version=1, published_at=now,
                created_at=now, updated_at=now,
            )
            db.add(form)
            db.flush()
            db.add(AssessmentFormVersion(form_id=form.id, version=1, schema=SCHEMA, published_at=now))
            db.commit()
            print(f"[history-form] Created canonical '{CANON_TITLE}' (id={form.id}).")
    except Exception as e:  # noqa: BLE001
        db.rollback()
        print(f"[history-form] seed failed (non-fatal): {e}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
