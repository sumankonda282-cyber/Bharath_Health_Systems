import axios from 'axios'

const API_BASE = (import.meta.env.VITE_API_URL || 'https://bharatcliniq-api.onrender.com').replace(/\/$/, '')

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let _refreshing = null

api.interceptors.response.use(
  (res) => res.data,
  async (err) => {
    const status = err.response?.status
    const url = err.config?.url || ''
    const isExempt = url.includes('/login') || url.includes('/send-otp') || url.includes('/verify-otp') || url.includes('/me') || url.includes('/refresh')

    if (status === 401 && !isExempt && !err.config._retried) {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          if (!_refreshing) {
            _refreshing = axios.post(`${API_BASE}/api/v1/auth/staff/refresh`, { refresh_token: refreshToken })
              .finally(() => { _refreshing = null })
          }
          const { data } = await _refreshing
          localStorage.setItem('access_token', data.access_token)
          if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token)
          err.config._retried = true
          err.config.headers.Authorization = `Bearer ${data.access_token}`
          return api.request(err.config)
        } catch {
          // Refresh failed — fall through to logout
        }
      }
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user_type')
      // Never redirect if already on login — prevents infinite reload loop
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
      return Promise.reject(new Error('Session expired. Please log in again.'))
    }

    if (!err.response && !err.config._retried) {
      err.config._retried = true
      await new Promise(r => setTimeout(r, 1500))
      return api.request(err.config)
    }

    // Normalise FastAPI error bodies — a 422 returns detail as an ARRAY of
    // objects, which would otherwise render as "[object Object]" everywhere.
    let detail = err.response?.data?.detail
    if (Array.isArray(detail)) {
      detail = detail.map(d => (d && (d.msg || d.message)) || (typeof d === 'string' ? d : JSON.stringify(d))).join(', ')
    } else if (detail && typeof detail === 'object') {
      detail = detail.msg || detail.message || JSON.stringify(detail)
    }
    const message =
      detail ||
      err.response?.data?.message ||
      err.message ||
      'Something went wrong'
    const error = new Error(typeof message === 'string' ? message : 'Something went wrong')
    error.status = status
    return Promise.reject(error)
  }
)

export default api
