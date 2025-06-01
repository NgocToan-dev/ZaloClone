import mongoose, { Schema } from 'mongoose';
import { IStickerPack, StickerCategory } from '../types/sticker.types';

const stickerPackSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Sticker pack name is required'],
    trim: true,
    maxlength: [100, 'Pack name cannot exceed 100 characters'],
    unique: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required']
  },
  category: {
    type: String,
    enum: Object.values(StickerCategory),
    default: StickerCategory.MISC,
    required: [true, 'Category is required']
  },
  thumbnailUrl: {
    type: String,
    required: [true, 'Thumbnail URL is required'],
    trim: true
  },
  price: {
    type: Number,
    default: 0,
    min: [0, 'Price cannot be negative']
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  downloadCount: {
    type: Number,
    default: 0,
    min: [0, 'Download count cannot be negative']
  }
}, {
  timestamps: true
});

// Indexes for better performance
stickerPackSchema.index({ category: 1 });
stickerPackSchema.index({ isDefault: 1 });
stickerPackSchema.index({ isPublic: 1 });
stickerPackSchema.index({ author: 1 });
stickerPackSchema.index({ downloadCount: -1 });
stickerPackSchema.index({ name: 'text', description: 'text' });

// Virtual for sticker count
stickerPackSchema.virtual('stickerCount', {
  ref: 'Sticker',
  localField: '_id',
  foreignField: 'packId',
  count: true
});

// Virtual for checking if pack is free
stickerPackSchema.virtual('isFree').get(function(this: IStickerPack) {
  return this.price === 0;
});

// Virtual for checking if pack is premium
stickerPackSchema.virtual('isPremium').get(function(this: IStickerPack) {
  return this.price > 0;
});

// Pre-save middleware
stickerPackSchema.pre('save', function(this: IStickerPack, next) {
  // Ensure default packs are always free and public
  if (this.isDefault) {
    this.price = 0;
    this.isPublic = true;
  }
  next();
});

// Static method to get default packs
stickerPackSchema.statics.getDefaultPacks = async function() {
  return this.find({ isDefault: true, isPublic: true })
    .populate('author', 'firstName lastName')
    .sort({ createdAt: 1 })
    .exec();
};

// Static method to get public packs
stickerPackSchema.statics.getPublicPacks = async function(options: any = {}) {
  const { page = 1, limit = 20, category, search } = options;
  const skip = (page - 1) * limit;
  
  const query: any = { isPublic: true };
  
  if (category) {
    query.category = category;
  }
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  
  const [packs, total] = await Promise.all([
    this.find(query)
      .populate('author', 'firstName lastName')
      .sort({ downloadCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    this.countDocuments(query)
  ]);
  
  return {
    packs,
    total,
    hasNext: skip + limit < total,
    hasPrev: page > 1
  };
};

// Static method to increment download count
stickerPackSchema.statics.incrementDownload = async function(packId: string) {
  return this.findByIdAndUpdate(
    packId,
    { $inc: { downloadCount: 1 } },
    { new: true }
  );
};

// Static method to get packs by category
stickerPackSchema.statics.getByCategory = async function(category: StickerCategory) {
  return this.find({ category, isPublic: true })
    .populate('author', 'firstName lastName')
    .sort({ downloadCount: -1, createdAt: -1 })
    .exec();
};

// Ensure virtual fields are serialized
stickerPackSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc: any, ret: any) {
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model<IStickerPack>('StickerPack', stickerPackSchema);