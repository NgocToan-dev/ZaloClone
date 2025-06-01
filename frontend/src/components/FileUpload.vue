<template>
  <div class="file-upload-container">
    <!-- File Input (Hidden) -->
    <input
      ref="fileInput"
      type="file"
      multiple
      class="hidden"
      :accept="acceptedTypes"
      @change="handleFileSelect"
    />
    
    <!-- Upload Button -->
    <button
      @click="triggerFileSelect"
      :disabled="isUploading"
      class="file-upload-btn"
      :class="{ 'opacity-50 cursor-not-allowed': isUploading }"
      title="Đính kèm tệp"
    >
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
      </svg>
    </button>
    
    <!-- Drag & Drop Overlay -->
    <div
      v-if="showDropZone"
      class="drag-drop-overlay fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
      @dragover.prevent
      @drop.prevent="handleDrop"
      @dragleave="hideDropZone"
    >
      <div class="bg-white rounded-lg p-8 text-center shadow-xl">
        <i class="fas fa-cloud-upload-alt text-4xl text-blue-500 mb-4"></i>
        <h3 class="text-lg font-semibold mb-2">Drop files here to upload</h3>
        <p class="text-gray-600">Supports images, videos, audio, and documents</p>
      </div>
    </div>
    
    <!-- File Preview Section -->
    <div v-if="pendingFiles.length > 0" class="pending-files mt-4">
      <h4 class="text-sm font-medium text-gray-700 mb-2">Files to send:</h4>
      <div class="space-y-2">
        <div
          v-for="file in pendingFiles"
          :key="file.id"
          class="flex items-center justify-between bg-gray-50 rounded-lg p-3"
        >
          <div class="flex items-center space-x-3">
            <!-- File Icon/Preview -->
            <div class="flex-shrink-0">
              <img
                v-if="file.preview"
                :src="file.preview"
                :alt="file.name"
                class="w-10 h-10 object-cover rounded"
              />
              <i
                v-else
                :class="getFileIcon(file.type)"
                class="text-2xl text-gray-500"
              ></i>
            </div>
            
            <!-- File Info -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">{{ file.name }}</p>
              <p class="text-xs text-gray-500">{{ formatFileSize(file.size) }}</p>
            </div>
          </div>
          
          <!-- Remove Button -->
          <button
            @click="removePendingFile(file.id)"
            class="text-red-500 hover:text-red-700 p-1"
            title="Remove file"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      
      <!-- Upload Progress -->
      <div v-if="isUploading" class="mt-4">
        <div class="flex items-center justify-between text-sm text-gray-600 mb-1">
          <span>Uploading files...</span>
          <span>{{ uploadProgress }}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div 
            class="bg-blue-500 h-2 rounded-full transition-all duration-300"
            :style="{ width: uploadProgress + '%' }"
          ></div>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="flex justify-end space-x-2 mt-4">
        <button
          @click="clearPendingFiles"
          :disabled="isUploading"
          class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
        >
          Clear
        </button>
        <button
          @click="sendWithFiles"
          :disabled="isUploading || pendingFiles.length === 0"
          class="px-4 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send Files
        </button>
      </div>
    </div>
    
    <!-- Upload Error -->
    <div v-if="uploadError" class="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
      {{ uploadError }}
    </div>
  </div>
</template>

<script>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useChatStore } from '@/store/chat.js'
import { fileApi } from '@services/business/index.js'

