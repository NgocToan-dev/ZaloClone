import BaseApi from './baseApi.js'

class UserApi extends BaseApi {
  constructor() {
    super('/api/users')
  }

  // Authentication methods
  async login(email, password) {
    return await this.post('/login', { email, password })
  }

  async register(userData) {
    const { firstName, lastName, email, password } = userData
    return await this.post('/register', { firstName, lastName, email, password })
  }

  async logout() {
    return await this.post('/logout')
  }

  // Profile methods
  async getProfile() {
    return await this.get('/profile')
  }

  async updateProfile(profileData) {
    return await this.put('/profile', profileData)
  }

  async changePassword(currentPassword, newPassword) {
    return await this.put('/change-password', { currentPassword, newPassword })
  }

  // User search and discovery
  async searchUsers(query, filters = {}) {
    const params = { q: query, ...filters }
    return await this.search(params)
  }

  async getUserByEmail(email) {
    return await this.get(`/email/${email}`)
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