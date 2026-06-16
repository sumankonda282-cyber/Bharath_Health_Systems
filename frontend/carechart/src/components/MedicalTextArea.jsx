import { useState, useRef, useEffect, useCallback } from 'react'
import api from '../api/client'

const MIN_CHARS = 3
const DEBOUNCE  = 280
const MAX_ITEMS = 8

function wordAtCursor(text, pos) {
  const before = text.slice(0, pos)
  const m = before.match(/[a-zA-Z]+$/)
  return m ? m[0] : ''
}

function replaceWordAtCursor(text, pos, replacement) {
  const before  = text.slice(0, pos)
  const after   = text.slice(pos)
  const replaced = before.replace(/[a-zA-Z]+$/, replacement)
  const needsSpace = after.length > 0 && after[0] !== ' '
  return replaced + (needsSpace ? ' ' : '') + after
}

export default function MedicalTextArea({
  value, onChange, placeholder, rows = 4, className = '',
  categories = 'symptom,condition,anatomy,exam_finding,procedure',
  ...props
}) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen]               = useState(false)
  const [active, setActive]           = useState(0)
  const timer    = useRef(null)
  const taRef    = useRef(null)
  const listRef  = useRef(null)
  const cursorRef = useRef(0)

  const fetchSuggestions = useCallback(async (word) => {
    try {
      const data = await api.get(
        `/medical-library/terms?q=${encodeURIComponent(word)}&categories=${categories}&limit=${MAX_ITEMS}`
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
    const val = e.target.value
    const pos = e.target.selectionStart
    cursorRef.current = pos
    onChange(e)

    const word = wordAtCursor(val, pos)
    clearTimeout(timer.current)
    if (word.length >= MIN_CHARS) {
      timer.current = setTimeout(() => fetchSuggestions(word), DEBOUNCE)
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
      if (suggestions[active]) {
        e.preventDefault()
        pick(suggestions[active])
      }
    }
    if (e.key === 'Escape') { setOpen(false) }
  }

  const pick = (term) => {
    const pos = cursorRef.current
    const newVal = replaceWordAtCursor(value, pos, term.display)
    const syntheticEvent = { target: { value: newVal } }
    onChange(syntheticEvent)
    setOpen(false)
    setSuggestions([])
    // Restore focus and move cursor after inserted word
    requestAnimationFrame(() => {
      if (taRef.current) {
        const newPos = newVal.indexOf(term.display) + term.display.length + 1
        taRef.current.focus()
        taRef.current.setSelectionRange(newPos, newPos)
      }
    })
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (taRef.current && !taRef.current.contains(e.target) &&
          listRef.current && !listRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative">
      <textarea
        ref={taRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={e => { cursorRef.current = e.target.selectionStart }}
        placeholder={placeholder}
        rows={rows}
        className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none ${className}`}
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
