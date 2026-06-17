/**
 * @shared-pool — standalone clinical assessment, portal-agnostic
 * Aerosol Therapy Assessment — Pre / Under Treatment / Post-1 / Post-2 / Education
 * Stage selector at top controls which fields are visible.
 */
import { useState, useEffect } from 'react'
import { Wind, Clock, CheckCircle } from 'lucide-react'
import api from '../../../api/client'

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGES = [
  { key: 'pre',    label: 'Pre-Treatment'      },
  { key: 'during', label: 'Under Treatment'     },
  { key: 'post1',  label: 'Post-Treatment 1'   },
  { key: 'post2',  label: 'Post-Treatment 2'   },
  { key: 'edu',    label: 'Education'           },
]

const INDICATIONS = [
  'Bronchospasm', 'Wheeze', 'COPD Exacerbation', 'Asthma Attack',
  'Sputum Clearance', 'Croup', 'Post-operative', 'Pneumonia',
  'Bronchiolitis', 'Cystic Fibrosis', 'Other',
]

const MEDICATIONS = [
  'Salbutamol', 'Ipratropium', 'Budesonide', 'Formoterol',
  'Beclomethasone', 'Hypertonic Saline', 'NAC', 'Adrenaline',
  'Dornase Alfa', 'Tobramycin', 'Colistin', 'Normal Saline',
]

const POSITIONS  = ['Sitting (upright)', 'Semi-recumbent (45°)', 'Supine', 'Lateral']
const DEVICES    = ['SVN Jet Nebulizer', 'Ultrasonic Nebulizer', 'Mesh Nebulizer', 'MDI', 'MDI + Spacer', 'DPI', 'High-flow Nebulizer']
const DELIVERY   = ['Mask', 'Mouthpiece', 'T-piece', 'Tracheostomy adapter', 'Tent / Hood']
const COMPLIANCE = ['Full', 'Partial', 'Refused', 'Interrupted']
const EQUIP_COND = ['Good', 'Needs cleaning', 'Needs replacement', 'Replaced this session']

const BREATH_ZONES = ['Right Upper', 'Right Middle', 'Right Lower', 'Left Upper', 'Left Lower']
const BREATH_OPTS  = ['Clear', 'Wheeze', 'Crackles', 'Diminished', 'Absent', 'Bronchial']

const RESPONSE_OPTS = ['Improved', 'No Change', 'Worsened']
const SIDE_EFFECTS  = ['None', 'Tremor', 'Tachycardia', 'Palpitations', 'Paradoxical Bronchospasm', 'Nausea', 'Dry Mouth', 'Headache']
const SUSTAINED     = ['Yes — Sustained', 'Partial', 'No — Reverted']
const FURTHER_TX    = ['None required', 'Repeat nebulizer', 'Oral bronchodilator', 'IV therapy', 'Physician review', 'Hospital admission']

const EDU_TOPICS = [
  'Inhaler / nebulizer technique', 'Breathing exercises', 'Trigger identification & avoidance',
  'Medication adherence', 'Emergency action plan', 'Spacer use', 'Device cleaning',
  'Peak flow monitoring', 'When to seek emergency care',
]
const TECHNIQUE_RESULT = ['Correct — confirmed', 'Needs reinforcement', 'Unable to assess']

// ── Helpers ───────────────────────────────────────────────────────────────────

function now() {
  return new Date().toTimeString().slice(0, 5)
}

function diffMins(start, end) {
  if (!start || !end) return null
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const d = (eh * 60 + em) - (sh * 60 + sm)
  return d > 0 ? d : null
}

function Pills({ opts, values, onToggle, color = 'teal' }) {
  const activeClass = color === 'red'
    ? 'bg-red-500 text-white border-red-500'
    : 'bg-teal-600 text-white border-teal-600'
  return (
    <div className="flex flex-wrap gap-1.5">
      {opts.map(o => (
        <button key={o} type="button" onClick={() => onToggle(o)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            values.includes(o) ? activeClass : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'
          }`}>{o}</button>
      ))}
    </div>
  )
}

function SinglePill({ opts, value, onToggle, color = 'teal' }) {
  const activeClass = color === 'green'
    ? 'bg-green-600 text-white border-green-600'
    : color === 'red'
    ? 'bg-red-500 text-white border-red-500'
    : 'bg-teal-600 text-white border-teal-600'
  return (
    <div className="flex flex-wrap gap-1.5">
      {opts.map(o => (
        <button key={o} type="button" onClick={() => onToggle(o)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            value === o ? activeClass : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'
          }`}>{o}</button>
      ))}
    </div>
  )
}

