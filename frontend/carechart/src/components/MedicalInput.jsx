import { useState, useRef, useEffect, useCallback } from 'react'
import api from '../api/client'

const MIN_CHARS = 3
const DEBOUNCE  = 280
const MAX_ITEMS = 8

export default function MedicalInput({
  value, onChange, placeholder, className = '',
  categories = 'symptom,condition,anatomy,exam_finding,procedure',
  onSelect,
  ...props
}) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen]               = useState(false)
  const [active, setActive]           = useState(0)
  const timer   = useRef(null)
  const inputRef = useRef(null)
  const listRef  = useRef(null)

  const fetchSuggestions = useCallback(async (q) => {
    try {
      const data = await api.get(
        `/medical-library/terms?q=${encodeURIComponent(q)}&categories=${categories}&limit=${MAX_ITEMS}`
      )
      const list = Array.isArray(data) ? data : (data.items || [])
      setSuggestions(list)
      setOpen(list.length > 0)
      setActive(0)
    } catch {
      setSuggestions([])
      setOpen(false)
    }
  }, [categories])

  const handleChange = (e) => {
    onChange(e)
    const q = e.target.value.trim()
    clearTimeout(timer.current)
    if (q.length >= MIN_CHARS) {
      timer.current = setTimeout(() => fetchSuggestions(q), DEBOUNCE)
    } else {
      setSuggestions([])
      setOpen(false)
    }
  }

  const handleKeyDown = (e) => {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (suggestions[active]) { e.preventDefault(); pick(suggestions[active]) }
    }
    if (e.key === 'Escape') setOpen(false)
  }

  const pick = (term) => {
    onChange({ target: { value: term.display } })
    onSelect?.(term)
    setOpen(false)
    setSuggestions([])
    inputRef.current?.focus()
  }

  useEffect(() => {
    const handler = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target) &&
          listRef.current && !listRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${className}`}
        autoComplete="off"
        {...props}
      />
      {open && (
        <ul
          ref={listRef}
          className="absolute z-30 left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto text-sm"
        >
          {suggestions.map((s, i) => (
            <li
              key={i}
              onMouseDown={() => pick(s)}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-gray-50 last:border-0 ${
                i === active ? 'bg-blue-50 text-blue-800' : 'hover:bg-gray-50'
              }`}
            >
              <span className="font-medium flex-1">{s.display}</span>
              {s.category && (
                <span className="text-xs text-gray-400 shrink-0">{s.category}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
