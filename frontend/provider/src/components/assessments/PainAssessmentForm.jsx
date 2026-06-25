import { useState, useMemo } from 'react'
import { Loader2, CheckCircle, AlertCircle, Zap } from 'lucide-react'
import { usePin } from '../../contexts/PinContext'
import SignatureBlock from '../SignatureBlock'
import api from '../../api/client'

// ── Specialty detection ───────────────────────────────────────────────────────

const SPECIALTY_MAP = {
  orthopaedics:'ortho', orthopedics:'ortho', ortho:'ortho',
  neurology:'neuro', cardiology:'cardio',
  gastroenterology:'gastro', gastrology:'gastro',
  gynaecology:'gynae', gynecology:'gynae', obstetrics:'gynae',
  urology:'urology', ent:'ent', otorhinolaryngology:'ent',
  oncology:'oncology', pulmonology:'pulmo', respiratory:'pulmo',
  rheumatology:'rheum', dermatology:'derm', dentistry:'dental',
  'general surgery':'general', 'general medicine':'general', 'internal medicine':'general',
}

const SPECIALTY_DISPLAY = {
  ortho:'Orthopaedics', neuro:'Neurology', cardio:'Cardiology',
  gastro:'Gastroenterology', gynae:'Gynaecology', urology:'Urology',
  ent:'ENT', oncology:'Oncology', pulmo:'Pulmonology',
  rheum:'Rheumatology', derm:'Dermatology', dental:'Dentistry', general:'General',
}

function detectSpecialty(admission) {
  const raw = (admission?.doctor?.specialty || admission?.doctor?.specialization || admission?.ward?.specialty || '').toLowerCase().trim()
  return SPECIALTY_MAP[raw] || 'general'
}

// ── Location configs ──────────────────────────────────────────────────────────

const LOC = {
  ortho: {
    joints: ['Shoulder','Elbow','Wrist','Hand / Fingers','Hip','Knee','Ankle','Foot / Toes','Cervical Spine','Thoracic Spine','Lumbar Spine','Sacroiliac'],
    sides: ['Left','Right','Bilateral'],
    aspects: ['Anterior','Posterior','Medial','Lateral','Diffuse'],
  },
  neuro: {
    headRegions: ['Frontal','Temporal (L)','Temporal (R)','Occipital','Vertex','Hemicranial (L)','Hemicranial (R)','Holocranial','Facial','Periorbital'],
    spinalLevels: ['Cervical (C)','Thoracic (T)','Lumbar (L)','Sacral (S)'],
    radiation: ['Down arm','Down leg','Across dermatome','No radiation'],
  },
  cardio: {
    chestZones: ['Central / Substernal','Left chest','Right chest','Epigastric'],
    radiation: ['Left arm','Right arm','Left jaw','Right jaw','Back (interscapular)','Neck','None'],
  },
  gastro: {
    quadrants: ['Right Upper Quadrant (RUQ)','Left Upper Quadrant (LUQ)','Right Lower Quadrant (RLQ)','Left Lower Quadrant (LLQ)','Epigastric','Periumbilical','Suprapubic','Diffuse'],
  },
  gynae: { locations: ['Right adnexa','Left adnexa','Central pelvic','Suprapubic','Lower back / Sacral','Vaginal'] },
  urology: { locations: ['Right flank / loin','Left flank / loin','Right groin','Left groin','Suprapubic','Perineal','Scrotal / Testicular'] },
  ent: { locations: ['Right ear','Left ear','Throat / Oropharynx','Right sinus','Left sinus','Frontal sinus','Face / Jaw','Neck'] },
  oncology: { sites: ['Head / Brain','Neck','Chest','Abdomen','Pelvis','Back / Spine','Limbs','Generalised'] },
  pulmo: { locations: ['Right chest','Left chest','Bilateral chest','Central'], sides: ['Left','Right','Bilateral'] },
  rheum: {
    joints: ['Small joints (hands)','Small joints (feet)','Wrist','Elbow','Shoulder','Hip','Knee','Ankle','Spine','Polyarticular'],
    distribution: ['Symmetrical','Asymmetrical','Migratory'],
  },
  derm: { sites: ['Face','Scalp','Neck','Chest','Back','Abdomen','Upper limb','Lower limb','Groin / Genital','Diffuse'] },
  dental: {
    jaw: ['Upper (Maxillary)','Lower (Mandibular)'],
    side: ['Left','Right','Both'],
    area: ['Front (incisors/canine)','Premolar','Molar','Wisdom tooth','Gingival / Gum','Jaw joint (TMJ)'],
  },
  general: {
    regions: ['Head','Face','Neck','Chest (central)','Chest (left)','Chest (right)','Upper abdomen','Lower abdomen','Back (upper)','Back (lower)','Right shoulder','Left shoulder','Right arm','Left arm','Right hip','Left hip','Right leg','Left leg','Generalised'],
  },
}

