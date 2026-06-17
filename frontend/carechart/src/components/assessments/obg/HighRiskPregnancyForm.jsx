/**
 * @shared-pool — standalone clinical assessment, portal-agnostic
 * @category obg
 * High-Risk Pregnancy Assessment
 * Every section gated (Applicable / N/A). Auto risk-score from active sections.
 * Indian patient context: RHD, TB, thalassaemia, sickle cell, grand multiparity.
 */
import { useState, useMemo } from 'react'
import { AlertTriangle, Lock, Baby, Shield } from 'lucide-react'
import api from '../../../api/client'

// ── Section gate ──────────────────────────────────────────────────────────────
function Section({ title, value, onChange, children, accent = 'rose', riskWeight = 1 }) {
  const A = {
    rose:   { border: 'border-rose-200',   bg: 'bg-rose-50/40',    div: 'border-rose-100',   btn: 'bg-rose-500 text-white border-rose-500'   },
    red:    { border: 'border-red-200',    bg: 'bg-red-50/40',     div: 'border-red-100',    btn: 'bg-red-600 text-white border-red-600'     },
    orange: { border: 'border-orange-200', bg: 'bg-orange-50/40',  div: 'border-orange-100', btn: 'bg-orange-500 text-white border-orange-500'},
    amber:  { border: 'border-amber-200',  bg: 'bg-amber-50/40',   div: 'border-amber-100',  btn: 'bg-amber-500 text-white border-amber-500' },
    blue:   { border: 'border-blue-200',   bg: 'bg-blue-50/30',    div: 'border-blue-100',   btn: 'bg-blue-500 text-white border-blue-500'   },
    purple: { border: 'border-purple-200', bg: 'bg-purple-50/30',  div: 'border-purple-100', btn: 'bg-purple-600 text-white border-purple-600'},
    teal:   { border: 'border-teal-200',   bg: 'bg-teal-50/30',    div: 'border-teal-100',   btn: 'bg-teal-500 text-white border-teal-500'   },
    green:  { border: 'border-green-200',  bg: 'bg-green-50/30',   div: 'border-green-100',  btn: 'bg-green-600 text-white border-green-600' },
    pink:   { border: 'border-pink-200',   bg: 'bg-pink-50/30',    div: 'border-pink-100',   btn: 'bg-pink-500 text-white border-pink-500'   },
  }
  const a = A[accent] || A.rose
  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      value === 'Yes' ? a.border : value === 'No' ? 'border-gray-100' : 'border-gray-200'
    }`}>
      <div className={`flex items-center justify-between px-4 py-3 ${value === 'Yes' ? a.bg : 'bg-gray-50/60'}`}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`text-sm font-semibold truncate ${value === 'No' ? 'text-gray-400' : 'text-gray-700'}`}>{title}</span>
          {value === 'Yes' && riskWeight >= 2 && (
            <span className="shrink-0 text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded">HIGH</span>
          )}
        </div>
        <div className="flex gap-1.5 shrink-0 ml-2">
          <button type="button" onClick={() => onChange(v => v === 'Yes' ? '' : 'Yes')}
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all ${value === 'Yes' ? a.btn : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
            Applicable
          </button>
          <button type="button" onClick={() => onChange(v => v === 'No' ? '' : 'No')}
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all ${value === 'No' ? 'bg-gray-400 text-white border-gray-400' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
            N/A
          </button>
        </div>
      </div>
      {value === 'Yes' && <div className={`px-4 py-4 border-t ${a.div} space-y-4`}>{children}</div>}
      {value === 'No' && (
        <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-1.5">
          <Lock size={10} className="text-gray-300" />
          <p className="text-xs text-gray-400 italic">Not applicable — locked</p>
        </div>
      )}
    </div>
  )
}

function Pills({ options, value, onChange, multi = false, color = 'rose' }) {
  const active = multi ? (Array.isArray(value) ? value : []) : value
  const toggle = o => {
    if (multi) onChange(active.includes(o) ? active.filter(x => x !== o) : [...active, o])
    else onChange(active === o ? '' : o)
  }
  const cls = { rose:'bg-rose-500 text-white border-rose-500', red:'bg-red-600 text-white border-red-600', orange:'bg-orange-500 text-white border-orange-500', amber:'bg-amber-500 text-white border-amber-500', blue:'bg-blue-500 text-white border-blue-500', purple:'bg-purple-600 text-white border-purple-600', teal:'bg-teal-500 text-white border-teal-500', green:'bg-green-600 text-white border-green-600', pink:'bg-pink-500 text-white border-pink-500' }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button key={o} type="button" onClick={() => toggle(o)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            (multi ? active.includes(o) : active === o) ? (cls[color] || cls.rose) : 'bg-white text-gray-500 border-gray-200 hover:border-rose-300'
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
        <div className="flex gap-1.5 shrink-0">
          {[yesLabel, noLabel].map(opt => (
            <button key={opt} type="button" onClick={() => onChange(v => v === opt ? '' : opt)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                value === opt
                  ? opt === yesLabel ? alert ? 'bg-red-500 text-white border-red-500' : 'bg-rose-500 text-white border-rose-500' : 'bg-gray-400 text-white border-gray-400'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-rose-300'
              }`}>{opt}</button>
          ))}
        </div>
      </div>
      {value === yesLabel && children && <div className="ml-4 pl-3 border-l-2 border-rose-200 space-y-3 mt-2">{children}</div>}
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
      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
  )
}

function TA({ value, onChange, placeholder, rows = 2 }) {
  return (
    <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none" />
  )
}

// ── Stage config ──────────────────────────────────────────────────────────────
const STAGES = [
  { id: 1, label: 'Risk Profile' },
  { id: 2, label: 'Cardiac & HTN' },
  { id: 3, label: 'Metabolic' },
  { id: 4, label: 'Haem & Infective' },
  { id: 5, label: 'Obstetric Risks' },
  { id: 6, label: 'Fetal & Social' },
  { id: 7, label: 'Plan' },
]

