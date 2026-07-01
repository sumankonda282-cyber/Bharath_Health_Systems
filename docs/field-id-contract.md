# Field-ID Contract — one canonical key per concept, validated

> **The rule that prevents the "data disappears" bug class.**
> A concept's **display label may differ across portals** (a doctor's "BP", a nurse's
> "Blood Pressure", reception's "B.P.") — but the **field key that carries it between
> backend and frontend must be ONE canonical `field_id`, everywhere.** When the write
> key and the read key drift apart, the value is silently dropped. Every round-trip bug
> we fixed (BP/RR, lab unit/range/flag, prescription route, follow-up, lab notes,
> `allergies_coded`) was a violation of this rule.

## How it's enforced

**1. Dynamic assessment forms → the Master Field Registry.**
`frontend/admin/src/data/fieldRegistry.js` holds the canonical `field_id` for each form
concept. Labels are free; the `field_id` is frozen once a form has submissions
(`assessment_forms.py` update_form rejects dropping/renaming a `field_id` that has
charted data). Same concept = same `field_id` in every form and every portal.

**2. Hard-coded clinical surfaces → the contract test.**
Encounter/vitals/lab/imaging round-trips aren't dynamic forms — they're hand-written
payloads and response dicts. These are pinned by `backend/tests/test_field_contract.py`,
which asserts each surface returns the canonical keys the frontends read. **Rename or
drop one → the test fails** — the break is caught before deploy, not silently in prod.
Extend `CONTRACTS`/tests as new shared surfaces are hardened.

## Canonical keys (current, hardened surfaces)

| Concept | Canonical key(s) | Notes |
|---|---|---|
| Blood pressure (composite) | `blood_pressure` (LOINC 85354-9) → components `blood_pressure_systolic` (8480-6) + `blood_pressure_diastolic` (8462-4) | **"BP"/"Blood Pressure" = the composite sys/dia pair, NEVER a single number.** "Systolic"→systolic only, "Diastolic"→diastolic only. Inpatient vitals emit `bp_systolic`/`bp_diastolic` (+ `blood_pressure_systolic`/`_diastolic` aliases for the shared shell). |
| Respiratory rate | `respiratory_rate` (+ `respiration_rate` alias) | |
| Pulse / SpO₂ / Temp | `pulse` / `spo2` / `temperature` | already consistent |
| Lab result | `result_value`, `result_notes`, `reference_range`, `unit`, `flag`, `is_abnormal` | list GET must return the **stored per-result** values, not the catalogue default |
| Lab order (per encounter) | response key `lab_orders` → `items[].{test_name, notes}` | loader must read `lab_orders`, not `lab_order.tests` |
| Prescription item | `medicine_name, dosage, frequency, duration, route, instructions` | `route` persists end-to-end |
| SOAP | `subjective, objective, assessment, plan, counselling, follow_up_days` | |
| Imaging order | `procedure_name, modality, notes` | loader reads `imaging_orders` |
| Patient allergies | `allergies` (free text) — coded allergies (`allergies_coded`) NOT yet backed by a column | see round-trip audit R12 |

## When you add or touch a data-collection point

1. **Reuse the canonical `field_id`/key** for the concept — never invent a synonym
   because the label is different here. Check this doc + `fieldRegistry.js` first.
2. If it's a dynamic form field → use the registry `field_id`.
3. If it's a hand-written payload/response → add/extend an assertion in
   `test_field_contract.py` so the write↔read keys are locked.
4. Adding a genuinely new concept? Add its canonical key here, then use it on both ends.

*This contract is the durable fix for cross-portal key drift. Keep it and the contract
test in sync as surfaces are hardened.*
