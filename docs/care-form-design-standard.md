# Care Section & Care Form — Master Design Standard
**Version 2.0 · Bharath Health Systems**
*This document governs every care section, care form, and field built on this platform.
Review this document before building any form, section, or field. No exceptions.*

---

## 1. Field Naming & Nomenclature Rules

1. Every field has a permanent `field_id` in `snake_case`. Once any submission uses it, the ID is frozen forever — it can never be renamed or deleted.
2. Labels are display-only. Change them freely at any time; stored data is unaffected because the renderer always resolves labels from the current schema at render time.
3. Same clinical concept = same `field_id` everywhere across all forms and sections. No synonyms, no abbreviations, no duplicates. One concept, one ID, globally.
4. Labels use Title Case, ≤ 40 characters, no trailing colon, no "Enter" or "Please" prefix.
5. Units are canonical and consistent — `°C` always, `kg` always, `mmHg` always. Never mix units for the same concept across forms.
6. Section names describe what is documented, not who fills it. `"Hemodynamics"` not `"Nurse Vitals"`.
7. Form titles are unique and descriptive. `"Vitals — Standard OPD"` not `"Vitals"`.
8. All new `field_id` values must be registered in `fieldRegistry.js` before the field is used in any form. The registry is the single source of truth for all canonical fields.

---

## 2. Field Selection Algorithm (Decision Tree)

Apply these questions in strict order. Stop at the first match. Never skip ahead.

```
Q1. Is the value always derived mathematically from other fields?
    YES → calculated. Stop.
    NO  → continue.

Q2. Is it a single numeric measurement with a unit and known normal range?
    YES → number.
         Always set: unit, min, max, step, reference_range, placeholder = normal range string.
         Never accept negative values unless physiologically valid for that field.
         Stop.
    NO  → continue.

Q3. Does it need free-text entry AND lookup from a controlled vocabulary
    (symptoms, anatomy, diagnoses, drugs, procedures, terms)?
    YES → text with search_type set.
         Compound behaviour: search terminology DB first → pick result → if no match,
         accept free-text entry as-is. Never a plain blank box for clinical concepts.
         Stop.
    NO  → continue.

Q4. Is it a clinical narrative — history, impression, plan, findings, instructions?
    YES → textarea. Always enable dictation (mic icon). Stop.
    NO  → continue.

Q5. Is it exactly Present / Absent with equal clinical weight for both answers?
    YES → yes_no, display_style: button_group. Stop.
    NO  → continue.

Q6. Can multiple answers be true simultaneously?
    YES →
         Q6a. Are there ≤ 4 options AND all must be visible at once?
              YES → checkbox, display_style: button_group. Stop.
         Q6b. 5+ options OR list may grow OR clinician will search?
              YES → dropdown, multi_select: true, searchable: true. Stop.
    NO  → continue (mutually exclusive).

Q7. Only one answer allowed (mutually exclusive).
    Q7a. ≤ 3 options, all must be visible at once?
         YES → single_choice, display_style: button_group. Stop.
    Q7b. 4–5 options, seeing all helps the clinician?
         YES → single_choice, display_style: vertical. Stop.
    Q7c. 6+ options, OR list may grow, OR clinician will search?
         YES → dropdown, searchable: true. Stop.

Q8. Is it an ordered intensity rating with no unit (pain 0–10, severity 1–5)?
    YES → scale. Set min, max, verbal anchors at each end. Stop.

Q9. Date only?
    YES → date. Enable keyboard entry + calendar picker both. Stop.

Q10. Date + time together?
     YES → datetime. Enable keyboard + picker both. Stop.

Q11. Time of day only (no calendar)?
     YES → time. Stop.

Q12. Same field group repeating a variable number of times?
     YES → repeating_section. Stop.

Q13. Must come from a structured clinical database?
     YES → diagnosis_search / medication_search / allergy_search / procedure_search. Stop.

Q14. Location needs marking on a body diagram?
     YES → body_map. Stop.

DEFAULT → text with dictation enabled.
```

