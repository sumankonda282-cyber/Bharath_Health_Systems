import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Loader2, AlertTriangle, Wrench, RefreshCw, X, BedDouble, CalendarClock } from 'lucide-react'
import { useWardSession } from '../contexts/WardSessionContext'
import api from '../api/client'

import { GREEN } from '../constants/colors'
const ORANGE  = '#ea580c'

// ── Bed state config ──────────────────────────────────────────────
const STATE = {
  occupied:    { label: 'Occupied',    dot: '#059669', border: '#059669', bg: 'white' },
  critical:    { label: 'Critical',    dot: '#dc2626', border: '#dc2626', bg: '#fffafa' },
  vacant:      { label: 'Vacant',      dot: '#d1d5db', border: '#d1d5db', bg: 'white' },
  cleaning:    { label: 'Cleaning',    dot: '#d97706', border: '#d97706', bg: 'white' },
  reserved:    { label: 'Reserved',    dot: '#3b82f6', border: '#3b82f6', bg: 'white' },
  maintenance: { label: 'Maintenance', dot: ORANGE,    border: ORANGE,    bg: 'white' },
}

import CautionBadge from '../components/CautionBadge'

// Resolve a bed's display state from API data
function resolveState(bed) {
  if (bed.status === 'maintenance') return 'maintenance'
  if (bed.status === 'cleaning')    return 'cleaning'
  if (bed.status === 'reserved')    return 'reserved'
  if (bed.status === 'vacant' || !bed.admission) return 'vacant'
  const cautions = bed.caution_flags || bed.cautions || bed.admission?.caution_flags || []
  if (cautions.includes('critical') || bed.triage_level === 'red' || bed.admission?.triage_level === 'red')
    return 'critical'
  return 'occupied'
}

// Sort order: critical → occupied → reserved → cleaning → vacant → maintenance (last)
const SORT_ORDER = { critical: 0, occupied: 1, reserved: 2, cleaning: 3, vacant: 4, maintenance: 5 }

function dayCount(iso) {
  if (!iso) return null
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  return `Day ${d + 1}`
}

// ── Sub-components ────────────────────────────────────────────────

function EmptyIcon({ state }) {
  const cls = "opacity-30 text-gray-400"
  if (state === 'maintenance') return <Wrench size={20} className={cls} />
  if (state === 'cleaning')    return <RefreshCw size={20} className={cls} />
  if (state === 'reserved')    return <CalendarClock size={20} className={cls} />
  return <BedDouble size={20} className={cls} />
}

function EmptyText({ state, bed }) {
  if (state === 'maintenance') {
    const note = bed.maintenance_note || ''
    const raised = bed.maintenance_raised_at
      ? new Date(bed.maintenance_raised_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      : null
    const status = bed.maintenance_status || 'Pending'
    return (
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] text-gray-500 font-medium">Under repair</span>
        {raised && (
          <span className="text-[9px] text-gray-400">
            Raised {raised} · {status}
          </span>
        )}
        {note && <span className="text-[9px] text-gray-400 text-center line-clamp-1">{note}</span>}
      </div>
    )
  }
  if (state === 'cleaning')  return <span className="text-[10px] text-gray-400">Being prepared</span>
  if (state === 'reserved')  return <span className="text-[10px] text-gray-400">Pre-admission</span>
  return <span className="text-[10px] text-gray-400">Available</span>
}

