import { Document } from 'mongoose';

// File Upload Interface
export interface FileUpload extends Document {
  _id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  duration?: number; // For audio/video files
  dimensions?: {
    width: number;
    height: number;
  }; // For images/videos
  uploadedBy: string;
  chatId: string;
  metadata?: {
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Enhanced Attachment Interface
export interface EnhancedAttachment {
  fileId: string;
  filename: string;
  originalName: string;
  url: string;
  thumbnailUrl?: string;
  mimetype: string;
  size: number;
  duration?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  metadata?: {
    [key: string]: any;
  };
}

// File Upload Request
export interface FileUploadRequest {
  chatId: string;
  files: Express.Multer.File[];
}

// File Upload Response
export interface FileUploadResponse {
  message: string;
  files: EnhancedAttachment[];
}

// File Validation Config
export interface FileValidationConfig {
  maxSize: number;
  allowedTypes: string[];
  maxFiles: number;
}

// File Type Categories
export enum FileCategory {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document'
}

// File Validation Rules
export const FILE_VALIDATION_RULES: Record<FileCategory, FileValidationConfig> = {
  [FileCategory.IMAGE]: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxFiles: 10
  },
  [FileCategory.VIDEO]: {
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: ['video/mp4', 'video/webm', 'video/mov', 'video/avi'],
    maxFiles: 5
  },
  [FileCategory.AUDIO]: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'],
    maxFiles: 5
  },
  [FileCategory.DOCUMENT]: {
    maxSize: 25 * 1024 * 1024, // 25MB
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    maxFiles: 10
  }
};

// Storage Configuration
export interface StorageConfig {
  provider: 'minio' | 'local';
  minio?: {
    endpoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
    bucket: string;
  };
  local?: {
    uploadPath: string;
    publicPath: string;
  };
}

// Upload Progress Event
export interface UploadProgressEvent {
  fileId: string;
  filename: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}