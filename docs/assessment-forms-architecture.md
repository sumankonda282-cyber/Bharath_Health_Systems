# Assessment Forms — Architecture, Rules & Policies

> **Source of truth** for every assessment form created in Bharath Health Systems.
> Any form that does not conform to these rules will not render correctly in any portal.
> Admin, developers, and clinical content authors must follow this document before
> creating or modifying any form.

---

## 1. What Assessment Forms Are

Assessment forms are structured clinical documentation templates that:
- Are created once in the Admin portal
- Are filled by clinical staff in Provider (OPD) and CareChart (IPD) portals
- Render submitted data as readable key-value content inside patient charts
- May produce automated scores (PHQ-9, GCS, etc.) via scoring rules

They are **not** general-purpose surveys. Every field must be clinically meaningful
and every form must fit exactly one of the defined categories.

---

## 2. Portal Usage Map

| Portal | What forms are shown | Where submissions appear |
|---|---|---|
| **Provider (OPD)** | Right panel form library — all published global forms | Inside SOAP chart (S/O/A/P sections) based on form category |
| **CareChart (IPD)** | Form library on ward — nursing + clinical categories | Chronological ward timeline as a documentation event |
| **Admin** | Full library — create, edit, publish, retire | N/A (management only) |
| **Staff/Receptionist** | Not shown | N/A |
| **Patient** | Not shown | N/A |

---

## 3. Category System (Mandatory)

Every form must have exactly one `category` value from this fixed list.
The category controls SOAP routing in OPD and section grouping in CareChart.

### OPD SOAP routing

| `category` value | SOAP bucket | Appears in |
|---|---|---|
| `History & Complaint` | **S** — Subjective | Provider OPD chart |
| `Physical Examination` | **O** — Objective | Provider OPD chart |
| `Assessment & Diagnosis` | **A** — Assessment | Provider OPD chart |
| `Plan & Treatment` | **P** — Plan | Provider OPD chart |

### CareChart (chronological — no SOAP)

| `category` value | Timeline label | Appears in |
|---|---|---|
| `Nursing Assessment` | Nursing | CareChart ward timeline |
| `Clinical Assessment` | Clinical | CareChart ward timeline |
| `Scored Tool` | Scored Assessment | Both portals |
| `Procedure & Consent` | Procedure | CareChart ward timeline |

### Category regex used by `categorizeSoap()` in `OpdChart.jsx`

```js
if (/history|complaint|symptom|hpi|review.?of.?system|chief/.test(combined)) return 'S'
if (/examination|exam|physical|finding|objective|observation/.test(combined))  return 'O'
if (/assessment|diagnosis|impression|differential|icd/.test(combined))         return 'A'
if (/plan|treatment|management|counsel|education|discharge|referral/.test(combined)) return 'P'
```

**Rule:** Your `category` value must contain at least one of these keywords so the
regex routes the submission to the correct SOAP bucket. Do not invent new category
names that do not match the regex.

---

## 4. Schema Structure (Mandatory)

### Correct — use `sections[]`

```json
{
  "sections": [
    {
      "id": "section_id",
      "title": "Section Display Title",
      "fields": [
        {
          "id": "field_id",
          "type": "text",
          "label": "Field Display Label",
          "required": true,
          "placeholder": "hint text"
        }
      ]
    }
  ]
}
```

### Forbidden — flat `fields[]` at root level

```json
{
  "fields": [...]
}
```

**Why:** `_form_field_count()` in the backend reads `schema.sections[].fields`.
A form with a flat `fields[]` array counts as 0 fields and is hidden from all
search results everywhere in the platform.

---

## 5. Field Rules

### Field ID rules
- Must be `snake_case`, all lowercase, no spaces
- Must be descriptive and clinically meaningful
- **Good:** `chief_complaint`, `systolic_bp`, `pain_score`, `onset_date`
- **Bad:** `field_1`, `q3`, `input_a`, `f2`
- The field ID becomes the label when rendered in the chart — formatKey() converts
  `chief_complaint` → `Chief Complaint`

