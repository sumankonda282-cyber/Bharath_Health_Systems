/**
 * @shared-pool
 * SchemaFormRenderer — dynamically renders a DB-stored assessment form schema.
 * Accepts a formId, fetches the full form from the API, and renders all sections/fields.
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */
import React, { useState, useEffect, useCallback } from 'react'
import { Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Lock, RefreshCw } from 'lucide-react'
import api from '../../api/client'

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

function FieldRenderer({ field, value, onChange }) {
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
    return (
      <div>
        <FieldLabel label={label} required={required} help_text={help_text} />
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    )
  }

  if (type === 'textarea') {
    return (
      <div>
        <FieldLabel label={label} required={required} help_text={help_text} />
        <textarea
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
        />
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
            onChange={e => onChange(e.target.value)}
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

function SectionBlock({ section, formData, onFieldChange }) {
  const { id, title, layout = 2, applicability_mode, fields = [] } = section
  const isNaAllowed = applicability_mode === 'na_allowed'
  const [applicable, setApplicable] = useState('Applicable')
  const [collapsed, setCollapsed] = useState(false)

  const gridClass =
    layout === 1 ? 'grid-cols-1' :
    layout === 3 ? 'grid-cols-3' : 'grid-cols-2'

  const getColSpan = (field) => {
    const structuralTypes = ['heading', 'paragraph', 'stage_break', 'textarea', 'checkbox', 'scale']
    if (structuralTypes.includes(field.type)) return 'col-span-full'
    if (!layout || layout <= 1) return 'col-span-1'
    const span = field.col_span || 1
    if (layout === 2) return span >= 2 ? 'col-span-2' : 'col-span-1'
    if (span >= 3) return 'col-span-3'
    if (span === 2) return 'col-span-2'
    return 'col-span-1'
  }

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
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="font-semibold text-sm text-gray-700">{title}</h3>
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
          <button
            type="button"
            onClick={() => setCollapsed(c => !c)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className={`p-4 grid ${gridClass} gap-4`}>
          {fields.map(field => (
            <div key={field.id || field.field_id} className={getColSpan(field)}>
              <FieldRenderer
                field={field}
                value={formData[field.field_id]}
                onChange={val => onFieldChange(field.field_id, val)}
              />
            </div>
          ))}
        </div>
      )}
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
export default function SchemaFormRenderer({ formId, patientId, encounterId, onSaved, admission, onClose }) {
  const [form, setForm]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState(null)
  const [formData, setFormData] = useState({})
  const [saving, setSaving]   = useState(false)
  const [submitErr, setSubmitErr] = useState(null)
  const [done, setDone]       = useState(false)

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

  const handleFieldChange = useCallback((fieldId, val) => {
    setFormData(prev => ({ ...prev, [fieldId]: val }))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSubmitErr(null)
    try {
      await api.post(`/assessment-forms/${formId}/submit`, {
        form_data:    formData,
        patient_id:   patientId || admission?.patient_id,
        encounter_id: encounterId || admission?.id,
        submitted_by: null,
      })
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {sections.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">This form has no sections yet.</p>
      )}

      {sections.map(section => (
        <SectionBlock
          key={section.id}
          section={section}
          formData={formData}
          onFieldChange={handleFieldChange}
        />
      ))}

      {submitErr && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700">
          <AlertCircle size={14} />
          <span className="text-sm">{submitErr}</span>
        </div>
      )}

      {sections.length > 0 && (
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
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
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Submitting…' : 'Submit Form'}
          </button>
        </div>
      )}
    </form>
  )
}
