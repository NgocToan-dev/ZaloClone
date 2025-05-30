// Export all stores
export { useAuthStore } from './auth.js'
export { useChatStore } from './chat.js'
export { useUIStore } from './ui.js'
export { useSocketStore } from './socket.js'

// Store initialization helper
export const initializeStores = async () => {
  const { useAuthStore } = await import('./auth.js')
  const { useUIStore } = await import('./ui.js')
  const { useSocketStore } = await import('./socket.js')
  
  const authStore = useAuthStore()
  const uiStore = useUIStore()
  const socketStore = useSocketStore()
  
  // Initialize UI first
  uiStore.initializeUI()
  
  // Initialize auth and connect socket if authenticated
  await authStore.initializeAuth()
  
  if (authStore.isAuthenticated) {
    await socketStore.initialize()
  }
  
  return {
    authStore,
    uiStore,
    socketStore
  }
}

// Store cleanup helper for logout
export const cleanupStores = () => {
  const { useAuthStore } = require('./auth.js')
  const { useChatStore } = require('./chat.js')
  const { useSocketStore } = require('./socket.js')
  
  const authStore = useAuthStore()
  const chatStore = useChatStore()
  const socketStore = useSocketStore()
  
  chatStore.resetStore()
  socketStore.cleanup()
  
  return {
    authStore,
    chatStore,
    socketStore
  }
}