// ── Pain character ────────────────────────────────────────────────────────────

const CHAR_BASE = ['Burning','Stabbing','Throbbing','Aching','Cramping','Pressure','Dull','Sharp','Shooting']
const CHAR_EXTRA = {
  ortho:   ['Mechanical (worse on movement)','Stiffness','Deep ache'],
  neuro:   ['Electric shock','Pins & needles','Lancinating','Band-like','Pulsating'],
  cardio:  ['Squeezing / Tightening','Tearing / Ripping','Heaviness'],
  gastro:  ['Colicky','Crampy','Bloating sensation'],
  gynae:   ['Crampy','Dragging'],
  urology: ['Colicky','Griping'],
  pulmo:   ['Pleuritic (worse on breathing)','Tightness'],
  rheum:   ['Stiffness','Deep ache','Swelling sensation'],
  ent:     ['Swallowing pain','Pulsating','Pressure'],
  oncology:['Constant','Breakthrough','Deep dull'],
  derm:    ['Itching / Pruritus','Tingling'],
  dental:  ['Thermal sensitivity','Pulsating','Constant dull'],
  general: [],
}

const AGGRAVATING = ['Movement','Rest','Pressure / Touch','Food (before)','Food (after)','Stress','Cold','Heat','Exertion','Breathing','Swallowing','Coughing / Sneezing','Position change']
const RELIEVING   = ['Rest','Heat application','Cold application','Analgesics','Antacids','Position change','Food','Massage','Sleep','Nitrates','None']
const DAILY_LIFE  = ['Sleep','Work / Studies','Walking / Mobility','Appetite','Mood','Social activity']
const FREQ_OPTS   = ['Constant','Intermittent','Episodic','First episode']
const TIME_OPTS   = ['Morning','Afternoon','Evening','Nocturnal','Post-activity','No pattern']
const DUR_UNITS   = ['Minutes','Hours','Days','Weeks','Months']
const FACE_EMOJI  = ['😊','🙂','😐','😟','😣','😭']
const FACE_LABELS = ['No hurt','Hurts a little','Hurts more','Hurts even more','Hurts a lot','Hurts worst']

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcAge(dob) {
  if (!dob) return null
  const d = new Date(dob), t = new Date()
  let a = t.getFullYear() - d.getFullYear()
  if (t.getMonth() - d.getMonth() < 0 || (t.getMonth() === d.getMonth() && t.getDate() < d.getDate())) a--
  return a >= 0 ? a : null
}

