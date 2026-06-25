import { useState, useEffect, useMemo, useCallback } from 'react'
import api from '../api/client'
import {
  Search, X, Plus, Check, ChevronDown, ChevronRight, Building2,
  TrendingUp, Users, CreditCard, AlertTriangle, Clock, Edit2, Save,
  Wallet, Download, Activity, Calendar, Tag, Layers, RefreshCw,
  XCircle, CheckCircle2, ArrowLeft, Trash2, IndianRupee, Banknote,
  Package, Settings,
} from 'lucide-react'
import PlanBuilder from '../components/PlanBuilder'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtMoney(n) {
  if (n == null) return '—'
  return '₹' + Number(n).toLocaleString('en-IN')
}

function isExpiringSoon(dt) {
  if (!dt) return false
  const diff = new Date(dt) - new Date()
  return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000
}

function isOverdue(dt, subStatus) {
  if (subStatus === 'expired') return true
  if (!dt) return false
  return new Date(dt) < new Date()
}

function getPlanInfo(planKey, planConfig) {
  return planConfig?.plans?.[planKey] || { label: planKey, color: '#6B7280', price_per_doctor: 0, max_doctors: 2 }
}

function calcMonthlyBill(clinic, planConfig) {
  const plan = planConfig?.plans?.[clinic.plan]
  if (!plan) return 0
  return (clinic.doctor_count || 0) * (plan.price_per_doctor || 0)
}

function getActiveModules(clinic) {
  const mods = []
  if (clinic.has_pharmacy)   mods.push('Pharmacy')
  if (clinic.has_lab)        mods.push('Lab')
  if (clinic.has_imaging)    mods.push('Imaging')
  if (clinic.has_telehealth) mods.push('Telehealth')
  if (clinic.has_inpatient)  mods.push('Inpatient')
  return mods
}

// ── Toast ─────────────────────────────────────────────────────────────────────

let _tid = 0
function useToast() {
  const [toasts, setToasts] = useState([])
  const add = useCallback((msg, type = 'success') => {
    const id = ++_tid
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }, [])
  const dismiss = useCallback(id => setToasts(t => t.filter(x => x.id !== id)), [])
  return { toasts, add, dismiss }
}

function Toaster({ toasts, onDismiss }) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 max-w-sm">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border animate-in slide-in-from-right-4 ${
          t.type === 'error' ? 'bg-red-900 text-red-200 border-red-700'
          : t.type === 'warn' ? 'bg-orange-900 text-orange-200 border-orange-700'
          : 'bg-gray-800 text-emerald-300 border-gray-700'
        }`}>
          <span className="flex-1">{t.msg}</span>
          <button onClick={() => onDismiss(t.id)} className="opacity-60 hover:opacity-100 mt-0.5 shrink-0">
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, color = '#F5821E' }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + '1A' }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold text-white leading-none">{value}</div>
        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
        {sub && <div className="text-[10px] text-gray-600 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

function PlanBadge({ planKey, planConfig }) {
  const info = getPlanInfo(planKey, planConfig)
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
      style={{ background: info.color + '22', color: info.color, border: `1px solid ${info.color}44` }}>
      {info.label || planKey}
    </span>
  )
}

function StatusBadge({ status }) {
  const map = {
    active:    'bg-emerald-900/40 text-emerald-400 border-emerald-700/40',
    expired:   'bg-red-900/40 text-red-400 border-red-700/40',
    suspended: 'bg-orange-900/40 text-orange-400 border-orange-700/40',
    pending:   'bg-yellow-900/40 text-yellow-400 border-yellow-700/40',
    trial:     'bg-blue-900/40 text-blue-400 border-blue-700/40',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize border ${map[status] || 'bg-gray-700/40 text-gray-400 border-gray-600/40'}`}>
      {status}
    </span>
  )
}

function UsageBar({ label, used, max, color = '#F5821E' }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0
  const warn = pct >= 80
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-xs text-gray-500">{used}/{max === 999 ? '∞' : max}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: warn ? '#EF4444' : color }} />
      </div>
    </div>
  )
}

// ── Record Payment Modal ──────────────────────────────────────────────────────

