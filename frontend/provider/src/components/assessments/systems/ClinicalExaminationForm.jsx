/**
 * @shared-pool — standalone clinical assessment, portal-agnostic
 * Clinical Examination — objective physical exam findings, system by system.
 */
import { useState } from 'react'
import { Stethoscope, CheckCircle } from 'lucide-react'
import MedicalTextArea from '../../MedicalTextArea'
import api from '../../../api/client'

// ── System definitions with examination findings ──────────────────────────────

const SYSTEMS = [
  {
    key: 'general', label: 'General Appearance',
    normals: ['Well looking', 'Alert and oriented', 'Comfortable at rest', 'Well nourished', 'Well hydrated'],
    findings: [
      'Acutely ill-looking', 'Chronically ill-looking', 'Pale', 'Icteric / Jaundiced',
      'Cyanosed', 'Oedematous', 'Cachexic', 'Obese', 'Diaphoretic', 'Agitated',
      'Drowsy', 'Confused', 'Febrile', 'Lymphadenopathy', 'Clubbing',
    ],
  },
  {
    key: 'cvs', label: 'Cardiovascular',
    normals: ['Regular rate and rhythm', 'S1 S2 normal', 'No murmurs', 'No added sounds', 'Peripheral pulses normal'],
    findings: [
      'Tachycardia', 'Bradycardia', 'Irregular rhythm', 'Systolic murmur', 'Diastolic murmur',
      'S3 gallop', 'S4 gallop', 'JVD elevated', 'Heave / Thrill', 'Pericardial rub',
      'Weak peripheral pulses', 'Absent peripheral pulses', 'Pitting oedema', 'Capillary refill >2s',
    ],
  },
  {
    key: 'resp', label: 'Respiratory',
    normals: ['Equal air entry bilaterally', 'Vesicular breath sounds', 'Normal percussion', 'No added sounds'],
    findings: [
      'Wheeze', 'Crepitations / Crackles', 'Rhonchi', 'Bronchial breathing',
      'Stridorous', 'Pleural rub', 'Reduced air entry right', 'Reduced air entry left',
      'Dull to percussion', 'Hyperresonant', 'Tracheal deviation', 'Intercostal recession',
      'Nasal flaring', 'Use of accessory muscles', 'Paradoxical breathing',
    ],
  },
  {
    key: 'abdomen', label: 'Abdomen',
    normals: ['Soft and non-tender', 'No organomegaly', 'Bowel sounds normal', 'No masses', 'No guarding'],
    findings: [
      'Tenderness RUQ', 'Tenderness LUQ', 'Tenderness RIF', 'Tenderness LIF', 'Central tenderness',
      'Rebound tenderness', 'Guarding', 'Rigidity', 'Hepatomegaly', 'Splenomegaly',
      'Ascites', 'Distension', 'Visible peristalsis', 'Palpable mass',
      'Murphy\'s sign +ve', 'McBurney\'s +ve', 'Rovsing\'s +ve',
      'Bowel sounds absent', 'Bowel sounds hyperactive',
    ],
  },
  {
    key: 'neuro', label: 'Neurological',
    normals: ['GCS 15/15', 'Pupils equal and reactive', 'Power 5/5 all limbs', 'Sensation intact', 'Coordination normal'],
    findings: [
      'GCS reduced', 'Pupils unequal', 'Pupils unreactive', 'Hemiplegia', 'Hemiparesis',
      'Paraplegia', 'Facial palsy', 'Dysarthria', 'Aphasia', 'Ataxia', 'Tremor',
      'Cogwheel rigidity', 'Babinski +ve', 'Kernig\'s +ve', 'Brudzinski\'s +ve',
      'Romberg +ve', 'Nystagmus', 'Papilloedema', 'Cranial nerve palsy',
      'Sensory loss', 'Hyperreflexia', 'Hyporeflexia',
    ],
  },
  {
    key: 'msk', label: 'Musculoskeletal',
    normals: ['Full range of motion', 'No swelling', 'No tenderness', 'Normal gait', 'Normal muscle bulk and tone'],
    findings: [
      'Joint swelling', 'Joint tenderness', 'Reduced ROM', 'Crepitus', 'Deformity',
      'Muscle wasting', 'Muscle weakness', 'Valgus deformity', 'Varus deformity',
      'Antalgic gait', 'Trendelenburg gait', 'Anterior drawer +ve', 'Lachman +ve',
      'McMurray +ve', 'SLRT +ve', 'Finkelstein +ve', 'Warmth over joint',
    ],
  },
  {
    key: 'skin', label: 'Skin / Integument',
    normals: ['No lesions', 'Normal turgor', 'No rash', 'Wounds healing well'],
    findings: [
      'Macular rash', 'Papular rash', 'Vesicular rash', 'Petechiae', 'Purpura',
      'Ecchymosis', 'Ulceration', 'Pressure sore', 'Jaundice / Icterus',
      'Pallor', 'Cyanosis (peripheral)', 'Spider naevi', 'Palmar erythema',
      'Hair loss', 'Nail changes', 'Poor turgor', 'Dry / scaly skin',
    ],
  },
  {
    key: 'heent', label: 'Head, Eyes, Ears, Nose & Throat',
    normals: ['Head normocephalic', 'Eyes clear', 'Ears clear', 'Nose patent', 'Throat clear', 'Tonsils normal'],
    findings: [
      'Conjunctival pallor', 'Scleral icterus', 'Periorbital oedema', 'Proptosis',
      'Otitis media signs', 'Perforated TM', 'Nasal polyp', 'Deviated septum',
      'Tonsillar enlargement', 'Pharyngeal erythema', 'Oral ulcers',
      'Goitre', 'Neck stiffness', 'Lymph node enlargement', 'Thyroid nodule',
    ],
  },
  {
    key: 'renal', label: 'Renal / Genitourinary',
    normals: ['Kidneys not palpable', 'No CVA tenderness', 'No suprapubic tenderness'],
    findings: [
      'Ballotable kidney (right)', 'Ballotable kidney (left)', 'CVA tenderness', 'Suprapubic tenderness',
      'Bladder palpable', 'Scrotal swelling', 'Testicular tenderness', 'Inguinal hernia',
      'Penile discharge', 'Rectal prolapse', 'Prostatomegaly (per rectum)',
    ],
  },
  {
    key: 'gyn', label: 'Gynaecological',
    normals: ['Normal external genitalia', 'Cervix healthy', 'Uterus normal size', 'No adnexal tenderness'],
    findings: [
      'Vaginal discharge', 'Cervical erosion', 'Cervical motion tenderness',
      'Uterus enlarged', 'Adnexal mass', 'Adnexal tenderness',
      'Vulval lesion', 'Bartholin\'s cyst', 'Rectovaginal tenderness',
    ],
  },
]

