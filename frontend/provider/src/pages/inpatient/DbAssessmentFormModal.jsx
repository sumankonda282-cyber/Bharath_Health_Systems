import { useState, useEffect } from 'react'
import { X, Loader2, AlertTriangle, CheckCircle2, Send, FileText } from 'lucide-react'
import api from '../../api/client'
import {
  LangContext, FieldRenderer, ScoreCard, AlertCard,
  isFieldVisible, getCompletionPct,
} from '../forms/formEngine'

const NAVY  = '#0F2557'
const GREEN = '#059669'

// ─────────────────────────────────────────────────────────────────────────────
// In-chart assessment-form modal (admin-built / DB forms).
//
// Opens over the inpatient chart — same shell layout as CareChart's assessment
// modal — and renders the form's schema inline so the clinician fills and
// submits without leaving the chart. Provider is PIN-free, so there is no PIN
// gate. Submission is scoped to the patient + admission and the authenticated
// staff member server-side.
// ─────────────────────────────────────────────────────────────────────────────

export default function DbAssessmentFormModal({ form, patientId, admissionId, patientName, onClose }) {
  const [schema,    setSchema]    = useState(null)   // { sections: [...] }
  const [meta,      setMeta]      = useState(null)   // { title, category, ... }
  const [values,    setValues]    = useState({})
  const [errors,    setErrors]    = useState({})
  const [touched,   setTouched]   = useState({})
  const [activeSection, setActiveSection] = useState(0)

  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [scores,    setScores]    = useState([])
  const [alerts,    setAlerts]    = useState([])

  const title = meta?.title || form?.title || form?.name || 'Assessment Form'

  // ── Load the full form schema (the panel only carries summary fields) ──
  useEffect(() => {
    if (!form?.id) { setLoadError('Form unavailable'); setLoading(false); return }
    let alive = true
    setLoading(true); setLoadError(null)
    api.get(`/assessment-forms/${form.id}`)
      .then(f => {
        if (!alive) return
        const sections = f?.schema?.sections || []
        setSchema({ sections })
        setMeta({
          title:          f?.title || form?.title || form?.name,
          category:       f?.category,
          scoring_config: f?.scoring_config,
          alert_rules:    f?.alert_rules,
        })
      })
      .catch(err => { if (alive) setLoadError(err?.message || 'Failed to load form') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [form?.id])

  const sections = schema?.sections || []
  const completionPct = getCompletionPct(sections, values)

  const setFieldValue = (fieldId, val) => {
    setValues(v => ({ ...v, [fieldId]: val }))
    setTouched(t => ({ ...t, [fieldId]: true }))
  }

  const validateAll = () => {
    const errs = {}
    for (const section of sections) {
      for (const field of section.fields || []) {
        if (!isFieldVisible(field, values)) continue
        if (field.type === 'label' || field.type === 'divider' || field.type === 'calculated') continue
        if (field.required) {
          const v = values[field.id]
          if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
            errs[field.id] = `${field.label || 'This field'} is required`
          }
        }
        if (field.type === 'number' && values[field.id] !== '' && values[field.id] !== undefined) {
          const v = Number(values[field.id])
          if (field.min !== undefined && v < field.min) errs[field.id] = `Minimum value is ${field.min}`
          if (field.max !== undefined && v > field.max) errs[field.id] = `Maximum value is ${field.max}`
        }
      }
    }
    return errs
  }

  const handleSubmit = async () => {
    const errs = validateAll()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      setTouched(t => ({ ...t, ...Object.fromEntries(Object.keys(errs).map(k => [k, true])) }))
      // Jump to the section containing the first error
      const firstErrId = Object.keys(errs)[0]
      const secIdx = sections.findIndex(s => (s.fields || []).some(f => f.id === firstErrId))
      if (secIdx >= 0) setActiveSection(secIdx)
      return
    }
    if (!patientId) {
      setErrors({ _submit: 'No patient is linked to this admission — cannot submit.' })
      return
    }
    setErrors({})
    setSubmitting(true)
    try {
      // patient_id is required server-side; admission_id is a plain int column.
      // clinic_id / branch_id / submitted_by are taken from the auth token.
      const payload = {
        patient_id:   patientId,
        admission_id: admissionId ? Number(admissionId) : null,
        form_data:    values,
        source:       'provider',
      }
      const res = await api.post(`/assessment-forms/${form.id}/submit`, payload)
      const raw = res?.score_result
      const scoresArr = raw && Object.keys(raw).length > 0 ? [{
        name:  'Score',
        value: raw.total,
        band:  {
          severity:       raw.band,
          label:          raw.band,
          interpretation: raw.interpretation,
          action:         raw.recommended_action,
        },
      }] : []
      setScores(scoresArr)
      setAlerts(res?.alerts_fired || [])
      setSubmitted(true)
    } catch (err) {
      setErrors({ _submit: err?.message || 'Submission failed' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,37,87,0.6)' }}>
      <div className="flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: '70vw', height: '80vh', maxWidth: 1100 }}>

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-3.5 border-b shadow-sm"
          style={{ background: NAVY, borderColor: '#1e3a6e' }}>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Assessment Form</span>
            <span className="text-lg font-extrabold text-white leading-tight truncate">{title}</span>
            {patientName && <span className="text-[11px] text-blue-200 truncate">Patient: {patientName}</span>}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {!loading && !loadError && !submitted && (
              <span className="hidden sm:flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                style={{ background: '#1e3a6e', color: '#bfdbfe' }}>
                {completionPct}% complete
              </span>
            )}
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-300 hover:text-white hover:bg-white/10 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
            <Loader2 size={30} className="animate-spin" style={{ color: NAVY }} />
            <span className="text-sm">Loading form…</span>
          </div>
        ) : loadError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
            <AlertTriangle size={34} className="text-red-400" />
            <p className="text-sm text-gray-600">{loadError}</p>
            <button onClick={onClose} className="mt-1 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: NAVY }}>Close</button>
          </div>
        ) : submitted ? (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl border border-green-200 p-6 mb-4 text-center">
                <CheckCircle2 size={44} className="text-green-500 mx-auto mb-3" />
                <h3 className="text-xl font-bold" style={{ color: NAVY }}>Form Submitted</h3>
                <p className="text-sm text-gray-500 mt-1">{title} has been charted for this admission.</p>
              </div>
              {scores.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Assessment Scores</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {scores.map((sc, i) => <ScoreCard key={i} score={sc} />)}
                  </div>
                </div>
              )}
              {alerts.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1">
                    <AlertTriangle size={14} /> Critical Alerts
                  </h4>
                  <div className="space-y-2">
                    {alerts.map((a, i) => <AlertCard key={i} alert={a} />)}
                  </div>
                </div>
              )}
              <button onClick={onClose}
                className="w-full py-3 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition"
                style={{ background: NAVY }}>
                Done
              </button>
            </div>
          </div>
        ) : sections.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center text-gray-400">
            <FileText size={34} className="opacity-40" />
            <p className="text-sm font-medium">This form has no fields to fill.</p>
            <button onClick={onClose} className="mt-1 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: NAVY }}>Close</button>
          </div>
        ) : (
          <LangContext.Provider value={{ lang: 'en', translations: null }}>
            <div className="flex-1 flex flex-col min-h-0">
              {/* Section tabs */}
              {sections.length > 1 && (
                <div className="flex-shrink-0 px-5 pt-3">
                  <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
                    {sections.map((s, i) => (
                      <button key={i} onClick={() => setActiveSection(i)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition ${activeSection === i ? 'bg-[#0F2557] text-white' : 'text-gray-500 hover:bg-white'}`}>
                        {i + 1}. {s.title || s.name || `Section ${i + 1}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Fields */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="max-w-5xl mx-auto">
                  {sections.map((section, si) => {
                    if (sections.length > 1 && si !== activeSection) return null
                    return (
                      <div key={si}>
                        {sections.length > 1 && (
                          <h3 className="text-base font-bold mb-4" style={{ color: NAVY }}>
                            {section.title || section.name || `Section ${si + 1}`}
                          </h3>
                        )}
                        <div className="space-y-5">
                          {(section.fields || []).map(field => {
                            if (!isFieldVisible(field, values)) return null
                            return (
                              <div key={field.id} id={`dbform-field-${field.id}`}>
                                <FieldRenderer
                                  field={field}
                                  value={values[field.id]}
                                  onChange={v => setFieldValue(field.id, v)}
                                  error={touched[field.id] ? errors[field.id] : undefined}
                                  allValues={values}
                                />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 border-t px-6 py-3.5 flex items-center justify-between gap-3"
                style={{ borderColor: '#e9eaec', background: '#f9fafb' }}>
                {errors._submit ? (
                  <span className="text-xs text-red-600 flex items-center gap-1 min-w-0 truncate">
                    <AlertTriangle size={13} className="shrink-0" />{errors._submit}
                  </span>
                ) : <span className="text-xs text-gray-400">Submitting charts to this admission</span>}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {sections.length > 1 && activeSection > 0 && (
                    <button onClick={() => setActiveSection(s => Math.max(0, s - 1))}
                      className="px-4 py-2 rounded-xl border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
                      ← Previous
                    </button>
                  )}
                  {sections.length > 1 && activeSection < sections.length - 1 ? (
                    <button onClick={() => setActiveSection(s => Math.min(sections.length - 1, s + 1))}
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90"
                      style={{ background: NAVY }}>
                      Next →
                    </button>
                  ) : (
                    <button onClick={handleSubmit} disabled={submitting}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                      style={{ background: GREEN }}>
                      {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      {submitting ? 'Submitting…' : 'Submit Form'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </LangContext.Provider>
        )}
      </div>
    </div>
  )
}
