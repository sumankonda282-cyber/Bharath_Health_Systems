import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import api from '../api/client'
import { cachedGet, cachedFetch, cacheInvalidate, TTL } from '../utils/cache'
import SalesReturns from '../components/SalesReturns'
import BarcodeScanner from '../components/BarcodeScanner'
import BarcodeLookupModal from '../components/BarcodeLookupModal'
import {
  CreditCard, Loader2, X, IndianRupee, Trash2, Search, Eye, Printer,
  ScanLine, AlertTriangle, RefreshCw, ArrowRightLeft, Tag, ShoppingCart,
  Banknote, Smartphone, Building2, Shield, CheckCircle,
} from 'lucide-react'

const MAIN_TABS = ['Billing Counter', 'Invoice History', 'Sales Returns']
const INV_TABS  = ['Pending', 'Paid', 'All']

const PAY_METHODS = [
  { key: 'cash',        label: 'Cash',         icon: Banknote },
  { key: 'upi',         label: 'UPI',          icon: Smartphone },
  { key: 'card',        label: 'Card',         icon: CreditCard },
  { key: 'cheque',      label: 'Cheque',       icon: Tag },
  { key: 'neft',        label: 'NEFT',         icon: Building2 },
  { key: 'insurance',   label: 'Insurance',    icon: Shield },
  { key: 'govt_scheme', label: 'Govt Scheme',  icon: Shield },
]

function todayStr() { return new Date().toISOString().slice(0, 10) }
function fmtCur(n) { return '₹' + Number(n || 0).toFixed(2) }

function statusBadge(s) {
  if (s === 'paid')   return 'badge badge-green'
  if (s === 'partial' || s === 'partially_paid') return 'badge badge-yellow'
  if (s === 'pending') return 'badge badge-red'
  return 'badge badge-gray'
}

// ── Print Modal ──────────────────────────────────────────────────────────────

