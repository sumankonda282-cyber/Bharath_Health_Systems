import { useState, useRef, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import diagnoses from '../data/diagnoses'

/**
 * DiagnosisInput
 *
 * Props:
 *   value       - string  (free-text assessment notes)
 *   onChange    - fn(notes: string, selected: Array<{label, icd}>)
 *   placeholder - string
 *   className   - string
 *
 * The component manages its own `selected` list internally and calls
 * onChange whenever either the textarea text or selected diagnoses change.
 * ICD codes are stored but never rendered to the doctor.
 */
export default function DiagnosisInput({ value = '', onChange, placeholder = 'Enter additional clinical notes…', className = '' }) {
  const [selected, setSelected] = useState([])
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [open, setOpen] = useState(false)

  const inputRef = useRef(null)
  const dropdownRef = useRef(null)
  const containerRef = useRef(null)

  // Filter diagnoses: startsWith first, then contains, deduplicated against selected
  const filterDiagnoses = useCallback((q) => {
    if (!q || q.length < 2) return []
    const lower = q.toLowerCase()
    const selectedLabels = new Set(selected.map(s => s.label))
    const starts = []
    const contains = []
    for (const d of diagnoses) {
      if (selectedLabels.has(d.label)) continue
      const labelLower = d.label.toLowerCase()
      if (labelLower.startsWith(lower)) {
        starts.push(d)
      } else if (labelLower.includes(lower)) {
        contains.push(d)
      }
    }
    return [...starts, ...contains].slice(0, 10)
  }, [selected])

  useEffect(() => {
    const results = filterDiagnoses(query)
    setSuggestions(results)
    setActiveIndex(-1)
    setOpen(results.length > 0)
  }, [query, filterDiagnoses])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectDiagnosis = (diagnosis) => {
    const next = [...selected, diagnosis]
    setSelected(next)
    setQuery('')
    setSuggestions([])
    setOpen(false)
    setActiveIndex(-1)
    onChange?.(value, next)
    // Return focus to the search input for rapid entry
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const removeDiagnosis = (label) => {
    const next = selected.filter(s => s.label !== label)
    setSelected(next)
    onChange?.(value, next)
  }

  const handleTextareaChange = (e) => {
    onChange?.(e.target.value, selected)
  }

  const handleKeyDown = (e) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        selectDiagnosis(suggestions[activeIndex])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && dropdownRef.current) {
      const item = dropdownRef.current.querySelector(`[data-index="${activeIndex}"]`)
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  return (
    <div className={className}>
      {/* Selected diagnosis chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((d) => (
            <span
              key={d.label}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
            >
              {d.label}
              <button
                type="button"
                onClick={() => removeDiagnosis(d.label)}
                className="ml-0.5 hover:text-blue-900 transition-colors"
                aria-label={`Remove ${d.label}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Typeahead search */}
      <div className="relative mb-3" ref={containerRef}>
        <label className="label text-xs text-gray-500 mb-1 block">Add Diagnosis</label>
        <input
          ref={inputRef}
          type="text"
          className="input text-sm"
          placeholder="Type to search diagnosis (e.g. viral fever, hypertension…)"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
          autoComplete="off"
        />

        {open && suggestions.length > 0 && (
          <ul
            ref={dropdownRef}
            className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto"
            role="listbox"
          >
            {suggestions.map((d, i) => (
              <li
                key={d.label + d.icd}
                data-index={i}
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={(e) => {
                  e.preventDefault() // prevent blur before click registers
                  selectDiagnosis(d)
                }}
                className={`px-3 py-2 cursor-pointer text-sm transition-colors ${
                  i === activeIndex
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-800 hover:bg-gray-50'
                }`}
              >
                {d.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Free-text clinical notes textarea */}
      <textarea
        className="input resize-none"
        rows={3}
        value={value}
        onChange={handleTextareaChange}
        placeholder={placeholder}
      />
    </div>
  )
}
