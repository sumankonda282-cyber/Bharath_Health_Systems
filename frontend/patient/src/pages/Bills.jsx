import { useState, useEffect, useMemo } from 'react'
import api from '../api/client'
import { cachedFetch, cacheClear } from '../utils/cache'
import { Receipt, IndianRupee, TrendingUp, Download, ChevronDown, ChevronUp } from 'lucide-react'

const STATUS_CFG = {
  paid:      { bg: '#f0fdf4', color: '#16a34a', label: 'Paid' },
  pending:   { bg: '#fefce8', color: '#ca8a04', label: 'Pending' },
  partial:   { bg: '#eff6ff', color: '#1d4ed8', label: 'Partial' },
  cancelled: { bg: '#f3f4f6', color: '#6b7280', label: 'Cancelled' },
}

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] || STATUS_CFG.pending
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ background: c.bg, color: c.color }}>{c.label}</span>
  )
}

function BillRow({ bill, expanded, onToggle }) {
  const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
  const due = bill.amount_due ?? (bill.total - bill.amount_paid)

  const downloadPDF = async () => {
    try {
      const res = await api.get(`/pdf/portal/invoice/${bill.id}`, { responseType: 'blob' })
      const blob = res instanceof Blob ? res : res.data || res
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `invoice-${bill.invoice_number || bill.id}.pdf`; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch { /* PDF may not be available */ }
  }

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-3">
          <span className="font-mono text-xs font-bold" style={{ color: '#0F2557' }}>
            {bill.invoice_number || `INV-${bill.id}`}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-700">{bill.clinic_name || '—'}</td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {bill.doctor_name ? (
            /^dr\.?\s/i.test(bill.doctor_name) ? bill.doctor_name : `Dr. ${bill.doctor_name}`
          ) : <span className="text-gray-300">—</span>}
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(bill.date)}</td>
        <td className="px-4 py-3 font-bold text-sm" style={{ color: '#0F2557' }}>
          ₹{parseFloat(bill.total || 0).toLocaleString('en-IN')}
        </td>
        <td className="px-4 py-3 text-sm font-semibold" style={{ color: '#16a34a' }}>
          ₹{parseFloat(bill.amount_paid || 0).toLocaleString('en-IN')}
        </td>
        <td className="px-4 py-3 text-sm font-semibold" style={{ color: due > 0 ? '#CC1414' : '#16a34a' }}>
          {due > 0 ? `₹${parseFloat(due).toLocaleString('en-IN')}` : '—'}
        </td>
        <td className="px-4 py-3"><StatusBadge status={bill.status} /></td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <button onClick={e => { e.stopPropagation(); downloadPDF() }}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
              title="Download PDF">
              <Download size={11} /> PDF
            </button>
            {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </div>
        </td>
      </tr>

      {expanded && (
        <tr style={{ background: '#f8faff' }}>
          <td colSpan={9} className="px-6 py-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Bill Items</div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-blue-100">
                  <th className="pb-2 text-xs font-semibold text-gray-500">Description</th>
                  <th className="pb-2 text-xs font-semibold text-gray-500 text-center">Qty</th>
                  <th className="pb-2 text-xs font-semibold text-gray-500 text-right">Unit Price</th>
                  <th className="pb-2 text-xs font-semibold text-gray-500 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(bill.items || []).map((item, i) => (
                  <tr key={i} className="border-b border-blue-50 last:border-0">
                    <td className="py-1.5 text-sm text-gray-700">
                      {item.description}
                      {item.item_type && (
                        <span className="ml-2 text-xs text-gray-400 capitalize">({item.item_type})</span>
                      )}
                    </td>
                    <td className="py-1.5 text-sm text-gray-500 text-center">{item.quantity ?? 1}</td>
                    <td className="py-1.5 text-sm text-gray-500 text-right">
                      {item.unit_price != null ? `₹${parseFloat(item.unit_price).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-1.5 text-sm font-semibold text-right" style={{ color: '#0F2557' }}>
                      ₹{parseFloat(item.amount || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-blue-100">
                  <td colSpan={3} className="pt-2 text-sm font-bold text-gray-700 text-right pr-4">Total</td>
                  <td className="pt-2 text-sm font-extrabold text-right" style={{ color: '#0F2557' }}>
                    ₹{parseFloat(bill.total || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
                {bill.amount_paid > 0 && (
                  <tr>
                    <td colSpan={3} className="pt-1 text-xs text-gray-500 text-right pr-4">
                      Paid{bill.payment_method ? ` (${bill.payment_method})` : ''}
                    </td>
                    <td className="pt-1 text-xs font-semibold text-right" style={{ color: '#16a34a' }}>
                      ₹{parseFloat(bill.amount_paid).toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}
                {due > 0 && (
                  <tr>
                    <td colSpan={3} className="pt-1 text-xs text-gray-500 text-right pr-4">Balance Due</td>
                    <td className="pt-1 text-xs font-bold text-right" style={{ color: '#CC1414' }}>
                      ₹{parseFloat(due).toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </td>
        </tr>
      )}
    </>
  )
}

export default function Bills() {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [seeding, setSeeding] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [sort, setSort] = useState('latest')
  const [filterClinic, setFilterClinic] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    cachedFetch('bills', () => api.get('/portal/bills'),
      r => { setBills(r?.bills || r?.data?.bills || []); setLoading(false) }
    ).catch(() => setLoading(false))
  }, [])

  const seedDemo = async () => {
    setSeeding(true)
    try {
      await api.post('/portal/seed-demo')
      await cacheClear()
      window.location.reload()
    } catch (e) {
      const msg = (e.message === 'Network Error' || e.code === 'ECONNABORTED')
        ? 'The server is waking up — please wait 30 seconds and try again.'
        : (e.message || 'Failed to load demo data')
      alert(msg)
    }
    finally { setSeeding(false) }
  }

  const clinics = useMemo(() => [...new Set(bills.map(b => b.clinic_name).filter(Boolean))], [bills])

  const filtered = useMemo(() => {
    let list = [...bills]
    if (statusFilter !== 'all') list = list.filter(b => b.status === statusFilter)
    if (filterClinic) list = list.filter(b => b.clinic_name === filterClinic)
    if (fromDate) list = list.filter(b => b.date >= fromDate)
    if (toDate) list = list.filter(b => b.date <= toDate)
    if (sort === 'latest') list.sort((a, b) => (b.date || '') > (a.date || '') ? 1 : -1)
    else if (sort === 'oldest') list.sort((a, b) => (a.date || '') > (b.date || '') ? 1 : -1)
    else if (sort === 'amount_desc') list.sort((a, b) => b.total - a.total)
    else if (sort === 'amount_asc') list.sort((a, b) => a.total - b.total)
    return list
  }, [bills, statusFilter, sort, filterClinic, fromDate, toDate])

  const totalPaid = bills.filter(b => b.status === 'paid').reduce((s, b) => s + (b.amount_paid || 0), 0)
  const totalDue  = bills.reduce((s, b) => s + Math.max(0, (b.total || 0) - (b.amount_paid || 0)), 0)

  return (
    <div className="space-y-4">
      {/* Summary */}
      {bills.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#F0FDF4' }}>
              <IndianRupee size={18} style={{ color: '#16a34a' }} />
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">Total Paid</div>
              <div className="text-lg font-extrabold" style={{ color: '#16a34a' }}>₹{totalPaid.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FEF2F2' }}>
              <TrendingUp size={18} style={{ color: '#CC1414' }} />
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">Balance Due</div>
              <div className="text-lg font-extrabold" style={{ color: totalDue > 0 ? '#CC1414' : '#16a34a' }}>
                ₹{totalDue.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#EEF2FF' }}>
              <Receipt size={18} style={{ color: '#0F2557' }} />
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">Total Bills</div>
              <div className="text-lg font-extrabold" style={{ color: '#0F2557' }}>{bills.length}</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {[['all','All'],['paid','Paid'],['pending','Pending'],['partial','Partial']].map(([v,label]) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
              style={statusFilter === v ? { background: '#0F2557', color: '#fff' } : { color: '#6b7280' }}>
              {label}
            </button>
          ))}
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)} className="input sm:w-44">
          <option value="latest">Latest first</option>
          <option value="oldest">Oldest first</option>
          <option value="amount_desc">Amount ↓</option>
          <option value="amount_asc">Amount ↑</option>
        </select>
        {clinics.length > 0 && (
          <select value={filterClinic} onChange={e => setFilterClinic(e.target.value)} className="input sm:w-52">
            <option value="">All Health Centers</option>
            {clinics.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <div className="flex items-center gap-1">
          <label className="text-xs text-gray-500 whitespace-nowrap">From</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="input sm:w-36" style={{ colorScheme: 'light' }} />
        </div>
        <div className="flex items-center gap-1">
          <label className="text-xs text-gray-500 whitespace-nowrap">To</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="input sm:w-36" style={{ colorScheme: 'light' }} />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card p-10 text-center text-gray-400 text-sm">Loading…</div>
      ) : bills.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <Receipt size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No bills on record</p>
          <p className="text-sm mt-1 text-gray-300">Invoices from your visits will appear here</p>
          <button onClick={seedDemo} disabled={seeding}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-dashed border-gray-300 text-gray-400 hover:border-orange-300 hover:text-orange-500 transition-colors disabled:opacity-50">
            {seeding ? 'Loading…' : '⚗ Load demo data'}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-gray-400 text-sm">No bills match the current filters.</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Invoice #</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Health Center</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Doctor</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Paid</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Due</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Details ▼</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <BillRow key={b.id} bill={b}
                    expanded={expandedId === b.id}
                    onToggle={() => setExpandedId(expandedId === b.id ? null : b.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
