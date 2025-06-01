<template>
  <div class="chat-view">
    <!-- Chat Header -->
    <div v-if="currentChat" class="chat-header">
      <h2 class="font-semibold text-gray-900">💬 {{ getChatName(currentChat) }}</h2>
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
            <svg
              v-if="isLoadingMore"
              class="animate-spin w-3 h-3 mr-1"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            {{ isLoadingMore ? "Đang tải..." : "Tải tin nhắn cũ hơn" }}
          </button>
        </div>

        <div v-if="isLoadingMessages" class="text-center text-gray-500 py-8">
          <div
            class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"
          ></div>
          Đang tải tin nhắn...
        </div>
        <div v-else-if="messagesCount === 0" class="text-center text-gray-500 py-8">
          <div
            class="w-12 h-12 mx-auto mb-2 bg-gray-300 rounded-full flex items-center justify-center"
          >
            ✨
          </div>
          Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="message in messages"
            :key="message._id"
            class="message-wrapper"
            :class="{ 'own': isOwnMessage(message), 'other': !isOwnMessage(message) }"
          >
            <!-- Sender Name (for other users) -->
            <div v-if="!isOwnMessage(message)" class="sender-name text-xs text-gray-500 mb-1 ml-2">
              {{ message.sender?.firstName }} {{ message.sender?.lastName }}
            </div>
            
            <div class="message-content flex items-start gap-2">
              <div
                class="message-bubble max-w-xs lg:max-w-md p-3 rounded-lg border"
                :class="{
                  'bg-blue-50 border-blue-200 text-gray-900': isOwnMessage(message),
                  'bg-white border-gray-200 text-gray-900': !isOwnMessage(message),
                }"
              >
                <!-- Sticker Message -->
                <StickerDisplay
                  v-if="chatStore.isStickerMessage(message)"
                  :stickerData="chatStore.parseStickerContent(message)"
                  size="medium"
                />

                <!-- Text Message -->
                <p v-else-if="message.content" class="text-sm whitespace-pre-wrap">
                  {{ message.content }}
                </p>

                <!-- File Attachments -->
                <AttachmentDisplay
                  v-if="message.attachments && message.attachments.length > 0"
                  :attachments="message.attachments"
                />
              </div>
              
              <!-- Three Dot Menu for Reactions -->
              <div class="message-menu relative " v-if="!isOwnMessage(message)">
                <button
                  @click="toggleMessageMenu(message._id)"
                  class="message-menu-btn opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded-full"
                  :class="{ 'opacity-100': openMenuId === message._id }"
                >
                  <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                  </svg>
                </button>
                
                <!-- Reaction Menu Dropdown -->
                <div
                  v-if="openMenuId === message._id"
                  class="absolute right-0 top-8 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex space-x-1"
                  @click.stop
                >
                  <button
                    v-for="emoji in quickReactions"
                    :key="emoji"
                    @click="handleAddReaction({ messageId: message._id, emoji })"
                    class="text-lg p-2 rounded hover:bg-gray-100 transition-colors"
                    :title="`React with ${emoji}`"
                  >
                    {{ emoji }}
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Existing Reactions Display -->
            <div v-if="message.reactions && message.reactions.length > 0" class="reactions-display mt-1 ml-2">
              <EmojiReaction
                :reactions="message.reactions"
                :messageId="message._id"
                :isOwnMessage="isOwnMessage(message)"
                @add-reaction="handleAddReaction"
                @remove-reaction="handleRemoveReaction"
              />
            </div>
            
            <!-- Message Info (Time and Read Status) -->
            <div class="message-info text-xs text-gray-500 mt-1 px-2"
                 :class="{ 'text-right': isOwnMessage(message), 'text-left': !isOwnMessage(message) }">
              {{ formatMessageTime(message.createdAt) }}
              <span v-if="isOwnMessage(message)" class="ml-1"> ✓ </span>
            </div>
          </div>
        </div>

        <!-- Typing Indicator -->
        <div
          v-if="typingUsers.length > 0"
          class="flex items-center space-x-2 mt-3 text-gray-500 text-sm"
        >
          <div class="flex space-x-1">
            <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div
              class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style="animation-delay: 0.1s"
            ></div>
            <div
              class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style="animation-delay: 0.2s"
            ></div>
          </div>
          <span>
            {{
              typingUsers.length === 1
                ? `${typingUsers[0]} đang nhập...`
                : `${typingUsers.join(", ")} đang nhập...`
            }}
          </span>
        </div>
      </div>

      <!-- Message Input -->
      <div class="message-input">
        <form @submit.prevent="sendMessage" class="flex items-center space-x-3 w-full">
          <!-- File Upload Button -->
          <div class="flex items-center space-x-2">
            <FileUpload
              v-if="currentChat"
              :chatId="currentChat._id"
              @files-uploaded="handleFilesUploaded"
              @upload-error="handleUploadError"
            />
            <StickerPicker
              @sticker-selected="handleStickerSelected"
              @open-sticker-store="openStickerStore"
            />
            <EmojiPicker @emoji-selected="handleEmojiSelected" />
          </div>

          <!-- Message Input Area -->
          <div class="flex-1 relative flex items-center">
            <textarea
              v-model="newMessage"
              placeholder="Nhập tin nhắn..."
              class="form-input w-full resize-none pr-20"
              rows="1"
              :disabled="isSending"
              @input="handleTyping"
              @keydown="onKeydown"
            ></textarea>
          </div>

          <!-- Send Button -->
          <div class="flex-shrink-0">
            <button
              type="submit"
              :disabled="!newMessage.trim() || isSending"
              class="btn btn-primary"
            >
              <svg
                v-if="isSending"
                class="animate-spin w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <svg
                v-else
                class="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Sticker Store Modal -->
    <StickerStore
      v-if="showStickerStore"
      @close="closeStickerStore"
      @pack-downloaded="handlePackDownloaded"
    />
  </div>
