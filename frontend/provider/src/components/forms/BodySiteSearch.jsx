import { useState, useEffect, useRef } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import api from '../../api/client'
export default function BodySiteSearch({ value, onChange, placeholder = 'Search body site…', category = 'anatomy' }) {
  const [q, setQ] = useState(''); const [results, setResults] = useState([])
  const [open, setOpen] = useState(false); const [loading, setLoading] = useState(false)
  const timer = useRef(null)
  const selected = value && typeof value === 'object' ? value.display : value
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (q.trim().length < 2) { setResults([]); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      try { const data = await api.get('/terminology/search', { params: { q: q.trim(), category, limit: 10 } }); setResults(Array.isArray(data) ? data : []); setOpen(true) }
      catch { setResults([]) } finally { setLoading(false) }
    }, 250)
    return () => timer.current && clearTimeout(timer.current)
  }, [q, category])
  if (selected) return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">{selected}
        <button type="button" onClick={() => { onChange(''); setQ('') }} className="text-blue-400 hover:text-blue-700"><X size={13} /></button>
      </span>
    </div>
  )
  return (
    <div className="relative">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-300" />}
      <input className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder={placeholder} value={q} onChange={e => setQ(e.target.value)} onFocus={() => results.length && setOpen(true)} />
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {results.map(t => (
            <button type="button" key={t.id} onClick={() => { onChange(t.display); setQ(''); setResults([]); setOpen(false) }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between">
              <span>{t.display}</span>{t.code && <span className="text-xs text-gray-400">{t.code}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
