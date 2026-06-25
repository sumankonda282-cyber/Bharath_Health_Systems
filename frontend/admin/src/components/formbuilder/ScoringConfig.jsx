import { useState } from 'react'
import { Plus, X, Clock, BarChart2, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'

// ─── Builtin Band Definitions ─────────────────────────────────────────────────

const BUILTIN_BANDS = {
  phq9: {
    label: 'PHQ-9 (Patient Health Questionnaire)',
    bands: [
      { min: 0,  max: 4,  label: 'Minimal depression',       action: 'Monitor' },
      { min: 5,  max: 9,  label: 'Mild depression',           action: 'Support' },
      { min: 10, max: 14, label: 'Moderate depression',       action: 'Treatment plan' },
      { min: 15, max: 19, label: 'Moderately severe',         action: 'Urgent referral' },
      { min: 20, max: 27, label: 'Severe depression',         action: 'Immediate action' },
    ],
  },
  gad7: {
    label: 'GAD-7 (Generalized Anxiety Disorder)',
    bands: [
      { min: 0,  max: 4,  label: 'Minimal anxiety',  action: 'Routine care' },
      { min: 5,  max: 9,  label: 'Mild anxiety',      action: 'Watchful waiting' },
      { min: 10, max: 14, label: 'Moderate anxiety',  action: 'Consider CBT or medication' },
      { min: 15, max: 21, label: 'Severe anxiety',    action: 'Immediate treatment' },
    ],
  },
  gcs: {
    label: 'GCS (Glasgow Coma Scale)',
    bands: [
      { min: 13, max: 15, label: 'Mild TBI / normal',  action: 'Observation' },
      { min: 9,  max: 12, label: 'Moderate TBI',       action: 'CT scan, admit' },
      { min: 3,  max: 8,  label: 'Severe TBI / coma',  action: 'ICU, airway management' },
    ],
  },
  morse_fall: {
    label: 'Morse Fall Scale',
    bands: [
      { min: 0,  max: 24,  label: 'No risk',   action: 'Good nursing care' },
      { min: 25, max: 50,  label: 'Low risk',  action: 'Standard fall prevention' },
      { min: 51, max: 125, label: 'High risk', action: 'High-risk fall prevention protocol' },
    ],
  },
  apgar: {
    label: 'APGAR Score',
    bands: [
      { min: 7, max: 10, label: 'Normal',                action: 'Routine newborn care' },
      { min: 4, max: 6,  label: 'Moderate concern',      action: 'Stimulation, supplemental O2' },
      { min: 0, max: 3,  label: 'Immediate intervention', action: 'Resuscitation required' },
    ],
  },
  heart: {
    label: 'HEART Score (Chest Pain Risk)',
    bands: [
      { min: 0, max: 3,  label: 'Low risk',      action: 'Discharge with outpatient follow-up' },
      { min: 4, max: 6,  label: 'Moderate risk', action: 'Observe, stress test / imaging' },
      { min: 7, max: 10, label: 'High risk',      action: 'Admit, invasive strategy' },
    ],
  },
  grace: {
    label: 'GRACE Score (ACS In-Hospital Mortality)',
    bands: [
      { min: 0,   max: 108, label: 'Low risk (<1%)',         action: 'Standard care, early invasive optional' },
      { min: 109, max: 140, label: 'Intermediate risk (1–3%)', action: 'Early invasive strategy' },
      { min: 141, max: 372, label: 'High risk (>3%)',         action: 'Urgent catheterisation, ICU' },
    ],
  },
  cha2ds2vasc: {
    label: 'CHA₂DS₂-VASc (AF Stroke Risk)',
    bands: [
      { min: 0, max: 0, label: 'Low risk',           action: 'No anticoagulation' },
      { min: 1, max: 1, label: 'Low–moderate risk',  action: 'Consider anticoagulation' },
      { min: 2, max: 9, label: 'High risk',           action: 'Anticoagulation recommended' },
    ],
  },
  news2: {
    label: 'NEWS2 (National Early Warning Score)',
    bands: [
      { min: 0,  max: 4,  label: 'Low clinical risk',        action: 'Monitor every 4–12 h' },
      { min: 5,  max: 6,  label: 'Medium clinical risk',     action: 'Urgent clinical review within 1 h' },
      { min: 7,  max: 20, label: 'High / urgent clinical risk', action: 'Emergency response immediately' },
    ],
  },
  sofa: {
    label: 'SOFA (Sequential Organ Failure Assessment)',
    bands: [
      { min: 0,  max: 6,  label: 'Low mortality risk (<10%)',   action: 'Standard ICU monitoring' },
      { min: 7,  max: 9,  label: 'Moderate risk (~15–20%)',     action: 'Active organ support' },
      { min: 10, max: 24, label: 'High mortality risk (>50%)',  action: 'Aggressive intervention / goals of care discussion' },
    ],
  },
  waterlow: {
    label: 'Waterlow Pressure Ulcer Risk',
    bands: [
      { min: 0,  max: 9,  label: 'No risk',       action: '' },
      { min: 10, max: 14, label: 'At risk',        action: 'Repositioning schedule, skin inspection' },
      { min: 15, max: 19, label: 'High risk',      action: 'Pressure-relieving mattress' },
      { min: 20, max: 64, label: 'Very high risk', action: 'Air-fluidised / low-air-loss bed, wound care team' },
    ],
  },
  epds: {
    label: 'EPDS (Edinburgh Postnatal Depression Scale)',
    bands: [
      { min: 0,  max: 8,  label: 'Low risk',           action: 'Routine postnatal care' },
      { min: 9,  max: 12, label: 'Possible depression', action: 'Follow up in 2 weeks' },
      { min: 13, max: 30, label: 'Probable depression', action: 'Urgent mental health referral' },
    ],
  },
  audit: {
    label: 'AUDIT (Alcohol Use Disorders Identification)',
    bands: [
      { min: 0,  max: 7,  label: 'Low risk / abstinent', action: 'No action required' },
      { min: 8,  max: 15, label: 'Hazardous use',         action: 'Simple advice, brief counselling' },
      { min: 16, max: 19, label: 'Harmful use',           action: 'Brief counselling + monitoring' },
      { min: 20, max: 40, label: 'Alcohol dependence',    action: 'Referral to specialist' },
    ],
  },
  braden: {
    label: 'Braden Scale (Pressure Injury Risk)',
    bands: [
      { min: 19, max: 23, label: 'Mild risk',   action: 'Routine skin care' },
      { min: 15, max: 18, label: 'Mild risk',   action: 'Preventive measures, frequent repositioning' },
      { min: 13, max: 14, label: 'Moderate risk', action: 'Skin protection protocol' },
      { min: 10, max: 12, label: 'High risk',   action: 'Pressure-relieving surfaces, nutritional support' },
      { min: 6,  max: 9,  label: 'Very high risk', action: 'Specialty mattress, intensive skin care team' },
    ],
  },
  mmse: {
    label: 'MMSE (Mini-Mental State Examination)',
    bands: [
      { min: 24, max: 30, label: 'Normal cognition',       action: 'Annual review' },
      { min: 19, max: 23, label: 'Mild impairment',        action: 'Neuropsychological testing, follow-up' },
      { min: 10, max: 18, label: 'Moderate dementia',      action: 'Specialist referral, carer support' },
      { min: 0,  max: 9,  label: 'Severe dementia',        action: 'Comprehensive care planning' },
    ],
  },
  wells_dvt: {
    label: 'Wells DVT Score (Deep Vein Thrombosis Probability)',
    bands: [
      { min: -2, max: 0, label: 'Low probability',      action: 'D-dimer; image only if positive' },
      { min: 1,  max: 2, label: 'Moderate probability', action: 'Compression ultrasound' },
      { min: 3,  max: 9, label: 'High probability',     action: 'Immediate ultrasound + anticoagulation' },
    ],
  },
  wells_pe: {
    label: 'Wells PE Score (Pulmonary Embolism Probability)',
    bands: [
      { min: 0, max: 1, label: 'Low probability',      action: 'D-dimer; image only if positive' },
      { min: 2, max: 6, label: 'Moderate probability', action: 'CT pulmonary angiography' },
      { min: 7, max: 12, label: 'High probability',    action: 'Immediate CTPA + anticoagulation' },
    ],
  },
  nihss: {
    label: 'NIHSS (NIH Stroke Scale)',
    bands: [
      { min: 0,  max: 0,  label: 'No stroke symptoms',       action: '' },
      { min: 1,  max: 4,  label: 'Minor stroke',             action: 'Imaging, thrombolysis evaluation' },
      { min: 5,  max: 15, label: 'Moderate stroke',          action: 'Stroke unit admission' },
      { min: 16, max: 20, label: 'Moderate–severe stroke',   action: 'Stroke unit + neuro-ICU' },
      { min: 21, max: 42, label: 'Severe stroke',            action: 'Neuro-ICU, goals-of-care discussion' },
    ],
  },
  curb65: {
    label: 'CURB-65 (Pneumonia Severity)',
    bands: [
      { min: 0, max: 1, label: 'Low severity',      action: 'Treat as outpatient' },
      { min: 2, max: 2, label: 'Moderate severity', action: 'Short hospital stay or close outpatient follow-up' },
      { min: 3, max: 5, label: 'High severity',     action: 'Urgent hospitalisation, consider ICU' },
    ],
  },
  alvarado: {
    label: 'Alvarado Score (Appendicitis)',
    bands: [
      { min: 0, max: 4,  label: 'Low probability',      action: 'Observe and discharge if improving' },
      { min: 5, max: 6,  label: 'Moderate probability', action: 'Active observation + imaging' },
      { min: 7, max: 10, label: 'High probability',     action: 'Surgical consultation / appendicectomy' },
    ],
  },
  timi: {
    label: 'TIMI Risk Score (UA/NSTEMI)',
    bands: [
      { min: 0, max: 2, label: 'Low risk',          action: 'Conservative management' },
      { min: 3, max: 4, label: 'Intermediate risk', action: 'Early invasive strategy' },
      { min: 5, max: 7, label: 'High risk',          action: 'Urgent invasive strategy' },
    ],
  },
  bishop: {
    label: 'Bishop Score (Cervical Ripening / Labour Induction)',
    bands: [
      { min: 0, max: 5,  label: 'Unfavourable cervix', action: 'Cervical ripening required before induction' },
      { min: 6, max: 8,  label: 'Moderate',            action: 'Induction may be attempted' },
      { min: 9, max: 13, label: 'Favourable cervix',   action: 'Proceed with induction' },
    ],
  },
}

const SCORE_TYPES = [
  { value: 'phq9',        label: 'PHQ-9' },
  { value: 'gad7',        label: 'GAD-7' },
  { value: 'gcs',         label: 'GCS' },
  { value: 'morse_fall',  label: 'Morse Fall' },
  { value: 'apgar',       label: 'APGAR' },
  { value: 'heart',       label: 'HEART' },
  { value: 'grace',       label: 'GRACE' },
  { value: 'cha2ds2vasc', label: 'CHA₂DS₂-VASc' },
  { value: 'news2',       label: 'NEWS2' },
  { value: 'sofa',        label: 'SOFA' },
  { value: 'waterlow',    label: 'Waterlow' },
  { value: 'epds',        label: 'EPDS' },
  { value: 'audit',       label: 'AUDIT' },
  { value: 'braden',      label: 'Braden' },
  { value: 'mmse',        label: 'MMSE' },
  { value: 'wells_dvt',   label: 'Wells DVT' },
  { value: 'wells_pe',    label: 'Wells PE' },
  { value: 'nihss',       label: 'NIHSS' },
  { value: 'curb65',      label: 'CURB-65' },
  { value: 'alvarado',    label: 'Alvarado' },
  { value: 'timi',        label: 'TIMI' },
  { value: 'bishop',      label: 'Bishop' },
  { value: 'expression',  label: 'Expression' },
  { value: 'custom',      label: 'Custom' },
]

const IVIEW_TIME_BANDS = ['1h', '2h', '4h', '8h', '12h', '24h']

const BAND_COLORS = [
  { value: 'green',  bg: 'bg-green-500',  ring: 'ring-green-500' },
  { value: 'yellow', bg: 'bg-yellow-400', ring: 'ring-yellow-400' },
  { value: 'orange', bg: 'bg-orange-500', ring: 'ring-orange-500' },
  { value: 'red',    bg: 'bg-red-500',    ring: 'ring-red-500' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDefaultBand() {
  return { min: 0, max: 10, label: '', color: 'green', action: '' }
}

function makeDefaultScore(index) {
  return {
    id: `score_${Date.now()}_${index}`,
    label: index === 0 ? 'Total Score' : `Score ${index + 1}`,
    type: 'custom',
    fields_to_sum: [],
    bands: [],
    expression: '',
    variables: {},
  }
}

function normalizeConfig(raw) {
  if (!raw) return { scores: [makeDefaultScore(0)] }
  if (Array.isArray(raw.scores) && raw.scores.length > 0) return raw
  // Migrate old single-score flat format
  return {
    scores: [{
      id: 'score_0',
      label: 'Total Score',
      type: raw.type || 'custom',
      fields_to_sum: raw.fields_to_sum || [],
      bands: raw.bands || [],
      expression: raw.expression || '',
      variables: raw.variables || {},
    }],
  }
}

// ─── BuiltinBandTable ─────────────────────────────────────────────────────────

function BuiltinBandTable({ bands }) {
  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700/50">
      <table className="w-full text-sm">
        <thead className="bg-gray-700">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Range</th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Interpretation</th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Action</th>
          </tr>
        </thead>
        <tbody>
          {bands.map((b, i) => (
            <tr key={i} className="border-b border-gray-700/50 last:border-0">
              <td className="px-3 py-2 font-mono text-gray-300 text-xs whitespace-nowrap">{b.min}–{b.max}</td>
              <td className="px-3 py-2 text-white text-xs">{b.label}</td>
              <td className="px-3 py-2 text-gray-400 text-xs">{b.action || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── CustomBandRow ────────────────────────────────────────────────────────────

function CustomBandRow({ band, index, onChange, onDelete }) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-gray-700/50 last:border-0">
      <input
        type="number"
        value={band.min}
        onChange={e => onChange(index, 'min', Number(e.target.value))}
        className="w-14 bg-gray-900 border border-gray-700 text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:border-[#F5821E] transition-colors"
        placeholder="Min"
      />
      <span className="text-gray-500 text-xs flex-shrink-0">–</span>
      <input
        type="number"
        value={band.max}
        onChange={e => onChange(index, 'max', Number(e.target.value))}
        className="w-14 bg-gray-900 border border-gray-700 text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:border-[#F5821E] transition-colors"
        placeholder="Max"
      />
      <input
        type="text"
        value={band.label}
        onChange={e => onChange(index, 'label', e.target.value)}
        className="flex-1 bg-gray-900 border border-gray-700 text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:border-[#F5821E] transition-colors min-w-0"
        placeholder="Label…"
      />
      <div className="flex gap-1 flex-shrink-0">
        {BAND_COLORS.map(c => (
          <button
            key={c.value}
            onClick={() => onChange(index, 'color', c.value)}
            title={c.value}
            className={[
              'w-4 h-4 rounded-full transition-all',
              c.bg,
              band.color === c.value ? `ring-2 ring-offset-1 ring-offset-gray-800 ${c.ring}` : 'opacity-50 hover:opacity-100',
            ].join(' ')}
          />
        ))}
      </div>
      <input
        type="text"
        value={band.action}
        onChange={e => onChange(index, 'action', e.target.value)}
        className="w-24 bg-gray-900 border border-gray-700 text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:border-[#F5821E] transition-colors"
        placeholder="Action…"
      />
      <button onClick={() => onDelete(index)} className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
        <X size={13} />
      </button>
    </div>
  )
}

// ─── ExpressionEditor ────────────────────────────────────────────────────────

function ExpressionEditor({ score, allFields, onChange }) {
  const vars = Object.entries(score.variables || {})

  function setExpression(expr) {
    onChange({ expression: expr })
  }

  function setVariable(name, fieldId) {
    onChange({ variables: { ...score.variables, [name]: fieldId } })
  }

  function addVariable() {
    const name = `var${Object.keys(score.variables || {}).length + 1}`
    onChange({ variables: { ...score.variables, [name]: '' } })
  }

  function removeVariable(name) {
    const next = { ...score.variables }
    delete next[name]
    onChange({ variables: next })
  }

  function renameVariable(oldName, newName) {
    const next = {}
    for (const [k, v] of Object.entries(score.variables || {})) {
      next[k === oldName ? newName : k] = v
    }
    onChange({ variables: next })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-gray-400 mb-1">Formula Expression</label>
        <textarea
          value={score.expression || ''}
          onChange={e => setExpression(e.target.value)}
          rows={3}
          placeholder="e.g.  ageScore + bpScore * 1.5  or  IF(diabetic, score + 2, score)"
          className="w-full bg-gray-900 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-[#F5821E] transition-colors font-mono resize-none"
        />
        <p className="mt-1 text-xs text-gray-600">
          Use variable names defined below. Operators: + - * / ^ (pow). Functions: IF(cond,t,f) MIN() MAX() ABS() ROUND().
        </p>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-gray-400">Variable Bindings</label>
          <button onClick={addVariable} className="text-xs text-[#F5821E] hover:text-[#e07319] transition-colors flex items-center gap-1">
            <Plus size={11} /> Add Variable
          </button>
        </div>
        {vars.length === 0 && (
          <p className="text-xs text-gray-600 italic">No variables defined.</p>
        )}
        <div className="space-y-1.5">
          {vars.map(([name, fieldId]) => (
            <div key={name} className="flex items-center gap-2">
              <input
                type="text"
                value={name}
                onChange={e => renameVariable(name, e.target.value)}
                className="w-28 bg-gray-900 border border-gray-700 text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:border-[#F5821E] transition-colors font-mono"
                placeholder="varName"
              />
              <span className="text-gray-500 text-xs flex-shrink-0">=</span>
              <select
                value={fieldId}
                onChange={e => setVariable(name, e.target.value)}
                className="flex-1 bg-gray-900 border border-gray-700 text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:border-[#F5821E] transition-colors"
              >
                <option value="">— select field —</option>
                {allFields
                  .filter(({ field }) => ['number', 'calculated', 'scale', 'score_display', 'numeric_range'].includes(field.type))
                  .map(({ field }) => (
                    <option key={field.id} value={field.field_id}>{field.label}</option>
                  ))}
              </select>
              <button onClick={() => removeVariable(name)} className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── ScoreCard ────────────────────────────────────────────────────────────────

function ScoreCard({ score, allFields, onChange, onDelete, isOnly }) {
  const [open, setOpen] = useState(true)

  const isBuiltin = score.type && score.type !== 'custom' && score.type !== 'expression'
  const builtinDef = BUILTIN_BANDS[score.type]

  const sortedBands = [...(score.bands || [])].sort((a, b) => a.min - b.min)

  function updateScore(partial) {
    onChange({ ...score, ...partial })
  }

  function handleTypeChange(type) {
    updateScore({ type })
  }

  function toggleFieldToSum(fieldId) {
    const current = score.fields_to_sum || []
    updateScore({
      fields_to_sum: current.includes(fieldId)
        ? current.filter(id => id !== fieldId)
        : [...current, fieldId],
    })
  }

  function handleBandChange(index, key, value) {
    const next = [...sortedBands]
    next[index] = { ...next[index], [key]: value }
    updateScore({ bands: next })
  }

  function handleBandDelete(index) {
    const next = [...sortedBands]
    next.splice(index, 1)
    updateScore({ bands: next })
  }

  function handleAddBand() {
    const lastMax = sortedBands.length > 0 ? sortedBands[sortedBands.length - 1].max + 1 : 0
    updateScore({ bands: [...sortedBands, { ...makeDefaultBand(), min: lastMax, max: lastMax + 10 }] })
  }

  const sumCandidates = allFields.filter(({ field }) =>
    ['number', 'calculated', 'scale', 'numeric_range', 'score_display'].includes(field.type)
  )

  return (
    <div className="bg-gray-800 border border-gray-700/60 rounded-xl overflow-hidden">
      {/* Score header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700/50">
        <button onClick={() => setOpen(v => !v)} className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <BarChart2 size={13} className="text-[#F5821E] flex-shrink-0" />
        <input
          type="text"
          value={score.label}
          onChange={e => updateScore({ label: e.target.value })}
          className="flex-1 bg-transparent text-sm font-semibold text-white outline-none min-w-0 placeholder-gray-600"
          placeholder="Score label…"
        />
        {!isOnly && (
          <button onClick={onDelete} className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {open && (
        <div className="p-3 space-y-4">
          {/* Score type chips */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Score Type</label>
            <div className="flex flex-wrap gap-1">
              {SCORE_TYPES.map(st => (
                <button
                  key={st.value}
                  onClick={() => handleTypeChange(st.value)}
                  className={[
                    'px-2 py-1 rounded-lg text-xs font-medium transition-all border',
                    score.type === st.value
                      ? 'bg-[#F5821E] border-[#F5821E] text-white'
                      : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600',
                  ].join(' ')}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Builtin: read-only band table */}
          {isBuiltin && builtinDef && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Score Bands</span>
                <span className="text-xs text-gray-500 italic">Standard scale</span>
              </div>
              <BuiltinBandTable bands={builtinDef.bands} />
              <p className="mt-1.5 text-xs text-gray-500">{builtinDef.label}</p>
            </div>
          )}

          {/* Expression type */}
          {score.type === 'expression' && (
            <ExpressionEditor
              score={score}
              allFields={allFields}
              onChange={partial => updateScore(partial)}
            />
          )}

          {/* Custom: fields to sum + bands */}
          {score.type === 'custom' && (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Fields to Sum</label>
                {sumCandidates.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No numeric / calculated fields in form.</p>
                ) : (
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {sumCandidates.map(({ field }) => {
                      const checked = (score.fields_to_sum || []).includes(field.id)
                      return (
                        <label
                          key={field.id}
                          className={[
                            'flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors border',
                            checked ? 'bg-[#F5821E]/10 border-[#F5821E]/40' : 'bg-gray-900 border-gray-700 hover:border-gray-600',
                          ].join(' ')}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleFieldToSum(field.id)}
                            className="accent-[#F5821E]"
                          />
                          <div className="min-w-0">
                            <span className="text-xs text-white truncate block">{field.label}</span>
                            <span className="text-[10px] font-mono text-gray-500">{field.field_id}</span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Score Bands</label>
                {sortedBands.length === 0 ? (
                  <p className="text-xs text-gray-500 italic mb-1.5">No bands defined.</p>
                ) : (
                  <div className="bg-gray-900 rounded-xl px-2 mb-2 border border-gray-700/50">
                    {sortedBands.map((band, i) => (
                      <CustomBandRow
                        key={i}
                        band={band}
                        index={i}
                        onChange={handleBandChange}
                        onDelete={handleBandDelete}
                      />
                    ))}
                  </div>
                )}
                <button
                  onClick={handleAddBand}
                  className="flex items-center gap-1 text-xs text-[#F5821E] hover:text-[#e07319] transition-colors font-medium"
                >
                  <Plus size={12} /> Add Band
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ScoringConfig ────────────────────────────────────────────────────────────

export default function ScoringConfig({ form, allFields, onUpdate, onUpdateFormProp }) {
  const config = normalizeConfig(form.scoring_config)
  const { scores } = config

  function updateScores(next) {
    onUpdate({ ...config, scores: next })
  }

  function handleScoreChange(index, updated) {
    const next = [...scores]
    next[index] = updated
    updateScores(next)
  }

  function handleScoreDelete(index) {
    const next = [...scores]
    next.splice(index, 1)
    updateScores(next)
  }

  function handleAddScore() {
    updateScores([...scores, makeDefaultScore(scores.length)])
  }

  return (
    <div className="space-y-5">

      {/* ── Scores list ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Scores ({scores.length})
          </label>
          <button
            onClick={handleAddScore}
            className="flex items-center gap-1 text-xs text-[#F5821E] hover:text-[#e07319] transition-colors font-medium"
          >
            <Plus size={12} /> Add Score
          </button>
        </div>
        <div className="space-y-3">
          {scores.map((score, i) => (
            <ScoreCard
              key={score.id}
              score={score}
              allFields={allFields}
              onChange={updated => handleScoreChange(i, updated)}
              onDelete={() => handleScoreDelete(i)}
              isOnly={scores.length === 1}
            />
          ))}
        </div>
      </div>

      {/* ── iView Configuration ── */}
      <div className="pt-4 border-t border-gray-700/60">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-gray-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            iView Configuration
          </span>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-white">Enable iView</p>
            <p className="text-xs text-gray-500">Periodic reassessment tracking</p>
          </div>
          <button
            onClick={() => onUpdateFormProp('is_iview_enabled', !form.is_iview_enabled)}
            className={[
              'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 transition-colors duration-200 focus:outline-none',
              form.is_iview_enabled ? 'bg-[#F5821E] border-[#F5821E]' : 'bg-gray-700 border-gray-700',
            ].join(' ')}
          >
            <span className={[
              'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform duration-200 mt-px',
              form.is_iview_enabled ? 'translate-x-4' : 'translate-x-0.5',
            ].join(' ')} />
          </button>
        </div>

        {form.is_iview_enabled && (
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Reassessment Interval</label>
            <div className="flex flex-wrap gap-1.5">
              {IVIEW_TIME_BANDS.map(band => (
                <button
                  key={band}
                  onClick={() => onUpdateFormProp('iview_time_band', band)}
                  className={[
                    'px-3 py-1 rounded-lg text-xs font-medium transition-all border',
                    form.iview_time_band === band
                      ? 'bg-[#F5821E] border-[#F5821E] text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600',
                  ].join(' ')}
                >
                  {band}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