export default {
  name: 'FileUpload',
  props: {
    chatId: {
      type: String,
      required: true
    }
  },
  emits: ['files-uploaded', 'upload-error'],
  setup(props, { emit }) {
    const chatStore = useChatStore()
    const fileInput = ref(null)
    const showDropZone = ref(false)
    const uploadError = ref('')
    
    // Computed properties
    const pendingFiles = computed(() => chatStore.getPendingFiles(props.chatId))
    const isUploading = computed(() => chatStore.isFileUploading)
    const uploadProgress = computed(() => chatStore.getUploadProgress)
    
    const acceptedTypes = computed(() => {
      return [
        'image/*',
        'video/*', 
        'audio/*',
        '.pdf',
        '.doc',
        '.docx',
        '.txt',
        '.xls',
        '.xlsx'
      ].join(',')
    })
    
    // Methods
    const triggerFileSelect = () => {
      if (!isUploading.value) {
        fileInput.value?.click()
      }
    }
    
    const handleFileSelect = (event) => {
      const files = event.target.files
      if (files && files.length > 0) {
        addFiles(files)
      }
      // Reset input
      event.target.value = ''
    }
    
    const handleDrop = (event) => {
      showDropZone.value = false
      const files = event.dataTransfer.files
      if (files && files.length > 0) {
        addFiles(files)
      }
    }
    
    const addFiles = (files) => {
      uploadError.value = ''
      
      // Validate files
      const fileArray = Array.from(files)
      const invalidFiles = []
      
      fileArray.forEach(file => {
        const validation = fileApi.validateFile(file)
        if (!validation.isValid) {
          invalidFiles.push(`${file.name}: ${validation.errors.join(', ')}`)
        }
      })
      
      if (invalidFiles.length > 0) {
        uploadError.value = invalidFiles.join('\n')
        return
      }
      
      // Add to pending files
      chatStore.setPendingFiles(props.chatId, files)
      
      // Generate previews for images
      fileArray.forEach(async (file, index) => {
        if (fileApi.isPreviewable(file.type)) {
          const fileId = pendingFiles.value[index]?.id
          if (fileId) {
            await chatStore.generateFilePreview(props.chatId, fileId)
          }
        }
      })
    }
    
    const removePendingFile = (fileId) => {
      chatStore.removePendingFile(props.chatId, fileId)
    }
    
    const clearPendingFiles = () => {
      chatStore.clearPendingFiles(props.chatId)
      uploadError.value = ''
    }
    
    const sendWithFiles = async () => {
      if (pendingFiles.value.length === 0) return
      
      try {
        uploadError.value = ''
        const files = pendingFiles.value.map(pf => pf.file)
        
        await chatStore.sendMessageWithFiles(props.chatId, '', files)
        
        emit('files-uploaded')
        clearPendingFiles()
      } catch (error) {
        uploadError.value = error.message
        emit('upload-error', error)
      }
    }
    
    const getFileIcon = (mimetype) => {
      return fileApi.getFileIcon(mimetype)
    }
    
    const formatFileSize = (bytes) => {
      return fileApi.formatFileSize(bytes)
    }
    
    const hideDropZone = () => {
      showDropZone.value = false
    }
    
    // Drag & Drop handlers
    const handleDragEnter = (e) => {
      e.preventDefault()
      if (e.dataTransfer.types.includes('Files')) {
        showDropZone.value = true
      }
    }
    
    const handleDragLeave = (e) => {
      e.preventDefault()
      // Only hide if leaving the window
      if (e.clientX === 0 && e.clientY === 0) {
        showDropZone.value = false
      }
    }
    
    const handleDragOver = (e) => {
      e.preventDefault()
    }
    
    // Lifecycle
    onMounted(() => {
      // Add global drag & drop listeners
      document.addEventListener('dragenter', handleDragEnter)
      document.addEventListener('dragleave', handleDragLeave)
      document.addEventListener('dragover', handleDragOver)
    })
    
    onUnmounted(() => {
      // Remove global drag & drop listeners
      document.removeEventListener('dragenter', handleDragEnter)
      document.removeEventListener('dragleave', handleDragLeave)
      document.removeEventListener('dragover', handleDragOver)
    })
    
    return {
      fileInput,
      showDropZone,
      uploadError,
      pendingFiles,
      isUploading,
      uploadProgress,
      acceptedTypes,
      triggerFileSelect,
      handleFileSelect,
      handleDrop,
      removePendingFile,
      clearPendingFiles,
      sendWithFiles,
      getFileIcon,
      formatFileSize,
      hideDropZone
    }
  }
}
</script>

<style scoped>
.file-upload-btn {
  width: 25px;
  height: 25px;
  border-radius: 50%;
  background-color: #f3f4f6;
  color: #6b7280;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.file-upload-btn:hover:not(:disabled) {
  background-color: #e5e7eb;
  color: #374151;
  transform: scale(1.05);
}

.file-upload-btn:active {
  transform: scale(0.95);
}

.drag-drop-overlay {
  backdrop-filter: blur(4px);
}

.pending-files {
  max-height: 300px;
  overflow-y: auto;
}

.pending-files::-webkit-scrollbar {
  width: 4px;
}

.pending-files::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.pending-files::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.pending-files::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}
</style>