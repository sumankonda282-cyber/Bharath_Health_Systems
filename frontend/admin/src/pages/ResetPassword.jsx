import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ShieldCheck, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import BrandLogo from '../components/BrandLogo'
import api from '../api/client'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token')

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [message, setMessage]   = useState('')
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)

  const handleForgot = async e => {
    e.preventDefault()
    setLoading(true); setError(''); setMessage('')
    try {
      // Use a 90s timeout — the Render backend may need up to ~50s to wake from sleep
      await api.post('/auth/platform/forgot-password', { email }, { timeout: 90000 })
      setMessage('Reset link sent — check your inbox (and spam folder).')
    } catch (ex) {
      if (ex.message === 'Network Error' || ex.code === 'ECONNABORTED') {
        setError('The server is taking too long to respond. Please wait 30 seconds and try again.')
      } else {
        setError(ex.message || 'Something went wrong.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async e => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return }
    setLoading(true); setError('')
    try {
      await api.post('/auth/platform/reset-password', { token, new_password: password })
      setDone(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (ex) {
      setError(ex.message || 'Invalid or expired link.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0f172a', fontFamily: 'Inter, sans-serif' }}>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <BrandLogo size="md" />
          <div className="text-xs font-semibold tracking-widest uppercase mt-2" style={{ color: '#F5821E' }}>
            Super Admin Portal
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,130,30,0.15)' }}>
              <ShieldCheck size={20} style={{ color: '#F5821E' }} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white leading-none">
                {token ? 'Set New Password' : 'Forgot Password'}
              </h2>
              <p className="text-gray-500 text-xs mt-0.5">
                {token ? 'Enter your new password below' : 'We\'ll email you a reset link'}
              </p>
            </div>
          </div>

          {done ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 size={40} style={{ color: '#065F46' }} />
              <p className="text-white font-semibold">Password updated!</p>
              <p className="text-gray-400 text-sm">Redirecting to login…</p>
            </div>
          ) : token ? (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="label">New Password</label>
                <div className="relative">
                  <input
                    className="input pr-10"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required minLength={8}
                    placeholder="Min. 8 characters"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input
                  className="input"
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  placeholder="Repeat password"
                />
              </div>
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl text-red-400 text-sm"
                  style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)' }}>
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /><span>{error}</span>
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2"
                style={{ background: '#0F2557' }}>
                {loading ? <><Loader2 size={16} className="animate-spin" />Updating…</> : 'Set New Password'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="label">Admin Email</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="admin@bharathhealthsystems.com"
                />
              </div>
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl text-red-400 text-sm"
                  style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)' }}>
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /><span>{error}</span>
                </div>
              )}
              {message && (
                <div className="flex items-start gap-2 p-3 rounded-xl text-green-400 text-sm"
                  style={{ background: 'rgba(6,95,70,0.15)', border: '1px solid rgba(6,95,70,0.3)' }}>
                  <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" /><span>{message}</span>
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2"
                style={{ background: '#0F2557' }}>
                {loading ? <><Loader2 size={16} className="animate-spin" />Sending… (may take up to 60s)</> : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-4">
          <button onClick={() => navigate('/login')} className="text-gray-500 text-xs hover:text-gray-300 transition-colors">
            ← Back to Sign In
          </button>
        </p>
      </div>
    </div>
  )
}
