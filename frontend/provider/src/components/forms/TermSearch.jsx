import { useState, useEffect, useRef } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import api from '../../api/client'

// One type-ahead for every "search" field the Form Builder can add. Each field
// type maps to the real lookup endpoint it should hit. The chosen DISPLAY string
// is stored as the value (consistent with every downstream consumer — validation,
// iView flowsheet, submission view, FHIR/ABDM export).
export const SEARCH_TYPES = {
  body_site_search:  { url: '/terminology/search',       params: q => ({ q, category: 'anatomy',   limit: 10 }), label: r => r.display,            sub: r => r.code,                          ph: 'Search body site…' },
  diagnosis_search:  { url: '/terminology/search',       params: q => ({ q, category: 'condition', limit: 10 }), label: r => r.display,            sub: r => r.code,                          ph: 'Search diagnosis / ICD-10…' },
  allergy_search:    { url: '/terminology/search',       params: q => ({ q, category: 'allergy',   limit: 10 }), label: r => r.display,            sub: r => r.code,                          ph: 'Search allergy / allergen…' },
  procedure_search:  { url: '/terminology/search',       params: q => ({ q, category: 'procedure', limit: 10 }), label: r => r.display,            sub: r => r.code,                          ph: 'Search procedure…' },
  medication_search: { url: '/terminology/drugs/search', params: q => ({ q, limit: 10 }),                        label: r => r.generic || r.name,  sub: r => r.primary_brand || r.drug_class, ph: 'Search medication / drug…' },
  lab_test_search:   { url: '/lab/tests/search',         params: q => ({ q, type: 'lab' }),                      label: r => r.name,               sub: r => r.code,                          ph: 'Search lab test…' },
  patient_search:    { url: '/patients/',                params: q => ({ search: q, limit: 10 }),                label: r => r.full_name,          sub: r => r.bh_id || r.clinic_patient_id,  ph: 'Search patient by name / BH-ID…' },
  // staff has no server-side q param → fetch the clinic directory once, filter locally.
  staff_search:      { url: '/chat/contacts',            params: () => ({}),                                     label: r => r.full_name || r.name, sub: r => r.role,                         ph: 'Search staff…', clientFilter: true },
}

export default function TermSearch({ type = 'body_site_search', value, onChange, placeholder }) {
  const cfg = SEARCH_TYPES[type] || SEARCH_TYPES.body_site_search
  const [q, setQ]             = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const cacheRef = useRef(null)   // clientFilter types (staff): directory fetched once
  const timer    = useRef(null)
  const selected = value && typeof value === 'object' ? value.display : value

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    const term = q.trim()
    if (term.length < 2) { setResults([]); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        let data
        if (cfg.clientFilter) {
          if (!cacheRef.current) {
            const all = await api.get(cfg.url)
            cacheRef.current = Array.isArray(all) ? all : (all?.items || [])
          }
          const lc = term.toLowerCase()
          data = cacheRef.current.filter(r => (cfg.label(r) || '').toLowerCase().includes(lc)).slice(0, 12)
        } else {
          const res = await api.get(cfg.url, { params: cfg.params(term) })
          data = Array.isArray(res) ? res : (res?.items || [])
        }
        setResults(data); setOpen(true)
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 250)
    return () => timer.current && clearTimeout(timer.current)
  }, [q, type])  // eslint-disable-line react-hooks/exhaustive-deps

  if (selected) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
          {selected}
          <button type="button" onClick={() => { onChange(''); setQ('') }} className="text-blue-400 hover:text-blue-700"><X size={13} /></button>
        </span>
      </div>
    )
  }

  return (
    <div className="relative">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-300" />}
      <input
        className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        placeholder={placeholder || cfg.ph}
        value={q}
        onChange={e => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
      />
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {results.map((r, i) => {
            const lbl = cfg.label(r)
            const sub = cfg.sub(r)
            return (
              <button
                type="button"
                key={r.id ?? r.staff_id ?? i}
                onClick={() => { onChange(lbl); setQ(''); setResults([]); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between gap-2"
              >
                <span className="truncate">{lbl}</span>
                {sub && <span className="text-xs text-gray-400 shrink-0">{sub}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
