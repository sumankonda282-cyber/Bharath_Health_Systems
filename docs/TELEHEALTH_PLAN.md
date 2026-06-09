# Telehealth Module — Master Plan

> Spans Public, Patient, and Provider portals + platform fees, refunds, SaaS invoicing, and pricing.
> Built on what already exists — nothing here replaces shipped code.

---

## 0. Foundation already in the codebase (reuse, don't rebuild)

| Existing piece | Where | Used by plan section |
|---|---|---|
| Daily.co rooms (private, knocking, exp) + owner/non-owner tokens | `backend/app/utils/video.py` | §1, §2 |
| `Appointment.mode` = offline\|online\|telehealth, `telehealth_joined_at`, `visit_type` fresh\|followup | `models.py` | §1 |
| Razorpay order + HMAC webhook + verify | `endpoints/payments.py` | §4, §5 |
| Brevo email, 2Factor SMS OTP | `utils/email.py`, `utils/sms.py` | §1, §6, §7 |
| `PatientUser` (mobile + OTP login, up to 5 BHProfiles) | `models.py` | §1 (BHID account creation) |
| `AssessmentTemplate` (JSON fields, platform/clinic scope) + `TemplateAssignment` | `models.py` | §6 |
| Clinic suspension machinery (`status`, `suspension_reason="payment_failed"`) | `platform_admin.py` | §7 (overdue auto-suspend) |
| `RATE_CARD` per-doctor pricing | `platform_admin.py` | §8 |
| Maintenance router pattern (secured ops endpoints) | `endpoints/maintenance.py` | §7 (cron entry point) |
| `GET /public/telehealth-doctors`, public booking + confirmation code | `public.py` | §1 |

---

## 1. Telehealth session lifecycle (the core)

### 1.1 The one-link rule

Room name is **deterministic**: `bc-{appointment_id}`. The patient's link never changes.
What changes is whether the room **exists** on Daily.co:

- Room created → link works.
- Room deleted / expired → same link shows "visit ended" page.
- Reopen approved → room recreated **with the same name** → same link works again.

This satisfies: *expire after appointment, no free repeat visits, same link reopens only with doctor approval.*

### 1.2 State machine (`telehealth_sessions.state`)

```
scheduled ──(T-15 min)──► ready ──(first join)──► in_progress ──(doctor completes)──► completed
    │                       │                          │
    │                       │                          └─(slot_end + 30min grace, never completed)──► expired
    │                       └─(slot_end, one side never joined)──► no_show_patient / no_show_provider
    └─(cancel)──► cancelled

completed / expired ──(patient or doctor requests)──► reopen_requested
reopen_requested ──(doctor approves, picks 15/30/60 min)──► reopened ──(window ends or doctor completes)──► completed
reopen_requested ──(doctor rejects / 4h timeout)──► back to completed/expired
```

