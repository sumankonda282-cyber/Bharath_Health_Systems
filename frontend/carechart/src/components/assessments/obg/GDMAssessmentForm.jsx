/**
 * @shared-pool
 * @category obg
 * @tags GDM, gestational-diabetes, glucose, insulin, pregnancy, diabetes
 * Portal-agnostic. Safe to surface in any portal's assessment search.
 */

import React, { useState, useMemo } from 'react'
import { Activity, ChevronRight, ChevronLeft, Lock, AlertTriangle } from 'lucide-react'
import api from '../../../api/client'

// ── Section gate ──────────────────────────────────────────────────────────────
function Section({ title, value, onChange, children, accent = 'emerald' }) {
  const A = {
    emerald: { border: 'border-emerald-200', bg: 'bg-emerald-50/40', div: 'border-emerald-100', btn: 'bg-emerald-600 text-white border-emerald-600' },
    orange:  { border: 'border-orange-200',  bg: 'bg-orange-50/40',  div: 'border-orange-100',  btn: 'bg-orange-500 text-white border-orange-500' },
    red:     { border: 'border-red-200',     bg: 'bg-red-50/40',     div: 'border-red-100',     btn: 'bg-red-500 text-white border-red-500' },
    blue:    { border: 'border-blue-200',    bg: 'bg-blue-50/40',    div: 'border-blue-100',    btn: 'bg-blue-500 text-white border-blue-500' },
    purple:  { border: 'border-purple-200',  bg: 'bg-purple-50/40',  div: 'border-purple-100',  btn: 'bg-purple-500 text-white border-purple-500' },
    amber:   { border: 'border-amber-200',   bg: 'bg-amber-50/40',   div: 'border-amber-100',   btn: 'bg-amber-500 text-white border-amber-500' },
    teal:    { border: 'border-teal-200',    bg: 'bg-teal-50/40',    div: 'border-teal-100',    btn: 'bg-teal-500 text-white border-teal-500' },
  }
  const a = A[accent] || A.emerald
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

function Gate({ label, value, onChange, children, accent = 'emerald' }) {
  const onColor = accent === 'red' ? 'bg-red-500 text-white border-red-500' : 'bg-emerald-600 text-white border-emerald-600'
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{label}</span>
        <div className="flex gap-1">
          {['Yes', 'No'].map(opt => (
            <button key={opt} type="button" onClick={() => onChange(v => v === opt ? '' : opt)}
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all ${
                value === opt
                  ? opt === 'Yes' ? onColor : 'bg-gray-400 text-white border-gray-400'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      {value === 'Yes' && <div className="pl-4 border-l-2 border-emerald-200 space-y-3">{children}</div>}
    </div>
  )
}

function Pills({ options, value, onChange, multi = false, accent = 'emerald' }) {
  const colors = {
    emerald: { on: 'bg-emerald-600 text-white border-emerald-600', off: 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300' },
    orange:  { on: 'bg-orange-500 text-white border-orange-500',   off: 'bg-white text-gray-600 border-gray-200 hover:border-orange-300' },
    red:     { on: 'bg-red-500 text-white border-red-500',         off: 'bg-white text-gray-600 border-gray-200 hover:border-red-300' },
    blue:    { on: 'bg-blue-500 text-white border-blue-500',       off: 'bg-white text-gray-600 border-gray-200 hover:border-blue-300' },
    amber:   { on: 'bg-amber-500 text-white border-amber-500',     off: 'bg-white text-gray-600 border-gray-200 hover:border-amber-300' },
    purple:  { on: 'bg-purple-500 text-white border-purple-500',   off: 'bg-white text-gray-600 border-gray-200 hover:border-purple-300' },
  }
  const c = colors[accent] || colors.emerald
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

const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300'
const ta  = `${inp} resize-none`

const STAGES = [
  'Risk Factors',
  'Screening',
  'Monitoring',
  'Complications',
  'Management',
  'Postpartum',
]

export default function GDMAssessmentForm({ patientId, encounterId, onSaved }) {
  const [stage, setStage] = useState(0)
  const [saving, setSaving] = useState(false)

  // ── Stage 1: Risk Factors ──────────────────────────────────────────────────
  const [visitDate, setVisitDate]           = useState('')
  const [ga, setGa]                         = useState('')
  const [parity, setParity]                 = useState('')
  const [bmi, setBmi]                       = useState('')
  const [ageYrs, setAgeYrs]                 = useState('')

  const [secFamily, setSecFamily]           = useState('')
  const [familyDM, setFamilyDM]             = useState([])
  const [familyDMDegree, setFamilyDMDegree] = useState('')

  const [secObsHx, setSecObsHx]             = useState('')
  const [prevGDM, setPrevGDM]               = useState('')
  const [prevMacrosomia, setPrevMacrosomia] = useState('')
  const [prevMacrosomiaWeight, setPrevMacrosomiaWeight] = useState('')
  const [prevStillbirth, setPrevStillbirth] = useState('')
  const [prevCongenitalAnomaly, setPrevCongenitalAnomaly] = useState('')
  const [prevPOH, setPrevPOH]               = useState('')

  const [secLifestyle, setSecLifestyle]     = useState('')
  const [physicalActivity, setPhysicalActivity] = useState('')
  const [dietType, setDietType]             = useState('')
  const [fastingPractice, setFastingPractice] = useState('')
  const [fastingDetails, setFastingDetails] = useState('')
  const [sweetIntake, setSweetIntake]       = useState('')

  const [secOtherRisk, setSecOtherRisk]     = useState('')
  const [pcos, setPcos]                     = useState('')
  const [prevImpGlucose, setPrevImpGlucose] = useState('')
  const [glucocorticoids, setGlucocorticoids] = useState('')
  const [glucocorticoidDetails, setGlucocorticoidDetails] = useState('')
  const [multiplePregnancy, setMultiplePregnancy] = useState('')
  const [ethnicity, setEthnicity]           = useState('')

  // ── Stage 2: Screening ─────────────────────────────────────────────────────
  const [secScreening, setSecScreening]     = useState('')
  const [screeningMethod, setScreeningMethod] = useState('')
  const [screeningGA, setScreeningGA]       = useState('')
  const [earlyFPG, setEarlyFPG]             = useState('')
  const [earlyHbA1c, setEarlyHbA1c]         = useState('')
  const [ogttDone, setOgttDone]             = useState('')
  const [ogttGA, setOgttGA]                 = useState('')
  const [ogttFasting, setOgttFasting]       = useState('')
  const [ogtt1h, setOgtt1h]                 = useState('')
  const [ogtt2h, setOgtt2h]                 = useState('')
  const [ogttResult, setOgttResult]         = useState('')

  // WHO 2013 / IADPSG thresholds
  const gdmDiagnosis = useMemo(() => {
    const f = Number(ogttFasting), h1 = Number(ogtt1h), h2 = Number(ogtt2h)
    if (!f && !h1 && !h2) return null
    const criteria = []
    if (f >= 5.1) criteria.push(`Fasting ≥5.1 mmol/L (${f})`)
    if (h1 >= 10.0) criteria.push(`1-hour ≥10.0 mmol/L (${h1})`)
    if (h2 >= 8.5) criteria.push(`2-hour ≥8.5 mmol/L (${h2})`)
    const overt = f >= 7.0 || h2 >= 11.1
    return { criteria, gdm: criteria.length >= 1, overt }
  }, [ogttFasting, ogtt1h, ogtt2h])

  const earlyDM = useMemo(() => {
    const fpg = Number(earlyFPG), a1c = Number(earlyHbA1c)
    if (fpg >= 7.0) return 'Overt DM — FPG ≥7.0 mmol/L'
    if (a1c >= 6.5) return `Overt DM — HbA1c ≥6.5% (${a1c}%)`
    if (fpg >= 5.1) return `GDM — FPG ≥5.1 mmol/L (${fpg})`
    return null
  }, [earlyFPG, earlyHbA1c])

  // ── Stage 3: Monitoring ────────────────────────────────────────────────────
  const [secSMBG, setSecSMBG]               = useState('')
  const [smbgDevice, setSmbgDevice]         = useState('')
  const [smbgFrequency, setSmbgFrequency]   = useState('')
  const [fastingGlucose, setFastingGlucose] = useState('')
  const [pp1hBreakfast, setPp1hBreakfast]   = useState('')
  const [pp1hLunch, setPp1hLunch]           = useState('')
  const [pp1hDinner, setPp1hDinner]         = useState('')
  const [pp2hBreakfast, setPp2hBreakfast]   = useState('')
  const [pp2hLunch, setPp2hLunch]           = useState('')
  const [pp2hDinner, setPp2hDinner]         = useState('')
  const [bedtimeGlucose, setBedtimeGlucose] = useState('')
  const [hbA1cCurrent, setHbA1cCurrent]     = useState('')
  const [hbA1cDate, setHbA1cDate]           = useState('')
  const [glycaemicControl, setGlyaemicControl] = useState('')

  const glucoseTargets = useMemo(() => {
    const issues = []
    if (Number(fastingGlucose) >= 5.3) issues.push(`Fasting ${fastingGlucose} mmol/L — target <5.3`)
    if (Number(pp1hBreakfast) >= 7.8 || Number(pp1hLunch) >= 7.8 || Number(pp1hDinner) >= 7.8)
      issues.push('1-hour post-meal ≥7.8 mmol/L — target <7.8')
    if (Number(pp2hBreakfast) >= 6.7 || Number(pp2hLunch) >= 6.7 || Number(pp2hDinner) >= 6.7)
      issues.push('2-hour post-meal ≥6.7 mmol/L — target <6.7')
    if (Number(hbA1cCurrent) >= 6.5) issues.push(`HbA1c ${hbA1cCurrent}% — target <6.0%`)
    return issues
  }, [fastingGlucose, pp1hBreakfast, pp1hLunch, pp1hDinner, pp2hBreakfast, pp2hLunch, pp2hDinner, hbA1cCurrent])

  const [secFetalMonitor, setSecFetalMonitor] = useState('')
  const [fetalGrowthScan, setFetalGrowthScan] = useState('')
  const [growthScanGA, setGrowthScanGA]       = useState('')
  const [efwPercentile, setEfwPercentile]     = useState('')
  const [macrosomiaSuspected, setMacrosomiaSuspected] = useState('')
  const [afIndex, setAfIndex]                 = useState('')
  const [polyhydramnios, setPolyhydramnios]   = useState('')

  // ── Stage 4: Complications ─────────────────────────────────────────────────
  const [secMatComp, setSecMatComp]         = useState('')
  const [preeclampsia, setPreeclampsia]     = useState('')
  const [uti, setUti]                       = useState('')
  const [candidiaisis, setCandidiasis]      = useState('')
  const [retinopathy, setRetinopathy]       = useState('')
  const [neuropathy, setNeuropathy]         = useState('')
  const [nephropathy, setNephropathy]       = useState('')
  const [ketoacidosis, setKetoacidosis]     = useState('')
  const [hypoglycaemia, setHypoglycaemia]   = useState('')
  const [hypoDetails, setHypoDetails]       = useState('')
  const [hypoSevere, setHypoSevere]         = useState('')
  const [thyroidCoexist, setThyroidCoexist] = useState('')
  const [thyroidDetails, setThyroidDetails] = useState('')

  const [secFetalComp, setSecFetalComp]     = useState('')
  const [macrosomia, setMacrosomia]         = useState('')
  const [lga, setLga]                       = useState('')
  const [stillbirthRisk, setStillbirthRisk] = useState('')
  const [congenitalAnom, setCongenitalAnom] = useState('')
  const [anomDetails, setAnomdDetails]      = useState('')
  const [shdRisk, setShdRisk]               = useState('')
  const [neonatalHypo, setNeonatalHypo]     = useState('')

  // ── Stage 5: Management ────────────────────────────────────────────────────
  const [secMNT, setSecMNT]                 = useState('')
  const [dietCounsellingDone, setDietCounsellingDone] = useState('')
  const [dietPlan, setDietPlan]             = useState('')
  const [carbDistribution, setCarbDistribution] = useState('')
  const [snacks, setSnacks]                 = useState('')
  const [caloricTarget, setCaloricTarget]   = useState('')
  const [dietitianRef, setDietitianRef]     = useState('')
  const [exercisePlan, setExercisePlan]     = useState('')
  const [exerciseDetails, setExerciseDetails] = useState('')

  const [secInsulin, setSecInsulin]         = useState('')
  const [insulinIndication, setInsulinIndication] = useState([])
  const [insulinRegime, setInsulinRegime]   = useState('')
  const [basalInsulin, setBasalInsulin]     = useState('')
  const [basalDose, setBasalDose]           = useState('')
  const [basalTime, setBasalTime]           = useState('')
  const [bolusInsulin, setBolusInsulin]     = useState('')
  const [bolusDose, setBolusDose]           = useState('')
  const [insulinAdjustProtocol, setInsulinAdjustProtocol] = useState('')
  const [selfAdjust, setSelfAdjust]         = useState('')

  const [secOralAgents, setSecOralAgents]   = useState('')
  const [oralAgent, setOralAgent]           = useState('')
  const [metforminDose, setMetforminDose]   = useState('')
  const [metforminSideEffects, setMetforminSideEffects] = useState('')

  const [secDelivery, setSecDelivery]       = useState('')
  const [deliveryPlan, setDeliveryPlan]     = useState('')
  const [deliveryTiming, setDeliveryTiming] = useState('')
  const [deliveryMode, setDeliveryMode]     = useState('')
  const [intrapartumGlucoseMonitor, setIntrapartumGlucoseMonitor] = useState('')
  const [neonatalGlucoseMonitor, setNeonatalGlucoseMonitor] = useState('')
  const [paediatricAlert, setPaediatricAlert] = useState('')

  // ── Stage 6: Postpartum ────────────────────────────────────────────────────
  const [secPP, setSecPP]                   = useState('')
  const [insulinPostDelivery, setInsulinPostDelivery] = useState('')
  const [ogttPostpartum, setOgttPostpartum] = useState('')
  const [ogttPPGA, setOgttPPGA]             = useState('')
  const [ogttPPResult, setOgttPPResult]     = useState('')
  const [breastfeeding, setBreastfeeding]   = useState('')
  const [contraception, setContraception]   = useState('')
  const [lifestyleModification, setLifestyleModification] = useState('')
  const [counsellingGiven, setCounsellingGiven] = useState([])
  const [annualDMScreen, setAnnualDMScreen] = useState('')
  const [familyReferral, setFamilyReferral] = useState('')

  const [planNotes, setPlanNotes]           = useState('')

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    try {
      await api.post('/assessments', {
        patientId, encounterId,
        formType: 'gdm_assessment',
        data: {
          visitDate, ga, parity, bmi, ageYrs,
          riskFactors: { familyDM, familyDMDegree, prevGDM, prevMacrosomia, prevStillbirth, prevCongenitalAnomaly, pcos, prevImpGlucose, glucocorticoids, multiplePregnancy, ethnicity, physicalActivity, dietType, fastingPractice, sweetIntake },
          screening: { method: screeningMethod, ga: screeningGA, earlyFPG, earlyHbA1c, ogttDone, ogttGA, ogttFasting, ogtt1h, ogtt2h, ogttResult, gdmDiagnosis },
          monitoring: { device: smbgDevice, frequency: smbgFrequency, readings: { fastingGlucose, pp1hBreakfast, pp1hLunch, pp1hDinner, pp2hBreakfast, pp2hLunch, pp2hDinner, bedtimeGlucose }, hbA1cCurrent, hbA1cDate, glycaemicControl, glucoseTargets },
          fetalMonitor: { growthScan: fetalGrowthScan, growthScanGA, efwPercentile, macrosomiaSuspected, afIndex, polyhydramnios },
          complications: { maternal: { preeclampsia, uti, candidiaisis, retinopathy, neuropathy, nephropathy, ketoacidosis, hypoglycaemia, hypoSevere, thyroidCoexist }, fetal: { macrosomia, lga, stillbirthRisk, congenitalAnom, shdRisk, neonatalHypo } },
          management: { mnt: { done: dietCounsellingDone, plan: dietPlan, carbDistribution, snacks, caloricTarget, dietitianRef, exercisePlan, exerciseDetails }, insulin: { indications: insulinIndication, regime: insulinRegime, basal: basalInsulin, basalDose, basalTime, bolus: bolusInsulin, bolusDose, adjustProtocol: insulinAdjustProtocol, selfAdjust }, oralAgent: { agent: oralAgent, metforminDose }, delivery: { plan: deliveryPlan, timing: deliveryTiming, mode: deliveryMode, intrapartumMonitor: intrapartumGlucoseMonitor, neonatalMonitor: neonatalGlucoseMonitor, paediatricAlert } },
          postpartum: { insulinStop: insulinPostDelivery, ogtt: { done: ogttPostpartum, ga: ogttPPGA, result: ogttPPResult }, breastfeeding, contraception, lifestyleModification, counsellingGiven, annualDMScreen, familyReferral },
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

  // Risk score for header badge
  const riskFactorCount = useMemo(() => {
    let n = 0
    if (secFamily === 'Yes') n++
    if (secObsHx === 'Yes') n++
    if (Number(bmi) >= 30) n++
    if (Number(ageYrs) >= 35) n++
    if (pcos === 'Yes') n++
    if (prevImpGlucose === 'Yes') n++
    if (multiplePregnancy === 'Yes') n++
    return n
  }, [secFamily, secObsHx, bmi, ageYrs, pcos, prevImpGlucose, multiplePregnancy])

  function renderStage() {
    switch (stage) {
      // ══════════════════════════════════════════════════════════════════════
      case 0: return (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <FL label="Visit Date">
              <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} className={inp} />
            </FL>
            <FL label="Gestational Age" sub="weeks">
              <input type="number" value={ga} onChange={e => setGa(e.target.value)} placeholder="e.g. 26" className={inp} />
            </FL>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FL label="Parity">
              <input value={parity} onChange={e => setParity(e.target.value)} placeholder="G_P_L_A" className={inp} />
            </FL>
            <FL label="BMI" sub="kg/m²">
              <input type="number" value={bmi} onChange={e => setBmi(e.target.value)} className={inp} />
              {Number(bmi) >= 30 && <span className="text-xs text-orange-700 mt-0.5 block font-semibold">Obesity — GDM risk factor</span>}
            </FL>
            <FL label="Age" sub="years">
              <input type="number" value={ageYrs} onChange={e => setAgeYrs(e.target.value)} className={inp} />
              {Number(ageYrs) >= 35 && <span className="text-xs text-amber-700 mt-0.5 block font-semibold">Advanced maternal age — GDM risk factor</span>}
            </FL>
          </div>

          <Section title="Family History of Diabetes" value={secFamily} onChange={setSecFamily} accent="orange">
            <FL label="DM in family member(s)">
              <Pills options={['Type 2 DM', 'Type 1 DM', 'Gestational DM', 'Unknown type']} value={familyDM} onChange={setFamilyDM} multi accent="orange" />
            </FL>
            <FL label="Degree of relation">
              <Pills options={['First degree (parent / sibling)', 'Second degree', 'Both parents']} value={familyDMDegree} onChange={setFamilyDMDegree} accent="orange" />
            </FL>
          </Section>

          <Section title="Obstetric History Risk Factors" value={secObsHx} onChange={setSecObsHx} accent="amber">
            <Gate label="Previous GDM in prior pregnancy?" value={prevGDM} onChange={setPrevGDM}>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                Previous GDM: recurrence risk up to 50–70%. Screen early (first trimester FPG/HbA1c) and at 24–28 weeks.
              </p>
            </Gate>
            <Gate label="Previous macrosomic baby (&gt;4 kg)?" value={prevMacrosomia} onChange={setPrevMacrosomia}>
              <FL label="Birth weight" sub="kg">
                <input type="number" value={prevMacrosomiaWeight} onChange={e => setPrevMacrosomiaWeight(e.target.value)} placeholder="e.g. 4.5" className={inp} />
              </FL>
            </Gate>
            <Gate label="Previous unexplained stillbirth?" value={prevStillbirth} onChange={setPrevStillbirth} />
            <Gate label="Previous baby with congenital anomaly?" value={prevCongenitalAnomaly} onChange={setPrevCongenitalAnomaly} />
            <Gate label="Previous polyhydramnios?" value={prevPOH} onChange={setPrevPOH} />
          </Section>

          <Section title="Lifestyle & Dietary Risk Factors" value={secLifestyle} onChange={setSecLifestyle} accent="emerald">
            <FL label="Physical activity level">
              <Pills options={['Sedentary', 'Light (walking)', 'Moderate', 'Active']} value={physicalActivity} onChange={setPhysicalActivity} accent="emerald" />
            </FL>
            <FL label="Dietary pattern">
              <Pills options={['Vegetarian', 'Eggetarian', 'Non-vegetarian', 'Vegan', 'Mixed']} value={dietType} onChange={setDietType} accent="emerald" />
            </FL>
            <FL label="High refined carb / sweet intake">
              <Pills options={['Daily', 'Frequent', 'Occasional', 'Rare']} value={sweetIntake} onChange={setSweetIntake} accent="emerald" />
            </FL>
            <Gate label="Fasting practice (religious / cultural)?" value={fastingPractice} onChange={setFastingPractice}>
              <FL label="Fasting details">
                <input value={fastingDetails} onChange={e => setFastingDetails(e.target.value)} placeholder="Navratri, Ekadashi, Ramadan, frequency..." className={inp} />
              </FL>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                Prolonged fasting in GDM patients risks hypoglycaemia (if on insulin) or ketosis. Meal plan adjustment required.
              </p>
            </Gate>
          </Section>

          <Section title="Other Medical Risk Factors" value={secOtherRisk} onChange={setSecOtherRisk} accent="purple">
            <Gate label="PCOS (Polycystic Ovarian Syndrome)?" value={pcos} onChange={setPcos} />
            <Gate label="Pre-diabetes / Impaired Glucose Tolerance (pre-pregnancy)?" value={prevImpGlucose} onChange={setPrevImpGlucose} />
            <Gate label="Corticosteroid use in this pregnancy?" value={glucocorticoids} onChange={setGlucocorticoids}>
              <FL label="Indication / drug">
                <input value={glucocorticoidDetails} onChange={e => setGlucocorticoidDetails(e.target.value)} placeholder="e.g. Betamethasone for lung maturity — transient glucose rise expected" className={inp} />
              </FL>
              <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded p-2">
                Antenatal corticosteroids cause transient glucose elevation for 48–72h. Increase SMBG frequency; insulin dose may need temporary adjustment.
              </p>
            </Gate>
            <Gate label="Multiple pregnancy (twins / triplets)?" value={multiplePregnancy} onChange={setMultiplePregnancy} />
            <FL label="Ethnicity / background">
              <Pills options={['South Asian (Indian subcontinent)', 'East Asian', 'Middle Eastern', 'African', 'European', 'Mixed']} value={ethnicity} onChange={setEthnicity} accent="purple" />
            </FL>
            {(ethnicity === 'South Asian (Indian subcontinent)') && (
              <div className="p-2 bg-purple-50 border border-purple-200 rounded text-xs text-purple-700">
                South Asian populations have a 3–5× higher risk of GDM and T2DM at lower BMI thresholds. IADPSG criteria apply. Screen all South Asian women at booking.
              </div>
            )}
          </Section>
        </div>
      )

      // ══════════════════════════════════════════════════════════════════════
      case 1: return (
        <div className="space-y-5">
          <Section title="GDM Screening" value={secScreening} onChange={setSecScreening} accent="emerald">
            <FL label="Screening method used">
              <Pills options={[
                'Universal OGTT (IADPSG — India)',
                'Selective (risk-based)',
                'Random blood glucose (RBG)',
                'Glucose Challenge Test (GCT) then OGTT',
              ]} value={screeningMethod} onChange={setScreeningMethod} accent="emerald" />
            </FL>
            <FL label="GA at screening" sub="weeks">
              <input type="number" value={screeningGA} onChange={e => setScreeningGA(e.target.value)} placeholder="e.g. 26" className={inp} />
            </FL>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 space-y-1">
              <p className="font-semibold">IADPSG / WHO 2013 diagnostic thresholds (75g OGTT):</p>
              <p>Fasting ≥5.1 mmol/L (92 mg/dL)</p>
              <p>1-hour ≥10.0 mmol/L (180 mg/dL)</p>
              <p>2-hour ≥8.5 mmol/L (153 mg/dL)</p>
              <p>One or more values met = GDM. India: universal screening at 24–28 weeks recommended.</p>
            </div>

            {/* Early screening */}
            <div className="border-t border-emerald-100 pt-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">Early First-Trimester Screening (high-risk women)</p>
              <div className="grid grid-cols-2 gap-4">
                <FL label="Fasting plasma glucose" sub="mmol/L">
                  <input type="number" value={earlyFPG} onChange={e => setEarlyFPG(e.target.value)} step="0.1" className={inp} />
                  {earlyDM && <span className={`mt-1 block text-xs font-semibold px-2 py-0.5 rounded border ${earlyDM.includes('Overt') ? 'bg-red-50 border-red-300 text-red-700' : 'bg-orange-50 border-orange-300 text-orange-700'}`}>{earlyDM}</span>}
                </FL>
                <FL label="HbA1c" sub="%">
                  <input type="number" value={earlyHbA1c} onChange={e => setEarlyHbA1c(e.target.value)} step="0.1" className={inp} />
                  {Number(earlyHbA1c) >= 6.5 && <span className="text-xs text-red-700 font-semibold mt-0.5 block">Overt DM — HbA1c ≥6.5%</span>}
                </FL>
              </div>
            </div>

            {/* 75g OGTT */}
            <Gate label="75g OGTT performed?" value={ogttDone} onChange={setOgttDone}>
              <FL label="GA at OGTT" sub="weeks">
                <input type="number" value={ogttGA} onChange={e => setOgttGA(e.target.value)} placeholder="e.g. 26" className={inp} />
              </FL>
              <div className="grid grid-cols-3 gap-4">
                <FL label="Fasting" sub="mmol/L">
                  <input type="number" value={ogttFasting} onChange={e => setOgttFasting(e.target.value)} step="0.1" className={inp} />
                  {Number(ogttFasting) >= 5.1 && <span className="text-xs text-red-700 font-semibold mt-0.5 block">≥5.1 ✓ criterion</span>}
                </FL>
                <FL label="1-hour" sub="mmol/L">
                  <input type="number" value={ogtt1h} onChange={e => setOgtt1h(e.target.value)} step="0.1" className={inp} />
                  {Number(ogtt1h) >= 10.0 && <span className="text-xs text-red-700 font-semibold mt-0.5 block">≥10.0 ✓ criterion</span>}
                </FL>
                <FL label="2-hour" sub="mmol/L">
                  <input type="number" value={ogtt2h} onChange={e => setOgtt2h(e.target.value)} step="0.1" className={inp} />
                  {Number(ogtt2h) >= 8.5 && <span className="text-xs text-red-700 font-semibold mt-0.5 block">≥8.5 ✓ criterion</span>}
                  {Number(ogtt2h) >= 11.1 && <span className="text-xs text-red-700 font-bold mt-0.5 block">Overt DM — 2h ≥11.1!</span>}
                </FL>
              </div>

              {/* Auto diagnosis */}
              {gdmDiagnosis && (
                <div className={`p-3 rounded-xl border-2 ${gdmDiagnosis.overt ? 'bg-red-50 border-red-400' : gdmDiagnosis.gdm ? 'bg-orange-50 border-orange-400' : 'bg-green-50 border-green-300'}`}>
                  <p className={`text-sm font-bold ${gdmDiagnosis.overt ? 'text-red-700' : gdmDiagnosis.gdm ? 'text-orange-700' : 'text-green-700'}`}>
                    {gdmDiagnosis.overt ? '⚠ Overt Diabetes in Pregnancy (pre-existing DM)' : gdmDiagnosis.gdm ? '⚠ GDM Diagnosed' : 'OGTT normal — GDM not diagnosed'}
                  </p>
                  {gdmDiagnosis.criteria.map(c => <p key={c} className="text-xs text-red-600 mt-0.5">• {c}</p>)}
                </div>
              )}

              <FL label="Overall OGTT result (as recorded)">
                <Pills options={['Normal', 'GDM', 'Impaired Fasting Glucose', 'Overt DM']} value={ogttResult} onChange={setOgttResult} accent="emerald" />
              </FL>
            </Gate>
          </Section>
        </div>
      )

      // ══════════════════════════════════════════════════════════════════════
      case 2: return (
        <div className="space-y-5">
          <Section title="Self-Monitoring of Blood Glucose (SMBG)" value={secSMBG} onChange={setSecSMBG} accent="emerald">
            <div className="grid grid-cols-2 gap-4">
              <FL label="Glucometer / SMBG device">
                <input value={smbgDevice} onChange={e => setSmbgDevice(e.target.value)} placeholder="e.g. Accu-Chek Active, One Touch" className={inp} />
              </FL>
              <FL label="SMBG frequency">
                <Pills options={['Fasting only', '4-point (F+3 post-meal)', '7-point (F+1h+2h meals)', 'Continuous (CGM)']} value={smbgFrequency} onChange={setSmbgFrequency} accent="emerald" />
              </FL>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 space-y-1">
              <p className="font-semibold">Target glucose ranges (DIPSI / RCOG):</p>
              <p>Fasting: &lt;5.3 mmol/L (95 mg/dL)</p>
              <p>1-hour post-meal: &lt;7.8 mmol/L (140 mg/dL)</p>
              <p>2-hour post-meal: &lt;6.7 mmol/L (120 mg/dL)</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FL label="Today's fasting glucose" sub="mmol/L">
                <input type="number" value={fastingGlucose} onChange={e => setFastingGlucose(e.target.value)} step="0.1" className={inp} />
                {Number(fastingGlucose) >= 5.3 && <span className="text-xs text-red-700 font-semibold mt-0.5 block">Above target</span>}
              </FL>
              <FL label="Bedtime glucose" sub="mmol/L">
                <input type="number" value={bedtimeGlucose} onChange={e => setBedtimeGlucose(e.target.value)} step="0.1" className={inp} />
              </FL>
            </div>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-2">Post-meal readings (1-hour)</p>
            <div className="grid grid-cols-3 gap-3">
              <FL label="Breakfast">
                <input type="number" value={pp1hBreakfast} onChange={e => setPp1hBreakfast(e.target.value)} step="0.1" className={inp} />
                {Number(pp1hBreakfast) >= 7.8 && <span className="text-xs text-red-700 font-semibold mt-0.5 block">Above target</span>}
              </FL>
              <FL label="Lunch">
                <input type="number" value={pp1hLunch} onChange={e => setPp1hLunch(e.target.value)} step="0.1" className={inp} />
                {Number(pp1hLunch) >= 7.8 && <span className="text-xs text-red-700 font-semibold mt-0.5 block">Above target</span>}
              </FL>
              <FL label="Dinner">
                <input type="number" value={pp1hDinner} onChange={e => setPp1hDinner(e.target.value)} step="0.1" className={inp} />
                {Number(pp1hDinner) >= 7.8 && <span className="text-xs text-red-700 font-semibold mt-0.5 block">Above target</span>}
              </FL>
            </div>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-2">Post-meal readings (2-hour)</p>
            <div className="grid grid-cols-3 gap-3">
              <FL label="Breakfast">
                <input type="number" value={pp2hBreakfast} onChange={e => setPp2hBreakfast(e.target.value)} step="0.1" className={inp} />
                {Number(pp2hBreakfast) >= 6.7 && <span className="text-xs text-red-700 font-semibold mt-0.5 block">Above target</span>}
              </FL>
              <FL label="Lunch">
                <input type="number" value={pp2hLunch} onChange={e => setPp2hLunch(e.target.value)} step="0.1" className={inp} />
                {Number(pp2hLunch) >= 6.7 && <span className="text-xs text-red-700 font-semibold mt-0.5 block">Above target</span>}
              </FL>
              <FL label="Dinner">
                <input type="number" value={pp2hDinner} onChange={e => setPp2hDinner(e.target.value)} step="0.1" className={inp} />
                {Number(pp2hDinner) >= 6.7 && <span className="text-xs text-red-700 font-semibold mt-0.5 block">Above target</span>}
              </FL>
            </div>

            {glucoseTargets.length > 0 && (
              <div className="p-3 bg-orange-50 border border-orange-300 rounded-xl">
                <p className="text-xs font-bold text-orange-700 mb-1">Glucose targets not met:</p>
                {glucoseTargets.map(t => <p key={t} className="text-xs text-orange-600">• {t}</p>)}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FL label="Current HbA1c" sub="%">
                <input type="number" value={hbA1cCurrent} onChange={e => setHbA1cCurrent(e.target.value)} step="0.1" className={inp} />
                {Number(hbA1cCurrent) >= 6.5 && <span className="text-xs text-red-700 font-bold mt-0.5 block">HbA1c ≥6.5% — consider overt DM</span>}
                {Number(hbA1cCurrent) >= 6.0 && Number(hbA1cCurrent) < 6.5 && <span className="text-xs text-orange-700 mt-0.5 block">HbA1c borderline — tighten control</span>}
              </FL>
              <FL label="HbA1c date">
                <input type="date" value={hbA1cDate} onChange={e => setHbA1cDate(e.target.value)} className={inp} />
              </FL>
            </div>

            <FL label="Overall glycaemic control assessment">
              <Pills options={['Well controlled', 'Borderline', 'Poorly controlled', 'Very poor — ketosis risk']} value={glycaemicControl} onChange={setGlyaemicControl} accent="emerald" />
            </FL>
          </Section>

          <Section title="Fetal Monitoring" value={secFetalMonitor} onChange={setSecFetalMonitor} accent="blue">
            <Gate label="Growth scan performed?" value={fetalGrowthScan} onChange={setFetalGrowthScan}>
              <div className="grid grid-cols-2 gap-4">
                <FL label="GA at scan" sub="weeks">
                  <input type="number" value={growthScanGA} onChange={e => setGrowthScanGA(e.target.value)} className={inp} />
                </FL>
                <FL label="EFW percentile">
                  <input value={efwPercentile} onChange={e => setEfwPercentile(e.target.value)} placeholder="e.g. 90th centile" className={inp} />
                </FL>
              </div>
              <Gate label="Macrosomia suspected (&gt;90th centile / EFW &gt;4kg)?" value={macrosomiaSuspected} onChange={setMacrosomiaSuspected}>
                <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded p-2">Macrosomia: discuss shoulder dystocia risk, delivery planning. Elective CS if EFW &gt;4.5kg may be considered.</p>
              </Gate>
            </Gate>
            <div className="grid grid-cols-2 gap-4">
              <FL label="Amniotic fluid index (AFI)" sub="cm">
                <input type="number" value={afIndex} onChange={e => setAfIndex(e.target.value)} className={inp} />
                {Number(afIndex) > 25 && <span className="text-xs text-orange-700 font-semibold mt-0.5 block">Polyhydramnios (AFI &gt;25)</span>}
              </FL>
              <Gate label="Polyhydramnios on scan?" value={polyhydramnios} onChange={setPolyhydramnios}>
                <p className="text-xs text-orange-700">Polyhydramnios in GDM = increased fetal urine output from fetal hyperglycaemia — suggests suboptimal control.</p>
              </Gate>
            </div>
          </Section>
        </div>
      )

      // ══════════════════════════════════════════════════════════════════════
      case 3: return (
        <div className="space-y-5">
          <Section title="Maternal Complications" value={secMatComp} onChange={setSecMatComp} accent="red">
            <Gate label="Pre-eclampsia / hypertension?" value={preeclampsia} onChange={preeclampsia => setPreeclampsia(preeclampsia)} />
            <Gate label="Urinary tract infection (UTI)?" value={uti} onChange={setUti} />
            <Gate label="Vaginal candidiasis?" value={candidiaisis} onChange={setCandidiasis} />
            <Gate label="Diabetic retinopathy (existing / detected)?" value={retinopathy} onChange={setRetinopathy} />
            <Gate label="Diabetic neuropathy?" value={neuropathy} onChange={setNeuropathy} />
            <Gate label="Diabetic nephropathy / renal involvement?" value={nephropathy} onChange={setNephropathy} />
            <Gate label="Diabetic ketoacidosis (DKA)?" value={ketoacidosis} onChange={setKetoacidosis} accent="red">
              <div className="p-2 bg-red-50 border-2 border-red-400 rounded text-xs text-red-700 font-bold">
                DKA in pregnancy is a medical emergency — ICU admission, IV insulin protocol, aggressive hydration, fetal monitoring.
              </div>
            </Gate>
            <Gate label="Hypoglycaemic episodes?" value={hypoglycaemia} onChange={setHypoglycaemia}>
              <FL label="Episode details">
                <textarea value={hypoDetails} onChange={e => setHypoDetails(e.target.value)} rows={2} className={ta} placeholder="Frequency, glucose nadir, symptoms, treatment..." />
              </FL>
              <Gate label="Severe hypoglycaemia (requiring third-party help)?" value={hypoSevere} onChange={setHypoSevere} accent="red">
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">Severe hypo — review insulin regime, consider CGMS, educate partner/family on glucagon use.</p>
              </Gate>
            </Gate>
            <Gate label="Co-existing thyroid disorder?" value={thyroidCoexist} onChange={setThyroidCoexist}>
              <FL label="Thyroid disorder details">
                <input value={thyroidDetails} onChange={e => setThyroidDetails(e.target.value)} placeholder="Hypothyroidism / Graves — TSH, T4, medication..." className={inp} />
              </FL>
            </Gate>
          </Section>

          <Section title="Fetal / Neonatal Risks" value={secFetalComp} onChange={setSecFetalComp} accent="orange">
            <Gate label="Macrosomia (EFW &gt;90th centile / &gt;4 kg)?" value={macrosomia} onChange={setMacrosomia} />
            <Gate label="Large for gestational age (LGA)?" value={lga} onChange={setLga} />
            <Gate label="Increased stillbirth risk counselled?" value={stillbirthRisk} onChange={setStillbirthRisk} />
            <Gate label="Congenital anomaly detected / suspected?" value={congenitalAnom} onChange={setCongenitalAnom}>
              <FL label="Anomaly details">
                <textarea value={anomDetails} onChange={e => setAnomdDetails(e.target.value)} rows={2} className={ta} placeholder="Cardiac, neural tube, caudal regression syndrome..." />
              </FL>
            </Gate>
            <Gate label="Structural heart defect risk counselled?" value={shdRisk} onChange={setShdRisk} />
            <Gate label="Neonatal hypoglycaemia risk counselled?" value={neonatalHypo} onChange={setNeonatalHypo}>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                Alert paediatric team. Early feed within 1h of birth. Blood glucose check at 1–2h of life. Target neonatal glucose &gt;2.6 mmol/L.
              </p>
            </Gate>
          </Section>
        </div>
      )

      // ══════════════════════════════════════════════════════════════════════
      case 4: return (
        <div className="space-y-5">
          {/* MNT */}
          <Section title="Medical Nutrition Therapy (MNT) & Exercise" value={secMNT} onChange={setSecMNT} accent="emerald">
            <Gate label="Dietary counselling provided?" value={dietCounsellingDone} onChange={setDietCounsellingDone}>
              <FL label="Dietary plan type">
                <Pills options={['Carb-controlled diet', 'Low glycaemic index (LGI)', 'Plate method', 'Exchange system', 'Custom']} value={dietPlan} onChange={setDietPlan} accent="emerald" />
              </FL>
              <FL label="Carbohydrate distribution">
                <Pills options={['3 meals + 3 snacks', '3 meals + 2 snacks', '3 meals only', 'Small frequent meals ×5-6']} value={carbDistribution} onChange={setCarbDistribution} accent="emerald" />
              </FL>
              <FL label="Bedtime snack recommended?">
                <Pills options={['Yes — complex carb + protein', 'No']} value={snacks} onChange={setSnacks} accent="emerald" />
              </FL>
              <FL label="Caloric target" sub="kcal/day">
                <input value={caloricTarget} onChange={e => setCaloricTarget(e.target.value)} placeholder="e.g. 1800–2000 kcal (non-obese)" className={inp} />
              </FL>
              <Gate label="Referred to dietitian?" value={dietitianRef} onChange={setDietitianRef} />
            </Gate>
            <Gate label="Exercise / physical activity plan?" value={exercisePlan} onChange={setExercisePlan}>
              <FL label="Exercise prescription">
                <input value={exerciseDetails} onChange={e => setExerciseDetails(e.target.value)} placeholder="e.g. 30 min brisk walk after each meal, 3×/week swimming" className={inp} />
              </FL>
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">
                Post-meal walking (15–30 min) is highly effective for blunting post-prandial glucose spikes. Avoid in preterm risk, placenta praevia, significant cardiac disease.
              </p>
            </Gate>
          </Section>

          {/* Insulin */}
          <Section title="Insulin Therapy" value={secInsulin} onChange={setSecInsulin} accent="orange">
            <FL label="Indication(s) for starting insulin">
              <Pills options={[
                'Fasting glucose ≥5.3 mmol/L despite MNT',
                '1-hour postprandial ≥7.8 mmol/L',
                '2-hour postprandial ≥6.7 mmol/L',
                'Macrosomia on scan',
                'Patient preference / allergy to metformin',
                'Overt DM',
              ]} value={insulinIndication} onChange={setInsulinIndication} multi accent="orange" />
            </FL>
            <FL label="Insulin regime">
              <Pills options={['Basal only', 'Basal-bolus (MDI)', 'Premixed (30/70)', 'Bolus only (meal-time)']} value={insulinRegime} onChange={setInsulinRegime} accent="orange" />
            </FL>

            <Gate label="Basal insulin prescribed?" value={basalInsulin} onChange={setBasalInsulin}>
              <div className="grid grid-cols-3 gap-4">
                <FL label="Type">
                  <Pills options={['NPH (Humulin N / Insulatard)', 'Glargine (Lantus / Basalog)', 'Detemir (Levemir)']} value={basalInsulin} onChange={setBasalInsulin} accent="orange" />
                </FL>
                <FL label="Dose" sub="units">
                  <input type="number" value={basalDose} onChange={e => setBasalDose(e.target.value)} className={inp} />
                </FL>
                <FL label="Timing">
                  <Pills options={['Bedtime', 'Morning', 'BD']} value={basalTime} onChange={setBasalTime} accent="orange" />
                </FL>
              </div>
            </Gate>

            <Gate label="Bolus (rapid-acting) insulin prescribed?" value={bolusInsulin} onChange={setBolusInsulin}>
              <div className="grid grid-cols-2 gap-4">
                <FL label="Type">
                  <Pills options={['Regular insulin (Actrapid)', 'Lispro (Humalog)', 'Aspart (NovoRapid)']} value={bolusInsulin} onChange={setBolusInsulin} accent="orange" />
                </FL>
                <FL label="Dose" sub="units per meal">
                  <input type="number" value={bolusDose} onChange={e => setBolusDose(e.target.value)} className={inp} />
                </FL>
              </div>
            </Gate>

            <FL label="Dose adjustment protocol">
              <input value={insulinAdjustProtocol} onChange={e => setInsulinAdjustProtocol(e.target.value)} placeholder="e.g. Increase basal by 2 units if fasting >5.3 for 3 consecutive days" className={inp} />
            </FL>
            <Gate label="Patient taught self-adjustment?" value={selfAdjust} onChange={setSelfAdjust} />
          </Section>

          {/* Oral agents */}
          <Section title="Oral Hypoglycaemic Agent (OHA)" value={secOralAgents} onChange={setSecOralAgents} accent="purple">
            <FL label="OHA prescribed">
              <Pills options={['Metformin', 'Glibenclamide (Daonil) — limited use', 'None']} value={oralAgent} onChange={setOralAgent} accent="purple" />
            </FL>
            {oralAgent === 'Metformin' && (
              <>
                <FL label="Metformin dose">
                  <Pills options={['500 mg OD', '500 mg BD', '500 mg TDS', '1g BD (max 2.5g/day)']} value={metforminDose} onChange={setMetforminDose} accent="purple" />
                </FL>
                <FL label="GI side effects">
                  <Pills options={['None', 'Nausea', 'Diarrhoea', 'Intolerable — switching to insulin']} value={metforminSideEffects} onChange={setMetforminSideEffects} accent="purple" />
                </FL>
                <p className="text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded p-2">
                  Metformin crosses the placenta; long-term neonatal data generally reassuring. Preferred second-line in India where insulin initiation is delayed. Contraindicated in renal impairment (eGFR &lt;30).
                </p>
              </>
            )}
          </Section>

          {/* Delivery */}
          <Section title="Delivery Planning" value={secDelivery} onChange={setSecDelivery} accent="amber">
            <FL label="Delivery plan">
              <Pills options={['Aim vaginal delivery at 38–39 weeks', 'Induce at 38 weeks (macrosomia / poor control)', 'Elective CS (EFW >4.5kg or obstetric indication)', 'Await spontaneous labour']} value={deliveryPlan} onChange={setDeliveryPlan} accent="amber" />
            </FL>
            <FL label="Planned timing" sub="weeks">
              <input value={deliveryTiming} onChange={e => setDeliveryTiming(e.target.value)} placeholder="e.g. 38+0 weeks" className={inp} />
            </FL>
            <FL label="Mode of delivery">
              <Pills options={['Vaginal', 'LSCS', 'Instrumental']} value={deliveryMode} onChange={setDeliveryMode} accent="amber" />
            </FL>
            <Gate label="Intrapartum glucose monitoring planned?" value={intrapartumGlucoseMonitor} onChange={setIntrapartumGlucoseMonitor}>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                Target intrapartum glucose 4–7 mmol/L. Hourly CBG during active labour. IV dextrose + insulin infusion if glucose not maintained.
              </p>
            </Gate>
            <Gate label="Neonatal glucose monitoring plan documented?" value={neonatalGlucoseMonitor} onChange={setNeonatalGlucoseMonitor} />
            <Gate label="Paediatric / NICU alert placed?" value={paediatricAlert} onChange={setPaediatricAlert} />
          </Section>
        </div>
      )

      // ══════════════════════════════════════════════════════════════════════
      case 5: return (
        <div className="space-y-5">
          <Section title="Postpartum Glucose Management" value={secPP} onChange={setSecPP} accent="teal">
            <Gate label="Insulin stopped post-delivery?" value={insulinPostDelivery} onChange={setInsulinPostDelivery}>
              <p className="text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded p-2">
                GDM insulin usually stopped immediately post-delivery. Type 1 / overt DM: continue with dose reduction. Check fasting glucose on day 2 post-delivery.
              </p>
            </Gate>

            <Gate label="Postpartum OGTT planned?" value={ogttPostpartum} onChange={setOgttPostpartum}>
              <div className="grid grid-cols-2 gap-4">
                <FL label="Planned at" sub="weeks postpartum">
                  <input value={ogttPPGA} onChange={e => setOgttPPGA(e.target.value)} placeholder="e.g. 6–12 weeks postpartum" className={inp} />
                </FL>
                <FL label="Result (if completed)">
                  <Pills options={['Normal', 'Impaired Fasting Glucose', 'Impaired Glucose Tolerance', 'Type 2 DM']} value={ogttPPResult} onChange={setOgttPPResult} accent="teal" />
                </FL>
              </div>
              <p className="text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded p-2">
                75g OGTT at 6–12 weeks postpartum in all GDM patients. If normal — annual fasting glucose / HbA1c screening for life (risk of T2DM: up to 50% within 10 years).
              </p>
            </Gate>

            <Gate label="Breastfeeding counselled / established?" value={breastfeeding} onChange={setBreastfeeding}>
              <p className="text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded p-2">
                Breastfeeding reduces maternal T2DM risk and neonatal obesity risk. Encourage exclusive breastfeeding for ≥6 months.
              </p>
            </Gate>

            <FL label="Contraception">
              <Pills options={['Lactation amenorrhoea (LAM)', 'Barrier (condom)', 'Progesterone-only pill (POP)', 'Copper IUD', 'Implant', 'Sterilisation']} value={contraception} onChange={setContraception} accent="teal" />
            </FL>
            {['Combined oral contraceptive', 'Combined pill'].includes(contraception) && (
              <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded p-2">Combined oestrogen-progestogen OCP may worsen insulin resistance — prefer progesterone-only or non-hormonal methods.</p>
            )}

            <Gate label="Lifestyle modification plan given?" value={lifestyleModification} onChange={setLifestyleModification} />

            <FL label="Counselling topics covered">
              <Pills options={[
                'Risk of T2DM (50% by 10 years)',
                'Annual blood sugar screening recommended',
                'Healthy diet and weight management',
                'Exercise — 150 min/week minimum',
                'GDM recurrence risk in next pregnancy (~50–70%)',
                'Aspirin next pregnancy if PE risk',
                'Inform future obstetrician of GDM history',
                'Screen first-degree family members',
              ]} value={counsellingGiven} onChange={setCounsellingGiven} multi accent="teal" />
            </FL>

            <Gate label="Annual DM screening plan set up?" value={annualDMScreen} onChange={setAnnualDMScreen} />
            <Gate label="First-degree family members referred for DM screening?" value={familyReferral} onChange={setFamilyReferral} />
          </Section>

          <div>
            <FL label="Overall Plan / Notes">
              <textarea value={planNotes} onChange={e => setPlanNotes(e.target.value)} rows={4} className={ta} placeholder="Summary of management decisions, follow-up schedule, emergency plan..." />
            </FL>
          </div>
        </div>
      )

      default: return null
    }
  }

  const headerBadge = useMemo(() => {
    if (gdmDiagnosis?.overt) return { label: 'OVERT DM', color: 'bg-red-600 text-white animate-pulse' }
    if (gdmDiagnosis?.gdm || ogttResult === 'GDM') return { label: 'GDM', color: 'bg-orange-500 text-white' }
    if (glucoseTargets.length > 0) return { label: 'OFF TARGET', color: 'bg-amber-500 text-white' }
    if (riskFactorCount >= 3) return { label: 'HIGH RISK', color: 'bg-orange-400 text-white' }
    return null
  }, [gdmDiagnosis, ogttResult, glucoseTargets, riskFactorCount])

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-5 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Activity size={22} />
            </div>
            <div>
              <p className="text-emerald-200 text-xs font-medium uppercase tracking-wider">OBG Assessment</p>
              <h1 className="text-xl font-bold">GDM Assessment</h1>
              <p className="text-emerald-200 text-xs mt-0.5">Gestational Diabetes Mellitus</p>
            </div>
          </div>
          <div className="text-right space-y-1">
            {headerBadge && (
              <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-lg ${headerBadge.color}`}>
                {headerBadge.label}
              </span>
            )}
            {ga && <p className="text-emerald-200 text-xs">{ga} weeks</p>}
          </div>
        </div>
        <div className="mt-4 flex gap-1">
          {STAGES.map((s, i) => (
            <button key={s} type="button" onClick={() => setStage(i)}
              className={`flex-1 h-1.5 rounded-full transition-all ${i === stage ? 'bg-white' : i < stage ? 'bg-emerald-300' : 'bg-white/20'}`} />
          ))}
        </div>
        <p className="text-emerald-200 text-xs mt-1.5">{stage + 1} / {STAGES.length} — {STAGES[stage]}</p>
      </div>

      {/* Stage tabs */}
      <div className="flex border-b border-gray-100 overflow-x-auto bg-gray-50/60">
        {STAGES.map((s, i) => (
          <button key={s} type="button" onClick={() => setStage(i)}
            className={`px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
              i === stage ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}>
            {s}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="p-5">{renderStage()}</div>

      {/* Footer nav */}
      <div className="flex items-center justify-between px-5 pb-5">
        <button type="button" onClick={() => setStage(s => Math.max(0, s - 1))} disabled={stage === 0}
          className={`${navBtn} text-gray-600 hover:bg-gray-100 disabled:opacity-30`}>
          <ChevronLeft size={16} /> Back
        </button>
        {stage < STAGES.length - 1 ? (
          <button type="button" onClick={() => setStage(s => s + 1)}
            className={`${navBtn} bg-emerald-600 text-white hover:bg-emerald-700`}>
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button type="button" onClick={handleSave} disabled={saving}
            className={`${navBtn} bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-60`}>
            {saving ? 'Saving…' : 'Save Assessment'}
          </button>
        )}
      </div>
    </div>
  )
}
