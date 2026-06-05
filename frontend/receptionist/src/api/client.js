import axios from 'axios'

const API_BASE = 'https://bharatcliniq-api.onrender.com'

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('staff_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      const url = err.config?.url || ''
      const isExempt = url.includes('/login') || url.includes('/send-otp') || url.includes('/verify-otp') || url.includes('/me')
      if (!isExempt) {
        localStorage.clear()
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
