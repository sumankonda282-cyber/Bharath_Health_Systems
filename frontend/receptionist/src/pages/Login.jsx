import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import BrandLogo from '../components/BrandLogo'
import { Eye, EyeOff, AlertCircle, CalendarDays, Users, CreditCard, Settings, KeyRound, CheckCircle } from 'lucide-react'

const API = import.meta.env.VITE_API_URL ?? ''

const TABS = [
  { label: 'Receptionist', role: 'receptionist' },
  { label: 'Manager',      role: 'clinic_manager' },
]

export default function Login() {
  const [tab, setTab]         = useState(0)
  const [form, setForm]       = useState({ identifier: '', password: '' })
  const [showPw, setShowPw]   = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode]       = useState('login') // 'login' | 'forgot'
  const [forgotForm, setForgotForm] = useState({ identifier: '', note: '' })
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async e => {
    e.preventDefault(); setError(''); setLoading(true)
    try { await login(form.identifier, form.password) }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const switchTab = (i) => { setTab(i); setError(''); setForm({ identifier: '', password: '' }) }

  const handleForgotPassword = () => setMode('forgot')

  const submitForgot = async e => {
    e.preventDefault()
    setForgotLoading(true)
    try {
      await fetch(`${API}/api/v1/auth/staff/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(forgotForm),
      })
      setForgotSent(true)
    } finally {
      setForgotLoading(false)
    }
  }

  if (mode === 'forgot') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-6"><BrandLogo size="md" /></div>
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">
            {forgotSent ? (
              <div className="text-center space-y-4">
                <CheckCircle className="mx-auto text-green-600" size={40} />
                <p className="text-sm text-gray-700">Your request has been sent to your clinic manager. They will provide you with a temporary password.</p>
                <button onClick={() => { setMode('login'); setForgotSent(false); setForgotForm({ identifier: '', note: '' }) }}
                  className="w-full py-2.5 rounded-xl font-semibold text-white text-sm"
                  style={{ background: '#CC1414' }}>
                  Back to Login
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-extrabold mb-1" style={{ color: '#0F2557' }}>Forgot Password</h2>
                <p className="text-gray-500 text-sm mb-5">Your request will be sent to your clinic manager who will reset your password.</p>
                <form onSubmit={submitForgot} className="space-y-4">
                  <div>
                    <label className="label">Username / Mobile</label>
                    <input className="input" value={forgotForm.identifier}
                      onChange={e => setForgotForm(f => ({ ...f, identifier: e.target.value }))}
                      placeholder="Enter your username or mobile" required autoFocus />
                  </div>
                  <div>
                    <label className="label">Note (optional)</label>
                    <input className="input" value={forgotForm.note}
                      onChange={e => setForgotForm(f => ({ ...f, note: e.target.value }))}
                      placeholder="e.g. urgently needed for shift" />
                  </div>
                  <button type="submit" disabled={forgotLoading}
                    className="w-full py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
                    style={{ background: '#CC1414' }}>
                    {forgotLoading ? 'Sending…' : 'Send Request'}
                  </button>
                  <button type="button" onClick={() => setMode('login')}
                    className="w-full py-2 text-sm text-gray-500 hover:text-gray-700">
                    Back to Login
                  </button>
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
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-10 text-white"
        style={{ background: 'linear-gradient(145deg, #0F2557 0%, #1a3a7a 100%)' }}>
        <div>
          <BrandLogo size="md" light />
          <div className="text-xs font-semibold mt-2 tracking-wider uppercase" style={{ color: '#F5821E' }}>
            {tab === 0 ? 'Staff Portal' : 'Manager Portal'}
          </div>
        </div>
        <div>
          <h2 className="text-4xl font-extrabold leading-tight mb-4">
            {tab === 0 ? <>Front Desk,<br /></> : <>Clinic Ops,<br /></>}
            <span style={{ color: '#F5821E' }}>{tab === 0 ? 'Fully Digital.' : 'Fully in Control.'}</span>
          </h2>
          <p className="text-blue-200 text-lg mb-8">
            {tab === 0
              ? 'Manage walk-ins, schedule appointments, and collect payments — all in one place.'
              : 'Manage your clinic team, create staff accounts, and keep operations running smoothly.'}
          </p>
          {(tab === 0
            ? [
                { icon: CalendarDays, text: 'Book & manage daily appointments' },
                { icon: Users,        text: 'Register & search patients quickly' },
                { icon: CreditCard,   text: 'Collect payments & generate bills' },
              ]
            : [
                { icon: Users,      text: 'Create & manage all staff accounts' },
                { icon: Settings,   text: 'Control access for all roles' },
                { icon: CreditCard, text: 'Oversee billing and daily operations' },
              ]
          ).map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(245,130,30,0.2)' }}>
                <Icon size={16} style={{ color: '#F5821E' }} />
              </div>
              <span className="text-blue-100 text-sm">{text}</span>
            </div>
          ))}
        </div>
        <div className="text-xs" style={{ color: '#93c5fd' }}>
          BHaratCliniq · {tab === 0 ? 'Staff Portal' : 'Manager Portal'}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex justify-center mb-6 lg:hidden">
            <BrandLogo size="md" />
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">
            <h2 className="text-2xl font-extrabold mb-1" style={{ color: '#0F2557' }}>
              {tab === 0 ? 'Staff Sign In' : 'Manager Sign In'}
            </h2>
            <p className="text-gray-500 text-sm mb-5">
              {tab === 0 ? 'Front desk & staff access' : 'Clinic operations & staff management'}
            </p>

            {/* Tabs */}
            <div className="flex rounded-xl bg-gray-100 p-1 mb-6 text-sm gap-1">
              {TABS.map(({ label }, i) => (
                <button key={label} type="button" onClick={() => switchTab(i)}
                  className="flex-1 py-2 rounded-lg font-semibold transition-all"
                  style={tab === i
                    ? { background: '#fff', color: '#0F2557', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }
                    : { color: '#6b7280' }}>
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Username, Mobile or Email</label>
                <input className="input" placeholder="your@email.com or username"
                  value={form.identifier}
                  onChange={e => setForm(f => ({ ...f, identifier: e.target.value }))}
                  required autoFocus />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">Password</label>
                  <button type="button" onClick={handleForgotPassword}
                    className="text-xs flex items-center gap-1 hover:underline"
                    style={{ color: '#CC1414' }}>
                    <KeyRound size={11} /> Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input className="input pr-10" type={showPw ? 'text' : 'password'}
                    placeholder="••••••••" value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
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

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-colors flex items-center justify-center gap-2"
                style={{ background: '#CC1414' }}>
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in…</>
                  : `Sign In as ${TABS[tab].label}`}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
