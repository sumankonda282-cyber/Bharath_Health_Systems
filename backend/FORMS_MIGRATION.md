# Assessment Forms Migration — hardcoded JSX → faithful editable DB forms

**Goal:** Convert all **98** hardcoded registry forms (`frontend/{provider,carechart}/src/components/assessments/`)
into **faithful**, **admin-builder-editable** DB forms seeded by `backend/seed_assessment_forms.py`.
One single source per form. Searchable + editable everywhere.

## How it works (architecture)
- `FormRenderer.jsx` (both portals) is **DB-first**: it queries
  `/assessment-forms/?subcategory=<key>&status=published` and renders the DB schema if found,
  else falls back to the hardcoded `FORM_REGISTRY[key]` component.
- `seed_assessment_forms.py` seeds **only entries marked `'ready': True`** (insert-if-absent, `published`).
  Unconverted forms keep rendering from hardcoded → **no regression, no clutter**.
- Per form, the cycle is: **design** (read hardcoded JSX) → **build** (faithful schema in seed) →
  **publish** (`'ready': True`, seeded) → **delete** (hardcoded `.jsx` + registry entry, both portals).
- Renderer parity: provider `formEngine.jsx` + carechart `SchemaFormRenderer.jsx` must both honor every
  field type / condition a faithful form uses. Conditions (`yes/no → reveal`) now honored in both.

## Fidelity contract
Faithful = **every** question, **exact** option sets, **all** conditional reveals, structure preserved,
expressed in **builder-editable** primitives (radio/checkbox/dropdown/text/number/scale/textarea/date,
search types, conditions, repeatable sections, calculated). Bespoke non-editable JS conveniences
(auto-narrative text, live counters) are represented by their nearest editable primitive.

## Legend
⬜ pending · 🔄 in progress · ✅ done (faithful DB live + hardcoded deleted) · ⚠️ needs renderer work first

