# CLAUDE.md — Bharath Health Systems Engineering Contract

> **This file is the engineering contract.** Claude Code reads it before every change.
> A senior fullstack developer should be able to onboard from this file alone.
> If a change conflicts with the rules in Section 5, **stop and re-plan** — the rules win.

---

## 0. Professional Quality Standards (Non-Negotiable)

These standards apply to **every task, every file, every change** — no exceptions.

| Standard | What it means |
|---|---|
| **Completeness in first attempt** | Every feature must be fully built, wired, tested, and working before reporting done. No half-finished work. No "I'll add that later." |
| **Never ignore possible issues** | If you spot a bug, broken pattern, or risk while working nearby — fix it or flag it immediately. Never walk past a problem. |
| **High coding quality** | Clean, readable code. No dead code, no commented-out blocks, no `console.log` left in, no TODO without a resolution plan. |
| **Professionalism** | Match the standard of a senior fullstack developer. No shortcuts, no "good enough", no placeholder logic in production code. |
| **Attention to detail** | Every user-facing screen must handle all states: loading, empty, error, success. Check edge cases before marking done. |
| **No silent failures** | Never swallow errors without logging or user feedback. Every API call must handle failure visibly with a message or fallback. |
| **Cross-portal awareness** | Before any backend change, verify impact on all 9 portals. Never assume a change is isolated. Check the ownership map in Section 3. |
| **Self-review before pushing** | Re-read every file changed as if reviewing someone else's code. If something looks wrong, fix it before committing. Never push and hope. |

> These are not suggestions. A task is not complete until all 8 standards are met.

---

## 1. Project Overview

**Bharath Health Systems** (a.k.a. BharatCliniq) is a multi-portal SaaS platform for
clinics and hospitals in India. It covers the full patient + clinical + operations
lifecycle: public booking, patient self-service, reception/front-desk, doctor
encounters, inpatient/ward (CareChart), pharmacy, lab, imaging, and a platform-admin
console. A single multi-tenant FastAPI backend serves **nine** independent React
frontends ("portals").

### Tech Stack
- **Backend:** FastAPI (Python), SQLAlchemy ORM, PostgreSQL.
  - App entry: `backend/app/main.py`. All routers mounted under `/api/v1`.
  - Auth: JWT (`HS256`), tokens issued per actor type (staff / patient / platform admin).
  - Rate limiting via `slowapi`; security headers + path-normalization middleware in `main.py`.
- **Frontends:** 9 React (Vite) SPAs under `frontend/<portal>/`. Axios clients, base
  URL from `VITE_API_URL`.
- **Database:** PostgreSQL. Schema is created and migrated **entirely from `backend/start.sh`**
  (see Rule 5). There is **no Alembic**.

### Deployment
- **Backend:** Render. Production API host (env `VITE_API_URL`): `https://bharatcliniq-api.onrender.com`.
  The legacy hardcoded fallback baked into several frontends is `https://BharathHealthSystems-api.onrender.com`.
  Both are live; prefer the env-driven `bharatcliniq-api.onrender.com`.
- **Frontends:** Vercel and/or Cloudflare Pages, one deployment per portal. Custom
  subdomains under `*.bharathhealthsystems.com`; Vercel preview URLs and `*.bhs-staff.pages.dev`
  are allowed by the CORS regex in `main.py`.

### Git Workflow
- **Always develop on branch `claude/vigilant-wozniak-H1kwo`.**
- **Never push directly to `main`.** The user merges the working branch into `main`,
  which triggers auto-deploy. (See Section 10.)

---

## 2. Portal Directory Map

All portals are Vite + React SPAs. Each `frontend/<portal>/src/api/client.js` builds
`baseURL = ${VITE_API_URL}/api/v1` via axios. Token storage differs by actor (noted below).

