import { useState } from 'react'
import { Loader2, CheckCircle, AlertCircle, ShieldAlert, Plus, X } from 'lucide-react'
import { usePin } from '../../contexts/PinContext'
import SignatureBlock from '../SignatureBlock'
import api from '../../api/client'

const CATEGORIES = ['Drug', 'Food', 'Environmental', 'Other']

const ALLERGENS = {
  Drug:          ['Penicillin', 'Amoxicillin / Ampicillin', 'Aspirin', 'NSAIDs (Ibuprofen/Diclofenac)', 'Sulfonamides', 'Codeine', 'Morphine / Opioids', 'Metronidazole', 'Contrast Dye / Iodine', 'Latex', 'Metformin', 'Quinolones', 'Cephalosporins', 'Other'],
  Food:          ['Peanuts', 'Tree Nuts', 'Shellfish', 'Fish', 'Milk / Dairy', 'Eggs', 'Wheat / Gluten', 'Soy', 'Sesame', 'Fruits (specify)', 'Other'],
  Environmental: ['Dust Mites', 'Cockroach', 'Pollen / Grass', 'Mold / Fungal spores', 'Pet Dander (Dog)', 'Pet Dander (Cat)', 'Nickel / Metal', 'Cosmetics / Fragrance', 'Insect Sting (Bee/Wasp)', 'Other'],
  Other:         ['Unknown', 'Other'],
}

const REACTIONS = [
  'Rash / Hives', 'Urticaria', 'Angioedema', 'Anaphylaxis',
  'Bronchospasm / Wheeze', 'GI Upset', 'Pruritus', 'Headache',
  'Hypotension', 'Fixed Drug Eruption', 'Stevens-Johnson', 'Other',
]

const SEVERITY = [
  { label: 'Mild',             color: 'bg-green-100 text-green-700 border-green-300',   activeColor: 'bg-green-500 text-white border-green-500'   },
  { label: 'Moderate',         color: 'bg-yellow-100 text-yellow-700 border-yellow-300', activeColor: 'bg-yellow-500 text-white border-yellow-500' },
  { label: 'Severe',           color: 'bg-orange-100 text-orange-700 border-orange-300', activeColor: 'bg-orange-500 text-white border-orange-500' },
  { label: 'Life-threatening', color: 'bg-red-100 text-red-700 border-red-300',          activeColor: 'bg-red-600 text-white border-red-600'       },
]

const ONSET = ['Immediate (<1 hr)', 'Delayed (>1 hr)']

const newEntry = () => ({
  id: Date.now() + Math.random(),
  category: 'Drug',
  allergen: '',
  allergen_other: '',
  reactions: [],
  severity: '',
  onset: '',
})

export default function AllergiesForm({ admission, onClose, onSaved }) {
  const [nka, setNka]   = useState(false)
  const [nkda, setNkda] = useState(false)
  const [entries, setEntries] = useState([newEntry()])
  const [notes, setNotes]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)
  const [done, setDone]       = useState(false)
  const { pin }               = usePin()

  const addEntry  = () => setEntries(p => [...p, newEntry()])
  const removeEntry = (id) => setEntries(p => p.filter(e => e.id !== id))
  const updateEntry = (id, field, val) =>
    setEntries(p => p.map(e => e.id === id ? { ...e, [field]: val } : e))

  const toggleReaction = (id, rxn) =>
    setEntries(p => p.map(e => {
      if (e.id !== id) return e
      const s = new Set(e.reactions)
      s.has(rxn) ? s.delete(rxn) : s.add(rxn)
      return { ...e, reactions: [...s] }
    }))

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      const payload = {
        type: 'allergies',
        no_known_allergies: nka,
        no_known_drug_allergies: nkda,
        entries: entries.map(({ id, ...rest }) => rest),
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
    } finally { setSaving(false) }
  }

  if (done) return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 py-12">
      <CheckCircle size={40} className="text-emerald-500" />
      <p className="font-semibold text-gray-700">Allergies saved</p>
    </div>
  )

  return (
    <div className="flex flex-col h-full">

      {/* Badge */}
      <div className="shrink-0 px-6 pt-4 pb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">
          <ShieldAlert size={12} /> [A] Allergies
        </span>
        <button type="button" onClick={addEntry}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg px-2.5 py-1 hover:bg-blue-50 transition-colors">
          <Plus size={12} /> Add Allergy
        </button>
      </div>

      {/* NKA / NKDA */}
      <div className="shrink-0 px-6 pb-3 flex items-center gap-5 border-b border-gray-100">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input type="checkbox" checked={nka} onChange={e => setNka(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-red-500" />
          No Known Allergies (NKA)
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input type="checkbox" checked={nkda} onChange={e => setNkda(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-red-500" />
          No Known Drug Allergies (NKDA)
        </label>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto px-6 py-3 space-y-3">
        {!nka && entries.map((entry) => {
          const presets = ALLERGENS[entry.category] || []
          return (
            <div key={entry.id} className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm space-y-3">

              {/* Row 1: Category + Allergen + Remove */}
              <div className="flex items-start gap-2 flex-wrap">
                {/* Category pills */}
                <div className="flex gap-1 flex-wrap">
                  {CATEGORIES.map(cat => (
                    <button key={cat} type="button"
                      onClick={() => updateEntry(entry.id, 'category', cat)}
                      className={`px-2.5 py-1 text-xs rounded-lg border font-semibold transition-colors
                        ${entry.category === cat
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Allergen select */}
                <select value={entry.allergen} onChange={e => updateEntry(entry.id, 'allergen', e.target.value)}
                  className="flex-1 min-w-[140px] border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white">
                  <option value="">— Select allergen —</option>
                  {presets.map(a => <option key={a} value={a}>{a}</option>)}
                </select>

                {/* Remove */}
                {entries.length > 1 && (
                  <button type="button" onClick={() => removeEntry(entry.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors mt-0.5">
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Other allergen free text */}
              {(entry.allergen === 'Other' || entry.allergen === 'Fruits (specify)') && (
                <input type="text" value={entry.allergen_other}
                  onChange={e => updateEntry(entry.id, 'allergen_other', e.target.value)}
                  placeholder="Specify allergen..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              )}

              {/* Row 2: Severity + Onset — two columns */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1 font-medium">Severity</p>
                  <div className="flex flex-wrap gap-1">
                    {SEVERITY.map(s => (
                      <button key={s.label} type="button"
                        onClick={() => updateEntry(entry.id, 'severity', entry.severity === s.label ? '' : s.label)}
                        className={`px-2 py-0.5 text-xs rounded border font-semibold transition-colors
                          ${entry.severity === s.label ? s.activeColor : s.color}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1 font-medium">Onset</p>
                  <div className="flex flex-wrap gap-1">
                    {ONSET.map(o => (
                      <button key={o} type="button"
                        onClick={() => updateEntry(entry.id, 'onset', entry.onset === o ? '' : o)}
                        className={`px-2 py-0.5 text-xs rounded border font-semibold transition-colors
                          ${entry.onset === o
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 3: Reactions — 3 columns grid */}
              <div>
                <p className="text-xs text-gray-400 mb-1.5 font-medium">Reaction</p>
                <div className="grid grid-cols-3 gap-1">
                  {REACTIONS.map(rxn => {
                    const active = entry.reactions.includes(rxn)
                    return (
                      <button key={rxn} type="button"
                        onClick={() => toggleReaction(entry.id, rxn)}
                        className={`px-2 py-1 text-xs rounded border font-medium text-left transition-colors
                          ${active
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                        {rxn}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}

        {/* Notes */}
        <div className="pt-1">
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Additional notes..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
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
            className="px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
