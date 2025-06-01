import BaseApi from '../baseApi.js'

class MessageApi extends BaseApi {
  constructor() {
    super('/api/messages')
  }

  // Message basic operations
  async sendMessage(chatId, content) {
    return await this.post(`/${chatId}`, { content })
  }

  async getMessageById(messageId) {
    return await this.get(`/single/${messageId}`)
  }

  async getMessage(messageId) {
    return await this.getMessageById(messageId)
  }

  async updateMessage(messageId, content) {
    return await this.put(`/${messageId}`, { content })
  }

  async deleteMessage(messageId) {
    return await this.deleteById(messageId)
  }

  // Chat messages
  async getChatMessages(chatId, page = 1, limit = 50, before = null) {
    const params = new URLSearchParams({ page, limit })
    if (before) params.append('before', before)
    return await this.get(`/${chatId}?${params.toString()}`)
  }

  async getMessagesBefore(chatId, messageId, limit = 20) {
    return await this.get(`/chat/${chatId}/before/${messageId}?limit=${limit}`)
  }

  async getMessagesAfter(chatId, messageId, limit = 20) {
    return await this.get(`/chat/${chatId}/after/${messageId}?limit=${limit}`)
  }

  // Message search
  async searchMessages(chatId, query, filters = {}) {
    const params = new URLSearchParams({ q: query, ...filters })
    return await this.get(`/chat/${chatId}/search?${params.toString()}`)
  }

  async searchAllMessages(query, filters = {}) {
    const params = new URLSearchParams({ q: query, ...filters })
    return await this.get(`/search?${params.toString()}`)
  }

  // Message status
  async markAsRead(messageId) {
    return await this.put(`/${messageId}/read`)
  }

  async markChatAsRead(chatId) {
    return await this.put(`/${chatId}/read`)
  }

  async markAsDelivered(messageId) {
    return await this.put(`/${messageId}/delivered`)
  }

  async getMessageStatus(messageId) {
    return await this.get(`/${messageId}/status`)
  }

  // Message reactions
  async reactToMessage(messageId, reaction) {
    return await this.post(`/${messageId}/react`, { reaction })
  }

  async addReaction(messageId, reaction) {
    return await this.reactToMessage(messageId, reaction)
  }

  async removeReaction(messageId) {
    return await this.delete(`/${messageId}/react`)
  }

  async getMessageReactions(messageId) {
    return await this.get(`/${messageId}/reactions`)
  }

  // Toggle reaction (add if not exists, remove if exists)
  async toggleReaction(messageId, reaction) {
    return await this.reactToMessage(messageId, reaction)
  }

  // Message forwarding
  async forwardMessage(messageId, chatIds) {
    return await this.post(`/${messageId}/forward`, { chatIds })
  }

  async forwardMessages(messageIds, chatId) {
    return await this.post('/forward-batch', { messageIds, chatId })
  }

  // Message threads/replies
  async replyToMessage(messageId, content) {
    return await this.post(`/${messageId}/reply`, { content })
  }

  async getMessageReplies(messageId, page = 1, limit = 20) {
    return await this.get(`/${messageId}/replies?page=${page}&limit=${limit}`)
  }

  // Message attachments
  async sendMessageWithAttachment(chatId, content, attachments) {
    const formData = new FormData()
    formData.append('chatId', chatId)
    formData.append('content', content || '')
    
    // Handle multiple attachments
    if (Array.isArray(attachments)) {
      attachments.forEach((attachment) => {
        // If attachment is a file object
        if (attachment instanceof File) {
          formData.append('files', attachment)
        }
        // If attachment is already an uploaded file object
        else if (attachment.fileId) {
          formData.append('attachments', JSON.stringify(attachment))
        }
      })
    } else if (attachments) {
      // Single attachment
      if (attachments instanceof File) {
        formData.append('files', attachments)
      } else if (attachments.fileId) {
        formData.append('attachments', JSON.stringify(attachments))
      }
    }
    
    return await this.post('/with-attachment', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }

  async getMessageAttachments(messageId) {
    return await this.get(`/${messageId}/attachments`)
  }

  // Batch operations
  async deleteMessages(messageIds) {
    return await this.delete('/batch', { data: { messageIds } })
  }

  async markMessagesAsRead(messageIds) {
    return await this.put('/batch/read', { messageIds })
  }

  async getMessagesCount(chatId, filters = {}) {
    const params = new URLSearchParams(filters)
    return await this.get(`/chat/${chatId}/count?${params.toString()}`)
  }

  // Message export
  async exportChatMessages(chatId, format = 'json') {
    return await this.get(`/chat/${chatId}/export?format=${format}`)
  }

  // Real-time message events
  async getUnreadMessages(chatId) {
    return await this.get(`/chat/${chatId}/unread`)
  }

  async getLastMessages(chatIds) {
    return await this.post('/last-messages', { chatIds })
  }
}

export default new MessageApi()