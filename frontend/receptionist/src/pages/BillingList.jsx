import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { Search, FileText, Loader2, CheckCircle, RefreshCw, ChevronRight } from 'lucide-react'

const fmt = n => `₹${(+n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

function fmtDate(str) {
  if (!str) return '—'
  try { return new Date(str).toLocaleDateString('en-IN', { dateStyle: 'medium' }) }
  catch { return str }
}

const today      = () => new Date().toISOString().slice(0, 10)
const weekStart  = () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0, 10) }
const monthStart = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

function statusBadge(s) {
  if (s === 'paid')    return 'bg-green-100 text-green-700'
  if (s === 'partial') return 'bg-yellow-100 text-yellow-700'
  return 'bg-amber-100 text-amber-700'
}

function useDebounce(v, d) {
  const [dv, setDv] = useState(v)
  useEffect(() => { const t = setTimeout(() => setDv(v), d); return () => clearTimeout(t) }, [v, d])
  return dv
}

export default function BillingList() {
  const navigate = useNavigate()
  const [invoices, setInvoices]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [dateRange, setDateRange]       = useState('today')
  const [customFrom, setCustomFrom]     = useState(today())
  const [customTo, setCustomTo]         = useState(today())
  const [statusFilter, setStatusFilter] = useState('all')
  const debouncedSearch = useDebounce(search, 400)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/billing/invoices', { params: { limit: 200 } })
      setInvoices(Array.isArray(r) ? r : [])
    } catch { setInvoices([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const h = () => load()
    window.addEventListener('bharatcliniq:refresh', h)
    return () => window.removeEventListener('bharatcliniq:refresh', h)
  }, [load])

  const filtered = invoices.filter(inv => {
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      if (!(inv.patient_name || '').toLowerCase().includes(q) &&
          !(inv.invoice_number || String(inv.id)).toLowerCase().includes(q)) return false
    }
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false
    const d = (inv.created_at || '').slice(0, 10)
    if (!d) return true
    if (dateRange === 'today')  return d === today()
    if (dateRange === 'week')   return d >= weekStart()
    if (dateRange === 'month')  return d >= monthStart()
    if (dateRange === 'custom') return d >= customFrom && d <= customTo
    return true
  })

  const totals = filtered.reduce(
    (a, inv) => ({
      total: a.total + (+inv.total_amount || 0),
      paid:  a.paid  + (+inv.amount_paid  || 0),
      due:   a.due   + Math.max(0, (+inv.total_amount || 0) - (+inv.amount_paid || 0)),
    }),
    { total: 0, paid: 0, due: 0 }
  )

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-sm text-gray-400 mt-0.5">{filtered.length} invoice{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total Billed', value: totals.total, color: '#0F2557' },
          { label: 'Collected',    value: totals.paid,  color: '#16a34a' },
          { label: 'Outstanding',  value: totals.due,   color: '#dc2626' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
            <div className="text-xs text-gray-400 mb-1">{s.label}</div>
            <div className="text-lg font-bold" style={{ color: s.color }}>{fmt(s.value)}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-xl p-3 mb-4 shadow-sm space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-8 text-sm w-full" placeholder="Search patient or invoice #…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          {[
            { key: 'today',  label: 'Today' },
            { key: 'week',   label: 'This Week' },
            { key: 'month',  label: 'This Month' },
            { key: 'custom', label: 'Custom' },
          ].map(d => (
            <button key={d.key} onClick={() => setDateRange(d.key)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${dateRange === d.key ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              style={dateRange === d.key ? { background: '#0F2557' } : {}}>
              {d.label}
            </button>
          ))}
          <div className="w-px h-4 bg-gray-200 mx-0.5" />
          {['all', 'pending', 'partial', 'paid'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${statusFilter === s ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              style={statusFilter === s ? { background: '#F5821E' } : {}}>
              {s}
            </button>
          ))}
        </div>
        {dateRange === 'custom' && (
          <div className="flex gap-2">
            <input type="date" className="input text-xs flex-1" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            <input type="date" className="input text-xs flex-1" value={customTo}   onChange={e => setCustomTo(e.target.value)} />
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-gray-300" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <FileText size={36} className="mb-3 opacity-20" />
            <p className="font-medium text-gray-500">{invoices.length === 0 ? 'No invoices yet' : 'No results match your filters'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Patient</th>
                  <th className="px-4 py-3 text-left">Invoice</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Due</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(inv => {
                  const due = Math.max(0, (+inv.total_amount || 0) - (+inv.amount_paid || 0))
                  return (
                    <tr key={inv.id}
                      onClick={() => navigate(`/billing/${inv.id}`)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-900">{inv.patient_name || 'Walk-in'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{inv.invoice_number || `#${inv.id}`}</td>
                      <td className="px-4 py-3 text-gray-500">{fmtDate(inv.created_at)}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-700">{fmt(inv.total_amount)}</td>
                      <td className="px-4 py-3 text-right font-medium text-green-600">{fmt(inv.amount_paid)}</td>
                      <td className="px-4 py-3 text-right font-bold">
                        {due > 0
                          ? <span style={{ color: '#dc2626' }}>{fmt(due)}</span>
                          : <CheckCircle size={14} className="inline text-green-500" />
                        }
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(inv.status)}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight size={16} className="text-gray-300" />
                      </td>
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
