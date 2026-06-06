import { useState, useEffect } from 'react'
import api from '../api/client'
import { cachedFetch, cacheInvalidate, TTL } from '../utils/cache'
import { PlusCircle, Eye, EyeOff, AlertCircle, CheckCircle, ToggleLeft, ToggleRight, KeyRound, Lock, ShieldOff, Bell } from 'lucide-react'

const ROLES = [
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'doctor',       label: 'Doctor' },
  { value: 'nurse',        label: 'Nurse' },
  { value: 'pharmacist',   label: 'Pharmacist' },
  { value: 'lab_technician', label: 'Lab Technician' },
  { value: 'imaging_tech', label: 'Imaging Technician' },
]

const ROLE_BADGE = {
  receptionist:  'bg-blue-100 text-blue-800',
  doctor:        'bg-purple-100 text-purple-800',
  nurse:         'bg-teal-100 text-teal-800',
  pharmacist:    'bg-amber-100 text-amber-800',
  lab_technician:'bg-orange-100 text-orange-800',
  imaging_tech:  'bg-rose-100 text-rose-800',
  clinic_manager:'bg-indigo-100 text-indigo-800',
  clinic_admin:  'bg-gray-100 text-gray-800',
}

const EMPTY_FORM = { full_name: '', email: '', mobile: '', role: 'receptionist', password: '' }

