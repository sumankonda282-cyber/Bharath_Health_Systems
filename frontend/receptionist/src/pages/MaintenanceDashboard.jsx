import { useState, useEffect, useCallback } from 'react'
import { Wrench, Loader2, RefreshCw, ChevronDown, X, CheckCircle2, Clock, AlertTriangle, Circle } from 'lucide-react'
import api from '../api/client'

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUSES = [
  { key: 'new',         label: 'New',         color: '#dc2626', bg: '#fef2f2', dot: 'bg-red-500' },
  { key: 'in_progress', label: 'In Progress',  color: '#d97706', bg: '#fffbeb', dot: 'bg-amber-500' },
  { key: 'resolved',    label: 'Resolved',     color: '#059669', bg: '#f0fdf4', dot: 'bg-emerald-500' },
  { key: 'closed',      label: 'Closed',       color: '#6b7280', bg: '#f9fafb', dot: 'bg-gray-400' },
]

const PRIORITY_BADGE = {
  urgent: 'bg-red-100 text-red-700',
  high:   'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low:    'bg-green-100 text-green-700',
}
const PRIORITY_LABEL = { urgent: '🔴 Urgent', high: '🟠 High', medium: '🟡 Medium', low: '🟢 Low' }

const CATEGORY_LABEL = {
  facility:    '🏗 Facility',
  equipment:   '🩺 Equipment',
  it_software: '💻 IT / Software',
  other:       '📋 Other',
}

const PORTAL_COLORS = {
  CareChart:   '#065F46',
  Laboratory:  '#1d4ed8',
  Imaging:     '#7c3aed',
  Pharmacy:    '#b45309',
  Reception:   '#0F2557',
  Provider:    '#0369a1',
  Admin:       '#374151',
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── RequestCard ───────────────────────────────────────────────────────────────

function RequestCard({ req, onUpdate }) {
  const [updating, setUpdating] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes]         = useState(req.notes || '')

  const setStatus = async status => {
    setUpdating(true)
    try { await api.patch(`/maintenance/requests/${req.id}`, { status }) }
    catch (e) { console.error(e) }
    finally { setUpdating(false); onUpdate() }
  }

  const saveNotes = async () => {
    try { await api.patch(`/maintenance/requests/${req.id}`, { notes }) }
    catch (e) { console.error(e) }
    setShowNotes(false)
    onUpdate()
  }

  const nextStatuses = STATUSES.filter(s => s.key !== req.status).map(s => s.key)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3 hover:shadow-md transition-shadow">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-800 text-sm leading-snug">{req.title}</div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[req.priority]}`}>
              {PRIORITY_LABEL[req.priority]}
            </span>
            <span className="text-xs text-gray-500">{CATEGORY_LABEL[req.category] || req.category}</span>
            {req.portal_source && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                style={{ background: PORTAL_COLORS[req.portal_source] || '#6b7280' }}
              >
                {req.portal_source}
              </span>
            )}
          </div>
        </div>
        {updating && <Loader2 size={14} className="animate-spin text-gray-400 flex-shrink-0" />}
      </div>

      {/* Description */}
      {req.description && (
        <p className="text-xs text-gray-600 leading-relaxed">{req.description}</p>
      )}

      {/* Meta */}
      <div className="text-xs text-gray-400 space-y-0.5">
        {req.location && <div>📍 {req.location}</div>}
        <div>Submitted by <span className="text-gray-600 font-medium">{req.submitter_name}</span> · {timeAgo(req.created_at)}</div>
        {req.assignee_name && <div>Assigned to <span className="text-gray-600 font-medium">{req.assignee_name}</span></div>}
        {req.notes && <div className="text-gray-500 italic">"{req.notes}"</div>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        {nextStatuses.slice(0, 2).map(s => {
          const st = STATUSES.find(x => x.key === s)
          return (
            <button
              key={s}
              onClick={() => setStatus(s)}
              disabled={updating}
              className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors hover:opacity-90 disabled:opacity-40"
              style={{ borderColor: st.color, color: st.color, background: st.bg }}
            >
              {st.label}
            </button>
          )
        })}
        <button
          onClick={() => setShowNotes(v => !v)}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
        >
          {req.notes ? 'Edit Note' : '+ Note'}
        </button>
      </div>

      {/* Inline notes editor */}
      {showNotes && (
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="Add a note..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveNotes() }}
            autoFocus
          />
          <button onClick={saveNotes} className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Save</button>
          <button onClick={() => setShowNotes(false)} className="text-xs px-2 py-1.5 text-gray-400 hover:text-gray-600"><X size={12} /></button>
        </div>
      )}
    </div>
  )
}

// ── MaintenanceDashboard ──────────────────────────────────────────────────────

export default function MaintenanceDashboard() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filterCat, setFilterCat]   = useState('')
  const [filterPri, setFilterPri]   = useState('')

  const load = useCallback(() => {
    setLoading(true)
    api.get('/maintenance/requests')
      .then(r => setRequests(Array.isArray(r.data) ? r.data : []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = requests.filter(r => {
    if (filterCat && r.category !== filterCat) return false
    if (filterPri && r.priority !== filterPri) return false
    return true
  })

  const byStatus = key => filtered.filter(r => r.status === key)
  const totalNew = requests.filter(r => r.status === 'new').length

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#f0fdf4' }}>
            <Wrench size={20} style={{ color: '#065F46' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Maintenance Requests</h1>
            <p className="text-xs text-gray-500">All portals · Clinic-wide</p>
          </div>
          {totalNew > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold text-white bg-red-500">{totalNew} new</span>
          )}
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />Refresh
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="facility">Facility</option>
          <option value="equipment">Equipment</option>
          <option value="it_software">IT / Software</option>
          <option value="other">Other</option>
        </select>
        <select
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          value={filterPri}
          onChange={e => setFilterPri(e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="urgent">🔴 Urgent</option>
          <option value="high">🟠 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🟢 Low</option>
        </select>
        {(filterCat || filterPri) && (
          <button onClick={() => { setFilterCat(''); setFilterPri('') }} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
            <X size={12} />Clear
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} request{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-gray-300" />
        </div>
      )}

      {/* Kanban columns */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATUSES.map(({ key, label, color, bg, dot }) => {
            const cards = byStatus(key)
            return (
              <div key={key} className="rounded-2xl p-3 space-y-3" style={{ background: bg }}>
                <div className="flex items-center gap-2 px-1">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
                  <span className="text-sm font-semibold" style={{ color }}>{label}</span>
                  <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: color }}>
                    {cards.length}
                  </span>
                </div>

                {cards.length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-400">No {label.toLowerCase()} requests</div>
                ) : (
                  cards.map(r => <RequestCard key={r.id} req={r} onUpdate={load} />)
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
