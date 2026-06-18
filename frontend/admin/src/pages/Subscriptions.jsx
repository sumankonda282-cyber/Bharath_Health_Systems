import { useState, useEffect, useMemo } from 'react'
import { adminApi } from '../api'
import { ChevronDown, Search, X, Plus, Check } from 'lucide-react'
import api from '../api/client'

const PLAN_OPTIONS = ['basic', 'pro', 'enterprise']

const PLAN_BADGE = {
  free:       'bg-gray-700 text-gray-300',
  basic:      'bg-blue-900 text-blue-300',
  pro:        'bg-indigo-900 text-indigo-300',
  enterprise: 'bg-purple-900 text-purple-300',
}

const STATUS_BADGE = {
  active:    'bg-emerald-900 text-emerald-300',
  expired:   'bg-red-900 text-red-400',
  suspended: 'bg-orange-900 text-orange-300',
  pending:   'bg-yellow-900 text-yellow-300',
}

function isExpiringSoon(expiry) {
  if (!expiry) return false
  const diff = new Date(expiry) - new Date()
  return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000
}

function isExpired(expiry, status) {
  if (status === 'expired') return true
  if (!expiry) return false
  return new Date(expiry) < new Date()
}

function fmtDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Toast({ toasts, onDismiss }) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
            t.type === 'error' ? 'bg-red-900 text-red-200 border border-red-700'
            : t.type === 'warn' ? 'bg-orange-900 text-orange-200 border border-orange-700'
            : 'bg-gray-800 text-emerald-300 border border-gray-700'
          }`}
        >
          <span className="flex-1">{t.msg}</span>
          <button onClick={() => onDismiss(t.id)} className="opacity-60 hover:opacity-100 mt-0.5">✕</button>
        </div>
      ))}
    </div>
  )
}

let toastId = 0
function useToasts() {
  const [toasts, setToasts] = useState([])
  const add = (msg, type = 'success') => {
    const id = ++toastId
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }
  const dismiss = (id) => setToasts(t => t.filter(x => x.id !== id))
  return { toasts, add, dismiss }
}

async function patchSubscription(clinicId, body) {
  try {
    await api.patch(`/admin/clinics/${clinicId}/subscription`, body)
    return { ok: true }
  } catch (err) {
    if (err?.response?.status === 404 || err?.response?.status === 405) {
      return { ok: false, backendMissing: true }
    }
    return { ok: false, error: err?.response?.data?.message || 'Request failed' }
  }
}

function PlanDropdown({ clinic, onAction }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium transition-all"
      >
        Upgrade <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-20 overflow-hidden min-w-[120px]">
          {PLAN_OPTIONS.map(plan => (
            <button
              key={plan}
              onClick={() => { setOpen(false); onAction(clinic, 'plan', plan) }}
              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 capitalize"
            >
              {plan}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CreatePlanModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', display_name: '', price_per_doctor: '', max_doctors: '', trial_days: 0, features: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function submit(e) {
    e.preventDefault()
    setSaving(true); setErr('')
    setTimeout(() => {
      setSaving(false)
      onCreated?.({ ...form, price_per_doctor: Number(form.price_per_doctor), max_doctors: Number(form.max_doctors) })
      onClose()
    }, 800)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-white">Create Subscription Plan</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Plan Key *</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                placeholder="e.g. pro" className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-[#F5821E]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Display Name *</label>
              <input required value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                placeholder="e.g. Pro" className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-[#F5821E]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Price/Doctor (₹/mo)</label>
              <input type="number" min={0} value={form.price_per_doctor} onChange={e => setForm(f => ({ ...f, price_per_doctor: e.target.value }))}
                placeholder="0 = Free" className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-[#F5821E]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Max Doctors</label>
              <input type="number" min={1} value={form.max_doctors} onChange={e => setForm(f => ({ ...f, max_doctors: e.target.value }))}
                placeholder="999 = unlimited" className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-[#F5821E]" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Trial Days</label>
            <input type="number" min={0} value={form.trial_days} onChange={e => setForm(f => ({ ...f, trial_days: Number(e.target.value) }))}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-[#F5821E]" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Features (comma-separated)</label>
            <textarea value={form.features} onChange={e => setForm(f => ({ ...f, features: e.target.value }))}
              placeholder="e.g. OPD, IPD, Lab, Pharmacy"
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-[#F5821E] resize-none h-16" />
          </div>
          {err && <p className="text-red-400 text-xs">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-[#F5821E] hover:bg-[#e07319] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              <Check size={13} />{saving ? 'Creating…' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Subscriptions() {
  const [clinics, setClinics] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState({})
  const [showCreatePlan, setShowCreatePlan] = useState(false)
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const { toasts, add: addToast, dismiss } = useToasts()

  const load = () => {
    setLoading(true)
    adminApi.getClinics().then(d => setClinics(Array.isArray(d) ? d : [])).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleAction = async (clinic, action, extra) => {
    const key = `${clinic.id}-${action}`
    setActionLoading(s => ({ ...s, [key]: true }))

    let body = {}
    if (action === 'extend')     body = { extend_days: 30 }
    if (action === 'plan')       body = { plan: extra }
    if (action === 'suspend')    body = { status: 'suspended' }
    if (action === 'reactivate') body = { status: 'active' }

    const result = await patchSubscription(clinic.id, body)

    if (result.ok) {
      addToast(
        action === 'extend'     ? `Extended ${clinic.name} by 30 days`
        : action === 'plan'     ? `Upgraded ${clinic.name} to ${extra}`
        : action === 'suspend'  ? `Suspended ${clinic.name}`
        : `Reactivated ${clinic.name}`
      )
      load()
    } else if (result.backendMissing) {
      addToast('Feature requires backend update', 'warn')
    } else {
      addToast(result.error || 'Action failed', 'error')
    }

    setActionLoading(s => ({ ...s, [key]: false }))
  }

  const getStatus = (c) => c.subscription_status || c.status || 'pending'
  const getPlan   = (c) => c.subscription_plan || c.plan || 'free'
  const getExpiry = (c) => c.subscription_expiry || c.expiry

  const totalActive    = clinics.filter(c => getStatus(c) === 'active').length
  const totalExpired   = clinics.filter(c => isExpired(getExpiry(c), getStatus(c))).length
  const totalSuspended = clinics.filter(c => getStatus(c) === 'suspended').length
  const expiringSoon   = clinics.filter(c => isExpiringSoon(getExpiry(c))).length

  const filtered = useMemo(() => clinics.filter(c => {
    const status = getStatus(c)
    const plan   = getPlan(c)
    const q      = search.toLowerCase()
    if (filterStatus && status !== filterStatus) return false
    if (filterPlan   && plan   !== filterPlan)   return false
    if (q && !c.name?.toLowerCase().includes(q) && !c.city?.toLowerCase().includes(q)) return false
    return true
  }), [clinics, search, filterPlan, filterStatus])

  const uniquePlans    = [...new Set(clinics.map(getPlan))].sort()
  const uniqueStatuses = [...new Set(clinics.map(getStatus))].sort()

  return (
    <div className="space-y-3">
      <Toast toasts={toasts} onDismiss={dismiss} />
      {showCreatePlan && (
        <CreatePlanModal
          onClose={() => setShowCreatePlan(false)}
          onCreated={() => addToast('Plan created (frontend only — connect backend to persist)', 'warn')}
        />
      )}

      {/* Header + stat chips */}
      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="text-base font-bold text-white">Subscriptions</h1>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: 'Active',          value: totalActive,    cls: 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50' },
            { label: 'Expired',         value: totalExpired,   cls: 'bg-red-900/30 text-red-400 border-red-800/50' },
            { label: 'Expiring ≤7d',    value: expiringSoon,   cls: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50' },
            { label: 'Suspended',       value: totalSuspended, cls: 'bg-orange-900/30 text-orange-400 border-orange-800/50' },
          ].map(s => (
            <span key={s.label} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${s.cls}`}>
              <span className="text-sm font-bold">{s.value}</span>
              {s.label}
            </span>
          ))}
        </div>
        <div className="ml-auto">
          <button
            onClick={() => setShowCreatePlan(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5821E] hover:bg-[#e07319] text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Plus size={13} />New Plan
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search clinics…"
            className="bg-gray-900 border border-gray-800 text-white text-xs rounded-lg pl-7 pr-7 py-1.5 outline-none focus:border-[#F5821E] w-44 transition-colors placeholder-gray-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X size={10} />
            </button>
          )}
        </div>
        <select
          value={filterPlan}
          onChange={e => setFilterPlan(e.target.value)}
          className="bg-gray-900 border border-gray-800 text-white text-xs rounded-lg px-3 py-1.5 outline-none focus:border-[#F5821E]"
        >
          <option value="">All Plans</option>
          {uniquePlans.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-gray-900 border border-gray-800 text-white text-xs rounded-lg px-3 py-1.5 outline-none focus:border-[#F5821E]"
        >
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
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-[3px] border-[#F5821E] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            {clinics.length === 0 ? 'No clinics found' : 'No clinics match your filters'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-[10px] uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3 text-left">Clinic</th>
                  <th className="px-3 py-3 text-left">City</th>
                  <th className="px-3 py-3 text-left">Plan</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="px-3 py-3 text-left">Expiry</th>
                  <th className="px-3 py-3 text-center">Doctors</th>
                  <th className="px-3 py-3 text-right">Est. MRR</th>
                  <th className="px-3 py-3 text-left">Joined</th>
                  <th className="px-3 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {filtered.map(c => {
                  const status   = getStatus(c)
                  const plan     = getPlan(c)
                  const expiry   = getExpiry(c)
                  const expired  = isExpired(expiry, status)
                  const soon     = isExpiringSoon(expiry)
                  const isBusy   = (action) => actionLoading[`${c.id}-${action}`]
                  const mrr      = c.mrr ?? (c.doctor_count && c.price_per_doctor ? c.doctor_count * c.price_per_doctor : null)

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-gray-800/30 transition-colors ${
                        expired ? 'bg-red-950/20' : soon ? 'bg-yellow-950/20' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white text-sm">{c.name}</div>
                        {soon && !expired && <div className="text-[10px] text-yellow-400 font-medium mt-0.5">⚠ Expiring soon</div>}
                        {expired && status !== 'expired' && <div className="text-[10px] text-red-400 font-medium mt-0.5">✕ Expired</div>}
                      </td>
                      <td className="px-3 py-3 text-gray-400 text-xs">{c.city || '—'}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${PLAN_BADGE[plan] || PLAN_BADGE.free}`}>
                          {plan}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_BADGE[status] || 'bg-gray-700 text-gray-400'}`}>
                          {status}
                        </span>
                      </td>
                      <td className={`px-3 py-3 text-xs ${expired ? 'text-red-400' : soon ? 'text-yellow-400' : 'text-gray-400'}`}>
                        {fmtDate(expiry)}
                      </td>
                      <td className="px-3 py-3 text-center text-white font-semibold text-sm">
                        {c.doctor_count ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-right text-emerald-400 font-semibold text-xs">
                        {mrr ? `₹${mrr.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-xs">
                        {fmtDate(c.created_at || c.registered_at)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => handleAction(c, 'extend')}
                            disabled={isBusy('extend')}
                            className="px-2 py-1 rounded-lg bg-indigo-800 hover:bg-indigo-700 text-indigo-300 text-xs font-medium transition-all disabled:opacity-50"
                          >
                            {isBusy('extend') ? '…' : '+30d'}
                          </button>
                          <PlanDropdown clinic={c} onAction={handleAction} />
                          {status !== 'suspended' ? (
                            <button
                              onClick={() => handleAction(c, 'suspend')}
                              disabled={isBusy('suspend')}
                              className="px-2 py-1 rounded-lg bg-orange-900 hover:bg-orange-800 text-orange-300 text-xs font-medium transition-all disabled:opacity-50"
                            >
                              {isBusy('suspend') ? '…' : 'Suspend'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAction(c, 'reactivate')}
                              disabled={isBusy('reactivate')}
                              className="px-2 py-1 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-emerald-300 text-xs font-medium transition-all disabled:opacity-50"
                            >
                              {isBusy('reactivate') ? '…' : 'Reactivate'}
                            </button>
                          )}
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
  )
}
