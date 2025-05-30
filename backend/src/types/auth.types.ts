import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

// JWT Token Payload
export interface TokenPayload extends JwtPayload {
  userId: string;
}

// Auth Request with User
export interface AuthRequest extends Request {
  user?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    fullName: string;
    status: string;
    lastSeen: Date;
    createdAt: Date;
    updatedAt: Date;
  };
}

// Login Request Body
export interface LoginRequestBody {
  email: string;
  password: string;
}

// Register Request Body
export interface RegisterRequestBody {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

// Auth Response Data
export interface AuthResponseData {
  message: string;
  token: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    fullName: string;
    status: string;
    lastSeen: Date;
    createdAt: Date;
  };
}

// User Response Data (without token)
export interface UserResponseData {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    fullName: string;
    status: string;
    lastSeen: Date;
    createdAt: Date;
  };
}