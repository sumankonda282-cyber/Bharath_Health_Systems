import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { ScanLine, Loader2, AlertCircle, FileEdit } from 'lucide-react'

const PRIORITY_BADGE = {
  stat:    { label: 'STAT',    cls: 'bg-red-100 text-red-700 font-bold' },
  urgent:  { label: 'Urgent',  cls: 'bg-orange-100 text-orange-700 font-bold' },
  routine: { label: 'Routine', cls: 'bg-gray-100 text-gray-600' },
}

function PriorityBadge({ priority }) {
  const p = PRIORITY_BADGE[priority?.toLowerCase()] || PRIORITY_BADGE.routine
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${p.cls}`}>
      {p.label}
    </span>
  )
}

export default function PendingReview() {
  const navigate = useNavigate()
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const fetchOrders = useCallback(() => {
    setError('')
    api.get('/imaging/orders', { params: { status: 'acquired', limit: 300 } })
      .then(r => {
        const list = Array.isArray(r) ? r : (r?.items || r?.data || [])
        // Filter client-side as well in case backend ignores the param
        const acquired = list.filter(o => o.status === 'acquired' && !o.signed_at && !o.report_signed_at)
        setOrders(acquired)
      })
      .catch(err => setError(err.message || 'Failed to load orders'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchOrders()
    const id = setInterval(fetchOrders, 30_000)
    return () => clearInterval(id)
  }, [fetchOrders])

  return (
    <div>
      {error && (
        <div className="flex items-center gap-3 p-4 mb-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={fetchOrders} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-gray-400" />
        </div>
      ) : orders.length === 0 && !error ? (
        <div className="card p-16 text-center text-gray-400">
          <ScanLine size={40} className="mx-auto mb-3 opacity-30" />
          <div className="font-semibold text-gray-600">No scans pending review</div>
          <div className="text-sm mt-1">All acquired scans have been reported.</div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th className="th">Order #</th>
                  <th className="th">Patient Name</th>
                  <th className="th">Study Type</th>
                  <th className="th">Modality</th>
                  <th className="th">Acquired At</th>
                  <th className="th">Referring Doctor</th>
                  <th className="th">Priority</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map(o => (
                  <tr key={o.id} className="tr-hover">
                    <td className="td font-mono text-xs text-gray-400">IMG-{o.id}</td>
                    <td className="td font-medium text-gray-800">{o.patient?.full_name || '—'}</td>
                    <td className="td text-gray-600">{o.study_type || o.body_part || '—'}</td>
                    <td className="td text-gray-600">{o.modality || '—'}</td>
                    <td className="td text-gray-500 text-sm">
                      {o.acquired_at
                        ? new Date(o.acquired_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
                        : o.updated_at
                          ? new Date(o.updated_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
                          : '—'}
                    </td>
                    <td className="td text-gray-600">
                      {o.ordered_by_name || o.doctor?.full_name
                        ? `Dr. ${o.ordered_by_name || o.doctor?.full_name}`
                        : '—'}
                    </td>
                    <td className="td">
                      <PriorityBadge priority={o.priority} />
                    </td>
                    <td className="td">
                      <button
                        onClick={() => navigate(`/report-writer?order_id=${o.id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                        style={{ background: '#0F2557' }}
                      >
                        <FileEdit size={13} />
                        Write Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
