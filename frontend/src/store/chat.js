import { defineStore } from 'pinia'
import chatApi from '@services/business/chatApi.js'
import messageApi from '@services/business/messageApi.js'
import socketService from '@services/business/socket.js'
import { useAuthStore } from './auth.js'

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
      const startTime = Date.now()
      
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
        
        // Đảm bảo loading state hiển thị ít nhất 500ms để người dùng thấy được
        const elapsed = Date.now() - startTime
        if (elapsed < 500) {
          await new Promise(resolve => setTimeout(resolve, 500 - elapsed))
        }
        
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to fetch messages'
        console.error('Failed to fetch messages:', error)
      } finally {
        console.log('✅ fetchMessages: Setting isLoadingMessages to false')
        this.isLoadingMessages = false
      }
    },

    async loadMoreMessages() {
      if (!this.currentChat || !this.hasMoreMessages || this.isLoadingMessages) return
      
      await this.fetchMessages(this.currentChat._id, this.messagesPage + 1, false)
    },

    async sendMessage(chatId, content, attachments = null) {
      try {
        console.log('📤 Sending message:', { chatId, content, hasAttachments: !!attachments })
        
        // Send via socket for real-time communication (no attachments)
        if (socketService.isConnected() && !attachments) {
          // Create temporary message for immediate UI feedback
          const authStore = useAuthStore()
          const tempMessage = {
            _id: `temp_${Date.now()}`, // Temporary ID
            chatId,
            content: content.trim(),
            messageType: 'text',
            senderId: authStore.currentUser._id,
            sender: authStore.currentUser, // For immediate display
            createdAt: new Date(),
            isTemporary: true
          }
          
          // Add to UI immediately for sender
          console.log('📤 Adding temporary message to UI:', tempMessage)
          this.addMessage(tempMessage)
          
          // Send via socket
          const messageData = {
            chatId,
            content: content.trim(),
            messageType: 'text'
          }
          
          socketService.sendMessage(messageData)
          this.clearDraft(chatId)
          return tempMessage
        }
        
        // Fallback to API for attachments or when socket is not connected
        let response
        if (attachments) {
          response = await messageApi.sendMessageWithAttachment(chatId, content, attachments)
        } else {
          response = await messageApi.sendMessage(chatId, content)
        }
        
        console.log('📥 API response:', response.data)
        
        const message = response.data.messageData || response.data.message
        console.log('📩 Extracted message from API:', message)
        
        if (!message) {
          console.error('❌ No message data in API response')
          return null
        }
        
        if (!message.chatId) {
          message.chatId = chatId
        }
        
        this.addMessage(message)
        this.clearDraft(chatId)
        
        return message
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to send message'
        console.error('❌ Failed to send message:', error)
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
        // Mark as read via socket if connected
        if (socketService.isConnected()) {
          const authStore = useAuthStore()
          const currentUserId = authStore.currentUser?._id
          
          const unreadMessageIds = this.messages
            .filter(msg => msg.senderId !== currentUserId && !msg.readBy?.includes(currentUserId))
            .map(msg => msg._id)
          
          if (unreadMessageIds.length > 0) {
            socketService.markAsRead(chatId, unreadMessageIds)
          }
        }
        
        // Also call API for persistent storage
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
      console.log('🔄 CHAT: Setting current chat:', chat?._id || 'null')
      
      // Leave previous chat if exists
      if (this.currentChat && socketService.isConnected()) {
        console.log('🚪 CHAT: Leaving previous chat:', this.currentChat._id)
        socketService.leaveChat(this.currentChat._id)
      }
      
      this.currentChat = chat
      this.clearSearchResults()
      
      if (chat) {
        console.log('🏠 CHAT: Setting new current chat and joining room:', chat._id)
        
        // Join new chat via socket immediately
        if (socketService.isConnected()) {
          socketService.joinChat(chat._id)
        } else {
          console.warn('⚠️ CHAT: Socket not connected, cannot join chat room')
        }
        
        this.fetchMessages(chat._id)
      } else {
        this.clearMessages()
      }
    },

    addMessage(message) {
      console.log('📝 addMessage called with:', {
        messageId: message._id,
        isTemporary: message.isTemporary,
        content: message.content?.substring(0, 50) + '...',
        currentChat: this.currentChat?._id
      })
      
      // Determine the chatId from message or current chat context
      const chatId = message.chatId || (this.currentChat && this.currentChat._id)
      
      if (!chatId) {
        console.warn('❌ Cannot add message: no chatId available', message)
        return
      }
      
      console.log('📋 Using chatId:', chatId, 'Current messages count:', this.messages.length)
      
      // Add to messages if it's for current chat
      if (this.currentChat && chatId === this.currentChat._id) {
        // Check if message already exists to avoid duplicates
        const existingIndex = this.messages.findIndex(msg => {
          // For temporary messages, match by content and sender
          if (message.isTemporary || msg.isTemporary) {
            return msg.content === message.content && msg.senderId === message.senderId
          }
          // For real messages, match by ID
          return msg._id === message._id
        })
        
        if (existingIndex === -1) {
          this.messages.push(message)
          console.log('✅ Message added to current chat. New count:', this.messages.length)
        } else {
          // Update existing message (replace temporary with real)
          console.log('🔄 Updating existing message (temp->real or duplicate)')
          this.messages[existingIndex] = message
        }
      } else {
        console.log('ℹ️ Message not for current chat, skipping UI update')
      }
      
      // Update the last message in chats list (only for non-temporary messages)
      if (!message.isTemporary) {
        const chatIndex = this.chats.findIndex(chat => chat._id === chatId)
        if (chatIndex !== -1) {
          this.chats[chatIndex].lastMessage = message
          this.chats[chatIndex].updatedAt = new Date()
          
          // Move the chat to the top
          const updatedChat = this.chats.splice(chatIndex, 1)[0]
          this.chats.unshift(updatedChat)
          
          // Update unread count if not current chat
          if (!this.currentChat || chatId !== this.currentChat._id) {
            this.chats[0].unreadCount = (this.chats[0].unreadCount || 0) + 1
            this.unreadCount++
          }
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