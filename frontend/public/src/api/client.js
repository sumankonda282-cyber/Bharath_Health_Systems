import axios from 'axios'

const API_BASE = (import.meta.env.VITE_API_URL || 'https://bharatcliniq-api.onrender.com').replace(/\/$/, '')
const BASE_URL = `${API_BASE}/api/v1`

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'Something went wrong'
    return Promise.reject(new Error(message))
  }
)

// Public endpoints
export const publicApi = {
  // Stats
  getStats: () => api.get('/public/stats'),

  // Cities
  getCities: () => api.get('/public/cities'),

  // Clinics
  getClinics: (params) => api.get('/public/clinics', { params }),
  getClinicBySlug: (slug) => api.get(`/public/clinics/${slug}`),

  // Doctors
  getDoctor: (doctorId) => api.get(`/public/doctors/${doctorId}`),
  getDoctorSlots: (doctorId, bookingDate, branchId) =>
    api.get(`/public/doctors/${doctorId}/slots`, { params: { booking_date: bookingDate, branch_id: branchId } }),

  // Booking
  bookAppointment: (data) => api.post('/public/book', data),
  getBookingStatus: (code) => api.get(`/public/booking/${code}`),

  // Register clinic
  registerClinic: (data) => api.post('/public/register-clinic', data),

  // Telehealth
  getTelehealthDoctors: (params) => api.get('/public/telehealth-doctors', { params }),
  // available_date: 'YYYY-MM-DD' — filters both to doctors with schedules on that day
}

export default api
