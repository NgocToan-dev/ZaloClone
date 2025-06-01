import { Request, Response } from 'express';
import FileUpload from '../models/FileUpload';
import { getFileStorageService } from '../services/fileStorageService';
import { FileUploadResponse, EnhancedAttachment } from '../types/file.types';
import { AuthRequest } from '../types/auth.types';
import { getFileInfo } from '../middleware/fileUpload';

// Upload files endpoint
export const uploadFiles = async (req: AuthRequest, res: Response) => {
  try {
    const { chatId } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        message: 'Authentication required'
      });
    }

    if (!chatId) {
      return res.status(400).json({
        message: 'Chat ID is required'
      });
    }

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        message: 'No files provided'
      });
    }

    console.log(`📤 Uploading ${req.files.length} files for chat ${chatId} by user ${userId}`);

    const fileStorageService = getFileStorageService();
    const uploadedFiles: EnhancedAttachment[] = [];
    const fileRecords: any[] = [];

    // Process each file
    for (const file of req.files) {
      console.log(`📁 Processing file: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`);

      try {
        // Upload to storage service
        const attachmentData = await fileStorageService.uploadFile(file, chatId, userId);

        // Save file metadata to database
        const fileRecord = new FileUpload({
          filename: attachmentData.filename,
          originalName: attachmentData.originalName,
          mimetype: attachmentData.mimetype,
          size: attachmentData.size,
          url: attachmentData.url,
          thumbnailUrl: attachmentData.thumbnailUrl,
          dimensions: attachmentData.dimensions,
          uploadedBy: userId,
          chatId: chatId,
          metadata: attachmentData.metadata
        });

        const savedFile = await fileRecord.save();
        console.log(`💾 Saved file record to database: ${savedFile._id}`);

        // Add fileId to attachment data
        const enhancedAttachment: EnhancedAttachment = {
          ...attachmentData,
          fileId: savedFile._id.toString()
        };

        uploadedFiles.push(enhancedAttachment);
        fileRecords.push(savedFile);

      } catch (error) {
        console.error(`❌ Error processing file ${file.originalname}:`, error);
        // Continue with other files, but log the error
      }
    }

    if (uploadedFiles.length === 0) {
      return res.status(500).json({
        message: 'Failed to upload any files'
      });
    }

    console.log(`✅ Successfully uploaded ${uploadedFiles.length} files`);

    const response: FileUploadResponse = {
      message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
      files: uploadedFiles
    };

    res.status(200).json(response);

  } catch (error: any) {
    console.error('❌ File upload error:', error);
    res.status(500).json({
      message: 'Internal server error during file upload',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get file by ID
export const getFileById = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;

    const fileRecord = await FileUpload.findById(fileId);
    if (!fileRecord) {
      return res.status(404).json({
        message: 'File not found'
      });
    }

    res.json(fileRecord);

  } catch (error) {
    console.error('❌ Error fetching file:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

// Download file
export const downloadFile = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;

    const fileRecord = await FileUpload.findById(fileId);
    if (!fileRecord) {
      return res.status(404).json({
        message: 'File not found'
      });
    }

    const fileStorageService = getFileStorageService();

    // For local storage, serve the file directly
    const fileBuffer = await fileStorageService.getFileStream(fileRecord.filename);
    if (fileBuffer) {
      res.setHeader('Content-Type', fileRecord.mimetype);
      res.setHeader('Content-Disposition', `attachment; filename="${fileRecord.originalName}"`);
      res.setHeader('Content-Length', fileRecord.size.toString());
      return res.send(fileBuffer);
    }

    // For MinIO, redirect to the URL
    res.redirect(fileRecord.url);

  } catch (error) {
    console.error('❌ Error downloading file:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

// Delete file
export const deleteFile = async (req: AuthRequest, res: Response) => {
  try {
    const { fileId } = req.params;
    const userId = req.user?._id;

    const fileRecord = await FileUpload.findById(fileId);
    if (!fileRecord) {
      return res.status(404).json({
        message: 'File not found'
      });
    }

    // Check if user has permission to delete (file uploader or admin)
    if (fileRecord.uploadedBy !== userId) {
      return res.status(403).json({
        message: 'Permission denied'
      });
    }

    const fileStorageService = getFileStorageService();

    // Delete from storage
    await fileStorageService.deleteFile(fileRecord.filename);

    // Delete from database
    await FileUpload.findByIdAndDelete(fileId);

    console.log(`🗑️ Deleted file: ${fileRecord.filename} by user ${userId}`);

    res.json({
      message: 'File deleted successfully',
      fileId
    });

  } catch (error) {
    console.error('❌ Error deleting file:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

// Get files for a chat
export const getChatFiles = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 20, category } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query: any = { chatId };
    if (category) {
      if (category === 'image') query.mimetype = { $regex: /^image\// };
      else if (category === 'video') query.mimetype = { $regex: /^video\// };
      else if (category === 'audio') query.mimetype = { $regex: /^audio\// };
      else if (category === 'document') query.mimetype = { $not: { $regex: /^(image|video|audio)\// } };
    }

    // Get files with pagination
    const files = await FileUpload.find(query)
      .populate('uploadedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalFiles = await FileUpload.countDocuments(query);
    const totalPages = Math.ceil(totalFiles / limitNum);

    res.json({
      files,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalFiles,
        pages: totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('❌ Error fetching chat files:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

// Get storage statistics for a chat
export const getChatStorageStats = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;

    // Manual aggregation since static method isn't recognized
    const stats = await FileUpload.aggregate([
      { $match: { chatId } },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: '$size' },
          imageCount: {
            $sum: {
              $cond: [{ $regexMatch: { input: '$mimetype', regex: /^image\// } }, 1, 0]
            }
          },
          videoCount: {
            $sum: {
              $cond: [{ $regexMatch: { input: '$mimetype', regex: /^video\// } }, 1, 0]
            }
          },
          audioCount: {
            $sum: {
              $cond: [{ $regexMatch: { input: '$mimetype', regex: /^audio\// } }, 1, 0]
            }
          },
          documentCount: {
            $sum: {
              $cond: [{ $not: { $regexMatch: { input: '$mimetype', regex: /^(image|video|audio)\// } } }, 1, 0]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalFiles: 0,
      totalSize: 0,
      imageCount: 0,
      videoCount: 0,
      audioCount: 0,
      documentCount: 0
    };

    res.json({
      chatId,
      stats: {
        ...result,
        formattedTotalSize: formatFileSize(result.totalSize)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching storage stats:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

// Helper function to format file size
function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// Serve uploaded files (for local storage)
export const serveFile = async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const fileStorageService = getFileStorageService();
    
    const fileBuffer = await fileStorageService.getFileStream(filename);
    if (!fileBuffer) {
      return res.status(404).json({
        message: 'File not found'
      });
    }

    // Get file info from database for proper headers
    const fileRecord = await FileUpload.findOne({ filename });
    if (fileRecord) {
      res.setHeader('Content-Type', fileRecord.mimetype);
      res.setHeader('Content-Length', fileRecord.size.toString());
    }

    res.send(fileBuffer);

  } catch (error) {
    console.error('❌ Error serving file:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};