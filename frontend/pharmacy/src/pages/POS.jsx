import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { toast } from '../utils/toast'
import {
  Search, Trash2, Plus, Minus, ShoppingCart, CreditCard,
  Loader2, CheckCircle, AlertTriangle, Printer, ArrowLeft,
  User, Package,
} from 'lucide-react'

const GST_OPTS = [0, 5, 12, 18]

function toNum(v) { return isNaN(parseFloat(v)) ? 0 : parseFloat(v) }

function calcTotals(items) {
  const subtotal  = items.reduce((s, i) => s + toNum(i.unit_price) * toNum(i.dispensed_qty), 0)
  const gst_total = items.reduce((s, i) => {
    const pre = toNum(i.unit_price) * toNum(i.dispensed_qty)
    return s + pre * toNum(i.gst_percent) / 100
  }, 0)
  return { subtotal, gst_total, total: subtotal + gst_total }
}

function MedSearch({ onAdd }) {
  const [q, setQ]         = useState('')
  const [results, setRes] = useState([])
  const [open, setOpen]   = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!q.trim()) { setRes([]); return }
    const t = setTimeout(() => {
      api.get('/pharmacy/medicines/search', { params: { q } })
        .then(r => { setRes(Array.isArray(r) ? r : []); setOpen(true) })
        .catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    function click(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', click)
    return () => document.removeEventListener('mousedown', click)
  }, [])

  const pick = med => {
    onAdd(med)
    setQ('')
    setRes([])
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 input">
        <Search size={15} className="text-gray-400 flex-shrink-0" />
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search medicine to add…"
          className="flex-1 outline-none text-sm bg-transparent" />
      </div>
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-56 overflow-y-auto">
          {results.map(m => (
            <button key={m.id} onClick={() => pick(m)}
              className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm border-b border-gray-50 last:border-0">
              <div className="font-medium text-gray-800">{m.name}</div>
              <div className="text-xs text-gray-400">
                {m.form} {m.strength} · ₹{m.unit_price ?? '—'} · GST {m.gst_rate ?? 0}%
                {(m.stock_quantity || 0) <= 0
                  ? <span className="ml-2 text-red-500 font-semibold">Out of stock</span>
                  : <span className="ml-2 text-green-600">Stock: {m.stock_quantity}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function POS() {
  const { orderId } = useParams()
  const navigate    = useNavigate()
  const [order, setOrder]     = useState(null)
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying]   = useState(false)
  const [payMode, setPayMode] = useState('cash')
  const [amtPaid, setAmtPaid] = useState('')
  const [done, setDone]       = useState(null)   // completed session

  const loadOrder = useCallback(() => {
    setLoading(true)
    api.get(`/pharmacy/orders/${orderId}`)
      .then(o => {
        setOrder(o)
        // Pre-populate items from prescription if linked
        if (o.rx_items?.length) {
          const preItems = o.rx_items.map(rx => ({
            _key:         Math.random(),
            medicine_id:  rx.medicine_id,
            medicine_name: rx.medicine_name,
            batch_number: '',
            expiry_date:  null,
            ordered_qty:  rx.quantity_prescribed || 1,
            dispensed_qty: rx.quantity_prescribed || 1,
            unit_price:   0,
            mrp:          null,
            gst_percent:  0,
            is_schedule_h: false,
            gathered:     true,
          }))
          setItems(preItems)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orderId])

  useEffect(() => { loadOrder() }, [loadOrder])

  const addMed = med => {
    setItems(prev => {
      const exists = prev.find(i => i.medicine_id === med.id)
      if (exists) {
        return prev.map(i => i.medicine_id === med.id
          ? { ...i, dispensed_qty: i.dispensed_qty + 1 }
          : i)
      }
      return [...prev, {
        _key:          Math.random(),
        medicine_id:   med.id,
        medicine_name: med.name,
        batch_number:  med.batch_number || '',
        expiry_date:   med.expiry_date  || null,
        ordered_qty:   1,
        dispensed_qty: 1,
        unit_price:    toNum(med.unit_price),
        mrp:           toNum(med.mrp),
        gst_percent:   toNum(med.gst_rate),
        is_schedule_h: med.schedule === 'H' || med.schedule === 'H1',
        gathered:      true,
      }]
    })
  }

  const updateItem = (key, field, val) =>
    setItems(prev => prev.map(i => i._key === key ? { ...i, [field]: val } : i))

  const removeItem = key => setItems(prev => prev.filter(i => i._key !== key))

  const { subtotal, gst_total, total } = calcTotals(items)

  const checkout = async () => {
    if (!items.length) { toast.error('Cart is empty'); return }
    const isCredit = payMode === 'credit'
    const paid = isCredit ? 0 : toNum(amtPaid) || total
    setPaying(true)
    try {
      // 1. create session
      const session = await api.post('/pharmacy/dispense/sessions', {
        order_id:       parseInt(orderId),
        patient_id:     order?.patient_id,
        patient_name:   order?.patient_name,
        patient_mobile: order?.patient_mobile,
        items: items.map(i => ({
          medicine_id:  i.medicine_id,
          medicine_name: i.medicine_name,
          batch_number: i.batch_number,
          expiry_date:  i.expiry_date,
          ordered_qty:  i.ordered_qty,
          dispensed_qty: toNum(i.dispensed_qty),
          unit_price:   toNum(i.unit_price),
          mrp:          i.mrp || null,
          gst_percent:  toNum(i.gst_percent),
          is_schedule_h: i.is_schedule_h,
          gathered:     true,
        })),
      })
      // 2. checkout
      const result = await api.post(`/pharmacy/dispense/sessions/${session.id}/checkout`, {
        payment_method: payMode,
        amount_paid:    paid,
      })
      setDone(result)
      toast.success(`Dispense #${result.dispense_number} — ${isCredit ? 'Dispensed on credit' : 'Paid ✓'}`)
    } catch (e) {
      toast.error(e.message || 'Checkout failed')
    } finally {
      setPaying(false)
    }
  }

  const printSlip = () => {
    if (!done) return
    const win = window.open('', '_blank', 'width=400,height=600')
    const rows = done.items.map(i =>
      `<tr><td>${i.medicine_name}</td><td style="text-align:center">${i.dispensed_qty}</td>
       <td style="text-align:right">₹${toNum(i.unit_price).toFixed(2)}</td>
       <td style="text-align:center">${toNum(i.gst_percent)}%</td>
       <td style="text-align:right">₹${toNum(i.line_total).toFixed(2)}</td></tr>`
    ).join('')
    win.document.write(`
      <html><head><title>Dispense Slip</title>
      <style>body{font-family:sans-serif;font-size:13px;padding:20px}
      table{width:100%;border-collapse:collapse}th,td{padding:5px;border-bottom:1px solid #ddd}
      th{background:#f5f5f5;font-weight:600}.total{font-weight:bold;font-size:15px}
      .credit{color:#dc2626;font-weight:bold}.hdr{color:#0F2557}</style></head>
      <body>
        <h2 class="hdr">BHaratCliniq Pharmacy</h2>
        <p>Dispense Slip #<strong>${done.dispense_number}</strong></p>
        <p>Patient: <strong>${done.patient_name}</strong></p>
        <p>Date: ${new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}</p>
        <hr/>
        <table><thead><tr><th>Medicine</th><th>Qty</th><th>Rate</th><th>GST</th><th>Total</th></tr></thead>
        <tbody>${rows}</tbody></table>
        <hr/>
        <p>Subtotal: ₹${toNum(done.subtotal).toFixed(2)}</p>
        <p>GST: ₹${toNum(done.gst_total).toFixed(2)}</p>
        <p class="total">Grand Total: ₹${toNum(done.total_amount).toFixed(2)}</p>
        ${done.status === 'credit'
          ? `<p class="credit">⚠ Dispensed on Credit — Balance Due: ₹${toNum(done.balance_due).toFixed(2)}</p>`
          : `<p>Paid via ${done.payment_method?.toUpperCase()} ✓</p>`}
      </body></html>
    `)
    setTimeout(() => win.print(), 300)
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-gray-400" /></div>
  if (!order)  return <div className="card p-10 text-center text-gray-400">Order not found</div>

  if (done) return (
    <div className="max-w-lg mx-auto text-center py-12">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
        style={{ background: '#16a34a18' }}>
        <CheckCircle size={40} className="text-green-600" />
      </div>
      <h2 className="text-2xl font-bold mb-1" style={{ color: '#0F2557' }}>
        Dispense #{done.dispense_number} Complete
      </h2>
      <p className="text-gray-500 mb-1">{done.patient_name}</p>
      <p className="text-2xl font-bold mb-2">₹{toNum(done.total_amount).toFixed(2)}</p>
      {done.status === 'credit' && (
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">
          <AlertTriangle size={15} />
          Dispensed on Credit — Balance Due: ₹{toNum(done.balance_due).toFixed(2)}
        </div>
      )}
      <div className="flex gap-3 justify-center mt-6">
        <button onClick={printSlip} className="btn-secondary"><Printer size={15} /> Print Slip</button>
        <button onClick={() => navigate('/orders')} className="btn-primary">Next Order →</button>
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/orders')} className="btn-secondary p-2"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="page-title">POS — ORX-{String(order.id).padStart(4, '0')}</h1>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
            <User size={13} />
            {order.patient_name || 'Walk-in'} {order.patient_mobile && `· ${order.patient_mobile}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Cart */}
        <div className="lg:col-span-2 space-y-4">
          {/* Medicine search */}
          <div className="card p-4">
            <MedSearch onAdd={addMed} />
          </div>

          {/* Cart table */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <ShoppingCart size={16} style={{ color: '#0F2557' }} />
              <span className="font-semibold text-sm text-gray-700">Cart ({items.length} items)</span>
            </div>
            {items.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <Package size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Search and add medicines above</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {items.map(item => {
                  const pre = toNum(item.unit_price) * toNum(item.dispensed_qty)
                  const gst = pre * toNum(item.gst_percent) / 100
                  const tot = pre + gst
                  return (
                    <div key={item._key} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-medium text-sm text-gray-800">{item.medicine_name}</div>
                          {item.batch_number && (
                            <div className="text-xs text-gray-400">Batch: {item.batch_number}
                              {item.expiry_date && ` · Exp: ${item.expiry_date}`}
                            </div>
                          )}
                          {item.is_schedule_h && (
                            <span className="text-xs text-orange-600 font-semibold">⚠ Schedule H</span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm" style={{ color: '#0F2557' }}>₹{tot.toFixed(2)}</div>
                          <div className="text-xs text-gray-400">incl. GST</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {/* Qty */}
                        <div className="col-span-1">
                          <label className="text-xs text-gray-500 mb-0.5 block">Qty</label>
                          <div className="flex items-center border rounded-lg overflow-hidden">
                            <button onClick={() => updateItem(item._key, 'dispensed_qty', Math.max(1, toNum(item.dispensed_qty) - 1))}
                              className="px-2 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600"><Minus size={12} /></button>
                            <input type="number" min={1}
                              value={item.dispensed_qty}
                              onChange={e => updateItem(item._key, 'dispensed_qty', e.target.value)}
                              className="w-10 text-center text-sm py-1 outline-none border-0" />
                            <button onClick={() => updateItem(item._key, 'dispensed_qty', toNum(item.dispensed_qty) + 1)}
                              className="px-2 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600"><Plus size={12} /></button>
                          </div>
                        </div>
                        {/* Price */}
                        <div className="col-span-1">
                          <label className="text-xs text-gray-500 mb-0.5 block">Price (₹)</label>
                          <input type="number" min={0} step={0.01}
                            value={item.unit_price}
                            onChange={e => updateItem(item._key, 'unit_price', e.target.value)}
                            className="input text-sm py-1.5" />
                        </div>
                        {/* GST */}
                        <div className="col-span-1">
                          <label className="text-xs text-gray-500 mb-0.5 block">GST %</label>
                          <select value={item.gst_percent}
                            onChange={e => updateItem(item._key, 'gst_percent', e.target.value)}
                            className="input text-sm py-1.5">
                            {GST_OPTS.map(g => <option key={g} value={g}>{g}%</option>)}
                          </select>
                        </div>
                        {/* Remove */}
                        <div className="col-span-1 flex items-end">
                          <button onClick={() => removeItem(item._key)}
                            className="w-full py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Payment panel */}
        <div className="space-y-4">
          {/* Totals */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm">Bill Summary</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">GST</span><span>₹{gst_total.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
                <span style={{ color: '#0F2557' }}>Total</span>
                <span style={{ color: '#0F2557' }}>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment mode */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm">Payment Mode</h3>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {['cash', 'card', 'upi', 'credit'].map(m => (
                <button key={m} onClick={() => setPayMode(m)}
                  className={`py-2 rounded-xl text-sm font-medium capitalize border-2 transition-all ${payMode === m ? 'border-transparent text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                  style={payMode === m ? { background: m === 'credit' ? '#CC1414' : '#0F2557' } : {}}>
                  {m === 'credit' ? 'Credit' : m.toUpperCase()}
                </button>
              ))}
            </div>
            {payMode === 'credit' && (
              <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl text-xs text-red-700 mb-3">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                Medications will be dispensed now. Patient pays later. Balance added to credit ledger.
              </div>
            )}
            {payMode !== 'credit' && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Amount Received (₹)</label>
                <input type="number" min={0} step={0.01}
                  value={amtPaid}
                  onChange={e => setAmtPaid(e.target.value)}
                  placeholder={`${total.toFixed(2)}`}
                  className="input text-sm" />
                {toNum(amtPaid) > total && (
                  <p className="text-xs text-green-600 mt-1">Change: ₹{(toNum(amtPaid) - total).toFixed(2)}</p>
                )}
              </div>
            )}
            <button onClick={checkout} disabled={paying || !items.length}
              className="mt-4 w-full btn-primary justify-center py-3 text-base disabled:opacity-50">
              {paying ? <><Loader2 size={16} className="animate-spin" />Processing…</> : <><CreditCard size={16} />{payMode === 'credit' ? 'Dispense on Credit' : 'Confirm Payment'}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
