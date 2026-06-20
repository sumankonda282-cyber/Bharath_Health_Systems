import axios from 'axios'

const API_BASE = (import.meta.env.VITE_API_URL || 'https://BharathHealthSystems-api.onrender.com').replace(/\/$/, '')

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('patient_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    // Only redirect to login on 401 for non-auth endpoints
    // Login endpoint returning 401 means wrong credentials — show error, don't redirect
    if (err.response?.status === 401) {
      const url = err.config?.url || ''
      const isExempt = url.includes('/login') || url.includes('/send-otp') || url.includes('/verify-otp') || url.includes('/me')
      if (!isExempt && !window.location.pathname.startsWith('/login')) {
        localStorage.removeItem('patient_token')
        localStorage.removeItem('bh_profile_id')
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

// Booking-specific method wrappers (compatible with BookingFlow apiClient interface)
export const bookingApi = {
  getDoctorSlots: (doctorId, date, branchId) =>
    api.get(`/public/doctors/${doctorId}/slots`, { params: { booking_date: date, branch_id: branchId } }),
  bookAppointment: (data) => api.post('/public/book', data),
  patientLookup: (mobile) => api.get('/public/patient-lookup', { params: { mobile } }),
  sendOtp: (mobile) => api.post('/otp/send', { mobile }),
  verifyOtp: (mobile, otp) => api.post('/otp/verify', { mobile, otp }),
  getPatientProfile: (verified_token) =>
    api.get('/public/patient-profile', { params: { verified_token } }),
}

export default api
