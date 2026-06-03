import api from './client'

export const authApi = {
  login: (identifier, password) => api.post('/auth/platform/login', { identifier, password }),
  me:    () => api.get('/auth/platform/me'),
}

export const adminApi = {
  // Dashboard
  getDashboard: () => api.get('/platform/dashboard'),

  // Clinics
  getPending:      () => api.get('/platform/clinics/pending'),
  getClinics:      (params) => api.get('/platform/clinics', { params }),
  getClinic:       (id) => api.get(`/platform/clinics/${id}`),
  approve:         (id) => api.put(`/platform/clinics/${id}/approve`),
  reject:          (id, body) => api.put(`/platform/clinics/${id}/reject`, body),
  suspend:         (id, body) => api.put(`/platform/clinics/${id}/suspend`, body),
  revoke:          (id, body) => api.put(`/platform/clinics/${id}/revoke`, body),
  reactivate:      (id) => api.put(`/platform/clinics/${id}/reactivate`),
  changePlan:      (id, plan) => api.put(`/platform/clinics/${id}/plan`, { plan }),

  // Staff
  getPendingStaff: () => api.get('/platform/staff/pending'),
  verifyStaff:     (id) => api.put(`/platform/staff/${id}/verify`),
  rejectStaff:     (id, body) => api.put(`/platform/staff/${id}/reject`, body),

  // Audit log
  getAuditLog: (params) => api.get('/platform/audit-log', { params }),

  // Reports
  getReports: (params) => api.get('/platform/reports', { params }),

  // Clinic staff
  getClinicStaff:     (id) => api.get(`/platform/clinics/${id}/staff`),
  resetStaffPassword: (id) => api.post(`/platform/staff/${id}/reset-password`),

  // BH ID Lookup
  bhidLookup: (id) => api.get(`/platform/bhid/${id}`),

  // Clinic Manager
  createManager: (clinicId, body) => api.post(`/platform/clinics/${clinicId}/create-manager`, body),
}
