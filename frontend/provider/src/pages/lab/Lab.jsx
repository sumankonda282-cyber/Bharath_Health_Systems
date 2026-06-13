import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { labApi, patientsApi } from '../../api'
import { PageLoader } from '../../components/ui/Spinner'
import { FlaskConical, CheckCircle, ChevronDown, ChevronRight, Search, X, Upload, FileText } from 'lucide-react'
import { format } from 'date-fns'

const STATUS_META = {
  ordered:          { label: 'Ordered',          cls: 'badge-yellow',  next: 'sample_collected', action: 'Collect Sample' },
  sample_collected: { label: 'Sample Collected',  cls: 'badge-blue',    next: 'processing',       action: 'Start Processing' },
  processing:       { label: 'Processing',         cls: 'badge-purple',  next: null,               action: 'Enter Results' },
  completed:        { label: 'Completed',          cls: 'badge-green',   next: null,               action: 'View Results' },
  cancelled:        { label: 'Cancelled',          cls: 'badge-gray',    next: null,               action: null },
}

const ALL_STATUSES = ['ordered', 'sample_collected', 'processing', 'completed']

// ── Expanded patient row ───────────────────────────────────────────────────────
function PatientOrdersRow({ orders, onRefresh }) {
  const [saving, setSaving]   = useState(false)
  const [results, setResults] = useState({}) // orderId → { items: [...] }
  const [editing, setEditing] = useState(null) // orderId
  const [flash, setFlash]     = useState('')

  const openEdit = (order) => {
    setEditing(order.id)
    setResults(prev => ({
      ...prev,
      [order.id]: {
        items: (order.items || []).map(it => ({
          id: it.id,
          test_name: it.test_name || it.test?.name || '',
          result_value: it.result_value || '',
          result_notes: it.result_notes || '',
          is_abnormal: it.is_abnormal || false,
          unit: it.unit || '',
          reference_range: it.reference_range || '',
        })),
      },
    }))
  }

  const setItem = (orderId, idx, key, val) =>
    setResults(prev => ({
      ...prev,
      [orderId]: {
        items: prev[orderId].items.map((it, i) => i === idx ? { ...it, [key]: val } : it),
      },
    }))

  const saveResults = async (orderId) => {
    setSaving(true)
    try {
      await labApi.addResults(orderId, results[orderId].items)
      setFlash('Results saved')
      setEditing(null)
      setTimeout(() => setFlash(''), 2000)
      onRefresh()
    } catch (e) {
      setFlash('Error: ' + e.message)
    } finally { setSaving(false) }
  }

  const advanceStatus = async (order) => {
    const meta = STATUS_META[order.status]
    if (!meta?.next) { openEdit(order); return }
    setSaving(true)
    try {
      await labApi.updateStatus(order.id, meta.next)
      onRefresh()
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
        const res = results[order.id]

        return (
          <div key={order.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Order header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-gray-400">LAB-{order.id}</span>
                <span className="text-sm font-medium text-gray-700">
                  {(order.items || []).map(it => it.test_name || it.test?.name).join(', ') || 'Lab order'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`${meta.cls}`}>{meta.label}</span>
                {meta.action && (
                  <button
                    onClick={() => meta.next ? advanceStatus(order) : openEdit(order)}
                    disabled={saving}
                    className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    {meta.action}
                  </button>
                )}
              </div>
            </div>

            {/* Test results table */}
            {!isEditing && order.status === 'completed' && (order.items || []).length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Test', 'Result', 'Unit', 'Reference', 'Flag'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-gray-500 font-semibold uppercase text-xs tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(order.items || []).map((it, i) => (
                      <tr key={i} className={it.is_abnormal ? 'bg-red-50' : ''}>
                        <td className="px-3 py-2 font-medium text-gray-700">{it.test_name || it.test?.name}</td>
                        <td className={`px-3 py-2 font-bold ${it.is_abnormal ? 'text-red-600' : 'text-gray-900'}`}>{it.result_value || '—'}</td>
                        <td className="px-3 py-2 text-gray-400">{it.unit || '—'}</td>
                        <td className="px-3 py-2 text-gray-400">{it.reference_range || '—'}</td>
                        <td className="px-3 py-2">{it.is_abnormal ? <span className="text-red-600 font-bold">↑ Abnormal</span> : <span className="text-green-600">Normal</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Result entry form */}
            {isEditing && res && (
              <div className="p-4 space-y-3">
                {res.items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-2 md:grid-cols-4 gap-2 pb-3 border-b border-gray-100 last:border-0">
                    <div className="md:col-span-4 text-xs font-semibold text-gray-600 mb-1">{it.test_name}</div>
                    <div>
                      <label className="label text-xs">Result *</label>
                      <input className="input py-1 text-sm" placeholder="Value"
                        value={it.result_value}
                        onChange={e => setItem(order.id, idx, 'result_value', e.target.value)} />
                    </div>
                    <div>
                      <label className="label text-xs">Unit</label>
                      <input className="input py-1 text-sm" placeholder="e.g. g/dL"
                        value={it.unit}
                        onChange={e => setItem(order.id, idx, 'unit', e.target.value)} />
                    </div>
                    <div>
                      <label className="label text-xs">Reference range</label>
                      <input className="input py-1 text-sm" placeholder="e.g. 12–16"
                        value={it.reference_range}
                        onChange={e => setItem(order.id, idx, 'reference_range', e.target.value)} />
                    </div>
                    <div className="flex items-end gap-2 pb-1">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-red-600 font-medium">
                        <input type="checkbox" checked={it.is_abnormal}
                          onChange={e => setItem(order.id, idx, 'is_abnormal', e.target.checked)} />
                        Abnormal
                      </label>
                    </div>
                    <div className="md:col-span-4">
                      <input className="input py-1 text-xs" placeholder="Notes (optional)"
                        value={it.result_notes}
                        onChange={e => setItem(order.id, idx, 'result_notes', e.target.value)} />
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 justify-end pt-1">
                  <button onClick={() => setEditing(null)} className="btn-secondary text-sm py-1.5">Cancel</button>
                  <button onClick={() => saveResults(order.id)} disabled={saving}
                    className="btn-primary text-sm py-1.5 flex items-center gap-1.5">
                    <CheckCircle size={13} />{saving ? 'Saving…' : 'Save & Complete'}
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
export default function Lab() {
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
    labApi.getOrders({ limit: 200, status: statusFilter || undefined })
      .then(r => setOrders(Array.isArray(r) ? r : []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [statusFilter])

  // Group orders by patient
  const grouped = (() => {
    const q = orders.filter(o => {
      const name = (o.patient_name || o.patient?.full_name || '').toLowerCase()
      const matchSearch = !search || name.includes(search.toLowerCase())
      const orderDate = o.created_at?.slice(0, 10)
      const matchDate = !dateFilter || orderDate === dateFilter
      return matchSearch && matchDate
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
          {ALL_STATUSES.map(s => (
            <button key={s} onClick={() => setStatus(statusFilter === s ? '' : s)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors capitalize ${statusFilter === s ? 'text-white border-transparent' : 'border-gray-200 text-gray-500'}`}
              style={statusFilter === s ? { background: '#CC1414' } : {}}>
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-auto">{grouped.length} patient{grouped.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Patient table */}
      <div className="card overflow-hidden">
        {loading ? <PageLoader /> : grouped.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <FlaskConical size={40} className="mx-auto mb-3 opacity-25" />
            <p className="font-medium text-gray-500">No lab orders found</p>
            <p className="text-sm mt-1">Try changing the date or status filter</p>
          </div>
        ) : (
          <table className="table w-full">
            <thead>
              <tr>
                <th className="th w-8"></th>
                <th className="th">Patient</th>
                <th className="th">UHID</th>
                <th className="th">Tests</th>
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
                const testCount = ptOrders.reduce((n, o) => n + (o.items?.length || 1), 0)
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
                      <span className="text-sm text-gray-700">{testCount} test{testCount !== 1 ? 's' : ''}</span>
                      <div className="text-xs text-gray-400">
                        {ptOrders.flatMap(o => o.items || []).slice(0, 2).map(it => it.test_name || it.test?.name).join(', ')}
                        {testCount > 2 ? ` +${testCount - 2} more` : ''}
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
                            onClick={() => { setExpanded(prev => new Set([...prev, pid])) }}
                            className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100"
                          >
                            Process
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
                        <PatientOrdersRow orders={ptOrders} onRefresh={load} />
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
