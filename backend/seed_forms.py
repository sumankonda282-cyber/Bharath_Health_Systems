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
        "title": "Vitals Assessment",
        "description": "Comprehensive vital signs assessment including BP, HR, SpO2, temperature, respiratory rate, and pain score.",
        "category": "vitals",
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
        "schema": {"sections": [{"id": "vital_signs", "title": "Vital Signs", "layout": {"columns": 2}, "fields": [{"id": "bp_systolic", "field_id": "bp_systolic", "type": "number", "label": "BP Systolic", "unit": "mmHg", "required": True, "ref_range": {"critical_low": 70, "normal_low": 90, "normal_high": 140, "critical_high": 180}}, {"id": "bp_diastolic", "field_id": "bp_diastolic", "type": "number", "label": "BP Diastolic", "unit": "mmHg", "required": True, "ref_range": {"critical_low": 40, "normal_low": 60, "normal_high": 90, "critical_high": 120}}, {"id": "heart_rate", "field_id": "heart_rate", "type": "number", "label": "Heart Rate", "unit": "/min", "required": True, "ref_range": {"critical_low": 40, "normal_low": 60, "normal_high": 100, "critical_high": 150}}, {"id": "respiratory_rate", "field_id": "respiratory_rate", "type": "number", "label": "Respiratory Rate", "unit": "/min", "required": True, "ref_range": {"critical_low": 8, "normal_low": 12, "normal_high": 20, "critical_high": 30}}, {"id": "spo2", "field_id": "spo2", "type": "number", "label": "SpO2", "unit": "%", "required": True, "ref_range": {"critical_low": 85, "normal_low": 95, "normal_high": 100}}, {"id": "temperature", "field_id": "temperature", "type": "number", "label": "Temperature", "unit": "°C", "decimal_places": 1, "required": True, "ref_range": {"critical_low": 35, "normal_low": 36.1, "normal_high": 37.2, "critical_high": 39.5}}, {"id": "weight", "field_id": "weight", "type": "number", "label": "Weight", "unit": "kg", "decimal_places": 1, "required": False}, {"id": "height", "field_id": "height", "type": "number", "label": "Height", "unit": "cm", "required": False}, {"id": "bmi", "field_id": "bmi", "type": "calculated", "label": "BMI", "unit": "kg/m²", "formula": "{weight} / (({height} / 100) * ({height} / 100))", "decimal_places": 1}, {"id": "pain_score", "field_id": "pain_score", "type": "scale", "label": "Pain Score", "min": 0, "max": 10, "left_label": "No Pain", "right_label": "Worst Pain", "scale_style": "nrs", "required": True}, {"id": "pain_location", "field_id": "pain_location", "type": "text", "label": "Pain Location", "required": False, "conditions": [{"field_id": "pain_score", "operator": "greater_than", "value": 0}]}, {"id": "notes", "field_id": "notes", "type": "textarea", "label": "Notes", "required": False}]}]},
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
        "title": "Nursing Admission Assessment",
        "description": "Comprehensive nursing admission assessment.",
        "category": "admission", "icon": "🏥",
        "is_iview_enabled": False, "iview_config": None, "alert_rules": [], "scoring_config": None,
        "schema": {"sections": [{"id": "chief_complaint_history", "title": "Chief Complaint & History", "fields": [{"id": "chief_complaint", "field_id": "chief_complaint", "type": "textarea", "label": "Chief Complaint", "required": True}]}]},
    },
    {
        "title": "SOAP Note Structured",
        "description": "Structured SOAP clinical documentation form.",
        "category": "general", "icon": "📋",
        "is_iview_enabled": False, "iview_config": None, "alert_rules": [], "scoring_config": None,
        "schema": {"sections": [{"id": "subjective", "title": "Subjective", "fields": [{"id": "chief_complaint", "field_id": "chief_complaint", "type": "textarea", "label": "Chief Complaint", "required": True}]}, {"id": "objective", "title": "Objective", "fields": []}, {"id": "assessment", "title": "Assessment", "fields": [{"id": "primary_diagnosis", "field_id": "primary_diagnosis", "type": "text", "label": "Primary Diagnosis", "required": True}]}, {"id": "plan", "title": "Plan", "fields": []}]},
    },
    {
        "title": "Discharge Checklist",
        "description": "Structured discharge documentation.",
        "category": "discharge", "icon": "🏠",
        "is_iview_enabled": False, "iview_config": None, "requires_cosign": True, "alert_rules": [], "scoring_config": None,
        "schema": {"sections": [{"id": "clinical_summary", "title": "Clinical Summary", "fields": [{"id": "discharge_diagnosis", "field_id": "discharge_diagnosis", "type": "text", "label": "Discharge Diagnosis", "required": True}]}]},
    },
    {
        "title": "Pre-Operative Assessment",
        "description": "Pre-operative anaesthesia and surgical risk assessment form.",
        "category": "surgery", "icon": "🔬",
        "is_iview_enabled": False, "iview_config": None, "requires_cosign": True, "alert_rules": [], "scoring_config": None,
        "schema": {"sections": [{"id": "procedure_history", "title": "Procedure & History", "fields": [{"id": "procedure_planned", "field_id": "procedure_planned", "type": "text", "label": "Procedure Planned", "required": True}]}]},
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
    {"title": "Vital Signs Assessment", "description": "Comprehensive vital signs with BP, HR, SpO₂, RR, Temp, weight & BMI.", "category": "vitals", "subcategory": "vital-signs", "icon": "🫐", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Pain Assessment (Clinical)", "description": "NRS 0–10, site, character, onset, radiation.", "category": "pain", "subcategory": "pain-assessment", "icon": "🩹", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Asthma Control Assessment", "description": "Spirometry, peak flow, ACT auto-score.", "category": "respiratory", "subcategory": "asthma-basic", "icon": "🫑", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Allergies & Adverse Reactions", "description": "Drug, food, environmental & latex allergies.", "category": "history", "subcategory": "allergies", "icon": "⚠️", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Medical History", "description": "Past medical history, surgical history.", "category": "history", "subcategory": "medical-history", "icon": "📋", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Family History", "description": "Familial diseases across three generations.", "category": "history", "subcategory": "family-history", "icon": "👨‍👩‍👧", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Social History", "description": "Occupation, tobacco, alcohol, substance use.", "category": "history", "subcategory": "social-history", "icon": "🏠", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Systems Review", "description": "14-system review of systems.", "category": "systems", "subcategory": "systems-review", "icon": "🔍", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Patient Profile & Demographics", "description": "Demographics, contact details, NOK.", "category": "admission", "subcategory": "patient-profile", "icon": "🪹", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Chief Complaint", "description": "Presenting complaint in patient's own words.", "category": "admission", "subcategory": "chief-complaint", "icon": "💬", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Clinical Examination", "description": "Full structured clinical examination.", "category": "systems", "subcategory": "systems-clinical-exam", "icon": "🩺", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Clinical Impression & Plan", "description": "Working diagnosis, differential diagnoses.", "category": "systems", "subcategory": "systems-clinical-impression", "icon": "💡", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Systems Pain Assessment", "description": "Systems-specific pain assessment.", "category": "systems", "subcategory": "systems-pain", "icon": "🩹", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Systems Review (Full)", "description": "Extended multi-system review.", "category": "systems", "subcategory": "systems-review-full", "icon": "📊", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "ACS (Acute Coronary Syndrome) Assessment", "description": "TIMI/GRACE risk, ECG findings.", "category": "cardiology", "subcategory": "cardiology-acs", "icon": "❤️", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Atrial Fibrillation Assessment", "description": "CHA₂DS₂-VASc auto-score.", "category": "cardiology", "subcategory": "cardiology-af", "icon": "💓", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Cardiomyopathy Assessment", "description": "NYHA class, Echo parameters.", "category": "cardiology", "subcategory": "cardiology-cardiomyopathy", "icon": "🫐", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Chest Pain Assessment", "description": "HEART score auto-calculation.", "category": "cardiology", "subcategory": "cardiology-chest-pain", "icon": "💔", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Dyslipidemia Assessment", "description": "Lipid profile, ASCVD 10-year risk.", "category": "cardiology", "subcategory": "cardiology-dyslipidemia", "icon": "🧪", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Heart Failure Assessment", "description": "HFrEF/HFmrEF/HFpEF classification.", "category": "cardiology", "subcategory": "cardiology-heart-failure", "icon": "💊", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Hypertension Assessment", "description": "JNC/ESC staging, ABPM review.", "category": "cardiology", "subcategory": "cardiology-hypertension", "icon": "📈", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Pericardial Disease Assessment", "description": "Acute pericarditis, effusion sizing.", "category": "cardiology", "subcategory": "cardiology-pericardial", "icon": "🫑", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Rheumatic Heart Disease Assessment", "description": "Jones criteria, streptococcal serology.", "category": "cardiology", "subcategory": "cardiology-rhd", "icon": "🦠", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Valvular Heart Disease Assessment", "description": "Valve lesion grading, Echo Doppler data.", "category": "cardiology", "subcategory": "cardiology-valvular", "icon": "🔬", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Asthma Control Test (ACT)", "description": "5-item ACT auto-score 5–25.", "category": "clinical", "subcategory": "clinical-act", "icon": "🌬️", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "ADHD Rating Scale", "description": "DSM-5 inattention + hyperactivity/impulsivity.", "category": "clinical", "subcategory": "clinical-adhd", "icon": "🧠", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "ALSFRS-R (ALS Functional Rating Scale)", "description": "48-item 12-domain ALS functional rating.", "category": "clinical", "subcategory": "clinical-alsfrs", "icon": "⚡", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "ASRS ADHD Screener", "description": "18-item Adult ADHD Self-Report Scale.", "category": "clinical", "subcategory": "clinical-asrs", "icon": "📝", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Migraine & Headache Assessment", "description": "ICHD-3 classification, MIDAS disability score.", "category": "clinical", "subcategory": "clinical-migraine", "icon": "🤕", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Ear Assessment", "description": "Rinne/Weber auto-interpretation.", "category": "ent", "subcategory": "ent-ear", "icon": "👂", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Nose & Sinus Assessment", "description": "SNOT-22 22-item 0–110 auto-severity.", "category": "ent", "subcategory": "ent-nose-sinus", "icon": "👃", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Throat & Larynx Assessment", "description": "McIsaac auto-score, VHI-10 dysphonia.", "category": "ent", "subcategory": "ent-throat-larynx", "icon": "🗣️", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Head & Neck Assessment", "description": "TNM AJCC 8th edition staging.", "category": "ent", "subcategory": "ent-head-neck", "icon": "🦬", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Audiology & Hearing Assessment", "description": "8-frequency PTA grid.", "category": "ent", "subcategory": "ent-audiology", "icon": "🎧", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Facial Nerve Assessment", "description": "House-Brackmann I–VI auto-description.", "category": "ent", "subcategory": "ent-facial-nerve", "icon": "😐", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Paediatric ENT Assessment", "description": "Button battery EMERGENCY protocol.", "category": "ent", "subcategory": "ent-paediatric", "icon": "👶", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Tracheostomy Assessment", "description": "Full tube inventory, cuff pressure.", "category": "ent", "subcategory": "ent-tracheostomy", "icon": "🫑", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Acute Abdomen Assessment", "description": "Alvarado score (appendicitis).", "category": "gastro", "subcategory": "gastro-acute-abdomen", "icon": "🏥", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Acute Pancreatitis Assessment", "description": "Ranson criteria auto-score.", "category": "gastro", "subcategory": "gastro-acute-pancreatitis", "icon": "🔥", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Anorectal Disorders Assessment", "description": "Haemorrhoid grading.", "category": "gastro", "subcategory": "gastro-anorectal", "icon": "🩺", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Biliary & Gallstone Assessment", "description": "Charcot's triad, Reynolds pentad.", "category": "gastro", "subcategory": "gastro-biliary", "icon": "🟡", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Chronic Pancreatitis Assessment", "description": "Manchester classification.", "category": "gastro", "subcategory": "gastro-chronic-pancreatitis", "icon": "🔴", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Dysphagia & Esophageal Assessment", "description": "Ogilvie dysphagia grade.", "category": "gastro", "subcategory": "gastro-dysphagia", "icon": "🍽️", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Functional GI Disorder Assessment", "description": "Rome IV criteria for IBS/FD/bloating.", "category": "gastro", "subcategory": "gastro-functional", "icon": "🫑", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "GI Bleed Assessment", "description": "Rockball pre- and post-endoscopy.", "category": "gastro", "subcategory": "gastro-gi-bleed", "icon": "🩸", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "GI Cancer Assessment", "description": "AJCC TNM staging for CRC/gastric.", "category": "gastro", "subcategory": "gastro-gi-cancer", "icon": "🎗️", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Gastroparesis & Motility Assessment", "description": "GCSI auto-score.", "category": "gastro", "subcategory": "gastro-gastroparesis", "icon": "⏳", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Inflammatory Bowel Disease Assessment", "description": "CDAI/HBI auto-score.", "category": "gastro", "subcategory": "gastro-ibd", "icon": "🔥", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Liver Disease Assessment", "description": "Child-Pugh auto-score + class.", "category": "gastro", "subcategory": "gastro-liver", "icon": "🍺", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Peptic Ulcer & GERD Assessment", "description": "GERD-Q score, H. pylori status.", "category": "gastro", "subcategory": "gastro-peptic-ulcer", "icon": "🔴", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "ANC Follow-up", "description": "Fundal height, fetal movements.", "category": "obg", "subcategory": "obg-anc-followup", "icon": "🤰", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Antenatal Booking Assessment", "description": "Obstetric history, LMP/EDD.", "category": "obg", "subcategory": "obg-antenatal", "icon": "📅", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Cervical Screening & Colposcopy", "description": "Pap smear Bethesda reporting.", "category": "obg", "subcategory": "obg-cervical", "icon": "🔬", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Female Infertility Assessment", "description": "Ovarian reserve (AMH/AFC).", "category": "obg", "subcategory": "obg-infertility", "icon": "🌸", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Gestational Diabetes Assessment", "description": "75g OGTT interpretation.", "category": "obg", "subcategory": "obg-gdm", "icon": "🍬", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "High-Risk Pregnancy Assessment", "description": "Risk factor scoring.", "category": "obg", "subcategory": "obg-high-risk", "icon": "⚠️", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Labour & Delivery Assessment", "description": "Bishop score auto-calc, partograph.", "category": "obg", "subcategory": "obg-labour", "icon": "👶", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Menopause Assessment", "description": "MRS symptom score, FSH/LH/E2 values.", "category": "obg", "subcategory": "obg-menopause", "icon": "🌡️", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Menstrual Disorder Assessment", "description": "PALM-COEIN classification.", "category": "obg", "subcategory": "obg-menstrual", "icon": "📆", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "PCOS Assessment", "description": "Rotterdam criteria.", "category": "obg", "subcategory": "obg-pcos", "icon": "🔵", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Pelvic Inflammatory Disease Assessment", "description": "CDC minimum criteria.", "category": "obg", "subcategory": "obg-pid", "icon": "🦠", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Postpartum Assessment", "description": "Edinburgh PND Scale auto-score.", "category": "obg", "subcategory": "obg-postpartum", "icon": "💕", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Preeclampsia & Hypertensive Disorders Assessment", "description": "ISSHP classification.", "category": "obg", "subcategory": "obg-preeclampsia", "icon": "🩺", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Acute Compartment Syndrome Assessment", "description": "Compartment pressure measurement.", "category": "orthopedic", "subcategory": "ortho-compartment-syndrome", "icon": "🦵", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Fracture & Trauma Assessment", "description": "AO/OTA classification.", "category": "orthopedic", "subcategory": "ortho-fracture", "icon": "🦴", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Musculoskeletal Pain Assessment", "description": "Widespread pain index.", "category": "orthopedic", "subcategory": "ortho-msk-pain", "icon": "🩹", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Elbow Assessment", "description": "Mayo elbow performance score.", "category": "orthopedic", "subcategory": "ortho-elbow", "icon": "💪", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Foot & Ankle Assessment", "description": "AOFAS score.", "category": "orthopedic", "subcategory": "ortho-foot-ankle", "icon": "🦶", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Hand & Wrist Assessment", "description": "DASH score, grip strength.", "category": "orthopedic", "subcategory": "ortho-hand-wrist", "icon": "✋", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Hip Assessment", "description": "Harris Hip Score.", "category": "orthopedic", "subcategory": "ortho-hip", "icon": "🦿", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Knee Assessment", "description": "KOOS/WOMAC auto-score.", "category": "orthopedic", "subcategory": "ortho-knee", "icon": "🦵", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Septic Arthritis & Osteomyelitis Assessment", "description": "Kocher criteria auto-score.", "category": "orthopedic", "subcategory": "ortho-septic-arthritis", "icon": "🦠", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Shoulder Assessment", "description": "Oxford shoulder score.", "category": "orthopedic", "subcategory": "ortho-shoulder", "icon": "💪", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Orthopedic Tumor Assessment", "description": "Enneking surgical staging.", "category": "orthopedic", "subcategory": "ortho-tumor", "icon": "🎗️", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Orthotic & Prosthetic Assessment", "description": "K-level ambulation.", "category": "orthopedic", "subcategory": "ortho-prosthetic", "icon": "🦾", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Osteoporosis Assessment", "description": "FRAX 10-year fracture risk auto-calc.", "category": "orthopedic", "subcategory": "ortho-osteoporosis", "icon": "🦴", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Pediatric Orthopedic Assessment", "description": "DDH Barlow/Ortolani.", "category": "orthopedic", "subcategory": "ortho-pediatric", "icon": "👶", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Peripheral Nerve Assessment", "description": "Sunderland grading.", "category": "orthopedic", "subcategory": "ortho-peripheral-nerve", "icon": "⚡", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Post-Op Rehabilitation Assessment", "description": "Functional milestones, ROM progress.", "category": "orthopedic", "subcategory": "ortho-postop-rehab", "icon": "🏃", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Spine Assessment", "description": "VAS/ODI/NDI auto-score.", "category": "orthopedic", "subcategory": "ortho-spine", "icon": "🦴", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Adolescent Health Assessment", "description": "HEADSSS screen.", "category": "pediatrics", "subcategory": "peds-adolescent", "icon": "🧑", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "NICU Assessment", "description": "Gestational age, CRIB-II score.", "category": "pediatrics", "subcategory": "peds-nicu", "icon": "🍼", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Neonatal Assessment", "description": "Ballard maturity score.", "category": "pediatrics", "subcategory": "peds-neonatal", "icon": "👶", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Pediatric Cardiology Assessment", "description": "Congenital heart disease classification.", "category": "pediatrics", "subcategory": "peds-cardiology", "icon": "❤️", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Developmental Disorders Assessment", "description": "M-CHAT-R 20-item auto-score.", "category": "pediatrics", "subcategory": "peds-developmental", "icon": "🧩", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Pediatric Emergency Assessment", "description": "PEWS auto-score.", "category": "pediatrics", "subcategory": "peds-emergency", "icon": "🚨", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Pediatric Endocrinology Assessment", "description": "Growth velocity, bone age.", "category": "pediatrics", "subcategory": "peds-endocrinology", "icon": "🔬", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Pediatric Fever & Infections Assessment", "description": "Fever source checklist.", "category": "pediatrics", "subcategory": "peds-fever", "icon": "🌡️", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Pediatric Gastro & Nutrition Assessment", "description": "STAMP malnutrition score.", "category": "pediatrics", "subcategory": "peds-gastro", "icon": "🍎", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Pediatric Growth & Development Assessment", "description": "WHO/IAP z-score auto-plot.", "category": "pediatrics", "subcategory": "peds-growth", "icon": "📏", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Pediatric Haematology & Oncology Assessment", "description": "BFM ALL risk auto-class.", "category": "pediatrics", "subcategory": "peds-haematology", "icon": "🩸", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Pediatric Nephrology Assessment", "description": "eGFR Schwartz auto-calc.", "category": "pediatrics", "subcategory": "peds-nephrology", "icon": "🫘", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Pediatric Neurology Assessment", "description": "Paediatric seizure classification.", "category": "pediatrics", "subcategory": "peds-neurology", "icon": "🧠", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Pediatric Respiratory Assessment", "description": "PRAM/PSSS asthma severity.", "category": "pediatrics", "subcategory": "peds-respiratory", "icon": "🫑", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Pediatric Rheumatology Assessment", "description": "JADAS-27 auto-score.", "category": "pediatrics", "subcategory": "peds-rheumatology", "icon": "🦴", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Vaccination Chart", "description": "IAP 2024 schedule with catch-up calculator.", "category": "pediatrics", "subcategory": "peds-vaccination", "icon": "💉", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Aerosol Therapy Assessment", "description": "Nebuliser vs pMDI vs DPI technique.", "category": "specialty", "subcategory": "specialty-aerosol", "icon": "💨", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Asthma Assessment (Specialty)", "description": "Full asthma assessment.", "category": "specialty", "subcategory": "specialty-asthma", "icon": "🌬️", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
    {"title": "Diabetes Assessment", "description": "Type 1/2 classification, HbA1c tracking.", "category": "specialty", "subcategory": "specialty-diabetes", "icon": "🩸", "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None},
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
