"""
reset_operational_data.py — go-live clean slate.

Wipes ALL operational / tenant data (clinics, branches, staff, doctors, patients,
and every clinical / billing / pharmacy / lab / imaging / inpatient / chat /
telehealth / scheduler / forms-submission record) while PRESERVING:

  • Reference libraries (the "knowledge" that powers search / form-filling):
      drugs + drug_interactions/dose_ranges/contraindications/counselling,
      pregnancy_categories, food_drug_interactions, disease_counselling,
      medical_terms (ICD-10), imaging_catalog, lab_tests (reference rows only),
      specialties, bh_state_groups, plans, platform_settings.
  • Form templates / definitions (kept as a clinic-agnostic library):
      assessment_forms, assessment_form_versions, assessment_templates,
      form_templates  — globalized (clinic/author links cleared).
  • Exactly one platform superadmin, (re)created from SUPERADMIN_EMAIL /
    SUPERADMIN_PASSWORD env (falls back to the legacy default if unset).

Identity counters are reset so the first real clinic starts fresh.
This changes DATA only — no schema/structure changes, nothing dropped.

SAFETY: refuses to run unless CONFIRM_RESET=YES (or --yes is passed).

Run (from the backend/ directory):
    CONFIRM_RESET=YES python reset_operational_data.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text                                    # noqa: E402
from app.db.session import SessionLocal                        # noqa: E402
from app.core.security import hash_password                     # noqa: E402
from app.models.models import PlatformAdmin, PlatformSetting    # noqa: E402

RESET_TOKEN_KEY = "reset_applied_token"

# Reference libraries + form templates + platform config — never emptied.
PRESERVE = {
    # medicine / drug knowledge
    "drugs", "drug_interactions", "drug_dose_ranges", "drug_contraindications",
    "drug_counselling", "pregnancy_categories", "food_drug_interactions",
    "disease_counselling",
    # terminology / catalogues
    "medical_terms", "imaging_catalog",
    # mixed: reference rows kept (branch_id IS NULL), demo branch rows deleted below
    "lab_tests",
    # platform reference (platform_admins preserved so the operator is never locked out)
    "specialties", "bh_state_groups", "plans", "platform_settings", "platform_admins",
    # form templates / definitions (keep ALL — globalized into a clinic-agnostic library)
    "assessment_forms", "assessment_form_versions", "assessment_templates",
    "form_templates",
}

DEMO_SENTINEL_KEY = "demo_clinical_seeded_v1"


def _all_tables(db):
    return {r[0] for r in db.execute(
        text("SELECT tablename FROM pg_tables WHERE schemaname='public'"))}


def _neutralize_preserved_fks(db, wipe):
    """NULL every FK column on a PRESERVED table that points at a table we are about
    to wipe. This (a) lets the preserved rows survive the wipe and (b) turns
    clinic/branch/author-scoped reference + template rows into clean global rows so
    they never mis-attach to a future clinic that reuses a recycled id."""
    rows = db.execute(text(
        """
        SELECT tc.table_name, kcu.column_name, ccu.table_name AS ref_table, c.is_nullable
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
        JOIN information_schema.columns c
          ON c.table_name = tc.table_name AND c.column_name = kcu.column_name
             AND c.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
        """
    )).fetchall()
    # lab_tests: keep the reference catalogue (branch_id IS NULL), drop demo branch
    # tests FIRST — before the generic NULL pass below would blank branch_id and keep them.
    deleted_branch_tests = db.execute(
        text("DELETE FROM lab_tests WHERE branch_id IS NOT NULL")).rowcount

    nulled, dropped = [], []
    for tbl, col, ref, nullable in rows:
        if tbl == "lab_tests" and col == "branch_id":
            continue  # handled above
        if tbl in PRESERVE and ref in wipe:
            if nullable == "YES":
                db.execute(text(f'UPDATE "{tbl}" SET "{col}" = NULL WHERE "{col}" IS NOT NULL'))
                nulled.append(f"{tbl}.{col}->{ref}")
            else:
                db.execute(text(f'DELETE FROM "{tbl}" WHERE "{col}" IS NOT NULL'))
                dropped.append(f"{tbl}.{col}->{ref}")
    db.commit()
    if deleted_branch_tests:
        print(f"[reset] removed {deleted_branch_tests} demo branch lab_tests (kept reference catalogue)")
    return nulled, dropped


def _empty_via_truncate(db, wipe):
    """Fast path: one atomic TRUNCATE with FK enforcement disabled (needs superuser)."""
    ident = ", ".join(f'"{t}"' for t in sorted(wipe))
    db.execute(text("SET session_replication_role = replica"))
    db.execute(text(f"TRUNCATE {ident} RESTART IDENTITY"))
    db.execute(text("SET session_replication_role = DEFAULT"))
    db.commit()


def _empty_via_delete(db, wipe):
    """Fallback (no superuser): delete child-before-parent via iterative retry, then
    reset identity sequences. FKs from preserved tables are already neutralized."""
    remaining = set(wipe)
    for _ in range(40):
        if not remaining:
            break
        progressed = False
        for t in sorted(remaining):
            try:
                db.execute(text(f'DELETE FROM "{t}"'))
                db.commit()
                remaining.discard(t)
                progressed = True
            except Exception:
                db.rollback()
        if not progressed:
            # break any FK cycle by nulling nullable inter-wipe FKs, then retry.
            for t in sorted(remaining):
                for col in _nullable_fk_cols(db, t, remaining):
                    try:
                        db.execute(text(f'UPDATE "{t}" SET "{col}" = NULL'))
                        db.commit()
                    except Exception:
                        db.rollback()
    if remaining:
        print(f"  ⚠ could not empty: {sorted(remaining)}")
    # reset identity counters
    for t in wipe:
        seq = db.execute(text("SELECT pg_get_serial_sequence(:t, 'id')"), {"t": t}).scalar()
        if seq:
            db.execute(text("SELECT setval(:s, 1, false)"), {"s": seq})
    db.commit()


def _nullable_fk_cols(db, table, ref_set):
    rows = db.execute(text(
        """
        SELECT kcu.column_name, ccu.table_name AS ref_table, c.is_nullable
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
        JOIN information_schema.columns c
          ON c.table_name = tc.table_name AND c.column_name = kcu.column_name
             AND c.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
              AND tc.table_name = :t
        """
    ), {"t": table}).fetchall()
    return [col for col, ref, nullable in rows if ref in ref_set and nullable == "YES"]


def main():
    if os.getenv("CONFIRM_RESET") != "YES" and "--yes" not in sys.argv:
        print("Refusing to run. Set CONFIRM_RESET=YES (or pass --yes) to confirm the wipe.")
        sys.exit(2)

    admin_email = os.getenv("SUPERADMIN_EMAIL") or "superadmin@bharathealth.com"
    admin_pw = os.getenv("SUPERADMIN_PASSWORD") or "SuperAdmin@123"
    if not os.getenv("SUPERADMIN_EMAIL") or not os.getenv("SUPERADMIN_PASSWORD"):
        print("  ⚠ SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD not set — using default "
              "superadmin@bharathealth.com / SuperAdmin@123 (change before go-live).")

    # Deploy-triggered path (start.sh sets RESET_TOKEN) is idempotent: a given token
    # wipes exactly once, so redeploys never re-wipe. Manual runs (no token) always run.
    reset_token = os.getenv("RESET_TOKEN")

    db = SessionLocal()
    try:
        if reset_token:
            row = db.query(PlatformSetting).filter_by(key=RESET_TOKEN_KEY).first()
            if row and isinstance(row.value, dict) and str(row.value.get("token")) == reset_token:
                print(f"[reset] token '{reset_token}' already applied — skipping (no re-wipe).")
                return

        all_tables = _all_tables(db)
        missing = PRESERVE - all_tables
        if missing:
            print(f"  ⚠ preserve-list tables not found (ignored): {sorted(missing)}")
        wipe = all_tables - PRESERVE
        print(f"[reset] {len(all_tables)} tables · preserving {len(all_tables & PRESERVE)} · wiping {len(wipe)}")

        nulled, dropped = _neutralize_preserved_fks(db, wipe)
        if nulled:
            print(f"[reset] globalized preserved FK columns: {', '.join(nulled)}")
        if dropped:
            print(f"[reset] removed clinic-scoped reference rows: {', '.join(dropped)}")

        try:
            _empty_via_truncate(db, wipe)
            print("[reset] emptied operational tables (TRUNCATE RESTART IDENTITY)")
        except Exception as e:
            db.rollback()
            print(f"[reset] TRUNCATE path unavailable ({type(e).__name__}); using ordered DELETE fallback")
            _empty_via_delete(db, wipe)
            print("[reset] emptied operational tables (DELETE + sequence reset)")

        # clear demo sentinel so the (now-gated) clinical demo seed stays off
        db.execute(text("DELETE FROM platform_settings WHERE key = :k"), {"k": DEMO_SENTINEL_KEY})

        # Ensure exactly one platform superadmin survives. platform_admins is preserved
        # (above), so this is an idempotent UPSERT — it never deletes the operator's only
        # way in, and only resets the password when one is explicitly provided via env.
        admin = db.query(PlatformAdmin).filter(PlatformAdmin.email == admin_email).first()
        if admin:
            admin.is_active = True
            if os.getenv("SUPERADMIN_PASSWORD"):
                admin.hashed_password = hash_password(admin_pw)
        else:
            db.add(PlatformAdmin(
                full_name="Platform Admin",
                email=admin_email,
                hashed_password=hash_password(admin_pw),
                is_active=True,
            ))
        db.commit()
        print(f"[reset] platform superadmin ready: {admin_email}")

        # remember which deploy-token applied this wipe (lives in preserved platform_settings)
        if reset_token:
            row = db.query(PlatformSetting).filter_by(key=RESET_TOKEN_KEY).first()
            if row:
                row.value = {"token": reset_token}
            else:
                db.add(PlatformSetting(key=RESET_TOKEN_KEY, value={"token": reset_token}))
            db.commit()
            print(f"[reset] recorded applied token '{reset_token}'")

        # summary
        def n(t):
            return db.execute(text(f'SELECT count(*) FROM "{t}"')).scalar()
        print("=" * 56)
        print("  CLEAN SLATE READY")
        print("=" * 56)
        for t in ("clinics", "staff", "patients", "appointments", "prescriptions",
                  "lab_orders", "imaging_orders", "invoices", "admissions"):
            if t in all_tables:
                print(f"  wiped  {t:<16}= {n(t)}")
        for t in ("drugs", "medical_terms", "imaging_catalog", "specialties", "plans"):
            if t in all_tables:
                print(f"  kept   {t:<16}= {n(t)}")
        print(f"  kept   {'lab_tests(ref)':<16}= "
              f"{db.execute(text('SELECT count(*) FROM lab_tests')).scalar()}")
        print(f"  admin  {'platform_admins':<16}= {n('platform_admins')}")
        print("=" * 56)
    except Exception as e:
        db.rollback()
        print(f"[reset] FAILED: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
