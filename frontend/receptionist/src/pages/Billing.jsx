import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../api/client'
import {
  Search, FileText, Printer, X, Plus, Trash2, Edit2, Check,
  Loader2, AlertCircle, CheckCircle, ChevronLeft,
  Banknote, Smartphone, CreditCard, Building2, Shield,
  AlertTriangle, Calendar, Filter, RefreshCw, Info,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const SCHEME_CATEGORIES = [
  { value: 'central_govt', label: 'Central Government' },
  { value: 'state_govt',   label: 'State Government' },
  { value: 'esic',         label: 'ESIC (Employee State Insurance)' },
  { value: 'cghs',         label: 'CGHS (Central Govt Employees)' },
  { value: 'echs',         label: 'ECHS (Defence Veterans)' },
  { value: 'private',      label: 'Private Insurance' },
  { value: 'other',        label: 'Other' },
]

const COMMON_SCHEMES = {
  central_govt: [
    'PMJAY / Ayushman Bharat',
    'RBSK (Rashtriya Bal Swasthya Karyakram)',
    'JSSK (Janani Shishu Suraksha Karyakram)',
    'PMSBY (Pradhan Mantri Suraksha Bima Yojana)',
    'PMJJBY (Pradhan Mantri Jeevan Jyoti Bima Yojana)',
  ],
  state_govt: [
    'Aarogya Sree (Telangana)',
    'Dr. YSR Aarogyasri (Andhra Pradesh)',
    'CMCHIS (Tamil Nadu)',
    'Arogya Karnataka',
    'Vajpayee Arogyashree (Karnataka)',
    'MJPJAY (Maharashtra)',
    'MA Amrutum / Vatsalya (Gujarat)',
    'Mukhyamantri Chiranjeevi Yojana (Rajasthan)',
    'Swasthya Sathi (West Bengal)',
    'BSKY / Biju Swasthya Kalyan Yojana (Odisha)',
    'Sarbat Sehat Bima Yojana (Punjab)',
    'Him Care (Himachal Pradesh)',
    'Delhi Arogya Kosh (Delhi)',
    'Mukhyamantri Swasthya Bima Yojana (Jharkhand)',
    'Khubchand Baghel Swasthya Sahayata Yojana (Chhattisgarh)',
    'Atal Amrit Abhiyan (Assam)',
    'SEHAT (Jammu & Kashmir)',
    'Karunya (Kerala)',
    'Mukhyamantri Jan Arogya Abhiyan (Uttar Pradesh)',
    'Other State Scheme',
  ],
  esic:    ['ESIC'],
  cghs:    ['CGHS'],
  echs:    ['ECHS'],
  private: [
    'Star Health Insurance',
    'HDFC ERGO Health Insurance',
    'Bajaj Allianz Health Insurance',
    'ICICI Lombard Health Insurance',
    'Niva Bupa (formerly Max Bupa)',
    'Care Health Insurance (Religare)',
    'Tata AIG Health Insurance',
    'ManipalCigna Health Insurance',
    'Aditya Birla Health Insurance',
    'Acko Health Insurance',
    'New India Assurance',
    'National Insurance',
    'United India Insurance',
    'Oriental Insurance',
    'Medi Assist (TPA)',
    'FHPL (TPA)',
    'Raksha TPA',
    'MDIndia TPA',
    'Vipul Medcorp (TPA)',
    'Paramount Health Services (TPA)',
    'E-Meditek (TPA)',
    'Other Insurance / TPA',
  ],
}

const ITEM_TYPES = ['consultation', 'procedure', 'lab', 'medicine', 'service', 'other']

const PAYMENT_METHODS = [
  { value: 'cash',        label: 'Cash',        Icon: Banknote },
  { value: 'upi',         label: 'UPI',         Icon: Smartphone },
  { value: 'card',        label: 'Card',        Icon: CreditCard },
  { value: 'cheque',      label: 'Cheque',      Icon: FileText },
  { value: 'neft',        label: 'NEFT/RTGS',   Icon: Building2 },
  { value: 'insurance',   label: 'Insurance',   Icon: Shield },
  { value: 'govt_scheme', label: 'Govt Scheme', Icon: Shield },
  { value: 'other',       label: 'Other',       Icon: CreditCard },
]

const WAIVER_REASONS = [
  'Financial Hardship',
  "Doctor's Request",
  'Billing Error',
  'Staff / VIP',
  'Repeat Visit',
  'Charity / NGO',
  'Other',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = n => `₹${(+n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

function fmtDate(str) {
  if (!str) return '—'
  try { return new Date(str).toLocaleDateString('en-IN', { dateStyle: 'medium' }) }
  catch { return str }
}

function statusChip(status) {
  const map = {
    paid:    'badge-green',
    partial: 'badge-yellow',
    pending: 'bg-amber-100 text-amber-800 badge',
  }
  return map[status] || 'badge-gray'
}

function useDebounce(value, delay) {
  const [dv, setDv] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return dv
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
      {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {msg}
    </div>
  )
}

// ─── Day Report Modal ─────────────────────────────────────────────────────────

function DayReportModal({ invoices, onClose }) {
  const today = new Date().toISOString().slice(0, 10)
  const todayPaid = invoices.filter(
    i => i.status === 'paid' && i.created_at?.slice(0, 10) === today
  )
  const todayPending = invoices.filter(
    i => (i.status === 'pending' || i.status === 'partial') && i.created_at?.slice(0, 10) === today
  )
  const pendingTotal = todayPending.reduce((s, i) => s + (+i.total_amount || 0), 0)

  const allMethods = ['cash', 'upi', 'card', 'cheque', 'neft', 'insurance', 'govt_scheme', 'other']
  const methodLabels = {
    cash: 'Cash', upi: 'UPI', card: 'Card', cheque: 'Cheque',
    neft: 'NEFT/RTGS', insurance: 'Insurance', govt_scheme: 'Govt Scheme', other: 'Other',
  }
  const grouped = allMethods.map(method => {
    const items = todayPaid.filter(i => {
      const m = (i.payment_method || 'cash').toLowerCase()
      if (method === 'other') return !allMethods.slice(0, -1).includes(m)
      return m === method
    })
    return { method, label: methodLabels[method], count: items.length, total: items.reduce((s, i) => s + (+i.total_amount || 0), 0) }
  }).filter(g => g.count > 0)

  const grandTotal = todayPaid.reduce((s, i) => s + (+i.total_amount || 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-800 text-lg">Day-End Cash Report</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Collections by Payment Method</div>
          {grouped.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">No paid invoices today</div>
          ) : (
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
              {grouped.map(g => (
                <div key={g.method} className="flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100">
                  <div>
                    <span className="font-medium text-gray-700">{g.label}</span>
                    <span className="ml-2 text-xs text-gray-400">{g.count} invoice{g.count !== 1 ? 's' : ''}</span>
                  </div>
                  <span className="font-semibold text-gray-800">{fmt(g.total)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: '#0F2557' }}>
            <span className="font-bold text-white">Grand Total Collected</span>
            <span className="font-extrabold text-white text-lg">{fmt(grandTotal)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-red-100 bg-red-50">
            <span className="font-medium text-red-700 text-sm">Pending Amount (Today)</span>
            <span className="font-bold text-red-700">{fmt(pendingTotal)}</span>
          </div>
        </div>

        <div className="px-5 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary text-sm">Close</button>
          <button onClick={() => window.print()} className="btn-primary flex items-center gap-2 text-sm">
            <Printer size={14} />Print Report
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add / Edit Charge Modal ──────────────────────────────────────────────────

function ChargeModal({ editItem, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    description: editItem?.description || '',
    item_type:   editItem?.item_type || 'consultation',
    quantity:    editItem?.quantity || 1,
    unit_price:  editItem?.unit_price ?? '',
    discount_amount: editItem?.discount_amount ?? 0,
    gst_rate:    editItem?.gst_rate ?? 0,
  })
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const previewTotal = (() => {
    const base = (+form.unit_price || 0) * (+form.quantity || 1) - (+form.discount_amount || 0)
    return base * (1 + (+form.gst_rate || 0) / 100)
  })()

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-gray-800 text-base">{editItem ? 'Edit Charge' : 'Add Charge'}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-700" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">Description *</label>
            <input className="input" value={form.description} onChange={e => setF('description', e.target.value)} placeholder="e.g. Consultation, CBC, X-Ray" />
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
              <input type="number" className="input" min={1} value={form.quantity} onChange={e => setF('quantity', parseInt(e.target.value) || 1)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Unit Price (₹) *</label>
              <input type="number" className="input" value={form.unit_price} onChange={e => setF('unit_price', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="label">Discount (₹)</label>
              <input type="number" className="input" value={form.discount_amount} onChange={e => setF('discount_amount', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="label">GST (%)</label>
              <input type="number" className="input" value={form.gst_rate} onChange={e => setF('gst_rate', e.target.value)} placeholder="0" />
            </div>
          </div>
          {form.unit_price !== '' && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 flex justify-between items-center text-sm">
              <span className="text-blue-600">Calculated Total</span>
              <span className="font-bold text-blue-800 text-base">{fmt(previewTotal)}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.description || form.unit_price === ''}
            className="btn-primary flex-1 justify-center"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {editItem ? 'Update' : 'Add Charge'}
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Waiver Modal ─────────────────────────────────────────────────────────────

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
            <input type="number" className="input" value={form.waiver_amount} onChange={e => setF('waiver_amount', e.target.value)} placeholder="Enter amount" />
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
            <textarea className="input" rows={2} value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Any additional notes" />
          </div>
          {form.waiver_amount && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
              New total after waiver: {fmt(Math.max(0, (+invoiceTotal || 0) - (+form.waiver_amount || 0)))}
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.waiver_amount || !form.reason}
            className="btn-primary flex-1 justify-center"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Apply Waiver
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Payment Modal (split-payment) ───────────────────────────────────────────

function PaymentModal({ balanceAmount, onClose, onSave, saving }) {
  const [splits, setSplits] = useState([
    { method: 'cash', amount: balanceAmount > 0 ? balanceAmount.toFixed(2) : '', reference: '' },
  ])

  const addSplit   = () => setSplits(p => [...p, { method: 'upi', amount: '', reference: '' }])
  const removeSplit = (i) => setSplits(p => p.filter((_, idx) => idx !== i))
  const updateSplit = (i, k, v) => setSplits(p => p.map((s, idx) => idx === i ? { ...s, [k]: v } : s))

  const totalPaying = splits.reduce((sum, s) => sum + (+s.amount || 0), 0)
  const remaining   = +(balanceAmount - totalPaying).toFixed(2)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-800">Collect Payment</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>

        {balanceAmount > 0 && (
          <div className="flex justify-between items-center px-4 py-2.5 rounded-xl mb-4 text-sm" style={{ background: '#0F2557' }}>
            <span className="text-blue-200">Balance Due</span>
            <span className="font-bold text-white text-base">{fmt(balanceAmount)}</span>
          </div>
        )}

        <div className="space-y-3">
          {splits.map((split, i) => (
            <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2.5 relative bg-gray-50">
              {splits.length > 1 && (
                <button onClick={() => removeSplit(i)} className="absolute top-2.5 right-2.5 p-0.5 text-gray-300 hover:text-red-400 rounded">
                  <X size={14} />
                </button>
              )}
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Split {splits.length > 1 ? i + 1 : ''} — Payment Method
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {PAYMENT_METHODS.slice(0, 6).map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    onClick={() => updateSplit(i, 'method', value)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${split.method === value ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    <Icon size={12} />{label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Amount (₹)</label>
                  <input
                    type="number"
                    className="input"
                    value={split.amount}
                    onChange={e => updateSplit(i, 'amount', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="label">Reference</label>
                  <input
                    className="input"
                    value={split.reference}
                    onChange={e => updateSplit(i, 'reference', e.target.value)}
                    placeholder="UPI / card last 4"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addSplit}
          className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus size={14} />Add another payment method
        </button>

        {splits.length > 1 && (
          <div className="mt-3 p-3 rounded-xl border border-gray-100 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Paying</span>
              <span className="font-semibold">{fmt(totalPaying)}</span>
            </div>
            {balanceAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Remaining Balance</span>
                <span className={`font-semibold ${remaining > 0 ? 'text-red-600' : remaining < 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {remaining < 0 ? `+${fmt(Math.abs(remaining))} excess` : remaining === 0 ? '✓ Cleared' : fmt(remaining)}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onSave(splits)}
            disabled={saving || splits.every(s => !s.amount || +s.amount <= 0)}
            className="btn-primary flex-1 justify-center"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Record Payment{splits.length > 1 ? 's' : ''}
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Claim Modal ──────────────────────────────────────────────────────────────

const BLANK_CLAIM = {
  scheme_category: 'central_govt', scheme_name: '', card_number: '',
  policy_holder_name: '', tpa_name: '', pre_auth_amount: '', pre_auth_ref: '',
  pre_auth_status: '', pre_auth_notes: '', claim_ref: '', claimed_amount: '',
  approved_amount: '', claim_status: 'draft', claim_notes: '',
}

function ClaimModal({ editClaim, onClose, onSave, saving }) {
  const [form, setForm] = useState(editClaim ? { ...BLANK_CLAIM, ...editClaim } : { ...BLANK_CLAIM })
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const suggestions = COMMON_SCHEMES[form.scheme_category] || []
  const isCustom = !suggestions.includes(form.scheme_name)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-800">{editClaim ? 'Update Scheme / Claim' : 'Add Scheme / Insurance'}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">Scheme Category *</label>
            <select className="input" value={form.scheme_category} onChange={e => setF('scheme_category', e.target.value)}>
              {SCHEME_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Scheme / Insurance Name *</label>
            <select
              className="input mb-1"
              value={isCustom ? '__custom' : form.scheme_name}
              onChange={e => { if (e.target.value !== '__custom') setF('scheme_name', e.target.value) }}
            >
              <option value="__custom">— Type custom name below —</option>
              {suggestions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input
              className="input text-sm"
              value={form.scheme_name}
              onChange={e => setF('scheme_name', e.target.value)}
              placeholder="Or type scheme name directly…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Card / Policy Number</label>
              <input className="input font-mono text-sm" value={form.card_number} onChange={e => setF('card_number', e.target.value)} placeholder="Beneficiary / policy #" />
            </div>
            <div>
              <label className="label">Policy Holder Name</label>
              <input className="input text-sm" value={form.policy_holder_name} onChange={e => setF('policy_holder_name', e.target.value)} placeholder="If different from patient" />
            </div>
          </div>
          {form.scheme_category === 'private' && (
            <div>
              <label className="label">TPA Name</label>
              <input className="input text-sm" value={form.tpa_name} onChange={e => setF('tpa_name', e.target.value)} placeholder="e.g. Medi Assist, Raksha TPA" />
            </div>
          )}

          <div className="border-t border-gray-100 pt-3">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Pre-Authorization</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Estimated Amount (₹)</label>
                <input type="number" className="input text-sm" value={form.pre_auth_amount} onChange={e => setF('pre_auth_amount', e.target.value)} placeholder="Treatment estimate" />
              </div>
              <div>
                <label className="label">Pre-Auth Ref #</label>
                <input className="input text-sm" value={form.pre_auth_ref} onChange={e => setF('pre_auth_ref', e.target.value)} placeholder="Govt / TPA reference" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="label">Pre-Auth Status</label>
                <select className="input text-sm" value={form.pre_auth_status} onChange={e => setF('pre_auth_status', e.target.value)}>
                  <option value="">Not Submitted</option>
                  <option value="pending">Submitted — Pending</option>
                  <option value="approved">Approved</option>
                  <option value="partial">Partially Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="label">Pre-Auth Notes</label>
                <input className="input text-sm" value={form.pre_auth_notes} onChange={e => setF('pre_auth_notes', e.target.value)} placeholder="Conditions, limits" />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Final Claim</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Claimed Amount (₹)</label>
                <input type="number" className="input text-sm" value={form.claimed_amount} onChange={e => setF('claimed_amount', e.target.value)} placeholder="Total claimed" />
              </div>
              <div>
                <label className="label">Approved Amount (₹)</label>
                <input type="number" className="input text-sm" value={form.approved_amount} onChange={e => setF('approved_amount', e.target.value)} placeholder="Amount approved" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="label">Claim Ref #</label>
                <input className="input text-sm" value={form.claim_ref} onChange={e => setF('claim_ref', e.target.value)} placeholder="Claim reference number" />
              </div>
              <div>
                <label className="label">Claim Status</label>
                <select className="input text-sm" value={form.claim_status} onChange={e => setF('claim_status', e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                  <option value="partial">Partially Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="paid">Paid / Settled</option>
                </select>
              </div>
            </div>
            <div className="mt-2">
              <label className="label">Claim Notes</label>
              <textarea className="input text-sm" rows={2} value={form.claim_notes} onChange={e => setF('claim_notes', e.target.value)} placeholder="Remarks, settlement notes" />
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.scheme_name}
            className="btn-primary flex-1 justify-center"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {editClaim ? 'Update Claim' : 'Save Claim'}
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Right Panel — Billing Detail ─────────────────────────────────────────────

function BillingDetail({ invoice: listInvoice, onBack, onReloadList }) {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('charges')
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState(null)

  // Modal states
  const [showCharge, setShowCharge]   = useState(false)
  const [editItem, setEditItem]       = useState(null)
  const [showWaiver, setShowWaiver]   = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showClaim, setShowClaim]     = useState(false)
  const [editClaim, setEditClaim]     = useState(null)

  // Past visits
  const [pastInvoices, setPastInvoices] = useState([])

  const notify = (msg, type = 'success') => setToast({ msg, type })

  const appointmentId = listInvoice?.appointment_id
  const hasAppointment = !!appointmentId

  const load = useCallback(async () => {
    if (!hasAppointment) { setLoading(false); return }
    setLoading(true)
    try {
      const r = await api.get(`/clinic/billing/appointment/${appointmentId}`)
      setData(r)
    } catch {
      notify('Failed to load billing detail', 'error')
    } finally { setLoading(false) }
  }, [appointmentId, hasAppointment])

  useEffect(() => { setData(null); setLoading(true); setTab('charges'); setPastInvoices([]); load() }, [load])

  useEffect(() => {
    if (!data?.patient?.id) return
    api.get('/billing/invoices', { params: { patient_id: data.patient.id, limit: 20 } })
      .then(r => {
        const all = Array.isArray(r) ? r : []
        setPastInvoices(all.filter(inv => inv.id !== data?.invoice?.id))
      })
      .catch(() => setPastInvoices([]))
  }, [data?.patient?.id, data?.invoice?.id])

  const ensureInvoice = async () => {
    if (data?.invoice) return data.invoice.id
    const r = await api.post(`/clinic/billing/appointment/${appointmentId}/invoice`)
    await load()
    return r.id
  }

  // Charges
  const handleSaveCharge = async (form) => {
    setSaving(true)
    try {
      const invId = await ensureInvoice()
      if (editItem) {
        await api.put(`/clinic/billing/invoice/${invId}/items/${editItem.id}`, form)
        notify('Charge updated')
      } else {
        await api.post(`/clinic/billing/invoice/${invId}/items`, form)
        notify('Charge added')
      }
      setShowCharge(false); setEditItem(null)
      load(); onReloadList()
    } catch (e) { notify(e.message || 'Error saving charge', 'error') }
    finally { setSaving(false) }
  }

  const handleDeleteItem = async (itemId) => {
    if (!data?.invoice) return
    setSaving(true)
    try {
      await api.delete(`/clinic/billing/invoice/${data.invoice.id}/items/${itemId}`)
      notify('Item removed'); load(); onReloadList()
    } catch { notify('Error removing item', 'error') }
    finally { setSaving(false) }
  }

  const handleApproveOverride = async (id, action) => {
    setSaving(true)
    try {
      await api.put(`/clinic/billing/override-requests/${id}`, { action })
      notify(action === 'approve' ? 'Charges added to invoice' : 'Request rejected')
      load(); onReloadList()
    } catch { notify('Error', 'error') }
    finally { setSaving(false) }
  }

  // Waiver
  const handleWaiver = async (form) => {
    setSaving(true)
    try {
      const invId = await ensureInvoice()
      await api.post(`/clinic/billing/invoice/${invId}/waiver`, form)
      notify('Waiver applied'); setShowWaiver(false); load(); onReloadList()
    } catch (e) { notify(e.message || 'Error', 'error') }
    finally { setSaving(false) }
  }

  // Payment — supports multiple splits
  const handlePayment = async (splits) => {
    setSaving(true)
    try {
      const invId = await ensureInvoice()
      const toRecord = splits.filter(s => +s.amount > 0)
      for (const s of toRecord) {
        await api.post(`/clinic/billing/invoice/${invId}/payment`, {
          amount: +s.amount, method: s.method, reference: s.reference || '',
        })
      }
      notify('Payment recorded'); setShowPayment(false); load(); onReloadList()
    } catch (e) { notify(e.message || 'Error', 'error') }
    finally { setSaving(false) }
  }

  // Claims
  const handleSaveClaim = async (form) => {
    setSaving(true)
    try {
      if (editClaim) {
        await api.put(`/clinic/billing/insurance-claim/${editClaim.id}`, form)
        notify('Claim updated')
      } else {
        await api.post('/clinic/billing/insurance-claim', {
          ...form,
          appointment_id: appointmentId,
          patient_id: data?.patient?.id,
          invoice_id: data?.invoice?.id,
        })
        notify('Claim created')
      }
      setShowClaim(false); setEditClaim(null); load()
    } catch (e) { notify(e.message || 'Error', 'error') }
    finally { setSaving(false) }
  }

  // ── Computed values ──

  const inv = data?.invoice || null
  const items = data?.items || []
  const waivers = data?.waivers || []
  const payments = data?.payments || []
  const claims = data?.claims || []
  const overrides = data?.overrides || []
  const pendingOverrides = overrides.filter(o => o.status === 'pending')
  const schemeCoverage = claims.reduce((s, c) => s + (+c.approved_amount || 0), 0)
  const balance = inv ? Math.max(0, (+inv.total || 0) - (+inv.amount_paid || 0)) : 0

  // ── Render: no appointment ──

  if (!hasAppointment) {
    const li = listInvoice
    return (
      <div className="flex flex-col h-full">
        {/* Mobile back */}
        <div className="lg:hidden px-4 py-3 border-b border-gray-100">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
            <ChevronLeft size={16} />Back
          </button>
        </div>
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex flex-wrap items-start gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900">{li.patient_name || 'Unknown Patient'}</h2>
              <p className="text-sm text-gray-500 mt-0.5">Invoice #{li.invoice_number || li.id} &nbsp;·&nbsp; {fmtDate(li.created_at)}</p>
            </div>
            <span className={`badge ${statusChip(li.status)} capitalize`}>{li.status}</span>
          </div>
          <div className="card p-5 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Total Amount</span><span className="font-semibold">{fmt(li.total_amount)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Amount Paid</span><span className="font-semibold text-green-600">{fmt(li.amount_paid)}</span></div>
            <div className="border-t border-gray-100 pt-2 flex justify-between text-sm">
              <span className="text-gray-700 font-medium">Balance</span>
              <span className={`font-bold ${(+li.total_amount - +li.amount_paid) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {fmt(Math.max(0, (+li.total_amount || 0) - (+li.amount_paid || 0)))}
              </span>
            </div>
            {li.payment_method && (
              <div className="flex justify-between text-sm"><span className="text-gray-500">Payment Method</span><span className="font-medium capitalize">{li.payment_method}</span></div>
            )}
          </div>
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-700">
            <Info size={14} className="flex-shrink-0 mt-0.5" />
            This invoice is not linked to an appointment — detailed charge breakdown is not available.
          </div>
        </div>
      </div>
    )
  }

  // ── Render: loading ──

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="lg:hidden px-4 py-3 border-b border-gray-100">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
            <ChevronLeft size={16} />Back
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-gray-300" />
        </div>
      </div>
    )
  }

  // ── Render: full detail ──

  const { appointment, patient, doctor } = data || {}

  return (
    <div className="flex flex-col h-full">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Mobile back */}
      <div className="lg:hidden px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <ChevronLeft size={16} />Back to list
        </button>
      </div>

      {/* Panel header */}
      <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex flex-wrap items-start gap-2 mb-1">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">{patient?.full_name || listInvoice.patient_name || 'Unknown'}</h2>
              {patient?.bh_id && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-mono">{patient.bh_id}</span>}
              {inv?.invoice_number && <span className="text-xs text-gray-400 font-mono">{inv.invoice_number}</span>}
              {inv?.status && (
                <span className={`badge ${statusChip(inv.status)} capitalize`}>{inv.status}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
              {appointment?.date && <span>{appointment.date}{appointment.time ? ` at ${appointment.time}` : ''}</span>}
              {doctor?.name && <span>Dr. {doctor.name}{doctor.specialty ? ` — ${doctor.specialty}` : ''}</span>}
              {appointment?.visit_type && <span className="capitalize">{appointment.visit_type.replace(/_/g, ' ')}</span>}
            </div>
          </div>
          <button onClick={load} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ── Due + Pay Now — top strip ── */}
      {inv && (
        <div className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl flex-shrink-0"
          style={{ background: balance > 0 ? '#FFF7ED' : '#F0FDF4', border: `1px solid ${balance > 0 ? '#FED7AA' : '#BBF7D0'}` }}>
          <div className="flex flex-wrap gap-4 text-sm">
            <span>
              <span className="text-gray-500">Total </span>
              <span className="font-bold" style={{ color: '#0F2557' }}>{fmt(inv.total || 0)}</span>
            </span>
            {(+inv.amount_paid || 0) > 0 && (
              <span>
                <span className="text-gray-500">Paid </span>
                <span className="font-semibold text-green-600">{fmt(inv.amount_paid)}</span>
              </span>
            )}
            {(+inv.discount || 0) > 0 && (
              <span>
                <span className="text-gray-500">Waiver </span>
                <span className="font-semibold text-red-500">-{fmt(inv.discount)}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {balance > 0
              ? <span className="text-base font-extrabold text-red-600">Due {fmt(balance)}</span>
              : <span className="text-sm font-bold text-green-600 flex items-center gap-1"><CheckCircle size={14} />Fully Paid</span>
            }
            {balance > 0 && (
              <button onClick={() => setShowPayment(true)} className="btn-primary text-sm py-1.5 px-4 flex items-center gap-1.5">
                Pay Now
              </button>
            )}
            {inv && balance > 0 && (
              <button onClick={() => setShowWaiver(true)} className="btn-secondary text-sm py-1.5 px-3">
                Waiver
              </button>
            )}
          </div>
        </div>
      )}

      {/* Override alert */}
      {pendingOverrides.length > 0 && (
        <div className="mx-4 mt-3 border border-amber-200 bg-amber-50 rounded-xl p-3 flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={15} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">
              {pendingOverrides.length} pending charge request{pendingOverrides.length > 1 ? 's' : ''} from departments
            </span>
          </div>
          {pendingOverrides.map(o => (
            <div key={o.id} className="bg-white rounded-lg p-3 mb-2 last:mb-0 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-gray-800 capitalize">{o.from_module} — {fmt(o.total_amount)}</div>
                {o.notes && <div className="text-xs text-gray-500 mt-0.5">{o.notes}</div>}
                {o.items?.map((it, i) => (
                  <div key={i} className="text-xs text-gray-400 mt-0.5">{it.description} × {it.quantity} @ ₹{it.unit_price}</div>
                ))}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => handleApproveOverride(o.id, 'approve')} disabled={saving} className="btn-primary text-xs py-1 px-2">Approve</button>
                <button onClick={() => handleApproveOverride(o.id, 'reject')} disabled={saving} className="btn-secondary text-xs py-1 px-2">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 px-4 mt-3 border-b border-gray-200 flex-shrink-0 overflow-x-auto">
        {[
          { key: 'charges',  label: 'Charges' + (pendingOverrides.length ? ` (${pendingOverrides.length})` : '') },
          { key: 'schemes',  label: 'Schemes' + (claims.length ? ` (${claims.length})` : '') },
          { key: 'payments', label: 'Payments' + (payments.length ? ` (${payments.length})` : '') },
          { key: 'past',     label: 'Past Visits' + (pastInvoices.length ? ` (${pastInvoices.length})` : '') },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${tab === t.key ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content (scrollable) */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-36 space-y-4">

        {/* ── CHARGES TAB ── */}
        {tab === 'charges' && (
          <>
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="font-semibold text-gray-800 text-sm">Line Items</span>
                <button
                  onClick={() => { setEditItem(null); setShowCharge(true) }}
                  className="btn-primary text-xs py-1 px-3 flex items-center gap-1"
                >
                  <Plus size={13} />Add Charge
                </button>
              </div>
              {items.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No items yet — click Add Charge to begin</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="th">Description</th>
                        <th className="th">Type</th>
                        <th className="th text-right">Qty</th>
                        <th className="th text-right">Rate</th>
                        <th className="th text-right">Disc</th>
                        <th className="th text-right">GST</th>
                        <th className="th text-right">Total</th>
                        <th className="th"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {items.map(it => (
                        <tr key={it.id} className="tr-hover">
                          <td className="td font-medium text-sm">{it.description}</td>
                          <td className="td text-xs text-gray-500 capitalize">{it.item_type}</td>
                          <td className="td text-right text-sm">{it.quantity}</td>
                          <td className="td text-right text-sm">₹{(+it.unit_price || 0).toLocaleString('en-IN')}</td>
                          <td className="td text-right text-sm text-red-500">{+it.discount_amount > 0 ? `-₹${it.discount_amount}` : '—'}</td>
                          <td className="td text-right text-xs text-gray-400">{+it.gst_rate > 0 ? `${it.gst_rate}%` : '—'}</td>
                          <td className="td text-right font-semibold text-sm">₹{(+it.total || 0).toLocaleString('en-IN')}</td>
                          <td className="td">
                            <div className="flex gap-1">
                              <button
                                onClick={() => { setEditItem(it); setShowCharge(true) }}
                                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                              ><Edit2 size={13} /></button>
                              <button
                                onClick={() => handleDeleteItem(it.id)}
                                disabled={saving}
                                className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                              ><Trash2 size={13} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Waivers */}
            {waivers.length > 0 && (
              <div className="card p-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">Waivers Applied</div>
                <div className="divide-y divide-gray-50">
                  {waivers.map(w => (
                    <div key={w.id} className="flex justify-between items-center py-2 text-sm">
                      <div>
                        <span className="text-red-600 font-medium">-{fmt(w.waiver_amount)}</span>
                        <span className="text-gray-500 ml-2">{w.reason}</span>
                        {w.notes && <span className="text-gray-400 ml-1 text-xs">— {w.notes}</span>}
                      </div>
                      <span className="text-xs text-gray-400">{w.created_at?.slice(0, 10)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {inv && (
              <button onClick={() => setShowWaiver(true)} className="btn-secondary text-sm flex items-center gap-1">
                <Plus size={14} />Apply Waiver / Discount
              </button>
            )}
          </>
        )}

        {/* ── SCHEMES TAB ── */}
        {tab === 'schemes' && (
          <>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">Govt schemes, state health cards, private insurance</p>
              <button
                onClick={() => { setEditClaim(null); setShowClaim(true) }}
                className="btn-primary text-sm flex items-center gap-1"
              >
                <Plus size={14} />Add Scheme
              </button>
            </div>

            {claims.length === 0 ? (
              <div className="card p-8 text-center text-gray-400 text-sm">No insurance or scheme claims added</div>
            ) : claims.map(c => (
              <div key={c.id} className="card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-gray-900">{c.scheme_name}</div>
                    <div className="text-xs text-gray-500 mt-0.5 capitalize">
                      {(c.scheme_category || '').replace(/_/g, ' ')}
                      {c.tpa_name && ` — TPA: ${c.tpa_name}`}
                    </div>
                  </div>
                  <button onClick={() => { setEditClaim(c); setShowClaim(true) }} className="btn-secondary text-xs py-1 px-2">Edit</button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {c.card_number && <div><span className="text-gray-500">Card / Policy #: </span><span className="font-mono">{c.card_number}</span></div>}
                  {c.policy_holder_name && <div><span className="text-gray-500">Holder: </span>{c.policy_holder_name}</div>}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Pre-Authorization</div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div><span className="text-gray-500">Est: </span><span className="font-medium">{c.pre_auth_amount ? fmt(c.pre_auth_amount) : '—'}</span></div>
                    <div><span className="text-gray-500">Ref: </span>{c.pre_auth_ref || '—'}</div>
                    <div>
                      <span className="text-gray-500">Status: </span>
                      <span className={`font-medium capitalize ${c.pre_auth_status === 'approved' ? 'text-green-600' : c.pre_auth_status === 'rejected' ? 'text-red-600' : 'text-amber-600'}`}>
                        {c.pre_auth_status || 'Not submitted'}
                      </span>
                    </div>
                  </div>
                  {c.pre_auth_notes && <div className="text-xs text-gray-400 mt-1">{c.pre_auth_notes}</div>}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Final Claim</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <div><span className="text-gray-500">Claimed: </span><span className="font-medium">{c.claimed_amount ? fmt(c.claimed_amount) : '—'}</span></div>
                    <div><span className="text-gray-500">Approved: </span><span className="font-medium text-green-600">{c.approved_amount ? fmt(c.approved_amount) : '—'}</span></div>
                    <div><span className="text-gray-500">Ref: </span>{c.claim_ref || '—'}</div>
                    <div>
                      <span className="text-gray-500">Status: </span>
                      <span className={`font-medium capitalize ${c.claim_status === 'approved' || c.claim_status === 'paid' ? 'text-green-600' : c.claim_status === 'rejected' ? 'text-red-600' : c.claim_status === 'submitted' ? 'text-blue-600' : 'text-gray-500'}`}>
                        {c.claim_status}
                      </span>
                    </div>
                  </div>
                  {c.claim_notes && <div className="text-xs text-gray-400 mt-1">{c.claim_notes}</div>}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── PAYMENTS TAB ── */}
        {tab === 'payments' && (
          <>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">Multiple payment methods allowed per invoice</p>
              <button
                onClick={() => setShowPayment(true)}
                className="btn-primary text-sm flex items-center gap-1"
              >
                <Plus size={14} />Collect Payment
              </button>
            </div>
            {payments.length === 0 ? (
              <div className="card p-8 text-center text-gray-400 text-sm">No payments recorded yet</div>
            ) : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead><tr>
                      <th className="th">Method</th>
                      <th className="th text-right">Amount</th>
                      <th className="th">Reference</th>
                      <th className="th">Date</th>
                      <th className="th">Notes</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {payments.map(p => (
                        <tr key={p.id} className="tr-hover">
                          <td className="td">
                            <span className="badge badge-blue capitalize">{(p.method || '').replace(/_/g, ' ')}</span>
                          </td>
                          <td className="td text-right font-semibold text-green-700">{fmt(p.amount)}</td>
                          <td className="td text-sm text-gray-500 font-mono">{p.reference || '—'}</td>
                          <td className="td text-xs text-gray-400">{p.received_at?.slice(0, 16).replace('T', ' ') || '—'}</td>
                          <td className="td text-sm text-gray-500">{p.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── PAST VISITS TAB ── */}
        {tab === 'past' && (
          <>
            {pastInvoices.length === 0 ? (
              <div className="card p-8 text-center text-gray-400 text-sm">No previous invoices found for this patient</div>
            ) : (
              <div className="card overflow-hidden divide-y divide-gray-50">
                {pastInvoices.map(inv => {
                  const bal = Math.max(0, (+inv.total_amount || 0) - (+inv.amount_paid || 0))
                  return (
                    <div key={inv.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium text-gray-800">
                            #{inv.invoice_number || inv.id}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">{fmtDate(inv.created_at)}</div>
                        </div>
                        <span className={`badge ${statusChip(inv.status)} capitalize`}>{inv.status}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs">
                        <span className="text-gray-500">Total <span className="font-semibold text-gray-700">{fmt(inv.total_amount)}</span></span>
                        <span className="text-gray-500">Paid <span className="font-semibold text-green-600">{fmt(inv.amount_paid)}</span></span>
                        {bal > 0
                          ? <span className="font-semibold text-red-600">Bal {fmt(bal)}</span>
                          : <span className="text-green-600 flex items-center gap-0.5"><CheckCircle size={10} />Cleared</span>
                        }
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Sticky breakdown bar */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-2.5">
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          <span>Subtotal <span className="font-semibold text-gray-700">{fmt(inv?.subtotal || 0)}</span></span>
          {(+inv?.discount || 0) > 0 && <span>Waiver <span className="font-semibold text-red-500">-{fmt(inv.discount)}</span></span>}
          {(+inv?.gst_amount || 0) > 0 && <span>GST <span className="font-semibold text-gray-700">{fmt(inv.gst_amount)}</span></span>}
          {schemeCoverage > 0 && <span>Scheme <span className="font-semibold text-blue-600">-{fmt(schemeCoverage)}</span></span>}
          <span>Total <span className="font-bold" style={{ color: '#0F2557' }}>{fmt(inv?.total || 0)}</span></span>
          {(+inv?.amount_paid || 0) > 0 && <span>Collected <span className="font-semibold text-green-600">{fmt(inv.amount_paid)}</span></span>}
        </div>
      </div>

      {/* Modals */}
      {showCharge && (
        <ChargeModal
          editItem={editItem}
          onClose={() => { setShowCharge(false); setEditItem(null) }}
          onSave={handleSaveCharge}
          saving={saving}
        />
      )}
      {showWaiver && (
        <WaiverModal
          invoiceTotal={inv?.total || 0}
          onClose={() => setShowWaiver(false)}
          onSave={handleWaiver}
          saving={saving}
        />
      )}
      {showPayment && (
        <PaymentModal
          balanceAmount={balance}
          onClose={() => setShowPayment(false)}
          onSave={handlePayment}
          saving={saving}
        />
      )}
      {showClaim && (
        <ClaimModal
          editClaim={editClaim}
          onClose={() => { setShowClaim(false); setEditClaim(null) }}
          onSave={handleSaveClaim}
          saving={saving}
        />
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10)
const weekStart = () => {
  const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0, 10)
}
const monthStart = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

export default function Billing() {
  const [invoices, setInvoices]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [mobileView, setMobileView]     = useState('list') // 'list' | 'detail'

  // Filters
  const [search, setSearch]             = useState('')
  const [dateRange, setDateRange]       = useState('today') // today | week | month | custom
  const [customFrom, setCustomFrom]     = useState(today())
  const [customTo, setCustomTo]         = useState(today())
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals
  const [showDayReport, setShowDayReport] = useState(false)

  const debouncedSearch = useDebounce(search, 400)

  const loadInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/billing/invoices', { params: { limit: 200, date: today() } })
      setInvoices(Array.isArray(r) ? r : [])
    } catch { setInvoices([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadInvoices() }, [loadInvoices])

  // Client-side filter
  const filtered = invoices.filter(inv => {
    // Search
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      const matchName = (inv.patient_name || '').toLowerCase().includes(q)
      const matchInv  = (inv.invoice_number || String(inv.id)).toLowerCase().includes(q)
      if (!matchName && !matchInv) return false
    }

    // Status
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false

    // Date
    const invDate = inv.created_at?.slice(0, 10) || ''
    if (!invDate) return true
    if (dateRange === 'today')  return invDate === today()
    if (dateRange === 'week')   return invDate >= weekStart()
    if (dateRange === 'month')  return invDate >= monthStart()
    if (dateRange === 'custom') return invDate >= customFrom && invDate <= customTo
    return true
  })

  const handleSelectInvoice = (inv) => {
    setSelectedInvoice(inv)
    setMobileView('detail')
  }

  const handleBack = () => {
    setMobileView('list')
  }

  return (
    <div className="flex h-full" style={{ minHeight: 0 }}>
      {/* ── LEFT PANEL ── */}
      <div className={`w-full lg:w-80 lg:flex-shrink-0 lg:border-r border-gray-200 flex flex-col bg-white ${mobileView === 'detail' ? 'hidden lg:flex' : 'flex'}`}>
        {/* Top bar */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 space-y-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="page-title flex-1">Billing</h1>
            <button onClick={() => setShowDayReport(true)} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
              <FileText size={13} />Day Report
            </button>
            <button onClick={loadInvoices} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
              <RefreshCw size={15} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="input pl-8 text-sm"
              placeholder="Search patient or invoice #…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Date filter */}
          <div className="flex flex-wrap gap-1">
            {[
              { key: 'today', label: 'Today' },
              { key: 'week',  label: 'Week' },
              { key: 'month', label: 'Month' },
              { key: 'custom', label: 'Custom' },
            ].map(d => (
              <button
                key={d.key}
                onClick={() => setDateRange(d.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${dateRange === d.key ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                style={dateRange === d.key ? { background: '#0F2557' } : {}}
              >
                {d.label}
              </button>
            ))}
          </div>

          {dateRange === 'custom' && (
            <div className="flex gap-2">
              <input type="date" className="input text-xs flex-1" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
              <input type="date" className="input text-xs flex-1" value={customTo}   onChange={e => setCustomTo(e.target.value)} />
            </div>
          )}

          {/* Status filter */}
          <div className="flex gap-1">
            {['all', 'pending', 'partial', 'paid'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${statusFilter === s ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                style={statusFilter === s ? { background: '#F5821E' } : {}}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Invoice list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <FileText size={32} className="empty-state-icon" />
              <p className="empty-state-text">{invoices.length === 0 ? 'No invoices found' : 'No results match your filters'}</p>
            </div>
          ) : filtered.map(inv => {
            const balance = Math.max(0, (+inv.total_amount || 0) - (+inv.amount_paid || 0))
            const isSelected = selectedInvoice?.id === inv.id
            return (
              <div
                key={inv.id}
                onClick={() => handleSelectInvoice(inv)}
                className={`px-4 py-3 cursor-pointer border-b border-gray-50 transition-colors ${isSelected ? 'bg-blue-50 border-l-2' : 'hover:bg-gray-50 border-l-2 border-l-transparent'}`}
                style={isSelected ? { borderLeftColor: '#0F2557' } : {}}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-900 truncate">{inv.patient_name || 'Unknown'}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      #{inv.invoice_number || inv.id} &nbsp;·&nbsp; {fmtDate(inv.created_at)}
                    </div>
                  </div>
                  <span className={`badge ${statusChip(inv.status)} capitalize flex-shrink-0`}>{inv.status}</span>
                </div>
                <div className="flex items-center justify-between mt-1.5 text-xs">
                  <span className="text-gray-500">Total <span className="font-semibold text-gray-700">{fmt(inv.total_amount)}</span></span>
                  {balance > 0 ? (
                    <span className="text-red-600 font-semibold">Bal {fmt(balance)}</span>
                  ) : (
                    <span className="text-green-600 font-medium flex items-center gap-1"><CheckCircle size={10} />Cleared</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* List footer count */}
        <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400 flex-shrink-0">
          {filtered.length} invoice{filtered.length !== 1 ? 's' : ''} shown
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className={`flex-1 flex flex-col bg-gray-50 min-h-0 ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'}`}>
        {selectedInvoice ? (
          <BillingDetail
            key={selectedInvoice.id}
            invoice={selectedInvoice}
            onBack={handleBack}
            onReloadList={loadInvoices}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
            <CreditCard size={48} className="mb-3 opacity-20" />
            <p className="font-medium text-gray-500">Select a patient to view billing details</p>
            <p className="text-sm mt-1 text-gray-400">Choose an invoice from the list on the left</p>
          </div>
        )}
      </div>

      {/* Day Report Modal */}
      {showDayReport && (
        <DayReportModal invoices={invoices} onClose={() => setShowDayReport(false)} />
      )}
    </div>
  )
}
