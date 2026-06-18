import { useState, useEffect } from 'react'
import { adminApi } from '../api'
import { ChevronDown, Plus, X, Loader2 } from 'lucide-react'
import api from '../api/client'

const PLAN_OPTIONS = ['basic', 'pro', 'enterprise']

const PLAN_BADGE = {
  free:       'bg-gray-700/50 text-gray-400',
  basic:      'bg-blue-900/50 text-blue-300',
  pro:        'bg-indigo-900/50 text-indigo-300',
  enterprise: 'bg-purple-900/50 text-purple-300',
}
const STATUS_BADGE = {
  active:    'bg-emerald-900/50 text-emerald-300',
  expired:   'bg-red-900/50 text-red-400',
  suspended: 'bg-orange-900/50 text-orange-300',
  pending:   'bg-yellow-900/50 text-yellow-300',
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
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-start gap-2 px-3 py-2 rounded-xl shadow-lg text-xs font-medium ${
          t.type === 'error' ? 'bg-red-900 text-red-200 border border-red-700'
          : t.type === 'warn' ? 'bg-orange-900 text-orange-200 border border-orange-700'
          : 'bg-gray-800 text-emerald-300 border border-gray-700'
        }`}>
          <span className="flex-1">{t.msg}</span>
          <button onClick={() => onDismiss(t.id)} className="opacity-60 hover:opacity-100">✕</button>
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
    if (err?.response?.status === 404 || err?.response?.status === 405) return { ok: false, backendMissing: true }
    return { ok: false, error: err?.response?.data?.message || 'Request failed' }
  }
}

function PlanDropdown({ clinic, onAction }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium transition-colors">
        Upgrade <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 min-w-[110px]">
          {PLAN_OPTIONS.map(plan => (
            <button key={plan} onClick={() => { setOpen(false); onAction(clinic, 'plan', plan) }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 capitalize">{plan}</button>
          ))}
        </div>
      )}
    </div>
  )
}

function NewPlanModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', price: '', max_doctors: '', features: '', description: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name || !form.price) return
    setSaving(true)
    try {
      await api.post('/platform/plans', {
        name: form.name,
        price_per_doctor: Number(form.price),
        max_doctors: form.max_doctors ? Number(form.max_doctors) : 999,
        description: form.description,
        features: form.features.split('\n').filter(Boolean),
      })
      onSaved()
      onClose()
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white">New Plan</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Plan Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-gray-500"
              placeholder="e.g. Starter" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Price / Doctor / Month (₹) *</label>
              <input type="number" value={form.price} onChange={e => set('price', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-gray-500"
                placeholder="0 = Free" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Max Doctors (blank = unlimited)</label>
              <input type="number" value={form.max_doctors} onChange={e => set('max_doctors', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-gray-500"
                placeholder="999" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Description</label>
            <input value={form.description} onChange={e => set('description', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-gray-500"
              placeholder="Short plan description" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Features (one per line)</label>
            <textarea value={form.features} onChange={e => set('features', e.target.value)} rows={3}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-gray-500 resize-none"
              placeholder="Unlimited OPD&#10;Lab integration&#10;Reports" />
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-sm bg-gray-800 text-gray-300 hover:text-white border border-gray-700">Cancel</button>
          <button onClick={save} disabled={saving || !form.name || !form.price}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white flex items-center gap-1.5 disabled:opacity-50"
            style={{ background: '#F5821E' }}>
            {saving && <Loader2 size={13} className="animate-spin" />}
            Create Plan
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Subscriptions() {
  const [clinics, setClinics] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState({})
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter]     = useState('all')
  const [showNewPlan, setShowNewPlan]   = useState(false)
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
      addToast(action === 'extend' ? `Extended ${clinic.name} by 30 days`
        : action === 'plan'   ? `Upgraded ${clinic.name} to ${extra}`
        : action === 'suspend'? `Suspended ${clinic.name}`
        : `Reactivated ${clinic.name}`)
      load()
    } else if (result.backendMissing) {
      addToast('Feature requires backend update', 'warn')
    } else {
      addToast(result.error || 'Action failed', 'error')
    }
    setActionLoading(s => ({ ...s, [key]: false }))
  }

  const getStatus = (c) => c.subscription_status || c.status || 'pending'
  const getPlan   = (c) => c.subscription_plan   || c.plan   || 'free'
  const getExpiry = (c) => c.subscription_expiry || c.expiry

  const filtered = clinics.filter(c => {
    const st = getStatus(c)
    const pl = getPlan(c)
    if (statusFilter !== 'all' && st !== statusFilter) return false
    if (planFilter   !== 'all' && pl !== planFilter)   return false
    return true
  })

  const totalActive    = clinics.filter(c => getStatus(c) === 'active').length
  const totalExpired   = clinics.filter(c => isExpired(getExpiry(c), getStatus(c))).length
  const totalSuspended = clinics.filter(c => getStatus(c) === 'suspended').length
  const expiringSoon   = clinics.filter(c => isExpiringSoon(getExpiry(c))).length
  const mrr = clinics.filter(c => getStatus(c) === 'active').reduce((s, c) => s + (c.monthly_bill || 0), 0)

  return (
    <div className="space-y-3">
      <Toast toasts={toasts} onDismiss={dismiss} />
      {showNewPlan && <NewPlanModal onClose={() => setShowNewPlan(false)} onSaved={load} />}

      {/* Stat chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { label: 'Active',         value: totalActive,    color: 'text-emerald-400', bg: 'bg-emerald-900/20 border-emerald-800/50' },
          { label: 'MRR',            value: `₹${mrr.toLocaleString('en-IN')}`, color: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-800/50' },
          { label: 'Expiring ≤7d',   value: expiringSoon,   color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-800/50' },
          { label: 'Suspended',      value: totalSuspended, color: 'text-orange-400', bg: 'bg-orange-900/20 border-orange-800/50' },
          { label: 'Expired',        value: totalExpired,   color: 'text-red-400',    bg: 'bg-red-900/20 border-red-800/50' },
        ].map(s => (
          <div key={s.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${s.bg}`}>
            <span className={`text-base font-bold ${s.color}`}>{s.value}</span>
            <span className="text-gray-500 text-xs">{s.label}</span>
          </div>
        ))}

        <button onClick={() => setShowNewPlan(true)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
          style={{ background: '#F5821E' }}>
          <Plus size={13} /> New Plan
        </button>
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-0.5 bg-gray-900 border border-gray-800 p-0.5 rounded-lg">
          {['all','active','expired','suspended','pending'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                statusFilter === s ? 'bg-[#F5821E] text-white' : 'text-gray-400 hover:text-white'
              }`}>{s}</button>
          ))}
        </div>
        <select value={planFilter} onChange={e => setPlanFilter(e.target.value)}
          className="bg-gray-900 border border-gray-800 text-gray-300 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-gray-600">
          <option value="all">All Plans</option>
          {['free','basic','pro','enterprise'].map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
        </select>
        <span className="text-xs text-gray-600 ml-auto">{filtered.length} orgs</span>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#F5821E', borderTopColor: 'transparent' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-gray-500 text-sm">No organisations found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-2.5 text-left">Organisation</th>
                  <th className="px-3 py-2.5 text-left">Plan</th>
                  <th className="px-3 py-2.5 text-left">Status</th>
                  <th className="px-3 py-2.5 text-left">Expiry</th>
                  <th className="px-3 py-2.5 text-center">Doctors</th>
                  <th className="px-3 py-2.5 text-right">Monthly Bill</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map(c => {
                  const status  = getStatus(c)
                  const plan    = getPlan(c)
                  const expiry  = getExpiry(c)
                  const expired = isExpired(expiry, status)
                  const soon    = isExpiringSoon(expiry)
                  const isBusy  = (a) => actionLoading[`${c.id}-${a}`]

                  return (
                    <tr key={c.id} className={`hover:bg-gray-800/30 transition-colors ${expired ? 'bg-red-950/20' : soon ? 'bg-yellow-950/20' : ''}`}>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-white text-sm">{c.name}</div>
                        <div className="text-xs text-gray-500">{c.city || c.specialty || '—'}</div>
                        {soon && !expired && <div className="text-xs text-yellow-400 font-medium">⚠ Expiring soon</div>}
                        {expired && status !== 'expired' && <div className="text-xs text-red-400 font-medium">✕ Expired</div>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PLAN_BADGE[plan] || PLAN_BADGE.free}`}>{plan}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_BADGE[status] || 'bg-gray-700 text-gray-400'}`}>{status}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs ${expired ? 'text-red-400' : soon ? 'text-yellow-400' : 'text-gray-400'}`}>{fmtDate(expiry)}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-white text-sm font-semibold">{c.doctor_count ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right text-emerald-400 font-semibold text-sm">
                        {c.monthly_bill > 0 ? `₹${c.monthly_bill.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1 justify-end flex-wrap">
                          <button onClick={() => handleAction(c, 'extend')} disabled={isBusy('extend')}
                            className="px-2 py-0.5 rounded bg-indigo-800 hover:bg-indigo-700 text-indigo-300 text-xs font-medium transition-colors disabled:opacity-50">
                            {isBusy('extend') ? '…' : '+30d'}
                          </button>
                          <PlanDropdown clinic={c} onAction={handleAction} />
                          {status !== 'suspended' ? (
                            <button onClick={() => handleAction(c, 'suspend')} disabled={isBusy('suspend')}
                              className="px-2 py-0.5 rounded bg-orange-900 hover:bg-orange-800 text-orange-300 text-xs font-medium transition-colors disabled:opacity-50">
                              {isBusy('suspend') ? '…' : 'Suspend'}
                            </button>
                          ) : (
                            <button onClick={() => handleAction(c, 'reactivate')} disabled={isBusy('reactivate')}
                              className="px-2 py-0.5 rounded bg-emerald-900 hover:bg-emerald-800 text-emerald-300 text-xs font-medium transition-colors disabled:opacity-50">
                              {isBusy('reactivate') ? '…' : 'Activate'}
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
