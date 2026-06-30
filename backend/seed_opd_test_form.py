#!/usr/bin/env python3
"""
Seeds one OPD test assessment form for verifying the OPD chart form rendering.

The form uses category "History & Complaint" so the categorization regex in
OpdChart.jsx routes it to the S (Subjective) SOAP bucket.

It has four structured fields so FormContentRenderer renders real key-value
content rather than the fallback link.

Idempotent — skips insert if a form with this exact title already exists.

Run from backend/ directory:
    python seed_opd_test_form.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    print("[seed] DATABASE_URL not set — skipping")
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

FORM_TITLE = "OPD History & Complaint (Test)"

FORM = {
    "title": FORM_TITLE,
    "description": "Test form for verifying OPD chart SOAP categorization and form-data rendering. Routes to Subjective (S) section.",
    "category": "History & Complaint",
    "subcategory": "subjective",
    "status": "published",
    "icon": "📋",
    "clinic_id": None,   # global — available to all clinics
    "is_template": True,
    "schema": {
        "fields": [
            {
                "id": "chief_complaint",
                "type": "text",
                "label": "Chief Complaint",
                "required": True,
                "placeholder": "Main reason for today's visit"
            },
            {
                "id": "duration",
                "type": "text",
                "label": "Duration of Symptoms",
                "required": False,
                "placeholder": "e.g. 3 days, 2 weeks"
            },
            {
                "id": "severity",
                "type": "select",
                "label": "Severity",
                "required": False,
                "options": ["Mild", "Moderate", "Severe"]
            },
            {
                "id": "associated_symptoms",
                "type": "textarea",
                "label": "Associated Symptoms",
                "required": False,
                "placeholder": "Any other symptoms the patient reports…"
            }
        ]
    }
}


def seed():
    db = Session()
    try:
        existing = db.query(AssessmentForm).filter(
            AssessmentForm.title == FORM_TITLE,
            AssessmentForm.deleted_at.is_(None),
        ).first()
        if existing:
            print(f"[seed] Form already exists (id={existing.id}) — skipping.")
            return

        form = AssessmentForm(
            title           = FORM["title"],
            description     = FORM["description"],
            category        = FORM["category"],
            subcategory     = FORM["subcategory"],
            status          = FORM["status"],
            icon            = FORM["icon"],
            clinic_id       = FORM["clinic_id"],
            is_template     = FORM["is_template"],
            schema          = FORM["schema"],
            version         = 1,
            created_at      = datetime.utcnow(),
            updated_at      = datetime.utcnow(),
        )
        db.add(form)
        db.commit()
        db.refresh(form)
        print(f"[seed] Created form id={form.id} title='{form.title}' category='{form.category}'")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
