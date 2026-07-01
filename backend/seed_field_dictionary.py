#!/usr/bin/env python3
"""Seed the canonical clinical field dictionary (DB) from the JSON source.

The JSON (app/core/clinical_field_dictionary.json) is the initial content; the DB
table clinical_field_definitions is the runtime source of truth that the admin
portal manages and every portal + the form builder reads via API.

Idempotent: upserts each GLOBAL (clinic_id NULL) concept by field_id — refreshes
labels/aliases/group/type/unit, never duplicates, never touches clinic-custom rows.
Safe to re-run on every deploy.
"""
import os, sys, json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if not os.getenv("DATABASE_URL"):
    print("[field-dict] DATABASE_URL not set — skipping")
    sys.exit(0)

from datetime import datetime
from app.db.session import SessionLocal
from app.models.models import ClinicalFieldDefinition

_JSON = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                     "app", "core", "clinical_field_dictionary.json")


def run():
    with open(_JSON, "r", encoding="utf-8") as fh:
        concepts = json.load(fh)["concepts"]

    db = SessionLocal()
    added = updated = 0
    try:
        for fid, spec in concepts.items():
            row = (db.query(ClinicalFieldDefinition)
                     .filter(ClinicalFieldDefinition.field_id == fid,
                             ClinicalFieldDefinition.clinic_id.is_(None))
                     .first())
            fields = dict(
                group=spec.get("group"),
                data_type=spec.get("type"),
                unit=spec.get("unit"),
                code=spec.get("code"),
                code_system=spec.get("code_system"),
                labels=spec.get("labels") or [],
                aliases=spec.get("aliases") or [],
                components=spec.get("components") or [],
                is_active=True,
            )
            if row:
                for k, v in fields.items():
                    setattr(row, k, v)
                row.updated_at = datetime.utcnow()
                updated += 1
            else:
                db.add(ClinicalFieldDefinition(field_id=fid, clinic_id=None, **fields))
                added += 1
        db.commit()
        print(f"[field-dict] Seeded clinical field dictionary — {added} added, {updated} refreshed.")
    except Exception as e:  # noqa: BLE001
        db.rollback()
        print(f"[field-dict] seed failed (non-fatal): {e}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