### Field types supported

| Type | Use for |
|---|---|
| `text` | Single-line free text (names, values) |
| `textarea` | Multi-line narrative text |
| `number` | Numeric values (scores, measurements) |
| `select` | Single choice from a list |
| `multiselect` | Multiple choices from a list |
| `radio` | Single choice with visible options |
| `checkbox` | Yes/no boolean |
| `date` | Date picker |
| `range` | Slider (numeric range, e.g. pain 0–10) |

### Field label rules
- Title-case, human readable
- Match what a clinician would say out loud
- **Good:** `Chief Complaint`, `Duration of Symptoms`, `Pain Score (0–10)`
- **Bad:** `ChiefComplaint`, `DURATION`, `field label`

### Required fields
- Mark `required: true` only for fields that are clinically unsafe to omit
- Do not make every field required — clinicians skip fields that do not apply

---

## 6. Scoring Rules (Scored Tools only)

Forms with `category: "Scored Tool"` may include a `scoring_config` block:

```json
{
  "scoring_config": {
    "method": "sum",
    "fields": ["item_1", "item_2", "item_3"],
    "ranges": [
      { "min": 0,  "max": 4,  "label": "Minimal",  "severity": "low" },
      { "min": 5,  "max": 9,  "label": "Mild",      "severity": "low" },
      { "min": 10, "max": 14, "label": "Moderate",  "severity": "medium" },
      { "min": 15, "max": 27, "label": "Severe",    "severity": "high" }
    ]
  }
}
```

- `method`: `sum` (add field values) or `weighted` (field × weight)
- Score is computed automatically on submission and stored in `FormSubmission.scores`
- Rendered in the chart as a badge: `PHQ-9: 12 — Moderate`

---

## 7. Visibility & Status Rules

| `status` | Visible in search | Fillable | Notes |
|---|---|---|---|
| `draft` | No | No | Work in progress in admin |
| `published` | **Yes** | **Yes** | Live, usable in all portals |
| `retired` | No | No | Old version, submissions preserved |

**Rules:**
- Only publish a form when it has been reviewed clinically
- Never edit a published form's field IDs — create a new version instead
  (changing a field ID breaks rendering of historical submissions)
- Retire a form to remove it from the library; never hard-delete

---

## 8. Mandatory Metadata for Every Form

When creating a form in the Admin portal, all of these must be set:

| Field | Required | Rule |
|---|---|---|
| `title` | ✅ | Clear clinical name, title case. Max 80 chars. |
| `description` | ✅ | One sentence: what this form documents and when to use it |
| `category` | ✅ | Must be from the fixed category list in Section 3 |
| `subcategory` | Optional | Sub-grouping within a category (e.g. `ophthalmology` under `Physical Examination`) |
| `icon` | Optional | Single emoji for visual identification in the form library |
| `clinic_id` | Leave null | Null = global, available to all clinics. Only set if a form is specific to one health centre. |
| `is_template` | ✅ | Always `true` for library forms |
| `status` | ✅ | Start as `draft`, publish only after review |

---

## 9. Naming Convention

Form titles must follow this pattern:

```
[Body System or Context] — [Type of Documentation]
```

**Examples:**
- `Respiratory — Physical Examination`
- `Paediatric — History & Chief Complaint`
- `PHQ-9 — Depression Screening`
- `Post-op — Nursing Assessment`
- `Chronic Disease — Follow-up Note`

**Avoid:**
- Abbreviations in titles (`CVS Exam` → `Cardiovascular — Physical Examination`)
- Version numbers in titles (`History Form v2` → create a new form, retire the old)
- Portal names in titles (`OPD Complaint Form` → just `General History & Chief Complaint`)

---

## 10. Approved Form Library

This is the authorised list of forms for Bharath Health Systems.
No form outside this list should be created without clinical review and approval.

### OPD Forms (Provider Portal)

