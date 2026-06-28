/**
 * @shared-pool
 * useFormDraft — PowerForm "save-states" for DB assessment forms.
 *
 * One small hook that gives every form renderer the same three behaviours:
 *   1. a localStorage crash-recovery mirror of the in-progress values,
 *   2. a debounced server autosave (is_draft=true upsert) while editing,
 *   3. a human-readable save status + timestamp.
 *
 * It is deliberately portal-agnostic: it never imports an api client and never
 * owns the form `values`. The caller injects a `saveFn` closure that performs
 * the actual is_draft=true POST using its own state + api client, and calls
 * `markDirty(values)` on every edit. This keeps provider and carechart — which
 * have different api clients and different field-id keying — on one code path.
 *
 * Typical wiring:
 *   const draftIdRef = useRef(null)
 *   const draft = useFormDraft({
 *     mirrorKey: draftMirrorKey(formId, patientId),
 *     enabled:   ready && !!patientId,
 *     saveFn:    async () => {
 *       const res = await api.post(`/assessment-forms/${formId}/submit`, {
 *         submission_id: draftIdRef.current || undefined,
 *         patient_id, form_data: valuesRef.current, is_draft: true,
 *       })
 *       if (res?.submission_id) draftIdRef.current = res.submission_id
 *     },
 *   })
 *   // onChange:  setValues(next); draft.markDirty(next)
 *   // Save btn:  draft.flush()
 *   // Sign:      post is_draft:false with draftIdRef.current; then draft.clearMirror()
 */
import { useCallback, useEffect, useRef, useState } from 'react'

const MIRROR_PREFIX = 'bhs_formdraft_'

/** Stable localStorage key for a (form, patient[, scope]) mirror. */
export function draftMirrorKey(formId, patientId, scope = '') {
  return `${MIRROR_PREFIX}${formId ?? 'x'}_${patientId ?? 'x'}${scope ? '_' + scope : ''}`
}

/** Short label for the save-status pill. */
export function saveStatusLabel(status, savedAt) {
  if (status === 'saving') return 'Saving…'
  if (status === 'dirty')  return 'Unsaved changes'
  if (status === 'error')  return 'Save failed'
  if (status === 'saved') {
    if (!savedAt) return 'Draft saved'
    const s = Math.max(0, Math.round((Date.now() - savedAt) / 1000))
    if (s < 5)  return 'Draft saved'
    if (s < 60) return `Saved ${s}s ago`
    return `Saved ${Math.round(s / 60)}m ago`
  }
  return ''
}

export default function useFormDraft({ mirrorKey, enabled, saveFn, debounceMs = 15000 }) {
  const [status,   setStatus]   = useState('idle')   // idle | dirty | saving | saved | error
  const [savedAt,  setSavedAt]  = useState(null)
  const [recovery, setRecovery] = useState(null)     // { values, ts } found at mount, or null

  const timer      = useRef(null)
  const saveRef    = useRef(saveFn)
  saveRef.current  = saveFn                           // always call the freshest closure
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled                        // live gate read by a fired timer

  // Read any pre-existing mirror ONCE at mount (recovers a prior session that
  // crashed between autosaves). Captured before the write effect overwrites it.
  useEffect(() => {
    if (!mirrorKey) return
    try {
      const raw = window.localStorage.getItem(mirrorKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && parsed.values && Object.keys(parsed.values).length) setRecovery(parsed)
      }
    } catch { /* corrupt mirror — ignore */ }
  }, [mirrorKey])

  const mirrorRef = useRef(mirrorKey)
  mirrorRef.current = mirrorKey

  const clearMirror = useCallback(() => {
    try { if (mirrorRef.current) window.localStorage.removeItem(mirrorRef.current) } catch { /* ignore */ }
  }, [])

  const cancelPending = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
  }, [])

  const runSave = useCallback(async () => {
    if (!enabledRef.current || !saveRef.current) return  // a stale timer must not save after disable (e.g. post-sign)
    setStatus('saving')
    try {
      await saveRef.current()
      setStatus('saved'); setSavedAt(Date.now())
      clearMirror()                                   // server now has it — mirror only holds unsaved edits
    } catch {
      setStatus('error')                              // keep the mirror; a retry/flush can recover
    }
  }, [clearMirror])

  // Call on every user edit: mirror immediately, then (re)schedule a debounced save.
  const markDirty = useCallback((values) => {
    if (mirrorKey) {
      try { window.localStorage.setItem(mirrorKey, JSON.stringify({ values, ts: Date.now() })) } catch { /* quota/private mode */ }
    }
    if (!enabled) return
    setStatus('dirty')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { timer.current = null; runSave() }, debounceMs)
  }, [mirrorKey, enabled, debounceMs, runSave])

  // Save immediately (explicit "Save draft" button, or before leaving).
  const flush = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    await runSave()
  }, [runSave])

  const applyRecovery = useCallback(() => {
    const v = recovery?.values || null
    setRecovery(null)
    return v
  }, [recovery])

  const dismissRecovery = useCallback(() => { setRecovery(null); clearMirror() }, [clearMirror])

  const setSaved = useCallback(() => { setStatus('saved'); setSavedAt(Date.now()) }, [])

  // Cancel any pending autosave the moment the form is disabled (e.g. after Sign,
  // when a fired timer would otherwise write a stray draft of signed data).
  useEffect(() => { if (!enabled) cancelPending() }, [enabled, cancelPending])

  // Cancel a pending autosave if the component unmounts.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return { status, savedAt, recovery, markDirty, flush, cancelPending, applyRecovery, dismissRecovery, clearMirror, setSaved }
}
