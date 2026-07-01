/**
 * @shared-pool
 * SchemaFormRenderer — dynamically renders a DB-stored assessment form schema.
 * Accepts a formId, fetches the full form from the API, and renders all sections/fields.
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Lock, RefreshCw, Save, RotateCcw, X, CheckCheck, Copy, Mic } from 'lucide-react'
import api from '../../api/client'
import TermSearch, { SEARCH_TYPES } from '../forms/TermSearch'
import useFormDraft, { draftMirrorKey, saveStatusLabel } from '@shared/hooks/useFormDraft'
import { computeNormalFill } from '@shared/forms/normalFill'
import { sectionHasLayout, buildRowMap, makeSectionGridStyle, gridCellStyle, gridColsOf } from '@shared/forms/gridLayout'
import MedicationOrderField from '../forms/MedicationOrderField'
import PatientAutoField from '../forms/PatientAutoField'
import { PatientDataContext } from '../forms/patientContext'

// ── Formula evaluator for calculated fields (e.g. BMI) ───────────────────────
// Replaces {field_id} tokens with current numeric form values and evaluates.

function evalFormula(formula, data) {
  if (!formula) return ''
  try {
    let expr = formula
    for (const m of (formula.match(/\{([^}]+)\}/g) || [])) { expr = expr.replace(m, Number(data[m.slice(1, -1)]) || 0) }
    const r = Function(`return ${expr}`)()
    return (r === Infinity || isNaN(r)) ? '' : r
  } catch { return '' }
}

// ── Conditional visibility (yes/no → reveal a dependent field) ───────────────
// Mirrors provider formEngine.evaluateCondition/isFieldVisible so a form's show-if
// logic behaves identically in CareChart and Provider.
function evalCondition(c, data) {
  const v = data[c.field_id]
  switch (c.operator) {
    case 'equals':       return String(v) === String(c.value)
    case 'not_equals':   return String(v) !== String(c.value)
    case 'contains':     return String(v || '').includes(String(c.value))
    case 'greater_than': return Number(v) > Number(c.value)
    case 'less_than':    return Number(v) < Number(c.value)
    case 'is_empty':     return v === undefined || v === null || v === ''
    case 'is_not_empty': return v !== undefined && v !== null && v !== ''
    default: return true
  }
}
// ─── Voice dictation (mic) ────────────────────────────────────────────────────
function useVoiceDictation(onResult) {
  const [listening, setListening] = useState(false)
  const recRef = useRef(null)
  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { onResult(null, 'Voice input not supported in this browser'); return }
    const rec = new SR()
    rec.lang = 'en-IN'
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = e => { onResult(e.results[0][0].transcript, null); setListening(false) }
    rec.onerror = () => { onResult(null, 'Voice error'); setListening(false) }
    rec.onend = () => setListening(false)
    recRef.current = rec
    rec.start()
    setListening(true)
  }, [onResult])
  return { listening, start }
}

function MicButton({ onAppend }) {
  const [toast, setToast] = useState(null)
  const { listening, start } = useVoiceDictation((text, err) => {
    if (err) { setToast(err); setTimeout(() => setToast(null), 2000); return }
    onAppend(text)
  })
  return (
    <div className="relative inline-flex">
      <button type="button" onClick={start}
        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${listening ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-blue-600 hover:bg-gray-100'}`}
        title="Voice input">
        <Mic size={14} className={listening ? 'animate-pulse' : ''} />
      </button>
      {toast && <div className="absolute right-0 top-full mt-1 text-xs bg-gray-800 text-white px-2 py-1 rounded z-10 whitespace-nowrap">{toast}</div>}
    </div>
  )
}

function isFieldVisible(field, data) {
  if (!field.conditions || field.conditions.length === 0) return true
  const logic = field.condition_logic || 'ALL'
  return logic === 'ALL'
    ? field.conditions.every(c => evalCondition(c, data))
    : field.conditions.some(c => evalCondition(c, data))
}

// ── Field label with optional help text ─────────────────────────────────────

function FieldLabel({ label, required, help_text }) {
  return (
    <div className="mb-1.5">
      <label className="block text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {help_text && <p className="text-xs text-gray-400 mt-0.5">{help_text}</p>}
    </div>
  )
}

// ── Pill-style select (radio / checkbox) ─────────────────────────────────────

function PillGroup({ options = [], value, onChange, multi = false }) {
  const sel = multi ? (Array.isArray(value) ? value : []) : value
  const toggle = (v) => {
    if (multi) {
      const arr = Array.isArray(sel) ? sel : []
      onChange(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v])
    } else {
      onChange(sel === v ? '' : v)
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const active = multi ? sel.includes(o.value) : sel === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
              active
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Single field renderer ────────────────────────────────────────────────────

function FieldRenderer({ field, value, onChange, formData = {} }) {
  const {
    type, label, field_id, required, help_text, placeholder, options,
    min, max, min_label, max_label, unit, yes_label, no_label,
  } = field

  // ── Structural types ──

  if (type === 'heading') {
    return (
      <div className="col-span-full pt-3 pb-1 border-b border-gray-200">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{label}</p>
      </div>
    )
  }
  if (type === 'paragraph') {
    return <p className="col-span-full text-sm text-gray-500 italic">{label}</p>
  }
  if (type === 'stage_break') {
    return (
      <div className="col-span-full flex items-center gap-3 py-2">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>
    )
  }

  // ── Input types ──

  if (type === 'text') {
    const dictation = field.enable_dictation !== false
    return (
      <div>
        <FieldLabel label={label} required={required} help_text={help_text} />
        <div className="relative">
          <input
            type="text"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${dictation ? 'pr-10' : ''}`}
          />
          {dictation && <MicButton onAppend={val => onChange(((value || '') + ' ' + val).trim())} />}
        </div>
      </div>
    )
  }

  if (type === 'textarea') {
    const dictation = field.enable_dictation !== false
    return (
      <div>
        <FieldLabel label={label} required={required} help_text={help_text} />
        <div className="relative">
          <textarea
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y ${dictation ? 'pr-10' : ''}`}
          />
          {dictation && <MicButton onAppend={val => onChange(((value || '') + ' ' + val).trim())} />}
        </div>
      </div>
    )
  }

  if (type === 'number' || type === 'numeric_range') {
    return (
      <div>
        <FieldLabel label={label} required={required} help_text={help_text} />
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={value || ''}
            onChange={e => {
              let v = e.target.value
              if (v === '') return onChange('')
              let n = Number(v)
              if (!isNaN(n)) {
                if (min != null && n < min) n = min
                if (max != null && n > max) n = max
                v = String(n)
              }
              onChange(v)
            }}
            min={min}
            max={max}
            step="any"
            placeholder={placeholder || (min !== undefined && max !== undefined ? `${min}–${max}` : '')}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {unit && <span className="text-sm text-gray-500 whitespace-nowrap">{unit}</span>}
        </div>
        {min !== undefined && max !== undefined && (
          <p className="text-xs text-gray-400 mt-1">Normal range: {min}–{max}{unit ? ` ${unit}` : ''}</p>
        )}
      </div>
    )
  }

  if (type === 'medication_order') {
    return <MedicationOrderField field={field} value={value} onChange={onChange} />
  }

  if (type === 'patient_auto') {
    return <PatientAutoField field={field} value={value} onChange={onChange} />
  }

  if (SEARCH_TYPES[type]) {
    return (
      <div>
        <FieldLabel label={label} required={required} help_text={help_text} />
        <TermSearch
          type={type}
          value={value}
          onChange={val => onChange(val)}
          placeholder={placeholder}
        />
      </div>
    )
  }

  if (type === 'calculated') {
    const computed = (() => {
      const r = evalFormula(field.formula, formData)
      return r === '' ? '' : (field.decimal_places != null ? Number(r).toFixed(field.decimal_places) : r)
    })()
    return (
      <div>
        <FieldLabel label={label} required={required} help_text={help_text} />
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={computed}
            placeholder={placeholder || '—'}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-700 focus:outline-none cursor-default"
          />
          {unit && <span className="text-sm text-gray-500 whitespace-nowrap">{unit}</span>}
        </div>
      </div>
    )
  }

  if (type === 'date') {
    return (
      <div>
        <FieldLabel label={label} required={required} help_text={help_text} />
        <input
          type="date"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    )
  }

  if (type === 'time') {
    return (
      <div>
        <FieldLabel label={label} required={required} help_text={help_text} />
        <input
          type="time"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    )
  }

  if (type === 'datetime') {
    return (
      <div>
        <FieldLabel label={label} required={required} help_text={help_text} />
        <input
          type="datetime-local"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    )
  }

  if (type === 'dropdown') {
    return (
      <div>
        <FieldLabel label={label} required={required} help_text={help_text} />
        <select
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          <option value="">— Select —</option>
          {(options || []).map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    )
  }

  if (type === 'radio') {
    return (
      <div>
        <FieldLabel label={label} required={required} help_text={help_text} />
        <PillGroup options={options || []} value={value} onChange={onChange} />
      </div>
    )
  }

  if (type === 'checkbox') {
    return (
      <div>
        <FieldLabel label={label} required={required} help_text={help_text} />
        <PillGroup options={options || []} value={value} onChange={onChange} multi />
      </div>
    )
  }

  if (type === 'yes_no') {
    const yL = yes_label || 'Yes'
    const nL = no_label || 'No'
    return (
      <div>
        <FieldLabel label={label} required={required} help_text={help_text} />
        <div className="flex gap-2">
          {[{ l: yL, v: 'yes' }, { l: nL, v: 'no' }].map(({ l, v }) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange(value === v ? '' : v)}
              className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${
                value === v
                  ? v === 'yes'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-red-600 text-white border-red-600'
                  : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'scale') {
    const mn = min ?? 0
    const mx = max ?? 10
    const vals = Array.from({ length: mx - mn + 1 }, (_, i) => mn + i)
    return (
      <div>
        <FieldLabel label={label} required={required} help_text={help_text} />
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {vals.map(v => (
              <button
                key={v}
                type="button"
                onClick={() => onChange(value === String(v) ? '' : String(v))}
                className={`w-9 h-9 rounded-lg border text-sm font-bold transition-all ${
                  value === String(v)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>{min_label || 'None'}</span>
            <span>{max_label || 'Severe'}</span>
          </div>
        </div>
      </div>
    )
  }

  // Fallback: text input for unrecognised types
  return (
    <div>
      <FieldLabel label={label} required={required} help_text={help_text} />
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}

// ── Section block ────────────────────────────────────────────────────────────

function SectionBlock({ section, formData, onFieldChange, theme, gridCols }) {
  const { id, title, applicability_mode, fields = [] } = section
  const isNaAllowed = applicability_mode === 'na_allowed'
  const [applicable, setApplicable] = useState('Applicable')
  const [collapsed, setCollapsed] = useState(!!section.collapsed)

  const COLS = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }
  const SPAN = { 1: 'col-span-1', 2: 'col-span-2', 3: 'col-span-3', 4: 'col-span-4', full: 'col-span-full' }
  const layout = section.layout || 1
  const gridClass = COLS[layout] || COLS[1]

  const getColSpan = (field) => {
    const structuralTypes = ['heading', 'paragraph', 'stage_break', 'textarea', 'checkbox', 'scale']
    if (structuralTypes.includes(field.type)) return SPAN.full
    if (!layout || layout <= 1) return SPAN[1]
    const span = Math.min(field.col_span || 1, layout)
    return SPAN[span] || SPAN[1]
  }

  const accent = section.header_color || theme?.accent

  if (applicable === 'N/A') {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 p-4 flex items-center gap-3 opacity-70">
        <Lock size={14} className="text-gray-400" />
        <span className="text-sm text-gray-500 font-medium">{title} — Not applicable · section locked</span>
        <button
          type="button"
          onClick={() => setApplicable('Applicable')}
          className="ml-auto text-xs text-blue-600 underline font-medium"
        >
          Unlock
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div
        className={`flex items-center justify-between px-4 py-3 border-b border-gray-200 ${accent ? '' : 'bg-gray-50'}`}
        style={accent ? { backgroundColor: accent + '1f' } : undefined}
      >
        <h3 className={`font-semibold text-sm ${accent ? '' : 'text-gray-700'}`} style={accent ? { color: accent } : undefined}>{title}</h3>
        <div className="flex items-center gap-2">
          {isNaAllowed && (
            <div className="flex gap-1">
              {['Applicable', 'N/A'].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setApplicable(v)}
                  className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold transition-all ${
                    applicable === v
                      ? 'bg-gray-700 text-white border-gray-700'
                      : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          )}
          {section.collapsible && (
            <button
              type="button"
              onClick={() => setCollapsed(c => !c)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          )}
        </div>
      </div>

      {!(section.collapsible && collapsed) && (() => {
        // CareForm free-grid placement (design = fill). Falls back to the legacy
        // column flow for forms that predate the grid (no field.layout).
        const visible = fields.filter(field => isFieldVisible(field, formData))
        const useGrid = sectionHasLayout(fields)
        const rowMap  = useGrid ? buildRowMap(visible) : null
        return (
          <div className={useGrid ? 'p-4' : `p-4 grid ${gridClass} gap-4`} style={useGrid ? makeSectionGridStyle(gridCols) : undefined}>
            {visible.map(field => (
              <div
                key={field.id || field.field_id}
                className={useGrid ? undefined : getColSpan(field)}
                style={{
                  ...(useGrid ? gridCellStyle(field, rowMap, gridCols) : {}),
                  borderLeft: field.color ? '3px solid ' + field.color : undefined,
                  paddingLeft: field.color ? 8 : undefined,
                }}
              >
                <FieldRenderer
                  field={field}
                  value={formData[field.field_id]}
                  onChange={val => onFieldChange(field.field_id, val)}
                  formData={formData}
                />
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}

// ── Main renderer ────────────────────────────────────────────────────────────

/**
 * Fetches a published DB assessment form by ID and renders it dynamically.
 * On submit, POSTs to /assessment-forms/{formId}/submit.
 *
 * @param {number}   formId       - DB AssessmentForm.id
 * @param {number}   patientId    - Patient ID
 * @param {number}   encounterId  - Encounter/admission ID
 * @param {object}   admission    - Admission object (used as fallback for patient_id / id)
 * @param {Function} onSaved      - Called after successful submit
 * @param {Function} onClose      - Called on cancel
 */
