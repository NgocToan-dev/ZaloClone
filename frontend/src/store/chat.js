import { defineStore } from 'pinia'
import { chatApi, messageApi } from '../services'

export const useChatStore = defineStore('chat', {
  state: () => ({
    chats: [],
    currentChat: null,
    messages: [],
    searchResults: [],
    isLoading: false,
    isLoadingMessages: false,
    error: null,
    messagesPage: 1,
    hasMoreMessages: true,
    unreadCount: 0,
    typingUsers: {},
    archivedChats: [],
    messageDrafts: {} // chatId -> draft content
  }),

  getters: {
    getCurrentChat: (state) => state.currentChat,
    getChatMessages: (state) => state.messages,
    getAllChats: (state) => state.chats,
    getActiveChats: (state) => state.chats.filter(chat => !chat.archived),
    getArchivedChats: (state) => state.archivedChats,
    getUnreadChats: (state) => state.chats.filter(chat => chat.unreadCount > 0),
    getTotalUnreadCount: (state) => state.unreadCount,
    getChatById: (state) => (chatId) => state.chats.find(chat => chat._id === chatId),
    getMessageById: (state) => (messageId) => state.messages.find(msg => msg._id === messageId),
    getTypingUsers: (state) => (chatId) => state.typingUsers[chatId] || [],
    getDraft: (state) => (chatId) => state.messageDrafts[chatId] || '',
    getSearchResults: (state) => state.searchResults
  },

  actions: {
    async fetchChats() {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await chatApi.getUserChats()
        this.chats = response.data.chats || []
        
        // Load unread count
        await this.loadUnreadCount()
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to fetch chats'
        console.error('Failed to fetch chats:', error)
      } finally {
        this.isLoading = false
      }
    },

    async createChat(participantIds) {
      try {
        const response = await chatApi.createChat(participantIds)
        const newChat = response.data.chat
        
        // Check if chat already exists in the list
        const existingChatIndex = this.chats.findIndex(chat => chat._id === newChat._id)
        if (existingChatIndex === -1) {
          this.chats.unshift(newChat)
        } else {
          // Update existing chat and move to top
          this.chats.splice(existingChatIndex, 1)
          this.chats.unshift(newChat)
        }
        
        return newChat
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to create chat'
        console.error('Failed to create chat:', error)
        return null
      }
    },

    async fetchMessages(chatId, page = 1, reset = true) {
      this.isLoadingMessages = true
      this.error = null
      
      if (reset) {
        this.messages = []
        this.messagesPage = 1
        this.hasMoreMessages = true
      }

      try {
        const response = await messageApi.getChatMessages(chatId, page, 50)
        const newMessages = response.data.messages || []
        
        if (reset) {
          this.messages = newMessages
        } else {
          // Prepend older messages
          this.messages = [...newMessages, ...this.messages]
        }
        
        this.hasMoreMessages = newMessages.length === 50
        this.messagesPage = page
        
        // Mark messages as read
        await this.markChatAsRead(chatId)
        
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to fetch messages'
        console.error('Failed to fetch messages:', error)
      } finally {
        this.isLoadingMessages = false
      }
    },

    async loadMoreMessages() {
      if (!this.currentChat || !this.hasMoreMessages || this.isLoadingMessages) return
      
      await this.fetchMessages(this.currentChat._id, this.messagesPage + 1, false)
    },

    async sendMessage(chatId, content, attachments = null) {
      try {
        let response
        if (attachments) {
          response = await messageApi.sendMessageWithAttachment(chatId, content, attachments)
        } else {
          response = await messageApi.sendMessage(chatId, content)
        }
        
        const message = response.data.message
        this.addMessage(message)
        this.clearDraft(chatId)
        
        return message
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to send message'
        console.error('Failed to send message:', error)
        return null
      }
    },

    async editMessage(messageId, newContent) {
      try {
        const response = await messageApi.updateMessage(messageId, newContent)
        const updatedMessage = response.data.message
        
        // Update message in the list
        const messageIndex = this.messages.findIndex(msg => msg._id === messageId)
        if (messageIndex !== -1) {
          this.messages[messageIndex] = updatedMessage
        }
        
        return updatedMessage
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to edit message'
        console.error('Failed to edit message:', error)
        return null
      }
    },

    async deleteMessage(messageId) {
      try {
        await messageApi.deleteMessage(messageId)
        
        // Remove message from the list
        this.messages = this.messages.filter(msg => msg._id !== messageId)
        
        return true
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to delete message'
        console.error('Failed to delete message:', error)
        return false
      }
    },

    async searchMessages(chatId, query) {
      try {
        const response = await messageApi.searchMessages(chatId, query)
        this.searchResults = response.data.messages || []
        return this.searchResults
      } catch (error) {
        console.error('Failed to search messages:', error)
        return []
      }
    },

    async searchAllMessages(query) {
      try {
        const response = await messageApi.searchAllMessages(query)
        this.searchResults = response.data.messages || []
        return this.searchResults
      } catch (error) {
        console.error('Failed to search all messages:', error)
        return []
      }
    },

    async markChatAsRead(chatId) {
      try {
        await chatApi.markAsRead(chatId)
        
        // Update local state
        const chatIndex = this.chats.findIndex(chat => chat._id === chatId)
        if (chatIndex !== -1) {
          this.chats[chatIndex].unreadCount = 0
        }
        
        await this.loadUnreadCount()
      } catch (error) {
        console.error('Failed to mark chat as read:', error)
      }
    },

    async archiveChat(chatId) {
      try {
        await chatApi.archiveChat(chatId)
        
        // Move chat to archived list
        const chatIndex = this.chats.findIndex(chat => chat._id === chatId)
        if (chatIndex !== -1) {
          const archivedChat = this.chats.splice(chatIndex, 1)[0]
          archivedChat.archived = true
          this.archivedChats.push(archivedChat)
        }
        
        return true
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to archive chat'
        return false
      }
    },

    async unarchiveChat(chatId) {
      try {
        await chatApi.unarchiveChat(chatId)
        
        // Move chat back to active list
        const chatIndex = this.archivedChats.findIndex(chat => chat._id === chatId)
        if (chatIndex !== -1) {
          const unarchivedChat = this.archivedChats.splice(chatIndex, 1)[0]
          unarchivedChat.archived = false
          this.chats.unshift(unarchivedChat)
        }
        
        return true
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to unarchive chat'
        return false
      }
    },

    async loadUnreadCount() {
      try {
        const response = await chatApi.getUnreadCount()
        this.unreadCount = response.data.count || 0
      } catch (error) {
        console.error('Failed to load unread count:', error)
      }
    },

    async loadArchivedChats() {
      try {
        const response = await chatApi.getArchivedChats()
        this.archivedChats = response.data.chats || []
      } catch (error) {
        console.error('Failed to load archived chats:', error)
      }
    },

    setCurrentChat(chat) {
      this.currentChat = chat
      this.clearSearchResults()
      
      if (chat) {
        this.fetchMessages(chat._id)
      } else {
        this.clearMessages()
      }
    },

    addMessage(message) {
      // Add to messages if it's for current chat
      if (this.currentChat && message.chatId === this.currentChat._id) {
        this.messages.push(message)
      }
      
      // Update the last message in chats list
      const chatIndex = this.chats.findIndex(chat => chat._id === message.chatId)
      if (chatIndex !== -1) {
        this.chats[chatIndex].lastMessage = message
        this.chats[chatIndex].updatedAt = new Date()
        
        // Move the chat to the top
        const updatedChat = this.chats.splice(chatIndex, 1)[0]
        this.chats.unshift(updatedChat)
        
        // Update unread count if not current chat
        if (!this.currentChat || message.chatId !== this.currentChat._id) {
          this.chats[0].unreadCount = (this.chats[0].unreadCount || 0) + 1
          this.unreadCount++
        }
      }
    },

    updateMessage(message) {
      const messageIndex = this.messages.findIndex(msg => msg._id === message._id)
      if (messageIndex !== -1) {
        this.messages[messageIndex] = message
      }
    },

    removeMessage(messageId) {
      this.messages = this.messages.filter(msg => msg._id !== messageId)
    },

    setTypingUsers(chatId, users) {
      this.typingUsers[chatId] = users
    },

    addTypingUser(chatId, user) {
      if (!this.typingUsers[chatId]) {
        this.typingUsers[chatId] = []
      }
      
      const existingIndex = this.typingUsers[chatId].findIndex(u => u._id === user._id)
      if (existingIndex === -1) {
        this.typingUsers[chatId].push(user)
      }
    },

    removeTypingUser(chatId, userId) {
      if (this.typingUsers[chatId]) {
        this.typingUsers[chatId] = this.typingUsers[chatId].filter(user => user._id !== userId)
      }
    },

    saveDraft(chatId, content) {
      this.messageDrafts[chatId] = content
    },

    clearDraft(chatId) {
      delete this.messageDrafts[chatId]
    },

    clearMessages() {
      this.messages = []
      this.messagesPage = 1
      this.hasMoreMessages = true
    },

    clearSearchResults() {
      this.searchResults = []
    },

    clearError() {
      this.error = null
    },

    resetStore() {
      this.chats = []
      this.currentChat = null
      this.messages = []
      this.searchResults = []
      this.archivedChats = []
      this.typingUsers = {}
      this.messageDrafts = {}
      this.unreadCount = 0
      this.error = null
    }
  }
})