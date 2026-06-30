# IPD Ward Rounds Chart — Complete Engineering Specification

> Source of truth for `frontend/carechart/src/pages/WardRoundsChart.jsx`
> and the backend endpoints that power it in
> `backend/app/api/v1/endpoints/inpatient.py`.
> Every layout rule, data source, render rule, and write flow documented here.
> Changes to either file must conform to this spec before merging.

---

## 1. Fundamental Principle — Chronological, Not SOAP

The IPD Ward Rounds chart is a **pure time-ordered feed** of ALL clinical events
for one admission. It is NOT a SOAP document.

| OPD Chart | IPD Ward Rounds |
|---|---|
| SOAP structure (S → O → I → A → P) | Chronological timeline (newest first, grouped by calendar day) |
| Single encounter (outpatient visit) | Entire admission duration (days to weeks) |
| Doctor-only view | Nursing, doctors, pharmacy, lab, imaging all contribute entries |
| Fixed sections | Dynamic feed — entries appear as they are created |

**Rule:** Never add SOAP section labels (Subjective / Objective / Assessment / Plan) to any entry in the Ward Rounds chart. Content from ward round notes, progress notes, and nursing notes is rendered as plain paragraph text, with all fields concatenated without labels.

---

## 2. Where It Lives

- **Portal:** CareChart (`frontend/carechart/`)
- **Component file:** `frontend/carechart/src/pages/WardRoundsChart.jsx`
- **Mounted in:** `frontend/carechart/src/pages/PatientChart.jsx` as the `ward-rounds` nav tab
- **Nav position:** Second item in `PATIENT_NAV` (after Dashboard), icon: `ListChecks`

```js
{ key: 'ward-rounds', icon: ListChecks, label: 'Ward Rounds' }
```

The Ward Rounds chart is rendered with these props from `PatientChart`:

```jsx
<WardRoundsChart
  admission={admission}       // full admission object
  patient={adm}               // patient sub-object from admission
  vitals={vitals}             // array of vital sign readings, newest first
  onVitalsAdded={load}        // callback to refresh PatientChart vitals
  onShowAdmForm={...}         // callback to open admission form modal
/>
```

---

## 3. Layout

```
┌─────────────────────────────────────────────────────────────┐
│  PATIENT HEADER (sticky, always visible)                    │
│  Row 1: Name · Gender · Age · Acuity badge                  │
│          IP# · Enc# · Ward · Bed · Primary doctor           │
│          📋 icon (opens admission form)                     │
│  Row 2: VITALS STRIP                                        │
│          BP · HR · Temp · SpO2 · RR · Wt · recorded-at     │
│          + Add Vitals (button, right-aligned)               │
├─────────────────────────────────────────────────────────────┤
│  TOOLBAR                                                    │
│  [+ New Note]  [⚠ N pending review]          [⚙ filter]   │
├─────────────────────────────────────────────────────────────┤
│  TIMELINE (scrollable)                                      │
│  ─────────── Monday, 30 June 2026 ─────────────            │
│    [entry] [entry] [entry] …                               │
│  ─────────── Sunday, 29 June 2026 ──────────────           │
│    [entry] [entry] …                                       │
│  …                                                         │
└─────────────────────────────────────────────────────────────┘
```

### Layout rules
- No left navigation column — the left nav belongs to `PatientChart.jsx`, not to this component.
- No right panel — all content in one scrollable column.
- Header does NOT scroll away. It is the topmost element of this component and sits below the outer PatientChart nav tabs.
- Toolbar sits directly below the header, also fixed in position (does not scroll with the timeline).
- Timeline is the only scrollable area.
- On all screen sizes, the three-row structure (header → toolbar → timeline) is maintained.

---

## 4. Patient Header

### Row 1 — Identity

