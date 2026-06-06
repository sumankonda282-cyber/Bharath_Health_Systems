import { CheckCircle, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, EyeOff, AlertCircle, Stethoscope, Users, ShieldCheck, KeyRound } from 'lucide-react'
import BrandLogo from '../../components/BrandLogo'

const API = import.meta.env.VITE_API_URL ?? ''

const FEATURES = [
  { icon: Stethoscope, text: 'Clinical desk — queue, encounters & prescriptions' },
  { icon: Users,       text: 'Role-based access: Doctors & Nurses' },
  { icon: ShieldCheck, text: 'Secure, audited health records' },
]

export default function Login() {
  const [form, setForm]     = useState({ identifier: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError]   = useState('')
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

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleForgotPassword = () => {
    alert(
      'Password Reset\n\n' +
      'Please contact your clinic administrator or the BHaratCliniq super admin to reset your password.\n\n' +
      'Your new temporary password will be sent to your registered email and phone number.'
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.identifier, form.password, false)
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.')
      setLoading(false)
    }
  }

  if (mode === 'forgot') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-2xl font-extrabold" style={{ color: '#CC1414' }}>BHaratCliniq</div>
            <div className="text-sm mt-1 font-medium text-gray-500">Provider Portal</div>
          </div>
          <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
            {forgotSent ? (
              <div className="text-center space-y-4">
                <CheckCircle className="mx-auto" size={40} style={{ color: '#CC1414' }}/>
                <p className="text-sm text-gray-700">Your request has been sent to your clinic manager. They will provide a temporary password.</p>
                <button onClick={() => { setMode('login'); setForgotSent(false); setForgotForm({ identifier: '', note: '' }) }}
                  className="w-full py-2.5 text-white rounded-xl font-semibold"
                  style={{ background: '#CC1414' }}>Back to Login</button>
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
                    style={{ background: '#CC1414' }}>
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
    <div className="min-h-screen flex" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Left hero panel (desktop only) ─────────────────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-10 text-white relative overflow-hidden"
        style={{ background: '#0F2557' }}
      >
        {/* Decorative blobs */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: '320px', height: '320px', borderRadius: '50%',
          background: 'rgba(245,130,30,0.12)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', left: '-60px',
          width: '260px', height: '260px', borderRadius: '50%',
          background: 'rgba(204,20,20,0.10)',
        }} />

        {/* Logo */}
        <div className="relative">
          <BrandLogo size="md" light />
          <p className="text-xs font-semibold mt-2 tracking-widest uppercase" style={{ color: '#F5821E' }}>
            Doctor Portal
          </p>
        </div>

        {/* Hero copy */}
        <div className="relative">
          <h2 className="text-4xl font-extrabold leading-tight mb-4" style={{ letterSpacing: '-0.02em' }}>
            Your patients,<br />
            <span style={{ color: '#F5821E' }}>at your fingertips.</span>
          </h2>
          <p className="text-blue-200 text-base leading-relaxed mb-8">
            Clinical portal for doctors and nurses — patient queue,
            encounters, prescriptions and health records all in one place.
          </p>

          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
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
        </div>

        <p className="relative text-xs text-blue-400">
          BHaratCliniq · India's Digital Health Network
        </p>
      </div>

      {/* ── Right login panel ───────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white lg:bg-gray-50">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <BrandLogo size="lg" />
            <p className="text-xs font-semibold mt-1 tracking-widest uppercase" style={{ color: '#F5821E' }}>
              Doctor Portal
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">

            <h1 className="text-2xl font-extrabold mb-1" style={{ color: '#0F2557' }}>
              Welcome Back
            </h1>
            <p className="text-gray-500 text-sm mb-6">Sign in to your doctor portal</p>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

              {/* Identifier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Username, Email or Mobile
                </label>
                <input
                  type="text"
                  autoComplete="username"
                  autoFocus
                  required
                  placeholder="username, doctor@clinic.com or mobile"
                  value={form.identifier}
                  onChange={set('identifier')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent
                             transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <button type="button" onClick={handleForgotPassword}
                    className="text-xs flex items-center gap-1 hover:underline"
                    style={{ color: '#CC1414' }}>
                    <KeyRound size={11} /> Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    value={form.password}
                    onChange={set('password')}
                    className="w-full px-4 py-3 pr-11 border border-gray-300 rounded-xl text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent
                               transition-all"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error banner */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                           font-semibold text-sm text-white transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#CC1414' }}
                onMouseEnter={e => !loading && (e.currentTarget.style.background = '#a81010')}
                onMouseLeave={e => (e.currentTarget.style.background = '#CC1414')}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </>
                ) : 'Sign In'}
              </button>

            </form>
          </div>

          <p className="text-center mt-4" style={{ fontSize: '11px', color: '#9ca3af' }}>
            Clinic not yet registered?{' '}
            <a
              href={`${import.meta.env.VITE_PUBLIC_URL || 'https://bharatcliniq.com'}/register`}
              style={{ color: '#0F2557', textDecoration: 'underline' }}
            >
              Register your clinic
            </a>
          </p>

          <p className="text-center text-xs text-gray-400 mt-2">
            BHaratCliniq · Doctor Portal
          </p>
        </div>
      </div>

    </div>
  )
}
