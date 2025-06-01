<template>
  <div class="sticker-picker-container relative">
    <!-- Sticker Picker Button -->
    <button
      @click="togglePicker"
      class="sticker-picker-button"
      :class="{ 'active': isOpen }"
      title="Chọn sticker"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    </button>

    <!-- Sticker Picker Dropdown -->
    <div
      v-if="isOpen"
      ref="pickerDropdown"
      class="sticker-picker-dropdown absolute bottom-full right-0 mb-2 w-80 h-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50"
    >
      <!-- Header -->
      <div class="sticker-picker-header p-3 border-b border-gray-200 dark:border-gray-600">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">Stickers</h3>
          <button
            @click="closePicker"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Pack Tabs -->
        <div class="pack-tabs mt-2 flex overflow-x-auto scrollbar-hide space-x-1">
          <button
            v-for="pack in userPacks"
            :key="pack._id"
            @click="selectPack(pack._id)"
            class="pack-tab flex-shrink-0 px-3 py-1 text-xs rounded-full border transition-colors"
            :class="selectedPackId === pack._id 
              ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900 dark:border-blue-600 dark:text-blue-200'
              : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'"
          >
            {{ pack.name }}
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center h-64">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="flex items-center justify-center h-64 text-red-500">
        <div class="text-center">
          <p class="text-sm">{{ error }}</p>
          <button
            @click="loadUserPacks"
            class="mt-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            Try again
          </button>
        </div>
      </div>

      <!-- Stickers Grid -->
      <div v-else class="stickers-container p-3 h-64 overflow-y-auto">
        <div v-if="selectedPackStickers.length === 0" class="flex items-center justify-center h-full text-gray-500">
          <p class="text-sm">No stickers in this pack</p>
        </div>
        
        <div v-else class="stickers-grid grid grid-cols-6 gap-2">
          <button
            v-for="sticker in selectedPackStickers"
            :key="sticker._id"
            @click="selectSticker(sticker)"
            class="sticker-item p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
            :title="sticker.name"
          >
            <img
              :src="sticker.url"
              :alt="sticker.name"
              class="w-full h-auto max-w-12 max-h-12 mx-auto"
              :class="{ 'group-hover:scale-110 transition-transform': true }"
              @error="handleImageError"
            />
          </button>
        </div>
      </div>

      <!-- Pack Management Footer -->
      <div class="sticker-picker-footer p-3 border-t border-gray-200 dark:border-gray-600">
        <button
          @click="openStickerStore"
          class="w-full text-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
        >
          + Get more sticker packs
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useChatStore } from '../store/chat';
import stickerApi from '../services/business/stickerApi';

export default {
  name: 'StickerPicker',
  emits: ['sticker-selected', 'open-sticker-store'],
  setup(props, { emit }) {
    const chatStore = useChatStore();
    const { currentChat } = storeToRefs(chatStore);

    // Component state
    const isOpen = ref(false);
    const loading = ref(false);
    const error = ref(null);
    const pickerDropdown = ref(null);

    // Sticker data
    const userPacks = ref([]);
    const selectedPackId = ref(null);
    const packStickers = ref(new Map()); // Cache stickers by pack ID

    // Computed properties
    const selectedPackStickers = computed(() => {
      if (!selectedPackId.value) return [];
      return packStickers.value.get(selectedPackId.value) || [];
    });

    // Methods
    const togglePicker = () => {
      if (isOpen.value) {
        closePicker();
      } else {
        openPicker();
      }
    };

    const openPicker = async () => {
      isOpen.value = true;
      if (userPacks.value.length === 0) {
        await loadUserPacks();
      }
    };

    const closePicker = () => {
      isOpen.value = false;
    };

    const loadUserPacks = async () => {
      try {
        loading.value = true;
        error.value = null;
        
        const response = await stickerApi.getUserStickerPacks();
        userPacks.value = response.packs || [];
        
        // Select first pack by default
        if (userPacks.value.length > 0 && !selectedPackId.value) {
          selectedPackId.value = userPacks.value[0]._id;
        }
      } catch (err) {
        console.error('Error loading user sticker packs:', err);
        error.value = 'Failed to load sticker packs';
      } finally {
        loading.value = false;
      }
    };

    const selectPack = async (packId) => {
      selectedPackId.value = packId;
      await loadPackStickers(packId);
    };

    const loadPackStickers = async (packId) => {
      // Return cached stickers if available
      if (packStickers.value.has(packId)) {
        return;
      }

      try {
        const response = await stickerApi.getPackStickers(packId);
        packStickers.value.set(packId, response.stickers || []);
      } catch (err) {
        console.error('Error loading pack stickers:', err);
        packStickers.value.set(packId, []);
      }
    };

    const selectSticker = (sticker) => {
      if (!currentChat.value) {
        console.warn('No active chat selected');
        return;
      }

      const stickerData = {
        stickerId: sticker._id,
        packId: selectedPackId.value,
        chatId: currentChat.value._id,
        stickerUrl: sticker.url,
        stickerName: sticker.name,
        isAnimated: sticker.isAnimated || false,
        dimensions: sticker.dimensions
      };

      emit('sticker-selected', stickerData);
      closePicker();
    };

    const openStickerStore = () => {
      emit('open-sticker-store');
      closePicker();
    };

    const handleImageError = (event) => {
      console.warn('Failed to load sticker image:', event.target.src);
      event.target.style.display = 'none';
    };

    const handleClickOutside = (event) => {
      if (pickerDropdown.value && !pickerDropdown.value.contains(event.target)) {
        closePicker();
      }
    };

    // Watch for pack selection changes
    watch(selectedPackId, async (newPackId) => {
      if (newPackId) {
        await loadPackStickers(newPackId);
      }
    });

    // Lifecycle hooks
    onMounted(() => {
      document.addEventListener('click', handleClickOutside);
    });

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside);
    });

    return {
      // State
      isOpen,
      loading,
      error,
      pickerDropdown,
      userPacks,
      selectedPackId,
      selectedPackStickers,

      // Methods
      togglePicker,
      closePicker,
      loadUserPacks,
      selectPack,
      selectSticker,
      openStickerStore,
      handleImageError
    };
  }
};
</script>

<style scoped>
.sticker-picker-button {
  width: 25px;
  height: 25px;
  border-radius: 50%;
  background-color: transparent;
  color: #6b7280;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.sticker-picker-button:hover {
  background-color: #f3f4f6;
  color: #374151;
  transform: scale(1.1);
}

.sticker-picker-button.active {
  background-color: #dbeafe;
  color: #3b82f6;
}

.sticker-picker-button:active {
  transform: scale(0.95);
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.sticker-item:hover img {
  transform: scale(1.1);
}

.pack-tabs {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.pack-tabs::-webkit-scrollbar {
  display: none;
}
</style>