| Element | Source field | Display rule |
|---|---|---|
| Full name | `patient.full_name` or `admission.patient_name` | Bold, 14px |
| Gender | `patient.gender` | Muted, 11px |
| Age | `patient.age_years` | `{n}y`, muted, 11px |
| Acuity badge | `admission.acuity_level` | Color chip: `critical`=red, `high`=amber, `medium`=blue, `low`=green |
| IP number | `admission.ip_number` | `IP# {value}`, 10px gray |
| Encounter number | `admission.encounter_no` | `Enc# {value}`, 10px gray |
| Ward + Bed | `admission.ward_name` + `admission.bed_number` | `{ward} · Bed {n}`, 10px gray |
| Primary doctor | `admission.primary_doctor_name` | `Dr. {name}`, 10px gray |
| 📋 icon button | — | Opens admission form modal (`onShowAdmForm()`). Tooltip: "Admission Form". No label shown beside icon — tooltip appears on hover only. |

- All metadata items in Row 1 second line are separated by `·` and wrapped flexibly (they wrap to next line if narrow).
- If `patient` object is null/absent, fall back to `admission.patient_name` for the name.

### Row 2 — Vitals Strip

Always rendered (even if no vitals — shows "No vitals recorded" in that case).

| Element | Backend field | Display |
|---|---|---|
| Blood Pressure | `bp_systolic` / `bp_diastolic` | `120/80` with label `BP` and unit `mmHg` |
| Heart Rate | `pulse` | label `HR`, unit `bpm` |
| Temperature | `temperature` | label `Temp`, unit `°C` |
| SpO2 | `spo2` | label `SpO2`, value shown as `{n}%` (no separate unit) |
| Respiratory Rate | `respiration_rate` | label `RR`, unit `/min` |
| Weight | `weight` | label `Wt`, unit `kg` |
| Recorded at | `vitals[0].recorded_at` | Formatted as `DD MMM YYYY, HH:MM AM/PM`, 10px gray, right of values |
| + Add Vitals | — | Button, right-aligned, 11px emerald green text, calls `setShowAddVitals(true)` |

- Source: `vitals[0]` (the first element of the props array, which is the latest reading).
- **Never use** `heart_rate`, `respiratory_rate`, or `weight_kg` — the backend returns `pulse`, `respiration_rate`, `weight`.
- A field is hidden (not shown as `—`) if its value is `null` or `undefined`.
- If `vitals` is empty or null: strip shows only "No vitals recorded" (italic, gray) and the `+ Add Vitals` button.

---

## 5. Toolbar

```
[+ New Note]    [⚠ 3 pending review]                   [⚙]
```

| Element | Condition | Behavior |
|---|---|---|
| `+ New Note` button | Always shown | Opens `NewRoundModal` |
| Pending review badge | Shown only when `pendingCount > 0` | Count of lab/imaging results with `status === 'pending_review'` AND `acknowledged_at` is null |
| `⚙` filter button | Always shown, right-aligned | Toggles `FilterDropdown`. Highlighted (blue tint) when any filter is active |

**Pending count calculation:**
```js
const pendingCount = entries.filter(e =>
  (e.type === 'lab_order' || e.type === 'imaging_order') &&
  e.result?.status === 'pending_review' &&
  !e.result?.acknowledged_at
).length
```

---

## 6. Data Source — Timeline Endpoint

```
GET /inpatient/admissions/{admission_id}/chart-timeline
```

- Auth: `get_current_staff` (any staff role)
- Returns: flat array of event objects sorted **newest first** (`timestamp` descending)
- Each object has a `type` field — one of the 8 types below

### Event types returned

| `type` value | Source table | Key fields |
|---|---|---|
| `ward_round` | `ward_rounds` | `id`, `timestamp`, `doctor_name`, `subjective`, `objective`, `assessment`, `plan` |
| `progress_note` | `progress_notes` | `id`, `timestamp`, `written_by_name`, `note_type`, `subjective`, `objective`, `assessment`, `plan` |
| `nursing_note` | `nursing_notes` | `id`, `timestamp`, `written_by_name`, `note_type`, `is_handoff`, `note_text` |
| `lab_order` | `lab_orders` + `lab_results` | `id`, `timestamp`, `order_id`, `test_names[]`, `priority`, `ordered_by_name`, `result` (nested) |
| `imaging_order` | `imaging_orders` + `imaging_results` | `id`, `timestamp`, `order_id`, `modality`, `body_part`, `study_description`, `priority`, `ordered_by_name`, `result` (nested) |
| `medication_order` | `medication_orders` | `id`, `timestamp`, `drug_name`, `generic_name`, `dose`, `route`, `frequency`, `duration_days`, `instructions`, `is_stat`, `is_prn`, `status`, `discontinued_at`, `discontinue_reason`, `ordered_by_name` |
| `clinical_order` | `clinical_orders` | `id`, `timestamp`, `order_type`, `order_detail`, `instructions`, `status`, `ordered_by_name` |
| `transfer` | `admission_transfers` | `id`, `timestamp`, `reason`, `transferred_by_name` |

