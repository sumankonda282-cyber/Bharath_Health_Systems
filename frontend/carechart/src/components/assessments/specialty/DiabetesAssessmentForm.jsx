/**
 * @shared-pool — standalone clinical assessment, portal-agnostic
 * Comprehensive Algorithmic Diabetes Assessment
 * 9 stages: Profile → Concern → Symptoms → Glycaemia → Medications
 *           → Complications → Comorbidities → Lifestyle → Plan
 */
import { useState, useMemo } from 'react'
import { Droplets, CheckCircle, AlertTriangle, Plus, X } from 'lucide-react'
import api from '../../../api/client'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STAGES = [
  { key: 'profile',         label: 'Profile'       },
  { key: 'concern',         label: 'Concern'       },
  { key: 'symptoms',        label: 'Symptoms'      },
  { key: 'glycaemia',       label: 'Glycaemia'     },
  { key: 'medications',     label: 'Medications'   },
  { key: 'complications',   label: 'Complications' },
  { key: 'comorbidities',   label: 'Comorbidities' },
  { key: 'lifestyle',       label: 'Lifestyle'     },
  { key: 'plan',            label: 'Plan'          },
]

const DM_TYPES = ['Type 1', 'Type 2', 'LADA', 'MODY', 'GDM', 'Secondary', 'Pre-diabetes', 'Unknown']

const VISIT_REASONS = [
  'Routine follow-up', 'Poor glycaemic control', 'Hypoglycaemia concern',
  'Medication change', 'Complication review', 'Sick day / illness',
  'Pre-operative', 'Pregnancy / GDM', 'New diagnosis', 'Other',
]

const HYPER_SX  = ['Polyuria', 'Polydipsia', 'Polyphagia', 'Weight loss', 'Blurred vision', 'Fatigue', 'Recurrent infections', 'Slow wound healing']
const HYPO_SX   = ['Shakiness / tremor', 'Sweating', 'Palpitations', 'Headache', 'Confusion', 'Loss of consciousness', 'Nocturnal episodes']
const NEURO_SX  = ['Numbness (feet/hands)', 'Tingling / pins & needles', 'Burning pain', 'Night symptoms worse', 'Balance problems']
const FOOT_SX   = ['Callus / corn', 'Ulcer / wound', 'Colour change', 'Pain on walking (claudication)', 'Temperature difference feet']
const EYE_SX    = ['Blurred vision', 'Floaters', 'Sudden vision loss', 'Difficulty reading']
const RENAL_SX  = ['Frothy / foamy urine', 'Ankle oedema', 'Reduced urine output']
const CVS_SX    = ['Chest pain / tightness', 'Breathlessness', 'Palpitations', 'Claudication', 'Syncope']
const GI_SX     = ['Nausea / vomiting', 'Early satiety', 'Bloating', 'Alternating bowel habit', 'Constipation']
const GU_SX     = ['Urinary frequency / urgency', 'Incomplete bladder emptying', 'Recurrent UTI', 'Genital infections']

const OHA_LIST = [
  'Metformin', 'Glibenclamide', 'Glipizide', 'Glimepiride', 'Gliclazide',
  'Sitagliptin', 'Vildagliptin', 'Saxagliptin', 'Alogliptin',
  'Dapagliflozin', 'Empagliflozin', 'Canagliflozin',
  'Pioglitazone', 'Acarbose',
]
const GLP1_LIST  = ['Liraglutide', 'Semaglutide (SC)', 'Semaglutide (Oral)', 'Dulaglutide', 'Exenatide']
const INS_TYPES  = ['Rapid-acting (Lispro/Aspart)', 'Short-acting (Regular)', 'Intermediate (NPH)', 'Long-acting (Glargine/Detemir/Degludec)', 'Pre-mixed (30/70, 50/50)', 'Biosimilar']
const INS_SITES  = ['Abdomen', 'Thigh', 'Upper arm', 'Buttock']
const INS_DEV    = ['Insulin pen', 'Syringe', 'Insulin pump (CSII)', 'Inhaled']

const EYE_RESULTS = ['Not yet examined', 'Normal', 'Background retinopathy', 'Pre-proliferative', 'Proliferative', 'Maculopathy', 'Cataract', 'Glaucoma']
const FOOT_RISK   = ['Low risk (normal sensation, no deformity)', 'Moderate risk', 'High risk (neuropathy/ischaemia/deformity)', 'Active ulcer / wound', 'Charcot foot']
const FOOT_FIND   = ['Normal', 'Callus', 'Fissures', 'Deformity', 'Peripheral neuropathy', 'Absent pulses (PVD)', 'Ulceration', 'Infection', 'Onychomycosis']
const CKD_STAGES  = ['Stage 1 (eGFR ≥90)', 'Stage 2 (eGFR 60–89)', 'Stage 3a (eGFR 45–59)', 'Stage 3b (eGFR 30–44)', 'Stage 4 (eGFR 15–29)', 'Stage 5 (eGFR <15)', 'On dialysis']
const NEURO_TYPES = ['Peripheral (sensorimotor)', 'Painful diabetic neuropathy', 'Mononeuropathy', 'Autonomic — gastroparesis', 'Autonomic — orthostatic hypotension', 'Autonomic — bladder dysfunction', 'Autonomic — sudomotor', 'Cardiac autonomic neuropathy']
const MACRO_LIST  = ['IHD / CAD', 'Previous MI', 'PCI / Stent', 'CABG', 'Peripheral Arterial Disease', 'Stroke / TIA', 'Heart Failure', 'Atrial Fibrillation']

const COMORBID_LIST = [
  'Hypertension', 'Dyslipidaemia', 'Obesity', 'NAFLD / Fatty liver', 'OSA',
  'Hypothyroidism', 'Hyperthyroidism', 'PCOS', 'CKD (non-diabetic)', 'Depression / Anxiety',
  'Cognitive impairment', 'Osteoporosis', 'Gout / Hyperuricaemia',
]

const ADHERENCE = ['Good (rarely misses)', 'Moderate (occasional miss)', 'Poor (frequent miss)', 'Non-adherent']
const ACTIVITY  = ['Sedentary', 'Light (1–2 days/week)', 'Moderate (3–4 days/week)', 'Vigorous (5+ days/week)']
const DIET_TYPE = ['Regular / Mixed', 'Low-carbohydrate', 'Mediterranean', 'Vegetarian / Vegan', 'Low-fat', 'Other']
const DIET_ADH  = ['Good adherence', 'Moderate adherence', 'Poor adherence', 'No specific diet']
const STRESS    = ['Low', 'Moderate', 'High', 'Very high']

const REFERRALS = ['Ophthalmology', 'Podiatry / Foot clinic', 'Nephrology', 'Cardiology', 'Dietitian', 'Diabetes Educator', 'Endocrinology', 'Vascular Surgery', 'Psychiatry / Psychology']
const EDU_TOPICS = ['Hypo management', 'Sick day rules', 'Foot care', 'SMBG technique', 'Carb counting', 'Medication technique', 'Lifestyle modification', 'Sick day rules', 'Driving with diabetes']

// ─────────────────────────────────────────────────────────────────────────────
// Helper components
// ─────────────────────────────────────────────────────────────────────────────

function SectionTitle({ text }) {
  return <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3 pb-1 border-b border-amber-100">{text}</h3>
}

