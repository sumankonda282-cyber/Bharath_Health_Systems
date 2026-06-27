import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, X, CheckCircle2, Pencil, Save, Plus, Search,
  Building2, Stethoscope, MonitorSmartphone, Boxes, AlertCircle
} from 'lucide-react'
import api from '../api/client'
import MaintenanceForm from '@shared/components/MaintenanceForm'

// ── Constants ─────────────────────────────────────────────────────────────────

// Headline category breakdown ("what kind of maintenance received")
const CATEGORY_CARDS = [
  { key: 'facility',    label: 'Facility',      Icon: Building2,          color: '#0F2557', bg: '#eef2fb' },
  { key: 'equipment',   label: 'Equipment',     Icon: Stethoscope,       color: '#16a34a', bg: '#f0fdf4' },
  { key: 'it_software', label: 'IT / Software', Icon: MonitorSmartphone, color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'other',       label: 'Other',         Icon: Boxes,             color: '#d97706', bg: '#fffbeb' },
]

// Status filter chips (in display order). 'new' is shown as "Open".
const STATUSES = [
  { key: 'new',         label: 'Open',        color: '#CC1414', bg: '#fef2f2', badge: 'badge-red' },
  { key: 'in_progress', label: 'In Progress', color: '#d97706', bg: '#fffbeb', badge: 'badge-yellow' },
  { key: 'repaired',    label: 'Repaired',    color: '#16a34a', bg: '#f0fdf4', badge: 'badge-green' },
  { key: 'replaced',    label: 'Replaced',    color: '#0369a1', bg: '#eff6ff', badge: 'badge-blue' },
  { key: 'resolved',    label: 'Resolved',    color: '#16a34a', bg: '#f0fdf4', badge: 'badge-green' },
  { key: 'closed',      label: 'Closed',      color: '#6b7280', bg: '#f9fafb', badge: 'badge-gray' },
]
const STATUS_MAP = STATUSES.reduce((m, s) => { m[s.key] = s; return m }, {})

// Status advance flow: Open → In Progress → Repaired / Replaced → Closed.
// Each step offers the statuses a request can move to next.
const NEXT_STATUS = {
  new:         ['in_progress', 'repaired', 'replaced'],
  in_progress: ['repaired', 'replaced', 'resolved'],
  repaired:    ['closed', 'resolved'],
  replaced:    ['closed', 'resolved'],
  resolved:    ['closed'],
  closed:      [],
}

const PRIORITY_STYLE = {
  urgent: { badge: 'badge-red',    label: '🔴 Urgent' },
  high:   { badge: 'badge-red',    label: '🟠 High' },
  medium: { badge: 'badge-yellow', label: '🟡 Medium' },
  low:    { badge: 'badge-green',  label: '🟢 Low' },
}

const CATEGORY_LABEL = {
  facility:    '🏗 Facility',
  equipment:   '🩺 Equipment',
  it_software: '💻 IT / Software',
  other:       '📋 Other',
}

// Mirrors the issue types in @shared/components/MaintenanceForm so saved codes render nicely.
const ISSUE_TYPE_LABEL = {
  bed_mechanism:  'Bed mechanism / frame',
  electrical:     'Electrical / power point',
  lighting:       'Lighting / light near bed',
  iv_pole:        'IV pole / stand',
  call_bell:      'Call bell / nurse call',
  oxygen_suction: 'Oxygen / suction point',
  mattress:       'Mattress / cushion',
  plumbing:       'Plumbing / water',
  hvac:           'AC / heating / ventilation',
  other:          'Other equipment',
}

function prettifyIssue(req) {
  if (req.issue_type) {
    return ISSUE_TYPE_LABEL[req.issue_type]
      || req.issue_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }
  return req.title || '—'
}

