/**
 * @shared-pool
 * @category obg
 * @tags postpartum, postnatal, EPDS, PPD, breastfeeding, lochia, involution
 * Portal-agnostic. Safe to surface in any portal's assessment search.
 */

import React, { useState, useMemo } from 'react'
import { Heart, ChevronRight, ChevronLeft, Lock, AlertTriangle } from 'lucide-react'
import api from '../../../api/client'

function Section({ title, value, onChange, children, accent = 'pink' }) {
  const A = {
    pink:   { border: 'border-pink-200',   bg: 'bg-pink-50/40',   div: 'border-pink-100',   btn: 'bg-pink-500 text-white border-pink-500' },
    red:    { border: 'border-red-200',    bg: 'bg-red-50/40',    div: 'border-red-100',    btn: 'bg-red-500 text-white border-red-500' },
    orange: { border: 'border-orange-200', bg: 'bg-orange-50/40', div: 'border-orange-100', btn: 'bg-orange-500 text-white border-orange-500' },
    amber:  { border: 'border-amber-200',  bg: 'bg-amber-50/40',  div: 'border-amber-100',  btn: 'bg-amber-500 text-white border-amber-500' },
    blue:   { border: 'border-blue-200',   bg: 'bg-blue-50/40',   div: 'border-blue-100',   btn: 'bg-blue-500 text-white border-blue-500' },
    purple: { border: 'border-purple-200', bg: 'bg-purple-50/40', div: 'border-purple-100', btn: 'bg-purple-500 text-white border-purple-500' },
    green:  { border: 'border-green-200',  bg: 'bg-green-50/40',  div: 'border-green-100',  btn: 'bg-green-600 text-white border-green-600' },
    teal:   { border: 'border-teal-200',   bg: 'bg-teal-50/40',   div: 'border-teal-100',   btn: 'bg-teal-500 text-white border-teal-500' },
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
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all ${value === 'Yes' ? a.btn : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
            Applicable</button>
          <button type="button" onClick={() => onChange(v => v === 'No' ? '' : 'No')}
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all ${value === 'No' ? 'bg-gray-400 text-white border-gray-400' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
            N/A</button>
        </div>
      </div>
      {value === 'Yes' && <div className={`px-4 py-4 border-t ${a.div} space-y-4`}>{children}</div>}
      {value === 'No' && (
        <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-1.5">
          <Lock size={10} className="text-gray-300" />
          <p className="text-xs text-gray-400 italic">Not applicable — section locked</p>
        </div>
      )}
    </div>
  )
}

function Gate({ label, value, onChange, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-gray-600">{label}</span>
        <div className="flex gap-1">
          {['Yes', 'No'].map(opt => (
            <button key={opt} type="button" onClick={() => onChange(v => v === opt ? '' : opt)}
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all ${
                value === opt
                  ? opt === 'Yes' ? 'bg-pink-500 text-white border-pink-500' : 'bg-gray-400 text-white border-gray-400'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      {value === 'Yes' && <div className="pl-4 border-l-2 border-pink-200 space-y-3">{children}</div>}
    </div>
  )
}

function Pills({ options, value, onChange, multi = false, accent = 'pink' }) {
  const colors = {
    pink:   { on: 'bg-pink-500 text-white border-pink-500',     off: 'bg-white text-gray-600 border-gray-200 hover:border-pink-300' },
    red:    { on: 'bg-red-500 text-white border-red-500',       off: 'bg-white text-gray-600 border-gray-200 hover:border-red-300' },
    orange: { on: 'bg-orange-500 text-white border-orange-500', off: 'bg-white text-gray-600 border-gray-200 hover:border-orange-300' },
    amber:  { on: 'bg-amber-500 text-white border-amber-500',   off: 'bg-white text-gray-600 border-gray-200 hover:border-amber-300' },
    green:  { on: 'bg-green-600 text-white border-green-600',   off: 'bg-white text-gray-600 border-gray-200 hover:border-green-300' },
    blue:   { on: 'bg-blue-500 text-white border-blue-500',     off: 'bg-white text-gray-600 border-gray-200 hover:border-blue-300' },
    purple: { on: 'bg-purple-500 text-white border-purple-500', off: 'bg-white text-gray-600 border-gray-200 hover:border-purple-300' },
    teal:   { on: 'bg-teal-500 text-white border-teal-500',     off: 'bg-white text-gray-600 border-gray-200 hover:border-teal-300' },
  }
  const c = colors[accent] || colors.pink
  const toggle = opt => {
    if (multi) onChange(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt])
    else onChange(prev => prev === opt ? '' : opt)
  }
  const isOn = opt => multi ? value.includes(opt) : value === opt
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => toggle(opt)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${isOn(opt) ? c.on : c.off}`}>
          {opt}
        </button>
      ))}
    </div>
  )
}

function FL({ label, sub, children }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}
        {sub && <span className="ml-1 text-gray-400 normal-case font-normal">{sub}</span>}
      </label>
      {children}
    </div>
  )
}

const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300'
const ta  = `${inp} resize-none`

// EPDS questions (Edinburgh Postnatal Depression Scale)
const EPDS_QUESTIONS = [
  {
    q: 'I have been able to laugh and see the funny side of things',
    opts: ['As much as I always could (0)', 'Not quite so much now (1)', 'Definitely not so much now (2)', 'Not at all (3)'],
    scores: [0, 1, 2, 3],
  },
  {
    q: 'I have looked forward with enjoyment to things',
    opts: ['As much as I ever did (0)', 'Rather less than I used to (1)', 'Definitely less than I used to (2)', 'Hardly at all (3)'],
    scores: [0, 1, 2, 3],
  },
  {
    q: 'I have blamed myself unnecessarily when things went wrong',
    opts: ['Yes, most of the time (3)', 'Yes, some of the time (2)', 'Not very often (1)', 'No, never (0)'],
    scores: [3, 2, 1, 0],
  },
  {
    q: 'I have been anxious or worried for no good reason',
    opts: ['No, not at all (0)', 'Hardly ever (1)', 'Yes, sometimes (2)', 'Yes, very often (3)'],
    scores: [0, 1, 2, 3],
  },
  {
    q: 'I have felt scared or panicky for no very good reason',
    opts: ['Yes, quite a lot (3)', 'Yes, sometimes (2)', 'No, not much (1)', 'No, not at all (0)'],
    scores: [3, 2, 1, 0],
  },
  {
    q: 'Things have been getting on top of me',
    opts: ['Yes, most of the time I have not been able to cope at all (3)', 'Yes, sometimes I have not been coping as well as usual (2)', 'No, most of the time I have coped quite well (1)', 'No, I have been coping as well as ever (0)'],
    scores: [3, 2, 1, 0],
  },
  {
    q: 'I have been so unhappy that I have had difficulty sleeping',
    opts: ['Yes, most of the time (3)', 'Yes, sometimes (2)', 'Not very often (1)', 'No, not at all (0)'],
    scores: [3, 2, 1, 0],
  },
  {
    q: 'I have felt sad or miserable',
    opts: ['Yes, most of the time (3)', 'Yes, quite often (2)', 'Not very often (1)', 'No, not at all (0)'],
    scores: [3, 2, 1, 0],
  },
  {
    q: 'I have been so unhappy that I have been crying',
    opts: ['Yes, most of the time (3)', 'Yes, quite often (2)', 'Only occasionally (1)', 'No, never (0)'],
    scores: [3, 2, 1, 0],
  },
  {
    q: 'The thought of harming myself has occurred to me',
    opts: ['Yes, quite often (3)', 'Sometimes (2)', 'Hardly ever (1)', 'Never (0)'],
    scores: [3, 2, 1, 0],
    critical: true,
  },
]

const STAGES = [
  'Visit Info',
  'Physical',
  'Wound & Perineum',
  'Breastfeeding',
  'Mental Health / EPDS',
  'Contraception & Plan',
]

export default function PostpartumAssessmentForm({ patientId, encounterId, onSaved }) {
  const [stage, setStage]   = useState(0)
  const [saving, setSaving] = useState(false)

  // Stage 1
  const [visitDate, setVisitDate]           = useState('')
  const [visitType, setVisitType]           = useState('')
  const [daysPostpartum, setDaysPostpartum] = useState('')
  const [deliveryType, setDeliveryType]     = useState('')
  const [deliveryDate, setDeliveryDate]     = useState('')
  const [babyName, setBabyName]             = useState('')
  const [birthWeight, setBirthWeight]       = useState('')
  const [babyStatus, setBabyStatus]         = useState('')
  const [nicuStatus, setNicuStatus]         = useState('')
  const [nicuDetails, setNicuDetails]       = useState('')

  // Stage 2: Physical
  const [secVitals, setSecVitals]           = useState('')
  const [bp, setBp]                         = useState('')
  const [pulse, setPulse]                   = useState('')
  const [temp, setTemp]                     = useState('')
  const [hb, setHb]                         = useState('')
  const [pallor, setPallor]                 = useState('')
  const [oedema, setOedema]                 = useState('')

  const [secInvolution, setSecInvolution]   = useState('')
  const [uterusHeight, setUterusHeight]     = useState('')
  const [uterusTone, setUterusTone]         = useState('')
  const [lochia, setLochia]                 = useState('')
  const [lochiaColour, setLochiaColour]     = useState('')
  const [lochiaSmell, setLochiaSmell]       = useState('')
  const [subinvolution, setSubinvolution]   = useState('')

  const [secBowelBladder, setSecBowelBladder] = useState('')
  const [urinaryComplaint, setUrinaryComplaint] = useState([])
  const [bowelComplaint, setBowelComplaint] = useState([])
  const [retainedUrine, setRetainedUrine]   = useState('')

  const [secAnaemia, setSecAnaemia]         = useState('')
  const [ironSupplementation, setIronSupplementation] = useState('')
  const [ironType, setIronType]             = useState('')
  const [transfusionPostpartum, setTransfusionPostpartum] = useState('')

  const [secHTN, setSecHTN]                 = useState('')
  const [bpTrend, setBpTrend]               = useState('')
  const [antihypPostpartum, setAntihypPostpartum] = useState('')
  const [antihypDetails, setAntihypDetails] = useState('')

  // Stage 3: Wound
  const [secPerineum, setSecPerineum]       = useState('')
  const [perineumCondition, setPerineumCondition] = useState('')
  const [perineumPain, setPerineumPain]     = useState('')
  const [woundInfection, setWoundInfection] = useState('')
  const [woundDehiscence, setWoundDehiscence] = useState('')
  const [sfeTreatment, setSfeTreatment]     = useState('')
  const [oasiReview, setOasiReview]         = useState('')
  const [oasiSymptoms, setOasiSymptoms]     = useState([])

  const [secCSWound, setSecCSWound]         = useState('')
  const [csWoundCondition, setCsWoundCondition] = useState('')
  const [csWoundInfection, setCsWoundInfection] = useState('')
  const [csPain, setCsPain]                 = useState('')
  const [csAnalgesia, setCsAnalgesia]       = useState('')

  // Stage 4: Breastfeeding
  const [secBF, setSecBF]                   = useState('')
  const [bfStatus, setBfStatus]             = useState('')
  const [bfDifficulties, setBfDifficulties] = useState([])
  const [latchAssessment, setLatchAssessment] = useState('')
  const [nippleSoreness, setNippleSoreness] = useState('')
  const [nippleCondition, setNippleCondition] = useState([])
  const [engorged, setEngorged]             = useState('')
  const [mastitis, setMastitis]             = useState('')
  const [mastitisTreatment, setMastitisTreatment] = useState('')
  const [milkSupply, setMilkSupply]         = useState('')
  const [supplementation, setSupplementation] = useState('')
  const [supplementReason, setSupplementReason] = useState('')
  const [bfCounselling, setBfCounselling]   = useState('')

  // Stage 5: EPDS
  const [secEPDS, setSecEPDS]               = useState('')
  const [epdsAnswers, setEpdsAnswers]       = useState(Array(10).fill(null))
  const [epdsDate, setEpdsDate]             = useState('')
  const [moodSymptoms, setMoodSymptoms]     = useState([])
  const [babyBlues, setBabyBlues]           = useState('')
  const [anxietySymptoms, setAnxietySymptoms] = useState([])
  const [psy_hx, setPsyHx]                 = useState('')
  const [supportSystem, setSupportSystem]   = useState('')
  const [domesticViolence, setDomesticViolence] = useState('')
  const [dvDetails, setDvDetails]           = useState('')
  const [referralPsych, setReferralPsych]   = useState('')
  const [mentalHealthPlan, setMentalHealthPlan] = useState('')

  const epdsScore = useMemo(() => {
    const answers = epdsAnswers.filter(a => a !== null)
    if (answers.length < 10) return null
    return epdsAnswers.reduce((sum, a, i) => sum + (EPDS_QUESTIONS[i]?.scores[a] ?? 0), 0)
  }, [epdsAnswers])

  const epdsRisk = useMemo(() => {
    if (epdsScore === null) return null
    if (epdsScore >= 13) return { level: 'High risk — probable PPD', color: 'text-red-700', bg: 'bg-red-50 border-red-400', urgent: true }
    if (epdsScore >= 10) return { level: 'Moderate risk — possible PPD', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-400', urgent: false }
    if (epdsScore >= 8)  return { level: 'Mild risk — monitor closely', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-400', urgent: false }
    return { level: 'Low risk', color: 'text-green-700', bg: 'bg-green-50 border-green-300', urgent: false }
  }, [epdsScore])

  const q10Critical = epdsAnswers[9] !== null && EPDS_QUESTIONS[9].scores[epdsAnswers[9]] >= 1

  // Stage 6: Contraception
  const [secContraception, setSecContraception] = useState('')
  const [contraceptionMethod, setContraceptionMethod] = useState('')
  const [contraceptionCounselled, setContraceptionCounselled] = useState('')
  const [iudInserted, setIudInserted]       = useState('')
  const [implantInserted, setImplantInserted] = useState('')
  const [sterilisation, setSterilisation]   = useState('')
  const [sterilisationType, setSterilisationType] = useState('')

  const [secImms, setSecImms]               = useState('')
  const [rubellaVaccine, setRubellaVaccine] = useState('')
  const [fluVaccine, setFluVaccine]         = useState('')
  const [tdBooster, setTdBooster]           = useState('')
  const [hepatitisBMother, setHepatitisBMother] = useState('')
  const [neonatalHBIG, setNeonatalHBIG]     = useState('')

  const [secFollowUp, setSecFollowUp]       = useState('')
  const [review6w, setReview6w]             = useState('')
  const [pelvicFloorRef, setPelvicFloorRef] = useState('')
  const [pelvicFloorExercises, setPelvicFloorExercises] = useState('')
  const [returnToWork, setReturnToWork]     = useState('')
  const [jsyPmmvy, setJsyPmmvy]             = useState('')
  const [jsyDetails, setJsyDetails]         = useState('')
  const [ashaLink, setAshaLink]             = useState('')

  const [planNotes, setPlanNotes]           = useState('')

  async function handleSave() {
    setSaving(true)
    try {
      await api.post('/assessments', {
        patientId, encounterId,
        formType: 'postpartum_assessment',
        data: {
          visitDate, visitType, daysPostpartum, deliveryType, deliveryDate, baby: { name: babyName, birthWeight, status: babyStatus, nicuStatus, nicuDetails },
          vitals: { bp, pulse, temp, hb, pallor, oedema },
          involution: { height: uterusHeight, tone: uterusTone, lochia, lochiaColour, lochiaSmell, subinvolution },
          bowelBladder: { urinary: urinaryComplaint, bowel: bowelComplaint, retainedUrine },
          anaemia: { supplementation: ironSupplementation, ironType, transfusion: transfusionPostpartum },
          htn: { bpTrend, antihyp: antihypPostpartum, details: antihypDetails },
          perineum: { condition: perineumCondition, pain: perineumPain, infection: woundInfection, dehiscence: woundDehiscence, treatment: sfeTreatment, oasiReview, oasiSymptoms },
          csWound: { condition: csWoundCondition, infection: csWoundInfection, pain: csPain, analgesia: csAnalgesia },
          breastfeeding: { status: bfStatus, difficulties: bfDifficulties, latch: latchAssessment, nippleSoreness, nippleCondition, engorged, mastitis, mastitisTreatment, supply: milkSupply, supplementation, supplementReason, counselling: bfCounselling },
          epds: { score: epdsScore, risk: epdsRisk?.level, answers: epdsAnswers, date: epdsDate, moodSymptoms, babyBlues, anxietySymptoms, psyHx: psy_hx, supportSystem, domesticViolence, dvDetails, referralPsych, mentalHealthPlan, q10Alert: q10Critical },
          contraception: { method: contraceptionMethod, counselled: contraceptionCounselled, iud: iudInserted, implant: implantInserted, sterilisation, sterilisationType },
          immunisations: { rubella: rubellaVaccine, flu: fluVaccine, td: tdBooster, hepatitisB: hepatitisBMother, neonatalHBIG },
          followUp: { review6w, pelvicFloor: pelvicFloorRef, exercises: pelvicFloorExercises, returnToWork, jsy: jsyPmmvy, jsyDetails, asha: ashaLink },
          planNotes,
        }
      })
      onSaved?.()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const navBtn = 'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all'

  function renderStage() {
    switch (stage) {
      // ══════════════════════════════════════════════════════════════════════
      case 0: return (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <FL label="Visit Date">
              <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} className={inp} />
            </FL>
            <FL label="Visit Type">
              <Pills options={['Day 1 (in-hospital)', 'Day 3', 'Day 7 (home visit)', '6-week postnatal', 'Follow-up']} value={visitType} onChange={setVisitType} />
            </FL>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FL label="Days postpartum">
              <input type="number" value={daysPostpartum} onChange={e => setDaysPostpartum(e.target.value)} className={inp} />
            </FL>
            <FL label="Date of delivery">
              <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className={inp} />
            </FL>
          </div>
          <FL label="Mode of delivery">
            <Pills options={['Normal vaginal delivery (NVD)', 'Instrumental (ventouse/forceps)', 'Emergency LSCS', 'Elective LSCS', 'VBAC']} value={deliveryType} onChange={setDeliveryType} />
          </FL>

          <div className="p-4 bg-pink-50 border border-pink-200 rounded-xl space-y-3">
            <p className="text-xs font-semibold text-pink-700 uppercase tracking-wide">Baby Details</p>
            <div className="grid grid-cols-2 gap-4">
              <FL label="Baby name">
                <input value={babyName} onChange={e => setBabyName(e.target.value)} className={inp} />
              </FL>
              <FL label="Birth weight" sub="grams">
                <input type="number" value={birthWeight} onChange={e => setBirthWeight(e.target.value)} className={inp} />
              </FL>
            </div>
            <FL label="Baby's current status">
              <Pills options={['Well — rooming in', 'Well — discharged', 'Admitted NICU / SCBU', 'Neonatal demise']} value={babyStatus} onChange={setBabyStatus} accent={babyStatus?.includes('demise') ? 'red' : 'pink'} />
            </FL>
            {babyStatus?.includes('NICU') && (
              <Gate label="NICU current status?" value={nicuStatus} onChange={setNicuStatus}>
                <FL label="NICU details">
                  <input value={nicuDetails} onChange={e => setNicuDetails(e.target.value)} placeholder="Diagnosis, estimated discharge..." className={inp} />
                </FL>
              </Gate>
            )}
          </div>
        </div>
      )

      // ══════════════════════════════════════════════════════════════════════
      case 1: return (
        <div className="space-y-5">
          <Section title="Vital Signs" value={secVitals} onChange={setSecVitals} accent="pink">
            <div className="grid grid-cols-4 gap-3">
              <FL label="BP" sub="mmHg">
                <input value={bp} onChange={e => setBp(e.target.value)} placeholder="120/80" className={inp} />
                {(() => {
                  const [s, d] = (bp || '').split('/').map(Number)
                  if (s >= 160 || d >= 110) return <span className="text-xs text-red-700 font-bold mt-0.5 block">Severe HTN — treat now</span>
                  if (s >= 140 || d >= 90)  return <span className="text-xs text-orange-700 font-semibold mt-0.5 block">Hypertension — check antihypertensives</span>
                  return null
                })()}
              </FL>
              <FL label="Pulse" sub="bpm">
                <input type="number" value={pulse} onChange={e => setPulse(e.target.value)} className={inp} />
              </FL>
              <FL label="Temp" sub="°C">
                <input type="number" value={temp} onChange={e => setTemp(e.target.value)} step="0.1" className={inp} />
                {Number(temp) >= 38 && <span className="text-xs text-red-700 font-semibold mt-0.5 block">Fever — exclude infection</span>}
              </FL>
              <FL label="Hb" sub="g/dL">
                <input type="number" value={hb} onChange={e => setHb(e.target.value)} step="0.1" className={inp} />
                {Number(hb) < 7 && hb && <span className="text-xs text-red-700 font-bold mt-0.5 block">Severe anaemia</span>}
                {Number(hb) >= 7 && Number(hb) < 10 && hb && <span className="text-xs text-orange-700 mt-0.5 block">Moderate anaemia</span>}
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FL label="Pallor">
                <Pills options={['None', 'Mild', 'Moderate', 'Severe']} value={pallor} onChange={setPallor} accent={pallor === 'Severe' ? 'red' : 'pink'} />
              </FL>
              <FL label="Oedema">
                <Pills options={['None', 'Ankle', 'Legs', 'Generalised']} value={oedema} onChange={setOedema} />
              </FL>
            </div>
          </Section>

          <Section title="Uterine Involution & Lochia" value={secInvolution} onChange={setSecInvolution} accent="pink">
            <div className="grid grid-cols-2 gap-4">
              <FL label="Uterine height">
                <Pills options={['At umbilicus', '1 FB below', '2 FB below', '3 FB below', 'Not palpable']} value={uterusHeight} onChange={setUterusHeight} />
              </FL>
              <FL label="Uterine tone">
                <Pills options={['Well contracted', 'Soft / boggy', 'Tender']} value={uterusTone} onChange={setUterusTone} accent={uterusTone === 'Soft / boggy' ? 'red' : 'pink'} />
              </FL>
            </div>
            {uterusTone === 'Soft / boggy' && (
              <div className="p-2 bg-red-50 border border-red-300 rounded text-xs text-red-700 font-semibold flex items-center gap-1.5">
                <AlertTriangle size={12} /> Boggy uterus — risk of secondary PPH / subinvolution. Uterine massage, check for retained products.
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              <FL label="Lochia amount">
                <Pills options={['Scant', 'Light', 'Moderate', 'Heavy']} value={lochia} onChange={setLochia} accent={lochia === 'Heavy' ? 'red' : 'pink'} />
              </FL>
              <FL label="Lochia colour">
                <Pills options={['Rubra (red)', 'Serosa (pink)', 'Alba (white)', 'Purulent']} value={lochiaColour} onChange={setLochiaColour} accent={lochiaColour === 'Purulent' ? 'red' : 'pink'} />
              </FL>
              <FL label="Smell">
                <Pills options={['Normal', 'Offensive']} value={lochiaSmell} onChange={setLochiaSmell} accent={lochiaSmell === 'Offensive' ? 'red' : 'pink'} />
              </FL>
            </div>
            {(lochiaColour === 'Purulent' || lochiaSmell === 'Offensive') && (
              <div className="p-2 bg-red-50 border border-red-300 rounded text-xs text-red-700 font-semibold">
                Offensive / purulent lochia — endometritis. Swab, broad-spectrum antibiotics (Augmentin or Co-amoxiclav / Doxycycline + Metronidazole).
              </div>
            )}
            <Gate label="Subinvolution noted?" value={subinvolution} onChange={setSubinvolution}>
              <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded p-2">
                Subinvolution: consider retained products of conception (RPOC) or endometritis. USG uterus. Ergometrine 0.25mg TDS × 3 days if RPOC excluded.
              </p>
            </Gate>
          </Section>

          <Section title="Bladder & Bowel" value={secBowelBladder} onChange={setSecBowelBladder} accent="blue">
            <FL label="Urinary symptoms">
              <Pills options={['Normal', 'Dysuria', 'Frequency / urgency', 'Stress incontinence', 'Urge incontinence', 'Urinary retention']} value={urinaryComplaint} onChange={setUrinaryComplaint} multi accent="blue" />
            </FL>
            <FL label="Bowel symptoms">
              <Pills options={['Normal', 'Constipation', 'Diarrhoea', 'Faecal incontinence', 'Wind incontinence']} value={bowelComplaint} onChange={setBowelComplaint} multi accent="blue" />
            </FL>
            {(urinaryComplaint.includes('Dysuria') || urinaryComplaint.includes('Frequency / urgency')) && (
              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">Suspected UTI — urine MCS before empirical antibiotics (Nitrofurantoin or Co-trimoxazole).</p>
            )}
            <Gate label="Urinary retention (unable to void)?" value={retainedUrine} onChange={setRetainedUrine}>
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">Catheterise — ensure at least 300 ml voided spontaneously before discharge. Consider urinary physio review.</p>
            </Gate>
          </Section>

          <Section title="Anaemia Management" value={secAnaemia} onChange={setSecAnaemia} accent="orange">
            <Gate label="Iron supplementation prescribed?" value={ironSupplementation} onChange={setIronSupplementation}>
              <FL label="Iron type / dose">
                <Pills options={['Ferrous sulphate 200 mg BD', 'Ferrous fumarate 200 mg BD', 'IV Iron sucrose (Venofer)', 'IV Iron carboxymaltose (Ferinject)']} value={ironType} onChange={setIronType} accent="orange" />
              </FL>
            </Gate>
            <Gate label="Blood transfusion given postpartum?" value={transfusionPostpartum} onChange={setTransfusionPostpartum} />
          </Section>

          <Section title="Postpartum Hypertension" value={secHTN} onChange={setSecHTN} accent="red">
            <FL label="BP trend postpartum">
              <Pills options={['Normalising', 'Persistent hypertension', 'Worsening — new severe range']} value={bpTrend} onChange={setBpTrend} accent={bpTrend?.includes('Worsening') ? 'red' : 'orange'} />
            </FL>
            {bpTrend?.includes('Worsening') && (
              <div className="p-2 bg-red-50 border-2 border-red-400 rounded text-xs text-red-700 font-bold">
                Severe postpartum HTN — BP ≥160/110 requires treatment within 30–60 min. Consider IV labetalol. Watch for delayed eclampsia (up to 6 weeks postpartum).
              </div>
            )}
            <Gate label="Continuing antihypertensives?" value={antihypPostpartum} onChange={setAntihypPostpartum}>
              <FL label="Agent / dose">
                <input value={antihypDetails} onChange={e => setAntihypDetails(e.target.value)} placeholder="e.g. Labetalol 200mg TDS, Nifedipine ER 30mg OD" className={inp} />
              </FL>
            </Gate>
          </Section>
        </div>
      )

      // ══════════════════════════════════════════════════════════════════════
      case 2: return (
        <div className="space-y-5">
          <Section title="Perineum / Episiotomy Wound" value={secPerineum} onChange={setSecPerineum} accent="pink">
            <FL label="Perineal condition">
              <Pills options={['Healing well', 'Mildly sore', 'Wound gaping', 'Infected', 'Haematoma']} value={perineumCondition} onChange={setPerineumCondition} accent={['Wound gaping', 'Infected', 'Haematoma'].includes(perineumCondition) ? 'red' : 'pink'} />
            </FL>
            <FL label="Perineal pain score" sub="(0–10)">
              <input type="number" value={perineumPain} onChange={e => setPerineumPain(e.target.value)} max={10} className={inp} />
            </FL>
            <Gate label="Wound infection signs?" value={woundInfection} onChange={setWoundInfection}>
              <FL label="Treatment">
                <input value={sfeTreatment} onChange={e => setSfeTreatment(e.target.value)} placeholder="e.g. Co-amoxiclav 625mg TDS × 7 days, wound swab" className={inp} />
              </FL>
            </Gate>
            <Gate label="Wound dehiscence?" value={woundDehiscence} onChange={setWoundDehiscence}>
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                Dehiscence: secondary suturing under anaesthesia if &lt;72h and clean. Wound care and healing by secondary intention if infected or delayed.
              </p>
            </Gate>
            <Gate label="OASI (3rd/4th degree) — follow-up required?" value={oasiReview} onChange={setOasiReview}>
              <FL label="Anorectal symptoms">
                <Pills options={['Faecal urgency', 'Faecal incontinence', 'Wind incontinence', 'Perineal pain', 'Dyspareunia', 'None']} value={oasiSymptoms} onChange={setOasiSymptoms} multi accent="orange" />
              </FL>
              <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded p-2">
                OASI: pelvic floor physiotherapy, follow-up endoanal USG at 3 months. Avoid future obstetric trauma — offer CS in next pregnancy.
              </p>
            </Gate>
          </Section>

          <Section title="CS Wound (if applicable)" value={secCSWound} onChange={setSecCSWound} accent="blue">
            <FL label="CS wound condition">
              <Pills options={['Healing well — no concerns', 'Mildly inflamed', 'Infected', 'Wound dehiscence', 'Seroma / haematoma']} value={csWoundCondition} onChange={setCsWoundCondition} accent={['Infected', 'Wound dehiscence'].includes(csWoundCondition) ? 'red' : 'blue'} />
            </FL>
            <Gate label="CS wound infection?" value={csWoundInfection} onChange={setCsWoundInfection}>
              <p className="text-xs text-red-700">Wound swab, antibiotics (Co-amoxiclav 625mg TDS or Cephalexin + Metronidazole). Mark erythema boundary. Dressing change.</p>
            </Gate>
            <div className="grid grid-cols-2 gap-4">
              <FL label="CS wound pain score" sub="/10">
                <input type="number" value={csPain} onChange={e => setCsPain(e.target.value)} max={10} className={inp} />
              </FL>
              <FL label="Analgesia prescribed">
                <input value={csAnalgesia} onChange={e => setCsAnalgesia(e.target.value)} placeholder="e.g. Paracetamol 1g QDS + Ibuprofen 400mg TDS" className={inp} />
              </FL>
            </div>
          </Section>
        </div>
      )

      // ══════════════════════════════════════════════════════════════════════
      case 3: return (
        <div className="space-y-5">
          <Section title="Breastfeeding Assessment" value={secBF} onChange={setSecBF} accent="teal">
            <FL label="Feeding status">
              <Pills options={['Exclusively breastfeeding', 'Mixed (breast + formula)', 'Exclusive formula', 'Not feeding (maternal reason)', 'Not feeding (neonatal reason)']} value={bfStatus} onChange={setBfStatus} accent="teal" />
            </FL>
            {bfStatus === 'Exclusive formula' && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">Explore reason — support breastfeeding restart if possible. Ensure formula preparation and volumes are correct.</p>
            )}
            <FL label="Breastfeeding difficulties">
              <Pills options={['Pain on latching', 'Poor latch', 'Milk not coming in', 'Engorgement', 'Flat / inverted nipples', 'Baby sleepy / not feeding well', 'None']} value={bfDifficulties} onChange={setBfDifficulties} multi accent="teal" />
            </FL>
            <FL label="Latch assessment">
              <Pills options={['Good latch — CHINS correct', 'Superficial latch', 'Not assessed']} value={latchAssessment} onChange={setLatchAssessment} accent="teal" />
            </FL>
            <Gate label="Nipple soreness?" value={nippleSoreness} onChange={setNippleSoreness}>
              <FL label="Nipple condition">
                <Pills options={['Cracked', 'Blistered', 'Bleeding', 'Thrush-infected', 'Inverted']} value={nippleCondition} onChange={setNippleCondition} multi accent="orange" />
              </FL>
              <p className="text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded p-2">
                Nipple care: lanolin cream (Lansinoh), correct latch, air dry after feeds. Nipple thrush: Fluconazole 150mg stat + topical Miconazole. Treat baby also.
              </p>
            </Gate>
            <Gate label="Breast engorgement?" value={engorged} onChange={setEngorged}>
              <p className="text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded p-2">
                Engorgement: frequent feeding, hand expression before feeds, cold compresses between feeds, cabbage leaves (traditional Indian remedy). Ibuprofen for pain.
              </p>
            </Gate>
            <Gate label="Mastitis?" value={mastitis} onChange={setMastitis}>
              <FL label="Treatment">
                <input value={mastitisTreatment} onChange={e => setMastitisTreatment(e.target.value)} placeholder="Flucloxacillin 500mg QDS × 10–14 days / Cephalexin. Continue breastfeeding." className={inp} />
              </FL>
              <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded p-2">
                Continue breastfeeding — stopping worsens mastitis. If fluctuant — suspect abscess → USG ± aspiration/I&D.
              </p>
            </Gate>
            <FL label="Milk supply assessment">
              <Pills options={['Adequate', 'Low supply', 'Oversupply', 'Milk not in yet (day 1–3)']} value={milkSupply} onChange={setMilkSupply} accent="teal" />
            </FL>
            <Gate label="Formula supplementation?" value={supplementation} onChange={setSupplementation}>
              <FL label="Reason for supplementation">
                <input value={supplementReason} onChange={e => setSupplementReason(e.target.value)} placeholder="e.g. weight loss >10%, hypoglycaemia, maternal choice" className={inp} />
              </FL>
            </Gate>
            <Gate label="Breastfeeding counselling provided?" value={bfCounselling} onChange={setBfCounselling} />
          </Section>
        </div>
      )

      // ══════════════════════════════════════════════════════════════════════
      case 4: return (
        <div className="space-y-5">
          <Section title="Mental Health & EPDS Screening" value={secEPDS} onChange={setSecEPDS} accent="purple">
            <FL label="Date of EPDS screening">
              <input type="date" value={epdsDate} onChange={e => setEpdsDate(e.target.value)} className={inp} />
            </FL>
            <p className="text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-lg p-3">
              <strong>Edinburgh Postnatal Depression Scale (EPDS)</strong> — 10 questions. Score ≥10 = probable depression. Score ≥13 = high risk. Q10 score ≥1 = immediate safety assessment required.
            </p>

            <div className="space-y-4">
              {EPDS_QUESTIONS.map((q, qi) => (
                <div key={qi} className={`p-3 rounded-xl border ${q.critical && epdsAnswers[qi] !== null && EPDS_QUESTIONS[qi].scores[epdsAnswers[qi]] >= 1 ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`}>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    <span className="text-xs font-bold text-purple-600 mr-1">Q{qi + 1}.</span>
                    {q.q}
                    {q.critical && <span className="ml-1 text-xs font-bold text-red-600">(CRITICAL)</span>}
                  </p>
                  <div className="space-y-1">
                    {q.opts.map((opt, oi) => (
                      <button key={oi} type="button"
                        onClick={() => setEpdsAnswers(prev => { const n = [...prev]; n[qi] = oi; return n })}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs border transition-all ${
                          epdsAnswers[qi] === oi
                            ? 'bg-purple-500 text-white border-purple-500'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                        }`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                  {epdsAnswers[qi] !== null && (
                    <p className="text-xs text-right mt-1 text-purple-600 font-semibold">Score: {EPDS_QUESTIONS[qi].scores[epdsAnswers[qi]]}</p>
                  )}
                </div>
              ))}
            </div>

            {epdsScore !== null && (
              <div className={`p-4 rounded-xl border-2 ${epdsRisk.bg}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-lg font-bold ${epdsRisk.color}`}>EPDS Score: {epdsScore} / 30</span>
                  {epdsRisk.urgent && <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded animate-pulse">URGENT</span>}
                </div>
                <p className={`text-sm font-semibold ${epdsRisk.color}`}>{epdsRisk.level}</p>
                {epdsRisk.urgent && <p className="text-xs text-red-700 mt-1">Immediate psychiatric / psychological referral. Safety plan required.</p>}
              </div>
            )}

            {q10Critical && (
              <div className="p-3 bg-red-50 border-2 border-red-500 rounded-xl flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-600 animate-pulse flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-red-700">Q10 ALERT — Self-harm ideation</p>
                  <p className="text-xs text-red-600">Conduct immediate safety assessment. Do not leave alone. Emergency psychiatric referral.</p>
                </div>
              </div>
            )}

            <div className="border-t border-purple-100 pt-4 space-y-3">
              <FL label="Mood symptoms (additional clinical assessment)">
                <Pills options={['Low mood / sadness', 'Tearfulness', 'Anhedonia', 'Anxiety / worry', 'Irritability', 'Guilt / worthlessness', 'Insomnia', 'Poor appetite', 'Intrusive thoughts', 'None']} value={moodSymptoms} onChange={setMoodSymptoms} multi accent="purple" />
              </FL>
              <Gate label="Baby blues (days 3–5 tearfulness)?" value={babyBlues} onChange={setBabyBlues}>
                <p className="text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded p-2">Baby blues: self-limiting, usually resolves by day 10. Support, reassurance, re-screen at 6 weeks.</p>
              </Gate>
              <FL label="Anxiety symptoms">
                <Pills options={['Excessive worry about baby', 'Panic attacks', 'Health anxiety (about self)', 'Puerperal OCD (intrusive thoughts about harming baby)', 'None']} value={anxietySymptoms} onChange={setAnxietySymptoms} multi accent="purple" />
              </FL>
              <Gate label="Previous psychiatric history?" value={psy_hx} onChange={setPsyHx} />
              <FL label="Support system">
                <Pills options={['Good — partner/family support', 'Moderate', 'Poor — isolated', 'Single parent']} value={supportSystem} onChange={setSupportSystem} accent="purple" />
              </FL>
              <Gate label="Domestic violence / IPV concern?" value={domesticViolence} onChange={setDomesticViolence}>
                <FL label="Details (confidential — document sensitively)">
                  <textarea value={dvDetails} onChange={e => setDvDetails(e.target.value)} rows={2} className={ta} placeholder="Nature of concern, referral made, safety plan..." />
                </FL>
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                  Document carefully. Offer referral to social worker, domestic violence support (Shakti / Sneha helplines). Consider mandatory reporting if child at risk.
                </p>
              </Gate>
              <Gate label="Psychiatric / psychological referral made?" value={referralPsych} onChange={setReferralPsych}>
                <FL label="Mental health management plan">
                  <textarea value={mentalHealthPlan} onChange={e => setMentalHealthPlan(e.target.value)} rows={3} className={ta} placeholder="Therapy, medication (safe in breastfeeding — Sertraline preferred), support groups, follow-up..." />
                </FL>
              </Gate>
            </div>
          </Section>
        </div>
      )

      // ══════════════════════════════════════════════════════════════════════
      case 5: return (
        <div className="space-y-5">
          <Section title="Contraception" value={secContraception} onChange={setSecContraception} accent="pink">
            <FL label="Method discussed / chosen">
              <Pills options={[
                'Lactational amenorrhoea method (LAM)',
                'Progesterone-only pill (POP / mini-pill)',
                'Copper IUD (IUCD)',
                'Levonorgestrel IUS (Mirena)',
                'Subdermal implant (Implanon)',
                'Injectable (DMPA / Depo-Provera)',
                'Barrier (condom)',
                'Combined OCP (after 6 weeks — avoid if breastfeeding)',
                'Permanent sterilisation',
                'Partner vasectomy',
                'Natural methods',
                'Declined',
              ]} value={contraceptionMethod} onChange={setContraceptionMethod} accent="pink" />
            </FL>
            {contraceptionMethod?.includes('Combined OCP') && (
              <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded p-2">
                Combined OCP contraindicated if exclusively breastfeeding &lt;6 months. May suppress milk supply. Prefer POP / non-hormonal.
              </p>
            )}
            <Gate label="Contraception counselling completed?" value={contraceptionCounselled} onChange={setContraceptionCounselled} />
            <Gate label="IUD / IUS inserted at this visit?" value={iudInserted} onChange={setIudInserted}>
              <p className="text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded p-2">
                IUCD insertion: optimal at 48h or &gt;4 weeks postpartum (not 48h–4 weeks due to uterine involution). Confirm placement with thread check.
              </p>
            </Gate>
            <Gate label="Implant inserted?" value={implantInserted} onChange={setImplantInserted} />
            <Gate label="Sterilisation performed / planned?" value={sterilisation} onChange={setSterilisation}>
              <FL label="Type">
                <Pills options={['Tubal ligation (minilaparotomy)', 'Laparoscopic sterilisation', 'Filshie clip', 'Essure (hysteroscopic)', 'Vasectomy — partner']} value={sterilisationType} onChange={setSterilisationType} accent="pink" />
              </FL>
            </Gate>
          </Section>

          <Section title="Immunisations" value={secImms} onChange={setSecImms} accent="green">
            <Gate label="Rubella vaccination indicated (non-immune)?" value={rubellaVaccine} onChange={setRubellaVaccine}>
              <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2">MMR vaccine postpartum (avoid if breastfeeding — check local guidelines). Avoid conception for 1 month after MMR.</p>
            </Gate>
            <Gate label="Influenza vaccine given?" value={fluVaccine} onChange={setFluVaccine} />
            <Gate label="Td / TT booster needed?" value={tdBooster} onChange={setTdBooster} />
            <Gate label="Mother is Hepatitis B positive?" value={hepatitisBMother} onChange={setHepatitisBMother}>
              <Gate label="Neonatal HBIg + HepB vaccine given at birth?" value={neonatalHBIG} onChange={setNeonatalHBIG}>
                <p className="text-xs text-green-700">HBIg 0.5 ml IM + HepB vaccine within 12h of birth. Continue HepB series at 6 weeks, 10 weeks, 14 weeks (EPI schedule).</p>
              </Gate>
            </Gate>
          </Section>

          <Section title="Follow-up & Social Plan" value={secFollowUp} onChange={setSecFollowUp} accent="teal">
            <Gate label="6-week postnatal review scheduled?" value={review6w} onChange={setReview6w} />
            <Gate label="Pelvic floor physiotherapy referral?" value={pelvicFloorRef} onChange={setPelvicFloorRef}>
              <Gate label="Pelvic floor exercises (Kegel) taught?" value={pelvicFloorExercises} onChange={setPelvicFloorExercises} />
            </Gate>
            <FL label="Return to work / activity plan">
              <input value={returnToWork} onChange={e => setReturnToWork(e.target.value)} placeholder="e.g. light duties at 6 weeks, full work at 3 months, no heavy lifting" className={inp} />
            </FL>
            <Gate label="JSY / PMMVY benefits applicable?" value={jsyPmmvy} onChange={setJsyPmmvy}>
              <FL label="Details / assistance given">
                <input value={jsyDetails} onChange={e => setJsyDetails(e.target.value)} placeholder="JSY cash transfer, PMMVY ₹5000, documents required..." className={inp} />
              </FL>
            </Gate>
            <Gate label="ASHA / ANM home visit arranged?" value={ashaLink} onChange={setAshaLink} />
          </Section>

          <div>
            <FL label="Overall Postnatal Plan Notes">
              <textarea value={planNotes} onChange={e => setPlanNotes(e.target.value)} rows={4} className={ta} placeholder="Summary, red-flag symptoms to watch for, emergency contacts, discharge advice..." />
            </FL>
          </div>
        </div>
      )

      default: return null
    }
  }

  const headerBadge = useMemo(() => {
    if (q10Critical) return { label: 'SELF-HARM RISK', color: 'bg-red-600 text-white animate-pulse' }
    if (epdsRisk?.urgent) return { label: `EPDS ${epdsScore}`, color: 'bg-red-500 text-white' }
    if (epdsScore !== null && epdsScore >= 10) return { label: `EPDS ${epdsScore}`, color: 'bg-orange-500 text-white' }
    if (babyStatus?.includes('demise')) return { label: 'NEONATAL LOSS', color: 'bg-red-700 text-white' }
    return null
  }, [q10Critical, epdsRisk, epdsScore, babyStatus])

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-pink-600 to-rose-600 px-6 py-5 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Heart size={22} />
            </div>
            <div>
              <p className="text-pink-200 text-xs font-medium uppercase tracking-wider">OBG Assessment</p>
              <h1 className="text-xl font-bold">Postpartum Assessment</h1>
              <p className="text-pink-200 text-xs mt-0.5">Postnatal Review & EPDS Screening</p>
            </div>
          </div>
          <div className="text-right space-y-1">
            {headerBadge && <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-lg ${headerBadge.color}`}>{headerBadge.label}</span>}
            {daysPostpartum && <p className="text-pink-200 text-xs">Day {daysPostpartum}</p>}
          </div>
        </div>
        <div className="mt-4 flex gap-1">
          {STAGES.map((s, i) => (
            <button key={s} type="button" onClick={() => setStage(i)}
              className={`flex-1 h-1.5 rounded-full transition-all ${i === stage ? 'bg-white' : i < stage ? 'bg-pink-300' : 'bg-white/20'}`} />
          ))}
        </div>
        <p className="text-pink-200 text-xs mt-1.5">{stage + 1} / {STAGES.length} — {STAGES[stage]}</p>
      </div>

      <div className="flex border-b border-gray-100 overflow-x-auto bg-gray-50/60">
        {STAGES.map((s, i) => (
          <button key={s} type="button" onClick={() => setStage(i)}
            className={`px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
              i === stage ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}>
            {s}
          </button>
        ))}
      </div>

      <div className="p-5">{renderStage()}</div>

      <div className="flex items-center justify-between px-5 pb-5">
        <button type="button" onClick={() => setStage(s => Math.max(0, s - 1))} disabled={stage === 0}
          className={`${navBtn} text-gray-600 hover:bg-gray-100 disabled:opacity-30`}>
          <ChevronLeft size={16} /> Back
        </button>
        {stage < STAGES.length - 1 ? (
          <button type="button" onClick={() => setStage(s => s + 1)}
            className={`${navBtn} bg-pink-500 text-white hover:bg-pink-600`}>
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button type="button" onClick={handleSave} disabled={saving}
            className={`${navBtn} bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-60`}>
            {saving ? 'Saving…' : 'Save Assessment'}
          </button>
        )}
      </div>
    </div>
  )
}
