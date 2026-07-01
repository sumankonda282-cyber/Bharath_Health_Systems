import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Type, AlignLeft, Hash, Calendar, Clock, CalendarClock, CircleDot,
  CheckSquare, ChevronDown, Star, Calculator, Stethoscope, FlaskConical,
  Table, User, Minus, FileText, RefreshCw, PenLine, Camera, Paperclip,
  Clipboard, Eye, Bell, X, ChevronUp, ChevronRight, Plus, Lock, EyeOff,
  Search, Users, Pill, BookOpen, AlertTriangle, Scissors,
  ToggleLeft, BarChart2, LayoutGrid, Sliders, Activity, Layers, Ban, Columns, MapPin,
} from 'lucide-react'
import api from '../../api/client'
import { gridColsOf } from '@shared/forms/gridLayout'

// ─── Field type icon map ──────────────────────────────────────────────────────

function getFieldTypeIcon(type, size = 16) {
  const props = { size, className: 'text-dim flex-shrink-0' }
  const map = {
    text:              <Type {...props} />,
    textarea:          <AlignLeft {...props} />,
    number:            <Hash {...props} />,
    date:              <Calendar {...props} />,
    time:              <Clock {...props} />,
    datetime:          <CalendarClock {...props} />,
    radio:             <CircleDot {...props} />,
    checkbox:          <CheckSquare {...props} />,
    dropdown:          <ChevronDown {...props} />,
    yes_no:            <ToggleLeft {...props} />,
    scale:             <Star {...props} />,
    matrix:            <LayoutGrid {...props} />,
    numeric_range:     <Sliders {...props} />,
    calculated:        <Calculator {...props} />,
    score_display:     <BarChart2 {...props} />,
    vital_auto:        <Activity {...props} />,
    patient_search:    <Search {...props} />,
    staff_search:      <Users {...props} />,
    medication_search: <Pill {...props} />,
    diagnosis_search:  <BookOpen {...props} />,
    allergy_search:    <AlertTriangle {...props} />,
    procedure_search:  <Scissors {...props} />,
    lab_test_search:   <FlaskConical {...props} />,
    body_site_search:  <MapPin {...props} />,
    snomed:            <Stethoscope {...props} />,
    loinc:             <FlaskConical {...props} />,
    table:             <Table {...props} />,
    body_map:          <User {...props} />,
    label:             <Type {...props} />,
    divider:           <Minus {...props} />,
    rich_text:         <FileText {...props} />,
    repeating:         <RefreshCw {...props} />,
    stage_break:       <Layers {...props} />,
    signature:         <PenLine {...props} />,
    photo:             <Camera {...props} />,
    file:              <Paperclip {...props} />,
  }
  return map[type] || <Type {...props} />
}

// ─── UI Primitives ────────────────────────────────────────────────────────────

function Toggle({ value, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        role="switch"
        aria-checked={value}
        className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-[#F5821E]' : 'surface-3'}`}
        onClick={() => onChange(!value)}
      >
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
      {label && <span className="text-sm text-dim">{label}</span>}
    </label>
  )
}

function PropRow({ label, children, hint }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-dim mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
    </div>
  )
}

const inputCls =
  'w-full surface-2 border border-app rounded-lg px-3 py-1.5 text-sm text-app focus:outline-none focus:border-[#F5821E] transition-colors'

const selectCls =
  'w-full surface-2 border border-app rounded-lg px-3 py-1.5 text-sm text-app focus:outline-none focus:border-[#F5821E] transition-colors appearance-none'

const textareaCls =
  'w-full surface-2 border border-app rounded-lg px-3 py-1.5 text-sm text-app focus:outline-none focus:border-[#F5821E] transition-colors resize-none'

function BtnGroup({ options, value, onChange }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map(opt => {
        const v = opt.value !== undefined ? opt.value : opt
        const l = opt.label !== undefined ? opt.label : opt
        return (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={[
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
              v === value
                ? 'bg-[#F5821E] text-app'
                : 'surface-3 text-dim hover-app hover:text-app',
            ].join(' ')}
          >
            {l}
          </button>
        )
      })}
    </div>
  )
}

const COLOR_PALETTE = ['#0F2557','#CC1414','#F5821E','#16A34A','#7C3AED','#0891B2','#D97706','#DB2777','#0D9488','#475569']
function ColorField({ value, onChange, label }) {
  return (
    <PropRow label={label}>
      <div className="flex items-center gap-1.5 flex-wrap">
        {COLOR_PALETTE.map(c => (
          <button key={c} type="button" onClick={() => onChange(c)}
            className={`w-5 h-5 rounded-full border ${value===c?'ring-2 ring-offset-1 ring-gray-400':''}`}
            style={{ background: c, borderColor: '#e5e7eb' }} title={c} />
        ))}
        <input type="color" value={value || '#0F2557'} onChange={e => onChange(e.target.value)} className="w-6 h-6 rounded cursor-pointer border border-gray-200 p-0" />
        {value && <button type="button" onClick={() => onChange('')} className="text-xs text-dim hover:text-dim">clear</button>}
      </div>
    </PropRow>
  )
}

function SectionHeader({ title }) {
  return (
    <div className="surface-2 px-4 py-2 border-b border-app mb-3">
      <p className="text-xs font-semibold text-dim uppercase tracking-wider">{title}</p>
    </div>
  )
}

function CollapsibleSection({ title, icon: Icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-t border-app mt-4 pt-4">
      <button
        type="button"
        className="flex items-center gap-2 w-full text-left mb-2 group"
        onClick={() => setOpen(v => !v)}
      >
        {Icon && <Icon size={14} className="text-dim flex-shrink-0" />}
        <span className="text-xs font-semibold text-dim uppercase tracking-wider flex-1">{title}</span>
        {open
          ? <ChevronUp size={14} className="text-faint group-hover:text-dim flex-shrink-0" />
          : <ChevronRight size={14} className="text-faint group-hover:text-dim flex-shrink-0" />}
      </button>
      {open && <div>{children}</div>}
    </div>
  )
}

// ─── Column Span Control ──────────────────────────────────────────────────────

// Grid size on the free 12-column CareForm canvas. Drag-resize on the canvas
// updates the same {x,y,w,h}; these inputs let the admin set it precisely.
function GridSizeControl({ layout, onChange, cols = 12 }) {
  const l = layout || { x: 0, y: 0, w: 6, h: 1 }
  const upd = (k, raw) => {
    let v = Math.max(1, Number(raw) || 1)
    if (k === 'w') v = Math.min(v, cols - (l.x || 0))
    if (k === 'x') v = Math.min(Math.max(0, Number(raw) || 0), cols - (l.w || 1))
    onChange({ x: l.x ?? 0, y: l.y ?? 0, w: l.w ?? 6, h: l.h ?? 1, [k]: v })
  }
  const inp = 'w-14 surface-2 border border-app rounded px-2 py-1 text-xs text-app focus:outline-none focus:border-[#F5821E]'
  return (
    <PropRow label="Grid size & position">
      <div className="flex items-center gap-2 flex-wrap">
        <Columns size={13} className="text-faint flex-shrink-0" />
        <input type="number" min={1} max={cols} value={l.w ?? 6} onChange={e => upd('w', e.target.value)} className={inp} title={`Width (1–${cols} columns)`} />
        <span className="text-faint text-xs">×</span>
        <input type="number" min={1} value={l.h ?? 1} onChange={e => upd('h', e.target.value)} className={inp} title="Height (rows)" />
        <span className="text-[10px] text-faint">W×H · {cols}-col</span>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[10px] text-faint w-8">at x/y</span>
        <input type="number" min={0} max={cols - 1} value={l.x ?? 0} onChange={e => upd('x', e.target.value)} className={inp} title="Column position (0-based)" />
        <span className="text-faint text-xs">,</span>
        <input type="number" min={0} value={l.y ?? 0} onChange={e => upd('y', e.target.value)} className={inp} title="Row position (0-based)" />
        <span className="text-[10px] text-faint">arrow keys nudge</span>
      </div>
    </PropRow>
  )
}

// ─── Options Editor ───────────────────────────────────────────────────────────