export default function StaffManagement() {
  const [staff, setStaff]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [showPw, setShowPw]     = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [togglingId, setTogglingId] = useState(null)
  const [activeTab, setActiveTab] = useState('roster') // 'roster' | 'requests'
  const [resetRequests, setResetRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [revokeModal, setRevokeModal] = useState(null) // { staff }
  const [revokeReason, setRevokeReason] = useState('')
  const [tempPwModal, setTempPwModal] = useState(null) // { staff, temp_password }
  const [actionLoading, setActionLoading] = useState(null)

  const loadRequests = async () => {
    setRequestsLoading(true)
    try {
      const r = await api.get('/clinic/staff/password-reset-requests')
      setResetRequests(Array.isArray(r) ? r : [])
    } catch (e) {
      // ignore
    } finally { setRequestsLoading(false) }
  }

  const handleResetPassword = async (s) => {
    setActionLoading(`reset-${s.id}`)
    try {
      const r = await api.post(`/clinic/staff/${s.id}/reset-password`, {})
      setTempPwModal({ staff: s, temp_password: r.temp_password })
      loadRequests()
    } catch (e) {
      alert(e.message)
    } finally { setActionLoading(null) }
  }

  const handleResetPin = async (s) => {
    if (!confirm(`Clear PIN for ${s.full_name}? They will need to set a new PIN.`)) return
    setActionLoading(`pin-${s.id}`)
    try {
      await api.post(`/clinic/staff/${s.id}/reset-pin`, {})
      setSuccess(`PIN cleared for ${s.full_name}`)
    } catch (e) {
      alert(e.message)
    } finally { setActionLoading(null) }
  }

  const handleRevokeConfirm = async () => {
    if (!revokeReason.trim()) return
    const s = revokeModal
    setActionLoading(`revoke-${s.id}`)
    try {
      await api.post(`/clinic/staff/${s.id}/revoke-all-access`, { reason: revokeReason })
      setSuccess(`All access revoked for ${s.full_name}`)
      setRevokeModal(null); setRevokeReason('')
      load(true)
    } catch (e) {
      alert(e.message)
    } finally { setActionLoading(null) }
  }

  const load = (invalidate = false) => {
    setLoading(true)
    const run = async () => {
      if (invalidate) await cacheInvalidate('recep_staff_list')
      await cachedFetch('recep_staff_list', () => api.get('/clinic/staff'), r => { setStaff(Array.isArray(r) ? r : r || []); setLoading(false) }, TTL.MEDIUM)
    }
    run().catch(() => setLoading(false))
  }
  useEffect(() => { load(); loadRequests() }, [])

  const handleCreate = async e => {
    e.preventDefault(); setError(''); setSuccess(''); setSaving(true)
    try {
      await api.post('/clinic/staff', form)
      setSuccess(`${form.full_name} added successfully.`)
      setForm(EMPTY_FORM)
      setShowForm(false)
      load(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (s) => {
    setTogglingId(s.id)
    try {
      await api.put(`/clinic/staff/${s.id}/toggle`)
      load(true)
    } catch (err) {
      alert(err.message)
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div>
      {/* Revoke access modal */}
      {revokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-gray-900 mb-1">Revoke Access</h3>
            <p className="text-sm text-gray-500 mb-4">Deactivate account and clear all sessions/PIN for <strong>{revokeModal.full_name}</strong>. This cannot be undone easily.</p>
            <label className="label">Reason (required)</label>
            <input className="input mb-4" value={revokeReason} onChange={e => setRevokeReason(e.target.value)}
              placeholder="e.g. Resigned, terminated, etc." autoFocus />
            <div className="flex gap-2">
              <button onClick={() => { setRevokeModal(null); setRevokeReason('') }} className="flex-1 btn-secondary text-sm">Cancel</button>
              <button onClick={handleRevokeConfirm} disabled={!revokeReason.trim() || actionLoading}
                className="flex-1 py-2 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 disabled:opacity-50">
                {actionLoading ? 'Revoking…' : 'Revoke Access'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Temp password modal */}
      {tempPwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <CheckCircle className="text-green-500 mb-2" size={28} />
            <h3 className="font-semibold text-gray-900 mb-1">Password Reset</h3>
            <p className="text-sm text-gray-500 mb-3">Share this temporary password with <strong>{tempPwModal.staff.full_name}</strong> privately. They must change it on next login.</p>
            <div className="bg-gray-100 rounded-xl p-3 font-mono text-center text-lg font-bold tracking-widest text-gray-800 mb-4 select-all">
              {tempPwModal.temp_password}
            </div>
            <button onClick={() => setTempPwModal(null)} className="w-full btn-primary text-sm">Done</button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Manage Staff</h1>
          <p className="text-sm text-gray-500 mt-0.5">Add and manage your clinic team</p>
        </div>
        <button onClick={() => { setShowForm(v => !v); setError(''); setSuccess('') }}
          className="btn-primary text-sm">
          <PlusCircle size={15} />{showForm ? 'Cancel' : 'Add Staff'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-gray-100 p-1 mb-6 text-sm gap-1 w-fit">
        <button onClick={() => setActiveTab('roster')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${activeTab === 'roster' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
          Staff Roster
        </button>
        <button onClick={() => { setActiveTab('requests'); loadRequests() }}
          className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'requests' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
          <Bell size={13} /> Password Requests
          {resetRequests.length > 0 && <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{resetRequests.length}</span>}
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          <CheckCircle size={15} />{success}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">New Staff Member</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name *</label>
              <input className="input" required placeholder="Dr. / Mr. / Ms."
                value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Role *</label>
              <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="staff@clinic.com"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Mobile</label>
              <input className="input" placeholder="10-digit mobile"
                value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Password *</label>
              <div className="relative">
                <input className="input pr-10" type={showPw ? 'text' : 'password'} required
                  placeholder="Minimum 6 characters" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Share this password with the staff member privately. They can change it after first login.</p>
            </div>

            {error && (
              <div className="sm:col-span-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />{error}
              </div>
            )}

            <div className="sm:col-span-2 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary text-sm">
                {saving ? 'Adding…' : 'Add Staff Member'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Pending Password Reset Requests</h2>
            <button onClick={loadRequests} className="text-xs text-gray-400 hover:text-gray-600">Refresh</button>
          </div>
          {requestsLoading ? (
            <div className="p-10 flex justify-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : resetRequests.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">No pending requests.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {resetRequests.map(r => (
                <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 text-sm">{r.staff_name}</div>
                    <div className="text-xs text-gray-500">{r.staff_role?.replace('_', ' ')} · {new Date(r.requested_at).toLocaleString()}</div>
                    {r.note && <div className="text-xs text-gray-400 italic mt-0.5">"{r.note}"</div>}
                  </div>
                  <button onClick={() => handleResetPassword({ id: r.staff_id, full_name: r.staff_name })}
                    disabled={actionLoading === `reset-${r.staff_id}`}
                    className="flex-shrink-0 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50">
                    {actionLoading === `reset-${r.staff_id}` ? 'Resetting…' : 'Reset Password'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'roster' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Staff Roster</h2>
            <button onClick={load} className="text-xs text-gray-400 hover:text-gray-600">Refresh</button>
          </div>
          {loading ? (
            <div className="p-10 flex justify-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : staff.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">No staff added yet.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {staff.map(s => (
                <div key={s.id} className="px-5 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{s.full_name}</div>
                    <div className="text-xs text-gray-500 truncate">{s.email || s.mobile || '—'}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${ROLE_BADGE[s.role] || 'bg-gray-100 text-gray-600'}`}>
                      {s.role?.replace('_', ' ')}
                    </span>
                    <button onClick={() => handleResetPassword(s)} disabled={actionLoading === `reset-${s.id}`}
                      title="Reset Password" className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50">
                      <Lock size={13} />
                    </button>
                    <button onClick={() => handleResetPin(s)} disabled={actionLoading === `pin-${s.id}`}
                      title="Reset PIN" className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50">
                      <KeyRound size={13} />
                    </button>
                    <button onClick={() => { setRevokeModal(s); setRevokeReason('') }}
                      title="Revoke All Access" className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100">
                      <ShieldOff size={13} />
                    </button>
                    <button onClick={() => toggleActive(s)} disabled={togglingId === s.id}
                      title={s.is_active ? 'Deactivate' : 'Activate'}
                      className="text-gray-400 hover:text-gray-700 disabled:opacity-50">
                      {s.is_active
                        ? <ToggleRight size={22} className="text-green-500" />
                        : <ToggleLeft size={22} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
