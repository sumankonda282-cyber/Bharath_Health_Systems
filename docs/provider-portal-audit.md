# Provider Portal Audit — Consolidated Findings

> Evidence-based review (5 parallel tracks: data integrity, page-standard compliance,
> UI maturity, analytics, clinical/operational gaps). Benchmarked against our own docs
> (portal-page-standard, opd-chart-plan, care-form-design-standard) and high-standard
> EHRs (Epic/Cerner/Bahmni + ABDM), scoped to Indian healthcare. Every item cites code.
> We work these **one by one**. Tier 0 first — those explain "nothing is reflecting."

---

## TIER 0 — STATUS after code-verification (each finding re-checked against source)

> Discipline note: on verification, the two "CRITICAL" items were **overstated** —
> the data is preserved/visible, not lost. Real fixes were 0.3 and 0.6 (+ minor 0.4).
> **Verdicts:** 0.1 not-loss · 0.2 false-mechanism · 0.3 FIXED · 0.4 FIXED · 0.5 false ·
> 0.6 FIXED · 0.7 low-value gap.

- **0.1 Lab reload — NOT data loss.** Ordered labs render in the chart's read-only
  Investigations section (from the separate `/lab-orders` fetch). Only the editable
  "add tests" list starts empty — which is *safer*, because the save path
  delete/reinserts items and would wipe results if repopulated. Left as-is by design.
- **0.2 Reopen forms — mechanism was wrong.** `DbAssessmentFormModal` self-fetches the
  schema by `form.id` (line 65), so the missing `form_schema` in the list is irrelevant;
  forms reopen with fields. Residual UX nit: reopen needs a manual "carry-forward" click,
  so a careless resubmit adds a newer blank submission that dominates the chart view
  (original preserved). Optional improvement — auto-prefill last same-session submission
  (touches the shared modal used by IPD; needs sign-off).
- **0.3 Prescription route — FIXED** (commit: route end-to-end + column).
- **0.4 Per-test lab order note — FIXED** (added `LabOrderItem.order_note`, additive).
- **0.5 Investigations section — false positive.** `hasInv` already counts confirmed
  `labOrders`/`imagingOrders`; section does not vanish after send.
- **0.6 Follow-up field — FIXED** (surfaced in chart → reminder/SMS).
- **0.7 Imaging modality via form bridge — low-value gap.** `extractOrdersFromForm` only
  has the field's text value; modality isn't carried by the imaging_search field, so
  there's nothing to persist without a field-schema change. Deferred (not a silent drop
  of entered data).

### Original findings (pre-verification, for reference)

| # | Bug | Where | Failure |
|---|-----|-------|---------|
| 0.1 | **Lab orders blank on reload** — `load()` reads `data.lab_order?.tests / lab_items / lab_tests` but backend returns `lab_orders[].items[]`. | OpdChart.jsx:~1722; doctor.py:234 | Doctor adds lab tests → saves → reopens → Lab tab is empty; next save can drop them. |
| 0.2 | **Submitted assessment forms can't be reopened/edited** — `/submissions` returns no `form_schema`/`form_data`, so the modal opens with no fields; re-submit can write empty data over charted values. | OpdChart.jsx:1029; assessment_forms.py:~1529 | Doctor clicks a submitted form chip to fix a value → blank form → resubmit **wipes** it. |
| 0.3 | **Prescription `route` silently dropped** — collected in UI, omitted from payload, never stored. | OpdChart.jsx:1790; doctor.py:297/657 | "IV" set on an injectable → gone from saved Rx and pharmacy order; empty on reload. |
| 0.4 | **Lab per-test `notes` never persisted** — sent in payload, backend only reads `test_name`. | OpdChart.jsx:1798; doctor.py:679/322 | "Fasting sample" note on glucose → lost; lab desk never sees it. |
| 0.5 | **Investigations (I) section disappears after orders confirmed** — `hasInv` gate only counts draft items, not confirmed orders. | OpdChart.jsx:~402 | After Send-for-Investigations, the I section vanishes; doctor can't review sent orders. |
| 0.6 | **Follow-up feature dead from OPD** — backend builds FollowUpReminder + SMS from `follow_up_days`, but there is no UI field and `load()` never reads it. | OpdChart.jsx:1678; doctor.py:333 | Doctor can't set/see follow-up; reminders/SMS never fire from the chart. |
| 0.7 | **Imaging modality lost via form-order bridge** — form imaging mapped as `modality:''`. | formOrders.js:31; OpdChart.jsx:1854 | Study ordered from a signed form reaches imaging desk with no modality. |

*Verified OK (no loss): SOAP S/O/A/P, counselling, vitals field-name mapping, Rx core fields.*

