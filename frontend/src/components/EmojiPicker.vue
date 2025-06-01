<template>
  <div class="emoji-picker-container">
    <!-- Emoji Picker Button -->
    <button
      @click="togglePicker"
      class="emoji-button"
      :class="{ 'active': showPicker }"
      type="button"
      title="Thêm biểu cảm"
    >
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM12 20c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
      </svg>
    </button>

    <!-- Emoji Picker Dropdown -->
    <div
      v-if="showPicker"
      ref="pickerContainer"
      class="absolute bottom-full mb-2 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 w-80 max-h-96 overflow-hidden"
      @click.stop
    >
      <!-- Quick Reactions -->
      <div class="p-3 border-b border-gray-200 dark:border-gray-600">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Reactions</h3>
          <button
            @click="closePicker"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.3 5.7L12 12l6.3 6.3c.4.4.4 1 0 1.4s-1 .4-1.4 0L12 13.4l-6.3 6.3c-.4.4-1 .4-1.4 0s-.4-1 0-1.4L10.6 12 4.3 5.7c-.4-.4-.4-1 0-1.4s1-.4 1.4 0L12 10.6l6.3-6.3c.4-.4 1-.4 1.4 0s.4 1 0 1.4z"/>
            </svg>
          </button>
        </div>
        <div class="flex space-x-1">
          <button
            v-for="emoji in quickReactions"
            :key="emoji"
            @click="selectEmoji(emoji)"
            class="text-xl p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {{ emoji }}
          </button>
        </div>
      </div>

      <!-- Search -->
      <div class="p-3 border-b border-gray-200 dark:border-gray-600">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search emojis..."
          class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <!-- Emoji Categories -->
      <div class="max-h-60 overflow-y-auto">
        <div v-for="category in filteredCategories" :key="category.name" class="p-3">
          <h4 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            {{ category.name }}
          </h4>
          <div class="grid grid-cols-8 gap-1">
            <button
              v-for="emoji in category.emojis"
              :key="emoji"
              @click="selectEmoji(emoji)"
              class="text-lg p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              :title="emoji"
            >
              {{ emoji }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'

export default {
  name: 'EmojiPicker',
  emits: ['emoji-selected'],
  setup(props, { emit }) {
    const showPicker = ref(false)
    const searchQuery = ref('')
    const pickerContainer = ref(null)

    // Quick reactions (most commonly used emojis)
    const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '😡']

    // Emoji categories
    const emojiCategories = [
      {
        name: 'Smileys & People',
        emojis: [
          '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊',
          '😋', '😎', '😍', '😘', '🥰', '😗', '😙', '😚', '🙂', '🤗',
          '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥',
          '😮', '🤐', '😯', '😪', '😫', '😴', '😌', '😛', '😜', '😝',
          '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️', '🙁',
          '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩',
          '🤯', '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪', '😵', '🥴',
          '😠', '😡', '🤬', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '😇'
        ]
      },
      {
        name: 'Animals & Nature',
        emojis: [
          '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
          '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒',
          '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇',
          '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜',
          '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕',
          '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳'
        ]
      },
      {
        name: 'Food & Drink',
        emojis: [
          '🍎', '🍏', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈',
          '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦',
          '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔',
          '🍠', '🥐', '🥖', '🍞', '🥨', '🥯', '🧀', '🥚', '🍳', '🧈',
          '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟',
          '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕'
        ]
      },
      {
        name: 'Activities',
        emojis: [
          '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
          '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳',
          '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️',
          '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺',
          '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴'
        ]
      },
      {
        name: 'Objects',
        emojis: [
          '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️',
          '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥',
          '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️',
          '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋',
          '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴'
        ]
      },
      {
        name: 'Symbols',
        emojis: [
          '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
          '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
          '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐',
          '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐',
          '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳'
        ]
      }
    ]

    const filteredCategories = computed(() => {
      if (!searchQuery.value) {
        return emojiCategories
      }
      
      const query = searchQuery.value.toLowerCase()
      return emojiCategories.map(category => ({
        ...category,
        emojis: category.emojis.filter(emoji => 
          emoji.toLowerCase().includes(query)
        )
      })).filter(category => category.emojis.length > 0)
    })

    const togglePicker = () => {
      showPicker.value = !showPicker.value
    }

    const closePicker = () => {
      showPicker.value = false
    }

    const selectEmoji = (emoji) => {
      emit('emoji-selected', emoji)
      closePicker()
    }

    const handleClickOutside = (event) => {
      if (pickerContainer.value && !pickerContainer.value.contains(event.target)) {
        closePicker()
      }
    }

    onMounted(() => {
      document.addEventListener('click', handleClickOutside)
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })

    return {
      showPicker,
      searchQuery,
      pickerContainer,
      quickReactions,
      filteredCategories,
      togglePicker,
      closePicker,
      selectEmoji
    }
  }
}
</script>

<style scoped>
.emoji-picker-container {
  position: relative;
}

.emoji-button {
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

.emoji-button:hover {
  background-color: #f3f4f6;
  color: #374151;
  transform: scale(1.1);
}

.emoji-button.active {
  background-color: #dbeafe;
  color: #3b82f6;
}

.emoji-button:active {
  transform: scale(0.95);
}

/* Custom scrollbar for webkit browsers */
.max-h-60::-webkit-scrollbar {
  width: 6px;
}

.max-h-60::-webkit-scrollbar-track {
  background: transparent;
}

.max-h-60::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.dark .max-h-60::-webkit-scrollbar-thumb {
  background: #4a5568;
}
</style>