# File Attachment System - ZaloClone Frontend

This document describes the complete file attachment system implementation for ZaloClone frontend, seamlessly integrated with the existing backend API.

## 📋 Overview

The file attachment system allows users to upload, share, and view various file types in chat conversations with real-time progress tracking, drag & drop functionality, and comprehensive file management.

## 🏗️ Architecture

### 1. File API Service (`src/services/business/fileApi.js`)

**Purpose**: Handles all file-related API operations
**Key Features**:
- File upload with progress tracking
- File validation and type checking
- Multiple file support
- File download and deletion
- File type categorization (image, video, audio, document)

**Main Methods**:
```javascript
// Upload files to chat
await fileApi.uploadToChat(chatId, files, onProgress)

// Validate file before upload
const validation = fileApi.validateFile(file)

// Get file serve URL
const url = fileApi.getServeUrl(filename)

// Download file
await fileApi.downloadFile(fileId)
```

### 2. Pinia Store Integration (`src/store/chat.js`)

**Enhanced State**:
```javascript
state: {
  // File upload state
  fileUploads: {},     // chatId -> upload state
  pendingFiles: {},    // chatId -> files pending to be sent
  isUploading: false,
  uploadProgress: 0
}
```

**New Actions**:
- `uploadFiles(chatId, files)` - Upload multiple files
- `sendMessageWithFiles(chatId, content, files)` - Send message with attachments
- `setPendingFiles(chatId, files)` - Manage files before sending
- `generateFilePreview(chatId, fileId)` - Generate image previews

### 3. UI Components

#### FileUpload Component (`src/components/FileUpload.vue`)

**Features**:
- 🖱️ Drag & drop file upload
- 📂 Multiple file selection
- 📊 Real-time upload progress
- 👁️ File preview (images)
- ⚠️ File validation feedback
- 🗑️ Remove files before sending

**Props**:
- `chatId` (String, required) - Target chat ID

**Events**:
- `@files-uploaded` - Fired when files are successfully uploaded
- `@upload-error` - Fired when upload fails

#### AttachmentDisplay Component (`src/components/AttachmentDisplay.vue`)

**Features**:
- 🖼️ Image gallery with modal preview
- 🎥 Video player with controls
- 🎵 Audio player with controls
- 📄 Document download with file icons
- 📱 Responsive design

**Props**:
- `attachments` (Array) - Array of file attachment objects

## 📁 File Type Support

### Supported File Types & Limits

| Category | Types | Max Size | Max Files |
|----------|-------|----------|-----------|
| **Images** | JPEG, PNG, WebP, GIF | 10MB | 10 |
| **Videos** | MP4, WebM, MOV, AVI | 100MB | 5 |
| **Audio** | MP3, WAV, OGG, M4A | 50MB | 5 |
| **Documents** | PDF, DOC, DOCX, TXT, XLS, XLSX | 25MB | 10 |

### File Validation

Automatic validation includes:
- File type checking
- Size limit enforcement
- User-friendly error messages
- Real-time feedback

## 🔧 Integration Guide

### 1. Add FileUpload to Chat Input

```vue
<template>
  <div class="message-input">
    <!-- File Upload Component -->
    <FileUpload
      v-if="currentChat"
      :chatId="currentChat._id"
      @files-uploaded="handleFilesUploaded"
      @upload-error="handleUploadError"
    />
    
    <!-- Message form -->
    <form @submit.prevent="sendMessage">
      <!-- ... existing form content -->
    </form>
  </div>
</template>
```

### 2. Display Attachments in Messages

```vue
<template>
  <div class="message-bubble">
    <p v-if="message.content">{{ message.content }}</p>
    
    <!-- File Attachments -->
    <AttachmentDisplay 
      v-if="message.attachments && message.attachments.length > 0"
      :attachments="message.attachments"
    />
  </div>
</template>
```

### 3. Handle Upload Events

