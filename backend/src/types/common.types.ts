import { Response } from 'express';

// Generic API Response
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Error Response
export interface ErrorResponse {
  message: string;
  error?: any;
  status?: number;
}

// Success Response
export interface SuccessResponse<T = any> {
  message: string;
  data?: T;
}

// Pagination Query
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Pagination Response
export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Database Connection Options
export interface DatabaseConfig {
  uri: string;
  options?: {
    useNewUrlParser?: boolean;
    useUnifiedTopology?: boolean;
  };
}

// JWT Config
export interface JWTConfig {
  secret: string;
  expiresIn: string;
}

// Environment Variables
export interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRE: string;
  CLIENT_URL: string;
}

// Express Response with typed JSON
export interface TypedResponse<T> extends Response {
  json(body: T): this;
  status(code: number): this;
}

// Socket Events
export interface SocketEvents {
  USER_ONLINE: 'user:online';
  USER_OFFLINE: 'user:offline';
  MESSAGE_SENT: 'message:sent';
  MESSAGE_RECEIVED: 'message:received';
  TYPING_START: 'typing:start';
  TYPING_STOP: 'typing:stop';
}

// Socket User Data
export interface SocketUser {
  userId: string;
  socketId: string;
  status: string;
  lastSeen: Date;
}