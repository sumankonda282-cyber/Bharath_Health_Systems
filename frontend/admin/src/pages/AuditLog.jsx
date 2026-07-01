import { useState, useEffect } from 'react'
import { adminApi } from '../api'
import { Search, Printer, ChevronLeft, ChevronRight, AlertTriangle, ChevronDown, X } from 'lucide-react'

// ── Action badge config ────────────────────────────────────────────
const ACTION_META = {
  // existing platform actions
  approved_clinic:    { label: 'Approved Health Center',    badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
  rejected_clinic:    { label: 'Rejected Health Center',    badge: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  suspended_clinic:   { label: 'Suspended Health Center',   badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
  revoked_clinic:     { label: 'Revoked Health Center',     badge: 'bg-red-600/20 text-red-500 border border-red-600/30' },
  reactivated_clinic: { label: 'Reactivated Health Center', badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  changed_plan:       { label: 'Changed Plan',       badge: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' },
  verified_staff:     { label: 'Verified Staff',     badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
  rejected_staff:     { label: 'Rejected Staff',     badge: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  // NABH clinical actions
  login:                { label: 'Login',         badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  login_failed:         { label: 'Login Failed',  badge: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  prescription_created: { label: 'Prescription',  badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
  lab_order:            { label: 'Lab Order',     badge: 'bg-orange-500/20 text-orange-400 border border-orange-500/30' },
  vital_entry:          { label: 'Vital Entry',   badge: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' },
  appointment:          { label: 'Appointment',   badge: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' },
  invoice:              { label: 'Invoice',       badge: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' },
}

const ACTION_FILTER_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'login', label: 'Login' },
  { value: 'login_failed', label: 'Login Failed' },
  { value: 'prescription_created', label: 'Prescription' },
  { value: 'lab_order', label: 'Lab Order' },
  { value: 'vital_entry', label: 'Vital Entry' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'approved_clinic', label: 'Approved Health Center' },
  { value: 'rejected_clinic', label: 'Rejected Health Center' },
  { value: 'suspended_clinic', label: 'Suspended Health Center' },
  { value: 'verified_staff', label: 'Verified Staff' },
  { value: 'rejected_staff', label: 'Rejected Staff' },
]

const USER_TYPE_OPTIONS = [
  { value: '', label: 'All Users' },
  { value: 'staff', label: 'Staff' },
  { value: 'patient', label: 'Patient' },
  { value: 'admin', label: 'Admin' },
]

const PAGE_SIZE = 100

function defaultDateRange() {
  const end   = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 7)
  const fmt = d => d.toISOString().slice(0, 10)
  return { start: fmt(start), end: fmt(end) }
}

function ActionBadge({ action }) {
  const meta = ACTION_META[action] || { label: action, badge: 'surface-3 text-dim border border-app' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${meta.badge}`}>
      {meta.label}
    </span>
  )
}

// ── Detail Drawer ─────────────────────────────────────────────────
function DetailRow({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-app last:border-0">
      <span className="text-xs text-faint uppercase tracking-wide">{label}</span>
      <span className="text-sm text-app break-words">{value}</span>
    </div>
  )
}

function DetailsJson({ details }) {
  if (!details || typeof details !== 'object' || Object.keys(details).length === 0) return null
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-app last:border-0">
      <span className="text-xs text-faint uppercase tracking-wide">Details</span>
      <div className="mt-1 space-y-1">
        {Object.entries(details).map(([k, v]) => (
          <div key={k} className="flex gap-2 text-xs">
            <span className="text-dim font-medium shrink-0">{k}:</span>
            <span className="text-app break-all">
              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Fields handled explicitly in the drawer — skip in the "extra" catch-all
const DRAWER_SHOWN_FIELDS = new Set([
  'id', 'created_at', 'action', 'admin_name', 'user_name', 'user_id',
  'user_type', 'entity_type', 'target_type', 'target_name', 'entity_id',
  'clinic_name', 'clinic_id', 'ip_address', 'reason', 'comment', 'details',
])

function AuditDrawer({ log, onClose }) {
  if (!log) return null

  const fullTimestamp = new Date(log.created_at).toLocaleString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })

  const userName = log.admin_name || log.user_name || log.user_id || '—'
  const extraEntries = Object.entries(log).filter(([k]) => !DRAWER_SHOWN_FIELDS.has(k))

  return (
    <>
      {/* Mobile overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/60 md:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 z-50 w-full md:w-[400px] surface border-l border-app flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-app shrink-0">
          <h2 className="text-base font-semibold text-app">Event Details</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-dim hover:text-app hover-app transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action badge prominent display */}
        <div className="px-4 py-3 border-b border-app shrink-0">
          <ActionBadge action={log.action} />
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-1">
          <DetailRow label="Timestamp" value={fullTimestamp} />
          <DetailRow label="User Name" value={userName} />
          {log.user_id && log.admin_name && (
            <DetailRow label="User ID" value={log.user_id} />
          )}
          <DetailRow
            label="User Type"
            value={log.user_type
              ? log.user_type.charAt(0).toUpperCase() + log.user_type.slice(1)
              : 'Admin'}
          />
          <DetailRow label="Entity Type" value={log.entity_type || log.target_type || null} />
          <DetailRow label="Entity / Name" value={log.target_name || log.entity_id || null} />
          {(log.clinic_name || log.clinic_id) && (
            <DetailRow
              label="Health Center"
              value={log.clinic_name || `ID: ${log.clinic_id}`}
            />
          )}
          <DetailRow label="IP Address" value={log.ip_address || null} />
          <DetailRow label="Reason" value={log.reason ? log.reason.replace(/_/g, ' ') : null} />
          <DetailRow label="Comment" value={log.comment || null} />
          <DetailsJson details={typeof log.details === 'object' ? log.details : null} />

          {/* Any remaining fields not explicitly shown above */}
          {extraEntries.map(([k, v]) => (
            <DetailRow
              key={k}
              label={k.replace(/_/g, ' ')}
              value={typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}
            />
          ))}
        </div>
      </div>
    </>
  )
}

export default function AuditLog() {
  const range = defaultDateRange()
  const [logs, setLogs]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(false)
  const [startDate, setStartDate] = useState(range.start)
  const [endDate, setEndDate]     = useState(range.end)
  const [clinicId, setClinicId]   = useState('')
  const [clinics, setClinics]     = useState([])
  const [userType, setUserType]   = useState('')
  const [action, setAction]       = useState('')
  const [search, setSearch]       = useState('')
  const [offset, setOffset]       = useState(0)
  const [hasMore, setHasMore]     = useState(false)
  const [nabh30, setNabh30]       = useState(null)
  const [showFailed, setShowFailed] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)

  const load = async (newOffset = 0) => {
    setLoading(true)
    setError(false)
    const params = { limit: PAGE_SIZE, offset: newOffset }
    if (startDate) params.date_from = startDate
    if (endDate)   params.date_to   = endDate
    if (clinicId)  params.clinic_id  = clinicId
    if (userType)  params.user_type  = userType
    if (action)    params.action     = action
    if (search)    params.search     = search
    try {
      const data = await adminApi.getAuditLog(params)
      const arr  = Array.isArray(data) ? data : data?.logs ?? []
      setLogs(arr)
      setHasMore(arr.length === PAGE_SIZE)
      setOffset(newOffset)
    } catch (e) {
      setLogs([])
      setError(e.message || 'Failed to load activity log.')
    } finally {
      setLoading(false)
    }
  }

  const loadClinics = async () => {
    try {
      const data = await adminApi.getClinics()
      setClinics(Array.isArray(data) ? data : data?.clinics ?? [])
    } catch {
      setClinics([])
    }
  }

  const loadNabh30 = async () => {
    const end   = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    const fmt = d => d.toISOString().slice(0, 10)
    try {
      const data = await adminApi.getAuditLog({ limit: 500, date_from: fmt(start), date_to: fmt(end) })
      const arr  = Array.isArray(data) ? data : data?.logs ?? []
      const uniqueUsers = [...new Set(arr.map(l => l.user_id || l.admin_id).filter(Boolean))].length
      const staffActions = arr.filter(l =>
        (l.user_type || '').toLowerCase() === 'staff' || l.admin_name
      )
      const mostActive = staffActions.reduce((acc, l) => {
        const key = l.admin_name || l.user_id || 'Unknown'
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {})
      const topEntry = Object.entries(mostActive).sort((a, b) => b[1] - a[1]).slice(0, 1)[0]
      setNabh30({
        total: arr.length,
        uniqueUsers,
        topStaff: topEntry ? `${topEntry[0]} (${topEntry[1]})` : '—',
      })
    } catch {
      setNabh30({ total: 0, uniqueUsers: 0, topStaff: '—' })
    }
  }

  useEffect(() => { load(0); loadNabh30(); loadClinics() }, [])

  const clearFilters = () => {
    setStartDate(range.start)
    setEndDate(range.end)
    setClinicId('')
    setUserType('')
    setAction('')
    setSearch('')
  }

  // Client-side text filter on loaded page
  const filteredLogs = search
    ? logs.filter(l => {
        const q = search.toLowerCase()
        return (
          (l.action || '').toLowerCase().includes(q) ||
          (l.entity_type || '').toLowerCase().includes(q) ||
          (l.target_type || '').toLowerCase().includes(q) ||
          String(l.target_name || l.entity_id || '').toLowerCase().includes(q) ||
          String(l.admin_name || l.user_id || '').toLowerCase().includes(q) ||
          JSON.stringify(l.details || {}).toLowerCase().includes(q)
        )
      })
    : logs

  // Failed logins in last 24h within current results
  const since24h = Date.now() - 24 * 60 * 60 * 1000
  const failedLogins = logs.filter(l => {
    if ((l.action || '') !== 'login_failed') return false
    const t = new Date(l.created_at).getTime()
    return Number.isNaN(t) ? false : t >= since24h
  })

  const handleRowClick = (log) => {
    setSelectedLog(prev => prev?.id === log.id ? null : log)
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #audit-print-area, #audit-print-area * { visibility: visible; }
          #audit-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .print-header { display: block !important; }
          table { font-size: 10px; }
          th, td { padding: 4px 6px !important; }
        }
        .print-header { display: none; }
      `}</style>

      <div className="app-bg min-h-full">
        <h1 className="text-lg font-bold text-app mb-3 no-print">Activity Log</h1>

        {/* Consolidated toolbar */}
        <div className="toolbar no-print">
          <input
            type="date"
            className="input py-1 text-sm w-36"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
          <span className="text-xs text-faint">to</span>
          <input
            type="date"
            className="input py-1 text-sm w-36"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
          <select
            className="input py-1 text-sm w-44"
            value={clinicId}
            onChange={e => setClinicId(e.target.value)}
          >
            <option value="">All Health Centers</option>
            {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            className="input py-1 text-sm w-32"
            value={userType}
            onChange={e => setUserType(e.target.value)}
          >
            {USER_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            className="input py-1 text-sm w-48"
            value={action}
            onChange={e => setAction(e.target.value)}
          >
            {ACTION_FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
            <input
              type="text"
              placeholder="Search..."
              className="input py-1 text-sm pl-8 w-48"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load(0)}
            />
          </div>
          <button onClick={() => load(0)} className="btn-primary py-1 px-3 text-sm flex items-center gap-1">
            <Search size={14} />Apply
          </button>
          <button onClick={clearFilters} className="btn-secondary py-1 px-3 text-sm">Clear</button>
          <div className="flex-1" />
          <button
            onClick={() => window.print()}
            className="btn-secondary py-1 px-2 text-sm"
            title="Print / Export PDF"
          >
            <Printer size={15} />
          </button>
        </div>

        {/* Failed-login compact banner */}
        {failedLogins.length > 0 && (
          <div className="no-print mt-3">
            <div className="flex items-center gap-2 text-sm bg-orange-500/10 border border-orange-500/30 text-orange-300 rounded-lg px-3 py-1.5">
              <AlertTriangle size={15} className="flex-shrink-0" />
              <span>{failedLogins.length} failed logins in last 24h</span>
              <button
                onClick={() => setShowFailed(s => !s)}
                className="ml-auto inline-flex items-center gap-1 text-orange-200 hover:text-app font-semibold"
              >
                View Details
                <ChevronDown size={14} className={`transition-transform ${showFailed ? 'rotate-180' : ''}`} />
              </button>
            </div>
            {showFailed && (
              <div className="mt-1 bg-orange-500/5 border border-orange-500/20 rounded-lg divide-y divide-orange-500/10">
                {failedLogins.map(l => (
                  <div key={l.id} className="flex items-center gap-4 px-3 py-1.5 text-xs">
                    <span className="font-mono text-dim whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    <span className="text-app">{l.admin_name || l.user_id || '—'}</span>
                    <span className="font-mono text-faint ml-auto">{l.ip_address || '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* NABH 30-day summary chips */}
        <div className="flex flex-wrap gap-2 mt-3 mb-3 no-print">
          {nabh30 === null ? (
            <span className="badge-xs text-faint">Loading 30-day summary…</span>
          ) : (
            <>
              <span className="filter-chip text-emerald-300 border-emerald-500/30">
                ✓ Total (30d): <strong className="text-app ml-1">{nabh30.total.toLocaleString()}</strong>
              </span>
              <span className="filter-chip text-dim">
                Unique Users: <strong className="text-app ml-1">{nabh30.uniqueUsers}</strong>
              </span>
              <span className="filter-chip text-dim">
                Top Staff: <strong className="text-app ml-1">{nabh30.topStaff}</strong>
              </span>
            </>
          )}
        </div>

        {/* Print-only header */}
        <div className="print-header mb-4">
          <h2 style={{ fontSize: 18, fontWeight: 'bold' }}>Bharath Health — Activity Log Report</h2>
          <p style={{ fontSize: 12 }}>Period: {startDate} to {endDate}{action ? ` | Action: ${action}` : ''}{userType ? ` | User: ${userType}` : ''}</p>
          <p style={{ fontSize: 11, color: '#666' }}>Generated: {new Date().toLocaleString('en-IN')}</p>
        </div>

        {/* Table */}
        <div id="audit-print-area">
          <div className="card-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-4 rounded-full animate-spin" style={{ borderColor: '#F5821E', borderTopColor: 'transparent' }} />
              </div>
            ) : error ? (
              <div className="p-12 text-center text-red-400">{error}</div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-12 text-center text-faint">No activity records found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="th-sm">Timestamp</th>
                      <th className="th-sm">User</th>
                      <th className="th-sm">User Type</th>
                      <th className="th-sm">Action</th>
                      <th className="th-sm">Entity</th>
                      <th className="th-sm">Details</th>
                      <th className="th-sm">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--border)]">
                    {filteredLogs.map(l => (
                      <tr
                        key={l.id}
                        className={`tr-hover cursor-pointer transition-colors ${selectedLog?.id === l.id ? 'surface-2' : ''}`}
                        onClick={() => handleRowClick(l)}
                      >
                        <td className="td-sm text-xs text-dim whitespace-nowrap font-mono">
                          {new Date(l.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="td-sm">
                          <div className="text-app text-sm">{l.admin_name || l.user_id || '—'}</div>
                          {l.user_id && l.admin_name && (
                            <div className="text-xs text-faint">ID: {l.user_id}</div>
                          )}
                        </td>
                        <td className="td-sm">
                          <span className="text-xs capitalize text-dim surface-2 px-2 py-0.5 rounded-full">
                            {l.user_type || 'admin'}
                          </span>
                        </td>
                        <td className="td-sm">
                          <ActionBadge action={l.action} />
                        </td>
                        <td className="td-sm">
                          <div className="text-app text-sm">{l.target_name || l.entity_id || '—'}</div>
                          <div className="text-xs text-faint capitalize">
                            {l.entity_type || l.target_type || ''}
                          </div>
                        </td>
                        <td className="td-sm max-w-xs">
                          {l.reason && <div className="text-sm text-dim">{l.reason.replace(/_/g, ' ')}</div>}
                          {l.comment && <div className="text-xs text-faint">{l.comment}</div>}
                          {l.details && typeof l.details === 'object' && Object.keys(l.details).length > 0 && (
                            <div className="text-xs text-faint truncate max-w-48" title={JSON.stringify(l.details)}>
                              {Object.entries(l.details).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(', ')}
                            </div>
                          )}
                          {!l.reason && !l.comment && (!l.details || Object.keys(l.details || {}).length === 0) && (
                            <span className="text-faint">—</span>
                          )}
                        </td>
                        <td className="td-sm text-xs text-faint font-mono">
                          {l.ip_address || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        {!loading && !error && (filteredLogs.length > 0 || offset > 0) && (
          <div className="flex items-center justify-between mt-3 no-print">
            <span className="text-sm text-faint">
              Showing {offset + 1}–{offset + filteredLogs.length}{hasMore ? '+' : ''}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => load(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0 || loading}
                className="btn-secondary py-1.5 px-3 disabled:opacity-40 flex items-center gap-1"
              >
                <ChevronLeft size={15} />Prev
              </button>
              <button
                onClick={() => load(offset + PAGE_SIZE)}
                disabled={!hasMore || loading}
                className="btn-secondary py-1.5 px-3 disabled:opacity-40 flex items-center gap-1"
              >
                Next<ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail drawer — fixed, rendered outside scroll area */}
      <AuditDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
    </>
  )
}
