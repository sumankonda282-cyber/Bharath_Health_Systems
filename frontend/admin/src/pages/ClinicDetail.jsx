import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { adminApi } from '../api'
import { ArrowLeft, CheckCircle, XCircle, PauseCircle, RefreshCw, FileText, ExternalLink, IndianRupee, KeyRound, Copy, UserPlus, Settings, Save } from 'lucide-react'
import ActionModal from '../components/ActionModal'

const DEPARTMENTS = [
  'General Medicine','Cardiology','Dermatology','Pediatrics','Orthopedics',
  'Gynecology & Obstetrics','Neurology','Ophthalmology','ENT','Psychiatry & Mental Health',
  'Dentistry','Ayurveda','Homeopathy','Physiotherapy & Rehabilitation',
  'Radiology & Imaging','Pathology & Laboratory','Oncology','Nephrology',
  'Gastroenterology','Endocrinology & Diabetology','Pulmonology','Urology',
  'Rheumatology','Neonatology','Emergency & Trauma','Neurosurgery',
  'Cardiothoracic Surgery','Surgical Oncology','Plastic Surgery',
  'Vascular Surgery','Palliative Care','Dietetics & Nutrition',
]

const MODULE_FLAGS = [
  ['has_pharmacy',  '💊 Pharmacy Portal'],
  ['has_lab',       '🔬 Lab Portal'],
  ['has_imaging',   '🩻 Imaging Portal'],
  ['has_inpatient', '🛏️ Inpatient / CareChart'],
  ['has_emergency', '🚨 Emergency'],
  ['has_telehealth','📹 Telehealth'],
  ['has_blood_bank','🩸 Blood Bank'],
  ['has_ambulance', '🚑 Ambulance'],
  ['wards_enabled', '🏥 Wards Enabled'],
]

