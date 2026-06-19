/**
 * @shared-pool — standalone clinical assessment, portal-agnostic
 * Clinical Impression / Diagnosis — primary, secondary, differential,
 * ICD-10 searchable from medical_terms + NLM fallback.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { FileSearch, Plus, X, Search } from 'lucide-react'
import api from '../../../api/client'

// ── ICD-10 search with local + NLM fallback ───────────────────────────────────

function useICD10Search() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const timer = useRef(null)

  const search = useCallback(async (q) => {
    clearTimeout(timer.current)
    if (!q || q.length < 3) { setResults([]); return }
    setLoading(true)
    timer.current = setTimeout(async () => {
      try {
        // Local medical_terms first
        const data = await api.get(
          `/terminology/search?q=${encodeURIComponent(q)}&category=condition&limit=12`
        )
        const local = Array.isArray(data) ? data : (data.items || [])
        if (local.length >= 6) { setResults(local); setLoading(false); return }

        // NLM Clinical Tables fallback for ICD-10
        const nlmRes = await fetch(
          `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=${encodeURIComponent(q)}&maxList=10`
        )
        const nlm = await nlmRes.json()
        const nlmItems = (nlm[3] || []).map(([code, name]) => ({ code, display: name, system: 'icd10', source: 'nlm' }))
        setResults([...local, ...nlmItems].slice(0, 12))
      } catch {
        setResults([])
      }
      setLoading(false)
    }, 320)
  }, [])

  return { results, loading, search, clear: () => setResults([]) }
}

// ── Diagnosis search input ────────────────────────────────────────────────────

function DiagSearch({ onSelect, placeholder = 'Search diagnosis / ICD-10…' }) {
  const [query, setQuery] = useState('')
  const [open,  setOpen]  = useState(false)
  const { results, loading, search, clear } = useICD10Search()
  const wrapRef = useRef(null)

  useEffect(() => {
    const close = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const handleChange = (e) => {
    setQuery(e.target.value)
    search(e.target.value)
    setOpen(true)
  }

  const pick = (item) => {
    onSelect(item)
    setQuery('')
    clear()
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={query} onChange={handleChange}
          onFocus={() => results.length && setOpen(true)}
          placeholder={placeholder}
          className="w-full pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          autoComplete="off" />
        {loading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-30 left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto text-sm">
          {results.map((r, i) => (
            <li key={i} onMouseDown={() => pick(r)}
              className="flex items-start gap-2 px-3 py-2.5 cursor-pointer hover:bg-violet-50 border-b border-gray-50 last:border-0">
              {r.code && (
                <span className="shrink-0 mt-0.5 font-mono text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-semibold">
                  {r.code}
                </span>
              )}
              <span className="flex-1 text-gray-800 text-xs leading-snug">{r.display}</span>
              {r.source === 'nlm' && <span className="text-[10px] text-gray-300 shrink-0 mt-0.5">NLM</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CERTAINTY    = ['Confirmed', 'Probable', 'Possible', 'Rule Out']
const SEVERITY     = ['Mild', 'Moderate', 'Severe', 'Critical']
const CHRONICITY   = ['Acute', 'Subacute', 'Chronic', 'Acute-on-Chronic']
const STATUS_OPTS  = ['New', 'Existing — Stable', 'Existing — Worsening', 'Resolved', 'In Remission']

function newDiag(role) {
  return { id: Date.now() + Math.random(), display: '', code: '', role, certainty: '', severity: '', chronicity: '', status: '', notes: '' }
}

// ── Diagnosis card ────────────────────────────────────────────────────────────

function DiagCard({ diag, onChange, onRemove, showRemove, roleColor }) {
  const set = (f, v) => onChange({ ...diag, [f]: v })
  const pill = (opts, field, colors = {}) => (
    <div className="flex flex-wrap gap-1">
      {opts.map(o => (
        <button key={o} type="button" onClick={() => set(field, diag[field] === o ? '' : o)}
          className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all ${
            diag[field] === o
              ? (colors[o] || 'bg-violet-600 text-white border-violet-600')
              : 'bg-white text-gray-500 border-gray-200 hover:border-violet-300'
          }`}>{o}</button>
      ))}
    </div>
  )

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white relative space-y-3">
      {showRemove && (
        <button type="button" onClick={onRemove}
          className="absolute top-3 right-3 text-gray-300 hover:text-red-400"><X size={13} /></button>
      )}

      {/* Diagnosis name / ICD-10 */}
      {diag.display ? (
        <div className={`flex items-start gap-2 px-3 py-2 rounded-lg ${roleColor}`}>
          {diag.code && (
            <span className="font-mono text-xs font-bold shrink-0">{diag.code}</span>
          )}
          <span className="text-sm font-semibold flex-1">{diag.display}</span>
          <button type="button" onClick={() => onChange({ ...diag, display: '', code: '' })}
            className="text-current opacity-50 hover:opacity-100"><X size={12} /></button>
        </div>
      ) : (
        <DiagSearch onSelect={item => onChange({ ...diag, display: item.display, code: item.code || '' })} />
      )}

      {/* Pills row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-gray-400 font-semibold mb-1 uppercase tracking-wide">Certainty</p>
          {pill(CERTAINTY, 'certainty', {
            'Confirmed': 'bg-green-600 text-white border-green-600',
            'Probable':  'bg-blue-500 text-white border-blue-500',
            'Possible':  'bg-yellow-500 text-white border-yellow-500',
            'Rule Out':  'bg-gray-500 text-white border-gray-500',
          })}
        </div>
        <div>
          <p className="text-[10px] text-gray-400 font-semibold mb-1 uppercase tracking-wide">Severity</p>
          {pill(SEVERITY, 'severity', {
            'Mild':     'bg-yellow-400 text-white border-yellow-400',
            'Moderate': 'bg-orange-500 text-white border-orange-500',
            'Severe':   'bg-red-500 text-white border-red-500',
            'Critical': 'bg-red-800 text-white border-red-800',
          })}
        </div>
        <div>
          <p className="text-[10px] text-gray-400 font-semibold mb-1 uppercase tracking-wide">Chronicity</p>
          {pill(CHRONICITY, 'chronicity')}
        </div>
        <div>
          <p className="text-[10px] text-gray-400 font-semibold mb-1 uppercase tracking-wide">Status</p>
          {pill(STATUS_OPTS, 'status')}
        </div>
      </div>

      <div>
        <p className="text-[10px] text-gray-400 font-semibold mb-1 uppercase tracking-wide">Notes</p>
        <input type="text" value={diag.notes} onChange={e => set('notes', e.target.value)}
          placeholder="Additional notes…"
          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-400" />
      </div>
    </div>
  )
}

// ── Main form ─────────────────────────────────────────────────────────────────

export default function ClinicalImpressionForm({ admission, onClose, onSaved }) {
  const [primary,       setPrimary]      = useState([newDiag('primary')])
  const [secondary,     setSecondary]    = useState([])
  const [differential,  setDifferential] = useState([])
  const [clinicalNote,  setClinicalNote] = useState('')
  const [saving,  setSaving] = useState(false)
  const [error,   setError]  = useState('')

  const updateList = (list, setter, id, val) =>
    setter(list.map(d => d.id === id ? val : d))
  const removeFrom = (list, setter, id) =>
    setter(list.filter(d => d.id !== id))

  const handleSave = async () => {
    const hasAny = primary.some(d => d.display) || secondary.some(d => d.display) || differential.some(d => d.display)
    if (!hasAny) { setError('Add at least one diagnosis.'); return }
    setSaving(true); setError('')
    const clean = (list) => list.filter(d => d.display).map(({ id, ...rest }) => rest)
    const payload = {
      type: 'clinical_impression',
      primary_diagnoses:      clean(primary),
      secondary_diagnoses:    clean(secondary),
      differential_diagnoses: clean(differential),
      clinical_note: clinicalNote,
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

  const Section = ({ title, list, setter, roleColor, badge }) => (
    <section>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-700">{title}</h3>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge}`}>{list.filter(d => d.display).length}</span>
        </div>
        <button type="button"
          onClick={() => setter(p => [...p, newDiag(title.toLowerCase().split(' ')[0])])}
          className="flex items-center gap-1 text-xs font-medium text-violet-600 border border-violet-200 px-2 py-0.5 rounded-lg hover:bg-violet-50">
          <Plus size={11} /> Add
        </button>
      </div>
      <div className="space-y-3">
        {list.map(d => (
          <DiagCard key={d.id} diag={d} roleColor={roleColor}
            onChange={val => updateList(list, setter, d.id, val)}
            onRemove={() => removeFrom(list, setter, d.id)}
            showRemove={list.length > (title.includes('Primary') ? 1 : 0)} />
        ))}
        {list.length === 0 && (
          <div className="text-xs text-gray-400 text-center py-3 border border-dashed border-gray-200 rounded-xl">
            Click + Add to include {title.toLowerCase()}
          </div>
        )}
      </div>
    </section>
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* Badge */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-violet-100 rounded-lg">
            <FileSearch size={16} className="text-violet-600" />
          </div>
          <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">[A] Clinical Impression</span>
        </div>

        <Section title="Primary Diagnosis" list={primary} setter={setPrimary}
          roleColor="bg-violet-50 text-violet-800 border border-violet-200"
          badge="bg-violet-100 text-violet-700" />

        <Section title="Secondary Diagnoses" list={secondary} setter={setSecondary}
          roleColor="bg-blue-50 text-blue-800 border border-blue-200"
          badge="bg-blue-100 text-blue-700" />

        <Section title="Differential Diagnoses" list={differential} setter={setDifferential}
          roleColor="bg-gray-100 text-gray-700 border border-gray-200"
          badge="bg-gray-100 text-gray-500" />

        {/* Clinical reasoning note */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-1.5">Clinical Reasoning / Summary</h3>
          <textarea rows={3} value={clinicalNote} onChange={e => setClinicalNote(e.target.value)}
            placeholder="Brief reasoning supporting the impression…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none" />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4 flex justify-end gap-3">
        <button type="button" onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button type="button" onClick={handleSave} disabled={saving}
          className="px-5 py-2 text-sm font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