| # | Portal | Directory | Purpose | Deployed URL pattern | Primary backend endpoints |
|---|--------|-----------|---------|----------------------|---------------------------|
| 1 | **public** | `frontend/public/` | Marketing site + public booking, clinic/doctor discovery, clinic self-registration | `bharathhealthsystems.com`, `www.` | `/public/*`, `/otp/*` (no auth) |
| 2 | **patient** | `frontend/patient/` | Patient self-service: appointments, prescriptions, bills, lab/imaging results | `my.bharathhealthsystems.com` | `/portal/*` (primary), `/public/*`, `/auth/patient/*`, `/otp/*`, `/pdf/portal/*` |
| 3 | **staff** | `frontend/receptionist/` | **Staff portal with 2 views: Receptionist** (front desk, registration, appointments, billing) **and Manager** (staff scheduling, clinic admin, reports). Both views share the same SPA — the role from the JWT determines which view/nav is shown. Directory name is `receptionist/` for historical reasons but the portal serves both roles. | `staff.bharathhealthsystems.com` | `/inpatient/*`, `/clinic/*`, `/scheduler/*`, `/patients/*`, `/appointments/*`, `/chat/*`, `/billing/*`, `/maintenance/*`, `/terminology/*`, `/forms/*` |
| 4 | **provider** | `frontend/provider/` | Doctor/clinical workstation; broadest API consumer | `provider.bharathhealthsystems.com` | `/inpatient/*`, `/clinic/*`, `/provider/*`, `/patients/*`, `/platform/*`, `/appointments/*`, `/chat/*`, `/referrals/*`, `/doctor/*`, `/pharmacy/*`, `/billing/*`, `/lab/*`, `/imaging/*`, `/terminology/*` |
| 5 | **carechart** | `frontend/carechart/` | Inpatient / nursing / ward documentation; PIN-gated clinical actions | `carechart.bharathhealthsystems.com` | `/inpatient/*`, `/assessment-forms/*`, `/carechart/*`, `/chat/*`, `/patients/*`, `/auth/staff/pin-identify`, `/terminology/*`, `/support/*` |
| 6 | **pharmacy** | `frontend/pharmacy/` | Pharmacy: inventory, dispensing, suppliers, GST/drug register | `pharmacy.bharathhealthsystems.com` | `/pharmacy/*` (primary), `/billing/*`, `/chat/*`, `/auth/staff/*`, `/patients/*`, `/otp/*` |
| 7 | **lab** | `frontend/lab/` | Lab: order queue, sample collection, result entry | `lab.bharathhealthsystems.com` | `/lab/*`, `/lab-orders/*`, `/chat/*`, `/billing/*`, `/auth/staff/*`, `/patients/*` |
| 8 | **imaging** | `frontend/imaging/` | Radiology: orders, acquisition, reporting, critical alerts | `imaging.bharathhealthsystems.com` | `/imaging/*` (primary), `/imaging-orders/*`, `/chat/*`, `/billing/*`, `/auth/staff/*`, `/patients/*` |
| 9 | **admin** | `frontend/admin/` | Platform super-admin console: clinic approval, plans, payments | (platform console; no public subdomain) | `/platform/*` (dominant), `/assessment-forms/*`, `/auth/platform/*` |

**Token storage by actor family (important — do not cross-wire):**
- **patient / public:** `patient_token` in localStorage (public has none).
- **staff clinical** (provider, carechart, receptionist): `access_token` + `refresh_token`, auto-refresh via `POST /auth/staff/refresh`.
- **staff service desks** (pharmacy, lab, imaging): `staff_token` + `staff_refresh_token`.
- **admin:** `admin_token` in **sessionStorage** (not localStorage), no auto-refresh.

---

## 3. Backend Endpoint Ownership Map

> All routers are mounted under `PREFIX = "/api/v1"` in `main.py`.
> Full path = `/api/v1` + router prefix + route suffix.
> **Risk:** HIGH = shared by 3+ portals · MEDIUM = 2 portals · LOW = single portal.