function ClinicSettingsTab({ clinic, onSaved }) {
  const [form, setForm] = useState({
    name:            clinic.name || '',
    phone:           clinic.phone || '',
    email:           clinic.email || '',
    address:         clinic.address || '',
    city:            clinic.city || '',
    state:           clinic.state || '',
    pincode:         clinic.pincode || '',
    website:         clinic.website || '',
    operating_hours: clinic.operating_hours || '',
    description:     clinic.description || '',
    reg_number:      clinic.reg_number || '',
    accreditation:   clinic.accreditation || '',
    gstin:           clinic.gstin || '',
    drug_license_number: clinic.drug_license_number || '',
    nabl_number:     clinic.nabl_number || '',
    total_beds:      clinic.total_beds || 0,
    icu_beds:        clinic.icu_beds || 0,
    ot_count:        clinic.ot_count || 0,
    // module flags
    has_pharmacy:    !!clinic.has_pharmacy,
    has_lab:         !!clinic.has_lab,
    has_imaging:     !!clinic.has_imaging,
    has_inpatient:   !!clinic.has_inpatient,
    has_emergency:   !!clinic.has_emergency,
    has_telehealth:  !!clinic.has_telehealth,
    has_blood_bank:  !!clinic.has_blood_bank,
    has_ambulance:   !!clinic.has_ambulance,
    has_ambulance:   !!clinic.has_ambulance,
    wards_enabled:   !!clinic.wards_enabled,
    nabl_accredited: !!clinic.nabl_accredited,
    // departments stored as comma-separated in description; keep separate for display
  })
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)
  const [depts, setDepts]   = useState(
    clinic.departments ? clinic.departments.split(',').map(s => s.trim()).filter(Boolean) : []
  )

  const inp = (k) => ({ value: form[k] ?? '', onChange: e => setForm(f => ({ ...f, [k]: e.target.value })), className: 'w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-indigo-500' })
  const tog = (k) => setForm(f => ({ ...f, [k]: !f[k] }))

  const save = async () => {
    setSaving(true); setResult(null)
    try {
      const payload = { ...form, departments: depts.join(', ') }
      const res = await adminApi.editClinic(clinic.id, payload)
      setResult({ ok: true, msg: res.message })
      onSaved()
    } catch (e) {
      setResult({ ok: false, msg: e.message })
    } finally { setSaving(false) }
  }

  const Label = ({ children }) => <label className="block text-xs font-medium text-gray-400 mb-1">{children}</label>

  return (
    <div className="space-y-6">
      {/* Profile */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Settings size={14} /> Profile & Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[['name','Name'],['phone','Phone'],['email','Email'],['city','City'],['state','State'],['pincode','Pincode'],['website','Website'],['operating_hours','Operating Hours'],['gstin','GSTIN'],['drug_license_number','Drug License'],['reg_number','Reg. Number'],['accreditation','Accreditation']].map(([k,l]) => (
            <div key={k}>
              <Label>{l}</Label>
              <input {...inp(k)} />
            </div>
          ))}
          <div className="md:col-span-2">
            <Label>Address</Label>
            <textarea value={form.address} onChange={e => setForm(f=>({...f,address:e.target.value}))} rows={2} className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none" />
          </div>
          <div className="md:col-span-2">
            <Label>Description / About</Label>
            <textarea value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} rows={3} className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none" />
          </div>
        </div>
      </div>

      {/* Module Flags */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white mb-1">Portal & Module Access</h3>
        <p className="text-xs text-gray-400 mb-4">Toggle which portals and features are enabled for this clinic.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {MODULE_FLAGS.map(([k, label]) => (
            <label key={k} className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${form[k] ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}>
              <input type="checkbox" className="accent-indigo-500" checked={!!form[k]} onChange={() => tog(k)} />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* NABL */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Diagnostic Accreditation</h3>
        <div className="flex items-center gap-3 mb-3">
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" className="accent-indigo-500" checked={!!form.nabl_accredited} onChange={() => tog('nabl_accredited')} />
            NABL Accredited
          </label>
        </div>
        {form.nabl_accredited && (
          <div>
            <Label>NABL Number</Label>
            <input {...inp('nabl_number')} placeholder="e.g. MC-2345" className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-indigo-500 max-w-xs" />
          </div>
        )}
      </div>

      {/* Capacity */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Capacity</h3>
        <div className="grid grid-cols-3 gap-4">
          {[['total_beds','Total Beds'],['icu_beds','ICU Beds'],['ot_count','OT Count']].map(([k,l]) => (
            <div key={k}>
              <Label>{l}</Label>
              <input type="number" min="0" value={form[k]} onChange={e => setForm(f=>({...f,[k]:Number(e.target.value)}))} className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-indigo-500" />
            </div>
          ))}
        </div>
      </div>

      {/* Departments */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white mb-1">Departments</h3>
        <p className="text-xs text-gray-400 mb-4">Controls which specialties appear in patient search for this clinic.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {DEPARTMENTS.map(d => (
            <label key={d} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-xs transition-colors ${depts.includes(d) ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}>
              <input type="checkbox" className="accent-indigo-500" checked={depts.includes(d)} onChange={() => setDepts(prev => prev.includes(d) ? prev.filter(x=>x!==d) : [...prev,d])} />
              {d}
            </label>
          ))}
        </div>
      </div>

      {/* Save */}
      {result && (
        <div className={`px-4 py-3 rounded-xl text-sm ${result.ok ? 'bg-green-900/40 text-green-400 border border-green-700' : 'bg-red-900/40 text-red-400 border border-red-700'}`}>
          {result.msg}
        </div>
      )}
      <button onClick={save} disabled={saving}
        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors">
        <Save size={14} />{saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  )
}

const MANAGER_EMPTY = { full_name: '', email: '', mobile: '', password: '' }

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
  const [activeTab, setActiveTab] = useState('info')
  const [staffList, setStaffList] = useState([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [pwdModal, setPwdModal] = useState(null) // { staffName, tempPassword }
  const [resettingId, setResettingId]   = useState(null)
  const [managerModal, setManagerModal] = useState(false)
  const [managerForm, setManagerForm]   = useState(MANAGER_EMPTY)
  const [managerSaving, setManagerSaving] = useState(false)
  const [managerError, setManagerError] = useState('')
  const [managerSuccess, setManagerSuccess] = useState(null) // { full_name, password }

  const load = () => {
    setLoading(true)
    adminApi.getClinic(id).then(setClinic).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [id])

  const loadStaff = () => {
    setStaffLoading(true)
    adminApi.getClinicStaff(id).then(setStaffList).finally(() => setStaffLoading(false))
  }
  useEffect(() => { if (activeTab === 'staff') loadStaff() }, [activeTab, id])

  const handleCreateManager = async e => {
    e.preventDefault(); setManagerError(''); setManagerSaving(true)
    try {
      await adminApi.createManager(id, managerForm)
      setManagerSuccess({ full_name: managerForm.full_name, password: managerForm.password })
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
        {[['info','Overview'],['staff','Staff Roster'],['settings','Settings']].map(([tab,label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab ? 'border-indigo-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>
            {label}
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

      {activeTab === 'settings' && <ClinicSettingsTab clinic={clinic} onSaved={load} />}

      {activeTab === 'info' && <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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
      </div>}

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
            <h3 className="text-lg font-bold text-white mb-1">Create Clinic Manager</h3>
            <p className="text-sm text-gray-400 mb-4">{clinic.name}</p>

            {managerSuccess ? (
              <>
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
                  <div className="text-green-400 font-semibold text-sm mb-2">Manager created: {managerSuccess.full_name}</div>
                  <div className="text-xs text-gray-400 mb-1">Password (share privately):</div>
                  <div className="bg-gray-800 rounded-lg p-2 font-mono text-indigo-300 text-center tracking-widest select-all">
                    {managerSuccess.password}
                  </div>
                  <p className="text-xs text-amber-400 mt-2">Show once only — not stored in plain text.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { navigator.clipboard.writeText(managerSuccess.password) }} className="btn-secondary flex-1 justify-center text-sm"><Copy size={13} />Copy</button>
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
                    placeholder="manager@clinic.com" value={managerForm.email}
                    onChange={e => setManagerForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Mobile</label>
                  <input className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="10-digit mobile" value={managerForm.mobile}
                    onChange={e => setManagerForm(f => ({ ...f, mobile: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Password *</label>
                  <input required type="text" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-indigo-500"
                    placeholder="Temporary password" value={managerForm.password}
                    onChange={e => setManagerForm(f => ({ ...f, password: e.target.value }))} />
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
