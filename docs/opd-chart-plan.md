# OPD Chart — Complete Engineering Specification

> Source of truth for `frontend/provider/src/pages/doctor/OpdChart.jsx`.  
> Every layout rule, data source, render rule, and categorization logic documented here.  
> Bug fixes and new features must conform to this spec before merging.

---

## 1. Purpose

The OPD Chart is the doctor's encounter workstation in the **provider portal**. It renders a single outpatient appointment as a structured SOAP document — not a chronological feed. SOAP order is mandatory in OPD. (IPD Ward Rounds use chronological order instead — see `docs/ward-rounds-plan.md`.)

---

## 2. Layout — Three-Column Grid

```
┌──────────────────────────────────────────────────────────────────────────┐
│  STICKY HEADER (always visible, never scrolls away)                      │
│  Row 1: Patient name · Age/Sex · MRN · Appointment status badge · Time   │
│  Row 2: Demographics bar — Blood group · DOB · Phone · Address           │
│          (collapsible; collapsed by default on mobile)                   │
│  Row 3: Vitals strip — BP · HR · Temp · SpO2 · RR                        │
│          (rendered ONLY when hasVitals === true)                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─────────────┬─────────────────────────────────────┬─────────────────────┐
│  LEFT NAV   │  MAIN CONTENT COLUMN                │  RIGHT PANEL        │
│  172 px     │  flex-1, max-width 3xl (~768 px)    │  272 px             │
│  fixed      │  scrollable                         │  scrollable         │
│             │                                     │                     │
│  • Chart    │  [Chief Complaint — if present]     │  Forms panel        │
│  • Prescr.  │                                     │  (all form          │
│  • Lab      │  S  SUBJECTIVE                      │   submissions for   │
│  • Imaging  │  O  OBJECTIVE                       │   this encounter)   │
│  • Counsel  │  I  INVESTIGATIONS                  │                     │
│             │  A  ASSESSMENT                      │                     │
│             │  P  PLAN                            │                     │
│             │                                     │                     │
│             │  [Previous Encounters — collapsed]  │                     │
└─────────────┴─────────────────────────────────────┴─────────────────────┘
```

### Column rules
- Left nav: `w-[172px]`, `sticky top-[header-height]`, full page height minus header.
- Main content: `flex-1`, `max-w-3xl`, padded `px-6 py-4`, vertically scrollable.
- Right panel: `w-[272px]`, `sticky top-[header-height]`, overflow-y scroll.
- On screens narrower than `lg` (1024 px): right panel collapses; main content fills remaining space. Left nav becomes a slide-out drawer.

---

## 3. Sticky Header — Row-by-Row Rules

### Row 1 — Identity + Actions
| Element | Source | Rule |
|---|---|---|
| Patient full name | `encounter.patient.full_name` | Bold, large |
| Age / Sex | `encounter.patient.age` + `encounter.patient.gender` | Format: `34 yr · M` |
| MRN | `encounter.patient.patient_id` | Mono font, muted |
| Appointment status badge | `encounter.appointment.status` | Color-coded chip |
| Appointment time | `encounter.appointment.appointment_time` | Format: `10:30 AM` |
| Action buttons (right-aligned) | — | Print · Share · Close |

### Row 2 — Demographics (collapsible)
| Element | Source |
|---|---|
| Blood group | `encounter.patient.blood_group` |
| Date of birth | `encounter.patient.date_of_birth` |
| Phone | `encounter.patient.phone` |
| Address | `encounter.patient.address` |

- Toggled by a chevron icon on Row 1.
- Default: collapsed on mobile, expanded on desktop.
- Never fetches additional data — all from the encounter object.

### Row 3 — Vitals Strip
- **Rendered only when `hasVitals === true`.**
- `hasVitals` = `encounter.vitals !== null && encounter.vitals !== undefined`
- Fields shown in order: `bp_systolic`/`bp_diastolic` (displayed as `120/80`), `pulse`, `temperature`, `spo2`, `respiration_rate`
- Field names come from the vitals sub-object on the encounter; **do not use** `heart_rate`, `respiratory_rate`, or `weight_kg` — the backend returns `pulse`, `respiration_rate`, `weight`.

