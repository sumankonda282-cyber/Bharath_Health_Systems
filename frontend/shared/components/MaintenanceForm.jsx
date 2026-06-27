import { useState, useEffect } from 'react'
import { Wrench, X, Loader2 } from 'lucide-react'

// Reusable maintenance-request form, modelled on the CareChart ward form.
// Works portal-agnostically: pass the portal's axios `api` instance + theme accent.
//  - Manager/facility mode: pass `wards` (list) + `showCategory` for a facility-wide request.
//  - Ward-bound mode (CareChart-style): pass a fixed `wardId` + `beds`.
//  - Pass `requestPin` to PIN-gate the submit (CareChart clinical flow).

const ISSUE_TYPES = [
  { v: 'bed_mechanism', label: 'Bed mechanism / frame' },
  { v: 'electrical', label: 'Electrical / power point' },
  { v: 'lighting', label: 'Lighting / light near bed' },
  { v: 'iv_pole', label: 'IV pole / stand' },
  { v: 'call_bell', label: 'Call bell / nurse call' },
  { v: 'oxygen_suction', label: 'Oxygen / suction point' },
  { v: 'mattress', label: 'Mattress / cushion' },
  { v: 'plumbing', label: 'Plumbing / water' },
  { v: 'hvac', label: 'AC / heating / ventilation' },
  { v: 'other', label: 'Other equipment' },
]
const CATEGORIES = [
  { v: 'facility', label: 'Facility' },
  { v: 'equipment', label: 'Equipment' },
  { v: 'it_software', label: 'IT / Software' },
  { v: 'other', label: 'Other' },
]
const PRIORITIES = [
  { v: 'low', label: 'Low', color: '#6b7280', bg: '#f9fafb', border: '#d1d5db' },
  { v: 'medium', label: 'Medium', color: '#d97706', bg: '#fffbeb', border: '#d97706' },
  { v: 'high', label: 'High', color: '#dc2626', bg: '#fef2f2', border: '#dc2626' },
  { v: 'urgent', label: 'Urgent', color: '#ffffff', bg: '#dc2626', border: '#dc2626' },
]

const selCls = 'border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none bg-white w-full'

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-gray-700">{label}</label>
      {children}
    </div>
  )
}

