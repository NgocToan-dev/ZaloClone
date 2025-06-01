import { Socket } from 'socket.io';
import { TypingStatus, OnlineStatus, Attachment } from './message.types';

// Socket Events Enum
export enum SocketEvents {
  // Connection
  CONNECTION = 'connection',
  DISCONNECT = 'disconnect',
  
  // Authentication
  AUTH = 'auth',
  AUTH_SUCCESS = 'auth_success',
  AUTH_ERROR = 'auth_error',
  
  // User Status
  USER_ONLINE = 'user_online',
  USER_OFFLINE = 'user_offline',
  USER_STATUS_CHANGE = 'user_status_change',
  
  // Chat Events
  JOIN_CHAT = 'join_chat',
  LEAVE_CHAT = 'leave_chat',
  
  // Message Events
  SEND_MESSAGE = 'send_message',
  MESSAGE_SENT = 'message_sent',
  MESSAGE_RECEIVED = 'message_received',
  MESSAGE_EDITED = 'message_edited',
  MESSAGE_DELETED = 'message_deleted',
  MESSAGE_REACTION = 'message_reaction',
  
  // Typing Events
  TYPING_START = 'typing_start',
  TYPING_STOP = 'typing_stop',
  USER_TYPING = 'user_typing',
  
  // Read Status
  MARK_AS_READ = 'mark_as_read',
  MESSAGE_READ = 'message_read',
  
  // Error
  ERROR = 'error'
}

// Authenticated Socket Interface
export interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
  };
}

// Socket Authentication Data
export interface SocketAuthData {
  token: string;
}

// Join Chat Data
export interface JoinChatData {
  chatId: string;
}

// Leave Chat Data
export interface LeaveChatData {
  chatId: string;
}

// Send Message Socket Data
export interface SendMessageSocketData {
  chatId: string;
  content: string;
  messageType?: string;
  replyTo?: string;
  attachments?: Attachment[];
}

// Message Sent Socket Data
export interface MessageSentSocketData {
  chatId: string;
  message: any;
}

// Message Received Socket Data
export interface MessageReceivedSocketData {
  chatId: string;
  message: any;
}

// Edit Message Socket Data
export interface EditMessageSocketData {
  messageId: string;
  content: string;
}

// Delete Message Socket Data
export interface DeleteMessageSocketData {
  messageId: string;
}

// React to Message Socket Data
export interface ReactToMessageSocketData {
  messageId: string;
  reaction: string;
}

// Typing Socket Data
export interface TypingSocketData {
  chatId: string;
  isTyping: boolean;
}

// Mark as Read Socket Data
export interface MarkAsReadSocketData {
  chatId: string;
  messageIds: string[];
}

// User Status Change Data
export interface UserStatusChangeData {
  userId: string;
  status: string;
  lastSeen?: Date;
}

// Socket Error Data
export interface SocketErrorData {
  message: string;
  code?: string;
  details?: any;
}

// Socket Response Data
export interface SocketResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Connected User Data
export interface ConnectedUser {
  socketId: string;
  userId: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
  };
  connectedAt: Date;
  activeChats: Set<string>;
}

// Socket Handler Interface
export interface SocketHandler {
  handleConnection(socket: AuthenticatedSocket): void;
  handleDisconnection(socket: AuthenticatedSocket): void;
  handleAuthentication(socket: AuthenticatedSocket, data: SocketAuthData): Promise<void>;
  handleJoinChat(socket: AuthenticatedSocket, data: JoinChatData): void;
  handleLeaveChat(socket: AuthenticatedSocket, data: LeaveChatData): void;
  handleSendMessage(socket: AuthenticatedSocket, data: SendMessageSocketData): Promise<void>;
  handleEditMessage(socket: AuthenticatedSocket, data: EditMessageSocketData): Promise<void>;
  handleDeleteMessage(socket: AuthenticatedSocket, data: DeleteMessageSocketData): Promise<void>;
  handleReactToMessage(socket: AuthenticatedSocket, data: ReactToMessageSocketData): Promise<void>;
  handleTyping(socket: AuthenticatedSocket, data: TypingSocketData): void;
  handleMarkAsRead(socket: AuthenticatedSocket, data: MarkAsReadSocketData): Promise<void>;
}