---

## 3. Compound Field Rules (Always Prefer Multi-Mode)

1. **All dropdowns with 4+ options are searchable by default.** Type to filter, click to select. Option count is no longer a constraint — design for clinical completeness, not brevity. 10, 20, 50 options are all equally usable with search.
2. **Dropdowns support `multi_select: true`** wherever multiple answers are clinically valid. This replaces standalone checkbox lists for any list with 5+ items.
3. **All `text` fields for clinical concepts carry `search_type`** — terminology DB is searched first, free text accepted if no match. Never a plain text box for anything with a controlled vocabulary.
4. **Date fields always offer both keyboard entry and calendar picker** — the clinician picks the fastest path per situation.
5. **All `textarea` fields have a microphone icon** for voice dictation. Interaction priority order: type first → paste second → speak third. Mic is always present, never the only option.
6. **Number fields:** keyboard entry is primary. Scroll/stepper is secondary only. Never accept negative values unless the field is physiologically valid for negatives. Step must match clinical precision — `0.1` for temperature/weight, `1` for integer counts.
7. **A dropdown is always preferred over a radio group when space is limited**, even for 3–5 options, because a searchable dropdown takes one line regardless of option count.

---

## 4. Algorithmic (Conditional) Form Strategy

This is the core clinical documentation strategy. Every form must be built algorithmically — not as a flat list of fields.

1. **Every clinically significant `yes_no` or `single_choice` is a gate field.** Its answer controls which sub-fields appear.
2. **The expanding answer (YES or NO) is configurable in Admin per field.** Default: the positive/YES answer expands sub-fields. But for some clinical findings, NO is the answer that needs further documentation (e.g. "No fever — document baseline temperature"). Admin sets which answer triggers expansion.
3. **When the gate answer expands:** the sub-field group appears immediately below the gate field, visually indented with a left border, pushing all content below it downward. The form grows down — never sideways.
4. **When the gate answer collapses:** the sub-field group is hidden entirely. Hidden fields are not submitted and do not appear in the chart.
5. **Sub-fields can themselves be gate fields.** Nesting goes as deep as clinically needed. Each level indents further.
6. **Sub-fields use the full field type algorithm** — any type is valid inside a conditional block.
7. **Design the form to mirror the clinical decision path**, not the data collection checklist. The form guides the doctor through the encounter.

---

## 5. Form & Section Layout Rules

### Core principle: The form is a single vertical spine. It grows downward only. No side-by-side sections.

1. **Horizontal space is used to pack related fields on the same row.** Hemodynamics — 6 parameters fit in 2 rows. Never waste a full row on one field unless that field genuinely needs the full width.
2. **Estimate actual input width before placing a field.** A number input needs ~80px. A short dropdown needs ~120px. A textarea needs full width. Pack accordingly.
3. **Section grid: 12 columns.** Fields carry `layout: {x, y, w, h}` on the grid.
   - Number inputs: 3 columns (¼ row) — 4 across per row.
   - Short dropdowns (site, timing, rhythm): 3–4 columns.
   - Longer dropdowns (character, location): 4–6 columns.
   - `yes_no` button group: 3–4 columns.
   - `textarea` and narrative fields: 12 columns (full width always).
   - `calculated` summary fields: 12 columns (full width always).
   - `scale`: 12 columns (full width always).
   - `body_map`: 12 columns (full width always).
4. **Location qualifier sits on the same row, immediately left of its measurement.** `bp_site` → `bp_systolic` → `bp_diastolic` on one row.
5. **Calculated fields appear on the same row as their source inputs if they are compact** (e.g. BMI label + value inline after weight and height). If the calculated result needs explanation, it goes on the next full-width row.
6. **Divider + Label** before each sub-group within a section. Sub-groups get named separators, not separate sections.
7. **Conditional sub-field blocks are visually indented** — left border line + subtle background tint. The indentation level increases with nesting depth.
8. **The form is always scrollable downward.** No pagination, no tabs within a section. One continuous vertical flow.
9. **Required fields are rare.** Only mark required if the section is meaningless without it. Over-required forms block documentation.

