<template>
  <div v-if="attachments && attachments.length > 0" class="attachments mt-2">
    <div
      v-for="attachment in attachments"
      :key="attachment.fileId"
      class="attachment-item mb-2"
    >
      <!-- Image Attachment -->
      <div
        v-if="isImage(attachment.mimetype)"
        class="image-attachment cursor-pointer"
        @click="openImagePreview(attachment)"
      >
        <img
          :src="getFileUrl(attachment)"
          :alt="attachment.originalName"
          class="max-w-xs max-h-64 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          loading="lazy"
        />
        <div class="mt-1 text-xs text-gray-500">{{ attachment.originalName }}</div>
      </div>

      <!-- Video Attachment -->
      <div v-else-if="isVideo(attachment.mimetype)" class="video-attachment">
        <video
          :src="getFileUrl(attachment)"
          controls
          class="max-w-xs max-h-64 rounded-lg shadow-sm"
          :poster="attachment.thumbnailUrl"
        >
          Your browser does not support the video tag.
        </video>
        <div class="mt-1 text-xs text-gray-500">
          {{ attachment.originalName }}
          <span v-if="attachment.duration"> • {{ formatDuration(attachment.duration) }}</span>
        </div>
      </div>

      <!-- Audio Attachment -->
      <div v-else-if="isAudio(attachment.mimetype)" class="audio-attachment">
        <div class="bg-gray-50 rounded-lg p-3 max-w-xs">
          <div class="flex items-center space-x-2 mb-2">
            <i class="fas fa-music text-purple-500"></i>
            <span class="text-sm font-medium truncate">{{ attachment.originalName }}</span>
          </div>
          <audio
            :src="getFileUrl(attachment)"
            controls
            class="w-full"
          >
            Your browser does not support the audio tag.
          </audio>
          <div class="mt-1 text-xs text-gray-500">
            {{ formatFileSize(attachment.size) }}
            <span v-if="attachment.duration"> • {{ formatDuration(attachment.duration) }}</span>
          </div>
        </div>
      </div>

      <!-- Document/Other File Attachment -->
      <div v-else class="document-attachment">
        <div
          class="bg-gray-50 hover:bg-gray-100 rounded-lg p-3 cursor-pointer transition-colors max-w-xs"
          @click="downloadFile(attachment)"
        >
          <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <i :class="getFileIcon(attachment.mimetype)" class="text-2xl text-gray-500"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">
                {{ attachment.originalName }}
              </p>
              <p class="text-xs text-gray-500">
                {{ formatFileSize(attachment.size) }}
              </p>
            </div>
            <div class="flex-shrink-0">
              <i class="fas fa-download text-gray-400"></i>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Image Gallery Modal -->
    <div
      v-if="showImagePreview"
      class="image-preview-modal fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center"
      @click="closeImagePreview"
    >
      <div class="relative max-w-4xl max-h-full p-4">
        <button
          @click="closeImagePreview"
          class="absolute top-2 right-2 text-white text-2xl z-10 hover:bg-black hover:bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center"
        >
          <i class="fas fa-times"></i>
        </button>
        <img
          v-if="previewImage"
          :src="getFileUrl(previewImage)"
          :alt="previewImage.originalName"
          class="max-w-full max-h-full object-contain"
          @click.stop
        />
        <div class="mt-2 text-center text-white text-sm">
          {{ previewImage?.originalName }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { fileApi } from '@services/business/index.js'

export default {
  name: 'AttachmentDisplay',
  props: {
    attachments: {
      type: Array,
      default: () => []
    }
  },
  setup() {
    const showImagePreview = ref(false)
    const previewImage = ref(null)

    // Methods
    const isImage = (mimetype) => {
      return mimetype.startsWith('image/')
    }

    const isVideo = (mimetype) => {
      return mimetype.startsWith('video/')
    }

    const isAudio = (mimetype) => {
      return mimetype.startsWith('audio/')
    }

    const getFileIcon = (mimetype) => {
      return fileApi.getFileIcon(mimetype)
    }

    const formatFileSize = (bytes) => {
      return fileApi.formatFileSize(bytes)
    }

    const formatDuration = (seconds) => {
      if (!seconds) return ''
      
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      
      if (mins > 0) {
        return `${mins}:${secs.toString().padStart(2, '0')}`
      }
      return `0:${secs.toString().padStart(2, '0')}`
    }

    const getFileUrl = (attachment) => {
      // If attachment has a full URL, use it
      if (attachment.url && attachment.url.startsWith('http')) {
        return attachment.url
      }
      
      // Otherwise, construct the serve URL
      return fileApi.getServeUrl(attachment.filename)
    }

    const openImagePreview = (attachment) => {
      previewImage.value = attachment
      showImagePreview.value = true
      document.body.style.overflow = 'hidden'
    }

    const closeImagePreview = () => {
      showImagePreview.value = false
      previewImage.value = null
      document.body.style.overflow = 'auto'
    }

    const downloadFile = async (attachment) => {
      try {
        const response = await fileApi.downloadFile(attachment.fileId)
        
        // Create blob and download
        const blob = new Blob([response.data])
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = attachment.originalName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } catch (error) {
        console.error('Failed to download file:', error)
        // Fallback: open in new tab
        window.open(getFileUrl(attachment), '_blank')
      }
    }

    return {
      showImagePreview,
      previewImage,
      isImage,
      isVideo,
      isAudio,
      getFileIcon,
      formatFileSize,
      formatDuration,
      getFileUrl,
      openImagePreview,
      closeImagePreview,
      downloadFile
    }
  }
}
</script>

<style scoped>
.attachments {
  max-width: 100%;
}

.attachment-item {
  display: inline-block;
  margin-right: 8px;
}

.image-attachment img {
  transition: transform 0.2s ease;
}

.image-attachment:hover img {
  transform: scale(1.02);
}

.video-attachment video {
  background: #000;
}

.audio-attachment audio {
  height: 40px;
}

.document-attachment {
  display: inline-block;
}

.image-preview-modal {
  backdrop-filter: blur(4px);
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .image-attachment img,
  .video-attachment video {
    max-width: 200px;
    max-height: 150px;
  }
  
  .audio-attachment,
  .document-attachment {
    max-width: 250px;
  }
}
</style>