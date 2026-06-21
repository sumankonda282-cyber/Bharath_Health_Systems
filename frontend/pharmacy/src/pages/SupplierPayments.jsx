import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { Wallet, CheckCircle, AlertCircle, Download, RefreshCw, Search } from 'lucide-react'

function todayStr() { return new Date().toISOString().split('T')[0] }
function monthStart() { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0] }

const MODES = ['cash', 'cheque', 'bank_transfer', 'upi', 'neft', 'rtgs']

function downloadCSV(rows) {
  const headers = ['Date', 'Supplier', 'PO Number', 'Amount', 'Mode', 'Reference', 'Notes']
  const lines = [
    headers.join(','),
    ...rows.map(r => [
      r.payment_date,
      `"${(r.supplier_name || '').replace(/"/g, '""')}"`,
      r.po_number || '',
      r.amount,
      r.payment_mode || '',
      r.reference_number || '',
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ].join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `supplier-payments-${todayStr()}.csv`
  a.click()
}

export default function SupplierPayments() {
  const [suppliers, setSuppliers]       = useState([])
  const [pos, setPos]                   = useState([])
  const [suppSearch, setSuppSearch]     = useState('')

  // Form
  const [suppId, setSuppId]             = useState('')
  const [poId, setPoId]                 = useState('')
  const [amount, setAmount]             = useState('')
  const [payDate, setPayDate]           = useState(todayStr())
  const [mode, setMode]                 = useState('cash')
  const [refNum, setRefNum]             = useState('')
  const [notes, setNotes]               = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [formErr, setFormErr]           = useState('')
  const [success, setSuccess]           = useState('')

  // Log
  const [payments, setPayments]         = useState([])
  const [logLoading, setLogLoading]     = useState(true)
  const [logErr, setLogErr]             = useState('')
  const [fromDate, setFromDate]         = useState(monthStart())
  const [toDate, setToDate]             = useState(todayStr())
  const [filterSupp, setFilterSupp]     = useState('')

  // Load suppliers
  useEffect(() => {
    api.get('/pharmacy/suppliers', { params: { limit: 200 } })
      .then(r => setSuppliers(Array.isArray(r) ? r : r.suppliers || []))
      .catch(() => {})
  }, [])

  // Load POs for selected supplier
  useEffect(() => {
    if (!suppId) { setPos([]); setPoId(''); return }
    api.get('/pharmacy/purchase-orders', { params: { supplier_id: suppId, status: 'received', limit: 50 } })
      .then(r => setPos(Array.isArray(r) ? r : r.purchase_orders || []))
      .catch(() => setPos([]))
  }, [suppId])

  const fetchPayments = useCallback(async () => {
    setLogLoading(true); setLogErr('')
    try {
      const r = await api.get('/pharmacy/supplier-payments', {
        params: { from_date: fromDate, to_date: toDate, supplier_id: filterSupp || undefined, limit: 100 },
      })
      setPayments(r.payments || [])
    } catch { setLogErr('Failed to load payment history') }
    finally { setLogLoading(false) }
  }, [fromDate, toDate, filterSupp])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  async function handleSubmit(e) {
    e.preventDefault()
    setFormErr(''); setSuccess('')
    if (!suppId)  { setFormErr('Select a supplier'); return }
    if (!amount || parseFloat(amount) <= 0) { setFormErr('Enter a valid amount'); return }
    setSubmitting(true)
    try {
      await api.post('/pharmacy/supplier-payments', {
        supplier_id:       parseInt(suppId),
        purchase_order_id: poId ? parseInt(poId) : undefined,
        amount:            parseFloat(amount),
        payment_date:      payDate,
        payment_mode:      mode,
        reference_number:  refNum.trim() || undefined,
        notes:             notes.trim() || undefined,
      })
      setSuccess('Payment recorded successfully')
      setSuppId(''); setPoId(''); setAmount(''); setRefNum(''); setNotes('')
      setPos([])
      fetchPayments()
    } catch (err) {
      setFormErr(err.message || 'Failed to record payment')
    } finally { setSubmitting(false) }
  }

  const filteredSuppliers = suppliers.filter(s =>
    !suppSearch || s.name.toLowerCase().includes(suppSearch.toLowerCase())
  )

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="page-header mb-6">
        <h1 className="page-title flex items-center gap-2">
          <Wallet className="w-5 h-5" /> Supplier Payments
        </h1>
      </div>

      {/* ── Form ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="font-semibold text-gray-800 mb-4">Record Payment</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Supplier *</label>
              <div className="relative mb-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input className="input pl-9" placeholder="Search supplier…"
                  value={suppSearch} onChange={e => { setSuppSearch(e.target.value); setSuppId('') }} />
              </div>
              <select className="input" value={suppId} onChange={e => { setSuppId(e.target.value); setSuppSearch('') }} required>
                <option value="">— Select Supplier —</option>
                {filteredSuppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Linked PO <span className="text-gray-400 font-normal">(optional)</span></label>
              <select className="input" value={poId} onChange={e => setPoId(e.target.value)} disabled={!suppId || pos.length === 0}>
                <option value="">— None / General Payment —</option>
                {pos.map(po => (
                  <option key={po.id} value={po.id}>
                    {po.po_number} · ₹{Number(po.total_amount || 0).toFixed(2)}
                  </option>
                ))}
              </select>
              {suppId && pos.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">No received POs found for this supplier</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="label">Amount ₹ *</label>
              <input type="number" className="input" min="0.01" step="0.01" placeholder="0.00"
                value={amount} onChange={e => setAmount(e.target.value)} required />
            </div>
            <div>
              <label className="label">Payment Date *</label>
              <input type="date" className="input" value={payDate} onChange={e => setPayDate(e.target.value)} required />
            </div>
            <div>
              <label className="label">Payment Mode</label>
              <select className="input" value={mode} onChange={e => setMode(e.target.value)}>
                {MODES.map(m => (
                  <option key={m} value={m}>{m.replace('_', ' ').toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Reference # <span className="text-gray-400 font-normal">(optional)</span></label>
              <input className="input" placeholder="Cheque/UTR/Txn ID"
                value={refNum} onChange={e => setRefNum(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <input className="input" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Additional notes…" />
          </div>

          {formErr && (
            <p className="text-red-500 text-sm flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />{formErr}
            </p>
          )}
          {success && (
            <p className="text-green-600 text-sm flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />{success}
            </p>
          )}

          <button type="submit" disabled={submitting}
            className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
            {submitting ? 'Saving…' : 'Record Payment'}
          </button>
        </form>
      </div>

      {/* ── History ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-800">Payment History</h2>
            {payments.length > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">Total paid in period: <strong className="text-gray-800">₹{totalPaid.toFixed(2)}</strong></p>
            )}
          </div>
          <button onClick={() => downloadCSV(payments)} disabled={!payments.length}
            className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-40">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <input type="date" className="input w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          <input type="date" className="input w-36" value={toDate} onChange={e => setToDate(e.target.value)} />
          <select className="input w-48" value={filterSupp} onChange={e => setFilterSupp(e.target.value)}>
            <option value="">All Suppliers</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {logLoading ? (
          <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>
        ) : logErr ? (
          <div className="py-10 text-center text-red-500 text-sm">{logErr}</div>
        ) : payments.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">No payments in this period</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Date', 'Supplier', 'PO', 'Amount', 'Mode', 'Reference', 'Notes'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap text-xs">{p.payment_date}</td>
                    <td className="px-3 py-2.5 font-medium text-gray-800">{p.supplier_name}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{p.po_number || '—'}</td>
                    <td className="px-3 py-2.5 font-semibold text-gray-800">₹{p.amount.toFixed(2)}</td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 uppercase">
                        {(p.payment_mode || 'cash').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{p.reference_number || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-500 max-w-xs truncate text-xs">{p.notes || '—'}</td>
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
