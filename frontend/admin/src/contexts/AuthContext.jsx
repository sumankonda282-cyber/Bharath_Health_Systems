import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../api'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

const TOKEN_KEY = 'admin_token'

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = sessionStorage.getItem(TOKEN_KEY)
    if (!token) { setLoading(false); return }
    authApi.me()
      .then(u => setUser(u))
      .catch(err => {
        if (err?.status === 401) sessionStorage.removeItem(TOKEN_KEY)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (identifier, password) => {
    const data = await authApi.login(identifier, password)
    sessionStorage.setItem(TOKEN_KEY, data.access_token)
    const me = await authApi.me()
    setUser(me)
  }

  const logout = () => {
    sessionStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}
