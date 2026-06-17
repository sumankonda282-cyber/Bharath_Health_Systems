/**
 * @shared-pool
 * @category obg
 * @tags infertility, subfertility, IVF, ovulation, tubal, semen-analysis, ART
 * Portal-agnostic. Safe to surface in any portal's assessment search.
 */

import React, { useState, useMemo } from 'react'
import { Users, ChevronRight, ChevronLeft, Lock, AlertTriangle } from 'lucide-react'
import api from '../../../api/client'

function Section({ title, value, onChange, children, accent = 'cyan' }) {
  const A = {
    cyan:   { border: 'border-cyan-200',   bg: 'bg-cyan-50/40',   div: 'border-cyan-100',   btn: 'bg-cyan-600 text-white border-cyan-600' },
    blue:   { border: 'border-blue-200',   bg: 'bg-blue-50/40',   div: 'border-blue-100',   btn: 'bg-blue-500 text-white border-blue-500' },
    orange: { border: 'border-orange-200', bg: 'bg-orange-50/40', div: 'border-orange-100', btn: 'bg-orange-500 text-white border-orange-500' },
    red:    { border: 'border-red-200',    bg: 'bg-red-50/40',    div: 'border-red-100',    btn: 'bg-red-500 text-white border-red-500' },
    amber:  { border: 'border-amber-200',  bg: 'bg-amber-50/40',  div: 'border-amber-100',  btn: 'bg-amber-500 text-white border-amber-500' },
    purple: { border: 'border-purple-200', bg: 'bg-purple-50/40', div: 'border-purple-100', btn: 'bg-purple-600 text-white border-purple-600' },
    green:  { border: 'border-green-200',  bg: 'bg-green-50/40',  div: 'border-green-100',  btn: 'bg-green-600 text-white border-green-600' },
    teal:   { border: 'border-teal-200',   bg: 'bg-teal-50/40',   div: 'border-teal-100',   btn: 'bg-teal-500 text-white border-teal-500' },
  }
  const a = A[accent] || A.cyan
  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${value === 'Yes' ? a.border : value === 'No' ? 'border-gray-100' : 'border-gray-200'}`}>
      <div className={`flex items-center justify-between px-4 py-3 ${value === 'Yes' ? a.bg : 'bg-gray-50/60'}`}>
        <span className={`text-sm font-semibold ${value === 'No' ? 'text-gray-400' : 'text-gray-700'}`}>{title}</span>
        <div className="flex gap-1.5 shrink-0">
          <button type="button" onClick={() => onChange(v => v === 'Yes' ? '' : 'Yes')}
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all ${value === 'Yes' ? a.btn : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>Applicable</button>
          <button type="button" onClick={() => onChange(v => v === 'No' ? '' : 'No')}
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all ${value === 'No' ? 'bg-gray-400 text-white border-gray-400' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>N/A</button>
        </div>
      </div>
      {value === 'Yes' && <div className={`px-4 py-4 border-t ${a.div} space-y-4`}>{children}</div>}
      {value === 'No' && (<div className="px-4 py-2 border-t border-gray-100 flex items-center gap-1.5"><Lock size={10} className="text-gray-300" /><p className="text-xs text-gray-400 italic">Not applicable — section locked</p></div>)}
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
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all ${value === opt ? (opt === 'Yes' ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-gray-400 text-white border-gray-400') : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>{opt}</button>
          ))}
        </div>
      </div>
      {value === 'Yes' && <div className="pl-4 border-l-2 border-cyan-200 space-y-3">{children}</div>}
    </div>
  )
}

function Pills({ options, value, onChange, multi = false, accent = 'cyan' }) {
  const colors = {
    cyan:   { on: 'bg-cyan-600 text-white border-cyan-600',     off: 'bg-white text-gray-600 border-gray-200 hover:border-cyan-300' },
    blue:   { on: 'bg-blue-500 text-white border-blue-500',     off: 'bg-white text-gray-600 border-gray-200 hover:border-blue-300' },
    orange: { on: 'bg-orange-500 text-white border-orange-500', off: 'bg-white text-gray-600 border-gray-200 hover:border-orange-300' },
    red:    { on: 'bg-red-500 text-white border-red-500',       off: 'bg-white text-gray-600 border-gray-200 hover:border-red-300' },
    purple: { on: 'bg-purple-600 text-white border-purple-600', off: 'bg-white text-gray-600 border-gray-200 hover:border-purple-300' },
    green:  { on: 'bg-green-600 text-white border-green-600',   off: 'bg-white text-gray-600 border-gray-200 hover:border-green-300' },
    amber:  { on: 'bg-amber-500 text-white border-amber-500',   off: 'bg-white text-gray-600 border-gray-200 hover:border-amber-300' },
  }
  const c = colors[accent] || colors.cyan
  const toggle = opt => {
    if (multi) onChange(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt])
    else onChange(prev => prev === opt ? '' : opt)
  }
  const isOn = opt => multi ? value.includes(opt) : value === opt
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => toggle(opt)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${isOn(opt) ? c.on : c.off}`}>{opt}</button>
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

const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300'
const ta  = `${inp} resize-none`
const STAGES = ['History', 'Ovarian Reserve', 'Uterine & Tubal', 'Male Factor', 'Investigations', 'ART Plan']

