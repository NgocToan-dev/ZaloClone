import { io } from 'socket.io-client'
import { useChatStore } from '@store/chat.js'

class SocketService {
  constructor() {
    this.socket = null
    this.chatStore = null
  }

  connect(token) {
    if (this.socket?.connected) {
      return
    }

    this.socket = io('http://localhost:5000', {
      auth: {
        token: token
      }
    })

    this.chatStore = useChatStore()

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Socket connected to server')
      
      // Auto-join current chat if exists
      if (this.chatStore?.currentChat) {
        console.log('🏠 SOCKET: Auto-joining current chat on reconnect:', this.chatStore.currentChat._id)
        this.joinChat(this.chatStore.currentChat._id)
      }
    })

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected from server')
    })

    // Message events
    this.socket.on('message_received', (data) => {
      console.log('📨 SOCKET: Received message_received event:', data)
      console.log('📨 SOCKET: Message structure:', JSON.stringify(data.message, null, 2))
      
      if (data.message) {
        // Ensure message has chatId
        if (!data.message.chatId && data.chatId) {
          data.message.chatId = data.chatId
        }
        console.log('📨 SOCKET: Adding message to chat store:', data.message)
        this.chatStore.addMessage(data.message)
      } else {
        console.warn('⚠️ SOCKET: No message in received data:', data)
      }
    })

    this.socket.on('message_sent', (data) => {
      console.log('✅ SOCKET: Message sent confirmation:', data)
      console.log('✅ SOCKET: Sent message structure:', JSON.stringify(data.message, null, 2))
      
      if (data.message && this.chatStore) {
        if (!data.message.chatId && data.chatId) {
          data.message.chatId = data.chatId
        }
        
        // Replace temporary message with real message from server
        const tempMessageIndex = this.chatStore.messages.findIndex(
          msg => msg.isTemporary && msg.content === data.message.content
        )
        
        if (tempMessageIndex !== -1) {
          console.log('🔄 SOCKET: Replacing temporary message with server message')
          this.chatStore.messages[tempMessageIndex] = data.message
        } else {
          // Fallback: just add the message if temp not found
          console.log('➕ SOCKET: Adding confirmed message (temp not found)')
          this.chatStore.addMessage(data.message)
        }
      }
    })

    // User status events
    this.socket.on('user_online', (data) => {
      console.log('User online:', data)
    })

    this.socket.on('user_offline', (data) => {
      console.log('User offline:', data)
    })

    // Typing events
    this.socket.on('user_typing', (data) => {
      console.log('User typing:', data)
      if (this.chatStore) {
        if (data.isTyping) {
          this.chatStore.addTypingUser(data.chatId, { _id: data.userId })
        } else {
          this.chatStore.removeTypingUser(data.chatId, data.userId)
        }
      }
    })

    // Reaction events
    this.socket.on('message_reaction', (data) => {
      console.log('😍 SOCKET: Received message_reaction event:', data)
      
      if (this.chatStore && data.messageId) {
        this.chatStore.updateMessageReaction(data)
      } else {
        console.warn('⚠️ SOCKET: Invalid reaction data or no chat store:', data)
      }
    })

    // Auth events
    this.socket.on('auth_success', (data) => {
      console.log('✅ SOCKET: Auth success:', data)
      
      // Auto-join current chat after auth success
      if (this.chatStore?.currentChat) {
        console.log('🏠 SOCKET: Auto-joining current chat after auth:', this.chatStore.currentChat._id)
        this.joinChat(this.chatStore.currentChat._id)
      }
    })

    // Error events
    this.socket.on('error', (error) => {
      console.error('❌ SOCKET: Error event:', error)
    })

    // Error handling
    this.socket.on('error', (error) => {
      console.error('Socket error:', error)
    })

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error)
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  joinChat(chatId) {
    if (this.socket?.connected) {
      this.socket.emit('join_chat', { chatId })
      console.log('🏠 SOCKET: Joining chat room:', chatId)
    } else {
      console.warn('⚠️ SOCKET: Cannot join chat - not connected')
    }
  }

  leaveChat(chatId) {
    if (this.socket?.connected) {
      this.socket.emit('leave_chat', { chatId })
      console.log('🚪 SOCKET: Leaving chat room:', chatId)
    } else {
      console.warn('⚠️ SOCKET: Cannot leave chat - not connected')
    }
  }

  sendMessage(messageData) {
    if (this.socket?.connected) {
      this.socket.emit('send_message', messageData)
      console.log('📤 SOCKET: Sending message via socket:', messageData)
    } else {
      console.warn('⚠️ SOCKET: Cannot send message - not connected')
    }
  }

  startTyping(chatId) {
    if (this.socket?.connected) {
      this.socket.emit('typing_start', { chatId })
    }
  }

  stopTyping(chatId) {
    if (this.socket?.connected) {
      this.socket.emit('typing_stop', { chatId })
    }
  }

  markAsRead(chatId, messageIds = []) {
    if (this.socket?.connected) {
      this.socket.emit('mark_as_read', { chatId, messageIds })
    }
  }

  reactToMessage(messageId, reaction) {
    if (this.socket?.connected) {
      this.socket.emit('message_reaction', { messageId, reaction })
      console.log('😍 SOCKET: Sending reaction via socket:', { messageId, reaction })
    } else {
      console.warn('⚠️ SOCKET: Cannot send reaction - not connected')
    }
  }

  removeReaction(messageId) {
    if (this.socket?.connected) {
      this.socket.emit('remove_reaction', { messageId })
      console.log('🗑️ SOCKET: Removing reaction via socket:', { messageId })
    } else {
      console.warn('⚠️ SOCKET: Cannot remove reaction - not connected')
    }
  }

  isConnected() {
    return this.socket?.connected || false
  }
}

export default new SocketService()