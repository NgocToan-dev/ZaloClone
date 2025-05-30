import { defineStore } from 'pinia'

export const useUIStore = defineStore('ui', {
  state: () => ({
    // Layout
    sidebarCollapsed: false,
    chatListWidth: 320,
    
    // Modals and dialogs
    showNewChatModal: false,
    showProfileModal: false,
    showSettingsModal: false,
    showSearchModal: false,
    showContactsModal: false,
    
    // Chat interface
    showEmojiPicker: false,
    showAttachmentMenu: false,
    showChatInfo: false,
    showMessageSearch: false,
    
    // Theme and appearance
    theme: localStorage.getItem('theme') || 'light',
    fontSize: localStorage.getItem('fontSize') || 'medium',
    soundEnabled: localStorage.getItem('soundEnabled') !== 'false',
    
    // Notifications
    notificationsEnabled: localStorage.getItem('notificationsEnabled') !== 'false',
    desktopNotifications: localStorage.getItem('desktopNotifications') !== 'false',
    
    // Active states
    activeTab: 'chats', // chats, contacts, settings
    searchQuery: '',
    selectedMessages: [],
    
    // Loading states
    isConnecting: false,
    isReconnecting: false,
    connectionStatus: 'disconnected', // connected, connecting, disconnected, error
    
    // Mobile responsiveness
    isMobile: window.innerWidth < 768,
    showMobileChatList: true,
    
    // Errors and notifications
    toasts: [],
    alerts: []
  }),

  getters: {
    isDarkTheme: (state) => state.theme === 'dark',
    isLightTheme: (state) => state.theme === 'light',
    isConnected: (state) => state.connectionStatus === 'connected',
    hasSelectedMessages: (state) => state.selectedMessages.length > 0,
    selectedMessagesCount: (state) => state.selectedMessages.length,
    isAnyModalOpen: (state) => {
      return state.showNewChatModal || 
             state.showProfileModal || 
             state.showSettingsModal || 
             state.showSearchModal || 
             state.showContactsModal
    }
  },

  actions: {
    // Layout actions
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },

    setSidebarCollapsed(collapsed) {
      this.sidebarCollapsed = collapsed
    },

    setChatListWidth(width) {
      this.chatListWidth = Math.max(280, Math.min(500, width))
    },

    // Modal actions
    openNewChatModal() {
      this.closeAllModals()
      this.showNewChatModal = true
    },

    openProfileModal() {
      this.closeAllModals()
      this.showProfileModal = true
    },

    openSettingsModal() {
      this.closeAllModals()
      this.showSettingsModal = true
    },

    openSearchModal() {
      this.closeAllModals()
      this.showSearchModal = true
    },

    openContactsModal() {
      this.closeAllModals()
      this.showContactsModal = true
    },

    closeAllModals() {
      this.showNewChatModal = false
      this.showProfileModal = false
      this.showSettingsModal = false
      this.showSearchModal = false
      this.showContactsModal = false
    },

    // Chat interface actions
    toggleEmojiPicker() {
      this.showEmojiPicker = !this.showEmojiPicker
      if (this.showEmojiPicker) {
        this.showAttachmentMenu = false
      }
    },

    toggleAttachmentMenu() {
      this.showAttachmentMenu = !this.showAttachmentMenu
      if (this.showAttachmentMenu) {
        this.showEmojiPicker = false
      }
    },

    toggleChatInfo() {
      this.showChatInfo = !this.showChatInfo
    },

    toggleMessageSearch() {
      this.showMessageSearch = !this.showMessageSearch
      if (!this.showMessageSearch) {
        this.searchQuery = ''
      }
    },

    closeMenus() {
      this.showEmojiPicker = false
      this.showAttachmentMenu = false
    },

    // Theme actions
    setTheme(theme) {
      this.theme = theme
      localStorage.setItem('theme', theme)
      document.documentElement.setAttribute('data-theme', theme)
    },

    toggleTheme() {
      this.setTheme(this.theme === 'light' ? 'dark' : 'light')
    },

    setFontSize(size) {
      this.fontSize = size
      localStorage.setItem('fontSize', size)
      document.documentElement.setAttribute('data-font-size', size)
    },

    toggleSound() {
      this.soundEnabled = !this.soundEnabled
      localStorage.setItem('soundEnabled', this.soundEnabled.toString())
    },

    // Notification actions
    toggleNotifications() {
      this.notificationsEnabled = !this.notificationsEnabled
      localStorage.setItem('notificationsEnabled', this.notificationsEnabled.toString())
    },

    toggleDesktopNotifications() {
      this.desktopNotifications = !this.desktopNotifications
      localStorage.setItem('desktopNotifications', this.desktopNotifications.toString())
      
      if (this.desktopNotifications && 'Notification' in window) {
        Notification.requestPermission()
      }
    },

    // Navigation actions
    setActiveTab(tab) {
      this.activeTab = tab
    },

    setSearchQuery(query) {
      this.searchQuery = query
    },

    // Message selection actions
    selectMessage(messageId) {
      if (!this.selectedMessages.includes(messageId)) {
        this.selectedMessages.push(messageId)
      }
    },

    deselectMessage(messageId) {
      this.selectedMessages = this.selectedMessages.filter(id => id !== messageId)
    },

    toggleMessageSelection(messageId) {
      if (this.selectedMessages.includes(messageId)) {
        this.deselectMessage(messageId)
      } else {
        this.selectMessage(messageId)
      }
    },

    clearSelectedMessages() {
      this.selectedMessages = []
    },

    selectAllMessages(messageIds) {
      this.selectedMessages = [...messageIds]
    },

    // Connection status actions
    setConnectionStatus(status) {
      this.connectionStatus = status
      this.isConnecting = status === 'connecting'
      this.isReconnecting = status === 'reconnecting'
    },

    // Mobile actions
    setIsMobile(isMobile) {
      this.isMobile = isMobile
    },

    toggleMobileChatList() {
      this.showMobileChatList = !this.showMobileChatList
    },

    setMobileChatListVisible(visible) {
      this.showMobileChatList = visible
    },

    // Toast notifications
    addToast(toast) {
      const id = Date.now() + Math.random()
      this.toasts.push({
        id,
        type: 'info',
        duration: 5000,
        ...toast
      })

      // Auto remove toast
      setTimeout(() => {
        this.removeToast(id)
      }, toast.duration || 5000)

      return id
    },

    removeToast(id) {
      this.toasts = this.toasts.filter(toast => toast.id !== id)
    },

    // Alert notifications
    addAlert(alert) {
      const id = Date.now() + Math.random()
      this.alerts.push({
        id,
        type: 'info',
        ...alert
      })
      return id
    },

    removeAlert(id) {
      this.alerts = this.alerts.filter(alert => alert.id !== id)
    },

    clearAllAlerts() {
      this.alerts = []
    },

    // Initialize UI
    initializeUI() {
      // Set theme
      document.documentElement.setAttribute('data-theme', this.theme)
      document.documentElement.setAttribute('data-font-size', this.fontSize)
      
      // Check mobile
      this.setIsMobile(window.innerWidth < 768)
      
      // Listen for resize
      window.addEventListener('resize', () => {
        this.setIsMobile(window.innerWidth < 768)
      })
      
      // Request notification permission if enabled
      if (this.desktopNotifications && 'Notification' in window) {
        Notification.requestPermission()
      }
    }
  }
})