const GATE_OPTS = [
  { value: 'not_examined', label: 'Not Examined' },
  { value: 'normal',       label: 'Normal'        },
  { value: 'abnormal',     label: 'Abnormal'      },
]

function initState() {
  return SYSTEMS.reduce((acc, s) => ({
    ...acc,
    [s.key]: { gate: 'not_examined', normals: [], findings: [], notes: '' },
  }), {})
}

// ── System examination card ───────────────────────────────────────────────────

function ExamCard({ system, state, onChange }) {
  const { gate, normals: checkedNormals, findings: checkedFindings, notes } = state

  const setGate     = (g) => onChange({ gate: g, normals: checkedNormals, findings: checkedFindings, notes })
  const toggleNorm  = (f) => onChange({ gate, notes, findings: checkedFindings, normals: checkedNormals.includes(f) ? checkedNormals.filter(x => x !== f) : [...checkedNormals, f] })
  const toggleFind  = (f) => onChange({ gate, notes, normals: checkedNormals, findings: checkedFindings.includes(f) ? checkedFindings.filter(x => x !== f) : [...checkedFindings, f] })
  const setNotes    = (e) => onChange({ gate, normals: checkedNormals, findings: checkedFindings, notes: e.target.value })

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      gate === 'abnormal' ? 'border-red-200 bg-red-50/20'
      : gate === 'normal'  ? 'border-green-200 bg-green-50/10'
      : 'border-gray-200 bg-white'
    }`}>
      {/* Header with gate */}
      <div className="flex items-center justify-between px-4 py-3 gap-3">
        <span className="font-semibold text-gray-700 text-sm">{system.label}</span>
        <div className="flex gap-1.5 shrink-0">
          {GATE_OPTS.map(opt => (
            <button key={opt.value} type="button" onClick={() => setGate(opt.value)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                gate === opt.value
                  ? opt.value === 'normal'   ? 'bg-green-600 text-white border-green-600 shadow-sm'
                  : opt.value === 'abnormal' ? 'bg-red-500 text-white border-red-500 shadow-sm'
                  : 'bg-gray-400 text-white border-gray-400 shadow-sm'
                  : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
              }`}>{opt.label}</button>
          ))}
        </div>
      </div>

      {/* Normal findings checklist */}
      {gate === 'normal' && (
        <div className="px-4 pb-3 border-t border-green-100 pt-3">
          <p className="text-xs text-gray-400 font-medium mb-2">Normal findings documented:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
            {system.normals.map(f => (
              <label key={f} className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={checkedNormals.includes(f)} onChange={() => toggleNorm(f)}
                  className="accent-green-600 shrink-0" />
                <span className={`text-xs leading-snug ${checkedNormals.includes(f) ? 'text-green-700 font-medium' : 'text-gray-500'}`}>{f}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Abnormal findings checklist */}
      {gate === 'abnormal' && (
        <div className="px-4 pb-4 border-t border-red-100 pt-3 space-y-3">
          <p className="text-xs text-gray-500 font-medium">Findings present:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
            {system.findings.map(f => (
              <label key={f} className="flex items-start gap-1.5 cursor-pointer group">
                <input type="checkbox" checked={checkedFindings.includes(f)} onChange={() => toggleFind(f)}
                  className="mt-0.5 accent-red-500 shrink-0" />
                <span className={`text-xs leading-snug ${checkedFindings.includes(f) ? 'text-red-700 font-semibold' : 'text-gray-600 group-hover:text-gray-800'}`}>{f}</span>
              </label>
            ))}
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium mb-1">Further description</p>
            <MedicalTextArea rows={2} value={notes} onChange={setNotes}
              placeholder="Describe further…"
              categories="exam_finding,anatomy"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main form ─────────────────────────────────────────────────────────────────

export default function ClinicalExaminationForm({ admission, onClose, onSaved }) {
  const [systems,  setSystems]  = useState(initState)
  const [summary,  setSummary]  = useState('')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  const setSystem = (key, val) => setSystems(prev => ({ ...prev, [key]: val }))

  const examined  = Object.values(systems).filter(s => s.gate !== 'not_examined').length
  const abnormals = Object.values(systems).filter(s => s.gate === 'abnormal').length

  const handleSave = async () => {
    setSaving(true); setError('')
    const payload = {
      type: 'clinical_examination',
      systems: Object.fromEntries(
        SYSTEMS.map(s => [s.key, {
          label: s.label,
          gate: systems[s.key].gate,
          normal_findings: systems[s.key].normals,
          abnormal_findings: systems[s.key].findings,
          notes: systems[s.key].notes,
        }])
      ),
      examination_summary: summary,
      meta: { examined, abnormal_systems: abnormals, total: SYSTEMS.length },
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

        {/* Badge + counter */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-100 rounded-lg">
              <Stethoscope size={16} className="text-emerald-600" />
            </div>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">[A] Clinical Examination</span>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="text-gray-400"><span className="font-bold text-gray-700">{examined}</span>/{SYSTEMS.length} examined</span>
            {abnormals > 0 && <span className="text-red-600 font-semibold">{abnormals} abnormal</span>}
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-2">
          Mark each system. Normal → confirm findings. Abnormal → select findings + free-text.
        </p>

        {SYSTEMS.map(s => (
          <ExamCard key={s.key} system={s} state={systems[s.key]}
            onChange={val => setSystem(s.key, val)} />
        ))}

        {/* Examination summary */}
        <div>
          <p className="text-sm font-bold text-gray-700 mb-1.5">Examination Summary</p>
          <MedicalTextArea
            rows={3} value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder="Overall examination summary…"
            categories="exam_finding,anatomy,condition"
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {examined === 0 ? 'No systems examined yet' : `${examined}/${SYSTEMS.length} systems · ${abnormals} abnormal`}
        </span>
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
