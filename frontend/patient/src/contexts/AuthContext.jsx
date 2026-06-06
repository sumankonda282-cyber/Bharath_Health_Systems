import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/client'
import { cacheClear } from '../utils/cache'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = sessionStorage.getItem('patient_token')
    if (!token) { setLoading(false); return }
    api.get('/portal/me')
      .then(r => setUser(r.data || r))
      .catch(err => { if (err?.response?.status === 401 || err?.status === 401) { sessionStorage.removeItem('patient_token'); sessionStorage.removeItem('bh_profile_id') } })
      .finally(() => setLoading(false))
  }, [])

  const loginWithToken = async (access_token, bh_profile_id) => {
    sessionStorage.setItem('patient_token', access_token)
    if (bh_profile_id) sessionStorage.setItem('bh_profile_id', String(bh_profile_id))
    const me = await api.get('/portal/me')
    setUser(me.data || me)
    return me.data || me
  }

  const logout = () => {
    sessionStorage.removeItem('patient_token')
    sessionStorage.removeItem('bh_profile_id')
    cacheClear()
    setUser(null)
  }

  return <Ctx.Provider value={{ user, loading, loginWithToken, logout }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
