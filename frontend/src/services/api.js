import axios from 'axios'

// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:5000'
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// HTTP method functions
export const get = (url, config = {}) => {
  return api.get(url, config)
}

export const post = (url, data = {}, config = {}) => {
  return api.post(url, data, config)
}

export const put = (url, data = {}, config = {}) => {
  return api.put(url, data, config)
}

export const del = (url, config = {}) => {
  return api.delete(url, config)
}

// Export the axios instance as default for backward compatibility
export default api