<template>
  <div class="flex flex-col h-full">
    <!-- Chat Header -->
    <div v-if="chatStore.currentChat" class="bg-white border-b border-gray-200 p-4">
      <h2 class="font-semibold text-gray-900">
        💬 {{ getChatName(chatStore.currentChat) }}
      </h2>
    </div>

    <!-- No Chat Selected -->
    <div v-if="!chatStore.currentChat" class="flex-1 flex items-center justify-center bg-gray-100">
      <div class="text-center text-gray-500">
        <div class="w-16 h-16 mx-auto mb-4 bg-gray-300 rounded-full flex items-center justify-center">
          <svg class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-4.946-1.524A11.05 11.05 0 014 13.372 8 8 0 1121 12z" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Chưa chọn cuộc trò chuyện</h3>
        <p class="text-sm text-gray-500">Chọn một cuộc trò chuyện từ sidebar để bắt đầu nhắn tin.</p>
      </div>
    </div>

    <!-- Chat Messages -->
    <div v-else class="flex-1 flex flex-col">
      <!-- Messages Area -->
      <div ref="messagesContainer" class="messages-container overflow-y-auto flex-1 p-4">
        <!-- Load More Button -->
        <div v-if="chatStore.hasMoreMessages" class="text-center mb-4">
          <button
            @click="loadMoreMessages"
            :disabled="isLoadingMore"
            class="btn btn-sm bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            <svg v-if="isLoadingMore" class="animate-spin w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ isLoadingMore ? 'Đang tải...' : 'Tải tin nhắn cũ hơn' }}
          </button>
        </div>

        <div v-if="chatStore.isLoadingMessages" class="text-center text-gray-500 py-8">
          <div class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          Đang tải tin nhắn...
        </div>
        <div v-else-if="chatStore.messages.length === 0" class="text-center text-gray-500 py-8">
          <div class="w-12 h-12 mx-auto mb-2 bg-gray-300 rounded-full flex items-center justify-center">
            ✨
          </div>
          Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="message in chatStore.messages"
            :key="message._id"
            class="message"
            :class="{ 'own': isOwnMessage(message), 'other': !isOwnMessage(message) }"
          >
            <div class="message-bubble max-w-xs lg:max-w-md p-3 rounded-lg"
                 :class="{
                   'bg-blue-500 text-white ml-auto': isOwnMessage(message),
                   'bg-gray-200 text-gray-900': !isOwnMessage(message)
                 }">
              <div v-if="!isOwnMessage(message)" class="text-xs opacity-75 mb-1">
                {{ message.senderId?.firstName }} {{ message.senderId?.lastName }}
              </div>
              <p class="text-sm whitespace-pre-wrap">{{ message.content }}</p>
              <div class="text-xs mt-1 opacity-75 text-right">
                {{ formatMessageTime(message.createdAt) }}
                <span v-if="isOwnMessage(message)" class="ml-1">
                  ✓
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Typing Indicator -->
        <div v-if="typingUsers.length > 0" class="flex items-center space-x-2 mt-3 text-gray-500 text-sm">
          <div class="flex space-x-1">
            <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
            <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
          </div>
          <span>
            {{ typingUsers.length === 1 ? `${typingUsers[0]} đang nhập...` : `${typingUsers.join(', ')} đang nhập...` }}
          </span>
        </div>
      </div>

      <!-- Message Input -->
      <div class="border-t border-gray-200 p-4">
        <form @submit.prevent="sendMessage" class="flex space-x-3">
          <textarea
            v-model="newMessage"
            placeholder="Nhập tin nhắn..."
            class="form-input flex-1 resize-none"
            rows="1"
            :disabled="isSending"
            @input="handleTyping"
            @keydown="onKeydown"
            style="max-height: 120px; min-height: 40px;"
          ></textarea>
          <button
            type="submit"
            :disabled="!newMessage.trim() || isSending"
            class="btn btn-primary px-4 self-end"
          >
            <svg v-if="isSending" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, nextTick, watch, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore, useChatStore, useUIStore, useSocketStore } from '../store'

