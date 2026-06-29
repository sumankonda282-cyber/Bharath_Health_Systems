#!/usr/bin/env python3
"""
Remove EMPTY assessment forms (0 fields) that carry NO clinical data, so they stop
appearing in portal search. SAFE BY DESIGN:

  • Dry-run by default — prints exactly what it WOULD delete and changes nothing.
    Set CONFIRM=YES to actually delete.
  • A form is NEVER deleted if it has any form_submissions or iview_observations
    (i.e. any clinical/charted data). Those are reported as KEPT.
  • Only forms whose schema has zero fields across all sections are even considered.
  • Each candidate's dependent rows (versions, pool, assignments, favorites,
    flowsheets) are removed first, then the form, inside one transaction.

Usage (run from backend/):
    python cleanup_empty_assessment_forms.py            # dry-run (audit only)
    CONFIRM=YES python cleanup_empty_assessment_forms.py # perform deletion
    TEMPLATES_ONLY=YES python cleanup_empty_assessment_forms.py  # restrict to is_template forms
"""
import os
import sys

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    print("[cleanup] DATABASE_URL not set — aborting"); sys.exit(1)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://") and "+psycopg2" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
from app.models.models import (
    AssessmentForm, AssessmentFormVersion, FormPool, FormAssignment,
    FormSubmission, StaffFormFavorite, iViewFlowsheet,
)
try:
    from app.models.models import iViewObservation
except Exception:
    iViewObservation = None

CONFIRM        = os.environ.get("CONFIRM", "").upper() == "YES"
TEMPLATES_ONLY = os.environ.get("TEMPLATES_ONLY", "").upper() == "YES"

engine = create_engine(DATABASE_URL, pool_pre_ping=True,
                       connect_args={"options": "-c prepared_statement_cache_size=0"} if "psycopg2" in DATABASE_URL else {})
Session = sessionmaker(bind=engine)


def field_count(form) -> int:
    sections = (form.schema or {}).get("sections") or []
    return sum(len((s or {}).get("fields") or []) for s in sections)


def main():
    db = Session()
    try:
        forms = db.query(AssessmentForm).all()
        empty = [f for f in forms if field_count(f) == 0]
        if TEMPLATES_ONLY:
            empty = [f for f in empty if f.is_template]

        # rich subcategories (a form with the same subcategory that DOES have fields)
        rich_subs = {f.subcategory for f in forms if f.subcategory and field_count(f) > 0}

        print(f"[cleanup] {len(forms)} total forms · {len(empty)} empty (0-field) forms found.\n")
        deletable, kept = [], []
        for f in empty:
            subs = db.query(func.count(FormSubmission.id)).filter(FormSubmission.form_id == f.id).scalar() or 0
            obs = 0
            if iViewObservation is not None:
                try:
                    obs = db.query(func.count(iViewObservation.id)).filter(iViewObservation.form_id == f.id).scalar() or 0
                except Exception:
                    obs = 0
            tag = f"HC{f.clinic_id}" if f.clinic_id else "GLOBAL"
            dup = "rich-dup✓" if f.subcategory in rich_subs else "no-rich-dup"
            if subs > 0 or obs > 0:
                kept.append(f)
                print(f"  KEEP    #{f.id:<5} {f.title[:40]:40s} [{tag}] — has {subs} submissions / {obs} observations (clinical data)")
            else:
                deletable.append(f)
                print(f"  DELETE  #{f.id:<5} {f.title[:40]:40s} [{tag}] sub={f.subcategory or '—'} status={f.status} {dup}")

        print(f"\n[cleanup] {len(deletable)} empty forms with NO clinical data → deletable. {len(kept)} kept (have data).")

        if not deletable:
            print("[cleanup] Nothing to delete.")
            return
        if not CONFIRM:
            print("\n[cleanup] DRY RUN — nothing changed. Re-run with CONFIRM=YES to delete the rows above.")
            return

        ids = [f.id for f in deletable]
        children = [
            (AssessmentFormVersion, "assessment_form_versions"),
            (FormPool, "form_pool"),
            (FormAssignment, "form_assignments"),
            (StaffFormFavorite, "staff_form_favorites"),
            (iViewFlowsheet, "iview_flowsheets"),
        ]
        if iViewObservation is not None:
            children.append((iViewObservation, "iview_observations"))
        for model, label in children:
            n = db.query(model).filter(model.form_id.in_(ids)).delete(synchronize_session=False)
            if n:
                print(f"  cleared {n:>4} rows from {label}")
        n = db.query(AssessmentForm).filter(AssessmentForm.id.in_(ids)).delete(synchronize_session=False)
        db.commit()
        print(f"\n[cleanup] Deleted {n} empty assessment forms. Done.")
    except Exception as e:
        db.rollback()
        print(f"[cleanup] FAILED (rolled back): {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