---

## TIER 1 — Page-standard deviations (visible now)

- **Spacing not tight / inconsistent** — ad-hoc `p-4/p-6/gap-3/gap-4/mb-4/mb-5`; no shared tokens; gaps not ≤2px between panels. (Dashboard, ClinicAdmin, Appointments) — needs a shared spacing token + sweep.
- **Filter rows wrap to multiple lines** on medium/tablet widths (PatientList, Appointments, DoctorDesk) — violates "filters on one line."
- **Centered max-width cards/modals leave dead space** on large screens (Referrals `max-w-3xl`, ClinicAdmin `max-w-2xl`, PatientDetail `max-w-lg`) — not fluid.
- **Empty states lack a next action**; **error states incomplete** in some modals (Billing, Lab, DoctorDesk).
- **Emojis used as icons** (Dashboard 📋🗓🚶, Appointments, ClinicAdmin) — replace with Lucide + tooltip (accessibility + consistency).
- *(Already fixed this session: OPD chart fluid width, Problem List removed, allergy chip + demographics in header, Save Draft → icon, Assessments/Care Forms consolidated.)*

---

## TIER 2 — UI maturity: filters, icons, stat cards

- **Oversized stat cards → compact click-through pills** (per your dashboard note): Dashboard (8 cards), BranchOverview (4 tiles + 6-cell grid), Pharmacy (3 filter-cards), Billing/Analytics (6-col grid). One tight row, ~half the height.
- **Consolidate filters**: PatientList (5 side-by-side selects + date range) and Appointments (6 status pills + view toggle) → single "Filters (n)" dropdown / compound bar on one line.
- **Lab & Imaging queues have NO search or filters** — add search + status + date/priority filters (data-heavy pages).
- **Icon-ify** action buttons, tabs, row actions with tooltips instead of word-buttons/chips.
- **Inpatient 11-column table** → 6 core columns + expandable detail row.

---

## TIER 3 — Analytics (biggest quick win: backend already built, frontend missing)

- **Wire up endpoints that already exist but no page calls**: `/clinic/analytics/overview` (status/type/mode mix, revenue trend, payment breakdown, new-vs-returning, occupancy), `/imaging/reports/tat` (turnaround), technician productivity, `/inpatient/wards/{id}/dashboard-metrics`.
- **Make KPIs actionable**: drilldown for all periods (not just Today); Dashboard "New Patients" → Patients list; Analytics "Revenue by Doctor" bars → clickable to that doctor's invoices; daily revenue bar → invoices for that day.
- **Missing analytics** a serious EHR shows: diagnosis/disease distribution (ProblemList is coded but unused), no-show & utilization, doctor productivity (throughput + completion% + ₹/appt), payer/insurance mix (needs schema field), lab/imaging TAT, patient cohort/retention, invoice aging, branch comparison trends, period-over-period.

---

## TIER 4 — Clinical / operational / India gaps

**Safety (do first in this tier)**
- Allergy ↔ drug-interaction check *at prescribe time* (we now display allergies; not yet wired to CDS/allergy-check).
- Medication reconciliation (active_medications already returned by `/patients/{id}/clinical-context`, not shown).
- Result acknowledgement workflow (provider); critical imaging-finding alert/ack.

**Continuity & workflow**
- Discharge summary template + "last admission" banner into OPD; order-set templates (CPOE ad-hoc only).
- Triage vitals/complaint carry-forward into the chart (currently re-entered).
- Follow-up scheduling UI (ties to 0.6); referral loop-closure status + prefill from encounter.
- Form pre-fill across visits; suggested forms by diagnosis; render form data inline (ties to 0.2).
- Problem List: *we removed the one just added per your call* — decide if/where a proper coded problem list belongs (PatientDetail vs chart).

**India-specific**
- ABHA/ABDM linkage (mandatory trajectory); generic-first prescribing; CDSCO Schedule H1/X warnings at prescribe; GST on pharmacy billing; vernacular notes.

**Prescribing intelligence** (some already built in the smart field, not everywhere)
- Dose validation (age/weight/renal), stock/dispense-readiness check, generic + cost badge.

---

## Suggested order of work
1. **Tier 0** (data-loss bugs) — restores trust that entered data persists. Small, high-impact.
2. **Tier 1** (standard sweep) — makes every page look/behave consistently; partly a shared-token change.
3. **Tier 2** (filters/icons/stat pills) — the maturity pass you described.
4. **Tier 3** (analytics) — wire existing backend, then add the missing dashboards.
5. **Tier 4** (clinical/India) — safety first, then continuity, then India compliance.

*Living register — check items off as we complete them; append the product owner's points per tier.*
