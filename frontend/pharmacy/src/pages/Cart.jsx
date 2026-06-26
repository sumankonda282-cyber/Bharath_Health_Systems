import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../api/client'
import {
  ShoppingCart, Loader2, Trash2, IndianRupee, X, CheckCircle,
  AlertTriangle, Printer, ChevronDown, ChevronRight,
  CreditCard, Banknote, Smartphone, Building2, Shield, Tag,
} from 'lucide-react'

const PAYMENT_METHODS = [
  { key: 'cash',        label: 'Cash',        icon: Banknote },
  { key: 'upi',         label: 'UPI',         icon: Smartphone },
  { key: 'card',        label: 'Card',        icon: CreditCard },
  { key: 'cheque',      label: 'Cheque',      icon: Tag },
  { key: 'neft',        label: 'NEFT',        icon: Building2 },
  { key: 'insurance',   label: 'Insurance',   icon: Shield },
  { key: 'govt_scheme', label: 'Govt Scheme', icon: Shield },
]

function fmtCur(n) { return '₹' + Number(n || 0).toFixed(2) }

function PrintInvoiceModal({ invoiceIds, onClose }) {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const printRef = useRef(null)

  useEffect(() => {
    Promise.all(invoiceIds.map(id => api.get(`/billing/invoices/${id}`)))
      .then(setInvoices).finally(() => setLoading(false))
  }, [invoiceIds])

  function doPrint() {
    const win = window.open('', '_blank')
    win.document.write(`<html><head><title>Invoices</title><style>
      body{font-family:sans-serif;padding:20px;font-size:12px}
      table{width:100%;border-collapse:collapse;margin-bottom:12px}
      th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}
      th{background:#f3f4f6} h3{margin:4px 0}
    </style></head><body>${printRef.current?.innerHTML || ''}</body></html>`)
    win.document.close(); win.print()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">Dispense Complete</h3>
          <div className="flex gap-2">
            {!loading && <button onClick={doPrint} className="btn-primary text-sm py-1.5"><Printer size={14} />Print</button>}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-gray-400" /></div>
        ) : (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4 text-green-700">
              <CheckCircle size={20} />
              <span className="font-semibold">Dispensed {invoiceIds.length} invoice{invoiceIds.length > 1 ? 's' : ''} successfully</span>
            </div>
            <div ref={printRef}>
              {invoices.map(inv => (
                <div key={inv.id} className="mb-4 p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-semibold text-gray-800">{inv.invoice_number || `INV-${inv.id}`}</h3>
                  <p className="text-gray-500 text-sm">Patient: {inv.patient_name || inv.customer_name || 'Walk-in'}</p>
                  <p className="text-gray-500 text-sm">Total: {fmtCur(inv.total_amount || inv.total)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PaymentModal({ patients, total, onDispense, onClose }) {
  const [payments, setPayments] = useState({ cash: '', upi: '', card: '', cheque: '', neft: '', insurance: '', govt_scheme: '' })
  const [discount, setDiscount] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const totalAfterDiscount = Math.max(0, total - Number(discount || 0))
  const totalPaid = Object.values(payments).reduce((s, v) => s + (Number(v) || 0), 0)
  const remaining = totalAfterDiscount - totalPaid
  const isPartial = remaining > 0.01

  const setExact = (method) => {
    const others = Object.entries(payments).filter(([k]) => k !== method).reduce((s, [, v]) => s + (Number(v) || 0), 0)
    setPayments(p => ({ ...p, [method]: Math.max(0, totalAfterDiscount - others).toFixed(2) }))
  }

  const handleSubmit = async () => {
    const payList = Object.entries(payments).filter(([, v]) => Number(v) > 0).map(([method, amount]) => ({ method, amount: Number(amount) }))
    if (payList.length === 0) { setError('Enter at least one payment amount'); return }
    setSubmitting(true); setError('')
    try { await onDispense({ patient_ids: patients.map(p => p.patient_id), payments: payList, discount: Number(discount || 0), notes }) }
    catch (ex) { setError(ex.message || 'Dispense failed') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">Dispense & Collect Payment</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Patients */}
          <div className="bg-gray-50 rounded-xl p-3 text-sm">
            <div className="text-gray-500 text-xs font-semibold mb-2">Dispensing for</div>
            {patients.map(p => (
              <div key={p.patient_id} className="flex justify-between text-gray-700 mb-1">
                <span className="font-medium">{p.patient_name || 'Unknown'}</span>
                <span className="text-xs text-gray-400">{p.orders?.length || p.items?.length} items</span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex justify-between items-center text-lg font-bold">
            <span style={{ color: '#0F2557' }}>Total Amount</span>
            <span style={{ color: '#F5821E' }}>{fmtCur(total)}</span>
          </div>

          {/* Discount */}
          <div>
            <label className="label">Discount (₹)</label>
            <input type="number" className="input" min="0" step="0.01" placeholder="0" value={discount} onChange={e => setDiscount(e.target.value)} />
            {Number(discount) > 0 && <div className="text-xs text-green-700 mt-1">After discount: {fmtCur(totalAfterDiscount)}</div>}
          </div>

          {/* Payment methods */}
          <div>
            <label className="label">Payment Methods</label>
            <div className="space-y-2">
              {PAYMENT_METHODS.map(({ key, label, icon: Icon }) => (
                <div key={key} className="flex items-center gap-2">
                  <Icon size={15} className="text-gray-400 flex-shrink-0 w-4" />
                  <span className="text-sm text-gray-600 w-24 flex-shrink-0">{label}</span>
                  <input type="number" className="input flex-1 py-1.5 text-sm" min="0" step="0.01" placeholder="0.00"
                    value={payments[key]} onChange={e => setPayments(p => ({ ...p, [key]: e.target.value }))} />
                  <button onClick={() => setExact(key)}
                    className="flex-shrink-0 px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-medium transition-colors border border-gray-200">
                    Exact
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Running total */}
          <div className={`rounded-xl p-3 border ${isPartial ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">Amount due</span>
              <span className="font-semibold text-gray-800">{fmtCur(totalAfterDiscount)}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">Total collected</span>
              <span className="font-semibold text-gray-800">{fmtCur(totalPaid)}</span>
            </div>
            <div className={`flex justify-between text-sm font-bold border-t pt-1.5 mt-1.5 ${isPartial ? 'text-amber-700 border-amber-200' : 'text-green-700 border-green-200'}`}>
              <span>{isPartial ? 'Balance (credit)' : 'Change'}</span>
              <span>{fmtCur(Math.abs(remaining))}</span>
            </div>
            {isPartial && <div className="text-xs text-amber-600 mt-1.5">Partial — ₹{Math.abs(remaining).toFixed(2)} recorded as credit due</div>}
          </div>

          <div>
            <label className="label">Notes</label>
            <input className="input" placeholder="Optional" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"><AlertTriangle size={14} />{error}</div>}

          <div className="flex gap-3 pt-1">
            <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
            <button className="btn-success flex-1 justify-center" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
              {submitting ? 'Processing…' : 'Dispense & Collect'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CartPatientGroup({ group, selected, onToggle, onRemoveItem, onDispenseOne }) {
  const [expanded, setExpanded] = useState(true)
  const [removingId, setRemovingId] = useState(null)

  const isSelected = selected.includes(group.patient_id)
  const groupTotal = group.items.reduce((s, i) => s + (i.estimated_price || 0) * (i.quantity || 1), 0)

  const handleRemove = async (itemId) => {
    setRemovingId(itemId)
    try { await onRemoveItem(itemId) } finally { setRemovingId(null) }
  }

  return (
    <div className={`card overflow-hidden transition-all ${isSelected ? 'border-blue-300' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(v => !v)}>
        <div
          className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors"
          style={{ borderColor: isSelected ? '#0F2557' : '#d1d5db', background: isSelected ? '#0F2557' : 'transparent' }}
          onClick={e => { e.stopPropagation(); onToggle(group.patient_id) }}
        >
          {isSelected && <CheckCircle size={12} className="text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800 text-sm">{group.patient_name || 'Unknown'}</span>
            {group.encounter_type === 'IP' ? <span className="badge badge-purple">IP</span> : <span className="badge badge-blue">OP</span>}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {group.items.length} item{group.items.length > 1 ? 's' : ''}
            {group.bhid && <span className="ml-2">BHID: {group.bhid}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {groupTotal > 0 && <span className="text-sm font-semibold" style={{ color: '#F5821E' }}>{fmtCur(groupTotal)}</span>}
          <button onClick={() => onDispenseOne(group)} className="btn-success text-xs py-1 px-3">Dispense</button>
          {expanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-100">
          {group.items.map(item => (
            <div key={item.cart_item_id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 flex items-center gap-2">
                  {item.medicine_name}
                  {item.is_stat && <span className="badge-stat text-[10px] px-1.5 py-0.5 rounded font-bold">STAT</span>}
                </div>
                <div className="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-2">
                  {item.dose && <span>{item.dose}</span>}
                  {item.frequency && <span>· {item.frequency}</span>}
                  {item.duration && <span>· {item.duration}</span>}
                  <span>Qty: {item.quantity}</span>
                  {item.estimated_price > 0 && <span>· {fmtCur(item.estimated_price * (item.quantity || 1))}</span>}
                </div>
                {item.instructions && <div className="text-xs text-gray-400 mt-0.5 italic">{item.instructions}</div>}
              </div>
              <button
                onClick={() => handleRemove(item.cart_item_id)}
                disabled={removingId === item.cart_item_id}
                className="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors p-1.5"
              >
                {removingId === item.cart_item_id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Cart() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected] = useState([])
  const [payModal, setPayModal] = useState(null)
  const [printModal, setPrintModal] = useState(null)
  const [toast, setToast] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const load = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError('') }
    else setRefreshing(true)
    try {
      const r = await api.get('/pharmacy/cart')
      setGroups(Array.isArray(r) ? r : (r?.groups || []))
    } catch (ex) {
      if (!silent) setError(ex.message || 'Failed to load cart')
    } finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const toggleSelect = (pid) => setSelected(s => s.includes(pid) ? s.filter(x => x !== pid) : [...s, pid])
  const selectAll = () => setSelected(groups.map(g => g.patient_id))
  const deselectAll = () => setSelected([])
  const allSelected = groups.length > 0 && groups.every(g => selected.includes(g.patient_id))

  const removeItem = async (itemId) => {
    try { await api.delete(`/pharmacy/cart/${itemId}`); load(true) }
    catch (ex) { showToast('Remove failed: ' + (ex.message || 'error')) }
  }

  const openPayForGroup = (group) => {
    setPayModal({ patients: [group], total: group.items.reduce((s, i) => s + (i.estimated_price || 0) * (i.quantity || 1), 0) })
  }

  const openPayForSelected = () => {
    const selGroups = groups.filter(g => selected.includes(g.patient_id))
    const total = selGroups.reduce((s, g) => s + g.items.reduce((ss, i) => ss + (i.estimated_price || 0) * (i.quantity || 1), 0), 0)
    setPayModal({ patients: selGroups, total })
  }

  const dispense = async (body) => {
    const r = await api.post('/pharmacy/cart/dispense', body)
    const ids = r.invoice_ids || []
    setPayModal(null); setSelected([]); load(true)
    if (ids.length > 0) setPrintModal(ids)
    else showToast('Dispensed successfully')
  }

  const totalItems = groups.reduce((s, g) => s + g.items.length, 0)
  const selGroups = groups.filter(g => selected.includes(g.patient_id))
  const selectedTotal = selGroups.reduce((s, g) => s + g.items.reduce((ss, i) => ss + (i.estimated_price || 0) * (i.quantity || 1), 0), 0)

  return (
    <div>
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-800 text-sm shadow-xl">
          {toast}
        </div>
      )}
      {payModal && <PaymentModal patients={payModal.patients} total={payModal.total} onDispense={dispense} onClose={() => setPayModal(null)} />}
      {printModal && <PrintInvoiceModal invoiceIds={printModal} onClose={() => { setPrintModal(null); load(true) }} />}

      {/* Batch action */}
      {groups.length > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
          <button onClick={allSelected ? deselectAll : selectAll} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800">
            <div className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
              style={{ borderColor: allSelected ? '#0F2557' : '#d1d5db', background: allSelected ? '#0F2557' : 'transparent' }}>
              {allSelected && <CheckCircle size={12} className="text-white" />}
            </div>
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
          {selected.length > 0 && (
            <>
              <div className="h-4 w-px bg-gray-200" />
              <span className="text-sm text-gray-500">{selected.length} patient{selected.length > 1 ? 's' : ''} selected</span>
              {selectedTotal > 0 && <span className="text-sm font-semibold" style={{ color: '#F5821E' }}>₹{selectedTotal.toFixed(2)}</span>}
              <div className="flex-1" />
              <button onClick={openPayForSelected} className="btn-success">
                <IndianRupee size={15} />Dispense Selected ({selected.length})
              </button>
            </>
          )}
        </div>
      )}

      {loading ? <div className="flex justify-center py-24"><Loader2 size={32} className="animate-spin text-gray-400" /></div>
        : error ? (
          <div className="card p-10 text-center">
            <AlertTriangle size={32} className="mx-auto mb-2 text-red-500" />
            <p className="text-red-600">{error}</p>
            <button onClick={() => load()} className="btn-secondary mt-3">Retry</button>
          </div>
        ) : groups.length === 0 ? (
          <div className="card p-14 text-center">
            <ShoppingCart size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-semibold text-gray-500">Cart is empty</p>
            <p className="text-sm text-gray-400 mt-1">Add medications from the CPOE Queue</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map(group => (
              <CartPatientGroup key={group.patient_id} group={group} selected={selected}
                onToggle={toggleSelect} onRemoveItem={removeItem} onDispenseOne={openPayForGroup} />
            ))}
          </div>
        )}
    </div>
  )
}