export default function MaintenanceForm({
  api,
  endpoint = '/support/maintenance-request',
  portalSource = 'Portal',
  wards = null,
  beds: bedsProp = null,
  wardId = null,
  showCategory = false,
  requestPin = null,
  theme = {},
  onClose,
  onSubmitted,
}) {
  const accent = theme.accent || '#0F2557'
  const [form, setForm] = useState({
    category: 'facility', ward_id: wardId || '', bed: '', issue_type: '',
    floor: '', priority: 'medium', description: '',
  })
  const [beds, setBeds] = useState(bedsProp || [])
  const [submitting, setSub] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Load beds when a ward is chosen (wards-mode). Fixed beds (CareChart) take precedence.
  useEffect(() => {
    if (bedsProp) { setBeds(bedsProp); return }
    if (!form.ward_id) { setBeds([]); return }
    let alive = true
    api.get('/inpatient/beds', { params: { ward_id: form.ward_id } })
      .then(d => { if (alive) setBeds(Array.isArray(d) ? d : []) })
      .catch(() => { if (alive) setBeds([]) })
    return () => { alive = false }
  }, [form.ward_id, bedsProp, api])

  const selectedWard = wards?.find(w => String(w.id) === String(form.ward_id))

  const submit = async () => {
    if (!form.issue_type && !form.description.trim()) {
      setError('Select an issue type or describe the problem.'); return
    }
    let identity = null
    if (requestPin) {
      identity = await requestPin('Maintenance Request — confirm your identity')
      if (!identity?.verified) return
    }
    setSub(true); setError('')
    try {
      await api.post(endpoint, {
        portal_source: portalSource,
        category: form.category,
        ward_id: form.ward_id || wardId || null,
        floor: form.floor || selectedWard?.floor || null,
        bed_number: form.bed || null,
        issue_type: form.issue_type || null,
        priority: form.priority,
        description: form.description,
        ...(identity ? { submitted_by: identity.staff_id, submitted_by_name: identity.full_name } : {}),
      })
      setDone(true)
      onSubmitted && onSubmitted()
    } catch (e) {
      setError(e?.response?.data?.detail || 'Could not submit the request. Please retry.')
    } finally {
      setSub(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-[460px] max-w-[94vw] p-6 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Wrench size={15} style={{ color: accent }} />Raise Maintenance Request
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">Routed to the Maintenance Manager for review</div>
          </div>
          <button onClick={onClose} className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"><X size={12} /></button>
        </div>

        {done ? (
          <div className="flex flex-col items-center py-6 gap-3">
            <span className="text-3xl">✅</span>
            <p className="text-sm font-semibold text-gray-800">Request submitted</p>
            <p className="text-xs text-gray-500 text-center">The maintenance team has been notified.</p>
            <button onClick={onClose} className="mt-2 px-5 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: accent }}>Done</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {showCategory && (
                <Field label="Category">
                  <select className={selCls} value={form.category} onChange={e => set('category', e.target.value)}>
                    {CATEGORIES.map(c => <option key={c.v} value={c.v}>{c.label}</option>)}
                  </select>
                </Field>
              )}
              <Field label={showCategory ? 'Issue Type' : 'Issue Type *'}>
                <select className={selCls} value={form.issue_type} onChange={e => set('issue_type', e.target.value)}>
                  <option value="">Select…</option>
                  {ISSUE_TYPES.map(i => <option key={i.v} value={i.v}>{i.label}</option>)}
                </select>
              </Field>
            </div>

            {wards && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ward">
                  <select className={selCls} value={form.ward_id} onChange={e => { set('ward_id', e.target.value); set('bed', '') }}>
                    <option value="">Select ward…</option>
                    {wards.map(w => <option key={w.id} value={w.id}>{w.name}{w.floor ? ` · Floor ${w.floor}` : ''}</option>)}
                  </select>
                </Field>
                <Field label="Bed (optional)">
                  <select className={selCls} value={form.bed} onChange={e => set('bed', e.target.value)} disabled={!beds.length}>
                    <option value="">{beds.length ? 'Select bed…' : '—'}</option>
                    {beds.map(b => <option key={b.id} value={b.bed_number || b.number || b.name}>{b.bed_number || b.number || b.name}{b.status === 'maintenance' ? ' (in maintenance)' : ''}</option>)}
                  </select>
                </Field>
              </div>
            )}
            {!wards && bedsProp && (
              <Field label="Bed *">
                <select className={selCls} value={form.bed} onChange={e => set('bed', e.target.value)}>
                  <option value="">Select bed…</option>
                  {beds.map(b => <option key={b.id} value={b.bed_number || b.number || b.name}>{b.bed_number || b.number || b.name}{b.status === 'maintenance' ? ' (in maintenance)' : ''}</option>)}
                </select>
              </Field>
            )}

            <Field label="Priority">
              <div className="flex gap-2 flex-wrap">
                {PRIORITIES.map(p => (
                  <button key={p.v} type="button" onClick={() => set('priority', p.v)}
                    className="px-3 py-1 rounded-full text-[11px] font-semibold border transition-all"
                    style={{
                      color: form.priority === p.v ? p.color : '#9ca3af',
                      background: form.priority === p.v ? p.bg : 'white',
                      borderColor: form.priority === p.v ? p.border : '#e5e7eb',
                    }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Description">
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
                placeholder="Briefly describe the problem and exact location…"
                className="border border-gray-300 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none w-full" />
            </Field>

            {error && <p className="text-[11px] text-red-600">{error}</p>}

            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="px-4 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={submit} disabled={submitting}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5"
                style={{ background: accent, opacity: submitting ? 0.7 : 1 }}>
                {submitting && <Loader2 size={11} className="animate-spin" />}Submit
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
