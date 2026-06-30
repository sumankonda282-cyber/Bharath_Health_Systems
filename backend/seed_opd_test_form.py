#!/usr/bin/env python3
"""
Seeds one OPD test assessment form for verifying chart form rendering.

Rules followed:
- category "History & Complaint" → routes to S (Subjective) bucket via OpdChart.jsx regex
- status "published" + published_at set → appears in search results
- clinic_id None → global, visible to all clinics (both global + clinic-scoped queries)
- 4 structured fields → _form_field_count > 0 so include_empty filter does not hide it
- schema fields have id/type/label matching what FormContentRenderer reads as key-value pairs
- is_template True → appears in form library search

Idempotent — skips insert if a non-deleted form with this title already exists.

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
    "title":       FORM_TITLE,
    "description": "Test form — History of presenting illness. Verifies OPD chart SOAP routing (Subjective section) and form-data key-value rendering.",
    # "History & Complaint" matches /history|complaint/ regex → routes to S bucket
    "category":    "History & Complaint",
    "subcategory": "subjective",
    "status":      "published",
    "icon":        "📋",
    "clinic_id":   None,       # global — visible in both global and clinic-scoped searches
    "is_template": True,       # appears in form library
    "schema": {
        "fields": [
            {
                "id":          "chief_complaint",
                "type":        "text",
                "label":       "Chief Complaint",
                "required":    True,
                "placeholder": "Main reason for today's visit"
            },
            {
                "id":          "duration",
                "type":        "text",
                "label":       "Duration of Symptoms",
                "required":    False,
                "placeholder": "e.g. 3 days, 2 weeks"
            },
            {
                "id":          "severity",
                "type":        "select",
                "label":       "Severity",
                "required":    False,
                "options":     ["Mild", "Moderate", "Severe"]
            },
            {
                "id":          "associated_symptoms",
                "type":        "textarea",
                "label":       "Associated Symptoms",
                "required":    False,
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
            published_at = now,   # required so status=published is meaningful
            created_at   = now,
            updated_at   = now,
        )
        db.add(form)
        db.commit()
        db.refresh(form)
        print(f"[seed] Created: id={form.id} title='{form.title}' category='{form.category}' status='{form.status}'")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
