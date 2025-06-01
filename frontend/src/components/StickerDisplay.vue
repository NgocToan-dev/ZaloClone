<template>
  <div class="sticker-display">
    <!-- Sticker Image -->
    <div
      class="sticker-wrapper"
      :class="{
        'sticker-animated': stickerData.isAnimated,
        'sticker-large': size === 'large',
        'sticker-medium': size === 'medium',
        'sticker-small': size === 'small'
      }"
    >
      <img
        :src="stickerData.stickerUrl"
        :alt="stickerData.stickerName || 'Sticker'"
        class="sticker-image"
        :title="stickerData.stickerName"
        @error="handleImageError"
        @load="handleImageLoad"
        v-show="!imageError"
      />
      
      <!-- Error fallback -->
      <div
        v-if="imageError"
        class="sticker-error flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg"
      >
        <div class="text-center text-gray-500 dark:text-gray-400">
          <svg class="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
          <p class="text-xs">Failed to load</p>
        </div>
      </div>

      <!-- Loading state -->
      <div
        v-if="loading"
        class="sticker-loading flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg"
      >
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    </div>

    <!-- Sticker Info (optional, for debugging) -->
    <div v-if="showInfo" class="sticker-info mt-1 text-xs text-gray-500">
      <p>{{ stickerData.stickerName }}</p>
      <p v-if="stickerData.isAnimated" class="text-green-600">Animated</p>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';

export default {
  name: 'StickerDisplay',
  props: {
    // Sticker message content (parsed from message.content for sticker messages)
    stickerData: {
      type: Object,
      required: true,
      validator: (data) => {
        return data && 
               typeof data.stickerId === 'string' && 
               typeof data.stickerUrl === 'string';
      }
    },
    // Size of the sticker
    size: {
      type: String,
      default: 'medium',
      validator: (value) => ['small', 'medium', 'large'].includes(value)
    },
    // Show sticker info (for debugging)
    showInfo: {
      type: Boolean,
      default: false
    },
    // Click handler
    clickable: {
      type: Boolean,
      default: false
    }
  },
  emits: ['sticker-click'],
  setup(props, { emit }) {
    // Component state
    const loading = ref(true);
    const imageError = ref(false);

    // Computed properties
    const stickerDimensions = computed(() => {
      const dimensions = props.stickerData.dimensions;
      if (!dimensions) return null;

      // Scale dimensions based on size prop
      const scale = {
        small: 0.5,
        medium: 0.75,
        large: 1.0
      }[props.size];

      return {
        width: Math.round(dimensions.width * scale),
        height: Math.round(dimensions.height * scale)
      };
    });

    const stickerStyle = computed(() => {
      const dimensions = stickerDimensions.value;
      if (!dimensions) return {};

      return {
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        maxWidth: '200px',
        maxHeight: '200px'
      };
    });

    // Methods
    const handleImageLoad = () => {
      loading.value = false;
      imageError.value = false;
    };

    const handleImageError = (event) => {
      console.warn('Failed to load sticker:', props.stickerData.stickerUrl);
      loading.value = false;
      imageError.value = true;
    };

    const handleStickerClick = () => {
      if (props.clickable) {
        emit('sticker-click', props.stickerData);
      }
    };

    // Lifecycle hooks
    onMounted(() => {
      // Preload image
      const img = new Image();
      img.onload = handleImageLoad;
      img.onerror = handleImageError;
      img.src = props.stickerData.stickerUrl;
    });

    return {
      // State
      loading,
      imageError,
      stickerDimensions,
      stickerStyle,

      // Methods
      handleImageLoad,
      handleImageError,
      handleStickerClick
    };
  }
};
</script>

<style scoped>
.sticker-display {
  display: inline-block;
  max-width: 200px;
}

.sticker-wrapper {
  position: relative;
  display: inline-block;
  border-radius: 8px;
  overflow: hidden;
}

.sticker-image {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  transition: transform 0.2s ease;
}

/* Size variants */
.sticker-small .sticker-image {
  max-width: 64px;
  max-height: 64px;
}

.sticker-medium .sticker-image {
  max-width: 128px;
  max-height: 128px;
}

.sticker-large .sticker-image {
  max-width: 200px;
  max-height: 200px;
}

/* Animated stickers */
.sticker-animated .sticker-image {
  /* Add any special styling for animated stickers */
}

/* Hover effects for clickable stickers */
.sticker-wrapper:hover .sticker-image {
  transform: scale(1.05);
  cursor: pointer;
}

/* Error and loading states */
.sticker-error,
.sticker-loading {
  min-width: 64px;
  min-height: 64px;
  max-width: 128px;
  max-height: 128px;
}

.sticker-small .sticker-error,
.sticker-small .sticker-loading {
  width: 64px;
  height: 64px;
}

.sticker-medium .sticker-error,
.sticker-medium .sticker-loading {
  width: 128px;
  height: 128px;
}

.sticker-large .sticker-error,
.sticker-large .sticker-loading {
  width: 200px;
  height: 200px;
}

/* Animation for loading */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.sticker-loading {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>