### Target row budget per common section:
| Section | Target rows |
|---|---|
| Hemodynamics (BP site + systolic + diastolic + pulse + rhythm + SpO₂ + RR) | 2 rows |
| Temperature (site + value) | 1 row |
| Anthropometrics (weight + height + BMI auto) | 1 row |
| Pain scale | 1 row + expands down conditionally |
| Metabolic (glucose timing + value) | 1 row |

---

## 6. Form Behaviour Rules

### Auto-save & Draft
1. Every form auto-saves as a draft every 30 seconds while open, and on every field blur event.
2. Draft data persists across sessions and browser refreshes — reopening the form restores exactly where the doctor left off.
3. A draft is never visible in the patient chart to any other clinician. Only the drafting doctor sees their own draft in the "This Visit" strip (amber dot indicator on the chip).
4. On final submit, the draft is cleared and a signed submission is created. No double-storage.

### After Submission
1. After submission the form closes and data clears from the form state completely.
2. The submitted data appears in the patient chart as a read-only rendered block.
3. To edit, the doctor clicks the pencil chip in the "This Visit" strip — this reopens the form pre-populated with the submitted values as editable fields.
4. Editing creates a new submission version. The original submission is preserved in audit history. The chart always shows the latest version.

### Pre-fill — Field-level Suggestion (not form-to-form copy)
1. Pre-fill works at the **individual field level**, not form level. It is based on `field_id` — if the same `field_id` was filled in any recent form for this patient, a suggestion appears.
2. The suggestion appears **below the field input**, in green, small text. Format: `💡 [value] [unit] · [form name] · [time ago]  [Use]`
3. Clicking **Use** copies the suggested value into the field. Ignoring it has no effect.
4. Suggestions are sourced from the most recent entry for that `field_id` across all forms for this patient — not limited to the same form type. A vitals form can suggest `bp_systolic` to a surgical pre-op form because it is the same `field_id`.
5. Time-sensitive fields (vitals measurements) show suggestions only if the source entry is within a clinically reasonable window (configurable per field in Admin — default 24 hours for vitals, 30 days for history fields).
6. A **"Copy all suggested values"** button appears at the top of the form if 3 or more fields have suggestions available. This fills all suggested values at once, still as editable entries.
7. Calculated fields (`bmi`, `map`) are never pre-filled from suggestions — they always recalculate live from current inputs.

### Standard Auto-filled Fields (never manually entered)
These fields are populated automatically on every form open:
- Patient name, date of birth, gender, patient ID
- Encounter ID, encounter date
- Clinic name, branch
- Doctor name, designation
- Form opened datetime

---

## 7. Admin Configurability Rules

1. Every form and every section is fully editable in Admin — fields, labels, options, conditions, layout, order.
2. Forms can be **enabled or disabled per portal** (Provider, CareChart, Staff, etc.) without deletion. Disabling hides the form from search in that portal only.
3. Forms are **global by default.** Admin can restrict a form to specific health centres at publish time.
4. **Which conditional answer triggers sub-field expansion** is configurable per gate field in Admin. Default: positive/YES answer expands.
5. **Which fields render in the patient chart** is configurable per field in Admin. Fields can be marked "chart-excluded" — they are stored in the submission for audit but never shown in the chart view.
6. Sections are always global — they cannot be clinic-specific. Forms that include them can be scoped.
7. A published form cannot have `field_id` values changed. Label, options, conditions, reference ranges, and layout are editable after publish.
8. If Admin portal lacks a required UI tool (e.g. body map editor, matrix builder), it must be built — accessibility of all configuration is mandatory. No form feature should require direct database editing.

---

## 8. OPD Chart Rendering Rules

### Field label resolution
1. Labels always resolve from the **current schema** at render time — never from the stored submission. A label rename reflects immediately in the chart for all historical entries.
2. If a `field_id` in a submission has no matching field in the current schema (field was removed), it renders with the raw `field_id` as a fallback label, flagged with a grey "legacy" indicator.

