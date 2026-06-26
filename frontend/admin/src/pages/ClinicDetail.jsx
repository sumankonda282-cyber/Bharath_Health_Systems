import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { adminApi } from '../api'
import { ArrowLeft, CheckCircle, XCircle, PauseCircle, RefreshCw, FileText, ExternalLink, IndianRupee, KeyRound, Copy, UserPlus, CreditCard, Activity, Users, CalendarCheck, FlaskConical, Pill, Stethoscope } from 'lucide-react'
import ActionModal from '../components/ActionModal'

const MANAGER_EMPTY = { full_name: '', email: '', mobile: '' }

const STATUS_BADGE = { active: 'badge-active', pending: 'badge-pending', suspended: 'badge-suspended', revoked: 'badge-revoked' }
const PLAN_COLORS  = { free: 'badge-free', basic: 'badge-basic', pro: 'badge-pro', enterprise: 'badge-enterprise' }
const PLANS        = ['free', 'basic', 'pro', 'enterprise']

const TABS = [
  { key: 'info',         label: 'Overview' },
  { key: 'staff',        label: 'Staff Roster' },
  { key: 'subscription', label: 'Subscription' },
  { key: 'clinical',     label: 'Clinical Activity' },
]

const ACCENT = '#F5821E'

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
  const [loadError, setLoadError] = useState(null)
  const [modal, setModal]     = useState(null)
  const [saving, setSaving]   = useState(false)
  const [planModal, setPlanModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('')
  const [activeTab, setActiveTab] = useState('info')
  const [staffList, setStaffList] = useState([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [staffError, setStaffError] = useState('')
  const [pwdModal, setPwdModal] = useState(null) // { staffName, tempPassword }
  const [resettingId, setResettingId]   = useState(null)
  const [managerModal, setManagerModal] = useState(false)
  const [managerForm, setManagerForm]   = useState(MANAGER_EMPTY)
  const [managerSaving, setManagerSaving] = useState(false)
  const [managerError, setManagerError] = useState('')
  const [managerSuccess, setManagerSuccess] = useState(null) // { full_name, temp_password }

  const load = () => {
    setLoading(true)
    setLoadError(null)
    adminApi.getClinic(id)
      .then(setClinic)
      .catch(e => setLoadError(e.message || 'Failed to load clinic'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [id])

  const loadStaff = () => {
    setStaffLoading(true)
    setStaffError('')
    adminApi.getClinicStaff(id)
      .then(setStaffList)
      .catch(e => setStaffError(e.message || 'Failed to load staff'))
      .finally(() => setStaffLoading(false))
  }
  useEffect(() => { if (activeTab === 'staff') loadStaff() }, [activeTab, id])

  const [payments, setPayments] = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentsError, setPaymentsError] = useState('')
  useEffect(() => {
    if (activeTab !== 'subscription') return
    let active = true
    setPaymentsLoading(true); setPaymentsError('')
    adminApi.getClinicPayments(id)
      .then(data => { if (active) setPayments(Array.isArray(data) ? data : []) })
      .catch(ex => { if (active) setPaymentsError(ex.message || 'Failed to load payment history') })
      .finally(() => { if (active) setPaymentsLoading(false) })
    return () => { active = false }
  }, [activeTab, id])

  const [clinicalStats, setClinicalStats] = useState(null)
  const [clinicalLoading, setClinicalLoading] = useState(false)
  const [clinicalError, setClinicalError] = useState('')
  useEffect(() => {
    if (activeTab !== 'clinical') return
    let active = true
    setClinicalLoading(true); setClinicalError('')
    adminApi.getClinicClinicalStats(id)
      .then(data => { if (active) setClinicalStats(data || null) })
      .catch(ex => { if (active) setClinicalError(ex.message || 'Failed to load clinical activity') })
      .finally(() => { if (active) setClinicalLoading(false) })
    return () => { active = false }
  }, [activeTab, id])

  const handleCreateManager = async e => {
    e.preventDefault(); setManagerError(''); setManagerSaving(true)
    try {
      const res = await adminApi.createManager(id, managerForm)
      setManagerSuccess({ full_name: managerForm.full_name, temp_password: res.temp_password || res.password || '' })
      setManagerForm(MANAGER_EMPTY)
      if (activeTab === 'staff') loadStaff()
    } catch (ex) {
      setManagerError(ex.message || 'Failed to create manager')
    } finally {
      setManagerSaving(false)
    }
  }

  const handleResetPassword = async (staffId, staffName) => {
    setResettingId(staffId)
    try {
      const data = await adminApi.resetStaffPassword(staffId)
      setPwdModal({ staffName, tempPassword: data.temp_password })
    } catch (ex) {
      alert(ex.message || 'Failed to reset password')
    } finally {
      setResettingId(null)
    }
  }

  const handleAction = async ({ reason, comment }) => {
    setSaving(true)
    try {
      if (modal.action === 'approve')    await adminApi.approve(id)
      if (modal.action === 'reject')     await adminApi.reject(id, { reason: comment })
      if (modal.action === 'suspend')    await adminApi.suspend(id, { reason, comment })
      if (modal.action === 'revoke')     await adminApi.revoke(id, { reason, comment })
      if (modal.action === 'reactivate') await adminApi.reactivate(id)
      setModal(null); load()
    } catch (ex) {
      alert(ex.message || 'Action failed')
    } finally { setSaving(false) }
  }

  const handlePlan = async () => {
    setSaving(true)
    try { await adminApi.changePlan(id, selectedPlan); setPlanModal(false); load() }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  if (loadError) return (
    <div className="card-p py-12 text-center">
      <p className="text-red-400 text-sm mb-3">{loadError}</p>
      <button onClick={load} className="btn-secondary text-sm">Try Again</button>
    </div>
  )
  if (!clinic) return <div className="text-gray-500 p-8">Health Center not found</div>

  const { billing } = clinic

  return (
    <div>
      <div className="mb-6">
        <Link to="/clinics" className="inline-flex items-center gap-1 text-gray-500 hover:text-white text-sm mb-3">
          <ArrowLeft size={14} />Back to Health Centers
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
            {clinic.status === 'active' && (
              <button onClick={() => { setManagerModal(true); setManagerError(''); setManagerSuccess(null) }} className="btn-secondary text-xs">
                <UserPlus size={13} />Create Manager
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-800">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.key ? 'border-indigo-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'staff' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Staff Roster</h3>
            <button onClick={loadStaff} className="text-xs text-gray-400 hover:text-white">Refresh</button>
          </div>
          {staffLoading ? (
            <div className="p-10 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : staffError ? (
            <div className="p-6 text-center text-red-400 text-sm">{staffError}</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Mobile</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {staffList.map(s => (
                  <tr key={s.id}>
                    <td className="px-5 py-3 text-white font-medium">{s.full_name}</td>
                    <td className="px-5 py-3 text-gray-400 capitalize">{s.role?.replace('_', ' ')}</td>
                    <td className="px-5 py-3 text-gray-400">{s.email || '—'}</td>
                    <td className="px-5 py-3 text-gray-400">{s.mobile || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`badge ${s.is_active ? 'badge-active' : 'badge-revoked'}`}>{s.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleResetPassword(s.id, s.full_name)}
                        disabled={resettingId === s.id}
                        className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50">
                        <KeyRound size={12} />{resettingId === s.id ? 'Resetting…' : 'Reset Password'}
                      </button>
                    </td>
                  </tr>
                ))}
                {staffList.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-500">No staff found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'info' && <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Clinic Info */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card-p">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Health Center Information</h3>
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
              <div className="flex justify-between"><span className="text-gray-500">Active Doctors</span><span className="text-white font-semibold">{billing?.active_doctors ?? '—'}</span></div>
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
      </div>}

      {activeTab === 'subscription' && (() => {
        const expiryRaw = clinic.subscription_expires_at
        const expiry = expiryRaw ? new Date(expiryRaw) : null
        const now = new Date()
        const daysLeft = expiry ? Math.ceil((expiry - now) / 86400000) : null
        const expiryUrgent = expiry && daysLeft !== null && daysLeft <= 7
        const mrr = billing?.monthly_total ?? clinic.monthly_bill ?? 0
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="kpi-card">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wider mb-2"><CreditCard size={13} />Plan</div>
                <span className={`badge ${PLAN_COLORS[clinic.plan] || 'badge-free'} capitalize`}>{clinic.plan || 'free'}</span>
              </div>
              <div className="kpi-card">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wider mb-2"><CalendarCheck size={13} />Expiry</div>
                <div className={`text-lg font-bold ${expiryUrgent ? 'text-red-400' : 'text-white'}`}>
                  {expiry ? expiry.toLocaleDateString('en-IN') : '—'}
                </div>
                {expiry && daysLeft !== null && (
                  <div className={`text-xs mt-0.5 ${expiryUrgent ? 'text-red-400' : 'text-gray-500'}`}>
                    {daysLeft < 0 ? `Expired ${Math.abs(daysLeft)}d ago` : `${daysLeft}d left`}
                  </div>
                )}
              </div>
              <div className="kpi-card">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wider mb-2"><IndianRupee size={13} />MRR</div>
                <div className="text-lg font-bold text-emerald-400">₹{Number(mrr || 0).toLocaleString('en-IN')}</div>
                <div className="text-xs text-gray-500 mt-0.5">per month</div>
              </div>
            </div>

            <div className="card-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment History</h3>
              </div>
              {paymentsLoading ? (
                <div className="p-10 flex justify-center"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: ACCENT, borderTopColor: 'transparent' }} /></div>
              ) : paymentsError ? (
                <div className="m-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">{paymentsError}</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                      <th className="th-sm">Date</th>
                      <th className="th-sm">Amount</th>
                      <th className="th-sm">Method</th>
                      <th className="th-sm">Reference</th>
                      <th className="th-sm">Period</th>
                      <th className="th-sm">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {payments.map(p => (
                      <tr key={p.id}>
                        <td className="td-sm text-gray-400">{p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN') : '—'}</td>
                        <td className="td-sm text-emerald-400 font-semibold">₹{Number(p.amount || 0).toLocaleString('en-IN')}</td>
                        <td className="td-sm text-gray-400 capitalize">{p.method || '—'}</td>
                        <td className="td-sm text-gray-400 font-mono text-xs">{p.reference || '—'}</td>
                        <td className="td-sm text-gray-400">
                          {p.period_from || p.period_to
                            ? `${p.period_from ? new Date(p.period_from).toLocaleDateString('en-IN') : '—'} → ${p.period_to ? new Date(p.period_to).toLocaleDateString('en-IN') : '—'}`
                            : '—'}
                        </td>
                        <td className="td-sm text-gray-400">{p.notes || '—'}</td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr><td colSpan={6} className="td-sm text-center text-gray-500 py-8">No payments recorded for this Health Center</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )
      })()}

      {activeTab === 'clinical' && (
        <div className="space-y-5">
          {clinicalLoading ? (
            <div className="p-10 flex justify-center"><div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: ACCENT, borderTopColor: 'transparent' }} /></div>
          ) : clinicalError ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">{clinicalError}</div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="kpi-card">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wider mb-2"><Users size={13} />Total Patients</div>
                  <div className="text-2xl font-bold text-white">{Number(clinicalStats?.total_patients || 0).toLocaleString('en-IN')}</div>
                </div>
                <div className="kpi-card">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wider mb-2"><CalendarCheck size={13} />Appointments</div>
                  <div className="text-2xl font-bold text-white">{Number(clinicalStats?.total_appointments || 0).toLocaleString('en-IN')}</div>
                </div>
                <div className="kpi-card">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wider mb-2"><FlaskConical size={13} />Lab Orders</div>
                  <div className="text-2xl font-bold text-white">{Number(clinicalStats?.total_lab_orders || 0).toLocaleString('en-IN')}</div>
                </div>
                <div className="kpi-card">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wider mb-2"><Pill size={13} />Prescriptions</div>
                  <div className="text-2xl font-bold text-white">{Number(clinicalStats?.total_prescriptions || 0).toLocaleString('en-IN')}</div>
                </div>
              </div>

              <div className="card-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-1.5">
                  <Stethoscope size={13} className="text-gray-500" />
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Top Doctors by Appointments</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                      <th className="th-sm">Rank</th>
                      <th className="th-sm">Doctor</th>
                      <th className="th-sm">Appointments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {(clinicalStats?.top_doctors || []).map((d, i) => (
                      <tr key={`${d.name}-${i}`}>
                        <td className="td-sm text-gray-500 font-mono">{i + 1}</td>
                        <td className="td-sm text-white font-medium">{d.name}</td>
                        <td className="td-sm text-gray-300">{Number(d.appointments || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                    {(clinicalStats?.top_doctors || []).length === 0 && (
                      <tr><td colSpan={3} className="td-sm text-center text-gray-500 py-8">No doctor activity recorded</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Password Reset Modal */}
      {pwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-white mb-1">Password Reset</h3>
            <p className="text-sm text-gray-400 mb-4">{pwdModal.staffName}</p>
            <div className="bg-gray-800 rounded-xl p-4 mb-3 font-mono text-lg text-center text-indigo-300 tracking-widest select-all">
              {pwdModal.tempPassword}
            </div>
            <p className="text-xs text-amber-400 mb-4">Show this once only. It will not be shown again.</p>
            <div className="flex gap-3">
              <button
                onClick={() => { navigator.clipboard.writeText(pwdModal.tempPassword) }}
                className="btn-secondary flex-1 justify-center text-sm">
                <Copy size={14} />Copy
              </button>
              <button onClick={() => setPwdModal(null)} className="btn-primary flex-1 justify-center text-sm">Done</button>
            </div>
          </div>
        </div>
      )}

      <ActionModal open={!!modal} onClose={() => setModal(null)} onConfirm={handleAction}
        action={modal?.action} clinicName={clinic.name} loading={saving} />

      {/* Create Manager Modal */}
      {managerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-white mb-1">Create Health Center Manager</h3>
            <p className="text-sm text-gray-400 mb-4">{clinic.name}</p>

            {managerSuccess ? (
              <>
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
                  <div className="text-green-400 font-semibold text-sm mb-2">Manager created: {managerSuccess.full_name}</div>
                  <div className="text-xs text-gray-400 mb-1">Backend-generated temp password (shown once):</div>
                  <div className="bg-gray-800 rounded-lg p-2 font-mono text-indigo-300 text-center tracking-widest select-all">
                    {managerSuccess.temp_password || '(not returned by server)'}
                  </div>
                  <p className="text-xs text-amber-400 mt-2">Share privately — not stored in plain text after this.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { navigator.clipboard.writeText(managerSuccess.temp_password || '') }} className="btn-secondary flex-1 justify-center text-sm"><Copy size={13} />Copy</button>
                  <button onClick={() => { setManagerModal(false); setManagerSuccess(null) }} className="btn-primary flex-1 justify-center text-sm">Done</button>
                </div>
              </>
            ) : (
              <form onSubmit={handleCreateManager} className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Full Name *</label>
                  <input required className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Office Manager Name" value={managerForm.full_name}
                    onChange={e => setManagerForm(f => ({ ...f, full_name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Email</label>
                  <input type="email" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="manager@healthcenter.com" value={managerForm.email}
                    onChange={e => setManagerForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Mobile</label>
                  <input className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="10-digit mobile" value={managerForm.mobile}
                    onChange={e => setManagerForm(f => ({ ...f, mobile: e.target.value }))} />
                </div>
                {managerError && <p className="text-red-400 text-xs">{managerError}</p>}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setManagerModal(false)} className="btn-secondary flex-1 justify-center text-sm">Cancel</button>
                  <button type="submit" disabled={managerSaving} className="btn-primary flex-1 justify-center text-sm">
                    {managerSaving ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

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
