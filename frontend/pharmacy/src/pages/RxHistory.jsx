import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import api from '../api/client'
import { cachedFetch, cacheInvalidate, TTL } from '../utils/cache'
import {
  History, Loader2, Search, Eye, Printer, X, RefreshCw, AlertTriangle,
  CheckCircle, Clock,
} from 'lucide-react'

function todayStr() { return new Date().toISOString().slice(0, 10) }

function statusBadge(s) {
  if (s === 'dispensed') return 'badge badge-green'
  if (s === 'pending')   return 'badge badge-yellow'
  if (s === 'cancelled') return 'badge badge-red'
  return 'badge badge-gray'
}

function PrintModal({ invoice, onClose }) {
  const printRef = useRef(null)

  function doPrint() {
    const win = window.open('', '_blank')
    win.document.write(`<html><head><title>Invoice</title><style>
      body{font-family:sans-serif;padding:20px;font-size:12px}
      table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}
      th{background:#f3f4f6} h2{margin:4px 0}
    </style></head><body>${printRef.current?.innerHTML || ''}</body></html>`)
    win.document.close(); win.print()
  }

  if (!invoice) return null

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold" style={{ color: '#0F2557' }}>Invoice Detail</h3>
          <div className="flex gap-2">
            <button onClick={doPrint} className="btn-primary text-sm py-1.5"><Printer size={14} />Print</button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
          </div>
        </div>
        <div className="p-5" ref={printRef}>
          <h2 className="text-xl font-bold mb-1" style={{ color: '#0F2557' }}>Bharath Health Pharmacy</h2>
          <p className="text-sm text-gray-500 mb-1">Invoice: {invoice.invoice_number || `INV-${invoice.id}`}</p>
          <p className="text-sm text-gray-500 mb-4">Date: {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString('en-IN') : '—'}</p>
          <div className="mb-4 p-3 bg-gray-50 rounded-xl text-sm">
            <p><strong>Patient:</strong> {invoice.patient_name || invoice.customer_name || 'Walk-in'}</p>
            {invoice.customer_mobile && <p><strong>Mobile:</strong> {invoice.customer_mobile}</p>}
          </div>
          <div className="table-wrapper mb-4">
            <table className="table">
              <thead><tr>
                <th className="th">#</th><th className="th">Item</th><th className="th">Qty</th>
                <th className="th">Price</th><th className="th">Disc</th><th className="th">GST%</th><th className="th">Amount</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {(invoice.items || []).map((it, i) => (
                  <tr key={i} className="tr-hover">
                    <td className="td">{i + 1}</td>
                    <td className="td">{it.description || it.medicine_name}</td>
                    <td className="td">{it.quantity}</td>
                    <td className="td">₹{Number(it.unit_price || 0).toFixed(2)}</td>
                    <td className="td">₹{Number(it.discount_amount || 0).toFixed(2)}</td>
                    <td className="td">{it.gst_rate || 0}%</td>
                    <td className="td font-semibold">₹{Number(it.total || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <div className="w-56 text-sm space-y-1">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₹{Number(invoice.subtotal || 0).toFixed(2)}</span></div>
              {Number(invoice.discount || 0) > 0 && <div className="flex justify-between text-green-700"><span>Discount</span><span>-₹{Number(invoice.discount).toFixed(2)}</span></div>}
              <div className="flex justify-between border-t border-gray-200 pt-1 font-bold text-base">
                <span style={{ color: '#0F2557' }}>Total</span><span style={{ color: '#0F2557' }}>₹{Number(invoice.total_amount || invoice.total || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500"><span>Paid</span><span>₹{Number(invoice.amount_paid || 0).toFixed(2)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const DATE_OPTS = [
  { key: 'today', label: 'Today' },
  { key: '7d',   label: 'Last 7d' },
  { key: '30d',  label: 'Last 30d' },
  { key: 'all',  label: 'All Time' },
]

export default function RxHistory() {
  const [rxList, setRxList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('7d')
  const [viewInvoice, setViewInvoice] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const load = useCallback(async (invalidate = false) => {
    setLoading(true); setError('')
    try {
      if (invalidate) await cacheInvalidate('rx_history')
      await cachedFetch('rx_history', () => api.get('/pharmacy/all', { params: { limit: 500 } }),
        r => { setRxList(Array.isArray(r) ? r : []); setLoading(false) }, TTL.MEDIUM)
    } catch (ex) { setError(ex.message || 'Failed to load Rx history'); setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const today = todayStr()
  const dateFrom = useMemo(() => {
    if (dateFilter === 'today') return today
    if (dateFilter === '7d') { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10) }
    if (dateFilter === '30d') { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10) }
    return null
  }, [dateFilter, today])

  const filtered = useMemo(() => {
    let list = rxList
    if (statusFilter !== 'all') list = list.filter(r => r.status === statusFilter)
    if (dateFrom) list = list.filter(r => (r.created_at || '').slice(0, 10) >= dateFrom)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        (r.patient_name || '').toLowerCase().includes(q) ||
        (r.prescription_number || '').toLowerCase().includes(q) ||
        (r.items || []).some(i => (i.medicine_name || '').toLowerCase().includes(q))
      )
    }
    return list.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [rxList, statusFilter, dateFrom, search])

  const stats = useMemo(() => {
    const todayRx = rxList.filter(r => (r.created_at || '').slice(0, 10) === today)
    return {
      total: todayRx.length,
      dispensed: todayRx.filter(r => r.status === 'dispensed').length,
      pending: todayRx.filter(r => r.status === 'pending').length,
    }
  }, [rxList, today])

  const viewDetail = async (rx) => {
    setLoadingDetail(true)
    try {
      const id = rx.invoice_id || rx.id
      setViewInvoice(await api.get(`/billing/invoices/${id}`))
    } catch { setViewInvoice(rx) } finally { setLoadingDetail(false) }
  }

  return (
    <div>
      {viewInvoice && <PrintModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />}

      <div className="page-header">
        <h1 className="page-title">Rx History</h1>
        <button onClick={() => load(true)} className="btn-secondary"><RefreshCw size={15} />Refresh</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#0F255718' }}>
            <History size={18} style={{ color: '#0F2557' }} />
          </div>
          <div><div className="text-xl font-bold" style={{ color: '#0F2557' }}>{stats.total}</div><div className="text-xs text-gray-500">Today's Rx</div></div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#16a34a18' }}>
            <CheckCircle size={18} style={{ color: '#16a34a' }} />
          </div>
          <div><div className="text-xl font-bold" style={{ color: '#16a34a' }}>{stats.dispensed}</div><div className="text-xs text-gray-500">Dispensed Today</div></div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#d9770618' }}>
            <Clock size={18} style={{ color: '#d97706' }} />
          </div>
          <div><div className="text-xl font-bold" style={{ color: '#d97706' }}>{stats.pending}</div><div className="text-xs text-gray-500">Pending Today</div></div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-40">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search patient or medicine…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-200 shadow-sm">
          {['all', 'dispensed', 'pending'].map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${statusFilter === f ? 'text-white' : 'text-gray-500 hover:text-gray-800'}`}
              style={statusFilter === f ? { background: '#0F2557' } : {}}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-200 shadow-sm">
          {DATE_OPTS.map(f => (
            <button key={f.key} onClick={() => setDateFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${dateFilter === f.key ? 'text-white' : 'text-gray-500 hover:text-gray-800'}`}
              style={dateFilter === f.key ? { background: '#0F2557' } : {}}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="flex justify-center py-24"><Loader2 size={32} className="animate-spin text-gray-400" /></div>
        : error ? (
          <div className="card p-10 text-center">
            <AlertTriangle size={28} className="mx-auto mb-2 text-red-500" />
            <p className="text-red-600">{error}</p>
            <button onClick={() => load()} className="btn-secondary mt-3">Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-14 text-center">
            <History size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-semibold">No prescriptions found</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="table-wrapper">
              <table className="table">
                <thead><tr>
                  <th className="th">Rx #</th><th className="th">Patient</th>
                  <th className="th">Items</th><th className="th">Status</th>
                  <th className="th">Date</th><th className="th">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(rx => (
                    <tr key={rx.id} className="tr-hover">
                      <td className="td font-mono text-xs text-gray-400">{rx.prescription_number || `RX-${rx.id}`}</td>
                      <td className="td">
                        <div className="font-semibold text-sm" style={{ color: '#0F2557' }}>{rx.patient_name || 'Walk-in'}</div>
                        {rx.patient_mobile && <div className="text-xs text-gray-400">{rx.patient_mobile}</div>}
                      </td>
                      <td className="td">
                        <div className="text-xs text-gray-500 space-y-0.5">
                          {(rx.items || []).slice(0, 2).map((it, i) => <div key={i}>{it.medicine_name || it.drug_name}</div>)}
                          {(rx.items || []).length > 2 && <div className="text-gray-400">+{(rx.items || []).length - 2} more</div>}
                        </div>
                      </td>
                      <td className="td"><span className={statusBadge(rx.status)}>{rx.status || '—'}</span></td>
                      <td className="td text-gray-500 text-xs">{rx.created_at ? new Date(rx.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—'}</td>
                      <td className="td">
                        <button onClick={() => viewDetail(rx)} disabled={loadingDetail} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="View detail">
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
              Showing {filtered.length} of {rxList.length} records
            </div>
          </div>
        )}
    </div>
  )
}
