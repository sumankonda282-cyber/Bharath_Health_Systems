import { useState } from 'react'
import { Plus, X, Calculator, Clock } from 'lucide-react'

// ─── Known Band Definitions ───────────────────────────────────────────────────

const BUILTIN_BANDS = {
  phq9: {
    label: 'PHQ-9 (Patient Health Questionnaire)',
    bands: [
      { min: 0,  max: 4,  label: 'Minimal depression',       action: 'Monitor' },
      { min: 5,  max: 9,  label: 'Mild depression',           action: 'Support' },
      { min: 10, max: 14, label: 'Moderate depression',       action: 'Treatment' },
      { min: 15, max: 19, label: 'Moderately severe',         action: 'Urgent referral' },
      { min: 20, max: 27, label: 'Severe depression',         action: 'Immediate action' },
    ],
  },
  gad7: {
    label: 'GAD-7 (Generalized Anxiety Disorder)',
    bands: [
      { min: 0,  max: 4,  label: 'Minimal anxiety',  action: '' },
      { min: 5,  max: 9,  label: 'Mild anxiety',      action: '' },
      { min: 10, max: 14, label: 'Moderate anxiety',  action: '' },
      { min: 15, max: 21, label: 'Severe anxiety',    action: '' },
    ],
  },
  gcs: {
    label: 'GCS (Glasgow Coma Scale)',
    bands: [
      { min: 13, max: 15, label: 'Mild TBI',     action: '' },
      { min: 9,  max: 12, label: 'Moderate TBI', action: '' },
      { min: 3,  max: 8,  label: 'Severe TBI',   action: '' },
    ],
  },
  morse_fall: {
    label: 'Morse Fall Scale',
    bands: [
      { min: 0,  max: 24, label: 'No risk',   action: '' },
      { min: 25, max: 50, label: 'Low risk',  action: '' },
      { min: 51, max: 125, label: 'High risk', action: '' },
    ],
  },
  apgar: {
    label: 'APGAR Score',
    bands: [
      { min: 7, max: 10, label: 'Normal',                action: '' },
      { min: 4, max: 6,  label: 'Moderate concern',      action: '' },
      { min: 0, max: 3,  label: 'Immediate intervention', action: '' },
    ],
  },
}

const SCORE_TYPES = [
  { value: 'phq9',       label: 'PHQ-9' },
  { value: 'gad7',       label: 'GAD-7' },
  { value: 'gcs',        label: 'GCS' },
  { value: 'morse_fall', label: 'Morse Fall' },
  { value: 'apgar',      label: 'APGAR' },
  { value: 'custom',     label: 'Custom' },
]

const IVIEW_TIME_BANDS = ['1h', '2h', '4h', '8h', '12h', '24h']

const BAND_COLORS = [
  { value: 'green',  bg: 'bg-green-500',  ring: 'ring-green-500' },
  { value: 'yellow', bg: 'bg-yellow-400', ring: 'ring-yellow-400' },
  { value: 'orange', bg: 'bg-orange-500', ring: 'ring-orange-500' },
  { value: 'red',    bg: 'bg-red-500',    ring: 'ring-red-500' },
]

function makeBand() {
  return { min: 0, max: 10, label: '', color: 'green', action: '' }
}

// ─── BuiltinBandTable ─────────────────────────────────────────────────────────

