import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { adminApi } from '../api'
import { ArrowLeft, CheckCircle, XCircle, PauseCircle, RefreshCw, FileText, ExternalLink, IndianRupee, KeyRound, Copy, UserPlus, CreditCard, Activity, Users, CalendarCheck, FlaskConical, Pill, Stethoscope, ShieldCheck, Building2, Layers, Mail, Phone, Check, X, Briefcase } from 'lucide-react'
import ActionModal from '../components/ActionModal'

// ── Health Center Manager: permission catalog + role templates ──────────────────
const MODULE_DEFS = [
  { key: 'appointments', label: 'Appointments & Front Desk' },
  { key: 'patients',     label: 'Patient Records' },
  { key: 'billing',      label: 'Billing & Payments' },
  { key: 'pharmacy',     label: 'Pharmacy' },
  { key: 'lab',          label: 'Laboratory' },
  { key: 'imaging',      label: 'Imaging / Radiology' },
  { key: 'scheduler',    label: 'Staff Scheduling' },
  { key: 'inpatient',    label: 'Inpatient / CareChart' },
  { key: 'reports',      label: 'Reports & Analytics' },
  { key: 'staff',        label: 'Staff Management' },
]
const DUTY_DEFS = [
  { key: 'create_staff',     label: 'Create / onboard staff' },
  { key: 'edit_staff',       label: 'Edit staff details' },
  { key: 'deactivate_staff', label: 'Activate / deactivate staff' },
  { key: 'reset_passwords',  label: 'Reset staff passwords' },
  { key: 'manage_schedules', label: 'Build & publish schedules' },
  { key: 'approve_leave',    label: 'Approve leave requests' },
  { key: 'view_revenue',     label: 'View revenue & financials' },
  { key: 'waive_bills',      label: 'Approve fee waivers' },
  { key: 'create_managers',  label: 'Create other managers', supervisorOnly: true },
  { key: 'manage_profile',   label: 'Edit center profile & branches', supervisorOnly: true },
]
const ROLE_DEFS = [
  { key: 'doctor',         label: 'Doctor' },
  { key: 'nurse',          label: 'Nurse' },
  { key: 'receptionist',   label: 'Receptionist' },
  { key: 'pharmacist',     label: 'Pharmacist' },
  { key: 'lab_technician', label: 'Lab Technician' },
  { key: 'imaging_tech',   label: 'Imaging Technician' },
  { key: 'clinic_manager', label: 'Manager', supervisorOnly: true },
]
const allOn = defs => defs.reduce((a, d) => ({ ...a, [d.key]: true }), {})

const MANAGER_TEMPLATES = [
  { key: 'supervisor', label: 'Health Center Supervisor', desc: 'Full center oversight — manages all managers & staff',
    scope: 'center', modules: allOn(MODULE_DEFS), duties: allOn(DUTY_DEFS), roles: ROLE_DEFS.map(r => r.key) },
  { key: 'frontdesk', label: 'Front-Desk Manager', desc: 'Appointments, registration, billing & reception staff',
    scope: 'department', modules: { appointments: true, patients: true, billing: true, scheduler: true, staff: true },
    duties: { create_staff: true, edit_staff: true, reset_passwords: true, manage_schedules: true, approve_leave: true }, roles: ['receptionist'] },
  { key: 'pharmacy', label: 'Pharmacy Manager', desc: 'Pharmacy operations, inventory & pharmacy staff',
    scope: 'department', modules: { pharmacy: true, billing: true, reports: true, staff: true },
    duties: { create_staff: true, edit_staff: true, reset_passwords: true, view_revenue: true }, roles: ['pharmacist'] },
  { key: 'lab', label: 'Lab Manager', desc: 'Laboratory queue, results & lab staff',
    scope: 'department', modules: { lab: true, billing: true, reports: true, staff: true },
    duties: { create_staff: true, edit_staff: true, reset_passwords: true }, roles: ['lab_technician'] },
  { key: 'imaging', label: 'Imaging Manager', desc: 'Radiology orders, reporting & imaging staff',
    scope: 'department', modules: { imaging: true, billing: true, reports: true, staff: true },
    duties: { create_staff: true, edit_staff: true, reset_passwords: true }, roles: ['imaging_tech'] },
  { key: 'clinical', label: 'Clinical / Nursing Supervisor', desc: 'Wards, scheduling & clinical staff across the center',
    scope: 'center', modules: { patients: true, inpatient: true, appointments: true, scheduler: true, reports: true, staff: true },
    duties: { create_staff: true, edit_staff: true, reset_passwords: true, manage_schedules: true, approve_leave: true }, roles: ['doctor', 'nurse'] },
  { key: 'custom', label: 'Custom', desc: 'Start blank and choose everything yourself',
    scope: 'department', modules: {}, duties: {}, roles: [] },
]

