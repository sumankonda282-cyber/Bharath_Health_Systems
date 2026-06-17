#!/usr/bin/env python3
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
    # ─────────────────────────────────────────────────────────────────────────────
    # 1. Vitals Assessment
    # ─────────────────────────────────────────────────────────────────────────────
    {
        "title": "Vitals Assessment",
        "description": "Comprehensive vital signs assessment including BP, HR, SpO2, temperature, respiratory rate, and pain score.",
        "category": "vitals",
        "icon": "🫀",
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
        "schema": {
            "sections": [
                {
                    "id": "vital_signs",
                    "title": "Vital Signs",
                    "layout": {"columns": 2},
                    "fields": [
                        {
                            "id": "bp_systolic", "field_id": "bp_systolic",
                            "type": "number", "label": "BP Systolic", "unit": "mmHg",
                            "required": True,
                            "ref_range": {"critical_low": 70, "normal_low": 90, "normal_high": 140, "critical_high": 180},
                        },
                        {
                            "id": "bp_diastolic", "field_id": "bp_diastolic",
                            "type": "number", "label": "BP Diastolic", "unit": "mmHg",
                            "required": True,
                            "ref_range": {"critical_low": 40, "normal_low": 60, "normal_high": 90, "critical_high": 120},
                        },
                        {
                            "id": "heart_rate", "field_id": "heart_rate",
                            "type": "number", "label": "Heart Rate", "unit": "/min",
                            "required": True,
                            "ref_range": {"critical_low": 40, "normal_low": 60, "normal_high": 100, "critical_high": 150},
                        },
                        {
                            "id": "respiratory_rate", "field_id": "respiratory_rate",
                            "type": "number", "label": "Respiratory Rate", "unit": "/min",
                            "required": True,
                            "ref_range": {"critical_low": 8, "normal_low": 12, "normal_high": 20, "critical_high": 30},
                        },
                        {
                            "id": "spo2", "field_id": "spo2",
                            "type": "number", "label": "SpO2", "unit": "%",
                            "required": True,
                            "ref_range": {"critical_low": 85, "normal_low": 95, "normal_high": 100},
                        },
                        {
                            "id": "temperature", "field_id": "temperature",
                            "type": "number", "label": "Temperature", "unit": "°C",
                            "decimal_places": 1,
                            "required": True,
                            "ref_range": {"critical_low": 35, "normal_low": 36.1, "normal_high": 37.2, "critical_high": 39.5},
                        },
                        {
                            "id": "weight", "field_id": "weight",
                            "type": "number", "label": "Weight", "unit": "kg",
                            "decimal_places": 1,
                            "required": False,
                        },
                        {
                            "id": "height", "field_id": "height",
                            "type": "number", "label": "Height", "unit": "cm",
                            "required": False,
                        },
                        {
                            "id": "bmi", "field_id": "bmi",
                            "type": "calculated",
                            "label": "BMI",
                            "unit": "kg/m²",
                            "formula": "{weight} / (({height} / 100) * ({height} / 100))",
                            "decimal_places": 1,
                        },
                        {
                            "id": "pain_score", "field_id": "pain_score",
                            "type": "scale",
                            "label": "Pain Score",
                            "min": 0, "max": 10,
                            "left_label": "No Pain",
                            "right_label": "Worst Pain",
                            "scale_style": "nrs",
                            "required": True,
                        },
                        {
                            "id": "pain_location", "field_id": "pain_location",
                            "type": "text",
                            "label": "Pain Location",
                            "required": False,
                            "conditions": [{"field_id": "pain_score", "operator": "greater_than", "value": 0}],
                        },
                        {
                            "id": "notes", "field_id": "notes",
                            "type": "textarea",
                            "label": "Notes",
                            "required": False,
                        },
                    ],
                }
            ]
        },
    },

    # ─────────────────────────────────────────────────────────────────────────────
    # 2. PHQ-9 Depression Screening
    # ─────────────────────────────────────────────────────────────────────────────
    {
        "title": "PHQ-9 Depression Screening",
        "description": "Patient Health Questionnaire — 9-item depression screening tool.",
        "category": "mental",
        "icon": "🧠",
        "is_iview_enabled": False,
        "iview_config": None,
        "alert_rules": [
            {
                "field_id": "phq9",
                "operator": "greater_than",
                "value": 0,
                "severity": "critical",
                "message": "Patient reports self-harm thoughts — safety assessment required",
            }
        ],
        "scoring_config": {
            "type": "PHQ-9",
            "fields_to_sum": ["phq1", "phq2", "phq3", "phq4", "phq5", "phq6", "phq7", "phq8", "phq9"],
            "score_field": "phq_total",
            "bands": [
                {"min": 0,  "max": 4,  "label": "Minimal",            "color": "green",    "action": "Monitor"},
                {"min": 5,  "max": 9,  "label": "Mild",               "color": "yellow",   "action": "Watchful waiting"},
                {"min": 10, "max": 14, "label": "Moderate",           "color": "orange",   "action": "Consider treatment"},
                {"min": 15, "max": 19, "label": "Moderately Severe",  "color": "red",      "action": "Active treatment"},
                {"min": 20, "max": 27, "label": "Severe",             "color": "critical", "action": "Immediate psychiatric referral"},
            ],
        },
        "schema": {
            "sections": [
                {
                    "id": "phq9_questions",
                    "title": "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
                    "fields": [
                        {
                            "id": "phq1", "field_id": "phq1",
                            "type": "radio",
                            "label": "1. Little interest or pleasure in doing things",
                            "required": True,
                            "options": [
                                {"label": "Not at all",               "value": 0},
                                {"label": "Several days",             "value": 1},
                                {"label": "More than half the days",  "value": 2},
                                {"label": "Nearly every day",         "value": 3},
                            ],
                        },
                        {
                            "id": "phq2", "field_id": "phq2",
                            "type": "radio",
                            "label": "2. Feeling down, depressed, or hopeless",
                            "required": True,
                            "options": [
                                {"label": "Not at all",               "value": 0},
                                {"label": "Several days",             "value": 1},
                                {"label": "More than half the days",  "value": 2},
                                {"label": "Nearly every day",         "value": 3},
                            ],
                        },
                        {
                            "id": "phq3", "field_id": "phq3",
                            "type": "radio",
                            "label": "3. Trouble falling or staying asleep, or sleeping too much",
                            "required": True,
                            "options": [
                                {"label": "Not at all",               "value": 0},
                                {"label": "Several days",             "value": 1},
                                {"label": "More than half the days",  "value": 2},
                                {"label": "Nearly every day",         "value": 3},
                            ],
                        },
                        {
                            "id": "phq4", "field_id": "phq4",
                            "type": "radio",
                            "label": "4. Feeling tired or having little energy",
                            "required": True,
                            "options": [
                                {"label": "Not at all",               "value": 0},
                                {"label": "Several days",             "value": 1},
                                {"label": "More than half the days",  "value": 2},
                                {"label": "Nearly every day",         "value": 3},
                            ],
                        },
                        {
                            "id": "phq5", "field_id": "phq5",
                            "type": "radio",
                            "label": "5. Poor appetite or overeating",
                            "required": True,
                            "options": [
                                {"label": "Not at all",               "value": 0},
                                {"label": "Several days",             "value": 1},
                                {"label": "More than half the days",  "value": 2},
                                {"label": "Nearly every day",         "value": 3},
                            ],
                        },
                        {
                            "id": "phq6", "field_id": "phq6",
                            "type": "radio",
                            "label": "6. Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
                            "required": True,
                            "options": [
                                {"label": "Not at all",               "value": 0},
                                {"label": "Several days",             "value": 1},
                                {"label": "More than half the days",  "value": 2},
                                {"label": "Nearly every day",         "value": 3},
                            ],
                        },
                        {
                            "id": "phq7", "field_id": "phq7",
                            "type": "radio",
                            "label": "7. Trouble concentrating on things, such as reading the newspaper or watching television",
                            "required": True,
                            "options": [
                                {"label": "Not at all",               "value": 0},
                                {"label": "Several days",             "value": 1},
                                {"label": "More than half the days",  "value": 2},
                                {"label": "Nearly every day",         "value": 3},
                            ],
                        },
                        {
                            "id": "phq8", "field_id": "phq8",
                            "type": "radio",
                            "label": "8. Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual",
                            "required": True,
                            "options": [
                                {"label": "Not at all",               "value": 0},
                                {"label": "Several days",             "value": 1},
                                {"label": "More than half the days",  "value": 2},
                                {"label": "Nearly every day",         "value": 3},
                            ],
                        },
                        {
                            "id": "phq9", "field_id": "phq9",
                            "type": "radio",
                            "label": "9. Thoughts that you would be better off dead, or of hurting yourself in some way",
                            "required": True,
                            "options": [
                                {"label": "Not at all",               "value": 0},
                                {"label": "Several days",             "value": 1},
                                {"label": "More than half the days",  "value": 2},
                                {"label": "Nearly every day",         "value": 3},
                            ],
                        },
                        {
                            "id": "phq_total", "field_id": "phq_total",
                            "type": "calculated",
                            "label": "PHQ-9 Total Score",
                            "formula": "{phq1} + {phq2} + {phq3} + {phq4} + {phq5} + {phq6} + {phq7} + {phq8} + {phq9}",
                        },
                        {
                            "id": "phq_difficulty", "field_id": "phq_difficulty",
                            "type": "radio",
                            "label": "If you checked off any problems, how difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?",
                            "required": False,
                            "options": [
                                {"label": "Not difficult at all", "value": "not_difficult"},
                                {"label": "Somewhat difficult",   "value": "somewhat_difficult"},
                                {"label": "Very difficult",       "value": "very_difficult"},
                                {"label": "Extremely difficult",  "value": "extremely_difficult"},
                            ],
                        },
                    ],
                }
            ]
        },
    },

    # ─────────────────────────────────────────────────────────────────────────────
    # 3. GAD-7 Anxiety Screening
    # ─────────────────────────────────────────────────────────────────────────────
    {
        "title": "GAD-7 Anxiety Screening",
        "description": "Generalized Anxiety Disorder — 7-item anxiety screening tool.",
        "category": "mental",
        "icon": "😰",
        "is_iview_enabled": False,
        "iview_config": None,
        "alert_rules": [],
        "scoring_config": {
            "type": "GAD-7",
            "fields_to_sum": ["gad1", "gad2", "gad3", "gad4", "gad5", "gad6", "gad7"],
            "score_field": "gad_total",
            "bands": [
                {"min": 0,  "max": 4,  "label": "Minimal",  "color": "green",  "action": "Monitor"},
                {"min": 5,  "max": 9,  "label": "Mild",     "color": "yellow", "action": "Watchful waiting"},
                {"min": 10, "max": 14, "label": "Moderate", "color": "orange", "action": "Consider treatment"},
                {"min": 15, "max": 21, "label": "Severe",   "color": "red",    "action": "Psychiatric referral"},
            ],
        },
        "schema": {
            "sections": [
                {
                    "id": "gad7_questions",
                    "title": "Over the last 2 weeks, how often have you been bothered by the following problems?",
                    "fields": [
                        {
                            "id": "gad1", "field_id": "gad1",
                            "type": "radio",
                            "label": "1. Feeling nervous, anxious, or on edge",
                            "required": True,
                            "options": [
                                {"label": "Not at all",               "value": 0},
                                {"label": "Several days",             "value": 1},
                                {"label": "More than half the days",  "value": 2},
                                {"label": "Nearly every day",         "value": 3},
                            ],
                        },
                        {
                            "id": "gad2", "field_id": "gad2",
                            "type": "radio",
                            "label": "2. Not being able to stop or control worrying",
                            "required": True,
                            "options": [
                                {"label": "Not at all",               "value": 0},
                                {"label": "Several days",             "value": 1},
                                {"label": "More than half the days",  "value": 2},
                                {"label": "Nearly every day",         "value": 3},
                            ],
                        },
                        {
                            "id": "gad3", "field_id": "gad3",
                            "type": "radio",
                            "label": "3. Worrying too much about different things",
                            "required": True,
                            "options": [
                                {"label": "Not at all",               "value": 0},
                                {"label": "Several days",             "value": 1},
                                {"label": "More than half the days",  "value": 2},
                                {"label": "Nearly every day",         "value": 3},
                            ],
                        },
                        {
                            "id": "gad4", "field_id": "gad4",
                            "type": "radio",
                            "label": "4. Trouble relaxing",
                            "required": True,
                            "options": [
                                {"label": "Not at all",               "value": 0},
                                {"label": "Several days",             "value": 1},
                                {"label": "More than half the days",  "value": 2},
                                {"label": "Nearly every day",         "value": 3},
                            ],
                        },
                        {
                            "id": "gad5", "field_id": "gad5",
                            "type": "radio",
                            "label": "5. Being so restless that it is hard to sit still",
                            "required": True,
                            "options": [
                                {"label": "Not at all",               "value": 0},
                                {"label": "Several days",             "value": 1},
                                {"label": "More than half the days",  "value": 2},
                                {"label": "Nearly every day",         "value": 3},
                            ],
                        },
                        {
                            "id": "gad6", "field_id": "gad6",
                            "type": "radio",
                            "label": "6. Becoming easily annoyed or irritable",
                            "required": True,
                            "options": [
                                {"label": "Not at all",               "value": 0},
                                {"label": "Several days",             "value": 1},
                                {"label": "More than half the days",  "value": 2},
                                {"label": "Nearly every day",         "value": 3},
                            ],
                        },
                        {
                            "id": "gad7", "field_id": "gad7",
                            "type": "radio",
                            "label": "7. Feeling afraid as if something awful might happen",
                            "required": True,
                            "options": [
                                {"label": "Not at all",               "value": 0},
                                {"label": "Several days",             "value": 1},
                                {"label": "More than half the days",  "value": 2},
                                {"label": "Nearly every day",         "value": 3},
                            ],
                        },
                        {
                            "id": "gad_total", "field_id": "gad_total",
                            "type": "calculated",
                            "label": "GAD-7 Total Score",
                            "formula": "{gad1} + {gad2} + {gad3} + {gad4} + {gad5} + {gad6} + {gad7}",
                        },
                    ],
                }
            ]
        },
    },

    # ─────────────────────────────────────────────────────────────────────────────
    # 4. Glasgow Coma Scale (GCS)
    # ─────────────────────────────────────────────────────────────────────────────
    {
        "title": "Glasgow Coma Scale (GCS)",
        "description": "Standardised neurological scale to assess conscious level in acute settings.",
        "category": "safety",
        "icon": "🧠",
        "is_iview_enabled": True,
        "iview_config": {
            "time_band": "4h",
            "row_config": [
                {"field_id": "gcs_eye",    "label": "Eye Opening",     "unit": "/4"},
                {"field_id": "gcs_verbal", "label": "Verbal Response",  "unit": "/5"},
                {"field_id": "gcs_motor",  "label": "Motor Response",   "unit": "/6"},
                {"field_id": "gcs_total",  "label": "GCS Total",        "unit": "/15", "ref_range": {"critical_low": 8, "normal_low": 13, "normal_high": 15}},
            ],
        },
        "alert_rules": [
            {
                "field_id": "gcs_total",
                "operator": "less_than",
                "value": 8,
                "severity": "critical",
                "message": "Severe GCS — airway management and urgent neurology",
            }
        ],
        "scoring_config": {
            "type": "GCS",
            "fields_to_sum": ["gcs_eye", "gcs_verbal", "gcs_motor"],
            "score_field": "gcs_total",
            "bands": [
                {"min": 13, "max": 15, "label": "Mild",     "color": "green",  "action": "Monitor"},
                {"min": 9,  "max": 12, "label": "Moderate", "color": "yellow", "action": "Urgent review"},
                {"min": 3,  "max": 8,  "label": "Severe",   "color": "red",    "action": "Immediate intervention"},
            ],
        },
        "schema": {
            "sections": [
                {
                    "id": "gcs_eye_section",
                    "title": "Eye Opening",
                    "fields": [
                        {
                            "id": "gcs_eye", "field_id": "gcs_eye",
                            "type": "radio",
                            "label": "Eye Opening Response",
                            "required": True,
                            "options": [
                                {"label": "Spontaneous (4)",  "value": 4},
                                {"label": "To voice (3)",     "value": 3},
                                {"label": "To pain (2)",      "value": 2},
                                {"label": "None (1)",         "value": 1},
                            ],
                        },
                    ],
                },
                {
                    "id": "gcs_verbal_section",
                    "title": "Verbal Response",
                    "fields": [
                        {
                            "id": "gcs_verbal", "field_id": "gcs_verbal",
                            "type": "radio",
                            "label": "Verbal Response",
                            "required": True,
                            "options": [
                                {"label": "Oriented (5)",          "value": 5},
                                {"label": "Confused (4)",          "value": 4},
                                {"label": "Inappropriate words (3)","value": 3},
                                {"label": "Sounds (2)",            "value": 2},
                                {"label": "None (1)",              "value": 1},
                            ],
                        },
                    ],
                },
                {
                    "id": "gcs_motor_section",
                    "title": "Motor Response",
                    "fields": [
                        {
                            "id": "gcs_motor", "field_id": "gcs_motor",
                            "type": "radio",
                            "label": "Motor Response",
                            "required": True,
                            "options": [
                                {"label": "Obeys commands (6)",  "value": 6},
                                {"label": "Localises pain (5)",  "value": 5},
                                {"label": "Withdraws (4)",       "value": 4},
                                {"label": "Flexion (3)",         "value": 3},
                                {"label": "Extension (2)",       "value": 2},
                                {"label": "None (1)",            "value": 1},
                            ],
                        },
                        {
                            "id": "gcs_total", "field_id": "gcs_total",
                            "type": "calculated",
                            "label": "GCS Total Score",
                            "formula": "{gcs_eye} + {gcs_verbal} + {gcs_motor}",
                        },
                    ],
                },
            ]
        },
    },

    # ─────────────────────────────────────────────────────────────────────────────
    # 5. Morse Fall Risk Scale
    # ─────────────────────────────────────────────────────────────────────────────
    {
        "title": "Morse Fall Risk Scale",
        "description": "Validated tool for assessing patient fall risk in hospital settings.",
        "category": "safety",
        "icon": "⚠️",
        "is_iview_enabled": False,
        "iview_config": None,
        "alert_rules": [],
        "scoring_config": {
            "type": "Morse",
            "fields_to_sum": ["history_of_falls", "secondary_diagnosis", "ambulatory_aid", "iv_access", "gait", "mental_status"],
            "score_field": "morse_total",
            "bands": [
                {"min": 0,  "max": 24,  "label": "Low Risk",    "color": "green",  "action": "Standard care"},
                {"min": 25, "max": 44,  "label": "Medium Risk", "color": "yellow", "action": "Fall prevention measures"},
                {"min": 45, "max": 125, "label": "High Risk",   "color": "red",    "action": "Intensive fall prevention"},
            ],
        },
        "schema": {
            "sections": [
                {
                    "id": "morse_section",
                    "title": "Morse Fall Risk Assessment",
                    "fields": [
                        {
                            "id": "history_of_falls", "field_id": "history_of_falls",
                            "type": "radio",
                            "label": "History of Falls (in past 3 months)",
                            "required": True,
                            "options": [
                                {"label": "No (0)",  "value": 0},
                                {"label": "Yes (25)","value": 25},
                            ],
                        },
                        {
                            "id": "secondary_diagnosis", "field_id": "secondary_diagnosis",
                            "type": "radio",
                            "label": "Secondary Diagnosis",
                            "required": True,
                            "options": [
                                {"label": "No (0)",  "value": 0},
                                {"label": "Yes (15)","value": 15},
                            ],
                        },
                        {
                            "id": "ambulatory_aid", "field_id": "ambulatory_aid",
                            "type": "radio",
                            "label": "Ambulatory Aid",
                            "required": True,
                            "options": [
                                {"label": "None / Bedrest / Nurse assist (0)",   "value": 0},
                                {"label": "Crutches / Cane / Walker (15)",       "value": 15},
                                {"label": "Furniture (30)",                       "value": 30},
                            ],
                        },
                        {
                            "id": "iv_access", "field_id": "iv_access",
                            "type": "radio",
                            "label": "IV Access / Heparin Lock",
                            "required": True,
                            "options": [
                                {"label": "No (0)",  "value": 0},
                                {"label": "Yes (20)","value": 20},
                            ],
                        },
                        {
                            "id": "gait", "field_id": "gait",
                            "type": "radio",
                            "label": "Gait",
                            "required": True,
                            "options": [
                                {"label": "Normal / Bedrest / Wheelchair (0)", "value": 0},
                                {"label": "Weak (10)",                          "value": 10},
                                {"label": "Impaired (20)",                      "value": 20},
                            ],
                        },
                        {
                            "id": "mental_status", "field_id": "mental_status",
                            "type": "radio",
                            "label": "Mental Status",
                            "required": True,
                            "options": [
                                {"label": "Oriented to own ability (0)",       "value": 0},
                                {"label": "Forgets limitations (15)",          "value": 15},
                            ],
                        },
                        {
                            "id": "morse_total", "field_id": "morse_total",
                            "type": "calculated",
                            "label": "Morse Fall Score Total",
                            "formula": "{history_of_falls} + {secondary_diagnosis} + {ambulatory_aid} + {iv_access} + {gait} + {mental_status}",
                        },
                    ],
                }
            ]
        },
    },

    # ─────────────────────────────────────────────────────────────────────────────
    # 6. APGAR Score
    # ─────────────────────────────────────────────────────────────────────────────
    {
        "title": "APGAR Score",
        "description": "Neonatal APGAR scoring tool assessed at 1 minute and 5 minutes after birth.",
        "category": "vitals",
        "icon": "👶",
        "is_iview_enabled": False,
        "iview_config": None,
        "alert_rules": [
            {
                "field_id": "apgar_total",
                "operator": "less_than",
                "value": 4,
                "severity": "critical",
                "message": "Low APGAR — immediate neonatal resuscitation",
            }
        ],
        "scoring_config": {
            "type": "APGAR",
            "fields_to_sum": ["appearance", "pulse", "grimace", "activity", "respiration"],
            "score_field": "apgar_total",
            "bands": [
                {"min": 7,  "max": 10, "label": "Normal",                "color": "green",  "action": "Routine care"},
                {"min": 4,  "max": 6,  "label": "Moderately Depressed",  "color": "yellow", "action": "Stimulation and O2"},
                {"min": 0,  "max": 3,  "label": "Severely Depressed",    "color": "red",    "action": "Immediate resuscitation"},
            ],
        },
        "schema": {
            "sections": [
                {
                    "id": "apgar_section",
                    "title": "APGAR Score Assessment",
                    "fields": [
                        {
                            "id": "appearance", "field_id": "appearance",
                            "type": "radio",
                            "label": "Appearance (Skin Colour)",
                            "required": True,
                            "options": [
                                {"label": "Blue all over (0)",                    "value": 0},
                                {"label": "Pink body, blue extremities (1)",      "value": 1},
                                {"label": "Pink all over (2)",                    "value": 2},
                            ],
                        },
                        {
                            "id": "pulse", "field_id": "pulse",
                            "type": "radio",
                            "label": "Pulse (Heart Rate)",
                            "required": True,
                            "options": [
                                {"label": "Absent (0)",   "value": 0},
                                {"label": "<100 bpm (1)", "value": 1},
                                {"label": ">100 bpm (2)", "value": 2},
                            ],
                        },
                        {
                            "id": "grimace", "field_id": "grimace",
                            "type": "radio",
                            "label": "Grimace (Reflex Irritability)",
                            "required": True,
                            "options": [
                                {"label": "No response (0)", "value": 0},
                                {"label": "Grimace (1)",     "value": 1},
                                {"label": "Cry / Cough (2)", "value": 2},
                            ],
                        },
                        {
                            "id": "activity", "field_id": "activity",
                            "type": "radio",
                            "label": "Activity (Muscle Tone)",
                            "required": True,
                            "options": [
                                {"label": "Limp (0)",          "value": 0},
                                {"label": "Some flexion (1)",  "value": 1},
                                {"label": "Active motion (2)", "value": 2},
                            ],
                        },
                        {
                            "id": "respiration", "field_id": "respiration",
                            "type": "radio",
                            "label": "Respiration",
                            "required": True,
                            "options": [
                                {"label": "Absent (0)",     "value": 0},
                                {"label": "Weak cry (1)",   "value": 1},
                                {"label": "Strong cry (2)", "value": 2},
                            ],
                        },
                        {
                            "id": "apgar_total", "field_id": "apgar_total",
                            "type": "calculated",
                            "label": "APGAR Total Score",
                            "formula": "{appearance} + {pulse} + {grimace} + {activity} + {respiration}",
                        },
                    ],
                }
            ]
        },
    },

    # ─────────────────────────────────────────────────────────────────────────────
    # 7. Comprehensive Pain Assessment
    # ─────────────────────────────────────────────────────────────────────────────
    {
        "title": "Comprehensive Pain Assessment",
        "description": "Detailed multi-dimensional pain assessment including location, character, onset, and functional impact.",
        "category": "pain",
        "icon": "🩹",
        "is_iview_enabled": False,
        "iview_config": None,
        "alert_rules": [
            {
                "field_id": "pain_nrs",
                "operator": "greater_than",
                "value": 7,
                "severity": "critical",
                "message": "Severe pain — immediate pain management review",
            }
        ],
        "scoring_config": None,
        "schema": {
            "sections": [
                {
                    "id": "pain_details",
                    "title": "Pain Details",
                    "fields": [
                        {
                            "id": "pain_nrs", "field_id": "pain_nrs",
                            "type": "scale",
                            "label": "Pain Intensity (NRS)",
                            "min": 0, "max": 10,
                            "left_label": "No Pain",
                            "right_label": "Worst Pain Imaginable",
                            "scale_style": "nrs",
                            "required": True,
                        },
                        {
                            "id": "pain_location", "field_id": "pain_location",
                            "type": "body_map",
                            "label": "Pain Location",
                            "required": False,
                        },
                        {
                            "id": "pain_character", "field_id": "pain_character",
                            "type": "checkbox",
                            "label": "Pain Character (select all that apply)",
                            "required": False,
                            "options": [
                                {"label": "Burning",   "value": "burning"},
                                {"label": "Stabbing",  "value": "stabbing"},
                                {"label": "Throbbing", "value": "throbbing"},
                                {"label": "Aching",    "value": "aching"},
                                {"label": "Cramping",  "value": "cramping"},
                                {"label": "Shooting",  "value": "shooting"},
                                {"label": "Dull",      "value": "dull"},
                            ],
                        },
                        {
                            "id": "pain_onset", "field_id": "pain_onset",
                            "type": "text",
                            "label": "When did pain start?",
                            "placeholder": "Describe onset of pain",
                            "required": False,
                        },
                        {
                            "id": "pain_duration", "field_id": "pain_duration",
                            "type": "dropdown",
                            "label": "Pain Duration",
                            "required": False,
                            "options": [
                                {"label": "Less than 1 hour",  "value": "<1hr"},
                                {"label": "Less than 6 hours", "value": "<6hr"},
                                {"label": "Less than 24 hours","value": "<24hr"},
                                {"label": "1–7 days",          "value": "1-7days"},
                                {"label": "More than 7 days",  "value": ">7days"},
                            ],
                        },
                    ],
                },
                {
                    "id": "pain_context",
                    "title": "Context",
                    "fields": [
                        {
                            "id": "aggravating_factors", "field_id": "aggravating_factors",
                            "type": "textarea",
                            "label": "Aggravating Factors",
                            "required": False,
                        },
                        {
                            "id": "relieving_factors", "field_id": "relieving_factors",
                            "type": "textarea",
                            "label": "Relieving Factors",
                            "required": False,
                        },
                        {
                            "id": "radiation", "field_id": "radiation",
                            "type": "radio",
                            "label": "Does the pain radiate?",
                            "required": False,
                            "options": [
                                {"label": "Yes", "value": "Yes"},
                                {"label": "No",  "value": "No"},
                            ],
                        },
                        {
                            "id": "radiation_site", "field_id": "radiation_site",
                            "type": "text",
                            "label": "Radiation Site",
                            "required": False,
                            "conditions": [{"field_id": "radiation", "operator": "equals", "value": "Yes"}],
                        },
                        {
                            "id": "current_pain_meds", "field_id": "current_pain_meds",
                            "type": "textarea",
                            "label": "Current Pain Medications",
                            "required": False,
                        },
                        {
                            "id": "pain_impact", "field_id": "pain_impact",
                            "type": "scale",
                            "label": "Impact on Daily Activities",
                            "min": 0, "max": 10,
                            "left_label": "No impact",
                            "right_label": "Cannot function",
                            "scale_style": "nrs",
                            "required": False,
                        },
                    ],
                },
            ]
        },
    },

    # ─────────────────────────────────────────────────────────────────────────────
    # 8. Nursing Admission Assessment
    # ─────────────────────────────────────────────────────────────────────────────
    {
        "title": "Nursing Admission Assessment",
        "description": "Comprehensive nursing admission assessment covering history, medications, social history, review of systems, and initial clinical findings.",
        "category": "admission",
        "icon": "🏥",
        "is_iview_enabled": False,
        "iview_config": None,
        "alert_rules": [],
        "scoring_config": None,
        "schema": {
            "sections": [
                {
                    "id": "chief_complaint_history",
                    "title": "Chief Complaint & History",
                    "fields": [
                        {
                            "id": "chief_complaint", "field_id": "chief_complaint",
                            "type": "textarea",
                            "label": "Chief Complaint",
                            "required": True,
                        },
                        {
                            "id": "onset", "field_id": "onset",
                            "type": "text",
                            "label": "Onset",
                            "required": False,
                        },
                        {
                            "id": "medical_history", "field_id": "medical_history",
                            "type": "checkbox",
                            "label": "Past Medical History",
                            "required": False,
                            "options": [
                                {"label": "Diabetes",      "value": "diabetes"},
                                {"label": "Hypertension",  "value": "hypertension"},
                                {"label": "CAD",           "value": "cad"},
                                {"label": "Asthma",        "value": "asthma"},
                                {"label": "COPD",          "value": "copd"},
                                {"label": "CKD",           "value": "ckd"},
                                {"label": "Epilepsy",      "value": "epilepsy"},
                                {"label": "Thyroid",       "value": "thyroid"},
                                {"label": "Cancer",        "value": "cancer"},
                                {"label": "Other",         "value": "other"},
                            ],
                        },
                        {
                            "id": "surgical_history", "field_id": "surgical_history",
                            "type": "textarea",
                            "label": "Surgical History",
                            "required": False,
                        },
                        {
                            "id": "allergies_any", "field_id": "allergies_any",
                            "type": "radio",
                            "label": "Any Known Allergies?",
                            "required": False,
                            "options": [
                                {"label": "No",  "value": "No"},
                                {"label": "Yes", "value": "Yes"},
                            ],
                        },
                        {
                            "id": "allergies_detail", "field_id": "allergies_detail",
                            "type": "textarea",
                            "label": "Allergy Details",
                            "required": False,
                            "conditions": [{"field_id": "allergies_any", "operator": "equals", "value": "Yes"}],
                        },
                    ],
                },
                {
                    "id": "current_medications_section",
                    "title": "Current Medications",
                    "fields": [
                        {
                            "id": "current_meds", "field_id": "current_meds",
                            "type": "textarea",
                            "label": "Current Medications",
                            "placeholder": "List current medications, doses, frequency",
                            "required": False,
                        },
                    ],
                },
                {
                    "id": "social_family_history",
                    "title": "Social & Family History",
                    "fields": [
                        {
                            "id": "smoking", "field_id": "smoking",
                            "type": "radio",
                            "label": "Smoking",
                            "required": False,
                            "options": [
                                {"label": "Never",  "value": "never"},
                                {"label": "Former", "value": "former"},
                                {"label": "Current","value": "current"},
                            ],
                        },
                        {
                            "id": "alcohol", "field_id": "alcohol",
                            "type": "radio",
                            "label": "Alcohol Use",
                            "required": False,
                            "options": [
                                {"label": "Never",      "value": "never"},
                                {"label": "Occasional", "value": "occasional"},
                                {"label": "Regular",    "value": "regular"},
                            ],
                        },
                        {
                            "id": "occupation", "field_id": "occupation",
                            "type": "text",
                            "label": "Occupation",
                            "required": False,
                        },
                        {
                            "id": "family_history", "field_id": "family_history",
                            "type": "textarea",
                            "label": "Family History",
                            "required": False,
                        },
                    ],
                },
                {
                    "id": "review_of_systems",
                    "title": "Review of Systems",
                    "fields": [
                        {
                            "id": "systems", "field_id": "systems",
                            "type": "checkbox",
                            "label": "Systems with Complaints",
                            "required": False,
                            "options": [
                                {"label": "Cardiovascular",  "value": "cardiovascular"},
                                {"label": "Respiratory",     "value": "respiratory"},
                                {"label": "GI",              "value": "gi"},
                                {"label": "Neuro",           "value": "neuro"},
                                {"label": "Musculoskeletal", "value": "musculoskeletal"},
                                {"label": "Skin",            "value": "skin"},
                                {"label": "Eyes",            "value": "eyes"},
                                {"label": "ENT",             "value": "ent"},
                                {"label": "Urinary",         "value": "urinary"},
                                {"label": "Endocrine",       "value": "endocrine"},
                                {"label": "Psychiatric",     "value": "psychiatric"},
                            ],
                        },
                        {
                            "id": "ros_notes", "field_id": "ros_notes",
                            "type": "textarea",
                            "label": "Review of Systems Notes",
                            "required": False,
                        },
                    ],
                },
                {
                    "id": "initial_assessment",
                    "title": "Initial Assessment",
                    "fields": [
                        {
                            "id": "fall_risk", "field_id": "fall_risk",
                            "type": "radio",
                            "label": "Fall Risk",
                            "required": False,
                            "options": [
                                {"label": "Low",    "value": "low"},
                                {"label": "Medium", "value": "medium"},
                                {"label": "High",   "value": "high"},
                            ],
                        },
                        {
                            "id": "skin_condition", "field_id": "skin_condition",
                            "type": "radio",
                            "label": "Skin Condition",
                            "required": False,
                            "options": [
                                {"label": "Intact",           "value": "Intact"},
                                {"label": "Wound",            "value": "Wound"},
                                {"label": "Rash",             "value": "Rash"},
                                {"label": "Pressure injury",  "value": "Pressure injury"},
                            ],
                        },
                        {
                            "id": "wound_location", "field_id": "wound_location",
                            "type": "text",
                            "label": "Wound / Skin Issue Location",
                            "required": False,
                            "conditions": [{"field_id": "skin_condition", "operator": "not_equals", "value": "Intact"}],
                        },
                        {
                            "id": "orientation", "field_id": "orientation",
                            "type": "radio",
                            "label": "Orientation",
                            "required": False,
                            "options": [
                                {"label": "Fully oriented", "value": "fully_oriented"},
                                {"label": "Confused",       "value": "confused"},
                                {"label": "Unresponsive",   "value": "unresponsive"},
                            ],
                        },
                        {
                            "id": "admission_notes", "field_id": "admission_notes",
                            "type": "textarea",
                            "label": "Admission Notes",
                            "required": False,
                        },
                    ],
                },
            ]
        },
    },

    # ─────────────────────────────────────────────────────────────────────────────
    # 9. SOAP Note Structured
    # ─────────────────────────────────────────────────────────────────────────────
    {
        "title": "SOAP Note Structured",
        "description": "Structured SOAP (Subjective, Objective, Assessment, Plan) clinical documentation form.",
        "category": "general",
        "icon": "📋",
        "is_iview_enabled": False,
        "iview_config": None,
        "alert_rules": [],
        "scoring_config": None,
        "schema": {
            "sections": [
                {
                    "id": "subjective",
                    "title": "Subjective",
                    "fields": [
                        {
                            "id": "chief_complaint", "field_id": "chief_complaint",
                            "type": "textarea",
                            "label": "Chief Complaint",
                            "required": True,
                        },
                        {
                            "id": "hpi", "field_id": "hpi",
                            "type": "textarea",
                            "label": "History of Present Illness",
                            "placeholder": "History of present illness",
                            "required": False,
                        },
                        {
                            "id": "associated_symptoms", "field_id": "associated_symptoms",
                            "type": "checkbox",
                            "label": "Associated Symptoms",
                            "required": False,
                            "options": [
                                {"label": "Fever",     "value": "fever"},
                                {"label": "Chills",    "value": "chills"},
                                {"label": "Fatigue",   "value": "fatigue"},
                                {"label": "Nausea",    "value": "nausea"},
                                {"label": "Vomiting",  "value": "vomiting"},
                                {"label": "Pain",      "value": "pain"},
                                {"label": "Dyspnea",   "value": "dyspnea"},
                                {"label": "Cough",     "value": "cough"},
                                {"label": "Dizziness", "value": "dizziness"},
                            ],
                        },
                        {
                            "id": "review_of_systems", "field_id": "review_of_systems",
                            "type": "textarea",
                            "label": "Review of Systems",
                            "required": False,
                        },
                        {
                            "id": "past_medical_history", "field_id": "past_medical_history",
                            "type": "textarea",
                            "label": "Past Medical History",
                            "required": False,
                        },
                        {
                            "id": "current_medications", "field_id": "current_medications",
                            "type": "textarea",
                            "label": "Current Medications",
                            "required": False,
                        },
                        {
                            "id": "allergies", "field_id": "allergies",
                            "type": "textarea",
                            "label": "Allergies",
                            "required": False,
                        },
                        {
                            "id": "social_history", "field_id": "social_history",
                            "type": "text",
                            "label": "Social History",
                            "required": False,
                        },
                        {
                            "id": "family_history", "field_id": "family_history",
                            "type": "text",
                            "label": "Family History",
                            "required": False,
                        },
                    ],
                },
                {
                    "id": "objective",
                    "title": "Objective",
                    "fields": [
                        {
                            "id": "bp", "field_id": "bp",
                            "type": "text",
                            "label": "Blood Pressure",
                            "placeholder": "e.g., 120/80",
                            "required": False,
                        },
                        {
                            "id": "hr", "field_id": "hr",
                            "type": "number",
                            "label": "Heart Rate",
                            "unit": "/min",
                            "required": False,
                        },
                        {
                            "id": "rr", "field_id": "rr",
                            "type": "number",
                            "label": "Respiratory Rate",
                            "unit": "/min",
                            "required": False,
                        },
                        {
                            "id": "temp", "field_id": "temp",
                            "type": "number",
                            "label": "Temperature",
                            "unit": "°C",
                            "required": False,
                        },
                        {
                            "id": "spo2", "field_id": "spo2",
                            "type": "number",
                            "label": "SpO2",
                            "unit": "%",
                            "required": False,
                        },
                        {
                            "id": "weight", "field_id": "weight",
                            "type": "number",
                            "label": "Weight",
                            "unit": "kg",
                            "required": False,
                        },
                        {
                            "id": "general_appearance", "field_id": "general_appearance",
                            "type": "textarea",
                            "label": "General Appearance",
                            "required": False,
                        },
                        {
                            "id": "examination_findings", "field_id": "examination_findings",
                            "type": "textarea",
                            "label": "Examination Findings",
                            "placeholder": "System-wise examination findings",
                            "required": False,
                        },
                    ],
                },
                {
                    "id": "assessment",
                    "title": "Assessment",
                    "fields": [
                        {
                            "id": "primary_diagnosis", "field_id": "primary_diagnosis",
                            "type": "text",
                            "label": "Primary Diagnosis",
                            "required": True,
                        },
                        {
                            "id": "differential_diagnoses", "field_id": "differential_diagnoses",
                            "type": "textarea",
                            "label": "Differential Diagnoses",
                            "required": False,
                        },
                        {
                            "id": "problem_list", "field_id": "problem_list",
                            "type": "textarea",
                            "label": "Problem List",
                            "required": False,
                        },
                    ],
                },
                {
                    "id": "plan",
                    "title": "Plan",
                    "fields": [
                        {
                            "id": "investigations", "field_id": "investigations",
                            "type": "textarea",
                            "label": "Investigations",
                            "placeholder": "Investigations ordered",
                            "required": False,
                        },
                        {
                            "id": "medications", "field_id": "medications",
                            "type": "textarea",
                            "label": "Medications",
                            "placeholder": "Medications prescribed/modified",
                            "required": False,
                        },
                        {
                            "id": "referrals", "field_id": "referrals",
                            "type": "textarea",
                            "label": "Referrals",
                            "required": False,
                        },
                        {
                            "id": "follow_up", "field_id": "follow_up",
                            "type": "text",
                            "label": "Follow-up",
                            "placeholder": "Follow-up instructions",
                            "required": False,
                        },
                        {
                            "id": "patient_education", "field_id": "patient_education",
                            "type": "textarea",
                            "label": "Patient Education",
                            "required": False,
                        },
                        {
                            "id": "return_precautions", "field_id": "return_precautions",
                            "type": "textarea",
                            "label": "Return Precautions",
                            "required": False,
                        },
                    ],
                },
            ]
        },
    },

    # ─────────────────────────────────────────────────────────────────────────────
    # 10. Discharge Checklist
    # ─────────────────────────────────────────────────────────────────────────────
    {
        "title": "Discharge Checklist",
        "description": "Structured discharge documentation covering clinical summary, medications, instructions, follow-up, and patient education.",
        "category": "discharge",
        "icon": "🏠",
        "is_iview_enabled": False,
        "iview_config": None,
        "requires_cosign": True,
        "alert_rules": [],
        "scoring_config": None,
        "schema": {
            "sections": [
                {
                    "id": "clinical_summary",
                    "title": "Clinical Summary",
                    "fields": [
                        {
                            "id": "discharge_diagnosis", "field_id": "discharge_diagnosis",
                            "type": "text",
                            "label": "Discharge Diagnosis",
                            "required": True,
                        },
                        {
                            "id": "condition_at_discharge", "field_id": "condition_at_discharge",
                            "type": "dropdown",
                            "label": "Condition at Discharge",
                            "required": False,
                            "options": [
                                {"label": "Stable",       "value": "stable"},
                                {"label": "Improved",     "value": "improved"},
                                {"label": "Unchanged",    "value": "unchanged"},
                                {"label": "Deteriorated", "value": "deteriorated"},
                                {"label": "Deceased",     "value": "deceased"},
                            ],
                        },
                        {
                            "id": "procedures_done", "field_id": "procedures_done",
                            "type": "textarea",
                            "label": "Procedures Done",
                            "required": False,
                        },
                        {
                            "id": "hospital_course", "field_id": "hospital_course",
                            "type": "textarea",
                            "label": "Hospital Course",
                            "required": False,
                        },
                    ],
                },
                {
                    "id": "discharge_medications",
                    "title": "Discharge Medications",
                    "fields": [
                        {
                            "id": "medication_reconciliation", "field_id": "medication_reconciliation",
                            "type": "textarea",
                            "label": "Medication Reconciliation",
                            "placeholder": "List all discharge medications with doses",
                            "required": False,
                        },
                        {
                            "id": "new_medications", "field_id": "new_medications",
                            "type": "textarea",
                            "label": "New Medications",
                            "required": False,
                        },
                        {
                            "id": "stopped_medications", "field_id": "stopped_medications",
                            "type": "textarea",
                            "label": "Stopped Medications",
                            "required": False,
                        },
                    ],
                },
                {
                    "id": "instructions",
                    "title": "Instructions",
                    "fields": [
                        {
                            "id": "diet_advice", "field_id": "diet_advice",
                            "type": "textarea",
                            "label": "Diet Advice",
                            "required": False,
                        },
                        {
                            "id": "activity_restrictions", "field_id": "activity_restrictions",
                            "type": "textarea",
                            "label": "Activity Restrictions",
                            "required": False,
                        },
                        {
                            "id": "wound_care", "field_id": "wound_care",
                            "type": "textarea",
                            "label": "Wound Care",
                            "required": False,
                        },
                        {
                            "id": "danger_signs", "field_id": "danger_signs",
                            "type": "textarea",
                            "label": "Danger Signs",
                            "placeholder": "Symptoms requiring emergency care",
                            "required": True,
                        },
                    ],
                },
                {
                    "id": "follow_up_section",
                    "title": "Follow-up",
                    "fields": [
                        {
                            "id": "follow_up_date", "field_id": "follow_up_date",
                            "type": "date",
                            "label": "Follow-up Date",
                            "required": False,
                        },
                        {
                            "id": "follow_up_doctor", "field_id": "follow_up_doctor",
                            "type": "text",
                            "label": "Follow-up Doctor",
                            "required": False,
                        },
                        {
                            "id": "follow_up_location", "field_id": "follow_up_location",
                            "type": "text",
                            "label": "Follow-up Location",
                            "required": False,
                        },
                        {
                            "id": "investigations_pending", "field_id": "investigations_pending",
                            "type": "textarea",
                            "label": "Investigations Pending",
                            "required": False,
                        },
                    ],
                },
                {
                    "id": "patient_education_consent",
                    "title": "Patient Education & Consent",
                    "fields": [
                        {
                            "id": "education_given", "field_id": "education_given",
                            "type": "checkbox",
                            "label": "Education Given On",
                            "required": False,
                            "options": [
                                {"label": "Diagnosis",    "value": "diagnosis"},
                                {"label": "Medications",  "value": "medications"},
                                {"label": "Diet",         "value": "diet"},
                                {"label": "Activity",     "value": "activity"},
                                {"label": "Follow-up",    "value": "follow_up"},
                                {"label": "Danger signs", "value": "danger_signs"},
                            ],
                        },
                        {
                            "id": "education_method", "field_id": "education_method",
                            "type": "radio",
                            "label": "Education Method",
                            "required": False,
                            "options": [
                                {"label": "Verbal",        "value": "verbal"},
                                {"label": "Written",       "value": "written"},
                                {"label": "Demonstration", "value": "demonstration"},
                            ],
                        },
                        {
                            "id": "patient_understands", "field_id": "patient_understands",
                            "type": "radio",
                            "label": "Patient Understands Instructions",
                            "required": False,
                            "options": [
                                {"label": "Yes",     "value": "yes"},
                                {"label": "No",      "value": "no"},
                                {"label": "Partial", "value": "partial"},
                            ],
                        },
                        {
                            "id": "patient_signature", "field_id": "patient_signature",
                            "type": "signature",
                            "label": "Patient / Guardian Signature",
                            "required": True,
                        },
                    ],
                },
            ]
        },
    },

    # ─────────────────────────────────────────────────────────────────────────────
    # 11. Pre-Operative Assessment
    # ─────────────────────────────────────────────────────────────────────────────
    {
        "title": "Pre-Operative Assessment",
        "description": "Pre-operative anaesthesia and surgical risk assessment form.",
        "category": "surgery",
        "icon": "🔬",
        "is_iview_enabled": False,
        "iview_config": None,
        "requires_cosign": True,
        "alert_rules": [],
        "scoring_config": None,
        "schema": {
            "sections": [
                {
                    "id": "procedure_history",
                    "title": "Procedure & History",
                    "fields": [
                        {
                            "id": "procedure_planned", "field_id": "procedure_planned",
                            "type": "text",
                            "label": "Procedure Planned",
                            "required": True,
                        },
                        {
                            "id": "planned_anaesthesia", "field_id": "planned_anaesthesia",
                            "type": "dropdown",
                            "label": "Planned Anaesthesia",
                            "required": False,
                            "options": [
                                {"label": "General",  "value": "general"},
                                {"label": "Spinal",   "value": "spinal"},
                                {"label": "Epidural", "value": "epidural"},
                                {"label": "Regional", "value": "regional"},
                                {"label": "Local",    "value": "local"},
                                {"label": "MAC",      "value": "mac"},
                            ],
                        },
                        {
                            "id": "medical_history", "field_id": "medical_history",
                            "type": "checkbox",
                            "label": "Past Medical History",
                            "required": False,
                            "options": [
                                {"label": "Diabetes",      "value": "diabetes"},
                                {"label": "Hypertension",  "value": "hypertension"},
                                {"label": "CAD",           "value": "cad"},
                                {"label": "Asthma",        "value": "asthma"},
                                {"label": "COPD",          "value": "copd"},
                                {"label": "CKD",           "value": "ckd"},
                                {"label": "Epilepsy",      "value": "epilepsy"},
                                {"label": "Thyroid",       "value": "thyroid"},
                                {"label": "Cancer",        "value": "cancer"},
                                {"label": "Other",         "value": "other"},
                            ],
                        },
                        {
                            "id": "surgical_history", "field_id": "surgical_history",
                            "type": "textarea",
                            "label": "Surgical History",
                            "required": False,
                        },
                        {
                            "id": "current_medications", "field_id": "current_medications",
                            "type": "textarea",
                            "label": "Current Medications",
                            "required": False,
                        },
                        {
                            "id": "allergies", "field_id": "allergies",
                            "type": "textarea",
                            "label": "Allergies",
                            "required": False,
                        },
                        {
                            "id": "allergies_detail", "field_id": "allergies_detail",
                            "type": "text",
                            "label": "Allergy Details",
                            "required": False,
                        },
                        {
                            "id": "last_meal_time", "field_id": "last_meal_time",
                            "type": "datetime",
                            "label": "Last Meal Time (Fasting Status)",
                            "placeholder": "Fasting status",
                            "required": False,
                        },
                        {
                            "id": "consent_obtained", "field_id": "consent_obtained",
                            "type": "radio",
                            "label": "Informed Consent Obtained",
                            "required": True,
                            "options": [
                                {"label": "Yes", "value": "Yes"},
                                {"label": "No",  "value": "No"},
                            ],
                        },
                    ],
                },
                {
                    "id": "examination",
                    "title": "Examination",
                    "fields": [
                        {
                            "id": "weight", "field_id": "weight",
                            "type": "number", "label": "Weight", "unit": "kg",
                            "required": False,
                        },
                        {
                            "id": "height", "field_id": "height",
                            "type": "number", "label": "Height", "unit": "cm",
                            "required": False,
                        },
                        {
                            "id": "bp", "field_id": "bp",
                            "type": "text", "label": "Blood Pressure",
                            "required": False,
                        },
                        {
                            "id": "hr", "field_id": "hr",
                            "type": "number", "label": "Heart Rate", "unit": "/min",
                            "required": False,
                        },
                        {
                            "id": "spo2", "field_id": "spo2",
                            "type": "number", "label": "SpO2", "unit": "%",
                            "required": False,
                        },
                        {
                            "id": "mallampati", "field_id": "mallampati",
                            "type": "radio",
                            "label": "Mallampati Classification",
                            "required": False,
                            "options": [
                                {"label": "Class I",   "value": "class_i"},
                                {"label": "Class II",  "value": "class_ii"},
                                {"label": "Class III", "value": "class_iii"},
                                {"label": "Class IV",  "value": "class_iv"},
                            ],
                        },
                        {
                            "id": "mouth_opening", "field_id": "mouth_opening",
                            "type": "radio",
                            "label": "Mouth Opening",
                            "required": False,
                            "options": [
                                {"label": ">3 fingers",   "value": ">3_fingers"},
                                {"label": "2–3 fingers",  "value": "2-3_fingers"},
                                {"label": "<2 fingers",   "value": "<2_fingers"},
                            ],
                        },
                        {
                            "id": "neck_mobility", "field_id": "neck_mobility",
                            "type": "radio",
                            "label": "Neck Mobility",
                            "required": False,
                            "options": [
                                {"label": "Full",       "value": "full"},
                                {"label": "Restricted", "value": "restricted"},
                            ],
                        },
                        {
                            "id": "cardiovascular", "field_id": "cardiovascular",
                            "type": "textarea",
                            "label": "Cardiovascular Findings",
                            "placeholder": "CVS findings",
                            "required": False,
                        },
                        {
                            "id": "respiratory", "field_id": "respiratory",
                            "type": "textarea",
                            "label": "Respiratory Findings",
                            "placeholder": "RS findings",
                            "required": False,
                        },
                        {
                            "id": "other_findings", "field_id": "other_findings",
                            "type": "textarea",
                            "label": "Other Findings",
                            "required": False,
                        },
                    ],
                },
                {
                    "id": "investigations",
                    "title": "Investigations",
                    "fields": [
                        {
                            "id": "hb", "field_id": "hb",
                            "type": "number", "label": "Haemoglobin", "unit": "g/dL",
                            "required": False,
                            "ref_range": {"normal_low": 12, "normal_high": 17},
                        },
                        {
                            "id": "wbc", "field_id": "wbc",
                            "type": "number", "label": "WBC Count", "unit": "×10³/μL",
                            "required": False,
                        },
                        {
                            "id": "platelets", "field_id": "platelets",
                            "type": "number", "label": "Platelets", "unit": "×10³/μL",
                            "required": False,
                        },
                        {
                            "id": "sodium", "field_id": "sodium",
                            "type": "number", "label": "Sodium", "unit": "mEq/L",
                            "required": False,
                            "ref_range": {"normal_low": 135, "normal_high": 145},
                        },
                        {
                            "id": "potassium", "field_id": "potassium",
                            "type": "number", "label": "Potassium", "unit": "mEq/L",
                            "required": False,
                            "ref_range": {"critical_low": 2.5, "normal_low": 3.5, "normal_high": 5.0, "critical_high": 6.5},
                        },
                        {
                            "id": "creatinine", "field_id": "creatinine",
                            "type": "number", "label": "Creatinine", "unit": "mg/dL",
                            "required": False,
                        },
                        {
                            "id": "ecg_findings", "field_id": "ecg_findings",
                            "type": "textarea", "label": "ECG Findings",
                            "required": False,
                        },
                        {
                            "id": "xray_findings", "field_id": "xray_findings",
                            "type": "textarea", "label": "X-Ray Findings",
                            "required": False,
                        },
                        {
                            "id": "other_investigations", "field_id": "other_investigations",
                            "type": "textarea", "label": "Other Investigations",
                            "required": False,
                        },
                    ],
                },
                {
                    "id": "risk_assessment",
                    "title": "Risk Assessment",
                    "fields": [
                        {
                            "id": "asa_grade", "field_id": "asa_grade",
                            "type": "radio",
                            "label": "ASA Physical Status Grade",
                            "required": False,
                            "options": [
                                {"label": "I — Normal healthy",                 "value": "asa_i"},
                                {"label": "II — Mild systemic disease",         "value": "asa_ii"},
                                {"label": "III — Severe systemic disease",      "value": "asa_iii"},
                                {"label": "IV — Severe life-threatening",       "value": "asa_iv"},
                                {"label": "V — Moribund",                       "value": "asa_v"},
                                {"label": "VI — Brain dead",                    "value": "asa_vi"},
                            ],
                        },
                        {
                            "id": "risk_factors", "field_id": "risk_factors",
                            "type": "textarea",
                            "label": "Risk Factors",
                            "required": False,
                        },
                        {
                            "id": "anaesthesia_plan", "field_id": "anaesthesia_plan",
                            "type": "textarea",
                            "label": "Anaesthesia Plan",
                            "required": False,
                        },
                        {
                            "id": "pre_op_orders", "field_id": "pre_op_orders",
                            "type": "textarea",
                            "label": "Pre-operative Orders",
                            "required": False,
                        },
                        {
                            "id": "anaesthetist_signature", "field_id": "anaesthetist_signature",
                            "type": "signature",
                            "label": "Anaesthetist Signature",
                            "required": True,
                        },
                    ],
                },
            ]
        },
    },

    # ─────────────────────────────────────────────────────────────────────────────
    # 12. Wound & Pressure Injury Assessment
    # ─────────────────────────────────────────────────────────────────────────────
    {
        "title": "Wound & Pressure Injury Assessment",
        "description": "Comprehensive wound and pressure injury assessment tool with measurements, bed condition, and management planning.",
        "category": "general",
        "icon": "🩹",
        "is_iview_enabled": True,
        "iview_config": {
            "time_band": "24h",
            "row_config": [
                {"field_id": "wound_area",        "label": "Wound Area",          "unit": "cm²"},
                {"field_id": "wound_depth",       "label": "Wound Depth",         "unit": "cm"},
                {"field_id": "granulation_percent","label": "Granulation",         "unit": "%"},
                {"field_id": "exudate_amount",    "label": "Exudate",             "unit": ""},
                {"field_id": "pain_score",        "label": "Pain Score",          "unit": "/10"},
            ],
        },
        "alert_rules": [],
        "scoring_config": None,
        "schema": {
            "sections": [
                {
                    "id": "wound_details",
                    "title": "Wound Details",
                    "fields": [
                        {
                            "id": "wound_location", "field_id": "wound_location",
                            "type": "body_map",
                            "label": "Wound Location",
                            "required": False,
                        },
                        {
                            "id": "wound_type", "field_id": "wound_type",
                            "type": "radio",
                            "label": "Wound Type",
                            "required": False,
                            "options": [
                                {"label": "Pressure injury", "value": "Pressure injury"},
                                {"label": "Surgical",        "value": "surgical"},
                                {"label": "Traumatic",       "value": "traumatic"},
                                {"label": "Diabetic",        "value": "diabetic"},
                                {"label": "Venous",          "value": "venous"},
                                {"label": "Arterial",        "value": "arterial"},
                                {"label": "Other",           "value": "other"},
                            ],
                        },
                        {
                            "id": "wound_stage", "field_id": "wound_stage",
                            "type": "dropdown",
                            "label": "Pressure Injury Stage",
                            "required": False,
                            "conditions": [{"field_id": "wound_type", "operator": "equals", "value": "Pressure injury"}],
                            "options": [
                                {"label": "Stage 1",          "value": "stage_1"},
                                {"label": "Stage 2",          "value": "stage_2"},
                                {"label": "Stage 3",          "value": "stage_3"},
                                {"label": "Stage 4",          "value": "stage_4"},
                                {"label": "Unstageable",      "value": "unstageable"},
                                {"label": "Deep tissue injury","value": "deep_tissue"},
                            ],
                        },
                        {
                            "id": "wound_length", "field_id": "wound_length",
                            "type": "number", "label": "Wound Length", "unit": "cm",
                            "decimal_places": 1,
                            "required": False,
                        },
                        {
                            "id": "wound_width", "field_id": "wound_width",
                            "type": "number", "label": "Wound Width", "unit": "cm",
                            "decimal_places": 1,
                            "required": False,
                        },
                        {
                            "id": "wound_depth", "field_id": "wound_depth",
                            "type": "number", "label": "Wound Depth", "unit": "cm",
                            "decimal_places": 1,
                            "required": False,
                        },
                        {
                            "id": "wound_area", "field_id": "wound_area",
                            "type": "calculated",
                            "label": "Wound Area",
                            "unit": "cm²",
                            "formula": "{wound_length} * {wound_width}",
                            "decimal_places": 2,
                        },
                    ],
                },
                {
                    "id": "wound_assessment",
                    "title": "Wound Assessment",
                    "fields": [
                        {
                            "id": "wound_bed", "field_id": "wound_bed",
                            "type": "checkbox",
                            "label": "Wound Bed (select all present)",
                            "required": False,
                            "options": [
                                {"label": "Granulation",      "value": "granulation"},
                                {"label": "Slough",           "value": "slough"},
                                {"label": "Eschar",           "value": "eschar"},
                                {"label": "Epithelialisation","value": "epithelialisation"},
                                {"label": "Necrotic",         "value": "necrotic"},
                            ],
                        },
                        {
                            "id": "granulation_percent", "field_id": "granulation_percent",
                            "type": "number",
                            "label": "Granulation Tissue (%)",
                            "unit": "%",
                            "min": 0, "max": 100,
                            "required": False,
                        },
                        {
                            "id": "exudate_amount", "field_id": "exudate_amount",
                            "type": "radio",
                            "label": "Exudate Amount",
                            "required": False,
                            "options": [
                                {"label": "None",     "value": "none"},
                                {"label": "Low",      "value": "low"},
                                {"label": "Moderate", "value": "moderate"},
                                {"label": "Heavy",    "value": "heavy"},
                            ],
                        },
                        {
                            "id": "exudate_type", "field_id": "exudate_type",
                            "type": "radio",
                            "label": "Exudate Type",
                            "required": False,
                            "options": [
                                {"label": "Serous",          "value": "serous"},
                                {"label": "Serosanguineous", "value": "serosanguineous"},
                                {"label": "Sanguineous",     "value": "sanguineous"},
                                {"label": "Purulent",        "value": "purulent"},
                            ],
                        },
                        {
                            "id": "odour", "field_id": "odour",
                            "type": "radio",
                            "label": "Wound Odour",
                            "required": False,
                            "options": [
                                {"label": "None",     "value": "none"},
                                {"label": "Mild",     "value": "mild"},
                                {"label": "Moderate", "value": "moderate"},
                                {"label": "Strong",   "value": "strong"},
                            ],
                        },
                        {
                            "id": "periwound_skin", "field_id": "periwound_skin",
                            "type": "checkbox",
                            "label": "Peri-wound Skin",
                            "required": False,
                            "options": [
                                {"label": "Intact",      "value": "intact"},
                                {"label": "Macerated",   "value": "macerated"},
                                {"label": "Erythema",    "value": "erythema"},
                                {"label": "Callus",      "value": "callus"},
                                {"label": "Oedema",      "value": "oedema"},
                                {"label": "Undermining", "value": "undermining"},
                            ],
                        },
                        {
                            "id": "pain_score", "field_id": "pain_score",
                            "type": "scale",
                            "label": "Wound Pain Score",
                            "min": 0, "max": 10,
                            "left_label": "No Pain",
                            "right_label": "Worst Pain",
                            "scale_style": "nrs",
                            "required": False,
                        },
                    ],
                },
                {
                    "id": "management",
                    "title": "Management",
                    "fields": [
                        {
                            "id": "dressing_type", "field_id": "dressing_type",
                            "type": "text",
                            "label": "Dressing Type Used",
                            "required": False,
                        },
                        {
                            "id": "dressing_changed_by", "field_id": "dressing_changed_by",
                            "type": "text",
                            "label": "Dressing Changed By",
                            "required": False,
                        },
                        {
                            "id": "next_review_date", "field_id": "next_review_date",
                            "type": "date",
                            "label": "Next Review Date",
                            "required": False,
                        },
                        {
                            "id": "wound_photo", "field_id": "wound_photo",
                            "type": "photo",
                            "label": "Wound Photo",
                            "required": False,
                        },
                        {
                            "id": "clinical_notes", "field_id": "clinical_notes",
                            "type": "textarea",
                            "label": "Clinical Notes",
                            "required": False,
                        },
                        {
                            "id": "wound_improving", "field_id": "wound_improving",
                            "type": "radio",
                            "label": "Is Wound Improving?",
                            "required": False,
                            "options": [
                                {"label": "Yes",       "value": "yes"},
                                {"label": "No",        "value": "no"},
                                {"label": "Unchanged", "value": "unchanged"},
                            ],
                        },
                    ],
                },
            ]
        },
    },

    # ═══════════════════════════════════════════════════════════════════════════
    # JSX RICH FORMS — subcategory = form_key used by frontend FormRenderer
    # Schema is minimal; the JSX component owns the full UI & auto-scoring logic
    # ═══════════════════════════════════════════════════════════════════════════

    # ── General / Root ──────────────────────────────────────────────────────────
    {
        "title": "Vital Signs Assessment",
        "description": "Comprehensive vital signs with BP, HR, SpO₂, RR, Temp, weight & BMI. Auto-flags abnormals.",
        "category": "vitals", "subcategory": "vital-signs", "icon": "🫀",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Pain Assessment (Clinical)",
        "description": "NRS 0–10, site, character, onset, radiation, alleviating/aggravating factors, pain diary.",
        "category": "pain", "subcategory": "pain-assessment", "icon": "🩹",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Asthma Control Assessment",
        "description": "Spirometry, peak flow, ACT auto-score, step-up triggers, inhaler technique check.",
        "category": "respiratory", "subcategory": "asthma-basic", "icon": "🫁",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Allergies & Adverse Reactions",
        "description": "Drug, food, environmental & latex allergies with reaction type, severity and DNAR code.",
        "category": "history", "subcategory": "allergies", "icon": "⚠️",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Medical History",
        "description": "Past medical history, surgical history, hospitalizations, current diagnoses with ICD codes.",
        "category": "history", "subcategory": "medical-history", "icon": "📋",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Family History",
        "description": "Familial diseases across three generations — hereditary, cardiac, oncological, genetic conditions.",
        "category": "history", "subcategory": "family-history", "icon": "👨‍👩‍👧",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Social History",
        "description": "Occupation, tobacco, alcohol, substance use, diet, exercise, living situation, travel history.",
        "category": "history", "subcategory": "social-history", "icon": "🏠",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Systems Review",
        "description": "14-system review of systems — cardiovascular, respiratory, GI, neuro, MSK, skin and more.",
        "category": "systems", "subcategory": "systems-review", "icon": "🔍",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Patient Profile & Demographics",
        "description": "Demographics, contact details, NOK, insurance, religion, language, and admission details.",
        "category": "admission", "subcategory": "patient-profile", "icon": "🪪",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Chief Complaint",
        "description": "Presenting complaint in patient's own words, HPI, duration, onset, severity and timeline.",
        "category": "admission", "subcategory": "chief-complaint", "icon": "💬",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },

    # ── Clinical Examination (systems/) ─────────────────────────────────────────
    {
        "title": "Clinical Examination",
        "description": "Full structured clinical examination — general, systemic, regional exam with findings.",
        "category": "systems", "subcategory": "systems-clinical-exam", "icon": "🩺",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Clinical Impression & Plan",
        "description": "Working diagnosis, differential diagnoses, investigation plan and management summary.",
        "category": "systems", "subcategory": "systems-clinical-impression", "icon": "💡",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Systems Pain Assessment",
        "description": "Systems-specific pain assessment with site mapping and multi-axis pain characterisation.",
        "category": "systems", "subcategory": "systems-pain", "icon": "🩹",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Systems Review (Full)",
        "description": "Extended multi-system review with organ-level positive and negative findings documentation.",
        "category": "systems", "subcategory": "systems-review-full", "icon": "📊",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },

    # ── Cardiology ───────────────────────────────────────────────────────────────
    {
        "title": "ACS (Acute Coronary Syndrome) Assessment",
        "description": "TIMI/GRACE risk, ECG findings, cardiac biomarkers, thrombolysis eligibility, DAPT plan.",
        "category": "cardiology", "subcategory": "cardiology-acs", "icon": "❤️",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Atrial Fibrillation Assessment",
        "description": "CHA₂DS₂-VASc auto-score, HAS-BLED auto-score, rhythm control vs rate control strategy.",
        "category": "cardiology", "subcategory": "cardiology-af", "icon": "💓",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Cardiomyopathy Assessment",
        "description": "NYHA class, Echo parameters, LVEF tracking, cardiac MRI findings, genetics screen.",
        "category": "cardiology", "subcategory": "cardiology-cardiomyopathy", "icon": "🫀",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Chest Pain Assessment",
        "description": "HEART score auto-calculation, typicality, risk factors, ECG, troponin trend, disposition.",
        "category": "cardiology", "subcategory": "cardiology-chest-pain", "icon": "💔",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Dyslipidemia Assessment",
        "description": "Lipid profile, ASCVD 10-year risk, FH criteria, statin intensity, LDL targets.",
        "category": "cardiology", "subcategory": "cardiology-dyslipidemia", "icon": "🧪",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Heart Failure Assessment",
        "description": "HFrEF/HFmrEF/HFpEF classification, NYHA stage, BNP trend, GDMT checklist.",
        "category": "cardiology", "subcategory": "cardiology-heart-failure", "icon": "💊",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Hypertension Assessment",
        "description": "JNC/ESC staging, ABPM review, end-organ damage screen, lifestyle and medication record.",
        "category": "cardiology", "subcategory": "cardiology-hypertension", "icon": "📈",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Pericardial Disease Assessment",
        "description": "Acute pericarditis, effusion sizing, Beck's triad, pericardiocentesis record.",
        "category": "cardiology", "subcategory": "cardiology-pericardial", "icon": "🫁",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Rheumatic Heart Disease Assessment",
        "description": "Jones criteria, streptococcal serology, valve involvement, penicillin prophylaxis record.",
        "category": "cardiology", "subcategory": "cardiology-rhd", "icon": "🦠",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Valvular Heart Disease Assessment",
        "description": "Valve lesion grading, Echo Doppler data, surgical/TAVI indication, anticoagulation.",
        "category": "cardiology", "subcategory": "cardiology-valvular", "icon": "🔬",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },

    # ── Clinical Scales ──────────────────────────────────────────────────────────
    {
        "title": "Asthma Control Test (ACT)",
        "description": "5-item ACT auto-score 5–25. ≤19 = not controlled, 20–24 = well controlled, 25 = fully.",
        "category": "clinical", "subcategory": "clinical-act", "icon": "🌬️",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "ADHD Rating Scale",
        "description": "DSM-5 inattention + hyperactivity/impulsivity 18-item scale with auto subtype classification.",
        "category": "clinical", "subcategory": "clinical-adhd", "icon": "🧠",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "ALSFRS-R (ALS Functional Rating Scale)",
        "description": "48-item 12-domain ALS functional rating — bulbar, fine motor, gross motor, respiratory.",
        "category": "clinical", "subcategory": "clinical-alsfrs", "icon": "⚡",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "ASRS ADHD Screener",
        "description": "18-item Adult ADHD Self-Report Scale with Part A auto-screening and Part B full score.",
        "category": "clinical", "subcategory": "clinical-asrs", "icon": "📝",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Migraine & Headache Assessment",
        "description": "ICHD-3 classification, MIDAS disability score, frequency diary, trigger mapping, acute treatment.",
        "category": "clinical", "subcategory": "clinical-migraine", "icon": "🤕",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },

    # ── ENT ─────────────────────────────────────────────────────────────────────
    {
        "title": "Ear Assessment",
        "description": "Rinne/Weber auto-interpretation, PTA classification, CSOM safe/unsafe, EAONO cholesteatoma staging, THI 0–100, Dix-Hallpike.",
        "category": "ent", "subcategory": "ent-ear", "icon": "👂",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Nose & Sinus Assessment",
        "description": "SNOT-22 22-item 0–110 auto-severity, ARIA rhinitis, Lund-Mackay CT score, Lund-Kennedy endoscopy, mucormycosis protocol.",
        "category": "ent", "subcategory": "ent-nose-sinus", "icon": "👃",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Throat & Larynx Assessment",
        "description": "McIsaac auto-score, VHI-10 dysphonia, RSI 0–45 LPR, STOP-BANG 0–8, FOIS swallowing, deep neck space alerts.",
        "category": "ent", "subcategory": "ent-throat-larynx", "icon": "🗣️",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Head & Neck Assessment",
        "description": "TNM AJCC 8th edition staging, ECOG 0–4, TIRADS TR1–TR5, Bethesda I–VI, neck level mapping, TB lymphadenitis.",
        "category": "ent", "subcategory": "ent-head-neck", "icon": "🧬",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Audiology & Hearing Assessment",
        "description": "8-frequency PTA grid (AC+BC), auto WHO grade, auto ABG, BERA wave latency, ECochG SP/AP, CAP 0–7, SSNHL protocol.",
        "category": "ent", "subcategory": "ent-audiology", "icon": "🎧",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Facial Nerve Assessment",
        "description": "House-Brackmann I–VI auto-description, Sunnybrook composite 0–100, ENoG degeneration % with CRITICAL surgical alert ≥90%.",
        "category": "ent", "subcategory": "ent-facial-nerve", "icon": "😐",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Paediatric ENT Assessment",
        "description": "Button battery EMERGENCY protocol, paed OSA AHI auto-severity, Brodsky/Fujioka grading, Paradise criteria, RRP Derkay-Mounts.",
        "category": "ent", "subcategory": "ent-paediatric", "icon": "👶",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Tracheostomy Assessment",
        "description": "Full tube inventory, cuff pressure, decannulation readiness 12-item auto-score, Passy-Muir valve, TIF/TIA emergency alerts.",
        "category": "ent", "subcategory": "ent-tracheostomy", "icon": "🫁",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },

    # ── Gastroenterology ─────────────────────────────────────────────────────────
    {
        "title": "Acute Abdomen Assessment",
        "description": "Alvarado score (appendicitis), Rebound/guarding grading, surgical urgency flags, differential checklist.",
        "category": "gastro", "subcategory": "gastro-acute-abdomen", "icon": "🏥",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Acute Pancreatitis Assessment",
        "description": "Ranson criteria auto-score (day 1 + day 3), BISAP, Modified Glasgow, CTSI, organ failure tracking.",
        "category": "gastro", "subcategory": "gastro-acute-pancreatitis", "icon": "🔥",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Anorectal Disorders Assessment",
        "description": "Haemorrhoid grading (Goligher I–IV), fistula Park's classification, continence scoring, anal manometry findings.",
        "category": "gastro", "subcategory": "gastro-anorectal", "icon": "🩺",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Biliary & Gallstone Assessment",
        "description": "Charcot's triad, Reynolds pentad, Modified Alvarado for biliary colic, MRCP/ERCP indication, Mirizzi classification.",
        "category": "gastro", "subcategory": "gastro-biliary", "icon": "🟡",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Chronic Pancreatitis Assessment",
        "description": "Manchester classification, exocrine/endocrine insufficiency, pain VAS, enzyme replacement, HbA1c tracking.",
        "category": "gastro", "subcategory": "gastro-chronic-pancreatitis", "icon": "🔴",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Dysphagia & Esophageal Assessment",
        "description": "Ogilvie dysphagia grade, Eckardt achalasia score, Barrett's surveillance, EGD findings, manometry results.",
        "category": "gastro", "subcategory": "gastro-dysphagia", "icon": "🍽️",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Functional GI Disorder Assessment",
        "description": "Rome IV criteria for IBS/FD/bloating, Bristol Stool Chart, symptom severity score, gut-brain axis.",
        "category": "gastro", "subcategory": "gastro-functional", "icon": "🫁",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "GI Bleed Assessment",
        "description": "Rockall pre- and post-endoscopy auto-score, Glasgow-Blatchford, Forrest classification, endoscopy findings.",
        "category": "gastro", "subcategory": "gastro-gi-bleed", "icon": "🩸",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "GI Cancer Assessment",
        "description": "AJCC TNM staging for CRC/gastric/esophageal, ECOG, MSI/MMR status, Lynch syndrome screen, MDT outcome.",
        "category": "gastro", "subcategory": "gastro-gi-cancer", "icon": "🎗️",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Gastroparesis & Motility Assessment",
        "description": "GCSI auto-score, gastric emptying scintigraphy, SmartPill findings, diet texture and prokinetic record.",
        "category": "gastro", "subcategory": "gastro-gastroparesis", "icon": "⏳",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Inflammatory Bowel Disease Assessment",
        "description": "CDAI/HBI auto-score (Crohn's), Mayo/SCCAI (UC), endoscopic SES-CD/UCEIS, biologics tracking, fistula.",
        "category": "gastro", "subcategory": "gastro-ibd", "icon": "🔥",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Liver Disease Assessment",
        "description": "Child-Pugh auto-score + class, MELD-Na, NAFLD FIB-4, ascites grading, hepatic encephalopathy West Haven.",
        "category": "gastro", "subcategory": "gastro-liver", "icon": "🍺",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Peptic Ulcer & GERD Assessment",
        "description": "GERD-Q score, H. pylori status, PPI response, Barrett's risk, DU/GU size and healing tracking.",
        "category": "gastro", "subcategory": "gastro-peptic-ulcer", "icon": "🔴",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },

    # ── Obstetrics & Gynaecology ─────────────────────────────────────────────────
    {
        "title": "ANC Follow-up",
        "description": "Fundal height, fetal movements, BP, urine dipstick, weight gain, fetal presentation tracking.",
        "category": "obg", "subcategory": "obg-anc-followup", "icon": "🤰",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Antenatal Booking Assessment",
        "description": "Obstetric history, LMP/EDD, booking investigations, dating USG, first-trimester screening.",
        "category": "obg", "subcategory": "obg-antenatal", "icon": "📅",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Cervical Screening & Colposcopy",
        "description": "Pap smear Bethesda reporting, HPV genotyping, colposcopy findings, LEEP/cone biopsy record.",
        "category": "obg", "subcategory": "obg-cervical", "icon": "🔬",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Female Infertility Assessment",
        "description": "Ovarian reserve (AMH/AFC), HSG, semen analysis, IVF cycle tracking, PCOS/endometriosis screen.",
        "category": "obg", "subcategory": "obg-infertility", "icon": "🌸",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Gestational Diabetes Assessment",
        "description": "75g OGTT interpretation, fasting/2h values, insulin titration, fetal growth monitoring, postpartum OGTT plan.",
        "category": "obg", "subcategory": "obg-gdm", "icon": "🍬",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "High-Risk Pregnancy Assessment",
        "description": "Risk factor scoring, fetal surveillance plan, perinatology referral, MFM consultation record.",
        "category": "obg", "subcategory": "obg-high-risk", "icon": "⚠️",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Labour & Delivery Assessment",
        "description": "Bishop score auto-calc, partograph, progress in labour, CTG interpretation, second-stage monitoring.",
        "category": "obg", "subcategory": "obg-labour", "icon": "👶",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Menopause Assessment",
        "description": "MRS symptom score, FSH/LH/E2 values, bone density, HRT eligibility and risk counselling.",
        "category": "obg", "subcategory": "obg-menopause", "icon": "🌡️",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Menstrual Disorder Assessment",
        "description": "PALM-COEIN classification, PBAC chart, cycle regularity, dysmenorrhoea VAS, hormone profile.",
        "category": "obg", "subcategory": "obg-menstrual", "icon": "📆",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "PCOS Assessment",
        "description": "Rotterdam criteria, modified Ferriman-Gallwey hirsutism score, metabolic panel, contraception plan.",
        "category": "obg", "subcategory": "obg-pcos", "icon": "🔵",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Pelvic Inflammatory Disease Assessment",
        "description": "CDC minimum criteria, IUCD relevance, culture/sensitivity, inpatient vs outpatient decision.",
        "category": "obg", "subcategory": "obg-pid", "icon": "🦠",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Postpartum Assessment",
        "description": "Edinburgh PND Scale auto-score, uterine involution, lochia, breastfeeding assessment, EPDS action plan.",
        "category": "obg", "subcategory": "obg-postpartum", "icon": "💕",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Preeclampsia & Hypertensive Disorders Assessment",
        "description": "ISSHP classification, CTG, fetal growth, magnesium sulfate protocol, delivery timing decision.",
        "category": "obg", "subcategory": "obg-preeclampsia", "icon": "🩺",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },

    # ── Orthopedics ──────────────────────────────────────────────────────────────
    {
        "title": "Acute Compartment Syndrome Assessment",
        "description": "Compartment pressure measurement, 6Ps checklist, fasciotomy urgency, post-release wound tracking.",
        "category": "orthopedic", "subcategory": "ortho-compartment-syndrome", "icon": "🦵",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Fracture & Trauma Assessment",
        "description": "AO/OTA classification, ISS auto-tally, neurovascular status, reduction and fixation record.",
        "category": "orthopedic", "subcategory": "ortho-fracture", "icon": "🦴",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Musculoskeletal Pain Assessment",
        "description": "Widespread pain index, symptom severity scale, fibromyalgia diagnostic criteria, pain mapping.",
        "category": "orthopedic", "subcategory": "ortho-msk-pain", "icon": "🩹",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Elbow Assessment",
        "description": "Mayo elbow performance score, lateral epicondyle assessment, cubital tunnel, BROMAP, ROM.",
        "category": "orthopedic", "subcategory": "ortho-elbow", "icon": "💪",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Foot & Ankle Assessment",
        "description": "AOFAS score, hindfoot alignment, flat foot grading, Achilles tendon, ankle arthritis, ATFL laxity.",
        "category": "orthopedic", "subcategory": "ortho-foot-ankle", "icon": "🦶",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Hand & Wrist Assessment",
        "description": "DASH score, grip strength, carpal tunnel Phalen/Tinel, Finkelstein, DRUJ stability, finger ROM.",
        "category": "orthopedic", "subcategory": "ortho-hand-wrist", "icon": "✋",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Hip Assessment",
        "description": "Harris Hip Score, NAON hip OA grading, FAI impingement tests, THA/TKA planning, leg length.",
        "category": "orthopedic", "subcategory": "ortho-hip", "icon": "🦿",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Knee Assessment",
        "description": "KOOS/WOMAC auto-score, Lachman/McMurray/pivot shift, meniscus, OA grading, arthroplasty plan.",
        "category": "orthopedic", "subcategory": "ortho-knee", "icon": "🦵",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Septic Arthritis & Osteomyelitis Assessment",
        "description": "Kocher criteria auto-score, Cierny-Mader osteomyelitis classification, culture, surgical debridement.",
        "category": "orthopedic", "subcategory": "ortho-septic-arthritis", "icon": "🦠",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Shoulder Assessment",
        "description": "Oxford shoulder score, rotator cuff grading, Constant score, SLAP, impingement, instability tests.",
        "category": "orthopedic", "subcategory": "ortho-shoulder", "icon": "💪",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Orthopedic Tumor Assessment",
        "description": "Enneking surgical staging, biopsy record, Mirels score, bone tumour MDT outcome, limb salvage plan.",
        "category": "orthopedic", "subcategory": "ortho-tumor", "icon": "🎗️",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Orthotic & Prosthetic Assessment",
        "description": "K-level ambulation, stump assessment, prosthetic socket fit, gait deviation, functional goals.",
        "category": "orthopedic", "subcategory": "ortho-prosthetic", "icon": "🦾",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Osteoporosis Assessment",
        "description": "FRAX 10-year fracture risk auto-calc, DEXA T-score/Z-score, calcium/vitamin D, bisphosphonate record.",
        "category": "orthopedic", "subcategory": "ortho-osteoporosis", "icon": "🦴",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Pediatric Orthopedic Assessment",
        "description": "DDH Barlow/Ortolani, LCP Herring classification, SUFE slip angle, scoliosis Cobb angle, bone age.",
        "category": "orthopedic", "subcategory": "ortho-pediatric", "icon": "👶",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Peripheral Nerve Assessment",
        "description": "Sunderland grading, EMG/NCS findings, mononeuropathy vs polyneuropathy, nerve repair record.",
        "category": "orthopedic", "subcategory": "ortho-peripheral-nerve", "icon": "⚡",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Post-Op Rehabilitation Assessment",
        "description": "Functional milestones, ROM progress, pain VAS, physiotherapy response, discharge readiness.",
        "category": "orthopedic", "subcategory": "ortho-postop-rehab", "icon": "🏃",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Spine Assessment",
        "description": "VAS/ODI/NDI auto-score, myelopathy mJOA, Frankel grade, TLICS/SLIC scoring, surgical planning.",
        "category": "orthopedic", "subcategory": "ortho-spine", "icon": "🦴",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },

    # ── Pediatrics ───────────────────────────────────────────────────────────────
    {
        "title": "Adolescent Health Assessment",
        "description": "HEADSSS screen, pubertal staging (Tanner), menstrual history, CRAFFT substance screen, mental health.",
        "category": "pediatrics", "subcategory": "peds-adolescent", "icon": "🧑",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "NICU Assessment",
        "description": "Gestational age, CRIB-II score, NAS Finnegan auto-score, sepsis screen, invasive line record.",
        "category": "pediatrics", "subcategory": "peds-nicu", "icon": "🍼",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Neonatal Assessment",
        "description": "Ballard maturity score, APGAR 1 & 5 min, NNJ/SBR tracking, neonatal feeding log, jaundice phototherapy.",
        "category": "pediatrics", "subcategory": "peds-neonatal", "icon": "👶",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Pediatric Cardiology Assessment",
        "description": "Congenital heart disease classification, saturation monitoring, Ross heart failure score, catheter data.",
        "category": "pediatrics", "subcategory": "peds-cardiology", "icon": "❤️",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Developmental Disorders Assessment",
        "description": "M-CHAT-R 20-item auto-score (autism), Vanderbilt ADHD 18+18 auto-subtype, IQ classification, GMFCS, SLD.",
        "category": "pediatrics", "subcategory": "peds-developmental", "icon": "🧩",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Pediatric Emergency Assessment",
        "description": "PEWS auto-score, PECARN TBI decision, PRISM-III severity, paediatric sepsis SIRS criteria.",
        "category": "pediatrics", "subcategory": "peds-emergency", "icon": "🚨",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Pediatric Endocrinology Assessment",
        "description": "Growth velocity, bone age, T1DM HbA1c tracking, thyroid neonatal screen, CAH 17-OHP protocol.",
        "category": "pediatrics", "subcategory": "peds-endocrinology", "icon": "🔬",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Pediatric Fever & Infections Assessment",
        "description": "Fever source checklist, dengue NS1/IgM/IgG, malaria smear, typhoid Widal, antibiotic stewardship.",
        "category": "pediatrics", "subcategory": "peds-fever", "icon": "🌡️",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Pediatric Gastro & Nutrition Assessment",
        "description": "STAMP malnutrition score, z-scores (W/A, H/A, W/H), SAM/MAM criteria, ESPGHAN IBD criteria.",
        "category": "pediatrics", "subcategory": "peds-gastro", "icon": "🍎",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Pediatric Growth & Development Assessment",
        "description": "WHO/IAP z-score auto-plot, developmental milestone log, vision/hearing screen, school readiness.",
        "category": "pediatrics", "subcategory": "peds-growth", "icon": "📏",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Pediatric Haematology & Oncology Assessment",
        "description": "BFM ALL risk auto-class, ITP platelet threshold, G6PD, sickle cell HU therapy, Ann Arbor lymphoma staging.",
        "category": "pediatrics", "subcategory": "peds-haematology", "icon": "🩸",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Pediatric Nephrology Assessment",
        "description": "eGFR Schwartz auto-calc, CKD staging, nephrotic vs nephritic differentiation, renal biopsy record.",
        "category": "pediatrics", "subcategory": "peds-nephrology", "icon": "🫘",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Pediatric Neurology Assessment",
        "description": "Paediatric seizure classification (ILAE), EEG report, GCS modified, cerebral palsy GMFCS, MMC level.",
        "category": "pediatrics", "subcategory": "peds-neurology", "icon": "🧠",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Pediatric Respiratory Assessment",
        "description": "PRAM/PSSS asthma severity, PICU admission triggers, croup Westley score, RSV bronchiolitis AARB.",
        "category": "pediatrics", "subcategory": "peds-respiratory", "icon": "🫁",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Pediatric Rheumatology Assessment",
        "description": "JADAS-27 auto-score, JIA classification (ILAR), pJAI enthesitis/uveitis screen, biologics tracking.",
        "category": "pediatrics", "subcategory": "peds-rheumatology", "icon": "🦴",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Vaccination Chart",
        "description": "IAP 2024 schedule with catch-up calculator, adverse event recording, cold-chain record, COVID & HPV.",
        "category": "pediatrics", "subcategory": "peds-vaccination", "icon": "💉",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },

    # ── Specialty ────────────────────────────────────────────────────────────────
    {
        "title": "Aerosol Therapy Assessment",
        "description": "Nebuliser vs pMDI vs DPI technique, peak flow, spacer compatibility, bronchodilator response.",
        "category": "specialty", "subcategory": "specialty-aerosol", "icon": "💨",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Asthma Assessment (Specialty)",
        "description": "Full asthma assessment — spirometry, control, step-up plan, trigger diary, biologics eligibility.",
        "category": "specialty", "subcategory": "specialty-asthma", "icon": "🌬️",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
    },
    {
        "title": "Diabetes Assessment",
        "description": "Type 1/2 classification, HbA1c tracking, SMBG log, hypoglycaemia frequency, complication screen.",
        "category": "specialty", "subcategory": "specialty-diabetes", "icon": "🩸",
        "schema": {}, "alert_rules": [], "scoring_config": None, "iview_config": None,
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
