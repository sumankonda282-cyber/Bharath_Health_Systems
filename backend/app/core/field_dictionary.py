"""Canonical clinical field dictionary — resolver + validator.

One concept = one canonical ``field_id``. Whatever a portal calls it ("BP",
"Blood Pressure", "Systolic") or however a legacy payload keyed it
("bp_systolic"), it resolves to the SAME canonical field_id — so a value captured
in any portal lands in one place in the patient record and is retrieved without
confusion.

Usage:
    from app.core.field_dictionary import resolve, is_canonical, canonicalize_dict

    resolve("BP")            -> "blood_pressure_systolic"
    resolve("bp_systolic")   -> "blood_pressure_systolic"
    is_canonical("pulse")    -> True
    canonicalize_dict({"bp_systolic": 120, "heart_rate": 72})
                             -> {"blood_pressure_systolic": 120, "pulse": 72}
"""
import json
import os
from functools import lru_cache
from typing import Dict, Optional

_PATH = os.path.join(os.path.dirname(__file__), "clinical_field_dictionary.json")


@lru_cache(maxsize=1)
def _load() -> dict:
    with open(_PATH, "r", encoding="utf-8") as fh:
        return json.load(fh)


@lru_cache(maxsize=1)
def _lookup() -> Dict[str, str]:
    """Build a case-insensitive map of {canonical|alias|label} -> canonical field_id."""
    m: Dict[str, str] = {}
    for fid, spec in _load()["concepts"].items():
        m[fid.lower()] = fid
        for alias in spec.get("aliases", []) or []:
            m[alias.lower()] = fid
        for label in spec.get("labels", []) or []:
            m[label.lower()] = fid
    return m


def concepts() -> Dict[str, dict]:
    return _load()["concepts"]


def is_canonical(field_id: str) -> bool:
    return field_id in _load()["concepts"]


def resolve(term: Optional[str]) -> Optional[str]:
    """Map any label / alias / canonical id (case-insensitive) to its canonical
    field_id. Returns None if the term is unknown to the dictionary."""
    if not term:
        return None
    return _lookup().get(str(term).strip().lower())


def canonicalize_dict(data: dict) -> dict:
    """Return a copy of ``data`` with every recognised key rewritten to its canonical
    field_id. Unknown keys are passed through unchanged (never silently dropped)."""
    out = {}
    for k, v in (data or {}).items():
        out[resolve(k) or k] = v
    return out


def spec(field_id: str) -> Optional[dict]:
    return _load()["concepts"].get(field_id)
