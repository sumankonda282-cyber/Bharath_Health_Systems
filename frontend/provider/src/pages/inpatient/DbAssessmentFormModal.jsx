import { useState, useEffect, useRef } from 'react'
import { X, Loader2, AlertTriangle, CheckCircle2, FileText, ChevronDown, ChevronRight, Save, RotateCcw, CheckCheck, Copy } from 'lucide-react'
import api from '../../api/client'
import {
  LangContext, FieldRenderer, ScoreCard, AlertCard,
  isFieldVisible, getCompletionPct, PatientDataContext,
} from '../forms/formEngine'
import useFormDraft, { draftMirrorKey, saveStatusLabel } from '@shared/hooks/useFormDraft'
import { computeNormalFill } from '@shared/forms/normalFill'
import { sectionHasLayout, buildRowMap, sectionGridStyle, gridCellStyle } from '@shared/forms/gridLayout'

const NAVY  = '#0F2557'
const GREEN = '#059669'

// ─── Section/field layout maps (Tailwind-safe — literal class strings only) ────
// Do NOT build these via `grid-cols-${n}` template strings; Tailwind purges those.
const COLS = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }
const SPAN = { 1: 'col-span-1', 2: 'col-span-2', 3: 'col-span-3', 4: 'col-span-4', full: 'col-span-full' }
// Wide field types always span the full row regardless of their col_span.
const WIDE = new Set(['textarea', 'table', 'body_map', 'signature', 'rich_text', 'divider', 'scale', 'checkbox', 'repeating_section', 'photo', 'file', 'matrix'])
const spanFor = (field, layout) => WIDE.has(field.type) ? SPAN.full : (SPAN[Math.min(field.col_span || 1, layout || 1)] || SPAN[1])

// ─────────────────────────────────────────────────────────────────────────────
// In-chart assessment-form modal (admin-built / DB forms).
//
// Opens over the inpatient chart — same shell layout as CareChart's assessment
// modal — and renders the form's schema inline so the clinician fills and
// submits without leaving the chart. Provider is PIN-free, so there is no PIN
// gate. Submission is scoped to the patient + admission and the authenticated
// staff member server-side.
// ─────────────────────────────────────────────────────────────────────────────

