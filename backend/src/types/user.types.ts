import { Document } from 'mongoose';

// User Status Enum
export enum UserStatus {
  ONLINE = 'online',
  AWAY = 'away',
  BUSY = 'busy',
  OFFLINE = 'offline'
}

// User Interface (for database document)
export interface IUser extends Document {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  status: UserStatus;
  lastSeen: Date;
  contacts: string[];
  createdAt: Date;
  updatedAt: Date;
  fullName: string;
  comparePassword(password: string): Promise<boolean>;
  toJSON(): any;
}

// User Profile Update Request
export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
}

// Change Password Request
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Search Users Request
export interface SearchUsersQuery {
  q: string;
  limit?: number;
}

// Add Contact Request
export interface AddContactRequest {
  userId: string;
}

// Update Status Request
export interface UpdateStatusRequest {
  status: UserStatus;
}

// User Response Format
export interface UserResponse {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  fullName: string;
  status: UserStatus;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Users List Response
export interface UsersListResponse {
  users: UserResponse[];
  count: number;
}

// Contacts List Response
export interface ContactsListResponse {
  contacts: UserResponse[];
  count: number;
}

// Profile Response
export interface ProfileResponse {
  user: UserResponse;
}

// Update Profile Response
export interface UpdateProfileResponse {
  message: string;
  user: UserResponse;
}

// Add Contact Response
export interface AddContactResponse {
  message: string;
  contact: UserResponse;
}

// Update Status Response
export interface UpdateStatusResponse {
  message: string;
  status: UserStatus;
}