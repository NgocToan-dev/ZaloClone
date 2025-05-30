import { defineStore } from 'pinia'
import { userApi } from '../services'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token'),
    isLoading: false,
    error: null,
    contacts: [],
    onlineUsers: [],
    userStatus: 'offline'
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    currentUser: (state) => state.user,
    fullName: (state) => state.user ? `${state.user.firstName} ${state.user.lastName}` : '',
    isOnline: (state) => state.userStatus === 'online',
    getContactById: (state) => (id) => state.contacts.find(contact => contact._id === id),
    isUserOnline: (state) => (userId) => state.onlineUsers.some(user => user._id === userId)
  },

  actions: {
    async register(userData) {
      this.isLoading = true
      this.error = null

      try {
        const response = await userApi.register(userData)
        
        this.token = response.data.token
        this.user = response.data.user
        
        localStorage.setItem('token', this.token)
        
        return { success: true }
      } catch (error) {
        this.error = error.response?.data?.message || 'Registration failed'
        return { success: false, error: this.error }
      } finally {
        this.isLoading = false
      }
    },

    async login(credentials) {
      this.isLoading = true
      this.error = null

      try {
        const response = await userApi.login(credentials.email, credentials.password)
        
        this.token = response.data.token
        this.user = response.data.user
        this.userStatus = 'online'
        
        localStorage.setItem('token', this.token)
        
        // Load user data after login
        await this.loadUserData()
        
        return { success: true }
      } catch (error) {
        this.error = error.response?.data?.message || 'Login failed'
        return { success: false, error: this.error }
      } finally {
        this.isLoading = false
      }
    },

    async getCurrentUser() {
      if (!this.token) return

      try {
        const response = await userApi.getProfile()
        this.user = response.data.user
      } catch (error) {
        console.error('Failed to get current user:', error)
        this.logout()
      }
    },

    async updateProfile(profileData) {
      this.isLoading = true
      this.error = null

      try {
        const response = await userApi.updateProfile(profileData)
        this.user = response.data.user
        return { success: true }
      } catch (error) {
        this.error = error.response?.data?.message || 'Profile update failed'
        return { success: false, error: this.error }
      } finally {
        this.isLoading = false
      }
    },

    async changePassword(currentPassword, newPassword) {
      this.isLoading = true
      this.error = null

      try {
        await userApi.changePassword(currentPassword, newPassword)
        return { success: true }
      } catch (error) {
        this.error = error.response?.data?.message || 'Password change failed'
        return { success: false, error: this.error }
      } finally {
        this.isLoading = false
      }
    },

    async loadContacts() {
      try {
        const response = await userApi.getContacts()
        this.contacts = response.data.contacts
      } catch (error) {
        console.error('Failed to load contacts:', error)
      }
    },

    async addContact(userId) {
      try {
        const response = await userApi.addContact(userId)
        this.contacts.push(response.data.contact)
        return { success: true }
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to add contact'
        return { success: false, error: this.error }
      }
    },

    async removeContact(userId) {
      try {
        await userApi.removeContact(userId)
        this.contacts = this.contacts.filter(contact => contact._id !== userId)
        return { success: true }
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to remove contact'
        return { success: false, error: this.error }
      }
    },

    async searchUsers(query) {
      try {
        const response = await userApi.searchUsers(query)
        return response.data.users
      } catch (error) {
        console.error('Failed to search users:', error)
        return []
      }
    },

    async updateStatus(status) {
      try {
        await userApi.updateStatus(status)
        this.userStatus = status
      } catch (error) {
        console.error('Failed to update status:', error)
      }
    },

    async loadOnlineUsers() {
      try {
        const response = await userApi.getOnlineUsers()
        this.onlineUsers = response.data.users
      } catch (error) {
        console.error('Failed to load online users:', error)
      }
    },

    async loadUserData() {
      await Promise.all([
        this.loadContacts(),
        this.loadOnlineUsers()
      ])
    },

    async logout() {
      try {
        await userApi.logout()
      } catch (error) {
        console.error('Logout error:', error)
      } finally {
        this.user = null
        this.token = null
        this.error = null
        this.contacts = []
        this.onlineUsers = []
        this.userStatus = 'offline'
        
        localStorage.removeItem('token')
      }
    },

    async initializeAuth() {
      if (this.token) {
        await this.getCurrentUser()
        if (this.user) {
          await this.loadUserData()
          this.userStatus = 'online'
        }
      }
    },

    updateOnlineUsers(users) {
      this.onlineUsers = users
    },

    addOnlineUser(user) {
      const existingIndex = this.onlineUsers.findIndex(u => u._id === user._id)
      if (existingIndex === -1) {
        this.onlineUsers.push(user)
      }
    },

    removeOnlineUser(userId) {
      this.onlineUsers = this.onlineUsers.filter(user => user._id !== userId)
    },

    clearError() {
      this.error = null
    }
  }
})