function Gate({ label, value, onChange, yesLabel = 'Yes', noLabel = 'No', children }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <p className="text-sm font-medium text-gray-700 flex-1">{label}</p>
        <div className="flex gap-1.5">
          {[yesLabel, noLabel].map(opt => (
            <button key={opt} type="button" onClick={() => onChange(v => v === opt ? '' : opt)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                value === opt
                  ? opt === yesLabel ? 'bg-amber-500 text-white border-amber-500' : 'bg-gray-400 text-white border-gray-400'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-amber-300'
              }`}>{opt}</button>
          ))}
        </div>
      </div>
      {value === yesLabel && children && (
        <div className="ml-4 pl-3 border-l-2 border-amber-200 space-y-3">{children}</div>
      )}
    </div>
  )
}

function Pills({ opts, values, onToggle, active = 'bg-amber-500 text-white border-amber-500' }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opts.map(o => (
        <button key={o} type="button" onClick={() => onToggle(o)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            values.includes(o) ? active : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'
          }`}>{o}</button>
      ))}
    </div>
  )
}

function SinglePill({ opts, value, onSet, active = 'bg-amber-500 text-white border-amber-500' }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opts.map(o => (
        <button key={o} type="button" onClick={() => onSet(v => v === o ? '' : o)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            value === o ? active : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'
          }`}>{o}</button>
      ))}
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-600 mb-1.5">{label}</p>
      {children}
    </div>
  )
}

function NumInput({ value, onChange, placeholder, unit, min, max, className = '' }) {
  return (
    <div className="flex items-center gap-1.5">
      <input type="number" value={value} min={min} max={max}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${className}`} />
      {unit && <span className="text-xs text-gray-400">{unit}</span>}
    </div>
  )
}