**Hard rules**
- Tokens are only issued in `ready`, `in_progress`, `reopened`. Everything else → HTTP 403 with a friendly state-specific message.
- Room `exp` = slot_end + 30 min grace, `eject_at_room_exp: true`. Token `exp` clamped to the same.
- On `completed`: backend `DELETE /rooms/bc-{id}` on Daily → link dead instantly, no waiting for expiry.
- Reopen: max **2 per appointment per day**, window chosen by doctor (15/30/60 min), no extra charge (doctor's discretion to instead schedule a paid follow-up).
- Every transition is appended to `telehealth_session_events` (who, when, why) — this is also the evidence store for refunds (§5).

### 1.3 Join gating

| Actor | Join allowed | Mechanism |
|---|---|---|
| Doctor | T-15 min → slot_end + grace, or reopened window | Owner token (existing `create_meeting_token(is_owner=True)`) |
| Patient | T-15 min → slot_end + grace, or reopened window | Non-owner token + **knocking** (already enabled) — patient waits until doctor admits |

Knocking means a patient alone in a room can't "have a visit" — the doctor must let them in. Combined with room deletion at completion, repeat freeloading is structurally impossible.

### 1.4 Completion flow (provider, end of call)

Doctor clicks **End Visit** → modal with three choices:
1. **Complete** — closes session, deletes room.
2. **Complete + schedule follow-up** — creates a new appointment (`visit_type='followup'`, new room `bc-{new_id}`, payment per clinic policy: free within X days or charged).
3. **Complete + allow same-day rejoin** — pre-approves one reopen window so the patient can come back without a new request.

### 1.5 No-show + technical-failure detection

Subscribe to Daily.co webhooks (`participant.joined` / `participant.left`) → record `doctor_first_joined_at`, `patient_first_joined_at`, leave times on the session row.
- Slot ends, doctor never joined → auto-flag `no_show_provider` → patient sees "Request refund" CTA (§5).
- Both joined < 5 min then dropped, never resumed → auto-tag `technical_failure` candidate.

---

## 2. Portal flows

### 2.1 Public portal

1. **Browse & book without login** (exists). On booking a telehealth slot:
   - Create/find `PatientUser` by mobile → create BHProfile → assign **BHID**.
   - Send SMS (2Factor) + email (Brevo): confirmation code, BHID, **join link**, patient-portal login instructions (OTP-first; no password to forget).
2. **Persistent "Join video visit" element**: header button + floating pill on every public page →
   `/join` page → enter mobile → OTP → list of today's telehealth appointments → tap Join →
   one-time magic-link token (15 min validity) → deep-link to patient portal join page, already authenticated.
3. **Document upload at booking** (optional step): up to 5 files (image/PDF, ≤10 MB) → stored against the booking, parsed by the OCR pipeline (§3), surfaces in patient chart + Patient Portal automatically.

### 2.2 Patient portal

- **Appointments list**: telehealth rows show a live status chip driven by session state — `Starts in 2h` / `Join now` (T-15) / `In waiting room` / `Ended` / `Rejoin requested — awaiting doctor`.
- **Join page**: countdown → Join button (gated by §1.3) → Daily Prebuilt iframe → knock → admitted.
- **After end**: visit summary, doctor's shared forms/notes, prescriptions, and — same day only — **"Request to rejoin"** button (creates `reopen_request`).
- **Documents tab**: uploaded files + parsed summaries; upload more anytime.
- **Refund request** from any past telehealth appointment (§5).

### 2.3 Provider portal

- **Patient list rows** (existing appointments page): add mode chip `Office` / `Online`; online rows get a **video icon** — disabled until T-15, badge when patient is knocking.
- Video icon → **`/telehealth/{appointmentId}` call page**:
  - Left/corner: Daily iframe (draggable corner ↔ split view toggle).
  - Right panel tabs: **Patient summary** (chart, parsed docs, allergies) · **Forms** (pre-selected, §6) · **Notes** (SOAP, existing) · **Rx**.
  - Top bar: timer, patient knock admit button, **End Visit** (→ §1.4 modal).
- **Rejoin requests**: banner + bell notification; approve (15/30/60 min) or reject with reason; optional SMS to patient on decision.
- **Form pre-selection**: from the patient list row "Prepare" action, or auto-applied from the provider's saved defaults (§6).

---

## 3. Document upload → parse → store pipeline

### 3.1 Tooling decision (Render-compatible — no system packages)

| Tool | Why | Notes |
|---|---|---|
| **PyMuPDF (fitz)** | Most Indian lab reports/prescriptions are digital PDFs with a text layer — extraction is instant, perfect accuracy, pure pip wheel | First pass for every PDF |
| **RapidOCR (onnxruntime)** | OCR for photos/scans; pip-only (~15 MB model), CPU-friendly — **works on Render native Python, unlike Tesseract which needs apt/Docker** | Fallback when PDF has no text layer + all images |
| Pillow | Pre-processing: grayscale, contrast, resize ≤1600px | Phone photos need this |

Tesseract is better known but requires a Docker deploy on Render. RapidOCR avoids that entirely. If accuracy disappoints later, swap to Docker+Tesseract — pipeline interface stays the same.

### 3.2 Pipeline

```
upload (multipart) → Supabase Storage private bucket (raw/)
  → FastAPI BackgroundTask:
      1. PDF? PyMuPDF text extraction → if text < 50 chars, rasterize pages → OCR
      2. Image? Pillow preprocess → RapidOCR
      3. doc_type classifier (keyword rules: CBC/LFT/HbA1c → lab_report; Rx/℞/Tab/Cap → prescription; …)
      4. parsed_fields extraction (regex per doc_type: test names, values, units, dates)
      5. Compress original → WebP q70 ≤1600px → Storage (archive/), delete raw
      6. Update patient_documents row: parse_status=done, parsed_text, parsed_fields
```

### 3.3 ⚠️ Do NOT delete originals — compliance override

Your spec said "store temporarily, then parse, keep only text." **Recommendation: keep the compressed original.** Indian medical-record norms expect ~3 years retention for OPD records, and OCR is imperfect — a mis-parsed lab value with no original to check is a clinical and legal risk. The compromise above (WebP ~100–200 KB vs 3–5 MB photo) cuts storage ~95% while keeping the source of truth. Supabase free tier = 1 GB ≈ 5,000–10,000 compressed docs. Parsed text in Postgres handles search/display either way.

---

## 4. Money: platform fees, GST, gateway charges

### 4.1 Who pays what

| Party | Fee | When | How collected |
|---|---|---|---|
| Patient | ₹5 + 18% GST = **₹5.90** | At booking checkout | Line item added to the consultation payment (one Razorpay order) |
| Provider (clinic) | ₹5 + 18% GST = **₹5.90** | Per **completed** telehealth visit | **Ledger accrual** → monthly line item on the clinic's SaaS invoice (§7). Never a real-time ₹5 charge — gateway minimums and UX make that absurd |

`platform_fee_ledger` rows are created at booking (patient, status `collected` once paid) and at completion (provider, status `pending` → `invoiced`). Visits that end `cancelled` / `no_show_provider` never accrue the provider fee.

### 4.2 GST treatment (flag for your CA, but standard position)

- **Consultation fee**: healthcare services by clinical establishments are **GST-exempt** (Notification 12/2017). No GST.
- **Platform fee (both sides)**: technology/intermediary service → **18% GST**. Applies only if the platform is GST-registered (₹20L turnover threshold — decision D3 below).
- **Gateway convenience fee**: taxable service → the 2% Razorpay fee carries 18% GST; if passed to the customer, pass the GST-inclusive amount.

### 4.3 Worked checkout example (₹500 consultation)

| Line | UPI | Card |
|---|---|---|
| Consultation (GST-exempt) | ₹500.00 | ₹500.00 |
| Platform fee ₹5 + 18% GST | ₹5.90 | ₹5.90 |
| Gateway fee (0% UPI / 2% card + 18% GST on fee) | ₹0.00 | ₹11.94 |
| **Total** | **₹505.90** | **₹517.84** |

Checkout UI shows this breakdown **before** method selection with a green nudge: *"Pay by UPI and save ₹11.94"* — which also pushes traffic to the 0-MDR rail you want.

### 4.4 Decision D1 (biggest open question): who receives the consultation money?

| Option | Mechanics | Verdict |
|---|---|---|
| **A. Razorpay Route** (recommended target) | Patient pays one order → automatic split: consultation → clinic's linked account, ₹5.90 → platform | Clean tax story; clinics onboard once with KYC; refunds split-aware |
| B. Platform collects all, remits monthly minus fees | Simple now; platform's books show clinic revenue as pass-through | Tax/audit mess as volume grows; trust issue with clinics |
| C. Clinic's own gateway for consultation; platform charges only ₹5.90 | Two payments at checkout — terrible UX | Reject |

**Plan**: ship Phase 3 with B (single account, ledgered remittance) to start collecting revenue immediately, migrate to A before scale. Route onboarding fields (account, KYC) go on the clinic billing settings from day one so migration is config, not code.

---

## 5. Refunds — request-based only, never automatic

### 5.1 Scope split (two different approvers)

| Refund of | Approver | Why |
|---|---|---|
| ₹5.90 platform fee | **Platform admin** (admin portal queue) | It's platform revenue |
| Consultation fee | **Clinic manager** (receptionist/staff portal) | It's the clinic's revenue |

One `refund_requests` row can cover either or both (checkbox at request time).

### 5.2 Workflow

```
Patient/Provider opens request (within 7 days of appointment)
  → reason: provider_no_show | technical_failure | cancelled | other + free text
  → system auto-attaches evidence: session state + join/leave timestamps (§1.5)
  → triage engine pre-stamps a recommendation:
       provider never joined            → RECOMMEND APPROVE
       patient never joined, doctor did → RECOMMEND REJECT (patient no-show)
       both < 5 min + technical_failure → RECOMMEND APPROVE
       completed normally               → RECOMMEND REJECT
  → reviewer approves/rejects (48h SLA) — recommendation is advisory, human decides
  → approve → Razorpay partial refund API (amount = fee or fee+consultation) on the original payment_id
  → webhook refund.processed → status=processed → Brevo email + optional SMS at every step
```

### 5.3 Edge cases

- **Partial refund** is native to Razorpay (`POST /payments/{id}/refund {amount}`); refunds return to source (UPI→bank, card→card), 5–7 business days standard speed.
- Razorpay does **not** return its original 2% fee on card refunds — platform absorbs ~₹0.12 per ₹5.90 card refund. Negligible; don't engineer around it.
- **Double-refund guard**: unique constraint on (`fee_ledger_id`, status processed) + idempotent on `razorpay_refund_id`.
- **Reschedule instead of refund**: offer "carry fee to next appointment" as a credit — usually better for everyone; reviewer picks refund vs credit.
- Provider-fee side: if a visit is refunded as provider_no_show, the provider's ₹5 ledger row flips to `waived` (never invoice a no-show).
- Refund requested after SaaS invoice already issued with that provider fee → credit note line on next invoice.

---

## 6. Assessment forms in the call

- **Pool**: existing `AssessmentTemplate` (platform-scoped defaults + clinic-scoped custom). Clinic admin curates the clinic pool; this already exists in the admin portal.
- **Provider defaults**: new `provider_form_defaults` (staff_id, template_id, visit_type) — "always load Pain + GAD-7 for my telehealth visits."
- **Per-appointment override**: `appointment_form_selections` — set from the patient-list "Prepare" action before the call.
- **During call**: forms render in the right panel from their JSON `fields` definition; **autosave** (debounced 5s) to `assessment_responses` (answers JSONB, status draft→final). Finalizing locks the response and stamps it into the encounter.
- **Patient visibility**: per-response `visible_to_patient` toggle (doctor controls) → finalized visible forms appear in Patient Portal visit summary.

---

## 7. SaaS invoicing: Admin → Manager

### 7.1 Billing cycles & discounts

Clinic chooses at subscription: **monthly / quarterly +5% off / half-yearly +10% / yearly +15%**. Stored on Clinic (`billing_cycle`, `billing_anchor_date`, `billing_contact_email`).

### 7.2 Invoice generation (automated)

Cron hits a secured maintenance endpoint daily (see D5 for scheduler choice) → for every clinic whose cycle boundary is today:

```
line items:
  base plan (per RATE_CARD × doctors × cycle months, minus cycle discount)
  telehealth provider fees: N completed visits × ₹5
  (future: SMS overage, storage overage)
subtotal → +18% GST → total
invoice_number: BHS/25-26/00042   (FY-sequential, GST-compliant)
due: net 15 → Razorpay Payment Link attached → Brevo email to manager + portal banner
```

### 7.3 Receipt confirmation loop

Payment Link webhook → invoice `paid` → **receipt** auto-generated (receipt number, mode, UTR) → emailed → appears in manager portal with an **Acknowledge** button → `receipt_acknowledged_at` closes the loop Admin→Manager.

### 7.4 Reminder ladder (logged in `billing_reminders`, never duplicated)

| When | Message | Channel |
|---|---|---|
| T-7 before cycle end | "Upcoming invoice ~₹X" | Email |
| Day 0 | Invoice + payment link | Email + portal banner |
| T+7 | Gentle reminder | Email |
| T+14 | Overdue | Email + SMS |
| T+21 | Suspension warning | Email + SMS + red banner |
| T+30 | **Auto-suspend** — existing `status=suspended, reason=payment_failed` machinery | System |

### 7.5 The ₹5+₹5 connects here

Patient fee: revenue recognized at collection (ledger `collected`). Provider fee: accrues per completed visit → invoiced as the telehealth line item monthly regardless of the clinic's plan-cycle (or rolled into the next cycle invoice — simpler; pick at build time).

---

## 8. SaaS plans per org type + pricing calculator

### 8.1 Plan matrix (proposal — confirm numbers, D6)

| Org type | Free | Standard | Pro | Enterprise |
|---|---|---|---|---|
| **Clinic** | 2 doctors, OPD | ₹999/doctor/mo (≤10) *(existing)* | ₹799/doctor/mo unlimited + telehealth forms *(existing)* | Custom |
| **Hospital** | — | ₹4,999/mo base (5 doctors + IPD/wards) + ₹599/extra doctor | + modules: Pharmacy ₹1,499 · Lab ₹1,499 · Imaging ₹1,999 | Custom |
| **Pharmacy** (standalone) | 1 user, 100 bills/mo | ₹799/mo single store | ₹1,499/mo multi-user/branch + analytics | — |
| **Diagnostic** | — | ₹1,499/mo lab | ₹2,499/mo lab + imaging + NABL report formats | Custom |

Telehealth usage (₹5+₹5/visit) applies on every plan; Enterprise can negotiate it away. Cycle discounts (§7.1) apply to all.

### 8.2 Public pricing calculator (`/pricing` on public portal)

**Inputs**: org type → doctors (slider) → branches → module toggles → est. telehealth visits/mo (slider) → billing cycle.
**Output**: monthly + effective annual, itemized; "telehealth fees at your volume: ₹N"; UPI savings note.
**Levers you control** (keep in one config object, not scattered): per-doctor price, module prices, base fees, cycle discounts, usage fee, free-tier limits.
**CTA**: "Get exact quote" → existing `demo-inquiry` endpoint with calculator state attached — every calculator use becomes a qualified lead.

---

## 9. New database tables (one migration each, additive only)

1. `telehealth_sessions` — appointment_id, room_name, state, slot_start/end, room_expires_at, doctor/patient first_joined_at + left_at, completed_at/by, reopen_count, reopened_until
2. `telehealth_session_events` — session_id, event_type, actor, payload JSON, created_at
3. `reopen_requests` — session_id, requested_by, reason, status, decided_by/at, window_minutes
4. `platform_fee_ledger` — appointment_id, clinic_id, party patient|provider, amount, gst, status pending|collected|invoiced|refund_requested|refunded|waived, razorpay_payment_id, saas_invoice_id
5. `refund_requests` — appointment_id, fee_ledger_id, requester, reason_code, description, evidence JSON, status, recommendation, reviewed_by/at, refund_amount, razorpay_refund_id
6. `patient_documents` — patient_id, appointment_id?, source, storage_path, original_compressed bool, doc_type, parse_status, parsed_text, parsed_fields JSONB, ocr_engine
7. `saas_invoices` — clinic_id, invoice_number, period, cycle, line_items JSONB, subtotal, gst, total, status, due_date, payment_link_id, paid_at, receipt_number, receipt_acknowledged_at/by
8. `billing_reminders` — clinic_id, invoice_id?, reminder_type, channel, sent_at
9. `provider_form_defaults` + `appointment_form_selections` + `assessment_responses` (answers JSONB, status, visible_to_patient)
10. Clinic columns: `billing_cycle`, `billing_anchor_date`, `billing_contact_email`, (future: `razorpay_route_account_id`)

## 10. New API surface (grouped)

- **Telehealth**: `POST /telehealth/{appt}/join` (patient & staff variants) · `POST .../complete` · `POST .../reopen-request` · `POST .../reopen-decide` · `POST /webhooks/daily` (signed)
- **Public join locator**: `POST /public/join/locate` (mobile→OTP) · `POST /public/join/magic-link`
- **Documents**: `POST /patient/documents` · `GET /patient/documents` · staff chart view; background parse task
- **Fees/refunds**: checkout order now includes fee lines · `POST /refunds/request` · `GET /platform/refunds` queue · `POST /platform/refunds/{id}/decide` · clinic-side consultation refund equivalents
- **SaaS billing**: `POST /maintenance/run-billing` (cron, secret-protected) · admin invoice CRUD/issue · manager `GET /billing/invoices`, `POST /billing/invoices/{id}/acknowledge`
- **Forms**: provider defaults CRUD · appointment selections CRUD · `PUT /assessment-responses/{id}` autosave
- **Calculator**: `GET /public/pricing-config`

## 11. Build order (each phase ships independently)

| Phase | Scope | Est. |
|---|---|---|
| **P1** | `telehealth_sessions` + state machine, slot-anchored room/token expiry, join gating, room deletion on complete, public-portal join locator + magic link, BHID account creation on public booking | 4–5 d |
| **P2** | End-visit modal (complete / follow-up / allow rejoin), reopen request→approve flow, Daily webhooks → no-show & technical-failure flags | 3–4 d |
| **P3** | Patient checkout: fee + GST + gateway-fee display, UPI nudge; provider fee ledger | 3–4 d |
| **P4** | Refund requests end-to-end: triage engine, two approval queues, Razorpay partial refunds, notifications | 3 d |
| **P5** | Document upload (public + patient portals), OCR pipeline (PyMuPDF + RapidOCR), chart integration | 4–5 d |
| **P6** | Telehealth call page right-panel forms: defaults, pre-selection, autosave, patient visibility | 3–4 d |
| **P7** | SaaS invoices, payment links, receipts + acknowledge, reminder ladder, auto-suspend hook | 4–5 d |
| **P8** | Plan matrix config + public pricing calculator + lead capture | 2–3 d |

~4–5 weeks single-dev. P1+P2 alone deliver your core ask (controlled join/expiry/rejoin).

## 12. Decisions needed from you + risks

| # | Decision / Risk | Recommendation |
|---|---|---|
| D1 | Who receives consultation money (§4.4) | Start single-account ledgered; migrate to Razorpay Route |
| D2 | Keep originals after OCR | **Yes, compressed** — 3-yr retention norm; deleting is a clinical/legal risk |
| D3 | Platform GST registration (₹20L threshold) | Talk to CA before charging the +18%; calculator/checkout code takes a flag |
| D4 | Card convenience-fee pass-through | Common in India, technically frowned on by card networks; UPI-first design minimizes exposure |
| D5 | Scheduler on Render free tier (service sleeps → in-app cron dies) | **GitHub Actions scheduled workflow** curling `/maintenance/run-billing` with a secret — free, reliable, you already live on GitHub |
| D6 | Plan prices (§8.1) | Confirm matrix numbers |
| D7 | Reopen limits | 2/day, doctor-chosen 15/30/60 min window |
| R1 | Daily.co free tier = 10k participant-min/mo ≈ **250 visits** (2 ppl × 20 min) | Fine for pilot; meter it in admin dashboard before it bites |
| R2 | Render cold starts add 30s+ to first join of the day | Paid instance, or accept for pilot |
| R3 | Telemedicine Practice Guidelines 2020 | Show doctor's RMC reg. no. on call page + Rx; record patient consent checkbox at booking; restricted drug lists apply to e-Rx |
| R4 | DPDP Act 2023 | Consent text at upload ("we process documents to extract medical data"), data-deletion request path |
| R5 | Webhook trust | Daily webhook needs signature verification like the Razorpay one already has |
