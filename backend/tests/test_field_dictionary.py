"""Validates the canonical clinical field dictionary and its resolver.

Guards the "capture anywhere → one field_id → one place, retrieve without
confusion" contract: the dictionary must be internally consistent, and every
label/alias/legacy-key we rely on must resolve to exactly one canonical field_id.

Run: python backend/tests/test_field_dictionary.py
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from app.core.field_dictionary import (
    resolve, is_canonical, canonicalize_dict, concepts,
)


def test_dictionary_is_consistent():
    seen = {}
    for fid, spec in concepts().items():
        assert fid == fid.lower(), f"canonical field_id must be lowercase: {fid}"
        assert spec.get("group"), f"{fid} missing group"
        assert "type" in spec, f"{fid} missing type"
        # No key (canonical / alias / label) may map to two different concepts.
        keys = [fid] + list(spec.get("aliases", []) or []) + list(spec.get("labels", []) or [])
        for k in keys:
            kl = k.lower()
            assert kl not in seen or seen[kl] == fid, \
                f"ambiguous key '{k}' maps to both {seen[kl]} and {fid}"
            seen[kl] = fid


def test_resolver_maps_labels_and_aliases():
    # The exact drift that caused real bugs — every wording resolves to one id.
    assert resolve("BP") == "blood_pressure_systolic"
    assert resolve("Blood Pressure") == "blood_pressure_systolic"
    assert resolve("Systolic") == "blood_pressure_systolic"
    assert resolve("bp_systolic") == "blood_pressure_systolic"       # legacy storage key
    assert resolve("respiration_rate") == "respiratory_rate"
    assert resolve("heart_rate") == "pulse" and resolve("HR") == "pulse"
    assert resolve("drug_name") == "medicine_name"
    assert resolve("normal_range") == "reference_range"
    assert resolve("study_description") == "procedure_name"
    # Case-insensitive + whitespace tolerant.
    assert resolve("  bp  ") == "blood_pressure_systolic"
    # Unknown term is not force-mapped (never silently mis-file data).
    assert resolve("totally_unknown_field") is None


def test_is_canonical():
    assert is_canonical("pulse") and is_canonical("follow_up_days")
    assert not is_canonical("heart_rate")   # that's an alias, not canonical


def test_canonicalize_dict():
    # A payload captured with mixed legacy/label keys collapses to canonical ids.
    src = {"bp_systolic": 120, "bp_diastolic": 80, "heart_rate": 72, "Temp": 37.0,
           "custom_note": "keep me"}
    out = canonicalize_dict(src)
    assert out["blood_pressure_systolic"] == 120
    assert out["blood_pressure_diastolic"] == 80
    assert out["pulse"] == 72
    assert out["temperature"] == 37.0
    assert out["custom_note"] == "keep me"   # unknown key preserved, not dropped


if __name__ == "__main__":
    test_dictionary_is_consistent()
    test_resolver_maps_labels_and_aliases()
    test_is_canonical()
    test_canonicalize_dict()
    print("ALL FIELD-DICTIONARY ASSERTIONS PASSED")