function PrintModal({ invoice, onClose }) {
  const printRef = useRef()

  function doPrint() {
    const win = window.open('', '_blank')
    win.document.write(`<html><head><title>Invoice</title><style>
      body{font-family:sans-serif;padding:20px;font-size:12px}
      table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}
      th{background:#f3f4f6} h2{margin:4px 0}
    </style></head><body>${printRef.current.innerHTML}</body></html>`)
    win.document.close(); win.print()
  }

  if (!invoice) return null
  const customer = invoice.customer_name || invoice.patient_name || 'Walk-in'

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold" style={{ color: '#0F2557' }}>Invoice</h3>
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
            <p className="text-gray-700"><strong>Customer:</strong> {customer}</p>
            {invoice.customer_mobile && <p className="text-gray-500">Mobile: {invoice.customer_mobile}</p>}
          </div>
          <div className="table-wrapper mb-4">
            <table className="table">
              <thead><tr>
                <th className="th">#</th><th className="th">Item</th><th className="th">Qty</th>
                <th className="th">Price</th><th className="th">Disc</th><th className="th">GST%</th><th className="th">Amt</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {(invoice.items || []).map((it, i) => (
                  <tr key={i} className="tr-hover">
                    <td className="td">{i + 1}</td>
                    <td className="td">{it.description || it.medicine_name}</td>
                    <td className="td">{it.quantity}</td>
                    <td className="td">{fmtCur(it.unit_price)}</td>
                    <td className="td">{fmtCur(it.discount_amount)}</td>
                    <td className="td">{it.gst_rate || 0}%</td>
                    <td className="td font-semibold">{fmtCur(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <div className="w-56 text-sm space-y-1">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmtCur(invoice.subtotal)}</span></div>
              {Number(invoice.discount || 0) > 0 && <div className="flex justify-between text-green-700"><span>Discount</span><span>-{fmtCur(invoice.discount)}</span></div>}
              <div className="flex justify-between border-t border-gray-200 pt-1 font-bold text-base" style={{ color: '#0F2557' }}>
                <span>Total</span><span>{fmtCur(invoice.total_amount || invoice.total)}</span>
              </div>
              {Number(invoice.amount_paid || 0) > 0 && <div className="flex justify-between text-green-700"><span>Paid</span><span>{fmtCur(invoice.amount_paid)}</span></div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Multi-Payment Modal ───────────────────────────────────────────────────────

function MultiPayModal({ total, onPay, onClose }) {
  const [payments, setPayments] = useState({ cash: '', upi: '', card: '', cheque: '', neft: '', insurance: '', govt_scheme: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const totalPaid = Object.values(payments).reduce((s, v) => s + (Number(v) || 0), 0)
  const change = totalPaid - total
  const isPartial = change < -0.01

  const setExact = (method) => {
    const others = Object.entries(payments).filter(([k]) => k !== method).reduce((s, [, v]) => s + (Number(v) || 0), 0)
    setPayments(p => ({ ...p, [method]: Math.max(0, total - others).toFixed(2) }))
  }

  const submit = async () => {
    const list = Object.entries(payments).filter(([, v]) => Number(v) > 0).map(([method, amount]) => ({ method, amount: Number(amount) }))
    if (list.length === 0) { setError('Enter at least one payment amount'); return }
    setSubmitting(true); setError('')
    try { await onPay(list) } catch (ex) { setError(ex.message || 'Payment failed') } finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold" style={{ color: '#0F2557' }}>Collect Payment</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex justify-between items-center text-xl font-bold">
            <span style={{ color: '#0F2557' }}>Amount Due</span>
            <span style={{ color: '#F5821E' }}>{fmtCur(total)}</span>
          </div>
          <div className="space-y-2">
            {PAY_METHODS.map(({ key, label, icon: Icon }) => (
              <div key={key} className="flex items-center gap-2">
                <Icon size={15} className="text-gray-400 flex-shrink-0 w-4" />
                <span className="text-sm text-gray-600 w-24 flex-shrink-0">{label}</span>
                <input type="number" className="input flex-1 py-1.5 text-sm" min="0" step="0.01" placeholder="0.00"
                  value={payments[key]} onChange={e => setPayments(p => ({ ...p, [key]: e.target.value }))} />
                <button onClick={() => setExact(key)}
                  className="flex-shrink-0 px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-medium border border-gray-200 transition-colors">
                  Exact
                </button>
              </div>
            ))}
          </div>
          <div className={`rounded-xl p-3 border ${isPartial ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">Total collected</span>
              <span className="font-semibold text-gray-800">{fmtCur(totalPaid)}</span>
            </div>
            <div className={`flex justify-between text-sm font-bold ${isPartial ? 'text-amber-700' : 'text-green-700'}`}>
              <span>{isPartial ? 'Balance pending' : 'Change'}</span>
              <span>{fmtCur(Math.abs(change))}</span>
            </div>
            {isPartial && <div className="text-xs text-amber-600 mt-1">Partial — ₹{Math.abs(change).toFixed(2)} recorded as credit due</div>}
          </div>
          {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"><AlertTriangle size={14} />{error}</div>}
          <div className="flex gap-3 pt-1">
            <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
            <button className="btn-success flex-1 justify-center" onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
              {submitting ? 'Processing…' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Billing Counter ───────────────────────────────────────────────────────────

function BillingCounter({ onBillCreated }) {
  const [saleType, setSaleType]           = useState('otc')
  const [customerName, setCustomerName]   = useState('')
  const [customerMobile, setCustomerMobile] = useState('')
  const [prescriptionRef, setPrescriptionRef] = useState('')
  const [medSearch, setMedSearch]         = useState('')
  const [medResults, setMedResults]       = useState([])
  const [searching, setSearching]         = useState(false)
  const [items, setItems]                 = useState([])
  const [submitting, setSubmitting]       = useState(false)
  const [error, setError]                 = useState('')
  const [printInvoice, setPrintInvoice]   = useState(null)
  const [showPayModal, setShowPayModal]   = useState(false)
  const [showScanner, setShowScanner]     = useState(false)
  const [scannedBarcode, setScannedBarcode] = useState(null)
  const [barcodeData, setBarcodeData]     = useState(null)
  const [interactions, setInteractions]   = useState([])
  const [interactionLoading, setInteractionLoading] = useState(false)
  const [generics, setGenerics]           = useState({})
  const [batchMap, setBatchMap]           = useState({})
  const [substitutesMap, setSubstitutesMap] = useState({})
  const [draftPoLoading, setDraftPoLoading] = useState({})
  const [draftPoMsg, setDraftPoMsg]       = useState({})
  const [schemes, setSchemes]             = useState([])
  const [selectedScheme, setSelectedScheme] = useState('')
  const searchDebounce = useRef(null)
  const interactionDebounce = useRef(null)

  useEffect(() => {
    api.get('/pharmacy/discount-schemes').then(r => setSchemes((r.schemes || []).filter(s => s.is_active))).catch(() => {})
  }, [])

  useEffect(() => {
    if (!medSearch.trim()) { setMedResults([]); return }
    clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => {
      setSearching(true)
      cachedGet(`med_srch_${medSearch.toLowerCase()}`, () => api.get('/pharmacy/medicines/search', { params: { q: medSearch } }), TTL.LONG)
        .then(r => setMedResults(Array.isArray(r) ? r : [])).finally(() => setSearching(false))
    }, 300)
  }, [medSearch])

  useEffect(() => {
    clearTimeout(interactionDebounce.current)
    const names = items.map(i => i.generic_name).filter(Boolean)
    if (names.length < 2) { setInteractions([]); return }
    interactionDebounce.current = setTimeout(() => {
      setInteractionLoading(true)
      api.post('/pharmacy/drug-interactions/check', { generic_names: names })
        .then(r => setInteractions(r.interactions || [])).catch(() => setInteractions([]))
        .finally(() => setInteractionLoading(false))
    }, 600)
  }, [items])

  const handleBarcodeScan = async (bc) => {
    setShowScanner(false); setScannedBarcode(bc)
    try { setBarcodeData(await api.get(`/pharmacy/barcode/${encodeURIComponent(bc)}`)) } catch { setBarcodeData(null) }
  }

  const handleBarcodeDispense = (details) => {
    setScannedBarcode(null); setBarcodeData(null)
    const qty = parseInt(details.quantity) || 1
    const price = parseFloat(details.selling_price) || parseFloat(details.mrp) || 0
    const newItem = { medicine_id: details.medicine_id || null, description: details.drug_name, quantity: qty, unit_price: price, mrp: parseFloat(details.mrp) || null, gst_rate: parseFloat(details.gst_rate) || 0, hsn_code: details.hsn_code || '', discount_amount: 0 }
    if (details.medicine_id) {
      setItems(prev => {
        const ex = prev.find(i => i.medicine_id === details.medicine_id)
        if (ex) return prev.map(i => i.medicine_id === details.medicine_id ? { ...i, quantity: i.quantity + qty } : i)
        return [...prev, newItem]
      })
    } else {
      setItems(prev => [...prev, newItem])
    }
  }

  function addItem(med) {
    setItems(prev => {
      const ex = prev.find(i => i.medicine_id === med.id)
      if (ex) return prev.map(i => i.medicine_id === med.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { medicine_id: med.id, description: med.name, quantity: 1, unit_price: Number(med.unit_price) || 0, mrp: med.mrp ? Number(med.mrp) : null, gst_rate: med.gst_rate ? Number(med.gst_rate) : 0, hsn_code: med.hsn_code || '', discount_amount: 0, schedule: med.schedule, generic_name: med.generic_name || null, stock_quantity: med.stock_quantity ?? null }]
    })
    setMedSearch(''); setMedResults([])
    if (med.generic_name) {
      api.get('/pharmacy/medicines/suggest-generic', { params: { name: med.name } })
        .then(r => { if (Array.isArray(r) && r.length) setGenerics(g => ({ ...g, [med.id]: r[0] })) }).catch(() => {})
    }
    api.get(`/pharmacy/medicines/${med.id}/fefo-batch`).then(r => setBatchMap(b => ({ ...b, [med.id]: r.batch || null }))).catch(() => {})
  }

  function applyScheme(schemeId) {
    setSelectedScheme(schemeId)
    if (!schemeId) { setItems(prev => prev.map(i => ({ ...i, discount_amount: 0 }))); return }
    const sc = schemes.find(s => s.id === parseInt(schemeId)); if (!sc) return
    setItems(prev => prev.map(item => {
      const lineTotal = Number(item.unit_price) * Number(item.quantity)
      const disc = sc.scheme_type === 'percentage' ? lineTotal * sc.discount_value / 100 : Math.min(sc.discount_value, lineTotal)
      return { ...item, discount_amount: parseFloat(disc.toFixed(2)) }
    }))
  }

  function updateItem(idx, field, value) { setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it)) }
  function removeItem(idx) { setItems(prev => prev.filter((_, i) => i !== idx)) }

  const totals = useMemo(() => {
    let subtotal = 0, totalDisc = 0, totalGst = 0
    const gstByRate = {}
    items.forEach(item => {
      const line = Number(item.unit_price) * Number(item.quantity)
      const disc = Number(item.discount_amount) || 0
      const gstRate = Number(item.gst_rate) || 0
      const gst = (line - disc) * gstRate / 100
      subtotal += line; totalDisc += disc; totalGst += gst
      if (!gstByRate[gstRate]) gstByRate[gstRate] = 0
      gstByRate[gstRate] += gst
    })
    return { subtotal, totalDisc, totalGst, grand: subtotal - totalDisc + totalGst, gstByRate }
  }, [items])

  async function generateBill(paymentsList) {
    if (items.length === 0) { setError('Add at least one item'); return }
    setSubmitting(true); setError('')
    try {
      const inv = await api.post('/billing/invoices', {
        sale_type: saleType,
        customer_name: customerName || null,
        customer_mobile: customerMobile || null,
        prescription_ref: prescriptionRef || null,
        payment_method: paymentsList[0]?.method || 'cash',
        items: items.map(i => ({
          description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price),
          medicine_id: i.medicine_id || null, hsn_code: i.hsn_code || null,
          gst_rate: Number(i.gst_rate) || null, discount_amount: Number(i.discount_amount) || 0,
          mrp: i.mrp || null, item_type: 'medicine',
        })),
      })
      if (paymentsList.length > 1 || (paymentsList.length === 1 && Number(paymentsList[0].amount) < totals.grand - 0.01)) {
        await api.post(`/billing/invoices/${inv.id}/payments`, { payments: paymentsList }).catch(() => {})
      }
      setPrintInvoice(await api.get(`/billing/invoices/${inv.id}`))
      setShowPayModal(false)
      setItems([]); setCustomerName(''); setCustomerMobile(''); setPrescriptionRef(''); setGenerics({})
      if (onBillCreated) onBillCreated()
    } catch (ex) {
      setError(ex.message || 'Failed to create invoice')
    } finally { setSubmitting(false) }
  }

  return (
    <div>
      {printInvoice && <PrintModal invoice={printInvoice} onClose={() => setPrintInvoice(null)} />}
      {showPayModal && <MultiPayModal total={totals.grand} onPay={generateBill} onClose={() => setShowPayModal(false)} />}
      {showScanner && <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />}
      {scannedBarcode && <BarcodeLookupModal barcode={scannedBarcode} data={barcodeData} mode="dispense" onConfirm={handleBarcodeDispense} onClose={() => { setScannedBarcode(null); setBarcodeData(null) }} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5 space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Sale Type</p>
              <div className="flex gap-2">
                {[['otc', 'OTC / Walk-in'], ['prescription', 'Linked Prescription']].map(([val, lbl]) => (
                  <button key={val} onClick={() => setSaleType(val)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${saleType === val ? 'text-white border-transparent' : 'text-gray-600 border-gray-200 hover:border-gray-300'}`}
                    style={saleType === val ? { background: '#0F2557' } : {}}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Customer Name <span className="text-gray-400 font-normal">(Optional)</span></label>
                <input className="input" placeholder="Walk-in customer" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>
              <div>
                <label className="label">Mobile <span className="text-gray-400 font-normal">(Optional)</span></label>
                <input className="input" placeholder="10-digit mobile" maxLength={10} value={customerMobile} onChange={e => setCustomerMobile(e.target.value)} />
              </div>
            </div>
            {saleType !== 'otc' && (
              <div>
                <label className="label">Prescription Ref</label>
                <input className="input" placeholder="Rx number" value={prescriptionRef} onChange={e => setPrescriptionRef(e.target.value)} />
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-600">Add Medicine</p>
              <button onClick={() => setShowScanner(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors">
                <ScanLine size={13} />Scan Barcode
              </button>
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-9" placeholder="Type medicine name to search…" value={medSearch} onChange={e => setMedSearch(e.target.value)} />
              {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
            </div>
            {medResults.length > 0 && (
              <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {medResults.map(m => (
                  <button key={m.id} onClick={() => addItem(m)}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center justify-between border-b border-gray-100 last:border-0 transition-colors">
                    <div>
                      <span className="font-medium text-sm text-gray-800">{m.name}</span>
                      {m.schedule && m.schedule !== 'OTC' && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-bold">{m.schedule}</span>}
                      {m.generic_name && <span className="ml-2 text-xs text-gray-400">{m.generic_name}</span>}
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-sm font-semibold" style={{ color: '#0F2557' }}>₹{m.unit_price || '—'}</div>
                      <div className={`text-xs ${m.in_stock ? 'text-green-600' : 'text-red-500'}`}>{m.in_stock ? `${m.stock_quantity} in stock` : 'Out of stock'}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {interactionLoading && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-500">
              <RefreshCw size={13} className="animate-spin" />Checking drug interactions…
            </div>
          )}
          {!interactionLoading && interactions.length > 0 && (
            <div className={`rounded-xl border overflow-hidden ${interactions.some(i => i.severity === 'contraindicated' || i.severity === 'serious') ? 'border-red-300' : 'border-amber-300'}`}>
              <div className={`px-4 py-2 flex items-center gap-2 text-sm font-semibold ${interactions.some(i => i.severity === 'contraindicated' || i.severity === 'serious') ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                <AlertTriangle size={15} />{interactions.length} Drug Interaction{interactions.length > 1 ? 's' : ''} Detected
              </div>
              <div className="divide-y divide-gray-100 bg-white">
                {interactions.map((ix, i) => (
                  <div key={i} className="px-4 py-2.5 text-xs">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`px-1.5 py-0.5 rounded font-bold uppercase ${ix.severity === 'contraindicated' || ix.severity === 'serious' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{ix.severity}</span>
                      <span className="font-medium text-gray-700">{ix.drug_a} + {ix.drug_b}</span>
                    </div>
                    {ix.effect && <p className="text-gray-500">{ix.effect}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {items.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-600">Bill Items</div>
              <div className="divide-y divide-gray-100">
                {items.map((item, idx) => (
                  <div key={idx} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-medium text-sm text-gray-800">{item.description}</span>
                        {item.schedule && item.schedule !== 'OTC' && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-bold">{item.schedule}</span>}
                        {item.mrp && <span className="ml-2 text-xs text-gray-400">MRP: ₹{item.mrp}</span>}
                      </div>
                      <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 ml-2"><Trash2 size={14} /></button>
                    </div>
                    {generics[item.medicine_id] && (
                      <div className="mb-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700">
                        Generic: <strong>{generics[item.medicine_id].name}</strong> at ₹{generics[item.medicine_id].unit_price}
                        <button className="ml-2 underline text-green-600" onClick={() => {
                          const g = generics[item.medicine_id]
                          updateItem(idx, 'description', g.name); updateItem(idx, 'unit_price', Number(g.unit_price)); updateItem(idx, 'medicine_id', g.id)
                        }}>Switch</button>
                      </div>
                    )}
                    {item.medicine_id && batchMap[item.medicine_id] && (() => {
                      const b = batchMap[item.medicine_id]
                      const daysLeft = b?.expiry_date ? Math.floor((new Date(b.expiry_date) - new Date()) / 86400000) : null
                      return (
                        <div className={`mb-2 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 ${daysLeft !== null && daysLeft < 30 ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
                          <span>Batch: <strong>{b.batch_number || '—'}</strong></span>
                          <span className="text-gray-400">·</span>
                          <span className={daysLeft !== null && daysLeft < 30 ? 'text-orange-700' : 'text-green-700'}>Exp: {b.expiry_date || '—'}</span>
                          <span className="text-gray-400">· Avail: {b.quantity}</span>
                        </div>
                      )
                    })()}
                    {item.medicine_id && item.stock_quantity === 0 && (
                      <div className="mb-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
                        <span className="flex items-center gap-1"><AlertTriangle size={12} />Out of stock</span>
                        <button disabled={draftPoLoading[item.medicine_id]}
                          className="underline font-semibold text-blue-600"
                          onClick={() => {
                            setDraftPoLoading(p => ({ ...p, [item.medicine_id]: true }))
                            api.post(`/pharmacy/medicines/${item.medicine_id}/auto-draft-po`)
                              .then(r => setDraftPoMsg(p => ({ ...p, [item.medicine_id]: `PO ${r.po_number} drafted ✓` })))
                              .catch(e => setDraftPoMsg(p => ({ ...p, [item.medicine_id]: e.message })))
                              .finally(() => setDraftPoLoading(p => ({ ...p, [item.medicine_id]: false })))
                          }}>
                          {draftPoMsg[item.medicine_id] || 'Draft PO'}
                        </button>
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div><label className="label text-xs">Qty</label><input type="number" className="input py-1" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} /></div>
                      <div><label className="label text-xs">Price ₹</label><input type="number" className="input py-1" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))} /></div>
                      <div><label className="label text-xs">Discount ₹</label><input type="number" className="input py-1" min="0" step="0.01" value={item.discount_amount} onChange={e => updateItem(idx, 'discount_amount', Number(e.target.value))} /></div>
                      <div><label className="label text-xs">GST %</label><input type="number" className="input py-1" min="0" step="0.01" value={item.gst_rate} onChange={e => updateItem(idx, 'gst_rate', Number(e.target.value))} /></div>
                    </div>
                    <div className="mt-1 text-right text-sm font-semibold" style={{ color: '#0F2557' }}>
                      {fmtCur((Number(item.unit_price) * Number(item.quantity) - Number(item.discount_amount || 0)) * (1 + Number(item.gst_rate || 0) / 100))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {schemes.length > 0 && items.length > 0 && (
            <div className="card p-4">
              <label className="label flex items-center gap-1"><Tag size={12} />Apply Discount Scheme</label>
              <select className="input text-sm" value={selectedScheme} onChange={e => applyScheme(e.target.value)}>
                <option value="">— No Scheme —</option>
                {schemes.map(s => <option key={s.id} value={s.id}>{s.name} ({s.scheme_type === 'percentage' ? `${s.discount_value}%` : `₹${s.discount_value}`})</option>)}
              </select>
            </div>
          )}

          <div className="card p-5">
            <p className="text-sm font-semibold text-gray-600 mb-3">Bill Summary</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmtCur(totals.subtotal)}</span></div>
              {totals.totalDisc > 0 && <div className="flex justify-between text-green-700"><span>Discount</span><span>-{fmtCur(totals.totalDisc)}</span></div>}
              {Object.entries(totals.gstByRate).map(([rate, amt]) => amt > 0 && (
                <div key={rate} className="flex justify-between text-gray-500"><span>GST {rate}%</span><span>{fmtCur(amt)}</span></div>
              ))}
              <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-lg" style={{ color: '#0F2557' }}>
                <span>Grand Total</span><span style={{ color: '#F5821E' }}>{fmtCur(totals.grand)}</span>
              </div>
            </div>
          </div>

          {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"><AlertTriangle size={14} />{error}</div>}

          <button
            onClick={() => { if (items.length === 0) { setError('Add at least one item'); return } setError(''); setShowPayModal(true) }}
            disabled={submitting || items.length === 0}
            className="btn-primary w-full justify-center py-3 text-base"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <IndianRupee size={16} />}
            {submitting ? 'Generating…' : 'Collect & Generate Bill'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Invoice History ───────────────────────────────────────────────────────────

function InvoiceHistory() {
  const [invoices, setInvoices]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [tab, setTab]             = useState('Pending')
  const [payModal, setPayModal]   = useState(null)
  const [paying, setPaying]       = useState(false)
  const [payError, setPayError]   = useState('')
  const [viewInvoice, setViewInvoice] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const load = useCallback((invalidate = false) => {
    setLoading(true); setError('')
    const run = async () => {
      if (invalidate) await cacheInvalidate('pharmacy_invoices')
      await cachedFetch('pharmacy_invoices', () => api.get('/billing/invoices', { params: { limit: 200 } }),
        r => { setInvoices(Array.isArray(r) ? r : []); setLoading(false) }, TTL.MEDIUM)
    }
    run().catch(ex => { setError(ex.message || 'Failed'); setLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])

  const today = todayStr()
  const filtered = useMemo(() => {
    if (tab === 'Pending') return invoices.filter(i => i.status === 'pending' || i.status === 'partially_paid')
    if (tab === 'Paid')    return invoices.filter(i => i.status === 'paid')
    return invoices
  }, [invoices, tab])

  const summaryStats = useMemo(() => {
    const todayInv = invoices.filter(i => (i.created_at || '').slice(0, 10) === today)
    return {
      billedToday:     todayInv.reduce((s, i) => s + (Number(i.total_amount) || 0), 0),
      collectedToday:  todayInv.filter(i => i.status === 'paid').reduce((s, i) => s + (Number(i.total_amount) || 0), 0),
      pending:         invoices.filter(i => i.status === 'pending').reduce((s, i) => s + (Number(i.total_amount) || 0), 0),
    }
  }, [invoices, today])

  const collectPayment = async (paymentsList) => {
    if (!payModal) return
    setPaying(true); setPayError('')
    try {
      await api.post(`/billing/invoices/${payModal.id}/payments`, { payments: paymentsList })
      setPayModal(null); load(true)
    } catch (ex) { setPayError(ex.message || 'Payment failed'); throw ex } finally { setPaying(false) }
  }

  const viewDetail = async (inv) => {
    setLoadingDetail(true)
    try { setViewInvoice(await api.get(`/billing/invoices/${inv.id}`)) } catch { setViewInvoice(inv) } finally { setLoadingDetail(false) }
  }

  return (
    <div>
      {viewInvoice && <PrintModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />}
      {payModal && <MultiPayModal total={Number(payModal.total_amount || payModal.total || 0)} onPay={collectPayment} onClose={() => setPayModal(null)} />}

      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Total Billed Today',  value: summaryStats.billedToday,    color: '#0F2557' },
          { label: 'Collected Today',     value: summaryStats.collectedToday, color: '#16a34a' },
          { label: 'Pending Amount',      value: summaryStats.pending,        color: '#CC1414' },
        ].map((s, i) => (
          <div key={i} className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.color + '18' }}>
              <IndianRupee size={18} style={{ color: s.color }} />
            </div>
            <div>
              <div className="text-xl font-bold" style={{ color: s.color }}>₹{s.value.toFixed(0)}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 border border-gray-200 shadow-sm w-fit">
        {INV_TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === t ? 'text-white' : 'text-gray-500 hover:text-gray-800'}`}
            style={tab === t ? { background: '#0F2557' } : {}}>
            {t}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-20"><Loader2 size={30} className="animate-spin text-gray-400" /></div>
        : error ? <div className="card p-10 text-center text-red-600">{error}</div>
        : filtered.length === 0 ? (
          <div className="card p-14 text-center text-gray-400">
            <CreditCard size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No invoices found</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="table-wrapper">
              <table className="table">
                <thead><tr>
                  <th className="th">Invoice #</th><th className="th">Customer</th>
                  <th className="th">Amount</th><th className="th">Status</th>
                  <th className="th">Date</th><th className="th">Action</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(inv => (
                    <tr key={inv.id} className="tr-hover">
                      <td className="td font-mono text-xs text-gray-400">{inv.invoice_number || `INV-${inv.id}`}</td>
                      <td className="td font-medium text-gray-800">{inv.customer_name || inv.patient_name || 'Walk-in'}</td>
                      <td className="td font-semibold">{fmtCur(inv.total_amount || inv.total)}</td>
                      <td className="td"><span className={statusBadge(inv.status)}>{inv.status}</span></td>
                      <td className="td text-gray-500 text-xs">{inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—'}</td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <button onClick={() => viewDetail(inv)} disabled={loadingDetail} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><Eye size={14} /></button>
                          {(inv.status === 'pending' || inv.status === 'partially_paid') && (
                            <button className="btn-success text-xs py-1 px-3" onClick={() => { setPayModal(inv); setPayError('') }}>Collect</button>
                          )}
                        </div>
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

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CounterSales() {
  const [mainTab, setMainTab] = useState('Billing Counter')
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div>
      <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 border border-gray-200 shadow-sm w-fit">
        {MAIN_TABS.map(t => (
          <button key={t} onClick={() => setMainTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${mainTab === t ? 'text-white' : 'text-gray-500 hover:text-gray-800'}`}
            style={mainTab === t ? { background: '#0F2557' } : {}}>
            {t}
          </button>
        ))}
      </div>
      {mainTab === 'Billing Counter' && <BillingCounter key={refreshKey} onBillCreated={() => setRefreshKey(k => k + 1)} />}
      {mainTab === 'Invoice History' && <InvoiceHistory key={refreshKey} />}
      {mainTab === 'Sales Returns' && <SalesReturns />}
    </div>
  )
}
