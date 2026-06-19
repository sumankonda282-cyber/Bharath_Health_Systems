import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/client'
import { cacheClear } from '../utils/cache'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      const allowed = ['receptionist', 'clinic_admin', 'clinic_manager']
      api.get('/auth/staff/me')
        .then(u => {
          if (!allowed.includes(u?.role)) {
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
          } else {
            setUser(u)
          }
        })
        .catch(err => { const s = err?.status || err?.response?.status; if (s === 401 || s === 403) localStorage.removeItem('access_token') })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (identifier, password) => {
    const r = await api.post('/auth/staff/login', { identifier, password })
    const allowed = ['receptionist', 'clinic_admin', 'clinic_manager']
    if (!allowed.includes(r.role)) throw new Error('Access denied. This portal is for reception and management staff only.')
    localStorage.setItem('access_token', r.access_token)
    if (r.refresh_token) localStorage.setItem('refresh_token', r.refresh_token)
    if (r.clinic_id) localStorage.setItem('clinic_id', r.clinic_id)
    if (r.branch_id) localStorage.setItem('branch_id', r.branch_id)
    setUser(r)
    return r
  }

  const refreshUser = async () => {
    const me = await api.get('/auth/staff/me')
    setUser(me)
    return me
  }

  const logout = () => { localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token'); localStorage.removeItem('clinic_id'); localStorage.removeItem('branch_id'); cacheClear(); setUser(null); window.location.href = '/login' }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
