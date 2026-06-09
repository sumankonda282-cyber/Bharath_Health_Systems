import { useState, useEffect } from 'react'
import { adminApi } from '../api'
import { UserPlus, ShieldCheck, ShieldOff, Loader2, X, AlertCircle, CheckCircle2, Copy } from 'lucide-react'

function Badge({ active }) {
  return active
    ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-900/50 text-green-400 border border-green-700/40">Active</span>
    : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-900/30 text-red-400 border border-red-700/30">Inactive</span>
}

function CreateModal({ onClose, onCreated }) {
  const [form, setForm]     = useState({ full_name: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)

  const submit = async e => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const res = await adminApi.createAdmin(form)
      setResult(res)
      onCreated(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const copyPw = () => {
    navigator.clipboard.writeText(result.temp_password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={result ? onClose : undefined} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <UserPlus size={18} style={{ color: '#F5821E' }} />
            <span className="font-bold text-white">{result ? 'Admin Created' : 'Add Platform Admin'}</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>

        {!result ? (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" placeholder="e.g. Rahul Sharma" required
                value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="rahul@company.com" required
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm p-3 rounded-xl"
                style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)' }}>
                <AlertCircle size={14} />{error}
              </div>
            )}
            <p className="text-xs text-gray-500">A temporary password will be generated. Share it securely — it shows only once.</p>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2 rounded-xl border border-gray-700 text-sm text-gray-400 hover:bg-gray-800">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: '#0F2557' }}>
                {saving ? <><Loader2 size={14} className="animate-spin" />Creating…</> : 'Create Admin'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-400 text-sm p-3 rounded-xl"
              style={{ background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.2)' }}>
              <CheckCircle2 size={16} />{result.message}
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Email</div>
              <div className="text-white text-sm font-mono bg-gray-800 rounded-lg px-3 py-2">{result.email}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Temporary Password <span className="text-yellow-500">(shown once — copy now)</span></div>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-white text-sm font-mono bg-gray-800 rounded-lg px-3 py-2 tracking-wider">{result.temp_password}</div>
                <button onClick={copyPw}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                  title="Copy password">
                  {copied ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500">The admin will need to use 2FA (OTP) on first login. They can change their password from Account Settings.</p>
            <button onClick={onClose}
              className="w-full py-2 rounded-xl text-white text-sm font-semibold"
              style={{ background: '#0F2557' }}>Done</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TeamAdmins() {
  const [admins, setAdmins]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [toggling, setToggling] = useState(null)

  const load = () => {
    setLoading(true)
    adminApi.listAdmins()
      .then(setAdmins)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleToggle = async (id) => {
    setToggling(id)
    try {
      const res = await adminApi.toggleAdmin(id)
      setAdmins(prev => prev.map(a => a.id === id ? { ...a, is_active: res.is_active } : a))
    } catch (err) {
      alert(err.message)
    } finally {
      setToggling(null)
    }
  }

  return (
    <div>
      {showAdd && (
        <CreateModal
          onClose={() => setShowAdd(false)}
          onCreated={() => { load() }}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Platform Admin Team</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage who has super admin access to this platform.</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
          style={{ background: '#0F2557' }}>
          <UserPlus size={15} />Add Admin
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {admins.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'rgba(245,130,30,0.15)', color: '#F5821E' }}>
                        {a.full_name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{a.full_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 font-mono text-xs">{a.email}</td>
                  <td className="px-5 py-3.5"><Badge active={a.is_active} /></td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs">
                    {a.created_at ? new Date(a.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => handleToggle(a.id)}
                      disabled={toggling === a.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                      style={a.is_active
                        ? { background: 'rgba(220,38,38,0.08)', color: '#dc2626' }
                        : { background: 'rgba(5,150,105,0.08)', color: '#059669' }}
                    >
                      {toggling === a.id
                        ? <Loader2 size={12} className="animate-spin" />
                        : a.is_active
                          ? <><ShieldOff size={13} />Deactivate</>
                          : <><ShieldCheck size={13} />Activate</>}
                    </button>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-gray-400 text-sm">No admins found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
