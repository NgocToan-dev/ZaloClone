import BaseApi from '../baseApi.js'

class ChatApi extends BaseApi {
  constructor() {
    super('/api/chats')
  }

  // Chat management
  async createChat(participantIds) {
    return await this.post('', { participants: participantIds })
  }

  async getUserChats() {
    return await this.get('/')
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

  // Chat actions (match backend routes)
  async archiveChat(chatId) {
    return await this.put(`/${chatId}/archive`)
  }

  async markAsRead(chatId) {
    return await this.put(`/${chatId}/read`)
  }

  // For compatibility with existing store code
  async getUnreadCount() {
    // This endpoint doesn't exist in backend, so we'll calculate from chats
    try {
      const response = await this.getUserChats()
      const chats = response.data.chats || []
      const unreadCount = chats.reduce((count, chat) => count + (chat.unreadCount || 0), 0)
      return { data: { count: unreadCount } }
    } catch (error) {
      return { data: { count: 0 } }
    }
  }

  async getArchivedChats() {
    // This endpoint doesn't exist in backend, return empty for now
    return { data: { chats: [] } }
  }

  async unarchiveChat(chatId) {
    // This endpoint doesn't exist in backend, just remove from archive flag
    return await this.put(`/${chatId}/archive`)
  }
}

export default new ChatApi()