| File (`backend/app/api/v1/endpoints/…`) | Route prefix(es) | Owned by (callers) | Risk |
|---|---|---|---|
| `auth.py` | `/auth` (staff, patient, platform) | **All portals** | **HIGH** |
| `otp.py` | `/otp` → `/api/v1/otp/send`, `/api/v1/otp/verify` | public, patient, pharmacy, carechart | **HIGH** |
| `public.py` | `/public` | public, patient | MEDIUM |
| `platform_admin.py` | `/platform` | admin (primary), provider | MEDIUM |
| `clinic_admin.py` | `/clinic` | receptionist, provider | MEDIUM |
| `patients.py` | `/patients` | receptionist, provider, pharmacy, lab, imaging, carechart | **HIGH** |
| `appointments.py` | `/appointments` | receptionist, provider | MEDIUM |
| `doctor.py` | `/doctor` (also `/provider` routes) | provider | LOW |
| `pharmacy_lab_billing.py` | `/pharmacy`, `/lab`, `/billing`, `/imaging` (4 routers) | pharmacy, lab, imaging, provider, receptionist, carechart | **HIGH** |
| `portal.py` | `/portal` (defines its own patient auth deps) | patient | LOW |
| `pdf_routes.py` | `/pdf` (staff) + `/pdf/portal` (patient) | patient, provider, lab, pharmacy | **HIGH** |
| `referrals.py` | `/referrals` | provider | LOW |
| `encounters.py` | *no prefix* → `/clinic/*`, `/patients/*`, `/encounters/*`, `/triage` | provider, receptionist | MEDIUM |
| `bridge.py` | `/bridge` (custom `X-Bridge-Key`+`X-Clinic-Id` header auth) | external lab/imaging devices (NOT a portal) | LOW |
| `lab_orders.py` | `/lab-orders` | lab, provider | MEDIUM |
| `imaging_orders.py` | `/imaging-orders` | imaging, provider | MEDIUM |
| `chat.py` | `/chat` | provider, receptionist, carechart, pharmacy, lab, imaging | **HIGH** |
| `inpatient.py` | `/inpatient` (~140 routes) | carechart, provider, receptionist | **HIGH** |
| `maintenance.py` | `/maintenance` (platform admin only) | receptionist (superadmin tooling), admin | LOW |
| `payments.py` | `/payments` (**empty stub — no routes**) | none | LOW |
| `telehealth.py` | `/telehealth` | provider, patient | MEDIUM |
| `scheduler.py` | `/scheduler` | receptionist, provider | MEDIUM |
| `clinic_billing.py` | `/clinic/billing` | receptionist, provider | MEDIUM |
| `form_templates.py` | *no prefix* → `/forms/*` | receptionist, provider | MEDIUM |
| `assessment_forms.py` | *no prefix* → `/assessment-forms/*`, `/submissions/*`, `/form-pool/*`, `/iview/*` | carechart, admin, provider | **HIGH** |
| `terminology.py` | `/terminology` (search, drugs, CDS) | provider, receptionist, carechart | **HIGH** |
| `support.py` | `/support` | carechart | LOW |
| `carechart.py` | *no prefix* → `/carechart/*`, `/provider/forms/*` | carechart, provider | MEDIUM |

### Notable routing facts (memorize)
- `otp.py` is **NOT top-level** — it is mounted with the `/api/v1` prefix. Real paths are
  `/api/v1/otp/send` and `/api/v1/otp/verify`.
- **Prefix-less routers** (mounted directly at `/api/v1`): `encounters.py`,
  `form_templates.py`, `assessment_forms.py`, `carechart.py`. Their paths come from each
  route decorator, not a router prefix.
- `pharmacy_lab_billing.py` exports **four** routers: `pharmacy_router` (`/pharmacy`),
  `lab_router` (`/lab`), `billing_router` (`/billing`), `imaging_router` (`/imaging`).
- `lab_orders.py` / `imaging_orders.py` use empty-string route paths (`@router.post('')`),
  so the collection endpoint is exactly `/api/v1/lab-orders` / `/api/v1/imaging-orders`.
- `payments.py` is an **empty stub** (prefix only, zero routes).
- `bridge.py` uses **custom header auth** (`X-Bridge-Key` + `X-Clinic-Id` resolved against
  `Clinic.bridge_api_key`), not a `get_current_*` dependency.

---

## 4. Database Schema — Table Ownership

Models live in `backend/app/models/models.py` (~70+ tables). Tables are created via
`CREATE TABLE IF NOT EXISTS` in `start.sh`. **Risk:** HIGH = multiple portals write ·
LOW = single writer (others read).

