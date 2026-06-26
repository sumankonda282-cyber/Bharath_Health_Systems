import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import { ShieldCheck, Loader2, Building2, BarChart3, ClipboardList, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react'
import BrandLogo from '../components/BrandLogo'

export default function Login() {
  const { user, login } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword]     = useState('')
  const [showPw, setShowPw]         = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  if (user) return <Navigate to="/dashboard" replace />

  const submit = async e => {
    e.preventDefault()
    setLoading(true); setError('')
    try { await login(identifier, password) }
    catch (ex) { setError(ex.message) }
    finally { setLoading(false) }
  }

  const features = [
    { icon: Building2,     text: 'Manage all health centers and subscriptions' },
    { icon: ShieldCheck,   text: 'Approve staff verification requests' },
    { icon: BarChart3,     text: 'Platform-wide reports and MRR' },
    { icon: ClipboardList, text: 'Full audit log across all operations' },
  ]

  return (
    <div className="min-h-screen flex bg-canvas" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Left branded panel */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-1/2 flex-col justify-between p-12 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #0B1C44 0%, #0F2557 55%, #15347a 100%)' }}>
        {/* ambient glows */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(245,130,30,0.22), transparent 70%)' }} />
        <div className="pointer-events-none absolute -bottom-32 -left-20 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.18), transparent 70%)' }} />

        <div className="relative">
          <BrandLogo size="md" tone="light" />
          <div className="text-[11px] font-bold mt-3 tracking-[0.2em] uppercase" style={{ color: '#F5821E' }}>
            Super Admin Portal
          </div>
        </div>

        <div className="relative animate-fade-up">
          <h2 className="text-[2.7rem] font-extrabold leading-[1.08] mb-5 tracking-tight">
            Every health center,<br />
            <span style={{ color: '#F5821E' }}>one console.</span>
          </h2>
          <p className="text-blue-100/80 text-lg mb-9 max-w-md leading-relaxed">
            Oversee every health center, subscription and staff member across the BHarath Health network.
          </p>
          <div className="space-y-3">
            {features.map(({ icon: Icon, text }, i) => (
              <div key={text} className="flex items-center gap-3.5 animate-fade-up" style={{ animationDelay: `${180 + i * 90}ms` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-white/10"
                  style={{ background: 'rgba(245,130,30,0.16)' }}>
                  <Icon size={17} style={{ color: '#F5821E' }} />
                </div>
                <span className="text-blue-50/90 text-[15px]">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs tracking-wide" style={{ color: 'rgba(147,197,253,0.7)' }}>
          BHarath Health · Super Admin Portal · Restricted Access
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <BrandLogo size="md" tone="dark" />
            <div className="text-[11px] font-bold tracking-[0.2em] uppercase mt-2" style={{ color: '#E06D0A' }}>
              Super Admin Portal
            </div>
          </div>

          <div className="bg-white border border-line rounded-3xl shadow-pop p-8 animate-scale-in">
            <div className="flex items-center gap-3 mb-7">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-navy-50">
                <ShieldCheck size={22} style={{ color: '#0F2557' }} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-ink leading-none tracking-tight">Admin Sign In</h2>
                <p className="text-ink-muted text-xs mt-1">Restricted to authorised administrators</p>
              </div>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label">Username or Email</label>
                <input
                  className="input"
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  required
                  autoFocus
                  placeholder="admin@bharathhealthsystems.com"
                />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    className="input pr-11"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-soft"
                  >
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl text-red-700 text-sm bg-red-50 ring-1 ring-inset ring-red-600/15">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-end -mt-1">
                <a href="/reset-password" className="text-xs font-semibold text-navy-600 hover:text-navy-700">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-[15px] group"
              >
                {loading
                  ? <><Loader2 size={17} className="animate-spin" />Signing in…</>
                  : <><ShieldCheck size={17} />Sign In to Admin<ArrowRight size={16} className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" /></>}
              </button>
            </form>
          </div>
          <p className="text-center text-ink-muted text-xs mt-5">
            Access restricted to authorised BHarath Health administrators only
          </p>
        </div>
      </div>
    </div>
  )
}
