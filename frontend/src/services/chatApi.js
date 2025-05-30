import BaseApi from './baseApi.js'

class ChatApi extends BaseApi {
  constructor() {
    super('/api/chats')
  }

  // Chat management
  async createChat(participantIds) {
    return await this.post('', { participants: participantIds })
  }

  async getUserChats() {
    return await this.get('/user')
  }

  async getChatById(chatId) {
    return await this.getById(chatId)
  }

  async deleteChat(chatId) {
    return await this.deleteById(chatId)
  }

  // Chat participants
  async addParticipant(chatId, userId) {
    return await this.post(`/${chatId}/participants`, { userId })
  }

  async removeParticipant(chatId, userId) {
    return await this.delete(`/${chatId}/participants/${userId}`)
  }

  async getChatParticipants(chatId) {
    return await this.get(`/${chatId}/participants`)
  }

  async leaveChat(chatId) {
    return await this.post(`/${chatId}/leave`)
  }

  // Chat messages
  async getChatMessages(chatId, page = 1, limit = 50) {
    return await this.get(`/${chatId}/messages?page=${page}&limit=${limit}`)
  }

  async getLastMessage(chatId) {
    return await this.get(`/${chatId}/last-message`)
  }

  // Chat search and filtering
  async searchChats(query) {
    return await this.get(`/search?q=${encodeURIComponent(query)}`)
  }

  async getActiveChats() {
    return await this.get('/active')
  }

  async getArchivedChats() {
    return await this.get('/archived')
  }

  // Chat actions
  async archiveChat(chatId) {
    return await this.put(`/${chatId}/archive`)
  }

  async unarchiveChat(chatId) {
    return await this.put(`/${chatId}/unarchive`)
  }

  async markAsRead(chatId) {
    return await this.put(`/${chatId}/read`)
  }

  async markAsUnread(chatId) {
    return await this.put(`/${chatId}/unread`)
  }

  // Group chat specific
  async updateChatName(chatId, name) {
    return await this.put(`/${chatId}/name`, { name })
  }

  async updateChatAvatar(chatId, avatar) {
    return await this.put(`/${chatId}/avatar`, { avatar })
  }

  // Chat statistics
  async getChatStats(chatId) {
    return await this.get(`/${chatId}/stats`)
  }

  async getUnreadCount() {
    return await this.get('/unread-count')
  }

  // Batch operations
  async markMultipleAsRead(chatIds) {
    return await this.put('/batch/read', { chatIds })
  }

  async archiveMultiple(chatIds) {
    return await this.put('/batch/archive', { chatIds })
  }

  async deleteMultiple(chatIds) {
    return await this.delete('/batch', { data: { chatIds } })
  }
}

export default new ChatApi()