> ⚠️ Two model classes both map to **`referrals`** is NOT the case — note the distinction:
> `PatientReferral` → table `patient_referrals`; `InpatientReferral` → table `referrals`.

### Core identity & tenancy
| Table | Model | Writers | Risk |
|---|---|---|---|
| `platform_admins` | `PlatformAdmin` | admin | LOW |
| `clinics` | `Clinic` | admin, receptionist (clinic admin) | MEDIUM |
| `branches` | `Branch` | receptionist (clinic admin) | LOW |
| `staff` | `Staff` | admin, receptionist; auth/PIN writes by all staff portals | **HIGH** |
| `doctor_profiles` | `DoctorProfile` | provider, receptionist | MEDIUM |
| `doctor_schedules` | `DoctorSchedule` | receptionist | LOW |
| `doctor_desk_assignments` | `DoctorDeskAssignment` | receptionist | LOW |
| `patients` | `Patient` | receptionist, provider, public/patient (registration) | **HIGH** |
| `patient_users` | `PatientUser` | patient, public, auth | MEDIUM |
| `bh_state_groups` / `bh_id_sequences` / `bh_profiles` | `BHStateGroup` / `BHIDSequence` / `BHProfile` | auth, public (BH-ID issuance) | MEDIUM |

### Encounters & clinical
| Table | Model | Writers | Risk |
|---|---|---|---|
| `appointments` | `Appointment` | receptionist, provider, patient | **HIGH** |
| `online_bookings` | `OnlineBooking` | public, patient, receptionist | **HIGH** |
| `vitals` | `Vitals` | provider, receptionist | MEDIUM |
| `soap_notes` | `SoapNote` | provider | LOW |
| `clinic_patient_tags` / `patient_tags` | `ClinicPatientTag` / `PatientTag` | provider, receptionist | MEDIUM |
| `encounter_access_logs` | `EncounterAccessLog` | provider (audit) | LOW |
| `prescriptions` / `prescription_items` | `Prescription` / `PrescriptionItem` | provider; read by pharmacy/patient | MEDIUM |
| `doctor_ratings` | `DoctorRating` | patient | LOW |
| `audit_logs` | `AuditLog` | all (audit) | **HIGH** |

### Pharmacy & inventory
| Table | Model | Writers | Risk |
|---|---|---|---|
| `medicines` | `Medicine` | pharmacy | LOW |
| `barcode_master` | `BarcodeMaster` | pharmacy | LOW |
| `suppliers` / `purchase_orders` / `purchase_order_items` | `Supplier` / `PurchaseOrder` / `PurchaseOrderItem` | pharmacy | LOW |
| `sales_returns` / `sales_return_items` | `SalesReturn` / `SalesReturnItem` | pharmacy | LOW |
| `drug_register` | `DrugRegister` | pharmacy | LOW |
| `medicine_batches` | `MedicineBatch` | pharmacy | LOW |
| `stock_transactions` | `StockTransaction` | pharmacy | LOW |
| `pharmacy_orders` / `dispense_sessions` / `dispense_items` | `PharmacyOrder` / `DispenseSession` / `DispenseItem` | pharmacy | LOW |

### Lab & imaging
| Table | Model | Writers | Risk |
|---|---|---|---|
| `lab_tests` | `LabTest` | lab | LOW |
| `lab_orders` / `lab_order_items` / `lab_results` | `LabOrder` / `LabOrderItem` / `LabResult` | lab, provider (orders), bridge (ingest) | MEDIUM |
| `imaging_orders` / `imaging_results` | `ImagingOrder` / `ImagingResult` | imaging, provider (orders), bridge | MEDIUM |
| `unmatched_results` | `UnmatchedResult` | lab, imaging, bridge | MEDIUM |
| `imaging_report_templates` / `imaging_critical_alerts` | `ImagingReportTemplate` / `ImagingCriticalAlert` | imaging | LOW |
| `referring_doctors` | `ReferringDoctor` | imaging | LOW |
| `imaging_slots` / `imaging_bookings` | `ImagingSlot` / `ImagingBooking` | imaging | LOW |
| `imaging_catalog` | `ImagingCatalog` | seed/reference | LOW |

