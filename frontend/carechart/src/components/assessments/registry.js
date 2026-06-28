/**
 * @shared-pool
 * Assessment Form Registry — maps subcategory (form_key) → lazy JSX component.
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 * Add new forms here whenever a new JSX form component is created.
 */
import { lazy } from 'react'

export const FORM_REGISTRY = {
  // ── General / Root ────────────────────────────────────────────────────────
  'pain-assessment':  lazy(() => import('./PainAssessmentForm')),
  'asthma-basic':     lazy(() => import('./AsthmaForm')),
  'allergies':        lazy(() => import('./AllergiesForm')),
  'medical-history':  lazy(() => import('./MedicalHistoryForm')),
  'family-history':   lazy(() => import('./FamilyHistoryForm')),
  'social-history':   lazy(() => import('./SocialHistoryForm')),
  // 'systems-review' migrated → editable DB form (seed_assessment_forms.py); served DB-first.
  'patient-profile':  lazy(() => import('./PatientProfileForm')),
  'chief-complaint':  lazy(() => import('./ChiefComplaintForm')),

  // ── Cardiology ────────────────────────────────────────────────────────────
  'cardiology-acs':            lazy(() => import('./cardiology/ACSAssessmentForm')),
  'cardiology-af':             lazy(() => import('./cardiology/AtrialFibrillationForm')),
  'cardiology-cardiomyopathy': lazy(() => import('./cardiology/CardiomyopathyAssessmentForm')),
  'cardiology-chest-pain':     lazy(() => import('./cardiology/ChestPainAssessmentForm')),
  'cardiology-dyslipidemia':   lazy(() => import('./cardiology/DyslipidemiaAssessmentForm')),
  'cardiology-heart-failure':  lazy(() => import('./cardiology/HeartFailureAssessmentForm')),
  'cardiology-hypertension':   lazy(() => import('./cardiology/HypertensionAssessmentForm')),
  'cardiology-pericardial':    lazy(() => import('./cardiology/PericardialDiseaseForm')),
  'cardiology-rhd':            lazy(() => import('./cardiology/RheumaticHeartDiseaseForm')),
  'cardiology-valvular':       lazy(() => import('./cardiology/ValvularHeartDiseaseForm')),

  // ── Clinical Scales ───────────────────────────────────────────────────────
  'clinical-act':      lazy(() => import('./clinical/ACTForm')),
  'clinical-adhd':     lazy(() => import('./clinical/ADHDForm')),
  'clinical-alsfrs':   lazy(() => import('./clinical/ALSFRSForm')),
  'clinical-asrs':     lazy(() => import('./clinical/ASRSForm')),
  'clinical-migraine': lazy(() => import('./clinical/MigraineHeadacheForm')),

  // ── ENT ───────────────────────────────────────────────────────────────────
  'ent-ear':           lazy(() => import('./ent/EarAssessmentForm')),
  'ent-nose-sinus':    lazy(() => import('./ent/NoseAndSinusForm')),
  'ent-throat-larynx': lazy(() => import('./ent/ThroatAndLarynxForm')),
  'ent-head-neck':     lazy(() => import('./ent/HeadAndNeckForm')),
  'ent-audiology':     lazy(() => import('./ent/AudiologyAndHearingForm')),
  'ent-facial-nerve':  lazy(() => import('./ent/FacialNerveForm')),
  'ent-paediatric':    lazy(() => import('./ent/PaediatricENTForm')),
  'ent-tracheostomy':  lazy(() => import('./ent/TracheostomyForm')),

  // ── Gastroenterology ──────────────────────────────────────────────────────
  'gastro-acute-abdomen':       lazy(() => import('./gastro/AcuteAbdomenForm')),
  'gastro-acute-pancreatitis':  lazy(() => import('./gastro/AcutePancreatitisForm')),
  'gastro-anorectal':           lazy(() => import('./gastro/AnorectalDisordersForm')),
  'gastro-biliary':             lazy(() => import('./gastro/BiliaryGallstoneForm')),
  'gastro-chronic-pancreatitis':lazy(() => import('./gastro/ChronicPancreatitisForm')),
  'gastro-dysphagia':           lazy(() => import('./gastro/DysphagiaEsophagealForm')),
  'gastro-functional':          lazy(() => import('./gastro/FunctionalGIDisorderForm')),
  'gastro-gi-bleed':            lazy(() => import('./gastro/GIBleedAssessmentForm')),
  'gastro-gi-cancer':           lazy(() => import('./gastro/GICancerAssessmentForm')),
  'gastro-gastroparesis':       lazy(() => import('./gastro/GastroparesisMotilityForm')),
  'gastro-ibd':                 lazy(() => import('./gastro/InflammatoryBowelDiseaseForm')),
  'gastro-liver':               lazy(() => import('./gastro/LiverDiseaseAssessmentForm')),
  'gastro-peptic-ulcer':        lazy(() => import('./gastro/PepticUlcerGERDForm')),

  // ── Obstetrics & Gynecology ───────────────────────────────────────────────
  'obg-anc-followup': lazy(() => import('./obg/ANCFollowUpForm')),
  'obg-antenatal':    lazy(() => import('./obg/AntenatalBookingForm')),
  'obg-cervical':     lazy(() => import('./obg/CervicalScreeningForm')),
  'obg-infertility':  lazy(() => import('./obg/FemaleInfertilityForm')),
  'obg-gdm':          lazy(() => import('./obg/GDMAssessmentForm')),
  'obg-high-risk':    lazy(() => import('./obg/HighRiskPregnancyForm')),
  'obg-labour':       lazy(() => import('./obg/LabourAssessmentForm')),
  'obg-menopause':    lazy(() => import('./obg/MenopauseAssessmentForm')),
  'obg-menstrual':    lazy(() => import('./obg/MenstrualDisorderForm')),
  'obg-pcos':         lazy(() => import('./obg/PCOSAssessmentForm')),
  'obg-pid':          lazy(() => import('./obg/PIDAssessmentForm')),
  'obg-postpartum':   lazy(() => import('./obg/PostpartumAssessmentForm')),
  'obg-preeclampsia': lazy(() => import('./obg/PreeclampsiaAssessmentForm')),

  // ── Orthopedics ───────────────────────────────────────────────────────────
  'ortho-compartment-syndrome': lazy(() => import('./orthopedic/AcuteCompartmentSyndromeForm')),
  'ortho-fracture':             lazy(() => import('./orthopedic/FractureTraumaAssessmentForm')),
  'ortho-msk-pain':             lazy(() => import('./orthopedic/MusculoskeletalPainAssessmentForm')),
  'ortho-elbow':                lazy(() => import('./orthopedic/OrthopedicElbowAssessmentForm')),
  'ortho-foot-ankle':           lazy(() => import('./orthopedic/OrthopedicFootAnkleAssessmentForm')),
  'ortho-hand-wrist':           lazy(() => import('./orthopedic/OrthopedicHandWristAssessmentForm')),
  'ortho-hip':                  lazy(() => import('./orthopedic/OrthopedicHipAssessmentForm')),
  'ortho-knee':                 lazy(() => import('./orthopedic/OrthopedicKneeAssessmentForm')),
  'ortho-septic-arthritis':     lazy(() => import('./orthopedic/OrthopedicSepticArthritisOsteomyelitisForm')),
  'ortho-shoulder':             lazy(() => import('./orthopedic/OrthopedicShoulderAssessmentForm')),
  'ortho-tumor':                lazy(() => import('./orthopedic/OrthopedicTumorAssessmentForm')),
  'ortho-prosthetic':           lazy(() => import('./orthopedic/OrthoticProstheticAssessmentForm')),
  'ortho-osteoporosis':         lazy(() => import('./orthopedic/OsteoporosisAssessmentForm')),
  'ortho-pediatric':            lazy(() => import('./orthopedic/PediatricOrthopedicAssessmentForm')),
  'ortho-peripheral-nerve':     lazy(() => import('./orthopedic/PeripheralNerveAssessmentForm')),
  'ortho-postop-rehab':         lazy(() => import('./orthopedic/PostOpRehabAssessmentForm')),
  'ortho-spine':                lazy(() => import('./orthopedic/SpineAssessmentForm')),

  // ── Pediatrics ────────────────────────────────────────────────────────────
  'peds-adolescent':   lazy(() => import('./pediatrics/AdolescentHealthForm')),
  'peds-nicu':         lazy(() => import('./pediatrics/NICUAssessmentForm')),
  'peds-neonatal':     lazy(() => import('./pediatrics/NeonatalAssessmentForm')),
  'peds-cardiology':   lazy(() => import('./pediatrics/PediatricCardiologyForm')),
  'peds-developmental':lazy(() => import('./pediatrics/PediatricDevelopmentalDisordersForm')),
  'peds-emergency':    lazy(() => import('./pediatrics/PediatricEmergencyForm')),
  'peds-endocrinology':lazy(() => import('./pediatrics/PediatricEndocrinologyForm')),
  'peds-fever':        lazy(() => import('./pediatrics/PediatricFeverInfectionsForm')),
  'peds-gastro':       lazy(() => import('./pediatrics/PediatricGastroNutritionForm')),
  'peds-growth':       lazy(() => import('./pediatrics/PediatricGrowthDevelopmentForm')),
  'peds-haematology':  lazy(() => import('./pediatrics/PediatricHaematologyOncologyForm')),
  'peds-nephrology':   lazy(() => import('./pediatrics/PediatricNephrologyForm')),
  'peds-neurology':    lazy(() => import('./pediatrics/PediatricNeurologyForm')),
  'peds-respiratory':  lazy(() => import('./pediatrics/PediatricRespiratoryForm')),
  'peds-rheumatology': lazy(() => import('./pediatrics/PediatricRheumatologyForm')),
  'peds-vaccination':  lazy(() => import('./pediatrics/PediatricVaccinationForm')),

  // ── Specialty ─────────────────────────────────────────────────────────────
  'specialty-aerosol':  lazy(() => import('./specialty/AerosolTherapyForm')),
  'specialty-asthma':   lazy(() => import('./specialty/AsthmaForm')),
  'specialty-diabetes': lazy(() => import('./specialty/DiabetesAssessmentForm')),

  // ── Systems / Clinical Examination ────────────────────────────────────────
  'systems-clinical-exam':       lazy(() => import('./systems/ClinicalExaminationForm')),
  'systems-clinical-impression': lazy(() => import('./systems/ClinicalImpressionForm')),
  'systems-pain':                lazy(() => import('./systems/PainAssessmentForm')),
  'systems-review-full':         lazy(() => import('./systems/SystemsReviewForm')),
}
