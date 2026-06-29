import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, CheckCircle2, AlertTriangle, CreditCard, Building2,
  Landmark, Sparkles, Clock, ShieldCheck, X,
} from 'lucide-react'
// Universal self-service plan & subscription panel — used by the staff portal
// (manager/receptionist) and the provider portal. The portal injects its own
// `api` client as a prop so this one component stays in sync everywhere.

const NAVY = '#0F2557'
const MODULE_LABELS = {
  provider: 'Provider', reception: 'Reception', pharmacy: 'Pharmacy', lab: 'Lab',
  imaging: 'Imaging', carechart: 'CareChart', telehealth: 'Telehealth',
}
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')

const STATUS_META = {
  active:    { label: 'Active',     cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  comped:    { label: 'Free (comp)', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  grace:     { label: 'Grace period', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  expired:   { label: 'Expired',    cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  suspended: { label: 'Suspended',  cls: 'bg-rose-50 text-rose-700 border-rose-200' },
}

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

function planPrice(plan, cycle, seats) {
  const base = cycle === 'annual' ? plan.annual_price : plan.monthly_price
  const per = cycle === 'annual' ? plan.annual_price_per_seat : plan.monthly_price_per_seat
  return Number(base || 0) + Number(per || 0) * Number(seats || 0)
}

export default function SubscriptionBilling({ api }) {
  const [me, setMe] = useState(null)
  const [plans, setPlans] = useState([])
  const [config, setConfig] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [cycle, setCycle] = useState('monthly')
  const [busyKey, setBusyKey] = useState(null)
  const [bank, setBank] = useState(null)   // { invoice_id, plan }
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    setErr('')
    try {
      const [m, p, c, inv] = await Promise.all([
        api.get('/payments/subscription/me'),
        api.get('/payments/plans'),
        api.get('/payments/config'),
        api.get('/payments/subscription/invoices'),
      ])
      setMe(m); setPlans(p || []); setConfig(c); setInvoices(inv || [])
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Could not load billing. You may not have billing access.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const seats = me?.active_doctors || 0
  const ent = me?.entitlements
  const sm = STATUS_META[ent?.status] || STATUS_META.active
  const currentKey = ent?.plan_key

  const startCheckout = async (plan) => {
    setBusyKey(plan.key); setErr('')
    try {
      const order = await api.post('/payments/subscription/order', { plan_key: plan.key, billing_cycle: cycle })
      if (order.online_enabled) {
        const ok = await loadRazorpay()
        if (!ok) { setErr('Could not load the payment window. Please try bank transfer.'); return }
        const rzp = new window.Razorpay({
          key: order.key_id,
          order_id: order.order_id,
          amount: order.amount_paise,
          currency: order.currency,
          name: order.prefill?.name || 'Subscription',
          description: `${plan.name} · ${cycle}`,
          prefill: { email: order.prefill?.email || '' },
          theme: { color: NAVY },
          handler: async (resp) => {
            try {
              await api.post('/payments/subscription/verify', {
                invoice_id: order.invoice_id,
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              })
              setToast('Payment successful — your plan is active.')
              load()
            } catch {
              setErr('Payment captured but activation failed. It will reconcile shortly, or contact support.')
            }
          },
        })
        rzp.open()
      } else {
        // Razorpay not enabled → bank transfer for this freshly created invoice
        setBank({ invoice_id: order.invoice_id, plan, amount: order.amount })
      }
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Could not start checkout.')
    } finally {
      setBusyKey(null)
    }
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-blue-500" /></div>
  }
  if (err && !me) {
    return <div className="p-6"><div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5"><AlertTriangle size={15} /> {err}</div></div>
  }

  const lapsed = ent && ['expired', 'suspended'].includes(ent.status)
  const maxDoctors = ent?.limits?.max_doctors

  return (
    <div className="p-5 space-y-5">
      {toast && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          <CheckCircle2 size={15} /> {toast}
        </div>
      )}
      {err && <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2"><AlertTriangle size={15} /> {err}</div>}

      {/* Current plan */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between" style={{ background: NAVY }}>
          <div className="flex items-center gap-2 text-white">
            <Building2 size={16} />
            <span className="font-semibold text-sm">{me?.clinic_name || 'Your health center'}</span>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${sm.cls}`}>{sm.label}</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-gray-400">Current plan</p>
              <p className="text-lg font-bold text-gray-900 capitalize">{currentKey || 'None'}</p>
            </div>
            {ent?.expires_at && (
              <div className="text-right">
                <p className="text-xs text-gray-400 flex items-center gap-1 justify-end"><Clock size={11} /> {ent.status === 'comped' ? 'Free until' : 'Renews / expires'}</p>
                <p className="text-sm font-semibold text-gray-700">{ent.expires_at}</p>
              </div>
            )}
          </div>

          {/* Usage */}
          {maxDoctors ? (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Doctors</span><span>{seats}{maxDoctors >= 999 ? '' : ` / ${maxDoctors}`}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: maxDoctors >= 999 ? '20%' : `${Math.min(100, (seats / maxDoctors) * 100)}%` }} />
              </div>
            </div>
          ) : null}

          {/* Enabled apps */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {Object.entries(ent?.modules || {}).map(([k, v]) => (
              <span key={k} className={`text-[11px] px-2 py-0.5 rounded-full border ${v ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-400 border-gray-200 line-through'}`}>
                {MODULE_LABELS[k] || k}
              </span>
            ))}
          </div>
        </div>
      </div>

      {lapsed && (
        <div className="flex items-start gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5">
          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
          <span>Your subscription has {ent.status === 'suspended' ? 'been suspended' : 'expired'}. Choose a plan below to restore full access.</span>
        </div>
      )}

      {/* Cycle toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700">{currentKey ? 'Change plan' : 'Choose a plan'}</h3>
        <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
          {['monthly', 'annual'].map(c => (
            <button key={c} onClick={() => setCycle(c)}
              className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition ${cycle === c ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>{c}</button>
          ))}
        </div>
      </div>

      {/* Plans */}
      <div className="grid gap-3">
        {plans.length === 0 && <p className="text-sm text-gray-400">No plans are available yet.</p>}
        {plans.map(plan => {
          const isCurrent = plan.key === currentKey && !lapsed
          const price = planPrice(plan, cycle, seats)
          return (
            <div key={plan.key} className={`rounded-xl border p-4 ${isCurrent ? 'border-blue-300 bg-blue-50/40' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: plan.color || NAVY }} />
                    <p className="font-bold text-gray-900">{plan.name}</p>
                    {isCurrent && <span className="text-[11px] font-semibold text-blue-600">Current</span>}
                  </div>
                  {plan.description && <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>}
                </div>
                <div className="text-right">
                  <p className="text-lg font-extrabold text-gray-900">{inr(price)}</p>
                  <p className="text-[11px] text-gray-400">/ {cycle === 'annual' ? 'year' : 'month'}{seats ? ` · ${seats} seats` : ''}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {Object.entries(plan.modules || {}).filter(([, v]) => v).map(([k]) => (
                  <span key={k} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{MODULE_LABELS[k] || k}</span>
                ))}
              </div>
              <button
                onClick={() => startCheckout(plan)}
                disabled={isCurrent || busyKey === plan.key}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition"
                style={{ background: isCurrent ? '#94a3b8' : NAVY }}>
                {busyKey === plan.key ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                {isCurrent ? 'Current plan' : currentKey ? 'Switch to this plan' : 'Subscribe'}
              </button>
            </div>
          )
        })}
      </div>

      {config && !config.online_enabled && (
        <p className="text-xs text-gray-400 flex items-center gap-1.5"><Landmark size={12} /> Online card/UPI payment isn't enabled yet — you'll be guided to pay by bank transfer.</p>
      )}

      {/* Invoices */}
      {invoices.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-2">Recent invoices</h3>
          <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
            {invoices.slice(0, 6).map(i => (
              <div key={i.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-gray-800 capitalize">{i.plan_key} · {i.billing_cycle}</p>
                  <p className="text-xs text-gray-400">{i.created_at?.slice(0, 10)} · {i.method || '—'}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{inr(i.amount)}</p>
                  <p className={`text-[11px] font-medium ${i.status === 'paid' ? 'text-emerald-600' : i.status === 'pending_verification' ? 'text-amber-600' : 'text-gray-400'}`}>{i.status?.replace(/_/g, ' ')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] text-gray-400 flex items-center gap-1.5 pt-1"><ShieldCheck size={12} /> Payments are processed securely. Your clinical data is never affected by billing changes.</p>

      {bank && <BankTransferModal api={api} bank={bank} onClose={() => setBank(null)} onDone={() => { setBank(null); setToast('Bank reference submitted — access activates after confirmation.'); load() }} />}
    </div>
  )
}

function BankTransferModal({ api, bank, onClose, onDone }) {
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
    if (!reference.trim()) { setErr('Enter the transaction reference / UTR'); return }
    setSaving(true); setErr('')
    try {
      await api.post('/payments/subscription/bank-transfer', { invoice_id: bank.invoice_id, reference, notes })
      onDone()
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Could not submit reference')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2"><Landmark size={16} style={{ color: NAVY }} /><h3 className="font-bold text-sm" style={{ color: NAVY }}>Bank Transfer</h3></div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-500">Transfer {inr(bank.amount)} for the <span className="font-semibold capitalize">{bank.plan?.name}</span> plan, then enter the reference below. Access activates once the platform confirms it.</p>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Transaction Reference / UTR</label>
            <input value={reference} onChange={e => setReference(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="e.g. UTR2026..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes (optional)</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          {err && <p className="text-sm text-rose-600">{err}</p>}
          <button onClick={submit} disabled={saving} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: NAVY }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Submit reference
          </button>
        </div>
      </div>
    </div>
  )
}