// ── Risk level from score ─────────────────────────────────────────────────────
function scoreToRisk(n) {
  if (n === 0) return { level: 'Low Risk',       color: 'text-green-600',  bg: 'bg-green-50 border-green-300'  }
  if (n <= 2)  return { level: 'Moderate Risk',  color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-300'}
  if (n <= 4)  return { level: 'High Risk',      color: 'text-orange-600', bg: 'bg-orange-50 border-orange-300'}
  return             { level: 'Very High Risk',  color: 'text-red-700',    bg: 'bg-red-50 border-red-300'      }
}

// ── Main form ─────────────────────────────────────────────────────────────────
export default function HighRiskPregnancyForm({ admission, onClose, onSaved }) {
  const [stage,  setStage]  = useState(1)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  // ── Stage 1: Risk Profile ─────────────────────────────────────────────────
  const [visitDate,       setVisitDate]       = useState(new Date().toISOString().slice(0, 10))
  const [eddFinal,        setEddFinal]        = useState('')
  const [gestWeeks,       setGestWeeks]       = useState('')
  const [gestDays,        setGestDays]        = useState('')
  const [designatedBy,    setDesignatedBy]    = useState('')
  const [referredFrom,    setReferredFrom]    = useState('')
  const [overallRiskNote, setOverallRiskNote] = useState('')
  const [mdtInvolved,     setMdtInvolved]     = useState([])

  // ── Stage 2: Cardiac & Hypertensive ──────────────────────────────────────
  // Section: Hypertensive disorders
  const [secHTN,          setSecHTN]          = useState('')
  const [htnType,         setHtnType]         = useState([])
  const [htnSeverity,     setHtnSeverity]     = useState('')
  const [proteinuria,     setProteinuria]     = useState('')
  const [hellpFeatures,   setHellpFeatures]   = useState([])
  const [htnMeds,         setHtnMeds]         = useState('')
  const [seizureHx,       setSeizureHx]       = useState('')
  const [mgso4Used,       setMgso4Used]       = useState('')
  const [htnPlan,         setHtnPlan]         = useState('')

  // Section: Cardiac disease
  const [secCardiac,      setSecCardiac]      = useState('')
  const [cardiacType,     setCardiacType]     = useState([])
  const [nyha,            setNyha]            = useState('')
  const [cardiacMeds,     setCardiacMeds]     = useState('')
  const [cardioConsult,   setCardioConsult]   = useState('')
  const [cardiacPlan,     setCardiacPlan]     = useState('')

  // Section: DVT / Thromboembolism
  const [secVTE,          setSecVTE]          = useState('')
  const [vteType,         setVteType]         = useState([])
  const [anticoagulant,   setAnticoagulant]   = useState('')
  const [vtePlan,         setVtePlan]         = useState('')

  // ── Stage 3: Metabolic & Endocrine ────────────────────────────────────────
  // Section: Diabetes
  const [secDM,           setSecDM]           = useState('')
  const [dmType,          setDmType]          = useState('')
  const [hba1c,           setHba1c]           = useState('')
  const [dmMgmt,          setDmMgmt]          = useState([])
  const [dmControl,       setDmControl]       = useState('')
  const [dmComplications, setDmComplications] = useState([])
  const [dmPlan,          setDmPlan]          = useState('')

  // Section: Thyroid
  const [secThyroid,      setSecThyroid]      = useState('')
  const [thyroidType,     setThyroidType]     = useState('')
  const [tshValue,        setTshValue]        = useState('')
  const [thyroidMed,      setThyroidMed]      = useState('')
  const [thyroidPlan,     setThyroidPlan]     = useState('')

  // Section: Renal
  const [secRenal,        setSecRenal]        = useState('')
  const [renalType,       setRenalType]       = useState([])
  const [creatinine,      setCreatinine]      = useState('')
  const [proteinuriaRen,  setProteinuriaRen]  = useState('')
  const [nephroCons,      setNephroCons]      = useState('')
  const [renalPlan,       setRenalPlan]       = useState('')

  // Section: Autoimmune
  const [secAutoimmune,   setSecAutoimmune]   = useState('')
  const [autoType,        setAutoType]        = useState([])
  const [autoMeds,        setAutoMeds]        = useState('')
  const [rheuCons,        setRheuCons]        = useState('')
  const [autoPlan,        setAutoPlan]        = useState('')

  // Section: Neurological
  const [secNeuro,        setSecNeuro]        = useState('')
  const [neuroType,       setNeuroType]       = useState([])
  const [aedMeds,         setAedMeds]         = useState('')
  const [seizureControl,  setSeizureControl]  = useState('')
  const [neuroPlan,       setNeuroPlan]       = useState('')

  // ── Stage 4: Haematological & Infectious ──────────────────────────────────
  // Section: Anaemia
  const [secAnaemia,      setSecAnaemia]      = useState('')
  const [hbValue,         setHbValue]         = useState('')
  const [anaemiaType,     setAnaemiaType]     = useState([])
  const [anaemiaSeverity, setAnaemiaSeverity] = useState('')
  const [anaemiaTx,       setAnaemiaTx]       = useState([])
  const [anaemiaPlan,     setAnaemiaPlan]     = useState('')

  // Section: Haemoglobinopathy
  const [secHaemoglob,    setSecHaemoglob]    = useState('')
  const [haemoglobType,   setHaemoglobType]   = useState('')
  const [partnerTested,   setPartnerTested]   = useState('')
  const [partnerResult,   setPartnerResult]   = useState('')
  const [geneticCounsel,  setGeneticCounsel]  = useState('')
  const [haemoPlan,       setHaemoPlan]       = useState('')

  // Section: Thrombocytopenia
  const [secPlatelet,     setSecPlatelet]     = useState('')
  const [plateletCount,   setPlateletCount]   = useState('')
  const [plateletType,    setPlateletType]    = useState('')
  const [plateletPlan,    setPlateletPlan]    = useState('')

  // Section: HIV
  const [secHIV,          setSecHIV]          = useState('')
  const [hivCD4,          setHivCD4]          = useState('')
  const [artRegimen,      setArtRegimen]      = useState('')
  const [viralLoad,       setViralLoad]       = useState('')
  const [pmtctPlan,       setPmtctPlan]       = useState('')

  // Section: Hepatitis B/C
  const [secHep,          setSecHep]          = useState('')
  const [hepType,         setHepType]         = useState([])
  const [hepMgmt,         setHepMgmt]         = useState('')
  const [neonatalImmuno,  setNeonatalImmuno]  = useState('')

  // Section: Tuberculosis
  const [secTB,           setSecTB]           = useState('')
  const [tbStatus,        setTbStatus]        = useState('')
  const [tbMeds,          setTbMeds]          = useState([])
  const [tbPlan,          setTbPlan]          = useState('')

  // Section: Other infections
  const [secOtherInfx,    setSecOtherInfx]    = useState('')
  const [otherInfxNote,   setOtherInfxNote]   = useState('')

  // ── Stage 5: Obstetric Risk Factors ──────────────────────────────────────
  // Section: Previous CS / uterine scar
  const [secPrevCS,       setSecPrevCS]       = useState('')
  const [numCS,           setNumCS]           = useState('')
  const [scarType,        setScarType]        = useState('')
  const [interdelivInterval, setInterdelivInterval] = useState('')
  const [scarThinning,    setScarThinning]    = useState('')
  const [vbacConsidered,  setVbacConsidered]  = useState('')
  const [csPlan,          setCsPlan]          = useState('')

  // Section: Bad obstetric history (BOH)
  const [secBOH,          setSecBOH]          = useState('')
  const [bohFeatures,     setBohFeatures]     = useState([])
  const [bohCount,        setBohCount]        = useState('')
  const [bohInvestigated, setBohInvestigated] = useState('')
  const [bohPlan,         setBohPlan]         = useState('')

  // Section: Multiple pregnancy
  const [secMultiple,     setSecMultiple]     = useState('')
  const [multType,        setMultType]        = useState('')
  const [chorionicity,    setChorionicity]    = useState('')
  const [tttsRisk,        setTttsRisk]        = useState('')
  const [multPlan,        setMultPlan]        = useState('')

  // Section: Placenta praevia / accreta
  const [secPlacenta,     setSecPlacenta]     = useState('')
  const [placentaType,    setPlacentaType]    = useState('')
  const [accretaSuspected,setAccretaSuspected]= useState('')
  const [placentaPlan,    setPlacentaPlan]    = useState('')

  // Section: Preterm labour risk
  const [secPreterm,      setSecPreterm]      = useState('')
  const [cervLengthMm,    setCervLengthMm]    = useState('')
  const [pretRiskFactors, setPretRiskFactors] = useState([])
  const [betamethasone,   setBetamethasone]   = useState('')
  const [progesteroneGiven,setProgesteroneGiven]=useState('')
  const [cerclage,        setCerclage]        = useState('')
  const [pretPlan,        setPretPlan]        = useState('')

  // Section: IUGR / FGR
  const [secIUGR,         setSecIUGR]         = useState('')
  const [iugrSeverity,    setIugrSeverity]    = useState('')
  const [efwValue,        setEfwValue]        = useState('')
  const [dopplerResult,   setDopplerResult]   = useState('')
  const [iugrPlan,        setIugrPlan]        = useState('')

  // Section: Polyhydramnios / Oligohydramnios
  const [secLiquor,       setSecLiquor]       = useState('')
  const [liquorType,      setLiquorType]      = useState('')
  const [afiValue,        setAfiValue]        = useState('')
  const [liquorCause,     setLiquorCause]     = useState('')
  const [liquorPlan,      setLiquorPlan]      = useState('')

  // Section: Post-dates
  const [secPostDates,    setSecPostDates]    = useState('')
  const [weeksOverdue,    setWeeksOverdue]    = useState('')
  const [bishopScore,     setBishopScore]     = useState('')
  const [iolPlan,         setIolPlan]         = useState('')

  // ── Stage 6: Fetal & Social Risk ─────────────────────────────────────────
  // Section: Fetal anomaly
  const [secFetalAnom,    setSecFetalAnom]    = useState('')
  const [anomalyDetails,  setAnomalyDetails]  = useState('')
  const [anomalySystem,   setAnomalySystem]   = useState([])
  const [fetomedicine,    setFetomedicine]    = useState('')
  const [anomalyPlan,     setAnomalyPlan]     = useState('')

  // Section: Chromosomal risk
  const [secChromosomal,  setSecChromosomal]  = useState('')
  const [chromType,       setChromType]       = useState([])
  const [invasiveTesting, setInvasiveTesting] = useState('')
  const [invasiveResult,  setInvasiveResult]  = useState('')
  const [chromPlan,       setChromPlan]       = useState('')

  // Section: Rh isoimmunisation
  const [secRhIso,        setSecRhIso]        = useState('')
  const [ictResult,       setIctResult]       = useState('')
  const [antibodyTitre,   setAntibodyTitre]   = useState('')
  const [fetalAnaemia,    setFetalAnaemia]    = useState('')
  const [antiDGiven,      setAntiDGiven]      = useState('')
  const [rhPlan,          setRhPlan]          = useState('')

  // Section: Adolescent pregnancy
  const [secAdolescent,   setSecAdolescent]   = useState('')
  const [maternalAge,     setMaternalAge]     = useState('')
  const [adolPsychSupport,setAdolPsychSupport]= useState('')
  const [adolPlan,        setAdolPlan]        = useState('')

  // Section: Grand multiparity
  const [secGrandMulti,   setSecGrandMulti]   = useState('')
  const [parityCount,     setParityCount]     = useState('')
  const [atoniaRisk,      setAtoniaRisk]      = useState('')
  const [grandMultiPlan,  setGrandMultiPlan]  = useState('')

  // Section: Social / nutritional risk
  const [secSocial,       setSecSocial]       = useState('')
  const [socialRisks,     setSocialRisks]     = useState([])
  const [nutritionStatus, setNutritionStatus] = useState('')
  const [muac,            setMuac]            = useState('')
  const [socialPlan,      setSocialPlan]      = useState('')

  // ── Stage 7: Plan ─────────────────────────────────────────────────────────
  const [ancFrequency,    setAncFrequency]    = useState('')
  const [deliveryPlace,   setDeliveryPlace]   = useState('')
  const [deliveryMode,    setDeliveryMode]    = useState('')
  const [deliveryTiming,  setDeliveryTiming]  = useState('')
  const [corticosteroids, setCorticosteroids] = useState('')
  const [corticosteroidDone, setCorticosteroidDone] = useState('')
  const [admissionIndications, setAdmissionIndications] = useState([])
  const [emergencyPlan,   setEmergencyPlan]   = useState('')
  const [specialistReferrals, setSpecialistReferrals] = useState([])
  const [investigationSchedule, setInvestigationSchedule] = useState([])
  const [bloodBankPlan,   setBloodBankPlan]   = useState('')
  const [neonatologyAlert,setNeonatologyAlert]= useState('')
  const [planNotes,       setPlanNotes]       = useState('')
  const [nextReviewDate,  setNextReviewDate]  = useState('')

  // ── GA auto-calc ─────────────────────────────────────────────────────────
  const calcGA = useMemo(() => {
    if (!eddFinal) return null
    const days = 280 - Math.round((new Date(eddFinal) - new Date()) / 86400000)
    if (days < 0) return null
    return { weeks: Math.floor(days / 7), days: days % 7 }
  }, [eddFinal])

  const gaDisplay = calcGA ? `${calcGA.weeks}w ${calcGA.days}d` : gestWeeks ? `${gestWeeks}w ${gestDays || 0}d` : '—'

  // ── Risk score (count Applicable sections) ────────────────────────────────
  const allSections = [
    { s: secHTN,       w: 2 }, { s: secCardiac, w: 3 }, { s: secVTE,       w: 1 },
    { s: secDM,        w: 2 }, { s: secThyroid, w: 1 }, { s: secRenal,     w: 2 },
    { s: secAutoimmune,w: 2 }, { s: secNeuro,   w: 1 },
    { s: secAnaemia,   w: 1 }, { s: secHaemoglob,w:2 }, { s: secPlatelet,  w: 1 },
    { s: secHIV,       w: 2 }, { s: secHep,     w: 1 }, { s: secTB,        w: 2 },
    { s: secOtherInfx, w: 1 },
    { s: secPrevCS,    w: 1 }, { s: secBOH,     w: 2 }, { s: secMultiple,  w: 2 },
    { s: secPlacenta,  w: 2 }, { s: secPreterm, w: 2 }, { s: secIUGR,      w: 2 },
    { s: secLiquor,    w: 1 }, { s: secPostDates,w:1 },
    { s: secFetalAnom, w: 2 }, { s: secChromosomal,w:2},{ s: secRhIso,     w: 1 },
    { s: secAdolescent,w: 1 }, { s: secGrandMulti,w:1 },{ s: secSocial,    w: 1 },
  ]
  const riskScore = useMemo(() => allSections.reduce((sum, { s, w }) => s === 'Yes' ? sum + w : sum, 0), [
    secHTN, secCardiac, secVTE, secDM, secThyroid, secRenal, secAutoimmune, secNeuro,
    secAnaemia, secHaemoglob, secPlatelet, secHIV, secHep, secTB, secOtherInfx,
    secPrevCS, secBOH, secMultiple, secPlacenta, secPreterm, secIUGR, secLiquor, secPostDates,
    secFetalAnom, secChromosomal, secRhIso, secAdolescent, secGrandMulti, secSocial,
  ])
  const risk = useMemo(() => scoreToRisk(riskScore), [riskScore])
  const activeCount = allSections.filter(({ s }) => s === 'Yes').length

  // ── Stage done dots ───────────────────────────────────────────────────────
  const stageDone = useMemo(() => ({
    1: !!(eddFinal || gestWeeks),
    2: [secHTN, secCardiac, secVTE].some(s => s !== ''),
    3: [secDM, secThyroid, secRenal, secAutoimmune, secNeuro].some(s => s !== ''),
    4: [secAnaemia, secHaemoglob, secHIV, secHep, secTB].some(s => s !== ''),
    5: [secPrevCS, secBOH, secMultiple, secPlacenta, secPreterm, secIUGR].some(s => s !== ''),
    6: [secFetalAnom, secChromosomal, secAdolescent, secSocial].some(s => s !== ''),
    7: !!(deliveryPlace || planNotes),
  }), [eddFinal, gestWeeks, secHTN, secCardiac, secVTE, secDM, secThyroid, secRenal,
       secAutoimmune, secNeuro, secAnaemia, secHaemoglob, secHIV, secHep, secTB,
       secPrevCS, secBOH, secMultiple, secPlacenta, secPreterm, secIUGR,
       secFetalAnom, secChromosomal, secAdolescent, secSocial, deliveryPlace, planNotes])

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true); setError('')
    const sec = (s, data) => s === 'Yes' ? data : { applicable: false }
    const payload = {
      type: 'high_risk_pregnancy',
      risk_profile: { gestational_age: gaDisplay, edd: eddFinal, risk_score: riskScore, risk_level: risk.level, active_risk_count: activeCount, designated_by: designatedBy, referred_from: referredFrom, mdt_team: mdtInvolved, notes: overallRiskNote },
      hypertensive_disorders: sec(secHTN, { types: htnType, severity: htnSeverity, proteinuria, hellp_features: hellpFeatures, medications: htnMeds, seizure_history: seizureHx, mgso4_used: mgso4Used, plan: htnPlan }),
      cardiac: sec(secCardiac, { types: cardiacType, nyha_class: nyha, medications: cardiacMeds, cardiology_consult: cardioConsult, plan: cardiacPlan }),
      vte: sec(secVTE, { type: vteType, anticoagulant, plan: vtePlan }),
      diabetes: sec(secDM, { type: dmType, hba1c, management: dmMgmt, control: dmControl, complications: dmComplications, plan: dmPlan }),
      thyroid: sec(secThyroid, { type: thyroidType, tsh: tshValue, medication: thyroidMed, plan: thyroidPlan }),
      renal: sec(secRenal, { conditions: renalType, creatinine, proteinuria: proteinuriaRen, nephrology_consult: nephroCons, plan: renalPlan }),
      autoimmune: sec(secAutoimmune, { conditions: autoType, medications: autoMeds, rheumatology_consult: rheuCons, plan: autoPlan }),
      neurological: sec(secNeuro, { conditions: neuroType, aed_medications: aedMeds, seizure_control: seizureControl, plan: neuroPlan }),
      anaemia: sec(secAnaemia, { hb: hbValue, type: anaemiaType, severity: anaemiaSeverity, treatment: anaemiaTx, plan: anaemiaPlan }),
      haemoglobinopathy: sec(secHaemoglob, { type: haemoglobType, partner_tested: partnerTested, partner_result: partnerResult, genetic_counselling: geneticCounsel, plan: haemoPlan }),
      thrombocytopenia: sec(secPlatelet, { count: plateletCount, type: plateletType, plan: plateletPlan }),
      hiv: sec(secHIV, { cd4: hivCD4, art_regimen: artRegimen, viral_load: viralLoad, pmtct_plan: pmtctPlan }),
      hepatitis: sec(secHep, { types: hepType, management: hepMgmt, neonatal_immunoprophylaxis: neonatalImmuno }),
      tuberculosis: sec(secTB, { status: tbStatus, medications: tbMeds, plan: tbPlan }),
      other_infections: sec(secOtherInfx, { notes: otherInfxNote }),
      previous_cs: sec(secPrevCS, { count: numCS, scar_type: scarType, interdelivery_interval: interdelivInterval, scar_thinning: scarThinning, vbac_considered: vbacConsidered, plan: csPlan }),
      bad_obstetric_history: sec(secBOH, { features: bohFeatures, count: bohCount, investigated: bohInvestigated, plan: bohPlan }),
      multiple_pregnancy: sec(secMultiple, { type: multType, chorionicity, ttts_risk: tttsRisk, plan: multPlan }),
      placenta_praevia: sec(secPlacenta, { type: placentaType, accreta_suspected: accretaSuspected, plan: placentaPlan }),
      preterm_risk: sec(secPreterm, { cervical_length_mm: cervLengthMm, risk_factors: pretRiskFactors, betamethasone: betamethasone, betamethasone_done: corticosteroidDone, progesterone: progesteroneGiven, cerclage, plan: pretPlan }),
      iugr: sec(secIUGR, { severity: iugrSeverity, efw_grams: efwValue, doppler: dopplerResult, plan: iugrPlan }),
      liquor_abnormality: sec(secLiquor, { type: liquorType, afi: afiValue, cause: liquorCause, plan: liquorPlan }),
      post_dates: sec(secPostDates, { weeks_overdue: weeksOverdue, bishop_score: bishopScore, iol_plan: iolPlan }),
      fetal_anomaly: sec(secFetalAnom, { details: anomalyDetails, systems: anomalySystem, fetomedicine_consult: fetomedicine, plan: anomalyPlan }),
      chromosomal: sec(secChromosomal, { type: chromType, invasive_testing: invasiveTesting, result: invasiveResult, plan: chromPlan }),
      rh_isoimmunisation: sec(secRhIso, { ict: ictResult, titre: antibodyTitre, fetal_anaemia: fetalAnaemia, anti_d_given: antiDGiven, plan: rhPlan }),
      adolescent: sec(secAdolescent, { age: maternalAge, psychosocial_support: adolPsychSupport, plan: adolPlan }),
      grand_multiparity: sec(secGrandMulti, { parity: parityCount, atony_risk: atoniaRisk, plan: grandMultiPlan }),
      social_nutritional: sec(secSocial, { risks: socialRisks, nutrition: nutritionStatus, muac_cm: muac, plan: socialPlan }),
      management_plan: {
        anc_frequency: ancFrequency, delivery_place: deliveryPlace, delivery_mode: deliveryMode,
        delivery_timing: deliveryTiming, corticosteroids: { indicated: corticosteroids, done: corticosteroidDone },
        admission_indications: admissionIndications, emergency_plan: emergencyPlan,
        specialist_referrals: specialistReferrals, investigation_schedule: investigationSchedule,
        blood_bank: bloodBankPlan, neonatology_alert: neonatologyAlert,
        next_review: nextReviewDate, notes: planNotes,
      },
    }
    try {
      await api.post(`/inpatient/admissions/${admission.id}/notes`, { note_type: 'assessment', note_text: JSON.stringify(payload) })
      onSaved?.()
    } catch (e) {
      setError(e?.message || 'Save failed')
      setSaving(false)
    }
  }

  // ── Stage renders ─────────────────────────────────────────────────────────

  const renderStage1 = () => (
    <div className="space-y-4">
      <div className="border border-rose-200 rounded-xl p-4 bg-rose-50/20 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FL label="Assessment date"><input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" /></FL>
          <FL label="EDD (working)"><input type="date" value={eddFinal} onChange={e => setEddFinal(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" /></FL>
        </div>
        {calcGA ? (
          <div className="flex items-center justify-between bg-white border border-rose-200 rounded-lg px-3 py-2">
            <span className="text-xs text-gray-500">Gestational age</span>
            <span className="text-sm font-bold text-rose-600">{calcGA.weeks}w {calcGA.days}d</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <FL label="GA weeks"><Inp type="number" value={gestWeeks} onChange={setGestWeeks} placeholder="e.g. 28" /></FL>
            <FL label="GA days"><Inp type="number" value={gestDays} onChange={setGestDays} placeholder="0–6" /></FL>
          </div>
        )}
      </div>

      {/* Risk score summary */}
      {activeCount > 0 && (
        <div className={`border rounded-xl p-4 ${risk.bg}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className={risk.color} />
              <p className={`text-sm font-bold ${risk.color}`}>{risk.level}</p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${risk.color}`}>{riskScore}</p>
              <p className="text-[10px] text-gray-500">{activeCount} risk factor{activeCount > 1 ? 's' : ''}</p>
            </div>
          </div>
          <p className="text-xs text-gray-600">Risk score auto-calculated from all applicable sections across stages 2–6.</p>
        </div>
      )}

      <FL label="Designated as high-risk by">
        <Pills options={['Obstetrician', 'Maternal-foetal medicine specialist', 'Referring physician', 'Referral from PHC / CHC', 'Referral from district hospital']}
          value={designatedBy} onChange={setDesignatedBy} />
      </FL>
      <FL label="Referred from"><Inp value={referredFrom} onChange={setReferredFrom} placeholder="Facility / hospital name…" /></FL>
      <FL label="MDT / specialist team involved">
        <Pills multi options={['Obstetrician', 'Maternal-foetal medicine', 'Cardiologist', 'Endocrinologist', 'Nephrologist', 'Neurologist', 'Haematologist', 'Rheumatologist', 'Neonatologist', 'Anaesthesiologist', 'Psychiatrist', 'Dietitian', 'Social worker', 'Geneticist']}
          value={mdtInvolved} onChange={setMdtInvolved} />
      </FL>
      <FL label="Overall risk summary / clinical notes">
        <TA value={overallRiskNote} onChange={setOverallRiskNote} rows={3} placeholder="Overall clinical impression, dominant risks, immediate concerns…" />
      </FL>
    </div>
  )

  const renderStage2 = () => (
    <div className="space-y-4">
      <Section title="Hypertensive Disorders of Pregnancy" value={secHTN} onChange={setSecHTN} accent="red" riskWeight={2}>
        <FL label="Type(s)">
          <Pills multi options={['Chronic hypertension (pre-existing)', 'Gestational hypertension', 'Pre-eclampsia (mild)', 'Pre-eclampsia with severe features', 'Superimposed pre-eclampsia on chronic HTN', 'Eclampsia', 'HELLP syndrome']}
            value={htnType} onChange={setHtnType} color="red" />
        </FL>
        <FL label="Current BP severity">
          <Pills options={['Controlled (<140/90)', 'Mild (140–149 / 90–99)', 'Severe (≥150/100)', 'Very severe (≥160/110)']}
            value={htnSeverity} onChange={setHtnSeverity}
            color={htnSeverity?.includes('Very') || htnSeverity?.includes('Severe') ? 'red' : htnSeverity?.includes('Mild') ? 'amber' : 'green'} />
        </FL>
        <FL label="Proteinuria">
          <Pills options={['Absent', 'Trace / +1', '+2', '≥+3 (significant)', 'Protein:creatinine ratio elevated']}
            value={proteinuria} onChange={setProteinuria}
            color={proteinuria?.includes('+3') || proteinuria?.includes('+2') ? 'red' : 'green'} />
        </FL>
        <FL label="HELLP syndrome features (if applicable)">
          <Pills multi options={['Haemolysis (LDH elevated)', 'Elevated liver enzymes (ALT/AST)', 'Low platelets (<100 × 10⁹/L)', 'Epigastric pain', 'RUQ tenderness']}
            value={hellpFeatures} onChange={setHellpFeatures} color="red" />
        </FL>
        <FL label="Antihypertensive medications"><Inp value={htnMeds} onChange={setHtnMeds} placeholder="e.g. Labetalol 200mg BD, Nifedipine SR 30mg OD, Methyldopa 500mg TDS…" /></FL>
        <Gate label="Previous seizure / eclampsia?" value={seizureHx} onChange={setSeizureHx} alert />
        <Gate label="MgSO4 administered?" value={mgso4Used} onChange={setMgso4Used}>
          <p className="text-xs text-gray-500">Document dose, route, maintenance infusion rate, monitoring.</p>
        </Gate>
        <FL label="HTN management plan"><TA value={htnPlan} onChange={setHtnPlan} placeholder="BP targets, antihypertensive adjustments, delivery timing, MgSO4 continuation plan, corticosteroids…" /></FL>
      </Section>

      <Section title="Cardiac Disease in Pregnancy" value={secCardiac} onChange={setSecCardiac} accent="red" riskWeight={3}>
        <FL label="Cardiac condition">
          <Pills multi options={['Rheumatic heart disease (RHD) — mitral stenosis', 'Rheumatic heart disease — mitral regurgitation', 'Rheumatic heart disease — aortic valve', 'Congenital heart disease (corrected)', 'Congenital heart disease (uncorrected)', 'Peripartum cardiomyopathy', 'Dilated cardiomyopathy', 'Hypertrophic cardiomyopathy', 'Arrhythmia / conduction defect', 'Prosthetic heart valve', 'Pulmonary hypertension', 'Ischaemic heart disease']}
            value={cardiacType} onChange={setCardiacType} color="red" />
        </FL>
        <FL label="NYHA functional class">
          <Pills options={['Class I (no symptoms)', 'Class II (mild symptoms on exertion)', 'Class III (symptoms on less than ordinary activity)', 'Class IV (symptoms at rest)']}
            value={nyha} onChange={setNyha}
            color={nyha?.includes('IV') ? 'red' : nyha?.includes('III') ? 'orange' : nyha?.includes('II') ? 'amber' : 'green'} />
        </FL>
        {(nyha?.includes('III') || nyha?.includes('IV')) && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <p className="text-xs font-bold text-red-700">NYHA III–IV: High risk for maternal morbidity and mortality — senior cardiology + MFM input essential</p>
          </div>
        )}
        <FL label="Cardiac medications"><Inp value={cardiacMeds} onChange={setCardiacMeds} placeholder="e.g. Metoprolol 25mg BD, Digoxin 0.125mg OD, Anticoagulation, Diuretics…" /></FL>
        <FL label="Cardiology consult status">
          <Pills options={['Regular follow-up — stable', 'Reviewed — plan changed', 'Urgent review requested', 'Joint obstetric-cardiology clinic', 'Not yet reviewed']}
            value={cardioConsult} onChange={setCardioConsult} />
        </FL>
        <FL label="Cardiac management plan"><TA value={cardiacPlan} onChange={setCardiacPlan} placeholder="Mode / timing of delivery, anaesthesia plan, monitoring (echo, continuous ECG), fluid management, subacute bacterial endocarditis prophylaxis…" /></FL>
      </Section>

      <Section title="Venous Thromboembolism (DVT / PE)" value={secVTE} onChange={setSecVTE} accent="orange">
        <FL label="VTE type">
          <Pills multi options={['DVT — current pregnancy', 'DVT — previous pregnancy', 'PE — current', 'PE — previous', 'Thrombophilia (inherited)', 'Thrombophilia (acquired / APS)', 'Superficial thrombophlebitis']}
            value={vteType} onChange={setVteType} color="orange" />
        </FL>
        <FL label="Anticoagulation">
          <Pills options={['LMWH (prophylactic dose)', 'LMWH (therapeutic dose)', 'Unfractionated heparin', 'Transitioning from warfarin', 'Compression stockings only', 'Not on anticoagulation']}
            value={anticoagulant} onChange={setAnticoagulant} color="orange" />
        </FL>
        <FL label="VTE management plan"><TA value={vtePlan} onChange={setVtePlan} placeholder="Dose, monitoring, timing to stop before delivery, neuraxial anaesthesia timing, postpartum continuation…" /></FL>
      </Section>
    </div>
  )

  const renderStage3 = () => (
    <div className="space-y-4">
      <Section title="Diabetes in Pregnancy" value={secDM} onChange={setSecDM} accent="amber" riskWeight={2}>
        <FL label="Type">
          <Pills options={['Type 1 (pre-existing)', 'Type 2 (pre-existing)', 'Gestational diabetes (GDM) — diet controlled', 'Gestational diabetes (GDM) — medication', 'GDM on insulin']}
            value={dmType} onChange={setDmType} color="amber" />
        </FL>
        <FL label="HbA1c at booking" sub="(%)"><Inp type="number" value={hba1c} onChange={setHba1c} placeholder="e.g. 7.2" /></FL>
        <FL label="Current management">
          <Pills multi options={['Dietary modification only', 'Metformin', 'Glibenclamide', 'Insulin — basal (once daily)', 'Insulin — prandial (with meals)', 'Basal-bolus regimen', 'Premixed insulin', 'Continuous glucose monitoring (CGM)', 'SMBG 4 times daily']}
            value={dmMgmt} onChange={setDmMgmt} color="amber" />
        </FL>
        <FL label="Glycaemic control">
          <Pills options={['Good (FBS <95, PPBS <120)', 'Suboptimal (FBS 95–110, PPBS 120–140)', 'Poor (FBS >110, PPBS >140)', 'Hypoglycaemic episodes']}
            value={dmControl} onChange={setDmControl}
            color={dmControl?.includes('Poor') ? 'red' : dmControl?.includes('Good') ? 'green' : 'amber'} />
        </FL>
        <FL label="Diabetic complications">
          <Pills multi options={['Diabetic nephropathy', 'Diabetic retinopathy', 'Diabetic neuropathy', 'Cardiovascular disease', 'None identified']}
            value={dmComplications} onChange={setDmComplications} color="amber" />
        </FL>
        <FL label="DM management plan"><TA value={dmPlan} onChange={setDmPlan} placeholder="Insulin dose adjustments, SMBG targets, fetal growth monitoring schedule, neonatology plan, delivery timing…" /></FL>
      </Section>

      <Section title="Thyroid Disorders" value={secThyroid} onChange={setSecThyroid} accent="teal">
        <FL label="Type">
          <Pills options={['Hypothyroidism (primary)', 'Subclinical hypothyroidism', 'Graves disease / hyperthyroidism', 'Thyroid nodule / goitre', 'Post-thyroidectomy']}
            value={thyroidType} onChange={setThyroidType} color="teal" />
        </FL>
        <FL label="TSH value" sub="(mIU/L)"><Inp type="number" value={tshValue} onChange={setTshValue} placeholder="e.g. 3.2" /></FL>
        {tshValue && (parseFloat(tshValue) > 4 || parseFloat(tshValue) < 0.1) && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
            <p className="text-xs font-bold text-orange-700">TSH out of trimester-specific range — dose adjustment may be needed</p>
          </div>
        )}
        <FL label="Medication"><Inp value={thyroidMed} onChange={setThyroidMed} placeholder="e.g. Levothyroxine 100mcg OD, Carbimazole 10mg BD, PTU 100mg TDS…" /></FL>
        <FL label="Thyroid plan"><TA value={thyroidPlan} onChange={setThyroidPlan} placeholder="Monitoring interval for TSH, dose adjustment targets, fetal thyroid surveillance, neonatal thyroid plan…" /></FL>
      </Section>

      <Section title="Renal Disease" value={secRenal} onChange={setSecRenal} accent="blue" riskWeight={2}>
        <FL label="Renal conditions">
          <Pills multi options={['Chronic kidney disease (CKD)', 'Lupus nephritis', 'IgA nephropathy', 'Diabetic nephropathy', 'Polycystic kidney disease', 'Recurrent UTI / pyelonephritis', 'Solitary kidney', 'Previous renal transplant', 'Dialysis-dependent']}
            value={renalType} onChange={setRenalType} color="blue" />
        </FL>
        <div className="grid grid-cols-2 gap-4">
          <FL label="Serum creatinine" sub="(mg/dL)"><Inp type="number" value={creatinine} onChange={setCreatinine} placeholder="e.g. 0.8" /></FL>
          <FL label="Proteinuria on urine"><Inp value={proteinuriaRen} onChange={setProteinuriaRen} placeholder="e.g. 2+ / 1.5 g/24hr" /></FL>
        </div>
        <FL label="Nephrology consult">
          <Pills options={['Regular joint follow-up', 'Reviewed — stable', 'Urgent review requested', 'Not yet reviewed']}
            value={nephroCons} onChange={setNephroCons} />
        </FL>
        <FL label="Renal management plan"><TA value={renalPlan} onChange={setRenalPlan} placeholder="BP targets, medication review (ACE/ARB stopped in pregnancy), monitoring schedule, delivery timing…" /></FL>
      </Section>

      <Section title="Autoimmune / Connective Tissue Disease" value={secAutoimmune} onChange={setSecAutoimmune} accent="purple" riskWeight={2}>
        <FL label="Conditions">
          <Pills multi options={['SLE (Systemic Lupus Erythematosus)', 'Antiphospholipid syndrome (APS)', 'Rheumatoid arthritis', 'Systemic sclerosis / Scleroderma', 'Sjögren syndrome', 'Mixed connective tissue disease', 'Myasthenia gravis', 'Inflammatory bowel disease']}
            value={autoType} onChange={setAutoType} color="purple" />
        </FL>
        <FL label="Current medications"><Inp value={autoMeds} onChange={setAutoMeds} placeholder="e.g. Hydroxychloroquine 200mg OD, Low-dose aspirin, LMWH (APS), Azathioprine…" /></FL>
        <FL label="Rheumatology consult status">
          <Pills options={['Regular joint care', 'Reviewed — stable', 'Urgent review', 'Not reviewed']} value={rheuCons} onChange={setRheuCons} />
        </FL>
        <FL label="Autoimmune management plan"><TA value={autoPlan} onChange={setAutoPlan} placeholder="Disease flare monitoring, neonatal lupus plan, LMWH bridging, neonatal checks (complete heart block — anti-Ro/La)…" /></FL>
      </Section>

      <Section title="Neurological Conditions" value={secNeuro} onChange={setSecNeuro} accent="purple">
        <FL label="Conditions">
          <Pills multi options={['Epilepsy / seizure disorder', 'Migraine with aura', 'Multiple sclerosis', 'Myasthenia gravis', 'Intracranial hypertension (IIH)', 'Cerebral venous thrombosis (CVT)', 'Spinal cord injury', 'Cerebrovascular disease']}
            value={neuroType} onChange={setNeuroType} color="purple" />
        </FL>
        <FL label="Anti-epileptic drugs (AED)"><Inp value={aedMeds} onChange={setAedMeds} placeholder="e.g. Levetiracetam 500mg BD, Lamotrigine 100mg BD, Carbamazepine — avoid in pregnancy ideally…" /></FL>
        <FL label="Seizure control">
          <Pills options={['Well controlled (seizure-free ≥1 year)', 'Partially controlled', 'Breakthrough seizures']}
            value={seizureControl} onChange={setSeizureControl}
            color={seizureControl?.includes('Breakthrough') ? 'red' : seizureControl?.includes('Well') ? 'green' : 'amber'} />
        </FL>
        <FL label="Neuro management plan"><TA value={neuroPlan} onChange={setNeuroPlan} placeholder="AED continuation plan, folic acid high dose (5mg), neonatal vitamin K, breastfeeding compatibility, neurologist review…" /></FL>
      </Section>
    </div>
  )

  const renderStage4 = () => (
    <div className="space-y-4">
      <Section title="Anaemia" value={secAnaemia} onChange={setSecAnaemia} accent="rose">
        <FL label="Haemoglobin" sub="(g/dL)">
          <div className="flex items-center gap-3">
            <Inp type="number" value={hbValue} onChange={setHbValue} placeholder="e.g. 8.5" />
            {hbValue && (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${
                parseFloat(hbValue) < 7 ? 'bg-red-100 text-red-700 border-red-300'
                : parseFloat(hbValue) < 10 ? 'bg-orange-100 text-orange-700 border-orange-300'
                : 'bg-yellow-100 text-yellow-700 border-yellow-300'
              }`}>{parseFloat(hbValue) < 7 ? 'Severe' : parseFloat(hbValue) < 10 ? 'Moderate' : 'Mild'}</span>
            )}
          </div>
        </FL>
        <FL label="Type of anaemia">
          <Pills multi options={['Iron deficiency (most common in India)', 'Megaloblastic (B12 / folate)', 'Haemolytic', 'Aplastic', 'Anaemia of chronic disease', 'Mixed']}
            value={anaemiaType} onChange={setAnaemiaType} color="rose" />
        </FL>
        <FL label="Current treatment">
          <Pills multi options={['Oral iron', 'IV iron infusion (Ferric carboxymaltose)', 'IV iron infusion (Low-molecular weight iron dextran)', 'Blood transfusion', 'Vitamin B12 injection', 'Folic acid supplement', 'Dietary counselling']}
            value={anaemiaTx} onChange={setAnaemiaTx} color="rose" />
        </FL>
        <FL label="Anaemia plan"><TA value={anaemiaPlan} onChange={setAnaemiaPlan} placeholder="Target Hb before delivery, transfusion trigger, blood bank crossmatch plan, PPH risk management…" /></FL>
      </Section>

      <Section title="Haemoglobinopathy (Thalassaemia / Sickle Cell)" value={secHaemoglob} onChange={setSecHaemoglob} accent="orange" riskWeight={2}>
        <FL label="Type">
          <Pills options={['Thalassaemia major (on transfusion)', 'Thalassaemia intermedia', 'Thalassaemia trait (carrier)', 'Sickle cell disease (SS)', 'Sickle-thalassaemia (HbSβ)', 'Sickle trait (AS)', 'HbE disease / trait']}
            value={haemoglobType} onChange={setHaemoglobType} color="orange" />
        </FL>
        <FL label="Partner tested?">
          <Pills options={['Yes — normal', 'Yes — carrier / affected', 'Not yet tested', 'Refused']}
            value={partnerTested} onChange={setPartnerTested}
            color={partnerResult?.includes('carrier') || partnerResult?.includes('affected') ? 'red' : 'green'} />
        </FL>
        {(partnerTested?.includes('carrier') || partnerTested?.includes('affected') || partnerTested?.includes('Yes — carrier')) && (
          <FL label="Partner result details"><Inp value={partnerResult} onChange={setPartnerResult} placeholder="Type of haemoglobinopathy confirmed by HPLC…" /></FL>
        )}
        <FL label="Genetic counselling">
          <Pills options={['Done — both partners counselled', 'Offered — declined', 'Pending', 'Not applicable (maternal only)']}
            value={geneticCounsel} onChange={setGeneticCounsel} />
        </FL>
        <FL label="Haemoglobinopathy plan"><TA value={haemoPlan} onChange={setHaemoPlan} placeholder="PGD / prenatal diagnosis (amniocentesis / CVS) if both carriers, transfusion protocol for thalassaemia major, sickle cell crisis management in pregnancy…" /></FL>
      </Section>

      <Section title="Thrombocytopenia" value={secPlatelet} onChange={setSecPlatelet} accent="amber">
        <div className="grid grid-cols-2 gap-4">
          <FL label="Platelet count" sub="(× 10⁹/L)"><Inp type="number" value={plateletCount} onChange={setPlateletCount} placeholder="e.g. 80" /></FL>
          <FL label="Type">
            <Pills options={['Gestational thrombocytopenia', 'ITP (immune thrombocytopenia)', 'Pre-eclampsia related', 'HELLP related', 'TTP / HUS', 'Aplastic anaemia']}
              value={plateletType} onChange={setPlateletType} color="amber" />
          </FL>
        </div>
        <FL label="Plan"><TA value={plateletPlan} onChange={setPlateletPlan} placeholder="Threshold for platelet transfusion, epidural safety cut-off (>80×10⁹), corticosteroids for ITP, neonatal platelet monitoring…" /></FL>
      </Section>

      <Section title="HIV in Pregnancy" value={secHIV} onChange={setSecHIV} accent="red" riskWeight={2}>
        <div className="grid grid-cols-2 gap-4">
          <FL label="CD4 count" sub="(cells/μL)"><Inp type="number" value={hivCD4} onChange={setHivCD4} placeholder="e.g. 450" /></FL>
          <FL label="Viral load"><Inp value={viralLoad} onChange={setViralLoad} placeholder="e.g. Undetectable / 200 copies/mL" /></FL>
        </div>
        <FL label="ART regimen"><Inp value={artRegimen} onChange={setArtRegimen} placeholder="e.g. TDF + 3TC + EFV (Tenofovir + Lamivudine + Efavirenz)…" /></FL>
        <FL label="PMTCT plan"><TA value={pmtctPlan} onChange={setPmtctPlan} placeholder="Mode of delivery (if viral load known), infant NVP post-delivery, infant HIV PCR at 6 weeks, breastfeeding vs formula counselling, ICTC follow-up…" /></FL>
      </Section>

      <Section title="Hepatitis B / C" value={secHep} onChange={setSecHep} accent="amber">
        <FL label="Type">
          <Pills multi options={['HBsAg positive (Hepatitis B)', 'HBeAg positive (high infectivity)', 'HCV antibody positive (Hepatitis C)', 'Active hepatitis with elevated LFTs']}
            value={hepType} onChange={setHepType} color="amber" />
        </FL>
        <FL label="Management"><Inp value={hepMgmt} onChange={setHepMgmt} placeholder="e.g. Tenofovir for HBV if HBeAg+, Hepatologist review, LFT monitoring…" /></FL>
        <FL label="Neonatal immunoprophylaxis plan">
          <Pills options={['HBV vaccine at birth + HBIg (within 12 hrs) — planned', 'HBV vaccine series planned', 'Not planned (HBsAg negative)', 'Details in notes']}
            value={neonatalImmuno} onChange={setNeonatalImmuno} color="amber" />
        </FL>
      </Section>

      <Section title="Tuberculosis (TB) in Pregnancy" value={secTB} onChange={setSecTB} accent="teal" riskWeight={2}>
        <FL label="TB status">
          <Pills options={['Active pulmonary TB — on treatment', 'Active extra-pulmonary TB', 'Latent TB — on LTBI treatment', 'Previously treated — completed', 'MDR-TB', 'TB-HIV coinfection']}
            value={tbStatus} onChange={setTbStatus} color="teal" />
        </FL>
        <FL label="Anti-TB medications">
          <Pills multi options={['Isoniazid (H)', 'Rifampicin (R)', 'Pyrazinamide (Z)', 'Ethambutol (E)', '2HRZE / 4HR regimen', 'Pyridoxine (B6) supplement — mandatory with INH', 'MDR-TB regimen (specialist guided)']}
            value={tbMeds} onChange={setTbMeds} color="teal" />
        </FL>
        <FL label="TB management plan"><TA value={tbPlan} onChange={setTbPlan} placeholder="RNTCP / NTEP direct supervision, sputum AFB monitoring, contact tracing of newborn, BCG at birth, TB-HIV coinfection ART timing, neonatal TB prophylaxis (INH 10mg/kg)…" /></FL>
      </Section>

      <Section title="Other Infections / Infestations" value={secOtherInfx} onChange={setSecOtherInfx} accent="teal">
        <TA value={otherInfxNote} onChange={setOtherInfxNote} rows={3}
          placeholder="e.g. Malaria (P. falciparum — chloroquine / artemisinin, avoid doxycycline), Dengue, Typhoid, TORCH infections (CMV / toxoplasma / rubella / herpes), Group B Streptococcus colonisation, recurrent UTI / pyelonephritis…" />
      </Section>
    </div>
  )

  const renderStage5 = () => (
    <div className="space-y-4">
      <Section title="Previous Caesarean Section / Uterine Scar" value={secPrevCS} onChange={setSecPrevCS} accent="rose">
        <div className="grid grid-cols-2 gap-4">
          <FL label="Number of previous CS"><Pills options={['1', '2', '3', '4 or more']} value={numCS} onChange={setNumCS} /></FL>
          <FL label="Scar type"><Pills options={['LSCS (lower segment)', 'Classical (upper segment)', 'Inverted T / J-incision', 'Unknown']} value={scarType} onChange={setScarType} /></FL>
        </div>
        <FL label="Inter-delivery interval"><Inp value={interdelivInterval} onChange={setInterdelivInterval} placeholder="e.g. 18 months (short — rupture risk increased)" /></FL>
        <Gate label="Scar thinning on ultrasound?" value={scarThinning} onChange={setScarThinning} alert>
          <p className="text-xs text-red-600">Scar thinning ({'<'}2.5 mm myometrial thickness) — counsel regarding uterine rupture risk; likely repeat LSCS</p>
        </Gate>
        <FL label="VBAC considered?">
          <Pills options={['Yes — VBAC trial planned', 'No — elective repeat LSCS', 'Contraindicated (≥2 CS, classical scar)', 'Patient declined VBAC', 'Under discussion']}
            value={vbacConsidered} onChange={setVbacConsidered} />
        </FL>
        <FL label="CS management plan"><TA value={csPlan} onChange={setCsPlan} placeholder="Delivery timing (planned CS weeks), type of anaesthesia, blood bank crossmatch, placenta accreta screening, PPH preparedness…" /></FL>
      </Section>

      <Section title="Bad Obstetric History (BOH)" value={secBOH} onChange={setSecBOH} accent="orange" riskWeight={2}>
        <FL label="Features">
          <Pills multi options={['Recurrent miscarriage (≥3 consecutive)', 'Stillbirth (antepartum / intrapartum)', 'Neonatal death', 'Previous severe IUGR', 'Previous pre-eclampsia', 'Previous placental abruption', 'Previous PPH requiring transfusion', 'Previous perinatal death (unexplained)']}
            value={bohFeatures} onChange={setBohFeatures} color="orange" />
        </FL>
        <FL label="Number of adverse events"><Inp type="number" value={bohCount} onChange={setBohCount} placeholder="e.g. 2" /></FL>
        <FL label="Investigated / cause identified">
          <Pills options={['Yes — cause identified and treated', 'Partially investigated', 'No cause found', 'Not yet investigated']}
            value={bohInvestigated} onChange={setBohInvestigated} />
        </FL>
        <FL label="BOH management plan"><TA value={bohPlan} onChange={setBohPlan} placeholder="Thrombophilia screen results, aspirin 75mg from 12 weeks, LMWH if APS, fetal surveillance frequency, delivery timing…" /></FL>
      </Section>

      <Section title="Multiple Pregnancy" value={secMultiple} onChange={setSecMultiple} accent="pink" riskWeight={2}>
        <div className="grid grid-cols-2 gap-4">
          <FL label="Type"><Pills options={['Twins', 'Triplets', 'Quadruplets', 'Higher order']} value={multType} onChange={setMultType} /></FL>
          <FL label="Chorionicity / amnionicity">
            <Pills options={['DCDA (dichorionic-diamniotic)', 'MCDA (monochorionic-diamniotic)', 'MCMA (monochorionic-monoamniotic)', 'Trichorionic (triplets)', 'Not determined']}
              value={chorionicity} onChange={setChorionicity} />
          </FL>
        </div>
        {(chorionicity?.includes('MCDA') || chorionicity?.includes('MCMA')) && (
          <Gate label="TTTS (twin-to-twin transfusion syndrome) risk / features?" value={tttsRisk} onChange={setTttsRisk} alert>
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-xs font-bold text-red-700">TTTS — refer to feto-maternal medicine; consider fetoscopic laser photocoagulation if Quintero Stage II+</p>
            </div>
          </Gate>
        )}
        <FL label="Multiple pregnancy plan"><TA value={multPlan} onChange={setMultPlan} placeholder="Fortnightly growth scans (MCDA), delivery timing (DCDA 38w, MCDA 36–37w, MCMA 34–35w), mode, NICU alert…" /></FL>
      </Section>

      <Section title="Placenta Praevia / Accreta Spectrum" value={secPlacenta} onChange={setSecPlacenta} accent="red" riskWeight={2}>
        <FL label="Placental position">
          <Pills options={['Low-lying (20–35 mm from os)', 'Praevia — minor (covering os partially)', 'Praevia — major (centrally covering os)', 'Praevia — posterior', 'Vasa praevia suspected']}
            value={placentaType} onChange={setPlacentaType} color="red" />
        </FL>
        <Gate label="Placenta accreta spectrum suspected?" value={accretaSuspected} onChange={setAccretaSuspected} alert>
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <p className="text-xs font-bold text-red-700">Accreta spectrum: plan CS at tertiary centre with blood bank, interventional radiology, multidisciplinary team. Cell salvage. Consent for hysterectomy.</p>
          </div>
        </Gate>
        <FL label="Placenta plan"><TA value={placentaPlan} onChange={setPlacentaPlan} placeholder="Admission at 34–36 weeks, elective LSCS timing, blood transfusion availability, pelvic floor and urology team, antenatal corticosteroids…" /></FL>
      </Section>

      <Section title="Preterm Labour Risk" value={secPreterm} onChange={setSecPreterm} accent="purple" riskWeight={2}>
        <FL label="Cervical length on TVS" sub="(mm)"><Inp type="number" value={cervLengthMm} onChange={setCervLengthMm} placeholder="e.g. 22" /></FL>
        {cervLengthMm && parseInt(cervLengthMm) < 25 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
            <p className="text-xs font-bold text-orange-700">Short cervix ({'<'}25 mm) — vaginal progesterone / cerclage depending on history and GA</p>
          </div>
        )}
        <FL label="Risk factors for preterm">
          <Pills multi options={['Previous preterm birth', 'Cervical incompetence', 'Previous LLETZ / cone biopsy', 'Multiple pregnancy', 'Uterine anomaly (bicornuate / septate)', 'Polyhydramnios', 'Preterm PROM (PPROM)', 'Infections / chorioamnionitis', 'Social / domestic factors']}
            value={pretRiskFactors} onChange={setPretRiskFactors} color="purple" />
        </FL>
        <FL label="Antenatal corticosteroids (if <34 weeks)">
          <Pills options={['Given — Betamethasone 12mg IM × 2 doses (24 hrs apart)', 'Given — Dexamethasone 6mg IM × 4 doses', 'Not yet indicated', 'GA ≥34 weeks — not applicable']}
            value={betamethasone} onChange={setBetamethasone} color="purple" />
        </FL>
        <FL label="Vaginal progesterone">
          <Pills options={['Started — Micronised progesterone 200mg nocte', 'Started — Hydroxyprogesterone caproate IM', 'Not indicated', 'Contraindicated']}
            value={progesteroneGiven} onChange={setProgesteroneGiven} />
        </FL>
        <Gate label="Cervical cerclage done / planned?" value={cerclage} onChange={setCerclage}>
          <p className="text-xs text-gray-500">Document type (McDonald / Shirodkar), GA placed, GA planned for removal.</p>
        </Gate>
        <FL label="Preterm management plan"><TA value={pretPlan} onChange={setPretPlan} placeholder="Tocolysis if in labour, neonatology NICU alert, transfer to tertiary centre if <28 weeks, magnesium sulphate for neuroprotection if <32 weeks…" /></FL>
      </Section>

      <Section title="Intrauterine Growth Restriction (IUGR / FGR)" value={secIUGR} onChange={setSecIUGR} accent="orange" riskWeight={2}>
        <div className="grid grid-cols-2 gap-4">
          <FL label="Severity">
            <Pills options={['SGA (EFW 3rd–10th centile)', 'FGR moderate (EFW <3rd centile)', 'FGR severe + Doppler changes', 'Asymmetric IUGR', 'Symmetric IUGR']}
              value={iugrSeverity} onChange={setIugrSeverity} color="orange" />
          </FL>
          <FL label="EFW" sub="(grams)"><Inp type="number" value={efwValue} onChange={setEfwValue} placeholder="e.g. 850" /></FL>
        </div>
        <FL label="Umbilical artery Doppler">
          <Pills options={['Normal', 'Raised S/D ratio', 'Absent end-diastolic flow (AEDF)', 'Reversed end-diastolic flow (REDF)']}
            value={dopplerResult} onChange={setDopplerResult}
            color={dopplerResult?.includes('Reversed') || dopplerResult?.includes('Absent') ? 'red' : dopplerResult?.includes('Normal') ? 'green' : 'amber'} />
        </FL>
        {(dopplerResult?.includes('Reversed') || dopplerResult?.includes('Absent')) && (
          <div className="bg-red-50 border border-red-300 rounded-lg px-3 py-2">
            <p className="text-xs font-bold text-red-700">AEDF / REDF — urgent delivery decision; senior review immediately</p>
          </div>
        )}
        <FL label="IUGR management plan"><TA value={iugrPlan} onChange={setIugrPlan} placeholder="CTG twice weekly, BPP, Doppler schedule, delivery timing by gestational age and Doppler findings, NICU alert…" /></FL>
      </Section>

      <Section title="Liquor Volume Abnormality" value={secLiquor} onChange={setSecLiquor} accent="teal">
        <FL label="Type">
          <Pills options={['Oligohydramnios (AFI <5 cm)', 'Borderline (AFI 5–8 cm)', 'Polyhydramnios (AFI >24 cm)', 'Severe polyhydramnios (AFI >30 cm)']}
            value={liquorType} onChange={setLiquorType} color="teal" />
        </FL>
        <div className="grid grid-cols-2 gap-4">
          <FL label="AFI" sub="(cm)"><Inp type="number" value={afiValue} onChange={setAfiValue} placeholder="e.g. 4.2" /></FL>
          <FL label="Likely cause"><Inp value={liquorCause} onChange={setLiquorCause} placeholder="e.g. IUGR, PROM, fetal renal anomaly, GDM, idiopathic…" /></FL>
        </div>
        <FL label="Liquor management plan"><TA value={liquorPlan} onChange={setLiquorPlan} placeholder="Hydration, fetal surveillance, delivery timing…" /></FL>
      </Section>

      <Section title="Post-Term / Post-Dates Pregnancy" value={secPostDates} onChange={setSecPostDates} accent="amber">
        <div className="grid grid-cols-2 gap-4">
          <FL label="Weeks overdue"><Inp type="number" value={weeksOverdue} onChange={setWeeksOverdue} placeholder="e.g. 41+3" /></FL>
          <FL label="Bishop score"><Inp type="number" value={bishopScore} onChange={setBishopScore} placeholder="e.g. 4" min={0} max={13} /></FL>
        </div>
        <FL label="Induction of labour plan"><TA value={iolPlan} onChange={setIolPlan} placeholder="IOL method (Dinoprostone / Misoprostol / Foley balloon / ARM + oxytocin), timing, CTG monitoring, CS if IOL fails…" /></FL>
      </Section>
    </div>
  )

  const renderStage6 = () => (
    <div className="space-y-4">
      <Section title="Fetal Structural Anomaly" value={secFetalAnom} onChange={setSecFetalAnom} accent="orange" riskWeight={2}>
        <FL label="Systems involved">
          <Pills multi options={['CNS (hydrocephalus / neural tube defect)', 'Cardiac (structural CHD)', 'Abdominal wall defect (gastroschisis / omphalocele)', 'Renal / urological', 'Skeletal dysplasia', 'Facial cleft', 'Pulmonary (CPAM / diaphragmatic hernia)', 'GI atresia', 'Chromosomal / genetic syndrome related', 'Multiple anomalies']}
            value={anomalySystem} onChange={setAnomalySystem} color="orange" />
        </FL>
        <FL label="Anomaly details"><TA value={anomalyDetails} onChange={setAnomalyDetails} placeholder="Specific anomaly, severity, prognosis, confirmed by fetal MRI if needed…" /></FL>
        <FL label="Feto-medicine / tertiary centre review">
          <Pills options={['Done — plan formulated', 'Referral made — awaiting', 'Patient declined', 'Not yet referred']}
            value={fetomedicine} onChange={setFetomedicine} />
        </FL>
        <FL label="Anomaly management plan"><TA value={anomalyPlan} onChange={setAnomalyPlan} placeholder="Parental counselling, delivery at tertiary centre, neonatal surgical team alert, palliative care discussion if lethal anomaly, termination if applicable…" /></FL>
      </Section>

      <Section title="Chromosomal Abnormality Risk" value={secChromosomal} onChange={setSecChromosomal} accent="purple" riskWeight={2}>
        <FL label="Suspected / confirmed">
          <Pills multi options={['Down syndrome (Trisomy 21)', 'Edwards syndrome (Trisomy 18)', 'Patau syndrome (Trisomy 13)', 'Turner syndrome (45X)', 'Klinefelter (47XXY)', 'DiGeorge / 22q11 deletion', 'Other chromosomal disorder']}
            value={chromType} onChange={setChromType} color="purple" />
        </FL>
        <FL label="Invasive prenatal testing">
          <Pills options={['CVS (chorionic villus sampling) — done', 'Amniocentesis — done', 'Offered — declined', 'Not yet done', 'Not indicated']}
            value={invasiveTesting} onChange={setInvasiveTesting} />
        </FL>
        <FL label="Karyotype result"><Inp value={invasiveResult} onChange={setInvasiveResult} placeholder="e.g. 46,XX (normal female); 47,XX+21 (Down syndrome)…" /></FL>
        <FL label="Chromosomal management plan"><TA value={chromPlan} onChange={setChromPlan} placeholder="Genetic counselling, decision re: continuation, delivery centre with NICU and neonatal surgery, palliative care team if needed…" /></FL>
      </Section>

      <Section title="Rh Isoimmunisation / Red Cell Alloimmunisation" value={secRhIso} onChange={setSecRhIso} accent="amber">
        <div className="grid grid-cols-2 gap-4">
          <FL label="ICT result"><Pills options={['Positive', 'Negative', 'Not done']} value={ictResult} onChange={setIctResult} color={ictResult === 'Positive' ? 'amber' : 'green'} /></FL>
          <FL label="Antibody titre (if positive)"><Inp value={antibodyTitre} onChange={setAntibodyTitre} placeholder="e.g. Anti-D 1:16" /></FL>
        </div>
        <FL label="Fetal anaemia assessment">
          <Pills options={['MCA Doppler normal', 'MCA PSV elevated (suspected fetal anaemia)', 'Fetal hydrops present', 'IUT (intrauterine transfusion) done']}
            value={fetalAnaemia} onChange={setFetalAnaemia} color={fetalAnaemia?.includes('hydrops') || fetalAnaemia?.includes('elevated') ? 'red' : 'green'} />
        </FL>
        <FL label="Anti-D given">
          <Pills options={['Given at 28 weeks', 'Given at 34 weeks', 'Given post-sensitising event', 'Not indicated (Rh positive)', 'Already sensitised — not indicated']}
            value={antiDGiven} onChange={setAntiDGiven} />
        </FL>
        <FL label="Rh isoimmunisation plan"><TA value={rhPlan} onChange={setRhPlan} placeholder="Serial MCA Doppler frequency, threshold for IUT, delivery timing, neonatal exchange transfusion plan…" /></FL>
      </Section>

      <Section title="Adolescent Pregnancy (Age <18)" value={secAdolescent} onChange={setSecAdolescent} accent="pink">
        <FL label="Maternal age at booking" sub="(years)"><Inp type="number" value={maternalAge} onChange={setMaternalAge} placeholder="e.g. 16" /></FL>
        <FL label="Psychosocial support">
          <Pills options={['Good — family support present', 'Partial', 'Poor — no family support', 'Domestic / school issues', 'Referred to social worker', 'Referred to psychiatry / counselling']}
            value={adolPsychSupport} onChange={setAdolPsychSupport} />
        </FL>
        <FL label="Adolescent plan"><TA value={adolPlan} onChange={setAdolPlan} placeholder="POCSO / legal considerations, nutritional support (risk of anaemia + malnutrition higher), CPD risk (immature pelvis), social worker referral, school support, family planning post-delivery…" /></FL>
      </Section>

      <Section title="Grand Multiparity (Parity ≥5)" value={secGrandMulti} onChange={setSecGrandMulti} accent="rose">
        <div className="grid grid-cols-2 gap-4">
          <FL label="Current parity"><Inp type="number" value={parityCount} onChange={setParityCount} placeholder="e.g. 5 (G6P5)" /></FL>
          <FL label="Uterine atony risk">
            <Pills options={['Standard risk', 'High risk — previous PPH', 'Very high risk — G8+']} value={atoniaRisk} onChange={setAtoniaRisk}
              color={atoniaRisk?.includes('High') ? 'red' : atoniaRisk?.includes('Very') ? 'red' : 'amber'} />
          </FL>
        </div>
        <FL label="Grand multiparity plan"><TA value={grandMultiPlan} onChange={setGrandMultiPlan} placeholder="Active management of 3rd stage (oxytocin 10 IU IM), blood crossmatch, IV access, PPH kit ready, uterotonic escalation plan (ergometrine, carboprost, misoprostol), family planning counselling…" /></FL>
      </Section>

      <Section title="Social / Nutritional / Environmental Risk" value={secSocial} onChange={setSecSocial} accent="teal">
        <FL label="Social risk factors">
          <Pills multi options={[
            'Malnutrition / undernutrition', 'BMI <18.5 (underweight)', 'Below poverty line (BPL) family',
            'Migrant / seasonal worker', 'No institutional delivery in previous pregnancies',
            'Distance from facility >10 km', 'No transport access',
            'Domestic violence / gender-based violence (GBV)', 'No spousal / family support',
            'Child marriage context', 'Unplanned / unwanted pregnancy',
            'Substance use (tobacco / alcohol)', 'Psychiatric illness — no treatment',
            'Female genital mutilation (FGM)', 'Occupational hazard exposure',
          ]}
            value={socialRisks} onChange={setSocialRisks} color="teal" />
        </FL>
        <FL label="Nutritional status">
          <Pills options={['Normal', 'Mild malnutrition', 'Moderate malnutrition', 'Severe malnutrition (requires NRC)', 'Obesity (BMI ≥30)']}
            value={nutritionStatus} onChange={setNutritionStatus}
            color={nutritionStatus?.includes('Severe') ? 'red' : nutritionStatus?.includes('Moderate') ? 'orange' : nutritionStatus?.includes('Normal') ? 'green' : 'amber'} />
        </FL>
        <FL label="MUAC" sub="(cm — mid-upper arm circumference)"><Inp type="number" value={muac} onChange={setMuac} placeholder="e.g. 22 (normal >23 cm)" /></FL>
        {muac && parseFloat(muac) < 23 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
            <p className="text-xs font-bold text-orange-700">MUAC {'<'}23 cm — indicates chronic energy deficiency; nutritional intervention needed</p>
          </div>
        )}
        <FL label="Social / nutrition plan"><TA value={socialPlan} onChange={setSocialPlan} placeholder="Referral to social worker, JSY / PMMVY benefit enrolment, Pradhan Mantri Matru Vandana Yojana, NRC referral if SAM, ASHA / ANM coordination, domestic violence support…" /></FL>
      </Section>
    </div>
  )

  const renderStage7 = () => (
    <div className="space-y-4">
      {activeCount > 0 && (
        <div className={`border rounded-xl p-4 ${risk.bg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={16} className={risk.color} />
              <div>
                <p className={`text-sm font-bold ${risk.color}`}>{risk.level}</p>
                <p className="text-xs text-gray-500">{activeCount} risk factor{activeCount > 1 ? 's' : ''} active · Score {riskScore}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="border border-rose-200 rounded-xl p-4 bg-rose-50/10 space-y-5">
        <p className="text-xs font-bold text-rose-600 uppercase tracking-wide">Management & Delivery Plan</p>

        <FL label="ANC visit frequency">
          <Pills options={['Every week', 'Every 2 weeks', 'Every 4 weeks (stable)', 'Joint clinic (specialist + OBG)', 'Admission indicated']}
            value={ancFrequency} onChange={setAncFrequency} />
        </FL>

        <FL label="Planned place of delivery">
          <Pills options={['This facility (tertiary)', 'District hospital with NICU', 'Government medical college', 'Private tertiary centre', 'Transfer plan to tertiary centre']}
            value={deliveryPlace} onChange={setDeliveryPlace} />
        </FL>

        <FL label="Planned mode of delivery">
          <Pills options={['Vaginal delivery — target', 'Elective LSCS — planned', 'VBAC trial — planned', 'Decision nearer term', 'Emergency — may be needed']}
            value={deliveryMode} onChange={setDeliveryMode} />
        </FL>

        <FL label="Delivery timing">
          <Pills options={['Term (38–40 weeks)', 'Early term (37 weeks)', '34–36 weeks (late preterm)', '<34 weeks (if needed for maternal / fetal indication)', 'On indication — not scheduled']}
            value={deliveryTiming} onChange={setDeliveryTiming} />
        </FL>

        <FL label="Antenatal corticosteroids">
          <Pills options={['Given — course complete', 'Given — 1st dose, 2nd pending', 'Not yet given (GA <34 weeks — consider)', 'Not indicated (≥34 weeks)']}
            value={corticosteroids} onChange={setCorticosteroids} />
        </FL>
      </div>

      <Section title="Admission Indications" value={''} onChange={() => {}}>
        <div className="text-xs text-gray-500 italic">Not gated — document admission plan:</div>
      </Section>

      <div className="border border-gray-200 rounded-xl p-4 space-y-4">
        <FL label="Criteria for urgent admission">
          <Pills multi options={[
            'BP ≥160/110 (severe hypertension)', 'Severe headache / visual disturbance',
            'Absent / reversed Doppler', 'Absent fetal movements', 'Active labour <34 weeks',
            'Antepartum haemorrhage', 'PPROM', 'Seizures / eclampsia',
            'Sepsis / high fever', 'Sickle cell crisis', 'Cardiac decompensation',
            'Severe anaemia (Hb <6)', 'HELLP features', 'Suspected scar rupture',
            'Poor fetal movements + abnormal CTG',
          ]}
            value={admissionIndications} onChange={setAdmissionIndications} />
        </FL>

        <FL label="Emergency plan (for patient)">
          <TA value={emergencyPlan} onChange={setEmergencyPlan} rows={3}
            placeholder="Written danger sign card given, emergency contact number, nearest hospital to attend, 108 ambulance number counselled, ASHA / ANM contact…" />
        </FL>
      </div>

      <div className="border border-gray-200 rounded-xl p-4 space-y-4">
        <FL label="Specialist referrals for this pregnancy">
          <Pills multi options={['Maternal-foetal medicine', 'Cardiology', 'Endocrinology', 'Nephrology', 'Haematology', 'Rheumatology', 'Neurology', 'Psychiatry', 'Neonatology (NICU alert)', 'Anaesthesiology (pre-anaesthetic assessment)', 'Radiology (MRI / diagnostic)', 'Genetic counselling', 'Dietitian / nutritionist', 'Social worker', 'Physiotherapy', 'Ophthalmology']}
            value={specialistReferrals} onChange={setSpecialistReferrals} />
        </FL>

        <FL label="Investigation monitoring schedule">
          <Pills multi options={['Hb monthly', 'BP at every visit', 'Urine protein at every visit', 'HbA1c each trimester', 'TSH each trimester', 'LFT / RFT monthly', 'Serum ferritin 4-weekly', 'Platelet count fortnightly', 'Growth scan 2-weekly', 'CTG twice weekly', 'BPP weekly', 'Doppler weekly', 'MCA Doppler fortnightly (Rh)', 'Viral load 3-monthly (HIV)', 'Sputum AFB monthly (TB)', 'Ophthalmology review (DM)']}
            value={investigationSchedule} onChange={setInvestigationSchedule} />
        </FL>

        <FL label="Blood bank plan">
          <Pills options={['Blood crossmatch arranged (2 units RBC)', 'Group and save only', 'Cell salvage (accreta)', 'FFP available', 'Platelet transfusion available', 'Standard — no special requirement']}
            value={bloodBankPlan} onChange={setBloodBankPlan} />
        </FL>

        <FL label="Neonatology / NICU alert">
          <Pills options={['NICU team briefed', 'Neonatologist to attend delivery', 'NICU cot reserved', 'Transfer plan to NICU facility', 'Level III NICU required', 'Standard — NICU not anticipated']}
            value={neonatologyAlert} onChange={setNeonatologyAlert} />
        </FL>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FL label="Next review date"><input type="date" value={nextReviewDate} onChange={e => setNextReviewDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" /></FL>
      </div>

      <FL label="Overall plan notes">
        <TA value={planNotes} onChange={setPlanNotes} rows={4} placeholder="Comprehensive management summary, targets, key decisions, patient counselling given, consent documents, safety-netting…" />
      </FL>
    </div>
  )

  const stageContent = [renderStage1, renderStage2, renderStage3, renderStage4, renderStage5, renderStage6, renderStage7]

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-6 pt-5 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-100 rounded-lg">
              <AlertTriangle size={16} className="text-rose-600" />
            </div>
            <div>
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">High-Risk Pregnancy</span>
              <span className="text-xs text-gray-400 ml-2">Comprehensive Assessment</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {(calcGA || gestWeeks) && (
              <span className="text-xs font-bold bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full">{gaDisplay}</span>
            )}
            {activeCount > 0 && (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${risk.bg} ${risk.color}`}>
                {risk.level}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide">
          {STAGES.map(s => (
            <button key={s.id} type="button" onClick={() => setStage(s.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                stage === s.id ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-rose-300'
              }`}>
              {s.label}
              {stageDone[s.id] && stage !== s.id && <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />}
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
            className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">← Back</button>
          <span className="text-xs text-gray-400 tabular-nums">{stage} / {STAGES.length}</span>
          <button type="button" onClick={() => setStage(s => Math.min(STAGES.length, s + 1))} disabled={stage === STAGES.length}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">Next →</button>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Assessment'}
          </button>
        </div>
      </div>
    </div>
  )
}