| Status | Key | Hardcoded component | Notes (special types) |
|---|---|---|---|
| **GENERAL** | | | |
| ⬜ | pain-assessment | PainAssessmentForm | body region / pain map? |
| ⬜ | asthma-basic | AsthmaForm | |
| ⬜ | allergies | AllergiesForm | repeatable rows |
| ⬜ | medical-history | MedicalHistoryForm | repeatable rows |
| ⬜ | family-history | FamilyHistoryForm | repeatable rows |
| ✅ | social-history | SocialHistoryForm | flat + reveals (tobacco/alcohol/drugs/occupation) + pack-years calc — run-verified |
| ✅ | systems-review | SystemsReviewForm | 12 gate(3-way)+reveal checklists — FORM #1 (faithful: 12 sections, 36 fields, run-verified) |
| ⬜ | patient-profile | PatientProfileForm | |
| ⬜ | chief-complaint | ChiefComplaintForm | repeatable complaints + HPI + symptom search |
| **CARDIOLOGY** | | | |
| ⬜ | cardiology-acs | cardiology/ACSAssessmentForm | |
| ⬜ | cardiology-af | cardiology/AtrialFibrillationForm | |
| ⬜ | cardiology-cardiomyopathy | cardiology/CardiomyopathyAssessmentForm | |
| ⬜ | cardiology-chest-pain | cardiology/ChestPainAssessmentForm | |
| ⬜ | cardiology-dyslipidemia | cardiology/DyslipidemiaAssessmentForm | |
| ⬜ | cardiology-heart-failure | cardiology/HeartFailureAssessmentForm | |
| ⬜ | cardiology-hypertension | cardiology/HypertensionAssessmentForm | |
| ⬜ | cardiology-pericardial | cardiology/PericardialDiseaseForm | |
| ⬜ | cardiology-rhd | cardiology/RheumaticHeartDiseaseForm | |
| ⬜ | cardiology-valvular | cardiology/ValvularHeartDiseaseForm | |
| **CLINICAL SCALES** | | | |
| ⬜ | clinical-act | clinical/ACTForm | scored scale |
| ⬜ | clinical-adhd | clinical/ADHDForm | scored scale, repeatable? |
| ⬜ | clinical-alsfrs | clinical/ALSFRSForm | scored scale |
| ⬜ | clinical-asrs | clinical/ASRSForm | scored scale |
| ⬜ | clinical-migraine | clinical/MigraineHeadacheForm | |
| **ENT** | | | |
| ⬜ | ent-ear | ent/EarAssessmentForm | |
| ⬜ | ent-nose-sinus | ent/NoseAndSinusForm | |
| ⬜ | ent-throat-larynx | ent/ThroatAndLarynxForm | |
| ⬜ | ent-head-neck | ent/HeadAndNeckForm | |
| ⬜ | ent-audiology | ent/AudiologyAndHearingForm | |
| ⬜ | ent-facial-nerve | ent/FacialNerveForm | |
| ⬜ | ent-paediatric | ent/PaediatricENTForm | |
| ⬜ | ent-tracheostomy | ent/TracheostomyForm | |
| **GASTRO** | | | |
| ⬜ | gastro-acute-abdomen | gastro/AcuteAbdomenForm | |
| ⬜ | gastro-acute-pancreatitis | gastro/AcutePancreatitisForm | |
| ⬜ | gastro-anorectal | gastro/AnorectalDisordersForm | |
| ⬜ | gastro-biliary | gastro/BiliaryGallstoneForm | |
| ⬜ | gastro-chronic-pancreatitis | gastro/ChronicPancreatitisForm | |
| ⬜ | gastro-dysphagia | gastro/DysphagiaEsophagealForm | |
| ⬜ | gastro-functional | gastro/FunctionalGIDisorderForm | |
| ⬜ | gastro-gi-bleed | gastro/GIBleedAssessmentForm | |
| ⬜ | gastro-gi-cancer | gastro/GICancerAssessmentForm | |
| ⬜ | gastro-gastroparesis | gastro/GastroparesisMotilityForm | |
| ⬜ | gastro-ibd | gastro/InflammatoryBowelDiseaseForm | |
| ⬜ | gastro-liver | gastro/LiverDiseaseAssessmentForm | |
| ⬜ | gastro-peptic-ulcer | gastro/PepticUlcerGERDForm | |
| **OBG** | | | |
| ⬜ | obg-anc-followup | obg/ANCFollowUpForm | |
| ⬜ | obg-antenatal | obg/AntenatalBookingForm | |
| ⬜ | obg-cervical | obg/CervicalScreeningForm | |
| ⬜ | obg-infertility | obg/FemaleInfertilityForm | |
| ⬜ | obg-gdm | obg/GDMAssessmentForm | |
| ⬜ | obg-high-risk | obg/HighRiskPregnancyForm | |
| ⬜ | obg-labour | obg/LabourAssessmentForm | |
| ⬜ | obg-menopause | obg/MenopauseAssessmentForm | |
| ⬜ | obg-menstrual | obg/MenstrualDisorderForm | |
| ⬜ | obg-pcos | obg/PCOSAssessmentForm | |
| ⬜ | obg-pid | obg/PIDAssessmentForm | |
| ⬜ | obg-postpartum | obg/PostpartumAssessmentForm | |
| ⬜ | obg-preeclampsia | obg/PreeclampsiaAssessmentForm | |
| **ORTHO** | | | |
| ⬜ | ortho-compartment-syndrome | orthopedic/AcuteCompartmentSyndromeForm | |
| ⬜ | ortho-fracture | orthopedic/FractureTraumaAssessmentForm | |
| ⬜ | ortho-msk-pain | orthopedic/MusculoskeletalPainAssessmentForm | |
| ⬜ | ortho-elbow | orthopedic/OrthopedicElbowAssessmentForm | |
| ⬜ | ortho-foot-ankle | orthopedic/OrthopedicFootAnkleAssessmentForm | |
| ⬜ | ortho-hand-wrist | orthopedic/OrthopedicHandWristAssessmentForm | |
| ⬜ | ortho-hip | orthopedic/OrthopedicHipAssessmentForm | |
| ⬜ | ortho-knee | orthopedic/OrthopedicKneeAssessmentForm | |
| ⬜ | ortho-septic-arthritis | orthopedic/OrthopedicSepticArthritisOsteomyelitisForm | |
| ⬜ | ortho-shoulder | orthopedic/OrthopedicShoulderAssessmentForm | |
| ⬜ | ortho-tumor | orthopedic/OrthopedicTumorAssessmentForm | |
| ⬜ | ortho-prosthetic | orthopedic/OrthoticProstheticAssessmentForm | |
| ⬜ | ortho-osteoporosis | orthopedic/OsteoporosisAssessmentForm | |
| ⬜ | ortho-pediatric | orthopedic/PediatricOrthopedicAssessmentForm | |
| ⬜ | ortho-peripheral-nerve | orthopedic/PeripheralNerveAssessmentForm | |
| ⬜ | ortho-postop-rehab | orthopedic/PostOpRehabAssessmentForm | |
| ⬜ | ortho-spine | orthopedic/SpineAssessmentForm | |
| **PEDS** | | | |
| ⬜ | peds-adolescent | pediatrics/AdolescentHealthForm | |
| ⬜ | peds-nicu | pediatrics/NICUAssessmentForm | |
| ⬜ | peds-neonatal | pediatrics/NeonatalAssessmentForm | |
| ⬜ | peds-cardiology | pediatrics/PediatricCardiologyForm | |
| ⬜ | peds-developmental | pediatrics/PediatricDevelopmentalDisordersForm | |
| ⬜ | peds-emergency | pediatrics/PediatricEmergencyForm | |
| ⬜ | peds-endocrinology | pediatrics/PediatricEndocrinologyForm | |
| ⬜ | peds-fever | pediatrics/PediatricFeverInfectionsForm | |
| ⬜ | peds-gastro | pediatrics/PediatricGastroNutritionForm | |
| ⬜ | peds-growth | pediatrics/PediatricGrowthDevelopmentForm | |
| ⬜ | peds-haematology | pediatrics/PediatricHaematologyOncologyForm | |
| ⬜ | peds-nephrology | pediatrics/PediatricNephrologyForm | |
| ⬜ | peds-neurology | pediatrics/PediatricNeurologyForm | |
| ⬜ | peds-respiratory | pediatrics/PediatricRespiratoryForm | |
| ⬜ | peds-rheumatology | pediatrics/PediatricRheumatologyForm | |
| ⬜ | peds-vaccination | pediatrics/PediatricVaccinationForm | |
| **SPECIALTY** | | | |
| ⬜ | specialty-aerosol | specialty/AerosolTherapyForm | |
| ⬜ | specialty-asthma | specialty/AsthmaForm | dup of asthma-basic? verify |
| ⬜ | specialty-diabetes | specialty/DiabetesAssessmentForm | repeatable rows |
| **SYSTEMS** | | | |
| ⬜ | systems-clinical-exam | systems/ClinicalExaminationForm | |
| ⬜ | systems-clinical-impression | systems/ClinicalImpressionForm | repeatable rows |
| ⬜ | systems-pain | systems/PainAssessmentForm | dup of pain-assessment? verify |
| ⬜ | systems-review-full | systems/SystemsReviewForm | dup of systems-review? verify |

---
**Reconciled:** removed seed `vital-signs` entry (duplicate — `seed_vitals.py` owns the canonical Vitals form).

**Progress:** 2 / 98 complete.