### Value rendering
3. **Short values (< 40 characters, no line breaks):** rendered inline in a responsive auto-fill grid — `minmax(160px, 1fr)`. Multiple fields side by side, wrapping naturally.
4. **Long values (≥ 40 characters or contains line breaks):** rendered full-width as a paragraph, label on the line above.
5. **Units appended to value:** `"38.2 °C"` not `"38.2"`.
6. **Calculated fields:** rendered as a distinct chip — label + value + unit, full width, visually differentiated from entered fields.

### Reference range indicators
7. Number fields with `reference_range` show a coloured status badge beside the value:
   - Green tick `✓` — within normal range
   - Orange down arrow `↓` — below normal
   - Orange up arrow `↑` — above normal
   - Red warning `⚠` — critical low or critical high (also triggers an alert banner at the top of the chart section)

### Conditional fields
8. Fields that were hidden (gate answer did not expand them) are not rendered in the chart at all. The chart only shows what was documented.

### Submitted form chip (This Visit strip)
9. Each submitted form appears as a compact chip: `[form title] [pencil icon]`.
10. Draft forms appear as a chip with an amber dot: `[form title] [amber dot]`.
11. If the same form was submitted multiple times in the encounter, the chip shows `×N` count. Chart renders only the latest by default; all versions accessible via "History".
12. Clicking the pencil chip opens the form inline, pre-populated with the latest submission data as editable fields.

### Chart-excluded fields
13. Fields marked "chart-excluded" in Admin are stored in the submission but never rendered in the chart view. Used for workflow, audit, and administrative fields.

---

## 9. Form Opening & Size Rules

1. **OPD Chart (Provider portal):** form opens inline, replacing the main content area. Full height of the chart pane. Max width `4xl` (56rem). No modal — doctor stays in context. Scrollable downward within the pane.
2. **CareChart (inpatient):** form opens as a full-screen overlay with section navigation on the left sidebar.
3. **Staff portal:** form opens as a right-side drawer, 480px wide, full viewport height.
4. **Print view:** form renders as a clean printable document — clinic header, patient demographic strip, then sections top to bottom. No UI chrome, no sidebars, no buttons.
5. All forms are responsive — on narrow screens the grid collapses to single column automatically. Field order is preserved top-to-bottom in the collapsed view.
6. The form never opens in a small modal. Minimum usable size is 480px wide. Clinical documentation needs space.

---

## 10. Visual Layout Reference — Vitals Standard OPD

```
┌─────────────────────────────────────────────────────────────┐
│  VITALS — STANDARD OPD                      [Draft ●]       │
│  Ravi Kumar · 45M · Enc #1042               [Submit]        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ── HEMODYNAMICS ───────────────────────────────────────    │
│  [BP Site ▾ Left Arm ] [Systolic ___mmHg] [Diastolic ___]  │
│  [Pulse ___ bpm] [Rhythm ▾ Regular] [SpO₂ ___%] [RR ___]  │
│                                                             │
│  ── TEMPERATURE ────────────────────────────────────────    │
│  [Temp Site ▾ Oral ] [Temp ___ °C ]                        │
│                                                             │
│  ── ANTHROPOMETRICS ────────────────────────────────────    │
│  [Weight ___ kg] [Height ___ cm]  BMI: — kg/m² (auto)     │
│                                                             │
│  ── PAIN ───────────────────────────────────────────────    │
│  Pain Score  0 ──●──────────────── 10                      │
│                                                             │
│  ↓ expands if score > 0 ↓                                  │
│  │ [Character ▾ search…] [Onset ▾ ]                        │
│  │ [Location — search or tap body map…               ]     │
│  │ Radiation?  ◉ Yes  ○ No                                 │
│  │   ↓ expands if Yes ↓                                    │
│  │   │ [Radiates to — search anatomy…               ]      │
│                                                             │
│  ── METABOLIC ──────────────────────────────────────────    │
│  [Glucose Timing ▾ Fasting ] [Blood Glucose ___ mg/dL]    │
│                                                             │
│                                          ↓ scrolls down ↓  │
└─────────────────────────────────────────────────────────────┘
```

