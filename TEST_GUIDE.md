# BharathHealthSystems — Complete Test Guide
**Version:** June 2026 | **Author:** QA / Dev Test Reference
**API Backend:** https://bharatcliniq-api.onrender.com

---

## Table of Contents

1. [Portal URLs & Credentials Setup](#1-portal-urls--credentials-setup)
2. [Admin Portal](#2-admin-portal--adminbharathhealthsystemscom)
3. [Provider Portal](#3-provider-portal--providerbharathhealthsystemscom)
4. [Staff / Receptionist Portal](#4-staff--receptionist-portal--staffbharathhealthsystemscom)
5. [Patient Portal](#5-patient-portal--mybharathhealthsystemscom)
6. [CareChart Portal](#6-carechart-portal--carechartbharathhealthsystemscom)
7. [Pharmacy Portal](#7-pharmacy-portal--pharmacybharathhealthsystemscom)
8. [Lab Portal](#8-lab-portal--labbharathhealthsystemscom)
9. [Imaging Portal](#9-imaging-portal--imagingbharathhealthsystemscom)
10. [Public Site](#10-public-site--wwwbharathhealthsystemscom)
11. [End-to-End Cross-Portal Flows](#11-end-to-end-cross-portal-flows)
12. [Security & Auth Checks](#12-security--auth-checks)
13. [Mobile & Responsive Checks](#13-mobile--responsive-checks)
14. [Known Issues & Notes](#14-known-issues--notes)

---

## 1. Portal URLs & Credentials Setup

### Production URLs

| Portal | URL | Who Uses It |
|--------|-----|-------------|
| Admin | https://admin.bharathhealthsystems.com | Platform super admin |
| Provider | https://provider.bharathhealthsystems.com | Doctors, Clinic Admin, Managers |
| Staff / Reception | https://staff.bharathhealthsystems.com | Receptionist, Front Desk, Clinic Manager |
| Patient | https://my.bharathhealthsystems.com | Patients (self-serve) |
| CareChart | https://carechart.bharathhealthsystems.com | Nurses (bedside nursing) |
| Pharmacy | https://pharmacy.bharathhealthsystems.com | Pharmacists |
| Lab | https://lab.bharathhealthsystems.com | Lab technicians |
| Imaging | https://imaging.bharathhealthsystems.com | Radiology/imaging technicians |
| Public Site | https://www.bharathhealthsystems.com | Public — book appointment, register clinic |

### Test Account Requirements (set up before testing)

Before running tests, ensure you have credentials for:

```
[ ] Super Admin account (platform admin)
[ ] Clinic Admin account (for a registered + approved clinic)
[ ] Doctor account (for the same clinic)
[ ] Receptionist account (for the same clinic)
[ ] Nurse / CareChart account (hospital org_type clinic only)
[ ] Pharmacist account
[ ] Lab Technician account
[ ] Imaging Tech account
[ ] Patient portal account (email/OTP login)
[ ] Test patient records (minimum 3 patients)
```

### Test Clinic Requirements

- One **Clinic** (org_type = clinic) — for standard OPD testing
- One **Hospital** (org_type = hospital) — for inpatient / emergency testing
- Both should be `status = active` with at least 1 doctor with a schedule set

---

## 2. Admin Portal — admin.bharathhealthsystems.com

### 2.1 Authentication

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| A-01 | Navigate to admin portal | Redirected to `/login` | |
| A-02 | Login with wrong credentials | Error message shown, no redirect | |
| A-03 | Login with valid super admin credentials | Redirected to `/dashboard` | |
| A-04 | Refresh page after login | Session maintained (sessionStorage token) | |
| A-05 | Click Sign Out from profile dropdown | Token cleared, redirected to `/login` | |
| A-06 | Navigate to any route while logged out | Redirected to `/login` | |

### 2.2 Dashboard

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| A-07 | Open `/dashboard` | Stat cards load: Total Clinics, Active, Pending, Suspended, Total Doctors, Total Patients | |
| A-08 | Platform Pulse section | OPD Today, Active Clinics, Total Patients, Revenue MRR all show numbers (not "—") | |
| A-09 | MRR Banner | Shows rupee amount (not 0 if any active paid clinic exists) | |
| A-10 | Rate Card section | Shows Free / Basic / Pro / Enterprise plan pricing | |
| A-11 | Click "Total Clinics" stat card | Navigates to `/clinics` | |
| A-12 | Click "Pending Approval" stat card | Navigates to `/pending` | |

### 2.3 Header & Navigation

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| A-13 | Page title in header | Header shows correct page name for each route (Dashboard, All Health Centers, etc.) | |
| A-14 | Profile dropdown (top right avatar) | Click shows email, "Super Admin" label, Sign Out button | |
| A-15 | Refresh button in header | Page reloads data | |
| A-16 | Register button in header | Opens https://www.bharathhealthsystems.com/register in new tab | |
| A-17 | Feedback bell icon | Shows unread count badge; click opens feedback panel | |
| A-18 | Sidebar navigation — "All Health Centers" | Link label reads "All Health Centers" (not "All Clinics") | |
| A-19 | Mobile hamburger menu | Opens sidebar overlay on narrow viewport | |

### 2.4 Pending Approvals

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| A-20 | Open `/pending` | Lists all clinics awaiting approval | |
| A-21 | Approve a pending clinic | Status changes to "active"; clinic moves to All Health Centers | |
| A-22 | Reject a pending clinic | Provide reason; clinic status changes to "rejected" | |
| A-23 | "Details" link on each card | Opens `/clinics/:id` clinic detail page | |

### 2.5 All Health Centers

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| A-24 | Open `/clinics` | Clinics table loads; tabs (All / Active / Pending / Suspended / Revoked) visible in same row as search | |
| A-25 | Filter by tab | Clicking "Active" shows only active clinics | |
| A-26 | Search by name | Filtering by clinic name works on Enter key | |
| A-27 | External link icon | Opens `/clinics/:id` detail page | |
| A-28 | Clinic Detail page | Shows clinic info, staff list, branches, audit trail for that clinic | |

### 2.6 Subscriptions

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| A-29 | Open `/subscriptions` | Summary ribbon (Active / Expired / Expiring ≤7d / Suspended) shows counts | |
| A-30 | Extend subscription | Click "+30 days" on a clinic; toast confirms "Extended … by 30 days" | |
| A-31 | Upgrade plan | Upgrade dropdown works; toast confirms plan change | |
| A-32 | Suspend a clinic | Toast confirms; row turns orange; button changes to "Reactivate" | |
| A-33 | Reactivate a suspended clinic | Toast confirms; status returns to "active" | |

### 2.7 Staff Verification

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| A-34 | Open `/staff` | Lists pharmacists / lab techs / imaging techs pending verification | |
| A-35 | Approve staff | Click Approve; staff disappears from list | |
| A-36 | Reject staff | Click Reject; enter comment; staff removed from list | |
| A-37 | View license document | "View Doc" link opens document URL in new tab | |

### 2.8 Audit Log

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| A-38 | Open `/audit` | Audit log table loads with last 7 days default range | |
| A-39 | All filters in one row | Date pickers, User Type, Action Type, Search, Filter button, PDF button — all in one compact row | |
| A-40 | Filter by action type | Select "Login" → only login actions visible | |
| A-41 | Filter by date range | Change start/end date → click Filter → data updates | |
| A-42 | Export PDF | Click PDF button → browser print dialog appears with log table | |
| A-43 | NABH Compliance section | Shows "Active Controls" checklist and "Last 30 Days Summary" stats | |
| A-44 | Pagination | Next/Prev buttons work when more than 100 records exist | |

### 2.9 Reports

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| A-45 | Open `/reports` | Filter row (From / To / Apply) visible without any title above it | |
| A-46 | Apply date range | Charts refresh with new data | |
| A-47 | Status distribution chart | Pie/bar chart shows clinic status breakdown | |
| A-48 | Plan distribution chart | Shows Free / Basic / Pro / Enterprise split | |

### 2.10 BH ID Lookup

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| A-49 | Open `/bhid` | Search box visible immediately (no h1 title above) | |
| A-50 | Search valid BH ID | Returns patient record with name, clinic, portal account status | |
| A-51 | Search non-existent BH ID | Shows "not found" or empty result | |
| A-52 | Search invalid format | No crash; shows error message | |

### 2.11 Hospital Setup

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| A-53 | Open `/hospital-settings` | Clinic selector dropdown visible; no content until clinic selected | |
| A-54 | Select a hospital-type clinic | Tabs appear (Overview / Departments / Wards / Beds) | |
| A-55 | No logout loop | Navigating to Hospital Setup does NOT log admin out | |
| A-56 | Overview — change org_type to Hospital | Save → success message | |
| A-57 | Overview — enable Wards & Bed Management | Toggle ON → Save → success | |
| A-58 | Departments — add department | Name + Code + Type + Color → Save → appears in list | |
| A-59 | Departments — edit department | Edit → change name → Save → updated | |
| A-60 | Departments — delete department | Confirm prompt → deleted from list | |
| A-61 | Wards — add ward | Name + Floor + Wing + Type + Beds → Save → appears | |
| A-62 | Beds — add bed | Bed Number + Type + Ward → Save → appears in bed grid | |
| A-63 | Beds — mark vacant/maintenance | Toggle buttons work on bed cards | |

### 2.12 Assessment Forms (Population)

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| A-64 | Open `/forms` | Form pool table loads | |
| A-65 | Form Builder — create new form | Add fields, save as draft | |
| A-66 | Form Builder — publish form | Status changes to "published" | |
| A-67 | Population Dashboard `/population` | KPI cards load (not "[object Object]" error) | |
| A-68 | Population — data loads correctly | Total Submissions, Open Assignments, Total Alerts show numbers | |
| A-69 | Population — chart renders | HBar chart and Donut chart render without blank screen | |

---

## 3. Provider Portal — provider.bharathhealthsystems.com

### 3.1 Authentication

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| P-01 | Doctor login | Access to Dashboard, Doctor Desk, Patients, Appointments, Encounter | |
| P-02 | Clinic Admin login | Access to /admin route (Clinic Admin page) | |
| P-03 | Non-provider role login (e.g. receptionist) | Should still work — provider portal accepts all staff roles | |
| P-04 | Set Password flow (`/set-password`) | New staff member sets password via link | |

### 3.2 Dashboard

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| P-05 | Dashboard loads | Today's appointments, patient count, slot availability visible | |
| P-06 | Stats refresh | Data accurate for the logged-in doctor's clinic | |

### 3.3 Appointments & Triage

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| P-07 | Appointments list | Shows today's appointments by default | |
| P-08 | Filter by date | Change date → list updates | |
| P-09 | Triage page | Lists appointments needing triage; can record vitals | |
| P-10 | Record vitals (BP, Pulse, Temp, SpO2, Weight) | Vitals saved and appear in encounter later | |
| P-11 | Mark appointment as "Arrived" | Status updates | |

### 3.4 Doctor Desk

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| P-12 | Doctor Desk loads | Queue of waiting patients visible | |
| P-13 | Call next patient | Patient moves to "In Consultation" | |
| P-14 | Open Encounter from Doctor Desk | Navigates to `/encounter/:id` | |

### 3.5 Encounter (Clinical Workflow — Core)

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| P-15 | Encounter page loads | Patient demographics, visit history, vitals visible | |
| P-16 | Chief complaint | Type complaint → saved | |
| P-17 | Diagnosis (ICD/free text) | Add primary diagnosis → saved | |
| P-18 | Prescription | Add drug name, dosage, frequency, duration → saved | |
| P-19 | Lab order | Add lab test → order created; appears in Lab portal | |
| P-20 | Imaging order | Add radiology request → appears in Imaging portal | |
| P-21 | Referral | Create referral to another doctor/department | |
| P-22 | Complete encounter | Mark as complete → appointment status updates | |
| P-23 | Clinical notes saved | Prescription printable | |
| P-24 | Previous visit history | Past encounters visible in patient record | |

### 3.6 Patient Management

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| P-25 | Patient List | Search by name or UHID | |
| P-26 | New Patient | Create patient with name, DOB, gender, mobile | |
| P-27 | Patient Detail | Shows demographics, appointment history, prescriptions, lab results | |
| P-28 | UHID auto-generated | Patient gets unique UHID on creation | |

### 3.7 Pharmacy (Provider View)

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| P-29 | Pharmacy tab | Shows dispensing queue linked to prescriptions | |
| P-30 | Dispense medication | Mark prescription as dispensed | |

### 3.8 Lab & Imaging (Provider View)

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| P-31 | Lab tab | Shows lab orders and results for clinic | |
| P-32 | Imaging tab | Shows imaging orders and reports | |
| P-33 | Completed lab result | Result visible in encounter and patient record | |

### 3.9 Billing (Provider View)

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| P-34 | Billing tab | Shows invoices for the clinic | |
| P-35 | Invoice detail | Itemized charges visible | |

### 3.10 Analytics

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| P-36 | Analytics page | Charts render — OPD count, revenue trends | |
| P-37 | Date range filter | Charts update with selected period | |

### 3.11 Clinic Admin Features

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| P-38 | `/admin` page (clinic admin role) | Clinic profile, staff list, branch management visible | |
| P-39 | Add staff member | Creates staff with role; they get set-password email | |
| P-40 | Edit clinic profile | Update name/address/specialty → saved | |
| P-41 | Doctor schedule setup | Add slots for a doctor on specific days | |
| P-42 | Branch management | Add/view branches | |

### 3.12 Inpatient (Hospital org_type only)

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| P-43 | `/inpatient` desk | Shows current admissions | |
| P-44 | Admission chart `/inpatient/admission/:id` | Full patient chart with orders, notes, vitals, MAR | |
| P-45 | CPOE Orders | Doctor creates medication/lab/imaging orders from chart | |
| P-46 | Ward Round note | Add ward round documentation | |
| P-47 | Discharge Summary | Create and preview discharge summary | |
| P-48 | Inpatient Billing | View and generate inpatient invoice | |

### 3.13 Telehealth

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| P-49 | Telehealth Desk | Shows upcoming telehealth appointments | |
| P-50 | Join call | Navigates to `/telehealth/call/:appointmentId` — WebRTC room opens | |
| P-51 | Video/audio toggle | Mute/unmute, camera on/off works | |
| P-52 | End call | Returns to telehealth desk | |

### 3.14 Assessment Forms (Provider)

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| P-53 | `/forms` task list | Shows assigned forms for patients | |
| P-54 | Fill a form `/forms/fill/:id` | Answer questions → submit → marked complete | |
| P-55 | iView Flowsheet | Longitudinal view of patient form submissions | |

---

## 4. Staff / Receptionist Portal — staff.bharathhealthsystems.com

### 4.1 Authentication

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| S-01 | Receptionist login | Access to Dashboard, Front Desk, Appointments | |
| S-02 | Clinic Manager login | Additional access to `/staff` (Staff Management) | |
| S-03 | Wrong role (e.g. doctor) | Blocked — "Access denied. This portal is for reception and management staff only." | |
| S-04 | Token persists on refresh | `localStorage staff_token` stays; user remains logged in | |
| S-05 | Logout | Clears all localStorage keys; redirects to `/login` | |

### 4.2 Dashboard

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| S-06 | Dashboard loads | Doctor Slot Board visible with today's appointment counts per doctor | |
| S-07 | Hospital org only — Emergency Board | Red "Emergency" board visible only if `org_type === hospital` | |
| S-08 | Emergency Board "New Emergency" button | Navigates to `/emergency-admission` | |
| S-09 | Non-hospital clinic | Emergency Board is NOT shown | |

### 4.3 Front Desk

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| S-10 | Front Desk loads | Shows today's appointments in a list | |
| S-11 | "Book Appointment" button | Opens booking flow | |
| S-12 | "Register Patient" button | Opens patient registration form | |
| S-13 | "Patient Lookup" button | Opens lookup page | |
| S-14 | Hospital only — "Emergency" button | Visible in front desk for hospital org_type clinics | |
| S-15 | Search patient by name/UHID in Lookup | Returns matching records | |

### 4.4 Register Patient

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| S-16 | Register new patient | Fill name, DOB, gender, mobile → submit → UHID generated | |
| S-17 | Duplicate mobile check | Warning if mobile already registered | |
| S-18 | BH ID assigned | Patient gets BH ID on creation | |

### 4.5 Book Appointment

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| S-19 | Select doctor | Dropdown shows active doctors | |
| S-20 | Select date | Calendar shows available days | |
| S-21 | Select time slot | Available slots shown | |
| S-22 | Prefill from Emergency | If navigated from emergency flow, patient/doctor pre-filled | |
| S-23 | Confirm booking | Appointment created; confirmation code shown | |
| S-24 | Double-booking | Can't book same slot twice | |

### 4.6 Appointments Page

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| S-25 | Appointments list | All clinic appointments (today by default) | |
| S-26 | Mark arrived | Status changes | |
| S-27 | Cancel appointment | Removed from active queue | |

### 4.7 Billing

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| S-28 | Billing List | Shows invoices with status (paid / unpaid) | |
| S-29 | Open invoice detail | Itemized charges, patient name, date | |
| S-30 | Record payment | Mark invoice as paid → status updates | |
| S-31 | Generate PDF | Invoice PDF printable | |
| S-32 | Operations page | `/operations/:appointmentId` → billing for a specific appointment | |

### 4.8 Queue Management

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| S-33 | Queue page | Shows patients in waiting queue | |
| S-34 | Real-time updates | Queue refreshes as patients are called | |

### 4.9 Staff Management (Clinic Manager only)

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| S-35 | `/staff` page — accessible by manager | Staff list loads | |
| S-36 | `/staff` page — blocked for receptionist | Route hidden or access denied | |
| S-37 | Add new staff | Create with role, email, mobile | |
| S-38 | Toggle staff active/inactive | Status updates | |

### 4.10 Hospital-Only Features

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| S-39 | Emergency Admission page | Form: patient search + triage level + presenting complaint | |
| S-40 | Send Emergency Alert | Alert created; EmergencyAlertBanner appears on all hospital staff tabs | |
| S-41 | EmergencyAlertBanner | Appears between header and content; audio beep plays | |
| S-42 | Accept Emergency Alert | Banner dismissed; beep stops | |
| S-43 | Admissions page | Shows current inpatients | |
| S-44 | Bed Board | Visual grid of all beds by ward (Vacant/Occupied/Maintenance) | |
| S-45 | Inpatient Billing | View/generate inpatient invoices | |
| S-46 | Visitor Desk | Register visitor; print visitor pass | |

### 4.11 Telehealth

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| S-47 | Telehealth page | Upcoming telehealth appointments listed | |
| S-48 | Join link for patient | Shareable link generated | |

### 4.12 Scheduler

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| S-49 | Scheduler Board | Shows scheduled staff slots | |
| S-50 | Setup | Configure schedule parameters | |
| S-51 | Patterns | Define recurring schedule patterns | |
| S-52 | Publish | Publish schedule; Publish Log records it | |
| S-53 | Leaves | Record staff leave dates | |

### 4.13 Maintenance Dashboard

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| S-54 | `/maintenance` | Maintenance task list visible | |
| S-55 | Create task | New maintenance task added | |

### 4.14 Account Settings

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| S-56 | `/account` | Profile info visible | |
| S-57 | Change password | Old + new password → saved | |

---

## 5. Patient Portal — my.bharathhealthsystems.com

### 5.1 Authentication

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| PT-01 | Login with registered mobile/email | OTP sent; verify → logged in | |
| PT-02 | Wrong OTP | Error message; can retry | |
| PT-03 | Unregistered email | Error: "No account found" | |
| PT-04 | Session persists on refresh | Patient stays logged in | |

### 5.2 Dashboard

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| PT-05 | Dashboard loads | Patient name, upcoming appointments, recent prescriptions visible | |
| PT-06 | Upcoming appointment card | Shows doctor name, clinic, date/time | |
| PT-07 | Quick links | Navigate to Appointments, Prescriptions, Lab Results, Bills | |

### 5.3 Appointments

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| PT-08 | Appointments page | Lists all past and upcoming appointments | |
| PT-09 | Book new appointment | Select clinic → doctor → date → slot → confirm | |
| PT-10 | Cancel appointment | Cancel future appointment | |
| PT-11 | Telehealth appointment visible | Telehealth type shows join link | |

### 5.4 Prescriptions

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| PT-12 | Prescriptions list | Shows all prescriptions issued by doctors | |
| PT-13 | Drug name, dosage, frequency visible | Data matches what doctor entered in encounter | |
| PT-14 | Download/print prescription | PDF generates | |

### 5.5 Lab Results

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| PT-15 | Lab Results page | Shows completed lab results | |
| PT-16 | Result values visible | Test name, result value, normal range shown | |
| PT-17 | Abnormal flags | Out-of-range values highlighted | |

### 5.6 Bills

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| PT-18 | Bills page | Shows all invoices (paid/unpaid) | |
| PT-19 | Invoice detail | Itemized services visible | |
| PT-20 | Download receipt | PDF of paid invoice | |

### 5.7 Clinical History

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| PT-21 | `/history` page | Timeline of all encounters/visits | |
| PT-22 | Encounter summary | Chief complaint, diagnosis, prescription per visit | |
| PT-23 | Correct clinic attribution | Multi-clinic patient sees records from all clinics | |

### 5.8 Telehealth

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| PT-24 | Telehealth page | Upcoming telehealth sessions listed | |
| PT-25 | Join telehealth call | `/telehealth/call/:id` → WebRTC video room | |
| PT-26 | Video quality | Camera and microphone work | |

### 5.9 Settings

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| PT-27 | Profile — update name/email | Changes saved | |
| PT-28 | Notification preferences | Toggle SMS/email notifications | |

---

## 6. CareChart Portal — carechart.bharathhealthsystems.com

> **Note:** CareChart is for bedside nurses in hospital settings. Requires `org_type = hospital` clinic and nurse role account.

### 6.1 Authentication

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| CC-01 | Nurse login | Redirected to dashboard | |
| CC-02 | PIN setup (`/pin-setup`) | New nurse sets 4-digit PIN for quick access | |
| CC-03 | PIN-based unlock | Enter PIN → access restored without full re-login | |

### 6.2 Dashboard

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| CC-04 | Dashboard loads | Current ward/beds overview; today's tasks | |
| CC-05 | Assigned patients visible | Only patients in nurse's ward/assignment | |

### 6.3 MAR (Medication Administration Record)

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| CC-06 | MAR loads | Table of medications per patient per time slot | |
| CC-07 | Record administration | Click to mark drug given at specific time → timestamped | |
| CC-08 | Missed dose | Overdue medications highlighted | |
| CC-09 | PRN medication | As-needed drugs recordable separately | |
| CC-10 | Audit trail | All MAR entries logged with nurse name + time | |

### 6.4 Orders

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| CC-11 | Orders page | Active orders for current admission (medications, lab, imaging) | |
| CC-12 | Acknowledge order | Nurse acknowledges a new doctor order | |
| CC-13 | New order alert | Visual indicator for unacknowledged orders | |

---

## 7. Pharmacy Portal — pharmacy.bharathhealthsystems.com

### 7.1 Authentication

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| PH-01 | Pharmacist login | Redirected to dashboard | |
| PH-02 | Non-pharmacist role blocked | Login denied for receptionist/doctor | |

### 7.2 Dashboard

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| PH-03 | Dashboard loads | Pending prescription count, recent dispensing activity | |
| PH-04 | Low-stock alerts | Drugs below reorder level highlighted | |

### 7.3 Pending Prescriptions

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| PH-05 | `/pending` page | Lists prescriptions awaiting dispensing | |
| PH-06 | Prescription details | Patient name, drugs, dosage, prescribing doctor visible | |
| PH-07 | Dispense | Mark prescription as dispensed → moves to history | |
| PH-08 | Partial dispense | Dispense available drugs; flag remainder | |

### 7.4 Inventory

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| PH-09 | Inventory list | All drugs with current stock quantity | |
| PH-10 | Search drug | Filter by drug name | |
| PH-11 | Stock level indicators | Low stock shown in red/orange | |

### 7.5 Stock In (Receiving)

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| PH-12 | Stock In form | Drug name, batch, expiry, quantity, supplier | |
| PH-13 | Submit stock-in | Inventory quantity increases | |
| PH-14 | Expiry date validation | Warn if expiry is in the past | |

### 7.6 Suppliers

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| PH-15 | Suppliers list | All registered drug suppliers | |
| PH-16 | Add supplier | Name, contact, email → saved | |
| PH-17 | Edit supplier | Update details | |

### 7.7 Purchase Orders

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| PH-18 | Create PO | Select supplier, add drugs + quantities | |
| PH-19 | PO list | Shows status (draft / ordered / received) | |
| PH-20 | Receive PO | Mark as received → triggers stock-in | |

### 7.8 Dispensing History

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| PH-21 | `/history` page | All past dispensing records | |
| PH-22 | Search by patient | Filter dispensing by patient name | |
| PH-23 | Date range filter | Filter records by date | |

### 7.9 Pharmacy Billing

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| PH-24 | Billing page | OPD drug bills linked to prescriptions | |
| PH-25 | Generate pharmacy bill | Drugs + quantities → invoice created | |

### 7.10 Reports

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| PH-26 | Reports page | Drug-wise dispensing summary | |
| PH-27 | Stock movement report | Inflow vs outflow over period | |

---

## 8. Lab Portal — lab.bharathhealthsystems.com

### 8.1 Authentication

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| L-01 | Lab technician login | Redirected to dashboard | |
| L-02 | Non-lab role blocked | Login denied | |

### 8.2 Dashboard

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| L-03 | Dashboard loads | Pending samples count, today's orders | |
| L-04 | Urgency indicators | STAT / urgent orders highlighted | |

### 8.3 Sample Collection

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| L-05 | `/sample` page | Lists orders awaiting sample collection | |
| L-06 | Collect sample | Mark sample collected → order status changes to "Collected" | |
| L-07 | Barcode/sample ID | Auto-generated sample ID assigned | |
| L-08 | Multiple tests in one order | All test tubes listed per patient | |

### 8.4 Orders

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| L-09 | Orders list | All lab orders with status (Ordered / Collected / Processing / Resulted) | |
| L-10 | Filter by status | Show only "Collected" orders | |
| L-11 | Order details | Patient name, test names, ordering doctor | |

### 8.5 Result Entry

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| L-12 | `/results` page | Orders ready for result entry | |
| L-13 | Enter result | Type result value per test parameter | |
| L-14 | Normal range check | System flags out-of-range values | |
| L-15 | Verify result | Verify → result locked; appears in patient portal + provider | |
| L-16 | Critical value alert | Dangerously abnormal value triggers alert to doctor | |

### 8.6 Test Catalog

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| L-17 | `/tests` page | Full list of configured lab tests | |
| L-18 | Add new test | Test name, unit, reference range → saved | |
| L-19 | Edit test | Update reference ranges | |
| L-20 | Test packages | Group tests into panels (e.g. LFT, CBC) | |

### 8.7 Patient History

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| L-21 | `/patients` page | Search patient → see all historical lab results | |
| L-22 | Trend view | Repeat test values shown over time | |

### 8.8 Lab Billing

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| L-23 | Billing page | Lab charges linked to orders | |
| L-24 | Generate invoice | Itemized lab bill created | |

### 8.9 Reports

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| L-25 | Reports page | TAT (turnaround time) stats, test volume | |

---

## 9. Imaging Portal — imaging.bharathhealthsystems.com

### 9.1 Authentication

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| I-01 | Imaging tech login | Redirected to dashboard | |
| I-02 | Non-imaging role blocked | Login denied | |

### 9.2 Dashboard

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| I-03 | Dashboard loads | Pending studies count, today's schedule | |
| I-04 | Modality overview | X-Ray, CT, MRI, Ultrasound order counts | |

### 9.3 Orders

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| I-05 | Orders list | Imaging orders with status (Ordered / Scheduled / Done / Reported) | |
| I-06 | Filter by modality | Show only X-Ray orders | |
| I-07 | Order detail | Patient, study type, clinical notes, ordering doctor | |

### 9.4 Schedule

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| I-08 | Schedule page | Calendar view of booked imaging slots | |
| I-09 | Schedule a study | Assign date/time to an order | |
| I-10 | Time slot conflicts | Double-booking on same machine prevented | |

### 9.5 Report Writer

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| I-11 | `/report-writer` | Rich text editor for writing radiology report | |
| I-12 | Load template | Select from saved templates → pre-populates | |
| I-13 | Write findings | Free-text findings, impressions sections | |
| I-14 | Verify/sign report | Sign off → report status changes to "Reported" | |
| I-15 | Report visible to doctor | Provider portal shows completed imaging report | |

### 9.6 Pending & Review

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| I-16 | `/pending` | Studies awaiting report writing | |
| I-17 | `/pending-review` | Reports written but pending radiologist review/approval | |
| I-18 | Approve report | Radiologist approves → finalized | |

### 9.7 Templates

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| I-19 | Templates list | Saved report templates by study type | |
| I-20 | Create template | Build template → save → available in report writer | |
| I-21 | Edit template | Modify existing template | |

### 9.8 Referring Doctors

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| I-22 | `/referring` | List of referring doctors/clinics | |
| I-23 | Report sharing | Completed report shareable with referring doctor | |

### 9.9 Imaging Billing

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| I-24 | Billing page | Imaging charges per study | |
| I-25 | Generate invoice | Itemized imaging bill | |

### 9.10 Patient History

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| I-26 | `/patients` page | Search patient → all imaging studies history | |
| I-27 | Prior study comparison | View previous reports for same study type | |

### 9.11 Reports

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| I-28 | Reports dashboard | Volume by modality, TAT stats | |

---

## 10. Public Site — www.bharathhealthsystems.com

### 10.1 Landing Page

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| PUB-01 | Homepage loads | Hero section, features, CTA buttons visible | |
| PUB-02 | "Book Appointment" CTA | Navigates to `/clinics` or `/book` | |
| PUB-03 | "Register Your Clinic" CTA | Navigates to `/register` | |
| PUB-04 | Portal links in header/footer | Provider, Patient, Staff, Pharmacy, Lab, Imaging links all go to correct domains (`bharathhealthsystems.com` subdomains — NOT `bharatcliniq.com`) | |
| PUB-05 | Quick links in footer | All 8 portal links point to correct `bharathhealthsystems.com` URLs | |

### 10.2 Find Clinics

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| PUB-06 | `/clinics` page | Search by city/specialty works | |
| PUB-07 | Clinic card | Shows clinic name, specialty, city, rating | |
| PUB-08 | Click clinic | Opens `/clinics/:slug` detail page | |
| PUB-09 | Clinic Detail | Doctor list, available slots, contact info | |
| PUB-10 | Doctor profile link | Opens `/doctor/:id` | |
| PUB-11 | Doctor Profile page | Doctor name, qualifications, next available slots | |

### 10.3 Book Appointment

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| PUB-12 | `/book` page | Select clinic → doctor → date → slot | |
| PUB-13 | Patient details form | Name, mobile, reason for visit | |
| PUB-14 | Confirm booking | Booking code generated; redirect to `/booking/:code` | |
| PUB-15 | Booking Status page | Shows appointment details and status | |
| PUB-16 | No slots available | Appropriate "No slots" message shown | |
| PUB-17 | Telehealth booking | Telehealth option available for enabled doctors | |

### 10.4 Register Clinic

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| PUB-18 | `/register` page | Form with clinic details, admin details | |
| PUB-19 | Submit registration | Clinic created in "pending" status; confirmation shown | |
| PUB-20 | Appears in Admin pending | Newly registered clinic appears in admin `/pending` | |
| PUB-21 | Validation | Required fields enforced; mobile format checked | |

### 10.5 Pre-Visit Form

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| PUB-22 | `/previsit/:token` | Form loads with questions for upcoming appointment | |
| PUB-23 | Submit form | Responses saved; visible to doctor in encounter | |
| PUB-24 | Invalid/expired token | Error message shown | |

### 10.6 Telehealth (Public)

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| PUB-25 | `/telehealth` | Patient enters appointment code → joins video call | |

---

## 11. End-to-End Cross-Portal Flows

These tests validate that the full patient journey works across all portals together.

### Flow 1 — Full OPD Visit

```
1. PUBLIC: Book appointment online (patient self-books)
2. STAFF: Patient arrives → mark arrived in Front Desk
3. STAFF: Record vitals in Triage
4. PROVIDER: Doctor opens encounter → records diagnosis + prescription + lab order
5. LAB: Sample collected → results entered → verified
6. PHARMACY: Prescription dispensed
7. STAFF: Generate invoice → collect payment
8. PATIENT: Patient logs into Patient Portal → sees prescription, lab result, invoice
```

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| E-01 | Lab order from encounter appears in Lab portal | Within 30 seconds of creation | |
| E-02 | Lab result appears in Patient Portal | After lab tech verifies | |
| E-03 | Prescription dispensed in Pharmacy appears in encounter | Dispense status reflected | |
| E-04 | Invoice created in Billing visible in Patient Portal under Bills | Correct amount | |

### Flow 2 — Hospital Admission (Inpatient)

```
1. STAFF: Emergency admission created → alert sent
2. STAFF: All staff see EmergencyAlertBanner (beep sounds)
3. STAFF: Book OPD appointment for emergency patient
4. PROVIDER: Doctor sees patient → creates admission order
5. STAFF: Bed assigned; patient admitted
6. CARECHART: Nurse records MAR (medication given)
7. PROVIDER: Doctor does ward round → writes progress note
8. LAB/IMAGING: Orders processed from inpatient chart
9. PROVIDER: Discharge summary created
10. STAFF: Inpatient bill generated
```

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| E-05 | Emergency alert visible on all staff browser tabs | Within 10 seconds of creation | |
| E-06 | Inpatient orders appear in Lab/Imaging portals | Correctly routed | |
| E-07 | MAR entry by nurse timestamped | Timestamp matches real time | |
| E-08 | Discharge summary printable as PDF | PDF generates correctly | |

### Flow 3 — Clinic Registration to First Appointment

```
1. PUBLIC: Clinic owner submits registration form
2. ADMIN: Super admin approves clinic
3. PROVIDER: Clinic admin logs in → sets up doctor schedule
4. PUBLIC: Patient finds clinic → books appointment
5. STAFF: Patient checked in at reception
```

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| E-09 | New clinic visible in admin pending immediately | No delay | |
| E-10 | After approval, clinic appears in public Find Clinics | Within same session | |
| E-11 | Booking visible in Staff portal after public booking | Real-time | |

### Flow 4 — Telehealth

```
1. STAFF: Book appointment as "telehealth" type
2. PROVIDER: Doctor opens telehealth desk → joins call
3. PATIENT: Patient opens patient portal → joins same call
4. PROVIDER: Doctor prescribes during call
5. PATIENT: Prescription visible in patient portal post-call
```

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| E-12 | Both doctor and patient see each other on video | Two-way video/audio | |
| E-13 | Post-call prescription in patient portal | Within 60 seconds | |

---

## 12. Security & Auth Checks

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| SEC-01 | Direct URL access while logged out | Any authenticated route → redirect to login | |
| SEC-02 | Admin token in browser devtools → copy → paste in different browser | Session invalidated (sessionStorage not shared) | |
| SEC-03 | Staff token in localStorage → manually clear → refresh | Redirected to login | |
| SEC-04 | Cross-portal token isolation | Admin token doesn't work in Provider portal and vice versa | |
| SEC-05 | Role-based route guard | Receptionist can't access `/staff` (manager-only) | |
| SEC-06 | CORS — admin.bharathhealthsystems.com | API requests succeed (no CORS errors in browser console) | |
| SEC-07 | CORS — staff.bharathhealthsystems.com | API requests succeed | |
| SEC-08 | HTTPS enforcement | All portals load on HTTPS; HTTP redirects to HTTPS | |
| SEC-09 | No sensitive data in URL | Tokens never appear in browser URL bar | |
| SEC-10 | Security headers | Response headers include X-Content-Type-Options, X-Frame-Options, HSTS | |
| SEC-11 | Rate limiting | Rapid repeated login attempts → 429 response | |
| SEC-12 | OTP replay | Used OTP can't be reused | |

---

## 13. Mobile & Responsive Checks

Test all portals at these viewport widths: 375px (iPhone SE), 768px (iPad), 1280px (desktop).

| # | Portal | Test | Expected | Pass/Fail |
|---|--------|------|----------|-----------|
| M-01 | All | Navigation | Sidebar collapses to hamburger menu on mobile | |
| M-02 | Staff | Front Desk | All buttons reachable on 375px width | |
| M-03 | Provider | Encounter | Prescription form usable on tablet | |
| M-04 | Patient | Book Appointment | Slot selection works on mobile | |
| M-05 | Public | Find Clinics | Clinic cards stack vertically on mobile | |
| M-06 | Admin | Audit Log | Filter row scrolls horizontally on narrow screens | |
| M-07 | CareChart | MAR | Table scrolls horizontally; tap to mark given works on touch | |
| M-08 | Pharmacy | Inventory | Table readable on 768px | |
| M-09 | Lab | Result Entry | Input fields reachable on mobile | |
| M-10 | Imaging | Report Writer | Text editor usable on tablet | |

---

## 14. Known Issues & Notes

### Resolved Issues (confirm still fixed)
- ✅ Admin Portal Hospital Setup — no longer causes logout loop
- ✅ Population Dashboard — no longer shows "[object Object]" error
- ✅ Staff portal CORS — `*.bhs-staff.pages.dev` allowed
- ✅ Domain URLs — all portals link to `bharathhealthsystems.com` (not old `bharatcliniq.com`)
- ✅ Hospital nav (Emergency, Admissions, Bed Board) — shown only for `org_type = hospital`

### API Backend Cold Start
The backend is hosted on Render (free tier). **First request after inactivity may take 30–60 seconds.** If any portal shows a loading spinner for more than 60 seconds:
1. Wait and retry
2. Check https://bharatcliniq-api.onrender.com/health — should return `{"status":"healthy"}`

### CareChart Portal — No Production .env
The CareChart portal does not have a `.env.production` configured. If the API URL is not set, it may default to localhost. Verify `VITE_API_URL` is set in CareChart's Cloudflare Pages / Vercel deployment environment variables.

### Telehealth — WebRTC Peer Connection
Telehealth video calls require:
- HTTPS (already enforced)
- Microphone + Camera browser permissions granted
- No firewall blocking WebRTC (STUN/TURN servers)
- Test on Chrome first (best WebRTC support); then Firefox and Safari

### Hospital Features Gate
The `org_type = hospital` field is set at the clinic level. Staff features (Emergency, Admissions, Bed Board, CareChart, Visitor Desk) are ONLY visible for hospital-type clinics. If testing these features, confirm the test clinic has `org_type = 'hospital'` in the database or set it via Admin → Hospital Setup.

---

## Quick Smoke Test Checklist (15-minute sanity check)

Run this before any release to confirm nothing is critically broken:

```
[ ] 1. Admin login → Dashboard loads → stat cards show numbers
[ ] 2. Provider login → Dashboard → Patients list loads
[ ] 3. Staff login → Front Desk → Book Appointment works
[ ] 4. Patient portal login (OTP) → Dashboard → Appointments visible
[ ] 5. Pharmacy login → Pending prescriptions visible
[ ] 6. Lab login → Orders list loads
[ ] 7. Imaging login → Orders list loads
[ ] 8. CareChart login → Dashboard loads
[ ] 9. Public site → Find Clinics → at least one clinic shows
[ ] 10. Admin → Hospital Setup → clinic selector works, no logout
[ ] 11. Admin → Population → KPI numbers (not [object Object])
[ ] 12. Admin header → page title shows correctly per route
[ ] 13. Admin → Audit Log → filters + PDF button in same row
[ ] 14. Public site portal links → verify bharathhealthsystems.com domains
[ ] 15. API health check → https://bharatcliniq-api.onrender.com/health → "healthy"
```

---

*End of Test Guide*