// Compose a human-readable location from structured + free-text fields.
function composeLocation(req) {
  const parts = []
  if (req.bed_number) parts.push(`Bed ${req.bed_number}`)
  if (req.ward_name)  parts.push(req.ward_name)
  if (req.floor || req.floor === 0) parts.push(`Floor ${req.floor}`)
  if (req.location)   parts.push(req.location)
  return parts.length ? parts.join(' · ') : ''
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function StatusBadge({ status }) {
  const st = STATUS_MAP[status] || STATUS_MAP.new
  return <span className={st.badge}>{st.label}</span>
}

// ── RequestRow ────────────────────────────────────────────────────────────────

function RequestRow({ req, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [rowErr, setRowErr]   = useState('')
  const [draft, setDraft]     = useState({})

  const startEdit = () => {
    setDraft({
      title:       req.title || '',
      category:    req.category || 'facility',
      priority:    req.priority || 'medium',
      location:    req.location || '',
      status:      req.status || 'new',
      notes:       req.notes || '',
    })
    setEditing(true)
    setSaved(false)
    setRowErr('')
  }
  const cancelEdit = () => { setEditing(false); setDraft({}); setRowErr('') }

  const save = async () => {
    setSaving(true)
    setRowErr('')
    try {
      await api.patch(`/maintenance/requests/${req.id}`, draft)
      setSaved(true)
      setEditing(false)
      setTimeout(() => { setSaved(false); onUpdate() }, 700)
    } catch (e) {
      setRowErr(e?.response?.data?.detail || 'Could not save changes.')
    } finally {
      setSaving(false)
    }
  }

  // Inline status-advance — moves the request along the flow without full edit.
  const advanceStatus = async e => {
    const status = e.target.value
    if (!status || status === req.status) return
    setRowErr('')
    try {
      await api.patch(`/maintenance/requests/${req.id}`, { status })
      onUpdate()
    } catch (err) {
      setRowErr(err?.response?.data?.detail || 'Could not update status.')
    }
  }

  const pri = PRIORITY_STYLE[req.priority] || PRIORITY_STYLE.medium
  const nextOptions = NEXT_STATUS[req.status] || []
  const location = composeLocation(req)

  return (
    <tr className={`tr-hover ${editing ? 'bg-blue-50/60' : ''}`}>
      {/* Category */}
      <td className="td whitespace-nowrap">
        {editing ? (
          <select className="input !py-1 text-xs" value={draft.category}
            onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}>
            <option value="facility">Facility</option>
            <option value="equipment">Equipment</option>
            <option value="it_software">IT / Software</option>
            <option value="other">Other</option>
          </select>
        ) : (
          <span className="text-xs text-gray-600">{CATEGORY_LABEL[req.category] || req.category || '—'}</span>
        )}
      </td>

      {/* Issue */}
      <td className="td min-w-[170px]">
        {editing ? (
          <input className="input !py-1 text-sm" value={draft.title}
            onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} />
        ) : (
          <span className="text-sm font-medium text-gray-800">{prettifyIssue(req)}</span>
        )}
      </td>

      {/* Location */}
      <td className="td min-w-[150px]">
        {editing ? (
          <input className="input !py-1 text-xs" placeholder="Free-text location"
            value={draft.location} onChange={e => setDraft(d => ({ ...d, location: e.target.value }))} />
        ) : (
          location
            ? <span className="text-xs text-gray-600">{location}</span>
            : <span className="text-gray-300 text-xs">—</span>
        )}
      </td>

      {/* Ward */}
      <td className="td whitespace-nowrap">
        <span className="text-xs text-gray-600">{req.ward_name || <span className="text-gray-300">—</span>}</span>
      </td>

      {/* Floor */}
      <td className="td whitespace-nowrap">
        <span className="text-xs text-gray-600">
          {(req.floor || req.floor === 0) ? req.floor : <span className="text-gray-300">—</span>}
        </span>
      </td>

      {/* Branch */}
      <td className="td whitespace-nowrap">
        <span className="text-xs text-gray-600">{req.branch_name || <span className="text-gray-300">—</span>}</span>
      </td>

      {/* Priority */}
      <td className="td whitespace-nowrap">
        {editing ? (
          <select className="input !py-1 text-xs" value={draft.priority}
            onChange={e => setDraft(d => ({ ...d, priority: e.target.value }))}>
            <option value="urgent">🔴 Urgent</option>
            <option value="high">🟠 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>
        ) : (
          <span className={pri.badge}>{pri.label}</span>
        )}
      </td>

      {/* Status */}
      <td className="td whitespace-nowrap">
        {editing ? (
          <select className="input !py-1 text-xs" value={draft.status}
            onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}>
            {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        ) : (
          <StatusBadge status={req.status} />
        )}
      </td>

      {/* Submitted by */}
      <td className="td whitespace-nowrap">
        <span className="text-xs text-gray-600">{req.submitter_name || '—'}</span>
        <div className="text-[10px] text-gray-400">{fmtDate(req.created_at)}</div>
      </td>

      {/* Action — inline status advance + edit */}
      <td className="td whitespace-nowrap">
        {saved ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 size={14} /> Saved
          </span>
        ) : editing ? (
          <div className="flex items-center gap-1.5">
            <button onClick={save} disabled={saving} className="btn-success !px-2.5 !py-1 text-xs">
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Save
            </button>
            <button onClick={cancelEdit} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <X size={13} />
            </button>
            {rowErr && <span className="text-[11px] text-red-600 max-w-[140px]">{rowErr}</span>}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {nextOptions.length > 0 ? (
              <select
                value=""
                onChange={advanceStatus}
                className="text-xs px-2 py-1 rounded-lg border font-medium cursor-pointer focus:outline-none bg-white"
                style={{ borderColor: '#0F2557', color: '#0F2557' }}
              >
                <option value="">Advance…</option>
                {nextOptions.map(k => (
                  <option key={k} value={k}>→ {STATUS_MAP[k]?.label || k}</option>
                ))}
              </select>
            ) : (
              <span className="text-[11px] text-gray-300">Closed</span>
            )}
            <button
              onClick={startEdit}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 border border-gray-200"
            >
              <Pencil size={11} /> Edit
            </button>
            {rowErr && <span className="text-[11px] text-red-600 max-w-[120px]">{rowErr}</span>}
          </div>
        )}
      </td>
    </tr>
  )
}

