"""Idempotent vitals consolidation — run on every deploy from start.sh.

Guarantees EXACTLY ONE canonical 'Vital Signs' form circulates (the single vitals
record used by reception, nursing and doctors, and embeddable in any care form).
Every OTHER vitals form is RETIRED (status='retired' + removed from the form pool) —
its data is preserved, it simply stops circulating. Safe to re-run.
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if not os.getenv("DATABASE_URL"):
    print("[vitals] DATABASE_URL not set — skipping")
    sys.exit(0)

from datetime import datetime
from app.db.session import SessionLocal
from app.models.models import AssessmentForm, AssessmentFormVersion, FormPool

CANON_TITLE = "Vital Signs"


def _canonical_template():
    from seed_forms import TEMPLATES
    return next((t for t in TEMPLATES if t["title"] == CANON_TITLE), None)


def run():
    tpl = _canonical_template()
    if not tpl:
        print("[vitals] canonical template not found in seed_forms — skipping")
        return
    db = SessionLocal()
    try:
        form = db.query(AssessmentForm).filter_by(title=CANON_TITLE, is_template=True).first()
        if form:
            form.description      = tpl.get("description", form.description)
            form.category         = "vitals"
            form.subcategory      = "vital-signs"
            form.icon             = tpl.get("icon")
            form.schema           = tpl["schema"]
            form.iview_config     = tpl.get("iview_config")
            form.alert_rules      = tpl.get("alert_rules", [])
            form.is_iview_enabled = True
            form.status           = "published"
            if not form.published_at:
                form.published_at = datetime.utcnow()
            db.flush()
        else:
            form = AssessmentForm(
                title=CANON_TITLE, description=tpl.get("description", ""),
                category="vitals", subcategory="vital-signs", icon=tpl.get("icon"),
                schema=tpl["schema"], iview_config=tpl.get("iview_config"),
                alert_rules=tpl.get("alert_rules", []), scoring_config=None,
                is_template=True, is_iview_enabled=True, status="published",
                version=1, published_at=datetime.utcnow(),
            )
            db.add(form)
            db.flush()
            db.add(AssessmentFormVersion(
                form_id=form.id, version=form.version or 1,
                schema=tpl["schema"], published_at=datetime.utcnow()))

        # Ensure exactly one active pool row for the canonical form.
        pools = db.query(FormPool).filter_by(form_id=form.id).all()
        if not pools:
            db.add(FormPool(form_id=form.id, clinic_id=None, is_active=True))
        else:
            for i, p in enumerate(pools):
                p.is_active = (i == 0)

        # Retire every OTHER vitals form — keep the data, just stop it circulating.
        dups = db.query(AssessmentForm).filter(
            AssessmentForm.id != form.id,
            (AssessmentForm.title.in_(["Vitals Assessment", "Vital Signs Assessment", "Vital Signs"]))
            | ((AssessmentForm.category == "vitals") & (AssessmentForm.subcategory == "vital-signs"))
        ).all()
        retired = 0
        for d in dups:
            d.status = "retired"
            for p in db.query(FormPool).filter_by(form_id=d.id).all():
                db.delete(p)
            retired += 1

        db.commit()
        print(f"[vitals] canonical '{CANON_TITLE}' ensured (id={form.id}); "
              f"{retired} duplicate vitals form(s) retired + de-pooled.")
    except Exception as e:  # noqa: BLE001
        db.rollback()
        print(f"[vitals] consolidation failed (non-fatal): {e}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
