import mongoose, { Schema } from 'mongoose';
import { ISticker } from '../types/sticker.types';

const stickerSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Sticker name is required'],
    trim: true,
    maxlength: [100, 'Sticker name cannot exceed 100 characters']
  },
  url: {
    type: String,
    required: [true, 'Sticker URL is required'],
    trim: true
  },
  packId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StickerPack',
    required: [true, 'Pack ID is required']
  },
  order: {
    type: Number,
    default: 0,
    min: [0, 'Order cannot be negative']
  },
  isAnimated: {
    type: Boolean,
    default: false
  },
  size: {
    type: Number,
    min: [0, 'Size cannot be negative']
  },
  duration: {
    type: Number,
    min: [0, 'Duration cannot be negative']
  },
  dimensions: {
    width: {
      type: Number,
      min: [1, 'Width must be at least 1 pixel']
    },
    height: {
      type: Number,
      min: [1, 'Height must be at least 1 pixel']
    }
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for better performance
stickerSchema.index({ packId: 1, order: 1 });
stickerSchema.index({ name: 1 });
stickerSchema.index({ isAnimated: 1 });

// Virtual for checking if sticker is animated
stickerSchema.virtual('isGif').get(function(this: ISticker) {
  return this.isAnimated && this.url.toLowerCase().includes('.gif');
});

// Virtual for getting file extension
stickerSchema.virtual('fileExtension').get(function(this: ISticker) {
  const urlParts = this.url.split('.');
  return urlParts[urlParts.length - 1].toLowerCase();
});

// Pre-save middleware to validate animated stickers
stickerSchema.pre('save', function(this: ISticker, next) {
  // If sticker is animated, ensure it has duration
  if (this.isAnimated && !this.duration) {
    this.duration = 3000; // Default 3 seconds
  }
  
  // Ensure dimensions are set for display consistency
  if (!this.dimensions) {
    this.dimensions = {
      width: 128,
      height: 128
    };
  }
  
  next();
});

// Static method to get stickers by pack
stickerSchema.statics.getByPack = async function(packId: string) {
  return this.find({ packId })
    .sort({ order: 1, createdAt: 1 })
    .exec();
};

// Static method to get animated stickers
stickerSchema.statics.getAnimated = async function(packId?: string) {
  const query: any = { isAnimated: true };
  if (packId) {
    query.packId = packId;
  }
  return this.find(query)
    .sort({ order: 1, createdAt: 1 })
    .exec();
};

// Ensure virtual fields are serialized
stickerSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc: any, ret: any) {
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model<ISticker>('Sticker', stickerSchema);