function VitalsRow({ label, value, onChange, unit, min, max, step = 1 }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500 font-medium">{label}</label>
      <div className="flex items-center gap-1.5">
        <input type="number" min={min} max={max} step={step} value={value}
          onChange={e => onChange(e.target.value)}
          className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-teal-400" />
        {unit && <span className="text-xs text-gray-400">{unit}</span>}
      </div>
    </div>
  )
}

function VitalsGrid({ vitals, setVital }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <VitalsRow label="Resp. Rate" unit="/min" min={5} max={60}
        value={vitals.rr} onChange={v => setVital('rr', v)} />
      <VitalsRow label="SpO₂" unit="%" min={50} max={100}
        value={vitals.spo2} onChange={v => setVital('spo2', v)} />
      <VitalsRow label="Heart Rate" unit="bpm" min={30} max={220}
        value={vitals.hr} onChange={v => setVital('hr', v)} />
      <VitalsRow label="Peak Flow" unit="L/min" min={50} max={900} step={10}
        value={vitals.pef} onChange={v => setVital('pef', v)} />
      <VitalsRow label="Dyspnoea" unit="/10" min={0} max={10}
        value={vitals.dyspnoea} onChange={v => setVital('dyspnoea', v)} />
    </div>
  )
}

function BreathSoundsGrid({ sounds, setSounds }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-600 mb-2">Breath Sounds</p>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left py-1 pr-3 text-gray-500 font-medium w-28">Zone</th>
              {BREATH_OPTS.map(o => (
                <th key={o} className="text-center py-1 px-1.5 text-gray-500 font-medium whitespace-nowrap">{o}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BREATH_ZONES.map(z => (
              <tr key={z} className="border-t border-gray-100">
                <td className="py-1.5 pr-3 text-gray-700 font-medium whitespace-nowrap">{z}</td>
                {BREATH_OPTS.map(o => (
                  <td key={o} className="text-center py-1.5 px-1.5">
                    <input type="checkbox"
                      checked={sounds[z]?.includes(o) || false}
                      onChange={() => setSounds(prev => {
                        const cur = prev[z] || []
                        return { ...prev, [z]: cur.includes(o) ? cur.filter(x => x !== o) : [...cur, o] }
                      })}
                      className="accent-teal-600" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function initVitals() { return { rr: '', spo2: '', hr: '', pef: '', dyspnoea: '' } }

// ── Stage completeness indicator ──────────────────────────────────────────────

function stageComplete(key, data) {
  if (key === 'pre')    return data.indication.length > 0 && data.medication.length > 0
  if (key === 'during') return !!data.startTime && !!data.device
  if (key === 'post1')  return !!data.post1Vitals.rr && !!data.post1Response
  if (key === 'post2')  return !!data.post2Vitals.rr && !!data.sustained
  if (key === 'edu')    return data.eduTopics.length > 0
  return false
}

// ── Main form ─────────────────────────────────────────────────────────────────

export default function AerosolTherapyForm({ admission, onClose, onSaved }) {
  const [stage, setStage] = useState('pre')

  // Pre-Treatment
  const [indication, setIndication]   = useState([])
  const [medication,  setMedication]  = useState([])
  const [medNote,     setMedNote]     = useState('')
  const [position,    setPosition]    = useState('')
  const [preVitals,   setPreVitals]   = useState(initVitals())
  const [preSounds,   setPreSounds]   = useState({})

  // During Treatment
  const [startTime,   setStartTime]   = useState(now)
  const [endTime,     setEndTime]     = useState('')
  const [device,      setDevice]      = useState('')
  const [delivery,    setDelivery]    = useState('')
  const [flowRate,    setFlowRate]    = useState('')
  const [compliance,  setCompliance]  = useState('')
  const [equipCond,   setEquipCond]   = useState('')

  // Post-Treatment 1
  const [post1Vitals, setPost1Vitals] = useState(initVitals())
  const [post1Sounds, setPost1Sounds] = useState({})
  const [post1Response, setPost1Response] = useState('')
  const [sideEffects, setSideEffects] = useState([])

  // Post-Treatment 2
  const [post2Vitals, setPost2Vitals] = useState(initVitals())
  const [post2Sounds, setPost2Sounds] = useState({})
  const [sustained,   setSustained]   = useState('')
  const [furtherTx,   setFurtherTx]   = useState([])

  // Education
  const [eduTopics,   setEduTopics]   = useState([])
  const [technique,   setTechnique]   = useState('')
  const [caregiverEdu, setCaregiverEdu] = useState('')
  const [langBarrier,  setLangBarrier] = useState('')
  const [eduNotes,     setEduNotes]   = useState('')

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const duration = diffMins(startTime, endTime)

  const setV = (setter) => (field, val) => setter(p => ({ ...p, [field]: val }))

  const data = { indication, medication, startTime, device, post1Vitals, post1Response, post2Vitals, sustained, eduTopics }

  const toggleArr = (setter, val) =>
    setter(p => p.includes(val) ? p.filter(x => x !== val) : [...p, val])

  const handleSave = async () => {
    setSaving(true); setError('')
    const payload = {
      type: 'aerosol_therapy',
      pre: { indication, medication, med_note: medNote, position, vitals: preVitals, breath_sounds: preSounds },
      during: { start_time: startTime, end_time: endTime, duration_mins: duration, device, delivery, flow_rate_lpm: flowRate, compliance, equipment_condition: equipCond },
      post1: { vitals: post1Vitals, breath_sounds: post1Sounds, response: post1Response, side_effects: sideEffects },
      post2: { vitals: post2Vitals, breath_sounds: post2Sounds, sustained_response: sustained, further_treatment: furtherTx },
      education: { topics: eduTopics, technique_result: technique, caregiver_educated: caregiverEdu, language_barrier: langBarrier, notes: eduNotes },
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

  return (
    <div className="flex flex-col h-full">

      {/* Stage selector */}
      <div className="shrink-0 px-6 pt-4 pb-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-sky-100 rounded-lg">
            <Wind size={15} className="text-sky-600" />
          </div>
          <span className="text-xs font-bold text-sky-600 uppercase tracking-wider">[A] Aerosol Therapy</span>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-0">
          {STAGES.map(s => {
            const done = stageComplete(s.key, data)
            return (
              <button key={s.key} type="button" onClick={() => setStage(s.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                  stage === s.key
                    ? 'border-teal-600 text-teal-700 bg-teal-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}>
                {done && <CheckCircle size={11} className="text-green-500 shrink-0" />}
                {s.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Stage content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        {/* ── PRE-TREATMENT ── */}
        {stage === 'pre' && (
          <>
            <div>
              <p className="text-xs font-bold text-gray-600 mb-2">Indication</p>
              <Pills opts={INDICATIONS} values={indication} onToggle={v => toggleArr(setIndication, v)} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-600 mb-2">Medication(s) Prescribed</p>
              <Pills opts={MEDICATIONS} values={medication} onToggle={v => toggleArr(setMedication, v)} />
              <input type="text" value={medNote} onChange={e => setMedNote(e.target.value)}
                placeholder="Dose / frequency (e.g. Salbutamol 2.5 mg QID)"
                className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-600 mb-2">Patient Position</p>
              <SinglePill opts={POSITIONS} value={position} onToggle={v => setPosition(p => p === v ? '' : v)} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-600 mb-3">Pre-Treatment Vitals</p>
              <VitalsGrid vitals={preVitals} setVital={setV(setPreVitals)} />
            </div>
            <BreathSoundsGrid sounds={preSounds} setSounds={setPreSounds} />
          </>
        )}

        {/* ── UNDER TREATMENT ── */}
        {stage === 'during' && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-bold text-gray-600 mb-1.5">Start Time</p>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                  className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-600 mb-1.5">End Time</p>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                  className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-600 mb-1.5">Duration</p>
                <div className="flex items-center h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <Clock size={12} className="text-gray-400 mr-1.5" />
                  <span className="text-sm font-semibold text-teal-700">
                    {duration !== null ? `${duration} min` : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-600 mb-2">Device Used</p>
              <SinglePill opts={DEVICES} value={device} onToggle={v => setDevice(p => p === v ? '' : v)} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-600 mb-2">Delivery Interface</p>
              <SinglePill opts={DELIVERY} value={delivery} onToggle={v => setDelivery(p => p === v ? '' : v)} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-bold text-gray-600 mb-1.5">Flow Rate (L/min)</p>
                <input type="number" min={1} max={20} value={flowRate} onChange={e => setFlowRate(e.target.value)}
                  placeholder="e.g. 6"
                  className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-600 mb-2">Compliance</p>
                <SinglePill opts={COMPLIANCE} value={compliance} onToggle={v => setCompliance(p => p === v ? '' : v)} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-600 mb-2">Equipment Condition</p>
                <SinglePill opts={EQUIP_COND} value={equipCond} onToggle={v => setEquipCond(p => p === v ? '' : v)} />
              </div>
            </div>
          </>
        )}

        {/* ── POST-TREATMENT 1 ── */}
        {stage === 'post1' && (
          <>
            <div className="bg-sky-50 border border-sky-100 rounded-lg px-3 py-2 text-xs text-sky-700 font-medium">
              Immediate assessment — within 5 minutes of completing treatment
            </div>
            <div>
              <p className="text-xs font-bold text-gray-600 mb-3">Post-Treatment Vitals (≤5 min)</p>
              <VitalsGrid vitals={post1Vitals} setVital={setV(setPost1Vitals)} />
            </div>
            <BreathSoundsGrid sounds={post1Sounds} setSounds={setPost1Sounds} />
            <div>
              <p className="text-xs font-bold text-gray-600 mb-2">Immediate Response</p>
              <SinglePill opts={RESPONSE_OPTS} value={post1Response}
                onToggle={v => setPost1Response(p => p === v ? '' : v)}
                color={post1Response === 'Improved' ? 'green' : post1Response === 'Worsened' ? 'red' : 'teal'} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-600 mb-2">Side Effects Noted</p>
              <Pills opts={SIDE_EFFECTS} values={sideEffects} onToggle={v => toggleArr(setSideEffects, v)}
                color={sideEffects.some(s => s !== 'None') ? 'red' : 'teal'} />
            </div>
          </>
        )}

        {/* ── POST-TREATMENT 2 ── */}
        {stage === 'post2' && (
          <>
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 text-xs text-indigo-700 font-medium">
              Delayed assessment — 20–30 minutes after completing treatment
            </div>
            <div>
              <p className="text-xs font-bold text-gray-600 mb-3">Post-Treatment Vitals (20–30 min)</p>
              <VitalsGrid vitals={post2Vitals} setVital={setV(setPost2Vitals)} />
            </div>
            <BreathSoundsGrid sounds={post2Sounds} setSounds={setPost2Sounds} />
            <div>
              <p className="text-xs font-bold text-gray-600 mb-2">Sustained Response?</p>
              <SinglePill opts={SUSTAINED} value={sustained}
                onToggle={v => setSustained(p => p === v ? '' : v)}
                color={sustained === 'Yes — Sustained' ? 'green' : sustained === 'No — Reverted' ? 'red' : 'teal'} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-600 mb-2">Further Treatment Required</p>
              <Pills opts={FURTHER_TX} values={furtherTx} onToggle={v => toggleArr(setFurtherTx, v)} />
            </div>
          </>
        )}

        {/* ── EDUCATION ── */}
        {stage === 'edu' && (
          <>
            <div>
              <p className="text-xs font-bold text-gray-600 mb-2">Education Topics Covered</p>
              <Pills opts={EDU_TOPICS} values={eduTopics} onToggle={v => toggleArr(setEduTopics, v)} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-600 mb-2">Inhaler / Device Technique Observed</p>
              <SinglePill opts={TECHNIQUE_RESULT} value={technique}
                onToggle={v => setTechnique(p => p === v ? '' : v)}
                color={technique === 'Correct — confirmed' ? 'green' : technique === 'Needs reinforcement' ? 'red' : 'teal'} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-gray-600 mb-2">Caregiver / Family Educated?</p>
                <SinglePill opts={['Yes', 'No', 'N/A']} value={caregiverEdu}
                  onToggle={v => setCaregiverEdu(p => p === v ? '' : v)} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-600 mb-2">Language / Literacy Barrier?</p>
                <SinglePill opts={['Yes', 'No']} value={langBarrier}
                  onToggle={v => setLangBarrier(p => p === v ? '' : v)}
                  color={langBarrier === 'Yes' ? 'red' : 'teal'} />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-600 mb-1.5">Education Notes</p>
              <textarea rows={3} value={eduNotes} onChange={e => setEduNotes(e.target.value)}
                placeholder="Additional education notes or interpreter used…"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
            </div>
          </>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex gap-1.5">
          {STAGES.map(s => (
            <div key={s.key}
              className={`w-2 h-2 rounded-full transition-all ${
                stageComplete(s.key, data) ? 'bg-green-400' : stage === s.key ? 'bg-teal-400' : 'bg-gray-200'
              }`} title={s.label} />
          ))}
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save All Stages'}
          </button>
        </div>
      </div>
    </div>
  )
}
