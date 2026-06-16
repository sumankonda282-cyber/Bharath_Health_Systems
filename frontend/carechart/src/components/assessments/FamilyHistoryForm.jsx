import { useState } from 'react'
import { Loader2, CheckCircle, AlertCircle, GitBranch, Plus } from 'lucide-react'
import { usePin } from '../../contexts/PinContext'
import SignatureBlock from '../SignatureBlock'
import api from '../../api/client'

const CONDITIONS = [
  'Alcohol Abuse',
  "Alzheimer's / Dementia",
  'Asthma / COPD',
  'Breast Cancer',
  'Cancer (Other)',
  'Coronary Artery Disease / Heart Attack',
  'Diabetes Mellitus',
  'Epilepsy / Seizures',
  'Heart Failure',
  'Hypertension',
  'Kidney Disease',
  'Mental Health Disorder',
  'Mental Disability',
  'Osteoporosis',
  'Stroke / TIA',
  'Substance Abuse',
  'Suicide / Self-Harm',
  'Thyroid Disorder',
  'Tuberculosis',
  'Hereditary / Genetic Disorder',
]

const RELATIONSHIPS = [
  'Father', 'Mother', 'Brother', 'Sister',
  'Paternal Grandfather', 'Paternal Grandmother',
  'Maternal Grandfather', 'Maternal Grandmother',
  'Son', 'Daughter', 'Uncle', 'Aunt', 'Other',
]

const HEALTH_STATUS = ['Alive', 'Deceased', 'Unknown']

const newMember = (rel = '') => ({ relationship: rel, name: '', status: '' })

const LABEL_W = 196
const COL_W   = 116

export default function FamilyHistoryForm({ admission, onClose, onSaved }) {
  const [members, setMembers]         = useState([newMember('Father'), newMember('Mother')])
  const [presence, setPresence]       = useState({})
  const [consanguinity, setConsanguinity] = useState(null)
  const [noHistory, setNoHistory]     = useState(false)
  const [notes, setNotes]             = useState('')
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState(null)
  const [done, setDone]               = useState(false)
  const { pin }                       = usePin()

  const addMember = () => setMembers(p => [...p, newMember()])

  const updateMember = (idx, field, val) =>
    setMembers(p => p.map((m, i) => i === idx ? { ...m, [field]: val } : m))

  const togglePresence = (mIdx, cond) =>
    setPresence(p => { const k = `${mIdx}__${cond}`; return { ...p, [k]: !p[k] } })

  const isPresent = (mIdx, cond) => !!presence[`${mIdx}__${cond}`]

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      const membersData = members.map((m, idx) => ({
        ...m,
        conditions: CONDITIONS.filter(c => isPresent(idx, c)),
      }))
      const payload = { type: 'family_history', no_significant_history: noHistory, consanguinity, members: membersData, notes }
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
      <p className="font-semibold text-gray-700">Family History saved</p>
    </div>
  )

  return (
    <div className="flex flex-col h-full">

      {/* Badge + Add button */}
      <div className="shrink-0 px-6 pt-4 pb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
          <GitBranch size={12} /> [A] Family History
        </span>
        <button type="button" onClick={addMember}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-2.5 py-1 hover:bg-blue-50 transition-colors">
          <Plus size={12} /> Add Family Member
        </button>
      </div>

      {/* Consanguinity + No history */}
      <div className="shrink-0 px-6 pb-3 flex items-center gap-4 border-b border-gray-100">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input type="checkbox" checked={noHistory} onChange={e => setNoHistory(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-indigo-600" />
          No significant family history
        </label>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-gray-500">Consanguinity</span>
          {['Yes', 'No'].map(opt => (
            <button key={opt} type="button"
              onClick={() => setConsanguinity(consanguinity === opt ? null : opt)}
              className={`px-2.5 py-0.5 text-xs rounded-lg border font-medium transition-colors
                ${consanguinity === opt
                  ? opt === 'Yes' ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-700 text-white border-gray-700'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable grid */}
      <div className="flex-1 overflow-auto">
        {!noHistory && (
          <table className="border-collapse text-xs"
            style={{ minWidth: LABEL_W + members.length * COL_W }}>
            <thead className="sticky top-0 z-10 bg-white shadow-sm">

              {/* Row 1 — Relationship */}
              <tr>
                <th className="border border-gray-200 bg-gray-100 px-3 py-2 text-left text-gray-500 font-semibold text-xs"
                  style={{ width: LABEL_W, minWidth: LABEL_W }}>
                  Condition
                </th>
                {members.map((m, idx) => (
                  <th key={idx} className="border border-gray-200 bg-gray-100 px-1 py-1.5"
                    style={{ width: COL_W, minWidth: COL_W }}>
                    <select value={m.relationship} onChange={e => updateMember(idx, 'relationship', e.target.value)}
                      className="w-full text-xs border-0 bg-transparent focus:outline-none text-gray-700 font-semibold cursor-pointer">
                      <option value="">— Select —</option>
                      {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </th>
                ))}
              </tr>

              {/* Row 2 — Name */}
              <tr>
                <td className="border border-gray-200 bg-gray-50 px-3 py-1 text-gray-400 italic text-xs"
                  style={{ width: LABEL_W }}>Name</td>
                {members.map((m, idx) => (
                  <td key={idx} className="border border-gray-200 bg-gray-50 px-1.5 py-1"
                    style={{ width: COL_W }}>
                    <input type="text" value={m.name} onChange={e => updateMember(idx, 'name', e.target.value)}
                      placeholder="Optional"
                      className="w-full text-xs border-0 bg-transparent focus:outline-none text-gray-600 placeholder-gray-300" />
                  </td>
                ))}
              </tr>

              {/* Row 3 — Health Status */}
              <tr>
                <td className="border border-gray-200 bg-blue-50/50 px-3 py-1 text-gray-400 italic text-xs"
                  style={{ width: LABEL_W }}>Health Status</td>
                {members.map((m, idx) => (
                  <td key={idx} className="border border-gray-200 bg-blue-50/50 px-1 py-1"
                    style={{ width: COL_W }}>
                    <select value={m.status} onChange={e => updateMember(idx, 'status', e.target.value)}
                      className="w-full text-xs border-0 bg-transparent focus:outline-none text-gray-600 cursor-pointer">
                      <option value=""></option>
                      {HEALTH_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                ))}
              </tr>
            </thead>

            <tbody>
              {CONDITIONS.map((cond, ci) => (
                <tr key={cond} className={ci % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                  <td className="border border-gray-200 px-3 py-2 text-gray-700 font-medium text-xs"
                    style={{ width: LABEL_W, whiteSpace: 'nowrap' }}>
                    {cond}
                  </td>
                  {members.map((_, mIdx) => {
                    const present = isPresent(mIdx, cond)
                    return (
                      <td key={mIdx} className="border border-gray-200 text-center py-1.5"
                        style={{ width: COL_W }}>
                        <button type="button" onClick={() => togglePresence(mIdx, cond)}
                          title={present ? 'Click to clear' : 'Click to mark present'}
                          className={`w-6 h-6 rounded font-bold text-sm leading-none transition-all
                            ${present
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-gray-300 hover:text-blue-500 hover:bg-blue-50'}`}>
                          +
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Notes */}
        <div className="px-4 pt-4 pb-2">
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Additional notes..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
        </div>
        <div className="px-4 pb-2">
          <SignatureBlock />
        </div>
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
