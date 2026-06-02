import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API  = `${BASE}/api/v1`

const api = axios.create({ baseURL: API, timeout: 30000 })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('admin_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r.data,
  e => {
    if (e.response?.status === 401) { localStorage.removeItem('admin_token'); window.location.href = '/login' }
    return Promise.reject(new Error(e.response?.data?.detail || e.message || 'Request failed'))
  }
)

export default api
