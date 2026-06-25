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

  // Patient Lookup (platform-wide)
  searchPatients: (params) => api.get('/platform/patients/search', { params }),
  getPatientStates: () => api.get('/platform/patients/states'),
  getPatientDetail: (id) => api.get(`/platform/patients/${id}/detail`),

  // Population analytics
  getPopulation: () => api.get('/platform/analytics/population'),

  // Flexible report explorer
  runQuery: (body) => api.post('/platform/analytics/query', body),

  // Clinic clinical activity + payments
  getClinicClinicalStats: (id) => api.get(`/platform/clinics/${id}/clinical-stats`),
  getClinicPayments: (id) => api.get(`/platform/clinics/${id}/payments`),
  recordPayment: (id, body) => api.post(`/platform/clinics/${id}/payment`, body),
  extendSubscription: (id, days) => api.put(`/platform/clinics/${id}/extend`, { days }),
  getAllPayments: (params) => api.get('/platform/payments', { params }),

  // Billing config
  getBillingConfig: (id) => api.get(`/platform/clinics/${id}/billing-config`),
  updateBillingConfig: (id, body) => api.put(`/platform/clinics/${id}/billing-config`, body),

  // Plan config (legacy subscription pricing JSON)
  getPlanConfig: () => api.get('/platform/plan-config'),
  updatePlanConfig: (body) => api.put('/platform/plan-config', body),

  // À-la-carte plans (authoritative catalog)
  getPlans:    () => api.get('/platform/plans'),
  createPlan:  (body) => api.post('/platform/plans', body),
  updatePlan:  (id, body) => api.put(`/platform/plans/${id}`, body),

  // Subscription invoices
  getInvoices:    (params) => api.get('/platform/invoices', { params }),
  confirmInvoice: (id, body) => api.post(`/platform/invoices/${id}/confirm`, body),

  // Manual comp / fee waiver
  compClinic: (id, body) => api.post(`/platform/clinics/${id}/comp`, body),
}