function OptionsEditor({ options = [], onChange, showScoreWeight = false, showTermSearch = false }) {
  const [termSearchOpen, setTermSearchOpen] = useState(false)
  function onOpenTermSearch() { setTermSearchOpen(true) }
  function handleAddFromTerminology(opt) {
    if (!options.some(o => o.value === opt.value)) onChange([...options, { ...opt, score_weight: 0 }])
    setTermSearchOpen(false)
  }
  function addOption() {
    onChange([...options, {
      label: 'Option ' + (options.length + 1),
      value: 'option_' + (options.length + 1),
      score_weight: 0,
    }])
  }
  function removeOption(i) { onChange(options.filter((_, idx) => idx !== i)) }
  function updateOption(i, key, val) {
    onChange(options.map((opt, idx) => {
      if (idx !== i) return opt
      const updated = { ...opt, [key]: val }
      if (key === 'label') {
        updated.value = val.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/, '').slice(0, 30) || `option_${i}`
      }
      return updated
    }))
  }
  function moveUp(i) {
    if (i === 0) return
    const next = [...options]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; onChange(next)
  }
  function moveDown(i) {
    if (i === options.length - 1) return
    const next = [...options]; [next[i], next[i + 1]] = [next[i + 1], next[i]]; onChange(next)
  }

  return (
    <div>
      {showScoreWeight && (
        <div className="flex items-center gap-1 mb-1 text-xs text-faint px-1">
          <span className="flex-1">Label</span>
          <span className="w-24">Value (ID)</span>
          <span className="w-12 text-center">Score</span>
          <span className="w-5" />
        </div>
      )}
      <div className="space-y-1.5 mb-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="flex flex-col">
              <button type="button" onClick={() => moveUp(i)} className="text-faint hover:text-dim leading-none py-0.5"><ChevronUp size={10} /></button>
              <button type="button" onClick={() => moveDown(i)} className="text-faint hover:text-dim leading-none py-0.5"><ChevronDown size={10} /></button>
            </div>
            <input
              className={inputCls + ' flex-1 text-xs'}
              value={opt.label}
              onChange={e => updateOption(i, 'label', e.target.value)}
              placeholder="Label"
            />
            <input
              className="w-24 surface-2 border border-app rounded-lg px-2 py-1.5 text-xs text-dim font-mono focus:outline-none focus:border-[#F5821E]"
              value={opt.value}
              onChange={e => updateOption(i, 'value', e.target.value)}
              placeholder="value"
            />
            {opt.code && (
              <span
                className="text-[9px] font-mono px-1 py-0.5 rounded bg-blue-900/40 text-blue-300 flex-shrink-0"
                title={`Coded: ${opt.system || 'SNOMED'} ${opt.code}`}
              >
                {(opt.system || 'CODE').slice(0, 6)} {opt.code}
              </span>
            )}
            {showScoreWeight && (
              <input
                type="number"
                title="Score weight for this option"
                className="w-12 surface-2 border border-app rounded-lg px-1.5 py-1.5 text-xs text-blue-300 font-mono focus:outline-none focus:border-[#F5821E] text-center"
                value={opt.score_weight ?? 0}
                onChange={e => updateOption(i, 'score_weight', Number(e.target.value))}
              />
            )}
            <button type="button" onClick={() => removeOption(i)} className="text-faint hover:text-red-400 transition-colors flex-shrink-0">
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={addOption}
          className="flex items-center gap-1 text-xs text-[#F5821E] hover:text-orange-300 transition-colors"
        >
          <Plus size={12} /> Add Option
        </button>
        {showTermSearch && (
          <button
            type="button"
            onClick={onOpenTermSearch}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Search size={11} /> Search Terminology
          </button>
        )}
      </div>
      {showScoreWeight && (
        <p className="text-xs text-faint mt-1.5">Score column sets per-option weight for clinical scoring.</p>
      )}
      {termSearchOpen && (
        <TerminologySearchModal onAdd={handleAddFromTerminology} onClose={() => setTermSearchOpen(false)} />
      )}
    </div>
  )
}

// ─── Terminology Search for Dropdown Options ──────────────────────────────────

function TerminologySearchModal({ onAdd, onClose }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef(null)

  const search = useCallback((query) => {
    if (!query.trim()) { setResults([]); return }
    setLoading(true)
    api.get('/terminology/search', { params: { q: query, limit: 30 } })
      .then(r => setResults(Array.isArray(r) ? r : (r?.results || [])))
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(q), 300)
    return () => clearTimeout(timerRef.current)
  }, [q, search])

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[480px] max-h-[80vh] surface border border-app rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-app">
          <Search size={14} className="text-dim flex-shrink-0" />
          <input
            autoFocus
            className="flex-1 bg-transparent text-sm text-app placeholder-gray-500 focus:outline-none"
            placeholder="Search symptoms, findings, procedures, anatomy…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <button onClick={onClose} className="text-faint hover:text-app transition-colors"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading && <p className="text-xs text-faint text-center py-4">Searching…</p>}
          {!loading && results.length === 0 && q.trim() && (
            <p className="text-xs text-faint text-center py-4">No results for "{q}"</p>
          )}
          {!loading && results.length === 0 && !q.trim() && (
            <p className="text-xs text-faint text-center py-6">Type to search the medical terminology library.</p>
          )}
          {results.map((r, i) => {
            const label = r.term || r.name || r.label || String(r)
            // Keep a readable slug as the option value (chart stays human-readable),
            // but ATTACH the real terminology code + system to the option so the
            // answer is FHIR/ABDM-exportable (exporter maps value→option.code). No
            // longer discards r.code as the old slug-only path did.
            const code = r.code || null
            const system = r.system || r.code_system || (code ? 'SNOMED' : null)
            const val = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40)
            const cat = r.category || r.type || ''
            return (
              <button
                key={i}
                onClick={() => onAdd(code
                  ? { label, value: val, code, system }
                  : { label, value: val })}
                className="w-full text-left px-3 py-2 rounded-lg hover:surface-2 group transition-colors"
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-app group-hover:text-app flex-1">{label}</span>
                  {cat && <span className="text-[10px] text-faint flex-shrink-0">{cat}</span>}
                </div>
                {r.code && <span className="text-[10px] font-mono text-blue-500">{r.code}</span>}
              </button>
            )
          })}
        </div>
        <div className="px-4 py-2 border-t border-app text-[10px] text-faint">
          Powered by BHS medical terms · click a result to add it as an option
        </div>
      </div>
    </div>
  )
}

// ─── Cascade Config ───────────────────────────────────────────────────────────

