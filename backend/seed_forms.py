import sys, os
sys.path.insert(0, os.path.dirname(__file__))

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    print("[forms] DATABASE_URL not set — skipping")
    sys.exit(0)

if "postgresql+asyncpg" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg", "postgresql")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.models import AssessmentForm, AssessmentFormVersion, FormPool
from datetime import datetime

engine = create_engine(DATABASE_URL, pool_pre_ping=True,
                       connect_args={"options": "-c prepared_statement_cache_size=0"})
Session = sessionmaker(bind=engine)

TEMPLATES = [
    {
        "title": "Vital Signs",
        "description": "Standard vital signs — the single vitals record used by reception, nursing and doctors, and embeddable in any care form.",
        "category": "vitals",
        "subcategory": "vital-signs",
        "icon": "🫐",
        "is_iview_enabled": True,
        "iview_config": {
            "time_band": "4h",
            "row_config": [
                {"field_id": "bp_systolic",      "label": "BP Systolic",      "unit": "mmHg",  "ref_range": {"critical_low": 70, "normal_low": 90, "normal_high": 140, "critical_high": 180}},
                {"field_id": "bp_diastolic",     "label": "BP Diastolic",     "unit": "mmHg",  "ref_range": {"critical_low": 40, "normal_low": 60, "normal_high": 90,  "critical_high": 120}},
                {"field_id": "heart_rate",       "label": "Heart Rate",       "unit": "/min",  "ref_range": {"critical_low": 40, "normal_low": 60, "normal_high": 100, "critical_high": 150}},
                {"field_id": "spo2",             "label": "SpO2",             "unit": "%",     "ref_range": {"critical_low": 85, "normal_low": 95, "normal_high": 100}},
                {"field_id": "temperature",      "label": "Temperature",      "unit": "°C",    "ref_range": {"critical_low": 35, "normal_low": 36.1, "normal_high": 37.2, "critical_high": 39.5}},
                {"field_id": "respiratory_rate", "label": "Respiratory Rate", "unit": "/min",  "ref_range": {"critical_low": 8,  "normal_low": 12,  "normal_high": 20,  "critical_high": 30}},
                {"field_id": "pain_score",       "label": "Pain Score",       "unit": "/10",   "ref_range": {"normal_low": 0, "normal_high": 3, "critical_high": 7}},
            ],
        },
        "alert_rules": [
            {"field_id": "bp_systolic",  "operator": "greater_than", "value": 180, "severity": "critical", "message": "BP Systolic critically high"},
            {"field_id": "bp_systolic",  "operator": "less_than",    "value": 70,  "severity": "critical", "message": "BP Systolic critically low"},
            {"field_id": "spo2",         "operator": "less_than",    "value": 90,  "severity": "critical", "message": "SpO2 critically low"},
            {"field_id": "heart_rate",   "operator": "greater_than", "value": 150, "severity": "critical", "message": "Heart rate critically high"},
            {"field_id": "heart_rate",   "operator": "less_than",    "value": 40,  "severity": "critical", "message": "Heart rate critically low"},
            {"field_id": "temperature",  "operator": "greater_than", "value": 39.5,"severity": "high",     "message": "High temperature — possible fever"},
            {"field_id": "pain_score",   "operator": "greater_than", "value": 7,   "severity": "high",     "message": "Severe pain score reported"},
        ],
        "scoring_config": None,
        "schema": {"sections": [{"id": "vital_signs", "title": "Vital Signs", "layout": {"columns": 2}, "fields": [
            {"id": "bp_systolic", "field_id": "bp_systolic", "type": "number", "label": "BP Systolic", "unit": "mmHg", "required": True, "min": 0, "max": 300, "reference_range": {"critical_low": 70, "normal_low": 90, "normal_high": 140, "critical_high": 180}, "ref_range": {"critical_low": 70, "normal_low": 90, "normal_high": 140, "critical_high": 180}},
            {"id": "bp_diastolic", "field_id": "bp_diastolic", "type": "number", "label": "BP Diastolic", "unit": "mmHg", "required": True, "min": 0, "max": 200, "reference_range": {"critical_low": 40, "normal_low": 60, "normal_high": 90, "critical_high": 120}, "ref_range": {"critical_low": 40, "normal_low": 60, "normal_high": 90, "critical_high": 120}},
            {"id": "heart_rate", "field_id": "heart_rate", "type": "number", "label": "Heart Rate", "unit": "/min", "required": True, "min": 0, "max": 300, "reference_range": {"critical_low": 40, "normal_low": 60, "normal_high": 100, "critical_high": 150}, "ref_range": {"critical_low": 40, "normal_low": 60, "normal_high": 100, "critical_high": 150}},
            {"id": "respiratory_rate", "field_id": "respiratory_rate", "type": "number", "label": "Respiratory Rate", "unit": "/min", "required": True, "min": 0, "max": 80, "reference_range": {"critical_low": 8, "normal_low": 12, "normal_high": 20, "critical_high": 30}, "ref_range": {"critical_low": 8, "normal_low": 12, "normal_high": 20, "critical_high": 30}},
            {"id": "spo2", "field_id": "spo2", "type": "number", "label": "SpO₂", "unit": "%", "required": True, "min": 0, "max": 100, "reference_range": {"critical_low": 85, "normal_low": 95, "normal_high": 100}, "ref_range": {"critical_low": 85, "normal_low": 95, "normal_high": 100}},
            {"id": "temperature", "field_id": "temperature", "type": "number", "label": "Temperature", "unit": "°C", "decimal_places": 1, "step": 0.1, "required": True, "min": 25, "max": 45, "reference_range": {"critical_low": 35, "normal_low": 36.1, "normal_high": 37.2, "critical_high": 39.5}, "ref_range": {"critical_low": 35, "normal_low": 36.1, "normal_high": 37.2, "critical_high": 39.5}},
            {"id": "weight", "field_id": "weight", "type": "number", "label": "Weight", "unit": "kg", "decimal_places": 1, "step": 0.1, "required": False, "min": 0, "max": 500},
            {"id": "height", "field_id": "height", "type": "number", "label": "Height", "unit": "cm", "required": False, "min": 0, "max": 300},
            {"id": "bmi", "field_id": "bmi", "type": "calculated", "label": "BMI", "unit": "kg/m²", "formula": "{weight} / (({height} / 100) * ({height} / 100))", "decimal_places": 1},
            {"id": "pain_score", "field_id": "pain_score", "type": "scale", "label": "Pain Score", "min": 0, "max": 10, "left_label": "No Pain", "right_label": "Worst Pain", "scale_style": "nrs", "required": True},
            {"id": "pain_location", "field_id": "pain_location", "type": "body_site_search", "search_category": "anatomy", "label": "Pain Location", "placeholder": "Search body site…", "required": False, "conditions": [{"field_id": "pain_score", "operator": "greater_than", "value": 0}]},
            {"id": "notes", "field_id": "notes", "type": "textarea", "label": "Notes", "required": False}
        ]}]},
    },
    {
        "title": "PHQ-9 Depression Screening",
        "description": "Patient Health Questionnaire — 9-item depression screening tool.",
        "category": "mental_health",
        "icon": "🧠",
        "is_iview_enabled": False, "iview_config": None,
        "alert_rules": [{"field_id": "phq9", "operator": "greater_than", "value": 0, "severity": "critical", "message": "Patient reports self-harm thoughts — safety assessment required"}],
        "scoring_config": {"type": "PHQ-9", "fields_to_sum": ["phq1","phq2","phq3","phq4","phq5","phq6","phq7","phq8","phq9"], "score_field": "phq_total", "bands": [{"min": 0, "max": 4, "label": "Minimal", "color": "green", "action": "Monitor"}, {"min": 5, "max": 9, "label": "Mild", "color": "yellow", "action": "Watchful waiting"}, {"min": 10, "max": 14, "label": "Moderate", "color": "orange", "action": "Consider treatment"}, {"min": 15, "max": 19, "label": "Moderately Severe", "color": "red", "action": "Active treatment"}, {"min": 20, "max": 27, "label": "Severe", "color": "critical", "action": "Immediate psychiatric referral"}]},
        "schema": {"sections": [{"id": "phq9_questions", "title": "Over the last 2 weeks, how often have you been bothered by any of the following problems?", "fields": [{"id": "phq1", "field_id": "phq1", "type": "radio", "label": "1. Little interest or pleasure in doing things", "required": True, "options": [{"label": "Not at all", "value": 0}, {"label": "Several days", "value": 1}, {"label": "More than half the days", "value": 2}, {"label": "Nearly every day", "value": 3}]}, {"id": "phq2", "field_id": "phq2", "type": "radio", "label": "2. Feeling down, depressed, or hopeless", "required": True, "options": [{"label": "Not at all", "value": 0}, {"label": "Several days", "value": 1}, {"label": "More than half the days", "value": 2}, {"label": "Nearly every day", "value": 3}]}, {"id": "phq9", "field_id": "phq9", "type": "radio", "label": "9. Thoughts that you would be better off dead", "required": True, "options": [{"label": "Not at all", "value": 0}, {"label": "Several days", "value": 1}, {"label": "More than half the days", "value": 2}, {"label": "Nearly every day", "value": 3}]}, {"id": "phq_total", "field_id": "phq_total", "type": "calculated", "label": "PHQ-9 Total Score", "formula": "{phq1} + {phq2} + {phq3} + {phq4} + {phq5} + {phq6} + {phq7} + {phq8} + {phq9}"}]}]},
    },
    {
        "title": "GAD-7 Anxiety Screening",
        "description": "Generalized Anxiety Disorder — 7-item anxiety screening tool.",
        "category": "mental_health", "icon": "😰",
        "is_iview_enabled": False, "iview_config": None, "alert_rules": [],
        "scoring_config": {"type": "GAD-7", "fields_to_sum": ["gad1","gad2","gad3","gad4","gad5","gad6","gad7"], "score_field": "gad_total", "bands": [{"min": 0, "max": 4, "label": "Minimal", "color": "green", "action": "Monitor"}, {"min": 5, "max": 9, "label": "Mild", "color": "yellow", "action": "Watchful waiting"}, {"min": 10, "max": 14, "label": "Moderate", "color": "orange", "action": "Consider treatment"}, {"min": 15, "max": 21, "label": "Severe", "color": "red", "action": "Psychiatric referral"}]},
        "schema": {"sections": [{"id": "gad7_questions", "title": "GAD-7", "fields": [{"id": "gad_total", "field_id": "gad_total", "type": "calculated", "label": "GAD-7 Total Score", "formula": "{gad1} + {gad2} + {gad3} + {gad4} + {gad5} + {gad6} + {gad7}"}]}]},
    },
    {
        "title": "Glasgow Coma Scale (GCS)",
        "description": "Standardised neurological scale to assess conscious level in acute settings.",
        "category": "safety", "icon": "🧠",
        "is_iview_enabled": True,
        "iview_config": {"time_band": "4h", "row_config": [{"field_id": "gcs_eye", "label": "Eye Opening", "unit": "/4"}, {"field_id": "gcs_verbal", "label": "Verbal Response", "unit": "/5"}, {"field_id": "gcs_motor", "label": "Motor Response", "unit": "/6"}, {"field_id": "gcs_total", "label": "GCS Total", "unit": "/15", "ref_range": {"critical_low": 8, "normal_low": 13, "normal_high": 15}}]},
        "alert_rules": [{"field_id": "gcs_total", "operator": "less_than", "value": 8, "severity": "critical", "message": "Severe GCS — airway management and urgent neurology"}],
        "scoring_config": {"type": "GCS", "fields_to_sum": ["gcs_eye","gcs_verbal","gcs_motor"], "score_field": "gcs_total", "bands": [{"min": 13, "max": 15, "label": "Mild", "color": "green", "action": "Monitor"}, {"min": 9, "max": 12, "label": "Moderate", "color": "yellow", "action": "Urgent review"}, {"min": 3, "max": 8, "label": "Severe", "color": "red", "action": "Immediate intervention"}]},
        "schema": {"sections": [{"id": "gcs_motor_section", "title": "Motor Response", "fields": [{"id": "gcs_eye", "field_id": "gcs_eye", "type": "radio", "label": "Eye Opening Response", "required": True, "options": [{"label": "Spontaneous (4)", "value": 4}, {"label": "To voice (3)", "value": 3}, {"label": "To pain (2)", "value": 2}, {"label": "None (1)", "value": 1}]}, {"id": "gcs_verbal", "field_id": "gcs_verbal", "type": "radio", "label": "Verbal Response", "required": True, "options": [{"label": "Oriented (5)", "value": 5}, {"label": "Confused (4)", "value": 4}, {"label": "None (1)", "value": 1}]}, {"id": "gcs_motor", "field_id": "gcs_motor", "type": "radio", "label": "Motor Response", "required": True, "options": [{"label": "Obeys commands (6)", "value": 6}, {"label": "None (1)", "value": 1}]}, {"id": "gcs_total", "field_id": "gcs_total", "type": "calculated", "label": "GCS Total Score", "formula": "{gcs_eye} + {gcs_verbal} + {gcs_motor}"}]}]},
    },
    {
        "title": "Morse Fall Risk Scale",
        "description": "Validated tool for assessing patient fall risk in hospital settings.",
        "category": "safety", "icon": "⚠️",
        "is_iview_enabled": False, "iview_config": None, "alert_rules": [],
        "scoring_config": {"type": "Morse", "fields_to_sum": ["history_of_falls","secondary_diagnosis","ambulatory_aid","iv_access","gait","mental_status"], "score_field": "morse_total", "bands": [{"min": 0, "max": 24, "label": "Low Risk", "color": "green", "action": "Standard care"}, {"min": 25, "max": 44, "label": "Medium Risk", "color": "yellow", "action": "Fall prevention measures"}, {"min": 45, "max": 125, "label": "High Risk", "color": "red", "action": "Intensive fall prevention"}]},
        "schema": {"sections": [{"id": "morse_section", "title": "Morse Fall Risk Assessment", "fields": [{"id": "morse_total", "field_id": "morse_total", "type": "calculated", "label": "Morse Fall Score Total", "formula": "{history_of_falls} + {secondary_diagnosis} + {ambulatory_aid} + {iv_access} + {gait} + {mental_status}"}]}]},
    },
    {
        "title": "APGAR Score",
        "description": "Neonatal APGAR scoring tool assessed at 1 minute and 5 minutes after birth.",
        "category": "vitals", "icon": "👶",
        "is_iview_enabled": False, "iview_config": None,
        "alert_rules": [{"field_id": "apgar_total", "operator": "less_than", "value": 4, "severity": "critical", "message": "Low APGAR — immediate neonatal resuscitation"}],
        "scoring_config": {"type": "APGAR", "fields_to_sum": ["appearance","pulse","grimace","activity","respiration"], "score_field": "apgar_total", "bands": [{"min": 7, "max": 10, "label": "Normal", "color": "green", "action": "Routine care"}, {"min": 4, "max": 6, "label": "Moderately Depressed", "color": "yellow", "action": "Stimulation and O2"}, {"min": 0, "max": 3, "label": "Severely Depressed", "color": "red", "action": "Immediate resuscitation"}]},
        "schema": {"sections": [{"id": "apgar_section", "title": "APGAR Score Assessment", "fields": [{"id": "apgar_total", "field_id": "apgar_total", "type": "calculated", "label": "APGAR Total Score", "formula": "{appearance} + {pulse} + {grimace} + {activity} + {respiration}"}]}]},
    },
    {
        "title": "Comprehensive Pain Assessment",
        "description": "Detailed multi-dimensional pain assessment.",
        "category": "pain", "icon": "🩹",
        "is_iview_enabled": False, "iview_config": None,
        "alert_rules": [{"field_id": "pain_nrs", "operator": "greater_than", "value": 7, "severity": "critical", "message": "Severe pain — immediate pain management review"}],
        "scoring_config": None,
        "schema": {"sections": [{"id": "pain_details", "title": "Pain Details", "fields": [{"id": "pain_nrs", "field_id": "pain_nrs", "type": "scale", "label": "Pain Intensity (NRS)", "min": 0, "max": 10, "required": True}]}]},
    },
    {
        "title": "Wound & Pressure Injury Assessment",
        "description": "Comprehensive wound and pressure injury assessment tool.",
        "category": "general", "icon": "🩹",
        "is_iview_enabled": True,
        "iview_config": {"time_band": "24h", "row_config": [{"field_id": "wound_area", "label": "Wound Area", "unit": "cm²"}, {"field_id": "pain_score", "label": "Pain Score", "unit": "/10"}]},
        "alert_rules": [], "scoring_config": None,
        "schema": {"sections": [{"id": "wound_details", "title": "Wound Details", "fields": [{"id": "wound_type", "field_id": "wound_type", "type": "radio", "label": "Wound Type", "required": False, "options": [{"label": "Pressure injury", "value": "Pressure injury"}, {"label": "Surgical", "value": "surgical"}, {"label": "Other", "value": "other"}]}]}]},
    },
]