export default function DbAssessmentFormModal({ form, patientId, admissionId, encounterId, patientName, onClose, onSubmitted, variant = 'modal' }) {
  const [schema,    setSchema]    = useState(null)   // { sections: [...] }
  const [meta,      setMeta]      = useState(null)   // { title, category, ... }
  const [values,    setValues]    = useState({})
  const [errors,    setErrors]    = useState({})
  const [touched,   setTouched]   = useState({})
  const [activeSection, setActiveSection] = useState(0)

  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [submitting, setSubmitting] = useState(false)   // signing / finalizing
  const [savingDraft, setSavingDraft] = useState(false) // explicit "Save draft"
  const [submitted, setSubmitted] = useState(false)
  const [scores,    setScores]    = useState([])
  const [alerts,    setAlerts]    = useState([])

  // Draft save-state: the server row id once a draft exists, and a live ref to
  // values so the autosave closure always posts the latest edits.
  const draftIdRef = useRef(null)
  const valuesRef  = useRef(values)
  valuesRef.current = values

  const title = meta?.title || form?.title || form?.name || 'Assessment Form'
  // Read-only when opened from a closed session (OPD completed / cancelled).
  // No editing, no submit — the form is a record to view, not amend.
  const readOnly = !!form?.readOnly

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
          accent:         f?.schema?.theme?.accent || null,
        })
      })
      .catch(err => { if (alive) setLoadError(err?.message || 'Failed to load form') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [form?.id])

  const sections = schema?.sections || []
  const completionPct = getCompletionPct(sections, values)

  // ── PowerForm save-states: localStorage mirror + debounced server autosave ──
  const ready = !loading && !loadError && !submitted && sections.length > 0
  const draft = useFormDraft({
    mirrorKey: (form?.id && patientId) ? draftMirrorKey(form.id, patientId, admissionId || '') : null,
    enabled:   ready && !!patientId,
    saveFn:    async () => {
      const res = await api.post(`/assessment-forms/${form.id}/submit`, {
        submission_id: draftIdRef.current || undefined,
        patient_id:    patientId,
        admission_id:  admissionId ? Number(admissionId) : null,
        encounter_id:  encounterId || undefined,
        form_data:     valuesRef.current,
        is_draft:      true,
        source:        'provider',
      })
      if (res?.submission_id) draftIdRef.current = res.submission_id
    },
  })

  // Resume an in-progress draft for this patient (server-side; survives reload).
  useEffect(() => {
    if (!form?.id || !patientId) return
    let alive = true
    api.get(`/assessment-forms/${form.id}/draft`, {
      params: { patient_id: patientId, admission_id: admissionId ? Number(admissionId) : undefined },
    })
      .then(r => {
        if (!alive) return
        const d = r?.draft
        if (!d) return
        draftIdRef.current = d.submission_id
        if (d.form_data && Object.keys(d.form_data).length) {
          setValues(v => (Object.keys(v).length ? v : d.form_data))
        }
      })
      .catch(() => { /* no draft is the normal case */ })
    return () => { alive = false }
  }, [form?.id, patientId, admissionId])

  const setFieldValue = (fieldId, val) => {
    const next = { ...valuesRef.current, [fieldId]: val }
    setValues(next)
    setTouched(t => ({ ...t, [fieldId]: true }))
    draft.markDirty(next)
  }

  const handleSaveDraft = async () => {
    if (!patientId) { setErrors({ _submit: 'No patient is linked to this admission — cannot save.' }); return }
    setErrors({})
    setSavingDraft(true)
    try { await draft.flush() } finally { setSavingDraft(false) }
  }

  const handleRestore = () => {
    const recovered = draft.applyRecovery()
    if (recovered && typeof recovered === 'object') setValues(v => ({ ...v, ...recovered }))
  }

  // ── Speed: mark-all-normal + carry-forward from the last visit ──
  const handleMarkNormal = () => {
    const patch = computeNormalFill(sections, valuesRef.current, { keyOf: f => f.id, isVisible: isFieldVisible })
    if (!Object.keys(patch).length) return
    const next = { ...valuesRef.current, ...patch }
    setValues(next)
    draft.markDirty(next)
  }

  const [lastSub, setLastSub] = useState(null)
  useEffect(() => {
    if (!form?.id || !patientId) return
    let alive = true
    api.get(`/assessment-forms/${form.id}/submissions`, { params: { patient_id: patientId, limit: 1, include_data: true } })
      .then(r => { if (alive && r?.items?.length) setLastSub(r.items[0]) })
      .catch(() => { /* no prior submission is normal */ })
    return () => { alive = false }
  }, [form?.id, patientId])

  const handleCarryForward = () => {
    if (!lastSub?.form_data) return
    const merged = { ...lastSub.form_data, ...valuesRef.current }  // last fills blanks; entered values win
    setValues(merged)
    draft.markDirty(merged)
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
    draft.cancelPending()   // no autosave may fire mid-sign (would create a stray draft)
    setSubmitting(true)
    try {
      // patient_id is required server-side; admission_id is a plain int column.
      // clinic_id / branch_id / submitted_by are taken from the auth token.
      // is_draft:false promotes any in-progress draft to a signed record and
      // fires alerts + iView; submission_id continues the same draft row.
      const payload = {
        submission_id: draftIdRef.current || undefined,
        patient_id:   patientId,
        admission_id: admissionId ? Number(admissionId) : null,
        encounter_id: encounterId || undefined,
        form_data:    values,
        is_draft:     false,
        source:       'provider',
      }
      const res = await api.post(`/assessment-forms/${form.id}/submit`, payload)
      draft.clearMirror()
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
      setScores(scoresArr)
      setAlerts(res?.alerts_fired || [])
      setSubmitted(true)
      // Let a host (e.g. the OPD desk) turn orderable fields into chart orders.
      try { onSubmitted?.({ form, schema, formData: values, result: res }) } catch { /* host hook must never break the submit */ }
    } catch (err) {
      setErrors({ _submit: err?.message || 'Submission failed' })
    } finally {
      setSubmitting(false)
    }
  }

  const isInline = variant === 'inline'

  const body = (
    <div
      className={isInline
        ? 'flex flex-col bg-white h-full overflow-hidden'
        : 'flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden'}
      style={isInline ? undefined : { width: '70vw', height: '80vh', maxWidth: 1100 }}
    >

        {/* Header — single row: form name · patient, with completion + close */}
        <div className="flex-shrink-0 relative border-b shadow-sm"
          style={{ background: NAVY, borderColor: '#1e3a6e' }}>
          <div className="flex items-center justify-between gap-4 px-6 py-3">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="text-base font-extrabold text-white leading-tight truncate">{title}</span>
              {patientName && (
                <span className="text-[13px] text-blue-200 truncate before:content-['·'] before:mr-2 before:text-blue-400">
                  {patientName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {!loading && !loadError && !submitted && (
                <span className="hidden sm:flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-lg"
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
          {/* Thin progress bar */}
          {!loading && !loadError && !submitted && (
            <div className="absolute bottom-0 left-0 h-[3px] bg-white/15 w-full">
              <div className="h-full transition-all duration-300" style={{ width: `${completionPct}%`, background: '#34d399' }} />
            </div>
          )}
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
              {/* Fields — all sections stacked vertically, scroll down. No tabs, no paging.
                  A disabled fieldset makes every control read-only in one shot. */}
              <div className="flex-1 overflow-y-auto px-6 py-5" style={{ background: '#f1f5f9' }}>
                <fieldset disabled={readOnly} className="max-w-5xl mx-auto space-y-4 border-0 p-0 m-0 min-w-0">
                  {readOnly && (
                    <div className="mb-2 px-3 py-1.5 rounded-lg bg-gray-100 text-[11px] font-medium text-gray-500 text-center">
                      Read-only — this visit is closed. Submitted record cannot be edited.
                    </div>
                  )}
                  {/* Speed actions — edit-only, hidden in read-only */}
                  {!readOnly && (
                  <div className="flex items-center justify-end gap-2 mb-1">
                    {lastSub && (
                      <button onClick={handleCarryForward}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
                        title={lastSub.submitted_at ? `From ${new Date(lastSub.submitted_at).toLocaleDateString()}` : 'Copy from last visit'}>
                        <Copy size={12} /> Copy from last visit
                      </button>
                    )}
                    <button onClick={handleMarkNormal}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-200 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50">
                      <CheckCheck size={12} /> Mark all normal
                    </button>
                  </div>
                  )}
                  {draft.recovery && (
                    <div className="flex items-center justify-between gap-3 mb-3 px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50">
                      <span className="text-xs text-amber-800 flex items-center gap-1.5 min-w-0">
                        <RotateCcw size={13} className="shrink-0" />
                        Unsaved changes from a previous session were found.
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={handleRestore}
                          className="px-3 py-1 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600">
                          Restore
                        </button>
                        <button onClick={draft.dismissRecovery} className="text-amber-500 hover:text-amber-700" aria-label="Discard recovered changes">
                          <X size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                  {sections.map((section, si) => {
                    return (
                      <SectionBody
                        key={section.id || si}
                        section={section}
                        index={si}
                        tabbed={false}
                        accent={meta?.accent}
                        values={values}
                        errors={errors}
                        touched={touched}
                        setFieldValue={setFieldValue}
                      />
                    )
                  })}
                </fieldset>
              </div>

              {/* Footer — read-only shows only a Close action, no submit/draft */}
              {readOnly ? (
                <div className="flex-shrink-0 border-t px-6 py-3.5 flex items-center justify-end gap-3"
                  style={{ borderColor: '#e9eaec', background: '#f9fafb' }}>
                  <button onClick={onClose}
                    className="px-5 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90"
                    style={{ background: NAVY }}>
                    Close
                  </button>
                </div>
              ) : (
              <div className="flex-shrink-0 border-t px-6 py-3.5 flex items-center justify-between gap-3"
                style={{ borderColor: '#e9eaec', background: '#f9fafb' }}>
                {errors._submit ? (
                  <span className="text-xs text-red-600 flex items-center gap-1 min-w-0 truncate">
                    <AlertTriangle size={13} className="shrink-0" />{errors._submit}
                  </span>
                ) : (
                  <span className={`text-xs flex items-center gap-1.5 min-w-0 truncate ${
                    draft.status === 'error' ? 'text-red-500'
                    : draft.status === 'saving' ? 'text-blue-500'
                    : draft.status === 'saved' ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {draft.status === 'saving' && <Loader2 size={12} className="animate-spin shrink-0" />}
                    {saveStatusLabel(draft.status, draft.savedAt) || 'Charting to this admission'}
                  </span>
                )}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={handleSaveDraft} disabled={savingDraft || submitting}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                    {savingDraft ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    Save draft
                  </button>
                  <button onClick={handleSubmit} disabled={submitting || savingDraft}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                    style={{ background: GREEN }}>
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {submitting ? 'Signing…' : 'Sign & Submit'}
                  </button>
                </div>
              </div>
              )}
            </div>
          </LangContext.Provider>
        )}
    </div>
  )

  return (
    <PatientDataContext.Provider value={{ patientId }}>
      {isInline ? body : (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,37,87,0.6)' }}>
          {body}
        </div>
      )}
    </PatientDataContext.Provider>
  )
}

// ─── One stacked section: header tint + colour, collapsible, column grid ───────
function SectionBody({ section, index, tabbed, accent, values, errors, touched, setFieldValue }) {
  const layout = section.layout || 1
  const headColor = section.header_color || accent || NAVY
  const headTint = (section.header_color || accent) ? (section.header_color || accent) + '1f' : undefined
  // Collapsible only applies to stacked (non-tabbed) sections.
  const canCollapse = !tabbed && !!section.collapsible
  const [collapsed, setCollapsed] = useState(!!section.collapsed)
  const open = !canCollapse || !collapsed
  const headTitle = section.title || section.name || `Section ${index + 1}`

  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-sm" style={{ borderLeft: `3px solid ${headColor}` }}>
      {/* Section heading — always shown, navy, sticky while its own fields scroll */}
      <div
        className={`sticky top-0 z-10 flex items-center gap-2 px-4 py-2.5 rounded-t-xl border-b border-slate-100 bg-white ${canCollapse ? 'cursor-pointer select-none' : ''}`}
        onClick={canCollapse ? () => setCollapsed(c => !c) : undefined}
        role={canCollapse ? 'button' : undefined}
      >
        {canCollapse && (
          open ? <ChevronDown size={16} style={{ color: headColor }} /> : <ChevronRight size={16} style={{ color: headColor }} />
        )}
        <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: headColor }}>
          {headTitle}
        </h3>
      </div>

      {open && (() => {
        // CareForm free-grid placement (design = fill); legacy flow fallback.
        const visible = (section.fields || []).filter(f => isFieldVisible(f, values))
        const useGrid = sectionHasLayout(section.fields)
        const rowMap  = useGrid ? buildRowMap(visible) : null
        return (
          <div className="px-4 py-4">
          <div className={useGrid ? '' : `grid gap-x-5 gap-y-3 ${COLS[layout] || COLS[1]}`} style={useGrid ? sectionGridStyle : undefined}>
            {visible.map(field => (
              <div
                key={field.id}
                id={`dbform-field-${field.id}`}
                className={useGrid ? undefined : spanFor(field, layout)}
                style={{
                  ...(useGrid ? gridCellStyle(field, rowMap) : {}),
                  borderLeft: field.color ? '3px solid ' + field.color : undefined,
                  paddingLeft: field.color ? 8 : undefined,
                }}
              >
                <FieldRenderer
                  field={field}
                  value={values[field.id]}
                  onChange={v => setFieldValue(field.id, v)}
                  error={touched[field.id] ? errors[field.id] : undefined}
                  allValues={values}
                />
              </div>
            ))}
          </div>
          </div>
        )
      })()}
    </div>
  )
}
