<template>
  <div class="chat-view">
    <!-- Chat Header -->
    <div v-if="currentChat" class="chat-header">
      <h2 class="font-semibold text-gray-900">
        💬 {{ getChatName(currentChat) }}
      </h2>
    </div>

    <!-- Chat Messages -->
    <div v-if="currentChat" class="chat-content">
      <!-- Messages Area -->
      <div ref="messagesContainer" class="messages-container">
        <!-- Load More Button -->
        <div v-if="hasMoreMessages" class="text-center mb-4">
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
        
        <div v-if="isLoadingMessages" class="text-center text-gray-500 py-8">
          <div class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          Đang tải tin nhắn...
        </div>
        <div v-else-if="messagesCount === 0" class="text-center text-gray-500 py-8">
          <div class="w-12 h-12 mx-auto mb-2 bg-gray-300 rounded-full flex items-center justify-center">
            ✨
          </div>
          Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="message in messages"
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
                {{ message.sender?.firstName }} {{ message.sender?.lastName }}
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
      <div class="message-input">
        <form @submit.prevent="sendMessage" class="flex space-x-3 items-center w-full">
          <textarea
            v-model="newMessage"
            placeholder="Nhập tin nhắn..."
            class="form-input flex-1 resize-none"
            rows="1"
            :disabled="isSending"
            @input="handleTyping"
            @keydown="onKeydown"
          ></textarea>
          <button
            type="submit"
            :disabled="!newMessage.trim() || isSending"
            class="btn btn-primary px-6 py-3"
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
import { useAuthStore, useChatStore, useUIStore } from '../store'

