import axios from 'axios'

// All API calls now go to the Laravel backend.
// In dev: proxied via Vite from /api → http://localhost:8001
// In production: served from /api on the same domain (Laravel deployment)
const API_BASE_URL = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// Attach Sanctum Bearer token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 globally — token expired or invalid on protected routes
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRoute =
      error.config?.url?.includes('/login') ||
      error.config?.url?.includes('/reset-password') ||
      window.location.pathname === '/login' ||
      window.location.pathname === '/reset-password'

    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
