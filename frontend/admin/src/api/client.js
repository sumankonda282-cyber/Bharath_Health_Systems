import axios from 'axios'

// In production builds, use same-origin so Vercel proxies /api/* → backend (no CORS).
// In dev, fall back to VITE_API_URL or localhost.
const API_BASE = import.meta.env.PROD
  ? ''
  : (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

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
    const message =
      err.response?.data?.detail ||
      err.response?.data?.message ||
      err.message ||
      'Something went wrong'
    const error = new Error(message)
    error.status = err.response?.status
    return Promise.reject(error)
  }
)

export default api
