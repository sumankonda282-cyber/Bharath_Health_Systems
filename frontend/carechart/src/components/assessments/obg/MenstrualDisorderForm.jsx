/**
 * @shared-pool
 * @category obg
 * @tags menstrual, AUB, PALM-COEIN, dysmenorrhoea, menorrhagia, amenorrhoea
 * Portal-agnostic. Safe to surface in any portal's assessment search.
 */

import React, { useState, useMemo } from 'react'
import { Droplets, ChevronRight, ChevronLeft, Lock, AlertTriangle } from 'lucide-react'
import api from '../../../api/client'

function Section({ title, value, onChange, children, accent = 'rose' }) {
  const A = {
    rose:   { border: 'border-rose-200',   bg: 'bg-rose-50/40',   div: 'border-rose-100',   btn: 'bg-rose-500 text-white border-rose-500' },
    red:    { border: 'border-red-200',    bg: 'bg-red-50/40',    div: 'border-red-100',    btn: 'bg-red-500 text-white border-red-500' },
    orange: { border: 'border-orange-200', bg: 'bg-orange-50/40', div: 'border-orange-100', btn: 'bg-orange-500 text-white border-orange-500' },
    amber:  { border: 'border-amber-200',  bg: 'bg-amber-50/40',  div: 'border-amber-100',  btn: 'bg-amber-500 text-white border-amber-500' },
    blue:   { border: 'border-blue-200',   bg: 'bg-blue-50/40',   div: 'border-blue-100',   btn: 'bg-blue-500 text-white border-blue-500' },
    purple: { border: 'border-purple-200', bg: 'bg-purple-50/40', div: 'border-purple-100', btn: 'bg-purple-500 text-white border-purple-500' },
    green:  { border: 'border-green-200',  bg: 'bg-green-50/40',  div: 'border-green-100',  btn: 'bg-green-600 text-white border-green-600' },
    teal:   { border: 'border-teal-200',   bg: 'bg-teal-50/40',   div: 'border-teal-100',   btn: 'bg-teal-500 text-white border-teal-500' },
  }
  const a = A[accent] || A.rose
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
                  ? opt === 'Yes' ? 'bg-rose-500 text-white border-rose-500' : 'bg-gray-400 text-white border-gray-400'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      {value === 'Yes' && <div className="pl-4 border-l-2 border-rose-200 space-y-3">{children}</div>}
    </div>
  )
}

