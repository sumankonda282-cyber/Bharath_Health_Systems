/**
 * @shared-pool — standalone clinical assessment, portal-agnostic
 * Activated Clotting Time (ACT) monitoring form.
 */
import { useState } from 'react'
import { Droplets } from 'lucide-react'
import api from '../../../api/client'

// ── Target ranges by indication ───────────────────────────────────────────────

const INDICATIONS = [
  { key: 'cardiac_cath',   label: 'Cardiac Catheterisation', min: 200, max: 300 },
  { key: 'cardiac_bypass', label: 'Cardiac Bypass / CPB',    min: 400, max: 480 },
  { key: 'ecmo',           label: 'ECMO',                    min: 180, max: 220 },
  { key: 'haemodialysis',  label: 'Haemodialysis',           min: 150, max: 200 },
  { key: 'heparin',        label: 'Heparin Monitoring',      min: 150, max: 200 },
  { key: 'routine',        label: 'Routine / Baseline',      min: 70,  max: 120 },
]

const ACTIONS = [
  'No Change',
  'Increase Heparin',
  'Decrease Heparin',
  'Protamine Given',
  'Recheck in 15 min',
  'Procedure Suspended',
]

function interpret(actVal, indication) {
  if (!actVal || !indication) return null
  const v = Number(actVal)
  if (isNaN(v)) return null
  if (v < indication.min) return { label: 'Sub-therapeutic', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' }
  if (v > indication.max) return { label: 'Supra-therapeutic', color: 'bg-red-100 text-red-800 border-red-300' }
  return { label: 'Therapeutic', color: 'bg-green-100 text-green-800 border-green-300' }
}

// ── Main form ─────────────────────────────────────────────────────────────────

export default function ACTForm({ admission, onClose, onSaved }) {
  const [indicationKey, setIndicationKey] = useState('')
  const [actValue,      setActValue]      = useState('')
  const [measuredAt,    setMeasuredAt]    = useState(() => {
    const now = new Date()
    return now.toTimeString().slice(0, 5)
  })
  const [heparinDose,   setHeparinDose]  = useState('')
  const [action,        setAction]       = useState('')
  const [notes,         setNotes]        = useState('')
  const [saving,        setSaving]       = useState(false)
  const [error,         setError]        = useState('')

  const indication = INDICATIONS.find(i => i.key === indicationKey) || null
  const result     = interpret(actValue, indication)

  const handleSave = async () => {
    if (!actValue) { setError('Enter an ACT value.'); return }
    if (!indicationKey) { setError('Select an indication.'); return }
    setSaving(true); setError('')
    const payload = {
      type: 'act',
      indication: indicationKey,
      indication_label: indication?.label,
      act_seconds: Number(actValue),
      target_min: indication?.min,
      target_max: indication?.max,
      interpretation: result?.label,
      measured_at: measuredAt,
      heparin_dose_units: heparinDose ? Number(heparinDose) : null,
      action_taken: action,
      notes,
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
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* Badge */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-red-100 rounded-lg">
            <Droplets size={16} className="text-red-600" />
          </div>
          <span className="text-xs font-bold text-red-600 uppercase tracking-wider">
            [A] Activated Clotting Time
          </span>
        </div>

        {/* Indication */}
        <section>
          <h3 className="text-sm font-bold text-gray-700 mb-2">Indication</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {INDICATIONS.map(ind => (
              <button key={ind.key} type="button"
                onClick={() => setIndicationKey(k => k === ind.key ? '' : ind.key)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all ${
                  indicationKey === ind.key
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'
                }`}>
                <span className="block font-semibold">{ind.label}</span>
                <span className={`text-[10px] mt-0.5 block ${indicationKey === ind.key ? 'text-red-100' : 'text-gray-400'}`}>
                  Target: {ind.min}–{ind.max} s
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ACT Value + Time */}
        <section className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              ACT Value <span className="font-normal text-gray-400">(seconds)</span>
            </label>
            <input
              type="number" min="0" max="9999" value={actValue}
              onChange={e => setActValue(e.target.value)}
              placeholder="e.g. 250"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 text-center text-lg font-bold"
            />
            {/* Interpretation badge */}
            {result && (
              <div className={`mt-2 text-center text-xs font-bold px-3 py-1.5 rounded-lg border ${result.color}`}>
                {result.label}
                {indication && (
                  <span className="ml-1 font-normal">
                    (target {indication.min}–{indication.max} s)
                  </span>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Time Measured</label>
            <input
              type="time" value={measuredAt}
              onChange={e => setMeasuredAt(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <label className="block text-sm font-bold text-gray-700 mb-1.5 mt-4">
              Heparin Dose <span className="font-normal text-gray-400">(units, optional)</span>
            </label>
            <input
              type="number" min="0" value={heparinDose}
              onChange={e => setHeparinDose(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
        </section>

        {/* Action taken */}
        <section>
          <h3 className="text-sm font-bold text-gray-700 mb-2">Action Taken</h3>
          <div className="flex flex-wrap gap-2">
            {ACTIONS.map(a => (
              <button key={a} type="button"
                onClick={() => setAction(v => v === a ? '' : a)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  action === a
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'
                }`}>{a}</button>
            ))}
          </div>
        </section>

        {/* Notes */}
        <section>
          <h3 className="text-sm font-bold text-gray-700 mb-1.5">Notes</h3>
          <textarea
            rows={3} value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Additional clinical notes…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
        </section>

        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4 flex justify-end gap-3">
        <button type="button" onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button type="button" onClick={handleSave} disabled={saving}
          className="px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
