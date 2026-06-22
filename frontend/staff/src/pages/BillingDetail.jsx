import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import {
  ChevronLeft, Loader2, X, Plus, Check, Trash2, Edit2,
  CheckCircle, AlertCircle, AlertTriangle, RefreshCw,
  Banknote, Smartphone, CreditCard, Building2, Shield, FileText,
} from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = n => `₹${(+n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

function fmtDate(str) {
  if (!str) return '—'
  try { return new Date(str).toLocaleDateString('en-IN', { dateStyle: 'medium' }) }
  catch { return str }
}

function statusBadge(s) {
  if (s === 'paid')    return 'bg-green-100 text-green-700'
  if (s === 'partial') return 'bg-yellow-100 text-yellow-700'
  return 'bg-amber-100 text-amber-700'
}

const PAYMENT_METHODS = [
  { value: 'cash',      label: 'Cash',      Icon: Banknote },
  { value: 'upi',       label: 'UPI',       Icon: Smartphone },
  { value: 'card',      label: 'Card',      Icon: CreditCard },
  { value: 'cheque',    label: 'Cheque',    Icon: FileText },
  { value: 'neft',      label: 'NEFT',      Icon: Building2 },
  { value: 'insurance', label: 'Insurance', Icon: Shield },
]

const ITEM_TYPES = ['consultation', 'procedure', 'lab', 'medicine', 'service', 'other']

const WAIVER_REASONS = [
  'Financial Hardship', "Doctor's Request", 'Billing Error',
  'Staff / VIP', 'Repeat Visit', 'Charity / NGO', 'Other',
]

const SECTIONS = [
  { key: 'consultation', label: 'Consultation & Procedures', types: ['consultation', 'procedure'] },
  { key: 'lab',          label: 'Laboratory',               types: ['lab'] },
  { key: 'pharmacy',     label: 'Pharmacy',                 types: ['medicine'] },
  { key: 'imaging',      label: 'Imaging',                  types: ['imaging'] },
  { key: 'other',        label: 'Services & Other',         types: ['service', 'other'] },
]

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ msg, type = 'success', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
      {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {msg}
    </div>
  )
}

// ── Payment Modal (split payments + cash denomination) ────────────────────────

const DENOMS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1]

const mkSplit = (method, amount) => ({ method, amount, reference: '', showDenom: false, denoms: {} })

function PaymentModal({ balanceAmount, onClose, onSave, saving }) {
  const [splits, setSplits] = useState([
    mkSplit('cash', balanceAmount > 0 ? balanceAmount.toFixed(2) : ''),
  ])

  const addSplit    = () => setSplits(p => [...p, mkSplit('upi', '')])
  const removeSplit = i => setSplits(p => p.filter((_, idx) => idx !== i))
  const update      = (i, k, v) => setSplits(p => p.map((s, idx) => idx === i ? { ...s, [k]: v } : s))

  const updateDenom = (i, denom, count) => {
    setSplits(p => p.map((s, idx) => {
      if (idx !== i) return s
      const newDenoms  = { ...s.denoms, [denom]: parseInt(count) || 0 }
      const denomTotal = DENOMS.reduce((sum, d) => sum + (newDenoms[d] || 0) * d, 0)
      return { ...s, denoms: newDenoms, amount: denomTotal > 0 ? String(denomTotal) : s.amount }
    }))
  }

  const fillExact = (i) => {
    const othersPaid = splits.reduce((s, x, idx) => idx !== i ? s + (+x.amount || 0) : s, 0)
    const exact = Math.max(0, balanceAmount - othersPaid)
    update(i, 'amount', exact.toFixed(2))
    navigator.clipboard?.writeText(exact.toFixed(2)).catch(() => {})
  }

  const totalPaying = splits.reduce((s, x) => s + (+x.amount || 0), 0)
  const remaining   = +(balanceAmount - totalPaying).toFixed(2)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-800 text-lg">Collect Payment</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>

        {balanceAmount > 0 && (
          <div className="flex justify-between items-center px-4 py-3 rounded-xl mb-4" style={{ background: '#0F2557' }}>
            <span className="text-blue-200 text-sm">Balance Due</span>
            <span className="font-extrabold text-white text-lg">{fmt(balanceAmount)}</span>
          </div>
        )}

        <div className="space-y-3">
          {splits.map((split, i) => {
            const denomTotal = DENOMS.reduce((s, d) => s + (split.denoms[d] || 0) * d, 0)
            const change     = denomTotal - (+split.amount || 0)
            return (
              <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2.5 bg-gray-50 relative">
                {splits.length > 1 && (
                  <button onClick={() => removeSplit(i)}
                    className="absolute top-2.5 right-2.5 p-0.5 text-gray-300 hover:text-red-400 rounded">
                    <X size={14} />
                  </button>
                )}
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Payment {splits.length > 1 ? i + 1 : ''} — Method
                </div>

                {/* Method selector */}
                <div className="grid grid-cols-2 gap-1.5">
                  {PAYMENT_METHODS.map(({ value, label, Icon }) => (
                    <button key={value} onClick={() => update(i, 'method', value)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${split.method === value ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
                      <Icon size={12} />{label}
                    </button>
                  ))}
                </div>

                {/* Amount + reference */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">Amount (₹)</label>
                    <div className="flex gap-1">
                      <input type="number" className="input flex-1 min-w-0" value={split.amount}
                        onChange={e => update(i, 'amount', e.target.value)} placeholder="0.00" />
                      {balanceAmount > 0 && (
                        <button onClick={() => fillExact(i)} title="Fill exact due & copy to clipboard"
                          className="px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 flex-shrink-0 whitespace-nowrap">
                          Fill
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="label">Reference</label>
                    <input className="input" value={split.reference}
                      onChange={e => update(i, 'reference', e.target.value)}
                      placeholder={split.method === 'upi' ? 'UPI txn ID' : split.method === 'card' ? 'Last 4 digits' : 'Optional'} />
                  </div>
                </div>

                {/* Cash denomination — optional, only for cash */}
                {split.method === 'cash' && (
                  <div>
                    <button onClick={() => update(i, 'showDenom', !split.showDenom)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 font-medium">
                      <span>{split.showDenom ? '▾' : '▸'}</span>
                      Denomination breakdown (optional)
                    </button>

                    {split.showDenom && (
                      <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden bg-white">
                        <div className="divide-y divide-gray-50">
                          {DENOMS.map(d => (
                            <div key={d} className="flex items-center gap-3 px-3 py-2">
                              <span className="text-xs font-semibold text-gray-500 w-12 flex-shrink-0">₹{d}</span>
                              <span className="text-xs text-gray-400">×</span>
                              <input
                                type="number" min={0}
                                value={split.denoms[d] || ''}
                                onChange={e => updateDenom(i, d, e.target.value)}
                                className="w-16 text-xs text-center border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-200 bg-gray-50"
                                placeholder="0"
                              />
                              <span className="text-xs text-gray-400 ml-auto min-w-[60px] text-right">
                                {(split.denoms[d] || 0) > 0
                                  ? <span className="font-medium text-gray-600">= ₹{((split.denoms[d] || 0) * d).toLocaleString('en-IN')}</span>
                                  : '—'}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Denomination totals */}
                        <div className="border-t border-gray-100 px-3 py-2 flex justify-between text-xs bg-gray-50">
                          <span className="text-gray-500 font-medium">Cash Collected</span>
                          <span className="font-bold text-gray-700">{fmt(denomTotal)}</span>
                        </div>
                        {denomTotal > 0 && change !== 0 && (
                          <div className={`px-3 py-2 flex justify-between text-xs border-t ${change > 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                            <span className={`font-medium ${change > 0 ? 'text-green-700' : 'text-red-600'}`}>
                              {change > 0 ? '↩ Change to Return' : '⚠ Short by'}
                            </span>
                            <span className={`font-bold ${change > 0 ? 'text-green-700' : 'text-red-600'}`}>
                              {fmt(Math.abs(change))}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <button onClick={addSplit}
          className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
          <Plus size={14} />Add another payment method
        </button>

        {splits.length > 1 && (
          <div className="mt-3 p-3 rounded-xl border border-gray-100 bg-gray-50 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Paying</span>
              <span className="font-semibold">{fmt(totalPaying)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Remaining</span>
              <span className={`font-semibold ${remaining > 0 ? 'text-red-600' : remaining < 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {remaining < 0 ? `+${fmt(Math.abs(remaining))} excess` : remaining === 0 ? '✓ Cleared' : fmt(remaining)}
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button onClick={() => onSave(splits)}
            disabled={saving || splits.every(s => !s.amount || +s.amount <= 0)}
            className="btn-primary flex-1 justify-center">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Record Payment{splits.length > 1 ? 's' : ''}
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Waiver Modal ──────────────────────────────────────────────────────────────

function WaiverModal({ invoiceTotal, onClose, onSave, saving }) {
  const [form, setForm] = useState({ waiver_amount: '', reason: '', notes: '' })
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-800">Apply Waiver / Discount</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">Waiver Amount (₹) *</label>
            <input type="number" className="input" value={form.waiver_amount}
              onChange={e => setF('waiver_amount', e.target.value)} placeholder="Enter amount" />
          </div>
          <div>
            <label className="label">Reason *</label>
            <select className="input" value={form.reason} onChange={e => setF('reason', e.target.value)}>
              <option value="">Select reason</option>
              {WAIVER_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input" rows={2} value={form.notes} onChange={e => setF('notes', e.target.value)} />
          </div>
          {form.waiver_amount && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
              New total after waiver: {fmt(Math.max(0, (+invoiceTotal || 0) - (+form.waiver_amount || 0)))}
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => onSave(form)}
            disabled={saving || !form.waiver_amount || !form.reason}
            className="btn-primary flex-1 justify-center">
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Apply Waiver
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Charge Modal ──────────────────────────────────────────────────────────────

function ChargeModal({ editItem, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    description:     editItem?.description || '',
    item_type:       editItem?.item_type   || 'consultation',
    quantity:        editItem?.quantity    || 1,
    unit_price:      editItem?.unit_price  ?? '',
    discount_amount: editItem?.discount_amount ?? 0,
    gst_rate:        editItem?.gst_rate    ?? 0,
  })
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const preview = (() => {
    const base = (+form.unit_price || 0) * (+form.quantity || 1) - (+form.discount_amount || 0)
    return base * (1 + (+form.gst_rate || 0) / 100)
  })()

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-gray-800">{editItem ? 'Edit Charge' : 'Add Charge'}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">Description *</label>
            <input className="input" value={form.description}
              onChange={e => setF('description', e.target.value)} placeholder="e.g. Consultation, CBC, X-Ray" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.item_type} onChange={e => setF('item_type', e.target.value)}>
                {ITEM_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Quantity</label>
              <input type="number" className="input" min={1} value={form.quantity}
                onChange={e => setF('quantity', parseInt(e.target.value) || 1)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Unit Price (₹) *</label>
              <input type="number" className="input" value={form.unit_price}
                onChange={e => setF('unit_price', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="label">Discount (₹)</label>
              <input type="number" className="input" value={form.discount_amount}
                onChange={e => setF('discount_amount', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="label">GST (%)</label>
              <input type="number" className="input" value={form.gst_rate}
                onChange={e => setF('gst_rate', e.target.value)} placeholder="0" />
            </div>
          </div>
          {form.unit_price !== '' && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 flex justify-between text-sm">
              <span className="text-blue-600">Calculated Total</span>
              <span className="font-bold text-blue-800">{fmt(preview)}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={() => onSave(form)}
            disabled={saving || !form.description || form.unit_price === ''}
            className="btn-primary flex-1 justify-center">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {editItem ? 'Update' : 'Add Charge'}
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function BillingDetail() {
  const { invoiceId } = useParams()
  const navigate      = useNavigate()

  const [baseInvoice, setBaseInvoice]   = useState(null)
  const [detail, setDetail]             = useState(null)
  const [pastInvoices, setPastInvoices] = useState([])
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [toast, setToast]               = useState(null)

  const [showPayment, setShowPayment] = useState(false)
  const [showWaiver, setShowWaiver]   = useState(false)
  const [showCharge, setShowCharge]   = useState(false)
  const [editItem, setEditItem]       = useState(null)

  const notify = (msg, type = 'success') => setToast({ msg, type })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const inv = await api.get(`/billing/invoices/${invoiceId}`)
      setBaseInvoice(inv)

      if (inv.appointment_id) {
        const d = await api.get(`/clinic/billing/appointment/${inv.appointment_id}`)
        setDetail(d)
      }

      if (inv.patient_id) {
        api.get('/billing/invoices', { params: { patient_id: inv.patient_id, limit: 20 } })
          .then(r => setPastInvoices((Array.isArray(r) ? r : []).filter(i => String(i.id) !== String(invoiceId))))
          .catch(() => setPastInvoices([]))
      }
    } catch {
      notify('Failed to load invoice', 'error')
    } finally { setLoading(false) }
  }, [invoiceId])

  useEffect(() => { load() }, [load])

  // Resolved values — prefer appointment detail when available
  const inv      = detail?.invoice  || baseInvoice
  const items    = detail?.items    || baseInvoice?.items || []
  const waivers  = detail?.waivers  || []
  const payments = detail?.payments || []
  const overrides = (detail?.overrides || []).filter(o => o.status === 'pending')
  const patient  = detail?.patient  || null
  const appt     = detail?.appointment || null
  const doctor   = detail?.doctor   || null

  const invTotal = inv ? (+inv.total || +inv.total_amount || 0) : 0
  const balance  = inv ? Math.max(0, invTotal - (+inv.amount_paid || 0)) : 0

  const ensureInvoice = async () => {
    if (inv?.id) return inv.id
    const r = await api.post(`/clinic/billing/appointment/${baseInvoice?.appointment_id}/invoice`)
    await load()
    return r.id
  }

  const handlePayment = async (splits) => {
    setSaving(true)
    try {
      const id = await ensureInvoice()
      for (const s of splits.filter(s => +s.amount > 0)) {
        await api.post(`/clinic/billing/invoice/${id}/payment`, {
          amount: +s.amount, method: s.method, reference: s.reference || '',
        })
      }
      notify('Payment recorded'); setShowPayment(false); load()
    } catch (e) { notify(e.message || 'Error', 'error') }
    finally { setSaving(false) }
  }

  const handleWaiver = async (form) => {
    setSaving(true)
    try {
      const id = await ensureInvoice()
      await api.post(`/clinic/billing/invoice/${id}/waiver`, form)
      notify('Waiver applied'); setShowWaiver(false); load()
    } catch (e) { notify(e.message || 'Error', 'error') }
    finally { setSaving(false) }
  }

  const handleSaveCharge = async (form) => {
    setSaving(true)
    try {
      const id = await ensureInvoice()
      if (editItem) {
        await api.put(`/clinic/billing/invoice/${id}/items/${editItem.id}`, form)
        notify('Charge updated')
      } else {
        await api.post(`/clinic/billing/invoice/${id}/items`, form)
        notify('Charge added')
      }
      setShowCharge(false); setEditItem(null); load()
    } catch (e) { notify(e.message || 'Error', 'error') }
    finally { setSaving(false) }
  }

  const handleDeleteItem = async (itemId) => {
    if (!inv?.id) return
    setSaving(true)
    try {
      await api.delete(`/clinic/billing/invoice/${inv.id}/items/${itemId}`)
      notify('Item removed'); load()
    } catch { notify('Error removing item', 'error') }
    finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-gray-300" />
      </div>
    )
  }

  const patientName = patient?.full_name || baseInvoice?.patient_name || baseInvoice?.customer_name || 'Patient'
  const bhId   = patient?.bh_id   || null
  const age    = patient?.age     ? `${patient.age}Y` : null
  const gender = patient?.gender  ? patient.gender.charAt(0).toUpperCase() : null

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Back + Patient header ── */}
      <div className="flex items-start gap-3 mb-5">
        <button onClick={() => navigate('/billing')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 font-medium mt-0.5 flex-shrink-0">
          <ChevronLeft size={16} />Back
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{patientName}</h1>
            {bhId   && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-mono">{bhId}</span>}
            {(age || gender) && <span className="text-xs text-gray-400">{[age, gender].filter(Boolean).join(' · ')}</span>}
            {inv?.invoice_number && <span className="text-xs text-gray-400 font-mono">{inv.invoice_number}</span>}
            {inv?.status && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusBadge(inv.status)}`}>
                {inv.status}
              </span>
            )}
          </div>
          {(appt || doctor) && (
            <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-1">
              {appt?.date  && <span>{appt.date}{appt.time ? ` · ${appt.time}` : ''}</span>}
              {doctor?.name && <span>Dr. {doctor.name}{doctor.specialty ? ` — ${doctor.specialty}` : ''}</span>}
            </div>
          )}
        </div>
        <button onClick={load} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 flex-shrink-0" title="Refresh">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* ── DUE + PAY NOW — always at top ── */}
      <div className={`flex flex-wrap items-center justify-between gap-4 px-5 py-4 rounded-xl mb-5 border ${balance > 0 ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}`}>
        <div className="flex flex-wrap gap-6">
          <div>
            <div className="text-xs text-gray-500 mb-0.5">Total Billed</div>
            <div className="font-extrabold text-xl" style={{ color: '#0F2557' }}>{fmt(invTotal)}</div>
          </div>
          {(+inv?.amount_paid || 0) > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-0.5">Collected</div>
              <div className="font-bold text-xl text-green-600">{fmt(inv.amount_paid)}</div>
            </div>
          )}
          {(+inv?.discount || 0) > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-0.5">Waiver</div>
              <div className="font-bold text-xl text-red-500">-{fmt(inv.discount)}</div>
            </div>
          )}
          <div>
            <div className="text-xs text-gray-500 mb-0.5">{balance > 0 ? 'Balance Due' : 'Status'}</div>
            <div className={`font-extrabold text-xl ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {balance > 0 ? fmt(balance) : '✓ Fully Paid'}
            </div>
          </div>
        </div>
        {balance > 0 && (
          <div className="flex gap-2">
            <button onClick={() => setShowPayment(true)}
              className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm shadow-sm hover:opacity-90 transition-opacity"
              style={{ background: '#0F2557' }}>
              Pay Now
            </button>
            <button onClick={() => setShowWaiver(true)} className="btn-secondary px-4 py-2.5 text-sm">
              Waiver
            </button>
          </div>
        )}
      </div>

      {/* ── Pending override alert ── */}
      {overrides.length > 0 && (
        <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">
              {overrides.length} pending charge request{overrides.length > 1 ? 's' : ''} from departments
            </span>
          </div>
          {overrides.map(o => (
            <div key={o.id} className="bg-white rounded-lg p-3 mb-2 last:mb-0 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-gray-800 capitalize">{o.from_module} — {fmt(o.total_amount)}</div>
                {o.items?.map((it, i) => (
                  <div key={i} className="text-xs text-gray-400 mt-0.5">{it.description} × {it.quantity} @ ₹{it.unit_price}</div>
                ))}
              </div>
              <div className="flex gap-2">
                <button disabled={saving}
                  onClick={async () => {
                    setSaving(true)
                    try { await api.put(`/clinic/billing/override-requests/${o.id}`, { action: 'approve' }); notify('Approved'); load() }
                    catch { notify('Error', 'error') }
                    finally { setSaving(false) }
                  }}
                  className="btn-primary text-xs py-1 px-2">Approve</button>
                <button disabled={saving}
                  onClick={async () => {
                    setSaving(true)
                    try { await api.put(`/clinic/billing/override-requests/${o.id}`, { action: 'reject' }); notify('Rejected'); load() }
                    catch { notify('Error', 'error') }
                    finally { setSaving(false) }
                  }}
                  className="btn-secondary text-xs py-1 px-2">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CURRENT VISIT — one big box ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 text-base">Current Visit</h2>
          <button onClick={() => { setEditItem(null); setShowCharge(true) }}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
            <Plus size={13} />Add Charge
          </button>
        </div>

        {items.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">
            No charges yet — click Add Charge to begin
          </div>
        ) : (
          <>
            {SECTIONS.map((sec, si) => {
              const secItems = items.filter(it => sec.types.includes(it.item_type))
              if (secItems.length === 0) return null
              const secTotal = secItems.reduce((s, it) => s + (+it.total || 0), 0)
              return (
                <div key={sec.key}>
                  {si > 0 && <hr className="border-gray-100" />}
                  <div className="px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{sec.label}</span>
                      <span className="text-sm font-semibold text-gray-500">{fmt(secTotal)}</span>
                    </div>
                    <div className="space-y-2">
                      {secItems.map(it => (
                        <div key={it.id} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-gray-800">{it.description}</span>
                            {it.quantity > 1 && <span className="text-xs text-gray-400 ml-2">×{it.quantity}</span>}
                            {+it.discount_amount > 0 && <span className="text-xs text-red-400 ml-2">-₹{it.discount_amount} disc</span>}
                            {+it.gst_rate > 0 && <span className="text-xs text-gray-400 ml-1">+{it.gst_rate}% GST</span>}
                          </div>
                          <span className="text-sm font-semibold text-gray-700 flex-shrink-0">{fmt(it.total)}</span>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => { setEditItem(it); setShowCharge(true) }}
                              className="p-1 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-600">
                              <Edit2 size={12} />
                            </button>
                            <button onClick={() => handleDeleteItem(it.id)} disabled={saving}
                              className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Waivers */}
            {waivers.length > 0 && (
              <>
                <hr className="border-gray-100" />
                <div className="px-5 py-4">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Waivers & Discounts</div>
                  {waivers.map(w => (
                    <div key={w.id} className="flex justify-between items-center py-1 text-sm">
                      <span>
                        <span className="text-red-500 font-semibold">-{fmt(w.waiver_amount)}</span>
                        <span className="text-gray-500 ml-2">{w.reason}</span>
                        {w.notes && <span className="text-gray-400 ml-1 text-xs">— {w.notes}</span>}
                      </span>
                      <span className="text-xs text-gray-400">{fmtDate(w.created_at)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Payments recorded */}
            {payments.length > 0 && (
              <>
                <hr className="border-gray-100" />
                <div className="px-5 py-4">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Payments Received</div>
                  {payments.map(p => (
                    <div key={p.id} className="flex justify-between items-center py-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium capitalize">
                          {(p.method || '').replace(/_/g, ' ')}
                        </span>
                        {p.reference && <span className="text-xs text-gray-400 font-mono">{p.reference}</span>}
                        <span className="text-xs text-gray-400">{p.received_at?.slice(0, 10)}</span>
                      </div>
                      <span className="font-semibold text-green-600">{fmt(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Totals row */}
            <hr className="border-gray-100" />
            <div className="px-5 py-3 bg-gray-50 flex flex-wrap gap-4 justify-between items-center text-sm">
              <div className="flex flex-wrap gap-4 text-gray-500">
                <span>Subtotal <span className="font-semibold text-gray-700">{fmt(inv?.subtotal || 0)}</span></span>
                {(+inv?.discount || 0) > 0 && <span>Waiver <span className="font-semibold text-red-500">-{fmt(inv.discount)}</span></span>}
                {(+inv?.gst_amount || 0) > 0 && <span>GST <span className="font-semibold text-gray-700">{fmt(inv.gst_amount)}</span></span>}
              </div>
              <span className="font-extrabold text-lg" style={{ color: '#0F2557' }}>Total {fmt(invTotal)}</span>
            </div>
          </>
        )}
      </div>

      {/* ── PAST VISITS — separate box ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 text-base">Past Visits</h2>
        </div>
        {pastInvoices.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">No previous invoices for this patient</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {pastInvoices.map(pi => {
              const bal = Math.max(0, (+pi.total_amount || 0) - (+pi.amount_paid || 0))
              return (
                <div key={pi.id}
                  onClick={() => navigate(`/billing/${pi.id}`)}
                  className="px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors flex items-center justify-between gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700">{pi.invoice_number || `#${pi.id}`}</span>
                    <span className="text-xs text-gray-400 ml-3">{fmtDate(pi.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs flex-shrink-0">
                    <span className="text-gray-500">Total <span className="font-semibold text-gray-700">{fmt(pi.total_amount)}</span></span>
                    <span className="text-gray-500">Paid <span className="font-semibold text-green-600">{fmt(pi.amount_paid)}</span></span>
                    {bal > 0
                      ? <span className="font-semibold text-red-600">Bal {fmt(bal)}</span>
                      : <span className="text-green-500 flex items-center gap-0.5"><CheckCircle size={11} />Cleared</span>
                    }
                    <span className={`px-2 py-0.5 rounded-full font-medium capitalize ${statusBadge(pi.status)}`}>{pi.status}</span>
                    <ChevronLeft size={14} className="text-gray-300 rotate-180" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showPayment && (
        <PaymentModal balanceAmount={balance} onClose={() => setShowPayment(false)} onSave={handlePayment} saving={saving} />
      )}
      {showWaiver && (
        <WaiverModal invoiceTotal={invTotal} onClose={() => setShowWaiver(false)} onSave={handleWaiver} saving={saving} />
      )}
      {showCharge && (
        <ChargeModal editItem={editItem} onClose={() => { setShowCharge(false); setEditItem(null) }} onSave={handleSaveCharge} saving={saving} />
      )}
    </div>
  )
}