#### S — History & Complaint
| ID | Title | Subcategory |
|---|---|---|
| — | General History & Chief Complaint | general |
| — | Follow-up Visit Notes | general |
| — | Paediatric History | paediatrics |
| — | Obstetric & Gynaecology History | obstetrics |
| — | Mental Health History | psychiatry |
| — | Surgical History & Pre-op Assessment | surgery |
| — | Review of Systems | general |

#### O — Physical Examination
| ID | Title | Subcategory |
|---|---|---|
| — | General Physical Examination | general |
| — | Cardiovascular — Physical Examination | cardiology |
| — | Respiratory — Physical Examination | pulmonology |
| — | Abdominal — Physical Examination | gastroenterology |
| — | Neurological — Physical Examination | neurology |
| — | Musculoskeletal — Physical Examination | orthopaedics |
| — | Dermatology — Physical Examination | dermatology |
| — | ENT — Physical Examination | ent |
| — | Eye — Physical Examination | ophthalmology |

#### A — Assessment & Diagnosis
| ID | Title | Subcategory |
|---|---|---|
| — | Clinical Diagnosis & ICD Code | general |
| — | Chronic Disease Management Note | general |

#### P — Plan & Treatment
| ID | Title | Subcategory |
|---|---|---|
| — | Patient Education & Counselling | general |
| — | Discharge & Follow-up Instructions | general |
| — | Referral Note | general |
| — | Procedure Consent & Plan | general |

---

### CareChart Forms (IPD Ward)

#### Nursing Assessment
| ID | Title | Subcategory |
|---|---|---|
| — | Nursing Admission Assessment | general |
| — | Pain Assessment (NRS/VAS) | general |
| — | Fall Risk Assessment (Morse Scale) | general |
| — | Pressure Ulcer Risk (Braden Scale) | general |
| — | Nutrition Screening (MUST) | general |
| — | Wound Assessment & Dressing Note | general |
| — | IV Access & Fluid Balance | general |
| — | Patient & Carer Education Note | general |

#### Clinical Assessment
| ID | Title | Subcategory |
|---|---|---|
| — | Anaesthesia Pre-assessment | anaesthesia |
| — | Peri-operative Checklist | surgery |
| — | Consent Form Documentation | general |

#### Scored Tools (both portals)
| ID | Title | Score range |
|---|---|---|
| — | PHQ-9 — Depression Screening | 0–27 |
| — | GAD-7 — Anxiety Screening | 0–21 |
| — | Mini Mental State Examination (MMSE) | 0–30 |
| — | APGAR Score (Newborn) | 0–10 |
| — | Glasgow Coma Scale (GCS) | 3–15 |
| — | FLACC — Paediatric Pain Scale | 0–10 |
| — | ICU Severity (SOFA Score) | 0–24 |

---

## 11. What NOT to Do

- ❌ Do not create forms with `schema.fields[]` at root — use `schema.sections[]`
- ❌ Do not use field IDs like `field_1`, `q3`, `input_a`
- ❌ Do not use a category name not in the approved list (Section 3)
- ❌ Do not edit field IDs on a published form — retire and recreate
- ❌ Do not hard-delete forms — always soft-delete (set `deleted_at`)
- ❌ Do not set `clinic_id` on a standard clinical form — keep null (global)
- ❌ Do not create portal-specific forms (no "OPD form" vs "CareChart form" distinction
  at the data level — category determines where a form appears)
- ❌ Do not set `required: true` on every field
- ❌ Do not put version numbers in form titles

---

## 12. How New Forms Are Added

1. Clinical lead defines the form fields and submits a spec (field name, type, label, required?)
2. Admin creates the form in the Admin portal as `status: draft`
3. Admin confirms: category is from approved list, field IDs are snake_case, schema uses sections[]
4. Clinical lead reviews the form in draft mode
5. Admin publishes the form (`status: published`)
6. Form immediately appears in Provider OPD panel and CareChart library

*Last updated: 2026-06-30. Update this document when new categories or forms are approved.*
