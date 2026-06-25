/**
 * @shared-pool
 * @category obg
 * @tags PCOS, polycystic-ovary, Rotterdam, anovulation, hirsuitism, metabolic
 * Portal-agnostic. Safe to surface in any portal's assessment search.
 */

import React, { useState, useMemo } from 'react'
import { Sun, ChevronRight, ChevronLeft, Lock, AlertTriangle } from 'lucide-react'
import api from '../../../api/client'

function Section({ title, value, onChange, children, accent = 'violet' }) {
  const A = {
    violet: { border: 'border-violet-200', bg: 'bg-violet-50/40', div: 'border-violet-100', btn: 'bg-violet-600 text-white border-violet-600' },
    purple: { border: 'border-purple-200', bg: 'bg-purple-50/40', div: 'border-purple-100', btn: 'bg-purple-600 text-white border-purple-600' },
    orange: { border: 'border-orange-200', bg: 'bg-orange-50/40', div: 'border-orange-100', btn: 'bg-orange-500 text-white border-orange-500' },
    red:    { border: 'border-red-200',    bg: 'bg-red-50/40',    div: 'border-red-100',    btn: 'bg-red-500 text-white border-red-500' },
    amber:  { border: 'border-amber-200',  bg: 'bg-amber-50/40',  div: 'border-amber-100',  btn: 'bg-amber-500 text-white border-amber-500' },
    blue:   { border: 'border-blue-200',   bg: 'bg-blue-50/40',   div: 'border-blue-100',   btn: 'bg-blue-500 text-white border-blue-500' },
    green:  { border: 'border-green-200',  bg: 'bg-green-50/40',  div: 'border-green-100',  btn: 'bg-green-600 text-white border-green-600' },
    teal:   { border: 'border-teal-200',   bg: 'bg-teal-50/40',   div: 'border-teal-100',   btn: 'bg-teal-500 text-white border-teal-500' },
  }
  const a = A[accent] || A.violet
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
                  ? opt === 'Yes' ? 'bg-violet-600 text-white border-violet-600' : 'bg-gray-400 text-white border-gray-400'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      {value === 'Yes' && <div className="pl-4 border-l-2 border-violet-200 space-y-3">{children}</div>}
    </div>
  )
}

