import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { FILE_VALIDATION_RULES, FileCategory } from '../types/file.types';

// Custom file filter with validation
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Determine file category
  const category = getFileCategory(file.mimetype);
  
  if (!category) {
    return cb(new Error(`Unsupported file type: ${file.mimetype}`));
  }

  const rules = FILE_VALIDATION_RULES[category];
  
  // Check if mimetype is allowed
  if (!rules.allowedTypes.includes(file.mimetype)) {
    return cb(new Error(`File type ${file.mimetype} is not allowed for ${category} files`));
  }

  cb(null, true);
};

// Multer configuration
const upload = multer({
  storage: multer.memoryStorage(), // Store in memory for processing
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max (will be validated per category)
    files: 10 // Max 10 files at once
  }
});

// Helper function to determine file category
function getFileCategory(mimetype: string): FileCategory | null {
  if (mimetype.startsWith('image/')) return FileCategory.IMAGE;
  if (mimetype.startsWith('video/')) return FileCategory.VIDEO;
  if (mimetype.startsWith('audio/')) return FileCategory.AUDIO;
  
  // Document types
  const documentTypes = FILE_VALIDATION_RULES[FileCategory.DOCUMENT].allowedTypes;
  if (documentTypes.includes(mimetype)) return FileCategory.DOCUMENT;
  
  return null;
}

// Validation middleware to check file sizes per category
export const validateFiles = (req: Request, res: Response, next: NextFunction) => {
  if (!req.files || !Array.isArray(req.files)) {
    return next();
  }

  const errors: string[] = [];
  const categoryFileCount: Record<string, number> = {};

  for (const file of req.files) {
    const category = getFileCategory(file.mimetype);
    
    if (!category) {
      errors.push(`Unsupported file type: ${file.mimetype}`);
      continue;
    }

    const rules = FILE_VALIDATION_RULES[category];

    // Check file size
    if (file.size > rules.maxSize) {
      const maxSizeMB = Math.round(rules.maxSize / (1024 * 1024));
      errors.push(`File ${file.originalname} is too large. Maximum size for ${category} files is ${maxSizeMB}MB`);
    }

    // Count files per category
    categoryFileCount[category] = (categoryFileCount[category] || 0) + 1;
  }

  // Check file count limits per category
  for (const [category, count] of Object.entries(categoryFileCount)) {
    const rules = FILE_VALIDATION_RULES[category as FileCategory];
    if (count > rules.maxFiles) {
      errors.push(`Too many ${category} files. Maximum ${rules.maxFiles} ${category} files allowed per upload`);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      message: 'File validation failed',
      errors
    });
  }

  next();
};

// File upload middleware with proper error handling
export const uploadFiles = (fieldName: string = 'files') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uploadMiddleware = upload.array(fieldName, 10);
    
    uploadMiddleware(req, res, (error: any) => {
      if (error instanceof multer.MulterError) {
        let message = 'File upload error';
        
        switch (error.code) {
          case 'LIMIT_FILE_SIZE':
            message = 'File too large';
            break;
          case 'LIMIT_FILE_COUNT':
            message = 'Too many files';
            break;
          case 'LIMIT_UNEXPECTED_FILE':
            message = 'Unexpected file field';
            break;
          default:
            message = error.message;
        }
        
        return res.status(400).json({
          message,
          error: error.code
        });
      } else if (error) {
        return res.status(400).json({
          message: error.message || 'File upload failed'
        });
      }
      
      next();
    });
  };
};

// Single file upload middleware
export const uploadSingleFile = (fieldName: string = 'file') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uploadMiddleware = upload.single(fieldName);
    
    uploadMiddleware(req, res, (error: any) => {
      if (error instanceof multer.MulterError) {
        let message = 'File upload error';
        
        switch (error.code) {
          case 'LIMIT_FILE_SIZE':
            message = 'File too large';
            break;
          case 'LIMIT_UNEXPECTED_FILE':
            message = 'Unexpected file field';
            break;
          default:
            message = error.message;
        }
        
        return res.status(400).json({
          message,
          error: error.code
        });
      } else if (error) {
        return res.status(400).json({
          message: error.message || 'File upload failed'
        });
      }
      
      // Validate single file
      if (req.file) {
        const category = getFileCategory(req.file.mimetype);
        if (category) {
          const rules = FILE_VALIDATION_RULES[category];
          if (req.file.size > rules.maxSize) {
            const maxSizeMB = Math.round(rules.maxSize / (1024 * 1024));
            return res.status(400).json({
              message: `File too large. Maximum size for ${category} files is ${maxSizeMB}MB`
            });
          }
        }
      }
      
      next();
    });
  };
};

// Helper function to get file info
export const getFileInfo = (file: Express.Multer.File) => {
  const category = getFileCategory(file.mimetype);
  return {
    filename: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    category,
    formattedSize: formatFileSize(file.size)
  };
};

// Helper function to format file size
function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}