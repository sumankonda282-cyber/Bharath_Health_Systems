import { createContext, useContext, useState, useCallback } from 'react'
import api from '../api/client'

const TelehealthContext = createContext(null)

export function TelehealthProvider({ children }) {
  const [activeCall, setActiveCall] = useState(null)
  // activeCall: { url, token, provider, appointmentId, appt, windowEndsAt }

  const startCall = useCallback((callData) => setActiveCall(callData), [])

  const endCall = useCallback(async (rejoinMins = 0) => {
    if (!activeCall) return
    try {
      await api.post(`/telehealth/appointments/${activeCall.appointmentId}/complete`, {
        allow_rejoin_minutes: rejoinMins || undefined,
      })
    } catch {
      // Best-effort — still close widget
    } finally {
      setActiveCall(null)
    }
  }, [activeCall])

  const dismissCall = useCallback(() => setActiveCall(null), [])

  return (
    <TelehealthContext.Provider value={{ activeCall, startCall, endCall, dismissCall }}>
      {children}
    </TelehealthContext.Provider>
  )
}

export const useTelehealth = () => useContext(TelehealthContext)
