/**
 * @shared-pool — standalone clinical assessment, portal-agnostic
 * @category obg
 * Antenatal Booking Assessment — First ANC Visit
 * Comprehensive: obstetric history, medical/family history, risk stratification,
 * examination, investigations, dating, counselling. Indian patient context.
 */
import { useState, useMemo } from 'react'
import { Baby, AlertTriangle } from 'lucide-react'
import api from '../../../api/client'

// ── Utility components ────────────────────────────────────────────────────────

function Pills({ options, value, onChange, multi = false, color = 'pink' }) {
  const active = multi ? (Array.isArray(value) ? value : []) : value
  const toggle = (o) => {
    if (multi) onChange(active.includes(o) ? active.filter(x => x !== o) : [...active, o])
    else onChange(active === o ? '' : o)
  }
  const cls = {
    pink:   'bg-pink-600 text-white border-pink-600',
    red:    'bg-red-500 text-white border-red-500',
    amber:  'bg-amber-500 text-white border-amber-500',
    green:  'bg-green-600 text-white border-green-600',
    blue:   'bg-blue-600 text-white border-blue-600',
    purple: 'bg-purple-600 text-white border-purple-600',
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button key={o} type="button" onClick={() => toggle(o)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            (multi ? active.includes(o) : active === o)
              ? (cls[color] || cls.pink)
              : 'bg-white text-gray-500 border-gray-200 hover:border-pink-300'
          }`}>{o}</button>
      ))}
    </div>
  )
}

function Gate({ label, value, onChange, children, yesLabel = 'Yes', noLabel = 'No', alert = false }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-1.5">
        <p className="text-sm font-medium text-gray-700 flex-1">{label}</p>
        <div className="flex gap-1.5">
          {[yesLabel, noLabel].map(opt => (
            <button key={opt} type="button" onClick={() => onChange(v => v === opt ? '' : opt)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                value === opt
                  ? opt === yesLabel
                    ? alert ? 'bg-red-500 text-white border-red-500' : 'bg-pink-500 text-white border-pink-500'
                    : 'bg-gray-400 text-white border-gray-400'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-pink-300'
              }`}>{opt}</button>
          ))}
        </div>
      </div>
      {value === yesLabel && children && (
        <div className="ml-4 pl-3 border-l-2 border-pink-200 space-y-3 mt-2">{children}</div>
      )}
    </div>
  )
}