export default {
  name: 'Chat',
  setup() {
    const route = useRoute()
    const authStore = useAuthStore()
    const chatStore = useChatStore()
    const uiStore = useUIStore()
    
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
      return message.sender?._id === authStore.currentUser?._id
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

    // Computed properties để đảm bảo reactivity
    const currentChat = computed(() => chatStore.currentChat)
    const messages = computed(() => chatStore.messages)
    const messagesCount = computed(() => chatStore.messages.length)
    const isLoadingMessages = computed(() => chatStore.isLoadingMessages)
    const hasMoreMessages = computed(() => chatStore.hasMoreMessages)
    const error = computed(() => chatStore.error)

    const loadMoreMessages = async () => {
      if (isLoadingMore.value || !hasMoreMessages.value || !currentChat.value) return
      
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
      if (scrollTop === 0 && hasMoreMessages.value) {
        loadMoreMessages()
      }
    }

    const sendMessage = async () => {
      if (!newMessage.value.trim() || !currentChat.value || isSending.value) return

      isSending.value = true
      const content = newMessage.value.trim()
      
      // Clear draft and input immediately for better UX
      chatStore.clearDraft(currentChat.value._id)
      newMessage.value = ''
      
      // Stop typing indicator - handled by socket service

      try {
        console.log('🚀 Sending message:', { chatId: currentChat.value._id, content })
        const message = await chatStore.sendMessage(currentChat.value._id, content)
        
        if (message) {
          console.log('✅ Message sent successfully, scrolling to bottom')
          scrollToBottom()
        } else {
          console.log('❌ Message sending failed, restoring content')
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
      if (!currentChat.value) return
      
      // Save draft
      chatStore.saveDraft(currentChat.value._id, newMessage.value)
      
      // Send typing indicator - handled by socket service
      
      // Clear previous timeout
      if (typingTimeout.value) {
        clearTimeout(typingTimeout.value)
      }
      
      // Stop typing after 3 seconds of inactivity - handled by socket service
      typingTimeout.value = setTimeout(() => {
        // Socket service will handle typing stop
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
      if (!currentChat.value) return []
      return chatStore.getTypingUsers(currentChat.value._id)
        .filter(userId => userId !== authStore.currentUser?._id)
        .map(userId => {
          const user = authStore.contacts.find(c => c._id === userId)
          return user ? `${user.firstName} ${user.lastName}` : 'Someone'
        })
    })

    // Watch for new messages to auto-scroll
    watch(() => messagesCount.value, (newCount, oldCount) => {
      console.log('📊 Messages count changed:', { oldCount, newCount })
      scrollToBottom()
    })

    // Debug watcher for messages array
    watch(() => messages.value, (newMessages, oldMessages) => {
      console.log('📬 Messages array changed:', {
        oldLength: oldMessages?.length || 0,
        newLength: newMessages?.length || 0,
        messages: newMessages
      })
    }, { deep: true })

    // Watch for chat changes
    watch(() => route.params.id, (newChatId) => {
      if (newChatId && currentChat.value?._id !== newChatId) {
        const chat = chatStore.chats.find(c => c._id === newChatId)
        if (chat) {
          console.log('🔄 ROUTE: Chat changed via route, setting current chat:', newChatId)
          chatStore.setCurrentChat(chat)
          
          // Load draft
          newMessage.value = chatStore.getDraft(chat._id)
        } else {
          console.log('⚠️ ROUTE: Chat not found in loaded chats, waiting...', newChatId)
        }
      } else if (!newChatId && currentChat.value) {
        console.log('🔄 ROUTE: No chat ID in route, clearing current chat')
        chatStore.setCurrentChat(null)
      }
    }, { immediate: true })

    // Watch for current chat changes to load draft
    watch(() => currentChat.value, (newChat, oldChat) => {
      if (oldChat) {
        // Save draft for previous chat
        chatStore.saveDraft(oldChat._id, newMessage.value)
        // Stop typing for previous chat - handled by socket service
      }
      
      if (newChat) {
        // Load draft for new chat
        newMessage.value = chatStore.getDraft(newChat._id)
      }
    })

    onMounted(async () => {
      console.log('🚀 CHAT: Component mounted, route chatId:', route.params.id)
      console.log('🚀 CHAT: Current chat from store:', currentChat.value?._id)
      
      const chatId = route.params.id
      
      // If we have a chat ID in route but no current chat, or they don't match
      if (chatId && currentChat.value?._id !== chatId) {
        console.log('🔍 CHAT: Looking for chat in loaded chats:', chatId)
        let chat = chatStore.chats.find(c => c._id === chatId)
        
        // If chat not found and chats are not loaded yet, wait for them
        if (!chat && chatStore.chats.length === 0 && !chatStore.isLoading) {
          console.log('📥 CHAT: Chats not loaded, fetching...')
          await chatStore.fetchChats()
          chat = chatStore.chats.find(c => c._id === chatId)
        }
        
        if (chat) {
          console.log('✅ CHAT: Found chat, setting as current:', chat._id)
          chatStore.setCurrentChat(chat)
          newMessage.value = chatStore.getDraft(chat._id)
        } else {
          console.log('❌ CHAT: Chat not found:', chatId)
        }
      } else if (!chatId && currentChat.value) {
        console.log('🔄 CHAT: No chat ID in route but have current chat, clearing')
        chatStore.setCurrentChat(null)
      } else if (chatId && currentChat.value?._id === chatId) {
        console.log('✅ CHAT: Route and current chat match, loading draft')
        newMessage.value = chatStore.getDraft(chatId)
        
        // If current chat exists but no messages, ensure messages are loaded
        if (currentChat.value && chatStore.messages.length === 0 && !chatStore.isLoadingMessages) {
          console.log('📥 CHAT: Current chat has no messages, fetching...')
          await chatStore.fetchMessages(currentChat.value._id)
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
      if (currentChat.value) {
        chatStore.saveDraft(currentChat.value._id, newMessage.value)
        // Stop typing handled by socket service
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
      // Computed properties
      currentChat,
      messages,
      messagesCount,
      isLoadingMessages,
      hasMoreMessages,
      error,
      // Methods
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

<style scoped>
.chat-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  height: 64px;
  background-color: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 1rem;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.chat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  min-height: 0;
}

.message-input {
  min-height: 100px;
  border-top: 1px solid #e5e7eb;
  padding: 1.5rem;
  background-color: white;
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
}

.message {
  margin-bottom: 0.75rem;
}

.message.own {
  display: flex;
  justify-content: flex-end;
}

.message.other {
  display: flex;
  justify-content: flex-start;
}

.message-bubble {
  max-width: 75%;
  word-wrap: break-word;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  padding: 0.75rem;
  border-radius: 0.5rem;
}

.message.own .message-bubble {
  background-color: #3b82f6;
  color: white;
}

.message.other .message-bubble {
  background-color: #f3f4f6;
  color: #374151;
}

/* Scroll styling for messages */
.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* Form textarea auto-resize */
.form-input {
  resize: none;
  overflow-y: auto;
  flex: 1;
  margin-right: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 1rem;
  font-size: 1rem;
  line-height: 1.5;
  background-color: #f9fafb;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  background-color: white;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.btn {
  border-radius: 1rem;
  font-weight: 600;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  height: 48px;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2563eb;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
  transform: none;
}
</style>