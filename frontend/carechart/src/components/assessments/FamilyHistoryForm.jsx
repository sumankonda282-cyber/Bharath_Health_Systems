import { useState } from 'react'
import { Loader2, CheckCircle, AlertCircle, GitBranch } from 'lucide-react'
import { usePin } from '../../contexts/PinContext'
import SignatureBlock from '../SignatureBlock'
import api from '../../api/client'

const RELATIONS = [
  'Father', 'Mother', 'Brother', 'Sister',
  'Paternal Grandfather', 'Paternal Grandmother',
  'Maternal Grandfather', 'Maternal Grandmother',
  'Child / Children',
]

const CONDITIONS = [
  { key: 'hypertension',     label: 'Hypertension' },
  { key: 'diabetes',         label: 'Diabetes Mellitus' },
  { key: 'cad',              label: 'Coronary Artery Disease / Heart Attack' },
  { key: 'heart_failure',    label: 'Heart Failure' },
  { key: 'stroke',           label: 'Stroke / TIA' },
  { key: 'cancer',           label: 'Cancer' },
  { key: 'asthma_copd',      label: 'Asthma / COPD' },
  { key: 'ckd',              label: 'Chronic Kidney Disease' },
  { key: 'thyroid',          label: 'Thyroid Disorder' },
  { key: 'mental_health',    label: 'Mental Health Disorder' },
  { key: 'tuberculosis',     label: 'Tuberculosis' },
  { key: 'epilepsy',         label: 'Epilepsy / Seizures' },
  { key: 'autoimmune',       label: 'Autoimmune Disease' },
  { key: 'genetic',          label: 'Hereditary / Genetic Disorder' },
]

function Pills({ options, selected, onChange }) {
  const toggle = (opt) => {
    const s = new Set(selected)
    s.has(opt) ? s.delete(opt) : s.add(opt)
    onChange([...s])
  }
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => toggle(opt)}
          className={`px-2.5 py-0.5 text-xs rounded-full border font-medium transition-colors
            ${selected.includes(opt)
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
          {opt}
        </button>
      ))}
    </div>
  )
}

const initConditions = () => Object.fromEntries(CONDITIONS.map(c => [c.key, []]))

export default function FamilyHistoryForm({ admission, onClose, onSaved }) {
  const [conditions, setConditions] = useState(initConditions())
  const [consanguinity, setConsanguinity] = useState(null)
  const [noHistory, setNoHistory]         = useState(false)
  const [notes, setNotes]                 = useState('')
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState(null)
  const [done, setDone]                   = useState(false)
  const { pin }                           = usePin()

  const setRelations = (key, rels) =>
    setConditions(prev => ({ ...prev, [key]: rels }))

  const activeConditions = CONDITIONS.filter(c => conditions[c.key].length > 0)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        type: 'family_history',
        no_significant_history: noHistory,
        consanguinity,
        conditions,
        notes,
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
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 py-12">
        <CheckCircle size={40} className="text-emerald-500" />
        <p className="font-semibold text-gray-700">Family History saved</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Badge */}
      <div className="shrink-0 px-6 pt-4 pb-2 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
          <GitBranch size={12} /> [A] Family History
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-1">

        {/* Quick toggles */}
        <div className="flex items-center gap-4 py-3 border-b border-gray-100">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input type="checkbox" checked={noHistory} onChange={e => setNoHistory(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600" />
            No significant family history
          </label>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-500">Consanguinity</span>
            <div className="flex gap-1.5">
              {['Yes', 'No'].map(opt => (
                <button key={opt} type="button"
                  onClick={() => setConsanguinity(consanguinity === opt ? null : opt)}
                  className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors
                    ${consanguinity === opt
                      ? opt === 'Yes' ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-700 text-white border-gray-700'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {!noHistory && (
          <>
            {/* Condition rows */}
            <div className="text-xs text-gray-400 pt-2 pb-1">
              Select condition → tap which family members are affected
            </div>

            {CONDITIONS.map(({ key, label }) => {
              const selected = conditions[key]
              const hasAny = selected.length > 0
              return (
                <div key={key}
                  className={`rounded-xl border px-4 py-3 transition-colors ${hasAny ? 'border-indigo-200 bg-indigo-50/40' : 'border-gray-100 bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${hasAny ? 'text-indigo-800' : 'text-gray-700'}`}>{label}</span>
                    {hasAny && (
                      <button type="button" onClick={() => setRelations(key, [])}
                        className="text-xs text-gray-400 hover:text-red-500 ml-2">clear</button>
                    )}
                  </div>
                  <Pills options={RELATIONS} selected={selected} onChange={v => setRelations(key, v)} />
                </div>
              )
            })}

            {/* Summary */}
            {activeConditions.length > 0 && (
              <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Summary</p>
                {activeConditions.map(({ key, label }) => (
                  <p key={key} className="text-xs text-gray-700 py-0.5">
                    <span className="font-semibold">{label}:</span>{' '}
                    {conditions[key].join(', ')}
                  </p>
                ))}
              </div>
            )}
          </>
        )}

        {/* Notes */}
        <div className="pt-3">
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Additional notes..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
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
            className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
