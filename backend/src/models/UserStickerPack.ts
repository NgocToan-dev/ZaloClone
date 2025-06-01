import mongoose, { Schema } from 'mongoose';
import { IUserStickerPack } from '../types/sticker.types';

const userStickerPackSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  packId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StickerPack',
    required: [true, 'Pack ID is required']
  },
  purchasedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index to ensure a user can only own a pack once
userStickerPackSchema.index({ userId: 1, packId: 1 }, { unique: true });
userStickerPackSchema.index({ userId: 1, isActive: 1 });
userStickerPackSchema.index({ packId: 1 });

// Static method to check if user owns a pack
userStickerPackSchema.statics.userOwnsPack = async function(userId: string, packId: string) {
  const ownership = await this.findOne({ userId, packId, isActive: true });
  return !!ownership;
};

// Static method to get user's owned packs
userStickerPackSchema.statics.getUserPacks = async function(userId: string, options: any = {}) {
  const { page = 1, limit = 20, isActive = true } = options;
  const skip = (page - 1) * limit;
  
  const query: any = { userId };
  if (isActive !== undefined) {
    query.isActive = isActive;
  }
  
  const [ownerships, total] = await Promise.all([
    this.find(query)
      .populate({
        path: 'packId',
        populate: {
          path: 'author',
          select: 'firstName lastName'
        }
      })
      .sort({ purchasedAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    this.countDocuments(query)
  ]);
  
  return {
    ownerships,
    total,
    hasNext: skip + limit < total,
    hasPrev: page > 1
  };
};

// Static method to add pack to user
userStickerPackSchema.statics.addPackToUser = async function(userId: string, packId: string) {
  try {
    const ownership = new this({
      userId,
      packId,
      purchasedAt: new Date(),
      isActive: true
    });
    
    return await ownership.save();
  } catch (error: any) {
    // Handle duplicate key error (user already owns the pack)
    if (error.code === 11000) {
      // Reactivate if it was deactivated
      return await this.findOneAndUpdate(
        { userId, packId },
        { isActive: true, purchasedAt: new Date() },
        { new: true, upsert: false }
      );
    }
    throw error;
  }
};

// Static method to remove pack from user
userStickerPackSchema.statics.removePackFromUser = async function(userId: string, packId: string) {
  return await this.findOneAndUpdate(
    { userId, packId },
    { isActive: false },
    { new: true }
  );
};

// Static method to get pack ownership count
userStickerPackSchema.statics.getPackOwnershipCount = async function(packId: string) {
  return await this.countDocuments({ packId, isActive: true });
};

// Static method to get user's active pack count
userStickerPackSchema.statics.getUserPackCount = async function(userId: string) {
  return await this.countDocuments({ userId, isActive: true });
};

// Ensure virtual fields are serialized
userStickerPackSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc: any, ret: any) {
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model<IUserStickerPack>('UserStickerPack', userStickerPackSchema);