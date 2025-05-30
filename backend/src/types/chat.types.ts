import { Document } from 'mongoose';

// Chat Interface
export interface IChat extends Document {
  _id: string;
  participants: string[];
  lastMessage?: string;
  name?: string;
  avatar?: string;
  isGroup: boolean;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Chat Response Format
export interface ChatResponse {
  _id: string;
  participants: any[];
  lastMessage?: any;
  name?: string;
  avatar?: string;
  isGroup: boolean;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
  unreadCount?: number;
}

// Create Chat Request
export interface CreateChatRequest {
  participants: string[];
  isGroup?: boolean;
  name?: string;
  avatar?: string;
}

// Create Group Chat Request
export interface CreateGroupChatRequest {
  participants: string[];
  name: string;
  avatar?: string;
}

// Update Chat Request
export interface UpdateChatRequest {
  name?: string;
  avatar?: string;
  archived?: boolean;
}

// Add Participants Request
export interface AddParticipantsRequest {
  participants: string[];
}

// Remove Participant Request
export interface RemoveParticipantRequest {
  participantId: string;
}

// Chat List Response
export interface ChatListResponse {
  chats: ChatResponse[];
  count: number;
}

// Chat Details Response
export interface ChatDetailsResponse {
  chat: ChatResponse;
}

// Create Chat Response
export interface CreateChatResponse {
  message: string;
  chat: ChatResponse;
}

// Update Chat Response
export interface UpdateChatResponse {
  message: string;
  chat: ChatResponse;
}

// Chat Query Parameters
export interface ChatQuery {
  page?: number;
  limit?: number;
  archived?: boolean;
  search?: string;
}