export default function SchemaFormRenderer({ formId, patientId, encounterId, onSaved, admission, onClose, readOnly: readOnlyProp }) {
  const [form, setForm]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState(null)
  const [formData, setFormData] = useState({})
  const [saving, setSaving]   = useState(false)   // signing / finalizing
  const [savingDraft, setSavingDraft] = useState(false)
  const [submitErr, setSubmitErr] = useState(null)
  const [done, setDone]       = useState(false)

  const draftIdRef = useRef(null)
  const dataRef    = useRef(formData)
  dataRef.current  = formData
  const pid = patientId || admission?.patient_id
  const enc = encounterId || admission?.id
  // Session-state edit lock (design standard §11): once the patient is discharged
  // the admission is closed and every submitted form becomes permanently
  // read-only. An explicit readOnly prop always wins.
  const readOnly = readOnlyProp ?? !!(
    admission?.discharged || admission?.discharge_date || admission?.discharged_at ||
    admission?.status === 'discharged' || admission?.status === 'closed'
  )

  useEffect(() => {
    if (!formId) return
    setLoading(true)
    setLoadErr(null)
    api.get(`/assessment-forms/${formId}`)
      .then(res => { setForm(res); setLoading(false) })
      .catch(err => {
        setLoadErr(err.response?.data?.detail || 'Failed to load form')
        setLoading(false)
      })
  }, [formId])

  // ── PowerForm save-states: localStorage mirror + debounced server autosave ──
  const draft = useFormDraft({
    mirrorKey: (formId && pid) ? draftMirrorKey(formId, pid, enc || '') : null,
    enabled:   !loading && !loadErr && !done && !!form && !!pid && !readOnly,
    saveFn:    async () => {
      const res = await api.post(`/assessment-forms/${formId}/submit`, {
        submission_id: draftIdRef.current || undefined,
        form_data:     dataRef.current,
        patient_id:    pid,
        encounter_id:  enc,
        is_draft:      true,
        source:        'carechart',
      })
      if (res?.submission_id) draftIdRef.current = res.submission_id
    },
  })

  // Resume an in-progress draft for this patient (server-side; survives reload).
  useEffect(() => {
    if (!formId || !pid) return
    let alive = true
    api.get(`/assessment-forms/${formId}/draft`, { params: { patient_id: pid, encounter_id: enc || undefined } })
      .then(r => {
        if (!alive) return
        const d = r?.draft
        if (!d) return
        draftIdRef.current = d.submission_id
        if (d.form_data && Object.keys(d.form_data).length) {
          setFormData(prev => (Object.keys(prev).length ? prev : d.form_data))
        }
      })
      .catch(() => { /* no draft is the normal case */ })
    return () => { alive = false }
  }, [formId, pid, enc])

  const handleFieldChange = useCallback((fieldId, val) => {
    const next = { ...dataRef.current, [fieldId]: val }
    setFormData(next)
    draft.markDirty(next)
  }, [draft])

  const handleSaveDraft = async () => {
    if (!pid) { setSubmitErr('No patient is linked — cannot save draft.'); return }
    setSubmitErr(null)
    setSavingDraft(true)
    try { await draft.flush() } finally { setSavingDraft(false) }
  }

  const handleRestore = () => {
    const recovered = draft.applyRecovery()
    if (recovered && typeof recovered === 'object') setFormData(prev => ({ ...prev, ...recovered }))
  }

  // ── Speed: mark-all-normal + carry-forward from the last visit ──
  const handleMarkNormal = () => {
    const secs = form?.schema?.sections || []
    const patch = computeNormalFill(secs, dataRef.current, { keyOf: f => f.field_id || f.id })
    if (!Object.keys(patch).length) return
    const next = { ...dataRef.current, ...patch }
    setFormData(next)
    draft.markDirty(next)
  }

  const [lastSub, setLastSub] = useState(null)
  useEffect(() => {
    if (!formId || !pid) return
    // Carry-forward scoped to the CURRENT admission/encounter (design standard
    // §11.4): clinical measurements must never cross sessions. Without a session
    // key we do not fetch a prior submission — no cross-session bleed.
    if (!enc) { setLastSub(null); return }
    let alive = true
    api.get(`/assessment-forms/${formId}/submissions`, { params: { patient_id: pid, encounter_id: enc, limit: 1, include_data: true } })
      .then(r => { if (alive && r?.items?.length) setLastSub(r.items[0]) })
      .catch(() => { /* no prior submission is normal */ })
    return () => { alive = false }
  }, [formId, pid, enc])

  const handleCarryForward = () => {
    if (!lastSub?.form_data) return
    const merged = { ...lastSub.form_data, ...dataRef.current }  // last fills blanks; entered values win
    setFormData(merged)
    draft.markDirty(merged)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (readOnly) return   // discharged admission — record is locked
    draft.cancelPending()   // no autosave may fire mid-sign (would create a stray draft)
    setSaving(true)
    setSubmitErr(null)
    try {
      // is_draft:false promotes any in-progress draft to a signed record and
      // fires alerts + iView; submission_id continues the same draft row.
      await api.post(`/assessment-forms/${formId}/submit`, {
        submission_id: draftIdRef.current || undefined,
        form_data:     formData,
        patient_id:    pid,
        encounter_id:  enc,
        is_draft:      false,
        source:        'carechart',
      })
      draft.clearMirror()
      draftIdRef.current = null
      setDone(true)
      setTimeout(() => onSaved?.(), 1800)
    } catch (err) {
      setSubmitErr(err.response?.data?.detail || 'Failed to submit form')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-gray-400 justify-center">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Loading form…</span>
      </div>
    )
  }

  if (loadErr) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 rounded-xl border border-red-200 bg-red-50 text-red-700">
        <AlertCircle size={20} />
        <p className="text-sm font-semibold">Failed to load form</p>
        <p className="text-xs text-red-500">{loadErr}</p>
        <button
          onClick={() => { setLoadErr(null); setLoading(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-100 hover:bg-red-200 transition-colors"
        >
          <RefreshCw size={11} /> Retry
        </button>
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 p-10 text-center">
        <CheckCircle size={36} className="text-green-500" />
        <p className="font-semibold text-gray-800">Form submitted successfully</p>
        {form?.title && <p className="text-sm text-gray-500">{form.title}</p>}
      </div>
    )
  }

  const sections = form?.schema?.sections || []

  return (
    <PatientDataContext.Provider value={{ patientId: pid }}>
    <form onSubmit={handleSubmit} className="space-y-4">
      {sections.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">This form has no sections yet.</p>
      )}

      {draft.recovery && sections.length > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-amber-200 bg-amber-50">
          <span className="text-xs text-amber-800 flex items-center gap-1.5 min-w-0">
            <RotateCcw size={13} className="shrink-0" />
            Unsaved changes from a previous session were found.
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={handleRestore}
              className="px-3 py-1 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600">
              Restore
            </button>
            <button type="button" onClick={draft.dismissRecovery} className="text-amber-500 hover:text-amber-700" aria-label="Discard recovered changes">
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {readOnly && sections.length > 0 && (
        <div className="px-3 py-1.5 rounded-lg bg-gray-100 text-[11px] font-medium text-gray-500 text-center">
          Read-only — this admission is discharged. Submitted record cannot be edited.
        </div>
      )}

      {!readOnly && sections.length > 0 && (
        <div className="flex items-center justify-end gap-2">
          {lastSub && (
            <button type="button" onClick={handleCarryForward}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
              title={lastSub.submitted_at ? `From ${new Date(lastSub.submitted_at).toLocaleDateString()}` : 'Copy from last visit'}>
              <Copy size={12} /> Copy from last visit
            </button>
          )}
          <button type="button" onClick={handleMarkNormal}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-200 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50">
            <CheckCheck size={12} /> Mark all normal
          </button>
        </div>
      )}

      {/* A disabled fieldset makes every control inert in one shot when locked. */}
      <fieldset disabled={readOnly} className="border-0 p-0 m-0 min-w-0 space-y-4">
      {sections.map(section => (
        <SectionBlock
          key={section.id}
          section={section}
          formData={formData}
          onFieldChange={handleFieldChange}
          theme={form?.schema?.theme}
          gridCols={gridColsOf(form?.schema)}
        />
      ))}
      </fieldset>

      {submitErr && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700">
          <AlertCircle size={14} />
          <span className="text-sm">{submitErr}</span>
        </div>
      )}

      {readOnly && sections.length > 0 && onClose && (
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-white bg-gray-700 rounded-lg hover:bg-gray-800">
            Close
          </button>
        </div>
      )}

      {!readOnly && sections.length > 0 && (
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
          <span className={`text-xs flex items-center gap-1.5 min-w-0 truncate ${
            draft.status === 'error' ? 'text-red-500'
            : draft.status === 'saving' ? 'text-blue-500'
            : draft.status === 'saved' ? 'text-green-600' : 'text-gray-400'
          }`}>
            {draft.status === 'saving' && <Loader2 size={12} className="animate-spin shrink-0" />}
            {saveStatusLabel(draft.status, draft.savedAt)}
          </span>
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingDraft || saving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors"
            >
              {savingDraft ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save draft
            </button>
            <button
              type="submit"
              disabled={saving || savingDraft}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              {saving ? 'Signing…' : 'Sign & Submit'}
            </button>
          </div>
        </div>
      )}
    </form>
    </PatientDataContext.Provider>
  )
}
