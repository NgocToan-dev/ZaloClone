import { defineStore } from 'pinia'
import chatApi from '@services/business/chatApi.js'
import messageApi from '@services/business/messageApi.js'
import fileApi from '@services/business/fileApi.js'
import stickerApi from '@services/business/stickerApi.js'
import socketService from '@services/business/socket.js'
import { useAuthStore } from './auth.js'

export const useChatStore = defineStore('chat', {
  state: () => ({
    chats: [],
    currentChat: localStorage.getItem('currentChatId') ?
      JSON.parse(localStorage.getItem('currentChat') || 'null') : null,
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
    messageDrafts: {}, // chatId -> draft content
    // File upload state
    fileUploads: {}, // chatId -> upload state
    pendingFiles: {}, // chatId -> files pending to be sent
    isUploading: false,
    uploadProgress: 0
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
    getSearchResults: (state) => state.searchResults,
    // File upload getters
    getFileUploadState: (state) => (chatId) => state.fileUploads[chatId] || null,
    getPendingFiles: (state) => (chatId) => state.pendingFiles[chatId] || [],
    getUploadProgress: (state) => state.uploadProgress,
    isFileUploading: (state) => state.isUploading,
    hasFileAttachments: (state) => (message) => message.attachments && message.attachments.length > 0
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
        
        // Restore current chat if it exists in localStorage and we have chats
        await this.restoreCurrentChat()
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to fetch chats'
        console.error('Failed to fetch chats:', error)
      } finally {
        this.isLoading = false
      }
    },

    async restoreCurrentChat() {
      const savedChatId = localStorage.getItem('currentChatId')
      
      if (savedChatId && this.chats.length > 0) {
        console.log('🔄 CHAT: Attempting to restore current chat:', savedChatId)
        
        // Find the chat in our loaded chats
        const savedChat = this.chats.find(chat => chat._id === savedChatId)
        
        if (savedChat) {
          console.log('✅ CHAT: Found saved chat, restoring:', savedChat._id)
          // Update the stored chat data with fresh data from server
          this.currentChat = savedChat
          localStorage.setItem('currentChat', JSON.stringify(savedChat))
          
          // Join chat room if socket is connected
          if (socketService.isConnected()) {
            socketService.joinChat(savedChat._id)
          }
          
          // Fetch messages for restored chat
          console.log('📥 CHAT: Fetching messages for restored chat:', savedChat._id)
          await this.fetchMessages(savedChat._id)
        } else {
          console.log('❌ CHAT: Saved chat not found in current chats, clearing localStorage')
          localStorage.removeItem('currentChatId')
          localStorage.removeItem('currentChat')
          this.currentChat = null
        }
      } else if (savedChatId && this.chats.length === 0) {
        console.log('⏳ CHAT: Saved chat exists but chats not loaded yet')
      } else {
        console.log('ℹ️ CHAT: No saved chat to restore')
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
      
      // Persist current chat in localStorage
      if (chat) {
        localStorage.setItem('currentChatId', chat._id)
        localStorage.setItem('currentChat', JSON.stringify(chat))
        console.log('💾 CHAT: Persisted current chat to localStorage:', chat._id)
        
        console.log('🏠 CHAT: Setting new current chat and joining room:', chat._id)
        
        // Join new chat via socket immediately
        if (socketService.isConnected()) {
          socketService.joinChat(chat._id)
        } else {
          console.warn('⚠️ CHAT: Socket not connected, cannot join chat room')
        }
        
        this.fetchMessages(chat._id)
      } else {
        localStorage.removeItem('currentChatId')
        localStorage.removeItem('currentChat')
        console.log('🗑️ CHAT: Cleared current chat from localStorage')
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

    // File upload actions
    async uploadFiles(chatId, files) {
      try {
        this.isUploading = true
        this.uploadProgress = 0
        this.error = null
        
        console.log('📤 Uploading files:', { chatId, fileCount: files.length })
        
        // Validate files before upload
        const validationResults = Array.from(files).map(file => ({
          file,
          validation: fileApi.validateFile(file)
        }))
        
        const invalidFiles = validationResults.filter(result => !result.validation.isValid)
        if (invalidFiles.length > 0) {
          const errors = invalidFiles.flatMap(result => result.validation.errors)
          throw new Error(`File validation failed: ${errors.join(', ')}`)
        }
        
        // Upload files with progress tracking
        const response = await fileApi.uploadToChat(chatId, files, (progress) => {
          this.uploadProgress = progress
          console.log('📊 Upload progress:', progress + '%')
        })
        
        console.log('✅ Files uploaded successfully:', response.data)
        return response.data
        
      } catch (error) {
        this.error = error.message || 'Failed to upload files'
        console.error('❌ File upload failed:', error)
        throw error
      } finally {
        this.isUploading = false
        this.uploadProgress = 0
      }
    },

    async sendMessageWithFiles(chatId, content, files) {
      try {
        console.log('📤 Sending message with files:', { chatId, content, fileCount: files.length })
        
        // Upload files first
        const uploadResponse = await this.uploadFiles(chatId, files)
        const attachments = uploadResponse.files
        
        // Send message with attachments via API (not socket for file messages)
        const response = await messageApi.sendMessageWithAttachment(chatId, content, attachments)
        
        console.log('📥 Message with files sent:', response.data)
        
        const message = response.data.messageData || response.data.message
        if (message) {
          if (!message.chatId) {
            message.chatId = chatId
          }
          this.addMessage(message)
          this.clearDraft(chatId)
        }
        
        return message
      } catch (error) {
        this.error = error.message || 'Failed to send message with files'
        console.error('❌ Failed to send message with files:', error)
        throw error
      }
    },

    setPendingFiles(chatId, files) {
      this.pendingFiles[chatId] = Array.from(files).map(file => ({
        file,
        id: `${Date.now()}_${Math.random()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        preview: null
      }))
    },

    removePendingFile(chatId, fileId) {
      if (this.pendingFiles[chatId]) {
        this.pendingFiles[chatId] = this.pendingFiles[chatId].filter(f => f.id !== fileId)
        if (this.pendingFiles[chatId].length === 0) {
          delete this.pendingFiles[chatId]
        }
      }
    },

    clearPendingFiles(chatId) {
      delete this.pendingFiles[chatId]
    },

    async generateFilePreview(chatId, fileId) {
      const pendingFile = this.pendingFiles[chatId]?.find(f => f.id === fileId)
      if (!pendingFile || !fileApi.isPreviewable(pendingFile.type)) {
        return null
      }

      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          pendingFile.preview = e.target.result
          resolve(e.target.result)
        }
        reader.readAsDataURL(pendingFile.file)
      })
    },

    async getChatFiles(chatId, options = {}) {
      try {
        const response = await fileApi.getChatFiles(chatId, options)
        return response.data
      } catch (error) {
        console.error('Failed to get chat files:', error)
        throw error
      }
    },

    async deleteFile(fileId) {
      try {
        await fileApi.deleteFile(fileId)
        return true
      } catch (error) {
        console.error('Failed to delete file:', error)
        throw error
      }
    },

    // Sticker actions
    async sendStickerMessage(stickerData) {
      try {
        console.log('🎨 Sending sticker message:', stickerData)
        
        const { stickerId, packId, chatId, stickerUrl, stickerName, isAnimated, dimensions } = stickerData
        
        // Send via socket for real-time communication
        if (socketService.isConnected()) {
          // Create sticker message content
          const stickerContent = {
            stickerId,
            packId,
            stickerUrl,
            stickerName,
            isAnimated,
            dimensions
          }
          
          // Create temporary message for immediate UI feedback
          const authStore = useAuthStore()
          const tempMessage = {
            _id: `temp_${Date.now()}`,
            chatId,
            content: JSON.stringify(stickerContent),
            messageType: 'sticker',
            senderId: authStore.currentUser._id,
            sender: authStore.currentUser,
            createdAt: new Date(),
            isTemporary: true
          }
          
          // Add to UI immediately for sender
          console.log('🎨 Adding temporary sticker message to UI:', tempMessage)
          this.addMessage(tempMessage)
          
          // Send via socket
          const messageData = {
            chatId,
            content: JSON.stringify(stickerContent),
            messageType: 'sticker'
          }
          
          socketService.sendMessage(messageData)
          return tempMessage
        }
        
        // Fallback to API when socket is not connected
        const response = await stickerApi.sendStickerMessage(stickerData)
        console.log('📥 Sticker API response:', response)
        
        const message = response.messageData
        if (message) {
          if (!message.chatId) {
            message.chatId = chatId
          }
          this.addMessage(message)
        }
        
        return message
      } catch (error) {
        console.error('❌ Failed to send sticker message:', error)
        this.error = error.response?.data?.message || 'Failed to send sticker'
        throw error
      }
    },

    // Parse sticker content from message
    parseStickerContent(message) {
      if (message.messageType !== 'sticker') return null
      
      try {
        return JSON.parse(message.content)
      } catch (error) {
        console.error('Failed to parse sticker content:', error)
        return null
      }
    },

    // Check if message is a sticker
    isStickerMessage(message) {
      return message.messageType === 'sticker'
    },

    // Emoji reactions
    async addReaction(messageId, emoji) {
      try {
        console.log('😍 Adding reaction:', { messageId, emoji })
        
        // Send via socket for real-time updates
        if (socketService.isConnected()) {
          socketService.reactToMessage(messageId, emoji)
        }
        
        // Also call API for persistence
        const response = await messageApi.addReaction(messageId, emoji)
        console.log('✅ Reaction added via API:', response.data)
        
        return response.data
      } catch (error) {
        console.error('❌ Failed to add reaction:', error)
        this.error = error.response?.data?.message || 'Failed to add reaction'
        throw error
      }
    },

    async removeReaction(messageId) {
      try {
        console.log('🗑️ Removing reaction from message:', messageId)
        
        // Send via socket for real-time updates
        if (socketService.isConnected()) {
          socketService.removeReaction(messageId)
        }
        
        // Also call API for persistence
        const response = await messageApi.removeReaction(messageId)
        console.log('✅ Reaction removed via API:', response.data)
        
        return response.data
      } catch (error) {
        console.error('❌ Failed to remove reaction:', error)
        this.error = error.response?.data?.message || 'Failed to remove reaction'
        throw error
      }
    },

    async toggleReaction(messageId, emoji) {
      try {
        console.log('🔄 Toggling reaction:', { messageId, emoji })
        
        // Send via socket for real-time updates (backend handles toggle logic)
        if (socketService.isConnected()) {
          socketService.reactToMessage(messageId, emoji)
        }
        
        // Also call API for persistence
        const response = await messageApi.toggleReaction(messageId, emoji)
        console.log('✅ Reaction toggled via API:', response.data)
        
        return response.data
      } catch (error) {
        console.error('❌ Failed to toggle reaction:', error)
        this.error = error.response?.data?.message || 'Failed to toggle reaction'
        throw error
      }
    },

    // Handle real-time reaction updates from socket
    updateMessageReaction(reactionData) {
      console.log('😍 Updating message reaction:', reactionData)
      
      const { messageId, reactions, action } = reactionData
      
      // Find and update the message in current messages
      const messageIndex = this.messages.findIndex(msg => msg._id === messageId)
      if (messageIndex !== -1) {
        this.messages[messageIndex].reactions = reactions || []
        console.log(`✅ Updated message ${messageId} reactions (${action}):`, reactions?.length || 0, 'reactions')
      } else {
        console.log('ℹ️ Message not found in current messages, might be in different chat')
      }
    },

    resetStore() {
      this.chats = []
      this.currentChat = null
      this.messages = []
      this.searchResults = []
      this.archivedChats = []
      this.typingUsers = {}
      this.messageDrafts = {}
      this.fileUploads = {}
      this.pendingFiles = {}
      this.isUploading = false
      this.uploadProgress = 0
      this.unreadCount = 0
      this.error = null
      
      // Clear persisted current chat
      localStorage.removeItem('currentChatId')
      localStorage.removeItem('currentChat')
    }
  }
})