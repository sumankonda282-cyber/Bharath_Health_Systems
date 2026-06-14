import { useState, useEffect } from 'react'
import { adminApi } from '../api'
import { ChevronDown } from 'lucide-react'
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

export default function Subscriptions() {
  const [clinics, setClinics] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState({})
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

  const totalActive    = clinics.filter(c => c.subscription_status === 'active' || c.status === 'active').length
  const totalExpired   = clinics.filter(c => c.subscription_status === 'expired' || isExpired(c.subscription_expiry, c.status)).length
  const totalSuspended = clinics.filter(c => c.subscription_status === 'suspended' || c.status === 'suspended').length
  const expiringSoon   = clinics.filter(c => isExpiringSoon(c.subscription_expiry)).length

  const getStatus = (c) => c.subscription_status || c.status || 'pending'
  const getPlan   = (c) => c.subscription_plan || c.plan || 'free'
  const getExpiry = (c) => c.subscription_expiry || c.expiry

  return (
    <div>
      <Toast toasts={toasts} onDismiss={dismiss} />

      {/* Summary ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Active',           value: totalActive,    color: 'text-emerald-400', bg: 'bg-emerald-900/30 border-emerald-800' },
          { label: 'Expired',          value: totalExpired,   color: 'text-red-400',     bg: 'bg-red-900/30 border-red-800' },
          { label: 'Expiring ≤7 days', value: expiringSoon,  color: 'text-yellow-400',  bg: 'bg-yellow-900/30 border-yellow-800' },
          { label: 'Suspended',        value: totalSuspended, color: 'text-orange-400',  bg: 'bg-orange-900/30 border-orange-800' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-gray-400 text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : clinics.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No clinics found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="th">Clinic</th>
                  <th className="th">Plan</th>
                  <th className="th">Status</th>
                  <th className="th">Expiry</th>
                  <th className="th text-center">Doctors</th>
                  <th className="th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {clinics.map(c => {
                  const status   = getStatus(c)
                  const plan     = getPlan(c)
                  const expiry   = getExpiry(c)
                  const expired  = isExpired(expiry, status)
                  const soon     = isExpiringSoon(expiry)
                  const rowWarn  = expired || soon
                  const isBusy   = (action) => actionLoading[`${c.id}-${action}`]

                  return (
                    <tr
                      key={c.id}
                      className={`tr-hover transition-colors ${
                        expired ? 'bg-red-950/30'
                        : soon   ? 'bg-yellow-950/30'
                        : ''
                      }`}
                    >
                      <td className="td">
                        <div className="font-semibold text-white">{c.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{c.city || c.specialty || '—'}</div>
                        {soon && !expired && (
                          <div className="text-xs text-yellow-400 mt-0.5 font-medium">⚠ Expiring soon</div>
                        )}
                        {expired && status !== 'expired' && (
                          <div className="text-xs text-red-400 mt-0.5 font-medium">✕ Expired</div>
                        )}
                      </td>
                      <td className="td">
                        <span className={`badge capitalize text-xs px-2 py-0.5 rounded-full font-semibold ${PLAN_BADGE[plan] || PLAN_BADGE.free}`}>
                          {plan}
                        </span>
                      </td>
                      <td className="td">
                        <span className={`badge capitalize text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_BADGE[status] || 'bg-gray-700 text-gray-400'}`}>
                          {status}
                        </span>
                      </td>
                      <td className="td">
                        <span className={rowWarn ? (expired ? 'text-red-400' : 'text-yellow-400') : 'text-gray-400'}>
                          {fmtDate(expiry)}
                        </span>
                      </td>
                      <td className="td text-center text-white font-semibold">
                        {c.doctor_count ?? '—'}
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Extend 30 days */}
                          <button
                            onClick={() => handleAction(c, 'extend')}
                            disabled={isBusy('extend')}
                            className="px-2 py-1 rounded-lg bg-indigo-800 hover:bg-indigo-700 text-indigo-300 text-xs font-medium transition-all disabled:opacity-50"
                          >
                            {isBusy('extend') ? '…' : '+30 days'}
                          </button>

                          {/* Upgrade Plan */}
                          <PlanDropdown clinic={c} onAction={handleAction} />

                          {/* Suspend / Reactivate */}
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