const MANAGER_EMPTY = {
  full_name: '', designation: '', email: '', mobile: '',
  scope: 'center', department_id: '', department: '',
  template: 'supervisor',
  modules: allOn(MODULE_DEFS), duties: allOn(DUTY_DEFS), manageable_roles: ROLE_DEFS.map(r => r.key),
}

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
  const [managerSuccess, setManagerSuccess] = useState(null) // { full_name, temp_password, ... }
  const [departments, setDepartments] = useState([])

  useEffect(() => {
    if (!managerModal) return
    adminApi.getClinicDepartments(id)
      .then(d => setDepartments(Array.isArray(d) ? d : []))
      .catch(() => setDepartments([]))
  }, [managerModal, id])

  const openManagerModal = () => {
    setManagerForm(MANAGER_EMPTY); setManagerError(''); setManagerSuccess(null); setManagerModal(true)
  }
  const applyTemplate = tplKey => {
    const tpl = MANAGER_TEMPLATES.find(t => t.key === tplKey) || MANAGER_TEMPLATES[0]
    setManagerForm(f => ({ ...f, template: tpl.key, scope: tpl.scope,
      modules: { ...tpl.modules }, duties: { ...tpl.duties }, manageable_roles: [...tpl.roles] }))
  }
  const toggleMap = (field, key) => setManagerForm(f => ({ ...f, template: 'custom', [field]: { ...f[field], [key]: !f[field][key] } }))
  const toggleRole = key => setManagerForm(f => {
    const has = f.manageable_roles.includes(key)
    return { ...f, template: 'custom', manageable_roles: has ? f.manageable_roles.filter(r => r !== key) : [...f.manageable_roles, key] }
  })
  const setScope = scope => setManagerForm(f => {
    const duties = { ...f.duties }
    let roles = [...f.manageable_roles]
    if (scope === 'department') {
      DUTY_DEFS.filter(d => d.supervisorOnly).forEach(d => { delete duties[d.key] })
      roles = roles.filter(r => !ROLE_DEFS.find(rd => rd.key === r)?.supervisorOnly)
    }
    return { ...f, scope, duties, manageable_roles: roles }
  })
  const onMobileChange = v => setManagerForm(f => ({ ...f, mobile: v.replace(/\D/g, '').slice(0, 10) }))

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
      const f = managerForm
      const payload = {
        full_name: f.full_name.trim(),
        designation: f.designation?.trim() || undefined,
        email: f.email?.trim() || undefined,
        mobile: f.mobile || undefined,
        scope: f.scope,
        permissions: { modules: f.modules, duties: f.duties, manageable_roles: f.manageable_roles },
      }
      if (f.scope === 'department') {
        if (f.department_id) payload.department_id = Number(f.department_id)
        else if (f.department?.trim()) payload.department = f.department.trim()
      }
      const res = await adminApi.createManager(id, payload)
      setManagerSuccess({ ...res, full_name: payload.full_name })
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
    catch (ex) { alert(ex.message || 'Could not update plan') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  if (loadError) return (
    <div className="card-p py-12 text-center">
      <p className="text-red-400 text-sm mb-3">{loadError}</p>
      <button onClick={load} className="btn-secondary text-sm">Try Again</button>
    </div>
  )
  if (!clinic) return <div className="text-faint p-8">Health Center not found</div>

  const { billing } = clinic

  // Create-manager modal derived state
  const mf = managerForm
  const mobileValid = !mf.mobile || mf.mobile.length === 10
  const deptOk = mf.scope !== 'department' || !!(mf.department_id || mf.department?.trim())
  const canCreate = !!mf.full_name.trim() && mobileValid && deptOk
  const noChannel = !mf.email?.trim() && !mf.mobile
  const visibleDuties = DUTY_DEFS.filter(d => mf.scope === 'center' || !d.supervisorOnly)
  const visibleRoles  = ROLE_DEFS.filter(r => mf.scope === 'center' || !r.supervisorOnly)

  return (
    <div>
      <div className="mb-6">
        <Link to="/clinics" className="inline-flex items-center gap-1 text-faint hover:text-white text-sm mb-3">
          <ArrowLeft size={14} />Back to Health Centers
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="page-title">{clinic.name}</h1>
              <span className={`badge ${STATUS_BADGE[clinic.status] || 'badge-pending'}`}>{clinic.status}</span>
              <span className={`badge ${PLAN_COLORS[clinic.plan] || 'badge-free'}`}>{clinic.plan}</span>
            </div>
            <p className="text-faint text-sm mt-1">{clinic.specialty} · {clinic.city}, {clinic.state}</p>
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
              <button onClick={openManagerModal} className="btn-secondary text-xs">
                <UserPlus size={13} />Create Manager
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-app">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.key ? 'border-indigo-500 text-app' : 'border-transparent text-dim hover:text-white'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'staff' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-app flex items-center justify-between">
            <h3 className="text-xs font-semibold text-faint uppercase tracking-wider">Staff Roster</h3>
            <button onClick={loadStaff} className="text-xs text-dim hover:text-white">Refresh</button>
          </div>
          {staffLoading ? (
            <div className="p-10 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : staffError ? (
            <div className="p-6 text-center text-red-400 text-sm">{staffError}</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-faint uppercase tracking-wider border-b border-app">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Mobile</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {staffList.map(s => (
                  <tr key={s.id}>
                    <td className="px-5 py-3 text-app font-medium">{s.full_name}</td>
                    <td className="px-5 py-3 text-dim capitalize">{s.role?.replace('_', ' ')}</td>
                    <td className="px-5 py-3 text-dim">{s.email || '—'}</td>
                    <td className="px-5 py-3 text-dim">{s.mobile || '—'}</td>
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
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-faint">No staff found</td></tr>
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
            <h3 className="text-xs font-semibold text-faint uppercase tracking-wider mb-4">Health Center Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><div className="text-faint mb-0.5">Admin</div><div className="text-app">{clinic.admin_name}</div></div>
              <div><div className="text-faint mb-0.5">Email</div><div className="text-app">{clinic.admin_email}</div></div>
              <div><div className="text-faint mb-0.5">Phone</div><div className="text-app">{clinic.phone}</div></div>
              <div><div className="text-faint mb-0.5">Registered</div><div className="text-app">{new Date(clinic.created_at).toLocaleDateString('en-IN')}</div></div>
              <div className="col-span-2"><div className="text-faint mb-0.5">Address</div><div className="text-app">{clinic.city}, {clinic.state}</div></div>
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
                {clinic.suspension_comment && <div className="text-xs text-dim mt-1">{clinic.suspension_comment}</div>}
              </div>
            )}
          </div>

          {/* Staff */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-app">
              <h3 className="text-xs font-semibold text-faint uppercase tracking-wider">Staff ({clinic.staff?.length || 0})</h3>
            </div>
            <div className="divide-y divide-[color:var(--border)]">
              {(clinic.staff || []).map(s => (
                <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-app">{s.full_name}</div>
                    <div className="text-xs text-faint">{s.email} · <span className="capitalize">{s.role?.replace('_', ' ')}</span></div>
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
            <h3 className="text-xs font-semibold text-faint uppercase tracking-wider mb-4 flex items-center gap-1.5"><IndianRupee size={12} />Billing</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-faint">Active Doctors</span><span className="text-app font-semibold">{billing?.active_doctors ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-faint">Rate / Doctor</span><span className="text-app">₹{billing?.price_per_doctor}/mo</span></div>
              <div className="border-t border-app pt-2 flex justify-between"><span className="text-dim font-semibold">Monthly Total</span><span className="text-emerald-400 font-bold text-lg">₹{billing?.monthly_total?.toLocaleString('en-IN')}</span></div>
            </div>
          </div>

          {/* Audit Log */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-app">
              <h3 className="text-xs font-semibold text-faint uppercase tracking-wider">Recent Actions</h3>
            </div>
            <div className="divide-y divide-[color:var(--border)] max-h-64 overflow-y-auto">
              {(clinic.audit_log || []).length === 0 ? (
                <p className="p-4 text-faint text-sm">No actions recorded</p>
              ) : clinic.audit_log.map((l, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="text-sm text-app">{ACTION_LABELS[l.action] || l.action}</div>
                  {l.reason && <div className="text-xs text-faint mt-0.5">Reason: {l.reason?.replace('_', ' ')}</div>}
                  {l.comment && <div className="text-xs text-faint">{l.comment}</div>}
                  <div className="text-xs text-faint mt-0.5">{l.admin_name} · {new Date(l.created_at).toLocaleDateString('en-IN')}</div>
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
                <div className="flex items-center gap-1.5 text-xs text-faint uppercase tracking-wider mb-2"><CreditCard size={13} />Plan</div>
                <span className={`badge ${PLAN_COLORS[clinic.plan] || 'badge-free'} capitalize`}>{clinic.plan || 'free'}</span>
              </div>
              <div className="kpi-card">
                <div className="flex items-center gap-1.5 text-xs text-faint uppercase tracking-wider mb-2"><CalendarCheck size={13} />Expiry</div>
                <div className={`text-lg font-bold ${expiryUrgent ? 'text-red-400' : 'text-app'}`}>
                  {expiry ? expiry.toLocaleDateString('en-IN') : '—'}
                </div>
                {expiry && daysLeft !== null && (
                  <div className={`text-xs mt-0.5 ${expiryUrgent ? 'text-red-400' : 'text-faint'}`}>
                    {daysLeft < 0 ? `Expired ${Math.abs(daysLeft)}d ago` : `${daysLeft}d left`}
                  </div>
                )}
              </div>
              <div className="kpi-card">
                <div className="flex items-center gap-1.5 text-xs text-faint uppercase tracking-wider mb-2"><IndianRupee size={13} />MRR</div>
                <div className="text-lg font-bold text-emerald-400">₹{Number(mrr || 0).toLocaleString('en-IN')}</div>
                <div className="text-xs text-faint mt-0.5">per month</div>
              </div>
            </div>

            <div className="card-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-app">
                <h3 className="text-xs font-semibold text-faint uppercase tracking-wider">Payment History</h3>
              </div>
              {paymentsLoading ? (
                <div className="p-10 flex justify-center"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: ACCENT, borderTopColor: 'transparent' }} /></div>
              ) : paymentsError ? (
                <div className="m-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">{paymentsError}</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-faint uppercase tracking-wider border-b border-app">
                      <th className="th-sm">Date</th>
                      <th className="th-sm">Amount</th>
                      <th className="th-sm">Method</th>
                      <th className="th-sm">Reference</th>
                      <th className="th-sm">Period</th>
                      <th className="th-sm">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--border)]">
                    {payments.map(p => (
                      <tr key={p.id}>
                        <td className="td-sm text-dim">{p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN') : '—'}</td>
                        <td className="td-sm text-emerald-400 font-semibold">₹{Number(p.amount || 0).toLocaleString('en-IN')}</td>
                        <td className="td-sm text-dim capitalize">{p.method || '—'}</td>
                        <td className="td-sm text-dim font-mono text-xs">{p.reference || '—'}</td>
                        <td className="td-sm text-dim">
                          {p.period_from || p.period_to
                            ? `${p.period_from ? new Date(p.period_from).toLocaleDateString('en-IN') : '—'} → ${p.period_to ? new Date(p.period_to).toLocaleDateString('en-IN') : '—'}`
                            : '—'}
                        </td>
                        <td className="td-sm text-dim">{p.notes || '—'}</td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr><td colSpan={6} className="td-sm text-center text-faint py-8">No payments recorded for this Health Center</td></tr>
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
                  <div className="flex items-center gap-1.5 text-xs text-faint uppercase tracking-wider mb-2"><Users size={13} />Total Patients</div>
                  <div className="text-2xl font-bold text-app">{Number(clinicalStats?.total_patients || 0).toLocaleString('en-IN')}</div>
                </div>
                <div className="kpi-card">
                  <div className="flex items-center gap-1.5 text-xs text-faint uppercase tracking-wider mb-2"><CalendarCheck size={13} />Appointments</div>
                  <div className="text-2xl font-bold text-app">{Number(clinicalStats?.total_appointments || 0).toLocaleString('en-IN')}</div>
                </div>
                <div className="kpi-card">
                  <div className="flex items-center gap-1.5 text-xs text-faint uppercase tracking-wider mb-2"><FlaskConical size={13} />Lab Orders</div>
                  <div className="text-2xl font-bold text-app">{Number(clinicalStats?.total_lab_orders || 0).toLocaleString('en-IN')}</div>
                </div>
                <div className="kpi-card">
                  <div className="flex items-center gap-1.5 text-xs text-faint uppercase tracking-wider mb-2"><Pill size={13} />Prescriptions</div>
                  <div className="text-2xl font-bold text-app">{Number(clinicalStats?.total_prescriptions || 0).toLocaleString('en-IN')}</div>
                </div>
              </div>

              <div className="card-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-app flex items-center gap-1.5">
                  <Stethoscope size={13} className="text-faint" />
                  <h3 className="text-xs font-semibold text-faint uppercase tracking-wider">Top Doctors by Appointments</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-faint uppercase tracking-wider border-b border-app">
                      <th className="th-sm">Rank</th>
                      <th className="th-sm">Doctor</th>
                      <th className="th-sm">Appointments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--border)]">
                    {(clinicalStats?.top_doctors || []).map((d, i) => (
                      <tr key={`${d.name}-${i}`}>
                        <td className="td-sm text-faint font-mono">{i + 1}</td>
                        <td className="td-sm text-app font-medium">{d.name}</td>
                        <td className="td-sm text-dim">{Number(d.appointments || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                    {(clinicalStats?.top_doctors || []).length === 0 && (
                      <tr><td colSpan={3} className="td-sm text-center text-faint py-8">No doctor activity recorded</td></tr>
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
          <div className="surface border border-app rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-app mb-1">Password Reset</h3>
            <p className="text-sm text-dim mb-4">{pwdModal.staffName}</p>
            <div className="surface-2 rounded-xl p-4 mb-3 font-mono text-lg text-center text-indigo-300 tracking-widest select-all">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="surface border border-app rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-app">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
                  <ShieldCheck size={20} style={{ color: ACCENT }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-app leading-tight">Create Health Center Manager</h3>
                  <p className="text-sm text-dim mt-0.5">{clinic.name}</p>
                </div>
              </div>
              <button onClick={() => { setManagerModal(false); setManagerSuccess(null) }} className="text-faint hover:text-white p-1 -m-1"><X size={20} /></button>
            </div>

            {managerSuccess ? (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                    <CheckCircle size={22} className="text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-emerald-300 font-semibold">{managerSuccess.full_name} created</div>
                      <div className="text-xs text-dim">{managerSuccess.scope_label || 'Health Center Manager'}{managerSuccess.department ? ` · ${managerSuccess.department}` : ''}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="surface-2 rounded-xl p-4">
                      <div className="text-xs text-faint mb-1">Username</div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-app text-sm select-all">{managerSuccess.username || '—'}</span>
                        <button onClick={() => navigator.clipboard.writeText(managerSuccess.username || '')} className="text-dim hover:text-white"><Copy size={14} /></button>
                      </div>
                    </div>
                    <div className="surface-2 rounded-xl p-4">
                      <div className="text-xs text-faint mb-1">Temporary password</div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-indigo-300 text-sm tracking-wider select-all">{managerSuccess.temp_password || '—'}</span>
                        <button onClick={() => navigator.clipboard.writeText(managerSuccess.temp_password || '')} className="text-dim hover:text-white"><Copy size={14} /></button>
                      </div>
                    </div>
                  </div>

                  {/* Delivery status */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-faint uppercase tracking-wider">Credential delivery</div>
                    <div className="flex flex-wrap gap-2">
                      {managerSuccess.email && (
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${managerSuccess.email_sent ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-app surface-2 text-dim'}`}>
                          <Mail size={12} />{managerSuccess.email_sent ? `Emailed to ${managerSuccess.email}` : 'Email not sent (delivery off)'}
                        </span>
                      )}
                      {managerSuccess.mobile && (
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${managerSuccess.sms_sent ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-app surface-2 text-dim'}`}>
                          <Phone size={12} />{managerSuccess.sms_sent ? `Texted to ${managerSuccess.mobile}` : 'SMS not sent (delivery off)'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-amber-400">Shown once — share privately. The manager must change this password on first login.</p>
                  </div>
                </div>
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-app">
                  <button onClick={() => navigator.clipboard.writeText(`Username: ${managerSuccess.username || ''}\nTemp password: ${managerSuccess.temp_password || ''}\nLogin: ${managerSuccess.login_url || ''}`)} className="btn-secondary justify-center text-sm"><Copy size={13} />Copy all</button>
                  <button onClick={() => { setManagerModal(false); setManagerSuccess(null) }} className="btn-primary justify-center text-sm">Done</button>
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <form id="mgr-form" onSubmit={handleCreateManager} className="space-y-6">
                    {/* Access level */}
                    <section>
                      <div className="text-xs font-semibold text-faint uppercase tracking-wider mb-2">Access level</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { key: 'center',     icon: ShieldCheck, title: 'Health Center Supervisor', desc: 'Whole center · manages all managers & staff' },
                          { key: 'department', icon: Building2,    title: 'Health Center Manager',    desc: 'Scoped to one or more departments' },
                        ].map(opt => (
                          <button type="button" key={opt.key} onClick={() => setScope(opt.key)}
                            className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${mf.scope === opt.key ? 'border-indigo-500 bg-indigo-500/10' : 'border-app hover:border-gray-600'}`}>
                            <opt.icon size={18} className={mf.scope === opt.key ? 'text-indigo-300 mt-0.5' : 'text-faint mt-0.5'} />
                            <div>
                              <div className={`text-sm font-semibold ${mf.scope === opt.key ? 'text-app' : 'text-dim'}`}>{opt.title}</div>
                              <div className="text-xs text-faint mt-0.5">{opt.desc}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                      {mf.scope === 'department' && (
                        <div className="mt-3">
                          <label className="block text-xs text-dim mb-1">Department *</label>
                          {departments.length > 0 ? (
                            <select value={mf.department_id} onChange={e => setManagerForm(f => ({ ...f, department_id: e.target.value, department: departments.find(d => String(d.id) === e.target.value)?.name || '' }))}
                              className="w-full px-3 py-2 surface-2 border border-app rounded-lg text-app text-sm focus:outline-none focus:border-indigo-500">
                              <option value="">— Select department —</option>
                              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                          ) : (
                            <input value={mf.department} onChange={e => setManagerForm(f => ({ ...f, department: e.target.value }))}
                              placeholder="e.g. Pharmacy, Laboratory, Front Desk"
                              className="w-full px-3 py-2 surface-2 border border-app rounded-lg text-app text-sm focus:outline-none focus:border-indigo-500" />
                          )}
                        </div>
                      )}
                    </section>

                    {/* Identity */}
                    <section>
                      <div className="text-xs font-semibold text-faint uppercase tracking-wider mb-2">Manager details</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-dim mb-1">Full name *</label>
                          <input required value={mf.full_name} onChange={e => setManagerForm(f => ({ ...f, full_name: e.target.value }))}
                            placeholder="e.g. Priya Sharma"
                            className="w-full px-3 py-2 surface-2 border border-app rounded-lg text-app text-sm focus:outline-none focus:border-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-xs text-dim mb-1">Designation</label>
                          <div className="relative">
                            <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                            <input value={mf.designation} onChange={e => setManagerForm(f => ({ ...f, designation: e.target.value }))}
                              placeholder="e.g. Operations Lead"
                              className="w-full pl-9 pr-3 py-2 surface-2 border border-app rounded-lg text-app text-sm focus:outline-none focus:border-indigo-500" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-dim mb-1">Email</label>
                          <div className="relative">
                            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                            <input type="email" value={mf.email} onChange={e => setManagerForm(f => ({ ...f, email: e.target.value }))}
                              placeholder="manager@healthcenter.com"
                              className="w-full pl-9 pr-3 py-2 surface-2 border border-app rounded-lg text-app text-sm focus:outline-none focus:border-indigo-500" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-dim mb-1">Mobile</label>
                          <div className="relative">
                            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                            <input inputMode="numeric" value={mf.mobile} onChange={e => onMobileChange(e.target.value)}
                              placeholder="10-digit mobile"
                              className={`w-full pl-9 pr-3 py-2 surface-2 border rounded-lg text-app text-sm focus:outline-none ${mobileValid ? 'border-app focus:border-indigo-500' : 'border-red-500/60'}`} />
                          </div>
                          {!mobileValid && <p className="text-red-400 text-xs mt-1">Enter exactly 10 digits</p>}
                        </div>
                      </div>
                      {noChannel && <p className="text-amber-400 text-xs mt-2">No email or mobile — the temp password will only be shown on the next screen.</p>}
                    </section>

                    {/* Permission template */}
                    <section>
                      <div className="text-xs font-semibold text-faint uppercase tracking-wider mb-2">Start from a template</div>
                      <div className="flex flex-wrap gap-2">
                        {MANAGER_TEMPLATES.map(t => (
                          <button type="button" key={t.key} onClick={() => applyTemplate(t.key)} title={t.desc}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${mf.template === t.key ? 'border-indigo-500 bg-indigo-500/10 text-app' : 'border-app text-dim hover:border-gray-600'}`}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </section>

                    {/* Modules */}
                    <section>
                      <div className="flex items-center gap-2 mb-2"><Layers size={13} className="text-faint" /><span className="text-xs font-semibold text-faint uppercase tracking-wider">Apps this manager can open</span></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {MODULE_DEFS.map(m => (
                          <button type="button" key={m.key} onClick={() => toggleMap('modules', m.key)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm text-left transition-all ${mf.modules[m.key] ? 'border-indigo-500 bg-indigo-500/10 text-app' : 'border-app text-dim hover:border-gray-600'}`}>
                            <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${mf.modules[m.key] ? 'bg-indigo-500' : 'border border-gray-600'}`}>{mf.modules[m.key] && <Check size={11} className="text-app" />}</span>
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </section>

                    {/* Duties */}
                    <section>
                      <div className="flex items-center gap-2 mb-2"><ShieldCheck size={13} className="text-faint" /><span className="text-xs font-semibold text-faint uppercase tracking-wider">Duties this manager can perform</span></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {visibleDuties.map(d => (
                          <button type="button" key={d.key} onClick={() => toggleMap('duties', d.key)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm text-left transition-all ${mf.duties[d.key] ? 'border-indigo-500 bg-indigo-500/10 text-app' : 'border-app text-dim hover:border-gray-600'}`}>
                            <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${mf.duties[d.key] ? 'bg-indigo-500' : 'border border-gray-600'}`}>{mf.duties[d.key] && <Check size={11} className="text-app" />}</span>
                            {d.label}{d.supervisorOnly && <span className="ml-auto text-[10px] uppercase tracking-wide text-indigo-400/70">supervisor</span>}
                          </button>
                        ))}
                      </div>
                    </section>

                    {/* Manageable roles */}
                    <section>
                      <div className="flex items-center gap-2 mb-2"><Users size={13} className="text-faint" /><span className="text-xs font-semibold text-faint uppercase tracking-wider">Staff roles this manager can create</span></div>
                      <div className="flex flex-wrap gap-2">
                        {visibleRoles.map(r => (
                          <button type="button" key={r.key} onClick={() => toggleRole(r.key)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${mf.manageable_roles.includes(r.key) ? 'border-indigo-500 bg-indigo-500/10 text-app' : 'border-app text-dim hover:border-gray-600'}`}>
                            {mf.manageable_roles.includes(r.key) && <Check size={11} />}{r.label}
                          </button>
                        ))}
                      </div>
                    </section>

                    {managerError && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{managerError}</p>}
                  </form>
                </div>
                {/* Footer */}
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-app">
                  <div className="text-xs text-faint">{Object.values(mf.modules).filter(Boolean).length} apps · {Object.values(mf.duties).filter(Boolean).length} duties · {mf.manageable_roles.length} roles</div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setManagerModal(false)} className="btn-secondary justify-center text-sm">Cancel</button>
                    <button type="submit" form="mgr-form" disabled={managerSaving || !canCreate} className="btn-primary justify-center text-sm disabled:opacity-50">
                      {managerSaving ? 'Creating…' : 'Create Manager'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Plan Modal */}
      {planModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="surface border border-app rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-app mb-4">Change Plan — {clinic.name}</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {PLANS.map(p => (
                <button key={p} onClick={() => setSelectedPlan(p)}
                  className={`p-3 rounded-xl border text-sm font-medium capitalize transition-all ${selectedPlan === p ? 'border-indigo-500 bg-indigo-500/10 text-app' : 'border-app text-dim hover:border-gray-600'}`}>
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