```javascript
const handleFilesUploaded = () => {
  console.log('✅ Files uploaded successfully')
  scrollToBottom()
  uiStore.addToast({
    type: 'success',
    message: 'Files uploaded successfully'
  })
}

const handleUploadError = (error) => {
  console.error('❌ File upload error:', error)
  uiStore.addToast({
    type: 'error',
    message: error.message || 'Failed to upload files'
  })
}
```

## 🎨 UI/UX Features

### Drag & Drop Interface

- **Global drag detection** - Shows overlay when files are dragged over the chat
- **Visual feedback** - Clear drop zones and hover states
- **File preview** - Image thumbnails before sending
- **Progress tracking** - Real-time upload progress bars

### Responsive Design

- **Mobile optimized** - Touch-friendly file selection
- **Adaptive layouts** - File previews scale to screen size
- **Accessible** - Keyboard navigation and screen reader support

### Error Handling

- **Validation errors** - Clear messages for invalid files
- **Upload errors** - Retry functionality and error details
- **Network errors** - Graceful degradation and fallbacks

## 🔗 Backend Integration

### API Endpoints Used

```
POST /api/files/upload           - Upload files
GET  /api/files/file/:fileId     - Get file metadata
GET  /api/files/download/:fileId - Download file
GET  /api/files/serve/:filename  - Serve file content
DELETE /api/files/file/:fileId   - Delete file
```

### Message API Enhancement

```javascript
// Updated to handle file attachments
await messageApi.sendMessageWithAttachment(chatId, content, attachments)
```

## 🚀 Performance Optimizations

### File Upload
- **Chunked uploads** - Large files uploaded in chunks
- **Progress tracking** - Real-time upload progress
- **Compression** - Images automatically optimized
- **Caching** - File metadata cached locally

### File Display
- **Lazy loading** - Images loaded on demand
- **Thumbnails** - Smaller previews for galleries
- **CDN support** - Ready for CDN integration
- **Local storage** - Fallback for local file serving

## 🧪 Testing

### File Upload Testing
1. **Single file upload** - Test with different file types
2. **Multiple file upload** - Test batch uploads
3. **Large file upload** - Test progress tracking
4. **Invalid file upload** - Test validation errors
5. **Network interruption** - Test error handling

### File Display Testing
1. **Image galleries** - Test modal preview
2. **Video playback** - Test controls and formats
3. **Document download** - Test download functionality
4. **Mobile responsiveness** - Test on various screen sizes

## 📊 Monitoring & Analytics

### Upload Metrics
- Upload success/failure rates
- Average upload times
- File type distribution
- Error frequency and types

### User Experience
- Drag & drop usage
- File preview interactions
- Download patterns
- Error recovery actions

## 🔮 Future Enhancements

### Planned Features
1. **File compression** - Client-side image compression
2. **File versioning** - Track file changes over time
3. **Batch operations** - Select and manage multiple files
4. **Advanced preview** - PDF viewer, code syntax highlighting
5. **Cloud storage** - Integration with external storage providers

### Technical Improvements
1. **WebRTC transfers** - Peer-to-peer file sharing
2. **Progressive uploads** - Resume interrupted uploads
3. **Background sync** - Offline upload queue
4. **Smart caching** - Intelligent file caching strategy

## 🛠️ Troubleshooting

### Common Issues

**Files not uploading:**
- Check file size limits
- Verify file type support
- Check network connectivity
- Verify backend file service status

**Images not displaying:**
- Check file serve URLs
- Verify file permissions
- Check browser CORS settings
- Verify backend file storage

**Progress not updating:**
- Check upload progress callbacks
- Verify store state updates
- Check component reactivity

### Debug Tools

Enable debug logging:
```javascript
// In fileApi.js
console.log('📤 Uploading files:', { chatId, fileCount: files.length })
console.log('📊 Upload progress:', progress + '%')
```

## 📝 Changelog

### v1.0.0 - Initial Implementation
- ✅ File upload with drag & drop
- ✅ Multiple file type support
- ✅ Real-time progress tracking
- ✅ File validation and error handling
- ✅ Responsive UI components
- ✅ Backend API integration
- ✅ Message attachment display

---

**Built with ❤️ for ZaloClone - Modern, fast, and user-friendly file sharing in chat**