export default {
  name: 'Chat',
  setup() {
    const route = useRoute()
    const authStore = useAuthStore()
    const chatStore = useChatStore()
    const uiStore = useUIStore()
    const socketStore = useSocketStore()
    
    const messagesContainer = ref(null)
    const newMessage = ref('')
    const isSending = ref(false)
    const isLoadingMore = ref(false)
    const typingTimeout = ref(null)

    const getChatName = (chat) => {
      const currentUserId = authStore.currentUser?._id
      const otherParticipant = chat.participants.find(p => p._id !== currentUserId)
      return otherParticipant ? `${otherParticipant.firstName} ${otherParticipant.lastName}` : 'Unknown User'
    }

    const isOwnMessage = (message) => {
      return message.senderId._id === authStore.currentUser?._id
    }

    const formatMessageTime = (dateString) => {
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = Math.abs(now - date)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 1) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      } else if (diffDays <= 7) {
        return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      }
    }

    const scrollToBottom = () => {
      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
      })
    }

    const loadMoreMessages = async () => {
      if (isLoadingMore.value || !chatStore.hasMoreMessages || !chatStore.currentChat) return
      
      isLoadingMore.value = true
      const scrollHeight = messagesContainer.value?.scrollHeight || 0
      
      try {
        await chatStore.loadMoreMessages()
        
        // Maintain scroll position
        nextTick(() => {
          if (messagesContainer.value) {
            const newScrollHeight = messagesContainer.value.scrollHeight
            messagesContainer.value.scrollTop = newScrollHeight - scrollHeight
          }
        })
      } catch (error) {
        console.error('Failed to load more messages:', error)
        uiStore.addToast({
          type: 'error',
          message: 'Không thể tải thêm tin nhắn'
        })
      } finally {
        isLoadingMore.value = false
      }
    }

    const handleScroll = () => {
      if (!messagesContainer.value) return
      
      const { scrollTop } = messagesContainer.value
      
      // Load more messages when scrolled to top
      if (scrollTop === 0 && chatStore.hasMoreMessages) {
        loadMoreMessages()
      }
    }

    const sendMessage = async () => {
      if (!newMessage.value.trim() || !chatStore.currentChat || isSending.value) return

      isSending.value = true
      const content = newMessage.value.trim()
      
      // Clear draft and input immediately for better UX
      chatStore.clearDraft(chatStore.currentChat._id)
      newMessage.value = ''
      
      // Stop typing indicator
      socketStore.stopTyping(chatStore.currentChat._id)

      try {
        const message = await chatStore.sendMessage(chatStore.currentChat._id, content)
        
        if (message) {
          // Send via socket for real-time updates
          socketStore.sendMessage(chatStore.currentChat._id, content)
          scrollToBottom()
        } else {
          // Restore message if sending failed
          newMessage.value = content
        }
      } catch (error) {
        console.error('Failed to send message:', error)
        newMessage.value = content
        uiStore.addToast({
          type: 'error',
          message: 'Không thể gửi tin nhắn'
        })
      } finally {
        isSending.value = false
      }
    }

    const handleTyping = () => {
      if (!chatStore.currentChat) return
      
      // Save draft
      chatStore.saveDraft(chatStore.currentChat._id, newMessage.value)
      
      // Send typing indicator
      socketStore.startTyping(chatStore.currentChat._id)
      
      // Clear previous timeout
      if (typingTimeout.value) {
        clearTimeout(typingTimeout.value)
      }
      
      // Stop typing after 3 seconds of inactivity
      typingTimeout.value = setTimeout(() => {
        socketStore.stopTyping(chatStore.currentChat._id)
      }, 3000)
    }

    const onKeydown = (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        sendMessage()
      }
    }

    // Get typing users for current chat
    const typingUsers = computed(() => {
      if (!chatStore.currentChat) return []
      return chatStore.getTypingUsers(chatStore.currentChat._id)
        .filter(userId => userId !== authStore.currentUser?._id)
        .map(userId => {
          const user = authStore.contacts.find(c => c._id === userId)
          return user ? `${user.firstName} ${user.lastName}` : 'Someone'
        })
    })

    // Watch for new messages to auto-scroll
    watch(() => chatStore.messages.length, () => {
      scrollToBottom()
    })

    // Watch for chat changes
    watch(() => route.params.id, (newChatId) => {
      if (newChatId && chatStore.currentChat?._id !== newChatId) {
        const chat = chatStore.chats.find(c => c._id === newChatId)
        if (chat) {
          chatStore.setCurrentChat(chat)
          socketStore.joinChat(chat._id)
          
          // Load draft
          newMessage.value = chatStore.getDraft(chat._id)
        }
      }
    })

    // Watch for current chat changes to load draft
    watch(() => chatStore.currentChat, (newChat, oldChat) => {
      if (oldChat) {
        // Save draft for previous chat
        chatStore.saveDraft(oldChat._id, newMessage.value)
        // Stop typing for previous chat
        socketStore.stopTyping(oldChat._id)
      }
      
      if (newChat) {
        // Load draft for new chat
        newMessage.value = chatStore.getDraft(newChat._id)
      }
    })

    onMounted(() => {
      const chatId = route.params.id
      if (chatId && chatStore.currentChat?._id !== chatId) {
        const chat = chatStore.chats.find(c => c._id === chatId)
        if (chat) {
          chatStore.setCurrentChat(chat)
          socketStore.joinChat(chat._id)
          newMessage.value = chatStore.getDraft(chat._id)
        }
      }
      
      // Add scroll listener
      if (messagesContainer.value) {
        messagesContainer.value.addEventListener('scroll', handleScroll)
      }
      
      scrollToBottom()
    })

    onUnmounted(() => {
      // Save draft before unmounting
      if (chatStore.currentChat) {
        chatStore.saveDraft(chatStore.currentChat._id, newMessage.value)
        socketStore.stopTyping(chatStore.currentChat._id)
      }
      
      // Remove scroll listener
      if (messagesContainer.value) {
        messagesContainer.value.removeEventListener('scroll', handleScroll)
      }
      
      // Clear typing timeout
      if (typingTimeout.value) {
        clearTimeout(typingTimeout.value)
      }
    })

    return {
      authStore,
      chatStore,
      uiStore,
      messagesContainer,
      newMessage,
      isSending,
      isLoadingMore,
      typingUsers,
      getChatName,
      isOwnMessage,
      formatMessageTime,
      sendMessage,
      handleTyping,
      onKeydown,
      loadMoreMessages
    }
  }
}
</script>