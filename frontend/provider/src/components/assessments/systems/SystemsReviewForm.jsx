import { useState } from 'react'
import { Stethoscope, ChevronDown, ChevronUp, CheckCircle, MinusCircle } from 'lucide-react'
import MedicalTextArea from '../../MedicalTextArea'
import api from '../../../api/client'

// ── System definitions ────────────────────────────────────────────────────────

const SYSTEMS = [
  {
    key: 'general', label: 'General / Constitutional', color: 'slate',
    symptoms: ['Fever','Chills','Fatigue / Lethargy','Night Sweats','Weight Loss','Weight Gain','Poor Appetite','Malaise','Generalised Weakness'],
  },
  {
    key: 'heent', label: 'Head, Eyes, Ears, Nose & Throat (HEENT)', color: 'cyan',
    symptoms: ['Headache','Visual Disturbance','Eye Pain / Redness','Hearing Loss','Tinnitus','Ear Pain / Discharge','Nasal Congestion','Epistaxis','Sore Throat','Hoarseness','Difficulty Swallowing','Neck Swelling','Dental Pain'],
  },
  {
    key: 'cardiovascular', label: 'Cardiovascular', color: 'red',
    symptoms: ['Chest Pain','Palpitations','Dyspnoea on Exertion','Orthopnoea','Paroxysmal Nocturnal Dyspnoea','Pedal Oedema','Syncope / Pre-syncope','Intermittent Claudication','Cyanosis'],
  },
  {
    key: 'respiratory', label: 'Respiratory', color: 'sky',
    symptoms: ['Cough','Productive Cough','Haemoptysis','Wheeze','Shortness of Breath','Chest Tightness','Stridor','Pleuritic Chest Pain','Snoring / Apnoea'],
  },
  {
    key: 'gastrointestinal', label: 'Gastrointestinal', color: 'amber',
    symptoms: ['Nausea','Vomiting','Haematemesis','Abdominal Pain','Bloating / Distension','Diarrhoea','Constipation','Rectal Bleeding','Melaena','Jaundice','Dysphagia','Heartburn / GORD','Loss of Appetite','Flatulence'],
  },
  {
    key: 'genitourinary', label: 'Genitourinary', color: 'indigo',
    symptoms: ['Dysuria','Urinary Frequency','Urgency','Haematuria','Nocturia','Urinary Incontinence','Flank Pain','Urethral / Vaginal Discharge','Genital Sores','Oliguria / Anuria','Hesitancy / Poor Stream'],
  },
  {
    key: 'musculoskeletal', label: 'Musculoskeletal', color: 'orange',
    symptoms: ['Joint Pain','Joint Swelling','Morning Stiffness','Muscle Pain / Myalgia','Back Pain','Neck Pain','Muscle Weakness','Deformity / Instability','Reduced Range of Motion','Bone Pain'],
  },
  {
    key: 'neurological', label: 'Neurological', color: 'violet',
    symptoms: ['Headache','Dizziness / Vertigo','Seizures / Fits','Limb Weakness','Sensory Loss / Paraesthesia','Memory Problems','Speech Difficulty','Tremor','Gait Disturbance','Loss of Consciousness','Diplopia','Tinnitus'],
  },
  {
    key: 'skin', label: 'Skin / Dermatological', color: 'pink',
    symptoms: ['Rash','Pruritus','Skin Lesions / Ulcers','Jaundice / Icterus','Pallor','Hair Loss','Nail Changes','Wound Not Healing','Pigmentation Changes'],
  },
  {
    key: 'psychiatric', label: 'Psychiatric / Mental Health', color: 'purple',
    symptoms: ['Depressed Mood','Anxiety / Worry','Irritability','Sleep Disturbance (Insomnia / Hypersomnia)','Appetite Changes','Cognitive Decline','Hallucinations','Suicidal Ideation','Panic Attacks','Social Withdrawal'],
  },
  {
    key: 'endocrine', label: 'Endocrine / Metabolic', color: 'teal',
    symptoms: ['Excessive Thirst','Polyuria','Heat Intolerance','Cold Intolerance','Excessive Sweating','Neck Swelling / Goitre','Hair / Skin / Nail Changes','Unexplained Weight Change','Easy Fatigue'],
  },
  {
    key: 'haematological', label: 'Haematological / Lymphatic', color: 'rose',
    symptoms: ['Easy Bruising','Prolonged Bleeding','Lymph Node Swelling','Pallor / Anaemia Symptoms','Petechiae / Purpura','Recurrent Infections','Night Sweats','Bone Pain / Tenderness'],
  },
]

