import axios from 'axios'

const API_BASE = (import.meta.env.VITE_API_URL || 'https://bharatcliniq-api.onrender.com').replace(/\/$/, '')

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      const url = err.config?.url || ''
      const isExempt = url.includes('/login') || url.includes('/send-otp') || url.includes('/verify-otp') || url.includes('/me') || url.includes('/inpatient/')
      if (!isExempt) {
        sessionStorage.removeItem('admin_token')
        window.location.href = '/login'
      }
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
    error.status = err.response?.status
    return Promise.reject(error)
  }
)

export default api