### Billing
| Table | Model | Writers | Risk |
|---|---|---|---|
| `invoices` / `invoice_items` | `Invoice` / `InvoiceItem` | pharmacy, lab, imaging, receptionist, carechart (inpatient) | **HIGH** |
| `invoice_payments` | `InvoicePayment` | receptionist, pharmacy, lab, imaging | **HIGH** |
| `billing_waiver_logs` | `BillingWaiverLog` | receptionist, provider | MEDIUM |
| `insurance_claims` / `billing_override_requests` | `InsuranceClaim` / `BillingOverrideRequest` | receptionist, provider | MEDIUM |
| `subscription_payments` | `SubscriptionPayment` | admin | LOW |

### Inpatient / CareChart
| Table | Model | Writers | Risk |
|---|---|---|---|
| `departments` / `staff_departments` | `Department` / `StaffDepartment` | admin, receptionist | MEDIUM |
| `wards` / `beds` | `Ward` / `Bed` | admin, receptionist, carechart | MEDIUM |
| `admissions` / `admission_transfers` | `Admission` / `AdmissionTransfer` | carechart, provider, receptionist | **HIGH** |
| `appointment_token_sequences` | `AppointmentTokenSequence` | receptionist | LOW |
| `referrals` | `InpatientReferral` | provider, carechart, receptionist | **HIGH** |
| `patient_referrals` | `PatientReferral` | provider | LOW |
| `vital_signs` / `nursing_notes` | `VitalSign` / `NursingNote` | carechart | LOW |
| `medication_administrations` / `medication_orders` | `MedicationAdministration` / `MedicationOrder` | carechart, provider | MEDIUM |
| `ward_rounds` / `progress_notes` | `WardRound` / `ProgressNote` | provider, carechart | MEDIUM |
| `clinical_orders` | `ClinicalOrder` | provider, carechart | MEDIUM |
| `discharge_summaries` | `DischargeSummary` | provider, carechart | MEDIUM |
| `inpatient_charges` / `inpatient_bills` | `InpatientCharge` / `InpatientBill` | carechart, receptionist | MEDIUM |
| `documentation_sessions` | `DocumentationSession` | carechart | LOW |
| `visitor_policies` / `visitor_passes` | `VisitorPolicy` / `VisitorPass` | carechart, receptionist | MEDIUM |

### Forms & assessments
| Table | Model | Writers | Risk |
|---|---|---|---|
| `assessment_templates` / `template_assignments` | `AssessmentTemplate` / `TemplateAssignment` | admin, provider | MEDIUM |
| `form_templates` / `form_responses` | `FormTemplate` / `FormResponse` | receptionist, provider | MEDIUM |
| `assessment_forms` / `assessment_form_versions` | `AssessmentForm` / `AssessmentFormVersion` | provider, carechart, admin | **HIGH** |
| `form_pool` / `form_assignments` / `form_submissions` / `form_alerts` / `form_cosigns` | `FormPool` / `FormAssignment` / `FormSubmission` / `FormAlert` / `FormCoSign` | carechart, provider | MEDIUM |
| `iview_flowsheets` | `iViewFlowsheet` | carechart | LOW |

### Messaging, scheduling, telehealth, support, reference
| Table | Model | Writers | Risk |
|---|---|---|---|
| `chat_rooms` / `chat_room_members` / `internal_messages` / `message_reads` | `ChatRoom` / `ChatRoomMember` / `InternalMessage` / `MessageRead` | all staff portals | **HIGH** |
| `shift_types` / `staff_groups` / `staff_group_members` / `schedule_entries` / `leave_requests` / `schedule_patterns` / `schedule_publish_logs` / `scheduler_settings` | scheduler models | receptionist, provider | MEDIUM |
| `telehealth_sessions` / `telehealth_session_events` | `TelehealthSession` / `TelehealthSessionEvent` | provider, patient | MEDIUM |
| `maintenance_requests` | `MaintenanceRequest` | carechart, receptionist | MEDIUM |
| `password_reset_requests` | `PasswordResetRequest` | admin, auth | LOW |
| `feedback` | `Feedback` | public; read by admin | LOW |
| `platform_settings` | `PlatformSetting` | admin | LOW |
| `medical_terms` / `drugs` / `drug_interactions` / `drug_dose_ranges` / `drug_contraindications` / `drug_counselling` / `disease_counselling` | terminology/seed models | seed-only (read by provider, carechart, pharmacy) | LOW |