---

## 4. Left Navigation

Five fixed items rendered as vertical icon+label buttons:

| Key | Label | Icon |
|---|---|---|
| `chart` | Chart | ClipboardList |
| `prescriptions` | Prescriptions | Pill |
| `lab` | Lab | FlaskConical |
| `imaging` | Imaging | Scan |
| `counselling` | Counselling | BookOpen |

- Active tab highlighted with brand color.
- `chart` is the default on load.
- Other tabs render their own sub-components (prescriptions list, lab order form, etc.) in the main content column — they do NOT alter the SOAP sections.

---

## 5. Data Sources

All fetched in parallel on component mount (`useEffect` with `encounterId` dependency).

| Data | Endpoint | Variable | Notes |
|---|---|---|---|
| Full encounter | `GET /doctor/encounter/{encounterId}` | `encounter` | Contains patient, vitals, appointment, soap draft, prescriptions, lab_items, imaging_items |
| Form submissions | `GET /submissions?encounter_id={id}&limit=100` | `formSubmissions` | All forms for this encounter |
| This-appointment lab orders | `GET /lab-orders?appointment_id={appt.id}` | `labOrders` | Confirmed orders sent by the doctor |
| This-appointment imaging orders | `GET /imaging-orders?appointment_id={appt.id}` | `imagingOrders` | Confirmed imaging orders |
| All patient lab orders | `GET /lab-orders?patient_id={patientId}` | `allPatientLabOrders` | Used to detect "Not Ordered" results |
| All patient imaging orders | `GET /imaging-orders?patient_id={patientId}` | `allPatientImagingOrders` | Used to detect "Not Ordered" results |

### Draft vs. confirmed distinction
- `encounter.lab_items[]` and `encounter.imaging_items[]` = items currently being **drafted** in the doctor's editing session (in-memory, not yet sent to lab).
- `labOrders[]` and `imagingOrders[]` = **confirmed orders** already sent (fetched from backend). These are what appear in the Investigations section.

---

## 6. SOAP Sections — Rendering Rules

### Chief Complaint
- Source: `encounter.appointment.chief_complaint` or `encounter.soap.chief_complaint`
- Position: above S section, inside main content column.
- Render: plaintext paragraph, label "Chief Complaint" in small caps above.
- Hidden entirely if null/empty.

---

### S — SUBJECTIVE

**Position:** First SOAP section, top of main content.

**Content rendered in order:**
1. `encounter.soap.subjective` — free text, rendered as paragraph. Hidden if empty.
2. Form submissions categorized as Subjective (see Section 7).

**Empty state:** If both are empty, section is hidden (do not show an empty S block).

---

### O — OBJECTIVE

**Position:** Second SOAP section.

**Content rendered in order:**
1. Vitals summary card — if `hasVitals`, show a compact table: BP, HR, Temp, SpO2, RR, Weight. Source: `encounter.vitals`.
2. `encounter.soap.objective` — free text paragraph. Hidden if empty.
3. Form submissions categorized as Objective (see Section 7).

**Empty state:** Hidden if all three sub-elements are empty.

---

### I — INVESTIGATIONS

**Position:** Third SOAP section.

**Gate rule — `hasInv`:**
```
hasInv = (
  labOrders.length > 0 ||
  imagingOrders.length > 0 ||
  labItems.length > 0 ||       // drafts being edited
  imagingItems.length > 0      // drafts being edited
)
```
> **Bug (pre-fix):** `hasInv` only checked `labItems`/`imagingItems`, so the section disappeared after orders were confirmed and the draft arrays cleared. The fix above includes confirmed `labOrders`/`imagingOrders`.

**Lab orders block:**
- Each `labOrder` in `labOrders[]` is one row.
- Row shows: test names (comma-joined), order ID chip, order status badge, ordered-at timestamp.
- If results exist (`labOrder.results[]`), expand to show a results table:
  - Columns: Test name · Value · Unit · Reference range · Flag
  - Abnormal flag: `H` (high) in red, `L` (low) in blue, `C` (critical) in red bold.
