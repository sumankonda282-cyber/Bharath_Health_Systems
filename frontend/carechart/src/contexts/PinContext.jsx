import { createContext, useContext, useState, useCallback } from 'react'
import { Lock, X, Loader2 } from 'lucide-react'
import api from '../api/client'

const PinContext = createContext(null)

export function PinProvider({ children }) {
  const [pending, setPending]   = useState(null) // { resolve, label }
  const [pin, setPin]           = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const requestPin = useCallback((label = 'Confirm action') => {
    return new Promise(resolve => {
      setPin('')
      setError('')
      setPending({ resolve, label })
    })
  }, [])

  const submit = async () => {
    if (!pin) return
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/staff/pin-identify', { pin })
      if (res?.staff_id || res?.verified) {
        pending.resolve({ verified: true, staff_id: res.staff_id, full_name: res.full_name })
        setPending(null)
      } else {
        setError('Invalid PIN')
      }
    } catch {
      setError('Invalid PIN')
    } finally {
      setLoading(false)
    }
  }

  const cancel = () => {
    pending?.resolve(null)
    setPending(null)
    setPin('')
    setError('')
  }

  return (
    <PinContext.Provider value={{ requestPin }}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-green-800" />
                <span className="text-sm font-bold text-gray-800">{pending.label}</span>
              </div>
              <button onClick={cancel}><X size={16} className="text-gray-400" /></button>
            </div>
            <input
              type="password"
              value={pin}
              onChange={e => { setPin(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Enter PIN"
              maxLength={6}
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-green-700 mb-3"
            />
            {error && <p className="text-xs text-red-600 text-center mb-3">{error}</p>}
            <button
              onClick={submit}
              disabled={!pin || loading}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: '#065F46' }}
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
              Confirm
            </button>
          </div>
        </div>
      )}
    </PinContext.Provider>
  )
}

export const usePin = () => useContext(PinContext)