function MultiPill({ options, selected = [], onChange, activeClass = 'bg-blue-600 text-white border-blue-600' }) {
  const toggle = o => { const s = new Set(selected); s.has(o) ? s.delete(o) : s.add(o); onChange([...s]) }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button key={o} type="button" onClick={() => toggle(o)}
          className={`px-2.5 py-0.5 text-xs rounded-full border font-medium transition-colors
            ${selected.includes(o) ? activeClass : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
          {o}
        </button>
      ))}
    </div>
  )
}

function YesNo({ value, onChange }) {
  return (
    <div className="flex gap-1.5">
      {['Yes','No'].map(o => (
        <button key={o} type="button" onClick={() => onChange(value === o ? null : o)}
          className={`px-3 py-0.5 text-xs rounded-lg border font-semibold transition-colors
            ${value === o
              ? o === 'Yes' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-700 text-white border-gray-700'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
          {o}
        </button>
      ))}
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 sm:w-44 shrink-0 pt-0.5 font-medium">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function GridPill({ options, selected = [], onChange, cols = 3, activeClass = 'bg-blue-600 text-white border-blue-600' }) {
  const toggle = o => { const s = new Set(selected); s.has(o) ? s.delete(o) : s.add(o); onChange([...s]) }
  return (
    <div className={`grid grid-cols-${cols} gap-1`}>
      {options.map(o => (
        <button key={o} type="button" onClick={() => toggle(o)}
          className={`px-2 py-1.5 text-xs rounded-lg border font-medium text-left transition-colors
            ${selected.includes(o) ? activeClass : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
          {o}
        </button>
      ))}
    </div>
  )
}

// ── Location selector ─────────────────────────────────────────────────────────

function LocationSelector({ specialty, locData, onChange }) {
  const set = (f, v) => onChange({ ...locData, [f]: v })
  const toggleArr = (f, v) => { const s = new Set(locData[f]||[]); s.has(v)?s.delete(v):s.add(v); set(f,[...s]) }
  const cfg = LOC[specialty] || LOC.general

  if (specialty === 'ortho') return (
    <div className="space-y-2">
      <Row label="Joint / Region"><GridPill options={cfg.joints} cols={3}
        selected={locData.joint ? [locData.joint] : []}
        onChange={v => set('joint', v[v.length-1]||'')} /></Row>
      <Row label="Side"><MultiPill options={cfg.sides} selected={locData.side?[locData.side]:[]}
        onChange={v => set('side', v[v.length-1]||'')} /></Row>
      <Row label="Aspect"><MultiPill options={cfg.aspects} selected={locData.aspects||[]}
        onChange={v => set('aspects', v)} /></Row>
    </div>
  )

  if (specialty === 'neuro') return (
    <div className="space-y-2">
      <Row label="Head region"><GridPill options={cfg.headRegions} cols={3}
        selected={locData.head_regions||[]} onChange={v => set('head_regions', v)} /></Row>
      <Row label="Spinal level"><MultiPill options={cfg.spinalLevels}
        selected={locData.spinal_levels||[]} onChange={v => set('spinal_levels', v)} /></Row>
      <Row label="Radiation"><MultiPill options={cfg.radiation}
        selected={locData.radiation||[]} onChange={v => set('radiation', v)} /></Row>
    </div>
  )

  if (specialty === 'cardio') return (
    <div className="space-y-2">
      <Row label="Chest zone"><MultiPill options={cfg.chestZones}
        selected={locData.chest_zones||[]} onChange={v => set('chest_zones', v)} /></Row>
      <Row label="Radiation to"><MultiPill options={cfg.radiation}
        selected={locData.radiation||[]} onChange={v => set('radiation', v)} /></Row>
    </div>
  )

  if (specialty === 'gastro') return (
    <Row label="Abdominal region"><GridPill options={cfg.quadrants} cols={2}
      selected={locData.quadrants||[]} onChange={v => set('quadrants', v)} /></Row>
  )

  if (specialty === 'rheum') return (
    <div className="space-y-2">
      <Row label="Joints involved"><GridPill options={cfg.joints} cols={2}
        selected={locData.joints||[]} onChange={v => set('joints', v)} /></Row>
      <Row label="Distribution"><MultiPill options={cfg.distribution}
        selected={locData.distribution?[locData.distribution]:[]}
        onChange={v => set('distribution', v[v.length-1]||'')} /></Row>
    </div>
  )

  if (specialty === 'dental') return (
    <div className="space-y-2">
      <Row label="Jaw"><MultiPill options={cfg.jaw} selected={locData.jaw||[]} onChange={v => set('jaw', v)} /></Row>
      <Row label="Side"><MultiPill options={cfg.side} selected={locData.side||[]} onChange={v => set('side', v)} /></Row>
      <Row label="Area"><MultiPill options={cfg.area} selected={locData.area||[]} onChange={v => set('area', v)} /></Row>
    </div>
  )

  // All other specialties with a flat list
  const listKey = specialty === 'oncology' ? 'sites' : specialty === 'derm' ? 'sites' : 'locations'
  const opts = cfg[listKey] || cfg.regions || []
  return (
    <div className="space-y-2">
      <Row label="Location"><GridPill options={opts} cols={2}
        selected={locData.locations||[]} onChange={v => set('locations', v)} /></Row>
      {cfg.sides && (
        <Row label="Side"><MultiPill options={cfg.sides}
          selected={locData.side?[locData.side]:[]}
          onChange={v => set('side', v[v.length-1]||'')} /></Row>
      )}
    </div>
  )
}

// ── Specialty questions ───────────────────────────────────────────────────────

function SpecialtyQuestions({ specialty, data, onChange }) {
  const set = (f, v) => onChange({ ...data, [f]: v })

  const questions = {
    ortho: [
      ['Swelling', <YesNo value={data.swelling} onChange={v=>set('swelling',v)} />],
      ['ROM restricted', <YesNo value={data.rom} onChange={v=>set('rom',v)} />],
      ['Weight-bearing', <MultiPill options={['Full','Partial','Non-weight-bearing']} selected={data.wb?[data.wb]:[]} onChange={v=>set('wb',v[v.length-1]||'')} />],
      ['Deformity', <YesNo value={data.deformity} onChange={v=>set('deformity',v)} />],
      ['Trauma / fall', <YesNo value={data.trauma} onChange={v=>set('trauma',v)} />],
    ],
    neuro: [
      ['Nausea / Vomiting', <YesNo value={data.nausea} onChange={v=>set('nausea',v)} />],
      ['Photophobia', <YesNo value={data.photophobia} onChange={v=>set('photophobia',v)} />],
      ['Phonophobia', <YesNo value={data.phonophobia} onChange={v=>set('phonophobia',v)} />],
      ['Aura before pain', <YesNo value={data.aura} onChange={v=>set('aura',v)} />],
      ['Neurological deficit', <MultiPill options={['Weakness','Numbness','Vision change','Speech difficulty','None']} selected={data.deficit||[]} onChange={v=>set('deficit',v)} />],
    ],
    cardio: [
      ['Exertional', <YesNo value={data.exertional} onChange={v=>set('exertional',v)} />],
      ['Rest pain', <YesNo value={data.rest_pain} onChange={v=>set('rest_pain',v)} />],
      ['Diaphoresis', <YesNo value={data.diaphoresis} onChange={v=>set('diaphoresis',v)} />],
      ['Relief with nitrates', <YesNo value={data.nitrate_relief} onChange={v=>set('nitrate_relief',v)} />],
      ['Palpitations', <YesNo value={data.palpitations} onChange={v=>set('palpitations',v)} />],
    ],
    gastro: [
      ['Relation to food', <MultiPill options={['Before meals','After meals','With fatty food','Unrelated']} selected={data.food_rel||[]} onChange={v=>set('food_rel',v)} />],
      ['Nausea / Vomiting', <YesNo value={data.nausea} onChange={v=>set('nausea',v)} />],
      ['Bowel change', <MultiPill options={['Diarrhoea','Constipation','Alternating','Normal']} selected={data.bowel||[]} onChange={v=>set('bowel',v)} />],
      ['Jaundice', <YesNo value={data.jaundice} onChange={v=>set('jaundice',v)} />],
      ['Guarding / Rigidity', <YesNo value={data.guarding} onChange={v=>set('guarding',v)} />],
    ],
    gynae: [
      ['Menstrual relation', <MultiPill options={['With periods','Mid-cycle','Post-coital','Unrelated']} selected={data.menstrual||[]} onChange={v=>set('menstrual',v)} />],
      ['Dyspareunia', <YesNo value={data.dyspareunia} onChange={v=>set('dyspareunia',v)} />],
      ['Vaginal discharge', <YesNo value={data.discharge} onChange={v=>set('discharge',v)} />],
      ['Fever', <YesNo value={data.fever} onChange={v=>set('fever',v)} />],
    ],
    urology: [
      ['Dysuria', <YesNo value={data.dysuria} onChange={v=>set('dysuria',v)} />],
      ['Haematuria', <YesNo value={data.haematuria} onChange={v=>set('haematuria',v)} />],
      ['Frequency / Urgency', <YesNo value={data.frequency} onChange={v=>set('frequency',v)} />],
      ['Radiation to groin', <YesNo value={data.radiation_groin} onChange={v=>set('radiation_groin',v)} />],
      ['Nausea / Vomiting', <YesNo value={data.nausea} onChange={v=>set('nausea',v)} />],
    ],
    ent: [
      ['Odynophagia (pain on swallowing)', <YesNo value={data.odynophagia} onChange={v=>set('odynophagia',v)} />],
      ['Ear discharge', <YesNo value={data.ear_discharge} onChange={v=>set('ear_discharge',v)} />],
      ['Sinus tenderness', <YesNo value={data.sinus} onChange={v=>set('sinus',v)} />],
      ['Trismus (jaw stiffness)', <YesNo value={data.trismus} onChange={v=>set('trismus',v)} />],
    ],
    oncology: [
      ['Breakthrough pain', <YesNo value={data.breakthrough} onChange={v=>set('breakthrough',v)} />],
      ['Currently on opioids', <YesNo value={data.opioids} onChange={v=>set('opioids',v)} />],
      ['Pain crisis in last 24h', <YesNo value={data.crisis} onChange={v=>set('crisis',v)} />],
      ['WHO ladder step', <MultiPill options={['Step 1 (non-opioid)','Step 2 (weak opioid)','Step 3 (strong opioid)']} selected={data.who_step?[data.who_step]:[]} onChange={v=>set('who_step',v[v.length-1]||'')} />],
    ],
    rheum: [
      ['Morning stiffness (mins)', <div className="flex items-center gap-2"><input type="number" min={0} max={300} value={data.stiffness||''} onChange={e=>set('stiffness',e.target.value)} placeholder="mins" className="w-16 border border-gray-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" /></div>],
      ['Swollen joints', <YesNo value={data.swollen} onChange={v=>set('swollen',v)} />],
      ['Tender joints', <YesNo value={data.tender} onChange={v=>set('tender',v)} />],
      ['Systemic symptoms', <MultiPill options={['Fever','Fatigue','Rash','Eye symptoms','None']} selected={data.systemic||[]} onChange={v=>set('systemic',v)} />],
    ],
    pulmo: [
      ['Pleuritic (worse on breathing)', <YesNo value={data.pleuritic} onChange={v=>set('pleuritic',v)} />],
      ['Dyspnoea', <YesNo value={data.dyspnoea} onChange={v=>set('dyspnoea',v)} />],
      ['Cough', <YesNo value={data.cough} onChange={v=>set('cough',v)} />],
    ],
    dental: [
      ['Thermal sensitivity', <YesNo value={data.thermal} onChange={v=>set('thermal',v)} />],
      ['Pain on biting', <YesNo value={data.bite_pain} onChange={v=>set('bite_pain',v)} />],
      ['Swelling / abscess', <YesNo value={data.swelling} onChange={v=>set('swelling',v)} />],
      ['Previous dental work', <YesNo value={data.dental_work} onChange={v=>set('dental_work',v)} />],
    ],
    derm: [
      ['Pruritus (itching)', <YesNo value={data.pruritus} onChange={v=>set('pruritus',v)} />],
      ['Worse at night', <YesNo value={data.nocturnal} onChange={v=>set('nocturnal',v)} />],
      ['Trigger identified', <YesNo value={data.trigger} onChange={v=>set('trigger',v)} />],
    ],
  }

  const qs = questions[specialty] || []
  if (!qs.length) return null

  return (
    <div>
      {qs.map(([label, control]) => (
        <Row key={label} label={label}>{control}</Row>
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PainAssessmentForm({ admission, onClose, onSaved }) {
  const age        = calcAge(admission?.patient?.date_of_birth)
  const detectedSp = useMemo(() => detectSpecialty(admission), [admission])

  const defaultScale = age !== null && age < 4 ? 'flacc' : age !== null && age < 8 ? 'faces' : 'nrs'

  const [specialty,      setSpecialty]      = useState(detectedSp)
  const [scaleType,      setScaleType]      = useState(defaultScale)
  const [intensity,      setIntensity]      = useState(null)
  const [locData,        setLocData]        = useState({})
  const [characters,     setCharacters]     = useState([])
  const [onset,          setOnset]          = useState(null)
  const [duration,       setDuration]       = useState('')
  const [durationUnit,   setDurationUnit]   = useState('Days')
  const [frequency,      setFrequency]      = useState(null)
  const [timePattern,    setTimePattern]    = useState([])
  const [aggravating,    setAggravating]    = useState([])
  const [relieving,      setRelieving]      = useState([])
  const [dailyLife,      setDailyLife]      = useState([])
  const [currentMeds,    setCurrentMeds]    = useState(null)
  const [currentMedsText,setCurrentMedsText]= useState('')
  const [specData,       setSpecData]       = useState({})
  const [notes,          setNotes]          = useState('')
  const [saving,         setSaving]         = useState(false)
  const [error,          setError]          = useState(null)
  const [done,           setDone]           = useState(false)
  const { pin }                             = usePin()

  const charOptions = [...CHAR_BASE, ...(CHAR_EXTRA[specialty] || [])]

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      const payload = {
        type: 'pain_assessment', specialty,
        intensity, scale_type: scaleType,
        location: locData, characters,
        onset, duration, duration_unit: durationUnit,
        frequency, time_pattern: timePattern,
        aggravating, relieving,
        daily_life_impact: dailyLife,
        current_medications: currentMeds,
        current_medications_text: currentMedsText,
        specialty_data: specData, notes,
      }
      await api.post(
        `/inpatient/admissions/${admission.id}/notes`,
        { note_type: 'assessment', note_text: JSON.stringify(payload) },
        pin ? { headers: { 'X-PIN': pin } } : {}
      )
      setDone(true)
      setTimeout(() => { onSaved?.() }, 1200)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Save failed')
    } finally { setSaving(false) }
  }

  if (done) return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 py-12">
      <CheckCircle size={40} className="text-emerald-500" />
      <p className="font-semibold text-gray-700">Pain Assessment saved</p>
    </div>
  )

  return (
    <div className="flex flex-col h-full">

      {/* Badge + specialty override */}
      <div className="shrink-0 px-6 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-full">
          <Zap size={12} /> [A] Pain Assessment
        </span>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Specialty:</span>
          <select value={specialty}
            onChange={e => { setSpecialty(e.target.value); setLocData({}); setSpecData({}) }}
            className="border border-gray-300 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-rose-400 font-semibold text-gray-700">
            {Object.entries(SPECIALTY_DISPLAY).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {specialty !== detectedSp && <span className="text-orange-500">(overridden)</span>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

        {/* ── INTENSITY ── */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pain Intensity</p>
            <div className="flex gap-1">
              {[['nrs','NRS 0-10'],['faces','FACES'],['flacc','FLACC']].map(([k,lbl]) => (
                <button key={k} type="button" onClick={() => setScaleType(k)}
                  className={`px-2 py-0.5 text-xs rounded border font-medium transition-colors
                    ${scaleType === k ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'}`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {scaleType === 'nrs' && (
            <div>
              <div className="flex gap-1 flex-wrap">
                {Array.from({length:11},(_,i)=>i).map(n => (
                  <button key={n} type="button" onClick={() => setIntensity(n)}
                    className={`w-8 h-8 rounded-lg text-sm font-bold border transition-colors
                      ${intensity === n
                        ? n <= 3 ? 'bg-green-500 text-white border-green-500'
                          : n <= 6 ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
                    {n}
                  </button>
                ))}
              </div>
              {intensity !== null && (
                <p className="mt-1.5 text-xs font-semibold">
                  {intensity === 0 ? <span className="text-green-600">No pain</span>
                    : intensity <= 3 ? <span className="text-green-600">Mild ({intensity}/10)</span>
                    : intensity <= 6 ? <span className="text-orange-500">Moderate ({intensity}/10)</span>
                    : <span className="text-red-600">Severe ({intensity}/10)</span>}
                </p>
              )}
            </div>
          )}

          {scaleType === 'faces' && (
            <div className="flex gap-2 flex-wrap">
              {FACE_LABELS.map((lbl, i) => (
                <button key={i} type="button" onClick={() => setIntensity(i * 2)}
                  className={`flex flex-col items-center px-2 py-1.5 rounded-lg border text-xs transition-colors min-w-[52px]
                    ${intensity === i*2 ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  <span className="text-xl">{FACE_EMOJI[i]}</span>
                  <span className="text-center leading-tight mt-0.5" style={{fontSize:'0.6rem'}}>{lbl}</span>
                </button>
              ))}
            </div>
          )}

          {scaleType === 'flacc' && (
            <div>
              <p className="text-xs text-gray-400 mb-2 italic">Observe: Face · Legs · Activity · Cry · Consolability (0-2 each, max 10)</p>
              <div className="grid grid-cols-3 gap-2">
                {['Face','Legs','Activity','Cry','Consolability'].map(cat => (
                  <div key={cat} className="space-y-1">
                    <p className="text-xs font-semibold text-gray-600">{cat}</p>
                    {['0','1','2'].map(score => (
                      <button key={score} type="button"
                        onClick={() => setSpecData(p => ({ ...p, [`flacc_${cat.toLowerCase()}`]: score }))}
                        className={`w-full text-left px-2 py-1 rounded border text-xs transition-colors
                          ${specData[`flacc_${cat.toLowerCase()}`] === score
                            ? 'bg-rose-500 text-white border-rose-500'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                        {score}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── LOCATION ── */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Location — <span className="text-blue-600">{SPECIALTY_DISPLAY[specialty]}</span>
          </p>
          <div className="bg-gray-50 rounded-xl p-3">
            <LocationSelector specialty={specialty} locData={locData} onChange={setLocData} />
          </div>
        </div>

        {/* ── CHARACTER ── */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Pain Character</p>
          <div className="grid grid-cols-3 gap-1">
            {charOptions.map(c => (
              <button key={c} type="button"
                onClick={() => { const s = new Set(characters); s.has(c)?s.delete(c):s.add(c); setCharacters([...s]) }}
                className={`px-2 py-1.5 text-xs rounded-lg border font-medium text-left transition-colors
                  ${characters.includes(c) ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* ── ONSET / DURATION / FREQUENCY / TIME ── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Onset</p>
            <MultiPill options={['Sudden','Gradual']} selected={onset?[onset]:[]}
              onChange={v => setOnset(v[v.length-1]||null)} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Duration</p>
            <div className="flex gap-1.5 items-center">
              <input type="number" min={1} max={999} value={duration}
                onChange={e => setDuration(e.target.value)} placeholder="e.g. 3"
                className="w-14 border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
              <select value={durationUnit} onChange={e => setDurationUnit(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
                {DUR_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Frequency</p>
            <MultiPill options={FREQ_OPTS} selected={frequency?[frequency]:[]}
              onChange={v => setFrequency(v[v.length-1]||null)} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Time pattern</p>
            <MultiPill options={TIME_OPTS} selected={timePattern} onChange={setTimePattern} />
          </div>
        </div>

        {/* ── AGGRAVATING / RELIEVING ── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Aggravating</p>
            <MultiPill options={AGGRAVATING} selected={aggravating} onChange={setAggravating}
              activeClass="bg-orange-500 text-white border-orange-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Relieving</p>
            <MultiPill options={RELIEVING} selected={relieving} onChange={setRelieving}
              activeClass="bg-emerald-500 text-white border-emerald-500" />
          </div>
        </div>

        {/* ── DAILY LIFE ── */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Impact on Daily Life</p>
          <MultiPill options={DAILY_LIFE} selected={dailyLife} onChange={setDailyLife}
            activeClass="bg-purple-600 text-white border-purple-600" />
        </div>

        {/* ── CURRENT MEDS ── */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Current Pain Medications</p>
          <div className="flex items-center gap-3 flex-wrap">
            <MultiPill options={['Yes','No']} selected={currentMeds?[currentMeds]:[]}
              onChange={v => setCurrentMeds(v[v.length-1]||null)} />
            {currentMeds === 'Yes' && (
              <input type="text" value={currentMedsText} onChange={e => setCurrentMedsText(e.target.value)}
                placeholder="List medications..."
                className="flex-1 min-w-[160px] border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
            )}
          </div>
        </div>

        {/* ── SPECIALTY QUESTIONS ── */}
        {specialty !== 'general' && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              {SPECIALTY_DISPLAY[specialty]} — Clinical Questions
            </p>
            <div className="bg-blue-50/50 rounded-xl border border-blue-100 px-4 py-2">
              <SpecialtyQuestions specialty={specialty} data={specData} onChange={setSpecData} />
            </div>
          </div>
        )}

        <div>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Additional clinical notes..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none" />
        </div>
        <SignatureBlock />
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4 flex items-center justify-between gap-3">
        {error ? (
          <div className="flex items-center gap-1.5 text-red-600 text-sm">
            <AlertCircle size={14} /> {error}
          </div>
        ) : <div />}
        <div className="flex gap-2">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
