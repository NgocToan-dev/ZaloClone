import BaseApi from '@services/baseApi.js'
import { post } from '@services/httpClient.js'

class UserApi extends BaseApi {
  constructor() {
    super('/api/users')
  }

  // Auth-related methods (for backward compatibility - these should use authApi)
  async register(userData) {
    // Use httpClient directly for auth endpoints
    const { firstName, lastName, email, password } = userData
    return await post('/api/auth/register', {
      firstName,
      lastName,
      email,
      password
    })
  }

  async logout() {
    // Use httpClient directly for auth endpoints
    return await post('/api/auth/logout')
  }

  // Profile methods
  async getProfile() {
    return await this.get('/profile')
  }

  async updateProfile(profileData) {
    return await this.put('/profile', profileData)
  }

  async changePassword(currentPassword, newPassword) {
    // Use httpClient directly for auth endpoints
    return await post('/api/auth/change-password', {
      currentPassword,
      newPassword
    })
  }

  // User search and discovery
  async searchUsers(query, filters = {}) {
    const params = new URLSearchParams({ q: query, ...filters }).toString()
    return await this.get(`/search?${params}`)
  }

  async getUserByEmail(email) {
    return await this.get(`/email/${email}`)
  }

  async getUserById(id) {
    return await this.get(`/info/${id}`)
  }

  // User relationships/contacts
  async getContacts() {
    return await this.get('/contacts')
  }

  async addContact(userId) {
    return await this.post('/contacts', { userId })
  }

  async removeContact(userId) {
    return await this.delete(`/contacts/${userId}`)
  }

  // User status
  async updateStatus(status) {
    return await this.put('/status', { status })
  }

  async getOnlineUsers() {
    return await this.get('/online')
  }
}

export default new UserApi()