### Lab order result sub-object

```json
{
  "id": 42,
  "status": "pending_review",
  "acknowledged_at": null,
  "acknowledged_by_name": null,
  "has_pdf": false,
  "pdf_b64": null,
  "interpretation": "...",
  "observations": [
    { "test_name": "Haemoglobin", "value": "9.2", "unit": "g/dL", "ref_range": "13–17", "flag": "L" }
  ]
}
```

### Imaging order result sub-object

```json
{
  "id": 17,
  "status": "pending_review",
  "acknowledged_at": null,
  "acknowledged_by_name": null,
  "findings": "...",
  "impression": "...",
  "has_pdf": false,
  "pdf_b64": null
}
```

---

## 7. Timeline Grouping — Day Separator Logic

The frontend groups the flat sorted array into calendar days.

```
entries (sorted newest → oldest)
  ↓
Group by dayKey(entry.timestamp)
  dayKey = `${year}-${month}-${date}` (locale-independent)
  ↓
Render each day group:
  ── [Full weekday, date string] ──
    [entry]
    [entry]
    …
```

- Day separator format: `Monday, 30 June 2026` (using `toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })`)
- Days appear in newest-first order (most recent day at top).
- Entries within a day also newest-first (as returned by the API).

---

## 8. Filter — Types and Behavior

Filter icon: `⚙` (gear character), right side of toolbar.
Opens `FilterDropdown` — a multi-select checkbox panel.

### Filter options (8 types)

| Key | Label shown |
|---|---|
| `ward_round` | Doctor Notes |
| `progress_note` | Progress Notes |
| `nursing_note` | Nurse Notes |
| `lab_order` | Lab Results |
| `imaging_order` | Imaging Results |
| `medication_order` | Medications |
| `clinical_order` | Orders |
| `transfer` | Transfers |

### Filter logic
- Default state: `activeFilters = []` — all entries shown (no filter active).
- When `activeFilters` is empty, the `⚙` button appears in its default (unhighlighted) style.
- When any filter is active (array non-empty), the button shows a blue tint.
- **Show all** link inside the dropdown resets to `[]` (show all).
- Checking a single type when "all" is currently shown: deselects all others first, then shows only that type.
- Unchecking a type removes it from the active set. Unchecking the last active type resets to "show all" (`[]`).

### Dropdown behavior
- Appears as an absolute-positioned panel anchored below the `⚙` button.
- Closes on click outside (via `mousedown` listener on `document`).
- The filter button ref and dropdown ref are both excluded from the "outside click" check.

---

## 9. Entry Renderers — Per-Type Rules

### 9.1 WardRoundEntry (type: `ward_round`)

- Background: light blue tint (`bg-blue-50/40`, `border-blue-100`)
- Icon: `Stethoscope` (blue)
- Header row: doctor name (bold blue) + `Ward Round · {time}`
- Collapsible: starts **open** by default. Chevron toggles.
- Content: all SOAP fields concatenated as plain text, separated by `\n\n`
  ```js
  [entry.subjective, entry.objective, entry.assessment, entry.plan].filter(Boolean).join('\n\n')
  ```
- **No S / O / A / P labels. No section headers.** Plain paragraph only.
- Empty state: "No notes recorded" (italic gray)

### 9.2 NursingNoteEntry (type: `nursing_note`)

- Background: gray tint (`bg-gray-50/50`, `border-gray-100`)
- Icon: `FileText` (gray)
- Header row: nurse name + `note_type` badge (uppercase, gray chip) + `Handoff` badge (amber, only if `is_handoff === true`) + time (right-aligned)
- **Not collapsible** — always expanded.
- Content: `entry.note_text` as plain paragraph (11px, gray, preserve line breaks).
- De-emphasized visual weight compared to ward rounds (smaller font, gray tone).