export default function FemaleInfertilityForm({ patientId, encounterId, onSaved }) {
  const [stage, setStage] = useState(0)
  const [saving, setSaving] = useState(false)

  // Stage 1
  const [visitDate, setVisitDate]           = useState('')
  const [age, setAge]                       = useState('')
  const [partnerAge, setPartnerAge]         = useState('')
  const [bmi, setBmi]                       = useState('')
  const [infertilityType, setInfertilityType] = useState('')
  const [durationTrying, setDurationTrying] = useState('')
  const [relationshipStatus, setRelationshipStatus] = useState('')
  const [coitalFrequency, setCoitalFrequency] = useState('')
  const [lubricantUse, setLubricantUse]     = useState('')
  const [cycleRegularity, setCycleRegularity] = useState('')
  const [cycleLength, setCycleLength]       = useState('')
  const [ovulationSigns, setOvulationSigns] = useState([])
  const [lmp, setLmp]                       = useState('')
  const [menarche, setMenarche]             = useState('')

  const [secObsHx, setSecObsHx]             = useState('')
  const [previousPregnancies, setPreviousPregnancies] = useState('')
  const [previousLiveBirth, setPreviousLiveBirth] = useState('')
  const [miscarriages, setMiscarriages]     = useState('')
  const [ectopic, setEctopic]               = useState('')
  const [terminations, setTerminations]     = useState('')
  const [prevART, setPrevART]               = useState('')
  const [prevARTDetails, setPrevARTDetails] = useState('')

  const [secGynHx, setSecGynHx]             = useState('')
  const [endometriosis, setEndometriosis]   = useState('')
  const [endoStage, setEndoStage]           = useState('')
  const [pcosHx, setPcosHx]                 = useState('')
  const [fibroidsHx, setFibroidsHx]         = useState('')
  const [tubeSurgery, setTubeSurgery]       = useState('')
  const [pelvicInfection, setPelvicInfection] = useState('')
  const [pidEpisodes, setPidEpisodes]       = useState('')
  const [appendicectomy, setAppendicectomy] = useState('')
  const [abdominalSurgery, setAbdominalSurgery] = useState('')
  const [cervicalSmear, setCervicalSmear]   = useState('')
  const [contraceptionHx, setContraceptionHx] = useState('')
  const [contraceptionStopped, setContraceptionStopped] = useState('')

  const [secMedHx, setSecMedHx]             = useState('')
  const [thyroid, setThyroid]               = useState('')
  const [dm, setDm]                         = useState('')
  const [autoimmune, setAutoimmune]         = useState('')
  const [hyperprolactin, setHyperprolactin] = useState('')
  const [medications, setMedications]       = useState([])
  const [smoking, setSmoking]               = useState('')
  const [alcohol, setAlcohol]               = useState('')
  const [supplements, setSupplements]       = useState([])

  // Stage 2: Ovarian Reserve
  const [secOvarian, setSecOvarian]         = useState('')
  const [amh, setAmh]                       = useState('')
  const [antralFollicleCount, setAntralFollicleCount] = useState('')
  const [fshDay3, setFshDay3]               = useState('')
  const [lhDay3, setLhDay3]                 = useState('')
  const [e2Day3, setE2Day3]                 = useState('')
  const [clomipheneChallenge, setClomipheneChallenge] = useState('')
  const [ovarianReserveInterpretation, setOvarianReserveInterpretation] = useState('')
  const [prematureOvarian, setPrematureOvarian] = useState('')
  const [poorResponder, setPoorResponder]   = useState('')

  // Stage 3: Uterine & Tubal
  const [secUterine, setSecUterine]         = useState('')
  const [uterineCavity, setUterineCavity]   = useState('')
  const [endometrialPathology, setEndometrialPathology] = useState([])
  const [muellerianAnomaly, setMuellerianAnomaly] = useState('')
  const [anomalyType, setAnomalyType]       = useState('')
  const [ashermansSyndrome, setAshermansSyndrome] = useState('')
  const [fibroidsUterine, setFibroidsUterine] = useState('')
  const [fibroidLocation, setFibroidLocation] = useState([])

  const [secTubal, setSecTubal]             = useState('')
  const [hsg, setHsg]                       = useState('')
  const [hsgResult, setHsgResult]           = useState('')
  const [laparoscopyTubal, setLaparoscopyTubal] = useState('')
  const [tubalResult, setTubalResult]       = useState('')
  const [hydrosalpinx, setHydrosalpinx]     = useState('')
  const [hydrosalpinxTreatment, setHydrosalpinxTreatment] = useState('')

  // Stage 4: Male Factor
  const [secMale, setSecMale]               = useState('')
  const [semenAnalysisDone, setSemenAnalysisDone] = useState('')
  const [volume, setVolume]                 = useState('')
  const [concentration, setConcentration]   = useState('')
  const [motility, setMotility]             = useState('')
  const [morphology, setMorphology]         = useState('')
  const [semenResult, setSemenResult]       = useState('')
  const [partnerUrologyRef, setPartnerUrologyRef] = useState('')
  const [antispermAb, setAntispermAb]       = useState('')
  const [azoo, setAzoo]                     = useState('')
  const [azooType, setAzooType]             = useState('')
  const [testicular, setTesticular]         = useState('')
  const [donorSperm, setDonorSperm]         = useState('')

  // Stage 5: Investigations
  const [secInvest, setSecInvest]           = useState('')
  const [rubellaImmunity, setRubellaImmunity] = useState('')
  const [tsh, setTsh]                       = useState('')
  const [prolactin, setProlactin]           = useState('')
  const [progesteroneDay21, setProgesteroneDay21] = useState('')
  const [karyotype, setKaryotype]           = useState('')
  const [thrombophilia, setThrombophilia]   = useState('')
  const [antiphospholipid, setAntiphospholipid] = useState('')
  const [hbsag, setHbsag]                   = useState('')
  const [hiv, setHiv]                       = useState('')
  const [hcv, setHcv]                       = useState('')
  const [hba1c, setHba1c]                   = useState('')

  // Stage 6: ART Plan
  const [secART, setSecART]                 = useState('')
  const [diagnosedCause, setDiagnosedCause] = useState([])
  const [artOption, setArtOption]           = useState('')
  const [iuiDetails, setIuiDetails]         = useState('')
  const [ivfProtocol, setIvfProtocol]       = useState('')
  const [icsiIndicated, setIcsiIndicated]   = useState('')
  const [icsiReason, setIcsiReason]         = useState('')
  const [pgta, setPgta]                     = useState('')
  const [frozenEmbryoTransfer, setFrozenEmbryoTransfer] = useState('')
  const [donorEgg, setDonorEgg]             = useState('')
  const [surrogacy, setSurrogacy]           = useState('')
  const [adoption, setAdoption]             = useState('')
  const [counsellingProvided, setCounsellingProvided] = useState('')
  const [legalCounselling, setLegalCounselling] = useState('')
  const [fertAidGovt, setFertAidGovt]       = useState('')
  const [planNotes, setPlanNotes]           = useState('')

  const programmaticAlerts = useMemo(() => {
    const a = []
    if (Number(age) >= 35 && !artOption) a.push('Age ≥35 — expedite investigations; reduce time to ART if no conception by 6 months of trying')
    if (Number(age) >= 38) a.push('Age ≥38 — consider ART without delay. Ovarian reserve likely declining significantly')
    if (hydrosalpinx === 'Yes' && !hydrosalpinxTreatment) a.push('Hydrosalpinx present — salpingectomy/clipping before IVF recommended (improves implantation rates by 40%)')
    if (ashermansSyndrome === 'Yes') a.push('Asherman\'s syndrome — hysteroscopic adhesiolysis needed before ART')
    if (prematureOvarian === 'Yes') a.push('Premature ovarian insufficiency — natural conception unlikely; donor egg IVF counselling required')
    return a
  }, [age, artOption, hydrosalpinx, hydrosalpinxTreatment, ashermansSyndrome, prematureOvarian])

  async function handleSave() {
    setSaving(true)
    try {
      await api.post('/assessments', {
        patientId, encounterId,
        formType: 'female_infertility_assessment',
        data: {
          visitDate, age, partnerAge, bmi, infertilityType, durationTrying, coitalFrequency, cycleRegularity, cycleLength, ovulationSigns, lmp,
          obsHx: { previous: previousPregnancies, liveBirth: previousLiveBirth, miscarriages, ectopic, terminations, prevART, prevARTDetails },
          gynHx: { endometriosis, endoStage, pcosHx, fibroidsHx, tubeSurgery, pelvicInfection, pidEpisodes, appendicectomy, abdominalSurgery, contraceptionHx, contraceptionStopped },
          medHx: { thyroid, dm, autoimmune, hyperprolactin, medications, smoking, alcohol, supplements },
          ovarianReserve: { amh, afc: antralFollicleCount, fshDay3, lhDay3, e2Day3, clomipheneChallenge, interpretation: ovarianReserveInterpretation, poi: prematureOvarian, poorResponder },
          uterine: { cavity: uterineCavity, pathology: endometrialPathology, muellerianAnomaly, anomalyType, ashermans: ashermansSyndrome, fibroids: fibroidsUterine, fibroidLocation },
          tubal: { hsg, hsgResult, laparoscopy: laparoscopyTubal, tubalResult, hydrosalpinx, hydrosalpinxTreatment },
          male: { semenDone: semenAnalysisDone, volume, concentration, motility, morphology, result: semenResult, urologyRef: partnerUrologyRef, antispermAb, azoospermia: azoo, azooType, testicular, donorSperm },
          investigations: { rubella: rubellaImmunity, tsh, prolactin, progDay21: progesteroneDay21, karyotype, thrombophilia, antiphospholipid, hbsag, hiv, hcv, hba1c },
          art: { diagnosedCause, option: artOption, iuiDetails, ivfProtocol, icsi: icsiIndicated, icsiReason, pgta, frozenEmbryoTransfer, donorEgg, surrogacy, adoption, counselling: counsellingProvided, legal: legalCounselling, govtAid: fertAidGovt },
          programmaticAlerts,
          planNotes,
        }
      })
      onSaved?.()
    } catch (err) { console.error(err) } finally { setSaving(false) }
  }

  const navBtn = 'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all'

  function renderStage() {
    switch (stage) {
      case 0: return (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <FL label="Visit Date"><input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} className={inp} /></FL>
            <FL label="Female age" sub="years"><input type="number" value={age} onChange={e => setAge(e.target.value)} className={inp} /></FL>
            <FL label="Partner age" sub="years"><input type="number" value={partnerAge} onChange={e => setPartnerAge(e.target.value)} className={inp} /></FL>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FL label="BMI" sub="kg/m²"><input type="number" value={bmi} onChange={e => setBmi(e.target.value)} step="0.1" className={inp} /></FL>
            <FL label="Duration trying to conceive">
              <input value={durationTrying} onChange={e => setDurationTrying(e.target.value)} placeholder="e.g. 18 months" className={inp} />
              {Number(durationTrying) >= 12 || durationTrying.includes('year') ? null : null}
            </FL>
          </div>
          <FL label="Infertility type">
            <Pills options={['Primary (no previous pregnancy)', 'Secondary (previous pregnancy, now subfertile)']} value={infertilityType} onChange={setInfertilityType} />
          </FL>
          <div className="grid grid-cols-2 gap-4">
            <FL label="Coital frequency">
              <Pills options={['Daily', '2–3×/week (optimal)', 'Weekly', 'Infrequent', 'Using ovulation kits']} value={coitalFrequency} onChange={setCoitalFrequency} />
            </FL>
            <Gate label="Lubricant use (spermicidal)?">
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">Some lubricants impair sperm motility. Use Conceive Plus or Pre-Seed if needed.</p>
            </Gate>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FL label="Cycle regularity">
              <Pills options={['Regular (26–34 days)', 'Irregular', 'Oligomenorrhoea', 'Amenorrhoea']} value={cycleRegularity} onChange={setCycleRegularity} />
            </FL>
            <FL label="Average cycle length" sub="days"><input type="number" value={cycleLength} onChange={e => setCycleLength(e.target.value)} className={inp} /></FL>
          </div>
          <FL label="Ovulation signs noticed">
            <Pills options={['Mid-cycle pain (Mittelschmerz)', 'LH surge on ovulation kit', 'Cervical mucus changes', 'Breast tenderness', 'Basal body temperature rise', 'No signs']} value={ovulationSigns} onChange={setOvulationSigns} multi />
          </FL>
          <FL label="LMP"><input type="date" value={lmp} onChange={e => setLmp(e.target.value)} className={inp} /></FL>

          {Number(age) >= 35 && (
            <div className="p-3 bg-orange-50 border border-orange-300 rounded-xl text-xs text-orange-700 font-semibold flex items-center gap-2">
              <AlertTriangle size={14} /> Age ≥35 — investigations and referral should not be delayed beyond 6 months of trying.
            </div>
          )}

          <Section title="Previous Obstetric History" value={secObsHx} onChange={setSecObsHx} accent="blue">
            <div className="grid grid-cols-2 gap-4">
              <FL label="Previous pregnancies" sub="(number)"><input type="number" value={previousPregnancies} onChange={e => setPreviousPregnancies(e.target.value)} className={inp} /></FL>
              <FL label="Previous live births"><input type="number" value={previousLiveBirth} onChange={e => setPreviousLiveBirth(e.target.value)} className={inp} /></FL>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FL label="Miscarriages"><input type="number" value={miscarriages} onChange={e => setMiscarriages(e.target.value)} className={inp} /></FL>
              <FL label="Ectopic pregnancies"><input type="number" value={ectopic} onChange={e => setEctopic(e.target.value)} className={inp} /></FL>
              <FL label="Terminations (TOP)"><input type="number" value={terminations} onChange={e => setTerminations(e.target.value)} className={inp} /></FL>
            </div>
            <Gate label="Previous ART / fertility treatment?" value={prevART} onChange={setPrevART}>
              <FL label="ART details / outcomes">
                <textarea value={prevARTDetails} onChange={e => setPrevARTDetails(e.target.value)} rows={2} className={ta} placeholder="IUI cycles, IVF cycles, embryo transfers, outcomes..." />
              </FL>
            </Gate>
          </Section>

          <Section title="Gynaecological History" value={secGynHx} onChange={setSecGynHx} accent="cyan">
            <Gate label="Endometriosis?" value={endometriosis} onChange={setEndometriosis}>
              <FL label="Stage (rASRM)">
                <Pills options={['Stage I', 'Stage II', 'Stage III', 'Stage IV (severe)', 'DIE (deep infiltrating)']} value={endoStage} onChange={setEndoStage} accent="cyan" />
              </FL>
            </Gate>
            <Gate label="PCOS?" value={pcosHx} onChange={setPcosHx} />
            <Gate label="Uterine fibroids?" value={fibroidsHx} onChange={setFibroidsHx} />
            <Gate label="Tubal surgery / ligation?" value={tubeSurgery} onChange={setTubeSurgery} />
            <Gate label="Previous PID / pelvic infection?" value={pelvicInfection} onChange={setPelvicInfection}>
              <FL label="Episodes / details"><input value={pidEpisodes} onChange={e => setPidEpisodes(e.target.value)} className={inp} /></FL>
            </Gate>
            <Gate label="Appendicectomy?" value={appendicectomy} onChange={setAppendicectomy} />
            <Gate label="Other abdominal surgery?" value={abdominalSurgery} onChange={setAbdominalSurgery} />
          </Section>

          <Section title="Medical & Social History" value={secMedHx} onChange={setSecMedHx} accent="teal">
            <Gate label="Thyroid disease?" value={thyroid} onChange={setThyroid} />
            <Gate label="Diabetes?" value={dm} onChange={setDm} />
            <Gate label="Autoimmune disease?" value={autoimmune} onChange={setAutoimmune} />
            <Gate label="Hyperprolactinaemia?" value={hyperprolactin} onChange={setHyperprolactin} />
            <FL label="Medications affecting fertility">
              <Pills options={['None', 'NSAIDs (impair ovulation)', 'Antipsychotics', 'Chemotherapy history', 'Methotrexate (folic acid antagonist)']} value={medications} onChange={setMedications} multi accent="teal" />
            </FL>
            <div className="grid grid-cols-2 gap-4">
              <FL label="Smoking">
                <Pills options={['Non-smoker', 'Ex-smoker', 'Active smoker']} value={smoking} onChange={setSmoking} accent={smoking === 'Active smoker' ? 'red' : 'teal'} />
              </FL>
              <FL label="Alcohol">
                <Pills options={['None', 'Occasional', 'Regular', 'Heavy']} value={alcohol} onChange={setAlcohol} />
              </FL>
            </div>
            <FL label="Supplements currently taking">
              <Pills options={['Folic acid 400mcg (standard)', 'Folic acid 5mg (if on anticonvulsants/BMI>30)', 'Vitamin D', 'CoQ10 (antioxidant)', 'DHEA', 'Omega 3', 'None']} value={supplements} onChange={setSupplements} multi accent="teal" />
            </FL>
          </Section>
        </div>
      )

      case 1: return (
        <div className="space-y-5">
          <Section title="Ovarian Reserve Assessment" value={secOvarian} onChange={setSecOvarian} accent="cyan">
            <div className="grid grid-cols-3 gap-4">
              <FL label="AMH" sub="pmol/L">
                <input type="number" value={amh} onChange={e => setAmh(e.target.value)} step="0.1" className={inp} />
                {(() => {
                  const v = Number(amh)
                  if (v < 3.6) return <span className="text-xs text-red-700 font-bold mt-0.5 block">Low reserve (&lt;3.6)</span>
                  if (v < 7.0) return <span className="text-xs text-orange-700 font-semibold mt-0.5 block">Low-normal</span>
                  if (v > 30) return <span className="text-xs text-purple-700 font-semibold mt-0.5 block">Elevated — PCOS / OHSS risk</span>
                  return <span className="text-xs text-green-700 mt-0.5 block">Normal range</span>
                })()}
              </FL>
              <FL label="Antral follicle count" sub="total both ovaries">
                <input type="number" value={antralFollicleCount} onChange={e => setAntralFollicleCount(e.target.value)} className={inp} />
                {Number(antralFollicleCount) < 4 && antralFollicleCount && <span className="text-xs text-red-700 font-bold mt-0.5 block">Very low (&lt;4) — poor response</span>}
                {Number(antralFollicleCount) >= 4 && Number(antralFollicleCount) <= 7 && <span className="text-xs text-orange-700 font-semibold mt-0.5 block">Low — poor/normal response</span>}
                {Number(antralFollicleCount) > 20 && <span className="text-xs text-purple-700 font-semibold mt-0.5 block">High — OHSS risk</span>}
              </FL>
              <FL label="Day 3 FSH" sub="IU/L">
                <input type="number" value={fshDay3} onChange={e => setFshDay3(e.target.value)} step="0.1" className={inp} />
                {Number(fshDay3) > 10 && <span className="text-xs text-orange-700 font-semibold mt-0.5 block">Elevated — poor reserve</span>}
                {Number(fshDay3) > 20 && <span className="text-xs text-red-700 font-bold mt-0.5 block">Very high — POI?</span>}
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FL label="Day 3 LH" sub="IU/L"><input type="number" value={lhDay3} onChange={e => setLhDay3(e.target.value)} step="0.1" className={inp} /></FL>
              <FL label="Day 3 Oestradiol (E2)" sub="pmol/L"><input type="number" value={e2Day3} onChange={e => setE2Day3(e.target.value)} className={inp} /></FL>
            </div>
            <FL label="Ovarian reserve interpretation">
              <Pills options={['Excellent / high reserve', 'Normal reserve', 'Low reserve', 'Very low / predicted poor responder', 'POI (premature ovarian insufficiency)']} value={ovarianReserveInterpretation} onChange={setOvarianReserveInterpretation} accent="cyan" />
            </FL>
            <Gate label="POI / premature ovarian insufficiency?" value={prematureOvarian} onChange={setPrematureOvarian}>
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">POI: FSH &gt;25 IU/L ×2, age &lt;40. Natural conception unlikely. Donor egg IVF is most effective option. HRT for bone/cardiovascular protection.</p>
            </Gate>
            <Gate label="Expected poor ovarian responder (POSEIDON/Bologna)?" value={poorResponder} onChange={setPoorResponder} />
          </Section>
        </div>
      )

      case 2: return (
        <div className="space-y-5">
          <Section title="Uterine Assessment" value={secUterine} onChange={setSecUterine} accent="purple">
            <FL label="Uterine cavity (TVUS / hysteroscopy)">
              <Pills options={['Normal', 'Submucosal fibroid', 'Endometrial polyp', 'Intrauterine adhesions (Asherman\'s)', 'Müllerian anomaly', 'Thin endometrium (&lt;7mm)', 'Not assessed']} value={uterineCavity} onChange={setUterineCavity} accent="purple" />
            </FL>
            <Gate label="Endometrial pathology?" value={endometrialPathology.length > 0 ? 'Yes' : ''} onChange={() => {}}>
              <FL label="Type">
                <Pills options={['Polyp', 'Hyperplasia', 'Endometritis (chronic)', 'Poor endometrial receptivity']} value={endometrialPathology} onChange={setEndometrialPathology} multi accent="purple" />
              </FL>
            </Gate>
            <Gate label="Müllerian / congenital uterine anomaly?" value={muellerianAnomaly} onChange={setMuellerianAnomaly}>
              <FL label="Type">
                <Pills options={['Arcuate uterus', 'Subseptate uterus', 'Septate uterus', 'Bicornuate uterus', 'Unicornuate uterus', 'Didelphic uterus', 'Hypoplastic uterus']} value={anomalyType} onChange={setAnomalyType} accent="purple" />
              </FL>
            </Gate>
            <Gate label="Intrauterine adhesions (Asherman's syndrome)?" value={ashermansSyndrome} onChange={setAshermansSyndrome}>
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">Asherman's — hysteroscopic adhesiolysis required before embryo transfer. Often follows D&C, endometritis, or uterine surgery.</p>
            </Gate>
            <Gate label="Intramural / submucosal fibroids?" value={fibroidsUterine} onChange={setFibroidsUterine}>
              <FL label="Location">
                <Pills options={['Submucosal (cavity-distorting) — impact on IVF', 'Intramural ≥4cm — consider myomectomy', 'Subserosal — minimal impact']} value={fibroidLocation} onChange={setFibroidLocation} multi accent="purple" />
              </FL>
            </Gate>
          </Section>

          <Section title="Tubal Patency Assessment" value={secTubal} onChange={setSecTubal} accent="blue">
            <Gate label="HSG (hysterosalpingogram) performed?" value={hsg} onChange={setHsg}>
              <FL label="HSG result">
                <Pills options={['Both tubes patent', 'Left tube blocked', 'Right tube blocked', 'Bilateral block', 'Hydrosalpinx (unilateral)', 'Hydrosalpinx (bilateral)', 'Uterine abnormality noted']} value={hsgResult} onChange={setHsgResult} accent={hsgResult?.includes('block') || hsgResult?.includes('Hydro') ? 'red' : 'blue'} />
              </FL>
            </Gate>
            <Gate label="Laparoscopy with dye test performed?" value={laparoscopyTubal} onChange={setLaparoscopyTubal}>
              <FL label="Laparoscopy result">
                <Pills options={['Both tubes patent with spill', 'Unilateral block', 'Bilateral block', 'Hydrosalpinx seen', 'Pelvic adhesions', 'Endometriosis found']} value={tubalResult} onChange={setTubalResult} accent="blue" />
              </FL>
            </Gate>
            <Gate label="Hydrosalpinx present?" value={hydrosalpinx} onChange={setHydrosalpinx} accent="red">
              <FL label="Treatment plan for hydrosalpinx before IVF">
                <Pills options={['Laparoscopic salpingectomy (preferred)', 'Tubal occlusion / clipping', 'Aspiration at egg retrieval (temporary)', 'Expectant — not proceeding to IVF']} value={hydrosalpinxTreatment} onChange={setHydrosalpinxTreatment} accent="red" />
              </FL>
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">Hydrosalpinx reduces IVF success by up to 50%. Salpingectomy or proximal occlusion before IVF strongly recommended.</p>
            </Gate>
          </Section>
        </div>
      )

      case 3: return (
        <div className="space-y-5">
          <Section title="Male Factor Assessment" value={secMale} onChange={setSecMale} accent="blue">
            <Gate label="Semen analysis performed?" value={semenAnalysisDone} onChange={setSemenAnalysisDone}>
              <div className="grid grid-cols-2 gap-4">
                <FL label="Volume" sub="mL (normal ≥1.4)"><input type="number" value={volume} onChange={e => setVolume(e.target.value)} step="0.1" className={inp} /></FL>
                <FL label="Concentration" sub="×10⁶/mL (normal ≥16)">
                  <input type="number" value={concentration} onChange={e => setConcentration(e.target.value)} className={inp} />
                  {Number(concentration) < 16 && concentration && <span className="text-xs text-red-700 font-semibold mt-0.5 block">Low — oligospermia</span>}
                  {concentration === '0' && <span className="text-xs text-red-700 font-bold mt-0.5 block">Azoospermia</span>}
                </FL>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FL label="Total motility" sub="% (normal ≥42%)">
                  <input type="number" value={motility} onChange={e => setMotility(e.target.value)} className={inp} />
                  {Number(motility) < 42 && motility && <span className="text-xs text-orange-700 font-semibold mt-0.5 block">Asthenozoospermia</span>}
                </FL>
                <FL label="Normal morphology" sub="% (Kruger strict, normal ≥4%)">
                  <input type="number" value={morphology} onChange={e => setMorphology(e.target.value)} className={inp} />
                  {Number(morphology) < 4 && morphology && <span className="text-xs text-orange-700 font-semibold mt-0.5 block">Teratozoospermia</span>}
                </FL>
              </div>
              <FL label="Overall semen result">
                <Pills options={['Normal (WHO 2021)', 'Oligospermia', 'Asthenozoospermia', 'Teratozoospermia', 'OAT (oligo-astheno-teratozoospermia)', 'Azoospermia', 'Severe oligospermia (&lt;5M/mL)']} value={semenResult} onChange={setSemenResult} accent={['Azoospermia', 'OAT (oligo-astheno-teratozoospermia)'].includes(semenResult) ? 'red' : 'blue'} />
              </FL>
            </Gate>
            <Gate label="Anti-sperm antibodies?" value={antispermAb} onChange={setAntispermAb} />
            <Gate label="Azoospermia?" value={azoo} onChange={setAzoo}>
              <FL label="Type">
                <Pills options={['Obstructive (OA) — normal FSH', 'Non-obstructive (NOA) — elevated FSH', 'Unknown']} value={azooType} onChange={setAzooType} accent="red" />
              </FL>
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">Azoospermia: OA → PESA/TESA retrieval for ICSI. NOA → micro-TESE + ICSI (50% success). Karyotype + Y-chromosome microdeletion testing recommended.</p>
            </Gate>
            <Gate label="Testicular pathology (varicocele/undescended)?" value={testicular} onChange={setTesticular} />
            <Gate label="Partner referred to urologist / andrologist?" value={partnerUrologyRef} onChange={setPartnerUrologyRef} />
            <Gate label="Donor sperm considered?" value={donorSperm} onChange={setDonorSperm}>
              <p className="text-xs text-blue-700">Donor sperm: ensure counselling, legal consent (ICMR guidelines India). Confirm identity/religion preferences for donor matching.</p>
            </Gate>
          </Section>
        </div>
      )

      case 4: return (
        <div className="space-y-5">
          <Section title="Pre-treatment Investigations" value={secInvest} onChange={setSecInvest} accent="teal">
            <div className="grid grid-cols-3 gap-4">
              <FL label="Rubella immunity">
                <Pills options={['Immune', 'Non-immune — vaccinate', 'Not tested']} value={rubellaImmunity} onChange={setRubellaImmunity} accent={rubellaImmunity === 'Non-immune — vaccinate' ? 'orange' : 'teal'} />
              </FL>
              <FL label="TSH" sub="mIU/L">
                <input type="number" value={tsh} onChange={e => setTsh(e.target.value)} step="0.01" className={inp} />
                {Number(tsh) > 2.5 && <span className="text-xs text-orange-700 font-semibold mt-0.5 block">Target TSH &lt;2.5 before ART</span>}
              </FL>
              <FL label="Prolactin" sub="mIU/L">
                <input type="number" value={prolactin} onChange={e => setProlactin(e.target.value)} className={inp} />
                {Number(prolactin) > 700 && <span className="text-xs text-orange-700 font-semibold mt-0.5 block">Hyperprolactinaemia</span>}
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FL label="Day 21 progesterone" sub="nmol/L">
                <input type="number" value={progesteroneDay21} onChange={e => setProgesteroneDay21(e.target.value)} className={inp} />
                {Number(progesteroneDay21) < 16 && progesteroneDay21 && <span className="text-xs text-orange-700 font-semibold mt-0.5 block">&lt;16 — anovulatory cycle?</span>}
                {Number(progesteroneDay21) >= 30 && <span className="text-xs text-green-700 mt-0.5 block">Good evidence of ovulation</span>}
              </FL>
              <FL label="HbA1c" sub="%"><input type="number" value={hba1c} onChange={e => setHba1c(e.target.value)} step="0.1" className={inp} /></FL>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Gate label="Karyotype testing?" value={karyotype} onChange={setKaryotype} />
              <Gate label="Thrombophilia screen?" value={thrombophilia} onChange={setThrombophilia} />
            </div>
            <Gate label="Antiphospholipid antibodies (APS)?" value={antiphospholipid} onChange={setAntiphospholipid} />
            <FL label="Infectious disease screen">
              <Pills options={['HBsAg', 'HIV', 'HCV', 'VDRL / Syphilis', 'CMV IgG', 'Chicken pox immunity']} value={[hbsag, hiv, hcv].filter(Boolean)} onChange={() => {}} multi accent="teal" />
            </FL>
            <div className="grid grid-cols-3 gap-3">
              <FL label="HBsAg"><Pills options={['Positive', 'Negative']} value={hbsag} onChange={setHbsag} accent={hbsag === 'Positive' ? 'red' : 'teal'} /></FL>
              <FL label="HIV"><Pills options={['Positive', 'Negative']} value={hiv} onChange={setHiv} accent={hiv === 'Positive' ? 'red' : 'teal'} /></FL>
              <FL label="HCV"><Pills options={['Positive', 'Negative']} value={hcv} onChange={setHcv} accent={hcv === 'Positive' ? 'red' : 'teal'} /></FL>
            </div>
          </Section>
        </div>
      )

      case 5: return (
        <div className="space-y-5">
          {programmaticAlerts.length > 0 && (
            <div className="p-3 bg-orange-50 border-2 border-orange-400 rounded-xl">
              <div className="flex items-center gap-2 mb-1"><AlertTriangle size={14} className="text-orange-600" /><p className="text-xs font-bold text-orange-700">Clinical Alerts</p></div>
              {programmaticAlerts.map(a => <p key={a} className="text-xs text-orange-600">• {a}</p>)}
            </div>
          )}

          <Section title="Diagnosed Cause(s) & ART Plan" value={secART} onChange={setSecART} accent="cyan">
            <FL label="Diagnosed cause(s) of infertility">
              <Pills options={['Anovulation / ovulatory dysfunction', 'Diminished ovarian reserve', 'Tubal factor (bilateral)', 'Tubal factor (unilateral)', 'Uterine factor', 'Male factor', 'Endometriosis', 'Combined (multiple)', 'Unexplained infertility']} value={diagnosedCause} onChange={setDiagnosedCause} multi accent="cyan" />
            </FL>
            <FL label="Recommended treatment option">
              <Pills options={['Expectant management (mild, young, short duration)', 'Ovulation induction (OI) ± IUI', 'IUI — donor sperm', 'IVF (standard)', 'IVF with ICSI', 'IVF with donor eggs', 'IVF with PGT-A (preimplantation testing)', 'Donor embryo', 'Surrogacy', 'Adoption']} value={artOption} onChange={setArtOption} accent="cyan" />
            </FL>

            {artOption === 'Ovulation induction (OI) ± IUI' && (
              <FL label="IUI details">
                <input value={iuiDetails} onChange={e => setIuiDetails(e.target.value)} placeholder="e.g. Letrozole 2.5mg D2-6, trigger HCG 5000IU, IUI 36h later, 3–6 cycles" className={inp} />
              </FL>
            )}
            {artOption?.includes('IVF') && (
              <FL label="IVF protocol">
                <Pills options={['GnRH antagonist (short protocol — standard)', 'GnRH agonist long protocol', 'PPOS (progestin-primed)', 'Mild/minimal stimulation', 'Natural cycle IVF', 'Modified natural cycle']} value={ivfProtocol} onChange={setIvfProtocol} accent="blue" />
              </FL>
            )}
            <Gate label="ICSI indicated?" value={icsiIndicated} onChange={setIcsiIndicated}>
              <FL label="ICSI indication">
                <Pills options={['Severe male factor (OAT / severe oligospermia)', 'Azoospermia (surgical sperm retrieval)', 'Previous fertilisation failure', 'Low egg numbers', 'Antisperm antibodies', 'PGT planned']} value={icsiReason} onChange={setIcsiReason} multi accent="blue" />
              </FL>
            </Gate>
            <Gate label="PGT-A (preimplantation genetic testing for aneuploidies)?" value={pgta} onChange={setPgta}>
              <p className="text-xs text-cyan-700 bg-cyan-50 border border-cyan-200 rounded p-2">PGT-A indications: advanced maternal age, recurrent implantation failure, recurrent miscarriage, previous aneuploid conception.</p>
            </Gate>
            <Gate label="Frozen embryo transfer (FET) planned?" value={frozenEmbryoTransfer} onChange={setFrozenEmbryoTransfer} />
            <Gate label="Donor egg IVF?" value={donorEgg} onChange={setDonorEgg}>
              <p className="text-xs text-cyan-700 bg-cyan-50 border border-cyan-200 rounded p-2">Donor eggs: ICMR regulations India — anonymous donation, no commercial surrogacy for foreigners. Counselling mandatory for both partners. HRT endometrial preparation for recipient.</p>
            </Gate>
            <Gate label="Surrogacy considered?" value={surrogacy} onChange={setSurrogacy}>
              <Gate label="Legal counselling provided?" value={legalCounselling} onChange={setLegalCounselling}>
                <p className="text-xs text-purple-700">India: Surrogacy (Regulation) Act 2021 — altruistic surrogacy only, surrogate must be close relative.</p>
              </Gate>
            </Gate>
            <Gate label="Adoption counselling?" value={adoption} onChange={setAdoption} />
            <Gate label="Fertility counselling / psychological support?" value={counsellingProvided} onChange={setCounsellingProvided} />
            <Gate label="Govt. fertility assistance / schemes available?" value={fertAidGovt} onChange={setFertAidGovt}>
              <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2">Some Indian states offer subsidised IVF / ART assistance (e.g. Andhra Pradesh, Telangana Aarogyasri). Check state-specific schemes. ICMR regulates ART clinics.</p>
            </Gate>
          </Section>

          <div>
            <FL label="Overall Plan Notes">
              <textarea value={planNotes} onChange={e => setPlanNotes(e.target.value)} rows={4} className={ta} placeholder="Summary, timeline, next steps, investigations pending, consent status..." />
            </FL>
          </div>
        </div>
      )

      default: return null
    }
  }

  const headerBadge = useMemo(() => {
    if (programmaticAlerts.length > 0) return { label: 'ACTION NEEDED', color: 'bg-orange-500 text-white' }
    if (artOption?.includes('IVF') || artOption?.includes('donor')) return { label: 'IVF', color: 'bg-cyan-600 text-white' }
    if (infertilityType) return { label: infertilityType === 'Primary (no previous pregnancy)' ? 'PRIMARY' : 'SECONDARY', color: 'bg-cyan-700 text-white' }
    return null
  }, [programmaticAlerts, artOption, infertilityType])

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-cyan-700 to-teal-700 px-6 py-5 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Users size={22} /></div>
            <div>
              <p className="text-cyan-200 text-xs font-medium uppercase tracking-wider">OBG Assessment</p>
              <h1 className="text-xl font-bold">Female Infertility</h1>
              <p className="text-cyan-200 text-xs mt-0.5">Subfertility · ART Planning</p>
            </div>
          </div>
          <div className="text-right space-y-1">
            {headerBadge && <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-lg ${headerBadge.color}`}>{headerBadge.label}</span>}
            {age && <p className="text-cyan-200 text-xs">Age {age}</p>}
          </div>
        </div>
        <div className="mt-4 flex gap-1">
          {STAGES.map((s, i) => (
            <button key={s} type="button" onClick={() => setStage(i)}
              className={`flex-1 h-1.5 rounded-full transition-all ${i === stage ? 'bg-white' : i < stage ? 'bg-cyan-300' : 'bg-white/20'}`} />
          ))}
        </div>
        <p className="text-cyan-200 text-xs mt-1.5">{stage + 1} / {STAGES.length} — {STAGES[stage]}</p>
      </div>
      <div className="flex border-b border-gray-100 overflow-x-auto bg-gray-50/60">
        {STAGES.map((s, i) => (
          <button key={s} type="button" onClick={() => setStage(i)}
            className={`px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${i === stage ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>{s}</button>
        ))}
      </div>
      <div className="p-5">{renderStage()}</div>
      <div className="flex items-center justify-between px-5 pb-5">
        <button type="button" onClick={() => setStage(s => Math.max(0, s - 1))} disabled={stage === 0} className={`${navBtn} text-gray-600 hover:bg-gray-100 disabled:opacity-30`}><ChevronLeft size={16} /> Back</button>
        {stage < STAGES.length - 1
          ? <button type="button" onClick={() => setStage(s => s + 1)} className={`${navBtn} bg-cyan-600 text-white hover:bg-cyan-700`}>Next <ChevronRight size={16} /></button>
          : <button type="button" onClick={handleSave} disabled={saving} className={`${navBtn} bg-cyan-700 text-white hover:bg-cyan-800 disabled:opacity-60`}>{saving ? 'Saving…' : 'Save Assessment'}</button>}
      </div>
    </div>
  )
}