function Pills({ options, value, onChange, multi = false, accent = 'violet' }) {
  const colors = {
    violet: { on: 'bg-violet-600 text-white border-violet-600', off: 'bg-white text-gray-600 border-gray-200 hover:border-violet-300' },
    purple: { on: 'bg-purple-600 text-white border-purple-600', off: 'bg-white text-gray-600 border-gray-200 hover:border-purple-300' },
    orange: { on: 'bg-orange-500 text-white border-orange-500', off: 'bg-white text-gray-600 border-gray-200 hover:border-orange-300' },
    red:    { on: 'bg-red-500 text-white border-red-500',       off: 'bg-white text-gray-600 border-gray-200 hover:border-red-300' },
    amber:  { on: 'bg-amber-500 text-white border-amber-500',   off: 'bg-white text-gray-600 border-gray-200 hover:border-amber-300' },
    blue:   { on: 'bg-blue-500 text-white border-blue-500',     off: 'bg-white text-gray-600 border-gray-200 hover:border-blue-300' },
    green:  { on: 'bg-green-600 text-white border-green-600',   off: 'bg-white text-gray-600 border-gray-200 hover:border-green-300' },
    teal:   { on: 'bg-teal-500 text-white border-teal-500',     off: 'bg-white text-gray-600 border-gray-200 hover:border-teal-300' },
  }
  const c = colors[accent] || colors.violet
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

const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300'
const ta  = `${inp} resize-none`

const STAGES = ['History', 'Rotterdam Criteria', 'Metabolic Screen', 'Investigations', 'Management', 'Fertility Plan']

export default function PCOSAssessmentForm({ patientId, encounterId, onSaved }) {
  const [stage, setStage] = useState(0)
  const [saving, setSaving] = useState(false)

  // Stage 1
  const [visitDate, setVisitDate]           = useState('')
  const [age, setAge]                       = useState('')
  const [bmi, setBmi]                       = useState('')
  const [weight, setWeight]                 = useState('')
  const [height, setHeight]                 = useState('')
  const [waistCirc, setWaistCirc]           = useState('')
  const [parity, setParity]                 = useState('')
  const [mainConcern, setMainConcern]       = useState([])
  const [duration, setDuration]             = useState('')
  const [familyHxPCOS, setFamilyHxPCOS]     = useState('')
  const [familyHxDM, setFamilyHxDM]         = useState('')
  const [familyHxHTN, setFamilyHxHTN]       = useState('')
  const [menarche, setMenarche]             = useState('')
  const [prevDiagnosis, setPrevDiagnosis]   = useState('')
  const [prevTreatment, setPrevTreatment]   = useState([])

  // Stage 2: Rotterdam
  const [secOligo, setSecOligo]             = useState('')
  const [cycleLength, setCycleLength]       = useState('')
  const [periodFrequency, setPeriodFrequency] = useState('')
  const [amenorrhoeaDuration, setAmenorrhoeaDuration] = useState('')
  const [lmp, setLmp]                       = useState('')

  const [secHyperandrogen, setSecHyperandrogen] = useState('')
  const [clinicalHA, setClinicalHA]         = useState([])
  const [ferrimanScore, setFerrimanScore]   = useState('')
  const [biochemHA, setBiochemHA]           = useState('')
  const [testosterone, setTestosterone]     = useState('')
  const [androstenedione, setAndrostenedione] = useState('')
  const [dheas, setDheas]                   = useState('')
  const [freeAndrogen, setFreeAndrogen]     = useState('')

  const [secPCO, setSecPCO]                 = useState('')
  const [tvusDone, setTvusDone]             = useState('')
  const [follicleCount, setFollicleCount]   = useState('')
  const [ovarianVolume, setOvarianVolume]   = useState('')
  const [stringOfPearls, setStringOfPearls] = useState('')
  const [stroma, setStroma]                 = useState('')

  // Rotterdam auto-diagnosis
  const rotterdamCriteria = useMemo(() => {
    const met = []
    if (secOligo === 'Yes') met.push('Oligo/anovulation')
    if (secHyperandrogen === 'Yes') met.push('Clinical/biochemical hyperandrogenism')
    if (secPCO === 'Yes') met.push('Polycystic ovaries on USG')
    return met
  }, [secOligo, secHyperandrogen, secPCO])

  const pcosDiagnosis = useMemo(() => {
    if (rotterdamCriteria.length < 2) return null
    const phenotype = (() => {
      const o = secOligo === 'Yes', h = secHyperandrogen === 'Yes', p = secPCO === 'Yes'
      if (o && h && p) return 'A (Classic — all 3 criteria)'
      if (h && p && !o) return 'B (Ovulatory PCOS)'
      if (o && h && !p) return 'C (Non-PCO PCOS)'
      if (o && p && !h) return 'D (Normoandrogenic PCOS)'
      return 'Unknown'
    })()
    return { phenotype, criteria: rotterdamCriteria }
  }, [rotterdamCriteria, secOligo, secHyperandrogen, secPCO])

  // Stage 3: Metabolic
  const [secMetabolic, setSecMetabolic]     = useState('')
  const [fastingGlucose, setFastingGlucose] = useState('')
  const [ogttResult, setOgttResult]         = useState('')
  const [hbA1c, setHbA1c]                   = useState('')
  const [insulinResistance, setInsulinResistance] = useState('')
  const [homaIR, setHomaIR]                 = useState('')
  const [totalCholesterol, setTotalCholesterol] = useState('')
  const [ldl, setLdl]                       = useState('')
  const [hdl, setHdl]                       = useState('')
  const [triglycerides, setTriglycerides]   = useState('')
  const [bp, setBp]                         = useState('')
  const [acanthosisNigricans, setAcanthosisNigricans] = useState('')
  const [skinTags, setSkinTags]             = useState('')
  const [sleepApnoea, setSleepApnoea]       = useState('')

  const metabolicRisk = useMemo(() => {
    const issues = []
    if (Number(fastingGlucose) >= 5.6) issues.push('Impaired fasting glucose')
    if (Number(hbA1c) >= 6.0) issues.push('Pre-diabetes / HbA1c ≥6.0%')
    if (Number(triglycerides) >= 1.7) issues.push('Hypertriglyceridaemia')
    if (Number(hdl) < 1.29) issues.push('Low HDL')
    if (Number(waistCirc) > 80) issues.push('Central obesity (waist >80 cm in women)')
    const [s] = (bp || '').split('/').map(Number)
    if (s >= 130) issues.push('Elevated blood pressure')
    return issues
  }, [fastingGlucose, hbA1c, triglycerides, hdl, waistCirc, bp])

  const metabolicSyndrome = metabolicRisk.length >= 3

  // Stage 4: Investigations
  const [secInvest, setSecInvest]           = useState('')
  const [lh, setLh]                         = useState('')
  const [fsh, setFsh]                       = useState('')
  const [lhFsh, setLhFsh]                   = useState('')
  const [oestradiol, setOestradiol]         = useState('')
  const [prolactin, setProlactin]           = useState('')
  const [tsh, setTsh]                       = useState('')
  const [shbg, setShbg]                     = useState('')
  const [amh, setAmh]                       = useState('')
  const [cortisol, setCortisol]             = useState('')
  const [ogtt75g, setOgtt75g]               = useState('')
  const [thyroidAb, setThyroidAb]           = useState('')

  // Stage 5: Management
  const [secLifestyle, setSecLifestyle]     = useState('')
  const [weightLossGoal, setWeightLossGoal] = useState('')
  const [exercisePlan, setExercisePlan]     = useState('')
  const [dietCounselling, setDietCounselling] = useState('')
  const [lowGIDiet, setLowGIDiet]           = useState('')

  const [secMenstrualReg, setSecMenstrualReg] = useState('')
  const [menstrualRxOptions, setMenstrualRxOptions] = useState([])
  const [ocpDetails, setOcpDetails]         = useState('')
  const [progesteroneDetails, setProgesteroneDetails] = useState('')
  const [withdrawalBleeds, setWithdrawalBleeds] = useState('')

  const [secAndrogenRx, setSecAndrogenRx]   = useState('')
  const [antiAndrogen, setAntiAndrogen]     = useState([])
  const [antiAndrogenDetails, setAntiAndrogenDetails] = useState('')

  const [secMetformin, setSecMetformin]     = useState('')
  const [metforminDose, setMetforminDose]   = useState('')
  const [metforminIndication, setMetforminIndication] = useState([])

  const [secSkin, setSecSkin]               = useState('')
  const [acneRx, setAcneRx]                 = useState([])
  const [hairRemoval, setHairRemoval]       = useState([])
  const [alopeciaRx, setAlopeciaRx]         = useState([])
  const [psychCounselling, setPsychCounselling] = useState('')

  const [secEndometrial, setSecEndometrial] = useState('')
  const [endometrialThickness, setEndometrialThickness] = useState('')
  const [withdrawalBleedFreq, setWithdrawalBleedFreq]   = useState('')
  const [endometrialBiopsy, setEndometrialBiopsy]       = useState('')

  // Stage 6: Fertility
  const [secFertility, setSecFertility]     = useState('')
  const [fertilityDesire, setFertilityDesire] = useState('')
  const [ovulationInduction, setOvulationInduction] = useState([])
  const [clomipheneDetails, setClomipheneDetails] = useState('')
  const [letrozoleDetails, setLetrozoleDetails]   = useState('')
  const [gonadotropins, setGonadotropins]   = useState('')
  const [laparoscopicDrilling, setLaparoscopicDrilling] = useState('')
  const [drillingDetails, setDrillingDetails] = useState('')
  const [iuiPlanned, setIuiPlanned]         = useState('')
  const [ivfConsidered, setIvfConsidered]   = useState('')
  const [ohssRisk, setOhssRisk]             = useState('')
  const [partnerSemen, setPartnerSemen]     = useState('')
  const [partnerSemenResult, setPartnerSemenResult] = useState('')
  const [fertilityReferral, setFertilityReferral] = useState('')

  const [longTermRisks, setLongTermRisks]   = useState([])
  const [planNotes, setPlanNotes]           = useState('')

  async function handleSave() {
    setSaving(true)
    try {
      await api.post('/assessments', {
        patientId, encounterId,
        formType: 'pcos_assessment',
        data: {
          visitDate, age, bmi, weight, height, waistCirc, parity, mainConcern, duration, familyHxPCOS, familyHxDM, menarche,
          rotterdam: { oligo: secOligo, hyperandrogen: secHyperandrogen, pco: secPCO, diagnosis: pcosDiagnosis },
          menstrualPattern: { cycleLength, frequency: periodFrequency, amenorrhoeaDuration, lmp },
          hyperandrogenism: { clinical: clinicalHA, ferrimanScore, biochemical: biochemHA, testosterone, androstenedione, dheas, freeAndrogen },
          usg: { done: tvusDone, follicleCount, ovarianVolume, stringOfPearls, stroma },
          metabolic: { fastingGlucose, ogtt: ogttResult, hbA1c, insulinResistance, homaIR, cholesterol: totalCholesterol, ldl, hdl, triglycerides, bp, acanthosis: acanthosisNigricans, sleepApnoea, metabolicRisk, metabolicSyndrome },
          investigations: { lh, fsh, lhFshRatio: lhFsh, oestradiol, prolactin, tsh, shbg, amh, cortisol, ogtt: ogtt75g, thyroidAb },
          management: {
            lifestyle: { weightLossGoal, exercise: exercisePlan, diet: dietCounselling, lowGI: lowGIDiet },
            menstrualRegulation: { options: menstrualRxOptions, ocpDetails, progesterone: progesteroneDetails, withdrawalBleeds },
            antiAndrogens: { agents: antiAndrogen, details: antiAndrogenDetails },
            metformin: { dose: metforminDose, indications: metforminIndication },
            skin: { acne: acneRx, hairRemoval, alopecia: alopeciaRx, psych: psychCounselling },
            endometrial: { thickness: endometrialThickness, withdrawalFreq: withdrawalBleedFreq, biopsy: endometrialBiopsy },
          },
          fertility: { desire: fertilityDesire, ovulationInduction, clomiphene: clomipheneDetails, letrozole: letrozoleDetails, gonadotropins, drilling: laparoscopicDrilling, drillingDetails, iui: iuiPlanned, ivf: ivfConsidered, ohssRisk, partnerSemen, partnerSemenResult, referral: fertilityReferral },
          longTermRisks,
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
      case 0: return (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <FL label="Visit Date"><input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} className={inp} /></FL>
            <FL label="Age" sub="years"><input type="number" value={age} onChange={e => setAge(e.target.value)} className={inp} /></FL>
            <FL label="Parity"><input value={parity} onChange={e => setParity(e.target.value)} placeholder="G_P_L_A" className={inp} /></FL>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <FL label="Weight" sub="kg"><input type="number" value={weight} onChange={e => setWeight(e.target.value)} className={inp} /></FL>
            <FL label="Height" sub="cm"><input type="number" value={height} onChange={e => setHeight(e.target.value)} className={inp} /></FL>
            <FL label="BMI" sub="kg/m²">
              <input type="number" value={bmi} onChange={e => setBmi(e.target.value)} step="0.1" className={inp} />
              {Number(bmi) >= 30 && <span className="text-xs text-orange-700 font-semibold mt-0.5 block">Obese — metabolic risk</span>}
            </FL>
            <FL label="Waist" sub="cm">
              <input type="number" value={waistCirc} onChange={e => setWaistCirc(e.target.value)} className={inp} />
              {Number(waistCirc) > 80 && <span className="text-xs text-orange-700 font-semibold mt-0.5 block">&gt;80 cm — central obesity</span>}
            </FL>
          </div>
          <FL label="Main concern(s)">
            <Pills options={['Irregular periods', 'Absent periods', 'Heavy periods', 'Facial hair / body hair', 'Acne', 'Hair thinning / alopecia', 'Weight gain', 'Difficulty conceiving', 'Mood / anxiety', 'Skin darkening']} value={mainConcern} onChange={setMainConcern} multi />
          </FL>
          <FL label="Duration of symptoms">
            <input value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. since puberty, 3 years" className={inp} />
          </FL>
          <FL label="Age at menarche" sub="years"><input type="number" value={menarche} onChange={e => setMenarche(e.target.value)} className={inp} /></FL>
          <div className="grid grid-cols-3 gap-4">
            <Gate label="Family Hx of PCOS?" value={familyHxPCOS} onChange={setFamilyHxPCOS} />
            <Gate label="Family Hx of T2DM?" value={familyHxDM} onChange={setFamilyHxDM} />
            <Gate label="Family Hx of HTN/CVD?" value={familyHxHTN} onChange={setFamilyHxHTN} />
          </div>
          <FL label="Previous PCOS diagnosis / treatment">
            <Pills options={['New diagnosis', 'Previously diagnosed — on OCP', 'Previously diagnosed — on Metformin', 'No previous treatment', 'Failed ovulation induction']} value={prevTreatment} onChange={setPrevTreatment} multi />
          </FL>
        </div>
      )

      case 1: return (
        <div className="space-y-5">
          <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl text-xs text-violet-700">
            <p className="font-semibold">Rotterdam Criteria 2003 — PCOS diagnosis requires ≥2 of 3:</p>
            <p>1. Oligo/anovulation &nbsp;|&nbsp; 2. Clinical/biochemical hyperandrogenism &nbsp;|&nbsp; 3. Polycystic ovaries on USG</p>
            <p className="mt-1 text-violet-500">Exclude: Cushing's, CAH, androgen-secreting tumour, thyroid disease, hyperprolactinaemia first.</p>
          </div>

          {pcosDiagnosis && (
            <div className="p-3 bg-violet-50 border-2 border-violet-400 rounded-xl">
              <p className="text-sm font-bold text-violet-700">PCOS Diagnosed — Rotterdam Phenotype {pcosDiagnosis.phenotype}</p>
              {pcosDiagnosis.criteria.map(c => <p key={c} className="text-xs text-violet-600">• {c}</p>)}
            </div>
          )}
          {rotterdamCriteria.length === 1 && (
            <div className="p-2 bg-amber-50 border border-amber-300 rounded text-xs text-amber-700">Only 1 Rotterdam criterion met — PCOS not confirmed. Continue workup and exclude differentials.</div>
          )}

          <Section title="1. Oligo/Anovulation (Menstrual Irregularity)" value={secOligo} onChange={setSecOligo} accent="violet">
            <div className="grid grid-cols-2 gap-4">
              <FL label="Average cycle length" sub="days">
                <input type="number" value={cycleLength} onChange={e => setCycleLength(e.target.value)} className={inp} />
                {Number(cycleLength) > 35 && <span className="text-xs text-violet-700 font-semibold mt-0.5 block">Oligomenorrhoea ✓</span>}
              </FL>
              <FL label="Periods per year">
                <input type="number" value={periodFrequency} onChange={e => setPeriodFrequency(e.target.value)} placeholder="e.g. 4–8 per year" className={inp} />
                {Number(periodFrequency) <= 8 && periodFrequency && <span className="text-xs text-violet-700 font-semibold mt-0.5 block">≤8 periods/year = oligomenorrhoea ✓</span>}
              </FL>
            </div>
            <FL label="LMP"><input type="date" value={lmp} onChange={e => setLmp(e.target.value)} className={inp} /></FL>
            <Gate label="Amenorrhoea (&gt;3 months absent)?" value={amenorrhoeaDuration} onChange={setAmenorrhoeaDuration} />
          </Section>

          <Section title="2. Clinical / Biochemical Hyperandrogenism" value={secHyperandrogen} onChange={setSecHyperandrogen} accent="orange">
            <FL label="Clinical signs of hyperandrogenism">
              <Pills options={['Hirsuitism (Ferriman-Gallwey ≥8)', 'Acne (moderate–severe)', 'Androgenic alopecia', 'Virilisation (clitoromegaly, voice change)']} value={clinicalHA} onChange={setClinicalHA} multi accent="orange" />
            </FL>
            {clinicalHA.includes('Hirsuitism (Ferriman-Gallwey ≥8)') && (
              <FL label="Ferriman-Gallwey score" sub="/36">
                <input type="number" value={ferrimanScore} onChange={e => setFerrimanScore(e.target.value)} max={36} className={inp} />
                {Number(ferrimanScore) >= 8 && <span className="text-xs text-orange-700 font-semibold mt-0.5 block">FG ≥8 — clinically significant hirsuitism ✓</span>}
              </FL>
            )}
            <Gate label="Biochemical hyperandrogenism (elevated androgens)?" value={biochemHA} onChange={setBiochemHA}>
              <div className="grid grid-cols-2 gap-4">
                <FL label="Total testosterone" sub="nmol/L">
                  <input type="number" value={testosterone} onChange={e => setTestosterone(e.target.value)} step="0.1" className={inp} />
                  {Number(testosterone) > 2.5 && <span className="text-xs text-orange-700 font-semibold mt-0.5 block">Elevated testosterone ✓</span>}
                </FL>
                <FL label="DHEAS" sub="μmol/L">
                  <input type="number" value={dheas} onChange={e => setDheas(e.target.value)} step="0.1" className={inp} />
                </FL>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FL label="Androstenedione" sub="nmol/L">
                  <input type="number" value={androstenedione} onChange={e => setAndrostenedione(e.target.value)} step="0.1" className={inp} />
                </FL>
                <FL label="Free Androgen Index (FAI)">
                  <input type="number" value={freeAndrogen} onChange={e => setFreeAndrogen(e.target.value)} step="0.1" className={inp} />
                  {Number(freeAndrogen) > 4.5 && <span className="text-xs text-orange-700 font-semibold mt-0.5 block">Elevated FAI ✓</span>}
                </FL>
              </div>
            </Gate>
          </Section>

          <Section title="3. Polycystic Ovaries on Ultrasound" value={secPCO} onChange={setSecPCO} accent="blue">
            <Gate label="TVUS / abdominal USG performed?" value={tvusDone} onChange={setTvusDone}>
              <div className="grid grid-cols-2 gap-4">
                <FL label="Follicle count per ovary" sub="(≥12 = PCOS threshold)">
                  <input type="number" value={follicleCount} onChange={e => setFollicleCount(e.target.value)} className={inp} />
                  {Number(follicleCount) >= 12 && <span className="text-xs text-blue-700 font-semibold mt-0.5 block">≥12 follicles — PCO ✓</span>}
                </FL>
                <FL label="Ovarian volume" sub="mL (≥10 mL = PCO)">
                  <input type="number" value={ovarianVolume} onChange={e => setOvarianVolume(e.target.value)} step="0.1" className={inp} />
                  {Number(ovarianVolume) >= 10 && <span className="text-xs text-blue-700 font-semibold mt-0.5 block">≥10 mL — PCO ✓</span>}
                </FL>
              </div>
              <Gate label="String of pearls appearance (peripherally arranged follicles)?" value={stringOfPearls} onChange={setStringOfPearls} />
              <FL label="Ovarian stroma">
                <Pills options={['Normal', 'Increased echogenicity (hyperechoic stroma — PCOS feature)']} value={stroma} onChange={setStroma} accent="blue" />
              </FL>
              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">
                ESHRE/ASRM 2018: PCOS threshold = ≥20 follicles per ovary (high-frequency probe) OR ovarian volume ≥10 mL. String of pearls now less specific.
              </p>
            </Gate>
          </Section>
        </div>
      )

      case 2: return (
        <div className="space-y-5">
          <Section title="Metabolic Syndrome Screening" value={secMetabolic} onChange={setSecMetabolic} accent="amber">
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              PCOS confers 5–10× increased T2DM risk. Screen all PCOS women with fasting glucose + 75g OGTT (if high risk). Repeat annually if normal.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <FL label="Fasting glucose" sub="mmol/L">
                <input type="number" value={fastingGlucose} onChange={e => setFastingGlucose(e.target.value)} step="0.1" className={inp} />
                {Number(fastingGlucose) >= 7.0 && <span className="text-xs text-red-700 font-bold mt-0.5 block">Overt DM ≥7.0</span>}
                {Number(fastingGlucose) >= 5.6 && Number(fastingGlucose) < 7.0 && <span className="text-xs text-orange-700 font-semibold mt-0.5 block">IFG 5.6–6.9</span>}
              </FL>
              <FL label="HbA1c" sub="%">
                <input type="number" value={hbA1c} onChange={e => setHbA1c(e.target.value)} step="0.1" className={inp} />
                {Number(hbA1c) >= 6.5 && <span className="text-xs text-red-700 font-bold mt-0.5 block">DM ≥6.5%</span>}
              </FL>
              <FL label="HOMA-IR" sub="(IR if &gt;2.5)">
                <input type="number" value={homaIR} onChange={e => setHomaIR(e.target.value)} step="0.1" className={inp} />
                {Number(homaIR) > 2.5 && <span className="text-xs text-amber-700 font-semibold mt-0.5 block">Insulin resistant</span>}
              </FL>
            </div>
            <FL label="OGTT result">
              <Pills options={['Normal', 'Impaired fasting glucose', 'Impaired glucose tolerance', 'Type 2 DM']} value={ogttResult} onChange={setOgttResult} accent="amber" />
            </FL>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-2">Lipid Profile</p>
            <div className="grid grid-cols-4 gap-3">
              <FL label="Total cholesterol" sub="mmol/L"><input type="number" value={totalCholesterol} onChange={e => setTotalCholesterol(e.target.value)} step="0.1" className={inp} /></FL>
              <FL label="LDL" sub="mmol/L"><input type="number" value={ldl} onChange={e => setLdl(e.target.value)} step="0.1" className={inp} /></FL>
              <FL label="HDL" sub="mmol/L">
                <input type="number" value={hdl} onChange={e => setHdl(e.target.value)} step="0.1" className={inp} />
                {Number(hdl) < 1.29 && hdl && <span className="text-xs text-orange-700 font-semibold mt-0.5 block">Low HDL</span>}
              </FL>
              <FL label="Triglycerides" sub="mmol/L">
                <input type="number" value={triglycerides} onChange={e => setTriglycerides(e.target.value)} step="0.1" className={inp} />
                {Number(triglycerides) >= 1.7 && <span className="text-xs text-orange-700 font-semibold mt-0.5 block">Elevated</span>}
              </FL>
            </div>
            <FL label="Blood pressure" sub="mmHg"><input value={bp} onChange={e => setBp(e.target.value)} placeholder="e.g. 128/84" className={inp} /></FL>
            <div className="grid grid-cols-2 gap-4">
              <Gate label="Acanthosis nigricans?" value={acanthosisNigricans} onChange={setAcanthosisNigricans} />
              <Gate label="Sleep apnoea symptoms?" value={sleepApnoea} onChange={setSleepApnoea}>
                <p className="text-xs text-amber-700">Snoring, daytime somnolence, apnoeic episodes — refer for sleep study. PCOS strongly associated with OSA.</p>
              </Gate>
            </div>

            {metabolicSyndrome && (
              <div className="p-3 bg-orange-50 border-2 border-orange-400 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle size={14} className="text-orange-600" />
                  <p className="text-sm font-bold text-orange-700">Metabolic Syndrome ({metabolicRisk.length} criteria met)</p>
                </div>
                {metabolicRisk.map(r => <p key={r} className="text-xs text-orange-600">• {r}</p>)}
                <p className="text-xs text-orange-700 mt-1">Lifestyle modification + Metformin strongly indicated.</p>
              </div>
            )}
          </Section>
        </div>
      )

      case 3: return (
        <div className="space-y-5">
          <Section title="Hormone & Biochemical Investigations" value={secInvest} onChange={setSecInvest} accent="violet">
            <div className="grid grid-cols-3 gap-4">
              <FL label="LH" sub="IU/L">
                <input type="number" value={lh} onChange={e => setLh(e.target.value)} step="0.1" className={inp} />
              </FL>
              <FL label="FSH" sub="IU/L">
                <input type="number" value={fsh} onChange={e => setFsh(e.target.value)} step="0.1" className={inp} />
              </FL>
              <FL label="LH:FSH ratio">
                <input type="number" value={lhFsh} onChange={e => setLhFsh(e.target.value)} step="0.1" className={inp} />
                {Number(lhFsh) >= 2.5 && <span className="text-xs text-violet-700 font-semibold mt-0.5 block">Raised ratio — PCOS pattern ✓</span>}
              </FL>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FL label="Oestradiol (E2)" sub="pmol/L"><input type="number" value={oestradiol} onChange={e => setOestradiol(e.target.value)} className={inp} /></FL>
              <FL label="Prolactin" sub="mIU/L">
                <input type="number" value={prolactin} onChange={e => setProlactin(e.target.value)} className={inp} />
                {Number(prolactin) > 1000 && <span className="text-xs text-orange-700 font-semibold mt-0.5 block">Elevated — exclude pituitary adenoma</span>}
              </FL>
              <FL label="TSH" sub="mIU/L">
                <input type="number" value={tsh} onChange={e => setTsh(e.target.value)} step="0.01" className={inp} />
                {Number(tsh) > 4 && <span className="text-xs text-orange-700 font-semibold mt-0.5 block">Hypothyroid</span>}
              </FL>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FL label="SHBG" sub="nmol/L">
                <input type="number" value={shbg} onChange={e => setShbg(e.target.value)} className={inp} />
                {Number(shbg) < 30 && shbg && <span className="text-xs text-amber-700 mt-0.5 block">Low SHBG — insulin resistance marker</span>}
              </FL>
              <FL label="AMH" sub="pmol/L">
                <input type="number" value={amh} onChange={e => setAmh(e.target.value)} step="0.1" className={inp} />
                {Number(amh) > 30 && <span className="text-xs text-violet-700 font-semibold mt-0.5 block">Elevated — PCOS pattern ✓</span>}
              </FL>
              <FL label="Morning cortisol" sub="nmol/L"><input type="number" value={cortisol} onChange={e => setCortisol(e.target.value)} className={inp} /></FL>
            </div>
            <FL label="75g OGTT result">
              <Pills options={['Not done', 'Normal', 'Impaired fasting glucose', 'Impaired glucose tolerance', 'Diabetes']} value={ogtt75g} onChange={setOgtt75g} accent="amber" />
            </FL>
            <Gate label="Thyroid antibodies (TPO/TG)?">
              <FL label="Result">
                <input value={thyroidAb} onChange={e => setThyroidAb(e.target.value)} className={inp} />
              </FL>
            </Gate>
          </Section>
        </div>
      )

      case 4: return (
        <div className="space-y-5">
          <Section title="Lifestyle Modification" value={secLifestyle} onChange={setSecLifestyle} accent="green">
            <FL label="Weight loss goal (if overweight/obese)">
              <Pills options={['5% weight loss (improves menstruation & ovulation)', '10% weight loss', 'Maintain current weight (if normal BMI)', 'Refer to bariatric programme']} value={weightLossGoal} onChange={setWeightLossGoal} accent="green" />
            </FL>
            <FL label="Exercise prescription">
              <input value={exercisePlan} onChange={e => setExercisePlan(e.target.value)} placeholder="e.g. 150 min moderate intensity / week; resistance training × 3/week" className={inp} />
            </FL>
            <Gate label="Dietary counselling given?" value={dietCounselling} onChange={setDietCounselling} />
            <Gate label="Low glycaemic index diet recommended?" value={lowGIDiet} onChange={setLowGIDiet}>
              <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2">Low GI diet reduces insulin resistance. Avoid refined carbs, sugary drinks. Indian context: limit white rice, maida, poha; prefer millets (ragi, jowar), whole pulses, vegetables.</p>
            </Gate>
          </Section>

          <Section title="Menstrual Cycle Regulation" value={secMenstrualReg} onChange={setSecMenstrualReg} accent="violet">
            <FL label="Menstrual regulation options">
              <Pills options={['Combined OCP (Diane-35 / Yasmin — antiandrogen OCP)', 'Progesterone withdrawal bleed (Norethisterone 5mg TDS × 10 days / 3 months)', 'LNG-IUS (Mirena) — for HMB', 'Cyclical progesterone']} value={menstrualRxOptions} onChange={setMenstrualRxOptions} multi accent="violet" />
            </FL>
            {menstrualRxOptions.includes('Combined OCP (Diane-35 / Yasmin — antiandrogen OCP)') && (
              <FL label="OCP details">
                <input value={ocpDetails} onChange={e => setOcpDetails(e.target.value)} placeholder="e.g. Diane-35 (EE 35mcg + Cyproterone 2mg) daily × 21 days, 7 day break" className={inp} />
              </FL>
            )}
            <Gate label="Withdrawal bleeds achieved at least q3 months?" value={withdrawalBleeds} onChange={setWithdrawalBleeds}>
              <p className="text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded p-2">
                If amenorrhoeic, induce withdrawal bleed every 3 months minimum to prevent endometrial hyperplasia (anovulation → unopposed oestrogen → hyperplasia risk).
              </p>
            </Gate>
          </Section>

          <Section title="Anti-Androgen Treatment" value={secAndrogenRx} onChange={setSecAndrogenRx} accent="orange">
            <FL label="Anti-androgen agent(s)">
              <Pills options={['Cyproterone acetate (Diane-35 OCP)', 'Spironolactone 50–100 mg OD', 'Finasteride 2.5–5 mg OD', 'Flutamide (limited use)']} value={antiAndrogen} onChange={setAntiAndrogen} multi accent="orange" />
            </FL>
            <FL label="Details / dose">
              <input value={antiAndrogenDetails} onChange={e => setAntiAndrogenDetails(e.target.value)} placeholder="Note: use contraception with anti-androgens — teratogenic" className={inp} />
            </FL>
            <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded p-2">Anti-androgens take 6–12 months for full effect on hirsuitism/acne. Contraception mandatory (teratogenic risk). Do not use in pregnancy.</p>
          </Section>

          <Section title="Metformin" value={secMetformin} onChange={setSecMetformin} accent="teal">
            <FL label="Indication(s) for Metformin">
              <Pills options={['Insulin resistance / metabolic syndrome', 'Pre-diabetes / IFG / IGT', 'Oligomenorrhoea — to restore cycles', 'Ovulation induction adjunct', 'Pregnancy (PCOS + GDM risk)', 'BMI ≥25 with PCOS']} value={metforminIndication} onChange={setMetforminIndication} multi accent="teal" />
            </FL>
            <FL label="Metformin dose">
              <Pills options={['500 mg OD (start low)', '500 mg BD', '500 mg TDS', '1g BD (max 2.5g/day)']} value={metforminDose} onChange={setMetforminDose} accent="teal" />
            </FL>
            <p className="text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded p-2">Metformin reduces insulin resistance, improves menstrual regularity in 40–50%, and reduces GDM risk if conceived. Start low dose with meals to reduce GI side effects.</p>
          </Section>

          <Section title="Skin, Hair & Psychological" value={secSkin} onChange={setSecSkin} accent="purple">
            <FL label="Acne treatment">
              <Pills options={['Topical retinoid + antibiotic', 'Combined OCP (antiandrogen)', 'Spironolactone', 'Dermatology referral']} value={acneRx} onChange={setAcneRx} multi accent="purple" />
            </FL>
            <FL label="Hair removal options (hirsuitism)">
              <Pills options={['Eflornithine cream (Vaniqa)', 'Laser hair removal', 'Electrolysis', 'Shaving / waxing / threading', 'Eflornithine + laser combined']} value={hairRemoval} onChange={setHairRemoval} multi accent="purple" />
            </FL>
            <FL label="Androgenic alopecia treatment">
              <Pills options={['Minoxidil 2% topical', 'Anti-androgen OCP', 'Spironolactone', 'Finasteride (post-menopause only)']} value={alopeciaRx} onChange={setAlopeciaRx} multi accent="purple" />
            </FL>
            <Gate label="Psychological counselling / CBT referral?" value={psychCounselling} onChange={setPsychCounselling}>
              <p className="text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded p-2">PCOS associated with higher rates of anxiety, depression, body image concerns. CBT and peer support groups recommended. Assess EPDS/PHQ if depression suspected.</p>
            </Gate>
          </Section>

          <Section title="Endometrial Protection" value={secEndometrial} onChange={setSecEndometrial} accent="red">
            <FL label="Endometrial thickness on USG" sub="mm">
              <input type="number" value={endometrialThickness} onChange={e => setEndometrialThickness(e.target.value)} className={inp} />
              {Number(endometrialThickness) >= 12 && <span className="text-xs text-red-700 font-semibold mt-0.5 block">Thick endometrium — ensure regular withdrawal bleeds / consider biopsy</span>}
            </FL>
            <FL label="Withdrawal bleed frequency" sub="per year">
              <input type="number" value={withdrawalBleedFreq} onChange={e => setWithdrawalBleedFreq(e.target.value)} className={inp} />
              {Number(withdrawalBleedFreq) < 4 && withdrawalBleedFreq && (
                <span className="text-xs text-orange-700 font-semibold mt-0.5 block">Less than 4/year — endometrial hyperplasia risk increased</span>
              )}
            </FL>
            <Gate label="Endometrial biopsy needed?" value={endometrialBiopsy} onChange={setEndometrialBiopsy}>
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">Biopsy if endometrium &gt;12mm, irregular thickening, or &gt;1 year amenorrhoea without induced bleeds.</p>
            </Gate>
          </Section>
        </div>
      )

      case 5: return (
        <div className="space-y-5">
          <Section title="Fertility & Ovulation Induction" value={secFertility} onChange={setSecFertility} accent="violet">
            <FL label="Fertility desire">
              <Pills options={['Actively trying to conceive', 'Planning in future', 'Not considering fertility now', 'Contraception needed']} value={fertilityDesire} onChange={setFertilityDesire} accent="violet" />
            </FL>

            {(fertilityDesire === 'Actively trying to conceive' || fertilityDesire === 'Planning in future') && (
              <>
                <Gate label="Partner semen analysis done?" value={partnerSemen} onChange={setPartnerSemen}>
                  <FL label="Semen analysis result">
                    <Pills options={['Normal', 'Oligospermia', 'Asthenozoospermia', 'Azoospermia', 'OAT (oligoasthenoteratozoospermia)']} value={partnerSemenResult} onChange={setPartnerSemenResult} accent="violet" />
                  </FL>
                </Gate>

                <FL label="Ovulation induction method(s)">
                  <Pills options={['Letrozole 2.5–5 mg (days 2–6) — first-line', 'Clomiphene citrate 50–150 mg (days 2–6)', 'Metformin alone (mild PCOS)', 'Gonadotropins (FSH injections) — second-line', 'Combined Clomiphene + Metformin']} value={ovulationInduction} onChange={setOvulationInduction} multi accent="violet" />
                </FL>

                {ovulationInduction.some(o => o.includes('Letrozole')) && (
                  <FL label="Letrozole details">
                    <input value={letrozoleDetails} onChange={e => setLetrozoleDetails(e.target.value)} placeholder="e.g. Letrozole 2.5mg days 2–6, follicle tracking at day 12, trigger when follicle ≥18mm" className={inp} />
                  </FL>
                )}
                {ovulationInduction.some(o => o.includes('Clomiphene')) && (
                  <FL label="Clomiphene details">
                    <input value={clomipheneDetails} onChange={e => setClomipheneDetails(e.target.value)} placeholder="e.g. CC 50mg days 2–6, increase by 50mg if no response (max 150mg), max 6 cycles" className={inp} />
                  </FL>
                )}
                {ovulationInduction.some(o => o.includes('Gonadotropins')) && (
                  <FL label="Gonadotropin protocol">
                    <input value={gonadotropins} onChange={e => setGonadotropins(e.target.value)} placeholder="e.g. FSH 75IU daily, low-dose step-up, follicle tracking q2-3 days" className={inp} />
                  </FL>
                )}

                <Gate label="Laparoscopic ovarian drilling (LOD) considered?" value={laparoscopicDrilling} onChange={setLaparoscopicDrilling}>
                  <FL label="LOD details / indication">
                    <input value={drillingDetails} onChange={e => setDrillingDetails(e.target.value)} placeholder="e.g. CC-resistant PCOS, unilateral 4 punctures, alternative to gonadotropins" className={inp} />
                  </FL>
                </Gate>

                <Gate label="IUI planned?" value={iuiPlanned} onChange={setIuiPlanned} />
                <Gate label="IVF considered?" value={ivfConsidered} onChange={setIvfConsidered}>
                  <Gate label="OHSS risk counselled?" value={ohssRisk} onChange={setOhssRisk}>
                    <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                      PCOS has high OHSS risk with gonadotropins / IVF. Consider GnRH antagonist protocol + freeze-all strategy. Avoid hCG trigger if OHSS risk — use GnRH agonist trigger.
                    </p>
                  </Gate>
                </Gate>

                <Gate label="Fertility specialist referral made?" value={fertilityReferral} onChange={setFertilityReferral} />
              </>
            )}
          </Section>

          <Section title="Long-term Health Risks" value={longTermRisks.length > 0 ? 'Yes' : ''} onChange={() => {}} accent="red">
            <FL label="Long-term risks counselled">
              <Pills options={[
                'Type 2 DM (5–10× risk)',
                'Cardiovascular disease',
                'Metabolic syndrome',
                'Endometrial cancer (anovulation → unopposed oestrogen)',
                'Obstructive sleep apnoea',
                'Depression / anxiety',
                'Gestational DM if pregnant',
                'Pre-eclampsia if pregnant',
              ]} value={longTermRisks} onChange={setLongTermRisks} multi accent="red" />
            </FL>
          </Section>

          <div>
            <FL label="Overall Plan Notes">
              <textarea value={planNotes} onChange={e => setPlanNotes(e.target.value)} rows={4} className={ta} placeholder="Summary of management, follow-up schedule, annual screening plan..." />
            </FL>
          </div>
        </div>
      )

      default: return null
    }
  }

  const headerBadge = useMemo(() => {
    if (pcosDiagnosis) return { label: `Phenotype ${pcosDiagnosis.phenotype?.charAt(0)}`, color: 'bg-violet-600 text-white' }
    if (metabolicSyndrome) return { label: 'METABOLIC SX', color: 'bg-orange-500 text-white' }
    if (rotterdamCriteria.length === 1) return { label: '1/3 CRITERIA', color: 'bg-amber-500 text-white' }
    return null
  }, [pcosDiagnosis, metabolicSyndrome, rotterdamCriteria])

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-violet-700 to-purple-700 px-6 py-5 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Sun size={22} />
            </div>
            <div>
              <p className="text-violet-200 text-xs font-medium uppercase tracking-wider">OBG Assessment</p>
              <h1 className="text-xl font-bold">PCOS Assessment</h1>
              <p className="text-violet-200 text-xs mt-0.5">Rotterdam Criteria · Metabolic Workup</p>
            </div>
          </div>
          <div className="text-right space-y-1">
            {headerBadge && <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-lg ${headerBadge.color}`}>{headerBadge.label}</span>}
            {rotterdamCriteria.length > 0 && <p className="text-violet-200 text-xs">{rotterdamCriteria.length}/3 criteria</p>}
          </div>
        </div>
        <div className="mt-4 flex gap-1">
          {STAGES.map((s, i) => (
            <button key={s} type="button" onClick={() => setStage(i)}
              className={`flex-1 h-1.5 rounded-full transition-all ${i === stage ? 'bg-white' : i < stage ? 'bg-violet-300' : 'bg-white/20'}`} />
          ))}
        </div>
        <p className="text-violet-200 text-xs mt-1.5">{stage + 1} / {STAGES.length} — {STAGES[stage]}</p>
      </div>

      <div className="flex border-b border-gray-100 overflow-x-auto bg-gray-50/60">
        {STAGES.map((s, i) => (
          <button key={s} type="button" onClick={() => setStage(i)}
            className={`px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
              i === stage ? 'border-violet-500 text-violet-600' : 'border-transparent text-gray-400 hover:text-gray-600'
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
            className={`${navBtn} bg-violet-600 text-white hover:bg-violet-700`}>
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button type="button" onClick={handleSave} disabled={saving}
            className={`${navBtn} bg-violet-700 text-white hover:bg-violet-800 disabled:opacity-60`}>
            {saving ? 'Saving…' : 'Save Assessment'}
          </button>
        )}
      </div>
    </div>
  )
}
