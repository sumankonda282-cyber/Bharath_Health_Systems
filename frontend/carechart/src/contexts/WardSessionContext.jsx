import { createContext, useContext, useState } from 'react'

const WardSessionContext = createContext(null)

const SS_KEY = 'carechart_session'

function loadSession() {
  try { return JSON.parse(sessionStorage.getItem(SS_KEY)) || null } catch { return null }
}

function saveSession(data) {
  sessionStorage.setItem(SS_KEY, JSON.stringify(data))
}

export function WardSessionProvider({ children }) {
  const [session, setSession] = useState(loadSession)

  const enterWard = (hospital, department, ward) => {
    const s = { hospital, department, ward, enteredAt: Date.now() }
    saveSession(s)
    setSession(s)
  }

  const clearSession = () => {
    sessionStorage.removeItem(SS_KEY)
    setSession(null)
  }

  return (
    <WardSessionContext.Provider value={{ session, enterWard, clearSession }}>
      {children}
    </WardSessionContext.Provider>
  )
}

export const useWardSession = () => useContext(WardSessionContext)