- Results linked by `lab_order_id` — NOT by test name.
- Acknowledge button: shown only to `require_doctor` role; calls `POST /lab/orders/{id}/acknowledge`. After acknowledge, show acknowledged-by name + timestamp.

**Imaging orders block:**
- Same structure as lab. Row: modality · body part · order status · ordered-at.
- If result exists: show findings paragraph + impression paragraph.
- Acknowledge button: same pattern.

**Not Ordered / External Results block:**
- Show lab results from `allPatientLabOrders` that have **no matching `appointment_id`** in `labOrders` for this appointment. These are results from other appointments or walk-in lab tests.
- Label block: "External / Not Ordered" with a muted badge.
- Same result table format. No acknowledge button for external results in OPD context.

**Empty state:** Section hidden when `hasInv === false`.

---

### A — ASSESSMENT

**Position:** Fourth SOAP section.

**Content rendered in order:**
1. `encounter.soap.assessment` — free text paragraph.
2. Form submissions categorized as Assessment (see Section 7).

**Empty state:** Hidden if both empty.

---

### P — PLAN

**Position:** Fifth and final SOAP section.

**Content rendered in order:**
1. Medications list — from `encounter.prescriptions[]`:
   - Each row: drug name · dose · route · frequency · duration
   - PRN / STAT badges if applicable.
2. `encounter.soap.counselling` — displayed under a "Counselling" sub-label within Plan.
3. `encounter.soap.plan` — free text paragraph (further plan notes).
4. Form submissions categorized as Plan (see Section 7).

**Empty state:** Hidden if all four sub-elements are empty.

---

### Previous Encounters (collapsed section)
- Position: below P section.
- Source: `GET /patients/{patientId}/encounters` (last N encounters, excluding current).
- Collapsed by default; chevron expands.
- Each past encounter shows: date · doctor name · chief complaint · SOAP summary (first 100 chars of assessment).

---

## 7. Form Categorization Rules

Form submissions are placed into SOAP buckets by matching `form_category` and/or `form_title` against patterns. **Case-insensitive regex matching.**

| Target Bucket | Match patterns |
|---|---|
| **Subjective (S)** | `form_category` matches `/history/i`, `/complaint/i`, `/symptom/i`, `/hpi/i`, `/review.of.system/i` |
| **Objective (O)** | `form_category` matches `/exam/i`, `/physical/i`, `/finding/i`, `/objective/i`, `/observation/i` |
| **Assessment (A)** | `form_category` matches `/assessment/i`, `/diagnosis/i`, `/impression/i`, `/evaluation/i` |
| **Plan (P)** | `form_category` matches `/plan/i`, `/order/i`, `/instruction/i`, `/education/i`, `/counsell/i`, `/discharge/i` |
| **Unmatched** | Falls into the right panel (Forms Panel) without SOAP placement |

If a form has both a `category` field and a `form_category` field, prefer `category`. If neither matches any pattern, place it in the right panel.

### FormContentRenderer rules
- Receives a single `submission` object.
- Try to extract form data in this order: `submission.form_data` → `submission.data` → `submission.answers`.
- If the extracted value is a non-null object, render it as a key-value list (label: value, one per row).
- If the value is a string, render as a paragraph.
- If all three fields are null/undefined or the value is not renderable: show fallback link `"Form submitted — View ↗"` linking to `/submissions/{submission.id}`.
- **Never silently drop a form.** Always show either rendered content or the fallback link.

### Right panel (Forms Panel)
- Shows ALL form submissions for this encounter regardless of categorization.
- Unmatched forms shown here only.
- Matched forms shown here AND in their SOAP section (dual rendering is intentional — right panel is the "all forms" index).
- Each entry: form title · submission timestamp · status chip (Draft / Submitted / Signed).
- Clicking opens a modal with full form content (same `FormContentRenderer` logic).

---

