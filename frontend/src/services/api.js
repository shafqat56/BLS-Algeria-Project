import axios from 'axios'

// Use relative path for dev (Vite proxy handles it), or full URL for production
const API_BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')
      window.location.reload()
    }
    return Promise.reject(error)
  }
)

// Auth endpoints
export const authAPI = {
  register: (email, password) => api.post('/auth/register', { email, password }),
  login: (email, password) => api.post('/auth/login', { email, password }),
  getCurrentUser: () => api.get('/auth/me'),
  enableBiometric: (biometricData) => api.post('/auth/enable-biometric', { biometricData }),
  verifyBiometric: (biometricData) => api.post('/auth/verify-biometric', { biometricData }),
}

// Profile endpoints
export const profileAPI = {
  getAll: () => api.get('/profiles'),
  getById: (id) => api.get(`/profiles/${id}`),
  create: (data) => api.post('/profiles', data),
  update: (id, data) => api.put(`/profiles/${id}`, data),
  delete: (id) => api.delete(`/profiles/${id}`),
}

// Monitor endpoints
export const monitorAPI = {
  getAll: () => api.get('/monitor'),
  getById: (id) => api.get(`/monitor/${id}`),
  start: (data) => api.post('/monitor/start', data),
  stop: (id) => api.post('/monitor/stop', { id }),
  pause: (id) => api.post('/monitor/pause', { id }),
  resume: (id) => api.post('/monitor/resume', { id }),
}

// Settings endpoints
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
}

// Notification endpoints
export const notificationAPI = {
  // Test endpoint removed - emails are only sent for real slots found
}

// Payment endpoints
export const paymentAPI = {
  createIntent: (amount, currency) => api.post('/payments/create-intent', { amount, currency }),
  confirm: (paymentIntentId) => api.post('/payments/confirm', { paymentIntentId }),
  getMethods: () => api.get('/payments/methods'),
}

export default api