def seed():
    db = Session()
    try:
        seeded = 0
        for tpl in TEMPLATES:
            existing = db.query(AssessmentForm).filter_by(title=tpl['title'], is_template=True).first()
            if existing:
                print(f"  [skip] {tpl['title']}")
                continue
            form = AssessmentForm(
                title=tpl['title'],
                description=tpl.get('description', ''),
                category=tpl.get('category', 'general'),
                icon=tpl.get('icon'),
                schema=tpl['schema'],
                scoring_config=tpl.get('scoring_config'),
                iview_config=tpl.get('iview_config'),
                alert_rules=tpl.get('alert_rules', []),
                subcategory=tpl.get('subcategory'),
                is_template=True,
                is_iview_enabled=tpl.get('is_iview_enabled', False),
                requires_cosign=tpl.get('requires_cosign', False),
                status='published',
                version=1,
                published_at=datetime.utcnow(),
            )
            db.add(form)
            db.flush()
            db.add(AssessmentFormVersion(
                form_id=form.id,
                version=1,
                schema=tpl['schema'],
                scoring_config=tpl.get('scoring_config'),
                published_at=datetime.utcnow(),
            ))
            db.add(FormPool(form_id=form.id, clinic_id=None, is_active=True))
            seeded += 1
            print(f"  [seeded] {tpl['title']}")
        db.commit()
        print(f'[forms] Seeded {seeded} templates.')
    except Exception as e:
        db.rollback()
        print(f'[forms] Seed failed: {e}')
        import traceback; traceback.print_exc()
    finally:
        db.close()


if __name__ == '__main__':
    seed()
