import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { formatEmployeeId } from '../utils/ids'
import {
  PlusCircle, X, Loader2, ShieldCheck, Building2, Layers, Mail, Phone,
  Check, Briefcase, Users, CheckCircle, Copy, KeyRound, UserCheck,
} from 'lucide-react'

// Department-manager permission catalog (supervisor-only duties/roles are excluded —
// supervisors create department managers, not other supervisors).
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
  { key: 'plan_subscription', label: 'Plan & Subscription (view & pay)' },
]
const ROLE_DEFS = [
  { key: 'doctor',         label: 'Doctor' },
  { key: 'nurse',          label: 'Nurse' },
  { key: 'receptionist',   label: 'Receptionist' },
  { key: 'pharmacist',     label: 'Pharmacist' },
  { key: 'lab_technician', label: 'Lab Technician' },
  { key: 'imaging_tech',   label: 'Imaging Technician' },
]
const allOn = defs => defs.reduce((a, d) => ({ ...a, [d.key]: true }), {})

const TEMPLATES = [
  { key: 'frontdesk', label: 'Front-Desk Manager', desc: 'Appointments, registration, billing & reception staff',
    modules: { appointments: true, patients: true, billing: true, scheduler: true, staff: true },
    duties: { create_staff: true, edit_staff: true, reset_passwords: true, manage_schedules: true, approve_leave: true }, roles: ['receptionist'] },
  { key: 'pharmacy', label: 'Pharmacy Manager', desc: 'Pharmacy operations & pharmacy staff',
    modules: { pharmacy: true, billing: true, reports: true, staff: true },
    duties: { create_staff: true, edit_staff: true, reset_passwords: true, view_revenue: true }, roles: ['pharmacist'] },
  { key: 'lab', label: 'Lab Manager', desc: 'Laboratory queue, results & lab staff',
    modules: { lab: true, billing: true, reports: true, staff: true },
    duties: { create_staff: true, edit_staff: true, reset_passwords: true }, roles: ['lab_technician'] },
  { key: 'imaging', label: 'Imaging Manager', desc: 'Radiology orders, reporting & imaging staff',
    modules: { imaging: true, billing: true, reports: true, staff: true },
    duties: { create_staff: true, edit_staff: true, reset_passwords: true }, roles: ['imaging_tech'] },
  { key: 'clinical', label: 'Clinical / Nursing Manager', desc: 'Wards, scheduling & clinical staff',
    modules: { patients: true, inpatient: true, appointments: true, scheduler: true, reports: true, staff: true },
    duties: { create_staff: true, edit_staff: true, reset_passwords: true, manage_schedules: true, approve_leave: true }, roles: ['doctor', 'nurse'] },
  { key: 'custom', label: 'Custom', desc: 'Start blank and choose everything yourself',
    modules: {}, duties: {}, roles: [] },
]

const EMPTY = {
  full_name: '', designation: '', email: '', mobile: '', department: '',
  template: 'frontdesk', modules: { ...TEMPLATES[0].modules }, duties: { ...TEMPLATES[0].duties }, manageable_roles: [...TEMPLATES[0].roles],
}