### Pre-fill suggestion appearance (below field, green):
```
  [Systolic BP input: 142 mmHg              ]
  💡 138 mmHg · Vitals · 2h ago  [Use]
     ↑ green, 11px, sits directly below input
```

---

## 11. Session & Admission State Rules

### Edit icon visibility
1. The pencil (edit) icon on a submitted form chip is shown **only while the session is active** — OPD encounter open, or IPD admission ongoing.
2. Once an OPD session is marked complete, or a patient is discharged from IPD, the pencil icon is removed from all chips for that encounter/admission. All submitted forms become permanently read-only from that point.
3. There is no edit icon on the chart view for closed sessions — the form title chip is shown without any action icon.

| State | Chip appearance | Edit allowed |
|---|---|---|
| OPD session active | `[Form Title ✏]` | Yes |
| OPD session completed | `[Form Title]` | No |
| IPD admission active | `[Form Title ✏]` | Yes |
| IPD discharged | `[Form Title]` | No |
| Draft (any active session) | `[Form Title ●]` amber dot | Opens to resume |

### Pre-fill suggestion scope
4. Pre-fill suggestions from clinical measurements (vitals, assessments, examination findings) are scoped **strictly to the current session** — the same OPD encounter or the same IPD admission.
5. Once a session is completed or a patient is discharged, those clinical values are never suggested in any future session. A new encounter starts fresh with no measurement suggestions.
6. **Permanent patient data** is exempt from this rule — the following always auto-fill regardless of session state:
   - Patient name, date of birth, gender, patient ID
   - Blood group
   - Known allergies
   - Chronic conditions / comorbidities
   - Encounter ID, encounter date, clinic, doctor name
7. Calculated fields (BMI, MAP) are never pre-filled from any previous session — they always recalculate live from current inputs.

---

## 12. Form Chip & Pencil Rules

1. **One form = one chip = one pencil.** No matter how many sections or fields are inside a form, it is one submitted unit represented by a single chip in the This Visit strip.
2. A comprehensive care form with 8 sections inside (Chief Complaint, Examination, Vitals, Investigations, Impression, Plan, etc.) still produces one chip. Clicking the pencil opens the entire form — the doctor navigates to the section needing correction.
3. **Two things documented together = one form.** If two sets of fields are always documented in the same encounter visit, they belong in one comprehensive form, not two separate forms. Two forms = two chips = unnecessary cognitive load.
4. The chip label is the form title. It truncates at ~20 characters with an ellipsis if longer.
5. Draft chips show an amber dot instead of a pencil. Clicking them reopens the form with all partially filled data restored exactly as left.
6. **A submitted form stays editable for the whole time the encounter is open.** In an active OPD session (before it is concluded/completed) or an active IPD admission (before discharge), the chip shows a pencil icon. Clicking opens the form pre-populated with the last submission — all fields editable, and re-submitting saves the changes. There is no per-submission lock while the encounter is live; the doctor can revise any form as many times as needed until the visit closes.
7. **Read-only begins only at session close / discharge.** The moment the OPD session is concluded (or the IPD patient is discharged), every submitted form for that encounter becomes a permanent record: the chip loses its pencil icon and clicking it opens the form in a read-only view — all inputs disabled, no submit or save-draft, only a Close action. Editing is never possible after close.

### Visual summary:
```
ACTIVE SESSION:
  [Vitals ✏]  [Pre-op Assessment ✏]  [Pain ●]
                                           ↑ draft, not yet submitted

CLOSED SESSION / DISCHARGED:
  [Vitals]  [Pre-op Assessment]  [Pain]
  ↑ no icons — read-only, permanent record
```

---

*End of document — Version 3.0. All form and section builds must conform to this standard.
Update this document when a rule changes. Never build first and document later.*
