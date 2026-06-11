import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { ChevronRight, ChevronLeft, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import BrandLogo from '../components/BrandLogo'

const API_BASE = import.meta.env.VITE_API_URL || 'https://bharatcliniq-api.onrender.com'

function evaluateConditions(field, values) {
  if (!field.conditions || field.conditions.length === 0) return true
  const results = field.conditions.map(c => {
    const val = values[c.field_id]
    switch (c.operator) {
      case 'equals': return String(val) === String(c.value)
      case 'not_equals': return String(val) !== String(c.value)
      case 'greater_than': return parseFloat(val) > parseFloat(c.value)
      case 'less_than': return parseFloat(val) < parseFloat(c.value)
      case 'contains': return String(val || '').includes(c.value)
      case 'is_empty': return !val
      case 'is_not_empty': return !!val
      default: return true
    }
  })
  const logic = field.condition_logic || 'ALL'
  return logic === 'ALL' ? results.every(Boolean) : results.some(Boolean)
}

function FieldRenderer({ field, value, onChange, error }) {
  const base = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#0F2557]/20 focus:border-[#0F2557] bg-white'

  if (field.type === 'label') {
    const tags = { h1: 'h1', h2: 'h2', h3: 'h3', body: 'p', caption: 'p', small: 'p' }
    const Tag = tags[field.heading_style] || 'p'
    const cls = { h1: 'text-2xl font-bold text-[#0F2557]', h2: 'text-xl font-bold text-[#0F2557]', h3: 'text-lg font-semibold text-[#0F2557]', body: 'text-base text-gray-700', caption: 'text-sm text-gray-500 italic', small: 'text-xs text-gray-400' }
    return <Tag className={cls[field.heading_style] || 'text-base text-gray-700'}>{field.text_content}</Tag>
  }
  if (field.type === 'divider') return <hr className="border-gray-100 my-2" />

  if (field.type === 'text') return <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} className={base} style={{ minHeight: 44 }} />
  if (field.type === 'textarea') return <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} rows={3} className={base} />
  if (field.type === 'number') return (
    <div className="flex items-center gap-2">
      <input type="number" value={value || ''} onChange={e => onChange(e.target.value)} min={field.min} max={field.max} step={field.decimal_places > 0 ? 0.1 : 1} className={`${base} flex-1`} style={{ minHeight: 44 }} />
      {field.unit && <span className="text-gray-500 text-sm whitespace-nowrap">{field.unit}</span>}
    </div>
  )
  if (field.type === 'date') return <input type="date" value={value || ''} onChange={e => onChange(e.target.value)} className={base} style={{ minHeight: 44 }} />
  if (field.type === 'time') return <input type="time" value={value || ''} onChange={e => onChange(e.target.value)} className={base} style={{ minHeight: 44 }} />
  if (field.type === 'datetime') return <input type="datetime-local" value={value || ''} onChange={e => onChange(e.target.value)} className={base} style={{ minHeight: 44 }} />

  if (field.type === 'radio' || field.type === 'single_choice') {
    return (
      <div className="flex flex-col gap-2">
        {(field.options || []).map(opt => (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
            className={`w-full text-left px-4 py-3 rounded-xl border-2 text-base font-medium transition-all ${value === opt.value ? 'border-[#0F2557] bg-[#0F2557]/5 text-[#0F2557]' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
            <span className={`inline-block w-5 h-5 rounded-full border-2 mr-3 align-middle ${value === opt.value ? 'border-[#0F2557] bg-[#0F2557]' : 'border-gray-300'}`} />
            {opt.label}
          </button>
        ))}
      </div>
    )
  }

  if (field.type === 'checkbox' || field.type === 'multi_choice') {
    const arr = Array.isArray(value) ? value : []
    return (
      <div className="flex flex-col gap-2">
        {(field.options || []).map(opt => {
          const checked = arr.includes(opt.value)
          return (
            <button key={opt.value} type="button" onClick={() => onChange(checked ? arr.filter(v => v !== opt.value) : [...arr, opt.value])}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 text-base font-medium transition-all ${checked ? 'border-[#F5821E] bg-[#F5821E]/5 text-[#0F2557]' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
              <span className={`inline-block w-5 h-5 rounded border-2 mr-3 align-middle ${checked ? 'border-[#F5821E] bg-[#F5821E]' : 'border-gray-300'}`} />
              {opt.label}
            </button>
          )
        })}
      </div>
    )
  }

  if (field.type === 'dropdown') return (
    <select value={value || ''} onChange={e => onChange(e.target.value)} className={base} style={{ minHeight: 44 }}>
      <option value="">Select…</option>
      {(field.options || []).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  )

  if (field.type === 'scale') {
    const min = field.scale_min ?? 0
    const max = field.scale_max ?? 10
    const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i)
    return (
      <div>
        <div className="flex gap-1 flex-wrap">
          {nums.map(n => (
            <button key={n} type="button" onClick={() => onChange(String(n))}
              className={`w-10 h-10 rounded-xl text-sm font-bold border-2 transition-all ${value === String(n) ? 'border-[#F5821E] bg-[#F5821E] text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
              {n}
            </button>
          ))}
        </div>
        {(field.left_label || field.right_label) && (
          <div className="flex justify-between mt-1 text-xs text-gray-400">
            <span>{field.left_label}</span><span>{field.right_label}</span>
          </div>
        )}
      </div>
    )
  }

  if (field.type === 'signature') return (
    <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
      placeholder="Type your full name to sign" className={base} style={{ minHeight: 44 }} />
  )

  if (field.type === 'photo') return (
    <input type="file" accept="image/*" capture="environment" multiple={field.max_files > 1}
      onChange={e => onChange(Array.from(e.target.files).map(f => f.name).join(', '))}
      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[#0F2557]/10 file:text-[#0F2557] file:font-medium" />
  )

  return <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} className={base} style={{ minHeight: 44 }} />
}

export default function PreVisitForm() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState(null)
  const [values, setValues] = useState({})
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [activeSection, setActiveSection] = useState(0)
  const [timeLeft, setTimeLeft] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/public/previsit/${token}`)
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d.detail || 'Link not found')))
      .then(data => { setFormData(data); setLoading(false) })
      .catch(err => { setError(String(err)); setLoading(false) })
  }, [token])

  useEffect(() => {
    if (!formData?.expires_at) return
    const update = () => {
      const diff = new Date(formData.expires_at) - Date.now()
      if (diff <= 0) { setTimeLeft('Expired'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setTimeLeft(`${h}h ${m}m remaining`)
    }
    update()
    const t = setInterval(update, 60000)
    return () => clearInterval(t)
  }, [formData])

  const sections = formData?.form?.schema?.sections || []
  const currentSection = sections[activeSection]

  const visibleFields = useCallback((section) => {
    return (section?.fields || []).filter(f => evaluateConditions(f, values))
  }, [values])

  const validateSection = useCallback((section) => {
    const errs = {}
    visibleFields(section).forEach(field => {
      if (field.required && (values[field.field_id] === undefined || values[field.field_id] === '' || values[field.field_id] === null || (Array.isArray(values[field.field_id]) && values[field.field_id].length === 0))) {
        errs[field.field_id] = 'This field is required'
      }
    })
    return errs
  }, [values, visibleFields])

  const handleNext = () => {
    const errs = validateSection(currentSection)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    if (activeSection < sections.length - 1) setActiveSection(s => s + 1)
  }

  const handleSubmit = async () => {
    const errs = validateSection(currentSection)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSubmitting(true)
    try {
      const r = await fetch(`${API_BASE}/api/v1/public/previsit/${token}/submit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: values }),
      })
      if (!r.ok) throw new Error((await r.json()).detail || 'Submission failed')
      setSubmitted(true)
    } catch (e) { setError(e.message) } finally { setSubmitting(false) }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0F4F8' }}>
      <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#0F2557', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#F0F4F8' }}>
      <div className="sticky top-0 z-10" style={{ background: '#0F2557' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <BrandLogo size="sm" light />
          <span className="text-blue-200 text-xs font-medium">Pre-Visit Assessment</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {error && !submitted && (
          <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-800 mb-2">Link Unavailable</h2>
            <p className="text-gray-500">{error}</p>
          </div>
        )}

        {submitted && (
          <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-10 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h2>
            <p className="text-gray-600 mb-4">Your responses have been saved successfully.</p>
            <p className="text-gray-500 text-sm">Your doctor will review your answers before your visit. You can now close this page.</p>
          </div>
        )}

        {formData && !submitted && !error && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
              <p className="text-base font-medium text-[#0F2557]">Hello, <strong>{formData.patient?.name}</strong>!</p>
              <p className="text-gray-600 text-sm mt-1">Please complete this assessment before your appointment.</p>
              {timeLeft && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                  <Clock size={12} /> {timeLeft}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
              <h1 className="text-xl font-bold text-[#0F2557]">{formData.form.title}</h1>
              {formData.form.description && <p className="text-gray-500 text-sm mt-1">{formData.form.description}</p>}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Section {activeSection + 1} of {sections.length}</span>
                  <span>{Math.round(((activeSection) / sections.length) * 100)}% complete</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full transition-all" style={{ background: '#F5821E', width: `${((activeSection) / sections.length) * 100}%` }} />
                </div>
              </div>
            </div>

            {currentSection && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
                <h2 className="text-lg font-bold text-[#0F2557] mb-4">{currentSection.title}</h2>
                <div className="space-y-5">
                  {visibleFields(currentSection).map(field => (
                    <div key={field.id}>
                      {field.type !== 'label' && field.type !== 'divider' && (
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                      )}
                      {field.help_text && <p className="text-xs text-gray-400 mb-2">{field.help_text}</p>}
                      <FieldRenderer
                        field={field}
                        value={values[field.field_id]}
                        onChange={val => setValues(v => ({ ...v, [field.field_id]: val }))}
                        error={errors[field.field_id]}
                      />
                      {errors[field.field_id] && <p className="text-red-500 text-xs mt-1">{errors[field.field_id]}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {activeSection > 0 && (
                <button onClick={() => setActiveSection(s => s - 1)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-medium text-sm bg-white">
                  <ChevronLeft size={16} /> Previous
                </button>
              )}
              <div className="flex-1" />
              {activeSection < sections.length - 1 ? (
                <button onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white"
                  style={{ background: '#0F2557' }}>
                  Next Section <ChevronRight size={16} />
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
                  style={{ background: '#F5821E' }}>
                  {submitting ? 'Submitting…' : 'Submit Responses'} <CheckCircle size={16} />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
