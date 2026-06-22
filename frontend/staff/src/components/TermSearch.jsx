import { useState, useEffect, useRef } from 'react'
import { Search, Loader2 } from 'lucide-react'
import api from '../api/client'

/**
 * Google-style autocomplete over the medical terminology library.
 * Reusable for diseases, symptoms and allergens — pass `category`.
 * onSelect receives the full term object {code, display, system, ...}.
 */
export default function TermSearch({
  category,
  specialty,
  placeholder = 'Search…',
  onSelect,
  allowFreeText = false,
  className = '',
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef(null)
  const timer = useRef(null)

  useEffect(() => {
    const close = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (q.trim().length < 2) { setResults([]); setOpen(false); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const params = { q: q.trim(), limit: 10 }
        if (category) params.category = category
        if (specialty) params.specialty = specialty
        const data = await api.get('/terminology/search', { params })
        setResults(Array.isArray(data) ? data : [])
        setOpen(true)
      } catch { setResults([]) }
      setLoading(false)
    }, 250)
    return () => timer.current && clearTimeout(timer.current)
  }, [q, category, specialty])

  const pick = (term) => {
    onSelect?.(term)
    setQ('')
    setResults([])
    setOpen(false)
  }

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        {loading && <Loader2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Enter' && allowFreeText && q.trim()) {
              e.preventDefault()
              pick({ code: null, display: q.trim(), system: 'custom', free_text: true })
            }
          }}
          placeholder={placeholder}
          className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
        />
      </div>
      {open && (results.length > 0 || (allowFreeText && q.trim().length >= 2)) && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto">
          {results.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => pick(t)}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between gap-2"
            >
              <span className="text-sm text-gray-800">{t.display}</span>
              {t.code && <span className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded shrink-0">{t.code}</span>}
            </button>
          ))}
          {allowFreeText && q.trim().length >= 2 && (
            <button
              type="button"
              onClick={() => pick({ code: null, display: q.trim(), system: 'custom', free_text: true })}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm text-gray-500 border-t border-gray-100"
            >
              Add "{q.trim()}" as free text
            </button>
          )}
        </div>
      )}
    </div>
  )
}