function hba1cBadge(val) {
  const v = parseFloat(val)
  if (isNaN(v)) return null
  if (v < 6.5) return { label: 'Below diabetes threshold', color: 'bg-blue-100 text-blue-700 border-blue-200' }
  if (v < 7.0) return { label: 'Well controlled (<7%)', color: 'bg-green-100 text-green-700 border-green-200' }
  if (v < 8.0) return { label: 'Acceptable (7–8%)', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' }
  if (v < 9.0) return { label: 'Suboptimal (8–9%)', color: 'bg-orange-100 text-orange-700 border-orange-200' }
  return { label: 'Poorly controlled (>9%) — Action required', color: 'bg-red-100 text-red-700 border-red-200' }
}

function eGFRStage(val) {
  const v = parseFloat(val)
  if (isNaN(v)) return null
  if (v >= 90) return 'Stage 1'
  if (v >= 60) return 'Stage 2'
  if (v >= 45) return 'Stage 3a'
  if (v >= 30) return 'Stage 3b'
  if (v >= 15) return 'Stage 4'
  return 'Stage 5'
}

function newOHA() { return { id: Date.now() + Math.random(), drug: '', dose: '', freq: '', adherence: '', side_effects: '' } }
function newIns()  { return { id: Date.now() + Math.random(), type: '', dose: '', freq: '', site: '', lipohypertrophy: '' } }

// ─────────────────────────────────────────────────────────────────────────────
// Main form
// ─────────────────────────────────────────────────────────────────────────────

export default function DiabetesAssessmentForm({ admission, onClose, onSaved }) {
  const [stage, setStage] = useState('profile')

  // ── Profile ──
  const [dmType,        setDmType]        = useState('')
  const [dmDuration,    setDmDuration]    = useState('')
  const [diagDate,      setDiagDate]      = useState('')
  const [familyHx,      setFamilyHx]      = useState('')
  const [prevDKA,       setPrevDKA]       = useState('')
  const [dkaCount,      setDkaCount]      = useState('')
  const [lastDKA,       setLastDKA]       = useState('')
  const [honeymoon,     setHoneymoon]     = useState('')  // T1 only
  const [gadPositive,   setGadPositive]   = useState('')  // LADA
  const [gestWeeks,     setGestWeeks]     = useState('')  // GDM
  const [prevGDM,       setPrevGDM]       = useState('')  // GDM

  // ── Concern ──
  const [visitReason,   setVisitReason]   = useState([])
  const [poorCtrlCause, setPoorCtrlCause] = useState([])
  const [hypoTriggers,  setHypoTriggers]  = useState([])

  // ── Symptoms ──
  const [hyperSx,       setHyperSx]       = useState([])
  const [hypoSx,        setHypoSx]        = useState([])
  const [neuroSx,       setNeuroSx]       = useState([])
  const [footSx,        setFootSx]        = useState([])
  const [eyeSx,         setEyeSx]         = useState([])
  const [renalSx,       setRenalSx]       = useState([])
  const [cvsSx,         setCvsSx]         = useState([])
  const [giSx,          setGiSx]          = useState([])
  const [guSx,          setGuSx]          = useState([])
  const [edStatus,      setEdStatus]      = useState('')  // males
  const [gynSx,         setGynSx]         = useState([])  // females

  // ── Glycaemia ──
  const [hba1c,         setHba1c]         = useState('')
  const [hba1cDate,     setHba1cDate]     = useState('')
  const [fbs,           setFbs]           = useState('')
  const [ppbs,          setPpbs]          = useState('')
  const [rbs,           setRbs]           = useState('')
  const [cgmUsed,       setCgmUsed]       = useState('')
  const [tir,           setTir]           = useState('')   // time in range %
  const [smFreq,        setSmFreq]        = useState('')
  const [smTiming,      setSmTiming]      = useState([])
  const [hypoFreq,      setHypoFreq]      = useState('')
  const [hypoSeverity,  setHypoSeverity]  = useState('')
  const [hypoAware,     setHypoAware]     = useState('')
  const [nocHypo,       setNocHypo]       = useState('')
  const [poorCtrlDur,   setPoorCtrlDur]   = useState('')

  // ── Medications ──
  const [treatMode,     setTreatMode]     = useState([])
  const [ohas,          setOhas]          = useState([newOHA()])
  const [onGLP1,        setOnGLP1]        = useState('')
  const [glp1Drug,      setGlp1Drug]      = useState('')
  const [glp1Dose,      setGlp1Dose]      = useState('')
  const [glp1Nausea,    setGlp1Nausea]    = useState('')
  const [glp1WtLoss,    setGlp1WtLoss]    = useState('')
  const [insulins,      setInsulins]      = useState([])
  const [insDevice,     setInsDevice]     = useState('')
  const [prevMeds,      setPrevMeds]      = useState('')
  const [onStatin,      setOnStatin]      = useState('')
  const [statinDrug,    setStatinDrug]    = useState('')
  const [onACEARB,      setOnACEARB]      = useState('')
  const [onAspirin,     setOnAspirin]     = useState('')
  const [overallAdh,    setOverallAdh]    = useState('')
  const [adherBarrier,  setAdherBarrier]  = useState([])

  // ── Complications ──
  const [hasEye,        setHasEye]        = useState('')
  const [eyeResult,     setEyeResult]     = useState('')
  const [lastEyeDate,   setLastEyeDate]   = useState('')
  const [eyeLaser,      setEyeLaser]      = useState('')
  const [eyeFollowUp,   setEyeFollowUp]   = useState('')

  const [hasNephro,     setHasNephro]     = useState('')
  const [egfr,          setEgfr]          = useState('')
  const [uacr,          setUacr]          = useState('')
  const [ckdStage,      setCkdStage]      = useState('')
  const [niphroRef,     setNephroRef]     = useState('')

  const [hasNeuro,      setHasNeuro]      = useState('')
  const [neuroTypes,    setNeuroTypes]    = useState([])
  const [monofilament,  setMonofilament]  = useState('')
  const [vibration,     setVibration]     = useState('')
  const [ankleReflex,   setAnkleReflex]   = useState('')
  const [neuropainScore,setNeuropainScore]= useState('')
  const [neuroPainMeds, setNeuroPainMeds] = useState([])

  const [hasFoot,       setHasFoot]       = useState('')
  const [footRisk,      setFootRisk]      = useState('')
  const [footFindLeft,  setFootFindLeft]  = useState([])
  const [footFindRight, setFootFindRight] = useState([])
  const [podRef,        setPodRef]        = useState('')

  const [hasCVD,        setHasCVD]        = useState('')
  const [cvdList,       setCvdList]       = useState([])
  const [abi,           setAbi]           = useState('')

  const [hasED,         setHasED]         = useState('')

  // ── Comorbidities ──
  const [comorbids,     setComorbids]     = useState([])
  const [bpValue,       setBpValue]       = useState('')
  const [bpControlled,  setBpControlled]  = useState('')
  const [ldl,           setLdl]           = useState('')
  const [ldlTarget,     setLdlTarget]     = useState('')
  const [bmi,           setBmi]           = useState('')
  const [waist,         setWaist]         = useState('')
  const [wtTrend,       setWtTrend]       = useState('')
  const [tsh,           setTsh]           = useState('')
  const [onThyroxine,   setOnThyroxine]   = useState('')

  // ── Lifestyle ──
  const [activityLevel, setActivityLevel] = useState('')
  const [actFreq,       setActFreq]       = useState('')
  const [dietType,      setDietType]      = useState('')
  const [dietAdh,       setDietAdh]       = useState('')
  const [carbAware,     setCarbAware]     = useState('')
  const [smokingStatus, setSmokingStatus] = useState('')
  const [alcoholStatus, setAlcoholStatus] = useState('')
  const [alcoholUnits,  setAlcoholUnits]  = useState('')
  const [stressLevel,   setStressLevel]   = useState('')
  const [sleepAdequate, setSleepAdequate] = useState('')
  const [shiftWork,     setShiftWork]     = useState('')

  // ── Plan ──
  const [hba1cTarget,   setHba1cTarget]   = useState('')
  const [bpTarget,      setBpTarget]      = useState('')
  const [ldlTargetPlan, setLdlTargetPlan] = useState('')
  const [planReferrals, setPlanReferrals] = useState([])
  const [planEdu,       setPlanEdu]       = useState([])
  const [planNotes,     setPlanNotes]     = useState('')
  const [nextReview,    setNextReview]    = useState('')
  const [planChanges,   setPlanChanges]   = useState('')

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const toggleArr = (setter, val) =>
    setter(p => p.includes(val) ? p.filter(x => x !== val) : [...p, val])

  const hba1cInfo = hba1cBadge(hba1c)
  const egfrStage = eGFRStage(egfr)
  const isT1      = dmType === 'Type 1'
  const isGDM     = dmType === 'GDM'
  const isLADA    = dmType === 'LADA'

  // Auto-suggested plan items
  const autoSuggestions = useMemo(() => {
    const s = []
    if (hba1c && parseFloat(hba1c) > 9) s.push('⚠ HbA1c >9%: consider treatment intensification')
    if (!lastEyeDate) s.push('Schedule ophthalmology review (no date recorded)')
    if (hasNeuro === 'Yes' && !neuroPainMeds.length) s.push('Consider neuropathic pain management')
    if (hasFoot === 'Yes' && podRef !== 'Yes') s.push('Refer to podiatry / foot clinic')
    if (hasNephro === 'Yes' && !onACEARB) s.push('Consider ACE inhibitor / ARB for nephroprotection')
    if (hasCVD === 'Yes' && !onStatin) s.push('Consider statin therapy (CVD present)')
    if (comorbids.includes('Hypertension') && bpControlled === 'No') s.push('Optimise antihypertensive therapy')
    if (dietAdh === 'Poor adherence') s.push('Dietitian referral for medical nutrition therapy')
    if (activityLevel === 'Sedentary') s.push('Physical activity counselling — aim ≥150 min/week')
    if (smokingStatus === 'Current') s.push('Smoking cessation support')
    return s
  }, [hba1c, lastEyeDate, hasNeuro, neuroPainMeds, hasFoot, podRef, hasNephro, onACEARB, hasCVD, onStatin, comorbids, bpControlled, dietAdh, activityLevel, smokingStatus])

  const updateOHA = (id, f, v) => setOhas(p => p.map(o => o.id === id ? { ...o, [f]: v } : o))
  const updateIns = (id, f, v) => setInsulins(p => p.map(i => i.id === id ? { ...i, [f]: v } : i))

  const handleSave = async () => {
    setSaving(true); setError('')
    const payload = {
      type: 'diabetes_assessment',
      profile:        { dm_type: dmType, duration_years: dmDuration, diagnosis_date: diagDate, family_history: familyHx, prev_dka: prevDKA, dka_count: dkaCount, last_dka: lastDKA, honeymoon, gad_positive: gadPositive, gestational_weeks: gestWeeks, prev_gdm: prevGDM },
      concern:        { visit_reasons: visitReason, poor_control_causes: poorCtrlCause, hypo_triggers: hypoTriggers },
      symptoms:       { hyperglycaemia: hyperSx, hypoglycaemia: hypoSx, neuropathy: neuroSx, foot: footSx, eye: eyeSx, renal: renalSx, cardiovascular: cvsSx, gastrointestinal: giSx, genitourinary: guSx, erectile_dysfunction: edStatus, gynaecological: gynSx },
      glycaemia:      { hba1c, hba1c_date: hba1cDate, hba1c_interpretation: hba1cInfo?.label, fbs, ppbs, rbs, cgm_used: cgmUsed, time_in_range_pct: tir, smbg_frequency: smFreq, smbg_timing: smTiming, hypo_frequency: hypoFreq, hypo_severity: hypoSeverity, hypo_awareness: hypoAware, nocturnal_hypo: nocHypo, poor_control_duration: poorCtrlDur },
      medications:    { treatment_mode: treatMode, ohas: ohas.filter(o => o.drug), on_glp1: onGLP1, glp1: { drug: glp1Drug, dose: glp1Dose, nausea: glp1Nausea, weight_loss: glp1WtLoss }, insulins: insulins.filter(i => i.type), insulin_device: insDevice, previous_medications: prevMeds, on_statin: onStatin, statin_drug: statinDrug, on_ace_arb: onACEARB, on_aspirin: onAspirin, overall_adherence: overallAdh, adherence_barriers: adherBarrier },
      complications:  { retinopathy: { present: hasEye, result: eyeResult, last_exam: lastEyeDate, laser_tx: eyeLaser, follow_up: eyeFollowUp }, nephropathy: { present: hasNephro, egfr, uacr, ckd_stage: egfrStage || ckdStage, nephrology_referral: niphroRef }, neuropathy: { present: hasNeuro, types: neuroTypes, monofilament, vibration_sense: vibration, ankle_reflex: ankleReflex, pain_score: neuropainScore, pain_medications: neuroPainMeds }, foot: { present: hasFoot, risk_category: footRisk, findings_left: footFindLeft, findings_right: footFindRight, podiatry_referral: podRef }, macrovascular: { present: hasCVD, conditions: cvdList, abi }, erectile_dysfunction: hasED },
      comorbidities:  { list: comorbids, bp: bpValue, bp_controlled: bpControlled, ldl, ldl_target: ldlTarget, bmi, waist_cm: waist, weight_trend: wtTrend, tsh, on_thyroxine: onThyroxine },
      lifestyle:      { activity_level: activityLevel, activity_frequency: actFreq, diet_type: dietType, diet_adherence: dietAdh, carb_awareness: carbAware, smoking: smokingStatus, alcohol: alcoholStatus, alcohol_units_week: alcoholUnits, stress_level: stressLevel, sleep_adequate: sleepAdequate, shift_work: shiftWork },
      plan:           { hba1c_target: hba1cTarget, bp_target: bpTarget, ldl_target: ldlTargetPlan, referrals: planReferrals, education_topics: planEdu, auto_suggestions: autoSuggestions, plan_notes: planNotes, next_review_date: nextReview, treatment_changes: planChanges },
    }
    try {
      await api.post(`/inpatient/admissions/${admission.id}/notes`, {
        note_type: 'assessment',
        note_text: JSON.stringify(payload),
      })
      onSaved?.()
    } catch (e) {
      setError(e?.message || 'Save failed')
      setSaving(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Stage renderers
  // ─────────────────────────────────────────────────────────────────────────

  const renderProfile = () => (
    <div className="space-y-5">
      <SectionTitle text="Diabetes Type & History" />
      <Row label="Type of Diabetes">
        <SinglePill opts={DM_TYPES} value={dmType} onSet={setDmType} />
      </Row>

      {dmType && (
        <div className="grid grid-cols-2 gap-4">
          <Row label="Duration (years)">
            <NumInput value={dmDuration} onChange={setDmDuration} placeholder="e.g. 5" unit="yrs" min={0} max={80} className="w-24" />
          </Row>
          <Row label="Date of diagnosis">
            <input type="date" value={diagDate} onChange={e => setDiagDate(e.target.value)}
              className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </Row>
        </div>
      )}

      {dmType && (
        <Row label="Family history of diabetes?">
          <SinglePill opts={['Yes — First degree', 'Yes — Second degree', 'No', 'Unknown']}
            value={familyHx} onSet={setFamilyHx} />
        </Row>
      )}

      {/* Type-specific fields */}
      {isT1 && (
        <div className="ml-3 pl-3 border-l-2 border-amber-200 space-y-4">
          <p className="text-xs font-bold text-amber-600">Type 1 — specific questions</p>
          <Row label="Honeymoon phase suspected?">
            <SinglePill opts={['Yes', 'No', 'Past']} value={honeymoon} onSet={setHoneymoon} />
          </Row>
        </div>
      )}
      {isLADA && (
        <div className="ml-3 pl-3 border-l-2 border-amber-200 space-y-4">
          <p className="text-xs font-bold text-amber-600">LADA — specific questions</p>
          <Row label="GAD antibodies positive?">
            <SinglePill opts={['Yes', 'No', 'Not tested']} value={gadPositive} onSet={setGadPositive} />
          </Row>
        </div>
      )}
      {isGDM && (
        <div className="ml-3 pl-3 border-l-2 border-amber-200 space-y-4">
          <p className="text-xs font-bold text-amber-600">GDM — specific questions</p>
          <Row label="Current gestational age (weeks)">
            <NumInput value={gestWeeks} onChange={setGestWeeks} placeholder="e.g. 28" unit="weeks" min={0} max={42} className="w-24" />
          </Row>
          <Row label="Previous GDM?">
            <SinglePill opts={['Yes', 'No', 'First pregnancy']} value={prevGDM} onSet={setPrevGDM} />
          </Row>
        </div>
      )}

      {dmType && (
        <Gate label="History of DKA / HHS episodes?" value={prevDKA} onChange={setPrevDKA}>
          <div className="grid grid-cols-2 gap-3">
            <Row label="Total episodes">
              <NumInput value={dkaCount} onChange={setDkaCount} placeholder="e.g. 2" min={1} className="w-20" />
            </Row>
            <Row label="Last episode date">
              <input type="date" value={lastDKA} onChange={e => setLastDKA(e.target.value)}
                className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </Row>
          </div>
        </Gate>
      )}
    </div>
  )

  const renderConcern = () => (
    <div className="space-y-5">
      <SectionTitle text="Reason for This Visit" />
      <Row label="Primary reason(s)">
        <Pills opts={VISIT_REASONS} values={visitReason} onToggle={v => toggleArr(setVisitReason, v)} />
      </Row>

      {visitReason.includes('Poor glycaemic control') && (
        <div className="ml-3 pl-3 border-l-2 border-amber-200 space-y-3">
          <Row label="Patient attributes poor control to:">
            <Pills
              opts={['Dietary non-adherence', 'Medication non-adherence', 'Stress / illness', 'Insufficient medication dose', 'New medication started', 'Inactivity', 'Unknown']}
              values={poorCtrlCause} onToggle={v => toggleArr(setPoorCtrlCause, v)} />
          </Row>
          <Row label="Duration of poor control">
            <SinglePill opts={['<1 month', '1–3 months', '3–6 months', '>6 months']} value={poorCtrlDur} onSet={setPoorCtrlDur} />
          </Row>
        </div>
      )}

      {visitReason.includes('Hypoglycaemia concern') && (
        <div className="ml-3 pl-3 border-l-2 border-amber-200 space-y-3">
          <Row label="Triggers identified">
            <Pills
              opts={['Missed meal', 'Exercise', 'Excess medication', 'Alcohol', 'Nocturnal', 'Post-activity lag', 'Unknown']}
              values={hypoTriggers} onToggle={v => toggleArr(setHypoTriggers, v)} />
          </Row>
        </div>
      )}
    </div>
  )

  const renderSymptoms = () => (
    <div className="space-y-5">
      <SectionTitle text="Symptom Review — Diabetes-Specific" />

      <Row label="Hyperglycaemia symptoms">
        <Pills opts={HYPER_SX} values={hyperSx} onToggle={v => toggleArr(setHyperSx, v)} />
      </Row>
      <Row label="Hypoglycaemia symptoms">
        <Pills opts={HYPO_SX} values={hypoSx} onToggle={v => toggleArr(setHypoSx, v)} />
      </Row>
      <Row label="Neuropathy symptoms">
        <Pills opts={NEURO_SX} values={neuroSx} onToggle={v => toggleArr(setNeuroSx, v)} />
      </Row>
      <Row label="Foot symptoms">
        <Pills opts={FOOT_SX} values={footSx} onToggle={v => toggleArr(setFootSx, v)} />
      </Row>
      <Row label="Eye symptoms">
        <Pills opts={EYE_SX} values={eyeSx} onToggle={v => toggleArr(setEyeSx, v)} />
      </Row>
      <Row label="Renal symptoms">
        <Pills opts={RENAL_SX} values={renalSx} onToggle={v => toggleArr(setRenalSx, v)} />
      </Row>
      <Row label="Cardiovascular symptoms">
        <Pills opts={CVS_SX} values={cvsSx} onToggle={v => toggleArr(setCvsSx, v)} />
      </Row>
      <Row label="GI / Autonomic symptoms">
        <Pills opts={GI_SX} values={giSx} onToggle={v => toggleArr(setGiSx, v)} />
      </Row>
      <Row label="Genitourinary symptoms">
        <Pills opts={GU_SX} values={guSx} onToggle={v => toggleArr(setGuSx, v)} />
      </Row>
      <Row label="Erectile dysfunction (males) / Gynaecological symptoms (females)">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-gray-400 mb-1">Erectile dysfunction</p>
            <SinglePill opts={['Yes', 'No', 'N/A']} value={edStatus} onSet={setEdStatus} />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-1">Vaginal dryness / recurrent infection</p>
            <Pills opts={['Vaginal dryness', 'Recurrent candidiasis', 'Dyspareunia', 'N/A']} values={gynSx} onToggle={v => toggleArr(setGynSx, v)} />
          </div>
        </div>
      </Row>
    </div>
  )

  const renderGlycaemia = () => (
    <div className="space-y-5">
      <SectionTitle text="Glycaemic Control" />

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Row label="HbA1c (%)">
            <NumInput value={hba1c} onChange={setHba1c} placeholder="e.g. 8.2" unit="%" min={4} max={20} step={0.1} className="w-28" />
          </Row>
          {hba1cInfo && (
            <div className={`mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg border ${hba1cInfo.color}`}>
              {hba1cInfo.label}
              {parseFloat(hba1c) > 9 && <span className="ml-2 text-xs font-normal">— consider treatment intensification</span>}
            </div>
          )}
        </div>
        <Row label="HbA1c date">
          <input type="date" value={hba1cDate} onChange={e => setHba1cDate(e.target.value)}
            className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </Row>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Row label="Fasting glucose">
          <NumInput value={fbs} onChange={setFbs} placeholder="mmol/L or mg/dL" min={0} className="w-full" />
        </Row>
        <Row label="Post-prandial (2hr)">
          <NumInput value={ppbs} onChange={setPpbs} placeholder="mmol/L or mg/dL" min={0} className="w-full" />
        </Row>
        <Row label="Random glucose">
          <NumInput value={rbs} onChange={setRbs} placeholder="mmol/L or mg/dL" min={0} className="w-full" />
        </Row>
      </div>

      <Gate label="Using CGM (Continuous Glucose Monitor)?" value={cgmUsed} onChange={setCgmUsed}>
        <Row label="Time in Range (70–180 mg/dL or 3.9–10 mmol/L) %">
          <NumInput value={tir} onChange={setTir} placeholder="e.g. 65" unit="%" min={0} max={100} className="w-24" />
        </Row>
      </Gate>

      <Row label="Home blood glucose monitoring frequency">
        <SinglePill opts={['Never', 'Occasional', 'Daily (once)', 'Daily (multiple)', 'CGM only']} value={smFreq} onSet={setSmFreq} />
      </Row>
      {smFreq && smFreq !== 'Never' && (
        <Row label="Monitoring timing">
          <Pills opts={['Fasting', 'Pre-meal', 'Post-meal (2hr)', 'Bedtime', 'Night (2–3am)']} values={smTiming} onToggle={v => toggleArr(setSmTiming, v)} />
        </Row>
      )}

      <SectionTitle text="Hypoglycaemia Assessment" />
      <Row label="Hypoglycaemia frequency">
        <SinglePill opts={['None in past month', '<1/week', '1–3/week', '>3/week', 'Daily']} value={hypoFreq} onSet={setHypoFreq} />
      </Row>

      {hypoFreq && hypoFreq !== 'None in past month' && (
        <div className="ml-3 pl-3 border-l-2 border-amber-200 space-y-3">
          <Row label="Worst severity">
            <SinglePill
              opts={['Mild (self-treated)', 'Moderate (needed help)', 'Severe (LOC / seizure / hospitalised)']}
              value={hypoSeverity} onSet={setHypoSeverity}
              active={hypoSeverity?.includes('Severe') ? 'bg-red-600 text-white border-red-600' : 'bg-amber-500 text-white border-amber-500'} />
          </Row>
          <Row label="Hypoglycaemia awareness">
            <SinglePill opts={['Fully aware', 'Impaired awareness', 'Unaware (HAL)']} value={hypoAware} onSet={setHypoAware} />
          </Row>
          <Row label="Nocturnal hypoglycaemia?">
            <SinglePill opts={['Yes', 'No', 'Uncertain']} value={nocHypo} onSet={setNocHypo} />
          </Row>
        </div>
      )}
    </div>
  )

  const renderMedications = () => (
    <div className="space-y-5">
      <SectionTitle text="Current Treatment Mode" />
      <Row label="Treatment modality (select all that apply)">
        <Pills opts={['Diet & lifestyle only', 'Oral hypoglycaemics (OHAs)', 'GLP-1 agonist', 'Insulin', 'Insulin pump (CSII)']}
          values={treatMode} onToggle={v => toggleArr(setTreatMode, v)} />
      </Row>

      {(treatMode.includes('Oral hypoglycaemics (OHAs)')) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-600">Oral Hypoglycaemic Agents</p>
            <button type="button" onClick={() => setOhas(p => [...p, newOHA()])}
              className="flex items-center gap-1 text-xs font-medium text-amber-600 border border-amber-200 px-2 py-0.5 rounded-lg hover:bg-amber-50">
              <Plus size={11} /> Add OHA
            </button>
          </div>
          {ohas.map((o, idx) => (
            <div key={o.id} className="border border-gray-200 rounded-xl p-3 bg-gray-50 relative">
              {ohas.length > 1 && (
                <button type="button" onClick={() => setOhas(p => p.filter(x => x.id !== o.id))}
                  className="absolute top-2 right-2 text-gray-300 hover:text-red-400"><X size={12} /></button>
              )}
              <div className="mb-2">
                <p className="text-[10px] text-gray-400 font-medium mb-1">Drug</p>
                <div className="flex flex-wrap gap-1">
                  {OHA_LIST.map(d => (
                    <button key={d} type="button" onClick={() => updateOHA(o.id, 'drug', d)}
                      className={`px-2 py-0.5 rounded-full text-[11px] border transition-all ${
                        o.drug === d ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-500 border-gray-200 hover:border-amber-300'
                      }`}>{d}</button>
                  ))}
                </div>
                <input type="text" value={o.drug} onChange={e => updateOHA(o.id, 'drug', e.target.value)}
                  placeholder="Or type drug name" className="mt-1.5 w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[10px] text-gray-400 font-medium mb-1">Dose</p>
                  <input type="text" value={o.dose} onChange={e => updateOHA(o.id, 'dose', e.target.value)}
                    placeholder="e.g. 500mg" className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-medium mb-1">Frequency</p>
                  <input type="text" value={o.freq} onChange={e => updateOHA(o.id, 'freq', e.target.value)}
                    placeholder="e.g. BD" className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-medium mb-1">Adherence</p>
                  <select value={o.adherence} onChange={e => updateOHA(o.id, 'adherence', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400">
                    <option value="">Select</option>
                    {['Good', 'Moderate', 'Poor'].map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-[10px] text-gray-400 font-medium mb-1">Side effects noted</p>
                <input type="text" value={o.side_effects} onChange={e => updateOHA(o.id, 'side_effects', e.target.value)}
                  placeholder="e.g. GI upset, genital infection, oedema…" className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            </div>
          ))}
        </div>
      )}

      {treatMode.includes('GLP-1 agonist') && (
        <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 space-y-3">
          <p className="text-xs font-bold text-gray-600">GLP-1 Agonist</p>
          <div className="flex flex-wrap gap-1.5">
            {GLP1_LIST.map(d => (
              <button key={d} type="button" onClick={() => setGlp1Drug(v => v === d ? '' : d)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-all ${glp1Drug === d ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-500 border-gray-200'}`}>{d}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-gray-400 mb-1">Dose</p>
              <input type="text" value={glp1Dose} onChange={e => setGlp1Dose(e.target.value)} placeholder="e.g. 1.8mg"
                className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-1">Weight loss achieved?</p>
              <input type="text" value={glp1WtLoss} onChange={e => setGlp1WtLoss(e.target.value)} placeholder="e.g. 4 kg in 3 months"
                className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          </div>
          <Row label="Nausea / GI side effects?">
            <SinglePill opts={['None', 'Mild', 'Moderate — limiting dose', 'Stopped due to side effects']} value={glp1Nausea} onSet={setGlp1Nausea} />
          </Row>
        </div>
      )}

      {(treatMode.includes('Insulin') || treatMode.includes('Insulin pump (CSII)')) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-600">Insulin Regimen</p>
            <button type="button" onClick={() => setInsulins(p => [...p, newIns()])}
              className="flex items-center gap-1 text-xs font-medium text-amber-600 border border-amber-200 px-2 py-0.5 rounded-lg hover:bg-amber-50">
              <Plus size={11} /> Add Insulin
            </button>
          </div>
          <Row label="Delivery device">
            <SinglePill opts={INS_DEV} value={insDevice} onSet={setInsDevice} />
          </Row>
          {insulins.map((ins, idx) => (
            <div key={ins.id} className="border border-gray-200 rounded-xl p-3 bg-gray-50 space-y-2 relative">
              {insulins.length > 0 && (
                <button type="button" onClick={() => setInsulins(p => p.filter(x => x.id !== ins.id))}
                  className="absolute top-2 right-2 text-gray-300 hover:text-red-400"><X size={12} /></button>
              )}
              <p className="text-[10px] text-gray-400 font-medium">Insulin {idx + 1}</p>
              <div className="flex flex-wrap gap-1 mb-1">
                {INS_TYPES.map(t => (
                  <button key={t} type="button" onClick={() => updateIns(ins.id, 'type', t)}
                    className={`px-2 py-0.5 rounded-full text-[11px] border ${ins.type === t ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-500 border-gray-200'}`}>{t}</button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><p className="text-[10px] text-gray-400 mb-1">Dose</p>
                  <input type="text" value={ins.dose} onChange={e => updateIns(ins.id, 'dose', e.target.value)} placeholder="e.g. 20 units"
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400" /></div>
                <div><p className="text-[10px] text-gray-400 mb-1">Timing</p>
                  <input type="text" value={ins.freq} onChange={e => updateIns(ins.id, 'freq', e.target.value)} placeholder="e.g. Nocte"
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400" /></div>
                <div><p className="text-[10px] text-gray-400 mb-1">Injection site</p>
                  <select value={ins.site} onChange={e => updateIns(ins.id, 'site', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none">
                    <option value="">Select</option>
                    {INS_SITES.map(s => <option key={s}>{s}</option>)}
                  </select></div>
              </div>
              <Row label="Lipohypertrophy at injection site?">
                <SinglePill opts={['None', 'Mild', 'Significant — rotating advised']} value={ins.lipohypertrophy}
                  onSet={v => updateIns(ins.id, 'lipohypertrophy', ins.lipohypertrophy === v ? '' : v)} />
              </Row>
            </div>
          ))}
          {insulins.length === 0 && (
            <button type="button" onClick={() => setInsulins([newIns()])}
              className="w-full py-2 border border-dashed border-amber-300 rounded-lg text-xs text-amber-600 hover:bg-amber-50">
              + Add insulin type
            </button>
          )}
        </div>
      )}

      <SectionTitle text="Protective Medications" />
      <div className="grid grid-cols-1 gap-3">
        <Gate label="On statin therapy?" value={onStatin} onChange={setOnStatin}>
          <input type="text" value={statinDrug} onChange={e => setStatinDrug(e.target.value)}
            placeholder="e.g. Atorvastatin 40mg OD" className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </Gate>
        <Row label="On ACE inhibitor / ARB?">
          <SinglePill opts={['Yes', 'No', 'Contraindicated']} value={onACEARB} onSet={setOnACEARB} />
        </Row>
        <Row label="On aspirin?">
          <SinglePill opts={['Yes', 'No', 'GI intolerance']} value={onAspirin} onSet={setOnAspirin} />
        </Row>
      </div>

      <SectionTitle text="Overall Adherence & Barriers" />
      <Row label="Overall medication adherence">
        <SinglePill opts={ADHERENCE} value={overallAdh} onSet={setOverallAdh} />
      </Row>
      {(overallAdh === 'Moderate (occasional miss)' || overallAdh === 'Poor (frequent miss)' || overallAdh === 'Non-adherent') && (
        <Row label="Barriers to adherence">
          <Pills opts={['Cost / affordability', 'Side effects', 'Forgetting', 'Needle phobia', 'Complexity of regimen', 'Cultural / religious', 'Lack of understanding', 'Denial of diagnosis']}
            values={adherBarrier} onToggle={v => toggleArr(setAdherBarrier, v)} />
        </Row>
      )}
      <Row label="Previously tried medications (stopped/changed)">
        <input type="text" value={prevMeds} onChange={e => setPrevMeds(e.target.value)}
          placeholder="e.g. Stopped glibenclamide (hypoglycaemia), tried exenatide (nausea)…"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
      </Row>
    </div>
  )

  const renderComplications = () => (
    <div className="space-y-5">
      <SectionTitle text="Microvascular & Macrovascular Complications" />

      {/* Eyes */}
      <Gate label="Diabetic retinopathy / eye disease?" value={hasEye} onChange={setHasEye}>
        <Row label="Last dilated eye exam">
          <input type="date" value={lastEyeDate} onChange={e => setLastEyeDate(e.target.value)}
            className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </Row>
        <Row label="Findings">
          <SinglePill opts={EYE_RESULTS} value={eyeResult} onSet={setEyeResult} />
        </Row>
        <Row label="Laser / anti-VEGF treatment received?">
          <SinglePill opts={['Yes', 'No']} value={eyeLaser} onSet={setEyeLaser} />
        </Row>
        <Row label="Under ophthalmology follow-up?">
          <SinglePill opts={['Yes', 'No — refer', 'Pending']} value={eyeFollowUp} onSet={setEyeFollowUp} />
        </Row>
      </Gate>

      {/* Kidneys */}
      <Gate label="Diabetic nephropathy / CKD?" value={hasNephro} onChange={setHasNephro}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Row label="eGFR (mL/min/1.73m²)">
              <NumInput value={egfr} onChange={setEgfr} placeholder="e.g. 58" min={0} max={130} className="w-24" />
            </Row>
            {egfrStage && <p className="text-xs font-semibold text-amber-600 mt-1">{egfrStage}</p>}
          </div>
          <Row label="uACR (mg/mmol or mg/g)">
            <NumInput value={uacr} onChange={setUacr} placeholder="e.g. 35" min={0} className="w-24" />
            {uacr && (
              <p className="text-xs mt-1 font-medium text-gray-500">
                {parseFloat(uacr) < 3 ? 'Normal' : parseFloat(uacr) < 30 ? 'Microalbuminuria' : 'Macroalbuminuria'}
              </p>
            )}
          </Row>
        </div>
        <Row label="Nephrology referral?">
          <SinglePill opts={['Yes — referred', 'Yes — under nephrology', 'No — not yet needed']} value={niphroRef} onSet={setNephroRef} />
        </Row>
      </Gate>

      {/* Neuropathy */}
      <Gate label="Diabetic neuropathy?" value={hasNeuro} onChange={setHasNeuro}>
        <Row label="Types present">
          <Pills opts={NEURO_TYPES} values={neuroTypes} onToggle={v => toggleArr(setNeuroTypes, v)} />
        </Row>
        <div className="grid grid-cols-3 gap-3">
          <Row label="Monofilament sensation">
            <SinglePill opts={['Intact', 'Reduced', 'Absent']} value={monofilament} onSet={setMonofilament}
              active={monofilament === 'Absent' ? 'bg-red-500 text-white border-red-500' : 'bg-amber-500 text-white border-amber-500'} />
          </Row>
          <Row label="Vibration sense">
            <SinglePill opts={['Normal', 'Reduced', 'Absent']} value={vibration} onSet={setVibration}
              active={vibration === 'Absent' ? 'bg-red-500 text-white border-red-500' : 'bg-amber-500 text-white border-amber-500'} />
          </Row>
          <Row label="Ankle reflex">
            <SinglePill opts={['Present', 'Reduced', 'Absent']} value={ankleReflex} onSet={setAnkleReflex}
              active={ankleReflex === 'Absent' ? 'bg-red-500 text-white border-red-500' : 'bg-amber-500 text-white border-amber-500'} />
          </Row>
        </div>
        {neuroTypes.some(t => t.includes('Painful')) && (
          <Row label="Neuropathic pain score (0–10)">
            <NumInput value={neuropainScore} onChange={setNeuropainScore} placeholder="0–10" min={0} max={10} className="w-20" />
          </Row>
        )}
        <Row label="Neuropathic pain medications">
          <Pills opts={['Gabapentin', 'Pregabalin', 'Duloxetine', 'Amitriptyline', 'Tramadol', 'Capsaicin cream', 'None']}
            values={neuroPainMeds} onToggle={v => toggleArr(setNeuroPainMeds, v)} />
        </Row>
      </Gate>

      {/* Foot */}
      <Gate label="Diabetic foot disease / at-risk foot?" value={hasFoot} onChange={setHasFoot}>
        <Row label="Foot risk category">
          <SinglePill opts={FOOT_RISK} value={footRisk} onSet={setFootRisk}
            active={footRisk?.includes('Active') ? 'bg-red-600 text-white border-red-600' : footRisk?.includes('High') ? 'bg-orange-500 text-white border-orange-500' : 'bg-amber-500 text-white border-amber-500'} />
        </Row>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Left foot findings</p>
            <Pills opts={FOOT_FIND} values={footFindLeft} onToggle={v => toggleArr(setFootFindLeft, v)} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Right foot findings</p>
            <Pills opts={FOOT_FIND} values={footFindRight} onToggle={v => toggleArr(setFootFindRight, v)} />
          </div>
        </div>
        <Row label="Podiatry referral?">
          <SinglePill opts={['Yes — referred', 'Yes — under podiatry', 'No']} value={podRef} onSet={setPodRef} />
        </Row>
      </Gate>

      {/* CVD */}
      <Gate label="Established macrovascular / cardiovascular disease?" value={hasCVD} onChange={setHasCVD}>
        <Row label="Conditions present">
          <Pills opts={MACRO_LIST} values={cvdList} onToggle={v => toggleArr(setCvdList, v)} />
        </Row>
        {cvdList.includes('Peripheral Arterial Disease') && (
          <Row label="ABI (Ankle-Brachial Index)">
            <NumInput value={abi} onChange={setAbi} placeholder="e.g. 0.8" min={0} max={2} step={0.01} className="w-24" />
            {abi && <p className="text-xs text-gray-500 ml-2 inline">{parseFloat(abi) < 0.9 ? '⚠ Abnormal — PAD likely' : parseFloat(abi) > 1.3 ? '⚠ Non-compressible' : 'Normal'}</p>}
          </Row>
        )}
      </Gate>
    </div>
  )

  const renderComorbidities = () => (
    <div className="space-y-5">
      <SectionTitle text="Associated Conditions" />
      <Row label="Comorbidities present">
        <Pills opts={COMORBID_LIST} values={comorbids} onToggle={v => toggleArr(setComorbids, v)} />
      </Row>

      {comorbids.includes('Hypertension') && (
        <div className="ml-3 pl-3 border-l-2 border-amber-200 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Row label="Current blood pressure">
              <input type="text" value={bpValue} onChange={e => setBpValue(e.target.value)} placeholder="e.g. 138/88 mmHg"
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </Row>
            <Row label="BP controlled?">
              <SinglePill opts={['Yes (<130/80)', 'Borderline', 'No (>130/80)']} value={bpControlled} onSet={setBpControlled}
                active={bpControlled === 'No (>130/80)' ? 'bg-red-500 text-white border-red-500' : 'bg-amber-500 text-white border-amber-500'} />
            </Row>
          </div>
        </div>
      )}

      {comorbids.includes('Dyslipidaemia') && (
        <div className="ml-3 pl-3 border-l-2 border-amber-200 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Row label="LDL-C (mmol/L or mg/dL)">
              <NumInput value={ldl} onChange={setLdl} placeholder="e.g. 3.2" min={0} max={15} step={0.1} className="w-24" />
            </Row>
            <Row label="LDL target">
              <SinglePill opts={['<2.6 mmol/L (DM only)', '<1.8 mmol/L (+ CVD risk)', '<1.4 mmol/L (high CVD risk)']} value={ldlTarget} onSet={setLdlTarget} />
            </Row>
          </div>
        </div>
      )}

      {comorbids.includes('Obesity') && (
        <div className="ml-3 pl-3 border-l-2 border-amber-200 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Row label="BMI (kg/m²)">
              <NumInput value={bmi} onChange={setBmi} placeholder="e.g. 31.2" min={10} max={70} step={0.1} className="w-24" />
            </Row>
            <Row label="Waist circumference (cm)">
              <NumInput value={waist} onChange={setWaist} placeholder="e.g. 98" min={40} max={200} className="w-24" />
            </Row>
            <Row label="Weight trend">
              <SinglePill opts={['Stable', 'Gaining', 'Losing']} value={wtTrend} onSet={setWtTrend}
                active={wtTrend === 'Gaining' ? 'bg-red-500 text-white border-red-500' : wtTrend === 'Losing' ? 'bg-green-600 text-white border-green-600' : 'bg-amber-500 text-white border-amber-500'} />
            </Row>
          </div>
        </div>
      )}

      {(comorbids.includes('Hypothyroidism') || comorbids.includes('Hyperthyroidism')) && (
        <div className="ml-3 pl-3 border-l-2 border-amber-200 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Row label="TSH (mIU/L)">
              <NumInput value={tsh} onChange={setTsh} placeholder="e.g. 3.2" min={0} max={100} step={0.1} className="w-24" />
            </Row>
            <Row label="On levothyroxine?">
              <SinglePill opts={['Yes', 'No']} value={onThyroxine} onSet={setOnThyroxine} />
            </Row>
          </div>
        </div>
      )}
    </div>
  )

  const renderLifestyle = () => (
    <div className="space-y-5">
      <SectionTitle text="Diet" />
      <Row label="Diet type">
        <SinglePill opts={DIET_TYPE} value={dietType} onSet={setDietType} />
      </Row>
      <Row label="Dietary adherence">
        <SinglePill opts={DIET_ADH} value={dietAdh} onSet={setDietAdh}
          active={dietAdh === 'Poor adherence' ? 'bg-red-500 text-white border-red-500' : 'bg-amber-500 text-white border-amber-500'} />
      </Row>
      <Row label="Carbohydrate awareness / counting?">
        <SinglePill opts={['Yes — good understanding', 'Partial understanding', 'No — needs education']} value={carbAware} onSet={setCarbAware} />
      </Row>

      <SectionTitle text="Physical Activity" />
      <Row label="Activity level">
        <SinglePill opts={ACTIVITY} value={activityLevel} onSet={setActivityLevel} />
      </Row>
      {activityLevel && activityLevel !== 'Sedentary' && (
        <Row label="Type / frequency">
          <input type="text" value={actFreq} onChange={e => setActFreq(e.target.value)}
            placeholder="e.g. Walking 30min, 4 days/week"
            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </Row>
      )}

      <SectionTitle text="Risk Factors" />
      <div className="grid grid-cols-2 gap-4">
        <Row label="Smoking status">
          <SinglePill opts={['Never', 'Ex-smoker', 'Current']} value={smokingStatus} onSet={setSmokingStatus}
            active={smokingStatus === 'Current' ? 'bg-red-500 text-white border-red-500' : 'bg-amber-500 text-white border-amber-500'} />
        </Row>
        <div>
          <Row label="Alcohol">
            <SinglePill opts={['Never', 'Social / occasional', 'Regular']} value={alcoholStatus} onSet={setAlcoholStatus} />
          </Row>
          {alcoholStatus === 'Regular' && (
            <input type="text" value={alcoholUnits} onChange={e => setAlcoholUnits(e.target.value)}
              placeholder="units/week" className="mt-1.5 w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400" />
          )}
        </div>
        <Row label="Stress level">
          <SinglePill opts={STRESS} value={stressLevel} onSet={setStressLevel}
            active={stressLevel === 'High' || stressLevel === 'Very high' ? 'bg-red-500 text-white border-red-500' : 'bg-amber-500 text-white border-amber-500'} />
        </Row>
        <Row label="Sleep adequate?">
          <SinglePill opts={['Yes', 'No — insufficient', 'OSA suspected']} value={sleepAdequate} onSet={setSleepAdequate} />
        </Row>
      </div>
      <Row label="Shift work?">
        <SinglePill opts={['No', 'Yes — rotating shifts', 'Yes — night shift']} value={shiftWork} onSet={setShiftWork} />
      </Row>
    </div>
  )

  const renderPlan = () => (
    <div className="space-y-5">
      <SectionTitle text="Individualised Targets" />
      <div className="grid grid-cols-3 gap-3">
        <Row label="HbA1c target">
          <input type="text" value={hba1cTarget} onChange={e => setHba1cTarget(e.target.value)} placeholder="e.g. <7%"
            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </Row>
        <Row label="BP target">
          <input type="text" value={bpTarget} onChange={e => setBpTarget(e.target.value)} placeholder="e.g. <130/80"
            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </Row>
        <Row label="LDL-C target">
          <input type="text" value={ldlTargetPlan} onChange={e => setLdlTargetPlan(e.target.value)} placeholder="e.g. <1.8 mmol/L"
            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </Row>
      </div>

      {/* Auto-suggestions from data */}
      {autoSuggestions.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={13} className="text-amber-600" />
            <p className="text-xs font-bold text-amber-700">Auto-detected action items</p>
          </div>
          <ul className="space-y-1">
            {autoSuggestions.map((s, i) => (
              <li key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
                <span className="mt-0.5">•</span><span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Row label="Treatment changes planned">
        <textarea rows={3} value={planChanges} onChange={e => setPlanChanges(e.target.value)}
          placeholder="e.g. Increase metformin to 1g BD, add empagliflozin 10mg OD, refer ophthalmology…"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
      </Row>

      <Row label="Referrals">
        <Pills opts={REFERRALS} values={planReferrals} onToggle={v => toggleArr(setPlanReferrals, v)} />
      </Row>

      <Row label="Education topics for this visit">
        <Pills opts={EDU_TOPICS} values={planEdu} onToggle={v => toggleArr(setPlanEdu, v)} />
      </Row>

      <div className="grid grid-cols-2 gap-3">
        <Row label="Next review">
          <input type="date" value={nextReview} onChange={e => setNextReview(e.target.value)}
            className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </Row>
      </div>

      <Row label="Additional plan notes">
        <textarea rows={3} value={planNotes} onChange={e => setPlanNotes(e.target.value)}
          placeholder="Any other management notes…"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
      </Row>
    </div>
  )

  const stageContent = {
    profile: renderProfile, concern: renderConcern, symptoms: renderSymptoms,
    glycaemia: renderGlycaemia, medications: renderMedications,
    complications: renderComplications, comorbidities: renderComorbidities,
    lifestyle: renderLifestyle, plan: renderPlan,
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header + stage tabs */}
      <div className="shrink-0 px-6 pt-4 pb-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-amber-100 rounded-lg">
            <Droplets size={15} className="text-amber-600" />
          </div>
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">[A] Diabetes Assessment</span>
          {dmType && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">{dmType}</span>}
          {hba1cInfo && hba1c && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${hba1cInfo.color}`}>HbA1c {hba1c}%</span>
          )}
        </div>
        <div className="flex gap-0.5 overflow-x-auto pb-0">
          {STAGES.map(s => (
            <button key={s.key} type="button" onClick={() => setStage(s.key)}
              className={`px-3 py-2 rounded-t-lg text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                stage === s.key
                  ? 'border-amber-500 text-amber-700 bg-amber-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* Stage content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {stageContent[stage]?.()}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex gap-1.5">
          {STAGES.map((s, i) => (
            <button key={s.key} type="button" onClick={() => setStage(s.key)}
              title={s.label}
              className={`w-2 h-2 rounded-full transition-all ${stage === s.key ? 'bg-amber-500 scale-125' : 'bg-gray-200 hover:bg-amber-200'}`} />
          ))}
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Assessment'}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-500 px-6 pb-2">{error}</p>}
    </div>
  )
}