// ── MaintenanceDashboard ──────────────────────────────────────────────────────

export default function MaintenanceDashboard() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  const [statusFilter, setStatusFilter] = useState('')   // '' = all
  const [filterCat, setFilterCat]       = useState('')
  const [filterPri, setFilterPri]       = useState('')
  const [search, setSearch]             = useState('')

  // New-request flow
  const [showForm, setShowForm]   = useState(false)
  const [wards, setWards]         = useState([])
  const [wardsLoading, setWLoad]  = useState(false)
  const [wardsErr, setWardsErr]   = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    api.get('/maintenance/requests')
      .then(r => setRequests(Array.isArray(r) ? r : (r?.data || [])))
      .catch(e => setError(e?.response?.data?.detail || 'Could not load maintenance requests.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // Fetch wards then open the shared form.
  const openNewRequest = async () => {
    setShowForm(true)
    setWardsErr('')
    if (wards.length) return
    setWLoad(true)
    try {
      const r = await api.get('/inpatient/wards')
      setWards(Array.isArray(r) ? r : (r?.data || []))
    } catch (e) {
      setWardsErr(e?.response?.data?.detail || 'Could not load wards. You can still submit without one.')
    } finally {
      setWLoad(false)
    }
  }

  // Headline category counts.
  const categoryCounts = CATEGORY_CARDS.reduce((acc, c) => {
    acc[c.key] = requests.filter(r => r.category === c.key).length
    return acc
  }, {})

  // Status chip counts.
  const statusCounts = STATUSES.reduce((acc, s) => {
    acc[s.key] = requests.filter(r => r.status === s.key).length
    return acc
  }, {})

  const q = search.trim().toLowerCase()
  const filtered = requests
    .filter(r => !statusFilter || r.status === statusFilter)
    .filter(r => !filterCat || r.category === filterCat)
    .filter(r => !filterPri || r.priority === filterPri)
    .filter(r => {
      if (!q) return true
      return [
        prettifyIssue(r), composeLocation(r), r.ward_name, r.branch_name,
        r.submitter_name, r.notes, r.title,
      ].filter(Boolean).some(v => String(v).toLowerCase().includes(q))
    })
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))

  const hasFilters = statusFilter || filterCat || filterPri || q

  return (
    <div className="space-y-4">
      {/* Headline category breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CATEGORY_CARDS.map(({ key, label, Icon, color, bg }) => {
          const active = filterCat === key
          return (
            <button
              key={key}
              onClick={() => setFilterCat(active ? '' : key)}
              className={`card p-4 text-left transition-all flex items-center gap-3 border-2 ${active ? 'border-current' : 'border-transparent'}`}
              style={{ background: bg, color }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/70">
                <Icon size={20} style={{ color }} />
              </div>
              <div>
                <div className="text-2xl font-bold leading-none" style={{ color }}>{categoryCounts[key] || 0}</div>
                <div className="text-xs font-semibold mt-1" style={{ color }}>{label}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Toolbar — status chips + filters + search + new request, all on one line */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Status chips with counts */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setStatusFilter('')}
            className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${statusFilter === '' ? 'bg-[#0F2557] text-white border-[#0F2557]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            All <span className="opacity-70">{requests.length}</span>
          </button>
          {STATUSES.map(s => {
            const active = statusFilter === s.key
            return (
              <button
                key={s.key}
                onClick={() => setStatusFilter(active ? '' : s.key)}
                className="text-xs px-2.5 py-1 rounded-full border font-medium transition-all"
                style={{
                  background: active ? s.color : 'white',
                  color: active ? 'white' : s.color,
                  borderColor: s.color,
                }}
              >
                {s.label} <span className="opacity-80">{statusCounts[s.key] || 0}</span>
              </button>
            )
          })}
        </div>

        {/* Category + Priority selects */}
        <select
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="facility">🏗 Facility</option>
          <option value="equipment">🩺 Equipment</option>
          <option value="it_software">💻 IT / Software</option>
          <option value="other">📋 Other</option>
        </select>
        <select
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          value={filterPri}
          onChange={e => setFilterPri(e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="urgent">🔴 Urgent</option>
          <option value="high">🟠 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🟢 Low</option>
        </select>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white w-44"
            placeholder="Search requests…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {hasFilters && (
          <button
            onClick={() => { setStatusFilter(''); setFilterCat(''); setFilterPri(''); setSearch('') }}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-red-50"
          >
            <X size={12} /> Clear
          </button>
        )}

        {/* New request — right aligned */}
        <button onClick={openNewRequest} className="btn-primary ml-auto !py-1.5 text-sm">
          <Plus size={15} /> New Request
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={load} className="ml-auto text-xs font-semibold underline hover:no-underline">Retry</button>
        </div>
      )}

      {/* Table / states */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={26} className="animate-spin text-gray-300" />
        </div>
      ) : !error && filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400">
          {requests.length === 0 ? 'No maintenance requests yet.' : 'No requests match the current filters.'}
        </div>
      ) : !error ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="th">Category</th>
                  <th className="th">Issue</th>
                  <th className="th">Location</th>
                  <th className="th">Ward</th>
                  <th className="th">Floor</th>
                  <th className="th">Branch</th>
                  <th className="th">Priority</th>
                  <th className="th">Status</th>
                  <th className="th">Submitted by</th>
                  <th className="th">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => (
                  <RequestRow key={r.id} req={r} onUpdate={load} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
            {filtered.length} of {requests.length} requests
          </div>
        </div>
      ) : null}

      {/* New-request form (shared) */}
      {showForm && (
        wardsLoading ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl px-6 py-5 flex items-center gap-2 text-sm text-gray-600 shadow-xl">
              <Loader2 size={16} className="animate-spin" /> Loading wards…
            </div>
          </div>
        ) : (
          <>
            <MaintenanceForm
              api={api}
              endpoint="/maintenance/requests"
              portalSource="ManagerPortal"
              wards={wards}
              showCategory
              theme={{ accent: '#0F2557' }}
              onClose={() => setShowForm(false)}
              onSubmitted={() => { setShowForm(false); load() }}
            />
            {wardsErr && (
              <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-lg px-3 py-2 shadow">
                {wardsErr}
              </div>
            )}
          </>
        )
      )}
    </div>
  )
}