function Pills({ options, value, onChange, multi = false, accent = 'rose' }) {
  const colors = {
    rose:   { on: 'bg-rose-500 text-white border-rose-500',     off: 'bg-white text-gray-600 border-gray-200 hover:border-rose-300' },
    red:    { on: 'bg-red-500 text-white border-red-500',       off: 'bg-white text-gray-600 border-gray-200 hover:border-red-300' },
    orange: { on: 'bg-orange-500 text-white border-orange-500', off: 'bg-white text-gray-600 border-gray-200 hover:border-orange-300' },
    amber:  { on: 'bg-amber-500 text-white border-amber-500',   off: 'bg-white text-gray-600 border-gray-200 hover:border-amber-300' },
    blue:   { on: 'bg-blue-500 text-white border-blue-500',     off: 'bg-white text-gray-600 border-gray-200 hover:border-blue-300' },
    purple: { on: 'bg-purple-500 text-white border-purple-500', off: 'bg-white text-gray-600 border-gray-200 hover:border-purple-300' },
    green:  { on: 'bg-green-600 text-white border-green-600',   off: 'bg-white text-gray-600 border-gray-200 hover:border-green-300' },
    teal:   { on: 'bg-teal-500 text-white border-teal-500',     off: 'bg-white text-gray-600 border-gray-200 hover:border-teal-300' },
  }
  const c = colors[accent] || colors.rose
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

const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300'
const ta  = `${inp} resize-none`

// PBAC scoring items
const PBAC_PADS = [
  { label: 'Lightly soiled towels / pads', score: 1 },
  { label: 'Moderately soiled', score: 5 },
  { label: 'Heavily soiled', score: 20 },
]

const STAGES = [
  'History',
  'Menstrual Pattern',
  'PALM Causes',
  'COEIN Causes',
  'Examination',
  'Investigations',
  'Management',
]

export default function MenstrualDisorderForm({ patientId, encounterId, onSaved }) {
  const [stage, setStage] = useState(0)
  const [saving, setSaving] = useState(false)

  // Stage 1: History
  const [visitDate, setVisitDate]           = useState('')
  const [age, setAge]                       = useState('')
  const [parity, setParity]                 = useState('')
  const [lmp, setLmp]                       = useState('')
  const [menarche, setMenarche]             = useState('')
  const [mainComplaint, setMainComplaint]   = useState([])
  const [duration, setDuration]             = useState('')
  const [impact, setImpact]                 = useState([])
  const [prevMenstrualHx, setPrevMenstrualHx] = useState('')

  const [secGynHx, setSecGynHx]             = useState('')
  const [previousUSG, setPreviousUSG]       = useState('')
  const [previousUSGFindings, setPreviousUSGFindings] = useState('')
  const [previousBiopsy, setPreviousBiopsy] = useState('')
  const [biopsyResult, setBiopsyResult]     = useState('')
  const [previousTreatment, setPreviousTreatment] = useState([])
  const [previousTreatmentResponse, setPreviousTreatmentResponse] = useState('')
  const [cervicalSmear, setCervicalSmear]   = useState('')
  const [smearResult, setSmearResult]       = useState('')

  const [secMedHx, setSecMedHx]             = useState('')
  const [thyroidDisease, setThyroidDisease] = useState('')
  const [hyperprolactinaemia, setHyperprolactinaemia] = useState('')
  const [coagulationDisorder, setCoagulationDisorder] = useState('')
  const [coagDetails, setCoagDetails]       = useState('')
  const [leiverDisease, setLiverDisease]    = useState('')
  const [renalDisease, setRenalDisease]     = useState('')
  const [diabetes, setDiabetes]             = useState('')
  const [medications, setMedications]       = useState([])
  const [medicationDetails, setMedicationDetails] = useState('')
  const [familyHxCancer, setFamilyHxCancer] = useState('')
  const [familyCancerType, setFamilyCancerType] = useState('')

  // Stage 2: Menstrual pattern
  const [secMenstrualPattern, setSecMenstrualPattern] = useState('')
  const [cycleLength, setCycleLength]       = useState('')
  const [cycleLengthUnit, setCycleLengthUnit] = useState('days')
  const [bleedingDuration, setBleedingDuration] = useState('')
  const [patternType, setPatternType]       = useState('')
  const [padCount, setPadCount]             = useState('')
  const [tamponsUsed, setTamponsUsed]       = useState('')
  const [clots, setClots]                   = useState('')
  const [clotsSize, setClotsSize]           = useState('')
  const [floodingEpisodes, setFloodingEpisodes] = useState('')
  const [nocturnalPad, setNocturnalPad]     = useState('')
  const [pictorialScore, setPictorialScore] = useState('')

  const [secDysmenorrhoea, setSecDysmenorrhoea] = useState('')
  const [painType, setPainType]             = useState('')
  const [painTiming, setPainTiming]         = useState('')
  const [painSite, setPainSite]             = useState([])
  const [painScore, setPainScore]           = useState('')
  const [painDisability, setPainDisability] = useState('')
  const [painRelief, setPainRelief]         = useState([])
  const [cyclicalPelvicPain, setCyclicalPelvicPain] = useState('')
  const [deepDyspareunia, setDeepDyspareunia] = useState('')
  const [dyschezia, setDyschezia]           = useState('')
  const [dysuria, setDysuria]               = useState('')

  const [secAmenorrhoea, setSecAmenorrhoea] = useState('')
  const [amenorrhoeaType, setAmenorrhoeaType] = useState('')
  const [lastPeriodDate, setLastPeriodDate] = useState('')
  const [pregnancy, setPregnancy]           = useState('')
  const [galactorrhoea, setGalactorrhoea]   = useState('')
  const [hotFlushes, setHotFlushes]         = useState('')
  const [stressLevel, setStressLevel]       = useState('')
  const [weightChange, setWeightChange]     = useState('')
  const [hairLoss, setHairLoss]             = useState('')
  const [hirsuitism, setHirsuitism]         = useState('')

  const [secIMB, setSecIMB]                 = useState('')
  const [imbTiming, setImbTiming]           = useState('')
  const [postcoitalBleeding, setPostcoitalBleeding]   = useState('')
  const [postmenopausalBleeding, setPostmenopausalBleeding] = useState('')

  // Stage 3: PALM structural causes
  const [secPolyp, setSecPolyp]             = useState('')
  const [polypUSGConfirmed, setPolypUSGConfirmed] = useState('')
  const [polypHysteroscopy, setPolypHysteroscopy] = useState('')
  const [polypTreatment, setPolypTreatment] = useState('')

  const [secAdenomyosis, setSecAdenomyosis] = useState('')
  const [adenomyosisSymptoms, setAdenomyosisSymptoms] = useState([])
  const [adenomyosisMRI, setAdenomyosisMRI] = useState('')
  const [adenomyosisTreatment, setAdenomyosisTreatment] = useState('')

  const [secLeiomyoma, setSecLeiomyoma]     = useState('')
  const [fibroidUSG, setFibroidUSG]         = useState('')
  const [fibroidSize, setFibroidSize]       = useState('')
  const [fibroidLocation, setFibroidLocation] = useState([])
  const [fibroidCount, setFibroidCount]     = useState('')
  const [fibroidSymptoms, setFibroidSymptoms] = useState([])
  const [fibroidTreatment, setFibroidTreatment] = useState('')

  const [secMalignancy, setSecMalignancy]   = useState('')
  const [malignancyType, setMalignancyType] = useState('')
  const [redFlags, setRedFlags]             = useState([])
  const [biopsyPlan, setBiopsyPlan]         = useState('')

  // Stage 4: COEIN non-structural
  const [secCoagulopathy, setSecCoagulopathy] = useState('')
  const [vWD, setVWD]                       = useState('')
  const [plateletDisorder, setPlateletDisorder] = useState('')
  const [anticoagulants, setAnticoagulants] = useState('')

  const [secOvulatory, setSecOvulatory]     = useState('')
  const [ovulatoryDysfunction, setOvulatoryDysfunction] = useState('')
  const [pcosDiagnosed, setPcosDiagnosed]   = useState('')
  const [thyroidAbnormal, setThyroidAbnormal] = useState('')
  const [hyperprolactin, setHyperprolactin] = useState('')
  const [prematureOvarian, setPrematureOvarian] = useState('')

  const [secEndometrial, setSecEndometrial] = useState('')
  const [endometritis, setEndometritis]     = useState('')
  const [endometrialAVD, setEndometrialAVD] = useState('')

  const [secIatrogenic, setSecIatrogenic]   = useState('')
  const [hormonalDrugs, setHormonalDrugs]   = useState([])
  const [iudType, setIudType]               = useState('')
  const [iudBleedingChange, setIudBleedingChange] = useState('')

  const [secNotYetClassified, setSecNotYetClassified] = useState('')
  const [endometriosisConfirmed, setEndometriosisConfirmed] = useState('')
  const [endometriosisStage, setEndometriosisStage] = useState('')
  const [adenomyosisNYC, setAdenomyosisNYC] = useState('')

  // Stage 5: Examination
  const [secExam, setSecExam]               = useState('')
  const [bmi, setBmi]                       = useState('')
  const [pallor, setPallor]                 = useState('')
  const [hb, setHb]                         = useState('')
  const [thyroidExam, setThyroidExam]       = useState('')
  const [galact, setGalact]                 = useState('')
  const [acanthosisNigricans, setAcanthosisNigricans] = useState('')
  const [acne, setAcne]                     = useState('')
  const [hirsuitismExam, setHirsuitismExam] = useState('')
  const [ferriman, setFerriman]             = useState('')

  const [secPelvicExam, setSecPelvicExam]   = useState('')
  const [specExam, setSpecExam]             = useState('')
  const [cervixAppearance, setCervixAppearance] = useState('')
  const [uterineSize, setUterineSize]       = useState('')
  const [uterineConsistency, setUterineConsistency] = useState('')
  const [adenxae, setAdnexae]               = useState('')
  const [pvTenderness, setPvTenderness]     = useState('')

  // Stage 6: Investigations
  const [secInvest, setSecInvest]           = useState('')
  const [hbInv, setHbInv]                   = useState('')
  const [ferritin, setFerritin]             = useState('')
  const [tsh, setTsh]                       = useState('')
  const [prolactin, setProlactin]           = useState('')
  const [lh, setLh]                         = useState('')
  const [fsh, setFsh]                       = useState('')
  const [lhFshRatio, setLhFshRatio]         = useState('')
  const [testosterone, setTestosterone]     = useState('')
  const [shbg, setShbg]                     = useState('')
  const [amh, setAmh]                       = useState('')
  const [cortisol, setCortisol]             = useState('')
  const [coagProfile, setCoagProfile]       = useState('')

  const [secImaging, setSecImaging]         = useState('')
  const [tvusFindings, setTvusFindings]     = useState('')
  const [salineHysterosono, setSalineHysterosono] = useState('')
  const [mriPelvis, setMriPelvis]           = useState('')
  const [hysteroscopy, setHysteroscopy]     = useState('')
  const [hysteroscopyFindings, setHysteroscopyFindings] = useState('')
  const [laparoscopy, setLaparoscopy]       = useState('')
  const [laparoscopyFindings, setLaparoscopyFindings] = useState('')
  const [endometrialBiopsy, setEndometrialBiopsy] = useState('')
  const [biopsyFindings, setBiopsyFindings] = useState('')

  // Stage 7: Management
  const [secMedMgmt, setSecMedMgmt]         = useState('')
  const [medOptions, setMedOptions]         = useState([])
  const [hormonalDetails, setHormonalDetails] = useState('')
  const [ironRx, setIronRx]                 = useState('')
  const [tranexamic, setTranexamic]         = useState('')
  const [nsaids, setNsaids]                 = useState('')
  const [gnrh, setGnrhAnalogue]             = useState('')

  const [secSurgMgmt, setSecSurgMgmt]       = useState('')
  const [surgOptions, setSurgOptions]       = useState([])
  const [surgDetails, setSurgDetails]       = useState('')
  const [consentObtained, setConsentObtained] = useState('')

  const [secFollowUp, setSecFollowUp]       = useState('')
  const [followUpInterval, setFollowUpInterval] = useState('')
  const [repeatUSG, setRepeatUSG]           = useState('')
  const [referOncology, setReferOncology]   = useState('')
  const [referEndocrinology, setReferEndocrinology] = useState('')
  const [fertilityCounselling, setFertilityCounselling] = useState('')

  const [planNotes, setPlanNotes]           = useState('')

  // PALM-COEIN classification
  const palmCoeinFlags = useMemo(() => {
    const flags = []
    if (secPolyp === 'Yes') flags.push('P — Polyp')
    if (secAdenomyosis === 'Yes') flags.push('A — Adenomyosis')
    if (secLeiomyoma === 'Yes') flags.push('L — Leiomyoma (Fibroid)')
    if (secMalignancy === 'Yes') flags.push('M — Malignancy / premalignancy')
    if (secCoagulopathy === 'Yes') flags.push('C — Coagulopathy')
    if (secOvulatory === 'Yes') flags.push('O — Ovulatory dysfunction')
    if (secEndometrial === 'Yes') flags.push('E — Endometrial')
    if (secIatrogenic === 'Yes') flags.push('I — Iatrogenic')
    if (secNotYetClassified === 'Yes') flags.push('N — Not yet classified (Endometriosis)')
    return flags
  }, [secPolyp, secAdenomyosis, secLeiomyoma, secMalignancy, secCoagulopathy, secOvulatory, secEndometrial, secIatrogenic, secNotYetClassified])

  const redFlagAlert = useMemo(() => {
    const rf = []
    if (postmenopausalBleeding === 'Yes') rf.push('Postmenopausal bleeding — endometrial cancer excluded?')
    if (postcoitalBleeding === 'Yes') rf.push('Post-coital bleeding — cervical pathology / cancer?')
    if (secMalignancy === 'Yes') rf.push('Malignancy suspected — urgent referral / biopsy')
    if (Number(age) >= 45 && mainComplaint.includes('Heavy periods')) rf.push('Age ≥45 + HMB — endometrial biopsy recommended')
    return rf
  }, [postmenopausalBleeding, postcoitalBleeding, secMalignancy, age, mainComplaint])

  async function handleSave() {
    setSaving(true)
    try {
      await api.post('/assessments', {
        patientId, encounterId,
        formType: 'menstrual_disorder_assessment',
        data: {
          visitDate, age, parity, lmp, menarche, mainComplaint, duration, impact, prevMenstrualHx,
          gynHx: { previousUSG, previousUSGFindings, previousBiopsy, biopsyResult, previousTreatment, previousTreatmentResponse, cervicalSmear, smearResult },
          medHx: { thyroidDisease, hyperprolactinaemia, coagulationDisorder, coagDetails, diabetes, medications, medicationDetails, familyHxCancer, familyCancerType },
          menstrualPattern: { cycleLength, cycleLengthUnit, bleedingDuration, patternType, padCount, clots, clotsSize, floodingEpisodes, nocturnalPad, pictorialScore },
          dysmenorrhoea: { type: painType, timing: painTiming, site: painSite, score: painScore, disability: painDisability, relief: painRelief, cyclicalPelvicPain, deepDyspareunia, dyschezia, dysuria },
          amenorrhoea: { type: amenorrhoeaType, lastPeriod: lastPeriodDate, pregnancy, galactorrhoea, hotFlushes, weightChange },
          imb: { timing: imbTiming, postcoitalBleeding, postmenopausalBleeding },
          palm: {
            polyp: { confirmed: polypUSGConfirmed, hysteroscopy: polypHysteroscopy, treatment: polypTreatment },
            adenomyosis: { symptoms: adenomyosisSymptoms, mri: adenomyosisMRI, treatment: adenomyosisTreatment },
            leiomyoma: { usg: fibroidUSG, size: fibroidSize, location: fibroidLocation, count: fibroidCount, symptoms: fibroidSymptoms, treatment: fibroidTreatment },
            malignancy: { type: malignancyType, redFlags, biopsyPlan },
          },
          coein: {
            coagulopathy: { vWD, platelet: plateletDisorder, anticoagulants },
            ovulatory: { dysfunction: ovulatoryDysfunction, pcos: pcosDiagnosed, thyroid: thyroidAbnormal, prolactin: hyperprolactin, prematureOvarian },
            endometrial: { endometritis, avd: endometrialAVD },
            iatrogenic: { hormonalDrugs, iudType, iudBleedingChange },
            notClassified: { endometriosis: endometriosisConfirmed, stage: endometriosisStage },
          },
          palmCoeinFlags,
          examination: { bmi, pallor, hb, thyroid: thyroidExam, galactorrhoea: galact, acanthosis: acanthosisNigricans, acne, hirsuitism: hirsuitismExam, ferriman },
          pelvicExam: { speculum: specExam, cervix: cervixAppearance, uterineSize, uterineConsistency, adnexae: adenxae, tenderness: pvTenderness },
          investigations: { hb: hbInv, ferritin, tsh, prolactin, lh, fsh, lhFshRatio, testosterone, shbg, amh, cortisol, coagProfile },
          imaging: { tvus: tvusFindings, salineHysterosono, mri: mriPelvis, hysteroscopy, hysteroscopyFindings, laparoscopy, laparoscopyFindings, endometrialBiopsy, biopsyFindings },
          management: {
            medical: { options: medOptions, hormonalDetails, iron: ironRx, tranexamic, nsaids, gnrh },
            surgical: { options: surgOptions, details: surgDetails, consent: consentObtained },
            followUp: { interval: followUpInterval, repeatUSG, referOncology, referEndocrinology, fertilityCounselling },
          },
          redFlagAlert,
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
            <FL label="Visit Date">
              <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} className={inp} />
            </FL>
            <FL label="Age" sub="years">
              <input type="number" value={age} onChange={e => setAge(e.target.value)} className={inp} />
            </FL>
            <FL label="Parity">
              <input value={parity} onChange={e => setParity(e.target.value)} placeholder="G_P_L_A" className={inp} />
            </FL>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FL label="LMP">
              <input type="date" value={lmp} onChange={e => setLmp(e.target.value)} className={inp} />
            </FL>
            <FL label="Age at menarche" sub="years">
              <input type="number" value={menarche} onChange={e => setMenarche(e.target.value)} className={inp} />
            </FL>
          </div>
          <FL label="Main complaint(s)">
            <Pills options={['Heavy periods (HMB)', 'Painful periods (dysmenorrhoea)', 'Irregular periods', 'Absent periods (amenorrhoea)', 'Intermenstrual bleeding (IMB)', 'Post-coital bleeding (PCB)', 'Postmenopausal bleeding (PMB)', 'Premenstrual syndrome (PMS/PMDD)']} value={mainComplaint} onChange={setMainComplaint} multi />
          </FL>
          {mainComplaint.includes('Postmenopausal bleeding (PMB)') && (
            <div className="p-3 bg-red-50 border-2 border-red-400 rounded-xl flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-600 animate-pulse flex-shrink-0" />
              <p className="text-xs font-bold text-red-700">Postmenopausal bleeding — urgent endometrial carcinoma exclusion. TVS + endometrial biopsy within 2 weeks.</p>
            </div>
          )}
          {mainComplaint.includes('Post-coital bleeding (PCB)') && (
            <div className="p-2 bg-orange-50 border border-orange-300 rounded text-xs text-orange-700 font-semibold flex items-center gap-1.5">
              <AlertTriangle size={12} /> Post-coital bleeding — cervical inspection + smear + colposcopy if unexplained.
            </div>
          )}
          <FL label="Duration of symptoms">
            <input value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 6 months, since menarche, 2 years" className={inp} />
          </FL>
          <FL label="Impact on quality of life">
            <Pills options={['Work absence', 'School/study affected', 'Social isolation', 'Relationship affected', 'Depression / anxiety', 'Anaemia symptoms', 'None significant']} value={impact} onChange={setImpact} multi />
          </FL>

          <Section title="Gynaecological History" value={secGynHx} onChange={setSecGynHx} accent="rose">
            <Gate label="Previous pelvic USG done?" value={previousUSG} onChange={setPreviousUSG}>
              <FL label="USG findings">
                <textarea value={previousUSGFindings} onChange={e => setPreviousUSGFindings(e.target.value)} rows={2} className={ta} placeholder="Fibroids, polyps, ovarian cysts..." />
              </FL>
            </Gate>
            <Gate label="Previous endometrial biopsy?" value={previousBiopsy} onChange={setPreviousBiopsy}>
              <FL label="Biopsy result">
                <input value={biopsyResult} onChange={e => setBiopsyResult(e.target.value)} className={inp} />
              </FL>
            </Gate>
            <FL label="Previous treatments tried">
              <Pills options={['Combined OCP', 'Progesterone', 'LNG-IUS (Mirena)', 'GnRH agonist', 'Tranexamic acid', 'Mefenamic acid', 'Iron therapy', 'Endometrial ablation', 'Myomectomy', 'Hysterectomy']} value={previousTreatment} onChange={setPreviousTreatment} multi />
            </FL>
            <FL label="Response to previous treatment">
              <Pills options={['Good response', 'Partial response', 'No response', 'Intolerable side effects', 'Not tried']} value={previousTreatmentResponse} onChange={setPreviousTreatmentResponse} />
            </FL>
            <Gate label="Cervical smear status?">
              <FL label="Smear result / last date">
                <input value={smearResult} onChange={e => setSmearResult(e.target.value)} placeholder="e.g. Normal, CIN1, HSIL, last done 2023" className={inp} />
              </FL>
            </Gate>
          </Section>

          <Section title="Medical History" value={secMedHx} onChange={setSecMedHx} accent="blue">
            <Gate label="Thyroid disease?" value={thyroidDisease} onChange={setThyroidDisease} />
            <Gate label="Hyperprolactinaemia / pituitary disorder?" value={hyperprolactinaemia} onChange={setHyperprolactinaemia} />
            <Gate label="Bleeding / clotting disorder?" value={coagulationDisorder} onChange={setCoagulationDisorder}>
              <FL label="Details (von Willebrand, ITP, haemophilia carrier...)">
                <input value={coagDetails} onChange={e => setCoagDetails(e.target.value)} className={inp} />
              </FL>
            </Gate>
            <Gate label="Diabetes?" value={diabetes} onChange={setDiabetes} />
            <Gate label="Medications affecting menstrual cycle?" value={medications.length > 0 ? 'Yes' : ''} onChange={() => {}}>
              <FL label="Medications">
                <Pills options={['Anticoagulants (warfarin, NOAC)', 'Corticosteroids', 'Antipsychotics (raise prolactin)', 'Chemotherapy', 'Hormonal contraception', 'Tamoxifen', 'Danazol']} value={medications} onChange={setMedications} multi accent="blue" />
              </FL>
              <FL label="Details">
                <input value={medicationDetails} onChange={e => setMedicationDetails(e.target.value)} className={inp} />
              </FL>
            </Gate>
            <Gate label="Family history of gynaecological cancer?" value={familyHxCancer} onChange={setFamilyHxCancer}>
              <FL label="Type / relation">
                <input value={familyCancerType} onChange={e => setFamilyCancerType(e.target.value)} placeholder="e.g. Mother — endometrial cancer, Sister — ovarian" className={inp} />
              </FL>
            </Gate>
          </Section>
        </div>
      )

      case 1: return (
        <div className="space-y-5">
          <Section title="Menstrual Pattern (AUB type)" value={secMenstrualPattern} onChange={setSecMenstrualPattern} accent="rose">
            <FL label="AUB pattern">
              <Pills options={['Heavy menstrual bleeding (HMB / menorrhagia)', 'Prolonged bleeding (>7 days)', 'Frequent periods (<21 days)', 'Infrequent periods (>35 days)', 'Irregular (variable >20 days variation)', 'Intermenstrual bleeding', 'Normal (for reference)']} value={patternType} onChange={setPatternType} accent="rose" />
            </FL>
            <div className="grid grid-cols-2 gap-4">
              <FL label="Cycle length" sub="days">
                <input type="number" value={cycleLength} onChange={e => setCycleLength(e.target.value)} className={inp} />
                {(() => {
                  const c = Number(cycleLength)
                  if (c < 21) return <span className="text-xs text-orange-700 font-semibold mt-0.5 block">Polymenorrhoea (&lt;21 days)</span>
                  if (c > 35) return <span className="text-xs text-orange-700 font-semibold mt-0.5 block">Oligomenorrhoea (&gt;35 days)</span>
                  return null
                })()}
              </FL>
              <FL label="Bleeding duration" sub="days per period">
                <input type="number" value={bleedingDuration} onChange={e => setBleedingDuration(e.target.value)} className={inp} />
                {Number(bleedingDuration) > 7 && <span className="text-xs text-orange-700 font-semibold mt-0.5 block">Prolonged bleeding (&gt;7 days)</span>}
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FL label="Pads / tampons used per day (heaviest day)">
                <input type="number" value={padCount} onChange={e => setPadCount(e.target.value)} className={inp} />
                {Number(padCount) >= 8 && <span className="text-xs text-red-700 font-semibold mt-0.5 block">≥8/day — likely HMB</span>}
              </FL>
              <Gate label="Blood clots passed?" value={clots} onChange={setClots}>
                <FL label="Clot size">
                  <Pills options={['Small (&lt;50p coin)', 'Large (&gt;50p / &gt;2.5cm)', 'Very large (palm-sized)']} value={clotsSize} onChange={setClotsSize} accent="rose" />
                </FL>
              </Gate>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Gate label="Flooding episodes (leaking through clothes)?" value={floodingEpisodes} onChange={setFloodingEpisodes} />
              <Gate label="Nocturnal pad changes required?" value={nocturnalPad} onChange={setNocturnalPad} />
            </div>
            <FL label="PBAC (Pictorial Blood Assessment Chart) score" sub="if documented">
              <input type="number" value={pictorialScore} onChange={e => setPictorialScore(e.target.value)} placeholder="Score >100 = HMB" className={inp} />
              {Number(pictorialScore) > 100 && <span className="text-xs text-red-700 font-semibold mt-0.5 block">PBAC &gt;100 — confirms HMB</span>}
            </FL>
          </Section>

          <Section title="Dysmenorrhoea (Painful Periods)" value={secDysmenorrhoea} onChange={setSecDysmenorrhoea} accent="orange">
            <FL label="Type of dysmenorrhoea">
              <Pills options={['Primary (no pelvic pathology)', 'Secondary (pelvic cause — endometriosis, adenomyosis, fibroids)']} value={painType} onChange={setPainType} accent="orange" />
            </FL>
            <FL label="Pain timing">
              <Pills options={['Start 1–2 days before period', 'First 1–3 days of period', 'Throughout period', 'Continuous pelvic pain']} value={painTiming} onChange={setPainTiming} accent="orange" />
            </FL>
            <FL label="Pain site">
              <Pills options={['Lower abdomen (midline)', 'Lower back', 'Inner thighs', 'Pelvis (deep)', 'Rectum']} value={painSite} onChange={setPainSite} multi accent="orange" />
            </FL>
            <div className="grid grid-cols-2 gap-4">
              <FL label="Pain score" sub="(0–10)">
                <input type="number" value={painScore} onChange={e => setPainScore(e.target.value)} max={10} className={inp} />
              </FL>
              <FL label="Disability from pain">
                <Pills options={['None', 'Mild', 'Moderate (some missed days)', 'Severe (bedridden)']} value={painDisability} onChange={setPainDisability} accent="orange" />
              </FL>
            </div>
            <FL label="Pain relief used">
              <Pills options={['NSAIDs (Ibuprofen / Mefenamic acid)', 'Paracetamol', 'OCP (combined pill)', 'Heat therapy', 'Antispasmodics (Buscopan)', 'Opioids', 'Nothing — no relief']} value={painRelief} onChange={setPainRelief} multi accent="orange" />
            </FL>
            <Gate label="Cyclical (non-menstrual) pelvic pain?" value={cyclicalPelvicPain} onChange={setCyclicalPelvicPain} />
            <Gate label="Deep dyspareunia (pain on intercourse)?" value={deepDyspareunia} onChange={setDeepDyspareunia}>
              <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded p-2">Deep dyspareunia strongly suggests endometriosis or adenomyosis.</p>
            </Gate>
            <Gate label="Dyschezia (pain on defaecation, cyclical)?" value={dyschezia} onChange={setDyschezia} />
            <Gate label="Cyclical dysuria / bladder pain?" value={dysuria} onChange={setDysuria} />
          </Section>

          <Section title="Amenorrhoea / Absent Periods" value={secAmenorrhoea} onChange={setSecAmenorrhoea} accent="purple">
            <FL label="Type">
              <Pills options={['Primary (never had periods)', 'Secondary (&gt;3 months absent)', 'Oligomenorrhoea (&gt;35 days cycle)']} value={amenorrhoeaType} onChange={setAmenorrhoeaType} accent="purple" />
            </FL>
            <FL label="Date of last period">
              <input type="date" value={lastPeriodDate} onChange={e => setLastPeriodDate(e.target.value)} className={inp} />
            </FL>
            <Gate label="Pregnancy excluded?" value={pregnancy} onChange={setPregnancy} />
            <Gate label="Galactorrhoea (spontaneous nipple discharge)?" value={galactorrhoea} onChange={setGalactorrhoea}>
              <p className="text-xs text-purple-700">Galactorrhoea + amenorrhoea = hyperprolactinaemia / pituitary adenoma. Check prolactin + MRI pituitary.</p>
            </Gate>
            <Gate label="Hot flushes / vasomotor symptoms?" value={hotFlushes} onChange={setHotFlushes}>
              <p className="text-xs text-orange-700">Hot flushes + amenorrhoea — consider premature ovarian insufficiency (POI). Check FSH, oestradiol, anti-TPO.</p>
            </Gate>
            <FL label="Weight change (in context of amenorrhoea)">
              <Pills options={['Significant weight loss (&gt;10%)', 'Underweight / anorexia', 'Recent weight gain', 'Stable weight']} value={weightChange} onChange={setWeightChange} accent="purple" />
            </FL>
            <FL label="Other features">
              <Pills options={['Hair loss', 'Hirsuitism', 'Acne', 'Virilisation', 'Anosmia (Kallmann)', 'None']} value={hirsuitism} onChange={setHirsuitism} multi accent="purple" />
            </FL>
          </Section>

          <Section title="Intermenstrual / Post-coital Bleeding" value={secIMB} onChange={setSecIMB} accent="red">
            <FL label="IMB timing">
              <Pills options={['Mid-cycle', 'After exercise', 'Random / unpredictable', 'After stopping OCP', 'After a missed pill']} value={imbTiming} onChange={setImbTiming} accent="red" />
            </FL>
            <Gate label="Post-coital bleeding (after intercourse)?" value={postcoitalBleeding} onChange={setPostcoitalBleeding} accent="red">
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">PCB — examine cervix, take smear if due, consider colposcopy.</p>
            </Gate>
            <Gate label="Postmenopausal bleeding (PMB)?" value={postmenopausalBleeding} onChange={setPostmenopausalBleeding} accent="red">
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2 font-semibold">PMB requires urgent TVUS (endometrial thickness) + biopsy. Endometrial cancer excluded until proven otherwise.</p>
            </Gate>
          </Section>
        </div>
      )

      case 2: return (
        <div className="space-y-5">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 space-y-1">
            <p className="font-semibold">PALM — Structural causes of AUB:</p>
            <p>P: Polyp | A: Adenomyosis | L: Leiomyoma (fibroid) | M: Malignancy/premalignancy</p>
          </div>

          <Section title="P — Polyp (Endometrial / Cervical)" value={secPolyp} onChange={setSecPolyp} accent="rose">
            <Gate label="Polyp confirmed on USG / hysteroscopy?" value={polypUSGConfirmed} onChange={setPolypUSGConfirmed} />
            <Gate label="Hysteroscopic polypectomy done / planned?" value={polypHysteroscopy} onChange={setPolypHysteroscopy} />
            <FL label="Treatment plan">
              <Pills options={['Expectant (watch and wait)', 'Hysteroscopic polypectomy', 'LNG-IUS after polypectomy', 'Biopsy for histology']} value={polypTreatment} onChange={setPolypTreatment} accent="rose" />
            </FL>
          </Section>

          <Section title="A — Adenomyosis" value={secAdenomyosis} onChange={setSecAdenomyosis} accent="purple">
            <FL label="Adenomyosis features">
              <Pills options={['Bulky uterus on exam', 'Globular uterus on USG', 'Heterogeneous myometrium (USG)', 'JZ disruption on MRI', 'Severe dysmenorrhoea', 'HMB + dysmenorrhoea']} value={adenomyosisSymptoms} onChange={setAdenomyosisSymptoms} multi accent="purple" />
            </FL>
            <Gate label="MRI pelvis for adenomyosis?" value={adenomyosisMRI} onChange={setAdenomyosisMRI} />
            <FL label="Treatment">
              <Pills options={['LNG-IUS (Mirena) — first-line', 'Combined OCP', 'GnRH analogue (Zoladex / Prostap)', 'Danazol', 'Dienogest', 'Endometrial ablation (if focal)', 'Hysterectomy (definitive)']} value={adenomyosisTreatment} onChange={setAdenomyosisTreatment} accent="purple" />
            </FL>
          </Section>

          <Section title="L — Leiomyoma (Fibroid)" value={secLeiomyoma} onChange={setSecLeiomyoma} accent="orange">
            <Gate label="Fibroids confirmed on USG?" value={fibroidUSG} onChange={setFibroidUSG}>
              <div className="grid grid-cols-3 gap-4">
                <FL label="Largest fibroid size" sub="cm">
                  <input value={fibroidSize} onChange={e => setFibroidSize(e.target.value)} placeholder="e.g. 5 cm" className={inp} />
                </FL>
                <FL label="Number of fibroids">
                  <input type="number" value={fibroidCount} onChange={e => setFibroidCount(e.target.value)} className={inp} />
                </FL>
                <FL label="Location (FIGO)">
                  <Pills options={['Submucosal (0,1,2)', 'Intramural (3,4,5)', 'Subserosal (6,7)', 'Cervical', 'Broad ligament']} value={fibroidLocation} onChange={setFibroidLocation} multi accent="orange" />
                </FL>
              </div>
            </Gate>
            <FL label="Fibroid symptoms">
              <Pills options={['HMB', 'Pelvic pressure / heaviness', 'Urinary frequency', 'Constipation', 'Dysmenorrhoea', 'Subfertility', 'Recurrent pregnancy loss']} value={fibroidSymptoms} onChange={setFibroidSymptoms} multi accent="orange" />
            </FL>
            <FL label="Fibroid treatment plan">
              <Pills options={['Watchful waiting', 'LNG-IUS (Mirena) — if submucosal excluded', 'GnRH analogue (pre-op shrinkage)', 'Ulipristal acetate (where available)', 'Myomectomy (laparoscopic / open)', 'Uterine artery embolisation (UAE)', 'Hysterectomy', 'MRI-guided focused ultrasound (MRgFUS)']} value={fibroidTreatment} onChange={setFibroidTreatment} accent="orange" />
            </FL>
          </Section>

          <Section title="M — Malignancy / Premalignancy" value={secMalignancy} onChange={setSecMalignancy} accent="red">
            <FL label="Suspected malignancy type">
              <Pills options={['Endometrial carcinoma', 'Cervical carcinoma', 'Ovarian malignancy', 'Endometrial hyperplasia (atypical)', 'Leiomyosarcoma', 'Fallopian tube']} value={malignancyType} onChange={setMalignancyType} accent="red" />
            </FL>
            <FL label="Red flag features present">
              <Pills options={['Age &gt;45 + HMB', 'Postmenopausal bleeding', 'Endometrial thickness &gt;4mm (postmeno)', 'Cervical stenosis + bleed', 'Abnormal smear history', 'HNPCC / Lynch syndrome family history', 'Obesity + diabetes + nulliparity (endometrial risk triad)']} value={redFlags} onChange={setRedFlags} multi accent="red" />
            </FL>
            <FL label="Biopsy / urgent referral plan">
              <textarea value={biopsyPlan} onChange={e => setBiopsyPlan(e.target.value)} rows={2} className={ta} placeholder="Pipelle biopsy, urgent 2-week cancer referral, hysteroscopy + D&C..." />
            </FL>
            {malignancyType && (
              <div className="p-2 bg-red-50 border-2 border-red-400 rounded text-xs text-red-700 font-bold flex items-center gap-1.5">
                <AlertTriangle size={12} className="animate-pulse" /> Suspected malignancy — urgent referral (2-week wait / cancer pathway). Document and expedite.
              </div>
            )}
          </Section>
        </div>
      )

      case 3: return (
        <div className="space-y-5">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 space-y-1">
            <p className="font-semibold">COEIN — Non-structural causes of AUB:</p>
            <p>C: Coagulopathy | O: Ovulatory dysfunction | E: Endometrial | I: Iatrogenic | N: Not yet classified (endometriosis)</p>
          </div>

          <Section title="C — Coagulopathy" value={secCoagulopathy} onChange={setSecCoagulopathy} accent="blue">
            <Gate label="von Willebrand disease (vWD)?" value={vWD} onChange={setVWD}>
              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">vWD: HMB since menarche, family history of bleeding, bruising, nose bleeds. Screen: PT, aPTT, von Willebrand panel. Treat: DDAVP or VWF concentrate.</p>
            </Gate>
            <Gate label="Platelet disorder / thrombocytopenia?" value={plateletDisorder} onChange={setPlateletDisorder} />
            <Gate label="Anticoagulants (warfarin, NOAC, heparin)?" value={anticoagulants} onChange={setAnticoagulants}>
              <p className="text-xs text-blue-700">Tranexamic acid may help. Discuss with haematology re: anticoagulant reversal / dose modification.</p>
            </Gate>
          </Section>

          <Section title="O — Ovulatory Dysfunction" value={secOvulatory} onChange={setSecOvulatory} accent="amber">
            <Gate label="Anovulatory bleeding pattern?" value={ovulatoryDysfunction} onChange={setOvulatoryDysfunction} />
            <Gate label="PCOS (confirmed / suspected)?" value={pcosDiagnosed} onChange={setPcosDiagnosed} />
            <Gate label="Thyroid abnormality contributing?" value={thyroidAbnormal} onChange={setThyroidAbnormal} />
            <Gate label="Hyperprolactinaemia?" value={hyperprolactin} onChange={setHyperprolactin}>
              <p className="text-xs text-amber-700">Elevated prolactin → oligomenorrhoea / amenorrhoea. MRI pituitary (check for microadenoma). Cabergoline 0.25mg twice/week.</p>
            </Gate>
            <Gate label="Premature ovarian insufficiency (POI)?" value={prematureOvarian} onChange={setPrematureOvarian}>
              <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded p-2">POI: FSH &gt;25 IU/L on 2 occasions &gt;4 weeks apart, age &lt;40. HRT indicated to prevent osteoporosis and cardiovascular risk. Fertility counselling (egg donation).</p>
            </Gate>
          </Section>

          <Section title="E — Endometrial Causes" value={secEndometrial} onChange={setSecEndometrial} accent="rose">
            <Gate label="Endometritis (chronic)?" value={endometritis} onChange={setEndometritis}>
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">Chronic endometritis: hysteroscopy + biopsy, plasma cells on histology. Treat with Doxycycline 100mg BD × 14 days.</p>
            </Gate>
            <Gate label="Primary endometrial disorder (AUB-E)?" value={endometrialAVD} onChange={setEndometrialAVD}>
              <p className="text-xs text-gray-600">AUB-E: abnormality of local endometrial haemostatic mechanisms — heavy periods with no structural cause. First-line: LNG-IUS or tranexamic acid.</p>
            </Gate>
          </Section>

          <Section title="I — Iatrogenic (Drug-induced)" value={secIatrogenic} onChange={setSecIatrogenic} accent="teal">
            <FL label="Hormonal drugs causing AUB">
              <Pills options={['Progesterone-only pill (POP)', 'Depo-Provera (DMPA)', 'Subdermal implant', 'Emergency contraception (frequent use)', 'Tamoxifen', 'Aromatase inhibitors', 'Antipsychotics (hyperprolactinaemia)', 'Anticoagulants']} value={hormonalDrugs} onChange={setHormonalDrugs} multi accent="teal" />
            </FL>
            <Gate label="IUD / IUS in situ?" value={iudType.length > 0 ? 'Yes' : ''} onChange={() => {}}>
              <FL label="Type">
                <Pills options={['Copper IUD (IUCD)', 'LNG-IUS (Mirena)', 'Other']} value={iudType} onChange={setIudType} accent="teal" />
              </FL>
              {iudType === 'Copper IUD (IUCD)' && (
                <p className="text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded p-2">Copper IUD commonly increases menstrual blood loss by 20–40%. Tranexamic acid or NSAID first-line. Consider switching to LNG-IUS if acceptable.</p>
              )}
              <FL label="Change in bleeding after IUD insertion?">
                <Pills options={['Yes — heavier', 'Yes — lighter (Mirena)', 'No change', 'Irregular spotting']} value={iudBleedingChange} onChange={setIudBleedingChange} accent="teal" />
              </FL>
            </Gate>
          </Section>

          <Section title="N — Not Yet Classified (Endometriosis)" value={secNotYetClassified} onChange={setSecNotYetClassified} accent="purple">
            <Gate label="Endometriosis confirmed (laparoscopy)?" value={endometriosisConfirmed} onChange={setEndometriosisConfirmed}>
              <FL label="Endometriosis stage (rASRM)">
                <Pills options={['Stage I (Minimal)', 'Stage II (Mild)', 'Stage III (Moderate)', 'Stage IV (Severe)', 'Deep infiltrating endometriosis (DIE)']} value={endometriosisStage} onChange={setEndometriosisStage} accent="purple" />
              </FL>
            </Gate>
            <p className="text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded p-2">
              Endometriosis classified as 'N' in PALM-COEIN framework. Suspected on symptoms (dysmenorrhoea, deep dyspareunia, dyschezia, infertility). Definitive diagnosis by laparoscopy. Medical: NSAID, hormonal suppression; Surgical: ablation/excision.
            </p>
          </Section>
        </div>
      )

      case 4: return (
        <div className="space-y-5">
          <Section title="General & Systemic Examination" value={secExam} onChange={setSecExam} accent="rose">
            <div className="grid grid-cols-3 gap-4">
              <FL label="BMI" sub="kg/m²">
                <input type="number" value={bmi} onChange={e => setBmi(e.target.value)} className={inp} />
              </FL>
              <FL label="Pallor">
                <Pills options={['None', 'Mild', 'Moderate', 'Severe']} value={pallor} onChange={setPallor} accent={pallor === 'Severe' ? 'red' : 'rose'} />
              </FL>
              <FL label="Hb" sub="g/dL">
                <input type="number" value={hb} onChange={e => setHb(e.target.value)} step="0.1" className={inp} />
                {Number(hb) < 10 && hb && <span className="text-xs text-red-700 font-semibold mt-0.5 block">Anaemia — iron workup</span>}
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FL label="Thyroid examination">
                <Pills options={['Normal', 'Goitre', 'Hypothyroid features', 'Hyperthyroid features']} value={thyroidExam} onChange={setThyroidExam} />
              </FL>
              <FL label="Galactorrhoea on breast exam">
                <Pills options={['Absent', 'Present (bilateral)', 'Present (unilateral)']} value={galact} onChange={setGalact} />
              </FL>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FL label="Acanthosis nigricans">
                <Pills options={['Absent', 'Present (nape/axilla)']} value={acanthosisNigricans} onChange={setAcanthosisNigricans} />
              </FL>
              <FL label="Acne">
                <Pills options={['None', 'Mild', 'Moderate', 'Severe']} value={acne} onChange={setAcne} />
              </FL>
              <FL label="Hirsuitism">
                <Pills options={['None', 'Mild', 'Moderate', 'Severe']} value={hirsuitismExam} onChange={setHirsuitismExam} />
              </FL>
            </div>
            {(hirsuitismExam === 'Moderate' || hirsuitismExam === 'Severe') && (
              <FL label="Ferriman-Gallwey score" sub="/36">
                <input type="number" value={ferriman} onChange={e => setFerriman(e.target.value)} max={36} className={inp} />
                {Number(ferriman) >= 8 && <span className="text-xs text-orange-700 font-semibold mt-0.5 block">FG ≥8 — clinically significant hirsuitism</span>}
              </FL>
            )}
          </Section>

          <Section title="Pelvic Examination" value={secPelvicExam} onChange={setSecPelvicExam} accent="rose">
            <FL label="Speculum examination">
              <Pills options={['Normal cervix', 'Cervical ectropion', 'Cervical polyp', 'Bleeding point on cervix', 'Cervical tumour / ulcer', 'Vaginal atrophy', 'Not done']} value={specExam} onChange={setSpecExam} accent="rose" />
            </FL>
            {(specExam === 'Cervical tumour / ulcer' || specExam === 'Bleeding point on cervix') && (
              <div className="p-2 bg-red-50 border border-red-300 rounded text-xs text-red-700 font-semibold">
                Suspicious cervix — urgent colposcopy / biopsy.
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <FL label="Uterine size">
                <Pills options={['Normal size', '6–8 weeks size', '8–10 weeks size', '10–12 weeks', '&gt;12 weeks', 'Retroverted uterus']} value={uterineSize} onChange={setUterineSize} />
              </FL>
              <FL label="Uterine consistency">
                <Pills options={['Normal', 'Bulky / globular (adenomyosis)', 'Irregular (fibroids)', 'Fixed / immobile (endometriosis)']} value={uterineConsistency} onChange={setUterineConsistency} />
              </FL>
            </div>
            <FL label="Adnexae">
              <Pills options={['Normal bilaterally', 'Left adnexal mass', 'Right adnexal mass', 'Bilateral masses', 'Tenderness on movement of cervix', 'Not assessable']} value={adenxae} onChange={setAdnexae} />
            </FL>
            <FL label="Pelvic tenderness">
              <Pills options={['None', 'Uterine tenderness', 'Adnexal tenderness', 'Cervical excitation (CMT)', 'Pouch of Douglas tenderness (endometriosis)']} value={pvTenderness} onChange={setPvTenderness} multi />
            </FL>
          </Section>
        </div>
      )

      case 5: return (
        <div className="space-y-5">
          <Section title="Laboratory Investigations" value={secInvest} onChange={setSecInvest} accent="blue">
            <div className="grid grid-cols-3 gap-4">
              <FL label="Haemoglobin" sub="g/dL">
                <input type="number" value={hbInv} onChange={e => setHbInv(e.target.value)} step="0.1" className={inp} />
              </FL>
              <FL label="Serum ferritin" sub="ng/mL">
                <input type="number" value={ferritin} onChange={e => setFerritin(e.target.value)} className={inp} />
                {Number(ferritin) < 15 && ferritin && <span className="text-xs text-red-700 font-semibold mt-0.5 block">Iron deficient ferritin</span>}
              </FL>
              <FL label="TSH" sub="mIU/L">
                <input type="number" value={tsh} onChange={e => setTsh(e.target.value)} step="0.01" className={inp} />
                {Number(tsh) > 4 && tsh && <span className="text-xs text-orange-700 font-semibold mt-0.5 block">Elevated TSH — hypothyroid</span>}
              </FL>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FL label="Prolactin" sub="mIU/L">
                <input type="number" value={prolactin} onChange={e => setProlactin(e.target.value)} className={inp} />
                {Number(prolactin) > 1000 && <span className="text-xs text-orange-700 font-semibold mt-0.5 block">Raised — recheck, exclude macroprolactin</span>}
              </FL>
              <FL label="LH" sub="IU/L">
                <input type="number" value={lh} onChange={e => setLh(e.target.value)} className={inp} />
              </FL>
              <FL label="FSH" sub="IU/L">
                <input type="number" value={fsh} onChange={e => setFsh(e.target.value)} className={inp} />
                {Number(fsh) > 25 && fsh && <span className="text-xs text-orange-700 font-semibold mt-0.5 block">High FSH — POI?</span>}
              </FL>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FL label="LH:FSH ratio" sub="(PCOS &gt;2.5)">
                <input type="number" value={lhFshRatio} onChange={e => setLhFshRatio(e.target.value)} step="0.1" className={inp} />
                {Number(lhFshRatio) > 2.5 && <span className="text-xs text-orange-700 font-semibold mt-0.5 block">Raised — PCOS?</span>}
              </FL>
              <FL label="Testosterone" sub="nmol/L">
                <input type="number" value={testosterone} onChange={e => setTestosterone(e.target.value)} step="0.1" className={inp} />
              </FL>
              <FL label="AMH" sub="pmol/L">
                <input type="number" value={amh} onChange={e => setAmh(e.target.value)} step="0.01" className={inp} />
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FL label="SHBG" sub="nmol/L">
                <input type="number" value={shbg} onChange={e => setShbg(e.target.value)} className={inp} />
              </FL>
              <FL label="Coagulation profile">
                <input value={coagProfile} onChange={e => setCoagProfile(e.target.value)} placeholder="PT, aPTT, vWF antigen..." className={inp} />
              </FL>
            </div>
          </Section>

          <Section title="Imaging & Procedures" value={secImaging} onChange={setSecImaging} accent="purple">
            <FL label="TVUS (transvaginal ultrasound) findings">
              <textarea value={tvusFindings} onChange={e => setTvusFindings(e.target.value)} rows={3} className={ta} placeholder="Uterine size, endometrial thickness, fibroids, polyps, ovarian cysts, free fluid..." />
            </FL>
            <Gate label="Saline hysteroscopy / SIS?" value={salineHysterosono} onChange={setSalineHysterosono} />
            <Gate label="MRI pelvis?" value={mriPelvis} onChange={setMriPelvis} />
            <Gate label="Hysteroscopy performed?" value={hysteroscopy} onChange={setHysteroscopy}>
              <FL label="Hysteroscopy findings">
                <textarea value={hysteroscopyFindings} onChange={e => setHysteroscopyFindings(e.target.value)} rows={2} className={ta} placeholder="Normal cavity, polyp, fibroid, adhesions, irregular endometrium..." />
              </FL>
            </Gate>
            <Gate label="Laparoscopy performed?" value={laparoscopy} onChange={setLaparoscopy}>
              <FL label="Laparoscopy findings">
                <textarea value={laparoscopyFindings} onChange={e => setLaparoscopyFindings(e.target.value)} rows={2} className={ta} placeholder="Endometriosis deposits, adhesions, ovarian endometrioma, normal pelvis..." />
              </FL>
            </Gate>
            <Gate label="Endometrial biopsy (Pipelle)?">
              <FL label="Histology result">
                <input value={biopsyFindings} onChange={e => setBiopsyFindings(e.target.value)} placeholder="Proliferative, secretory, simple hyperplasia, atypical hyperplasia, carcinoma..." className={inp} />
              </FL>
            </Gate>
          </Section>
        </div>
      )

      case 6: return (
        <div className="space-y-5">
          {/* PALM-COEIN summary */}
          {palmCoeinFlags.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl">
              <p className="text-xs font-bold text-rose-700 mb-2">PALM-COEIN Classification:</p>
              {palmCoeinFlags.map(f => <p key={f} className="text-xs text-rose-600">• {f}</p>)}
            </div>
          )}
          {redFlagAlert.length > 0 && (
            <div className="p-3 bg-red-50 border-2 border-red-400 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} className="text-red-600 animate-pulse" />
                <p className="text-xs font-bold text-red-700">Red Flags</p>
              </div>
              {redFlagAlert.map(r => <p key={r} className="text-xs text-red-600">• {r}</p>)}
            </div>
          )}

          <Section title="Medical Management" value={secMedMgmt} onChange={setSecMedMgmt} accent="teal">
            <FL label="Medical treatment option(s)">
              <Pills options={[
                'LNG-IUS (Mirena) — first-line HMB',
                'Tranexamic acid 1g TDS (days 1–4)',
                'Mefenamic acid 500mg TDS (NSAIDs)',
                'Combined OCP',
                'Progesterone-only pill (norethisterone 5mg TDS days 5–26)',
                'Depot medroxyprogesterone acetate (DMPA)',
                'GnRH agonist (Goserelin / Leuprorelin) — pre-op / adenomyosis',
                'Dienogest (endometriosis)',
                'Danazol (limited by side effects)',
              ]} value={medOptions} onChange={setMedOptions} multi accent="teal" />
            </FL>
            {medOptions.includes('LNG-IUS (Mirena) — first-line HMB') && (
              <p className="text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded p-2">
                LNG-IUS: reduces menstrual blood loss by 80–95% over 3–6 months. Initial irregular spotting common. Effective for 5 years. First-line in NICE guidelines for HMB without significant structural cause.
              </p>
            )}
            <FL label="Hormonal treatment details / doses">
              <input value={hormonalDetails} onChange={e => setHormonalDetails(e.target.value)} placeholder="e.g. Norethisterone 5mg TDS days 5–26, cycle 3/12, then reassess" className={inp} />
            </FL>
            <Gate label="Iron supplementation prescribed?" value={ironRx} onChange={setIronRx} />
            <Gate label="Tranexamic acid prescribed?" value={tranexamic} onChange={setTranexamic} />
            <Gate label="NSAIDs prescribed?" value={nsaids} onChange={setNsaids} />
            <Gate label="GnRH analogue prescribed?" value={gnrh} onChange={setGnrhAnalogue}>
              <p className="text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded p-2">GnRH analogue: amenorrhoea expected within 6 weeks. Add-back HRT if &gt;6 months to prevent bone loss. Maximum 6 months without add-back.</p>
            </Gate>
          </Section>

          <Section title="Surgical Management" value={secSurgMgmt} onChange={setSecSurgMgmt} accent="orange">
            <FL label="Surgical option(s) considered">
              <Pills options={[
                'Hysteroscopic polypectomy',
                'Hysteroscopic myomectomy (submucosal fibroid)',
                'Endometrial ablation (NovaSure / thermal)',
                'Laparoscopic myomectomy',
                'Open myomectomy (abdominal)',
                'Uterine artery embolisation (UAE)',
                'Laparoscopic hysterectomy (total)',
                'Abdominal hysterectomy',
                'Vaginal hysterectomy',
                'Laparoscopic treatment of endometriosis',
                'Bilateral salpingo-oophorectomy (BSO)',
              ]} value={surgOptions} onChange={setSurgOptions} multi accent="orange" />
            </FL>
            <FL label="Surgical plan details">
              <textarea value={surgDetails} onChange={e => setSurgDetails(e.target.value)} rows={2} className={ta} placeholder="Planned date, anaesthetic type, pre-op workup required..." />
            </FL>
            <Gate label="Consent obtained / documented?" value={consentObtained} onChange={setConsentObtained} />
          </Section>

          <Section title="Follow-up & Referral" value={secFollowUp} onChange={setSecFollowUp} accent="green">
            <FL label="Follow-up interval">
              <Pills options={['4–6 weeks (post-LNG-IUS insertion)', '3 months', '6 months', 'Annual', 'After investigations']} value={followUpInterval} onChange={setFollowUpInterval} accent="green" />
            </FL>
            <Gate label="Repeat USG scheduled?" value={repeatUSG} onChange={setRepeatUSG} />
            <Gate label="Oncology / 2-week cancer referral?" value={referOncology} onChange={setReferOncology} />
            <Gate label="Endocrinology referral?" value={referEndocrinology} onChange={setReferEndocrinology} />
            <Gate label="Fertility counselling / referral?" value={fertilityCounselling} onChange={setFertilityCounselling} />
          </Section>

          <div>
            <FL label="Overall Plan Notes">
              <textarea value={planNotes} onChange={e => setPlanNotes(e.target.value)} rows={4} className={ta} placeholder="Summary of diagnosis, management plan, counselling given, follow-up..." />
            </FL>
          </div>
        </div>
      )

      default: return null
    }
  }

  const headerBadge = useMemo(() => {
    if (redFlagAlert.length > 0) return { label: 'RED FLAG', color: 'bg-red-600 text-white animate-pulse' }
    if (palmCoeinFlags.length > 0) return { label: palmCoeinFlags[0]?.charAt(0), color: 'bg-rose-500 text-white' }
    return null
  }, [redFlagAlert, palmCoeinFlags])

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-rose-600 to-pink-600 px-6 py-5 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Droplets size={22} />
            </div>
            <div>
              <p className="text-rose-200 text-xs font-medium uppercase tracking-wider">OBG Assessment</p>
              <h1 className="text-xl font-bold">Menstrual Disorder</h1>
              <p className="text-rose-200 text-xs mt-0.5">AUB · PALM-COEIN Classification</p>
            </div>
          </div>
          <div className="text-right space-y-1">
            {headerBadge && <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-lg ${headerBadge.color}`}>{headerBadge.label}</span>}
            {palmCoeinFlags.length > 0 && <p className="text-rose-200 text-xs">{palmCoeinFlags.length} cause(s)</p>}
          </div>
        </div>
        <div className="mt-4 flex gap-1">
          {STAGES.map((s, i) => (
            <button key={s} type="button" onClick={() => setStage(i)}
              className={`flex-1 h-1.5 rounded-full transition-all ${i === stage ? 'bg-white' : i < stage ? 'bg-rose-300' : 'bg-white/20'}`} />
          ))}
        </div>
        <p className="text-rose-200 text-xs mt-1.5">{stage + 1} / {STAGES.length} — {STAGES[stage]}</p>
      </div>

      <div className="flex border-b border-gray-100 overflow-x-auto bg-gray-50/60">
        {STAGES.map((s, i) => (
          <button key={s} type="button" onClick={() => setStage(i)}
            className={`px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
              i === stage ? 'border-rose-500 text-rose-600' : 'border-transparent text-gray-400 hover:text-gray-600'
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
            className={`${navBtn} bg-rose-500 text-white hover:bg-rose-600`}>
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button type="button" onClick={handleSave} disabled={saving}
            className={`${navBtn} bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60`}>
            {saving ? 'Saving…' : 'Save Assessment'}
          </button>
        )}
      </div>
    </div>
  )
}
