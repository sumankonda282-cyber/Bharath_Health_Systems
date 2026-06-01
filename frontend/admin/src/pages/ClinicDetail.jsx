import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { adminApi } from '../api'
import { ArrowLeft, CheckCircle, XCircle, PauseCircle, RefreshCw, FileText, ExternalLink, IndianRupee } from 'lucide-react'
import ActionModal from '../components/ActionModal'

const STATUS_BADGE = { active: 'badge-active', pending: 'badge-pending', suspended: 'badge-suspended', revoked: 'badge-revoked' }
const PLAN_COLORS  = { free: 'badge-free', basic: 'badge-basic', pro: 'badge-pro', enterprise: 'badge-enterprise' }
const PLANS        = ['free', 'basic', 'pro', 'enterprise']

const ACTION_LABELS = {
  approved_clinic:    '✅ Approved',
  rejected_clinic:    '❌ Rejected',
  suspended_clinic:   '⏸ Suspended',
  revoked_clinic:     '🚫 Revoked',
  reactivated_clinic: '🔄 Reactivated',
  changed_plan:       '📋 Plan Changed',
  verified_staff:     '✅ Staff Verified',
  rejected_staff:     '❌ Staff Rejected',
}

export default function ClinicDetail() {
  const { id }          = useParams()
  const [clinic, setClinic]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [saving, setSaving]   = useState(false)
  const [planModal, setPlanModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('')

  const load = () => {
    setLoading(true)
    adminApi.getClinic(id).then(setClinic).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [id])

  const handleAction = async ({ reason, comment }) => {
    setSaving(true)
    try {
      if (modal.action === 'approve')    await adminApi.approve(id)
      if (modal.action === 'reject')     await adminApi.reject(id, { reason: comment })
      if (modal.action === 'suspend')    await adminApi.suspend(id, { reason, comment })
      if (modal.action === 'revoke')     await adminApi.revoke(id, { reason, comment })
      if (modal.action === 'reactivate') await adminApi.reactivate(id)
      setModal(null); load()
    } finally { setSaving(false) }
  }

  const handlePlan = async () => {
    setSaving(true)
    try { await adminApi.changePlan(id, selectedPlan); setPlanModal(false); load() }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!clinic) return <div className="text-gray-500 p-8">Clinic not found</div>

  const { billing } = clinic

  return (
    <div>
      <div className="mb-6">
        <Link to="/clinics" className="inline-flex items-center gap-1 text-gray-500 hover:text-white text-sm mb-3">
          <ArrowLeft size={14} />Back to Clinics
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="page-title">{clinic.name}</h1>
              <span className={`badge ${STATUS_BADGE[clinic.status] || 'badge-pending'}`}>{clinic.status}</span>
              <span className={`badge ${PLAN_COLORS[clinic.plan] || 'badge-free'}`}>{clinic.plan}</span>
            </div>
            <p className="text-gray-500 text-sm mt-1">{clinic.specialty} · {clinic.city}, {clinic.state}</p>
          </div>
          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {clinic.status === 'pending'   && <button onClick={() => setModal({ action: 'approve' })} className="btn-success"><CheckCircle size={14} />Approve</button>}
            {clinic.status === 'pending'   && <button onClick={() => setModal({ action: 'reject' })} className="btn-danger"><XCircle size={14} />Reject</button>}
            {clinic.status === 'active'    && <button onClick={() => setModal({ action: 'suspend' })} className="btn-warning"><PauseCircle size={14} />Suspend</button>}
            {clinic.status === 'active'    && <button onClick={() => setModal({ action: 'revoke' })} className="btn-danger"><XCircle size={14} />Revoke</button>}
            {(clinic.status === 'suspended' || clinic.status === 'revoked') && (
              <button onClick={() => setModal({ action: 'reactivate' })} className="btn-success"><RefreshCw size={14} />Reactivate</button>
            )}
            <button onClick={() => { setPlanModal(true); setSelectedPlan(clinic.plan) }} className="btn-secondary text-xs">Change Plan</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Clinic Info */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card-p">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Clinic Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><div className="text-gray-500 mb-0.5">Admin</div><div className="text-white">{clinic.admin_name}</div></div>
              <div><div className="text-gray-500 mb-0.5">Email</div><div className="text-white">{clinic.admin_email}</div></div>
              <div><div className="text-gray-500 mb-0.5">Phone</div><div className="text-white">{clinic.phone}</div></div>
              <div><div className="text-gray-500 mb-0.5">Registered</div><div className="text-white">{new Date(clinic.created_at).toLocaleDateString('en-IN')}</div></div>
              <div className="col-span-2"><div className="text-gray-500 mb-0.5">Address</div><div className="text-white">{clinic.city}, {clinic.state}</div></div>
            </div>
            {clinic.license_document_url && (
              <a href={clinic.license_document_url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 mt-4">
                <FileText size={12} />View License Document <ExternalLink size={10} />
              </a>
            )}
            {clinic.suspension_reason && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <div className="text-xs font-semibold text-red-400 mb-1">Suspension Reason</div>
                <div className="text-sm text-red-300">{clinic.suspension_reason?.replace('_', ' ')}</div>
                {clinic.suspension_comment && <div className="text-xs text-gray-400 mt-1">{clinic.suspension_comment}</div>}
              </div>
            )}
          </div>

          {/* Staff */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Staff ({clinic.staff?.length || 0})</h3>
            </div>
            <div className="divide-y divide-gray-800">
              {(clinic.staff || []).map(s => (
                <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">{s.full_name}</div>
                    <div className="text-xs text-gray-500">{s.email} · <span className="capitalize">{s.role?.replace('_', ' ')}</span></div>
                    {s.license_number && <div className="text-xs text-indigo-400 mt-0.5">License: {s.license_number}</div>}
                  </div>
                  <span className={`badge ${s.is_active ? 'badge-active' : 'badge-revoked'}`}>{s.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Billing + Audit */}
        <div className="space-y-5">
          {/* Billing */}
          <div className="card-p">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5"><IndianRupee size={12} />Billing</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Active Doctors</span><span className="text-white font-semibold">{billing?.active_doctors}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Rate / Doctor</span><span className="text-white">₹{billing?.price_per_doctor}/mo</span></div>
              <div className="border-t border-gray-800 pt-2 flex justify-between"><span className="text-gray-400 font-semibold">Monthly Total</span><span className="text-emerald-400 font-bold text-lg">₹{billing?.monthly_total?.toLocaleString('en-IN')}</span></div>
            </div>
          </div>

          {/* Audit Log */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Actions</h3>
            </div>
            <div className="divide-y divide-gray-800 max-h-64 overflow-y-auto">
              {(clinic.audit_log || []).length === 0 ? (
                <p className="p-4 text-gray-600 text-sm">No actions recorded</p>
              ) : clinic.audit_log.map((l, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="text-sm text-white">{ACTION_LABELS[l.action] || l.action}</div>
                  {l.reason && <div className="text-xs text-gray-500 mt-0.5">Reason: {l.reason?.replace('_', ' ')}</div>}
                  {l.comment && <div className="text-xs text-gray-500">{l.comment}</div>}
                  <div className="text-xs text-gray-600 mt-0.5">{l.admin_name} · {new Date(l.created_at).toLocaleDateString('en-IN')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ActionModal open={!!modal} onClose={() => setModal(null)} onConfirm={handleAction}
        action={modal?.action} clinicName={clinic.name} loading={saving} />

      {/* Plan Modal */}
      {planModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-white mb-4">Change Plan — {clinic.name}</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {PLANS.map(p => (
                <button key={p} onClick={() => setSelectedPlan(p)}
                  className={`p-3 rounded-xl border text-sm font-medium capitalize transition-all ${selectedPlan === p ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}>
                  {p}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPlanModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={handlePlan} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? 'Saving…' : 'Update Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