---

## 5. CRITICAL ENGINEERING RULES (enforced)

```
RULE 1:  NEVER rename or delete an existing API endpoint.
RULE 2:  NEVER drop a database column.
RULE 3:  ALWAYS use ADD COLUMN IF NOT EXISTS in start.sh for new columns.
RULE 4:  ALWAYS use CREATE TABLE IF NOT EXISTS in start.sh for new tables.
RULE 5:  NEVER use Alembic — all migrations go in start.sh.
RULE 6:  NEVER change a shared endpoint (risk: HIGH) without checking ALL portals that call it.
RULE 7:  Before ANY backend change, identify which portals call the affected endpoint.
RULE 8:  One backend change = verify ALL affected portals before pushing.
RULE 9:  New features get NEW endpoints — never modify existing ones.
RULE 10: NEVER import from app.core.auth — always use app.core.security.
RULE 11: All imports of get_current_user/get_current_staff come from app.core.security.
RULE 12: NEVER push directly to main — always use the claude/vigilant-wozniak-H1kwo branch.
```

These rules exist because nine portals share one backend and one database with **no
versioned migrations**. Backward compatibility is the only safety net.

---

## 6. Common Pitfalls (things that have broken before)

- **`app.core.auth` does not exist.** Import auth deps from **`app.core.security`**.
  (Note: `form_templates.py` imports `get_current_staff` from `app.api.v1.endpoints.auth`,
  which only re-exports the security version — the real source is `security.py`.)
- **Patient auth function name:** `security.py` exports `get_current_patient_user`
  (oauth2 patient scheme) and `get_current_platform_admin`. There is **no `get_current_user`**
  and **no `get_current_patient`** in `security.py` — `get_current_patient` is defined
  **locally in `portal.py`** (HTTPBearer-based). Do not assume a generic `get_current_user`.
- **Patient lookup is split by audience:**
  - Public/patient portals use **`/public/patient-lookup`** (unauthenticated).
  - Staff portals (receptionist, provider) use **`/patients/lookup`** (staff-only, authenticated).
  Do not call `/patients/lookup` from an unauthenticated portal.
- **OTP routes are `/api/v1/otp/send` and `/api/v1/otp/verify`** — they are mounted under
  the `/api/v1` prefix, NOT top-level `/otp/...`.
- **Lab status updates use `PUT`:** `PUT /lab/orders/{id}/status` (e.g. `sample_collected`,
  `completed`). Result submission is `POST /lab/orders/{id}/results`. Match the verb to the route.
- **`BarcodeScanner` (pharmacy) needs a callback ref, not `useRef`** for the `<video>`
  element — using a plain `useRef` produces a null camera ref (ZXing
  `decodeFromVideoDevice` gets no element).
- **Stale form spread in `StockIn` (pharmacy):** populate from a fresh base, e.g.
  `setForm({ ...EMPTY_FORM, ...details })`, **not** `setForm(f => ({ ...f, ...details }))`,
  to avoid carrying stale fields into the next entry.
- **`payments.py` is an empty stub.** Do not assume `/payments/*` endpoints exist.

---

## 7. Seeding & Test Data

- **Medical library seed (auto):** `backend/app/seed_medical_library.py` runs on startup.
  It is idempotent — each dataset checks an existing-count threshold before inserting
  (e.g. drugs seed only if the `drugs` table has < **4500** rows). Seeds medical terms,
  allergies, drugs, interactions, dose ranges, contraindications, counselling, lab tests,
  imaging catalog, disease counselling, etc.
- **Drug data source:** `backend/app/seed_data/drugs.py` (~5000 records). Other seed
  datasets live alongside it in `backend/app/seed_data/` (`interactions.py`,
  `drug_interactions_india.py`, `dose_ranges.py`, `contraindications.py`,
  `drug_counselling.py`, `lab_tests.py`, `imaging_catalog.py`, `diseases.py`,
  `disease_counselling.py`, `symptoms.py`, `anatomy.py`, `procedures.py`,
  `exam_findings.py`, `allergies.py`).