function BuiltinBandTable({ bands }) {
  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700/50">
      <table className="w-full text-sm">
        <thead className="bg-gray-700">
          <tr>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
              Score Range
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
              Interpretation
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
              Suggested Action
            </th>
          </tr>
        </thead>
        <tbody>
          {bands.map((band, i) => (
            <tr key={i} className="border-b border-gray-700/50 last:border-0">
              <td className="px-4 py-2.5 font-mono text-gray-300">
                {band.min}–{band.max}
              </td>
              <td className="px-4 py-2.5 text-white">{band.label}</td>
              <td className="px-4 py-2.5 text-gray-400">{band.action || '—'}</td>
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
      {/* Min */}
      <input
        type="number"
        value={band.min}
        onChange={(e) => onChange(index, 'min', Number(e.target.value))}
        className="w-16 bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-2 py-1.5 outline-none focus:border-[#F5821E] transition-colors"
        placeholder="Min"
      />
      <span className="text-gray-500 text-sm flex-shrink-0">–</span>
      {/* Max */}
      <input
        type="number"
        value={band.max}
        onChange={(e) => onChange(index, 'max', Number(e.target.value))}
        className="w-16 bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-2 py-1.5 outline-none focus:border-[#F5821E] transition-colors"
        placeholder="Max"
      />
      {/* Label */}
      <input
        type="text"
        value={band.label}
        onChange={(e) => onChange(index, 'label', e.target.value)}
        className="flex-1 bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-2 py-1.5 outline-none focus:border-[#F5821E] transition-colors min-w-0"
        placeholder="Label…"
      />
      {/* Color presets */}
      <div className="flex gap-1 flex-shrink-0">
        {BAND_COLORS.map((c) => (
          <button
            key={c.value}
            onClick={() => onChange(index, 'color', c.value)}
            title={c.value}
            className={[
              'w-5 h-5 rounded-full transition-all',
              c.bg,
              band.color === c.value ? `ring-2 ring-offset-2 ring-offset-gray-800 ${c.ring}` : 'opacity-60 hover:opacity-100',
            ].join(' ')}
          />
        ))}
      </div>
      {/* Action */}
      <input
        type="text"
        value={band.action}
        onChange={(e) => onChange(index, 'action', e.target.value)}
        className="w-28 bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-2 py-1.5 outline-none focus:border-[#F5821E] transition-colors"
        placeholder="Action…"
      />
      {/* Delete */}
      <button
        onClick={() => onDelete(index)}
        className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
      >
        <X size={15} />
      </button>
    </div>
  )
}

// ─── ScoringConfig ────────────────────────────────────────────────────────────

export default function ScoringConfig({ form, allFields, onUpdate, onUpdateFormProp }) {
  const scoringConfig = form.scoring_config || { type: 'custom', fields_to_sum: [], bands: [] }

  function updateConfig(partial) {
    onUpdate({ ...scoringConfig, ...partial })
  }

  function handleTypeChange(type) {
    updateConfig({ type, fields_to_sum: scoringConfig.fields_to_sum, bands: scoringConfig.bands })
  }

  // Fields to sum: only number / calculated
  const sumCandidates = allFields.filter(
    (item) => item.field.type === 'number' || item.field.type === 'calculated'
  )

  function toggleFieldToSum(fieldId) {
    const current = scoringConfig.fields_to_sum || []
    const next = current.includes(fieldId)
      ? current.filter((id) => id !== fieldId)
      : [...current, fieldId]
    updateConfig({ fields_to_sum: next })
  }

  // Band editing
  const bands = scoringConfig.bands || []
  const sortedBands = [...bands].sort((a, b) => a.min - b.min)

  function handleBandChange(index, key, value) {
    // Work on sorted indices
    const newBands = [...sortedBands]
    newBands[index] = { ...newBands[index], [key]: value }
    updateConfig({ bands: newBands })
  }

  function handleBandDelete(index) {
    const newBands = [...sortedBands]
    newBands.splice(index, 1)
    updateConfig({ bands: newBands })
  }

  function handleAddBand() {
    const lastMax = sortedBands.length > 0 ? sortedBands[sortedBands.length - 1].max + 1 : 0
    updateConfig({ bands: [...sortedBands, { ...makeBand(), min: lastMax, max: lastMax + 10 }] })
  }

  const isBuiltin = scoringConfig.type && scoringConfig.type !== 'custom'
  const builtinDef = BUILTIN_BANDS[scoringConfig.type]

  return (
    <div className="space-y-5">

      {/* ── Score Type Selector ── */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
          Score Type
        </label>
        <div className="flex flex-wrap gap-1.5">
          {SCORE_TYPES.map((st) => (
            <button
              key={st.value}
              onClick={() => handleTypeChange(st.value)}
              className={[
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                scoringConfig.type === st.value
                  ? 'bg-[#F5821E] border-[#F5821E] text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600',
              ].join(' ')}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Builtin: read-only band table ── */}
      {isBuiltin && builtinDef && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Score Bands
            </span>
            <span className="text-xs text-gray-500 italic">Read-only (standard scale)</span>
          </div>
          <BuiltinBandTable bands={builtinDef.bands} />
          <p className="mt-2 text-xs text-gray-500">
            {builtinDef.label} — bands are automatically applied based on the summed score.
          </p>
        </div>
      )}

      {/* ── Custom: Fields to Sum ── */}
      {!isBuiltin && (
        <>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Fields to Sum
            </label>
            {sumCandidates.length === 0 ? (
              <p className="text-xs text-gray-500 italic">
                No number or calculated fields found in the form.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {sumCandidates.map(({ field }) => {
                  const checked = (scoringConfig.fields_to_sum || []).includes(field.id)
                  return (
                    <label
                      key={field.id}
                      className={[
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors border',
                        checked
                          ? 'bg-[#F5821E]/10 border-[#F5821E]/40'
                          : 'bg-gray-800 border-gray-700 hover:border-gray-600',
                      ].join(' ')}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFieldToSum(field.id)}
                        className="accent-[#F5821E]"
                      />
                      <div className="min-w-0">
                        <span className="text-sm text-white truncate block">{field.label}</span>
                        <span className="text-xs font-mono text-gray-500">{field.field_id}</span>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Custom: Score Bands ── */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Score Bands
            </label>
            {sortedBands.length === 0 ? (
              <p className="text-xs text-gray-500 italic mb-2">No bands defined yet.</p>
            ) : (
              <div className="bg-gray-800 rounded-xl px-3 mb-2 border border-gray-700/50">
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
              className="flex items-center gap-1.5 text-xs text-[#F5821E] hover:text-[#e07319] transition-colors font-medium"
            >
              <Plus size={13} />
              Add Band
            </button>
          </div>
        </>
      )}

      {/* ── iView Configuration ── */}
      <div className="pt-4 border-t border-gray-700/60">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-gray-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            iView Configuration
          </span>
        </div>

        {/* iView toggle */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-white">Enable iView</p>
            <p className="text-xs text-gray-500">Periodic reassessment tracking</p>
          </div>
          <button
            onClick={() => onUpdateFormProp('is_iview_enabled', !form.is_iview_enabled)}
            className={[
              'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 transition-colors duration-200 focus:outline-none',
              form.is_iview_enabled
                ? 'bg-[#F5821E] border-[#F5821E]'
                : 'bg-gray-700 border-gray-700',
            ].join(' ')}
          >
            <span
              className={[
                'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform duration-200 mt-px',
                form.is_iview_enabled ? 'translate-x-4' : 'translate-x-0.5',
              ].join(' ')}
            />
          </button>
        </div>

        {/* Time band selector */}
        {form.is_iview_enabled && (
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              Reassessment Interval
            </label>
            <div className="flex flex-wrap gap-1.5">
              {IVIEW_TIME_BANDS.map((band) => (
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
