import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { imagingApi, patientsApi } from '../../api'
import { PageLoader } from '../../components/ui/Spinner'
import { Scan, ChevronDown, ChevronRight, Search, X, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'

const STATUS_META = {
  ordered:    { label: 'Ordered',    cls: 'badge-yellow' },
  processing: { label: 'Processing', cls: 'badge-purple' },
  completed:  { label: 'Completed',  cls: 'badge-green'  },
  cancelled:  { label: 'Cancelled',  cls: 'badge-gray'   },
}

const MODALITIES = ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'PET Scan', 'Mammography', 'Fluoroscopy']

// ── Expanded patient row ───────────────────────────────────────────────────────
function PatientImagingRow({ orders, onRefresh }) {
  const [editing, setEditing]   = useState(null) // orderId
  const [report, setReport]     = useState('')
  const [saving, setSaving]     = useState(false)
  const [flash, setFlash]       = useState('')

  const openEdit = (order) => {
    setEditing(order.id)
    setReport(order.report || '')
  }

  const saveReport = async (orderId) => {
    setSaving(true)
    try {
      await imagingApi.update(orderId, { report, status: 'completed' })
      setFlash('Report saved')
      setEditing(null)
      setTimeout(() => setFlash(''), 2000)
      onRefresh()
    } catch (e) {
      setFlash('Error: ' + e.message)
    } finally { setSaving(false) }
  }

  return (
    <div className="bg-gray-50 border-t border-gray-100 px-4 py-3 space-y-3">
      {flash && (
        <div className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200">{flash}</div>
      )}
      {orders.map(order => {
        const meta = STATUS_META[order.status] || STATUS_META.ordered
        const isEditing = editing === order.id

        return (
          <div key={order.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Order header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-gray-400">IMG-{order.id}</span>
                <span className="text-sm font-semibold text-gray-700">{order.modality}</span>
                {order.body_part && <span className="text-xs text-gray-400">· {order.body_part}</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className={meta.cls}>{meta.label}</span>
                {order.status !== 'completed' && order.status !== 'cancelled' && (
                  <button
                    onClick={() => openEdit(order)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition-colors"
                  >
                    Add Report
                  </button>
                )}
                {order.status === 'completed' && (
                  <button
                    onClick={() => openEdit(order)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    View Report
                  </button>
                )}
              </div>
            </div>

            {/* Clinical notes */}
            {order.clinical_notes && !isEditing && (
              <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                <span className="font-medium text-gray-600">Clinical notes: </span>{order.clinical_notes}
              </div>
            )}

            {/* Completed report view */}
            {!isEditing && order.status === 'completed' && order.report && (
              <div className="px-4 py-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Findings / Report</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.report}</p>
              </div>
            )}

            {/* Report entry form */}
            {isEditing && (
              <div className="p-4 space-y-3">
                {order.clinical_notes && (
                  <div className="px-3 py-2 bg-blue-50 rounded-lg text-xs text-blue-700">
                    <span className="font-medium">Clinical indication: </span>{order.clinical_notes}
                  </div>
                )}
                <div>
                  <label className="label text-xs">Findings / Report *</label>
                  <textarea
                    className="input resize-none"
                    rows={6}
                    value={report}
                    onChange={e => setReport(e.target.value)}
                    placeholder="Describe findings, impression, recommendations…"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditing(null)} className="btn-secondary text-sm py-1.5">Cancel</button>
                  <button onClick={() => saveReport(order.id)} disabled={saving || !report.trim()}
                    className="btn-primary text-sm py-1.5 flex items-center gap-1.5">
                    <CheckCircle size={13} />{saving ? 'Saving…' : 'Save Report & Complete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Imaging() {
  const navigate = useNavigate()
  const today = format(new Date(), 'yyyy-MM-dd')
  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('')
  const [dateFilter, setDate]     = useState(today)
  const [expanded, setExpanded]   = useState(new Set())

  const load = () => {
    setLoading(true)
    imagingApi.getOrders({ limit: 200 })
      .then(r => setOrders(Array.isArray(r) ? r : []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  // Group by patient
  const grouped = (() => {
    const q = orders.filter(o => {
      const name = (o.patient_name || o.patient?.full_name || '').toLowerCase()
      const matchSearch = !search || name.includes(search.toLowerCase())
      const orderDate = o.created_at?.slice(0, 10)
      const matchDate = !dateFilter || orderDate === dateFilter
      const matchStatus = !statusFilter || o.status === statusFilter
      return matchSearch && matchDate && matchStatus
    })

    const map = {}
    q.forEach(o => {
      const pid = o.patient_id || o.patient?.id || o.id
      const name = o.patient_name || o.patient?.full_name || 'Unknown'
      const uhid = o.patient_uhid || o.patient?.clinic_patient_id || o.patient?.bh_id || ''
      if (!map[pid]) map[pid] = { pid, name, uhid, mobile: o.patient?.mobile || '', orders: [] }
      map[pid].orders.push(o)
    })
    return Object.values(map)
  })()

  const toggle = (pid) => setExpanded(prev => {
    const s = new Set(prev)
    s.has(pid) ? s.delete(pid) : s.add(pid)
    return s
  })

  return (
    <div>
      {/* Filters */}
      <div className="card p-3 mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-40">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-8 py-1.5 text-sm" placeholder="Search patient…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <input type="date" className="input py-1.5 text-sm w-40" value={dateFilter}
          onChange={e => setDate(e.target.value)} />
        {dateFilter && (
          <button onClick={() => setDate('')} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
        )}
        <div className="flex gap-1">
          <button onClick={() => setStatus('')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${!statusFilter ? 'text-white border-transparent' : 'border-gray-200 text-gray-500'}`}
            style={!statusFilter ? { background: '#0F2557' } : {}}>All</button>
          {Object.entries(STATUS_META).map(([s, m]) => (
            <button key={s} onClick={() => setStatus(statusFilter === s ? '' : s)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${statusFilter === s ? 'text-white border-transparent' : 'border-gray-200 text-gray-500'}`}
              style={statusFilter === s ? { background: '#CC1414' } : {}}>
              {m.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-auto">{grouped.length} patient{grouped.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Patient table */}
      <div className="card overflow-hidden">
        {loading ? <PageLoader /> : grouped.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Scan size={40} className="mx-auto mb-3 opacity-25" />
            <p className="font-medium text-gray-500">No imaging orders found</p>
            <p className="text-sm mt-1">Try changing the date or status filter</p>
          </div>
        ) : (
          <table className="table w-full">
            <thead>
              <tr>
                <th className="th w-8"></th>
                <th className="th">Patient</th>
                <th className="th">UHID</th>
                <th className="th">Studies</th>
                <th className="th">Ordered</th>
                <th className="th">Status</th>
                <th className="th">Action</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map(({ pid, name, uhid, mobile, orders: ptOrders }) => {
                const open = expanded.has(pid)
                const statuses = [...new Set(ptOrders.map(o => o.status))]
                const hasPending = ptOrders.some(o => o.status !== 'completed' && o.status !== 'cancelled')
                const latest = ptOrders[0]

                return [
                  <tr key={pid} className="tr-hover cursor-pointer" onClick={() => toggle(pid)}>
                    <td className="td text-gray-400">
                      {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </td>
                    <td className="td">
                      <div className="font-semibold text-gray-900">{name}</div>
                      {mobile && <div className="text-xs text-gray-400">{mobile}</div>}
                    </td>
                    <td className="td font-mono text-xs text-gray-500">{uhid || '—'}</td>
                    <td className="td">
                      <div className="text-sm text-gray-700">{ptOrders.length} study/studies</div>
                      <div className="text-xs text-gray-400">
                        {ptOrders.map(o => o.modality).join(', ')}
                      </div>
                    </td>
                    <td className="td text-xs text-gray-400">
                      {latest?.created_at ? new Date(latest.created_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="td">
                      <div className="flex flex-wrap gap-1">
                        {statuses.map(s => (
                          <span key={s} className={`${(STATUS_META[s] || {}).cls || 'badge-gray'} text-xs`}>
                            {(STATUS_META[s] || {}).label || s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="td" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {hasPending && (
                          <button
                            onClick={() => setExpanded(prev => new Set([...prev, pid]))}
                            className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100"
                          >
                            Report
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/patients/${latest?.patient_id}`)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                        >
                          Patient Chart →
                        </button>
                      </div>
                    </td>
                  </tr>,
                  open && (
                    <tr key={`${pid}-expand`}>
                      <td colSpan={7} className="p-0">
                        <PatientImagingRow orders={ptOrders} onRefresh={load} />
                      </td>
                    </tr>
                  ),
                ]
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
