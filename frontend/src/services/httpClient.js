import axios from 'axios'

// Create axios instance
const httpClient = axios.create({
  baseURL: window.__env.baseUrl
})

// Request interceptor
httpClient.interceptors.request.use(
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
httpClient.interceptors.response.use(
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
  return httpClient.get(url, config)
}

export const post = (url, data = {}, config = {}) => {
  return httpClient.post(url, data, config)
}

export const put = (url, data = {}, config = {}) => {
  return httpClient.put(url, data, config)
}

export const del = (url, config = {}) => {
  return httpClient.delete(url, config)
}

// Export the axios instance as default for backward compatibility
export default httpClient