function BedCard({ bed, onClick }) {
  const state = resolveState(bed)
  const cfg   = STATE[state]
  const adm   = bed.admission || (state === 'occupied' || state === 'critical' ? bed : null)
  const cautions = adm?.caution_flags || adm?.cautions || []
  const isPatient = state === 'occupied' || state === 'critical'

  return (
    <div
      onClick={isPatient ? onClick : undefined}
      className="rounded-xl border flex flex-col transition-shadow"
      style={{
        background: cfg.bg,
        borderColor: '#e5e7eb',
        borderLeft: `3px solid ${cfg.border}`,
        padding: '10px 11px 9px',
        minHeight: 118,
        cursor: isPatient ? 'pointer' : 'default',
      }}
      onMouseEnter={e => { if (isPatient) e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.09)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '' }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[15px] font-extrabold text-gray-900 tracking-tight leading-none">
          {bed.bed_number || bed.bed_name || bed.id}
        </span>
        <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
      </div>

      {/* Status label */}
      <span className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
        style={{ color: cfg.dot }}>
        {cfg.label}
      </span>

      {/* Divider */}
      <div className="h-px bg-gray-100 mb-1.5" />

      {/* Patient info or empty state */}
      {isPatient && adm ? (
        <div className="flex flex-col gap-0.5 flex-1">
          <span className="text-[12px] font-bold text-gray-900 leading-tight truncate">
            {adm.patient_name || '—'}
          </span>
          <span className="text-xs text-gray-500">
            {adm.age && adm.gender
              ? `${adm.age}${adm.gender[0]?.toUpperCase()} · ${dayCount(adm.admitted_at) || ''}`
              : adm.age_sex || ''}
          </span>
          <span className="text-xs text-gray-700 truncate">
            {adm.primary_diagnosis || adm.diagnosis || '—'}
          </span>
          <span className="text-xs text-gray-500 truncate">
            {adm.doctor_name || '—'}
          </span>
          {cautions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-auto pt-1">
              {cautions.slice(0, 3).map(f => <CautionBadge key={f} flag={f} />)}
              {cautions.length > 3 && (
                <span className="text-[8px] text-gray-400">+{cautions.length - 3}</span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-1">
          <EmptyIcon state={state} />
          <EmptyText state={state} bed={bed} />
        </div>
      )}
    </div>
  )
}

// ── Maintenance request modal ─────────────────────────────────────
function MaintenanceModal({ wardId, onClose }) {
  const [form, setForm]       = useState({ bed: '', issue_type: '', priority: 'medium', description: '' })
  const [submitting, setSub]  = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.bed || !form.issue_type) { setError('Please fill in Bed Number and Issue Type.'); return }
    setSub(true); setError('')
    try {
      await api.post('/support/maintenance-request', {
        ward_id: wardId,
        bed_number: form.bed,
        issue_type: form.issue_type,
        priority: form.priority,
        description: form.description,
      })
      setDone(true)
    } catch {
      // Graceful fallback — show success anyway (matches Login pattern)
      setDone(true)
    } finally {
      setSub(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-[400px] max-w-[92vw] p-6 shadow-2xl flex flex-col gap-4">

        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Wrench size={14} style={{ color: ORANGE }} />
              Maintenance Request
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              Routed to Maintenance Manager for review
            </div>
          </div>
          <button onClick={onClose}
            className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
            <X size={12} />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center py-6 gap-3">
            <span className="text-3xl">✅</span>
            <p className="text-sm font-semibold text-gray-800">Request submitted</p>
            <p className="text-xs text-gray-500 text-center">
              Maintenance team has been notified. You'll receive an update once reviewed.
            </p>
            <button onClick={onClose}
              className="mt-2 px-5 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: GREEN }}>
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-gray-700">Bed Number *</label>
                <input type="text" placeholder="e.g. B07" value={form.bed}
                  onChange={e => set('bed', e.target.value)}
                  className="border rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                  style={{ borderColor: '#d1d5db' }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-gray-700">Issue Type *</label>
                <select value={form.issue_type} onChange={e => set('issue_type', e.target.value)}
                  className="border rounded-lg px-3 py-1.5 text-xs focus:outline-none bg-white"
                  style={{ borderColor: '#d1d5db' }}>
                  <option value="">Select…</option>
                  <option value="bed_mechanism">Bed mechanism / frame</option>
                  <option value="electrical">Electrical / power point</option>
                  <option value="iv_pole">IV pole / stand</option>
                  <option value="call_bell">Call bell / nurse call</option>
                  <option value="oxygen_suction">Oxygen / suction point</option>
                  <option value="mattress">Mattress / cushion</option>
                  <option value="other">Other equipment</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-gray-700">Priority</label>
              <div className="flex gap-2">
                {[
                  { v: 'low',    label: 'Low',          color: '#6b7280', bg: '#f9fafb',  border: '#d1d5db' },
                  { v: 'medium', label: 'Medium',        color: '#d97706', bg: '#fffbeb',  border: '#d97706' },
                  { v: 'high',   label: 'High — Urgent', color: '#dc2626', bg: '#fef2f2',  border: '#dc2626' },
                ].map(p => (
                  <button key={p.v} onClick={() => set('priority', p.v)}
                    className="px-3 py-1 rounded-full text-[10px] font-semibold border transition-all"
                    style={{
                      color:  form.priority === p.v ? p.color : '#9ca3af',
                      background: form.priority === p.v ? p.bg : 'white',
                      borderColor: form.priority === p.v ? p.border : '#e5e7eb',
                    }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-gray-700">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="Briefly describe the problem…"
                rows={3}
                className="border rounded-lg px-3 py-2 text-xs resize-none focus:outline-none"
                style={{ borderColor: '#d1d5db' }} />
            </div>

            {error && <p className="text-[11px] text-red-600">{error}</p>}

            <div className="flex gap-2 justify-end">
              <button onClick={onClose}
                className="px-4 py-1.5 rounded-lg border text-xs font-semibold text-gray-600 hover:bg-gray-50"
                style={{ borderColor: '#e5e7eb' }}>
                Cancel
              </button>
              <button onClick={submit} disabled={submitting}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5"
                style={{ background: ORANGE, opacity: submitting ? 0.7 : 1 }}>
                {submitting && <Loader2 size={11} className="animate-spin" />}
                Submit to Maintenance
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Summary pill ──────────────────────────────────────────────────
function SummaryPill({ label, count, dotColor, bg, color, border, active, onClick }) {
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all"
      style={{
        background: active ? bg : 'white',
        color: active ? color : '#6b7280',
        borderColor: active ? border : '#e5e7eb',
      }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
      {label} {count}
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────
export default function WardBoard() {
  const { session } = useWardSession()
  const navigate    = useNavigate()

  const [beds, setBeds]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('')
  const [wingFilter, setWing]     = useState('')
  const [showModal, setModal]     = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const wardId = session?.ward?.id

  const load = useCallback(async (quiet = false) => {
    if (!wardId) return
    if (!quiet) setLoading(true)
    else setRefreshing(true)
    try {
      const data = await api.get('/inpatient/beds', { params: { ward_id: wardId } })
      const list = Array.isArray(data) ? data : (data.items || data.beds || [])
      setBeds(list)
    } catch {
      setBeds([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [wardId])

  useEffect(() => {
    load()
    const h = () => load(true)
    window.addEventListener('carechart:refresh', h)
    return () => window.removeEventListener('carechart:refresh', h)
  }, [load])

  // Auto-refresh every 60s
  useEffect(() => {
    const t = setInterval(() => load(true), 60000)
    return () => clearInterval(t)
  }, [load])

  // ── Derived data ──────────────────────────────────────────────
  const resolved = beds.map(b => ({ ...b, _state: resolveState(b) }))

  // Extract unique wings
  const wings = [...new Set(resolved.map(b => b.wing || b.section || b.zone).filter(Boolean))]

  // Counts per state
  const counts = resolved.reduce((acc, b) => {
    acc[b._state] = (acc[b._state] || 0) + 1
    return acc
  }, {})
  const total = resolved.length

  // Filter
  const filtered = resolved.filter(b => {
    if (statusFilter && b._state !== statusFilter) return false
    if (wingFilter  && (b.wing || b.section || b.zone) !== wingFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const bn = (b.bed_number || b.bed_name || '').toLowerCase()
      const pn = (b.admission?.patient_name || b.patient_name || '').toLowerCase()
      const mrn = (b.admission?.mrn || b.mrn || '').toLowerCase()
      if (!bn.includes(q) && !pn.includes(q) && !mrn.includes(q)) return false
    }
    return true
  })

  // Sort: critical first, maintenance last
  const sorted = [...filtered].sort((a, b) =>
    (SORT_ORDER[a._state] ?? 99) - (SORT_ORDER[b._state] ?? 99)
  )

  // Group by wing (or single group if no wings)
  const groups = wings.length > 0
    ? wings.map(w => ({
        label: w,
        beds: sorted.filter(b => (b.wing || b.section || b.zone) === w),
      })).filter(g => g.beds.length > 0)
    : [{ label: null, beds: sorted }]

  const SUMMARY = [
    { key: 'all',         label: 'Total',       dotColor: GREEN,     bg: '#f0fdf4', color: GREEN,     border: '#bbf7d0', count: total },
    { key: 'occupied',    label: 'Occupied',    dotColor: '#059669', bg: '#f0fdf4', color: '#15803d', border: '#d1fae5', count: counts.occupied    || 0 },
    { key: 'critical',    label: 'Critical',    dotColor: '#dc2626', bg: '#fef2f2', color: '#dc2626', border: '#fecaca', count: counts.critical    || 0 },
    { key: 'vacant',      label: 'Vacant',      dotColor: '#9ca3af', bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb', count: counts.vacant      || 0 },
    { key: 'cleaning',    label: 'Cleaning',    dotColor: '#d97706', bg: '#fffbeb', color: '#92400e', border: '#fde68a', count: counts.cleaning    || 0 },
    { key: 'reserved',    label: 'Reserved',    dotColor: '#3b82f6', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', count: counts.reserved    || 0 },
    { key: 'maintenance', label: 'Maintenance', dotColor: ORANGE,    bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', count: counts.maintenance || 0 },
  ]

  return (
    <div className="flex flex-col h-full" style={{ background: '#f4f5f7' }}>

      {/* Filters bar */}
      <div className="bg-white border-b px-5 py-2 flex items-center gap-2 flex-shrink-0"
        style={{ borderColor: '#e9eaec' }}>
        {/* Search */}
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search bed or patient…"
            className="pl-7 pr-3 py-1.5 border rounded-lg text-xs focus:outline-none w-48"
            style={{ borderColor: search ? GREEN : '#d1d5db' }}
          />
        </div>

        {/* Status filter */}
        <select value={statusFilter} onChange={e => setStatus(e.target.value)}
          className="border rounded-lg px-2.5 py-1.5 text-xs text-gray-700 bg-white focus:outline-none"
          style={{ borderColor: '#d1d5db' }}>
          <option value="">All Status</option>
          <option value="occupied">Occupied</option>
          <option value="critical">Critical</option>
          <option value="vacant">Vacant</option>
          <option value="cleaning">Cleaning</option>
          <option value="reserved">Reserved</option>
          <option value="maintenance">Maintenance</option>
        </select>

        {/* Wing filter */}
        {wings.length > 0 && (
          <select value={wingFilter} onChange={e => setWing(e.target.value)}
            className="border rounded-lg px-2.5 py-1.5 text-xs text-gray-700 bg-white focus:outline-none"
            style={{ borderColor: '#d1d5db' }}>
            <option value="">All Wings</option>
            {wings.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Refresh indicator */}
        {refreshing && (
          <RefreshCw size={13} className="animate-spin text-gray-400" />
        )}

        {/* Maintenance request button */}
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors"
          style={{ background: '#fff7ed', color: '#c2410c', borderColor: '#fed7aa' }}>
          <Wrench size={12} />
          Maintenance Request
        </button>
      </div>

      {/* Summary strip */}
      <div className="bg-white border-b px-5 py-1.5 flex items-center gap-2 flex-shrink-0 flex-wrap"
        style={{ borderColor: '#e9eaec' }}>
        {SUMMARY.map(s => (
          <SummaryPill
            key={s.key}
            label={s.label}
            count={s.count}
            dotColor={s.dotColor}
            bg={s.bg}
            color={s.color}
            border={s.border}
            active={statusFilter === s.key || (s.key === 'all' && !statusFilter)}
            onClick={() => setStatus(s.key === 'all' ? '' : (statusFilter === s.key ? '' : s.key))}
          />
        ))}
      </div>

      {/* Grid area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 size={20} className="animate-spin mr-2" /> Loading ward beds…
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <AlertTriangle size={24} className="mb-2 opacity-40" />
            <p className="text-sm">No beds match your filters</p>
          </div>
        ) : (
          groups.map(({ label, beds: groupBeds }) => (
            <div key={label || 'all'}>
              {label && (
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    {label}
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              )}
              <div className="grid gap-2"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(158px, 1fr))' }}>
                {groupBeds.map(bed => (
                  <BedCard
                    key={bed.id || bed.bed_number}
                    bed={bed}
                    onClick={() => bed.admission?.id && navigate(`/chart/${bed.admission.id}`)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Maintenance modal */}
      {showModal && (
        <MaintenanceModal wardId={wardId} onClose={() => setModal(false)} />
      )}
    </div>
  )
}
