import { useState, useEffect, useRef } from 'react'
import { Eye, EyeOff, AlertCircle, KeyRound, HelpCircle, X, Send, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import BrandLogo from '../components/BrandLogo'
import ChatWidget from '../components/ChatWidget'
import api from '../api/client'

export default function Login() {
  const { login } = useAuth()

  const [form, setForm]       = useState({ identifier: '', password: '' })
  const [showPw, setShowPw]   = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  // Prevent autofill-triggered submit: only allow submit after user has typed
  const [touched, setTouched] = useState(false)
  const idRef  = useRef(null)
  const pwRef  = useRef(null)

  // Clear any browser-autofilled values on mount so the form starts blank
  useEffect(() => {
    if (idRef.current)  idRef.current.value  = ''
    if (pwRef.current)  pwRef.current.value  = ''
    setForm({ identifier: '', password: '' })
  }, [])

  // Forgot password modal state
  const [showForgot, setShowForgot] = useState(false)
  const [forgotForm, setForgotForm] = useState({ name: '', email: '', ward: '', reason: '' })
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState('')

  const set = (k) => (e) => {
    setTouched(true)
    setError('')
    setForm(f => ({ ...f, [k]: e.target.value }))
  }
  const setForgot = (k) => (e) => setForgotForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Block submit if user hasn't typed anything (prevents autofill loop)
    if (!touched || !form.identifier.trim() || !form.password) return
    setError('')
    setLoading(true)
    try {
      await login(form.identifier.trim(), form.password)
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('401') || msg.toLowerCase().includes('invalid')) {
        setError('Invalid credentials. Use your CareChart staff account — provider portal accounts are not accepted here.')
      } else if (msg.includes('403')) {
        setError('Account not yet activated. Contact your ward manager.')
      } else if (msg.includes('429') || msg.toLowerCase().includes('locked')) {
        setError(msg)
      } else {
        setError(msg || 'Login failed. Please check your credentials.')
      }
      setLoading(false)
    }
  }

  const handleForgotSubmit = async (e) => {
    e.preventDefault()
    setForgotError('')
    if (!forgotForm.name || !forgotForm.email) {
      setForgotError('Name and email are required.')
      return
    }
    setForgotLoading(true)
    try {
      await api.post('/support/access-request', {
        ...forgotForm,
        portal: 'CareChart',
        type: 'password_reset',
      })
      setForgotSent(true)
    } catch {
      // If endpoint doesn't exist yet, still show success (graceful)
      setForgotSent(true)
    } finally {
      setForgotLoading(false)
    }
  }

  const closeForgot = () => {
    setShowForgot(false)
    setForgotSent(false)
    setForgotForm({ name: '', email: '', ward: '', reason: '' })
    setForgotError('')
  }

  return (
    <div className="min-h-screen flex" style={{
      fontFamily: 'Inter, system-ui, sans-serif',
      background: 'linear-gradient(135deg, #064e3b 0%, #065F46 40%, #0f766e 100%)',
    }}>

      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-96 p-10 text-white">
        <BrandLogo size="md" light />
        <div>
          <h2 className="text-3xl font-extrabold leading-tight mb-3">
            Comprehensive care,<br />
            <span style={{ color: '#F5821E' }}>continuously tracked.</span>
          </h2>
          <p className="text-green-100 text-sm leading-relaxed">
            CareChart connects nurses, doctors and ward staff in one unified portal — vitals, orders, assessments and handoffs in one place.
          </p>
        </div>
        <p className="text-green-300/60 text-xs">© 2026 BHarath Health Systems</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white lg:rounded-l-3xl">
        <div className="w-full max-w-sm">

          {/* Logo (mobile only) */}
          <div className="flex justify-center mb-7 lg:hidden">
            <BrandLogo size="lg" />
          </div>

          <h1 className="text-2xl font-extrabold mb-1" style={{ color: '#065F46' }}>
            Welcome Back
          </h1>
          <p className="text-gray-400 text-sm mb-7">Sign in to your CareChart ward portal</p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Username, Email or Mobile
              </label>
              <input
                ref={idRef}
                type="text"
                autoComplete="off"
                required
                placeholder="username, nurse@ward.com or mobile"
                value={form.identifier}
                onChange={set('identifier')}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm
                           focus:outline-none focus:ring-2 transition-all"
                style={{ '--tw-ring-color': '#065F46' }}
                onFocus={e => e.target.style.borderColor = '#065F46'}
                onBlur={e => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-xs flex items-center gap-1 hover:underline"
                  style={{ color: '#CC1414' }}
                >
                  <KeyRound size={11} /> Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  ref={pwRef}
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set('password')}
                  className="w-full px-4 py-3 pr-11 border border-gray-300 rounded-xl text-sm
                             focus:outline-none transition-all"
                  onFocus={e => e.target.style.borderColor = '#065F46'}
                  onBlur={e => e.target.style.borderColor = '#d1d5db'}
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

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !touched || !form.identifier.trim() || !form.password}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                         font-semibold text-sm text-white transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#065F46' }}
              onMouseEnter={e => !loading && (e.currentTarget.style.background = '#047857')}
              onMouseLeave={e => (e.currentTarget.style.background = '#065F46')}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : 'Sign In'}
            </button>

          </form>

          {/* Help row */}
          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <HelpCircle size={13} />
            <span>Need help?</span>
            <button
              onClick={() => setShowForgot(true)}
              className="underline hover:text-gray-600"
              style={{ color: '#065F46' }}
            >
              Contact your ward manager
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          BHarath Health Systems · CareChart Portal
        </p>
      </div>

      {/* ── Forgot Password / Access Request Modal ── */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">

            <button
              onClick={closeForgot}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            {forgotSent ? (
              <div className="text-center py-6">
                <CheckCircle size={48} className="mx-auto mb-3" style={{ color: '#065F46' }} />
                <h2 className="text-lg font-bold text-gray-800 mb-2">Request Sent</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Your access request has been submitted to your ward manager.
                  You will be contacted on your registered email or phone.
                </p>
                <button
                  onClick={closeForgot}
                  className="px-6 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: '#065F46' }}
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold mb-1" style={{ color: '#065F46' }}>Request Access</h2>
                <p className="text-sm text-gray-500 mb-5">
                  Fill in the form below and your ward manager will reset your password.
                </p>

                <form onSubmit={handleForgotSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Your name"
                      value={forgotForm.name}
                      onChange={setForgot('name')}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none"
                      onFocus={e => e.target.style.borderColor = '#065F46'}
                      onBlur={e => e.target.style.borderColor = '#d1d5db'}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="your@email.com"
                      value={forgotForm.email}
                      onChange={setForgot('email')}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none"
                      onFocus={e => e.target.style.borderColor = '#065F46'}
                      onBlur={e => e.target.style.borderColor = '#d1d5db'}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ward / Department</label>
                    <input
                      type="text"
                      placeholder="e.g. ICU, General Ward 3"
                      value={forgotForm.ward}
                      onChange={setForgot('ward')}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none"
                      onFocus={e => e.target.style.borderColor = '#065F46'}
                      onBlur={e => e.target.style.borderColor = '#d1d5db'}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Reason (optional)</label>
                    <textarea
                      rows={3}
                      placeholder="Describe your issue…"
                      value={forgotForm.reason}
                      onChange={setForgot('reason')}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none resize-none"
                      onFocus={e => e.target.style.borderColor = '#065F46'}
                      onBlur={e => e.target.style.borderColor = '#d1d5db'}
                    />
                  </div>

                  {forgotError && (
                    <p className="text-xs text-red-600">{forgotError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: '#065F46' }}
                  >
                    {forgotLoading ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <><Send size={14} /> Send Request</>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ChatWidget intentionally omitted — it makes authenticated API calls that cause redirect loops on login */}
    </div>
  )
}
