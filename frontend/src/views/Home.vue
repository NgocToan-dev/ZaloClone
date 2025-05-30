<template>
  <div class="chat-container">
    <!-- Header -->
    <header class="chat-header">
      <h1 class="text-xl font-bold">💬 ZaloClone</h1>
      <div class="flex items-center space-x-4">
        <span class="text-sm">Xin chào, {{ authStore.currentUser?.firstName }}!</span>
        <button
          @click="logout"
          class="btn btn-sm bg-blue-700 hover:bg-blue-800 text-white"
        >
          Đăng xuất
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <div class="flex-1 flex">
      <!-- Sidebar -->
      <div class="chat-sidebar">
        <!-- Search and New Chat -->
        <div class="p-4 border-b border-gray-200">
          <div class="mb-3 relative">
            <input
              v-model="searchEmail"
              type="text"
              placeholder="Tìm kiếm người dùng..."
              class="form-input"
              @keyup.enter="startNewChat"
              @focus="searchUsers"
            />
            
            <!-- Search Results Dropdown -->
            <div v-if="showSearchResults && searchResults.length > 0"
                 class="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
              <div
                v-for="user in searchResults"
                :key="user._id"
                @click="startChatWithUser(user)"
                class="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <div class="flex items-center">
                  <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                    {{ user.firstName.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{{ user.firstName }} {{ user.lastName }}</p>
                    <p class="text-sm text-gray-500">{{ user.email }}</p>
                  </div>
                  <div v-if="authStore.isUserOnline(user._id)" class="ml-auto">
                    <div class="w-2 h-2 bg-green-400 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- No Results -->
            <div v-else-if="showSearchResults && searchResults.length === 0 && searchEmail.length > 2"
                 class="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 p-3 text-center text-gray-500">
              Không tìm thấy người dùng
            </div>
          </div>
          
          <button
            @click="startNewChat"
            :disabled="!searchEmail || isStartingChat"
            class="btn btn-primary w-full"
          >
            {{ isStartingChat ? 'Đang tạo...' : 'Bắt đầu chat mới' }}
          </button>
        </div>

        <!-- Chat List -->
        <div class="chat-list">
          <div v-if="chatStore.isLoading" class="p-4 text-center text-gray-500">
            Đang tải cuộc trò chuyện...
          </div>
          <div v-else-if="chatStore.chats.length === 0" class="p-4 text-center text-gray-500">
            Chưa có cuộc trò chuyện nào. Hãy bắt đầu chat mới!
          </div>
          <div v-else>
            <div
              v-for="chat in chatStore.chats"
              :key="chat._id"
              @click="selectChat(chat)"
              class="chat-item"
              :class="{ 'active': chatStore.currentChat?._id === chat._id }"
            >
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <h3 class="font-medium text-gray-900 mb-1">
                    {{ getChatName(chat) }}
                  </h3>
                  <p class="text-sm text-gray-600 truncate">
                    {{ chat.lastMessage?.content || 'Chưa có tin nhắn' }}
                  </p>
                </div>
                <span class="text-xs text-gray-500">
                  {{ formatDate(chat.updatedAt) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Chat Area -->
      <div class="chat-main">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, useChatStore, useUIStore, useSocketStore } from '../store'

export default {
  name: 'Home',
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    const chatStore = useChatStore()
    const uiStore = useUIStore()
    const socketStore = useSocketStore()
    
    const searchEmail = ref('')
    const isStartingChat = ref(false)
    const searchResults = ref([])
    const showSearchResults = ref(false)

    const getChatName = (chat) => {
      const currentUserId = authStore.currentUser?._id
      const otherParticipant = chat.participants.find(p => p._id !== currentUserId)
      return otherParticipant ? `${otherParticipant.firstName} ${otherParticipant.lastName}` : 'Unknown User'
    }

    const formatDate = (dateString) => {
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = Math.abs(now - date)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 1) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      } else {
        return date.toLocaleDateString()
      }
    }

    const selectChat = (chat) => {
      chatStore.setCurrentChat(chat)
      socketStore.joinChat(chat._id)
      
      // Update mobile UI
      if (uiStore.isMobile) {
        uiStore.setMobileChatListVisible(false)
      }
      
      router.push(`/chat/${chat._id}`)
    }

    const searchUsers = async () => {
      if (!searchEmail.value.trim()) {
        searchResults.value = []
        showSearchResults.value = false
        return
      }

      try {
        const users = await authStore.searchUsers(searchEmail.value)
        searchResults.value = users.filter(user => user._id !== authStore.currentUser._id)
        showSearchResults.value = true
      } catch (error) {
        console.error('Failed to search users:', error)
        uiStore.addToast({
          type: 'error',
          message: 'Không thể tìm kiếm người dùng'
        })
      }
    }

    const startChatWithUser = async (user) => {
      isStartingChat.value = true
      try {
        const newChat = await chatStore.createChat([user._id])
        if (newChat) {
          selectChat(newChat)
          searchEmail.value = ''
          searchResults.value = []
          showSearchResults.value = false
          
          uiStore.addToast({
            type: 'success',
            message: `Đã tạo cuộc trò chuyện với ${user.firstName} ${user.lastName}`
          })
        }
      } catch (error) {
        console.error('Failed to start new chat:', error)
        uiStore.addToast({
          type: 'error',
          message: 'Không thể tạo cuộc trò chuyện mới'
        })
      } finally {
        isStartingChat.value = false
      }
    }

    const startNewChat = async () => {
      if (!searchEmail.value.trim()) return
      
      // Try to find user by email first
      const users = await authStore.searchUsers(searchEmail.value)
      const user = users.find(u => u.email === searchEmail.value)
      
      if (user) {
        await startChatWithUser(user)
      } else {
        uiStore.addToast({
          type: 'error',
          message: 'Không tìm thấy người dùng với email này'
        })
      }
    }

    const logout = async () => {
      try {
        socketStore.cleanup()
        await authStore.logout()
        chatStore.resetStore()
        router.push('/login')
        
        uiStore.addToast({
          type: 'success',
          message: 'Đã đăng xuất thành công'
        })
      } catch (error) {
        console.error('Logout error:', error)
      }
    }

    // Watch search input for real-time search
    watch(searchEmail, (newValue) => {
      if (newValue.length > 2) {
        searchUsers()
      } else {
        searchResults.value = []
        showSearchResults.value = false
      }
    })

    // Watch for unread count changes
    const unreadCount = computed(() => chatStore.unreadCount)

    onMounted(async () => {
      // Initialize stores if not already done
      if (!socketStore.isConnected && authStore.isAuthenticated) {
        await socketStore.initialize()
      }
      
      // Fetch chats
      await chatStore.fetchChats()
      
      // Load archived chats
      await chatStore.loadArchivedChats()
      
      // If no chat is selected and we have chats, select first chat
      if (!chatStore.currentChat && chatStore.chats.length > 0) {
        selectChat(chatStore.chats[0])
      }
      
      // Update document title with unread count
      document.title = unreadCount.value > 0 ? `(${unreadCount.value}) ZaloClone` : 'ZaloClone'
    })

    // Update document title when unread count changes
    watch(unreadCount, (newCount) => {
      document.title = newCount > 0 ? `(${newCount}) ZaloClone` : 'ZaloClone'
    })

    return {
      authStore,
      chatStore,
      uiStore,
      socketStore,
      searchEmail,
      isStartingChat,
      searchResults,
      showSearchResults,
      unreadCount,
      getChatName,
      formatDate,
      selectChat,
      startNewChat,
      startChatWithUser,
      searchUsers,
      logout
    }
  }
}
</script>