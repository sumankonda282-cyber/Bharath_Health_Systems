import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../api/client'
import { Eye, EyeOff, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react'

function Rule({ ok, label }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}>
      {ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
      {label}
    </div>
  )
}

export default function SetPassword() {
  const { user, logout, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [pw, setPw]           = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow]       = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const rules = {
    length:  pw.length >= 8,
    upper:   /[A-Z]/.test(pw),
    digit:   /[0-9]/.test(pw),
    special: /[!@#$%^&*()\-_=+\[\]{}|;:,.<>?]/.test(pw),
  }
  const allValid = Object.values(rules).every(Boolean)
  const matches  = pw === confirm && confirm.length > 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!allValid) return setError('Password does not meet all requirements')
    if (!matches)  return setError('Passwords do not match')
    setSaving(true)
    setError('')
    try {
      await api.post('/auth/staff/set-password', { new_password: pw })
      await refreshUser()
      navigate('/', { replace: true })
    } catch (err) {
      if (!err.status && err.message?.toLowerCase().includes('network')) {
        setError('Network error — the server may be waking up. Please wait 30 seconds and try again.')
      } else {
        setError(err.message || 'Failed to set password')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-700 mb-4">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Set Your Password</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Welcome, {user?.full_name}. Create a secure password to continue.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {user?.username && (
            <div className="mb-5 p-3 bg-blue-50 rounded-xl text-sm">
              <span className="text-gray-500">Your username: </span>
              <span className="font-mono font-semibold text-blue-700">{user.username}</span>
              <span className="text-gray-400 ml-2 text-xs">— save this for future logins</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  placeholder="Create a strong password"
                  value={pw}
                  onChange={e => { setPw(e.target.value); setError('') }}
                  autoFocus
                />
                <button type="button" onClick={() => setShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {pw.length > 0 && (
                <div className="mt-2 space-y-1">
                  <Rule ok={rules.length}  label="At least 8 characters" />
                  <Rule ok={rules.upper}   label="One uppercase letter" />
                  <Rule ok={rules.digit}   label="One number" />
                  <Rule ok={rules.special} label="One special character (!@#$...)" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${confirm.length > 0 && !matches ? 'border-red-400' : 'border-gray-300'}`}
                placeholder="Re-enter your password"
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setError('') }}
              />
              {confirm.length > 0 && !matches && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 rounded-xl text-sm text-red-700">{error}</div>
            )}

            <button
              type="submit"
              disabled={!allValid || !matches || saving}
              className="w-full bg-blue-700 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Setting password…' : 'Set Password & Continue'}
            </button>
          </form>

          <button onClick={logout} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-4">
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
