import { useState, useEffect, useRef } from 'react'
import { Search, Loader2, X, CalendarPlus, User } from 'lucide-react'
import api from '../../api/client'

export default function PatientLookupPopup({ open, onClose, onBookFor }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const timer = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) { setQ(''); setResults([]); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (q.trim().length < 2) { setResults([]); return }
    timer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const r = await api.get('/patients', { params: { search: q.trim(), limit: 10 } })
        setResults(Array.isArray(r) ? r : [])
      } catch { setResults([]) }
      setSearching(false)
    }, 300)
    return () => timer.current && clearTimeout(timer.current)
  }, [q])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-24 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search size={16} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search patient by name, BHID, or mobile…"
            className="flex-1 text-sm outline-none text-gray-800 placeholder-gray-400"
          />
          {searching
            ? <Loader2 size={15} className="text-gray-400 animate-spin flex-shrink-0" />
            : q && <button onClick={() => setQ('')}><X size={15} className="text-gray-400 hover:text-gray-600" /></button>
          }
          <button onClick={onClose} className="ml-1 p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {q.trim().length >= 2 && !searching && results.length === 0 && (
            <p className="px-5 py-6 text-sm text-gray-400 text-center">No patient found for "{q}"</p>
          )}
          {!q.trim() && (
            <p className="px-5 py-6 text-sm text-gray-400 text-center">Type at least 2 characters to search</p>
          )}
          {results.map(p => (
            <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-blue-50 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <User size={14} className="text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{p.full_name}</p>
                  <p className="text-xs text-gray-400">
                    {p.bh_id || p.clinic_patient_id}
                    {p.mobile && ` · ${p.mobile}`}
                    {p.age != null && ` · ${p.age}y`}
                    {p.gender && ` ${p.gender.charAt(0).toUpperCase()}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { onBookFor(p); onClose() }}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition"
              >
                <CalendarPlus size={12} /> Book
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
