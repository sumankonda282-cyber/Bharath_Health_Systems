import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { Search, X, Loader2, ChevronRight, Clock, CalendarDays, Video, Users } from 'lucide-react'

const today = () => new Date().toISOString().split('T')[0]

const STATUS_COLORS = {
  scheduled: 'bg-blue-100 text-blue-700',
  waiting: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
  no_show: 'bg-red-100 text-red-600',
}

const BILL_COLORS = {
  no_invoice: 'bg-gray-100 text-gray-500',
  pending: 'bg-amber-100 text-amber-700',
  partial: 'bg-orange-100 text-orange-700',
  paid: 'bg-green-100 text-green-700',
}

const VISIT_LABELS = {
  walk_in: 'Walk-in', scheduled: 'Scheduled', follow_up: 'Follow-up',
  emergency: 'Emergency', telehealth: 'Telehealth',
}

function billLabel(s) {
  if (!s) return 'No Invoice'
  if (s === 'paid') return 'Paid'
  if (s === 'partial') return 'Partial'
  if (s.startsWith('scheme_')) return `Scheme: ${s.replace('scheme_', '')}`
  if (s === 'pending') return 'Pending'
  return 'No Invoice'
}

function billColor(s) {
  if (!s || s === 'no_invoice') return BILL_COLORS.no_invoice
  if (s === 'paid') return BILL_COLORS.paid
  if (s === 'partial') return BILL_COLORS.partial
  if (s.startsWith('scheme_')) return 'bg-blue-100 text-blue-700'
  return BILL_COLORS.pending
}

export default function Operations() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('live')           // 'live' | 'range'
  const [dateFrom, setDateFrom] = useState(today())
  const [dateTo, setDateTo] = useState(today())
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterBilling, setFilterBilling] = useState('')
  const timerRef = useRef(null)

  const load = useCallback(() => {
    setLoading(true)
    const params = {
      date_from: mode === 'live' ? today() : dateFrom,
      date_to: mode === 'live' ? today() : dateTo,
      limit: 300,
    }
    if (filterStatus) params.status = filterStatus
    if (filterType) params.visit_type = filterType
    if (filterBilling) params.billing_status = filterBilling
    if (search) params.search = search
    api.get('/clinic/billing/operations', { params })
      .then(r => setRows(Array.isArray(r) ? r : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [mode, dateFrom, dateTo, filterStatus, filterType, filterBilling, search])

  useEffect(() => {
    load()
    if (mode === 'live') {
      timerRef.current = setInterval(load, 30000)
    }
    return () => clearInterval(timerRef.current)
  }, [load, mode])

  const waiting      = rows.filter(r => r.status === 'waiting').length
  const inProgress   = rows.filter(r => r.status === 'in_progress').length
  const completed    = rows.filter(r => r.status === 'completed').length
  const telehealth   = rows.filter(r => r.mode === 'telehealth').length
  const pendingBills = rows.filter(r => r.billing_status === 'pending' || r.billing_status === 'no_invoice').length

  const hasFilters = filterStatus || filterType || filterBilling || search

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            <button onClick={() => setMode('live')}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${mode === 'live' ? 'text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              style={mode === 'live' ? { background: '#0F2557' } : {}}>
              Live Today
            </button>
            <button onClick={() => setMode('range')}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${mode === 'range' ? 'text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              style={mode === 'range' ? { background: '#0F2557' } : {}}>
              Date Range
            </button>
          </div>
        </div>
      </div>

      {/* Date range picker */}
      {mode === 'range' && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input w-auto" />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input w-auto" />
        </div>
      )}

      {/* Live stat pills */}
      {mode === 'live' && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
          {[
            { label: 'Waiting', count: waiting, color: '#F5821E' },
            { label: 'In Consultation', count: inProgress, color: '#7C3AED' },
            { label: 'Completed', count: completed, color: '#16A34A' },
            { label: 'Telehealth', count: telehealth, color: '#0891B2' },
            { label: 'Bills Pending', count: pendingBills, color: '#DC2626' },
          ].map(p => (
            <div key={p.label} className="card p-3 flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
              <div>
                <div className="text-xl font-extrabold leading-none" style={{ color: p.color }}>{p.count}</div>
                <div className="text-xs text-gray-500 mt-0.5">{p.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input placeholder="Search patient…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-8 w-48 text-sm py-1.5" />
        </div>
        <select className="input w-auto text-sm py-1.5" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {['scheduled','waiting','in_progress','completed','cancelled','no_show'].map(s =>
            <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
        </select>
        <select className="input w-auto text-sm py-1.5" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {Object.entries(VISIT_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="input w-auto text-sm py-1.5" value={filterBilling} onChange={e => setFilterBilling(e.target.value)}>
          <option value="">All Billing</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="scheme">Scheme / Insurance</option>
          <option value="no_invoice">No Invoice</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterType(''); setFilterBilling('') }}
            className="btn-secondary text-xs py-1 px-3 flex items-center gap-1">
            <X size={12} />Clear
          </button>
        )}
        <span className="text-xs text-gray-400 self-center">{rows.length} records</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-gray-400" /></div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Users size={32} className="mx-auto mb-2 opacity-30" />
            <p>No records found</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th className="th">#</th>
                  <th className="th">Patient</th>
                  <th className="th">Doctor</th>
                  {mode === 'range' && <th className="th">Date</th>}
                  <th className="th">Time</th>
                  <th className="th">Type</th>
                  <th className="th">Status</th>
                  <th className="th">Billing</th>
                  <th className="th text-right">Amount</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(r => (
                  <tr key={r.appointment_id}
                    className="tr-hover cursor-pointer"
                    onClick={() => navigate(`/operations/${r.appointment_id}`)}>
                    <td className="td font-bold" style={{ color: '#0F2557' }}>
                      {r.token_number ? `#${r.token_number}` : `A${r.appointment_id}`}
                    </td>
                    <td className="td">
                      <div className="font-medium text-gray-900">{r.patient_name}</div>
                      {r.bh_id && <div className="text-xs text-gray-400">{r.bh_id}</div>}
                    </td>
                    <td className="td text-gray-600 text-sm">{r.doctor_name || '—'}</td>
                    {mode === 'range' && <td className="td text-sm text-gray-500">{r.date}</td>}
                    <td className="td text-sm text-gray-500">{r.time || '—'}</td>
                    <td className="td">
                      <span className="flex items-center gap-1 text-xs font-medium text-gray-600">
                        {r.mode === 'telehealth' && <Video size={11} className="text-cyan-500" />}
                        {VISIT_LABELS[r.visit_type] || r.visit_type}
                      </span>
                    </td>
                    <td className="td">
                      <span className={`badge text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-500'}`}>
                        {(r.status || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="td">
                      <span className={`badge text-xs px-2 py-0.5 rounded-full font-medium ${billColor(r.billing_status)}`}>
                        {billLabel(r.billing_status)}
                      </span>
                    </td>
                    <td className="td text-right font-semibold text-sm" style={{ color: '#0F2557' }}>
                      {r.total > 0 ? `₹${r.total.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="td">
                      <ChevronRight size={16} className="text-gray-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
