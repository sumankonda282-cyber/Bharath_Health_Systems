import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import {
  ArrowLeft, Plus, Trash2, Edit2, Check, X, ChevronDown,
  Loader2, AlertCircle, CheckCircle, Info, CreditCard,
  Banknote, Smartphone, Building2, FileText, Shield,
} from 'lucide-react'

// ─── Govt Scheme Data ─────────────────────────────────────────────────────────

const SCHEME_CATEGORIES = [
  { value: 'central_govt',  label: 'Central Government' },
  { value: 'state_govt',    label: 'State Government' },
  { value: 'esic',          label: 'ESIC (Employee State Insurance)' },
  { value: 'cghs',          label: 'CGHS (Central Govt Employees)' },
  { value: 'echs',          label: 'ECHS (Defence Veterans)' },
  { value: 'private',       label: 'Private Insurance' },
  { value: 'other',         label: 'Other' },
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
    'MA Vatsalya Yojana (Gujarat)',
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
  esic:  ['ESIC'],
  cghs:  ['CGHS'],
  echs:  ['ECHS'],
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

const ITEM_TYPES = ['consultation', 'procedure', 'medicine', 'lab', 'imaging', 'bed', 'service', 'other']
const PAYMENT_METHODS = [
  { value: 'cash',         label: 'Cash',          icon: Banknote },
  { value: 'upi',          label: 'UPI',           icon: Smartphone },
  { value: 'card',         label: 'Card',          icon: CreditCard },
  { value: 'cheque',       label: 'Cheque',        icon: FileText },
  { value: 'neft',         label: 'NEFT / RTGS',   icon: Building2 },
  { value: 'govt_scheme',  label: 'Govt Scheme',   icon: Shield },
  { value: 'insurance',    label: 'Insurance',     icon: Shield },
  { value: 'other',        label: 'Other',         icon: CreditCard },
]
const WAIVER_REASONS = [
  'Financial Hardship',
  'Doctor\'s Request',
  'Billing Error',
  'Staff / VIP',
  'Repeat Visit',
  'Charity / NGO',
  'Other',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = n => `₹${(+n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

function Toast({ msg, type = 'success', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
      {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {msg}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PatientBilling() {
  const { appointmentId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('charges')
  const [toast, setToast] = useState(null)
  const [saving, setSaving] = useState(false)

  // Add item form
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItem, setNewItem] = useState({ description: '', item_type: 'consultation', quantity: 1, unit_price: '', discount_amount: 0, gst_rate: 0 })
  const [editItemId, setEditItemId] = useState(null)

  // Waiver form
  const [showWaiver, setShowWaiver] = useState(false)
  const [waiverForm, setWaiverForm] = useState({ waiver_amount: '', reason: '', notes: '' })

  // Payment form
  const [showPayment, setShowPayment] = useState(false)
  const [payForm, setPayForm] = useState({ amount: '', method: 'cash', reference: '', notes: '' })

  // Insurance claim form
  const [showClaim, setShowClaim] = useState(false)
  const [claimForm, setClaimForm] = useState({
    scheme_category: 'central_govt', scheme_name: '', card_number: '',
    policy_holder_name: '', tpa_name: '', pre_auth_amount: '', pre_auth_ref: '',
    pre_auth_status: '', pre_auth_notes: '', claim_ref: '', claimed_amount: '',
    approved_amount: '', claim_status: 'draft', claim_notes: '',
  })
  const [editClaimId, setEditClaimId] = useState(null)

  const notify = (msg, type = 'success') => setToast({ msg, type })

  const load = useCallback(() => {
    setLoading(true)
    api.get(`/clinic/billing/appointment/${appointmentId}`)
      .then(r => setData(r))
      .catch(() => notify('Failed to load billing data', 'error'))
      .finally(() => setLoading(false))
  }, [appointmentId])

  useEffect(() => { load() }, [load])

  const ensureInvoice = async () => {
    if (data?.invoice) return data.invoice.id
    const r = await api.post(`/clinic/billing/appointment/${appointmentId}/invoice`)
    await load()
    return r.id
  }

  // ── Charges ──

  const saveItem = async () => {
    if (!newItem.description || !newItem.unit_price) return notify('Description and price required', 'error')
    setSaving(true)
    try {
      const invId = await ensureInvoice()
      if (editItemId) {
        await api.put(`/clinic/billing/invoice/${invId}/items/${editItemId}`, newItem)
      } else {
        await api.post(`/clinic/billing/invoice/${invId}/items`, newItem)
      }
      setShowAddItem(false); setEditItemId(null)
      setNewItem({ description: '', item_type: 'consultation', quantity: 1, unit_price: '', discount_amount: 0, gst_rate: 0 })
      load(); notify('Item saved')
    } catch (e) { notify(e.message || 'Error saving item', 'error') }
    finally { setSaving(false) }
  }

  const deleteItem = async (itemId) => {
    if (!data?.invoice) return
    setSaving(true)
    try {
      await api.delete(`/clinic/billing/invoice/${data.invoice.id}/items/${itemId}`)
      load(); notify('Item removed')
    } catch { notify('Error', 'error') }
    finally { setSaving(false) }
  }

  const approveOverride = async (id, action) => {
    setSaving(true)
    try {
      await api.put(`/clinic/billing/override-requests/${id}`, { action })
      load(); notify(action === 'approve' ? 'Charges added to invoice' : 'Request rejected')
    } catch { notify('Error', 'error') }
    finally { setSaving(false) }
  }

  // ── Waiver ──

  const applyWaiver = async () => {
    if (!waiverForm.waiver_amount || !waiverForm.reason) return notify('Amount and reason required', 'error')
    setSaving(true)
    try {
      const invId = await ensureInvoice()
      await api.post(`/clinic/billing/invoice/${invId}/waiver`, waiverForm)
      setShowWaiver(false); setWaiverForm({ waiver_amount: '', reason: '', notes: '' })
      load(); notify('Waiver applied')
    } catch (e) { notify(e.message || 'Error', 'error') }
    finally { setSaving(false) }
  }

  // ── Payments ──

  const addPayment = async () => {
    if (!payForm.amount) return notify('Amount required', 'error')
    setSaving(true)
    try {
      const invId = await ensureInvoice()
      await api.post(`/clinic/billing/invoice/${invId}/payment`, payForm)
      setShowPayment(false); setPayForm({ amount: '', method: 'cash', reference: '', notes: '' })
      load(); notify('Payment recorded')
    } catch (e) { notify(e.message || 'Error', 'error') }
    finally { setSaving(false) }
  }

  // ── Claims ──

  const saveClaim = async () => {
    if (!claimForm.scheme_name) return notify('Scheme name required', 'error')
    setSaving(true)
    try {
      if (editClaimId) {
        await api.put(`/clinic/billing/insurance-claim/${editClaimId}`, claimForm)
        notify('Claim updated')
      } else {
        await api.post('/clinic/billing/insurance-claim', {
          ...claimForm,
          appointment_id: parseInt(appointmentId),
          patient_id: data?.patient?.id,
          invoice_id: data?.invoice?.id,
        })
        notify('Claim created')
      }
      setShowClaim(false); setEditClaimId(null)
      setClaimForm({ scheme_category: 'central_govt', scheme_name: '', card_number: '', policy_holder_name: '', tpa_name: '', pre_auth_amount: '', pre_auth_ref: '', pre_auth_status: '', pre_auth_notes: '', claim_ref: '', claimed_amount: '', approved_amount: '', claim_status: 'draft', claim_notes: '' })
      load()
    } catch (e) { notify(e.message || 'Error', 'error') }
    finally { setSaving(false) }
  }

  const openEditClaim = (c) => {
    setClaimForm({
      scheme_category: c.scheme_category || 'central_govt',
      scheme_name: c.scheme_name || '',
      card_number: c.card_number || '',
      policy_holder_name: c.policy_holder_name || '',
      tpa_name: c.tpa_name || '',
      pre_auth_amount: c.pre_auth_amount || '',
      pre_auth_ref: c.pre_auth_ref || '',
      pre_auth_status: c.pre_auth_status || '',
      pre_auth_notes: c.pre_auth_notes || '',
      claim_ref: c.claim_ref || '',
      claimed_amount: c.claimed_amount || '',
      approved_amount: c.approved_amount || '',
      claim_status: c.claim_status || 'draft',
      claim_notes: c.claim_notes || '',
    })
    setEditClaimId(c.id)
    setShowClaim(true)
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-gray-400" /></div>
  if (!data) return <div className="p-8 text-center text-red-500">Failed to load</div>

  const { appointment, patient, doctor, invoice, items, waivers, payments, claims, overrides } = data
  const schemeCoverage = claims.reduce((s, c) => s + (c.approved_amount || 0), 0)
  const balance = invoice ? Math.max(0, invoice.total - invoice.amount_paid) : 0
  const pendingOverrides = overrides.filter(o => o.status === 'pending')

  return (
    <div className="pb-32">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <button onClick={() => navigate('/operations')} className="mt-0.5 text-gray-400 hover:text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">{patient?.full_name || 'Unknown Patient'}</h1>
            {patient?.bh_id && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-mono">{patient.bh_id}</span>}
            {invoice?.status && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${invoice.status === 'paid' ? 'bg-green-100 text-green-700' : invoice.status === 'partial' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>
                {invoice.status}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
            <span>{appointment.date} {appointment.time && `at ${appointment.time}`}</span>
            {doctor?.name && <span>Dr. {doctor.name}{doctor.specialty ? ` — ${doctor.specialty}` : ''}</span>}
            {appointment.visit_type && <span className="capitalize">{appointment.visit_type.replace(/_/g,' ')}</span>}
            {patient?.mobile && <span>{patient.mobile}</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {[
          { key: 'charges', label: 'Charges' + (pendingOverrides.length ? ` (${pendingOverrides.length} pending)` : '') },
          { key: 'schemes', label: 'Schemes & Insurance' + (claims.length ? ` (${claims.length})` : '') },
          { key: 'payments', label: 'Payments' + (payments.length ? ` (${payments.length})` : '') },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.key ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CHARGES TAB ── */}
      {tab === 'charges' && (
        <div className="space-y-4">
          {/* Pending override requests */}
          {pendingOverrides.length > 0 && (
            <div className="card border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={16} className="text-amber-600" />
                <span className="font-semibold text-amber-800 text-sm">{pendingOverrides.length} Pending Charge Request{pendingOverrides.length > 1 ? 's' : ''}</span>
              </div>
              {pendingOverrides.map(o => (
                <div key={o.id} className="bg-white rounded-xl p-3 mb-2 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium capitalize text-gray-800">{o.from_module} — {fmt(o.total_amount)}</div>
                    {o.notes && <div className="text-xs text-gray-500 mt-0.5">{o.notes}</div>}
                    {o.items?.map((it, i) => (
                      <div key={i} className="text-xs text-gray-400 mt-0.5">{it.description} × {it.quantity} @ ₹{it.unit_price}</div>
                    ))}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => approveOverride(o.id, 'approve')}
                      className="btn-primary text-xs py-1 px-3">Approve</button>
                    <button onClick={() => approveOverride(o.id, 'reject')}
                      className="btn-secondary text-xs py-1 px-3">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Line items */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="font-semibold text-gray-800 text-sm">Line Items</span>
              <button onClick={() => { setEditItemId(null); setNewItem({ description: '', item_type: 'consultation', quantity: 1, unit_price: '', discount_amount: 0, gst_rate: 0 }); setShowAddItem(true) }}
                className="btn-primary text-xs py-1 px-3 flex items-center gap-1">
                <Plus size={13} />Add Item
              </button>
            </div>

            {items.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No items yet — add charges above</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th className="th">Description</th>
                    <th className="th">Type</th>
                    <th className="th text-right">Qty</th>
                    <th className="th text-right">Rate</th>
                    <th className="th text-right">Discount</th>
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
                      <td className="td text-right text-sm">₹{it.unit_price.toLocaleString('en-IN')}</td>
                      <td className="td text-right text-sm text-red-500">{it.discount_amount > 0 ? `-₹${it.discount_amount}` : '—'}</td>
                      <td className="td text-right text-xs text-gray-400">{it.gst_rate > 0 ? `${it.gst_rate}%` : '—'}</td>
                      <td className="td text-right font-semibold text-sm">₹{it.total.toLocaleString('en-IN')}</td>
                      <td className="td">
                        <div className="flex gap-1">
                          <button onClick={() => { setNewItem({ description: it.description, item_type: it.item_type, quantity: it.quantity, unit_price: it.unit_price, discount_amount: it.discount_amount, gst_rate: it.gst_rate }); setEditItemId(it.id); setShowAddItem(true) }}
                            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Edit2 size={13} /></button>
                          <button onClick={() => deleteItem(it.id)}
                            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Waivers */}
          {waivers.length > 0 && (
            <div className="card p-4">
              <div className="text-sm font-semibold text-gray-700 mb-2">Waivers Applied</div>
              {waivers.map(w => (
                <div key={w.id} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                  <div>
                    <span className="text-red-600 font-medium">-{fmt(w.waiver_amount)}</span>
                    <span className="text-gray-500 ml-2">{w.reason}</span>
                    {w.notes && <span className="text-gray-400 ml-1">— {w.notes}</span>}
                  </div>
                  <span className="text-xs text-gray-400">{w.created_at?.slice(0, 10)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Apply waiver button */}
          {invoice && (
            <button onClick={() => setShowWaiver(true)} className="btn-secondary text-sm">
              Apply Waiver / Discount
            </button>
          )}
        </div>
      )}

      {/* ── SCHEMES & INSURANCE TAB ── */}
      {tab === 'schemes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Government schemes, state health cards, private insurance, ESIC, CGHS, ECHS</p>
            <button onClick={() => { setEditClaimId(null); setShowClaim(true) }}
              className="btn-primary text-sm flex items-center gap-1">
              <Plus size={14} />Add Scheme / Claim
            </button>
          </div>

          {claims.length === 0 ? (
            <div className="card p-8 text-center text-gray-400 text-sm">No insurance or scheme claims added</div>
          ) : claims.map(c => (
            <div key={c.id} className="card p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-gray-900">{c.scheme_name}</div>
                  <div className="text-xs text-gray-500 mt-0.5 capitalize">{c.scheme_category.replace(/_/g,' ')}
                    {c.tpa_name && ` — TPA: ${c.tpa_name}`}
                  </div>
                </div>
                <button onClick={() => openEditClaim(c)} className="btn-secondary text-xs py-1 px-2">Edit</button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {c.card_number && <div><span className="text-gray-500">Card / Policy #:</span> <span className="font-mono">{c.card_number}</span></div>}
                {c.policy_holder_name && <div><span className="text-gray-500">Holder:</span> {c.policy_holder_name}</div>}
              </div>
              {/* Pre-auth section */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Pre-Authorization</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                  <div><span className="text-gray-500">Amount Est.:</span> <span className="font-medium">{c.pre_auth_amount ? fmt(c.pre_auth_amount) : '—'}</span></div>
                  <div><span className="text-gray-500">Ref #:</span> {c.pre_auth_ref || '—'}</div>
                  <div><span className="text-gray-500">Status:</span>
                    <span className={`ml-1 capitalize font-medium ${c.pre_auth_status === 'approved' ? 'text-green-600' : c.pre_auth_status === 'rejected' ? 'text-red-600' : 'text-amber-600'}`}>
                      {c.pre_auth_status || 'Not submitted'}
                    </span>
                  </div>
                </div>
                {c.pre_auth_notes && <div className="text-xs text-gray-400 mt-1">{c.pre_auth_notes}</div>}
              </div>
              {/* Claim section */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Final Claim</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                  <div><span className="text-gray-500">Claimed:</span> <span className="font-medium">{c.claimed_amount ? fmt(c.claimed_amount) : '—'}</span></div>
                  <div><span className="text-gray-500">Approved:</span> <span className="font-medium text-green-600">{c.approved_amount ? fmt(c.approved_amount) : '—'}</span></div>
                  <div><span className="text-gray-500">Ref #:</span> {c.claim_ref || '—'}</div>
                  <div><span className="text-gray-500">Status:</span>
                    <span className={`ml-1 capitalize font-medium ${c.claim_status === 'approved' || c.claim_status === 'paid' ? 'text-green-600' : c.claim_status === 'rejected' ? 'text-red-600' : c.claim_status === 'submitted' ? 'text-blue-600' : 'text-gray-500'}`}>
                      {c.claim_status}
                    </span>
                  </div>
                </div>
                {c.claim_notes && <div className="text-xs text-gray-400 mt-1">{c.claim_notes}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PAYMENTS TAB ── */}
      {tab === 'payments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Multiple payment methods allowed per invoice</p>
            <button onClick={() => { setPayForm({ amount: balance > 0 ? balance.toFixed(2) : '', method: 'cash', reference: '', notes: '' }); setShowPayment(true) }}
              className="btn-primary text-sm flex items-center gap-1">
              <Plus size={14} />Add Payment
            </button>
          </div>

          {payments.length === 0 ? (
            <div className="card p-8 text-center text-gray-400 text-sm">No payments recorded yet</div>
          ) : (
            <div className="card overflow-hidden">
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
                      <td className="td font-medium capitalize">{p.method.replace(/_/g,' ')}</td>
                      <td className="td text-right font-semibold text-green-700">{fmt(p.amount)}</td>
                      <td className="td text-sm text-gray-500 font-mono">{p.reference || '—'}</td>
                      <td className="td text-xs text-gray-400">{p.received_at?.slice(0,16).replace('T',' ')}</td>
                      <td className="td text-sm text-gray-500">{p.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Sticky summary bar ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-30" style={{ paddingLeft: '15rem' }}>
        <div className="max-w-full px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <span><span className="text-gray-500">Subtotal</span> <span className="font-semibold">{fmt(invoice?.subtotal || 0)}</span></span>
            {(invoice?.discount || 0) > 0 && <span><span className="text-gray-500">Waiver</span> <span className="font-semibold text-red-500">-{fmt(invoice.discount)}</span></span>}
            {(invoice?.gst_amount || 0) > 0 && <span><span className="text-gray-500">GST</span> <span className="font-semibold">{fmt(invoice.gst_amount)}</span></span>}
            {schemeCoverage > 0 && <span><span className="text-gray-500">Scheme</span> <span className="font-semibold text-blue-600">-{fmt(schemeCoverage)}</span></span>}
            <span><span className="text-gray-500">Total</span> <span className="font-bold text-lg" style={{ color: '#0F2557' }}>{fmt(invoice?.total || 0)}</span></span>
            {(invoice?.amount_paid || 0) > 0 && <span><span className="text-gray-500">Collected</span> <span className="font-semibold text-green-600">{fmt(invoice.amount_paid)}</span></span>}
          </div>
          <div className="flex gap-2 items-center">
            {balance > 0 && (
              <span className="text-sm font-bold text-red-600">Balance {fmt(balance)}</span>
            )}
            {invoice?.status === 'paid' && (
              <span className="text-sm font-bold text-green-600 flex items-center gap-1"><CheckCircle size={14} />Paid in Full</span>
            )}
            {invoice && balance > 0 && (
              <button onClick={() => { setPayForm({ amount: balance.toFixed(2), method: 'cash', reference: '', notes: '' }); setShowPayment(true); setTab('payments') }}
                className="btn-primary text-sm">
                Collect Payment
              </button>
            )}
            {invoice && (
              <button onClick={() => { setShowWaiver(true); setTab('charges') }}
                className="btn-secondary text-sm">
                Waiver
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Add Item Modal ── */}
      {showAddItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between mb-4">
              <h3 className="font-bold text-gray-800">{editItemId ? 'Edit Item' : 'Add Item'}</h3>
              <button onClick={() => setShowAddItem(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Description *</label>
                <input className="input" value={newItem.description} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))} placeholder="e.g. Consultation, X-Ray" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={newItem.item_type} onChange={e => setNewItem(p => ({ ...p, item_type: e.target.value }))}>
                    {ITEM_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Quantity</label>
                  <input type="number" className="input" min={1} value={newItem.quantity} onChange={e => setNewItem(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Unit Price (₹) *</label>
                  <input type="number" className="input" value={newItem.unit_price} onChange={e => setNewItem(p => ({ ...p, unit_price: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <label className="label">Discount (₹)</label>
                  <input type="number" className="input" value={newItem.discount_amount} onChange={e => setNewItem(p => ({ ...p, discount_amount: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <label className="label">GST (%)</label>
                  <input type="number" className="input" value={newItem.gst_rate} onChange={e => setNewItem(p => ({ ...p, gst_rate: e.target.value }))} placeholder="0" />
                </div>
              </div>
              {newItem.unit_price && (
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600">
                  Total ≈ {fmt(((+newItem.unit_price * (newItem.quantity || 1)) - (+newItem.discount_amount || 0)) * (1 + (+newItem.gst_rate || 0) / 100))}
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={saveItem} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {editItemId ? 'Update' : 'Add Item'}
              </button>
              <button onClick={() => setShowAddItem(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Waiver Modal ── */}
      {showWaiver && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between mb-4">
              <h3 className="font-bold text-gray-800">Apply Waiver / Discount</h3>
              <button onClick={() => setShowWaiver(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Waiver Amount (₹) *</label>
                <input type="number" className="input" value={waiverForm.waiver_amount} onChange={e => setWaiverForm(p => ({ ...p, waiver_amount: e.target.value }))} placeholder="Enter amount" />
              </div>
              <div>
                <label className="label">Reason *</label>
                <select className="input" value={waiverForm.reason} onChange={e => setWaiverForm(p => ({ ...p, reason: e.target.value }))}>
                  <option value="">Select reason</option>
                  {WAIVER_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Notes (optional)</label>
                <textarea className="input" rows={2} value={waiverForm.notes} onChange={e => setWaiverForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any additional notes" />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                Waivers are logged with your name and cannot be reversed. New total: {fmt(Math.max(0, (invoice?.total || 0) - (+waiverForm.waiver_amount || 0)))}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={applyWaiver} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? <Loader2 size={14} className="animate-spin" /> : null} Apply Waiver
              </button>
              <button onClick={() => setShowWaiver(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Payment Modal ── */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between mb-4">
              <h3 className="font-bold text-gray-800">Record Payment</h3>
              <button onClick={() => setShowPayment(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Amount (₹) *</label>
                <input type="number" className="input" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} placeholder="Enter amount" />
              </div>
              <div>
                <label className="label">Payment Method *</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.value} onClick={() => setPayForm(p => ({ ...p, method: m.value }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${payForm.method === m.value ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      <m.icon size={14} />{m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Reference (UPI txn ID / card last 4 / cheque no)</label>
                <input className="input" value={payForm.reference} onChange={e => setPayForm(p => ({ ...p, reference: e.target.value }))} placeholder="Optional" />
              </div>
              <div>
                <label className="label">Notes</label>
                <input className="input" value={payForm.notes} onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={addPayment} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Record Payment
              </button>
              <button onClick={() => setShowPayment(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Insurance Claim Modal ── */}
      {showClaim && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h3 className="font-bold text-gray-800">{editClaimId ? 'Update Claim' : 'Add Scheme / Insurance Claim'}</h3>
              <button onClick={() => setShowClaim(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Scheme Category *</label>
                <select className="input" value={claimForm.scheme_category} onChange={e => setClaimForm(p => ({ ...p, scheme_category: e.target.value, scheme_name: '' }))}>
                  {SCHEME_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Scheme / Insurance Name *</label>
                <select className="input mb-1" value={COMMON_SCHEMES[claimForm.scheme_category]?.includes(claimForm.scheme_name) ? claimForm.scheme_name : '__custom'}
                  onChange={e => { if (e.target.value !== '__custom') setClaimForm(p => ({ ...p, scheme_name: e.target.value })) }}>
                  <option value="__custom">— Type custom name —</option>
                  {(COMMON_SCHEMES[claimForm.scheme_category] || []).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input className="input text-sm" value={claimForm.scheme_name} onChange={e => setClaimForm(p => ({ ...p, scheme_name: e.target.value }))} placeholder="Or type scheme name directly…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Card / Policy Number</label>
                  <input className="input font-mono text-sm" value={claimForm.card_number} onChange={e => setClaimForm(p => ({ ...p, card_number: e.target.value }))} placeholder="Beneficiary card / policy #" />
                </div>
                <div>
                  <label className="label">Policy Holder Name</label>
                  <input className="input text-sm" value={claimForm.policy_holder_name} onChange={e => setClaimForm(p => ({ ...p, policy_holder_name: e.target.value }))} placeholder="If different from patient" />
                </div>
              </div>
              {claimForm.scheme_category === 'private' && (
                <div>
                  <label className="label">TPA Name</label>
                  <input className="input text-sm" value={claimForm.tpa_name} onChange={e => setClaimForm(p => ({ ...p, tpa_name: e.target.value }))} placeholder="e.g. Medi Assist, Raksha TPA" />
                </div>
              )}

              <div className="border-t border-gray-100 pt-3">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Pre-Authorization (for ongoing treatment)</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Estimated Amount (₹)</label>
                    <input type="number" className="input text-sm" value={claimForm.pre_auth_amount} onChange={e => setClaimForm(p => ({ ...p, pre_auth_amount: e.target.value }))} placeholder="Treatment estimate" />
                  </div>
                  <div>
                    <label className="label">Pre-Auth Ref #</label>
                    <input className="input text-sm" value={claimForm.pre_auth_ref} onChange={e => setClaimForm(p => ({ ...p, pre_auth_ref: e.target.value }))} placeholder="Govt / TPA reference" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="label">Pre-Auth Status</label>
                    <select className="input text-sm" value={claimForm.pre_auth_status} onChange={e => setClaimForm(p => ({ ...p, pre_auth_status: e.target.value }))}>
                      <option value="">Not Submitted</option>
                      <option value="pending">Submitted — Pending</option>
                      <option value="approved">Approved</option>
                      <option value="partial">Partially Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Pre-Auth Notes</label>
                    <input className="input text-sm" value={claimForm.pre_auth_notes} onChange={e => setClaimForm(p => ({ ...p, pre_auth_notes: e.target.value }))} placeholder="Conditions, limits" />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Final Claim Submission</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Claimed Amount (₹)</label>
                    <input type="number" className="input text-sm" value={claimForm.claimed_amount} onChange={e => setClaimForm(p => ({ ...p, claimed_amount: e.target.value }))} placeholder="Total claimed" />
                  </div>
                  <div>
                    <label className="label">Approved Amount (₹)</label>
                    <input type="number" className="input text-sm" value={claimForm.approved_amount} onChange={e => setClaimForm(p => ({ ...p, approved_amount: e.target.value }))} placeholder="Amount approved" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="label">Claim Ref #</label>
                    <input className="input text-sm" value={claimForm.claim_ref} onChange={e => setClaimForm(p => ({ ...p, claim_ref: e.target.value }))} placeholder="Claim reference number" />
                  </div>
                  <div>
                    <label className="label">Claim Status</label>
                    <select className="input text-sm" value={claimForm.claim_status} onChange={e => setClaimForm(p => ({ ...p, claim_status: e.target.value }))}>
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
                  <textarea className="input text-sm" rows={2} value={claimForm.claim_notes} onChange={e => setClaimForm(p => ({ ...p, claim_notes: e.target.value }))} placeholder="Any remarks, conditions, settlement notes" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={saveClaim} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {editClaimId ? 'Update Claim' : 'Save Claim'}
              </button>
              <button onClick={() => setShowClaim(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