</template>

<script>
import { ref, nextTick, watch, onMounted, onUnmounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore, useChatStore, useUIStore } from "../store";
import FileUpload from "@/components/FileUpload.vue";
import AttachmentDisplay from "@/components/AttachmentDisplay.vue";
import EmojiPicker from "@/components/EmojiPicker.vue";
import EmojiReaction from "@/components/EmojiReaction.vue";
import StickerPicker from "@/components/StickerPicker.vue";
import StickerDisplay from "@/components/StickerDisplay.vue";
import StickerStore from "@/components/StickerStore.vue";

export default {
  name: "Chat",
  components: {
    FileUpload,
    AttachmentDisplay,
    EmojiPicker,
    EmojiReaction,
    StickerPicker,
    StickerDisplay,
    StickerStore,
  },
  setup() {
    const route = useRoute();
    const authStore = useAuthStore();
    const chatStore = useChatStore();
    const uiStore = useUIStore();

    const messagesContainer = ref(null);
    const newMessage = ref("");
    const isSending = ref(false);
    const isLoadingMore = ref(false);
    const typingTimeout = ref(null);
    const showStickerStore = ref(false);
    const openMenuId = ref(null);
    
    // Quick reactions for the three-dot menu
    const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '😡'];

    const getChatName = (chat) => {
      const currentUserId = authStore.currentUser?._id;
      const otherParticipant = chat.participants.find((p) => p._id !== currentUserId);
      return otherParticipant
        ? `${otherParticipant.firstName} ${otherParticipant.lastName}`
        : "Unknown User";
    };

    const isOwnMessage = (message) => {
      return message.sender?._id === authStore.currentUser?._id;
    };

    const formatMessageTime = (dateString) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      } else if (diffDays <= 7) {
        return date.toLocaleDateString([], {
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
      } else {
        return date.toLocaleDateString([], {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    };

    const scrollToBottom = () => {
      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
        }
      });
    };

    // Computed properties để đảm bảo reactivity
    const currentChat = computed(() => chatStore.currentChat);
    const messages = computed(() => chatStore.messages);
    const messagesCount = computed(() => chatStore.messages.length);
    const isLoadingMessages = computed(() => chatStore.isLoadingMessages);
    const hasMoreMessages = computed(() => chatStore.hasMoreMessages);
    const error = computed(() => chatStore.error);

    const loadMoreMessages = async () => {
      if (isLoadingMore.value || !hasMoreMessages.value || !currentChat.value) return;

      isLoadingMore.value = true;
      const scrollHeight = messagesContainer.value?.scrollHeight || 0;

      try {
        await chatStore.loadMoreMessages();

        // Maintain scroll position
        nextTick(() => {
          if (messagesContainer.value) {
            const newScrollHeight = messagesContainer.value.scrollHeight;
            messagesContainer.value.scrollTop = newScrollHeight - scrollHeight;
          }
        });
      } catch (error) {
        console.error("Failed to load more messages:", error);
        uiStore.addToast({
          type: "error",
          message: "Không thể tải thêm tin nhắn",
        });
      } finally {
        isLoadingMore.value = false;
      }
    };

    const handleScroll = () => {
      if (!messagesContainer.value) return;

      const { scrollTop } = messagesContainer.value;

      // Load more messages when scrolled to top
      if (scrollTop === 0 && hasMoreMessages.value) {
        loadMoreMessages();
      }
    };

    const sendMessage = async () => {
      if (!newMessage.value.trim() || !currentChat.value || isSending.value) return;

      isSending.value = true;
      const content = newMessage.value.trim();

      // Clear draft and input immediately for better UX
      chatStore.clearDraft(currentChat.value._id);
      newMessage.value = "";

      // Stop typing indicator - handled by socket service

      try {
        console.log("🚀 Sending message:", { chatId: currentChat.value._id, content });
        const message = await chatStore.sendMessage(currentChat.value._id, content);

        if (message) {
          console.log("✅ Message sent successfully, scrolling to bottom");
          scrollToBottom();
        } else {
          console.log("❌ Message sending failed, restoring content");
          // Restore message if sending failed
          newMessage.value = content;
        }
      } catch (error) {
        console.error("Failed to send message:", error);
        newMessage.value = content;
        uiStore.addToast({
          type: "error",
          message: "Không thể gửi tin nhắn",
        });
      } finally {
        isSending.value = false;
      }
    };

    const handleTyping = () => {
      if (!currentChat.value) return;

      // Save draft
      chatStore.saveDraft(currentChat.value._id, newMessage.value);

      // Send typing indicator - handled by socket service

      // Clear previous timeout
      if (typingTimeout.value) {
        clearTimeout(typingTimeout.value);
      }

      // Stop typing after 3 seconds of inactivity - handled by socket service
      typingTimeout.value = setTimeout(() => {
        // Socket service will handle typing stop
      }, 3000);
    };

    const onKeydown = (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    };

    const handleFilesUploaded = () => {
      console.log("✅ Files uploaded successfully");
      scrollToBottom();
      uiStore.addToast({
        type: "success",
        message: "Files uploaded successfully",
      });
    };

    const handleUploadError = (error) => {
      console.error("❌ File upload error:", error);
      uiStore.addToast({
        type: "error",
        message: error.message || "Failed to upload files",
      });
    };

    const handleEmojiSelected = (emoji) => {
      console.log("😀 Emoji selected:", emoji);
      newMessage.value += emoji;

      // Trigger typing indicator
      handleTyping();
    };

    const handleAddReaction = async (data) => {
      try {
        console.log("😍 Adding reaction:", data);
        await chatStore.toggleReaction(data.messageId, data.emoji);
        
        // Close the menu after adding reaction
        openMenuId.value = null;

        uiStore.addToast({
          type: "success",
          message: `Reacted with ${data.emoji}`,
          duration: 1000,
        });
      } catch (error) {
        console.error("❌ Failed to add reaction:", error);
        uiStore.addToast({
          type: "error",
          message: "Failed to add reaction",
        });
      }
    };

    const handleRemoveReaction = async (data) => {
      try {
        console.log("🗑️ Removing reaction:", data);
        await chatStore.removeReaction(data.messageId);

        uiStore.addToast({
          type: "success",
          message: "Reaction removed",
          duration: 1000,
        });
      } catch (error) {
        console.error("❌ Failed to remove reaction:", error);
        uiStore.addToast({
          type: "error",
          message: "Failed to remove reaction",
        });
      }
    };

    const handleStickerSelected = async (stickerData) => {
      try {
        console.log("🎨 Sticker selected:", stickerData);

        if (!currentChat.value) {
          console.warn("No active chat selected");
          return;
        }

        await chatStore.sendStickerMessage(stickerData);
        scrollToBottom();

        uiStore.addToast({
          type: "success",
          message: "Sticker sent!",
          duration: 1000,
        });
      } catch (error) {
        console.error("❌ Failed to send sticker:", error);
        uiStore.addToast({
          type: "error",
          message: "Failed to send sticker",
        });
      }
    };

    const openStickerStore = () => {
      showStickerStore.value = true;
    };

    const closeStickerStore = () => {
      showStickerStore.value = false;
    };

    const handlePackDownloaded = (pack) => {
      uiStore.addToast({
        type: "success",
        message: `Downloaded "${pack.name}" sticker pack!`,
      });
    };

    const toggleMessageMenu = (messageId) => {
      openMenuId.value = openMenuId.value === messageId ? null : messageId;
    };

    const handleClickOutside = (event) => {
      if (!event.target.closest('.message-menu')) {
        openMenuId.value = null;
      }
    };

    // Get typing users for current chat
    const typingUsers = computed(() => {
      if (!currentChat.value) return [];
      return chatStore
        .getTypingUsers(currentChat.value._id)
        .filter((userId) => userId !== authStore.currentUser?._id)
        .map((userId) => {
          const user = authStore.contacts.find((c) => c._id === userId);
          return user ? `${user.firstName} ${user.lastName}` : "Someone";
        });
    });

    // Watch for new messages to auto-scroll
    watch(
      () => messagesCount.value,
      (newCount, oldCount) => {
        console.log("📊 Messages count changed:", { oldCount, newCount });
        scrollToBottom();
      }
    );

    // Debug watcher for messages array
    watch(
      () => messages.value,
      (newMessages, oldMessages) => {
        console.log("📬 Messages array changed:", {
          oldLength: oldMessages?.length || 0,
          newLength: newMessages?.length || 0,
          messages: newMessages,
        });
      },
      { deep: true }
    );

    // Watch for chat changes
    watch(
      () => route.params.id,
      (newChatId) => {
        if (newChatId && currentChat.value?._id !== newChatId) {
          const chat = chatStore.chats.find((c) => c._id === newChatId);
          if (chat) {
            console.log(
              "🔄 ROUTE: Chat changed via route, setting current chat:",
              newChatId
            );
            chatStore.setCurrentChat(chat);

            // Load draft
            newMessage.value = chatStore.getDraft(chat._id);
          } else {
            console.log(
              "⚠️ ROUTE: Chat not found in loaded chats, waiting...",
              newChatId
            );
          }
        } else if (!newChatId && currentChat.value) {
          console.log("🔄 ROUTE: No chat ID in route, clearing current chat");
          chatStore.setCurrentChat(null);
        }
      },
      { immediate: true }
    );

    // Watch for current chat changes to load draft
    watch(
      () => currentChat.value,
      (newChat, oldChat) => {
        if (oldChat) {
          // Save draft for previous chat
          chatStore.saveDraft(oldChat._id, newMessage.value);
          // Stop typing for previous chat - handled by socket service
        }

        if (newChat) {
          // Load draft for new chat
          newMessage.value = chatStore.getDraft(newChat._id);
        }
      }
    );

    onMounted(async () => {
      console.log("🚀 CHAT: Component mounted, route chatId:", route.params.id);
      console.log("🚀 CHAT: Current chat from store:", currentChat.value?._id);

      const chatId = route.params.id;

      // If we have a chat ID in route but no current chat, or they don't match
      if (chatId && currentChat.value?._id !== chatId) {
        console.log("🔍 CHAT: Looking for chat in loaded chats:", chatId);
        let chat = chatStore.chats.find((c) => c._id === chatId);

        // If chat not found and chats are not loaded yet, wait for them
        if (!chat && chatStore.chats.length === 0 && !chatStore.isLoading) {
          console.log("📥 CHAT: Chats not loaded, fetching...");
          await chatStore.fetchChats();
          chat = chatStore.chats.find((c) => c._id === chatId);
        }

        if (chat) {
          console.log("✅ CHAT: Found chat, setting as current:", chat._id);
          chatStore.setCurrentChat(chat);
          newMessage.value = chatStore.getDraft(chat._id);
        } else {
          console.log("❌ CHAT: Chat not found:", chatId);
        }
      } else if (!chatId && currentChat.value) {
        console.log("🔄 CHAT: No chat ID in route but have current chat, clearing");
        chatStore.setCurrentChat(null);
      } else if (chatId && currentChat.value?._id === chatId) {
        console.log("✅ CHAT: Route and current chat match, loading draft");
        newMessage.value = chatStore.getDraft(chatId);

        // If current chat exists but no messages, ensure messages are loaded
        if (
          currentChat.value &&
          chatStore.messages.length === 0 &&
          !chatStore.isLoadingMessages
        ) {
          console.log("📥 CHAT: Current chat has no messages, fetching...");
          await chatStore.fetchMessages(currentChat.value._id);
        }
      }

      // Add scroll listener
      if (messagesContainer.value) {
        messagesContainer.value.addEventListener("scroll", handleScroll);
      }

      // Add click outside listener for message menu
      document.addEventListener("click", handleClickOutside);

      scrollToBottom();
    });

    onUnmounted(() => {
      // Save draft before unmounting
      if (currentChat.value) {
        chatStore.saveDraft(currentChat.value._id, newMessage.value);
        // Stop typing handled by socket service
      }

      // Remove scroll listener
      if (messagesContainer.value) {
        messagesContainer.value.removeEventListener("scroll", handleScroll);
      }

      // Remove click outside listener
      document.removeEventListener("click", handleClickOutside);

      // Clear typing timeout
      if (typingTimeout.value) {
        clearTimeout(typingTimeout.value);
      }
    });

    return {
      authStore,
      chatStore,
      uiStore,
      messagesContainer,
      newMessage,
      isSending,
      isLoadingMore,
      typingUsers,
      showStickerStore,
      openMenuId,
      quickReactions,
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
      loadMoreMessages,
      handleFilesUploaded,
      handleUploadError,
      handleEmojiSelected,
      handleAddReaction,
      handleRemoveReaction,
      handleStickerSelected,
      openStickerStore,
      closeStickerStore,
      handlePackDownloaded,
      toggleMessageMenu,
      handleClickOutside,
    };
  },
};
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
  border-top: 1px solid #e5e7eb;
  padding: 1rem;
  background-color: white;
  flex-shrink: 0;
}

.message-wrapper {
  margin-bottom: 1rem;
}

.message-wrapper.own {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.message-wrapper.other {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.message-menu-btn{
  opacity: 0;
  transition: opacity 0.2s;
  border: none;
  padding: 0.25rem;
  border-radius: 50%;
  cursor: pointer;
}
.message-wrapper:hover .message-menu-btn {
  opacity: 1;
}

.message-content {
  display: flex;
  max-width: 75%;
}

.message-wrapper.own .message-content {
  align-items: flex-end;
}

.message-wrapper.other .message-content {
  align-items: flex-start;
}

.message-bubble {
  word-wrap: break-word;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  padding: 0.75rem;
  border-radius: 1rem;
}

.sender-name {
  font-weight: 500;
}

.message-info {
  font-size: 0.75rem;
  opacity: 0.75;
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
  border-radius: 50%;
  font-weight: 600;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: none;
  cursor: pointer;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.btn-primary:hover:not(:disabled) {
  background-color: #2563eb;
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4);
}

.btn-primary:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
</style>
