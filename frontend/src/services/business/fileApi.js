import BaseApi from '../baseApi.js';
import { post } from '../httpClient.js';

class FileApi extends BaseApi {
  constructor() {
    super('/api/files');
  }

  /**
   * Upload files with progress tracking
   * @param {FormData} formData - FormData containing files and chatId
   * @param {Function} onProgress - Progress callback function
   * @returns {Promise} Upload response with file data
   */
  async uploadFiles(formData, onProgress = null) {
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress ? (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      } : undefined
    };

    return await this.post('/upload', formData, config);
  }

  /**
   * Upload multiple files to a chat
   * @param {string} chatId - Chat ID
   * @param {FileList|File[]} files - Files to upload
   * @param {Function} onProgress - Progress callback
   * @returns {Promise} Upload response
   */
  async uploadToChat(chatId, files, onProgress = null) {
    const formData = new FormData();
    formData.append('chatId', chatId);
    
    // Handle both FileList and Array of Files
    const fileArray = Array.from(files);
    fileArray.forEach(file => {
      formData.append('files', file);
    });

    return await this.uploadFiles(formData, onProgress);
  }

  /**
   * Get file by ID
   * @param {string} fileId - File ID
   * @returns {Promise} File data
   */
  async getFile(fileId) {
    return await this.get(`/file/${fileId}`);
  }

  /**
   * Download file
   * @param {string} fileId - File ID
   * @returns {Promise} File download response
   */
  async downloadFile(fileId) {
    return await this.get(`/download/${fileId}`, {
      responseType: 'blob'
    });
  }

  /**
   * Delete file
   * @param {string} fileId - File ID
   * @returns {Promise} Delete response
   */
  async deleteFile(fileId) {
    return await this.delete(`/file/${fileId}`);
  }

  /**
   * Get files for a chat with pagination and filtering
   * @param {string} chatId - Chat ID
   * @param {Object} options - Query options
   * @returns {Promise} Chat files response
   */
  async getChatFiles(chatId, options = {}) {
    const params = new URLSearchParams(options).toString();
    const endpoint = params ? `?${params}` : '';
    return await this.get(`/chat/${chatId}/files${endpoint}`);
  }

  /**
   * Get storage statistics for a chat
   * @param {string} chatId - Chat ID
   * @returns {Promise} Storage stats
   */
  async getChatStorageStats(chatId) {
    return await this.get(`/chat/${chatId}/stats`);
  }

  /**
   * Get file serve URL
   * @param {string} filename - File name
   * @returns {string} Serve URL
   */
  getServeUrl(filename) {
    return `${this.getApiUrl()}/serve/${filename}`;
  }

  /**
   * Validate file before upload
   * @param {File} file - File to validate
   * @returns {Object} Validation result
   */
  validateFile(file) {
    const maxSizes = {
      'image': 10 * 1024 * 1024, // 10MB
      'video': 100 * 1024 * 1024, // 100MB
      'audio': 50 * 1024 * 1024, // 50MB
      'document': 25 * 1024 * 1024 // 25MB
    };

    const allowedTypes = {
      'image': ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      'video': ['video/mp4', 'video/webm', 'video/mov', 'video/avi'],
      'audio': ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'],
      'document': [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]
    };

    // Determine file category
    let category = 'document';
    if (file.type.startsWith('image/')) category = 'image';
    else if (file.type.startsWith('video/')) category = 'video';
    else if (file.type.startsWith('audio/')) category = 'audio';

    const isValidType = allowedTypes[category].includes(file.type);
    const isValidSize = file.size <= maxSizes[category];

    return {
      isValid: isValidType && isValidSize,
      category,
      errors: [
        ...(!isValidType ? [`File type ${file.type} is not allowed for ${category} files`] : []),
        ...(!isValidSize ? [`File size ${this.formatFileSize(file.size)} exceeds maximum allowed size ${this.formatFileSize(maxSizes[category])}`] : [])
      ]
    };
  }

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file type icon class
   * @param {string} mimetype - File mimetype
   * @returns {string} Icon class name
   */
  getFileIcon(mimetype) {
    if (mimetype.startsWith('image/')) return 'fas fa-image';
    if (mimetype.startsWith('video/')) return 'fas fa-video';
    if (mimetype.startsWith('audio/')) return 'fas fa-music';
    if (mimetype === 'application/pdf') return 'fas fa-file-pdf';
    if (mimetype.includes('word')) return 'fas fa-file-word';
    if (mimetype.includes('excel') || mimetype.includes('sheet')) return 'fas fa-file-excel';
    return 'fas fa-file';
  }

  /**
   * Check if file is previewable (image)
   * @param {string} mimetype - File mimetype
   * @returns {boolean} Whether file can be previewed
   */
  isPreviewable(mimetype) {
    return mimetype.startsWith('image/');
  }

  /**
   * Check if file is playable (video/audio)
   * @param {string} mimetype - File mimetype
   * @returns {boolean} Whether file can be played
   */
  isPlayable(mimetype) {
    return mimetype.startsWith('video/') || mimetype.startsWith('audio/');
  }
}

export default new FileApi();