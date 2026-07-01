# Provider Portal — Data Round-Trip Audit (every collection point → storage → retrieval)

> 5-track parallel audit, each finding verified against BOTH the write and read sites
> in code (false positives from the earlier UI audit were filtered out). "Round-trip"
> = a field the user enters must be sent, stored, returned, and read back with matching
> keys. Fixed items are committed on `claude/soap-patient-chart-docs-hixmt2`.

## ✅ FIXED (verified both ends, committed)

| # | Severity | Break | Fix |
|---|---|---|---|
| R1 | **CRITICAL** | Draft-save created a `LabOrder` without the NOT-NULL `order_id` → IntegrityError rolled back the **entire** encounter save (SOAP+Rx+imaging+lab) whenever a lab test was added. | Generate `order_id=ids.next_lab_order_no(...)` at creation (like the complete path). |
| R2 | HIGH | Payment: `record_payment` bound `amount`/`payment_method` as **query params**, UI posts a **body** → every "Confirm Payment" = 422, invoices never marked paid. | Accept a `PayRequest` body; `amount` defaults to invoice total. |
| R3 | HIGH | Lab result list GET returned `reference_range`/`unit` from the **catalogue**, ignoring the stored per-result values → custom range/unit reverted or blanked on reload/print. | Prefer `item.reference_range`/`item.unit`; also return computed `flag`. |
| R4 | HIGH | Editing a doctor's **specialty / consultation fee** was silently dropped (`update_staff` had no DoctorProfile branch) though the list GET returns them → edits reverted. | `update_staff` upserts DoctorProfile specialty/fee for doctor-role staff. |
| R5 | HIGH | Inpatient vitals **BP + Respiratory Rate** always showed "—": backend returned `bp_systolic`/`respiration_rate`, shared shell reads `blood_pressure_systolic`/`respiratory_rate`. | Added alias keys to `_vital_dict` (additive). |
| R6 | MEDIUM | Lab **unit** typed in the result form was never sent → discarded on save. | Added `unit` to `labApi.addResults` payload. |
| (earlier) | — | Prescription `route`, SOAP `follow_up_days`, per-test lab `order_note` — all now persist end-to-end. | Fixed in prior commits. |

## ⛳ REMAINING — need a decision or a new column (not yet fixed)

**Inpatient (highest patient-safety weight):**
- **R7 — MAR shows MOCK data (HIGH, safety).** `GET /admissions/{id}/mar` returns flat rows, but the MAR grid expects a nested `scheduled_times[]`/`doses[]` shape, so on empty it falls back to `buildMock(date)` — clinicians can see fabricated administrations. Fix: add a grid-shaped endpoint (or reshape the loader) **and remove the mock fallback**.
- **R8 — MAR administer `scheduled_at` not stored (HIGH).** `administer_medication` never reads `scheduled_at`, so `scheduled_time` is NULL → administrations drop out of the handoff MAR query and sort wrong. Also `reason_held` folded into free-text `notes` instead of its own column.
- **R9 — `/orders` endpoint collision (HIGH).** `cc/Orders.jsx` posts lab/imaging orders to the medication `POST /admissions/{id}/orders`, which only reads drug fields → a junk MedicationOrder row is written and all lab/imaging fields dropped (and `catch{ setDone(true) }` shows success). Fix: route lab/imaging to their own table/endpoint; remove success-on-catch.
- **R10 — Med add-drawer fields dropped (MEDIUM).** `unit, start_date, end_date, precautions, side_effects, contact_if, infusion_guidelines` sent but no columns → silently lost. Decide: add columns or remove inputs. `is_stat` doesn't reach the badge.
- **R11 — Nursing note `shift` not sent (LOW).** Backend stores/returns it; UI omits it from the POST.
- **Silent-failure anti-pattern** across MAR/MedicationList/Orders/PrePostOp/Documentation (`catch{ setDone(true) }`, mock-on-empty) — violates CLAUDE.md §0.

**Patients:**
- **R12 — `allergies_coded` not persisted (HIGH, clinical).** PatientDetail writes `allergies_coded` (coded allergy chips) but there's no column/schema field; silently dropped (write is in `catch(_){}`), and read from `demographics.allergies_coded` which is never returned. Fix: add `patients.allergies_coded TEXT` (+ schema + return in clinical GET), or repoint the UI at the free-text `allergies`.

**Scheduler:**
- **R13 — Schedule "Remove" zeroes slot allocation (LOW).** `DutyRoster.handleDelete` posts a partial body; omitted int slot fields default to 0 and overwrite the row. Fix: spread the loaded `form` with `is_active:false`.

## Verified CORRECT (no action) — called out so we know they were checked
Patient registration + edit + tags; appointment walk-in + queue read; schedule add/update; clinic profile; telehealth fee; device bridge key; invoice create; waiver; referral create/status; imaging report entry; lab result_value/result_notes/is_abnormal/status; pharmacy add-medicine + dispense; clinical orders (CPOE); inpatient pulse/SpO₂/temperature; SOAP/counselling; prescriptions core + route; imaging orders; assessment-form submit/draft/carry-forward (modal self-fetches schema).

*Suggested order for the remaining: R7/R8 (MAR safety) → R9 (orders lost) → R12 (allergies) → R10/R11/R13 → silent-failure cleanup.*
