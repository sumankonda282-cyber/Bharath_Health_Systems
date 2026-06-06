import { useState } from 'react'
import { Eye, EyeOff, CheckCircle, AlertCircle, Lock, LogOut } from 'lucide-react'
import api from '../api/client'

function ChangePasswordForm() {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [show, setShow] = useState({ cur: false, nw: false, cn: false })
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const submit = async e => {
    e.preventDefault()
    if (form.new_password !== form.confirm) { setStatus({ ok: false, msg: 'Passwords do not match' }); return }
    setLoading(true); setStatus(null)
    try {
      const r = await api.post('/auth/platform/change-password', { current_password: form.current_password, new_password: form.new_password })
      setStatus({ ok: true, msg: r.data.message }); setForm({ current_password: '', new_password: '', confirm: '' })
    } catch (e) { setStatus({ ok: false, msg: e.response?.data?.detail || e.message }) }
    finally { setLoading(false) }
  }

  const fields = [
    { key: 'current_password', label: 'Current Password', sk: 'cur' },
    { key: 'new_password', label: 'New Password', sk: 'nw' },
    { key: 'confirm', label: 'Confirm New Password', sk: 'cn' },
  ]

  return (
    <form onSubmit={submit} className="space-y-3">
      {fields.map(f => (
        <div key={f.key}>
          <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
          <div className="relative">
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-100"
              type={show[f.sk] ? 'text' : 'password'} value={form[f.key]}
              onChange={e => setForm(s => ({ ...s, [f.key]: e.target.value }))} required />
            <button type="button" onClick={() => setShow(s => ({ ...s, [f.sk]: !s[f.sk] }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {show[f.sk] ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
      ))}
      <p className="text-xs text-gray-400">Min 8 chars — uppercase, lowercase, number, special character</p>
      {status && (
        <div className={`flex items-center gap-2 p-2 rounded-xl text-sm ${status.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {status.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}{status.msg}
        </div>
      )}
      <button type="submit" disabled={loading}
        className="w-full py-2 bg-[#0F2557] text-white rounded-xl font-semibold text-sm disabled:opacity-50">
        {loading ? 'Changing…' : 'Change Password'}
      </button>
    </form>
  )
}

function LogoutAll() {
  const go = async () => {
    if (!confirm('This will invalidate your current session. You will need to log in again.')) return
    try {
      await api.post('/auth/platform/logout')
    } catch {}
    sessionStorage.removeItem('admin_token')
    window.location.href = '/login'
  }
  return (
    <button onClick={go}
      className="w-full py-2 bg-red-50 border border-red-200 text-red-700 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-100">
      <LogOut size={14} />Log Out
    </button>
  )
}

export default function AccountSettings() {
  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-800">Account Settings</h1>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={16} className="text-[#0F2557]" />
          <h2 className="font-semibold text-gray-800">Change Password</h2>
        </div>
        <ChangePasswordForm />
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800 mb-3">Session</h2>
        <LogoutAll />
      </div>
    </div>
  )
}