export default function ManagerManagement() {
  const [managers, setManagers] = useState([])
  const [loading, setLoading]   = useState(true)
  const [loadError, setLoadError] = useState('')
  const [open, setOpen]   = useState(false)
  const [form, setForm]   = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [created, setCreated] = useState(null)
  const [supervisor, setSupervisor] = useState(undefined) // undefined=loading, null=top of org

  const load = useCallback(async () => {
    setLoading(true); setLoadError('')
    try {
      const data = await api.get('/clinic/managers')
      setManagers(Array.isArray(data) ? data : [])
    } catch (e) {
      setLoadError(e.message || 'Failed to load managers')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    api.get('/clinic/my-supervisor')
      .then(d => setSupervisor(d?.reporting_to || null))
      .catch(() => setSupervisor(null))
  }, [])

  const openCreate = () => { setForm(EMPTY); setError(''); setCreated(null); setOpen(true) }
  const applyTemplate = key => {
    const t = TEMPLATES.find(x => x.key === key) || TEMPLATES[0]
    setForm(f => ({ ...f, template: t.key, modules: { ...t.modules }, duties: { ...t.duties }, manageable_roles: [...t.roles] }))
  }
  const toggleMap = (field, key) => setForm(f => ({ ...f, template: 'custom', [field]: { ...f[field], [key]: !f[field][key] } }))
  const toggleRole = key => setForm(f => {
    const has = f.manageable_roles.includes(key)
    return { ...f, template: 'custom', manageable_roles: has ? f.manageable_roles.filter(r => r !== key) : [...f.manageable_roles, key] }
  })
  const onMobile = v => setForm(f => ({ ...f, mobile: v.replace(/\D/g, '').slice(0, 10) }))

  const mobileValid = !form.mobile || form.mobile.length === 10
  const canCreate = !!form.full_name.trim() && !!form.department.trim() && mobileValid

  const submit = async e => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const payload = {
        full_name: form.full_name.trim(),
        designation: form.designation?.trim() || undefined,
        email: form.email?.trim() || undefined,
        mobile: form.mobile || undefined,
        scope: 'department',
        department: form.department.trim(),
        permissions: { modules: form.modules, duties: form.duties, manageable_roles: form.manageable_roles },
      }
      const res = await api.post('/clinic/managers', payload)
      setCreated({ ...res, full_name: payload.full_name })
      load()
    } catch (err) {
      setError(err.message || 'Failed to create manager')
    } finally { setSaving(false) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Health Center Managers</h1>
          <p className="text-sm text-gray-500">Create and supervise the managers below you — you only see managers who report to you.</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm"><PlusCircle size={15} />Add Manager</button>
      </div>

      {supervisor && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl bg-indigo-50 border border-indigo-100">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <UserCheck size={16} className="text-indigo-600" />
          </div>
          <div className="text-sm">
            <div className="text-xs text-gray-500">You report to</div>
            <div className="font-semibold text-gray-800">
              {supervisor.full_name}
              {supervisor.employee_id && <span className="ml-2 text-xs font-normal text-gray-400">{formatEmployeeId(supervisor.employee_id)}</span>}
            </div>
            <div className="text-xs text-gray-500">{supervisor.scope_label}{supervisor.department ? ` · ${supervisor.department}` : ''}</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
        ) : loadError ? (
          <div className="p-6 text-center text-red-500 text-sm">{loadError}</div>
        ) : managers.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No managers yet. Click “Add Manager” to create one.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider text-left">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Scope</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {managers.map(m => (
                  <tr key={m.id} className="border-b border-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800">{m.full_name}</div>
                      <div className="text-xs text-gray-400">
                        {m.employee_id && <span title={m.employee_id}>{formatEmployeeId(m.employee_id)}</span>}
                        {m.employee_id && m.username && <span> · </span>}
                        {m.username && <span>@{m.username}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                        <ShieldCheck size={11} />{m.scope_label || 'Manager'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{m.department || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500"><div>{m.email || '—'}</div><div>{m.mobile || '—'}</div></td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{m.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl z-10 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center"><ShieldCheck size={18} className="text-indigo-600" /></div>
                <h2 className="font-bold text-gray-800">{created ? 'Manager created' : 'Add Department Manager'}</h2>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>

            {created ? (
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                  <CheckCircle size={22} className="text-green-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-green-700">{created.full_name}</div>
                    <div className="text-xs text-gray-500">{created.scope_label}{created.department ? ` · ${created.department}` : ''}</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                    <div className="text-xs text-gray-500 mb-1">Username</div>
                    <div className="flex items-center justify-between gap-2"><span className="font-mono text-gray-800 select-all">{created.username}</span><button onClick={() => navigator.clipboard.writeText(created.username || '')} className="text-gray-400 hover:text-gray-700"><Copy size={14} /></button></div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                    <div className="text-xs text-gray-500 mb-1">Temp password</div>
                    <div className="flex items-center justify-between gap-2"><span className="font-mono text-indigo-700 tracking-wider select-all">{created.temp_password}</span><button onClick={() => navigator.clipboard.writeText(created.temp_password || '')} className="text-gray-400 hover:text-gray-700"><Copy size={14} /></button></div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {created.email && <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${created.email_sent ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-500'}`}><Mail size={12} />{created.email_sent ? `Emailed to ${created.email}` : 'Email not sent (delivery off)'}</span>}
                  {created.mobile && <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${created.sms_sent ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-500'}`}><Phone size={12} />{created.sms_sent ? `Texted to ${created.mobile}` : 'SMS not sent (delivery off)'}</span>}
                </div>
                <p className="text-xs text-amber-600">Shown once — share privately. The manager changes it on first login.</p>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => { setCreated(null); setForm(EMPTY) }} className="btn-secondary text-sm">Add another</button>
                  <button onClick={() => setOpen(false)} className="btn-primary text-sm">Done</button>
                </div>
              </div>
            ) : (
              <>
                <form id="mgr-create" onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                  {/* Identity */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="label">Full name *</label>
                      <input className="input" required placeholder="e.g. Priya Sharma" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Department *</label>
                      <input className="input" required placeholder="e.g. Pharmacy, Front Desk" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label flex items-center gap-1"><Briefcase size={12} className="text-gray-400" />Designation</label>
                      <input className="input" placeholder="e.g. Pharmacy Lead" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label flex items-center gap-1"><Mail size={12} className="text-gray-400" />Email</label>
                      <input type="email" className="input" placeholder="manager@healthcenter.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label flex items-center gap-1"><Phone size={12} className="text-gray-400" />Mobile</label>
                      <input inputMode="numeric" className={`input ${!mobileValid ? 'border-red-400' : ''}`} placeholder="10-digit mobile" value={form.mobile} onChange={e => onMobile(e.target.value)} />
                      {!mobileValid && <p className="text-xs text-red-500 mt-1">Enter exactly 10 digits</p>}
                    </div>
                  </div>

                  {/* Template */}
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Start from a template</div>
                    <div className="flex flex-wrap gap-2">
                      {TEMPLATES.map(t => (
                        <button type="button" key={t.key} onClick={() => applyTemplate(t.key)} title={t.desc}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${form.template === t.key ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Modules */}
                  <div>
                    <div className="flex items-center gap-2 mb-2"><Layers size={13} className="text-gray-400" /><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Apps this manager can open</span></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {MODULE_DEFS.map(m => (
                        <button type="button" key={m.key} onClick={() => toggleMap('modules', m.key)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm text-left transition-all ${form.modules[m.key] ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                          <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${form.modules[m.key] ? 'bg-indigo-500' : 'border border-gray-300'}`}>{form.modules[m.key] && <Check size={11} className="text-white" />}</span>
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duties */}
                  <div>
                    <div className="flex items-center gap-2 mb-2"><ShieldCheck size={13} className="text-gray-400" /><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Duties this manager can perform</span></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {DUTY_DEFS.map(d => (
                        <button type="button" key={d.key} onClick={() => toggleMap('duties', d.key)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm text-left transition-all ${form.duties[d.key] ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                          <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${form.duties[d.key] ? 'bg-indigo-500' : 'border border-gray-300'}`}>{form.duties[d.key] && <Check size={11} className="text-white" />}</span>
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Manageable roles */}
                  <div>
                    <div className="flex items-center gap-2 mb-2"><Users size={13} className="text-gray-400" /><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Staff roles this manager can create</span></div>
                    <div className="flex flex-wrap gap-2">
                      {ROLE_DEFS.map(r => (
                        <button type="button" key={r.key} onClick={() => toggleRole(r.key)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${form.manageable_roles.includes(r.key) ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                          {form.manageable_roles.includes(r.key) && <Check size={11} />}{r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
                </form>
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100">
                  <div className="text-xs text-gray-400">{Object.values(form.modules).filter(Boolean).length} apps · {Object.values(form.duties).filter(Boolean).length} duties · {form.manageable_roles.length} roles</div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setOpen(false)} className="btn-secondary text-sm">Cancel</button>
                    <button type="submit" form="mgr-create" disabled={saving || !canCreate} className="btn-primary text-sm disabled:opacity-50">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}Create Manager
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