### 9.3 ProgressNoteEntry (type: `progress_note`)

- Background: purple tint (`bg-purple-50/30`, `border-purple-100`)
- Icon: `FileText` (purple)
- Header row: author name (bold purple) + `note_type` badge (purple chip, defaults to "Progress") + `· {time}`
- Collapsible: starts **open** by default.
- Content: all SOAP fields concatenated as plain text — same join logic as WardRoundEntry.
- **No SOAP labels. Plain paragraph only.**
- Empty state: "No content" (italic gray)

### 9.4 LabOrderEntry (type: `lab_order`)

- Border/background: red tint if any observation has a non-normal flag (`isAbnormal`), otherwise green tint.
- Icon: `FlaskConical` (red if abnormal, green otherwise)
- Header row: test names (comma-joined) + order_id chip (10px gray) + priority badge (STAT=red, URGENT=amber, skip if `routine`) + time (right-aligned)
- Sub-row: "Ordered by {ordered_by_name}"

**No result state:** Shows "Awaiting result" (clock icon, gray)

**With result:**
- Observations table:
  - Columns: Test · Value+Unit · Reference Range · Flag
  - Flag color: `HH`/`LL` = red bold, `H`/`L` = amber, normal = gray
  - Row background: light red if flag is non-normal
- Interpretation text (italic, gray) below table if present
- Acknowledge button: shown when `result.status === 'pending_review'` AND `result.acknowledged_at` is null
  - Label: "Pending Review — Acknowledge"
  - On click: `POST /inpatient/admissions/{id}/lab-results/{result.id}/acknowledge`
  - After acknowledge: button replaced by "Acknowledged by {name} at {time}" (green)
- PDF button: shown when `result.has_pdf === true`
  - Opens PDF in new tab via inline base64 iframe

### 9.5 ImagingOrderEntry (type: `imaging_order`)

- Background: indigo tint (`bg-indigo-50/30`, `border-indigo-100`)
- Icon: `ImageIcon` (indigo)
- Header row: `{modality} — {body_part} — {study_description}` (any present, joined by ` — `) + order_id + priority badge + time
- Sub-row: "Ordered by {ordered_by_name}"

**No result state:** "Awaiting report" (clock icon)

**With result:**
- Findings block: label `FINDINGS` (gray caps) + text
- Impression block: label `IMPRESSION` (indigo caps, prominent) + text in indigo bold
- Acknowledge button: same logic as lab (status `pending_review` + no `acknowledged_at`)
  - On click: `POST /inpatient/admissions/{id}/imaging-results/{result.id}/acknowledge`
- PDF button: same as lab

### 9.6 MedicationOrderEntry (type: `medication_order`)

- Background: orange tint (`bg-orange-50/30`, `border-orange-100`)
- Icon: `Pill` (orange)
- Header row: drug name (bold) + generic name in parentheses if different + `Discontinued` badge (red) if `status === 'discontinued'` + `STAT` badge (red bold) if `is_stat` + `PRN` badge (amber) if `is_prn` + time (right-aligned)
- Dose row: `{dose} · {route} · {frequency} · {duration_days}d` — only fields present, joined by ` · `
- Instructions: italic gray if present
- Discontinued detail: `Stopped {datetime} — {reason}` (red text) if `discontinued_at` is set
- Footer: "Ordered by {name}" (10px gray)

### 9.7 ClinicalOrderEntry (type: `clinical_order`)

- Background: plain white (`bg-white`, `border-gray-200`)
- Icon: `ClipboardList` (gray)
- Header row: `{order_type}` label (uppercase gray 10px) + `{order_detail}` text + status (color: completed=green, cancelled=red, in_progress=blue, default=gray) + time
- Instructions: italic gray if present
- Footer: "Ordered by {name}"

### 9.8 TransferEntry (type: `transfer`)

- Background: light gray (`bg-gray-50`, `border-gray-200`)
- Icon: `ArrowRightLeft` (gray)
- Single row: "Patient transferred" + reason if present + "by {name} · {time}" (right-aligned)
- No expand/collapse. Always a single compact row.

---

## 10. Write Flows — New Note Modal

Opened by `+ New Note` button in toolbar.

