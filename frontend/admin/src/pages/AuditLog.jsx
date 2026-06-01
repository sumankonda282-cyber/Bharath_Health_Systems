import { useState, useEffect } from 'react'
import { adminApi } from '../api'
import { Search } from 'lucide-react'

const ACTION_LABELS = {
  approved_clinic:    { label: 'Approved Clinic',    color: 'text-emerald-400' },
  rejected_clinic:    { label: 'Rejected Clinic',    color: 'text-red-400' },
  suspended_clinic:   { label: 'Suspended Clinic',   color: 'text-amber-400' },
  revoked_clinic:     { label: 'Revoked Clinic',     color: 'text-red-500' },
  reactivated_clinic: { label: 'Reactivated Clinic', color: 'text-blue-400' },
  changed_plan:       { label: 'Changed Plan',       color: 'text-purple-400' },
  verified_staff:     { label: 'Verified Staff',     color: 'text-emerald-400' },
  rejected_staff:     { label: 'Rejected Staff',     color: 'text-red-400' },
}

export default function AuditLog() {
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [action, setAction]     = useState('')

  const load = () => {
    setLoading(true)
    const params = {}
    if (dateFrom) params.date_from = dateFrom
    if (dateTo)   params.date_to   = dateTo
    if (action)   params.action    = action
    adminApi.getAuditLog(params).then(d => setLogs(Array.isArray(d) ? d : [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Audit Log</h1>
        <p className="text-gray-500 text-sm mt-1">Every action taken on this platform</p>
      </div>

      {/* Filters */}
      <div className="card-p mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">From</label>
          <input type="date" className="input w-40 py-1.5 text-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">To</label>
          <input type="date" className="input w-40 py-1.5 text-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Action Type</label>
          <select className="input w-48 py-1.5 text-sm" value={action} onChange={e => setAction(e.target.value)}>
            <option value="">All Actions</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <button onClick={load} className="btn-primary py-1.5"><Search size={14} />Filter</button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No audit records found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr>
                <th className="th">Action</th><th className="th">Target</th><th className="th">Reason</th>
                <th className="th">By</th><th className="th">Date</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-800">
                {logs.map(l => {
                  const info = ACTION_LABELS[l.action] || { label: l.action, color: 'text-gray-400' }
                  return (
                    <tr key={l.id} className="tr-hover">
                      <td className="td"><span className={`font-semibold text-sm ${info.color}`}>{info.label}</span></td>
                      <td className="td">
                        <div className="text-white text-sm">{l.target_name}</div>
                        <div className="text-xs text-gray-500 capitalize">{l.target_type}</div>
                      </td>
                      <td className="td">
                        {l.reason && <div className="text-sm text-gray-300">{l.reason?.replace('_', ' ')}</div>}
                        {l.comment && <div className="text-xs text-gray-500">{l.comment}</div>}
                        {!l.reason && !l.comment && <span className="text-gray-600">—</span>}
                      </td>
                      <td className="td text-sm text-gray-400">{l.admin_name}</td>
                      <td className="td text-xs text-gray-500">{new Date(l.created_at).toLocaleString('en-IN')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