const GATE_OPTS = [
  { value: 'not_asked',    label: 'Not Asked',    cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  { value: 'no_symptoms',  label: 'No Symptoms',  cls: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'has_symptoms', label: 'Has Symptoms', cls: 'bg-red-50 text-red-700 border-red-200' },
]

function initState() {
  return SYSTEMS.reduce((acc, s) => ({
    ...acc,
    [s.key]: { gate: 'not_asked', symptoms: [], notes: '' },
  }), {})
}

// ── System card ───────────────────────────────────────────────────────────────

function SystemCard({ system, state, onChange }) {
  const { gate, symptoms: checked, notes } = state

  const setGate = (g) => onChange({ gate: g, symptoms: checked, notes })
  const toggleSymptom = (s) => onChange({
    gate, notes,
    symptoms: checked.includes(s) ? checked.filter(x => x !== s) : [...checked, s],
  })
  const setNotes = (e) => onChange({ gate, symptoms: checked, notes: e.target.value })

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      gate === 'has_symptoms' ? 'border-red-200 bg-red-50/30'
      : gate === 'no_symptoms' ? 'border-green-200 bg-green-50/20'
      : 'border-gray-200 bg-white'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 gap-3">
        <span className="font-semibold text-gray-700 text-sm">{system.label}</span>
        <div className="flex gap-1.5 shrink-0">
          {GATE_OPTS.map(opt => (
            <button key={opt.value} type="button"
              onClick={() => setGate(opt.value)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                gate === opt.value
                  ? opt.cls + ' shadow-sm'
                  : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
              }`}
            >{opt.label}</button>
          ))}
        </div>
      </div>

      {/* No symptoms badge */}
      {gate === 'no_symptoms' && (
        <div className="px-4 pb-3 flex items-center gap-1.5 text-green-600 text-xs font-medium">
          <CheckCircle size={13} /> No symptoms reported in this system
        </div>
      )}

      {/* Symptoms checklist */}
      {gate === 'has_symptoms' && (
        <div className="px-4 pb-4 space-y-3 border-t border-red-100">
          <div className="pt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
            {system.symptoms.map(s => (
              <label key={s} className="flex items-start gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={checked.includes(s)}
                  onChange={() => toggleSymptom(s)}
                  className="mt-0.5 accent-red-500 shrink-0"
                />
                <span className={`text-xs leading-snug ${
                  checked.includes(s) ? 'font-semibold text-red-700' : 'text-gray-600 group-hover:text-gray-800'
                }`}>{s}</span>
              </label>
            ))}
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Additional notes</p>
            <MedicalTextArea
              rows={2} value={notes} onChange={setNotes}
              placeholder="Describe further…"
              categories="symptom,condition,exam_finding"
              className="focus:ring-red-400"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main form ─────────────────────────────────────────────────────────────────

export default function SystemsReviewForm({ admission, onClose, onSaved }) {
  const [systems, setSystems] = useState(initState)
  const [saving, setSaving]   = useState(false)
  const [error,  setError]    = useState('')

  const setSystem = (key, val) => setSystems(prev => ({ ...prev, [key]: val }))

  const reviewed   = Object.values(systems).filter(s => s.gate !== 'not_asked').length
  const positives  = Object.values(systems).filter(s => s.gate === 'has_symptoms').length

  const handleSave = async () => {
    setSaving(true); setError('')
    const payload = {
      type: 'systems_review',
      systems: Object.fromEntries(
        SYSTEMS.map(s => [s.key, {
          label: s.label,
          gate: systems[s.key].gate,
          symptoms: systems[s.key].symptoms,
          notes: systems[s.key].notes,
        }])
      ),
      summary: { reviewed, positives, total: SYSTEMS.length },
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
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">

        {/* Badge + summary */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-100 rounded-lg">
              <Stethoscope size={16} className="text-slate-600" />
            </div>
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">[A] Systems Review</span>
          </div>
          <div className="flex gap-3 text-xs text-gray-500">
            <span><span className="font-bold text-gray-700">{reviewed}</span>/{SYSTEMS.length} reviewed</span>
            {positives > 0 && (
              <span className="text-red-600 font-semibold">{positives} positive</span>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 -mt-1 mb-3">
          Mark each system as reviewed. "Has Symptoms" opens the checklist.
        </p>

        {SYSTEMS.map(s => (
          <SystemCard
            key={s.key}
            system={s}
            state={systems[s.key]}
            onChange={val => setSystem(s.key, val)}
          />
        ))}

        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {reviewed === 0 ? 'No systems reviewed yet' : `${reviewed} of ${SYSTEMS.length} systems reviewed`}
        </span>
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white bg-slate-600 rounded-lg hover:bg-slate-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
