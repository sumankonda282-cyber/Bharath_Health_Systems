import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import { ShieldCheck, Loader2, Building2, BarChart3, ClipboardList, Eye, EyeOff, AlertCircle, Mail, KeyRound } from 'lucide-react'

export default function Login() {
  const { user, login, verifyOtp } = useAuth()
  const [step, setStep]             = useState('password') // 'password' | 'otp'
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword]     = useState('')
  const [otp, setOtp]               = useState('')
  const [devOtp, setDevOtp]         = useState('')
  const [showPw, setShowPw]         = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  if (user) return <Navigate to="/dashboard" replace />

  const submitPassword = async e => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await login(identifier, password)
      if (res?.requires_otp) {
        setDevOtp(res.dev_otp || '')
        setStep('otp')
      }
    } catch (ex) {
      setError(ex.message)
    } finally {
      setLoading(false)
    }
  }

  const submitOtp = async e => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await verifyOtp(identifier, otp)
    } catch (ex) {
      setError(ex.message)
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: Building2,     text: 'Manage all clinics and their subscriptions' },
    { icon: ShieldCheck,   text: 'Approve staff verification requests' },
    { icon: BarChart3,     text: 'View platform-wide reports and MRR' },
    { icon: ClipboardList, text: 'Full audit log across all operations' },
  ]

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Left branded panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-10 text-white"
        style={{ background: 'linear-gradient(145deg, #0F2557 0%, #1a3a7a 100%)' }}
      >
        <div>
          <div className="text-2xl font-extrabold tracking-tight">BHarath Health Systems</div>
          <div className="text-xs font-semibold mt-1 tracking-widest uppercase" style={{ color: '#F5821E' }}>
            Super Admin Portal
          </div>
        </div>
        <div>
          <h2 className="text-4xl font-extrabold leading-tight mb-4">
            Platform Control,<br />
            <span style={{ color: '#F5821E' }}>At Your Fingertips.</span>
          </h2>
          <p className="text-blue-200 text-lg mb-8">
            Oversee every clinic, subscription, and staff member across the BHarath Health Systems network.
          </p>
          {features.map(({ icon: Icon, text }) => (
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
        <div className="text-xs" style={{ color: '#93c5fd' }}>
          BHarath Health Systems · Super Admin Portal · Restricted Access
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6" style={{ background: '#0f172a' }}>
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
              style={{ background: 'rgba(15,37,87,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <ShieldCheck size={28} style={{ color: '#F5821E' }} />
            </div>
            <div className="text-xl font-extrabold text-white">BHarath Health Systems</div>
            <div className="text-xs font-semibold tracking-widest uppercase mt-1" style={{ color: '#F5821E' }}>
              Super Admin Portal
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            {/* Step indicator */}
            <div className="hidden lg:flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(245,130,30,0.15)' }}>
                {step === 'password' ? <ShieldCheck size={20} style={{ color: '#F5821E' }} /> : <KeyRound size={20} style={{ color: '#F5821E' }} />}
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white leading-none">
                  {step === 'password' ? 'Admin Sign In' : 'Verify Identity'}
                </h2>
                <p className="text-gray-500 text-xs mt-0.5">
                  {step === 'password' ? 'Step 1 of 2 · Enter your credentials' : `Step 2 of 2 · OTP sent to ${identifier}`}
                </p>
              </div>
            </div>

            {/* Step 1: Password */}
            {step === 'password' && (
              <form onSubmit={submitPassword} className="space-y-4">
                <div>
                  <label className="label">Email</label>
                  <input
                    className="input"
                    type="email"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    required
                    autoFocus
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <input
                      className="input pr-10"
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-xl text-red-400 text-sm"
                    style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)' }}>
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-colors flex items-center justify-center gap-2"
                  style={{ background: '#0F2557' }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#0a1a3e' }}
                  onMouseLeave={e => e.currentTarget.style.background = '#0F2557'}
                >
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" />Verifying…</>
                    : <><ShieldCheck size={16} />Continue</>}
                </button>
              </form>
            )}

            {/* Step 2: OTP */}
            {step === 'otp' && (
              <form onSubmit={submitOtp} className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl mb-2"
                  style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <Mail size={16} className="text-blue-400 flex-shrink-0" />
                  <span className="text-blue-300 text-xs">A 6-digit OTP has been sent to <strong>{identifier}</strong>. Valid for 10 minutes.</span>
                </div>

                {devOtp && (
                  <div className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)' }}>
                    <span className="text-yellow-400 text-xs font-mono">Dev mode OTP: <strong className="text-lg tracking-widest">{devOtp}</strong></span>
                  </div>
                )}

                <div>
                  <label className="label">6-Digit OTP</label>
                  <input
                    className="input text-center text-2xl tracking-[0.5em] font-mono"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                    placeholder="······"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-xl text-red-400 text-sm"
                    style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)' }}>
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: '#065F46' }}
                >
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" />Verifying…</>
                    : <><ShieldCheck size={16} />Verify & Sign In</>}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('password'); setOtp(''); setError(''); setDevOtp('') }}
                  className="w-full text-xs text-gray-500 hover:text-gray-300 py-1"
                >
                  ← Back to login
                </button>
              </form>
            )}
          </div>
          <p className="text-center text-gray-600 text-xs mt-4">
            Access restricted to authorised BHarath Health Systems administrators only
          </p>
        </div>
      </div>
    </div>
  )
}
