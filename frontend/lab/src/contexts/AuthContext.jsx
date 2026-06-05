import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/client'
import { cacheClear } from '../utils/cache'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = sessionStorage.getItem('staff_token')
    if (!token) { setLoading(false); return }
    api.get('/auth/staff/me')
      .then(u => setUser(u))
      .catch(() => sessionStorage.clear())
      .finally(() => setLoading(false))
  }, [])

  const login = async (identifier, password) => {
    const r = await api.post('/auth/staff/login', { identifier, password })
    if (!['lab_tech', 'clinic_admin'].includes(r.role))
      throw new Error('Access denied. This portal is for lab staff only.')
    sessionStorage.setItem('staff_token', r.access_token)
    if (r.clinic_id) sessionStorage.setItem('clinic_id', String(r.clinic_id))
    if (r.branch_id) sessionStorage.setItem('branch_id', String(r.branch_id))
    const me = await api.get('/auth/staff/me')
    setUser(me)
  }

  const logout = () => { sessionStorage.clear(); cacheClear(); setUser(null); window.location.href = '/login' }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
