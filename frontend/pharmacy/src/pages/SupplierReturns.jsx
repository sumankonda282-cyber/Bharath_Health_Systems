import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { PackageX, CheckCircle, AlertCircle, RefreshCw, Plus, Trash2, Search } from 'lucide-react'

function todayStr() { return new Date().toISOString().split('T')[0] }

const REASONS = ['Damaged', 'Expired', 'Wrong item', 'Excess stock', 'Quality issue', 'Short expiry']
const EMPTY_ITEM = { medicine_id: '', medicine_name: '', batch_number: '', quantity: '', unit_cost: '' }

function statusBadge(s) {
  if (s === 'dispatched') return 'bg-blue-100 text-blue-700'
  if (s === 'credited')   return 'bg-green-100 text-green-700'
  return 'bg-amber-100 text-amber-700'
}

function todayMinus30() { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0] }

export default function SupplierReturns() {
  const [suppliers, setSuppliers]   = useState([])
  const [returns, setReturns]       = useState([])
  const [logLoading, setLogLoading] = useState(true)
  const [logErr, setLogErr]         = useState('')

  // Form
  const [suppId, setSuppId]         = useState('')
  const [returnDate, setReturnDate] = useState(todayStr())
  const [reason, setReason]         = useState('')
  const [notes, setNotes]           = useState('')
  const [items, setItems]           = useState([{ ...EMPTY_ITEM }])
  const [medSearchIdx, setMedSearchIdx] = useState(null)
  const [medResults, setMedResults] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [formErr, setFormErr]       = useState('')
  const [success, setSuccess]       = useState('')

  // Log filters
  const [fromDate, setFromDate]     = useState(todayMinus30())
  const [toDate, setToDate]         = useState(todayStr())
  const [filterSupp, setFilterSupp] = useState('')

  useEffect(() => {
    api.get('/pharmacy/suppliers', { params: { limit: 200 } })
      .then(r => setSuppliers(Array.isArray(r) ? r : r.suppliers || []))
      .catch(() => {})
  }, [])

  const fetchLog = useCallback(async () => {
    setLogLoading(true); setLogErr('')
    try {
      const r = await api.get('/pharmacy/supplier-returns', {
        params: { from_date: fromDate, to_date: toDate, supplier_id: filterSupp || undefined },
      })
      setReturns(r.returns || [])
    } catch { setLogErr('Failed to load returns') }
    finally { setLogLoading(false) }
  }, [fromDate, toDate, filterSupp])

  useEffect(() => { fetchLog() }, [fetchLog])

  function searchMeds(q, idx) {
    setMedSearchIdx(idx)
    if (q.length < 2) { setMedResults([]); return }
    api.get('/pharmacy/medicines', { params: { search: q, limit: 10 } })
      .then(r => setMedResults(Array.isArray(r) ? r : r.medicines || []))
      .catch(() => setMedResults([]))
  }

  function updateItem(idx, field, val) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it))
  }

  function addRow() { setItems(prev => [...prev, { ...EMPTY_ITEM }]) }
  function removeRow(idx) { setItems(prev => prev.filter((_, i) => i !== idx)) }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormErr(''); setSuccess('')
    if (!suppId)         { setFormErr('Select a supplier'); return }
    if (!reason.trim())  { setFormErr('Reason is required'); return }
    const validItems = items.filter(it => it.medicine_id && parseInt(it.quantity) > 0)
    if (validItems.length === 0) { setFormErr('Add at least one item with valid quantity'); return }
    setSubmitting(true)
    try {
      await api.post('/pharmacy/supplier-returns', {
        supplier_id:  parseInt(suppId),
        return_date:  returnDate,
        reason:       reason.trim(),
        notes:        notes.trim() || undefined,
        items: validItems.map(it => ({
          medicine_id:  parseInt(it.medicine_id),
          batch_number: it.batch_number || undefined,
          quantity:     parseInt(it.quantity),
          unit_cost:    it.unit_cost ? parseFloat(it.unit_cost) : undefined,
        })),
      })
      setSuccess('Return created and stock deducted')
      setSuppId(''); setReturnDate(todayStr()); setReason(''); setNotes('')
      setItems([{ ...EMPTY_ITEM }])
      fetchLog()
    } catch (err) {
      setFormErr(err.message || 'Failed to create return')
    } finally { setSubmitting(false) }
  }

  async function updateStatus(id, status) {
    try {
      await api.put(`/pharmacy/supplier-returns/${id}/status?status=${status}`)
      fetchLog()
    } catch (e) { alert(e?.response?.data?.detail || 'Could not update return status.') }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="font-semibold text-gray-800 mb-4">New Return</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Supplier *</label>
              <select className="input" value={suppId} onChange={e => setSuppId(e.target.value)} required>
                <option value="">— Select Supplier —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Return Date *</label>
              <input type="date" className="input" value={returnDate} onChange={e => setReturnDate(e.target.value)} required />
            </div>
            <div>
              <label className="label">Reason *</label>
              <select className="input" value={reason} onChange={e => setReason(e.target.value)} required>
                <option value="">— Select —</option>
                {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional details…" />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Items *</label>
              <button type="button" onClick={addRow}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold">
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-4 relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input className="input pl-8 text-sm py-1.5"
                        placeholder="Search medicine…"
                        value={it.medicine_name}
                        onChange={e => { updateItem(idx, 'medicine_name', e.target.value); updateItem(idx, 'medicine_id', ''); searchMeds(e.target.value, idx) }}
                      />
                    </div>
                    {medSearchIdx === idx && medResults.length > 0 && !it.medicine_id && (
                      <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {medResults.map(m => (
                          <button key={m.id} type="button"
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs border-b last:border-0 border-gray-100"
                            onClick={() => { updateItem(idx, 'medicine_id', m.id); updateItem(idx, 'medicine_name', m.name); updateItem(idx, 'unit_cost', m.unit_price || ''); setMedResults([]); setMedSearchIdx(null) }}>
                            {m.name} <span className="text-gray-400">Stock: {m.stock_quantity}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="col-span-2">
                    <input className="input text-sm py-1.5" placeholder="Batch #"
                      value={it.batch_number} onChange={e => updateItem(idx, 'batch_number', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <input type="number" className="input text-sm py-1.5" placeholder="Qty" min="1"
                      value={it.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <input type="number" className="input text-sm py-1.5" placeholder="Unit cost ₹" min="0" step="0.01"
                      value={it.unit_cost} onChange={e => updateItem(idx, 'unit_cost', e.target.value)} />
                  </div>
                  <div className="col-span-1 flex items-center pt-1">
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeRow(idx)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {formErr && <p className="text-red-500 text-sm flex items-center gap-1"><AlertCircle className="w-4 h-4" />{formErr}</p>}
          {success && <p className="text-green-600 text-sm flex items-center gap-1"><CheckCircle className="w-4 h-4" />{success}</p>}
          <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PackageX className="w-4 h-4" />}
            {submitting ? 'Creating…' : 'Create Return & Deduct Stock'}
          </button>
        </form>
      </div>

      {/* Log */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Return History</h2>
        <div className="flex flex-wrap gap-3 mb-4">
          <input type="date" className="input w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          <input type="date" className="input w-36" value={toDate} onChange={e => setToDate(e.target.value)} />
          <select className="input w-44" value={filterSupp} onChange={e => setFilterSupp(e.target.value)}>
            <option value="">All Suppliers</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        {logLoading ? (
          <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>
        ) : logErr ? (
          <div className="py-10 text-center text-red-500 text-sm">{logErr}</div>
        ) : returns.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">No returns in this period</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Date', 'Supplier', 'Reason', 'Items', 'Value', 'Status', ''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {returns.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">{r.return_date}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-800">{r.supplier_name}</td>
                  <td className="px-3 py-2.5 text-gray-600">{r.reason}</td>
                  <td className="px-3 py-2.5 text-center text-gray-600">{r.item_count}</td>
                  <td className="px-3 py-2.5 text-gray-800">₹{r.total_value.toFixed(2)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge(r.status)}`}>{r.status}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    {r.status === 'pending' && (
                      <select className="text-xs border border-gray-200 rounded px-1 py-0.5"
                        defaultValue="" onChange={e => e.target.value && updateStatus(r.id, e.target.value)}>
                        <option value="">Update…</option>
                        <option value="dispatched">Dispatched</option>
                        <option value="credited">Credited</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