function RecordPaymentModal({ clinic, planConfig, onClose, onSaved, addToast }) {
  const [form, setForm] = useState({
    amount: '', method: 'upi', reference: '', notes: '',
    period_from: '', period_to: '', activate: false,
  })
  const [saving, setSaving] = useState(false)
  const methods = ['upi', 'neft', 'imps', 'cash', 'cheque', 'bank_transfer', 'razorpay']

  async function submit(e) {
    e.preventDefault()
    if (!form.amount || parseFloat(form.amount) <= 0) {
      addToast('Enter a valid amount', 'error'); return
    }
    setSaving(true)
    try {
      await api.post(`/platform/clinics/${clinic.id}/payment`, {
        ...form,
        amount: parseFloat(form.amount),
      })
      addToast(`Payment of ₹${parseFloat(form.amount).toLocaleString('en-IN')} recorded for ${clinic.name}`)
      onSaved()
      onClose()
    } catch (err) {
      addToast(err?.message || 'Failed to record payment', 'error')
    } finally {
      setSaving(false)
    }
  }

  const bill = calcMonthlyBill(clinic, planConfig)
  return (
    <div className="fixed inset-0 bg-black/70 z-[55] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h3 className="text-base font-bold text-white">Record Payment</h3>
            <p className="text-xs text-gray-500 mt-0.5">{clinic.name} · Monthly bill: {fmtMoney(bill)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Amount (₹) *</label>
              <div className="relative">
                <IndianRupee size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="number" min="1" step="0.01" required value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder={bill || '0'}
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg pl-7 pr-3 py-2.5 outline-none focus:border-[#F5821E] transition-colors" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Payment Method *</label>
              <select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#F5821E] transition-colors capitalize">
                {methods.map(m => <option key={m} value={m} className="capitalize">{m.replace('_', ' ').toUpperCase()}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Reference / UTR / Cheque No.</label>
            <input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
              placeholder="Transaction ID, cheque number, etc."
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#F5821E] transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Period From</label>
              <input type="date" value={form.period_from} onChange={e => setForm(f => ({ ...f, period_from: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#F5821E] transition-colors" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Period To</label>
              <input type="date" value={form.period_to} onChange={e => setForm(f => ({ ...f, period_to: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#F5821E] transition-colors" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional internal notes"
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#F5821E] transition-colors resize-none h-16" />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${form.activate ? 'bg-[#F5821E] border-[#F5821E]' : 'border-gray-600 bg-gray-800'}`}
              onClick={() => setForm(f => ({ ...f, activate: !f.activate }))}>
              {form.activate && <Check size={10} className="text-white" />}
            </div>
            <span className="text-xs text-gray-300">Mark subscription as Active after recording</span>
          </label>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
              style={{ background: '#F5821E' }}>
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Banknote size={14} />}
              {saving ? 'Saving…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Change Plan Modal ─────────────────────────────────────────────────────────

function ChangePlanModal({ clinic, planConfig, onClose, onSaved, addToast }) {
  const [selected, setSelected] = useState(clinic.plan || 'free')
  const [saving, setSaving] = useState(false)
  const plans = Object.entries(planConfig?.plans || {})

  async function submit(e) {
    e.preventDefault()
    if (selected === clinic.plan) { onClose(); return }
    const selPlanConfig = planConfig?.plans?.[selected]
    if (selPlanConfig?.max_doctors && selPlanConfig.max_doctors < 999) {
      const doctorCount = clinic.doctor_count || 0
      if (doctorCount > selPlanConfig.max_doctors) {
        addToast(`Cannot downgrade: clinic has ${doctorCount} doctors, plan allows max ${selPlanConfig.max_doctors}`, 'error')
        return
      }
    }
    setSaving(true)
    try {
      await api.put(`/platform/clinics/${clinic.id}/plan`, { plan: selected })
      addToast(`Plan changed to ${planConfig?.plans?.[selected]?.label || selected} for ${clinic.name}`)
      onSaved()
      onClose()
    } catch (err) {
      addToast(err?.message || 'Failed to change plan', 'error')
    } finally {
      setSaving(false)
    }
  }

  const selPlan = planConfig?.plans?.[selected] || {}
  const currentBill = calcMonthlyBill(clinic, planConfig)
  const newBill = selPlan ? (clinic.doctor_count || 0) * (selPlan.price_per_doctor || 0) : 0

  return (
    <div className="fixed inset-0 bg-black/70 z-[55] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h3 className="text-base font-bold text-white">Change Plan</h3>
            <p className="text-xs text-gray-500 mt-0.5">{clinic.name} · {clinic.doctor_count} active doctors</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={submit} className="p-6">
          <div className="space-y-2 mb-5">
            {plans.map(([key, plan]) => (
              <label key={key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selected === key ? 'border-[#F5821E] bg-[#F5821E0D]' : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-600'}`}
                onClick={() => setSelected(key)}>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${selected === key ? 'border-[#F5821E]' : 'border-gray-600'}`}>
                  {selected === key && <div className="w-2 h-2 rounded-full bg-[#F5821E]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{plan.label || key}</span>
                    {key === clinic.plan && <span className="text-[10px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded-full">Current</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {plan.price_per_doctor > 0 ? `₹${plan.price_per_doctor}/doctor/month` : 'Free'}
                    {' · '}Max {plan.max_doctors >= 999 ? 'unlimited' : plan.max_doctors} doctors
                  </div>
                </div>
                <div className="text-xs font-semibold text-right shrink-0" style={{ color: plan.color || '#F5821E' }}>
                  {plan.price_per_doctor > 0 ? `₹${((clinic.doctor_count || 0) * plan.price_per_doctor).toLocaleString('en-IN')}/mo` : 'Free'}
                </div>
              </label>
            ))}
          </div>
          {selected !== clinic.plan && (
            <div className="bg-gray-800/50 rounded-xl p-3 mb-4 border border-gray-700/50">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Current bill</span>
                <span className="text-gray-300">{fmtMoney(currentBill)}/mo</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1.5">
                <span className="text-gray-400">New bill</span>
                <span className={`font-semibold ${newBill > currentBill ? 'text-emerald-400' : newBill < currentBill ? 'text-orange-400' : 'text-gray-300'}`}>
                  {fmtMoney(newBill)}/mo
                </span>
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving || selected === clinic.plan}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
              style={{ background: '#F5821E' }}>
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Changing…' : 'Confirm Change'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Clinic Drawer ─────────────────────────────────────────────────────────────

function ClinicDrawer({ clinic, planConfig, onClose, onAction, addToast }) {
  const [payments, setPayments] = useState([])
  const [loadingPay, setLoadingPay] = useState(true)
  const [showPayModal, setShowPayModal] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [actionLoading, setActionLoading] = useState({})

  const bill = calcMonthlyBill(clinic, planConfig)
  const planInfo = getPlanInfo(clinic.plan, planConfig)
  const modules = getActiveModules(clinic)
  const expiring = isExpiringSoon(clinic.subscription_expires_at)
  const overdue = isOverdue(clinic.subscription_expires_at, clinic.subscription_status)
  const maxDoctors = planInfo.max_doctors || 2

  useEffect(() => {
    api.get(`/platform/clinics/${clinic.id}/payments?limit=10`).then(r => {
      setPayments(Array.isArray(r) ? r : [])
    }).catch(() => setPayments([])).finally(() => setLoadingPay(false))
  }, [clinic.id])

  async function handleExtend() {
    setActionLoading(s => ({ ...s, extend: true }))
    try {
      const r = await api.put(`/platform/clinics/${clinic.id}/extend`, { days: 30 })
      addToast(`Extended ${clinic.name} subscription by 30 days`)
      onAction()
    } catch (err) {
      addToast(err?.message || 'Failed to extend', 'error')
    } finally {
      setActionLoading(s => ({ ...s, extend: false }))
    }
  }

  async function handleSuspend() {
    setActionLoading(s => ({ ...s, suspend: true }))
    try {
      await api.put(`/platform/clinics/${clinic.id}/suspend`, { reason: 'payment_failed' })
      addToast(`${clinic.name} suspended`)
      onAction()
    } catch (err) {
      addToast(err?.message || 'Failed to suspend', 'error')
    } finally {
      setActionLoading(s => ({ ...s, suspend: false }))
    }
  }

  async function handleReactivate() {
    setActionLoading(s => ({ ...s, reactivate: true }))
    try {
      await api.put(`/platform/clinics/${clinic.id}/reactivate`)
      addToast(`${clinic.name} reactivated`)
      onAction()
    } catch (err) {
      addToast(err?.message || 'Failed to reactivate', 'error')
    } finally {
      setActionLoading(s => ({ ...s, reactivate: false }))
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-gray-950 border-l border-gray-800 z-50 overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-5 py-4 flex items-start gap-3">
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors mt-0.5 shrink-0">
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white truncate">{clinic.name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <StatusBadge status={clinic.status} />
              <PlanBadge planKey={clinic.plan} planConfig={planConfig} />
              {overdue && <span className="text-[10px] bg-red-900/40 text-red-400 border border-red-700/40 px-1.5 py-0.5 rounded-full">Overdue</span>}
              {expiring && !overdue && <span className="text-[10px] bg-yellow-900/40 text-yellow-400 border border-yellow-700/40 px-1.5 py-0.5 rounded-full">Expiring soon</span>}
            </div>
          </div>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {/* Bill & Expiry */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-1">Monthly Bill</div>
              <div className="text-lg font-bold text-white">{fmtMoney(bill)}</div>
              <div className="text-[10px] text-gray-600 mt-0.5">{clinic.doctor_count || 0} doctors × {fmtMoney(planInfo.price_per_doctor)}</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-1">Subscription</div>
              <div className={`text-sm font-bold ${overdue ? 'text-red-400' : expiring ? 'text-yellow-400' : 'text-white'}`}>
                {fmtDate(clinic.subscription_expires_at)}
              </div>
              <div className="text-[10px] text-gray-600 mt-0.5 capitalize">{clinic.subscription_status || 'active'}</div>
            </div>
          </div>

          {/* Usage */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Usage</div>
            <UsageBar label="Doctors" used={clinic.doctor_count || 0} max={maxDoctors} />
          </div>

          {/* Modules */}
          {modules.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Active Modules</div>
              <div className="flex flex-wrap gap-1.5">
                {modules.map(m => (
                  <span key={m} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-900/30 text-emerald-400 border border-emerald-700/30">
                    <CheckCircle2 size={10} />{m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Admin Contact */}
          {(clinic.admin_name || clinic.admin_email) && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Admin Contact</div>
              {clinic.admin_name  && <div className="text-sm text-white">{clinic.admin_name}</div>}
              {clinic.admin_email && <div className="text-xs text-gray-500 mt-0.5">{clinic.admin_email}</div>}
              {clinic.admin_mobile && <div className="text-xs text-gray-500 mt-0.5">{clinic.admin_mobile}</div>}
            </div>
          )}

          {/* Payment History */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Recent Payments</div>
            {loadingPay ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-[#F5821E] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : payments.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-3">No payments recorded yet</p>
            ) : (
              <div className="space-y-2">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
                    <div>
                      <div className="text-sm font-semibold text-white">{fmtMoney(p.amount)}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5 capitalize">{p.method?.replace('_', ' ')} · {fmtDate(p.created_at)}</div>
                    </div>
                    {p.reference && <div className="text-[10px] text-gray-600 text-right">{p.reference}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-gray-950 border-t border-gray-800 p-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setShowPayModal(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ background: '#F5821E' }}>
              <Banknote size={14} />Record Payment
            </button>
            <button onClick={() => setShowPlanModal(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors">
              <Layers size={14} />Change Plan
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleExtend} disabled={actionLoading.extend}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-indigo-900/50 hover:bg-indigo-800/50 text-indigo-300 transition-colors disabled:opacity-50">
              {actionLoading.extend ? <RefreshCw size={12} className="animate-spin" /> : <Calendar size={12} />}
              Extend +30 days
            </button>
            {clinic.status === 'suspended' ? (
              <button onClick={handleReactivate} disabled={actionLoading.reactivate}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-emerald-900/50 hover:bg-emerald-800/50 text-emerald-300 transition-colors disabled:opacity-50">
                {actionLoading.reactivate ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                Reactivate
              </button>
            ) : (
              <button onClick={handleSuspend} disabled={actionLoading.suspend}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-orange-900/50 hover:bg-orange-800/50 text-orange-300 transition-colors disabled:opacity-50">
                {actionLoading.suspend ? <RefreshCw size={12} className="animate-spin" /> : <XCircle size={12} />}
                Suspend
              </button>
            )}
          </div>
        </div>
      </div>

      {showPayModal && (
        <RecordPaymentModal clinic={clinic} planConfig={planConfig} addToast={addToast}
          onClose={() => setShowPayModal(false)}
          onSaved={() => {
            api.get(`/platform/clinics/${clinic.id}/payments?limit=10`).then(r => {
              setPayments(Array.isArray(r) ? r : [])
            })
            onAction()
          }} />
      )}
      {showPlanModal && (
        <ChangePlanModal clinic={clinic} planConfig={planConfig} addToast={addToast}
          onClose={() => setShowPlanModal(false)}
          onSaved={onAction} />
      )}
    </>
  )
}

// ── Plans & Pricing Tab ───────────────────────────────────────────────────────

function PlansEditorTab({ planConfig, onSaved, addToast }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(planConfig || {})))
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  function setPlan(key, field, value) {
    setDraft(d => {
      const updated = { ...d, plans: { ...d.plans, [key]: { ...d.plans[key], [field]: value } } }
      return updated
    })
    setDirty(true)
  }

  function setFeatures(key, raw) {
    setPlan(key, 'features', raw.split('\n').map(s => s.trim()).filter(Boolean))
  }

  async function save() {
    const plans = Object.entries(draft?.plans || {})
    for (const [key, plan] of plans) {
      if ((plan.price_per_doctor ?? 0) < 0) {
        addToast(`Plan "${plan.label || key}": price cannot be negative`, 'error')
        return
      }
    }
    setSaving(true)
    try {
      await api.put('/platform/plan-config', draft)
      addToast('Plan configuration saved')
      onSaved(draft)
      setDirty(false)
    } catch (err) {
      addToast(err?.message || 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const plans = Object.entries(draft?.plans || {})

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">Edit plan pricing, limits and features. Changes apply to all new bills.</p>
        <button onClick={save} disabled={saving || !dirty}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-40"
          style={{ background: dirty ? '#F5821E' : undefined, backgroundColor: dirty ? undefined : 'rgb(31 41 55)' }}>
          {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
          {saving ? 'Saving…' : 'Save All Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {plans.map(([key, plan]) => (
          <div key={key} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-800" style={{ background: plan.color + '11' }}>
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: plan.color || '#6B7280' }} />
              <input value={plan.label || key} onChange={e => setPlan(key, 'label', e.target.value)}
                className="flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder-gray-600"
                placeholder="Plan Name" />
              <input type="color" value={plan.color || '#6B7280'} onChange={e => setPlan(key, 'color', e.target.value)}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0" title="Plan color" />
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">₹/Doctor/Month</label>
                  <input type="number" min="0" step="0.01" value={plan.price_per_doctor ?? 0}
                    onChange={e => setPlan(key, 'price_per_doctor', parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-[#F5821E] transition-colors" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Max Doctors</label>
                  <input type="number" min="1" value={plan.max_doctors ?? 2}
                    onChange={e => setPlan(key, 'max_doctors', parseInt(e.target.value) || 999)}
                    className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-[#F5821E] transition-colors" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Trial Days</label>
                <input type="number" min="0" value={plan.trial_days ?? 0}
                  onChange={e => setPlan(key, 'trial_days', parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-[#F5821E] transition-colors" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Features (one per line)</label>
                <textarea value={(plan.features || []).join('\n')}
                  onChange={e => setFeatures(key, e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-[#F5821E] transition-colors resize-none h-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Payments Tab ──────────────────────────────────────────────────────────────

function PaymentsTab({ addToast }) {
  const [data, setData] = useState({ payments: [], total_collected: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [method, setMethod] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ limit: 200 })
    if (method) params.set('method', method)
    api.get(`/platform/payments?${params}`).then(r => {
      setData(r || { payments: [], total_collected: 0 })
    }).catch(() => addToast('Failed to load payments', 'error')).finally(() => setLoading(false))
  }, [method])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return data.payments
    return data.payments.filter(p =>
      p.clinic_name?.toLowerCase().includes(q) ||
      p.reference?.toLowerCase().includes(q) ||
      p.method?.toLowerCase().includes(q)
    )
  }, [data.payments, search])

  const methods = ['upi', 'neft', 'imps', 'cash', 'cheque', 'bank_transfer', 'razorpay']

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-gray-400">Total Collected:</span>
          <span className="font-bold text-emerald-400 text-base">{fmtMoney(data.total_collected)}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              className="bg-gray-900 border border-gray-800 text-white text-xs rounded-lg pl-7 pr-3 py-1.5 outline-none focus:border-[#F5821E] w-36 transition-colors placeholder-gray-500" />
          </div>
          <select value={method} onChange={e => setMethod(e.target.value)}
            className="bg-gray-900 border border-gray-800 text-white text-xs rounded-lg px-3 py-1.5 outline-none focus:border-[#F5821E]">
            <option value="">All Methods</option>
            {methods.map(m => <option key={m} value={m} className="capitalize">{m.replace('_', ' ').toUpperCase()}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-[#F5821E] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm">No payments found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-[10px] uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3 text-left">Clinic</th>
                  <th className="px-3 py-3 text-left">Amount</th>
                  <th className="px-3 py-3 text-left">Method</th>
                  <th className="px-3 py-3 text-left">Reference</th>
                  <th className="px-3 py-3 text-left">Period</th>
                  <th className="px-3 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-white">{p.clinic_name}</div>
                      {p.clinic_city && <div className="text-[10px] text-gray-500">{p.clinic_city}</div>}
                    </td>
                    <td className="px-3 py-3 text-emerald-400 font-semibold text-sm">{fmtMoney(p.amount)}</td>
                    <td className="px-3 py-3 text-gray-400 text-xs capitalize">{p.method?.replace('_', ' ')}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs font-mono">{p.reference || '—'}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs">
                      {p.period_from ? `${fmtDate(p.period_from)} – ${fmtDate(p.period_to)}` : '—'}
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{fmtDate(p.created_at)}</td>
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

// ── Analytics Tab ─────────────────────────────────────────────────────────────

function AnalyticsTab({ clinics, planConfig }) {
  const planMrr = useMemo(() => {
    const map = {}
    for (const c of clinics) {
      if (c.status !== 'active') continue
      const plan = c.plan || 'free'
      const planInfo = planConfig?.plans?.[plan]
      const bill = (c.doctor_count || 0) * (planInfo?.price_per_doctor || 0)
      map[plan] = (map[plan] || 0) + bill
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [clinics, planConfig])

  const totalMrr = planMrr.reduce((s, [, v]) => s + v, 0)
  const maxVal = Math.max(...planMrr.map(([, v]) => v), 1)

  const activeClinics = clinics.filter(c => c.status === 'active').length
  const paidClinics   = clinics.filter(c => c.status === 'active' && c.plan !== 'free').length
  const avgBill = paidClinics > 0
    ? Math.round(planMrr.filter(([k]) => k !== 'free').reduce((s, [, v]) => s + v, 0) / paidClinics)
    : 0

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <KpiCard icon={TrendingUp} label="Est. MRR" value={fmtMoney(totalMrr)} color="#10B981" />
        <KpiCard icon={Building2} label="Paying Clinics" value={paidClinics} sub={`of ${activeClinics} active`} color="#F5821E" />
        <KpiCard icon={IndianRupee} label="Avg Bill / Clinic" value={fmtMoney(avgBill)} sub="paid plans only" color="#8B5CF6" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">MRR by Plan</div>
        {planMrr.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-6">No revenue data yet</p>
        ) : (
          <div className="space-y-3">
            {planMrr.map(([planKey, mrr]) => {
              const info = getPlanInfo(planKey, planConfig)
              const pct = Math.round((mrr / maxVal) * 100)
              const count = clinics.filter(c => c.status === 'active' && (c.plan || 'free') === planKey).length
              return (
                <div key={planKey}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: info.color || '#6B7280' }} />
                      <span className="text-sm text-white font-medium">{info.label || planKey}</span>
                      <span className="text-xs text-gray-500">{count} health center{count !== 1 ? 's' : ''}</span>
                    </div>
                    <span className="text-sm font-semibold text-white">{fmtMoney(mrr)}</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: info.color || '#6B7280' }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Plan breakdown table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 text-xs font-semibold text-gray-400 uppercase tracking-wider">Plan Breakdown</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-[10px] uppercase tracking-wider text-gray-500">
              <th className="px-4 py-2.5 text-left">Plan</th>
              <th className="px-3 py-2.5 text-right">Clinics</th>
              <th className="px-3 py-2.5 text-right">Rate/Dr</th>
              <th className="px-3 py-2.5 text-right">Est. MRR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {planMrr.map(([planKey, mrr]) => {
              const info = getPlanInfo(planKey, planConfig)
              const count = clinics.filter(c => c.status === 'active' && (c.plan || 'free') === planKey).length
              return (
                <tr key={planKey} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: info.color || '#6B7280' }} />
                      <span className="text-white font-medium">{info.label || planKey}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-400">{count}</td>
                  <td className="px-3 py-2.5 text-right text-gray-400">{fmtMoney(info.price_per_doctor)}</td>
                  <td className="px-3 py-2.5 text-right text-emerald-400 font-semibold">{fmtMoney(mrr)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main Subscriptions Page ───────────────────────────────────────────────────

const TABS = [
  { key: 'clinics',   label: 'Health Centers',   icon: Building2 },
  { key: 'plans',     label: 'Plans & Pricing',  icon: Layers },
  { key: 'payments',  label: 'Payments',         icon: Banknote },
  { key: 'analytics', label: 'Analytics',        icon: Activity },
]

export default function Subscriptions() {
  const [tab, setTab] = useState('clinics')
  const [showBuilder, setShowBuilder] = useState(false)
  const [clinics, setClinics] = useState([])
  const [planConfig, setPlanConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [drawerClinic, setDrawerClinic] = useState(null)
  const { toasts, add: addToast, dismiss } = useToast()

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get('/platform/clinics?limit=500'),
      api.get('/platform/plan-config'),
    ]).then(([cl, pc]) => {
      setClinics(Array.isArray(cl) ? cl : [])
      setPlanConfig(pc || null)
    }).catch(() => addToast('Failed to load data', 'error')).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // KPI strip
  const totalMrr      = useMemo(() => clinics.reduce((s, c) => s + (c.monthly_bill || 0), 0), [clinics])
  const activeClinics = clinics.filter(c => c.status === 'active').length
  const overdueClinics = clinics.filter(c => isOverdue(c.subscription_expires_at, c.subscription_status)).length
  const expiringClinics = clinics.filter(c => isExpiringSoon(c.subscription_expires_at)).length

  const filtered = useMemo(() => clinics.filter(c => {
    const q = search.toLowerCase()
    if (filterPlan   && (c.plan || 'free') !== filterPlan)   return false
    if (filterStatus && c.status !== filterStatus) return false
    if (q && !c.name?.toLowerCase().includes(q) && !c.city?.toLowerCase().includes(q)) return false
    return true
  }), [clinics, search, filterPlan, filterStatus])

  const uniquePlans    = [...new Set(clinics.map(c => c.plan || 'free'))].sort()
  const uniqueStatuses = [...new Set(clinics.map(c => c.status))].filter(Boolean).sort()

  function refreshDrawerClinic(id) {
    api.get(`/platform/clinics/${id}`).then(r => {
      setClinics(cs => cs.map(c => c.id === id ? { ...c, ...r } : c))
      setDrawerClinic(prev => prev?.id === id ? { ...prev, ...r } : prev)
    }).catch(() => {})
  }

  return (
    <div className="space-y-4">
      <Toaster toasts={toasts} onDismiss={dismiss} />

      {/* Drawer */}
      {drawerClinic && (
        <ClinicDrawer
          clinic={drawerClinic}
          planConfig={planConfig}
          addToast={addToast}
          onClose={() => setDrawerClinic(null)}
          onAction={() => { refreshDrawerClinic(drawerClinic.id); load() }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-white">Subscriptions</h1>
        <button onClick={() => setShowBuilder(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold">
          <Package size={13} /> Build Plans
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={TrendingUp}    label="Est. MRR"       value={fmtMoney(totalMrr)}  color="#10B981" />
        <KpiCard icon={Building2}     label="Active HCs"     value={activeClinics}         color="#F5821E" />
        <KpiCard icon={AlertTriangle} label="Overdue"        value={overdueClinics}        color="#EF4444" />
        <KpiCard icon={Clock}         label="Expiring ≤7d"   value={expiringClinics}       color="#F59E0B" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-1 justify-center ${tab === t.key ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>
              <Icon size={12} />{t.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-[3px] border-[#F5821E] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── All Clinics Tab ── */}
          {tab === 'clinics' && (
            <div className="space-y-3">
              {/* Filters */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clinics…"
                    className="bg-gray-900 border border-gray-800 text-white text-xs rounded-lg pl-7 pr-7 py-1.5 outline-none focus:border-[#F5821E] w-44 transition-colors placeholder-gray-500" />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                      <X size={10} />
                    </button>
                  )}
                </div>
                <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
                  className="bg-gray-900 border border-gray-800 text-white text-xs rounded-lg px-3 py-1.5 outline-none focus:border-[#F5821E]">
                  <option value="">All Plans</option>
                  {uniquePlans.map(p => <option key={p} value={p} className="capitalize">{planConfig?.plans?.[p]?.label || p}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="bg-gray-900 border border-gray-800 text-white text-xs rounded-lg px-3 py-1.5 outline-none focus:border-[#F5821E]">
                  <option value="">All Statuses</option>
                  {uniqueStatuses.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                </select>
                {(search || filterPlan || filterStatus) && (
                  <button onClick={() => { setSearch(''); setFilterPlan(''); setFilterStatus('') }}
                    className="text-xs text-gray-400 hover:text-white underline">Clear</button>
                )}
                <span className="text-xs text-gray-600 ml-auto">{filtered.length} of {clinics.length}</span>
              </div>

              {/* Table */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                {filtered.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 text-sm">
                    {clinics.length === 0 ? 'No health centers found' : 'No health centers match your filters'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800 text-[10px] uppercase tracking-wider text-gray-500">
                          <th className="px-4 py-3 text-left">Health Center</th>
                          <th className="px-3 py-3 text-left">Plan</th>
                          <th className="px-3 py-3 text-left">Status</th>
                          <th className="px-3 py-3 text-center">Doctors</th>
                          <th className="px-3 py-3 text-right">MRR</th>
                          <th className="px-3 py-3 text-left">Expiry</th>
                          <th className="px-3 py-3 text-left">Modules</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/50">
                        {filtered.map(c => {
                          const overdue  = isOverdue(c.subscription_expires_at, c.subscription_status)
                          const expiring = isExpiringSoon(c.subscription_expires_at)
                          const bill = calcMonthlyBill(c, planConfig)
                          const modules = getActiveModules(c)
                          return (
                            <tr key={c.id}
                              className={`cursor-pointer hover:bg-gray-800/40 transition-colors ${overdue ? 'bg-red-950/10' : expiring ? 'bg-yellow-950/10' : ''}`}
                              onClick={() => setDrawerClinic(c)}>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-white text-sm">{c.name}</div>
                                <div className="text-[10px] text-gray-500 mt-0.5">{c.city}{c.state ? `, ${c.state}` : ''}</div>
                                {overdue  && <div className="text-[10px] text-red-400 mt-0.5">● Overdue</div>}
                                {!overdue && expiring && <div className="text-[10px] text-yellow-400 mt-0.5">● Expiring soon</div>}
                              </td>
                              <td className="px-3 py-3">
                                <PlanBadge planKey={c.plan || 'free'} planConfig={planConfig} />
                              </td>
                              <td className="px-3 py-3">
                                <StatusBadge status={c.status} />
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className="text-white font-semibold">{c.doctor_count ?? 0}</span>
                                <span className="text-gray-600 text-[10px]">/{planConfig?.plans?.[c.plan || 'free']?.max_doctors >= 999 ? '∞' : (planConfig?.plans?.[c.plan || 'free']?.max_doctors ?? '—')}</span>
                              </td>
                              <td className="px-3 py-3 text-right">
                                <span className="text-emerald-400 font-semibold text-xs">{bill > 0 ? fmtMoney(bill) : '—'}</span>
                              </td>
                              <td className={`px-3 py-3 text-xs ${overdue ? 'text-red-400' : expiring ? 'text-yellow-400' : 'text-gray-500'}`}>
                                {fmtDate(c.subscription_expires_at)}
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex gap-1 flex-wrap">
                                  {modules.slice(0, 3).map(m => (
                                    <span key={m} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{m}</span>
                                  ))}
                                  {modules.length > 3 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">+{modules.length - 3}</span>}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'plans'     && planConfig && <PlansEditorTab planConfig={planConfig} onSaved={setPlanConfig} addToast={addToast} />}
          {tab === 'payments'  && <PaymentsTab addToast={addToast} />}
          {tab === 'analytics' && planConfig && <AnalyticsTab clinics={clinics} planConfig={planConfig} />}
        </>
      )}

      {showBuilder && <PlanBuilder onClose={() => setShowBuilder(false)} addToast={addToast} />}
    </div>
  )
}
