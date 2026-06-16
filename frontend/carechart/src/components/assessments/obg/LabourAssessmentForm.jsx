/**
 * @shared-pool
 * @category obg
 * @tags labour, partograph, intrapartum, delivery, cervix, CTG, oxytocin
 * Portal-agnostic. Safe to surface in any portal's assessment search.
 */

import React, { useState, useMemo } from 'react'
import { Zap, ChevronRight, ChevronLeft, Lock, AlertTriangle } from 'lucide-react'
import api from '../../../api/client'

// ── Section gate ──────────────────────────────────────────────────────────────
function Section({ title, value, onChange, children, accent = 'indigo' }) {
  const A = {
    indigo: { border: 'border-indigo-200', bg: 'bg-indigo-50/40', div: 'border-indigo-100', btn: 'bg-indigo-600 text-white border-indigo-600' },
    red:    { border: 'border-red-200',    bg: 'bg-red-50/40',    div: 'border-red-100',    btn: 'bg-red-500 text-white border-red-500' },
    orange: { border: 'border-orange-200', bg: 'bg-orange-50/40', div: 'border-orange-100', btn: 'bg-orange-500 text-white border-orange-500' },
    amber:  { border: 'border-amber-200',  bg: 'bg-amber-50/40',  div: 'border-amber-100',  btn: 'bg-amber-500 text-white border-amber-500' },
    green:  { border: 'border-green-200',  bg: 'bg-green-50/40',  div: 'border-green-100',  btn: 'bg-green-600 text-white border-green-600' },
    blue:   { border: 'border-blue-200',   bg: 'bg-blue-50/40',   div: 'border-blue-100',   btn: 'bg-blue-500 text-white border-blue-500' },
    purple: { border: 'border-purple-200', bg: 'bg-purple-50/40', div: 'border-purple-100', btn: 'bg-purple-500 text-white border-purple-500' },
    teal:   { border: 'border-teal-200',   bg: 'bg-teal-50/40',   div: 'border-teal-100',   btn: 'bg-teal-500 text-white border-teal-500' },
  }
  const a = A[accent] || A.indigo
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

function Gate({ label, value, onChange, children, accent = 'indigo' }) {
  const onColor = {
    indigo: 'bg-indigo-600 text-white border-indigo-600',
    red: 'bg-red-500 text-white border-red-500',
    orange: 'bg-orange-500 text-white border-orange-500',
    amber: 'bg-amber-500 text-white border-amber-500',
    green: 'bg-green-600 text-white border-green-600',
  }
  const c = onColor[accent] || onColor.indigo
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-gray-600">{label}</span>
        <div className="flex gap-1">
          {['Yes', 'No'].map(opt => (
            <button key={opt} type="button" onClick={() => onChange(v => v === opt ? '' : opt)}
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all ${
                value === opt
                  ? opt === 'Yes' ? c : 'bg-gray-400 text-white border-gray-400'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      {value === 'Yes' && <div className="pl-4 border-l-2 border-indigo-200 space-y-3">{children}</div>}
    </div>
  )
}

function Pills({ options, value, onChange, multi = false, accent = 'indigo' }) {
  const colors = {
    indigo: { on: 'bg-indigo-600 text-white border-indigo-600', off: 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300' },
    red:    { on: 'bg-red-500 text-white border-red-500',       off: 'bg-white text-gray-600 border-gray-200 hover:border-red-300' },
    orange: { on: 'bg-orange-500 text-white border-orange-500', off: 'bg-white text-gray-600 border-gray-200 hover:border-orange-300' },
    amber:  { on: 'bg-amber-500 text-white border-amber-500',   off: 'bg-white text-gray-600 border-gray-200 hover:border-amber-300' },
    green:  { on: 'bg-green-600 text-white border-green-600',   off: 'bg-white text-gray-600 border-gray-200 hover:border-green-300' },
    blue:   { on: 'bg-blue-500 text-white border-blue-500',     off: 'bg-white text-gray-600 border-gray-200 hover:border-blue-300' },
    purple: { on: 'bg-purple-500 text-white border-purple-500', off: 'bg-white text-gray-600 border-gray-200 hover:border-purple-300' },
  }
  const c = colors[accent] || colors.indigo
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

const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300'
const ta  = `${inp} resize-none`

const STAGES = [
  'Admission',
  'Assessment',
  'First Stage',
  'Second Stage',
  'Third Stage',
  'Complications',
  'Delivery Summary',
]

export default function LabourAssessmentForm({ patientId, encounterId, onSaved }) {
  const [stage, setStage] = useState(0)
  const [saving, setSaving] = useState(false)

  // ── Stage 1: Admission ─────────────────────────────────────────────────────
  const [admissionDate, setAdmissionDate]   = useState('')
  const [admissionTime, setAdmissionTime]   = useState('')
  const [ga, setGa]                         = useState('')
  const [parity, setParity]                 = useState('')
  const [lmp, setLmp]                       = useState('')
  const [edd, setEdd]                       = useState('')
  const [labourType, setLabourType]         = useState('')
  const [ruptureStatus, setRuptureStatus]   = useState('')
  const [romTime, setRomTime]               = useState('')
  const [liquorColour, setLiquorColour]     = useState('')
  const [fundalHeight, setFundalHeight]     = useState('')
  const [lie, setLie]                       = useState('')
  const [presentation, setPresentation]     = useState('')
  const [engagement, setEngagement]         = useState('')
  const [fetalHR_adm, setFetalHR_adm]       = useState('')
  const [bp_adm, setBp_adm]                 = useState('')
  const [pulse_adm, setPulse_adm]           = useState('')
  const [temp_adm, setTemp_adm]             = useState('')
  const [urine_adm, setUrine_adm]           = useState('')

  // History
  const [secHistory, setSecHistory]         = useState('')
  const [prevCS, setPrevCS]                 = useState('')
  const [prevCSCount, setPrevCSCount]       = useState('')
  const [vbacConsent, setVbacConsent]       = useState('')
  const [scarTenderness, setScarTenderness] = useState('')
  const [gdm, setGdm]                       = useState('')
  const [ghtn, setGhtn]                     = useState('')
  const [hivrisk, setHivrisk]               = useState('')
  const [gbs, setGbs]                       = useState('')
  const [gbsAbx, setGbsAbx]                 = useState('')
  const [antenatalNotes, setAntenatalNotes] = useState('')

  // ── Stage 2: Assessment ─────────────────────────────────────────────────────
  const [secPV, setSecPV]                   = useState('')
  const [pvTime, setPvTime]                 = useState('')
  const [cervixDilation, setCervixDilation] = useState('')
  const [cervixEffacement, setCervixEffacement] = useState('')
  const [cervixConsistency, setCervixConsistency] = useState('')
  const [cervixPosition, setCervixPosition] = useState('')
  const [stationNum, setStationNum]         = useState('')
  const [bishopScore, setBishopScore]       = useState('')
  const [membranes, setMembranes]           = useState('')
  const [caput, setCaput]                   = useState('')
  const [moulding, setMoulding]             = useState('')
  const [presenting, setPresenting]         = useState('')
  const [pelvis, setPelvis]                 = useState('')

  const bishopAuto = useMemo(() => {
    let score = 0
    const dil = Number(cervixDilation)
    if (dil === 0) score += 0
    else if (dil <= 2) score += 1
    else if (dil <= 4) score += 2
    else score += 3
    const eff = Number(cervixEffacement)
    if (eff < 30) score += 0
    else if (eff < 60) score += 1
    else if (eff < 80) score += 2
    else score += 3
    const sta = Number(stationNum)
    if (sta <= -3) score += 0
    else if (sta <= -1) score += 1
    else if (sta === 0) score += 2
    else score += 3
    return score
  }, [cervixDilation, cervixEffacement, stationNum])

  const [secCTG, setSecCTG]                 = useState('')
  const [ctgType, setCtgType]               = useState('')
  const [ctgResult, setCtgResult]           = useState('')
  const [ctgFindings, setCtgFindings]       = useState([])
  const [decelerations, setDecelerations]   = useState('')
  const [decelType, setDecelType]           = useState('')
  const [ctgAction, setCtgAction]           = useState('')

  // ── Stage 3: First Stage ───────────────────────────────────────────────────
  const [secFirstStage, setSecFirstStage]   = useState('')
  const [labourOnset, setLabourOnset]       = useState('')
  const [labourPhase, setLabourPhase]       = useState('')
  const [contractionFreq, setContractionFreq] = useState('')
  const [contractionDuration, setContractionDuration] = useState('')
  const [contractionStrength, setContractionStrength] = useState('')
  const [partograph, setPartograph]         = useState('')
  const [alertLine, setAlertLine]           = useState('')
  const [actionLine, setActionLine]         = useState('')
  const [progressNotes, setProgressNotes]   = useState('')

  const [secAugmentation, setSecAugmentation] = useState('')
  const [augIndication, setAugIndication]   = useState([])
  const [oxytocinStarted, setOxytocinStarted] = useState('')
  const [oxytocinDose, setOxytocinDose]     = useState('')
  const [oxytocinMax, setOxytocinMax]       = useState('')
  const [armShouldDone, setArmShouldDone]   = useState('')
  const [armTime, setArmTime]               = useState('')

  const [secInduction, setSecInduction]     = useState('')
  const [inductionMethod, setInductionMethod] = useState([])
  const [inductionIndication, setInductionIndication] = useState([])
  const [prostaglandinAgent, setProstaglandinAgent] = useState('')
  const [prostaglandinDose, setProstaglandinDose] = useState('')
  const [balloonCatheter, setBalloonCatheter] = useState('')
  const [cooksBalloon, setCooksBalloon]     = useState('')
  const [inductionToActiveLaborTime, setInductionToActiveLaborTime] = useState('')

  const [secPainRelief, setSecPainRelief]   = useState('')
  const [painReliefMethods, setPainReliefMethods] = useState([])
  const [epidural, setEpidural]             = useState('')
  const [epiduralTime, setEpiduralTime]     = useState('')
  const [epiduralEffect, setEpiduralEffect] = useState('')
  const [entonox, setEntonox]               = useState('')

  // ── Stage 4: Second Stage ──────────────────────────────────────────────────
  const [secSecondStage, setSecSecondStage] = useState('')
  const [secondStageStart, setSecondStageStart] = useState('')
  const [pushingType, setPushingType]       = useState('')
  const [pushingDuration, setPushingDuration] = useState('')
  const [perineum, setPerineum]             = useState('')
  const [episiotomy, setEpisiotomy]         = useState('')
  const [episiotomyType, setEpisiotomyType] = useState('')
  const [episiotomyIndication, setEpisiotomyIndication] = useState([])
  const [laceration, setLaceration]         = useState('')
  const [lacerationDegree, setLacerationDegree] = useState('')
  const [lacerationRepair, setLacerationRepair] = useState('')

  const [secInstrumental, setSecInstrumental] = useState('')
  const [instrumentType, setInstrumentType] = useState('')
  const [instrumentIndication, setInstrumentIndication] = useState([])
  const [instrumentSuccess, setInstrumentSuccess] = useState('')
  const [numAttempts, setNumAttempts]       = useState('')

  // ── Stage 5: Third Stage ───────────────────────────────────────────────────
  const [secThirdStage, setSecThirdStage]   = useState('')
  const [thirdStageMgmt, setThirdStageMgmt] = useState('')
  const [oxytocinThird, setOxytocinThird]   = useState('')
  const [oxytocinThirdDose, setOxytocinThirdDose] = useState('')
  const [placentaDelivery, setPlacentaDelivery] = useState('')
  const [placentaComplete, setPlacentaComplete] = useState('')
  const [membranesComplete, setMembranesComplete] = useState('')
  const [placentaExaminationNotes, setPlacentaExaminationNotes] = useState('')
  const [cordBloodCollected, setCordBloodCollected] = useState('')
  const [bloodLoss, setBloodLoss]           = useState('')
  const [pphDefined, setPphDefined]         = useState('')

  const [secPPH, setSecPPH]                 = useState('')
  const [pphAmount, setPphAmount]           = useState('')
  const [pphCauses, setPphCauses]           = useState([])
  const [pphTreatment, setPphTreatment]     = useState([])
  const [bloodTransfusion, setBloodTransfusion] = useState('')
  const [unitsTransfused, setUnitsTransfused] = useState('')
  const [uterineMassage, setUterineMassage] = useState('')
  const [carbetocin, setCarbetocin]         = useState('')
  const [misoprostol, setMisoprostol]       = useState('')
  const [bakri, setBakri]                   = useState('')
  const [brace, setBrace]                   = useState('')
  const [surgical, setSurgical]             = useState('')
  const [surgicalDetail, setSurgicalDetail] = useState('')

  // ── Stage 6: Complications ─────────────────────────────────────────────────
  const [secMatComp, setSecMatComp]         = useState('')
  const [shoulderDystocia, setShoulderDystocia] = useState('')
  const [sdManoeuvres, setSdManoeuvres]     = useState([])
  const [uterineRupture, setUterineRupture] = useState('')
  const [ruptureDetails, setRuptureDetails] = useState('')
  const [cordProlapse, setCordProlapse]     = useState('')
  const [abruption, setAbruption]           = useState('')
  const [eclampsia, setEclampsia]           = useState('')
  const [mgso4Labour, setMgso4Labour]       = useState('')
  const [fetalDistress, setFetalDistress]   = useState('')
  const [meconium, setMeconium]             = useState('')
  const [meconiumGrade, setMeconiumGrade]   = useState('')
  const [amnioinfusion, setAmnioinfusion]   = useState('')
  const [chorioamnionitis, setChorioamnionitis] = useState('')
  const [chorioDetails, setChorioDetails]   = useState('')
  const [maternalFever, setMaternalFever]   = useState('')
  const [antibioticsGiven, setAntibioticsGiven] = useState('')
  const [antibioticDetails, setAntibioticDetails] = useState('')
  const [intrapartumCS, setIntrapartumCS]   = useState('')
  const [csIndication, setCsIndication]     = useState([])

  // ── Stage 7: Delivery Summary ──────────────────────────────────────────────
  const [secBaby, setSecBaby]               = useState('')
  const [deliveryTime, setDeliveryTime]     = useState('')
  const [deliveryMode, setDeliveryMode]     = useState('')
  const [sex, setSex]                       = useState('')
  const [birthWeight, setBirthWeight]       = useState('')
  const [apgar1, setApgar1]                 = useState('')
  const [apgar5, setApgar5]                 = useState('')
  const [apgar10, setApgar10]               = useState('')
  const [neonatalResus, setNeonatalResus]   = useState('')
  const [resusDetails, setResusDetails]     = useState('')
  const [nicu, setNicu]                     = useState('')
  const [nicuReason, setNicuReason]         = useState('')
  const [breastfeedingInitiated, setBreastfeedingInitiated] = useState('')
  const [skinToSkin, setSkinToSkin]         = useState('')
  const [vitK, setVitK]                     = useState('')
  const [eyeProphylaxis, setEyeProphylaxis] = useState('')
  const [cordCare, setCordCare]             = useState('')
  const [birthCertificate, setBirthCertificate] = useState('')

  const [secMaternalRecovery, setSecMaternalRecovery] = useState('')
  const [maternalBP, setMaternalBP]         = useState('')
  const [maternalUterus, setMaternalUterus] = useState('')
  const [maternalLochia, setMaternalLochia] = useState('')
  const [maternalCatheter, setMaternalCatheter] = useState('')
  const [maternalIV, setMaternalIV]         = useState('')
  const [maternalAnalgesia, setMaternalAnalgesia] = useState('')
  const [deliveryNotes, setDeliveryNotes]   = useState('')

  // ── Auto-alerts ────────────────────────────────────────────────────────────
  const urgentAlerts = useMemo(() => {
    const a = []
    if (cordProlapse === 'Yes') a.push('CORD PROLAPSE — emergency delivery')
    if (uterineRupture === 'Yes') a.push('UTERINE RUPTURE — emergency laparotomy')
    if (eclampsia === 'Yes') a.push('ECLAMPSIA — MgSO₄, stabilise, deliver')
    if (decelType === 'Prolonged deceleration' || decelType === 'Sinusoidal') a.push('Pathological CTG — urgent obstetric review')
    if (meconiumGrade === 'Grade 3 (thick, pea-soup)') a.push('Grade 3 meconium — paediatric team standby')
    if (shoulderDystocia === 'Yes') a.push('Shoulder dystocia documented — check neonatal brachial plexus')
    return a
  }, [cordProlapse, uterineRupture, eclampsia, decelType, meconiumGrade, shoulderDystocia])

  const neonatalConcern = useMemo(() => {
    const a = []
    if (Number(apgar1) <= 3) a.push(`APGAR 1-min = ${apgar1} (severe depression)`)
    if (Number(apgar5) <= 6) a.push(`APGAR 5-min = ${apgar5} (ongoing depression)`)
    if (Number(birthWeight) < 1500) a.push(`Birth weight ${birthWeight}g — VLBW, NICU needed`)
    else if (Number(birthWeight) < 2500) a.push(`Birth weight ${birthWeight}g — LBW`)
    if (Number(birthWeight) > 4000) a.push(`Birth weight ${birthWeight}g — Macrosomia`)
    return a
  }, [apgar1, apgar5, birthWeight])

  async function handleSave() {
    setSaving(true)
    try {
      await api.post('/assessments', {
        patientId, encounterId,
        formType: 'labour_assessment',
        data: {
          admission: { date: admissionDate, time: admissionTime, ga, parity, lmp, edd, labourType, ruptureStatus, romTime, liquorColour, fundalHeight, lie, presentation, engagement, fetalHR: fetalHR_adm, bp: bp_adm, pulse: pulse_adm, temp: temp_adm, urine: urine_adm },
          history: { prevCS, prevCSCount, vbacConsent, scarTenderness, gdm, ghtn, hivrisk, gbs, gbsAbx, antenatalNotes },
          cervicalAssessment: { time: pvTime, dilation: cervixDilation, effacement: cervixEffacement, consistency: cervixConsistency, position: cervixPosition, station: stationNum, bishopScore: bishopAuto, membranes, caput, moulding, presenting, pelvis },
          ctg: { type: ctgType, result: ctgResult, findings: ctgFindings, decelerations, decelType, action: ctgAction },
          firstStage: { onset: labourOnset, phase: labourPhase, contractions: { freq: contractionFreq, duration: contractionDuration, strength: contractionStrength }, partograph, alertLine, actionLine, progressNotes },
          augmentation: { indication: augIndication, oxytocin: oxytocinStarted, dose: oxytocinDose, max: oxytocinMax, arm: armShouldDone, armTime },
          induction: { methods: inductionMethod, indications: inductionIndication, prostaglandin: prostaglandinAgent, prostaglandinDose, balloon: balloonCatheter, cooks: cooksBalloon, toActiveLabour: inductionToActiveLaborTime },
          painRelief: { methods: painReliefMethods, epidural, epiduralTime, epiduralEffect, entonox },
          secondStage: { start: secondStageStart, pushingType, duration: pushingDuration, perineum, episiotomy, episiotomyType, episiotomyIndication, laceration, lacerationDegree, lacerationRepair },
          instrumental: { type: instrumentType, indication: instrumentIndication, success: instrumentSuccess, attempts: numAttempts },
          thirdStage: { management: thirdStageMgmt, oxytocin: oxytocinThird, oxytocinDose: oxytocinThirdDose, placentaDelivery, placentaComplete, membranesComplete, placentaExamination: placentaExaminationNotes, cordBlood: cordBloodCollected, bloodLoss, pph: pphDefined },
          pph: { amount: pphAmount, causes: pphCauses, treatment: pphTreatment, transfusion: bloodTransfusion, units: unitsTransfused },
          complications: { shoulderDystocia, sdManoeuvres, uterineRupture, cordProlapse, abruption, eclampsia, mgso4: mgso4Labour, fetalDistress, meconium, meconiumGrade, amnioinfusion, chorioamnionitis, fever: maternalFever, antibiotics: antibioticsGiven, intrapartumCS, csIndication, urgentAlerts },
          delivery: { time: deliveryTime, mode: deliveryMode, sex, birthWeight, apgar1, apgar5, apgar10, resus: neonatalResus, resusDetails, nicu, nicuReason, breastfeeding: breastfeedingInitiated, skinToSkin, vitK, eyeProphylaxis, cordCare, neonatalConcern },
          maternalRecovery: { bp: maternalBP, uterus: maternalUterus, lochia: maternalLochia, catheter: maternalCatheter, iv: maternalIV, analgesia: maternalAnalgesia },
          deliveryNotes,
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
            <FL label="Admission Date">
              <input type="date" value={admissionDate} onChange={e => setAdmissionDate(e.target.value)} className={inp} />
            </FL>
            <FL label="Admission Time">
              <input type="time" value={admissionTime} onChange={e => setAdmissionTime(e.target.value)} className={inp} />
            </FL>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FL label="GA" sub="weeks">
              <input type="number" value={ga} onChange={e => setGa(e.target.value)} className={inp} />
            </FL>
            <FL label="Parity">
              <input value={parity} onChange={e => setParity(e.target.value)} placeholder="G_P_L_A" className={inp} />
            </FL>
            <FL label="EDD">
              <input type="date" value={edd} onChange={e => setEdd(e.target.value)} className={inp} />
            </FL>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FL label="Type of labour">
              <Pills options={['Spontaneous', 'Induced', 'Augmented', 'Elective CS']} value={labourType} onChange={setLabourType} accent="indigo" />
            </FL>
            <FL label="Membranes">
              <Pills options={['Intact', 'SROM', 'AROM (done)']} value={ruptureStatus} onChange={setRuptureStatus} accent="indigo" />
            </FL>
          </div>

          {ruptureStatus !== 'Intact' && ruptureStatus && (
            <div className="grid grid-cols-2 gap-4">
              <FL label="Time of ROM">
                <input type="time" value={romTime} onChange={e => setRomTime(e.target.value)} className={inp} />
              </FL>
              <FL label="Liquor colour">
                <Pills options={['Clear', 'Meconium-stained', 'Blood-stained', 'Absent']} value={liquorColour} onChange={setLiquorColour} accent="amber" />
              </FL>
            </div>
          )}
          {liquorColour === 'Meconium-stained' && (
            <div className="p-2 bg-orange-50 border border-orange-300 rounded text-xs text-orange-700 flex items-center gap-1.5">
              <AlertTriangle size={12} /> Meconium-stained liquor — alert paediatric team, continuous CTG mandatory.
            </div>
          )}

          {/* Abdomen */}
          <div className="grid grid-cols-2 gap-4">
            <FL label="Fundal height" sub="weeks / cm">
              <input value={fundalHeight} onChange={e => setFundalHeight(e.target.value)} placeholder="e.g. 38 weeks / 36 cm" className={inp} />
            </FL>
            <FL label="Lie">
              <Pills options={['Longitudinal', 'Transverse', 'Oblique']} value={lie} onChange={setLie} />
            </FL>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FL label="Presentation">
              <Pills options={['Cephalic', 'Breech', 'Shoulder', 'Face', 'Brow']} value={presentation} onChange={setPresentation} accent="indigo" />
            </FL>
            <FL label="Engagement">
              <Pills options={['Not engaged', '1/5', '2/5', '3/5', '4/5', 'Engaged (0/5)']} value={engagement} onChange={setEngagement} accent="indigo" />
            </FL>
            <FL label="FHR on auscultation" sub="bpm">
              <input type="number" value={fetalHR_adm} onChange={e => setFetalHR_adm(e.target.value)} className={inp} />
            </FL>
          </div>

          {/* Vitals */}
          <div className="grid grid-cols-4 gap-3">
            <FL label="BP" sub="mmHg">
              <input value={bp_adm} onChange={e => setBp_adm(e.target.value)} placeholder="120/80" className={inp} />
            </FL>
            <FL label="Pulse" sub="bpm">
              <input type="number" value={pulse_adm} onChange={e => setPulse_adm(e.target.value)} className={inp} />
            </FL>
            <FL label="Temp" sub="°C">
              <input type="number" value={temp_adm} onChange={e => setTemp_adm(e.target.value)} step="0.1" className={inp} />
              {Number(temp_adm) >= 38 && <span className="text-xs text-red-700 font-semibold mt-0.5 block">Fever — chorioamnionitis?</span>}
            </FL>
            <FL label="Urine">
              <Pills options={['Clear', 'Protein+', 'Protein++', 'Glucose+']} value={urine_adm} onChange={setUrine_adm} accent="amber" />
            </FL>
          </div>

          {/* Obstetric history */}
          <Section title="Relevant Obstetric History" value={secHistory} onChange={setSecHistory} accent="blue">
            <Gate label="Previous caesarean section?" value={prevCS} onChange={setPrevCS}>
              <div className="grid grid-cols-2 gap-4">
                <FL label="Number of previous CS">
                  <input type="number" value={prevCSCount} onChange={e => setPrevCSCount(e.target.value)} className={inp} />
                </FL>
                <Gate label="VBAC consented / planned?" value={vbacConsent} onChange={setVbacConsent}>
                  <Gate label="Scar tenderness on palpation?" value={scarTenderness} onChange={setScarTenderness} accent="red">
                    <div className="p-2 bg-red-50 border border-red-300 rounded text-xs text-red-700 font-semibold">
                      Scar tenderness — consider scar dehiscence / rupture. Senior review urgently.
                    </div>
                  </Gate>
                </Gate>
              </div>
            </Gate>
            <Gate label="GDM in this pregnancy?" value={gdm} onChange={setGdm} />
            <Gate label="Gestational hypertension / pre-eclampsia?" value={ghtn} onChange={setGhtn} />
            <Gate label="HIV-positive (PMTCT)?" value={hivrisk} onChange={setHivrisk} />
            <Gate label="GBS carrier (vaginal swab positive)?" value={gbs} onChange={setGbs}>
              <Gate label="Intrapartum antibiotic prophylaxis given?" value={gbsAbx} onChange={setGbsAbx}>
                <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2">IV Benzyl Penicillin 3g loading then 1.5g q4h until delivery (or Ampicillin if allergy).</p>
              </Gate>
            </Gate>
            <FL label="Other antenatal issues">
              <textarea value={antenatalNotes} onChange={e => setAntenatalNotes(e.target.value)} rows={2} className={ta} placeholder="IVF conception, fetal anomaly, IUGR, placenta praevia..." />
            </FL>
          </Section>
        </div>
      )

      // ══════════════════════════════════════════════════════════════════════
      case 1: return (
        <div className="space-y-5">
          <Section title="Vaginal Examination (PV)" value={secPV} onChange={setSecPV} accent="indigo">
            <FL label="Time of PV examination">
              <input type="time" value={pvTime} onChange={e => setPvTime(e.target.value)} className={inp} />
            </FL>
            <div className="grid grid-cols-2 gap-4">
              <FL label="Cervical dilation" sub="cm">
                <input type="number" value={cervixDilation} onChange={e => setCervixDilation(e.target.value)} max={10} className={inp} />
                {(() => {
                  const d = Number(cervixDilation)
                  if (d < 4) return <span className="text-xs text-gray-500 mt-0.5 block">Latent phase (&lt;4 cm)</span>
                  if (d < 10) return <span className="text-xs text-indigo-700 mt-0.5 block font-semibold">Active phase ({d} cm)</span>
                  return <span className="text-xs text-green-700 font-bold mt-0.5 block">Fully dilated — second stage</span>
                })()}
              </FL>
              <FL label="Cervical effacement" sub="%">
                <input type="number" value={cervixEffacement} onChange={e => setCervixEffacement(e.target.value)} max={100} className={inp} />
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FL label="Cervical consistency">
                <Pills options={['Firm', 'Medium', 'Soft']} value={cervixConsistency} onChange={setCervixConsistency} accent="indigo" />
              </FL>
              <FL label="Cervical position">
                <Pills options={['Posterior', 'Mid', 'Anterior']} value={cervixPosition} onChange={setCervixPosition} accent="indigo" />
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FL label="Station" sub="cm from ischial spines">
                <input type="number" value={stationNum} onChange={e => setStationNum(e.target.value)} placeholder="-3 to +3" className={inp} />
              </FL>
              <FL label="Bishop Score (auto-calculated)">
                <div className={`px-3 py-2 rounded-lg border text-sm font-bold ${
                  bishopAuto >= 8 ? 'bg-green-50 border-green-300 text-green-700' :
                  bishopAuto >= 6 ? 'bg-amber-50 border-amber-300 text-amber-700' :
                  'bg-gray-50 border-gray-200 text-gray-600'
                }`}>
                  {bishopAuto} / 13
                  {bishopAuto >= 8 ? ' — Favourable' : bishopAuto >= 6 ? ' — Borderline' : ' — Unfavourable'}
                </div>
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FL label="Membranes (on PV)">
                <Pills options={['Intact', 'Ruptured', 'Bulging']} value={membranes} onChange={setMembranes} accent="indigo" />
              </FL>
              <FL label="Presenting part">
                <Pills options={['Vertex', 'Occiput anterior', 'Occiput posterior', 'Occiput transverse', 'Face', 'Brow', 'Breech']} value={presenting} onChange={setPresenting} accent="indigo" />
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FL label="Caput succedaneum">
                <Pills options={['Absent', '+', '++', '+++']} value={caput} onChange={setCaput} accent="amber" />
              </FL>
              <FL label="Moulding">
                <Pills options={['Absent', '+ (bones touching)', '++ (overlapping, reducible)', '+++ (overlapping, fixed)']} value={moulding} onChange={setMoulding} accent="amber" />
              </FL>
            </div>
            {(moulding === '+++ (overlapping, fixed)' || caput === '+++') && (
              <div className="p-2 bg-orange-50 border border-orange-300 rounded text-xs text-orange-700 font-semibold flex items-center gap-1.5">
                <AlertTriangle size={12} /> Severe moulding/caput — CPD suspected. Review progress carefully. Senior review.
              </div>
            )}
            <FL label="Clinical pelvimetry assessment">
              <Pills options={['Adequate', 'Borderline', 'Contracted pelvis', 'Not assessed']} value={pelvis} onChange={setPelvis} accent="indigo" />
            </FL>
          </Section>

          <Section title="CTG / EFM Monitoring" value={secCTG} onChange={setSecCTG} accent="blue">
            <FL label="Monitoring type">
              <Pills options={['Continuous EFM (CTG)', 'Intermittent auscultation (IA)', 'Admission CTG only']} value={ctgType} onChange={setCtgType} accent="blue" />
            </FL>
            <FL label="CTG interpretation">
              <Pills options={['Normal (reassuring)', 'Suspicious (1 non-reassuring feature)', 'Pathological (≥2 non-reassuring / 1 abnormal)', 'Non-reactive']} value={ctgResult} onChange={setCtgResult} accent={ctgResult === 'Pathological (≥2 non-reassuring / 1 abnormal)' ? 'red' : 'blue'} />
            </FL>
            {ctgResult === 'Pathological (≥2 non-reassuring / 1 abnormal)' && (
              <div className="p-3 bg-red-50 border-2 border-red-400 rounded-xl text-sm text-red-700 font-bold flex items-center gap-2">
                <Zap size={14} className="animate-pulse" /> Pathological CTG — immediate obstetric review. Consider FBS or expedite delivery.
              </div>
            )}
            <FL label="CTG features noted">
              <Pills options={[
                'Baseline 110–160 (normal)', 'Bradycardia <110', 'Tachycardia >160',
                'Variability 5–25 (normal)', 'Reduced variability <5', 'Absent variability',
                'Accelerations present', 'No accelerations',
                'Early decelerations', 'Late decelerations', 'Variable decelerations',
                'Prolonged deceleration', 'Sinusoidal',
              ]} value={ctgFindings} onChange={setCtgFindings} multi accent="blue" />
            </FL>
            <Gate label="Decelerations present?" value={decelerations} onChange={setDecelerations}>
              <FL label="Type of deceleration">
                <Pills options={['Early (normal)', 'Variable', 'Late', 'Prolonged deceleration', 'Sinusoidal']} value={decelType} onChange={setDecelType} accent={['Late', 'Sinusoidal', 'Prolonged deceleration'].includes(decelType) ? 'red' : 'blue'} />
              </FL>
            </Gate>
            <FL label="Action taken on CTG">
              <Pills options={['Continue monitoring', 'Fetal blood sampling (FBS)', 'Intrauterine resuscitation', 'Emergency CS', 'Expedited delivery', 'Called senior']} value={ctgAction} onChange={setCtgAction} multi accent="blue" />
            </FL>
          </Section>
        </div>
      )

      // ══════════════════════════════════════════════════════════════════════
      case 2: return (
        <div className="space-y-5">
          <Section title="Labour Progress (First Stage)" value={secFirstStage} onChange={setSecFirstStage} accent="indigo">
            <div className="grid grid-cols-2 gap-4">
              <FL label="Labour onset time">
                <input type="time" value={labourOnset} onChange={e => setLabourOnset(e.target.value)} className={inp} />
              </FL>
              <FL label="Current phase">
                <Pills options={['Latent (&lt;4 cm)', 'Active (4–9 cm)', 'Transition (9–10 cm)']} value={labourPhase} onChange={setLabourPhase} accent="indigo" />
              </FL>
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contractions</p>
            <div className="grid grid-cols-3 gap-3">
              <FL label="Frequency" sub="per 10 min">
                <input type="number" value={contractionFreq} onChange={e => setContractionFreq(e.target.value)} className={inp} />
              </FL>
              <FL label="Duration" sub="sec">
                <input type="number" value={contractionDuration} onChange={e => setContractionDuration(e.target.value)} className={inp} />
              </FL>
              <FL label="Strength">
                <Pills options={['Mild', 'Moderate', 'Strong']} value={contractionStrength} onChange={setContractionStrength} accent="indigo" />
              </FL>
            </div>
            {Number(contractionFreq) > 5 && (
              <div className="p-2 bg-orange-50 border border-orange-300 rounded text-xs text-orange-700 font-semibold">
                Tachysystole (&gt;5 contractions/10 min) — if on oxytocin, reduce dose. If spontaneous, consider tocolysis.
              </div>
            )}
            <FL label="Partograph status">
              <Pills options={['Being maintained', 'Not started', 'Not applicable']} value={partograph} onChange={setPartograph} accent="indigo" />
            </FL>
            {partograph === 'Being maintained' && (
              <div className="grid grid-cols-2 gap-4">
                <FL label="Alert line status">
                  <Pills options={['Left of alert line', 'On alert line', 'Right of alert line']} value={alertLine} onChange={setAlertLine} accent="amber" />
                </FL>
                <FL label="Action line status">
                  <Pills options={['Left of action line', 'On action line', 'Right of action line (action needed)']} value={actionLine} onChange={setActionLine} accent={actionLine === 'Right of action line (action needed)' ? 'red' : 'amber'} />
                </FL>
              </div>
            )}
            {actionLine === 'Right of action line (action needed)' && (
              <div className="p-2 bg-red-50 border border-red-300 rounded text-xs text-red-700 font-semibold flex items-center gap-1.5">
                <AlertTriangle size={12} /> Action line crossed — senior obstetrician review. Reassess need for CS.
              </div>
            )}
            <FL label="Progress notes">
              <textarea value={progressNotes} onChange={e => setProgressNotes(e.target.value)} rows={3} className={ta} placeholder="Hourly vaginal exam findings, dilation progression..." />
            </FL>
          </Section>

          <Section title="Augmentation of Labour" value={secAugmentation} onChange={setSecAugmentation} accent="amber">
            <FL label="Indication(s)">
              <Pills options={['Slow progress (active phase arrest)', 'PROM >18h', 'Reduced fetal movements', 'CTG concern', 'Post-dates']} value={augIndication} onChange={setAugIndication} multi accent="amber" />
            </FL>
            <Gate label="Oxytocin (Syntocinon) started?" value={oxytocinStarted} onChange={setOxytocinStarted}>
              <div className="grid grid-cols-2 gap-4">
                <FL label="Starting dose" sub="mU/min">
                  <input value={oxytocinDose} onChange={e => setOxytocinDose(e.target.value)} placeholder="e.g. 2 mU/min, increase by 2 mU/min q30min" className={inp} />
                </FL>
                <FL label="Maximum dose" sub="mU/min">
                  <input type="number" value={oxytocinMax} onChange={e => setOxytocinMax(e.target.value)} placeholder="e.g. 32 mU/min" className={inp} />
                </FL>
              </div>
            </Gate>
            <Gate label="ARM (artificial rupture of membranes) done?" value={armShouldDone} onChange={setArmShouldDone}>
              <FL label="Time of ARM">
                <input type="time" value={armTime} onChange={e => setArmTime(e.target.value)} className={inp} />
              </FL>
            </Gate>
          </Section>

          <Section title="Induction of Labour" value={secInduction} onChange={setSecInduction} accent="purple">
            <FL label="Method(s) of induction">
              <Pills options={['Prostaglandin (PGE2)', 'Misoprostol (PGE1)', 'Oxytocin infusion', 'Balloon catheter (Cook\'s)', 'Membrane sweep', 'AROM only']} value={inductionMethod} onChange={setInductionMethod} multi accent="purple" />
            </FL>
            <FL label="Indication(s)">
              <Pills options={['Post-dates (≥41 weeks)', 'GDM', 'Pre-eclampsia', 'IUGR/FGR', 'Reduced fetal movement', 'PROM at term', 'Maternal request', 'Cholestasis of pregnancy', 'Previous stillbirth']} value={inductionIndication} onChange={setInductionIndication} multi accent="purple" />
            </FL>
            {inductionMethod.includes('Prostaglandin (PGE2)') && (
              <div className="grid grid-cols-2 gap-4">
                <FL label="Prostaglandin agent">
                  <Pills options={['Dinoprostone gel 0.5mg intracervical', 'Dinoprostone pessary 10mg', 'Cerviprime gel']} value={prostaglandinAgent} onChange={setProstaglandinAgent} accent="purple" />
                </FL>
                <FL label="Dose used">
                  <input value={prostaglandinDose} onChange={e => setProstaglandinDose(e.target.value)} className={inp} />
                </FL>
              </div>
            )}
            {inductionMethod.includes('Balloon catheter (Cook\'s)') && (
              <Gate label="Cook's balloon catheter placed?" value={cooksBalloon} onChange={setCooksBalloon}>
                <p className="text-xs text-purple-700">Double balloon catheter, fill inner to 80 ml; review after 12h or spontaneous expulsion.</p>
              </Gate>
            )}
            <FL label="Time from start of induction to active labour">
              <input value={inductionToActiveLaborTime} onChange={e => setInductionToActiveLaborTime(e.target.value)} placeholder="e.g. 18 hours" className={inp} />
            </FL>
          </Section>

          <Section title="Pain Relief" value={secPainRelief} onChange={setSecPainRelief} accent="teal">
            <FL label="Methods used">
              <Pills options={['Epidural analgesia', 'Entonox (nitrous oxide)', 'IV Tramadol', 'IM Pethidine', 'IV Fentanyl', 'Spinal', 'TENS', 'Non-pharmacological (bath, massage)']} value={painReliefMethods} onChange={setPainReliefMethods} multi accent="teal" />
            </FL>
            <Gate label="Epidural inserted?" value={epidural} onChange={setEpidural}>
              <div className="grid grid-cols-2 gap-4">
                <FL label="Time of epidural">
                  <input type="time" value={epiduralTime} onChange={e => setEpiduralTime(e.target.value)} className={inp} />
                </FL>
                <FL label="Effectiveness">
                  <Pills options={['Full relief', 'Partial relief', 'Inadequate / patchy']} value={epiduralEffect} onChange={setEpiduralEffect} accent="teal" />
                </FL>
              </div>
            </Gate>
          </Section>
        </div>
      )

      // ══════════════════════════════════════════════════════════════════════
      case 3: return (
        <div className="space-y-5">
          <Section title="Second Stage of Labour" value={secSecondStage} onChange={setSecSecondStage} accent="green">
            <FL label="Second stage started (time)">
              <input type="time" value={secondStageStart} onChange={e => setSecondStageStart(e.target.value)} className={inp} />
            </FL>
            <FL label="Pushing type">
              <Pills options={['Maternal bearing-down (directed)', 'Physiological pushing', 'Delayed pushing (laboured down first)']} value={pushingType} onChange={setPushingType} accent="green" />
            </FL>
            <FL label="Duration of active pushing" sub="minutes">
              <input type="number" value={pushingDuration} onChange={e => setPushingDuration(e.target.value)} className={inp} />
              {Number(pushingDuration) > 60 && !instrumentType && (
                <span className="text-xs text-orange-700 font-semibold mt-0.5 block">Prolonged second stage — senior review / consider instrumental</span>
              )}
            </FL>
            <FL label="Perineal condition at delivery">
              <Pills options={['Intact', 'First-degree tear', 'Second-degree tear', 'Third-degree tear', 'Fourth-degree tear', 'Episiotomy', 'Episiotomy + extension']} value={perineum} onChange={setPerineum} accent="green" />
            </FL>

            <Gate label="Episiotomy performed?" value={episiotomy} onChange={setEpisiotomy}>
              <div className="grid grid-cols-2 gap-4">
                <FL label="Type">
                  <Pills options={['Mediolateral', 'Median/midline']} value={episiotomyType} onChange={setEpisiotomyType} accent="green" />
                </FL>
                <FL label="Indication(s)">
                  <Pills options={['Fetal distress', 'Instrumental delivery', 'Preterm', 'Shoulder dystocia', 'Rigid perineum', 'Maternal exhaustion']} value={episiotomyIndication} onChange={setEpisiotomyIndication} multi accent="green" />
                </FL>
              </div>
            </Gate>

            <Gate label="Perineal laceration?" value={laceration} onChange={setLaceration}>
              <FL label="Degree">
                <Pills options={['1st degree (skin only)', '2nd degree (muscle)', '3rd degree (sphincter partial)', '3rd degree (sphincter complete)', '4th degree (rectal mucosa)']} value={lacerationDegree} onChange={setLacerationDegree} accent={lacerationDegree?.includes('3rd') || lacerationDegree?.includes('4th') ? 'red' : 'green'} />
              </FL>
              {(lacerationDegree?.includes('3rd') || lacerationDegree?.includes('4th')) && (
                <div className="p-2 bg-red-50 border border-red-300 rounded text-xs text-red-700 font-semibold">
                  OASI — senior surgeon repair (±colorectal). Antibiotics, laxatives, physiotherapy referral, follow-up at 6–8 weeks.
                </div>
              )}
              <FL label="Repair performed by">
                <input value={lacerationRepair} onChange={e => setLacerationRepair(e.target.value)} placeholder="e.g. Registrar, consultant — Vicryl 2-0 layer by layer" className={inp} />
              </FL>
            </Gate>
          </Section>

          <Section title="Instrumental Delivery" value={secInstrumental} onChange={setSecInstrumental} accent="indigo">
            <FL label="Instrument used">
              <Pills options={['Ventouse (vacuum extractor)', 'Kiwi cup (OmniCup)', 'Forceps (non-rotational)', 'Forceps (rotational / Kjelland)', 'Sequential (ventouse then forceps)']} value={instrumentType} onChange={setInstrumentType} accent="indigo" />
            </FL>
            <FL label="Indication(s)">
              <Pills options={['Fetal distress / CTG concern', 'Maternal exhaustion', 'Prolonged second stage', 'Maternal cardiac / neurological', 'After-coming head (breech)']} value={instrumentIndication} onChange={setInstrumentIndication} multi accent="indigo" />
            </FL>
            <div className="grid grid-cols-2 gap-4">
              <FL label="Success">
                <Pills options={['Successful delivery', 'Failed — proceeded to CS']} value={instrumentSuccess} onChange={setInstrumentSuccess} accent={instrumentSuccess?.includes('Failed') ? 'red' : 'green'} />
              </FL>
              <FL label="Number of pulls / attempts">
                <input type="number" value={numAttempts} onChange={e => setNumAttempts(e.target.value)} className={inp} />
                {Number(numAttempts) > 3 && <span className="text-xs text-red-700 font-semibold mt-0.5 block">&gt;3 pulls — document carefully, consider CS</span>}
              </FL>
            </div>
          </Section>
        </div>
      )

      // ══════════════════════════════════════════════════════════════════════
      case 4: return (
        <div className="space-y-5">
          <Section title="Third Stage Management" value={secThirdStage} onChange={setSecThirdStage} accent="teal">
            <FL label="Third stage management">
              <Pills options={['Active management (AMTSL)', 'Physiological management', 'Modified active']} value={thirdStageMgmt} onChange={setThirdStageMgmt} accent="teal" />
            </FL>
            <Gate label="Oxytocin given at delivery of anterior shoulder?" value={oxytocinThird} onChange={setOxytocinThird}>
              <FL label="Dose and route">
                <Pills options={['Oxytocin 10 IU IM', 'Oxytocin 5 IU IV slow', 'Carbetocin 100 mcg IM', 'Ergometrine 0.5 mg IM', 'Syntocinon infusion']} value={oxytocinThirdDose} onChange={setOxytocinThirdDose} multi accent="teal" />
              </FL>
            </Gate>
            <div className="grid grid-cols-2 gap-4">
              <FL label="Placenta delivery">
                <Pills options={['Spontaneous', 'Controlled cord traction (CCT)', 'Manual removal']} value={placentaDelivery} onChange={setPlacentaDelivery} accent="teal" />
              </FL>
              <FL label="Estimated blood loss" sub="mL">
                <input type="number" value={bloodLoss} onChange={e => setBloodLoss(e.target.value)} className={inp} />
                {Number(bloodLoss) >= 1000 && <span className="text-xs text-red-700 font-bold mt-0.5 block">Major PPH (≥1000ml)</span>}
                {Number(bloodLoss) >= 500 && Number(bloodLoss) < 1000 && <span className="text-xs text-orange-700 font-semibold mt-0.5 block">PPH (≥500ml)</span>}
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FL label="Placenta complete?">
                <Pills options={['Yes — complete', 'No — retained / incomplete']} value={placentaComplete} onChange={setPlacentaComplete} accent={placentaComplete?.includes('No') ? 'red' : 'teal'} />
              </FL>
              <FL label="Membranes complete?">
                <Pills options={['Yes', 'No — may be retained']} value={membranesComplete} onChange={setMembranesComplete} accent={membranesComplete === 'No — may be retained' ? 'red' : 'teal'} />
              </FL>
            </div>
            {(placentaComplete?.includes('No') || membranesComplete === 'No — may be retained') && (
              <div className="p-2 bg-red-50 border border-red-300 rounded text-xs text-red-700 font-semibold">
                Retained placenta / membranes — manual removal under anaesthesia or RPOC evacuation may be needed. PPH risk.
              </div>
            )}
            <FL label="Placenta examination notes">
              <textarea value={placentaExaminationNotes} onChange={e => setPlacentaExaminationNotes(e.target.value)} rows={2} className={ta} placeholder="Cotyledons intact, weight, cord insertion, infarcts, calcification..." />
            </FL>
            <Gate label="Cord blood collected?" value={cordBloodCollected} onChange={setCordBloodCollected} />
          </Section>

          <Section title="Postpartum Haemorrhage (PPH)" value={secPPH} onChange={setSecPPH} accent="red">
            <FL label="PPH amount" sub="mL">
              <input type="number" value={pphAmount} onChange={e => setPphAmount(e.target.value)} className={inp} />
            </FL>
            <FL label="Probable cause(s) — 4T's">
              <Pills options={[
                'Tone — uterine atony',
                'Tissue — retained placenta',
                'Trauma — laceration / uterine rupture',
                'Thrombin — coagulopathy (DIC, HELLP)',
              ]} value={pphCauses} onChange={setPphCauses} multi accent="red" />
            </FL>
            <FL label="PPH treatment used">
              <Pills options={[
                'IV Oxytocin infusion (20–40 IU/500ml)',
                'IM / IV Ergometrine',
                'Misoprostol 800–1000 mcg PR/SL',
                'Carbetocin 100 mcg IM',
                'Tranexamic acid 1g IV',
                'Uterine massage / compression',
                'Bimanual compression',
                'Intrauterine balloon (Bakri / Foley)',
                'Brace (B-Lynch) suture',
                'Internal iliac artery ligation',
                'Hysterectomy',
                'IR (uterine artery embolisation)',
              ]} value={pphTreatment} onChange={setPphTreatment} multi accent="red" />
            </FL>
            <Gate label="Blood transfusion required?" value={bloodTransfusion} onChange={setBloodTransfusion}>
              <FL label="Units transfused">
                <input type="number" value={unitsTransfused} onChange={e => setUnitsTransfused(e.target.value)} placeholder="Units of PRBC" className={inp} />
              </FL>
            </Gate>
          </Section>
        </div>
      )

      // ══════════════════════════════════════════════════════════════════════
      case 5: return (
        <div className="space-y-5">
          {urgentAlerts.length > 0 && (
            <div className="p-4 bg-red-50 border-2 border-red-500 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-red-600 animate-pulse" />
                <span className="text-sm font-bold text-red-700">URGENT EVENTS DOCUMENTED</span>
              </div>
              {urgentAlerts.map(a => <p key={a} className="text-xs text-red-700 font-semibold">• {a}</p>)}
            </div>
          )}

          <Section title="Maternal Complications" value={secMatComp} onChange={setSecMatComp} accent="red">
            <Gate label="Shoulder dystocia?" value={shoulderDystocia} onChange={setShoulderDystocia} accent="red">
              <FL label="Manoeuvres used">
                <Pills options={[
                  'McRoberts manoeuvre',
                  'Suprapubic pressure',
                  'Rubin II / Wood screw',
                  'Delivery of posterior arm',
                  'Gaskin (all-fours)',
                  'Zavanelli (cephalic replacement)',
                  'Cleidotomy',
                ]} value={sdManoeuvres} onChange={setSdManoeuvres} multi accent="red" />
              </FL>
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                Debrief parents. Document exact time of head-to-body delivery. Check neonate for brachial plexus injury, clavicle fracture.
              </p>
            </Gate>

            <Gate label="Uterine rupture (suspected / confirmed)?" value={uterineRupture} onChange={setUterineRupture} accent="red">
              <FL label="Details">
                <textarea value={ruptureDetails} onChange={e => setRuptureDetails(e.target.value)} rows={2} className={ta} placeholder="Scar rupture vs. de novo, extent, surgical findings..." />
              </FL>
              <div className="p-2 bg-red-50 border-2 border-red-500 rounded text-xs text-red-700 font-bold">
                Uterine rupture — emergency laparotomy. Blood bank 4 units, senior surgeon, ICU alert.
              </div>
            </Gate>

            <Gate label="Cord prolapse?" value={cordProlapse} onChange={setCordProlapse} accent="red">
              <div className="p-2 bg-red-50 border-2 border-red-500 rounded text-xs text-red-700 font-bold">
                Cord prolapse — immediate: knee-chest position, relieve presenting part pressure, Category 1 CS if not imminent delivery. Call anaesthesia now.
              </div>
            </Gate>

            <Gate label="Placental abruption?" value={abruption} onChange={setAbruption} />

            <Gate label="Eclampsia intrapartum?" value={eclampsia} onChange={setEclampsia} accent="red">
              <Gate label="MgSO₄ administered?" value={mgso4Labour} onChange={setMgso4Labour} accent="green">
                <p className="text-xs text-green-700">4g IV loading dose over 20 min, then 1g/hr maintenance. Continue 24h post-delivery.</p>
              </Gate>
            </Gate>

            <Gate label="Fetal distress requiring emergency intervention?" value={fetalDistress} onChange={setFetalDistress} accent="red" />

            <Gate label="Meconium-stained liquor?" value={meconium} onChange={setMeconium}>
              <FL label="Grade of meconium">
                <Pills options={['Grade 1 (thin, watery)', 'Grade 2 (moderate)', 'Grade 3 (thick, pea-soup)']} value={meconiumGrade} onChange={setMeconiumGrade} accent={meconiumGrade === 'Grade 3 (thick, pea-soup)' ? 'red' : 'amber'} />
              </FL>
              {meconiumGrade === 'Grade 3 (thick, pea-soup)' && (
                <div className="p-2 bg-red-50 border border-red-300 rounded text-xs text-red-700 font-semibold">
                  Grade 3 meconium — paediatric team standby at delivery. DeLee suction at perineum (WHO no longer recommends routine suctioning — follow current NRP guidelines).
                </div>
              )}
              <Gate label="Amnioinfusion performed?" value={amnioinfusion} onChange={setAmnioinfusion} />
            </Gate>

            <Gate label="Chorioamnionitis / intrapartum fever?" value={chorioamnionitis} onChange={setChorioamnionitis}>
              <FL label="Details">
                <input value={chorioDetails} onChange={e => setChorioDetails(e.target.value)} placeholder="Temp, WBC, CRP, smell of liquor..." className={inp} />
              </FL>
              <FL label="Maternal temp" sub="°C">
                <input type="number" value={maternalFever} onChange={e => setMaternalFever(e.target.value)} step="0.1" className={inp} />
              </FL>
              <Gate label="Broad-spectrum antibiotics given?" value={antibioticsGiven} onChange={setAntibioticsGiven}>
                <FL label="Antibiotic details">
                  <input value={antibioticDetails} onChange={e => setAntibioticDetails(e.target.value)} placeholder="e.g. IV Ampicillin 2g q6h + Gentamicin 1.5mg/kg q8h" className={inp} />
                </FL>
              </Gate>
            </Gate>

            <Gate label="Emergency intrapartum CS performed?" value={intrapartumCS} onChange={setIntrapartumCS} accent="orange">
              <FL label="CS indication(s)">
                <Pills options={[
                  'Fetal distress — Category 1',
                  'Failed progress / CPD',
                  'Failed instrumental',
                  'Cord prolapse',
                  'Uterine rupture',
                  'Placental abruption',
                  'Eclampsia',
                  'Maternal request',
                ]} value={csIndication} onChange={setCsIndication} multi accent="orange" />
              </FL>
            </Gate>
          </Section>
        </div>
      )

      // ══════════════════════════════════════════════════════════════════════
      case 6: return (
        <div className="space-y-5">
          {neonatalConcern.length > 0 && (
            <div className="p-3 bg-orange-50 border border-orange-400 rounded-xl">
              <p className="text-xs font-bold text-orange-700 mb-1">Neonatal concerns:</p>
              {neonatalConcern.map(c => <p key={c} className="text-xs text-orange-600">• {c}</p>)}
            </div>
          )}

          <Section title="Delivery & Baby" value={secBaby} onChange={setSecBaby} accent="green">
            <div className="grid grid-cols-2 gap-4">
              <FL label="Time of delivery">
                <input type="time" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} className={inp} />
              </FL>
              <FL label="Mode of delivery">
                <Pills options={['Normal vaginal delivery (NVD)', 'Ventouse delivery', 'Forceps delivery', 'Emergency LSCS', 'Elective LSCS', 'Breech vaginal', 'Stillbirth']} value={deliveryMode} onChange={setDeliveryMode} accent="green" />
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FL label="Sex of baby">
                <Pills options={['Male', 'Female', 'Ambiguous']} value={sex} onChange={setSex} accent="green" />
              </FL>
              <FL label="Birth weight" sub="grams">
                <input type="number" value={birthWeight} onChange={e => setBirthWeight(e.target.value)} className={inp} />
              </FL>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FL label="APGAR 1 min" sub="/10">
                <input type="number" value={apgar1} onChange={e => setApgar1(e.target.value)} max={10} className={inp} />
                {Number(apgar1) <= 3 && apgar1 && <span className="text-xs text-red-700 font-bold mt-0.5 block">Severe depression</span>}
                {Number(apgar1) > 3 && Number(apgar1) <= 6 && <span className="text-xs text-orange-700 mt-0.5 block">Moderate depression</span>}
              </FL>
              <FL label="APGAR 5 min" sub="/10">
                <input type="number" value={apgar5} onChange={e => setApgar5(e.target.value)} max={10} className={inp} />
                {Number(apgar5) <= 6 && apgar5 && <span className="text-xs text-red-700 font-semibold mt-0.5 block">Resus / NICU likely needed</span>}
              </FL>
              <FL label="APGAR 10 min" sub="/10 (if applicable)">
                <input type="number" value={apgar10} onChange={e => setApgar10(e.target.value)} max={10} className={inp} />
              </FL>
            </div>
            <Gate label="Neonatal resuscitation required?" value={neonatalResus} onChange={setNeonatalResus} accent="orange">
              <FL label="Resuscitation details">
                <textarea value={resusDetails} onChange={e => setResusDetails(e.target.value)} rows={2} className={ta} placeholder="Stimulation, IPPV, cardiac compressions, adrenaline, intubation..." />
              </FL>
            </Gate>
            <Gate label="NICU / SCBU admission?" value={nicu} onChange={setNicu} accent="orange">
              <FL label="Reason for NICU">
                <input value={nicuReason} onChange={e => setNicuReason(e.target.value)} placeholder="e.g. prematurity, birth asphyxia, meconium aspiration, LBW" className={inp} />
              </FL>
            </Gate>
            <div className="grid grid-cols-2 gap-4">
              <Gate label="Skin-to-skin contact?" value={skinToSkin} onChange={setSkinToSkin} />
              <Gate label="Breastfeeding initiated within 1h?" value={breastfeedingInitiated} onChange={setBreastfeedingInitiated} />
            </div>
            <FL label="Routine newborn care given">
              <Pills options={['Vitamin K 1mg IM', 'Eye prophylaxis (Tetracycline)', 'Cord care (clean/dry)', 'BCG + Hep B at birth', 'Pulse oximetry screening']} value={[vitK, eyeProphylaxis, cordCare].filter(Boolean)} onChange={() => {}} multi accent="green" />
            </FL>
            <div className="grid grid-cols-2 gap-4">
              <Gate label="Vitamin K 1mg IM given?" value={vitK} onChange={setVitK} />
              <Gate label="Eye prophylaxis given?" value={eyeProphylaxis} onChange={setEyeProphylaxis} />
            </div>
            <Gate label="Birth certificate initiated?" value={birthCertificate} onChange={setBirthCertificate} />
          </Section>

          <Section title="Maternal Immediate Recovery" value={secMaternalRecovery} onChange={setSecMaternalRecovery} accent="indigo">
            <div className="grid grid-cols-2 gap-4">
              <FL label="Post-delivery BP" sub="mmHg">
                <input value={maternalBP} onChange={e => setMaternalBP(e.target.value)} placeholder="e.g. 126/82" className={inp} />
              </FL>
              <FL label="Uterus (tone / height)">
                <input value={maternalUterus} onChange={e => setMaternalUterus(e.target.value)} placeholder="e.g. well-contracted, at umbilicus" className={inp} />
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FL label="Lochia">
                <Pills options={['Minimal', 'Normal', 'Heavy', 'Abnormal clots']} value={maternalLochia} onChange={setMaternalLochia} accent={maternalLochia === 'Heavy' || maternalLochia === 'Abnormal clots' ? 'red' : 'indigo'} />
              </FL>
              <FL label="Urinary catheter">
                <Pills options={['In situ', 'Removed', 'Not inserted']} value={maternalCatheter} onChange={setMaternalCatheter} accent="indigo" />
              </FL>
            </div>
            <FL label="IV access / fluids">
              <input value={maternalIV} onChange={e => setMaternalIV(e.target.value)} placeholder="e.g. 18G cannula, Oxytocin 20IU in 500ml NS at 125ml/hr" className={inp} />
            </FL>
            <FL label="Analgesia post-delivery">
              <input value={maternalAnalgesia} onChange={e => setMaternalAnalgesia(e.target.value)} placeholder="e.g. Paracetamol 1g QDS + Ibuprofen 400mg TDS + Tramadol PRN" className={inp} />
            </FL>
          </Section>

          <div>
            <FL label="Delivery Summary Notes">
              <textarea value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)} rows={4} className={ta} placeholder="Summary of labour events, complications, plan for postnatal care, follow-up..." />
            </FL>
          </div>
        </div>
      )

      default: return null
    }
  }

  const headerBadge = useMemo(() => {
    if (urgentAlerts.length > 0) return { label: 'URGENT', color: 'bg-red-600 text-white animate-pulse' }
    if (intrapartumCS === 'Yes') return { label: 'EMERGENCY CS', color: 'bg-orange-600 text-white' }
    if (pphDefined === 'Yes' || Number(bloodLoss) >= 500) return { label: 'PPH', color: 'bg-red-500 text-white' }
    if (labourType === 'Induced') return { label: 'INDUCED', color: 'bg-purple-500 text-white' }
    return null
  }, [urgentAlerts, intrapartumCS, pphDefined, bloodLoss, labourType])

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-violet-700 px-6 py-5 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Zap size={22} />
            </div>
            <div>
              <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">OBG Assessment</p>
              <h1 className="text-xl font-bold">Labour Assessment</h1>
              <p className="text-indigo-200 text-xs mt-0.5">Intrapartum Monitoring & Delivery Record</p>
            </div>
          </div>
          <div className="text-right space-y-1">
            {headerBadge && (
              <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-lg ${headerBadge.color}`}>
                {headerBadge.label}
              </span>
            )}
            {ga && <p className="text-indigo-200 text-xs">{ga} weeks</p>}
          </div>
        </div>
        <div className="mt-4 flex gap-1">
          {STAGES.map((s, i) => (
            <button key={s} type="button" onClick={() => setStage(i)}
              className={`flex-1 h-1.5 rounded-full transition-all ${i === stage ? 'bg-white' : i < stage ? 'bg-indigo-300' : 'bg-white/20'}`} />
          ))}
        </div>
        <p className="text-indigo-200 text-xs mt-1.5">{stage + 1} / {STAGES.length} — {STAGES[stage]}</p>
      </div>

      {/* Stage tabs */}
      <div className="flex border-b border-gray-100 overflow-x-auto bg-gray-50/60">
        {STAGES.map((s, i) => (
          <button key={s} type="button" onClick={() => setStage(i)}
            className={`px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
              i === stage ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}>
            {s}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="p-5">{renderStage()}</div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 pb-5">
        <button type="button" onClick={() => setStage(s => Math.max(0, s - 1))} disabled={stage === 0}
          className={`${navBtn} text-gray-600 hover:bg-gray-100 disabled:opacity-30`}>
          <ChevronLeft size={16} /> Back
        </button>
        {stage < STAGES.length - 1 ? (
          <button type="button" onClick={() => setStage(s => s + 1)}
            className={`${navBtn} bg-indigo-600 text-white hover:bg-indigo-700`}>
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button type="button" onClick={handleSave} disabled={saving}
            className={`${navBtn} bg-indigo-700 text-white hover:bg-indigo-800 disabled:opacity-60`}>
            {saving ? 'Saving…' : 'Save Assessment'}
          </button>
        )}
      </div>
    </div>
  )
}
