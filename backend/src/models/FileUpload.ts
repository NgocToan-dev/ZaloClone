import mongoose, { Schema } from 'mongoose';
import { FileUpload } from '../types/file.types';

const fileUploadSchema = new Schema<FileUpload>({
  filename: {
    type: String,
    required: true,
    trim: true
  },
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true,
    min: 0
  },
  url: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String
  },
  duration: {
    type: Number,
    min: 0
  },
  dimensions: {
    width: {
      type: Number,
      min: 0
    },
    height: {
      type: Number,
      min: 0
    }
  },
  uploadedBy: {
    type: String,
    ref: 'User',
    required: true
  },
  chatId: {
    type: String,
    ref: 'Chat',
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for better query performance
fileUploadSchema.index({ uploadedBy: 1, createdAt: -1 });
fileUploadSchema.index({ chatId: 1, mimetype: 1 });
fileUploadSchema.index({ filename: 1 });
fileUploadSchema.index({ createdAt: -1 });

// Virtual for file category based on mimetype
fileUploadSchema.virtual('category').get(function(this: FileUpload) {
  if (this.mimetype.startsWith('image/')) return 'image';
  if (this.mimetype.startsWith('video/')) return 'video';
  if (this.mimetype.startsWith('audio/')) return 'audio';
  return 'document';
});

// Virtual for formatted file size
fileUploadSchema.virtual('formattedSize').get(function(this: FileUpload) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (this.size === 0) return '0 Bytes';
  const i = Math.floor(Math.log(this.size) / Math.log(1024));
  return Math.round(this.size / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Static method to clean up orphaned files
fileUploadSchema.statics.cleanupOrphaned = async function(olderThanHours: number = 24) {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);
  
  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    // Add condition to check if file is not referenced in any message
    // This would require a more complex query or separate cleanup job
  });
};

// Static method to get storage stats for a chat
fileUploadSchema.statics.getChatStorageStats = async function(chatId: string) {
  const stats = await this.aggregate([
    { $match: { chatId: new mongoose.Types.ObjectId(chatId) } },
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
  
  return stats[0] || {
    totalFiles: 0,
    totalSize: 0,
    imageCount: 0,
    videoCount: 0,
    audioCount: 0,
    documentCount: 0
  };
};

// Ensure virtual fields are serialized
fileUploadSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc: any, ret: any) {
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model<FileUpload>('FileUpload', fileUploadSchema);