import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import { ShieldCheck, Loader2 } from 'lucide-react'

export default function Login() {
  const { user, login } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword]     = useState('')
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

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 mb-4">
            <ShieldCheck size={28} className="text-indigo-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">BharatCliniq</h1>
          <p className="text-indigo-400 text-sm font-semibold tracking-widest uppercase mt-1">Super Admin Portal</p>
        </div>
        <form onSubmit={submit} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Username or Email</label>
            <input className="input" type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} required placeholder="username or admin@bharatcliniq.com" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Password</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p className="text-center text-gray-600 text-xs mt-4">Access restricted to authorised administrators only</p>
      </div>
    </div>
  )
}
