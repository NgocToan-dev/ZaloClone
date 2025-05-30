import mongoose, { Schema } from 'mongoose';
import { IMessage, MessageType, Attachment, Reaction } from '../types/message.types';

const attachmentSchema = new Schema<Attachment>({
  filename: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  }
}, { _id: false });

const reactionSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reaction: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const messageSchema = new Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  messageType: {
    type: String,
    enum: Object.values(MessageType),
    default: MessageType.TEXT
  },
  attachments: [attachmentSchema],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  reactions: [reactionSchema],
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ messageType: 1 });
messageSchema.index({ 'readBy': 1 });

// Virtual for checking if message is read by specific user
messageSchema.methods.isReadBy = function(this: IMessage, userId: string): boolean {
  return this.readBy.includes(userId);
};

// Virtual for getting reaction count
messageSchema.virtual('reactionCount').get(function(this: IMessage) {
  return this.reactions ? this.reactions.length : 0;
});

// Virtual for checking if message has attachments
messageSchema.virtual('hasAttachments').get(function(this: IMessage) {
  return this.attachments && this.attachments.length > 0;
});

// Pre-save middleware to set editedAt when message is edited
messageSchema.pre('save', function(this: IMessage, next) {
  if (this.isModified('content') && !this.isNew) {
    this.edited = true;
    this.editedAt = new Date();
  }
  next();
});

// Static method to mark messages as read
messageSchema.statics.markAsRead = async function(messageIds: string[], userId: string) {
  return this.updateMany(
    { 
      _id: { $in: messageIds },
      readBy: { $ne: userId }
    },
    { 
      $addToSet: { readBy: userId }
    }
  );
};

// Static method to get unread message count for a chat
messageSchema.statics.getUnreadCount = async function(chatId: string, userId: string) {
  return this.countDocuments({
    chatId,
    senderId: { $ne: userId },
    readBy: { $ne: userId }
  });
};

// Ensure virtual fields are serialized
messageSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc: any, ret: any) {
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model<IMessage>('Message', messageSchema);