- **Test data (manual):** `backend/seed_test_data.py` — run by hand, not on startup.

---

## 8. Authentication Patterns

Source of truth: `backend/app/core/security.py`.

- **Staff auth:** JWT issued by `POST /auth/staff/login`. Dependency: `get_current_staff`.
  Refresh: `POST /auth/staff/refresh`. Current staff: `GET /auth/staff/me`.
- **Patient auth:** JWT issued by `POST /auth/patient/login`. Dependency:
  `get_current_patient_user` (security) — but the `/portal` patient endpoints use the
  locally-defined `get_current_patient` in `portal.py`.
- **PIN identification:** `POST /auth/staff/pin-identify` re-verifies a staff PIN for
  sensitive clinical actions. **CareChart** is the heaviest user (documentation, discharge,
  patient movement, ward orders, perioperative, diet). Setup/verify: `/auth/staff/pin-setup`,
  `/auth/staff/pin-verify`, `/auth/staff/pin-status`.
- **Platform admin:** separate JWT via `POST /auth/platform/login`; dependency
  `get_current_platform_admin`. Admin portal stores `admin_token` in **sessionStorage**.
- **Role guards** (all built on `get_current_staff`): `require_clinical`, `require_doctor`,
  `require_doctor_or_nurse`, `require_lab_access`, `require_lab_sign`,
  `require_imaging_access`, `require_imaging_sign`, `require_pharmacy`, `require_admin`,
  `require_admin_or_manager`, `require_billing_view`, `require_billing_waive`,
  `require_any_staff`.
- **Bridge (device) auth:** header-based `X-Bridge-Key` + `X-Clinic-Id` against
  `Clinic.bridge_api_key` — used only by `bridge.py` for external lab/imaging ingestion.

---

## 9. Pre-Change Checklist

Before making **any** change, answer every box:

- [ ] **Which endpoint file am I changing?** (Section 3)
- [ ] **Which portals call this endpoint?** (Section 3 ownership map — check the Risk level)
- [ ] **Am I adding a NEW endpoint or modifying an existing one?** (Must be new — Rule 9)
- [ ] **If adding a DB column:** does `start.sh` have `ADD COLUMN IF NOT EXISTS` for it? (Rule 3)
- [ ] **If adding a table:** does `start.sh` use `CREATE TABLE IF NOT EXISTS`? (Rule 4)
- [ ] **Auth imports come from `app.core.security`, not `app.core.auth`?** (Rules 10/11)
- [ ] **Am I on branch `claude/vigilant-wozniak-H1kwo`?** (Rule 12)
- [ ] **If the endpoint is HIGH risk:** have I checked every consuming portal? (Rules 6/8)

---

## 10. Deployment Pipeline

1. **Develop & commit** on `claude/vigilant-wozniak-H1kwo`.
2. **Push** the branch. (Never push to `main` — Rule 12.)
3. **User merges** the branch into `main`, which triggers auto-deploy.

### Backend (Render)
- Host: `bharatcliniq-api.onrender.com` (env `VITE_API_URL`); legacy fallback baked into
  some frontends: `BharathHealthSystems-api.onrender.com`.
- **`start.sh` runs on every deploy** and performs, in order:
  1. Idempotent `ALTER TABLE … ADD COLUMN IF NOT EXISTS` statements.
  2. `CREATE TABLE IF NOT EXISTS` for all newer tables.
  3. Seeds the medical library (drugs, terms, etc.) if counts are below thresholds.
  4. Starts the FastAPI app.
- This is the **only** migration mechanism. No Alembic. Every schema change you make must
  be reflected as an idempotent statement in `start.sh`.

### Frontends (Vercel / Cloudflare Pages)
- One deployment per portal, served as a Vite SPA (`/(.*)` → `/index.html` rewrite).
- `VITE_API_URL` controls the API base; CORS in `main.py` allowlists production subdomains,
  Vercel preview URLs, and `*.bhs-staff.pages.dev`.

---

*Living document. When you add an endpoint, table, or portal behavior, update the relevant
section above so the next engineer (human or Claude) inherits an accurate contract.*
