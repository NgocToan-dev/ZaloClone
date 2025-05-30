import { Document } from 'mongoose';

// Message Type Enum
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  AUDIO = 'audio',
  VIDEO = 'video'
}

// Attachment Interface
export interface Attachment {
  filename: string;
  url: string;
  mimetype: string;
  size: number;
}

// Reaction Interface
export interface Reaction {
  userId: string;
  reaction: string;
  createdAt: Date;
}

// Message Interface
export interface IMessage extends Document {
  _id: string;
  chatId: string;
  senderId: string;
  content: string;
  readBy: string[];
  messageType: MessageType;
  attachments: Attachment[];
  replyTo?: string;
  reactions: Reaction[];
  edited: boolean;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Message Response Format
export interface MessageResponse {
  _id: string;
  chatId: string;
  sender: any;
  content: string;
  readBy: any[];
  messageType: MessageType;
  attachments: Attachment[];
  replyTo?: any;
  reactions: Reaction[];
  edited: boolean;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Send Message Request
export interface SendMessageRequest {
  content: string;
  messageType?: MessageType;
  attachments?: Attachment[];
  replyTo?: string;
}

// Edit Message Request
export interface EditMessageRequest {
  content: string;
}

// React to Message Request
export interface ReactToMessageRequest {
  reaction: string;
}

// Mark as Read Request
export interface MarkAsReadRequest {
  messageIds: string[];
}

// Message Query Parameters
export interface MessageQuery {
  page?: number;
  limit?: number;
  before?: string; // Message ID to get messages before
  after?: string;  // Message ID to get messages after
  search?: string;
  messageType?: MessageType;
}

// Messages List Response
export interface MessagesListResponse {
  messages: MessageResponse[];
  count: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Send Message Response
export interface SendMessageResponse {
  message: string;
  messageData: MessageResponse;
}

// Edit Message Response
export interface EditMessageResponse {
  message: string;
  messageData: MessageResponse;
}

// Delete Message Response
export interface DeleteMessageResponse {
  message: string;
  messageId: string;
}

// React Response
export interface ReactResponse {
  message: string;
  messageId: string;
  reaction: Reaction;
}

// Mark as Read Response
export interface MarkAsReadResponse {
  message: string;
  readCount: number;
}

// Typing Status
export interface TypingStatus {
  chatId: string;
  userId: string;
  isTyping: boolean;
}

// Online Status
export interface OnlineStatus {
  userId: string;
  isOnline: boolean;
  lastSeen?: Date;
}