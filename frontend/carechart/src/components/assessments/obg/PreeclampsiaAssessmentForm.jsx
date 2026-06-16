/**
 * @shared-pool
 * @category obg
 * @tags pre-eclampsia, hypertension, pregnancy, eclampsia, HELLP, HDP
 * Portal-agnostic. Safe to surface in any portal's assessment search.
 */

import React, { useState, useMemo } from 'react'
import { AlertTriangle, ChevronRight, ChevronLeft, Lock, Zap } from 'lucide-react'
import api from '../../../api/client'

// ── Section gate ──────────────────────────────────────────────────────────────
function Section({ title, value, onChange, children, accent = 'red' }) {
  const A = {
    red:    { border: 'border-red-200',    bg: 'bg-red-50/40',    div: 'border-red-100',    btn: 'bg-red-500 text-white border-red-500' },
    orange: { border: 'border-orange-200', bg: 'bg-orange-50/40', div: 'border-orange-100', btn: 'bg-orange-500 text-white border-orange-500' },
    amber:  { border: 'border-amber-200',  bg: 'bg-amber-50/40',  div: 'border-amber-100',  btn: 'bg-amber-500 text-white border-amber-500' },
    blue:   { border: 'border-blue-200',   bg: 'bg-blue-50/40',   div: 'border-blue-100',   btn: 'bg-blue-500 text-white border-blue-500' },
    purple: { border: 'border-purple-200', bg: 'bg-purple-50/40', div: 'border-purple-100', btn: 'bg-purple-500 text-white border-purple-500' },
    green:  { border: 'border-green-200',  bg: 'bg-green-50/40',  div: 'border-green-100',  btn: 'bg-green-500 text-white border-green-500' },
    teal:   { border: 'border-teal-200',   bg: 'bg-teal-50/40',   div: 'border-teal-100',   btn: 'bg-teal-500 text-white border-teal-500' },
  }
  const a = A[accent] || A.red
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

// ── Inline gate ───────────────────────────────────────────────────────────────
function Gate({ label, value, onChange, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{label}</span>
        <div className="flex gap-1">
          {['Yes', 'No'].map(opt => (
            <button key={opt} type="button" onClick={() => onChange(v => v === opt ? '' : opt)}
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all ${
                value === opt
                  ? opt === 'Yes' ? 'bg-red-500 text-white border-red-500' : 'bg-gray-400 text-white border-gray-400'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      {value === 'Yes' && <div className="pl-4 border-l-2 border-red-200 space-y-3">{children}</div>}
    </div>
  )
}

// ── Pill selector ─────────────────────────────────────────────────────────────
function Pills({ options, value, onChange, multi = false, accent = 'red' }) {
  const colors = {
    red:    { on: 'bg-red-500 text-white border-red-500',    off: 'bg-white text-gray-600 border-gray-200 hover:border-red-300' },
    orange: { on: 'bg-orange-500 text-white border-orange-500', off: 'bg-white text-gray-600 border-gray-200 hover:border-orange-300' },
    amber:  { on: 'bg-amber-500 text-white border-amber-500',   off: 'bg-white text-gray-600 border-gray-200 hover:border-amber-300' },
    blue:   { on: 'bg-blue-500 text-white border-blue-500',     off: 'bg-white text-gray-600 border-gray-200 hover:border-blue-300' },
    purple: { on: 'bg-purple-500 text-white border-purple-500', off: 'bg-white text-gray-600 border-gray-200 hover:border-purple-300' },
    green:  { on: 'bg-green-600 text-white border-green-600',   off: 'bg-white text-gray-600 border-gray-200 hover:border-green-300' },
  }
  const c = colors[accent] || colors.red
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

// ── Field label ───────────────────────────────────────────────────────────────
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

// ── Input styles ──────────────────────────────────────────────────────────────
const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300'
const ta  = `${inp} resize-none`

// ── BP classifier ─────────────────────────────────────────────────────────────
function classifyBP(sys, dia) {
  if (!sys || !dia) return null
  if (sys >= 160 || dia >= 110) return { level: 'Severe Hypertension', color: 'text-red-700', bg: 'bg-red-50 border-red-300', urgent: true }
  if (sys >= 140 || dia >= 90)  return { level: 'Hypertension', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-300', urgent: false }
  return { level: 'Normal', color: 'text-green-700', bg: 'bg-green-50 border-green-300', urgent: false }
}

// ── STAGES ────────────────────────────────────────────────────────────────────
const STAGES = [
  'Patient Info',
  'BP & Symptoms',
  'Investigations',
  'Fetal Status',
  'Diagnosis',
  'Management Plan',
]

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function PreeclampsiaAssessmentForm({ patientId, encounterId, onSaved }) {
  const [stage, setStage] = useState(0)
  const [saving, setSaving] = useState(false)

  // ── Stage 1: Patient Info ──────────────────────────────────────────────────
  const [visitDate, setVisitDate]           = useState('')
  const [ga, setGa]                         = useState('')
  const [gaUnit, setGaUnit]                 = useState('weeks')
  const [parity, setParity]                 = useState('')
  const [bmiPre, setBmiPre]                 = useState('')
  const [chronicHTN, setChronicHTN]         = useState('')
  const [chronicHTNDetails, setChronicHTNDetails] = useState('')
  const [htnOnset, setHtnOnset]             = useState('')
  const [referralSource, setReferralSource] = useState('')
  const [referralDetails, setReferralDetails] = useState('')
  const [previousPE, setPreviousPE]         = useState('')
  const [previousPEDetails, setPreviousPEDetails] = useState('')
  const [familyHxHTN, setFamilyHxHTN]       = useState('')
  const [aspirin75, setAspirin75]           = useState('')
  const [aspirinStart, setAspirinStart]     = useState('')

  // ── Stage 2: BP & Symptoms ─────────────────────────────────────────────────
  const [secBP, setSecBP]                   = useState('')
  const [bp1, setBp1]                       = useState('')
  const [bp2, setBp2]                       = useState('')
  const [bp3, setBp3]                       = useState('')
  const [bpInterval, setBpInterval]         = useState('')
  const [meanArterialPressure, setMAP]      = useState('')
  const [pulse, setPulse]                   = useState('')
  const [posture, setPosture]               = useState('')

  const [secOedema, setSecOedema]           = useState('')
  const [oedemaLocation, setOedemaLocation] = useState([])
  const [pitting, setPitting]               = useState('')
  const [pittingGrade, setPittingGrade]     = useState('')
  const [faceOedema, setFaceOedema]         = useState('')

  const [secSymptoms, setSecSymptoms]       = useState('')
  const [headache, setHeadache]             = useState('')
  const [headacheSite, setHeadacheSite]     = useState('')
  const [visualSx, setVisualSx]             = useState([])
  const [epigastricPain, setEpigastricPain] = useState('')
  const [nausea, setNausea]                 = useState('')
  const [sob, setSob]                       = useState('')
  const [oliguria, setOliguria]             = useState('')
  const [urinePer24h, setUrinePer24h]       = useState('')
  const [seizures, setSeizures]             = useState('')
  const [seizureDetails, setSeizureDetails] = useState('')
  const [consciousness, setConsciousness]   = useState('')
  const [hyperreflexia, setHyperreflexia]   = useState('')
  const [clonus, setClonus]                 = useState('')

  const [secProteinuria, setSecProteinuria] = useState('')
  const [dipstick, setDipstick]             = useState('')
  const [spot24hProtein, setSpot24hProtein] = useState('')
  const [pcrRatio, setPcrRatio]             = useState('')

  // ── Stage 3: Investigations ────────────────────────────────────────────────
  const [secCBC, setSecCBC]                 = useState('')
  const [hb, setHb]                         = useState('')
  const [platelets, setPlatelets]           = useState('')
  const [wbc, setWbc]                       = useState('')
  const [pcv, setPcv]                       = useState('')
  const [haemolysis, setHaemolysis]         = useState('')
  const [peripheralSmear, setPeripheralSmear] = useState('')

  const [secLFT, setSecLFT]                 = useState('')
  const [ast, setAst]                       = useState('')
  const [alt, setAlt]                       = useState('')
  const [totalBili, setTotalBili]           = useState('')
  const [albumen, setAlbumen]               = useState('')
  const [ldh, setLdh]                       = useState('')
  const [uricAcid, setUricAcid]             = useState('')

  const [secKFT, setSecKFT]                 = useState('')
  const [creatinine, setCreatinine]         = useState('')
  const [bun, setBun]                       = useState('')
  const [urea, setUrea]                     = useState('')
  const [na, setNa]                         = useState('')
  const [k, setK]                           = useState('')

  const [secCoag, setSecCoag]               = useState('')
  const [pt, setPt]                         = useState('')
  const [aptt, setAptt]                     = useState('')
  const [fibrinogen, setFibrinogen]         = useState('')
  const [ddimer, setDdimer]                 = useState('')

  const [secOtherInv, setSecOtherInv]       = useState('')
  const [usg, setUsg]                       = useState('')
  const [ascites, setAscites]               = useState('')
  const [pleuralEffusion, setPleuralEffusion] = useState('')
  const [echoIndicated, setEchoIndicated]   = useState('')
  const [ctHeadIndicated, setCtHeadIndicated] = useState('')
  const [ctHeadFindings, setCtHeadFindings] = useState('')

  // ── Stage 4: Fetal Status ──────────────────────────────────────────────────
  const [secFetal, setSecFetal]             = useState('')
  const [fetalMovement, setFetalMovement]   = useState('')
  const [fetalHR, setFetalHR]               = useState('')
  const [cTG, setCTG]                       = useState('')
  const [ctgFindings, setCtgFindings]       = useState('')
  const [bpp, setBpp]                       = useState('')
  const [bppScore, setBppScore]             = useState('')
  const [umbilicalDoppler, setUmbilicalDoppler] = useState('')
  const [umbilicalEDF, setUmbilicalEDF]     = useState('')
  const [mcaDoppler, setMcaDoppler]         = useState('')
  const [mcaCPR, setMcaCPR]                 = useState('')
  const [afIndex, setAfIndex]               = useState('')
  const [fetalWeight, setFetalWeight]       = useState('')
  const [placentalPosition, setPlacentalPosition] = useState('')

  // ── Stage 5: Diagnosis ─────────────────────────────────────────────────────
  const [secDiagnosis, setSecDiagnosis]     = useState('')
  const [hdpClass, setHdpClass]             = useState('')
  const [severityFeatures, setSeverityFeatures] = useState([])
  const [hellpStatus, setHellpStatus]       = useState('')
  const [hellpCriteria, setHellpCriteria]   = useState([])
  const [eclampsia, setEclampsia]           = useState('')
  const [superimposedPE, setSuperimposedPE] = useState('')
  const [differentials, setDifferentials]   = useState([])
  const [diagNotes, setDiagNotes]           = useState('')

  // ── Stage 6: Management Plan ───────────────────────────────────────────────
  const [secAntihyp, setSecAntihyp]         = useState('')
  const [antihypAgents, setAntihypAgents]   = useState([])
  const [antihypOther, setAntihypOther]     = useState('')
  const [targetBP, setTargetBP]             = useState('')
  const [ivAntihyp, setIvAntihyp]           = useState('')
  const [ivAgent, setIvAgent]               = useState('')
  const [ivDose, setIvDose]                 = useState('')

  const [secMgSO4, setSecMgSO4]             = useState('')
  const [mgso4Indication, setMgso4Indication] = useState('')
  const [mgso4Regime, setMgso4Regime]       = useState('')
  const [mgso4Loading, setMgso4Loading]     = useState('')
  const [mgso4Maintenance, setMgso4Maintenance] = useState('')
  const [toxicityMonitoring, setToxicityMonitoring] = useState([])
  const [calciumGluconateAtBed, setCalciumGluconateAtBed] = useState('')

  const [secFluid, setSecFluid]             = useState('')
  const [fluidRestriction, setFluidRestriction]   = useState('')
  const [fluidRate, setFluidRate]           = useState('')
  const [catheter, setCatheter]             = useState('')
  const [inputOutput, setInputOutput]       = useState('')

  const [secDelivery, setSecDelivery]       = useState('')
  const [deliveryDecision, setDeliveryDecision] = useState('')
  const [deliveryTiming, setDeliveryTiming] = useState('')
  const [deliveryMode, setDeliveryMode]     = useState('')
  const [corticosteroids, setCorticosteroids] = useState('')
  const [csBetamethasone, setCsBetamethasone] = useState('')
  const [csDate, setCsDate]                 = useState('')
  const [deliveryBarriers, setDeliveryBarriers] = useState('')

  const [secPostpartum, setSecPostpartum]   = useState('')
  const [ppAntihyp, setPpAntihyp]           = useState('')
  const [ppMgSO4Duration, setPpMgSO4Duration] = useState('')
  const [ppMonitoring, setPpMonitoring]     = useState('')
  const [ppDischargeTarget, setPpDischargeTarget] = useState('')
  const [ppCounselling, setPpCounselling]   = useState([])

  const [secReferral, setSecReferral]       = useState('')
  const [referTo, setReferTo]               = useState([])
  const [referUrgency, setReferUrgency]     = useState('')
  const [referNotes, setReferNotes]         = useState('')
  const [admissionDecision, setAdmissionDecision] = useState('')
  const [admissionReason, setAdmissionReason] = useState('')

  const [planNotes, setPlanNotes]           = useState('')

  // ── Auto-calculations ──────────────────────────────────────────────────────
  const bp1Alert = useMemo(() => {
    if (!bp1) return null
    const [s, d] = bp1.split('/').map(Number)
    return classifyBP(s, d)
  }, [bp1])

  const bp2Alert = useMemo(() => {
    if (!bp2) return null
    const [s, d] = bp2.split('/').map(Number)
    return classifyBP(s, d)
  }, [bp2])

  const averageBP = useMemo(() => {
    const readings = [bp1, bp2, bp3].filter(Boolean)
    if (readings.length < 2) return null
    const parsed = readings.map(r => r.split('/').map(Number)).filter(([s, d]) => s && d)
    if (parsed.length < 2) return null
    const avgSys = Math.round(parsed.reduce((a, [s]) => a + s, 0) / parsed.length)
    const avgDia = Math.round(parsed.reduce((a, [, d]) => a + d, 0) / parsed.length)
    return { sys: avgSys, dia: avgDia, alert: classifyBP(avgSys, avgDia) }
  }, [bp1, bp2, bp3])

  // HELLP auto-check
  const hellpMet = useMemo(() => {
    const criteria = []
    if (Number(platelets) < 100) criteria.push('Thrombocytopenia (<100k)')
    if (Number(ldh) > 600) criteria.push('LDH >600 IU/L')
    if (Number(ast) > 70 || Number(alt) > 70) criteria.push('Elevated liver enzymes (AST/ALT >70)')
    return criteria
  }, [platelets, ldh, ast, alt])

  // Severe features auto-detect
  const autoSevereFeatures = useMemo(() => {
    const f = []
    const bpReadings = [bp1, bp2, bp3].filter(Boolean)
    const hasSevere = bpReadings.some(r => {
      const [s, d] = r.split('/').map(Number)
      return s >= 160 || d >= 110
    })
    if (hasSevere) f.push('BP ≥160/110 on two readings')
    if (Number(platelets) < 100) f.push('Platelets <100,000/μL')
    if (Number(creatinine) > 1.1) f.push('Creatinine >1.1 mg/dL')
    if (seizures === 'Yes') f.push('Seizures (eclampsia)')
    if (Number(ast) > 70 || Number(alt) > 70) f.push('Liver enzyme elevation (>70)')
    if (headache === 'Yes') f.push('Persistent headache')
    if (visualSx.length > 0) f.push('Visual disturbances')
    if (epigastricPain === 'Yes') f.push('Epigastric/RUQ pain')
    if (sob === 'Yes') f.push('Pulmonary oedema / SOB')
    if (oliguria === 'Yes' && Number(urinePer24h) < 500) f.push('Oliguria <500ml/24h')
    return f
  }, [bp1, bp2, bp3, platelets, creatinine, seizures, ast, alt, headache, visualSx, epigastricPain, sob, oliguria, urinePer24h])

  const isSevere = autoSevereFeatures.length > 0

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        patientId, encounterId,
        formType: 'preeclampsia_assessment',
        data: {
          visitDate, ga, gaUnit, parity, bmiPre, chronicHTN, htnOnset,
          referralSource, previousPE, familyHxHTN, aspirin75, aspirinStart,
          bp: { bp1, bp2, bp3, bpInterval, pulse, posture, average: averageBP },
          oedema: { locations: oedemaLocation, pitting, pittingGrade, faceOedema },
          symptoms: { headache, headacheSite, visualSx, epigastricPain, nausea, sob, oliguria, urinePer24h, seizures, consciousness, hyperreflexia, clonus },
          proteinuria: { dipstick, spot24hProtein, pcrRatio },
          cbc: { hb, platelets, wbc, pcv, haemolysis, peripheralSmear },
          lft: { ast, alt, totalBili, albumen, ldh, uricAcid },
          kft: { creatinine, bun, urea, na, k },
          coag: { pt, aptt, fibrinogen, ddimer },
          imaging: { usg, ascites, pleuralEffusion, echoIndicated, ctHeadIndicated, ctHeadFindings },
          fetal: { fetalMovement, fetalHR, cTG, ctgFindings, bpp, bppScore, umbilicalDoppler, umbilicalEDF, mcaDoppler, mcaCPR, afIndex, fetalWeight, placentalPosition },
          diagnosis: { hdpClass, severityFeatures: autoSevereFeatures, hellpMet, eclampsia, superimposedPE, differentials, isSevere, diagNotes },
          management: {
            antihypertensives: { agents: antihypAgents, targetBP, ivAntihyp, ivAgent, ivDose },
            mgso4: { indication: mgso4Indication, regime: mgso4Regime, loading: mgso4Loading, maintenance: mgso4Maintenance, toxicityMonitoring, calciumGluconateAtBed },
            fluid: { restriction: fluidRestriction, rate: fluidRate, catheter, inputOutput },
            delivery: { decision: deliveryDecision, timing: deliveryTiming, mode: deliveryMode, corticosteroids, betamethasoneDate: csDate },
            postpartum: { antihyp: ppAntihyp, mgso4Duration: ppMgSO4Duration, monitoring: ppMonitoring, dischargeTarget: ppDischargeTarget, counselling: ppCounselling },
            referral: { to: referTo, urgency: referUrgency, notes: referNotes, admission: admissionDecision, admissionReason },
          },
          planNotes,
        }
      }
      await api.post('/assessments', payload)
      onSaved?.()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // ── Render helpers ─────────────────────────────────────────────────────────
  const navBtn = 'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all'

  // ── Stage content ──────────────────────────────────────────────────────────
  function renderStage() {
    switch (stage) {
      // ══════════════════════════════════════════════════════════════════════
      case 0: return (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <FL label="Visit Date">
              <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} className={inp} />
            </FL>
            <FL label="Gestational Age">
              <div className="flex gap-2">
                <input type="number" value={ga} onChange={e => setGa(e.target.value)} placeholder="e.g. 32" className={inp} />
                <select value={gaUnit} onChange={e => setGaUnit(e.target.value)} className={`${inp} w-28`}>
                  <option>weeks</option>
                  <option>weeks+days</option>
                </select>
              </div>
            </FL>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FL label="Parity" sub="(G_P_L_A_D)">
              <input value={parity} onChange={e => setParity(e.target.value)} placeholder="e.g. G3P2L2A0D0" className={inp} />
            </FL>
            <FL label="Pre-pregnancy BMI" sub="kg/m²">
              <input type="number" value={bmiPre} onChange={e => setBmiPre(e.target.value)} placeholder="e.g. 27.4" className={inp} />
            </FL>
          </div>

          {/* Chronic HTN */}
          <Section title="Chronic Hypertension (pre-existing)" value={secBP} onChange={setSecBP} accent="orange">
            <Gate label="Known chronic hypertension before 20 weeks / pre-pregnancy?" value={chronicHTN} onChange={setChronicHTN}>
              <FL label="Details / Medications">
                <textarea value={chronicHTNDetails} onChange={e => setChronicHTNDetails(e.target.value)} rows={2} className={ta} placeholder="Medications, duration, BP control..." />
              </FL>
              <FL label="HTN onset in this pregnancy" sub="week">
                <input type="number" value={htnOnset} onChange={e => setHtnOnset(e.target.value)} placeholder="e.g. 34" className={inp} />
              </FL>
            </Gate>
          </Section>

          {/* Previous PE */}
          <Section title="Previous Pre-eclampsia / HDP History" value={previousPE} onChange={setPreviousPE} accent="red">
            <div className="space-y-3">
              <FL label="Details of previous PE / HDP episode">
                <textarea value={previousPEDetails} onChange={e => setPreviousPEDetails(e.target.value)} rows={2} className={ta} placeholder="Gestation, severity, outcome, baby weight..." />
              </FL>
              <Gate label="Family history of hypertension / PE?" value={familyHxHTN} onChange={setFamilyHxHTN} />
            </div>
          </Section>

          {/* Aspirin prophylaxis */}
          <Section title="Aspirin Prophylaxis" value={aspirin75} onChange={setAspirin75} accent="amber">
            <div className="grid grid-cols-2 gap-4">
              <FL label="Aspirin 75–150 mg started?">
                <Pills options={['Yes', 'No', 'Contraindicated']} value={aspirin75 === 'Yes' || aspirin75 === 'No' || aspirin75 === 'Contraindicated' ? aspirin75 : ''} onChange={setAspirin75} />
              </FL>
              <FL label="Start week / date">
                <input value={aspirinStart} onChange={e => setAspirinStart(e.target.value)} placeholder="e.g. 12 weeks" className={inp} />
              </FL>
            </div>
            {aspirin75 === 'No' && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                NICE / WHO recommend aspirin 75 mg nocte from 12 weeks in high-risk patients (prior PE, chronic HTN, multifetal, CKD, diabetes, autoimmune).
              </div>
            )}
          </Section>

          {/* Referral */}
          <Section title="Referral Source" value={referralSource} onChange={setReferralSource} accent="blue">
            <FL label="Referred from">
              <Pills options={['PHC', 'CHC / Sub-district', 'ASHAworker', 'Self', 'Another specialist', 'Emergency']} value={referralSource} onChange={setReferralSource} />
            </FL>
            <FL label="Referral notes">
              <textarea value={referralDetails} onChange={e => setReferralDetails(e.target.value)} rows={2} className={ta} />
            </FL>
          </Section>
        </div>
      )

      // ══════════════════════════════════════════════════════════════════════
      case 1: return (
        <div className="space-y-5">
          {/* BP readings */}
          <Section title="Blood Pressure Readings" value={secBP} onChange={setSecBP} accent="red">
            <p className="text-xs text-gray-500 mb-3">Take 2–3 readings ≥15 min apart using validated machine; patient seated, arm at heart level.</p>
            <div className="grid grid-cols-3 gap-3">
              <FL label="Reading 1" sub="sys/dia">
                <input value={bp1} onChange={e => setBp1(e.target.value)} placeholder="e.g. 148/96" className={inp} />
                {bp1Alert && (
                  <span className={`mt-1 block text-xs font-semibold px-2 py-0.5 rounded border ${bp1Alert.bg} ${bp1Alert.color}`}>{bp1Alert.level}</span>
                )}
              </FL>
              <FL label="Reading 2" sub="sys/dia">
                <input value={bp2} onChange={e => setBp2(e.target.value)} placeholder="e.g. 150/98" className={inp} />
                {bp2Alert && (
                  <span className={`mt-1 block text-xs font-semibold px-2 py-0.5 rounded border ${bp2Alert.bg} ${bp2Alert.color}`}>{bp2Alert.level}</span>
                )}
              </FL>
              <FL label="Reading 3 (optional)" sub="sys/dia">
                <input value={bp3} onChange={e => setBp3(e.target.value)} placeholder="optional" className={inp} />
              </FL>
            </div>
            {averageBP?.alert && (
              <div className={`mt-3 p-3 rounded-lg border ${averageBP.alert.bg} flex items-center gap-2`}>
                {averageBP.alert.urgent && <span className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                <div>
                  <span className={`text-sm font-bold ${averageBP.alert.color}`}>Average BP: {averageBP.sys}/{averageBP.dia} mmHg — {averageBP.alert.level}</span>
                  {averageBP.alert.urgent && <p className="text-xs text-red-600 mt-0.5">URGENT: Initiate antihypertensive treatment immediately. Consider IV labetalol / oral nifedipine.</p>}
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3 mt-3">
              <FL label="Interval between readings">
                <input value={bpInterval} onChange={e => setBpInterval(e.target.value)} placeholder="e.g. 15 min" className={inp} />
              </FL>
              <FL label="Pulse" sub="bpm">
                <input type="number" value={pulse} onChange={e => setPulse(e.target.value)} className={inp} />
              </FL>
              <FL label="Posture during measurement">
                <Pills options={['Seated', 'Left lateral', 'Supine']} value={posture} onChange={setPosture} />
              </FL>
            </div>
          </Section>

          {/* Oedema */}
          <Section title="Oedema Assessment" value={secOedema} onChange={setSecOedema} accent="orange">
            <FL label="Oedema location(s)">
              <Pills options={['Ankles', 'Legs', 'Hands', 'Face', 'Generalised', 'Sacrum', 'Vulval']} value={oedemaLocation} onChange={setOedemaLocation} multi accent="orange" />
            </FL>
            <Gate label="Pitting oedema?" value={pitting} onChange={setPitting}>
              <FL label="Grade of pitting oedema">
                <Pills options={['1+ (trace)', '2+ (mild)', '3+ (moderate)', '4+ (severe / anasarca)']} value={pittingGrade} onChange={setPittingGrade} accent="orange" />
              </FL>
            </Gate>
            <Gate label="Facial / periorbital oedema?" value={faceOedema} onChange={setFaceOedema}>
              <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded p-2">Facial oedema is a significant warning sign — correlates with severe disease.</p>
            </Gate>
          </Section>

          {/* Symptoms */}
          <Section title="Symptoms of Severe Disease" value={secSymptoms} onChange={setSecSymptoms} accent="red">
            <Gate label="Persistent headache?" value={headache} onChange={setHeadache}>
              <FL label="Site of headache">
                <Pills options={['Frontal', 'Occipital', 'Parietal', 'Generalised', 'Thunderclap onset']} value={headacheSite} onChange={setHeadacheSite} />
              </FL>
            </Gate>
            <FL label="Visual disturbances">
              <Pills options={['Blurring', 'Flashing lights / photopsia', 'Scotoma', 'Diplopia', 'Amaurosis fugax', 'None']} value={visualSx} onChange={setVisualSx} multi />
            </FL>
            <Gate label="Epigastric / RUQ pain?" value={epigastricPain} onChange={setEpigastricPain}>
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">RUQ pain = hepatic capsule distension — consider HELLP, hepatic haematoma.</p>
            </Gate>
            <Gate label="Nausea / vomiting?" value={nausea} onChange={setNausea} />
            <Gate label="Shortness of breath / pulmonary oedema?" value={sob} onChange={setSob} />
            <Gate label="Oliguria (reduced urine output)?" value={oliguria} onChange={setOliguria}>
              <FL label="Urine output (last 24h)" sub="ml">
                <input type="number" value={urinePer24h} onChange={e => setUrinePer24h(e.target.value)} placeholder="e.g. 300" className={inp} />
              </FL>
              {oliguria === 'Yes' && Number(urinePer24h) < 500 && (
                <div className="p-2 bg-red-50 border border-red-300 rounded text-xs text-red-700 flex items-center gap-1.5">
                  <AlertTriangle size={12} /> Oliguria &lt;500 ml/24h — severe feature. Assess for AKI. Fluid management critical.
                </div>
              )}
            </Gate>
            <Gate label="Seizures / convulsions?" value={seizures} onChange={setSeizures}>
              <FL label="Seizure details">
                <textarea value={seizureDetails} onChange={e => setSeizureDetails(e.target.value)} rows={2} className={ta} placeholder="Onset, duration, postictal state, witness account..." />
              </FL>
              <div className="p-2 bg-red-50 border border-red-300 rounded text-xs text-red-700 font-semibold flex items-center gap-1.5">
                <Zap size={12} className="animate-pulse" /> Eclampsia — initiate MgSO₄ immediately. Call emergency team.
              </div>
            </Gate>
            <FL label="Conscious level">
              <Pills options={['Alert', 'Drowsy / confused', 'Reduced GCS']} value={consciousness} onChange={setConsciousness} />
            </FL>
            <Gate label="Hyperreflexia?" value={hyperreflexia} onChange={setHyperreflexia}>
              <Gate label="Clonus present (≥3 beats)?" value={clonus} onChange={setClonus}>
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">Clonus is a sign of impending eclampsia — initiate MgSO₄ prophylaxis if not already started.</p>
              </Gate>
            </Gate>
          </Section>

          {/* Proteinuria */}
          <Section title="Proteinuria Assessment" value={secProteinuria} onChange={setSecProteinuria} accent="amber">
            <div className="grid grid-cols-3 gap-4">
              <FL label="Urine dipstick">
                <Pills options={['Trace', '1+', '2+', '3+', '4+']} value={dipstick} onChange={setDipstick} accent="amber" />
              </FL>
              <FL label="24-hour urine protein" sub="mg/24h">
                <input type="number" value={spot24hProtein} onChange={e => setSpot24hProtein(e.target.value)} placeholder="e.g. 350" className={inp} />
                {Number(spot24hProtein) >= 300 && <span className="text-xs text-orange-700 mt-0.5 block font-semibold">Significant proteinuria (≥300 mg/24h)</span>}
                {Number(spot24hProtein) >= 5000 && <span className="text-xs text-red-700 mt-0.5 block font-semibold">Severe proteinuria (≥5g/24h) — nephrotic range</span>}
              </FL>
              <FL label="PCR ratio" sub="mg/mmol">
                <input type="number" value={pcrRatio} onChange={e => setPcrRatio(e.target.value)} placeholder="e.g. 35" className={inp} />
                {Number(pcrRatio) >= 30 && <span className="text-xs text-orange-700 mt-0.5 block font-semibold">PCR ≥30 = significant proteinuria</span>}
              </FL>
            </div>
          </Section>

          {/* Auto severe features summary */}
          {autoSevereFeatures.length > 0 && (
            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-red-600 animate-pulse" />
                <span className="text-sm font-bold text-red-700">Severe Features Detected ({autoSevereFeatures.length})</span>
              </div>
              <ul className="space-y-1">
                {autoSevereFeatures.map(f => (
                  <li key={f} className="text-xs text-red-600 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )

      // ══════════════════════════════════════════════════════════════════════
      case 2: return (
        <div className="space-y-5">
          {/* CBC */}
          <Section title="Complete Blood Count (CBC)" value={secCBC} onChange={setSecCBC} accent="red">
            <div className="grid grid-cols-3 gap-4">
              <FL label="Haemoglobin" sub="g/dL">
                <input type="number" value={hb} onChange={e => setHb(e.target.value)} className={inp} />
                {hb && (() => {
                  const v = Number(hb)
                  if (v < 7) return <span className="text-xs text-red-700 font-semibold mt-0.5 block">Severe anaemia</span>
                  if (v < 10) return <span className="text-xs text-orange-700 font-semibold mt-0.5 block">Moderate anaemia</span>
                  if (v < 11) return <span className="text-xs text-amber-700 font-semibold mt-0.5 block">Mild anaemia</span>
                  return null
                })()}
              </FL>
              <FL label="Platelets" sub="×10³/μL">
                <input type="number" value={platelets} onChange={e => setPlatelets(e.target.value)} className={inp} />
                {Number(platelets) < 50 && <span className="text-xs text-red-700 font-semibold mt-0.5 block">Critical thrombocytopenia (&lt;50k)</span>}
                {Number(platelets) >= 50 && Number(platelets) < 100 && <span className="text-xs text-red-600 mt-0.5 block font-semibold">HELLP criterion met (&lt;100k)</span>}
                {Number(platelets) >= 100 && Number(platelets) < 150 && <span className="text-xs text-amber-600 mt-0.5 block">Low-normal — monitor</span>}
              </FL>
              <FL label="WBC" sub="×10³/μL">
                <input type="number" value={wbc} onChange={e => setWbc(e.target.value)} className={inp} />
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FL label="PCV / Haematocrit" sub="%">
                <input type="number" value={pcv} onChange={e => setPcv(e.target.value)} className={inp} />
              </FL>
              <Gate label="Evidence of haemolysis?" value={haemolysis} onChange={setHaemolysis}>
                <FL label="Peripheral smear findings">
                  <input value={peripheralSmear} onChange={e => setPeripheralSmear(e.target.value)} placeholder="Schistocytes, helmet cells..." className={inp} />
                </FL>
              </Gate>
            </div>
          </Section>

          {/* LFT */}
          <Section title="Liver Function Tests (LFT)" value={secLFT} onChange={setSecLFT} accent="orange">
            <div className="grid grid-cols-3 gap-4">
              <FL label="AST" sub="IU/L">
                <input type="number" value={ast} onChange={e => setAst(e.target.value)} className={inp} />
                {Number(ast) > 70 && <span className="text-xs text-red-600 mt-0.5 block font-semibold">Elevated (HELLP criterion)</span>}
              </FL>
              <FL label="ALT" sub="IU/L">
                <input type="number" value={alt} onChange={e => setAlt(e.target.value)} className={inp} />
                {Number(alt) > 70 && <span className="text-xs text-red-600 mt-0.5 block font-semibold">Elevated (HELLP criterion)</span>}
              </FL>
              <FL label="Total Bilirubin" sub="mg/dL">
                <input type="number" value={totalBili} onChange={e => setTotalBili(e.target.value)} className={inp} />
              </FL>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FL label="Albumin" sub="g/dL">
                <input type="number" value={albumen} onChange={e => setAlbumen(e.target.value)} className={inp} />
                {Number(albumen) < 2.5 && <span className="text-xs text-orange-600 mt-0.5 block">Low albumin — risk of pulmonary oedema with IV fluids</span>}
              </FL>
              <FL label="LDH" sub="IU/L">
                <input type="number" value={ldh} onChange={e => setLdh(e.target.value)} className={inp} />
                {Number(ldh) > 600 && <span className="text-xs text-red-600 mt-0.5 block font-semibold">LDH &gt;600 — HELLP criterion</span>}
              </FL>
              <FL label="Uric acid" sub="mg/dL">
                <input type="number" value={uricAcid} onChange={e => setUricAcid(e.target.value)} className={inp} />
                {Number(uricAcid) > 6 && <span className="text-xs text-amber-600 mt-0.5 block">Elevated — suggests renal involvement</span>}
              </FL>
            </div>
          </Section>

          {/* HELLP auto-criteria */}
          {hellpMet.length > 0 && (
            <div className="p-3 bg-red-50 border-2 border-red-400 rounded-xl">
              <div className="flex items-center gap-2 mb-1.5">
                <Zap size={14} className="text-red-600 animate-pulse" />
                <span className="text-sm font-bold text-red-700">HELLP Criteria Met ({hellpMet.length}/3)</span>
              </div>
              {hellpMet.map(c => <p key={c} className="text-xs text-red-600">• {c}</p>)}
              {hellpMet.length >= 3 && <p className="text-xs font-bold text-red-700 mt-1">Complete HELLP syndrome — emergency management required.</p>}
            </div>
          )}

          {/* KFT */}
          <Section title="Kidney Function Tests (KFT)" value={secKFT} onChange={setSecKFT} accent="blue">
            <div className="grid grid-cols-3 gap-4">
              <FL label="Serum Creatinine" sub="mg/dL">
                <input type="number" value={creatinine} onChange={e => setCreatinine(e.target.value)} className={inp} />
                {Number(creatinine) > 1.1 && <span className="text-xs text-red-600 mt-0.5 block font-semibold">Above normal — severe feature</span>}
              </FL>
              <FL label="BUN" sub="mg/dL">
                <input type="number" value={bun} onChange={e => setBun(e.target.value)} className={inp} />
              </FL>
              <FL label="Urea" sub="mg/dL">
                <input type="number" value={urea} onChange={e => setUrea(e.target.value)} className={inp} />
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FL label="Sodium (Na)" sub="mEq/L">
                <input type="number" value={na} onChange={e => setNa(e.target.value)} className={inp} />
              </FL>
              <FL label="Potassium (K)" sub="mEq/L">
                <input type="number" value={k} onChange={e => setK(e.target.value)} className={inp} />
              </FL>
            </div>
          </Section>

          {/* Coagulation */}
          <Section title="Coagulation Profile" value={secCoag} onChange={setSecCoag} accent="purple">
            <div className="grid grid-cols-2 gap-4">
              <FL label="PT / INR">
                <input value={pt} onChange={e => setPt(e.target.value)} placeholder="e.g. 14 sec / INR 1.2" className={inp} />
              </FL>
              <FL label="aPTT" sub="sec">
                <input type="number" value={aptt} onChange={e => setAptt(e.target.value)} className={inp} />
              </FL>
              <FL label="Fibrinogen" sub="mg/dL">
                <input type="number" value={fibrinogen} onChange={e => setFibrinogen(e.target.value)} className={inp} />
                {Number(fibrinogen) < 200 && fibrinogen && <span className="text-xs text-red-600 mt-0.5 block font-semibold">Low fibrinogen — DIC risk</span>}
              </FL>
              <FL label="D-Dimer" sub="ng/mL">
                <input type="number" value={ddimer} onChange={e => setDdimer(e.target.value)} className={inp} />
              </FL>
            </div>
          </Section>

          {/* Imaging & other */}
          <Section title="Imaging & Other Investigations" value={secOtherInv} onChange={setSecOtherInv} accent="teal">
            <FL label="USG abdomen findings">
              <textarea value={usg} onChange={e => setUsg(e.target.value)} rows={2} className={ta} placeholder="Liver, kidneys, ascites, placenta..." />
            </FL>
            <div className="grid grid-cols-2 gap-4">
              <Gate label="Ascites on USG?" value={ascites} onChange={setAscites} />
              <Gate label="Pleural effusion?" value={pleuralEffusion} onChange={setPleuralEffusion} />
            </div>
            <Gate label="Echocardiography indicated?" value={echoIndicated} onChange={setEchoIndicated}>
              <p className="text-xs text-teal-700">Indicated if SOB, cardiomegaly, or pre-existing cardiac disease.</p>
            </Gate>
            <Gate label="CT head indicated?" value={ctHeadIndicated} onChange={setCtHeadIndicated}>
              <FL label="CT head findings">
                <textarea value={ctHeadFindings} onChange={e => setCtHeadFindings(e.target.value)} rows={2} className={ta} placeholder="Cerebral oedema, haemorrhage, PRES..." />
              </FL>
            </Gate>
          </Section>
        </div>
      )

      // ══════════════════════════════════════════════════════════════════════
      case 3: return (
        <div className="space-y-5">
          <Section title="Fetal Surveillance" value={secFetal} onChange={setSecFetal} accent="blue">
            <div className="grid grid-cols-2 gap-4">
              <FL label="Fetal movements">
                <Pills options={['Normal', 'Reduced', 'Absent', 'Not perceived yet']} value={fetalMovement} onChange={setFetalMovement} accent="blue" />
              </FL>
              <FL label="Fetal heart rate" sub="bpm">
                <input type="number" value={fetalHR} onChange={e => setFetalHR(e.target.value)} placeholder="e.g. 142" className={inp} />
              </FL>
            </div>

            <Gate label="CTG performed?" value={cTG} onChange={setCTG}>
              <FL label="CTG interpretation">
                <Pills options={['Normal (reassuring)', 'Suspicious', 'Pathological', 'Non-reactive']} value={ctgFindings} onChange={setCtgFindings} accent="blue" />
              </FL>
              {ctgFindings === 'Pathological' && (
                <div className="p-2 bg-red-50 border border-red-300 rounded text-xs text-red-700 font-semibold flex items-center gap-1.5">
                  <AlertTriangle size={12} className="animate-pulse" /> Pathological CTG — immediate obstetric review, prepare for emergency delivery.
                </div>
              )}
            </Gate>

            <Gate label="Biophysical Profile (BPP) performed?" value={bpp} onChange={setBpp}>
              <FL label="BPP score" sub="/10">
                <input type="number" value={bppScore} onChange={e => setBppScore(e.target.value)} max={10} className={inp} />
                {Number(bppScore) <= 4 && bppScore && (
                  <div className="p-2 bg-red-50 border border-red-300 rounded text-xs text-red-700 mt-1 font-semibold">
                    BPP ≤4/10 — consider immediate delivery.
                  </div>
                )}
                {Number(bppScore) === 6 && <span className="text-xs text-amber-600 mt-0.5 block">BPP 6/10 — equivocal, repeat in 6h or proceed to delivery based on gestation.</span>}
              </FL>
            </Gate>

            <Gate label="Umbilical artery Doppler performed?" value={umbilicalDoppler} onChange={setUmbilicalDoppler}>
              <FL label="Umbilical artery EDF">
                <Pills options={['Normal forward flow', 'Reduced EDF', 'Absent EDF (AEDF)', 'Reversed EDF (REDF)']} value={umbilicalEDF} onChange={setUmbilicalEDF} accent="red" />
              </FL>
              {(umbilicalEDF === 'Absent EDF (AEDF)' || umbilicalEDF === 'Reversed EDF (REDF)') && (
                <div className="p-3 bg-red-50 border-2 border-red-400 rounded-lg text-xs text-red-700 font-bold flex items-center gap-2">
                  <Zap size={14} className="animate-pulse text-red-600 flex-shrink-0" />
                  {umbilicalEDF} — urgent delivery decision required. Neonatal team alert.
                </div>
              )}
            </Gate>

            <Gate label="MCA Doppler / CPR performed?" value={mcaDoppler} onChange={setMcaDoppler}>
              <FL label="MCA PI / CPR ratio">
                <input value={mcaCPR} onChange={e => setMcaCPR(e.target.value)} placeholder="e.g. CPR 0.8 (low)" className={inp} />
              </FL>
            </Gate>

            <div className="grid grid-cols-2 gap-4">
              <FL label="Amniotic fluid index (AFI)" sub="cm">
                <input type="number" value={afIndex} onChange={e => setAfIndex(e.target.value)} className={inp} />
                {Number(afIndex) < 5 && afIndex && <span className="text-xs text-red-700 font-semibold mt-0.5 block">Oligohydramnios (AFI &lt;5)</span>}
                {Number(afIndex) >= 5 && Number(afIndex) < 8 && afIndex && <span className="text-xs text-amber-600 mt-0.5 block">Borderline AFI</span>}
              </FL>
              <FL label="Estimated fetal weight" sub="grams / %ile">
                <input value={fetalWeight} onChange={e => setFetalWeight(e.target.value)} placeholder="e.g. 1800g / <10th centile" className={inp} />
              </FL>
            </div>

            <FL label="Placental position">
              <Pills options={['Fundal', 'Anterior', 'Posterior', 'Lateral', 'Low-lying', 'Praevia']} value={placentalPosition} onChange={setPlacentalPosition} accent="blue" />
            </FL>
          </Section>
        </div>
      )

      // ══════════════════════════════════════════════════════════════════════
      case 4: return (
        <div className="space-y-5">
          <Section title="HDP Classification & Diagnosis" value={secDiagnosis} onChange={setSecDiagnosis} accent="red">
            <FL label="Hypertensive Disorder Classification">
              <Pills options={[
                'Gestational Hypertension',
                'Pre-eclampsia (without severe features)',
                'Pre-eclampsia with severe features',
                'Eclampsia',
                'HELLP Syndrome',
                'Superimposed PE on chronic HTN',
                'Chronic Hypertension',
              ]} value={hdpClass} onChange={setHdpClass} accent="red" />
            </FL>

            {/* Auto severe features */}
            {autoSevereFeatures.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-xl">
                <p className="text-xs font-bold text-red-700 mb-1.5">Auto-detected severe features:</p>
                {autoSevereFeatures.map(f => <p key={f} className="text-xs text-red-600">• {f}</p>)}
              </div>
            )}

            <FL label="Additional severity features (manual)">
              <Pills options={[
                'Severe headache', 'Visual disturbances', 'Epigastric pain',
                'Pulmonary oedema', 'Oliguria', 'Impaired consciousness',
                'Stroke', 'Hepatic haematoma', 'Abruption'
              ]} value={severityFeatures} onChange={setSeverityFeatures} multi accent="red" />
            </FL>

            {/* HELLP */}
            <Gate label="HELLP Syndrome suspected / confirmed?" value={hellpStatus} onChange={setHellpStatus}>
              {hellpMet.length > 0 && (
                <div className="p-2 bg-red-50 border border-red-300 rounded text-xs text-red-700 mb-2">
                  <p className="font-semibold mb-1">Auto-detected HELLP criteria ({hellpMet.length}/3):</p>
                  {hellpMet.map(c => <p key={c}>• {c}</p>)}
                </div>
              )}
              <FL label="HELLP criteria met">
                <Pills options={['Haemolysis', 'Elevated liver enzymes', 'Low platelets']} value={hellpCriteria} onChange={setHellpCriteria} multi accent="red" />
              </FL>
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2 mt-2">
                Complete HELLP: Platelets &lt;100k + LDH &gt;600 + AST &gt;70. Partial HELLP: 1-2 criteria. Both require urgent delivery planning.
              </p>
            </Gate>

            <Gate label="Eclampsia (seizures in setting of HDP)?" value={eclampsia} onChange={setEclampsia}>
              <div className="p-2 bg-red-50 border-2 border-red-400 rounded text-xs text-red-700 font-bold">
                Eclampsia = obstetric emergency. MgSO₄ 4g IV stat if not already given. Stabilise, then deliver.
              </div>
            </Gate>

            <Gate label="Superimposed PE on chronic hypertension?" value={superimposedPE} onChange={setSuperimposedPE}>
              <p className="text-xs text-gray-600">New-onset proteinuria or sudden worsening of BP or end-organ dysfunction in a patient with chronic HTN.</p>
            </Gate>

            <FL label="Differential diagnoses considered">
              <Pills options={[
                'Thrombotic thrombocytopenic purpura (TTP)',
                'Haemolytic uraemic syndrome (HUS)',
                'Acute fatty liver of pregnancy (AFLP)',
                'Antiphospholipid syndrome (APS)',
                'Autoimmune hepatitis',
                'Cholestasis of pregnancy',
              ]} value={differentials} onChange={setDifferentials} multi />
            </FL>

            <FL label="Clinician diagnosis notes">
              <textarea value={diagNotes} onChange={e => setDiagNotes(e.target.value)} rows={3} className={ta} placeholder="Summary of clinical reasoning, grade of evidence, diagnostic uncertainty..." />
            </FL>
          </Section>
        </div>
      )

      // ══════════════════════════════════════════════════════════════════════
      case 5: return (
        <div className="space-y-5">
          {/* Antihypertensives */}
          <Section title="Antihypertensive Treatment" value={secAntihyp} onChange={setSecAntihyp} accent="orange">
            <FL label="Oral antihypertensive agent(s)">
              <Pills options={[
                'Labetalol (oral)', 'Methyldopa', 'Nifedipine (extended release)',
                'Nifedipine (short-acting — avoid if possible)', 'Amlodipine',
                'Hydralazine (oral)', 'Atenolol (avoid — fetal growth restriction risk)',
              ]} value={antihypAgents} onChange={setAntihypAgents} multi accent="orange" />
            </FL>
            <FL label="Other / dose adjustments">
              <input value={antihypOther} onChange={e => setAntihypOther(e.target.value)} placeholder="Doses, frequency, combination therapy..." className={inp} />
            </FL>
            <FL label="Target BP">
              <Pills options={['<150/100 mmHg', '<140/90 mmHg (if proteinuria)', 'Individualised']} value={targetBP} onChange={setTargetBP} accent="orange" />
            </FL>

            <Gate label="IV antihypertensive required (BP ≥160/110)?" value={ivAntihyp} onChange={setIvAntihyp}>
              <FL label="IV agent">
                <Pills options={['IV Labetalol', 'IV Hydralazine', 'IV Nicardipine']} value={ivAgent} onChange={setIvAgent} accent="red" />
              </FL>
              <FL label="Protocol / dose used">
                <input value={ivDose} onChange={e => setIvDose(e.target.value)} placeholder="e.g. Labetalol 20mg IV bolus, repeat q10min (max 300mg)..." className={inp} />
              </FL>
              <div className="p-2 bg-orange-50 border border-orange-300 rounded text-xs text-orange-700">
                Avoid nifedipine sublingually — risk of precipitous BP drop. IV labetalol contraindicated in asthma/heart block.
              </div>
            </Gate>
          </Section>

          {/* MgSO4 */}
          <Section title="Magnesium Sulphate (MgSO₄) Protocol" value={secMgSO4} onChange={setSecMgSO4} accent="red">
            <FL label="Indication for MgSO₄">
              <Pills options={[
                'Eclampsia — treatment',
                'Severe PE — seizure prophylaxis',
                'Impending eclampsia (clonus/hyperreflexia)',
                'Pre-operative (prior to CS)',
              ]} value={mgso4Indication} onChange={setMgso4Indication} accent="red" />
            </FL>
            <FL label="Regime">
              <Pills options={['Pritchard regime', 'Zuspan regime', 'Modified Magpie']} value={mgso4Regime} onChange={setMgso4Regime} accent="red" />
            </FL>
            <div className="grid grid-cols-2 gap-4">
              <FL label="Loading dose">
                <input value={mgso4Loading} onChange={e => setMgso4Loading(e.target.value)} placeholder="e.g. 4g IV over 20 min" className={inp} />
              </FL>
              <FL label="Maintenance dose">
                <input value={mgso4Maintenance} onChange={e => setMgso4Maintenance(e.target.value)} placeholder="e.g. 1g/hr IV OR 5g IM q4h" className={inp} />
              </FL>
            </div>
            <FL label="Toxicity monitoring checklist">
              <Pills options={[
                'RR ≥12/min before each dose',
                'Patellar reflex present',
                'Urine output ≥25ml/hr',
                'SpO₂ monitoring',
                'Serum Mg levels if renal impairment',
              ]} value={toxicityMonitoring} onChange={setToxicityMonitoring} multi accent="amber" />
            </FL>
            <Gate label="Calcium gluconate 10% (1g IV) kept at bedside?" value={calciumGluconateAtBed} onChange={setCalciumGluconateAtBed}>
              <p className="text-xs text-green-700">Antidote for MgSO₄ toxicity — give if RR &lt;12, absent reflexes, or SpO₂ drops.</p>
            </Gate>
          </Section>

          {/* Fluid management */}
          <Section title="Fluid Management" value={secFluid} onChange={setSecFluid} accent="blue">
            <Gate label="Fluid restriction in place?" value={fluidRestriction} onChange={setFluidRestriction}>
              <FL label="IV fluid rate" sub="ml/hr">
                <input type="number" value={fluidRate} onChange={e => setFluidRate(e.target.value)} placeholder="e.g. 80 ml/hr (restrict to 80-125ml/hr)" className={inp} />
              </FL>
              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">
                Restrict total input to ≤125 ml/hr (including MgSO₄ solution) in oliguria. Pre-eclamptic patients are at high risk of pulmonary oedema with over-enthusiastic fluid therapy.
              </p>
            </Gate>
            <Gate label="Urinary catheter (Foley) inserted?" value={catheter} onChange={setCatheter}>
              <Gate label="Strict input/output chart running?" value={inputOutput} onChange={setInputOutput} />
            </Gate>
          </Section>

          {/* Delivery planning */}
          <Section title="Delivery Planning" value={secDelivery} onChange={setSecDelivery} accent="amber">
            <FL label="Delivery decision">
              <Pills options={['Deliver now', 'Expectant management — continue pregnancy', 'Expectant with close monitoring', 'Pending senior review']} value={deliveryDecision} onChange={setDeliveryDecision} accent="amber" />
            </FL>
            {deliveryDecision === 'Deliver now' && (
              <div className="p-2 bg-amber-50 border border-amber-300 rounded text-xs text-amber-700">
                Severe PE &gt;34 weeks → deliver. &lt;34 weeks with severe features → deliver after corticosteroids (24–48h) if maternal condition permits.
              </div>
            )}
            <FL label="Planned timing of delivery" sub="if expectant">
              <input value={deliveryTiming} onChange={e => setDeliveryTiming(e.target.value)} placeholder="e.g. 37 weeks if mild, 34 weeks if severe" className={inp} />
            </FL>
            <FL label="Mode of delivery">
              <Pills options={['Vaginal delivery (with cervical ripening)', 'Vaginal delivery (spontaneous labour)', 'Emergency LSCS', 'Elective LSCS', 'Instrumental']} value={deliveryMode} onChange={setDeliveryMode} accent="amber" />
            </FL>
            <Gate label="Antenatal corticosteroids given / prescribed?" value={corticosteroids} onChange={setCorticosteroids}>
              <div className="grid grid-cols-2 gap-4">
                <FL label="Agent">
                  <Pills options={['Betamethasone 12mg IM ×2 (24h apart)', 'Dexamethasone 6mg IM ×4 (q12h)']} value={csBetamethasone} onChange={setCsBetamethasone} accent="green" />
                </FL>
                <FL label="Date first dose given">
                  <input type="date" value={csDate} onChange={e => setCsDate(e.target.value)} className={inp} />
                </FL>
              </div>
              <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2 mt-1">Indicated &lt;34 weeks (consider up to 37 weeks for elective CS). Reduces neonatal RDS, IVH, NEC.</p>
            </Gate>
            <FL label="Barriers / social factors affecting delivery">
              <textarea value={deliveryBarriers} onChange={e => setDeliveryBarriers(e.target.value)} rows={2} className={ta} placeholder="Distance from hospital, transport, financial, refusal, language..." />
            </FL>
          </Section>

          {/* Postpartum plan */}
          <Section title="Postpartum / Postnatal Plan" value={secPostpartum} onChange={setSecPostpartum} accent="purple">
            <FL label="Postpartum antihypertensive">
              <input value={ppAntihyp} onChange={e => setPpAntihyp(e.target.value)} placeholder="e.g. Labetalol 200mg TDS or Nifedipine ER 30mg OD" className={inp} />
            </FL>
            <FL label="Continue MgSO₄ for" sub="hours post-delivery">
              <input value={ppMgSO4Duration} onChange={e => setPpMgSO4Duration(e.target.value)} placeholder="e.g. 24h post-delivery or 24h after last seizure" className={inp} />
            </FL>
            <FL label="Postpartum monitoring frequency">
              <input value={ppMonitoring} onChange={e => setPpMonitoring(e.target.value)} placeholder="e.g. BP q4h for 24h, then q8h, daily LFT/platelets" className={inp} />
            </FL>
            <FL label="Discharge BP target">
              <input value={ppDischargeTarget} onChange={e => setPpDischargeTarget(e.target.value)} placeholder="e.g. <140/90 on oral medications" className={inp} />
            </FL>
            <FL label="Postpartum counselling given">
              <Pills options={[
                'Recurrence risk in next pregnancy (up to 25%)',
                'Aspirin prophylaxis in next pregnancy',
                'Cardiovascular risk (HTN, CVD in later life)',
                'Contraception advice (avoid oestrogen-containing)',
                'BP check at 6-week review',
                'Seek care if headache / vision change after discharge',
                'JSY / PMMVY benefits if eligible',
              ]} value={ppCounselling} onChange={setPpCounselling} multi accent="purple" />
            </FL>
          </Section>

          {/* Referral & Admission */}
          <Section title="Referral & Admission" value={secReferral} onChange={setSecReferral} accent="teal">
            <FL label="Refer to">
              <Pills options={['MFM / Maternal Medicine', 'Nephrology', 'Cardiology', 'Neurology', 'Haematology', 'NICU', 'Ophthalmology']} value={referTo} onChange={setReferTo} multi accent="teal" />
            </FL>
            <FL label="Referral urgency">
              <Pills options={['Routine', 'Urgent (same day)', 'Emergency (immediate)']} value={referUrgency} onChange={setReferUrgency} accent="red" />
            </FL>
            <FL label="Referral notes">
              <textarea value={referNotes} onChange={e => setReferNotes(e.target.value)} rows={2} className={ta} />
            </FL>
            <FL label="Admission decision">
              <Pills options={['Admit to HDU/ICU', 'Admit to maternity ward', 'Admit to labour suite', 'Outpatient monitoring', 'Discharge with 48h review']} value={admissionDecision} onChange={setAdmissionDecision} accent="teal" />
            </FL>
            {(admissionDecision === 'Admit to HDU/ICU') && (
              <div className="p-2 bg-red-50 border border-red-300 rounded text-xs text-red-700 font-semibold">
                HDU/ICU admission: Inform anaesthesia, senior obstetrician, and neonatology.
              </div>
            )}
            <FL label="Reason for admission decision">
              <input value={admissionReason} onChange={e => setAdmissionReason(e.target.value)} className={inp} />
            </FL>
          </Section>

          {/* Plan notes */}
          <div>
            <FL label="Overall Management Plan Notes">
              <textarea value={planNotes} onChange={e => setPlanNotes(e.target.value)} rows={4} className={ta} placeholder="Summary of plan, follow-up, emergency instructions, ASHA/ANM coordination..." />
            </FL>
          </div>
        </div>
      )

      default: return null
    }
  }

  // ── Header severity badge ─────────────────────────────────────────────────
  const headerBadge = useMemo(() => {
    if (seizures === 'Yes') return { label: 'ECLAMPSIA', color: 'bg-red-600 text-white animate-pulse' }
    if (hellpMet.length >= 3) return { label: 'HELLP', color: 'bg-red-600 text-white animate-pulse' }
    if (isSevere) return { label: 'SEVERE PE', color: 'bg-red-500 text-white' }
    if (averageBP?.alert?.urgent) return { label: 'SEVERE HTN', color: 'bg-red-500 text-white' }
    if (averageBP?.alert && !averageBP.alert.urgent) return { label: 'HTN', color: 'bg-orange-500 text-white' }
    return null
  }, [seizures, hellpMet, isSevere, averageBP])

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-rose-700 px-6 py-5 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <AlertTriangle size={22} />
            </div>
            <div>
              <p className="text-red-200 text-xs font-medium uppercase tracking-wider">OBG Assessment</p>
              <h1 className="text-xl font-bold">Pre-eclampsia & HDP</h1>
              <p className="text-red-200 text-xs mt-0.5">Hypertensive Disorders of Pregnancy</p>
            </div>
          </div>
          <div className="text-right space-y-1">
            {headerBadge && (
              <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-lg ${headerBadge.color}`}>
                {headerBadge.label}
              </span>
            )}
            {ga && <p className="text-red-200 text-xs">{ga} {gaUnit}</p>}
          </div>
        </div>
        {/* Progress */}
        <div className="mt-4 flex gap-1">
          {STAGES.map((s, i) => (
            <button key={s} type="button" onClick={() => setStage(i)}
              className={`flex-1 h-1.5 rounded-full transition-all ${i === stage ? 'bg-white' : i < stage ? 'bg-red-300' : 'bg-white/20'}`} />
          ))}
        </div>
        <p className="text-red-200 text-xs mt-1.5">{stage + 1} / {STAGES.length} — {STAGES[stage]}</p>
      </div>

      {/* Stage tabs */}
      <div className="flex border-b border-gray-100 overflow-x-auto bg-gray-50/60">
        {STAGES.map((s, i) => (
          <button key={s} type="button" onClick={() => setStage(i)}
            className={`px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
              i === stage ? 'border-red-500 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}>
            {s}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="p-5">
        {renderStage()}
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between px-5 pb-5">
        <button type="button" onClick={() => setStage(s => Math.max(0, s - 1))} disabled={stage === 0}
          className={`${navBtn} text-gray-600 hover:bg-gray-100 disabled:opacity-30`}>
          <ChevronLeft size={16} /> Back
        </button>
        {stage < STAGES.length - 1 ? (
          <button type="button" onClick={() => setStage(s => s + 1)}
            className={`${navBtn} bg-red-500 text-white hover:bg-red-600`}>
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button type="button" onClick={handleSave} disabled={saving}
            className={`${navBtn} bg-red-600 text-white hover:bg-red-700 disabled:opacity-60`}>
            {saving ? 'Saving…' : 'Save Assessment'}
          </button>
        )}
      </div>
    </div>
  )
}