function CascadeConfig({ field, allFields, set }) {
  const parentCandidates = allFields.filter(
    ({ field: f }) => ['radio', 'dropdown', 'yes_no'].includes(f.type) && f.id !== field.id
  )
  const parentField = parentCandidates.find(({ field: f }) => f.field_id === field.cascade_parent)?.field
  const parentOpts = parentField?.options || []

  const cascadeMap = field.cascade_map || {}

  function setCascadeMap(newMap) { set('cascade_map', newMap) }

  if (parentCandidates.length === 0) {
    return <p className="text-xs text-faint italic">Add a parent radio / dropdown field first to configure cascading.</p>
  }

  return (
    <div className="space-y-3">
      <PropRow label="Cascade Parent Field">
        <select
          className={selectCls + ' text-xs'}
          value={field.cascade_parent || ''}
          onChange={e => set('cascade_parent', e.target.value)}
        >
          <option value="">— none (independent) —</option>
          {parentCandidates.map(({ field: f }) => (
            <option key={f.id} value={f.field_id}>{f.label}</option>
          ))}
        </select>
      </PropRow>
      {field.cascade_parent && parentOpts.length > 0 && (
        <div>
          <p className="text-xs text-dim font-medium mb-2">Options visible when parent equals…</p>
          <div className="space-y-2">
            {parentOpts.map(pOpt => {
              const visibleVals = (cascadeMap[pOpt.value] || [])
              return (
                <div key={pOpt.value} className="surface border border-app rounded-lg p-2">
                  <p className="text-xs text-yellow-400 font-medium mb-1.5">{pOpt.label}</p>
                  <div className="space-y-1">
                    {(field.options || []).map(opt => {
                      const checked = visibleVals.includes(opt.value)
                      return (
                        <label key={opt.value} className="flex items-center gap-2 text-xs text-dim cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            className="accent-[#F5821E]"
                            onChange={() => {
                              const next = checked
                                ? visibleVals.filter(v => v !== opt.value)
                                : [...visibleVals, opt.value]
                              setCascadeMap({ ...cascadeMap, [pOpt.value]: next })
                            }}
                          />
                          {opt.label}
                        </label>
                      )
                    })}
                    {(field.options || []).length === 0 && (
                      <p className="text-xs text-faint italic">Add options above first.</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Alert Rules Editor (universal) ──────────────────────────────────────────

const SEVERITY_BG = {
  critical: 'bg-red-900/30 border-red-700/50',
  high:     'bg-orange-900/30 border-orange-700/50',
  warning:  'bg-yellow-900/30 border-yellow-700/50',
}

function getAlertOperators(fieldType) {
  switch (fieldType) {
    case 'number':
    case 'calculated':
    case 'scale':
    case 'score_display':
      return [
        { value: 'gt',      label: '> Greater than' },
        { value: 'gte',     label: '≥ At least' },
        { value: 'lt',      label: '< Less than' },
        { value: 'lte',     label: '≤ At most' },
        { value: 'eq',      label: '= Equals' },
        { value: 'between', label: '↔ Between' },
      ]
    case 'numeric_range':
      return [
        { value: 'gt',  label: 'Min > ' },
        { value: 'lt',  label: 'Max < ' },
        { value: 'eq',  label: '= Equals' },
      ]
    case 'radio':
    case 'dropdown':
    case 'yes_no':
      return [
        { value: 'eq',  label: '= Equals' },
        { value: 'neq', label: '≠ Not equals' },
      ]
    case 'checkbox':
      return [
        { value: 'includes',    label: '∈ Includes' },
        { value: 'excludes',    label: '∉ Excludes' },
        { value: 'is_empty',    label: 'Is empty' },
        { value: 'is_not_empty', label: 'Is not empty' },
      ]
    case 'text':
    case 'textarea':
      return [
        { value: 'is_empty',    label: 'Is empty' },
        { value: 'is_not_empty', label: 'Is filled' },
        { value: 'contains',    label: 'Contains' },
        { value: 'eq',          label: 'Exactly equals' },
      ]
    default:
      return [
        { value: 'is_empty',    label: 'Is empty' },
        { value: 'is_not_empty', label: 'Is filled' },
      ]
  }
}

function AlertTriggerValue({ rule, field, onChange }) {
  const op = rule.operator || 'gt'
  const needsNoValue = ['is_empty', 'is_not_empty'].includes(op)
  if (needsNoValue) return null

  const choiceTypes = ['radio', 'dropdown', 'yes_no', 'checkbox']
  if (choiceTypes.includes(field.type)) {
    const opts = field.type === 'yes_no'
      ? [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]
      : (field.options || [])
    return (
      <select
        className="flex-1 surface-2 border border-app rounded-lg px-2 py-1 text-xs text-app focus:outline-none focus:border-[#F5821E]"
        value={rule.value || ''}
        onChange={e => onChange('value', e.target.value)}
      >
        <option value="">— select option —</option>
        {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    )
  }

  if (op === 'between') {
    return (
      <>
        <input
          type="number"
          className="w-16 surface-2 border border-app rounded-lg px-2 py-1 text-xs text-app focus:outline-none focus:border-[#F5821E]"
          value={rule.threshold_low ?? ''}
          onChange={e => onChange('threshold_low', Number(e.target.value))}
          placeholder="Min"
        />
        <span className="text-faint text-xs flex-shrink-0">–</span>
        <input
          type="number"
          className="w-16 surface-2 border border-app rounded-lg px-2 py-1 text-xs text-app focus:outline-none focus:border-[#F5821E]"
          value={rule.threshold_high ?? ''}
          onChange={e => onChange('threshold_high', Number(e.target.value))}
          placeholder="Max"
        />
      </>
    )
  }

  const isNumericOp = ['gt', 'gte', 'lt', 'lte'].includes(op)
  return isNumericOp ? (
    <input
      type="number"
      className="w-20 surface-2 border border-app rounded-lg px-2 py-1 text-xs text-app focus:outline-none focus:border-[#F5821E]"
      value={rule.threshold ?? rule.value ?? ''}
      onChange={e => onChange('threshold', Number(e.target.value))}
    />
  ) : (
    <input
      type="text"
      className="flex-1 surface-2 border border-app rounded-lg px-2 py-1 text-xs text-app focus:outline-none focus:border-[#F5821E]"
      value={rule.value || ''}
      onChange={e => onChange('value', e.target.value)}
      placeholder="value…"
    />
  )
}

function AlertRulesEditor({ rules = [], field, onChange }) {
  const operators = getAlertOperators(field.type)

  function addRule() {
    const defaultOp = operators[0]?.value || 'is_not_empty'
    onChange([...rules, { severity: 'warning', operator: defaultOp, threshold: null, value: '', message: '' }])
  }
  function removeRule(i) { onChange(rules.filter((_, idx) => idx !== i)) }
  function updateRule(i, key, val) { onChange(rules.map((r, idx) => idx === i ? { ...r, [key]: val } : r)) }

  return (
    <div>
      <div className="space-y-2.5 mb-2">
        {rules.map((rule, i) => (
          <div key={i} className={`rounded-lg p-2 border space-y-1.5 ${SEVERITY_BG[rule.severity] || SEVERITY_BG.warning}`}>
            <div className="flex items-center gap-1.5 flex-wrap">
              <select
                className="surface-2 border border-app rounded-lg px-2 py-1 text-xs text-app focus:outline-none focus:border-[#F5821E]"
                value={rule.severity}
                onChange={e => updateRule(i, 'severity', e.target.value)}
              >
                <option value="critical">🔴 Critical</option>
                <option value="high">🟠 High</option>
                <option value="warning">🟡 Warning</option>
              </select>
              <select
                className="surface-2 border border-app rounded-lg px-2 py-1 text-xs text-app focus:outline-none focus:border-[#F5821E] flex-1 min-w-0"
                value={rule.operator}
                onChange={e => updateRule(i, 'operator', e.target.value)}
              >
                {operators.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
              <AlertTriggerValue rule={rule} field={field} onChange={(key, val) => updateRule(i, key, val)} />
              <button type="button" onClick={() => removeRule(i)} className="text-faint hover:text-red-400 flex-shrink-0">
                <X size={12} />
              </button>
            </div>
            <input
              className={inputCls + ' text-xs'}
              value={rule.message || ''}
              onChange={e => updateRule(i, 'message', e.target.value)}
              placeholder="Alert message shown to clinician…"
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addRule}
        className="flex items-center gap-1 text-xs text-[#F5821E] hover:text-orange-300 transition-colors"
      >
        <Plus size={12} /> Add Alert Rule
      </button>
      <p className="text-xs text-faint mt-1.5 leading-relaxed">
        Alerts fire when the field value meets the condition at submission.
      </p>
    </div>
  )
}

// ─── Conditions Editor ────────────────────────────────────────────────────────

const CONDITION_OPERATORS = [
  { value: 'equals',        label: 'equals' },
  { value: 'not_equals',    label: 'not equals' },
  { value: 'greater_than',  label: '> greater than' },
  { value: 'less_than',     label: '< less than' },
  { value: 'contains',      label: 'contains' },
  { value: 'is_empty',      label: 'is empty' },
  { value: 'is_not_empty',  label: 'is not empty' },
]

function ConditionsEditor({ conditions = [], conditionLogic = 'AND', allFields = [], onChangeConditions, onChangeLogic }) {
  function addCondition() {
    const first = allFields[0]
    onChangeConditions([...conditions, { field_id: first?.field?.field_id || '', operator: 'equals', value: '' }])
  }
  function removeCondition(i) { onChangeConditions(conditions.filter((_, idx) => idx !== i)) }
  function updateCondition(i, key, val) {
    onChangeConditions(conditions.map((c, idx) => idx === i ? { ...c, [key]: val } : c))
  }

  return (
    <div>
      {conditions.length > 1 && (
        <div className="mb-3">
          <span className="text-xs text-dim mr-2">Match</span>
          <BtnGroup
            options={[{ value: 'AND', label: 'ALL (AND)' }, { value: 'OR', label: 'ANY (OR)' }]}
            value={conditionLogic}
            onChange={onChangeLogic}
          />
        </div>
      )}
      <div className="space-y-2 mb-2">
        {conditions.map((cond, i) => (
          <div key={i} className="surface-2 rounded-lg p-2 space-y-1.5 border border-app">
            {i > 0 && (
              <span className="inline-block text-xs font-semibold text-purple-400 bg-purple-900/30 px-1.5 py-0.5 rounded">
                {conditionLogic}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <select
                className={selectCls + ' flex-1 text-xs'}
                value={cond.field_id}
                onChange={e => updateCondition(i, 'field_id', e.target.value)}
              >
                <option value="">— select field —</option>
                {allFields.map(({ field }) => (
                  <option key={field.id} value={field.field_id}>{field.label || field.field_id}</option>
                ))}
              </select>
              <button type="button" onClick={() => removeCondition(i)} className="text-faint hover:text-red-400 flex-shrink-0">
                <X size={12} />
              </button>
            </div>
            <select
              className={selectCls + ' text-xs'}
              value={cond.operator}
              onChange={e => updateCondition(i, 'operator', e.target.value)}
            >
              {CONDITION_OPERATORS.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
            {!['is_empty', 'is_not_empty'].includes(cond.operator) && (() => {
              const parentField = allFields.find(({ field: f }) => f.field_id === cond.field_id)?.field
              const isChoice = parentField && ['radio', 'dropdown', 'yes_no', 'checkbox'].includes(parentField.type)
              if (isChoice) {
                const opts = parentField.type === 'yes_no'
                  ? [{ value: 'yes', label: parentField.yes_label || 'Yes' }, { value: 'no', label: parentField.no_label || 'No' }]
                  : (parentField.options || [])
                return (
                  <select
                    className={selectCls + ' text-xs'}
                    value={cond.value || ''}
                    onChange={e => updateCondition(i, 'value', e.target.value)}
                  >
                    <option value="">— select value —</option>
                    {opts.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                )
              }
              return (
                <input
                  className={inputCls + ' text-xs'}
                  value={cond.value || ''}
                  onChange={e => updateCondition(i, 'value', e.target.value)}
                  placeholder="value…"
                />
              )
            })()}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addCondition}
        className="flex items-center gap-1 text-xs text-[#F5821E] hover:text-orange-300 transition-colors"
      >
        <Plus size={12} /> Add Condition
      </button>
    </div>
  )
}

// ─── Type-Specific Properties ─────────────────────────────────────────────────

function TypeSpecificProps({ field, sectionId, dispatch, allFields }) {
  function set(key, value) {
    dispatch({ type: 'UPDATE_FIELD_PROP', payload: { sectionId, fieldId: field.id, key, value } })
  }
  const type = field.type

  // ── text ──────────────────────────────────────────────────────────────────
  if (type === 'text') {
    return (
      <>
        <PropRow label="Placeholder">
          <input className={inputCls} value={field.placeholder || ''} onChange={e => set('placeholder', e.target.value)} placeholder="Enter placeholder…" />
        </PropRow>
        <PropRow label="Max Characters (0 = unlimited)">
          <input type="number" min={0} className={inputCls} value={field.max_length || 0} onChange={e => set('max_length', Number(e.target.value))} />
        </PropRow>
        <PropRow label="Default Value">
          <input className={inputCls} value={field.default_value || ''} onChange={e => set('default_value', e.target.value)} />
        </PropRow>
        <PropRow label="Validation Preset">
          <div className="flex flex-wrap gap-1 mb-1.5">
            {[
              { label: 'Email',        pattern: '/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/' },
              { label: 'Phone',        pattern: '/^[0-9+\\-\\s()]{7,15}$/' },
              { label: 'Numbers only', pattern: '/^[0-9]+$/' },
              { label: 'Alphanumeric', pattern: '/^[a-zA-Z0-9]+$/' },
            ].map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => set('validation_pattern', p.pattern)}
                className={`text-xs px-2 py-0.5 rounded transition-colors ${field.validation_pattern === p.pattern ? 'bg-[#F5821E] text-app' : 'surface-3 hover-app text-dim'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            className={inputCls + ' font-mono text-xs'}
            value={field.validation_pattern || ''}
            onChange={e => set('validation_pattern', e.target.value)}
            placeholder="/regex pattern/"
          />
        </PropRow>
        <PropRow label="Voice dictation" hint="Shows a mic icon in the field so clinicians can dictate the value.">
          <Toggle label="Enable mic dictation" value={field.enable_dictation !== false} onChange={v => set('enable_dictation', v)} />
        </PropRow>
      </>
    )
  }

  // ── textarea ──────────────────────────────────────────────────────────────
  if (type === 'textarea') {
    return (
      <>
        <PropRow label="Placeholder">
          <input className={inputCls} value={field.placeholder || ''} onChange={e => set('placeholder', e.target.value)} />
        </PropRow>
        <PropRow label="Max Characters (0 = unlimited)">
          <input type="number" min={0} className={inputCls} value={field.max_length || 0} onChange={e => set('max_length', Number(e.target.value))} />
        </PropRow>
        <PropRow label="Rows">
          <BtnGroup options={[3, 4, 6, 8, 12].map(n => ({ value: n, label: `${n}` }))} value={field.rows || 3} onChange={v => set('rows', v)} />
        </PropRow>
        <PropRow label="Voice dictation" hint="Shows a mic icon in the field so clinicians can dictate the value.">
          <Toggle label="Enable mic dictation" value={field.enable_dictation !== false} onChange={v => set('enable_dictation', v)} />
        </PropRow>
      </>
    )
  }

  // ── number ────────────────────────────────────────────────────────────────
  if (type === 'number') {
    return (
      <>
        <PropRow label="Unit Label (e.g. mmHg, kg, °C)">
          <input className={inputCls} value={field.unit || ''} onChange={e => set('unit', e.target.value)} placeholder="mmHg, kg, °C…" />
        </PropRow>
        <div className="grid grid-cols-2 gap-2">
          <PropRow label="Min"><input type="number" className={inputCls} value={field.min ?? ''} onChange={e => set('min', e.target.value === '' ? null : Number(e.target.value))} /></PropRow>
          <PropRow label="Max"><input type="number" className={inputCls} value={field.max ?? ''} onChange={e => set('max', e.target.value === '' ? null : Number(e.target.value))} /></PropRow>
        </div>
        <PropRow label="Decimal Places">
          <BtnGroup options={[0, 1, 2, 3, 4].map(n => ({ value: n, label: String(n) }))} value={field.decimal_places ?? 2} onChange={v => set('decimal_places', v)} />
        </PropRow>
        <CollapsibleSection title="Reference Ranges" defaultOpen>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'critical_low',  label: 'Critical Low',  cls: 'text-red-400' },
              { key: 'normal_low',    label: 'Normal Low',    cls: 'text-yellow-400' },
              { key: 'normal_high',   label: 'Normal High',   cls: 'text-yellow-400' },
              { key: 'critical_high', label: 'Critical High', cls: 'text-red-400' },
            ].map(r => (
              <div key={r.key}>
                <label className={`block text-xs font-medium mb-1 ${r.cls}`}>{r.label}</label>
                <input type="number" className={inputCls} value={field[r.key] ?? ''} onChange={e => set(r.key, e.target.value === '' ? null : Number(e.target.value))} />
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </>
    )
  }

  // ── numeric_range ─────────────────────────────────────────────────────────
  if (type === 'numeric_range') {
    return (
      <>
        <div className="grid grid-cols-2 gap-2">
          <PropRow label="Min Label"><input className={inputCls} value={field.range_min_label || 'Min'} onChange={e => set('range_min_label', e.target.value)} /></PropRow>
          <PropRow label="Max Label"><input className={inputCls} value={field.range_max_label || 'Max'} onChange={e => set('range_max_label', e.target.value)} /></PropRow>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <PropRow label="Floor"><input type="number" className={inputCls} value={field.min ?? ''} onChange={e => set('min', e.target.value === '' ? null : Number(e.target.value))} /></PropRow>
          <PropRow label="Ceiling"><input type="number" className={inputCls} value={field.max ?? ''} onChange={e => set('max', e.target.value === '' ? null : Number(e.target.value))} /></PropRow>
        </div>
        <PropRow label="Unit">
          <input className={inputCls} value={field.unit || ''} onChange={e => set('unit', e.target.value)} placeholder="bpm, mmHg…" />
        </PropRow>
      </>
    )
  }

  // ── date / time / datetime ────────────────────────────────────────────────
  if (['date', 'time', 'datetime'].includes(type)) {
    const inputType = type === 'date' ? 'date' : type === 'time' ? 'time' : 'datetime-local'
    const defaultOpts =
      type === 'time'     ? [{ value: 'none', label: 'None' }, { value: 'now', label: 'Current' }, { value: 'custom', label: 'Custom' }]
      : type === 'datetime' ? [{ value: 'none', label: 'None' }, { value: 'now', label: 'Now' },     { value: 'custom', label: 'Custom' }]
      :                       [{ value: 'none', label: 'None' }, { value: 'today', label: 'Today' }, { value: 'custom', label: 'Custom' }]
    return (
      <>
        <PropRow label="Default">
          <BtnGroup options={defaultOpts} value={field.date_default || 'none'} onChange={v => set('date_default', v)} />
          {field.date_default === 'custom' && (
            <input type={inputType} className={inputCls + ' mt-2'} value={field.default_value || ''} onChange={e => set('default_value', e.target.value)} />
          )}
        </PropRow>
        <PropRow label="Restrict">
          <BtnGroup
            options={[{ value: 'any', label: 'Any' }, { value: 'past', label: 'Past only' }, { value: 'future', label: 'Future only' }]}
            value={field.date_restrict || 'any'}
            onChange={v => set('date_restrict', v)}
          />
        </PropRow>
      </>
    )
  }

  // ── radio / checkbox / dropdown ───────────────────────────────────────────
  if (['radio', 'checkbox', 'dropdown'].includes(type)) {
    return (
      <>
        <PropRow label="Options (Label / ID / Score)">
          <OptionsEditor
            options={field.options || []}
            onChange={opts => set('options', opts)}
            showScoreWeight
            showTermSearch={type === 'dropdown'}
          />
        </PropRow>
        {type === 'dropdown' && (
          <div className="surface-2 border border-app rounded-lg p-2.5 space-y-2 mb-3">
            <Toggle
              value={field.searchable !== false}
              onChange={v => set('searchable', v)}
              label="Searchable (type to filter options)"
            />
            <Toggle
              value={!!field.multi_select}
              onChange={v => set('multi_select', v)}
              label="Multi-select (allow multiple answers)"
            />
          </div>
        )}
        {(type === 'radio' || type === 'checkbox') && (
          <PropRow label="Display Style">
            <BtnGroup
              options={[{ value: 'vertical', label: 'Vertical' }, { value: 'horizontal', label: 'Horizontal' }, { value: 'button_group', label: 'Buttons' }]}
              value={field.display_style || 'vertical'}
              onChange={v => set('display_style', v)}
            />
          </PropRow>
        )}
        {type === 'checkbox' && (
          <div className="grid grid-cols-2 gap-2">
            <PropRow label="Min Selections"><input type="number" min={0} className={inputCls} value={field.min_selections ?? ''} onChange={e => set('min_selections', e.target.value === '' ? null : Number(e.target.value))} /></PropRow>
            <PropRow label="Max Selections"><input type="number" min={0} className={inputCls} value={field.max_selections ?? ''} onChange={e => set('max_selections', e.target.value === '' ? null : Number(e.target.value))} /></PropRow>
          </div>
        )}
        {type === 'dropdown' && (
          <CollapsibleSection title="Cascade Config">
            <CascadeConfig field={field} allFields={allFields} set={set} />
          </CollapsibleSection>
        )}
      </>
    )
  }

  // ── yes_no ────────────────────────────────────────────────────────────────
  if (type === 'yes_no') {
    return (
      <>
        <div className="grid grid-cols-2 gap-2">
          <PropRow label="Yes Label"><input className={inputCls} value={field.yes_label || 'Yes'} onChange={e => set('yes_label', e.target.value)} /></PropRow>
          <PropRow label="No Label"><input className={inputCls} value={field.no_label || 'No'} onChange={e => set('no_label', e.target.value)} /></PropRow>
        </div>
        <PropRow label="Style">
          <BtnGroup
            options={[{ value: 'toggle', label: 'Toggle' }, { value: 'buttons', label: 'Buttons' }, { value: 'radio', label: 'Radio' }]}
            value={field.yes_no_style || 'toggle'}
            onChange={v => set('yes_no_style', v)}
          />
        </PropRow>
        <div className="surface-2 border border-app rounded-lg p-2.5 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-dim">
            <input type="checkbox" checked={!!field.yes_expands} onChange={e => set('yes_expands', e.target.checked)} className="accent-green-500" />
            When <span className="text-green-400 font-semibold">Yes</span> — expand extra section/fields
          </label>
          {field.yes_expands && (
            <input className={inputCls + ' text-xs mt-1'} value={field.yes_expand_section || ''} onChange={e => set('yes_expand_section', e.target.value)} placeholder="Section ID or field IDs to reveal (comma-separated)…" />
          )}
          <label className="flex items-center gap-2 cursor-pointer text-xs text-dim">
            <input type="checkbox" checked={!!field.no_expands} onChange={e => set('no_expands', e.target.checked)} className="accent-red-500" />
            When <span className="text-red-400 font-semibold">No</span> — expand extra section/fields
          </label>
          {field.no_expands && (
            <input className={inputCls + ' text-xs mt-1'} value={field.no_expand_section || ''} onChange={e => set('no_expand_section', e.target.value)} placeholder="Section ID or field IDs to reveal…" />
          )}
        </div>
        <PropRow label="Score Weight (Yes answer)">
          <input type="number" className={inputCls} value={field.yes_score ?? 1} onChange={e => set('yes_score', Number(e.target.value))} />
        </PropRow>
      </>
    )
  }

  // ── scale ─────────────────────────────────────────────────────────────────
  if (type === 'scale') {
    return (
      <>
        <div className="grid grid-cols-2 gap-2">
          <PropRow label="Min"><input type="number" className={inputCls} value={field.scale_min ?? 0} onChange={e => set('scale_min', Number(e.target.value))} /></PropRow>
          <PropRow label="Max"><input type="number" className={inputCls} value={field.scale_max ?? 10} onChange={e => set('scale_max', Number(e.target.value))} /></PropRow>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <PropRow label="Left Label"><input className={inputCls} value={field.left_label || ''} onChange={e => set('left_label', e.target.value)} placeholder="No Pain" /></PropRow>
          <PropRow label="Right Label"><input className={inputCls} value={field.right_label || ''} onChange={e => set('right_label', e.target.value)} placeholder="Worst Pain" /></PropRow>
        </div>
        <PropRow label="Style">
          <BtnGroup
            options={[{ value: 'nrs', label: 'NRS Buttons' }, { value: 'slider', label: 'Slider' }, { value: 'stars', label: 'Stars' }]}
            value={field.scale_style || 'nrs'}
            onChange={v => set('scale_style', v)}
          />
        </PropRow>
      </>
    )
  }

  // ── matrix ────────────────────────────────────────────────────────────────
  if (type === 'matrix') {
    const rows = field.rows || ['Row 1']
    const cols = field.columns || ['Column 1']

    function updateRows(next) { set('rows', next) }
    function updateCols(next) { set('columns', next) }

    return (
      <>
        <PropRow label="Row Labels">
          <div className="space-y-1.5 mb-1.5">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input className={inputCls + ' flex-1 text-xs'} value={r} onChange={e => { const n = [...rows]; n[i] = e.target.value; updateRows(n) }} placeholder={`Row ${i + 1}`} />
                <button type="button" onClick={() => updateRows(rows.filter((_, idx) => idx !== i))} className="text-faint hover:text-red-400 flex-shrink-0"><X size={12} /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => updateRows([...rows, `Row ${rows.length + 1}`])} className="text-xs text-[#F5821E] hover:text-orange-300 flex items-center gap-1">
            <Plus size={11} /> Add Row
          </button>
        </PropRow>
        <PropRow label="Column Labels">
          <div className="space-y-1.5 mb-1.5">
            {cols.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input className={inputCls + ' flex-1 text-xs'} value={c} onChange={e => { const n = [...cols]; n[i] = e.target.value; updateCols(n) }} placeholder={`Column ${i + 1}`} />
                <button type="button" onClick={() => updateCols(cols.filter((_, idx) => idx !== i))} className="text-faint hover:text-red-400 flex-shrink-0"><X size={12} /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => updateCols([...cols, `Column ${cols.length + 1}`])} className="text-xs text-[#F5821E] hover:text-orange-300 flex items-center gap-1">
            <Plus size={11} /> Add Column
          </button>
        </PropRow>
        <PropRow label="Cell Type">
          <BtnGroup
            options={[{ value: 'radio', label: 'Radio (single per row)' }, { value: 'checkbox', label: 'Checkbox (multi)' }, { value: 'text', label: 'Text input' }]}
            value={field.matrix_cell_type || 'radio'}
            onChange={v => set('matrix_cell_type', v)}
          />
        </PropRow>
      </>
    )
  }

  // ── calculated ────────────────────────────────────────────────────────────
  if (type === 'calculated') {
    // Insertable tokens: numeric inputs + auto patient/vital fields (age/weight/…)
    // so a dose formula can read live context, e.g. ({weight} * 15).
    const numericFields = (allFields || []).filter(({ field: f }) =>
      ['number', 'scale', 'numeric_range', 'calculated', 'patient_auto', 'vital_auto'].includes(f.type)
    )
    return (
      <>
        <PropRow label="Formula">
          <textarea
            className={textareaCls + ' font-mono text-xs'}
            rows={4}
            value={field.formula || ''}
            onChange={e => set('formula', e.target.value)}
            placeholder="{weight_kg} / ({height_m} * {height_m})"
          />
        </PropRow>
        <PropRow label="Insert Field Token">
          <select
            className={selectCls + ' text-xs'}
            value=""
            onChange={e => { if (e.target.value) set('formula', (field.formula || '') + `{${e.target.value}}`) }}
          >
            <option value="">— pick a numeric field —</option>
            {numericFields.map(({ field: f }) => (
              <option key={f.id} value={f.field_id}>{f.label || f.field_id}</option>
            ))}
          </select>
        </PropRow>
        <div className="surface-2 border border-app rounded-lg p-2 mb-3">
          <p className="text-xs text-faint font-mono leading-relaxed">sum() avg() min() max() if() round() abs() sqrt() pow()</p>
        </div>
        <PropRow label="Unit Label"><input className={inputCls} value={field.unit || ''} onChange={e => set('unit', e.target.value)} /></PropRow>
        <PropRow label="Decimal Places">
          <BtnGroup options={[0, 1, 2, 3, 4].map(n => ({ value: n, label: String(n) }))} value={field.decimal_places ?? 2} onChange={v => set('decimal_places', v)} />
        </PropRow>
      </>
    )
  }

  // ── score_display ─────────────────────────────────────────────────────────
  if (type === 'score_display') {
    return (
      <>
        <PropRow label="Score Source" hint="Displays the calculated value of a named score from this form's scoring config.">
          <input
            className={inputCls + ' font-mono text-xs'}
            value={field.score_source || ''}
            onChange={e => set('score_source', e.target.value)}
            placeholder="score_id e.g. score_0"
          />
        </PropRow>
        <PropRow label="Display Format">
          <BtnGroup
            options={[{ value: 'number', label: 'Number' }, { value: 'band', label: 'Band label' }, { value: 'both', label: 'Both' }]}
            value={field.score_display_format || 'both'}
            onChange={v => set('score_display_format', v)}
          />
        </PropRow>
      </>
    )
  }

  // ── vital_auto ────────────────────────────────────────────────────────────
  if (type === 'vital_auto') {
    return (
      <>
        <PropRow label="Vital Type">
          <select className={selectCls + ' text-xs'} value={field.vital_type || 'bp_systolic'} onChange={e => set('vital_type', e.target.value)}>
            <option value="bp_systolic">Blood Pressure (Systolic)</option>
            <option value="bp_diastolic">Blood Pressure (Diastolic)</option>
            <option value="heart_rate">Heart Rate</option>
            <option value="temperature">Temperature</option>
            <option value="spo2">SpO₂</option>
            <option value="rr">Respiratory Rate</option>
            <option value="gcs">GCS</option>
            <option value="weight_kg">Weight (kg)</option>
            <option value="height_cm">Height (cm)</option>
            <option value="bmi">BMI (calculated)</option>
          </select>
        </PropRow>
        <Toggle value={field.auto_populate !== false} onChange={v => set('auto_populate', v)} label="Auto-populate from latest vitals" />
        <p className="text-xs text-faint mt-2">When enabled, pre-fills with the patient's most recent recorded vital at form-open time.</p>
      </>
    )
  }

  // ── patient_search ────────────────────────────────────────────────────────
  if (type === 'patient_search') {
    return (
      <>
        <PropRow label="Placeholder Text">
          <input className={inputCls} value={field.placeholder || 'Search patient by name or BH-ID…'} onChange={e => set('placeholder', e.target.value)} />
        </PropRow>
        <Toggle value={field.multi_select || false} onChange={v => set('multi_select', v)} label="Allow multiple patients" />
        <PropRow label="Store" hint="What to store when a patient is selected.">
          <BtnGroup
            options={[{ value: 'bh_id', label: 'BH-ID' }, { value: 'name', label: 'Name' }, { value: 'object', label: 'Full object' }]}
            value={field.store_format || 'bh_id'}
            onChange={v => set('store_format', v)}
          />
        </PropRow>
      </>
    )
  }

  // ── staff_search ──────────────────────────────────────────────────────────
  if (type === 'staff_search') {
    return (
      <>
        <PropRow label="Placeholder Text">
          <input className={inputCls} value={field.placeholder || 'Search staff by name…'} onChange={e => set('placeholder', e.target.value)} />
        </PropRow>
        <PropRow label="Filter by Role">
          <div className="flex flex-wrap gap-1.5">
            {['doctor', 'nurse', 'any'].map(r => (
              <button key={r} type="button" onClick={() => set('role_filter', r)}
                className={`text-xs px-2.5 py-1 rounded-lg capitalize transition-colors ${field.role_filter === r ? 'bg-[#F5821E] text-app' : 'surface-3 text-dim hover-app'}`}
              >{r === 'any' ? 'Any Role' : r}</button>
            ))}
          </div>
        </PropRow>
        <Toggle value={field.multi_select || false} onChange={v => set('multi_select', v)} label="Allow multiple selections" />
      </>
    )
  }

  // ── medication_search ─────────────────────────────────────────────────────
  if (type === 'medication_search') {
    return (
      <>
        <PropRow label="Placeholder Text">
          <input className={inputCls} value={field.placeholder || 'Search medication / drug…'} onChange={e => set('placeholder', e.target.value)} />
        </PropRow>
        <Toggle value={field.multi_select !== false} onChange={v => set('multi_select', v)} label="Allow multiple medications" />
        <Toggle value={field.include_dose || false} onChange={v => set('include_dose', v)} label="Include dose / frequency sub-fields" />
        <PropRow label="Store format">
          <BtnGroup
            options={[{ value: 'name', label: 'Name' }, { value: 'code', label: 'Drug code' }, { value: 'object', label: 'Full object' }]}
            value={field.store_format || 'name'}
            onChange={v => set('store_format', v)}
          />
        </PropRow>
      </>
    )
  }

  // ── diagnosis_search ──────────────────────────────────────────────────────
  if (type === 'diagnosis_search') {
    return (
      <>
        <PropRow label="Placeholder Text">
          <input className={inputCls} value={field.placeholder || 'Search diagnosis / ICD-10…'} onChange={e => set('placeholder', e.target.value)} />
        </PropRow>
        <Toggle value={field.multi_select !== false} onChange={v => set('multi_select', v)} label="Allow multiple diagnoses" />
        <PropRow label="Standard">
          <BtnGroup
            options={[{ value: 'icd10', label: 'ICD-10' }, { value: 'snomed', label: 'SNOMED CT' }, { value: 'both', label: 'Both' }]}
            value={field.coding_standard || 'icd10'}
            onChange={v => set('coding_standard', v)}
          />
        </PropRow>
        <Toggle value={field.include_code || false} onChange={v => set('include_code', v)} label="Show code alongside term" />
      </>
    )
  }

  // ── allergy_search ────────────────────────────────────────────────────────
  if (type === 'allergy_search') {
    return (
      <>
        <PropRow label="Placeholder Text">
          <input className={inputCls} value={field.placeholder || 'Search allergy / allergen…'} onChange={e => set('placeholder', e.target.value)} />
        </PropRow>
        <Toggle value={field.multi_select !== false} onChange={v => set('multi_select', v)} label="Allow multiple allergies" />
        <Toggle value={field.include_severity || false} onChange={v => set('include_severity', v)} label="Include severity sub-field" />
        <Toggle value={field.include_reaction || false} onChange={v => set('include_reaction', v)} label="Include reaction description" />
      </>
    )
  }

  // ── procedure_search ──────────────────────────────────────────────────────
  if (type === 'procedure_search') {
    return (
      <>
        <PropRow label="Placeholder Text">
          <input className={inputCls} value={field.placeholder || 'Search procedure / CPT…'} onChange={e => set('placeholder', e.target.value)} />
        </PropRow>
        <Toggle value={field.multi_select !== false} onChange={v => set('multi_select', v)} label="Allow multiple procedures" />
        <PropRow label="Standard">
          <BtnGroup
            options={[{ value: 'cpt', label: 'CPT' }, { value: 'snomed', label: 'SNOMED' }, { value: 'icd_pcs', label: 'ICD-PCS' }, { value: 'any', label: 'Any' }]}
            value={field.procedure_standard || 'any'}
            onChange={v => set('procedure_standard', v)}
          />
        </PropRow>
      </>
    )
  }

  // ── lab_test_search ───────────────────────────────────────────────────────
  if (type === 'lab_test_search') {
    return (
      <>
        <PropRow label="Placeholder Text">
          <input className={inputCls} value={field.placeholder || 'Search lab test…'} onChange={e => set('placeholder', e.target.value)} />
        </PropRow>
        <Toggle value={field.multi_select !== false} onChange={v => set('multi_select', v)} label="Allow multiple tests" />
        <Toggle value={field.include_result || false} onChange={v => set('include_result', v)} label="Include result entry sub-field" />
      </>
    )
  }

  // ── body_site_search ──────────────────────────────────────────────────────
  if (type === 'body_site_search') {
    return (
      <>
        <PropRow label="Placeholder Text">
          <input className={inputCls} value={field.placeholder || 'Search body site…'} onChange={e => set('placeholder', e.target.value)} />
        </PropRow>
        <PropRow label="Search Category">
          <input className={inputCls} value={field.search_category || 'anatomy'} onChange={e => set('search_category', e.target.value)} />
        </PropRow>
        <Toggle value={field.multi_select || false} onChange={v => set('multi_select', v)} label="Allow multiple sites" />
      </>
    )
  }

  // ── label ─────────────────────────────────────────────────────────────────
  if (type === 'label') {
    return (
      <>
        <PropRow label="Text Content">
          <textarea className={textareaCls} rows={3} value={field.text_content || field.content || ''} onChange={e => set('text_content', e.target.value)} placeholder="Heading or label text…" />
        </PropRow>
        <PropRow label="Heading Style">
          <BtnGroup
            options={[{ value: 'h1', label: 'H1' }, { value: 'h2', label: 'H2' }, { value: 'h3', label: 'H3' }, { value: 'body', label: 'Body' }, { value: 'caption', label: 'Caption' }]}
            value={field.heading_style || 'h2'}
            onChange={v => set('heading_style', v)}
          />
        </PropRow>
        <PropRow label="Alignment">
          <BtnGroup
            options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]}
            value={field.text_align || 'left'}
            onChange={v => set('text_align', v)}
          />
        </PropRow>
      </>
    )
  }

  // ── stage_break ───────────────────────────────────────────────────────────
  if (type === 'stage_break') {
    return (
      <>
        <PropRow label="Stage Title">
          <input className={inputCls} value={field.stage_title || field.label || ''} onChange={e => set('stage_title', e.target.value)} placeholder="Stage 1: Patient Information" />
        </PropRow>
        <PropRow label="Stage Description">
          <textarea className={textareaCls} rows={2} value={field.stage_description || ''} onChange={e => set('stage_description', e.target.value)} placeholder="Instructions for this stage…" />
        </PropRow>
        <PropRow label="Stage Number">
          <input type="number" min={1} className={inputCls} value={field.stage_number || 1} onChange={e => set('stage_number', Number(e.target.value))} />
        </PropRow>
      </>
    )
  }

  // ── signature ─────────────────────────────────────────────────────────────
  if (type === 'signature') {
    return (
      <>
        <PropRow label="Required Role">
          <BtnGroup
            options={[{ value: 'any', label: 'Any' }, { value: 'doctor', label: 'Doctor' }, { value: 'nurse', label: 'Nurse' }, { value: 'patient', label: 'Patient' }]}
            value={field.role_required || 'any'}
            onChange={v => set('role_required', v)}
          />
        </PropRow>
        <Toggle value={field.include_timestamp !== false} onChange={v => set('include_timestamp', v)} label="Include timestamp" />
        <Toggle value={field.include_ip || false} onChange={v => set('include_ip', v)} label="Include IP address" />
      </>
    )
  }

  // ── photo / file ──────────────────────────────────────────────────────────
  if (type === 'photo' || type === 'file') {
    return (
      <>
        <PropRow label="Max Files (1–10)">
          <input type="number" min={1} max={10} className={inputCls} value={field.max_files || 1} onChange={e => set('max_files', Math.min(10, Math.max(1, Number(e.target.value))))} />
        </PropRow>
        <PropRow label="Max Size (MB)">
          <input type="number" min={1} className={inputCls} value={field.max_size_mb || 10} onChange={e => set('max_size_mb', Number(e.target.value))} />
        </PropRow>
        {type === 'file' && (
          <PropRow label="Allowed Types">
            <div className="flex flex-wrap gap-1.5">
              {['PDF', 'DOC', 'Image', 'Other'].map(t => {
                const val = t.toLowerCase()
                const allowed = field.allowed_types || []
                const active = allowed.includes(val)
                return (
                  <button key={t} type="button"
                    onClick={() => set('allowed_types', active ? allowed.filter(x => x !== val) : [...allowed, val])}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${active ? 'bg-[#F5821E] text-app' : 'surface-3 text-dim hover-app'}`}
                  >{t}</button>
                )
              })}
            </div>
          </PropRow>
        )}
      </>
    )
  }

  // ── table ─────────────────────────────────────────────────────────────────
  if (type === 'table') {
    const columns = field.columns || []
    return (
      <>
        <PropRow label="Columns">
          <div className="space-y-1.5 mb-2">
            {columns.map((col, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input className={inputCls + ' flex-1 text-xs'} value={col.header || ''} onChange={e => { const c = [...columns]; c[i] = { ...c[i], header: e.target.value }; set('columns', c) }} placeholder="Column header" />
                <select className="surface-2 border border-app rounded-lg px-2 py-1.5 text-xs text-app focus:outline-none w-24" value={col.type || 'text'} onChange={e => { const c = [...columns]; c[i] = { ...c[i], type: e.target.value }; set('columns', c) }}>
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="dropdown">Dropdown</option>
                </select>
                <button type="button" onClick={() => set('columns', columns.filter((_, idx) => idx !== i))} className="text-faint hover:text-red-400 flex-shrink-0"><X size={12} /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => set('columns', [...columns, { header: `Column ${columns.length + 1}`, type: 'text', width: 120 }])} className="flex items-center gap-1 text-xs text-[#F5821E] hover:text-orange-300 transition-colors">
            <Plus size={12} /> Add Column
          </button>
        </PropRow>
        <PropRow label="Rows">
          <BtnGroup
            options={[{ value: 'dynamic', label: 'Dynamic' }, { value: 'fixed', label: 'Fixed' }]}
            value={field.rows_type || 'dynamic'}
            onChange={v => set('rows_type', v)}
          />
          {field.rows_type === 'fixed' && (
            <input type="number" min={1} className={inputCls + ' mt-2'} value={field.row_count || 3} onChange={e => set('row_count', Number(e.target.value))} />
          )}
        </PropRow>
      </>
    )
  }

  // ── body_map ──────────────────────────────────────────────────────────────
  if (type === 'body_map') {
    return (
      <>
        <PropRow label="Diagram View">
          <BtnGroup
            options={[{ value: 'front', label: 'Front' }, { value: 'back', label: 'Back' }, { value: 'both', label: 'Both' }]}
            value={field.body_map_type || 'front'}
            onChange={v => set('body_map_type', v)}
          />
        </PropRow>
        <Toggle value={field.allow_multiple || false} onChange={v => set('allow_multiple', v)} label="Allow multiple annotation points" />
      </>
    )
  }

  // ── snomed / loinc ────────────────────────────────────────────────────────
  if (type === 'snomed' || type === 'loinc') {
    const stdName = type === 'snomed' ? 'SNOMED CT' : 'LOINC'
    return (
      <>
        <PropRow label="Code">
          <input className={inputCls + ' font-mono'} value={field.code || ''} onChange={e => set('code', e.target.value)} placeholder={type === 'snomed' ? '73211009' : '38341003-4'} />
        </PropRow>
        <PropRow label="Term Display">
          <input className={inputCls} value={field.term_display || ''} onChange={e => set('term_display', e.target.value)} placeholder={`${stdName} concept name`} />
        </PropRow>
        <PropRow label="Unit"><input className={inputCls} value={field.unit || ''} onChange={e => set('unit', e.target.value)} /></PropRow>
        <div className="bg-blue-900/20 border border-blue-800/40 rounded-lg p-2">
          <p className="text-blue-400 text-xs">Use standard {stdName} codes for clinical interoperability.</p>
        </div>
      </>
    )
  }

  // ── rich_text ─────────────────────────────────────────────────────────────
  if (type === 'rich_text') {
    return (
      <>
        <PropRow label="Text Content">
          <textarea className={textareaCls + ' min-h-[120px]'} rows={5} value={field.text_content || field.content || ''} onChange={e => set('text_content', e.target.value)} placeholder="Markdown supported: **bold** *italic* `code` # Heading" />
        </PropRow>
      </>
    )
  }

  // ── divider ───────────────────────────────────────────────────────────────
  if (type === 'divider') {
    return (
      <p className="text-xs text-faint italic">No additional settings for divider fields.</p>
    )
  }

  // ── repeating ─────────────────────────────────────────────────────────────
  if (type === 'repeating') {
    return (
      <>
        <div className="grid grid-cols-2 gap-2">
          <PropRow label="Min Repeats"><input type="number" min={1} className={inputCls} value={field.min_repeats || 1} onChange={e => set('min_repeats', Number(e.target.value))} /></PropRow>
          <PropRow label="Max Repeats"><input type="number" min={1} className={inputCls} value={field.max_repeats || 10} onChange={e => set('max_repeats', Number(e.target.value))} /></PropRow>
        </div>
        <PropRow label="Add Button Label">
          <input className={inputCls} value={field.add_label || 'Add Another'} onChange={e => set('add_label', e.target.value)} />
        </PropRow>
      </>
    )
  }

  if (type === 'patient_auto') {
    return (
      <PropRow label="Patient field">
        <select className={inputCls} value={field.auto_source || 'age'} onChange={e => set('auto_source', e.target.value)}>
          <option value="age">Age (years)</option>
          <option value="age_months">Age (months)</option>
          <option value="weight">Weight (kg)</option>
          <option value="height">Height (cm)</option>
          <option value="bmi">BMI</option>
          <option value="sex">Sex</option>
          <option value="blood_group">Blood group</option>
          <option value="allergies">Allergies</option>
        </select>
      </PropRow>
    )
  }

  return null
}

// ─── Section Properties ───────────────────────────────────────────────────────

function SectionProperties({ section, dispatch }) {
  function set(key, value) {
    dispatch({ type: 'UPDATE_SECTION', payload: { sectionId: section.id, key, value } })
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 flex-1 overflow-y-auto">
        <h3 className="text-sm font-semibold text-app mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#F5821E] flex-shrink-0" />
          Section Properties
        </h3>

        <PropRow label="Title">
          <input className={inputCls} value={section.title || ''} onChange={e => set('title', e.target.value)} placeholder="Section title…" />
        </PropRow>

        <PropRow label="Description">
          <textarea className={textareaCls} rows={2} value={section.description || ''} onChange={e => set('description', e.target.value)} placeholder="Optional description shown above the section…" />
        </PropRow>

        <ColorField label="Header colour" value={section.header_color || ''} onChange={c => set('header_color', c)} />

        <PropRow label="Applicability Mode">
          <div className="space-y-2">
            <label className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer border transition-colors ${
              !section.applicability_mode || section.applicability_mode === 'required'
                ? 'bg-[#F5821E]/10 border-[#F5821E]/40' : 'surface-2 border-app hover:border-app'
            }`}>
              <input type="radio" name="appMode" value="required" checked={!section.applicability_mode || section.applicability_mode === 'required'} onChange={() => set('applicability_mode', 'required')} className="accent-[#F5821E]" />
              <div>
                <p className="text-xs text-app font-medium">Always required</p>
                <p className="text-xs text-faint">Clinician must fill all required fields</p>
              </div>
            </label>
            <label className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer border transition-colors ${
              section.applicability_mode === 'na_allowed'
                ? 'bg-[#F5821E]/10 border-[#F5821E]/40' : 'surface-2 border-app hover:border-app'
            }`}>
              <input type="radio" name="appMode" value="na_allowed" checked={section.applicability_mode === 'na_allowed'} onChange={() => set('applicability_mode', 'na_allowed')} className="accent-[#F5821E]" />
              <div>
                <p className="text-xs text-app font-medium flex items-center gap-1">
                  <Ban size={11} className="text-dim" /> N/A lockable
                </p>
                <p className="text-xs text-faint">Clinician can mark entire section as Not Applicable</p>
              </div>
            </label>
          </div>
        </PropRow>

        <div className="space-y-2.5 mb-4">
          <Toggle value={section.collapsible || false} onChange={v => set('collapsible', v)} label="Collapsible" />
          <Toggle value={section.repeatable || false} onChange={v => set('repeatable', v)} label="Repeatable" />
          <Toggle value={section.hidden || false} onChange={v => set('hidden', v)} label="Hidden by default" />
        </div>

        {section.repeatable && (
          <div className="grid grid-cols-2 gap-2 mb-4 surface-2 border border-app rounded-lg p-3">
            <PropRow label="Min Instances"><input type="number" min={1} className={inputCls} value={section.min_instances || 1} onChange={e => set('min_instances', Number(e.target.value))} /></PropRow>
            <PropRow label="Max Instances"><input type="number" min={1} className={inputCls} value={section.max_instances || 5} onChange={e => set('max_instances', Number(e.target.value))} /></PropRow>
          </div>
        )}
      </div>

      <div className="p-4 pt-0 border-t border-app flex-shrink-0">
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Delete this section and all its fields?')) {
              dispatch({ type: 'DELETE_SECTION', payload: section.id })
            }
          }}
          className="w-full py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-700/40 text-red-400 text-sm font-medium rounded-xl transition-colors"
        >
          Delete Section
        </button>
      </div>
    </div>
  )
}

// ─── Field Properties ─────────────────────────────────────────────────────────

function FieldProperties({ field, sectionId, sectionLayout, dispatch, allFields, cols }) {
  function set(key, value) {
    dispatch({ type: 'UPDATE_FIELD_PROP', payload: { sectionId, fieldId: field.id, key, value } })
  }

  // Fields without generic props
  const isLayoutOnly = ['divider', 'rich_text', 'label', 'stage_break'].includes(field.type)

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 flex-1 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          {getFieldTypeIcon(field.type, 18)}
          <span className="text-sm font-semibold text-app flex-1 capitalize">{field.type.replace(/_/g, ' ')} Field</span>
          <span className="text-xs bg-[#F5821E]/20 text-[#F5821E] border border-[#F5821E]/30 px-2 py-0.5 rounded-full font-mono">
            {field.type}
          </span>
        </div>

        {/* Grid size on the free CareForm canvas */}
        <GridSizeControl
          layout={field.layout}
          onChange={lay => set('layout', lay)}
          cols={cols}
        />

        {/* Field colour */}
        <ColorField label="Field colour" value={field.color || ''} onChange={c => set('color', c)} />

        {/* Label + Field ID */}
        {!isLayoutOnly && (
          <>
            <PropRow label="Label">
              <input className={inputCls} value={field.label || ''} onChange={e => set('label', e.target.value)} placeholder="Field label shown to users" />
            </PropRow>
            <PropRow label="Field ID" hint="Permanent identity — frozen once any submission uses it. Change only before first use.">
              <input
                className="w-full surface-2 border border-app rounded-lg px-3 py-1.5 text-xs text-blue-300 font-mono focus:outline-none focus:border-blue-500 transition-colors"
                value={field.field_id || ''}
                onChange={e => {
                  const raw = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_/, '').slice(0, 60)
                  set('field_id', raw)
                }}
                spellCheck={false}
                title="Editable — auto-generated from label. Frozen after first submission."
              />
            </PropRow>
            <PropRow label="Help Text">
              <textarea className={textareaCls} rows={2} value={field.help_text || ''} onChange={e => set('help_text', e.target.value)} placeholder="Guidance shown below the field…" />
            </PropRow>

            {/* Toggles */}
            <div className="grid grid-cols-1 gap-2 mb-4 surface-2 border border-app rounded-lg p-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Toggle value={field.required || false} onChange={v => set('required', v)} />
                <span className="text-sm text-dim flex items-center gap-1">
                  <span className="text-red-400 font-bold">*</span> Required
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Toggle value={field.read_only || false} onChange={v => set('read_only', v)} />
                <span className="text-sm text-dim flex items-center gap-1.5">
                  <Lock size={12} className="text-dim" /> Read-only
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Toggle value={field.hidden || false} onChange={v => set('hidden', v)} />
                <span className="text-sm text-dim flex items-center gap-1.5">
                  <EyeOff size={12} className="text-dim" /> Hidden by default
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none" title="Stored in submission for audit but not shown in patient chart">
                <Toggle value={!!field.chart_excluded} onChange={v => set('chart_excluded', v)} />
                <span className="text-sm text-dim flex items-center gap-1.5">
                  <Eye size={12} className="text-faint line-through" /> Chart-excluded
                </span>
              </label>
            </div>
          </>
        )}

        {/* Type-specific settings */}
        <div className="border-t border-app pt-4 mt-2">
          <SectionHeader title="Field Settings" />
          <TypeSpecificProps field={field} sectionId={sectionId} dispatch={dispatch} allFields={allFields} />
        </div>

        {/* Visibility conditions (not for layout-only fields) */}
        {!isLayoutOnly && (
          <CollapsibleSection title="Visibility Rules" icon={Eye}>
            <ConditionsEditor
              conditions={field.conditions || []}
              conditionLogic={field.condition_logic || 'AND'}
              allFields={allFields}
              onChangeConditions={conds => set('conditions', conds)}
              onChangeLogic={logic => set('condition_logic', logic)}
            />
          </CollapsibleSection>
        )}

        {/* Alert rules (all interactive field types) */}
        {!isLayoutOnly && field.type !== 'signature' && field.type !== 'photo' && field.type !== 'file' && (
          <CollapsibleSection title="Alert Rules" icon={Bell}>
            <AlertRulesEditor
              rules={field.alert_rules || []}
              field={field}
              onChange={rules => set('alert_rules', rules)}
            />
          </CollapsibleSection>
        )}

        {/* Clinical code binding (LOINC / SNOMED / ICD-10) — coded, interoperable data */}
        {!isLayoutOnly && (
          <CollapsibleSection title="Clinical Code" icon={Hash}>
            <PropRow label="System" hint="Standard this field's value maps to (for FHIR / ABDM export)">
              <select
                className={inputCls}
                value={field.clinical_code?.system || ''}
                onChange={e => set('clinical_code', { ...(field.clinical_code || {}), system: e.target.value })}
              >
                <option value="">— none —</option>
                <option value="LOINC">LOINC</option>
                <option value="SNOMED">SNOMED CT</option>
                <option value="ICD-10">ICD-10</option>
                <option value="CPT">CPT</option>
                <option value="custom">Custom</option>
              </select>
            </PropRow>
            <PropRow label="Code">
              <input
                className={inputCls + ' font-mono'}
                value={field.clinical_code?.code || ''}
                onChange={e => set('clinical_code', { ...(field.clinical_code || {}), code: e.target.value })}
                placeholder="e.g. 8480-6"
              />
            </PropRow>
            <PropRow label="Display">
              <input
                className={inputCls}
                value={field.clinical_code?.display || ''}
                onChange={e => set('clinical_code', { ...(field.clinical_code || {}), display: e.target.value })}
                placeholder="e.g. Systolic blood pressure"
              />
            </PropRow>
            <p className="text-xs text-faint mt-1 leading-relaxed">
              Binds the value to a standard code so it exports cleanly to FHIR / ABDM and trends consistently.
            </p>
          </CollapsibleSection>
        )}
      </div>

      {/* Delete pinned to bottom */}
      <div className="p-4 pt-0 border-t border-app flex-shrink-0">
        <button
          type="button"
          onClick={() => dispatch({ type: 'DELETE_FIELD', payload: { sectionId, fieldId: field.id } })}
          className="w-full py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-700/40 text-red-400 text-sm font-medium rounded-xl transition-colors"
        >
          Delete Field
        </button>
      </div>
    </div>
  )
}

// ─── PropertiesPanel (main export) ───────────────────────────────────────────

export default function PropertiesPanel({ form, selectedId, selectedType, dispatch, allFields }) {
  const selectedSection =
    selectedType === 'section'
      ? (form.schema.sections.find(s => s.id === selectedId) || null)
      : null

  let selectedField = null
  let selectedFieldSectionId = null
  let selectedFieldSectionLayout = 1
  if (selectedType === 'field') {
    for (const section of form.schema.sections) {
      const f = section.fields.find(f => f.id === selectedId)
      if (f) {
        selectedField = f
        selectedFieldSectionId = section.id
        selectedFieldSectionLayout = section.layout || 1
        break
      }
    }
  }

  return (
    <div className="w-80 h-full surface border-l border-app overflow-y-auto flex flex-col flex-shrink-0">
      {!selectedId && (
        <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
          <div className="w-14 h-14 rounded-full surface-2 flex items-center justify-center mb-4">
            <Clipboard size={24} className="text-faint" />
          </div>
          <p className="text-sm font-semibold text-dim mb-1">Select a field or section</p>
          <p className="text-xs text-faint leading-relaxed">
            Click any field or section in the canvas to edit its properties here.
          </p>
        </div>
      )}

      {selectedType === 'section' && selectedSection && (
        <SectionProperties section={selectedSection} dispatch={dispatch} />
      )}

      {selectedType === 'field' && selectedField && (
        <FieldProperties
          field={selectedField}
          sectionId={selectedFieldSectionId}
          sectionLayout={selectedFieldSectionLayout}
          dispatch={dispatch}
          allFields={allFields}
          cols={gridColsOf(form.schema)}
        />
      )}
    </div>
  )
}
