import { io } from 'socket.io-client'
import { useChatStore } from '../store/chat'

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
      console.log('Connected to server')
    })

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server')
    })

    // Message events
    this.socket.on('receive_message', (message) => {
      console.log('Received message:', message)
      this.chatStore.addMessage(message)
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
      this.socket.emit('join_chat', chatId)
    }
  }

  leaveChat(chatId) {
    if (this.socket?.connected) {
      this.socket.emit('leave_chat', chatId)
    }
  }

  sendMessage(messageData) {
    if (this.socket?.connected) {
      this.socket.emit('send_message', messageData)
    }
  }

  isConnected() {
    return this.socket?.connected || false
  }
}

export default new SocketService()