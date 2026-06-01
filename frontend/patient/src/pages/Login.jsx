import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, AlertCircle, Heart, Shield, FileText } from 'lucide-react'
import BrandLogo from '../components/BrandLogo'

export default function Login() {
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.identifier, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Left hero panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-10 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0F2557 0%, #1a3a7a 100%)' }}
      >
        <div style={{ position:'absolute', top:'-80px', right:'-80px', width:'320px', height:'320px', borderRadius:'50%', background:'rgba(204,20,20,0.08)' }} />
        <div style={{ position:'absolute', bottom:'-60px', left:'-60px', width:'260px', height:'260px', borderRadius:'50%', background:'rgba(245,130,30,0.08)' }} />

        <div className="relative">
          <BrandLogo size="md" />
          <div className="text-xs font-semibold mt-2 tracking-wider uppercase" style={{ color: '#F5821E' }}>
            Patient Portal
          </div>
        </div>

        <div className="relative">
          <h2 className="text-4xl font-extrabold leading-tight mb-4" style={{ letterSpacing: '-0.02em' }}>
            Your health records,<br />
            <span style={{ color: '#F5821E' }}>always with you.</span>
          </h2>
          <p className="text-blue-200 text-lg leading-relaxed mb-8">
            Access your appointments, prescriptions, lab results, and bills — from any device, any time.
          </p>
          <div className="space-y-4">
            {[
              { icon: Heart,    text: 'Complete health history in one place' },
              { icon: FileText, text: 'View & download prescriptions digitally' },
              { icon: Shield,   text: 'Secured with your BHID health identity' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(245,130,30,0.2)' }}>
                  <Icon size={16} style={{ color: '#F5821E' }} />
                </div>
                <span className="text-blue-100 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs" style={{ color: '#93c5fd' }}>
          BHaratCliniq · India's Digital Health Network
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white lg:bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <BrandLogo size="lg" />
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">
            <h2 className="text-2xl font-extrabold mb-1" style={{ color: '#0F2557' }}>Welcome Back</h2>
            <p className="text-gray-500 text-sm mb-6">Sign in to access your health records</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile or Email</label>
                <input
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                  placeholder="9876543210 or patient@email.com"
                  value={form.identifier}
                  onChange={e => setForm(f => ({ ...f, identifier: e.target.value }))}
                  required autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required
                  />
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

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#CC1414' }}
                onMouseEnter={e => !loading && (e.currentTarget.style.background = '#b01010')}
                onMouseLeave={e => e.currentTarget.style.background = '#CC1414'}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </>
                ) : 'Access My Health Records'}
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-6">
              Don't have an account? Ask your clinic to register you on BHaratCliniq.
            </p>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            BHaratCliniq · Patient Portal
          </p>
        </div>
      </div>
    </div>
  )
}
