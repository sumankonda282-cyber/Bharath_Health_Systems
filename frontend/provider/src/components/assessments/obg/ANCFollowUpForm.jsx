/**
 * @shared-pool — standalone clinical assessment, portal-agnostic
 * @category obg
 * ANC Follow-up Visit Assessment
 * Every section opens with "Applicable / N/A" — if N/A, collapses and locks.
 */
import { useState, useMemo } from 'react'
import { Baby, Lock } from 'lucide-react'
import api from '../../../api/client'

// ── Section wrapper — Applicable / N/A gate ───────────────────────────────────
function Section({ title, value, onChange, children, accent = 'pink' }) {
  const A = {
    pink:   { border: 'border-pink-200',   bg: 'bg-pink-50/40',    div: 'border-pink-100',   btn: 'bg-pink-500 text-white border-pink-500'   },
    blue:   { border: 'border-blue-200',   bg: 'bg-blue-50/30',    div: 'border-blue-100',   btn: 'bg-blue-500 text-white border-blue-500'   },
    amber:  { border: 'border-amber-200',  bg: 'bg-amber-50/30',   div: 'border-amber-100',  btn: 'bg-amber-500 text-white border-amber-500' },
    red:    { border: 'border-red-200',    bg: 'bg-red-50/30',     div: 'border-red-100',    btn: 'bg-red-500 text-white border-red-500'     },
    green:  { border: 'border-green-200',  bg: 'bg-green-50/30',   div: 'border-green-100',  btn: 'bg-green-500 text-white border-green-500' },
    purple: { border: 'border-purple-200', bg: 'bg-purple-50/30',  div: 'border-purple-100', btn: 'bg-purple-500 text-white border-purple-500'},
    teal:   { border: 'border-teal-200',   bg: 'bg-teal-50/30',    div: 'border-teal-100',   btn: 'bg-teal-500 text-white border-teal-500'   },
  }
  const a = A[accent] || A.pink
  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      value === 'Yes' ? a.border : value === 'No' ? 'border-gray-100' : 'border-gray-200'
    }`}>
      <div className={`flex items-center justify-between px-4 py-3 ${value === 'Yes' ? a.bg : 'bg-gray-50/60'}`}>
        <span className={`text-sm font-semibold ${value === 'No' ? 'text-gray-400' : 'text-gray-700'}`}>{title}</span>
        <div className="flex gap-1.5 shrink-0">
          <button type="button" onClick={() => onChange(v => v === 'Yes' ? '' : 'Yes')}
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all ${
              value === 'Yes' ? a.btn : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}>Applicable</button>
          <button type="button" onClick={() => onChange(v => v === 'No' ? '' : 'No')}
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all ${
              value === 'No' ? 'bg-gray-400 text-white border-gray-400' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}>N/A</button>
        </div>
      </div>
      {value === 'Yes' && (
        <div className={`px-4 py-4 border-t ${a.div} space-y-4`}>{children}</div>
      )}
      {value === 'No' && (
        <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-1.5">
          <Lock size={10} className="text-gray-300" />
          <p className="text-xs text-gray-400 italic">Not applicable — section locked</p>
        </div>
      )}
    </div>
  )
}

// ── Utility pills ─────────────────────────────────────────────────────────────
function Pills({ options, value, onChange, multi = false, color = 'pink' }) {
  const active = multi ? (Array.isArray(value) ? value : []) : value
  const toggle = (o) => {
    if (multi) onChange(active.includes(o) ? active.filter(x => x !== o) : [...active, o])
    else onChange(active === o ? '' : o)
  }
  const cls = {
    pink:   'bg-pink-500 text-white border-pink-500',
    red:    'bg-red-500 text-white border-red-500',
    amber:  'bg-amber-500 text-white border-amber-500',
    green:  'bg-green-600 text-white border-green-600',
    blue:   'bg-blue-500 text-white border-blue-500',
    purple: 'bg-purple-600 text-white border-purple-600',
    teal:   'bg-teal-500 text-white border-teal-500',
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

// ── Gate (yes/no with inline children) ───────────────────────────────────────
function Gate({ label, value, onChange, children, yesLabel = 'Yes', noLabel = 'No', alert = false }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-1.5">
        <p className="text-sm font-medium text-gray-700 flex-1">{label}</p>
        <div className="flex gap-1.5 shrink-0">
          {[yesLabel, noLabel].map(opt => (
            <button key={opt} type="button" onClick={() => onChange(v => v === opt ? '' : opt)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                value === opt
                  ? opt === yesLabel ? alert ? 'bg-red-500 text-white border-red-500' : 'bg-pink-500 text-white border-pink-500'
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

function FL({ label, sub, children }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}{sub && <span className="ml-1 font-normal text-gray-400 normal-case tracking-normal">{sub}</span>}
      </p>
      {children}
    </div>
  )
}

function Inp({ value, onChange, placeholder = '', type = 'text', min, max }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} min={min} max={max}
      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
  )
}

// ── Stage config ──────────────────────────────────────────────────────────────
const STAGES = [
  { id: 1, label: 'Visit Info' },
  { id: 2, label: 'Examination' },
  { id: 3, label: 'Investigations' },
  { id: 4, label: 'Fetal Monitoring' },
  { id: 5, label: 'Risk Monitoring' },
  { id: 6, label: 'Plan' },
]

// ── Main form ─────────────────────────────────────────────────────────────────
export default function ANCFollowUpForm({ admission, onClose, onSaved }) {
  const [stage,  setStage]  = useState(1)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  // ── Stage 1: Visit Info ────────────────────────────────────────────────────
  const [visitNumber,    setVisitNumber]    = useState('')
  const [visitDate,      setVisitDate]      = useState(new Date().toISOString().slice(0, 10))
  const [eddFinal,       setEddFinal]       = useState('')
  const [gestWeeks,      setGestWeeks]      = useState('')
  const [gestDays,       setGestDays]       = useState('')
  const [trimester,      setTrimester]      = useState('')

  // Section: Complaints
  const [secComplaints,  setSecComplaints]  = useState('')
  const [complaints,     setComplaints]     = useState([])
  const [complaintsNote, setComplaintsNote] = useState('')

  // Section: Danger signs
  const [secDanger,      setSecDanger]      = useState('')
  const [dangerSigns,    setDangerSigns]    = useState([])

  // ── Stage 2: Examination ───────────────────────────────────────────────────
  // Section: Vitals
  const [secVitals,      setSecVitals]      = useState('')
  const [weight,         setWeight]         = useState('')
  const [weightGain,     setWeightGain]     = useState('')
  const [bp,             setBp]             = useState('')
  const [bp2,            setBp2]            = useState('')  // second reading if high
  const [pulse,          setPulse]          = useState('')
  const [temp,           setTemp]           = useState('')
  const [spo2,           setSpo2]           = useState('')

  // Section: General examination
  const [secGeneral,     setSecGeneral]     = useState('')
  const [pallor,         setPallor]         = useState('')
  const [oedema,         setOedema]         = useState('')
  const [oedemaGrade,    setOedemaGrade]    = useState('')
  const [icterus,        setIcterus]        = useState('')
  const [breathlessness, setBreathlessness] = useState('')
  const [generalNotes,   setGeneralNotes]   = useState('')

  // Section: Obstetric examination
  const [secObstetric,   setSecObstetric]   = useState('')
  const [fundusHeight,   setFundusHeight]   = useState('')
  const [presentation,   setPresentation]   = useState('')
  const [lie,            setLie]            = useState('')
  const [engagement,     setEngagement]     = useState('')
  const [fetalHR,        setFetalHR]        = useState('')
  const [fetalHRRhythm,  setFetalHRRhythm]  = useState('')
  const [liquor,         setLiquor]         = useState('')
  const [scarTenderness, setScarTenderness] = useState('')
  const [contractions,   setContractions]   = useState('')
  const [obsNotes,       setObsNotes]       = useState('')

  // Section: Per vaginum exam
  const [secPV,          setSecPV]          = useState('')
  const [cervixEff,      setCervixEff]      = useState('')
  const [cervixDil,      setCervixDil]      = useState('')
  const [membranes,      setMembranes]      = useState('')
  const [station,        setStation]        = useState('')
  const [pvNotes,        setPvNotes]        = useState('')

  // ── Stage 3: Investigations ────────────────────────────────────────────────
  // Section: Haemoglobin
  const [secHb,          setSecHb]          = useState('')
  const [hb,             setHb]             = useState('')
  const [hbAction,       setHbAction]       = useState('')

  // Section: Urine R/E
  const [secUrine,       setSecUrine]       = useState('')
  const [urineFindings,  setUrineFindings]  = useState([])
  const [urineNote,      setUrineNote]      = useState('')

  // Section: Blood sugar
  const [secSugar,       setSecSugar]       = useState('')
  const [fastingBs,      setFastingBs]      = useState('')
  const [ppBs,           setPpBs]           = useState('')
  const [rbsVal,         setRbsVal]         = useState('')
  const [sugarControl,   setSugarControl]   = useState('')

  // Section: Other investigations
  const [secOtherInvx,   setSecOtherInvx]   = useState('')
  const [otherInvx,      setOtherInvx]      = useState([])
  const [otherInvxNote,  setOtherInvxNote]  = useState('')

  // ── Stage 4: Fetal Monitoring ──────────────────────────────────────────────
  // Section: Fetal movements
  const [secFM,          setSecFM]          = useState('')
  const [fmStatus,       setFmStatus]       = useState('')
  const [fmCount,        setFmCount]        = useState('')
  const [fmPattern,      setFmPattern]      = useState('')

  // Section: CTG / NST
  const [secCTG,         setSecCTG]         = useState('')
  const [ctgResult,      setCtgResult]      = useState('')
  const [ctgBaselineFHR, setCtgBaselineFHR] = useState('')
  const [ctgVariability, setCtgVariability] = useState('')
  const [ctgAccelerations,setCtgAccelerations]=useState('')
  const [ctgDecelerations,setCtgDecelerations]=useState('')
  const [ctgNote,        setCtgNote]        = useState('')

  // Section: Growth scan / USG
  const [secUSG,         setSecUSG]         = useState('')
  const [usgDate,        setUsgDate]        = useState('')
  const [usgGA,          setUsgGA]          = useState('')
  const [efw,            setEfw]            = useState('')
  const [efwPercentile,  setEfwPercentile]  = useState('')
  const [afIndex,        setAfIndex]        = useState('')
  const [placentaLocation,setPlacentaLocation]= useState('')
  const [placentaGrade,  setPlacentaGrade]  = useState('')
  const [usgFindings,    setUsgFindings]    = useState([])
  const [usgNote,        setUsgNote]        = useState('')

  // Section: Doppler
  const [secDoppler,     setSecDoppler]     = useState('')
  const [umbilicalDoppler,setUmbilicalDoppler]= useState('')
  const [mca,            setMca]            = useState('')
  const [dopplerNote,    setDopplerNote]    = useState('')

  // ── Stage 5: Risk Monitoring ───────────────────────────────────────────────
  // Section: Hypertension monitoring
  const [secHTN,         setSecHTN]         = useState('')
  const [bpTrend,        setBpTrend]        = useState('')
  const [htnSymptoms,    setHtnSymptoms]    = useState([])
  const [urineProtein,   setUrineProtein]   = useState('')
  const [antihyperMeds,  setAntihyperMeds]  = useState('')
  const [htnPlan,        setHtnPlan]        = useState('')

  // Section: GDM monitoring
  const [secGDM,         setSecGDM]         = useState('')
  const [gdmControl,     setGdmControl]     = useState('')
  const [gdmMed,         setGdmMed]         = useState('')
  const [gdmInsulinDose, setGdmInsulinDose] = useState('')
  const [gdmDiet,        setGdmDiet]        = useState('')
  const [gdmPlan,        setGdmPlan]        = useState('')

  // Section: Anaemia management
  const [secAnaemia,     setSecAnaemia]     = useState('')
  const [ironCompliance, setIronCompliance] = useState('')
  const [anaemiaSeverity,setAnaemiaSeverity]= useState('')
  const [anaemiaPlan,    setAnaemiaPlan]    = useState('')

  // Section: Preterm risk
  const [secPreterm,     setSecPreterm]     = useState('')
  const [cervLength,     setCervLength]     = useState('')
  const [pretRemSymptoms,setPretRemSymptoms]= useState([])
  const [pretRemPlan,    setPretRemPlan]    = useState('')

  // Section: Other high-risk conditions
  const [secOtherRisk,   setSecOtherRisk]   = useState('')
  const [otherRiskNote,  setOtherRiskNote]  = useState('')

  // ── Stage 6: Plan ─────────────────────────────────────────────────────────
  // Section: Supplement review
  const [secSupplements, setSecSupplements] = useState('')
  const [ironStatus,     setIronStatus]     = useState('')
  const [calciumStatus,  setCalciumStatus]  = useState('')
  const [folateStatus,   setFolateStatus]   = useState('')
  const [vitDStatus,     setVitDStatus]     = useState('')
  const [aspirinStatus,  setAspirinStatus]  = useState('')

  // Section: Vaccination
  const [secVaccination, setSecVaccination] = useState('')
  const [ttStatus,       setTtStatus]       = useState('')
  const [tdapStatus,     setTdapStatus]     = useState('')

  // Section: Counselling
  const [secCounselling, setSecCounselling] = useState('')
  const [counselTopics,  setCounselTopics]  = useState([])

  // Section: Referrals
  const [secReferral,    setSecReferral]    = useState('')
  const [referrals,      setReferrals]      = useState([])

  // Always: Next visit
  const [nextVisitDate,  setNextVisitDate]  = useState('')
  const [nextVisitWeeks, setNextVisitWeeks] = useState('')
  const [overallAssessment, setOverallAssessment] = useState('')
  const [planNotes,      setPlanNotes]      = useState('')

  // ── GA auto-calc ───────────────────────────────────────────────────────────
  const calcGA = useMemo(() => {
    if (!eddFinal) return null
    const today = new Date()
    const edd   = new Date(eddFinal)
    const diffDays = Math.round((edd - today) / 86400000)
    const daysPreg  = 280 - diffDays
    if (daysPreg < 0) return null
    return { weeks: Math.floor(daysPreg / 7), days: daysPreg % 7 }
  }, [eddFinal])

  const gaDisplay = calcGA
    ? `${calcGA.weeks}w ${calcGA.days}d`
    : gestWeeks ? `${gestWeeks}w ${gestDays || 0}d` : '—'

  // ── BP alert ───────────────────────────────────────────────────────────────
  const bpAlert = useMemo(() => {
    if (!bp) return null
    const parts = bp.split('/')
    if (parts.length !== 2) return null
    const sys = parseInt(parts[0]), dia = parseInt(parts[1])
    if (sys >= 160 || dia >= 110) return { level: 'Severe', color: 'text-red-700', bg: 'bg-red-50 border-red-300' }
    if (sys >= 140 || dia >= 90)  return { level: 'Hypertensive', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-300' }
    return null
  }, [bp])

  // ── Hb severity ───────────────────────────────────────────────────────────
  const hbSeverity = useMemo(() => {
    const v = parseFloat(hb)
    if (!v) return null
    if (v < 7)  return { label: 'Severe', color: 'text-red-700',    bg: 'bg-red-100 border-red-300'    }
    if (v < 10) return { label: 'Moderate', color: 'text-orange-700', bg: 'bg-orange-100 border-orange-300' }
    if (v < 11) return { label: 'Mild',   color: 'text-yellow-700', bg: 'bg-yellow-100 border-yellow-300' }
    return       { label: 'Normal', color: 'text-green-700',  bg: 'bg-green-100 border-green-300'  }
  }, [hb])

  // ── Stage done dots ───────────────────────────────────────────────────────
  const stageDone = useMemo(() => ({
    1: !!(gestWeeks || eddFinal || calcGA),
    2: secVitals === 'Yes' && !!(weight || bp),
    3: [secHb, secUrine, secSugar, secOtherInvx].some(s => s === 'Yes'),
    4: [secFM, secCTG, secUSG, secDoppler].some(s => s === 'Yes'),
    5: [secHTN, secGDM, secAnaemia, secPreterm].some(s => s === 'Yes'),
    6: !!(nextVisitDate || planNotes),
  }), [gestWeeks, eddFinal, calcGA, secVitals, weight, bp, secHb, secUrine,
       secSugar, secOtherInvx, secFM, secCTG, secUSG, secDoppler,
       secHTN, secGDM, secAnaemia, secPreterm, nextVisitDate, planNotes])

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true); setError('')
    const payload = {
      type: 'anc_followup',
      visit: {
        visit_number: visitNumber, date: visitDate,
        gestational_age: gaDisplay, edd: eddFinal, trimester,
      },
      complaints: secComplaints === 'Yes' ? { items: complaints, notes: complaintsNote } : { applicable: false },
      danger_signs: secDanger === 'Yes' ? { signs: dangerSigns } : { applicable: false },
      vitals: secVitals === 'Yes' ? {
        weight_kg: weight, weight_gain_kg: weightGain,
        bp, bp_second_reading: bp2, pulse, temp, spo2,
        bp_alert: bpAlert?.level,
      } : { applicable: false },
      general_exam: secGeneral === 'Yes' ? { pallor, oedema, oedema_grade: oedemaGrade, icterus, breathlessness, notes: generalNotes } : { applicable: false },
      obstetric_exam: secObstetric === 'Yes' ? {
        fundal_height_cm: fundusHeight, presentation, lie, engagement,
        fetal_hr: fetalHR, fetal_hr_rhythm: fetalHRRhythm,
        liquor, scar_tenderness: scarTenderness, contractions, notes: obsNotes,
      } : { applicable: false },
      pv_exam: secPV === 'Yes' ? { effacement: cervixEff, dilatation: cervixDil, membranes, station, notes: pvNotes } : { applicable: false },
      haemoglobin: secHb === 'Yes' ? { value: hb, severity: hbSeverity?.label, action: hbAction } : { applicable: false },
      urine_re: secUrine === 'Yes' ? { findings: urineFindings, notes: urineNote } : { applicable: false },
      blood_sugar: secSugar === 'Yes' ? { fasting: fastingBs, pp: ppBs, rbs: rbsVal, control: sugarControl } : { applicable: false },
      other_investigations: secOtherInvx === 'Yes' ? { items: otherInvx, notes: otherInvxNote } : { applicable: false },
      fetal_movements: secFM === 'Yes' ? { status: fmStatus, daily_count: fmCount, pattern: fmPattern } : { applicable: false },
      ctg: secCTG === 'Yes' ? { result: ctgResult, baseline_fhr: ctgBaselineFHR, variability: ctgVariability, accelerations: ctgAccelerations, decelerations: ctgDecelerations, notes: ctgNote } : { applicable: false },
      growth_scan: secUSG === 'Yes' ? { date: usgDate, ga: usgGA, efw_grams: efw, efw_percentile: efwPercentile, af_index: afIndex, placenta: placentaLocation, placenta_grade: placentaGrade, findings: usgFindings, notes: usgNote } : { applicable: false },
      doppler: secDoppler === 'Yes' ? { umbilical: umbilicalDoppler, mca, notes: dopplerNote } : { applicable: false },
      htn_monitoring: secHTN === 'Yes' ? { bp_trend: bpTrend, symptoms: htnSymptoms, urine_protein: urineProtein, medications: antihyperMeds, plan: htnPlan } : { applicable: false },
      gdm_monitoring: secGDM === 'Yes' ? { control: gdmControl, medication: gdmMed, insulin_dose: gdmInsulinDose, diet: gdmDiet, plan: gdmPlan } : { applicable: false },
      anaemia_management: secAnaemia === 'Yes' ? { iron_compliance: ironCompliance, severity: anaemiaSeverity, plan: anaemiaPlan } : { applicable: false },
      preterm_risk: secPreterm === 'Yes' ? { cervical_length_mm: cervLength, symptoms: pretRemSymptoms, plan: pretRemPlan } : { applicable: false },
      other_risk: secOtherRisk === 'Yes' ? { notes: otherRiskNote } : { applicable: false },
      supplements: secSupplements === 'Yes' ? { iron: ironStatus, calcium: calciumStatus, folic: folateStatus, vit_d: vitDStatus, aspirin: aspirinStatus } : { applicable: false },
      vaccination: secVaccination === 'Yes' ? { tt: ttStatus, tdap: tdapStatus } : { applicable: false },
      counselling: secCounselling === 'Yes' ? { topics: counselTopics } : { applicable: false },
      referrals: secReferral === 'Yes' ? { items: referrals } : { applicable: false },
      plan: { overall_assessment: overallAssessment, next_visit_date: nextVisitDate, next_visit_weeks: nextVisitWeeks, notes: planNotes },
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
    <div className="space-y-4">
      {/* Visit info — always filled */}
      <div className="border border-pink-200 rounded-xl p-4 bg-pink-50/20 space-y-4">
        <p className="text-xs font-bold text-pink-600 uppercase tracking-wide">Visit Details</p>
        <div className="grid grid-cols-2 gap-4">
          <FL label="Visit number"><Inp type="number" value={visitNumber} onChange={setVisitNumber} placeholder="e.g. 2" min={1} /></FL>
          <FL label="Visit date"><input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" /></FL>
        </div>
        <FL label="EDD (working)">
          <input type="date" value={eddFinal} onChange={e => setEddFinal(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
        </FL>
        {calcGA ? (
          <div className="flex items-center justify-between bg-white border border-pink-200 rounded-lg px-3 py-2">
            <span className="text-xs text-gray-500">Gestational age today</span>
            <span className="text-sm font-bold text-pink-600">{calcGA.weeks}w {calcGA.days}d</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <FL label="GA weeks"><Inp type="number" value={gestWeeks} onChange={setGestWeeks} placeholder="e.g. 28" /></FL>
            <FL label="GA days"><Inp type="number" value={gestDays} onChange={setGestDays} placeholder="0–6" min={0} max={6} /></FL>
          </div>
        )}
        <FL label="Trimester">
          <Pills options={['1st (up to 13w6d)', '2nd (14w – 27w6d)', '3rd (28w onwards)']} value={trimester} onChange={setTrimester} />
        </FL>
      </div>

      {/* Complaints section */}
      <Section title="Current Complaints / Concerns" value={secComplaints} onChange={setSecComplaints} accent="pink">
        <FL label="Complaints this visit">
          <Pills multi options={[
            'None', 'Nausea / vomiting', 'Heartburn / acidity', 'Constipation', 'Headache', 'Backache',
            'Pelvic girdle pain', 'Leg cramps', 'Swelling of feet / face', 'Breathlessness',
            'Reduced fetal movements', 'Bleeding PV', 'Watery discharge (possible PROM)',
            'Vaginal discharge / itching', 'Urinary burning (UTI)', 'Urinary frequency',
            'Abdominal pain / tightenings', 'Fatigue / weakness', 'Dizziness / fainting',
            'Visual disturbance', 'Epigastric pain',
          ]}
            value={complaints} onChange={setComplaints} />
        </FL>
        <FL label="Additional notes">
          <textarea rows={2} value={complaintsNote} onChange={e => setComplaintsNote(e.target.value)}
            placeholder="Details, duration, severity…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none" />
        </FL>
      </Section>

      {/* Danger signs section */}
      <Section title="Danger Signs (Emergency Symptoms)" value={secDanger} onChange={setSecDanger} accent="red">
        <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-2">
          <p className="text-xs text-red-700 font-medium">Tick any danger signs reported by patient — these require immediate action</p>
        </div>
        <Pills multi color="red" options={[
          'Severe headache not relieved by rest', 'Visual disturbance / blurring / flashes',
          'Epigastric / upper abdominal pain', 'Convulsions / fits',
          'Severe vomiting — unable to keep food/water down',
          'Heavy bleeding per vaginum', 'Loss of fluid PV (possible PROM)',
          'Absent / reduced fetal movements', 'High fever (>38°C)',
          'Severe breathlessness / chest pain', 'Swelling of face / hands suddenly',
          'Fainting / loss of consciousness',
        ]}
          value={dangerSigns} onChange={setDangerSigns} />
        {dangerSigns.length > 0 && (
          <div className="bg-red-100 border border-red-300 rounded-lg px-3 py-2 mt-2">
            <p className="text-xs font-bold text-red-700">⚠ Danger signs present — immediate clinical review required</p>
          </div>
        )}
      </Section>
    </div>
  )

  const renderStage2 = () => (
    <div className="space-y-4">
      {/* Vitals */}
      <Section title="Vitals & Anthropometry" value={secVitals} onChange={setSecVitals} accent="pink">
        <div className="grid grid-cols-3 gap-3">
          <FL label="Weight" sub="(kg)"><Inp type="number" value={weight} onChange={setWeight} placeholder="64" /></FL>
          <FL label="Weight gain" sub="(kg since last)"><Inp type="number" value={weightGain} onChange={setWeightGain} placeholder="1.2" /></FL>
          <FL label="SpO2" sub="(%)"><Inp type="number" value={spo2} onChange={setSpo2} placeholder="98" /></FL>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Blood pressure"><Inp value={bp} onChange={setBp} placeholder="120/80" /></FL>
          <FL label="Pulse" sub="(bpm)"><Inp type="number" value={pulse} onChange={setPulse} placeholder="84" /></FL>
          <FL label="Temperature" sub="(°F)"><Inp type="number" value={temp} onChange={setTemp} placeholder="98.6" /></FL>
        </div>
        {bpAlert && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${bpAlert.bg}`}>
            <p className={`text-xs font-bold ${bpAlert.color}`}>BP {bpAlert.level} — take second reading after 15 minutes</p>
          </div>
        )}
        {bpAlert && (
          <FL label="2nd BP reading (after 15 min rest)"><Inp value={bp2} onChange={setBp2} placeholder="e.g. 145/92" /></FL>
        )}
      </Section>

      {/* General examination */}
      <Section title="General Examination" value={secGeneral} onChange={setSecGeneral} accent="blue">
        <div className="grid grid-cols-2 gap-4">
          <FL label="Pallor">
            <Pills options={['Absent', 'Mild', 'Moderate', 'Severe']} value={pallor} onChange={setPallor} color="blue" />
          </FL>
          <FL label="Oedema">
            <Pills options={['Absent', 'Feet only', 'Up to ankle', 'Pitting', 'Facial']} value={oedema} onChange={setOedema} color="blue" />
          </FL>
          {oedema !== 'Absent' && oedema !== '' && (
            <FL label="Oedema grade">
              <Pills options={['+ (ankle only)', '++ (up to knee)', '+++ (up to thigh)', '++++ (generalised)']}
                value={oedemaGrade} onChange={setOedemaGrade} color="amber" />
            </FL>
          )}
          <FL label="Icterus">
            <Pills options={['Absent', 'Present']} value={icterus} onChange={setIcterus} color="blue" />
          </FL>
          <FL label="Breathlessness">
            <Pills options={['None', 'On exertion', 'At rest']} value={breathlessness} onChange={setBreathlessness} color="blue" />
          </FL>
        </div>
        <FL label="Notes"><Inp value={generalNotes} onChange={setGeneralNotes} placeholder="Additional general findings…" /></FL>
      </Section>

      {/* Obstetric examination */}
      <Section title="Obstetric Examination (Abdominal)" value={secObstetric} onChange={setSecObstetric} accent="pink">
        <div className="grid grid-cols-2 gap-4">
          <FL label="Fundal height" sub="(cm from pubic symphysis)">
            <Inp type="number" value={fundusHeight} onChange={setFundusHeight} placeholder="e.g. 28" />
          </FL>
          <FL label="Uterine lie">
            <Pills options={['Longitudinal', 'Transverse', 'Oblique']} value={lie} onChange={setLie} />
          </FL>
          <FL label="Presentation">
            <Pills options={['Cephalic', 'Breech', 'Shoulder', 'Not palpable']} value={presentation} onChange={setPresentation} />
          </FL>
          <FL label="Engagement">
            <Pills options={['Not engaged (5/5)', '4/5', '3/5', '2/5 (engaged)', '1/5', '0/5 (deeply)']}
              value={engagement} onChange={setEngagement} />
          </FL>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FL label="Fetal heart rate" sub="(bpm)">
            <Inp type="number" value={fetalHR} onChange={setFetalHR} placeholder="e.g. 148" />
          </FL>
          <FL label="FHR rhythm">
            <Pills options={['Regular', 'Irregular', 'Not heard (early GA)']} value={fetalHRRhythm} onChange={setFetalHRRhythm} />
          </FL>
          <FL label="Liquor (clinical)">
            <Pills options={['Adequate', 'Reduced — oligohydramnios', 'Excess — polyhydramnios', 'Not assessed']}
              value={liquor} onChange={setLiquor} />
          </FL>
          <FL label="Uterine contractions">
            <Pills options={['None', 'Braxton Hicks (irregular)', 'Regular (possible labour)', 'Painful (active labour)']}
              value={contractions} onChange={setContractions} />
          </FL>
        </div>
        <Gate label="Scar tenderness (previous CS)?" value={scarTenderness} onChange={setScarTenderness} alert>
          <p className="text-xs text-red-600">Scar tenderness — assess for impending rupture</p>
        </Gate>
        <FL label="Obstetric examination notes">
          <textarea rows={2} value={obsNotes} onChange={e => setObsNotes(e.target.value)}
            placeholder="Any additional findings…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none" />
        </FL>
      </Section>

      {/* PV / Speculum */}
      <Section title="Per Vaginum / Speculum Examination" value={secPV} onChange={setSecPV} accent="purple">
        <div className="grid grid-cols-2 gap-4">
          <FL label="Cervical effacement">
            <Pills options={['Uneffaced', '25%', '50%', '75%', 'Fully effaced']} value={cervixEff} onChange={setCervixEff} color="purple" />
          </FL>
          <FL label="Cervical dilatation">
            <Pills options={['Closed', 'Admits finger tip', '1 cm', '2 cm', '3 cm', '4+ cm (active labour)']}
              value={cervixDil} onChange={setCervixDil} color="purple" />
          </FL>
          <FL label="Membranes">
            <Pills options={['Intact', 'Bulging', 'Ruptured — clear', 'Ruptured — meconium stained', 'Not assessed']}
              value={membranes} onChange={setMembranes} color="purple" />
          </FL>
          <FL label="Station">
            <Pills options={['-3', '-2', '-1', '0 (at ischial spines)', '+1', '+2', '+3']}
              value={station} onChange={setStation} color="purple" />
          </FL>
        </div>
        <FL label="PV notes"><Inp value={pvNotes} onChange={setPvNotes} placeholder="Additional PV findings…" /></FL>
      </Section>
    </div>
  )

  const renderStage3 = () => (
    <div className="space-y-4">
      {/* Haemoglobin */}
      <Section title="Haemoglobin" value={secHb} onChange={setSecHb} accent="red">
        <div className="flex items-center gap-3">
          <FL label="Hb value" sub="(g/dL)">
            <Inp type="number" value={hb} onChange={setHb} placeholder="e.g. 10.2" />
          </FL>
          {hbSeverity && (
            <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${hbSeverity.bg} ${hbSeverity.color} shrink-0`}>
              {hbSeverity.label} anaemia
            </div>
          )}
        </div>
        {hbSeverity && (
          <FL label="Action taken">
            <Pills options={[
              'Continue oral iron — reinforce compliance',
              'Increase iron dose',
              'Add IV iron infusion',
              'Blood transfusion arranged',
              'Referred to physician',
              'Repeat Hb in 4 weeks',
            ]}
              value={hbAction} onChange={setHbAction} color="red" />
          </FL>
        )}
      </Section>

      {/* Urine R/E */}
      <Section title="Urine Routine Examination" value={secUrine} onChange={setSecUrine} accent="amber">
        <FL label="Findings">
          <Pills multi options={[
            'Normal', 'Proteinuria + (trace)', 'Proteinuria ++ (1+)', 'Proteinuria +++ (2+)',
            'Proteinuria ++++ (3+)', 'Glycosuria', 'Pus cells (UTI)', 'RBCs present',
            'Nitrites positive (UTI)', 'Ketones', 'Casts'
          ]}
            value={urineFindings} onChange={setUrineFindings} color="amber" />
        </FL>
        {urineFindings.some(f => f.includes('Proteinuria')) && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
            <p className="text-xs font-semibold text-orange-700">Proteinuria noted — correlate with BP for pre-eclampsia assessment</p>
          </div>
        )}
        <FL label="Urine notes"><Inp value={urineNote} onChange={setUrineNote} placeholder="MSU sent, culture pending, treatment initiated…" /></FL>
      </Section>

      {/* Blood sugar */}
      <Section title="Blood Sugar Monitoring" value={secSugar} onChange={setSecSugar} accent="amber">
        <div className="grid grid-cols-2 gap-4">
          <FL label="Fasting BS" sub="(mg/dL)"><Inp type="number" value={fastingBs} onChange={setFastingBs} placeholder="e.g. 88" /></FL>
          <FL label="2hr Post-prandial BS" sub="(mg/dL)"><Inp type="number" value={ppBs} onChange={setPpBs} placeholder="e.g. 130" /></FL>
          <FL label="Random BS" sub="(mg/dL)"><Inp type="number" value={rbsVal} onChange={setRbsVal} placeholder="e.g. 105" /></FL>
        </div>
        <FL label="Sugar control assessment">
          <Pills options={['Well controlled', 'Suboptimal — counselled', 'Poorly controlled — review treatment', 'Hypoglycaemic episodes reported']}
            value={sugarControl} onChange={setSugarControl} color="amber" />
        </FL>
      </Section>

      {/* Other investigations */}
      <Section title="Other Investigations This Visit" value={secOtherInvx} onChange={setSecOtherInvx} accent="teal">
        <FL label="Investigations done">
          <Pills multi options={[
            'TSH (thyroid)', 'TFT (thyroid function)', 'LFT (liver)', 'RFT (renal)',
            'Serum uric acid', 'LDH', 'Platelets / CBC', 'Serum ferritin',
            'HbA1c', 'VDRL', 'HIV re-test', 'Mid-stream urine culture',
            'Group B Streptococcus (GBS) swab', 'High vaginal swab',
            'Biophysical profile (BPP)', 'Fetal lung maturity',
          ]}
            value={otherInvx} onChange={setOtherInvx} color="teal" />
        </FL>
        <FL label="Results / notes">
          <textarea rows={2} value={otherInvxNote} onChange={e => setOtherInvxNote(e.target.value)}
            placeholder="Result values and actions taken…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
        </FL>
      </Section>
    </div>
  )

  const renderStage4 = () => (
    <div className="space-y-4">
      {/* Fetal movements */}
      <Section title="Fetal Movements" value={secFM} onChange={setSecFM} accent="pink">
        <FL label="Fetal movement status (as reported by mother)">
          <Pills options={['Good — felt clearly', 'Reduced — less than usual', 'Absent — not felt today', 'Not applicable (early gestation)']}
            value={fmStatus} onChange={setFmStatus} />
        </FL>
        {fmStatus?.includes('Reduced') || fmStatus?.includes('Absent') ? (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <p className="text-xs font-bold text-red-700">Reduced / absent fetal movements — CTG / BPP indicated urgently</p>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-4">
          <FL label="Daily kick count" sub="(per 12 hours)">
            <Inp type="number" value={fmCount} onChange={setFmCount} placeholder="e.g. 12" />
          </FL>
          <FL label="Movement pattern">
            <Pills options={['Active throughout day', 'More at night', 'Decreased since yesterday', 'Variable']}
              value={fmPattern} onChange={setFmPattern} />
          </FL>
        </div>
      </Section>

      {/* CTG / NST */}
      <Section title="CTG / Non-Stress Test (NST)" value={secCTG} onChange={setSecCTG} accent="green">
        <FL label="Overall CTG interpretation">
          <Pills options={['Reassuring (normal)', 'Non-reassuring (suspicious)', 'Abnormal (pathological)', 'Technically unsatisfactory — repeat']}
            value={ctgResult} onChange={setCtgResult}
            color={ctgResult?.includes('Reassuring') ? 'green' : ctgResult?.includes('Abnormal') ? 'red' : 'amber'} />
        </FL>
        {ctgResult === 'Abnormal (pathological)' && (
          <div className="bg-red-50 border border-red-300 rounded-lg px-3 py-2">
            <p className="text-xs font-bold text-red-700">Pathological CTG — immediate senior review and obstetric decision required</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <FL label="Baseline FHR" sub="(bpm)"><Inp type="number" value={ctgBaselineFHR} onChange={setCtgBaselineFHR} placeholder="e.g. 145" /></FL>
          <FL label="Baseline variability">
            <Pills options={['<5 bpm (reduced)', '5–25 bpm (normal)', '>25 bpm (saltatory)']}
              value={ctgVariability} onChange={setCtgVariability} color="green" />
          </FL>
          <FL label="Accelerations">
            <Pills options={['Present (≥2 in 20 min)', 'Absent']} value={ctgAccelerations} onChange={setCtgAccelerations} color="green" />
          </FL>
          <FL label="Decelerations">
            <Pills options={['None', 'Early (normal)', 'Variable', 'Late (ominous)', 'Prolonged']}
              value={ctgDecelerations} onChange={setCtgDecelerations}
              color={ctgDecelerations?.includes('Late') || ctgDecelerations?.includes('Prolonged') ? 'red' : 'green'} />
          </FL>
        </div>
        <FL label="CTG notes"><Inp value={ctgNote} onChange={setCtgNote} placeholder="Duration, indication, action taken…" /></FL>
      </Section>

      {/* Growth scan / USG */}
      <Section title="Growth Scan / Ultrasound" value={secUSG} onChange={setSecUSG} accent="blue">
        <div className="grid grid-cols-2 gap-4">
          <FL label="USG date"><input type="date" value={usgDate} onChange={e => setUsgDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" /></FL>
          <FL label="GA by USG"><Inp value={usgGA} onChange={setUsgGA} placeholder="e.g. 28w 3d" /></FL>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FL label="EFW" sub="(grams)"><Inp type="number" value={efw} onChange={setEfw} placeholder="e.g. 1150" /></FL>
          <FL label="EFW percentile">
            <Pills options={['<3rd (severely small)', '3rd–10th (small)', '10th–90th (normal)', '90th–97th (large)', '>97th (macrosomia)']}
              value={efwPercentile} onChange={setEfwPercentile}
              color={efwPercentile?.includes('<3rd') ? 'red' : efwPercentile?.includes('macrosomia') ? 'amber' : 'green'} />
          </FL>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FL label="AFI / Amniotic fluid" sub="(cm)"><Inp type="number" value={afIndex} onChange={setAfIndex} placeholder="e.g. 12" /></FL>
          <FL label="Placenta location">
            <Pills options={['Fundal', 'Anterior', 'Posterior', 'Lateral', 'Low-lying (<20 mm from os)', 'Praevia — major', 'Praevia — minor']}
              value={placentaLocation} onChange={setPlacentaLocation} />
          </FL>
        </div>
        <FL label="Placenta grade">
          <Pills options={['Grade 0', 'Grade I', 'Grade II', 'Grade III (mature)', 'Grade III+ (advanced maturity)']}
            value={placentaGrade} onChange={setPlacentaGrade} />
        </FL>
        <FL label="USG findings">
          <Pills multi options={[
            'Normal for gestation', 'IUGR / FGR noted', 'Macrosomia', 'Oligohydramnios',
            'Polyhydramnios', 'Short cervix (<25 mm)', 'Placenta praevia', 'Placenta accreta spectrum suspected',
            'Umbilical cord around neck', 'Fetal anomaly noted', 'Multiple pregnancy',
          ]}
            value={usgFindings} onChange={setUsgFindings} color="blue" />
        </FL>
        <FL label="USG notes">
          <textarea rows={2} value={usgNote} onChange={e => setUsgNote(e.target.value)}
            placeholder="Additional findings, correlation with dates, actions…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
        </FL>
      </Section>

      {/* Doppler */}
      <Section title="Doppler Study" value={secDoppler} onChange={setSecDoppler} accent="purple">
        <div className="grid grid-cols-2 gap-4">
          <FL label="Umbilical artery Doppler">
            <Pills options={['Normal S/D ratio', 'Raised S/D ratio', 'Absent end-diastolic flow (AEDF)', 'Reversed end-diastolic flow (REDF)']}
              value={umbilicalDoppler} onChange={setUmbilicalDoppler}
              color={umbilicalDoppler?.includes('Reversed') ? 'red' : umbilicalDoppler?.includes('Absent') ? 'red' : 'purple'} />
          </FL>
          <FL label="MCA Doppler (middle cerebral artery)">
            <Pills options={['Normal (PI >1)', 'Reduced PI (brain sparing)', 'CPR <1 (cerebroplacental ratio)']}
              value={mca} onChange={setMca} color="purple" />
          </FL>
        </div>
        {(umbilicalDoppler?.includes('Reversed') || umbilicalDoppler?.includes('Absent')) && (
          <div className="bg-red-50 border border-red-300 rounded-lg px-3 py-2">
            <p className="text-xs font-bold text-red-700">Absent / Reversed end-diastolic flow — urgent senior review; delivery timing decision</p>
          </div>
        )}
        <FL label="Doppler notes"><Inp value={dopplerNote} onChange={setDopplerNote} placeholder="Uterine artery Doppler, action plan…" /></FL>
      </Section>
    </div>
  )

  const renderStage5 = () => (
    <div className="space-y-4">
      {/* HTN monitoring */}
      <Section title="Hypertension Monitoring" value={secHTN} onChange={setSecHTN} accent="red">
        <FL label="BP trend this visit">
          <Pills options={['Controlled (BP <140/90)', 'Borderline (140–149 / 90–99)', 'Elevated (≥150/100)', 'Severe (≥160/110)']}
            value={bpTrend} onChange={setBpTrend}
            color={bpTrend?.includes('Severe') ? 'red' : bpTrend?.includes('Elevated') ? 'amber' : 'green'} />
        </FL>
        <FL label="Symptoms of pre-eclampsia">
          <Pills multi options={['None', 'Headache', 'Visual disturbance', 'Epigastric pain', 'Facial / hand oedema', 'Reduced urine output']}
            value={htnSymptoms} onChange={setHtnSymptoms} color="red" />
        </FL>
        <FL label="Urine protein">
          <Pills options={['Negative', '+1', '+2', '≥+3 (significant)', 'Not tested']}
            value={urineProtein} onChange={setUrineProtein}
            color={urineProtein?.includes('+3') || urineProtein?.includes('+2') ? 'red' : 'green'} />
        </FL>
        <FL label="Antihypertensive medication">
          <Inp value={antihyperMeds} onChange={setAntihyperMeds} placeholder="e.g. Labetalol 100mg BD, Nifedipine SR 20mg BD, Methyldopa 250mg TDS…" />
        </FL>
        <FL label="HTN management plan">
          <textarea rows={2} value={htnPlan} onChange={e => setHtnPlan(e.target.value)}
            placeholder="Dose adjustment, admission criteria, delivery timing, MgSO4 decision…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
        </FL>
      </Section>

      {/* GDM monitoring */}
      <Section title="Gestational Diabetes (GDM) Monitoring" value={secGDM} onChange={setSecGDM} accent="amber">
        <FL label="Sugar control this visit">
          <Pills options={['Well controlled (FBS <95, PPBS <120)', 'Acceptable (FBS 95–100, PPBS 120–140)', 'Poorly controlled (FBS >100, PPBS >140)', 'Hypoglycaemic episode this week']}
            value={gdmControl} onChange={setGdmControl}
            color={gdmControl?.includes('Poorly') ? 'red' : gdmControl?.includes('Well') ? 'green' : 'amber'} />
        </FL>
        <FL label="Current GDM management">
          <Pills options={['Diet and exercise only', 'Metformin', 'Glibenclamide', 'Insulin — basal', 'Insulin — prandial', 'Insulin — basal + prandial', 'Mixed insulin']}
            value={gdmMed} onChange={setGdmMed} color="amber" />
        </FL>
        {gdmMed?.includes('Insulin') && (
          <FL label="Insulin dose / regimen">
            <Inp value={gdmInsulinDose} onChange={setGdmInsulinDose} placeholder="e.g. Human Mixtard 20 units BD" />
          </FL>
        )}
        <FL label="Dietary compliance">
          <Pills options={['Good', 'Partial', 'Poor — dietitian counselling done', 'Dietitian referral requested']}
            value={gdmDiet} onChange={setGdmDiet} color="amber" />
        </FL>
        <FL label="GDM plan">
          <textarea rows={2} value={gdmPlan} onChange={e => setGdmPlan(e.target.value)}
            placeholder="Dose adjustment, SMBG targets, fetal monitoring plan, delivery planning…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
        </FL>
      </Section>

      {/* Anaemia management */}
      <Section title="Anaemia Management" value={secAnaemia} onChange={setSecAnaemia} accent="teal">
        <FL label="Iron supplement compliance">
          <Pills options={['Good — taking daily', 'Partial — missing doses', 'Poor — not taking', 'Unable to tolerate oral iron']}
            value={ironCompliance} onChange={setIronCompliance} color="teal" />
        </FL>
        <FL label="Current anaemia severity">
          <Pills options={['Improving', 'Stable (mild)', 'Stable (moderate)', 'Worsening', 'Severe — intervention needed']}
            value={anaemiaSeverity} onChange={setAnaemiaSeverity}
            color={anaemiaSeverity?.includes('Severe') || anaemiaSeverity?.includes('Worsening') ? 'red' : 'teal'} />
        </FL>
        <FL label="Anaemia management plan">
          <Pills multi options={['Continue oral iron', 'Escalate to IV iron infusion', 'Blood transfusion indicated', 'Serum ferritin / MCV ordered', 'Dietitian for iron-rich foods', 'Address underlying cause', 'Post-partum monitoring plan']}
            value={[]} onChange={() => {}} color="teal" />
        </FL>
        <FL label="Plan notes"><Inp value={anaemiaPlan} onChange={setAnaemiaPlan} placeholder="Specific action, response to previous treatment…" /></FL>
      </Section>

      {/* Preterm risk */}
      <Section title="Preterm Risk Monitoring" value={secPreterm} onChange={setSecPreterm} accent="purple">
        <FL label="Cervical length" sub="(mm — by TVS)">
          <Inp type="number" value={cervLength} onChange={setCervLength} placeholder="e.g. 28" />
        </FL>
        {cervLength && parseInt(cervLength) < 25 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
            <p className="text-xs font-bold text-orange-700">Short cervix ({'<'}25 mm) — consider progesterone / cerclage / transfer</p>
          </div>
        )}
        <FL label="Preterm symptoms">
          <Pills multi options={['None', 'Uterine tightenings / irregular contractions', 'Pelvic pressure', 'Low back pain', 'Mucoid PV discharge', 'Bleeding PV', 'Loss of fluid PV']}
            value={pretRemSymptoms} onChange={setPretRemSymptoms} color="purple" />
        </FL>
        <FL label="Preterm management plan">
          <textarea rows={2} value={pretRemPlan} onChange={e => setPretRemPlan(e.target.value)}
            placeholder="Vaginal progesterone dose, cerclage status, betamethasone if <34 weeks, tocolysis, transfer plan…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
        </FL>
      </Section>

      {/* Other high-risk */}
      <Section title="Other High-Risk Condition Monitoring" value={secOtherRisk} onChange={setSecOtherRisk} accent="blue">
        <textarea rows={3} value={otherRiskNote} onChange={e => setOtherRiskNote(e.target.value)}
          placeholder="e.g. Thalassaemia trait — partner tested; SLE — hydroxychloroquine continued; Cardiac — cardiology reviewed; APS — heparin dose…"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
      </Section>
    </div>
  )

  const renderStage6 = () => (
    <div className="space-y-4">
      {/* Supplement review */}
      <Section title="Supplement Compliance Review" value={secSupplements} onChange={setSecSupplements} accent="green">
        <div className="space-y-2">
          {[
            { label: 'Iron supplement', val: ironStatus, set: setIronStatus },
            { label: 'Folic acid / B-complex', val: folateStatus, set: setFolateStatus },
            { label: 'Calcium supplement', val: calciumStatus, set: setCalciumStatus },
            { label: 'Vitamin D', val: vitDStatus, set: setVitDStatus },
            { label: 'Low-dose aspirin', val: aspirinStatus, set: setAspirinStatus },
          ].map(({ label, val, set }) => (
            <div key={label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-700">{label}</span>
              <Pills options={['Taking', 'Not taking', 'Stopped — side effects', 'N/A']} value={val} onChange={set} color="green" />
            </div>
          ))}
        </div>
      </Section>

      {/* Vaccination */}
      <Section title="Vaccination Status" value={secVaccination} onChange={setSecVaccination} accent="teal">
        <div className="space-y-3">
          <FL label="TT / Td vaccination">
            <Pills options={['TT1 given today', 'TT2 given today', 'TT booster given today', 'Complete — no action needed', 'Refused', 'Due — not given today']}
              value={ttStatus} onChange={setTtStatus} color="teal" />
          </FL>
          <FL label="Tdap (pertussis booster)" sub="recommended 27–36 weeks">
            <Pills options={['Given today', 'Given previously', 'Due — counselled', 'Not available', 'Refused', 'N/A']}
              value={tdapStatus} onChange={setTdapStatus} color="teal" />
          </FL>
        </div>
      </Section>

      {/* Counselling */}
      <Section title="Counselling Topics Covered" value={secCounselling} onChange={setSecCounselling} accent="pink">
        <Pills multi options={[
          'Danger signs — when to come immediately',
          'Fetal kick count (≥10 kicks in 2 hours)',
          'Diet — iron-rich foods, protein, fluids, low GI if GDM',
          'Rest and activity — avoid heavy lifting',
          'Breast care and breastfeeding preparation',
          'Birth preparedness — bag ready, transport, money',
          'Institutional delivery — importance emphasised',
          'Normal labour signs vs emergency signs',
          'Perineal hygiene / vaginal discharge monitoring',
          'Mental health / mood awareness (EPDS screen)',
          'Newborn care basics',
          'Family planning post delivery',
          'Iron + calcium compliance — reminded',
          'COVID / seasonal illness precautions',
          'No self-medication — OTC drug risks',
          'Physiotherapy / pelvic floor exercises',
          'JSY / PMMVY government maternity benefit scheme',
        ]}
          value={counselTopics} onChange={setCounselTopics} />
      </Section>

      {/* Referrals */}
      <Section title="Referrals This Visit" value={secReferral} onChange={setSecReferral} accent="blue">
        <Pills multi options={[
          'High-risk ANC clinic', 'Maternal-foetal medicine / perinatology',
          'Cardiologist', 'Endocrinologist',
          'Nephrologist', 'Neurologist',
          'Haematologist', 'Ophthalmologist',
          'Psychiatry / psychologist', 'Nutritionist / dietitian',
          'Physiotherapy', 'Social worker',
          'ICTC (HIV counselling)', 'Dental',
          'Tertiary centre for delivery',
        ]}
          value={referrals} onChange={setReferrals} color="blue" />
      </Section>

      {/* Next visit — always shown */}
      <div className="border border-pink-200 rounded-xl p-4 bg-pink-50/20 space-y-4">
        <p className="text-xs font-bold text-pink-600 uppercase tracking-wide">Visit Summary & Next Appointment</p>
        <FL label="Overall assessment this visit">
          <Pills options={['Routine — all well', 'Stable — minor concerns addressed', 'Close monitoring required', 'High risk — admission / intervention']}
            value={overallAssessment} onChange={setOverallAssessment}
            color={overallAssessment?.includes('High risk') ? 'red' : overallAssessment?.includes('Close') ? 'amber' : 'green'} />
        </FL>
        <div className="grid grid-cols-2 gap-4">
          <FL label="Next ANC date">
            <input type="date" value={nextVisitDate} onChange={e => setNextVisitDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
          </FL>
          <FL label="Next visit at" sub="(weeks)">
            <Inp type="number" value={nextVisitWeeks} onChange={setNextVisitWeeks} placeholder="e.g. 32" />
          </FL>
        </div>
        <FL label="Visit notes / additional instructions">
          <textarea rows={3} value={planNotes} onChange={e => setPlanNotes(e.target.value)}
            placeholder="Key decisions, changes to management, escalation plan, what to watch for…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none" />
        </FL>
      </div>
    </div>
  )

  const stageContent = [
    renderStage1, renderStage2, renderStage3,
    renderStage4, renderStage5, renderStage6,
  ]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-6 pt-5 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-pink-100 rounded-lg">
              <Baby size={16} className="text-pink-600" />
            </div>
            <div>
              <span className="text-xs font-bold text-pink-600 uppercase tracking-wider">ANC Follow-up</span>
              <span className="text-xs text-gray-400 ml-2">Antenatal Visit Assessment</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {(calcGA || gestWeeks) && (
              <span className="text-xs font-bold bg-pink-100 text-pink-700 px-2.5 py-1 rounded-full">{gaDisplay}</span>
            )}
            {dangerSigns.length > 0 && (
              <span className="text-xs font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full animate-pulse">
                ⚠ Danger Signs
              </span>
            )}
            {bpAlert && (
              <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full">
                BP {bpAlert.level}
              </span>
            )}
          </div>
        </div>

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

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {stageContent[stage - 1]()}
        {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
      </div>

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
            {saving ? 'Saving…' : 'Save Visit'}
          </button>
        </div>
      </div>
    </div>
  )
}