function FL({ label, sub, children, required = false }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
        {sub && <span className="ml-1 font-normal text-gray-400 normal-case tracking-normal">{sub}</span>}
      </p>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder = '', type = 'text', min, max, className = '' }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} min={min} max={max}
      className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 ${className}`} />
  )
}

// ── Stage config ──────────────────────────────────────────────────────────────

const STAGES = [
  { id: 1, label: 'Personal' },
  { id: 2, label: 'Obstetric Hx' },
  { id: 3, label: 'Medical Hx' },
  { id: 4, label: 'This Pregnancy' },
  { id: 5, label: 'Examination' },
  { id: 6, label: 'Investigations' },
  { id: 7, label: 'Risk & Plan' },
]

// ── Risk scoring ──────────────────────────────────────────────────────────────

function riskLevel(flags) {
  const critical = flags.filter(f => f.critical).length
  const total    = flags.filter(f => f.active).length
  if (critical >= 1) return { level: 'High Risk', color: 'text-red-600', bg: 'bg-red-50 border-red-200' }
  if (total >= 2)    return { level: 'Moderate Risk', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' }
  if (total >= 1)    return { level: 'Low–Moderate Risk', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' }
  return { level: 'Low Risk', color: 'text-green-600', bg: 'bg-green-50 border-green-200' }
}

// ── Main form ─────────────────────────────────────────────────────────────────

export default function AntenatalBookingForm({ admission, onClose, onSaved }) {
  const [stage,  setStage]  = useState(1)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  // ── Stage 1: Personal & Social History ────────────────────────────────────
  const [age,           setAge]           = useState('')
  const [education,     setEducation]     = useState('')
  const [occupation,    setOccupation]    = useState('')
  const [husbandOcc,    setHusbandOcc]    = useState('')
  const [religion,      setReligion]      = useState('')
  const [dietType,      setDietType]      = useState('')
  const [socioeconomic, setSocioeconomic] = useState('')
  const [maritalStatus, setMaritalStatus] = useState('')
  const [maritalYears,  setMaritalYears]  = useState('')
  const [consanguinity, setConsanguinity] = useState('')
  const [consanguinityDegree, setConsanguinityDegree] = useState('')
  const [livingSituation,setLivingSituation] = useState('')
  const [supportSystem, setSupportSystem] = useState('')

  // ── Stage 2: Obstetric History ─────────────────────────────────────────────
  const [gravida,   setGravida]   = useState('')
  const [para,      setPara]      = useState('')
  const [living,    setLiving]    = useState('')
  const [abortions, setAbortions] = useState('')
  const [ectopic,   setEctopic]   = useState('')
  const [prevPregs, setPrevPregs] = useState([]) // array of {year, outcome, gest, mode, weight, complication}
  const [prevCsSection, setPrevCsSection] = useState('')
  const [csSections,    setCsSections]    = useState('')
  const [prevPPH,       setPrevPPH]       = useState('')
  const [prevPE,        setPrevPE]        = useState('')
  const [prevGDM,       setPrevGDM]       = useState('')
  const [prevCongenital,setPrevCongenital]= useState('')
  const [prevCongenitalDetails, setPrevCongenitalDetails] = useState('')
  const [prevNeonatalDeath, setPrevNeonatalDeath] = useState('')
  const [prevInfertility,   setPrevInfertility]   = useState('')
  const [infertilityTx,     setInfertilityTx]     = useState([])
  const [obHistoryNotes,    setObHistoryNotes]    = useState('')

  // ── Stage 3: Medical / Family / Menstrual History ─────────────────────────
  const [lmp,         setLmp]         = useState('')
  const [cycleLength, setCycleLength] = useState('28')
  const [cycleDuration,setCycleDuration] = useState('5')
  const [cycleRegular,setCycleRegular]   = useState('')
  const [dysmenorrhea, setDysmenorrhea]  = useState('')
  const [contraceptionPrev, setContraceptionPrev] = useState([])
  const [medHistory,  setMedHistory]  = useState([])
  const [medHistoryNotes, setMedHistoryNotes] = useState('')
  const [surgHistory, setSurgHistory] = useState('')
  const [surgDetails, setSurgDetails] = useState('')
  const [allergies,   setAllergies]   = useState('')
  const [allergyDetails, setAllergyDetails] = useState('')
  const [currentMeds, setCurrentMeds] = useState('')
  const [familyHx,    setFamilyHx]    = useState([])
  const [familyHxNotes, setFamilyHxNotes] = useState('')
  const [smoking,     setSmoking]     = useState('')
  const [alcohol,     setAlcohol]     = useState('')
  const [tobaccoChewing,setTobaccoChewing]= useState('')
  const [substanceUse,  setSubstanceUse]  = useState('')

  // ── Stage 4: Current Pregnancy ────────────────────────────────────────────
  const [eddByLmp,    setEddByLmp]    = useState('')
  const [eddByUsound, setEddByUsound] = useState('')
  const [eddFinal,    setEddFinal]    = useState('')
  const [gestWeeks,   setGestWeeks]   = useState('')
  const [gestDays,    setGestDays]    = useState('')
  const [conceptionMode, setConceptionMode] = useState('')
  const [earlyUSG,    setEarlyUSG]    = useState('')
  const [earlyUSGDate,setEarlyUSGDate]= useState('')
  const [earlyUSGGA,  setEarlyUSGGA]  = useState('')
  const [currentComplaints, setCurrentComplaints] = useState([])
  const [nausea,      setNausea]      = useState('')
  const [vomiting,    setVomiting]    = useState('')
  const [fetalMovements, setFetalMovements] = useState('')
  const [fetalMovementsAge, setFetalMovementsAge] = useState('')
  const [bleedingPV,  setBleedingPV]  = useState('')
  const [dischargeType, setDischargeType] = useState('')
  const [urinarySymptoms, setUrinarySymptoms] = useState([])
  const [prevANCDone, setPrevANCDone] = useState('')
  const [prevANCWhere,setPrevANCWhere]= useState('')

  // ── Stage 5: Examination ──────────────────────────────────────────────────
  const [weight,       setWeight]       = useState('')
  const [heightCm,     setHeightCm]     = useState('')
  const [bmi,          setBmi]          = useState('')
  const [bp,           setBp]           = useState('')
  const [pulse,        setPulse]        = useState('')
  const [temp,         setTemp]         = useState('')
  const [pallor,       setPallor]       = useState('')
  const [icterus,      setIcterus]      = useState('')
  const [oedema,       setOedema]       = useState('')
  const [oedemaGrade,  setOedemaGrade]  = useState('')
  const [lymphNodes,   setLymphNodes]   = useState('')
  const [thyroid,      setThyroid]      = useState('')
  const [varicosities, setVaricosities] = useState('')
  // Abdominal
  const [uterusSize,   setUterusSize]   = useState('')
  const [fundusHeight, setFundusHeight] = useState('')
  const [presentation, setPresentation] = useState('')
  const [engagement,   setEngagement]   = useState('')
  const [fetalHR,      setFetalHR]      = useState('')
  const [liquor,       setLiquor]       = useState('')
  const [uterineScar,  setUterineScar]  = useState('')
  // PV / Speculum (if indicated)
  const [pvDone,       setPvDone]       = useState('')
  const [cervix,       setCervix]       = useState('')
  const [os,           setOs]           = useState('')
  const [discharge,    setDischarge]    = useState('')
  const [pelvicAdequacy, setPelvicAdequacy] = useState('')

  // ── Stage 6: Investigations ───────────────────────────────────────────────
  const [hb,          setHb]          = useState('')
  const [bloodGroup,  setBloodGroup]  = useState('')
  const [rhFactor,    setRhFactor]    = useState('')
  const [ict,         setIct]         = useState('')
  const [rbs,         setRbs]         = useState('')
  const [ogtt,        setOgtt]        = useState('')
  const [ogttResult,  setOgttResult]  = useState('')
  const [urine,       setUrine]       = useState([])
  const [vdrl,        setVdrl]        = useState('')
  const [hiv,         setHiv]         = useState('')
  const [hbsag,       setHbsag]       = useState('')
  const [hcv,         setHcv]         = useState('')
  const [tsh,         setTsh]         = useState('')
  const [rubella,     setRubella]     = useState('')
  const [hemoglobinopathy, setHemoglobinopathy] = useState('')
  const [sickling,    setSickling]    = useState('')
  const [ntScan,      setNtScan]      = useState('')
  const [ntMeasure,   setNtMeasure]   = useState('')
  const [doubleMarker,setDoubleMarker]= useState('')
  const [tripleMarker,setTripleMarker]= useState('')
  const [quadMarker,  setQuadMarker]  = useState('')
  const [anomalyScan, setAnomalyScan] = useState('')
  const [anomalyScanResult, setAnomalyScanResult] = useState('')
  const [cervicalLength, setCervicalLength] = useState('')
  const [doppler,     setDoppler]     = useState('')
  const [investigationNotes, setInvestigationNotes] = useState('')

  // ── Stage 7: Risk Stratification & Plan ──────────────────────────────────
  const [ironSupplement, setIronSupplement] = useState('')
  const [folicAcid,      setFolicAcid]      = useState('')
  const [calcium,        setCalcium]        = useState('')
  const [vitD,           setVitD]           = useState('')
  const [aspirin,        setAspirin]        = useState('')
  const [aspirinDose,    setAspirinDose]    = useState('')
  const [referrals,      setReferrals]      = useState([])
  const [birthPlan,      setBirthPlan]      = useState('')
  const [placeOfDelivery,setPlaceOfDelivery]= useState('')
  const [counsellingTopics,setCounsellingTopics] = useState([])
  const [nextANCDate,    setNextANCDate]    = useState('')
  const [nextANCWeeks,   setNextANCWeeks]   = useState('')
  const [planNotes,      setPlanNotes]      = useState('')

  // ── BMI auto-calc ─────────────────────────────────────────────────────────
  const calcBmi = useMemo(() => {
    const w = parseFloat(weight), h = parseFloat(heightCm) / 100
    if (w && h) return (w / (h * h)).toFixed(1)
    return ''
  }, [weight, heightCm])

  // ── EDD by LMP ────────────────────────────────────────────────────────────
  const calcEddLmp = useMemo(() => {
    if (!lmp) return ''
    const d = new Date(lmp)
    d.setDate(d.getDate() + 280)
    return d.toISOString().slice(0, 10)
  }, [lmp])

  // ── Gestational age ───────────────────────────────────────────────────────
  const calcGA = useMemo(() => {
    const ref = eddFinal || calcEddLmp
    if (!ref) return null
    const today = new Date()
    const edd   = new Date(ref)
    const diffDays = Math.round((edd - today) / 86400000)
    const daysPreg  = 280 - diffDays
    if (daysPreg < 0) return null
    return { weeks: Math.floor(daysPreg / 7), days: daysPreg % 7 }
  }, [eddFinal, calcEddLmp])

  // ── Risk flags ────────────────────────────────────────────────────────────
  const riskFlags = useMemo(() => {
    const flags = []
    const addAge = parseFloat(age)
    if (addAge < 18) flags.push({ label: 'Age <18 (teenage pregnancy)', critical: true, active: true })
    if (addAge >= 35) flags.push({ label: 'Age ≥35 (advanced maternal age)', critical: false, active: true })
    if (calcBmi && parseFloat(calcBmi) >= 30) flags.push({ label: `Obesity (BMI ${calcBmi})`, critical: false, active: true })
    if (calcBmi && parseFloat(calcBmi) < 18.5) flags.push({ label: `Underweight (BMI ${calcBmi})`, critical: false, active: true })
    if (prevCsSection === 'Yes') flags.push({ label: `Previous CS (${csSections || '?'} section${parseInt(csSections) > 1 ? 's' : ''}) — VBAC or repeat CS decision`, critical: parseInt(csSections) >= 2, active: true })
    if (prevPPH === 'Yes') flags.push({ label: 'Previous postpartum haemorrhage', critical: true, active: true })
    if (prevPE === 'Yes') flags.push({ label: 'Previous pre-eclampsia — aspirin prophylaxis', critical: true, active: true })
    if (prevGDM === 'Yes') flags.push({ label: 'Previous GDM — early OGTT indicated', critical: false, active: true })
    if (prevCongenital === 'Yes') flags.push({ label: 'Previous congenital anomaly — genetic counselling', critical: false, active: true })
    if (prevNeonatalDeath === 'Yes') flags.push({ label: 'Previous neonatal death', critical: true, active: true })
    if (medHistory.includes('Hypertension')) flags.push({ label: 'Chronic hypertension', critical: true, active: true })
    if (medHistory.includes('Diabetes mellitus (Type 1 or 2)')) flags.push({ label: 'Pre-existing diabetes', critical: true, active: true })
    if (medHistory.includes('Hypothyroidism')) flags.push({ label: 'Hypothyroidism — TSH monitoring', critical: false, active: true })
    if (medHistory.includes('Epilepsy / seizure disorder')) flags.push({ label: 'Epilepsy — antiepileptic drug review', critical: true, active: true })
    if (medHistory.includes('Cardiac disease')) flags.push({ label: 'Cardiac disease — high-risk pregnancy', critical: true, active: true })
    if (medHistory.includes('Autoimmune / Lupus (SLE)')) flags.push({ label: 'Autoimmune / SLE — maternal and fetal monitoring', critical: true, active: true })
    if (rhFactor === 'Rh Negative') flags.push({ label: 'Rh negative — anti-D prophylaxis planning', critical: false, active: true })
    if (hiv === 'Reactive') flags.push({ label: 'HIV reactive — PMTCT protocol', critical: true, active: true })
    if (vdrl === 'Reactive') flags.push({ label: 'VDRL reactive — syphilis treatment', critical: true, active: true })
    if (hbsag === 'Reactive') flags.push({ label: 'HBsAg positive — neonatal immunoprophylaxis plan', critical: false, active: true })
    if (hemoglobinopathy === 'Abnormal') flags.push({ label: 'Haemoglobinopathy — partner testing, genetic counselling', critical: true, active: true })
    if (consanguinity === 'Yes') flags.push({ label: `Consanguineous marriage (${consanguinityDegree || '?'}) — anomaly scan + genetic counselling`, critical: false, active: true })
    if (conceptionMode === 'ART / IVF' || conceptionMode === 'Ovulation induction') flags.push({ label: 'ART / assisted conception — higher risk of multiple, preterm', critical: false, active: true })
    if (parseInt(gravida) >= 5) flags.push({ label: 'Grand multipara (G5+) — atony/PPH risk', critical: false, active: true })
    if (hb && parseFloat(hb) < 7) flags.push({ label: `Severe anaemia (Hb ${hb} g/dL)`, critical: true, active: true })
    else if (hb && parseFloat(hb) < 10) flags.push({ label: `Moderate anaemia (Hb ${hb} g/dL)`, critical: false, active: true })
    return flags
  }, [age, calcBmi, prevCsSection, csSections, prevPPH, prevPE, prevGDM, prevCongenital,
      prevNeonatalDeath, medHistory, rhFactor, hiv, vdrl, hbsag, hemoglobinopathy,
      consanguinity, consanguinityDegree, conceptionMode, gravida, hb])

  const risk = useMemo(() => riskLevel(riskFlags), [riskFlags])

  // ── Stage done dots ───────────────────────────────────────────────────────
  const stageDone = useMemo(() => ({
    1: !!(age || occupation),
    2: !!(gravida || para),
    3: !!(lmp),
    4: !!(eddFinal || calcEddLmp || gestWeeks),
    5: !!(weight || bp),
    6: !!(hb || bloodGroup),
    7: !!(planNotes || nextANCDate || referrals.length),
  }), [age, occupation, gravida, para, lmp, eddFinal, calcEddLmp, gestWeeks, weight, bp, hb, bloodGroup, planNotes, nextANCDate, referrals])

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true); setError('')
    const ga = calcGA
    const payload = {
      type: 'antenatal_booking',
      personal_social: {
        age, education, occupation, husband_occupation: husbandOcc,
        religion, diet_type: dietType, socioeconomic_status: socioeconomic,
        marital_status: maritalStatus, years_married: maritalYears,
        consanguinity: { present: consanguinity, degree: consanguinityDegree },
        living_situation: livingSituation, support_system: supportSystem,
        smoking, alcohol, tobacco_chewing: tobaccoChewing, substance_use: substanceUse,
      },
      obstetric_history: {
        gravida, para, living, abortions, ectopic,
        previous_cs: { present: prevCsSection, count: csSections },
        previous_pph: prevPPH, previous_pe: prevPE,
        previous_gdm: prevGDM,
        previous_congenital: { present: prevCongenital, details: prevCongenitalDetails },
        previous_neonatal_death: prevNeonatalDeath,
        infertility: { present: prevInfertility, treatment: infertilityTx },
        notes: obHistoryNotes,
      },
      menstrual_history: {
        lmp, cycle_length: cycleLength, cycle_duration: cycleDuration,
        regular: cycleRegular, dysmenorrhea,
        previous_contraception: contraceptionPrev,
      },
      medical_history: {
        conditions: medHistory, notes: medHistoryNotes,
        surgical_history: { present: surgHistory, details: surgDetails },
        allergies: { present: allergies, details: allergyDetails },
        current_medications: currentMeds,
        family_history: { conditions: familyHx, notes: familyHxNotes },
      },
      current_pregnancy: {
        edd_by_lmp: calcEddLmp, edd_by_ultrasound: eddByUsound,
        edd_final: eddFinal,
        gestational_age: ga ? `${ga.weeks}w ${ga.days}d` : `${gestWeeks}w ${gestDays}d`,
        conception_mode: conceptionMode,
        early_usg: { done: earlyUSG, date: earlyUSGDate, ga: earlyUSGGA },
        complaints: currentComplaints,
        nausea, vomiting,
        fetal_movements: { present: fetalMovements, felt_at_weeks: fetalMovementsAge },
        bleeding_pv: bleedingPV, discharge: dischargeType,
        urinary_symptoms: urinarySymptoms,
        previous_anc: { done: prevANCDone, where: prevANCWhere },
      },
      examination: {
        weight_kg: weight, height_cm: heightCm, bmi: calcBmi || bmi,
        bp, pulse, temperature: temp,
        general: { pallor, icterus, oedema, oedema_grade: oedemaGrade, lymph_nodes: lymphNodes, thyroid, varicosities },
        obstetric: {
          uterus_size: uterusSize, fundal_height_cm: fundusHeight,
          presentation, engagement, fetal_hr: fetalHR, liquor, uterine_scar: uterineScar,
        },
        pv: { done: pvDone, cervix, os, discharge, pelvic_adequacy: pelvicAdequacy },
      },
      investigations: {
        haemoglobin: hb, blood_group: bloodGroup, rh_factor: rhFactor, ict,
        rbs, ogtt: { done: ogtt, result: ogttResult },
        urine_re: urine, vdrl, hiv, hbsag, hcv, tsh, rubella,
        haemoglobinopathy, sickling,
        usg: {
          nt_scan: { done: ntScan, nt_measurement: ntMeasure },
          double_marker: doubleMarker, triple_marker: tripleMarker, quad_marker: quadMarker,
          anomaly_scan: { done: anomalyScan, result: anomalyScanResult },
          cervical_length: cervicalLength, doppler,
        },
        notes: investigationNotes,
      },
      risk_stratification: {
        flags: riskFlags.map(f => f.label),
        overall_risk: risk.level,
      },
      plan: {
        supplements: {
          iron: ironSupplement, folic_acid: folicAcid, calcium,
          vitamin_d: vitD, aspirin: { prescribed: aspirin, dose: aspirinDose },
        },
        referrals, birth_plan: birthPlan, place_of_delivery: placeOfDelivery,
        counselling_topics: counsellingTopics,
        next_anc: { date: nextANCDate, weeks: nextANCWeeks },
        notes: planNotes,
      },
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

  // ── Stage renders ─────────────────────────────────────────────────────────

  const renderStage1 = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <FL label="Maternal age" required><Input type="number" value={age} onChange={setAge} placeholder="e.g. 26" min={10} max={60} /></FL>
        <FL label="Education">
          <Pills options={['Illiterate', 'Primary', 'Secondary (10th)', 'HSC (12th)', 'Graduate', 'Postgraduate']}
            value={education} onChange={setEducation} />
        </FL>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FL label="Patient occupation"><Input value={occupation} onChange={setOccupation} placeholder="e.g. Housewife, Teacher…" /></FL>
        <FL label="Husband's occupation"><Input value={husbandOcc} onChange={setHusbandOcc} placeholder="e.g. Farmer, Labourer…" /></FL>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FL label="Religion">
          <Pills options={['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other']}
            value={religion} onChange={setReligion} />
        </FL>
        <FL label="Dietary preference">
          <Pills options={['Vegetarian', 'Eggetarian', 'Non-vegetarian']} value={dietType} onChange={setDietType} />
        </FL>
      </div>

      <FL label="Socioeconomic status" sub="Modified Kuppuswamy scale">
        <Pills options={['Upper (Class I)', 'Upper middle (Class II)', 'Lower middle (Class III)', 'Upper lower (Class IV)', 'Lower (Class V)']}
          value={socioeconomic} onChange={setSocioeconomic} />
      </FL>

      <div className="grid grid-cols-2 gap-4">
        <FL label="Marital status">
          <Pills options={['Married', 'Unmarried', 'Widowed', 'Separated']} value={maritalStatus} onChange={setMaritalStatus} />
        </FL>
        <FL label="Years married"><Input type="number" value={maritalYears} onChange={setMaritalYears} placeholder="e.g. 3" min={0} /></FL>
      </div>

      <Gate label="Consanguineous marriage?" value={consanguinity} onChange={setConsanguinity}>
        <FL label="Degree of relation">
          <Pills options={['First cousins (first degree)', 'Second cousins', 'Uncle–niece', 'Other']}
            value={consanguinityDegree} onChange={setConsanguinityDegree} />
        </FL>
      </Gate>

      <FL label="Living situation">
        <Pills options={['Joint family', 'Nuclear family', 'With parents', 'Alone', 'Migrant / away from home']}
          value={livingSituation} onChange={setLivingSituation} />
      </FL>

      <FL label="Family support system">
        <Pills options={['Good — husband + family support', 'Moderate — some support', 'Poor — minimal support', 'No support / domestic issues']}
          value={supportSystem} onChange={setSupportSystem} />
      </FL>

      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Substance Use</p>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Smoking">
            <Pills options={['Never', 'Current', 'Ex-smoker']} value={smoking} onChange={setSmoking} />
          </FL>
          <FL label="Alcohol">
            <Pills options={['None', 'Occasional', 'Regular']} value={alcohol} onChange={setAlcohol} />
          </FL>
          <FL label="Tobacco chewing">
            <Pills options={['None', 'Current', 'Ex-user']} value={tobaccoChewing} onChange={setTobaccoChewing} />
          </FL>
          <FL label="Other substance use">
            <Pills options={['None', 'Present']} value={substanceUse} onChange={setSubstanceUse} />
          </FL>
        </div>
      </div>
    </div>
  )

  const renderStage2 = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Gravida', val: gravida, set: setGravida },
          { label: 'Para',    val: para,    set: setPara    },
          { label: 'Living',  val: living,  set: setLiving  },
          { label: 'Abortions', val: abortions, set: setAbortions },
        ].map(({ label, val, set }) => (
          <FL key={label} label={label}>
            <input type="number" value={val} onChange={e => set(e.target.value)} min={0}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-pink-400" />
          </FL>
        ))}
      </div>

      <Gate label="Any ectopic pregnancy?" value={ectopic} onChange={setEctopic} alert>
        <p className="text-xs text-gray-500">Document side, management, and tubal status.</p>
        <Input value={''} onChange={() => {}} placeholder="Details…" />
      </Gate>

      <Gate label="Previous caesarean section?" value={prevCsSection} onChange={setPrevCsSection}>
        <FL label="Number of CS">
          <Pills options={['1', '2', '3 or more']} value={csSections} onChange={setCsSections} />
        </FL>
        <FL label="Type of uterine incision">
          <Pills options={['Lower segment (LSCS)', 'Classical (upper segment)', 'Not known']}
            value={uterineScar} onChange={setUterineScar} />
        </FL>
      </Gate>

      <Gate label="Previous postpartum haemorrhage (PPH)?" value={prevPPH} onChange={setPrevPPH} alert />
      <Gate label="Previous pre-eclampsia / eclampsia?" value={prevPE} onChange={setPrevPE} alert />
      <Gate label="Previous gestational diabetes (GDM)?" value={prevGDM} onChange={setPrevGDM} />
      <Gate label="Previous congenitally abnormal baby?" value={prevCongenital} onChange={setPrevCongenital}>
        <FL label="Details">
          <Input value={prevCongenitalDetails} onChange={setPrevCongenitalDetails} placeholder="Type of anomaly, chromosomal diagnosis…" />
        </FL>
      </Gate>
      <Gate label="Previous neonatal / perinatal death?" value={prevNeonatalDeath} onChange={setPrevNeonatalDeath} alert />

      <Gate label="History of infertility?" value={prevInfertility} onChange={setPrevInfertility}>
        <FL label="Infertility treatment">
          <Pills multi options={['OI — Clomiphene / Letrozole', 'IUI', 'IVF', 'ICSI', 'Donor egg', 'Donor sperm', 'Surrogacy']}
            value={infertilityTx} onChange={setInfertilityTx} />
        </FL>
      </Gate>

      <FL label="Previous contraception used">
        <Pills multi options={['None', 'Combined OCP', 'Progesterone-only pill', 'Injectable (Depo-Provera)', 'Cu-IUD (Copper-T)', 'LNG-IUS (Mirena)', 'Barrier (condom)', 'Tubal ligation — reversal', 'Vasectomy reversal', 'Natural / rhythm method']}
          value={contraceptionPrev} onChange={setContraceptionPrev} />
      </FL>

      <FL label="Obstetric history notes">
        <textarea rows={2} value={obHistoryNotes} onChange={e => setObHistoryNotes(e.target.value)}
          placeholder="Details of previous pregnancies — year, gestation, mode of delivery, birth weight, complications…"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none" />
      </FL>
    </div>
  )

  const renderStage3 = () => (
    <div className="space-y-5">
      <div className="border border-pink-100 rounded-xl p-4 space-y-4 bg-pink-50/20">
        <p className="text-xs font-bold text-pink-600 uppercase tracking-wide">Menstrual History</p>
        <FL label="Last menstrual period (LMP)" required>
          <input type="date" value={lmp} onChange={e => setLmp(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
        </FL>
        {calcEddLmp && (
          <div className="bg-white border border-pink-200 rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-gray-500">EDD by LMP (Naegele's rule)</span>
            <span className="text-sm font-bold text-pink-600">{calcEddLmp}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <FL label="Cycle length" sub="(days)">
            <Input type="number" value={cycleLength} onChange={setCycleLength} placeholder="28" min={20} max={45} />
          </FL>
          <FL label="Menstrual duration" sub="(days)">
            <Input type="number" value={cycleDuration} onChange={setCycleDuration} placeholder="5" min={1} max={10} />
          </FL>
        </div>
        <FL label="Cycle regularity">
          <Pills options={['Regular', 'Irregular', 'Variable']} value={cycleRegular} onChange={setCycleRegular} />
        </FL>
        <FL label="Dysmenorrhoea">
          <Pills options={['None', 'Mild', 'Moderate', 'Severe']} value={dysmenorrhea} onChange={setDysmenorrhea} />
        </FL>
      </div>

      <FL label="Medical conditions (past or present)">
        <Pills multi options={[
          'Hypertension', 'Diabetes mellitus (Type 1 or 2)', 'Hypothyroidism', 'Hyperthyroidism',
          'Anaemia (chronic)', 'Thalassaemia trait / disease', 'Sickle cell trait / disease',
          'Epilepsy / seizure disorder', 'Asthma / respiratory', 'Cardiac disease',
          'Rheumatic heart disease', 'Renal disease / CKD', 'Liver disease / Hepatitis',
          'Autoimmune / Lupus (SLE)', 'Antiphospholipid syndrome (APS)',
          'Tuberculosis (TB) — active or past', 'HIV', 'Psychiatric disorder',
          'Deep vein thrombosis (DVT)', 'Thrombophilia',
          'PCOS (polycystic ovary syndrome)', 'Uterine fibroids', 'Ovarian cyst',
          'Cervical / uterine surgery', 'Previous laparoscopy',
        ]}
          value={medHistory} onChange={setMedHistory} />
      </FL>

      <FL label="Medical history details">
        <textarea rows={2} value={medHistoryNotes} onChange={e => setMedHistoryNotes(e.target.value)}
          placeholder="Duration, current control, medications, complications…"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none" />
      </FL>

      <Gate label="Previous surgery?" value={surgHistory} onChange={setSurgHistory}>
        <FL label="Surgical details">
          <textarea rows={2} value={surgDetails} onChange={e => setSurgDetails(e.target.value)}
            placeholder="Type of surgery, year, any abdominal / pelvic surgery…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none" />
        </FL>
      </Gate>

      <Gate label="Known drug allergies?" value={allergies} onChange={setAllergies} alert>
        <FL label="Allergy details">
          <Input value={allergyDetails} onChange={setAllergyDetails} placeholder="Drug name and reaction…" />
        </FL>
      </Gate>

      <FL label="Current medications"><Input value={currentMeds} onChange={setCurrentMeds} placeholder="e.g. Levothyroxine 50mcg, Labetalol 100mg BD…" /></FL>

      <FL label="Family history">
        <Pills multi options={[
          'Hypertension', 'Diabetes mellitus', 'Pre-eclampsia / eclampsia',
          'Multiple pregnancy (twins)', 'Thalassaemia / sickle cell', 'Congenital anomaly',
          'Chromosomal disorder (Down syndrome etc)', 'Genetic disease',
          'Mental illness', 'Breast / gynaecological cancer',
        ]}
          value={familyHx} onChange={setFamilyHx} />
      </FL>
      <FL label="Family history notes">
        <Input value={familyHxNotes} onChange={setFamilyHxNotes} placeholder="Who affected, which condition, confirmed by testing…" />
      </FL>
    </div>
  )

  const renderStage4 = () => (
    <div className="space-y-5">
      <div className="border border-pink-100 rounded-xl p-4 space-y-4 bg-pink-50/20">
        <p className="text-xs font-bold text-pink-600 uppercase tracking-wide">Dating & EDD</p>

        <FL label="Conception mode">
          <Pills options={['Spontaneous', 'Ovulation induction', 'IUI', 'ART / IVF', 'ICSI']}
            value={conceptionMode} onChange={setConceptionMode} />
        </FL>

        <Gate label="Early ultrasound done (before 14 weeks)?" value={earlyUSG} onChange={setEarlyUSG}>
          <div className="grid grid-cols-2 gap-3">
            <FL label="USG date"><input type="date" value={earlyUSGDate} onChange={e => setEarlyUSGDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" /></FL>
            <FL label="GA at USG"><Input value={earlyUSGGA} onChange={setEarlyUSGGA} placeholder="e.g. 8w 3d" /></FL>
          </div>
          <FL label="EDD by ultrasound">
            <input type="date" value={eddByUsound} onChange={e => setEddByUsound(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
          </FL>
        </Gate>

        <FL label="EDD (final / working)">
          <input type="date" value={eddFinal} onChange={e => setEddFinal(e.target.value)}
            className="w-full px-3 py-2 border border-pink-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 font-semibold" />
        </FL>

        {(eddFinal || calcEddLmp) && calcGA && (
          <div className="bg-white border border-pink-200 rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-gray-500">Current gestational age</span>
            <span className="text-sm font-bold text-pink-600">{calcGA.weeks} weeks {calcGA.days} days</span>
          </div>
        )}

        {!calcGA && (
          <div className="grid grid-cols-2 gap-4">
            <FL label="Gestational age (weeks)"><Input type="number" value={gestWeeks} onChange={setGestWeeks} placeholder="e.g. 12" /></FL>
            <FL label="Days"><Input type="number" value={gestDays} onChange={setGestDays} placeholder="0–6" min={0} max={6} /></FL>
          </div>
        )}
      </div>

      <FL label="Current complaints">
        <Pills multi options={[
          'None', 'Nausea', 'Vomiting', 'Excessive vomiting (hyperemesis)',
          'Heartburn / reflux', 'Constipation', 'Headache', 'Backache',
          'Leg cramps', 'Breast tenderness', 'Urinary frequency', 'Urinary burning (UTI symptoms)',
          'Vaginal discharge', 'Bleeding PV', 'Abdominal pain', 'Reduced fetal movements',
          'Swelling feet / face', 'Breathlessness', 'Fatigue / weakness',
        ]}
          value={currentComplaints} onChange={setCurrentComplaints} />
      </FL>

      {currentComplaints.includes('Bleeding PV') && (
        <FL label="Bleeding PV — details">
          <Pills options={['Spotting only', 'Mild (staining)', 'Moderate', 'Heavy', 'With pain', 'Painless']}
            value={bleedingPV} onChange={setBleedingPV} color="red" />
        </FL>
      )}

      {currentComplaints.includes('Vaginal discharge') && (
        <FL label="Discharge type">
          <Pills options={['White/clear (physiological)', 'Yellow / purulent', 'Foul smelling', 'Curd-like (candidal)', 'Watery (possible PROM)']}
            value={dischargeType} onChange={setDischargeType} />
        </FL>
      )}

      {currentComplaints.includes('Urinary frequency') || currentComplaints.includes('Urinary burning (UTI symptoms)') ? (
        <FL label="Urinary symptoms">
          <Pills multi options={['Frequency', 'Urgency', 'Dysuria / burning', 'Haematuria', 'Reduced urine output', 'Incontinence']}
            value={urinarySymptoms} onChange={setUrinarySymptoms} />
        </FL>
      ) : null}

      {calcGA && calcGA.weeks >= 18 && (
        <Gate label="Fetal movements felt?" value={fetalMovements} onChange={setFetalMovements}>
          <FL label="First felt at (weeks)">
            <Input type="number" value={fetalMovementsAge} onChange={setFetalMovementsAge} placeholder="e.g. 20" />
          </FL>
        </Gate>
      )}

      <Gate label="Previous ANC done elsewhere?" value={prevANCDone} onChange={setPrevANCDone}>
        <FL label="Where seen"><Input value={prevANCWhere} onChange={setPrevANCWhere} placeholder="Hospital / clinic name and city…" /></FL>
      </Gate>
    </div>
  )

  const renderStage5 = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <FL label="Weight" sub="(kg)"><Input type="number" value={weight} onChange={setWeight} placeholder="55" /></FL>
        <FL label="Height" sub="(cm)"><Input type="number" value={heightCm} onChange={setHeightCm} placeholder="155" /></FL>
        <FL label="BMI">
          <div className={`px-3 py-2 border rounded-lg text-sm font-bold text-center ${
            calcBmi
              ? parseFloat(calcBmi) < 18.5 ? 'border-yellow-300 text-yellow-700 bg-yellow-50'
              : parseFloat(calcBmi) >= 30    ? 'border-red-300 text-red-700 bg-red-50'
              : 'border-green-300 text-green-700 bg-green-50'
              : 'border-gray-200 text-gray-400'
          }`}>{calcBmi || '—'}</div>
        </FL>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <FL label="Blood pressure" sub="(mmHg)"><Input value={bp} onChange={setBp} placeholder="120/80" /></FL>
        <FL label="Pulse" sub="(bpm)"><Input type="number" value={pulse} onChange={setPulse} placeholder="82" /></FL>
        <FL label="Temperature" sub="(°F)"><Input type="number" value={temp} onChange={setTemp} placeholder="98.6" /></FL>
      </div>

      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">General Examination</p>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Pallor">
            <Pills options={['Absent', 'Mild', 'Moderate', 'Severe']} value={pallor} onChange={setPallor} />
          </FL>
          <FL label="Icterus">
            <Pills options={['Absent', 'Present']} value={icterus} onChange={setIcterus} />
          </FL>
          <FL label="Oedema">
            <Pills options={['Absent', 'Present']} value={oedema} onChange={setOedema} />
          </FL>
          {oedema === 'Present' && (
            <FL label="Oedema grade">
              <Pills options={['+ (ankle only)', '++ (up to knee)', '+++ (up to thigh)', '++++ (generalised / anasarca)']}
                value={oedemaGrade} onChange={setOedemaGrade} color="amber" />
            </FL>
          )}
          <FL label="Lymph nodes">
            <Pills options={['Not palpable', 'Palpable — cervical', 'Palpable — inguinal', 'Palpable — axillary']}
              value={lymphNodes} onChange={setLymphNodes} />
          </FL>
          <FL label="Thyroid">
            <Pills options={['Normal', 'Goitre present', 'Nodule']} value={thyroid} onChange={setThyroid} />
          </FL>
          <FL label="Varicosities">
            <Pills options={['Absent', 'Lower limb', 'Vulval', 'Both']} value={varicosities} onChange={setVaricosities} />
          </FL>
        </div>
      </div>

      <div className="border border-pink-100 rounded-xl p-4 space-y-4 bg-pink-50/10">
        <p className="text-xs font-bold text-pink-600 uppercase tracking-wide">Obstetric Examination</p>
        <div className="grid grid-cols-2 gap-4">
          <FL label="Uterus size">
            <Pills options={['Not palpable', '8 weeks', '10 weeks', '12 weeks', '16 weeks', '20 weeks', '24 weeks', '28 weeks', '32 weeks', '34 weeks', '36 weeks', '38 weeks', '40 weeks']}
              value={uterusSize} onChange={setUterusSize} />
          </FL>
          <FL label="Fundal height" sub="(cm)">
            <Input type="number" value={fundusHeight} onChange={setFundusHeight} placeholder="e.g. 28" />
          </FL>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FL label="Presentation">
            <Pills options={['Cephalic', 'Breech', 'Transverse', 'Oblique', 'Not determinable']}
              value={presentation} onChange={setPresentation} />
          </FL>
          <FL label="Engagement">
            <Pills options={['Not engaged', '5/5 (floating)', '4/5', '3/5', '2/5 (engaged)', '1/5', '0/5 (deeply engaged)']}
              value={engagement} onChange={setEngagement} />
          </FL>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FL label="Fetal heart rate" sub="(bpm)">
            <Input type="number" value={fetalHR} onChange={setFetalHR} placeholder="e.g. 148" />
          </FL>
          <FL label="Liquor (clinical)">
            <Pills options={['Adequate', 'Reduced (oligohydramnios)', 'Excess (polyhydramnios)', 'Not assessed']}
              value={liquor} onChange={setLiquor} />
          </FL>
        </div>
      </div>

      <Gate label="Per vaginum / speculum examination done?" value={pvDone} onChange={setPvDone}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Cervix">
            <Pills options={['Uneffaced', 'Partially effaced', 'Fully effaced', 'Healthy (speculum)', 'Erosion', 'Polyp']}
              value={cervix} onChange={setCervix} />
          </FL>
          <FL label="External os">
            <Pills options={['Closed', 'Admits fingertip', '1 cm', '2 cm', '3+ cm']}
              value={os} onChange={setOs} />
          </FL>
          <FL label="Discharge on speculum">
            <Pills options={['None', 'Clear', 'White', 'Yellow / purulent', 'Foul smelling']}
              value={discharge} onChange={setDischarge} />
          </FL>
          <FL label="Clinical pelvic adequacy">
            <Pills options={['Adequate', 'Borderline', 'Clinically inadequate', 'Not assessed']}
              value={pelvicAdequacy} onChange={setPelvicAdequacy} />
          </FL>
        </div>
      </Gate>
    </div>
  )

  const renderStage6 = () => (
    <div className="space-y-5">
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Haematological</p>
        </div>
        <div className="px-4 py-3 grid grid-cols-2 gap-4">
          <FL label="Haemoglobin" sub="(g/dL)">
            <div className="flex items-center gap-2">
              <Input type="number" value={hb} onChange={setHb} placeholder="e.g. 11.2" className={
                hb ? parseFloat(hb) < 7 ? '!border-red-400' : parseFloat(hb) < 10 ? '!border-yellow-400' : '!border-green-400' : ''
              } />
              {hb && (
                <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${
                  parseFloat(hb) < 7 ? 'bg-red-100 text-red-700'
                  : parseFloat(hb) < 10 ? 'bg-yellow-100 text-yellow-700'
                  : parseFloat(hb) < 11 ? 'bg-orange-100 text-orange-700'
                  : 'bg-green-100 text-green-700'
                }`}>{parseFloat(hb) < 7 ? 'Severe' : parseFloat(hb) < 10 ? 'Moderate' : parseFloat(hb) < 11 ? 'Mild' : 'Normal'}</span>
              )}
            </div>
          </FL>
          <FL label="Blood group">
            <Pills options={['A', 'B', 'AB', 'O', 'Not done']} value={bloodGroup} onChange={setBloodGroup} />
          </FL>
          <FL label="Rh factor">
            <Pills options={['Rh Positive', 'Rh Negative', 'Not done']} value={rhFactor} onChange={setRhFactor}
              color={rhFactor === 'Rh Negative' ? 'red' : 'green'} />
          </FL>
          <FL label="ICT (indirect Coombs)" sub="Rh negative only">
            <Pills options={['Negative', 'Positive', 'Not done']} value={ict} onChange={setIct} />
          </FL>
          <FL label="Haemoglobinopathy screen" sub="(HPLC / sickling)">
            <Pills options={['Normal (AA)', 'Sickle trait (AS)', 'Sickle disease (SS)', 'Thalassaemia trait', 'Thalassaemia major', 'Abnormal — other', 'Not done']}
              value={hemoglobinopathy} onChange={setHemoglobinopathy} />
          </FL>
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Infections (TORCH + others)</p>
        </div>
        <div className="px-4 py-3 grid grid-cols-2 gap-4">
          {[
            { label: 'VDRL / Syphilis',       val: vdrl,  set: setVdrl  },
            { label: 'HIV',                    val: hiv,   set: setHiv   },
            { label: 'HBsAg (Hepatitis B)',    val: hbsag, set: setHbsag },
            { label: 'Anti-HCV (Hepatitis C)', val: hcv,   set: setHcv   },
            { label: 'Rubella IgG',            val: rubella, set: setRubella },
            { label: 'TSH (thyroid)',          val: tsh,   set: setTsh   },
          ].map(({ label, val, set }) => (
            <FL key={label} label={label}>
              <div className="flex gap-2 items-center">
                <Pills options={['Non-reactive', 'Reactive', 'Not done']} value={val} onChange={set}
                  color={val === 'Reactive' ? 'red' : 'green'} />
              </div>
            </FL>
          ))}
          {tsh && !['Non-reactive', 'Reactive', 'Not done'].includes(tsh) && null}
          <FL label="TSH value" sub="(mIU/L)">
            <Input type="number" value={tsh} onChange={setTsh} placeholder="e.g. 2.5" />
          </FL>
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Sugar / Renal</p>
        </div>
        <div className="px-4 py-3 grid grid-cols-2 gap-4">
          <FL label="RBS / GCT" sub="(mg/dL)"><Input type="number" value={rbs} onChange={setRbs} placeholder="e.g. 95" /></FL>
          <Gate label="OGTT done?" value={ogtt} onChange={setOgtt}>
            <FL label="OGTT result">
              <Pills options={['Normal', 'GDM — on diet', 'GDM — on insulin', 'Impaired fasting', 'Impaired glucose tolerance']}
                value={ogttResult} onChange={setOgttResult} />
            </FL>
          </Gate>
          <FL label="Urine R/E (routine)">
            <Pills multi options={['Normal', 'Proteinuria +', 'Proteinuria ++', 'Glycosuria', 'Nitrites (UTI)', 'Pus cells', 'RBCs', 'Ketones']}
              value={urine} onChange={setUrine} />
          </FL>
        </div>
      </div>

      <div className="border border-purple-100 rounded-xl overflow-hidden">
        <div className="bg-purple-50 px-4 py-2.5 border-b border-purple-100">
          <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">Ultrasound / Prenatal Screening</p>
        </div>
        <div className="px-4 py-3 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Gate label="NT scan done?" value={ntScan} onChange={setNtScan}>
              <FL label="NT measurement" sub="(mm)">
                <Input type="number" value={ntMeasure} onChange={setNtMeasure} placeholder="e.g. 1.8" />
              </FL>
            </Gate>
            <FL label="Double marker">
              <Pills options={['Low risk', 'High risk', 'Not done']} value={doubleMarker} onChange={setDoubleMarker}
                color={doubleMarker === 'High risk' ? 'red' : 'green'} />
            </FL>
            <FL label="Triple marker">
              <Pills options={['Low risk', 'High risk', 'Not done']} value={tripleMarker} onChange={setTripleMarker}
                color={tripleMarker === 'High risk' ? 'red' : 'green'} />
            </FL>
            <FL label="Quad marker">
              <Pills options={['Low risk', 'High risk', 'Not done']} value={quadMarker} onChange={setQuadMarker}
                color={quadMarker === 'High risk' ? 'red' : 'green'} />
            </FL>
          </div>

          <Gate label="Anomaly scan (18–22 weeks) done?" value={anomalyScan} onChange={setAnomalyScan}>
            <FL label="Anomaly scan result">
              <Pills options={['No anomaly detected', 'Soft marker(s) noted', 'Major anomaly detected', 'Incomplete — repeat needed']}
                value={anomalyScanResult} onChange={setAnomalyScanResult}
                color={anomalyScanResult === 'Major anomaly detected' ? 'red' : 'green'} />
            </FL>
          </Gate>

          <div className="grid grid-cols-2 gap-4">
            <FL label="Cervical length" sub="(mm — if done)">
              <Input type="number" value={cervicalLength} onChange={setCervicalLength} placeholder="e.g. 38" />
            </FL>
            <FL label="Doppler study">
              <Pills options={['Normal', 'Abnormal', 'Not done']} value={doppler} onChange={setDoppler}
                color={doppler === 'Abnormal' ? 'red' : 'green'} />
            </FL>
          </div>
        </div>
      </div>

      <FL label="Investigation notes">
        <textarea rows={2} value={investigationNotes} onChange={e => setInvestigationNotes(e.target.value)}
          placeholder="Pending investigations, abnormal results, follow-up plans…"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none" />
      </FL>
    </div>
  )

  const renderStage7 = () => (
    <div className="space-y-5">
      {/* Risk summary */}
      <div className={`border rounded-xl p-4 ${risk.bg}`}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Risk Stratification</p>
          <span className={`text-sm font-bold ${risk.color}`}>{risk.level}</span>
        </div>
        {riskFlags.length === 0 ? (
          <p className="text-xs text-green-600">No risk factors identified — routine ANC pathway</p>
        ) : (
          <div className="space-y-1">
            {riskFlags.map((f, i) => (
              <div key={i} className="flex items-start gap-1.5">
                {f.critical && <AlertTriangle size={11} className="text-red-500 shrink-0 mt-0.5" />}
                <p className={`text-xs leading-snug ${f.critical ? 'text-red-700 font-semibold' : 'text-orange-700'}`}>{f.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Supplements */}
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Supplements & Prophylaxis</p>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Iron supplement">
            <Pills options={['Ferrous sulphate 200mg OD', 'Ferrous sulphate 200mg BD', 'IV iron (severe anaemia)', 'Not prescribed', 'Already on']}
              value={ironSupplement} onChange={setIronSupplement} />
          </FL>
          <FL label="Folic acid">
            <Pills options={['5mg OD', '0.4mg OD (standard)', 'Not prescribed', 'Already on']}
              value={folicAcid} onChange={setFolicAcid} />
          </FL>
          <FL label="Calcium supplement">
            <Pills options={['1g OD', '1g BD', '500mg OD', 'Not prescribed']}
              value={calcium} onChange={setCalcium} />
          </FL>
          <FL label="Vitamin D">
            <Pills options={['60,000 IU monthly', 'Daily supplement', 'Not prescribed', 'Already on']}
              value={vitD} onChange={setVitD} />
          </FL>
        </div>
        <Gate label="Low-dose aspirin indicated?" value={aspirin} onChange={setAspirin}
          yesLabel="Prescribed" noLabel="Not indicated">
          <FL label="Dose">
            <Pills options={['75mg OD (at night)', '150mg OD (high risk)', '100mg OD']}
              value={aspirinDose} onChange={setAspirinDose} />
          </FL>
        </Gate>
      </div>

      <FL label="Referrals">
        <Pills multi options={[
          'High-risk ANC clinic', 'Maternal-foetal medicine', 'Cardiologist',
          'Endocrinologist (diabetes / thyroid)', 'Nephrologist', 'Neurologist (epilepsy)',
          'Haematologist (thalassaemia / sickle)', 'Genetic counselling',
          'Ophthalmology', 'Dentist (oral hygiene in pregnancy)',
          'Nutritionist / dietitian', 'Social worker', 'Psychiatry / counselling',
          'ICTC counsellor (HIV)', 'Physiotherapy',
        ]}
          value={referrals} onChange={setReferrals} />
      </FL>

      <FL label="Planned place of delivery">
        <Pills options={['This facility', 'Government hospital', 'Private hospital', 'Referral centre (tertiary)', 'Home delivery (not recommended — counsel)', 'Not yet decided']}
          value={placeOfDelivery} onChange={setPlaceOfDelivery} />
      </FL>

      <FL label="Birth plan discussion">
        <Pills options={['Normal vaginal delivery planned', 'Elective LSCS planned', 'VBAC trial planned', 'Decision at term based on progress', 'Not yet discussed']}
          value={birthPlan} onChange={setBirthPlan} />
      </FL>

      <FL label="Counselling topics covered">
        <Pills multi options={[
          'Danger signs — when to come immediately', 'Dietary advice (iron-rich foods, protein, fluids)',
          'Rest and activity advice', 'Fetal movement monitoring (kick count)',
          'Breast care and breastfeeding preparation', 'Perineal hygiene',
          'Birth preparedness', 'Companion at delivery',
          'Kangaroo mother care', 'Newborn care basics',
          'Family planning post delivery', 'No alcohol / smoking / tobacco',
          'Oral hygiene in pregnancy', 'Mental health / mood changes',
          'Covid / vaccination guidance', 'TT / Tdap vaccination',
          'Iron–folic acid compliance', 'ANC schedule adherence',
          'Institutional delivery importance', 'JSY / PMMVY government scheme',
        ]}
          value={counsellingTopics} onChange={setCounsellingTopics} />
      </FL>

      <div className="grid grid-cols-2 gap-4">
        <FL label="Next ANC date">
          <input type="date" value={nextANCDate} onChange={e => setNextANCDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
        </FL>
        <FL label="Next visit at (weeks)">
          <Input type="number" value={nextANCWeeks} onChange={setNextANCWeeks} placeholder="e.g. 16" />
        </FL>
      </div>

      <FL label="Plan notes">
        <textarea rows={3} value={planNotes} onChange={e => setPlanNotes(e.target.value)}
          placeholder="Overall plan, special instructions, coordinator notes, birth preparedness plan…"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none" />
      </FL>
    </div>
  )

  const stageContent = [
    renderStage1, renderStage2, renderStage3,
    renderStage4, renderStage5, renderStage6, renderStage7,
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-pink-100 rounded-lg">
              <Baby size={16} className="text-pink-600" />
            </div>
            <div>
              <span className="text-xs font-bold text-pink-600 uppercase tracking-wider">Antenatal Booking</span>
              <span className="text-xs text-gray-400 ml-2">First ANC Visit Assessment</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {calcGA && (
              <span className="text-xs font-bold bg-pink-100 text-pink-700 px-2.5 py-1 rounded-full">
                {calcGA.weeks}w {calcGA.days}d
              </span>
            )}
            {riskFlags.length > 0 && (
              <div className={`flex items-center gap-1 border rounded-full px-2.5 py-1 ${risk.bg}`}>
                {riskFlags.some(f => f.critical) && <AlertTriangle size={11} className="text-red-500" />}
                <span className={`text-xs font-bold ${risk.color}`}>{risk.level}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stage tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide">
          {STAGES.map(s => (
            <button key={s.id} type="button" onClick={() => setStage(s.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                stage === s.id
                  ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-pink-300'
              }`}>
              {s.label}
              {stageDone[s.id] && stage !== s.id && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {stageContent[stage - 1]()}
        {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setStage(s => Math.max(1, s - 1))} disabled={stage === 1}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">
            ← Back
          </button>
          <span className="text-xs text-gray-400 tabular-nums">{stage} / {STAGES.length}</span>
          <button type="button" onClick={() => setStage(s => Math.min(STAGES.length, s + 1))} disabled={stage === STAGES.length}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">
            Next →
          </button>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Booking'}
          </button>
        </div>
      </div>
    </div>
  )
}
