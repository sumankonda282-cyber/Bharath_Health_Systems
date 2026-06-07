import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, AlertCircle, Pill, Package, CheckCircle, KeyRound } from 'lucide-react'

const API = import.meta.env.VITE_API_URL ?? ''

const FEATURES = [
  { icon: Pill,        text: 'View and dispense pending prescriptions' },
  { icon: Package,     text: 'Manage medicine inventory and stock levels' },
  { icon: CheckCircle, text: 'Track full dispensing history and reports' },
]

export default function Login() {
  const [form, setForm]       = useState({ identifier: '', password: '' })
  const [showPw, setShowPw]   = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const [mode, setMode]             = useState('login')
  const [forgotForm, setForgotForm] = useState({ identifier: '', note: '' })
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)

  const submitForgot = async e => {
    e.preventDefault(); setForgotLoading(true)
    try {
      await fetch(`${API}/api/v1/auth/staff/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(forgotForm),
      })
      setForgotSent(true)
    } finally { setForgotLoading(false) }
  }

  const submit = async e => {
    e.preventDefault(); setError(''); setLoading(true)
    try { await login(form.identifier, form.password) }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  if (mode === 'forgot') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-2xl font-extrabold" style={{ color: '#138808' }}>BHarath Health Systems</div>
            <div className="text-sm mt-1 font-medium text-gray-500">Pharmacy</div>
          </div>
          <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
            {forgotSent ? (
              <div className="text-center space-y-4">
                <CheckCircle className="mx-auto" size={40} style={{ color: '#138808' }}/>
                <p className="text-sm text-gray-700">Your request has been sent to your clinic manager. They will provide a temporary password.</p>
                <button onClick={() => { setMode('login'); setForgotSent(false); setForgotForm({ identifier: '', note: '' }) }}
                  className="w-full py-2.5 text-white rounded-xl font-semibold"
                  style={{ background: '#138808' }}>Back to Login</button>
              </div>
            ) : (
              <>
                <h2 className="font-semibold text-gray-800">Forgot Password</h2>
                <p className="text-xs text-gray-500">Your request goes to your clinic manager who will reset your password.</p>
                <form onSubmit={submitForgot} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Username / Mobile</label>
                    <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                      value={forgotForm.identifier}
                      onChange={e => setForgotForm(f => ({ ...f, identifier: e.target.value }))}
                      placeholder="Enter your username or mobile" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Note (optional)</label>
                    <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                      value={forgotForm.note}
                      onChange={e => setForgotForm(f => ({ ...f, note: e.target.value }))}
                      placeholder="e.g. urgently needed for night shift" />
                  </div>
                  <button type="submit" disabled={forgotLoading}
                    className="w-full py-2.5 text-white rounded-xl font-semibold disabled:opacity-50"
                    style={{ background: '#138808' }}>
                    {forgotLoading ? 'Sending…' : 'Send Request'}
                  </button>
                  <button type="button" onClick={() => setMode('login')}
                    className="w-full py-2 text-gray-500 text-sm hover:underline">Back to Login</button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Left branded panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-10 text-white"
        style={{ background: 'linear-gradient(145deg, #0F2557 0%, #1a3a7a 100%)' }}
      >
        <div>
          <div className="text-2xl font-extrabold tracking-tight">BHarath Health Systems</div>
          <div className="text-xs font-semibold mt-1 tracking-wider uppercase" style={{ color: '#F5821E' }}>
            Pharmacy Portal
          </div>
        </div>
        <div>
          <h2 className="text-4xl font-extrabold leading-tight mb-4">
            Dispense Smarter,<br />
            <span style={{ color: '#F5821E' }}>Serve Faster.</span>
          </h2>
          <p className="text-blue-200 text-lg mb-8">
            View prescriptions, manage stock levels, and dispense medicines with a single click.
          </p>
          {FEATURES.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(245,130,30,0.2)' }}
              >
                <Icon size={16} style={{ color: '#F5821E' }} />
              </div>
              <span className="text-blue-100 text-sm">{text}</span>
            </div>
          ))}
        </div>
        <div className="text-xs" style={{ color: '#93c5fd' }}>BHarath Health Systems · Pharmacy Portal</div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="lg:hidden text-center mb-8">
            <div className="text-2xl font-extrabold" style={{ color: '#0F2557' }}>BHarath Health Systems</div>
            <div className="text-xs font-semibold tracking-wider uppercase mt-1" style={{ color: '#F5821E' }}>
              Pharmacy Portal
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">
            <h2 className="text-2xl font-extrabold mb-1" style={{ color: '#0F2557' }}>Pharmacy Sign In</h2>
            <p className="text-gray-500 text-sm mb-6">Pharmacist access only</p>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label">Username, Mobile or Email</label>
                <input
                  className="input"
                  placeholder="username, mobile or email"
                  value={form.identifier}
                  onChange={e => setForm(f => ({ ...f, identifier: e.target.value }))}
                  required
                  autoFocus
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">Password</label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-xs flex items-center gap-1 hover:underline"
                    style={{ color: '#CC1414' }}
                  >
                    <KeyRound size={11} /> Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    className="input pr-10"
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-colors flex items-center justify-center gap-2"
                style={{ background: '#0F2557' }}
              >
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in…</>
                  : 'Sign In to Pharmacy'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
