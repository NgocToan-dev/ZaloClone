import express from 'express';
import { auth } from '../middleware/auth';
import { uploadFiles, validateFiles } from '../middleware/fileUpload';
import {
  uploadFiles as uploadFilesController,
  getFileById,
  downloadFile,
  deleteFile,
  getChatFiles,
  getChatStorageStats,
  serveFile
} from '../controllers/fileController';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(auth);

// Upload files (multiple files support)
router.post('/upload', 
  uploadFiles('files'),
  validateFiles,
  uploadFilesController
);

// Get file by ID
router.get('/file/:fileId', getFileById);

// Download file
router.get('/download/:fileId', downloadFile);

// Delete file
router.delete('/file/:fileId', deleteFile);

// Get files for a chat with pagination and filtering
router.get('/chat/:chatId/files', getChatFiles);

// Get storage statistics for a chat
router.get('/chat/:chatId/stats', getChatStorageStats);

// Serve uploaded files (for local storage)
router.get('/serve/:filename', serveFile);

export default router;