## 8. Investigation Result Linking — Order-Centric Model

Results are always linked by **order ID**, never by test name. This matters because:
- The same test (e.g. CBC) can be ordered multiple times in one encounter.
- Results from another appointment may share test names but have different order IDs.
- Matching by name would create false associations across appointments.

**Rule:** A result belongs to this encounter if and only if `result.lab_order_id` matches an `id` in `labOrders[]` for this appointment.

**"Not Ordered" definition:** A result is "Not Ordered" (external) if:
- It appears in `allPatientLabOrders` results, AND
- Its `lab_order_id` does NOT appear in `labOrders[]` for this appointment.

These are rendered in the I section under a clearly separated "External" sub-block, never mixed with this-appointment orders.

---

## 9. Vitals — Field Name Reference

Backend field names (from `/doctor/encounter/{id}` and `/vital-signs`). Always use these exact keys:

| Display Label | Backend Field |
|---|---|
| Blood Pressure | `bp_systolic` / `bp_diastolic` (shown as `systolic/diastolic`) |
| Heart Rate | `pulse` |
| Temperature | `temperature` |
| SpO2 | `spo2` |
| Respiratory Rate | `respiration_rate` |
| Weight | `weight` |

**Never use:** `heart_rate`, `respiratory_rate`, `weight_kg` — these are not returned by the API.

---

## 10. Flexibility and Responsiveness Rules

| Breakpoint | Behavior |
|---|---|
| `>= lg (1024px)` | Full three-column layout as described in Section 2 |
| `sm–md (640–1023px)` | Right panel hidden; main content + left nav remain. Right panel accessible via tab button. |
| `< sm (< 640px)` | Left nav becomes bottom tab bar or hamburger. Single-column scroll. |

- SOAP sections always maintain their order (S → O → I → A → P) regardless of screen size.
- The sticky header always remains visible. On small screens, Row 2 (demographics) is collapsed by default.
- The right panel content (forms) is accessible via a "Forms" tab or button on smaller screens.

---

## 11. Known Bugs (pre-fix state)

### Bug 1 — hasInv gate (OpdChart.jsx ~line 402)
```js
// WRONG — hides I section after orders are confirmed
const hasInv = labItems.length > 0 || imagingItems.length > 0

// CORRECT — must include API-fetched confirmed orders
const hasInv =
  labOrders.length > 0 ||
  imagingOrders.length > 0 ||
  labItems.length > 0 ||
  imagingItems.length > 0
```

### Bug 2 — FormContentRenderer always shows fallback link
The backend `GET /submissions?encounter_id=...` response does not populate the form response data inline. `submission.form_data`, `submission.data`, and `submission.answers` are all null, so every form renders as a fallback link instead of content.

**Fix options (in priority order):**
1. Backend: update `/submissions` endpoint to include serialized `form_data` in the list response (preferred — keeps frontend simple).
2. Frontend: on click/expand, fetch `GET /submissions/{id}` which may return the full data object, then render inline.
3. Frontend: always show the fallback link but with full content in a modal fetched on demand.

---

## 12. Edit Flows (Doctor Actions)

These are the write paths the doctor can trigger from the OPD chart:

| Action | Endpoint | Trigger |
|---|---|---|
| Save SOAP draft | `PUT /doctor/encounter/{id}` with SOAP fields | Auto-save on blur or manual Save button |
| Add/update prescription | `POST /doctor/prescriptions` | Prescription sub-view |
| Send lab order | `POST /lab-orders` with `appointment_id` | Lab sub-view |
| Send imaging order | `POST /imaging-orders` with `appointment_id` | Imaging sub-view |
| Acknowledge lab result | `POST /lab/orders/{id}/acknowledge` | Doctor-only button in I section |
| Acknowledge imaging result | `POST /imaging/orders/{id}/acknowledge` | Doctor-only button in I section |
| Sign encounter | `PUT /doctor/encounter/{id}/sign` | Sign button in header |

---

*Last updated: 2026-06-30. Update this document whenever OpdChart.jsx layout or data logic changes.*
