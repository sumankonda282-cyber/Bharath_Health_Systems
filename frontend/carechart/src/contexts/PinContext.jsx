import { createContext, useContext, useState, useCallback } from 'react'
import { Lock, X, CheckCircle, Loader2 } from 'lucide-react'
import api from '../api/client'

const PinContext = createContext(null)
const GREEN = '#065F46'

export function PinProvider({ children }) {
  const [pending, setPending] = useState(null)
  const [pin, setPin]         = useState('')
  const [found, setFound]     = useState(null)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const requestPin = useCallback((label = 'Confirm action') => {
    return new Promise(resolve => {
      setPin('')
      setFound(null)
      setError('')
      setPending({ resolve, label })
    })
  }, [])

  const autoLookup = async (pinValue) => {
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/staff/pin-identify', { pin: pinValue })
      if (res?.staff_id || res?.verified) {
        setFound({ staff_id: res.staff_id, full_name: res.full_name, role: res.role || res.credentials || '' })
      } else {
        setError('PIN not recognised — try again')
        setPin('')
      }
    } catch {
      setError('PIN not recognised — try again')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  const handlePinChange = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 4)
    setPin(digits)
    setError('')
    if (digits.length === 4) autoLookup(digits)
  }

  const confirmFound = () => {
    pending.resolve({ verified: true, staff_id: found.staff_id, full_name: found.full_name })
    setPending(null)
    setPin('')
    setFound(null)
  }

  const cancel = () => {
    pending?.resolve(null)
    setPending(null)
    setPin('')
    setFound(null)
    setError('')
  }

  return (
    <PinContext.Provider value={{ requestPin }}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-green-800" />
                <span className="text-sm font-bold text-gray-800">{pending.label}</span>
              </div>
              <button onClick={cancel}><X size={16} className="text-gray-400" /></button>
            </div>

            {!found ? (
              <div className="flex flex-col items-center gap-4">
                <p className="text-xs text-gray-500">Enter your 4-digit PIN</p>

                <label htmlFor="pin-input" className="flex gap-3 justify-center cursor-text">
                  {[0,1,2,3].map(i => (
                    <div key={i} className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-2xl transition-all select-none ${
                      pin.length > i
                        ? 'border-green-600 bg-green-50'
                        : pin.length === i
                        ? 'border-green-400 bg-white shadow-sm'
                        : 'border-gray-200 bg-gray-50'
                    }`}>
                      {pin.length > i ? '●' : ''}
                    </div>
                  ))}
                </label>

                <input
                  id="pin-input"
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={e => handlePinChange(e.target.value)}
                  maxLength={4}
                  autoFocus
                  className="sr-only"
                />

                {loading && <Loader2 size={20} className="animate-spin text-green-700" />}
                {error && <p className="text-xs text-red-600 text-center">{error}</p>}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
                  style={{ background: GREEN }}>
                  {found.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-gray-800">{found.full_name}</p>
                  {found.role && (
                    <p className="text-sm text-gray-500 capitalize mt-0.5">
                      {found.role.replace(/_/g, ' ')}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => { setFound(null); setPin('') }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                    Wrong person?
                  </button>
                  <button
                    onClick={confirmFound}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                    style={{ background: GREEN }}>
                    <CheckCircle size={14} /> Confirm
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </PinContext.Provider>
  )
}

export const usePin = () => useContext(PinContext)