```
Modal title: "New Ward Round Note"
Body: single textarea (7 rows), placeholder "Enter ward round note…"
Submit: POST /inpatient/admissions/{id}/rounds
Payload: { round_date: ISO timestamp, assessment: note.trim() }
```

**Rules:**
- Single textarea — no SOAP fields, no structured form.
- The entire note is sent as the `assessment` field of the ward round.
- On success: modal closes, timeline reloads (`load()`).
- Validation: empty textarea shows "Note cannot be empty." inline error before submit.
- Save button shows "Saving…" while request is in flight.
- Cancel button closes without saving.

**Why single textarea:** Ward rounds in IPD are chronological narrative entries, not structured SOAP documents. The doctor writes a free-form clinical note for that round. SOAP structure belongs only in OPD encounters.

---

## 11. Write Flows — Add Vitals Modal

Opened by `+ Add Vitals` button in the vitals strip.

```
Modal title: "Record Vitals"
Layout: 2-column grid
```

| Field label | Form key | Backend field | Unit |
|---|---|---|---|
| BP Systolic | `bp_systolic` | `bp_systolic` | mmHg |
| BP Diastolic | `bp_diastolic` | `bp_diastolic` | mmHg |
| Heart Rate | `pulse` | `pulse` | bpm |
| Temperature | `temperature` | `temperature` | °C |
| RR | `respiration_rate` | `respiration_rate` | /min |
| SpO2 | `spo2` | `spo2` | % |
| Weight | `weight` | `weight` | kg |
| Notes | `notes` | `notes` | — |

```
Submit: POST /inpatient/admissions/{id}/vitals
Payload: { ...filledFields, recorded_at: ISO timestamp }
```

**Rules:**
- All fields are optional numbers (except Notes which is text).
- Only fields with non-empty values are included in the payload (empty strings filtered out before submit).
- At least one field must be non-empty — validation error if all empty.
- On success: modal closes, `onVitalsAdded()` and `load()` are called (refreshes both the vitals strip in PatientChart and the timeline).
- **Never use** `heart_rate`, `respiratory_rate`, `weight_kg` as keys — these do not match the backend.

---

## 12. Acknowledge Flows

Acknowledge buttons appear on `lab_order` and `imaging_order` entries when:
- `result` object exists
- `result.status === 'pending_review'`
- `result.acknowledged_at` is null

### Lab result acknowledge
```
POST /inpatient/admissions/{admission_id}/lab-results/{result_id}/acknowledge
Auth: require_doctor
```

### Imaging result acknowledge
```
POST /inpatient/admissions/{admission_id}/imaging-results/{result_id}/acknowledge
Auth: require_doctor
```

On success: timeline reloads. Entry now shows "Acknowledged by {name} at {time}" with a green `CheckCircle` icon. The acknowledge button disappears.

On failure: silent fail (no user error shown) — reload still reflects actual server state.

---

## 13. DB Columns Added for Acknowledge

These columns were added to `start.sh` as `ADD COLUMN IF NOT EXISTS` and to `models.py`:

```sql
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS acknowledged_by INTEGER REFERENCES staff(id);
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP;
ALTER TABLE imaging_results ADD COLUMN IF NOT EXISTS acknowledged_by INTEGER REFERENCES staff(id);
ALTER TABLE imaging_results ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP;
```

SQLAlchemy model additions (`LabResult` and `ImagingResult`):
```python
acknowledged_by = Column(Integer, ForeignKey("staff.id"), nullable=True)
acknowledged_at = Column(DateTime, nullable=True)
```

---

## 14. Backend Endpoints Added

