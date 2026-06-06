import { useState, useEffect, useRef } from 'react'

export default function SearchDropdown({ value, onChange, onSelect, fetchSuggestions, placeholder, className = '' }) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!value || value.length < 1) { setSuggestions([]); setOpen(false); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await fetchSuggestions(value)
        setSuggestions(results || [])
        setOpen((results || []).length > 0)
        setActive(-1)
      } catch { setSuggestions([]) }
      finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [value])

  useEffect(() => {
    const handleClick = (e) => { if (!containerRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleKey = (e) => {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(suggestions[active]) }
    if (e.key === 'Escape') setOpen(false)
  }

  const pick = (item) => {
    onSelect(item)
    setOpen(false)
    setSuggestions([])
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        className={`input text-sm ${className}`}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKey}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {suggestions.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={() => pick(item)}
              className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 text-sm transition-colors ${active === idx ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              <div>
                <span className="font-medium text-gray-900">{item.name}</span>
                {item.generic_name && <span className="text-gray-400 ml-1 text-xs">({item.generic_name})</span>}
                {item.strength && <span className="text-gray-400 ml-1 text-xs">{item.strength}</span>}
                {item.code && <span className="text-gray-400 ml-1 text-xs">· {item.code}</span>}
                {item.category && <span className="text-gray-400 ml-1 text-xs">· {item.category}</span>}
              </div>
              {item.in_stock && (
                <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">In Stock</span>
              )}
              {item.available && !item.in_stock && (
                <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Available</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
