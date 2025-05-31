import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import { useChatStore } from './chat'
import { useUIStore } from './ui'

export const useSocketStore = defineStore('socket', {
  state: () => ({
    socket: null,
    isConnected: false,
    isConnecting: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectInterval: 1000,
    lastPong: null,
    pingInterval: null,
    events: [], // Event history for debugging
    onlineUsers: new Set(),
    typingUsers: new Map() // chatId -> Set of userIds
  }),

  getters: {
    connectionStatus: (state) => {
      if (state.isConnecting) return 'connecting'
      if (state.isConnected) return 'connected'
      return 'disconnected'
    },
    
    isUserOnline: (state) => (userId) => state.onlineUsers.has(userId),
    
    getTypingUsersInChat: (state) => (chatId) => {
      return Array.from(state.typingUsers.get(chatId) || [])
    }
  },

  actions: {
    async connect() {
      if (this.socket && this.isConnected) return

      const authStore = useAuthStore()
      const uiStore = useUIStore()
      
      if (!authStore.isAuthenticated) {
        console.warn('Cannot connect socket: user not authenticated')
        return
      }

      this.isConnecting = true
      uiStore.setConnectionStatus('connecting')

      try {
        // Dynamic import of socket.io-client
        const { io } = await import('socket.io-client')
        
        this.socket = io('http://localhost:5000', {
          auth: {
            token: authStore.token
          },
          autoConnect: false
        })

        this.setupEventListeners()
        this.socket.connect()

      } catch (error) {
        console.error('Failed to initialize socket connection:', error)
        this.isConnecting = false
        uiStore.setConnectionStatus('error')
      }
    },

    setupEventListeners() {
      if (!this.socket) return

      const authStore = useAuthStore()
      const chatStore = useChatStore()
      const uiStore = useUIStore()

      // Connection events
      this.socket.on('connect', () => {
        console.log('Socket connected')
        this.isConnected = true
        this.isConnecting = false
        this.reconnectAttempts = 0
        uiStore.setConnectionStatus('connected')
        this.startPingInterval()
        
        // Join user room
        this.socket.emit('user:join', { userId: authStore.user._id })
      })

      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason)
        this.isConnected = false
        this.isConnecting = false
        uiStore.setConnectionStatus('disconnected')
        this.stopPingInterval()
        
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          this.scheduleReconnect()
        }
      })

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error)
        this.isConnecting = false
        uiStore.setConnectionStatus('error')
        this.scheduleReconnect()
      })

      // Message events
      this.socket.on('message:new', (data) => {
        console.log('📨 New message received via socket:', data)
        const message = data.message
        
        // Ensure message has chatId for proper binding
        if (!message.chatId && data.chatId) {
          message.chatId = data.chatId
        }
        
        chatStore.addMessage(message)
        this.showNotification(message)
        this.logEvent('message:new', data)
      })

      this.socket.on('message:updated', (data) => {
        console.log('Message updated:', data)
        chatStore.updateMessage(data.message)
        this.logEvent('message:updated', data)
      })

      this.socket.on('message:deleted', (data) => {
        console.log('Message deleted:', data)
        chatStore.removeMessage(data.messageId)
        this.logEvent('message:deleted', data)
      })

      // Chat events
      this.socket.on('chat:created', (data) => {
        console.log('New chat created:', data)
        chatStore.chats.unshift(data.chat)
        this.logEvent('chat:created', data)
      })

      this.socket.on('chat:updated', (data) => {
        console.log('Chat updated:', data)
        const chatIndex = chatStore.chats.findIndex(chat => chat._id === data.chat._id)
        if (chatIndex !== -1) {
          chatStore.chats[chatIndex] = data.chat
        }
        this.logEvent('chat:updated', data)
      })

      // Typing events
      this.socket.on('typing:start', (data) => {
        console.log('User started typing:', data)
        this.addTypingUser(data.chatId, data.user)
        chatStore.addTypingUser(data.chatId, data.user)
        this.logEvent('typing:start', data)
      })

      this.socket.on('typing:stop', (data) => {
        console.log('User stopped typing:', data)
        this.removeTypingUser(data.chatId, data.userId)
        chatStore.removeTypingUser(data.chatId, data.userId)
        this.logEvent('typing:stop', data)
      })

      // User presence events
      this.socket.on('user:online', (data) => {
        console.log('User came online:', data)
        this.onlineUsers.add(data.userId)
        authStore.addOnlineUser(data.user)
        this.logEvent('user:online', data)
      })

      this.socket.on('user:offline', (data) => {
        console.log('User went offline:', data)
        this.onlineUsers.delete(data.userId)
        authStore.removeOnlineUser(data.userId)
        this.logEvent('user:offline', data)
      })

      this.socket.on('users:online', (data) => {
        console.log('Online users list:', data)
        this.onlineUsers = new Set(data.userIds)
        authStore.updateOnlineUsers(data.users)
        this.logEvent('users:online', data)
      })

      // Ping/Pong for connection health
      this.socket.on('pong', () => {
        this.lastPong = Date.now()
      })

      // Error handling
      this.socket.on('error', (error) => {
        console.error('Socket error:', error)
        uiStore.addToast({
          type: 'error',
          message: error.message || 'Connection error occurred'
        })
        this.logEvent('error', error)
      })
    },

    disconnect() {
      if (this.socket) {
        this.socket.disconnect()
        this.socket = null
      }
      this.isConnected = false
      this.isConnecting = false
      this.stopPingInterval()
      
      const uiStore = useUIStore()
      uiStore.setConnectionStatus('disconnected')
    },

    scheduleReconnect() {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached')
        const uiStore = useUIStore()
        uiStore.addToast({
          type: 'error',
          message: 'Connection lost. Please refresh the page.',
          duration: 0 // Persistent toast
        })
        return
      }

      const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts)
      console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`)
      
      setTimeout(() => {
        this.reconnectAttempts++
        this.connect()
      }, delay)
    },

    startPingInterval() {
      this.stopPingInterval()
      this.pingInterval = setInterval(() => {
        if (this.socket && this.isConnected) {
          this.socket.emit('ping')
          
          // Check if we received pong recently
          if (this.lastPong && Date.now() - this.lastPong > 30000) {
            console.warn('No pong received for 30 seconds, connection may be stale')
          }
        }
      }, 10000) // Ping every 10 seconds
    },

    stopPingInterval() {
      if (this.pingInterval) {
        clearInterval(this.pingInterval)
        this.pingInterval = null
      }
    },

    // Emit events
    sendMessage(chatId, content) {
      if (this.socket && this.isConnected) {
        this.socket.emit('message:send', { chatId, content })
      }
    },

    joinChat(chatId) {
      if (this.socket && this.isConnected) {
        this.socket.emit('chat:join', { chatId })
      }
    },

    leaveChat(chatId) {
      if (this.socket && this.isConnected) {
        this.socket.emit('chat:leave', { chatId })
      }
    },

    startTyping(chatId) {
      if (this.socket && this.isConnected) {
        this.socket.emit('typing:start', { chatId })
      }
    },

    stopTyping(chatId) {
      if (this.socket && this.isConnected) {
        this.socket.emit('typing:stop', { chatId })
      }
    },

    updateUserStatus(status) {
      if (this.socket && this.isConnected) {
        this.socket.emit('user:status', { status })
      }
    },

    // Typing management
    addTypingUser(chatId, user) {
      if (!this.typingUsers.has(chatId)) {
        this.typingUsers.set(chatId, new Set())
      }
      this.typingUsers.get(chatId).add(user._id)
    },

    removeTypingUser(chatId, userId) {
      if (this.typingUsers.has(chatId)) {
        this.typingUsers.get(chatId).delete(userId)
        if (this.typingUsers.get(chatId).size === 0) {
          this.typingUsers.delete(chatId)
        }
      }
    },

    // Notifications
    showNotification(message) {
      const authStore = useAuthStore()
      const uiStore = useUIStore()
      const chatStore = useChatStore()
      
      // Don't show notification if it's from current user
      if (message.sender._id === authStore.user._id) return
      
      // Don't show notification if chat is currently active
      if (chatStore.currentChat && message.chatId === chatStore.currentChat._id) return
      
      // Show toast notification
      if (uiStore.notificationsEnabled) {
        const senderName = message.sender ? `${message.sender.firstName} ${message.sender.lastName}` : 'Someone'
        uiStore.addToast({
          type: 'info',
          message: `${senderName}: ${message.content}`,
          duration: 4000
        })
      }
      
      // Show desktop notification
      if (uiStore.desktopNotifications && 'Notification' in window && Notification.permission === 'granted') {
        const senderName = message.sender ? `${message.sender.firstName} ${message.sender.lastName}` : 'Someone'
        new Notification(senderName, {
          body: message.content,
          icon: '/logo.png', // Add your app icon
          tag: message.chatId // Prevent duplicate notifications for same chat
        })
      }
      
      // Play sound
      if (uiStore.soundEnabled) {
        this.playNotificationSound()
      }
    },

    playNotificationSound() {
      try {
        const audio = new Audio('/notification.mp3') // Add notification sound file
        audio.play().catch(error => {
          console.warn('Could not play notification sound:', error)
        })
      } catch (error) {
        console.warn('Notification sound not available:', error)
      }
    },

    // Event logging for debugging
    logEvent(eventType, data) {
      this.events.push({
        type: eventType,
        data,
        timestamp: new Date().toISOString()
      })
      
      // Keep only last 100 events
      if (this.events.length > 100) {
        this.events = this.events.slice(-100)
      }
    },

    clearEventLog() {
      this.events = []
    },

    // Initialize socket connection
    async initialize() {
      const authStore = useAuthStore()
      
      if (authStore.isAuthenticated) {
        await this.connect()
      }
    },

    // Cleanup
    cleanup() {
      this.disconnect()
      this.onlineUsers.clear()
      this.typingUsers.clear()
      this.events = []
      this.reconnectAttempts = 0
    }
  }
})