All in `backend/app/api/v1/endpoints/inpatient.py`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/admissions/{admission_id}/chart-timeline` | `get_current_staff` | Returns full chronological event array for the admission |
| `POST` | `/admissions/{admission_id}/lab-results/{result_id}/acknowledge` | `require_doctor` | Marks a lab result as reviewed by this doctor |
| `POST` | `/admissions/{admission_id}/imaging-results/{result_id}/acknowledge` | `require_doctor` | Marks an imaging result as reviewed by this doctor |

The `chart-timeline` endpoint:
- Queries all 8 event types using the `admission_id` (and `patient_id` / `clinic_id` for lab/imaging which are not directly linked to admission).
- Combines all into a flat list.
- Sorts by `timestamp` descending (newest first).
- Returns as JSON array.

---

## 15. Empty States

| Condition | What is shown |
|---|---|
| `loading === true` | "Loading timeline…" centered, 12px gray |
| `error !== null` | Error message in red, centered |
| `filtered.length === 0` AND `entries.length === 0` | Clipboard icon + "No clinical events recorded yet." |
| `filtered.length === 0` AND `entries.length > 0` | "No entries match the current filter." (a filter is active but nothing matches) |

---

## 16. Timestamp Formatting

Three formats used consistently:

| Function | Output format | Example | Used for |
|---|---|---|---|
| `fmt(ts)` | `DD MMM YYYY, HH:MM AM/PM` | `30 Jun 2026, 10:30 AM` | Full datetime (vitals recorded_at, discontinued_at) |
| `fmtDate(ts)` | `Weekday, DD Month YYYY` | `Monday, 30 June 2026` | Day separator headers |
| `fmtTime(ts)` | `HH:MM AM/PM` | `10:30 AM` | Entry timestamps in timeline |

All formats use `en-IN` locale.

---

## 17. Priority Colors

| Priority value | Color | Hex |
|---|---|---|
| `stat` | Red | `#dc2626` |
| `urgent` | Amber | `#d97706` |
| `routine` | Not shown | — |

`routine` priority is never rendered as a badge. Only `stat` and `urgent` get a colored label.

---

## 18. Authentication Notes

- `WardRoundsChart` uses the CareChart `api` client (`frontend/carechart/src/api/client.js`), which attaches the `access_token` from localStorage as a Bearer token.
- CareChart uses `access_token` + `refresh_token` (staff clinical family), auto-refreshed via `POST /auth/staff/refresh`.
- The acknowledge endpoints use `require_doctor` — only doctor-role staff can acknowledge results. Nurse-role users will see the acknowledge button but the request will fail with 403. (Enhancement: hide the button for non-doctor roles by checking the staff role from the auth context before rendering.)
- PIN-gated actions (for critical documentation steps like discharge) are handled elsewhere in CareChart via `usePin` context. Ward Rounds notes do NOT require PIN re-entry.

---

## 19. Relationship to PatientChart.jsx

`WardRoundsChart` is one of several tabs rendered by `PatientChart.jsx`. The outer structure:

```
PatientChart.jsx
├── Nav tabs (Dashboard · Ward Rounds · Medications · …)
├── renderContent() switch:
│   ├── 'dashboard'    → <IPDDashboard … />
│   ├── 'ward-rounds'  → <WardRoundsChart admission vitals … />
│   ├── 'medications'  → <MedicationOrders … />
│   └── …
└── Shared state: admission, adm (patient), vitals, load()
```

- `PatientChart` owns the vitals array and passes it down to `WardRoundsChart`.
- When vitals are added inside `WardRoundsChart`, `onVitalsAdded()` triggers `PatientChart.load()` so the vitals strip updates across all tabs.
- The admission form modal (`showAdmForm`) is controlled by `PatientChart`, not by `WardRoundsChart` — the `📋` icon button calls `onShowAdmForm()` which lifts the event up.

---

## 20. Known Gaps (to address in future iterations)

| Gap | Description | Suggested fix |
|---|---|---|
| Filter button position | `⚙` is in the toolbar row. Proposed: move to right end of the vitals strip row to match the original UI sketch. | Move the relative-positioned filter button into `VitalsStrip`, right of `+ Add Vitals`. |
| "Pending Review" as a filter | There is no filter option to show only pending-review results. The pending count badge exists but the timeline cannot be filtered to show only those entries. | Add a `pending_review` pseudo-filter that shows only `lab_order`/`imaging_order` entries where `result.status === 'pending_review' && !result.acknowledged_at`. |
| Acknowledge button visibility for non-doctors | All staff see the Acknowledge button; non-doctors get a 403 on click. | Check the staff role from the auth context and hide the button for non-doctor roles. |

---

*Last updated: 2026-06-30. Update this document whenever WardRoundsChart.jsx, the chart-timeline endpoint, or the acknowledge endpoints change.*
