import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import api from '../api/client'

export default function ClinicalSearch({
  type = 'condition',
  value = '',
  onChange,
  onSelect,
  placeholder,
  className = '',
  disabled = false,
  inputClass = '',
}) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => { setQuery(value) }, [value])

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const search = useCallback((q) => {
    if (!q || q.length < 2) { setResults([]); setOpen(false); return }
    setLoading(true)
    const endpoint = type === 'drug'
      ? `/terminology/drugs/search?q=${encodeURIComponent(q)}&limit=8`
      : `/terminology/search?q=${encodeURIComponent(q)}&type=${type}&limit=8`
    api.get(endpoint)
      .then(d => {
        const items = Array.isArray(d) ? d : (d.items || d.results || [])
        setResults(items)
        setOpen(items.length > 0)
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [type])

  const handleChange = (e) => {
    const q = e.target.value
    setQuery(q)
    onChange?.(q)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 280)
  }

  const handleSelect = (item) => {
    const label = type === 'drug'
      ? (item.generic_name || item.generic || item.name || '')
      : (item.name || item.term || item.label || '')
    setQuery(label)
    onChange?.(label)
    onSelect?.(item)
    setOpen(false)
    setResults([])
  }

  const handleClear = () => {
    setQuery('')
    onChange?.('')
    setResults([])
    setOpen(false)
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          className={`input pl-8 pr-8 ${inputClass}`}
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
        />
        {loading && <Loader2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
        {!loading && query && (
          <button onClick={handleClear} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={13} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">No results</div>
          ) : results.map((item, i) => {
            const label = type === 'drug'
              ? (item.generic_name || item.generic || item.name || '')
              : (item.name || item.term || item.label || '')
            const sub = type === 'drug'
              ? (item.drug_class || item.category || '')
              : (item.icd10 || item.code || '')
            return (
              <button key={i} onMouseDown={() => handleSelect(item)}
                className="w-full text-left px-3 py-2 hover:bg-emerald-50 border-b border-gray-50 last:border-0">
                <div className="text-sm text-gray-800">{label}</div>
                {sub && <div className="text-xs text-gray-400">{sub}</div>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
