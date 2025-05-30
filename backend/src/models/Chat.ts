import mongoose, { Schema } from 'mongoose';
import { IChat } from '../types/chat.types';

const chatSchema = new Schema<IChat>({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  name: {
    type: String,
    trim: true
  },
  avatar: {
    type: String
  },
  isGroup: {
    type: Boolean,
    default: false
  },
  archived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster queries
chatSchema.index({ participants: 1 });
chatSchema.index({ updatedAt: -1 });
chatSchema.index({ isGroup: 1 });
chatSchema.index({ archived: 1 });

// Virtual for participant count
chatSchema.virtual('participantCount').get(function(this: IChat) {
  return this.participants ? this.participants.length : 0;
});

// Virtual for checking if it's a direct message
chatSchema.virtual('isDirectMessage').get(function(this: IChat) {
  return !this.isGroup && this.participants && this.participants.length === 2;
});

// Ensure virtual fields are serialized
chatSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc: any, ret: any) {
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model<IChat>('Chat', chatSchema);