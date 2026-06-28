import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Save, Send, AlertTriangle, CheckCircle2, Clock, Loader2, X } from 'lucide-react'
import api from '../../api/client'
import { LangContext, isFieldVisible, getCompletionPct, FieldRenderer, ScoreCard, AlertCard } from './formEngine'

// ─── Section/field layout maps (Tailwind-safe — literal class strings only) ────
// Do NOT build these via `grid-cols-${n}` template strings; Tailwind purges those.
const COLS = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }
const SPAN = { 1: 'col-span-1', 2: 'col-span-2', 3: 'col-span-3', 4: 'col-span-4', full: 'col-span-full' }
// Wide field types always span the full row regardless of their col_span.
const WIDE = new Set(['textarea', 'table', 'body_map', 'signature', 'rich_text', 'divider', 'scale', 'checkbox', 'repeating_section', 'photo', 'file', 'matrix'])
const spanFor = (field, layout) => WIDE.has(field.type) ? SPAN.full : (SPAN[Math.min(field.col_span || 1, layout || 1)] || SPAN[1])

// ─── Main FormFiller ──────────────────────────────────────────────────────────

export default function FormFiller() {
  const { assignmentId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const patientIdFromUrl = searchParams.get('patient_id')
  const draftKey = `form_draft_${assignmentId}`

  const [state, setState] = useState({
    schema: null,
    formMeta: null,
    assignment: null,
    values: {},
    errors: {},
    touched: {},
    submitting: false,
    submitted: false,
    submissionId: null,
    scores: null,
    alerts: [],
    draftSaved: false,
    activeSection: 0,
    showNormalMacro: false,
  })

  const [lang, setLang] = useState('en')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [hasDraft, setHasDraft] = useState(false)
  const [draftValues, setDraftValues] = useState(null)
  const [prevSubmission, setPrevSubmission] = useState(null)
  const [showPrevBanner, setShowPrevBanner] = useState(false)
  const [timeLimitSecs, setTimeLimitSecs] = useState(null)
  const lastSaveRef = useRef({})
  const autoSaveRef = useRef(null)

  const update = (patch) => setState(s => ({ ...s, ...patch }))

  // ── Server draft (PowerForm save-states) ──────────────────────────────────
  // The localStorage draft above is a crash-recovery mirror; this persists the
  // same in-progress values to the backend (is_draft=true upsert) so a draft
  // survives a reload or a different device, and `Submit` signs that same row.
  const draftIdRef = useRef(null)
  const stateRef   = useRef(state)
  stateRef.current = state

  const postServerDraft = useCallback(async (isDraft) => {
    const a = stateRef.current.assignment
    if (!a?.form_id || !a?.patient_id) return null
    const res = await api.post(`/assessment-forms/${a.form_id}/submit`, {
      submission_id: draftIdRef.current || undefined,
      patient_id:    a.patient_id,
      encounter_id:  a.admission_id,
      form_data:     stateRef.current.values,
      is_draft:      isDraft,
      source:        'provider',
    })
    if (res?.submission_id) draftIdRef.current = res.submission_id
    return res
  }, [])

  // Load assignment + form schema
  useEffect(() => {
    async function load() {
      try {
        const form = await api.get(`/assessment-forms/${assignmentId}`)
        const schema = form.schema || {}
        const sections = schema?.sections || []

        const assignment = {
          form_id:        form.id,
          patient_id:     patientIdFromUrl || null,
          appointment_id: null,
          admission_id:   null,
          patient_name:   null,
          bhid:           null,
          priority:       null,
        }

        // Check localStorage draft
        const saved = localStorage.getItem(draftKey)
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            setDraftValues(parsed)
            setHasDraft(true)
          } catch {}
        }

        // Time limit
        if (form.time_limit_minutes) {
          setTimeLimitSecs(form.time_limit_minutes * 60)
        }

        update({
          assignment,
          formMeta: {
            title:          form.title,
            category:       form.category,
            scoring_config: form.scoring_config,
            alert_rules:    form.alert_rules,
            accent:         schema?.theme?.accent || null,
          },
          schema: { sections },
        })

        // Resume an in-progress SERVER draft (authoritative over the localStorage mirror).
        if (patientIdFromUrl && form.id) {
          try {
            const dr = await api.get(`/assessment-forms/${form.id}/draft`, { params: { patient_id: patientIdFromUrl } })
            const d = dr?.draft
            if (d) {
              draftIdRef.current = d.submission_id
              if (d.form_data && Object.keys(d.form_data).length) {
                update({ values: d.form_data })
                setHasDraft(false)   // server draft wins — hide the local resume banner
              }
            }
          } catch { /* no draft is the normal case */ }
        }

        // Fetch prev submission for carry-forward (by form + patient)
        if (patientIdFromUrl && form.id) {
          try {
            const prevRes = await api.get(`/assessment-forms/${form.id}/submissions`, {
              params: { patient_id: patientIdFromUrl, limit: 1, include_data: true },
            })
            const submissions = prevRes?.items || []
            if (submissions.length > 0) {
              setPrevSubmission(submissions[0])
              setShowPrevBanner(true)
            }
          } catch {}
        }
      } catch (err) {
        setLoadError(err?.message || 'Failed to load form')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [assignmentId])

  // Countdown timer
  useEffect(() => {
    if (!timeLimitSecs) return
    const interval = setInterval(() => {
      setTimeLimitSecs(s => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [!!timeLimitSecs])

  // Auto-save draft every 30s
  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      if (stateRef.current.submitted) return   // form is signed — stop autosaving
      const current = state.values
      if (JSON.stringify(current) !== JSON.stringify(lastSaveRef.current)) {
        localStorage.setItem(draftKey, JSON.stringify(current))
        lastSaveRef.current = current
        postServerDraft(true).catch(() => {})   // mirror the autosave to the backend
      }
    }, 30000)
    return () => clearInterval(autoSaveRef.current)
  }, [state.values])

  const setFieldValue = useCallback((fieldId, val) => {
    setState(s => ({ ...s, values: { ...s.values, [fieldId]: val }, touched: { ...s.touched, [fieldId]: true } }))
  }, [])

  const saveDraft = async () => {
    localStorage.setItem(draftKey, JSON.stringify(state.values))
    try { await postServerDraft(true) } catch { /* keep the local mirror on failure */ }
    update({ draftSaved: true })
    setTimeout(() => update({ draftSaved: false }), 2000)
  }

  const fillNormal = (sectionIdx) => {
    const section = state.schema?.sections?.[sectionIdx]
    if (!section) return
    const newVals = { ...state.values }
    for (const f of section.fields || []) {
      if (!isFieldVisible(f, newVals)) continue
      if (f.type === 'number' && f.reference_range) {
        const { normal_low, normal_high } = f.reference_range
        if (normal_low !== undefined && normal_high !== undefined) {
          newVals[f.id] = ((Number(normal_low) + Number(normal_high)) / 2).toFixed(1)
        }
      } else if ((f.type === 'text' || f.type === 'textarea') && f.required) {
        newVals[f.id] = newVals[f.id] || 'Normal'
      }
    }
    setState(s => ({ ...s, values: newVals }))
  }

  const validateAll = () => {
    const errors = {}
    for (const section of state.schema?.sections || []) {
      for (const field of section.fields || []) {
        if (!isFieldVisible(field, state.values)) continue
        if (field.type === 'label' || field.type === 'divider' || field.type === 'calculated') continue
        if (field.required) {
          const v = state.values[field.id]
          if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
            errors[field.id] = `${field.label} is required`
          }
        }
        if (field.type === 'number' && state.values[field.id] !== '' && state.values[field.id] !== undefined) {
          const v = Number(state.values[field.id])
          if (field.min !== undefined && v < field.min) errors[field.id] = `Minimum value is ${field.min}`
          if (field.max !== undefined && v > field.max) errors[field.id] = `Maximum value is ${field.max}`
        }
      }
    }
    return errors
  }

  const handleSubmit = async () => {
    const errors = validateAll()
    if (Object.keys(errors).length > 0) {
      setState(s => ({ ...s, errors, touched: Object.fromEntries(Object.keys(errors).map(k => [k, true])) }))
      // Scroll to first error
      const firstErrId = Object.keys(errors)[0]
      document.getElementById(`field-${firstErrId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    const a = state.assignment
    if (!a?.patient_id) {
      update({ errors: { _submit: 'No patient is linked to this form — cannot submit.' } })
      return
    }
    update({ submitting: true })
    try {
      // is_draft:false signs the in-progress draft (same row) and fires alerts + iView.
      const res = await postServerDraft(false)
      localStorage.removeItem(draftKey)
      draftIdRef.current = null
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
      update({
        submitting:   false,
        submitted:    true,
        submissionId: res?.submission_id,
        scores:       scoresArr,
        alerts:       res?.alerts_fired || [],
      })
    } catch (err) {
      update({ submitting: false, errors: { _submit: err?.message || 'Submission failed' } })
    }
  }

  const loadPrevValues = () => {
    const prevData = prevSubmission?.form_data || prevSubmission?.data
    if (prevData) {
      setState(s => ({ ...s, values: { ...prevData } }))
    }
    setShowPrevBanner(false)
  }

  // ── Render ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 size={36} className="animate-spin text-[#0F2557]" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <AlertTriangle size={40} className="text-red-400 mx-auto mb-3" />
          <p className="text-gray-600">{loadError}</p>
          <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-[#0F2557] text-white rounded-xl text-sm">Go Back</button>
        </div>
      </div>
    )
  }

  const { assignment, formMeta, schema, values, errors, activeSection, submitted, submitting, scores, alerts, draftSaved } = state
  const sections = schema?.sections || []
  const completionPct = getCompletionPct(sections, values)

  // ── Submitted result view ──
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-green-200 p-6 mb-4 text-center">
            <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-[#0F2557]">Form Submitted Successfully</h2>
            <p className="text-sm text-gray-500 mt-1">{formMeta?.title} has been charted.</p>
          </div>

          {scores && scores.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Assessment Scores</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {scores.map((sc, i) => <ScoreCard key={i} score={sc} />)}
              </div>
            </div>
          )}

          {alerts && alerts.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1">
                <AlertTriangle size={14} /> Critical Alerts
              </h3>
              <div className="space-y-2">
                {alerts.map((a, i) => <AlertCard key={i} alert={a} />)}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {state.submissionId && (
              <button
                onClick={() => navigate(`/forms/submission/${state.submissionId}`)}
                className="flex-1 py-3 rounded-xl border border-[#0F2557] text-[#0F2557] text-sm font-semibold hover:bg-[#0F2557]/5 transition"
              >
                View Submission
              </button>
            )}
            <button
              onClick={() => navigate(assignment?.patient_id ? `/patients/${assignment.patient_id}` : '/forms')}
              className="flex-1 py-3 rounded-xl bg-[#0F2557] text-white text-sm font-semibold hover:bg-[#0F2557]/90 transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60), s = secs % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  return (
    <LangContext.Provider value={{ lang, translations: formMeta?.translations || null }}>
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 transition">
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-bold text-[#0F2557] truncate">{formMeta?.title}</h1>
              {formMeta?.category && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 capitalize">{formMeta.category}</span>
              )}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                {['en', 'hi', 'te'].map(l => (
                  <button key={l} onClick={() => setLang(l)}
                    className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${lang === l ? 'bg-white text-[#0F2557] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {l === 'en' ? 'EN' : l === 'hi' ? 'हि' : 'తె'}
                  </button>
                ))}
              </div>
              {assignment?.priority && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold uppercase ${
                  assignment.priority === 'stat' ? 'bg-red-100 text-red-700' : assignment.priority === 'urgent' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                }`}>{assignment.priority}</span>
              )}
            </div>
            {assignment?.patient_name && (
              <p className="text-xs text-gray-500 mt-0.5">
                {assignment.patient_name}
                {assignment.bhid && <span className="font-mono ml-1 text-gray-400">#{assignment.bhid}</span>}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {timeLimitSecs !== null && (
              <span className={`flex items-center gap-1 text-xs font-mono font-semibold px-2 py-1 rounded-lg ${timeLimitSecs < 300 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                <Clock size={12} />
                {formatTime(timeLimitSecs)}
              </span>
            )}
            <button
              onClick={saveDraft}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              <Save size={14} />
              {draftSaved ? 'Saved!' : 'Save Draft'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F5821E] text-white text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-60"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Submit
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-1 bg-[#0F2557] transition-all duration-500"
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <div className="max-w-4xl mx-auto px-4 py-1 flex justify-end">
          <span className="text-xs text-gray-400">{completionPct}% complete</span>
        </div>
      </div>

      {/* Banners */}
      <div className="max-w-4xl mx-auto w-full px-4 mt-4 space-y-2">
        {hasDraft && draftValues && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
            <span className="text-amber-800">You have a saved draft for this form.</span>
            <div className="flex gap-2">
              <button
                onClick={() => { setState(s => ({ ...s, values: draftValues })); setHasDraft(false) }}
                className="px-3 py-1 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 transition"
              >
                Resume Draft
              </button>
              <button onClick={() => setHasDraft(false)} className="text-amber-500 hover:text-amber-700">
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {showPrevBanner && prevSubmission && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm">
            <span className="text-blue-800">
              Previous answers from {new Date(prevSubmission.submitted_at || prevSubmission.created_at).toLocaleDateString()} available
            </span>
            <div className="flex gap-2">
              <button onClick={loadPrevValues} className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition">Load</button>
              <button onClick={() => setShowPrevBanner(false)} className="text-blue-400 hover:text-blue-600"><X size={16} /></button>
            </div>
          </div>
        )}

        {errors._submit && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertTriangle size={16} />
            {errors._submit}
          </div>
        )}
      </div>

      {/* Section tabs */}
      {sections.length > 1 && (
        <div className="max-w-4xl mx-auto w-full px-4 mt-4">
          <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 overflow-x-auto">
            {sections.map((s, i) => (
              <button
                key={i}
                onClick={() => update({ activeSection: i })}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  activeSection === i ? 'bg-[#0F2557] text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {i + 1}. {s.title || s.name || `Section ${i + 1}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form sections */}
      <div className="max-w-4xl mx-auto w-full px-4 py-6 flex-1">
        {sections.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-gray-400" />
            </div>
            <h3 className="text-base font-bold text-gray-700 mb-2">No form sections configured</h3>
            <p className="text-sm text-gray-400 mb-6">This assessment form has no fields yet. Ask your admin to configure sections and fields in the Form Builder.</p>
            <button onClick={() => navigate(-1)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
              Go Back
            </button>
          </div>
        )}
        {sections.map((section, si) => {
          if (sections.length > 1 && si !== activeSection) return null
          const layout = section.layout || 1
          const accent = formMeta?.accent
          const headColor = section.header_color || accent || '#0F2557'
          const headTint = (section.header_color || accent) ? (section.header_color || accent) + '1f' : undefined
          return (
            <div key={si} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <div
                className="flex items-center justify-between mb-5 -mx-2 px-2 py-1.5 rounded-lg"
                style={{ background: headTint }}
              >
                <h2 className="text-lg font-bold" style={{ color: headColor }}>
                  {section.title || section.name || `Section ${si + 1}`}
                </h2>
                <button
                  type="button"
                  onClick={() => fillNormal(si)}
                  className="px-3 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition"
                >
                  Fill Normal
                </button>
              </div>

              <div className={`grid gap-4 ${COLS[layout] || COLS[1]}`}>
                {(section.fields || []).map(field => {
                  const visible = isFieldVisible(field, values)
                  if (!visible) return null
                  return (
                    <div
                      key={field.id}
                      id={`field-${field.id}`}
                      className={spanFor(field, layout)}
                      style={{
                        borderLeft: field.color ? '3px solid ' + field.color : undefined,
                        paddingLeft: field.color ? 8 : undefined,
                      }}
                    >
                      <FieldRenderer
                        field={field}
                        value={values[field.id]}
                        onChange={v => setFieldValue(field.id, v)}
                        error={state.touched[field.id] ? errors[field.id] : undefined}
                        allValues={values}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Section navigation */}
        {sections.length > 1 && (
          <div className="flex justify-between">
            <button
              onClick={() => update({ activeSection: Math.max(0, activeSection - 1) })}
              disabled={activeSection === 0}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-white transition disabled:opacity-40"
            >
              ← Previous
            </button>
            {activeSection < sections.length - 1 ? (
              <button
                onClick={() => update({ activeSection: activeSection + 1 })}
                className="px-4 py-2 rounded-xl bg-[#0F2557] text-white text-sm font-semibold hover:bg-[#0F2557]/90 transition"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 rounded-xl bg-[#F5821E] text-white text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Submit Form'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
    </LangContext.Provider>
  )
}
