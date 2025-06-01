import { Document } from 'mongoose';

// Sticker Interface
export interface ISticker extends Document {
  _id: string;
  name: string;
  url: string;
  packId: string;
  order: number;
  isAnimated: boolean;
  size?: number;
  duration?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  metadata?: {
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Sticker Pack Interface
export interface IStickerPack extends Document {
  _id: string;
  name: string;
  description?: string;
  author: string;
  category: string;
  thumbnailUrl: string;
  price: number;
  isDefault: boolean;
  isPublic: boolean;
  downloadCount: number;
  stickers: ISticker[];
  createdAt: Date;
  updatedAt: Date;
}

// User Sticker Pack Interface (Ownership/Purchase)
export interface IUserStickerPack extends Document {
  _id: string;
  userId: string;
  packId: string;
  purchasedAt: Date;
  isActive: boolean;
}

// Sticker Message Content Interface
export interface StickerMessageContent {
  stickerId: string;
  packId: string;
  stickerUrl: string;
  stickerName?: string;
  isAnimated?: boolean;
  dimensions?: {
    width: number;
    height: number;
  };
}

// API Request/Response Types
export interface CreateStickerPackRequest {
  name: string;
  description?: string;
  category: string;
  thumbnailUrl: string;
  price?: number;
  isDefault?: boolean;
  isPublic?: boolean;
}

export interface CreateStickerRequest {
  name: string;
  url: string;
  packId: string;
  order?: number;
  isAnimated?: boolean;
  size?: number;
  duration?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  metadata?: {
    [key: string]: any;
  };
}

export interface StickerPackResponse {
  _id: string;
  name: string;
  description?: string;
  author: any;
  category: string;
  thumbnailUrl: string;
  price: number;
  isDefault: boolean;
  isPublic: boolean;
  downloadCount: number;
  stickerCount: number;
  isOwned?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StickerResponse {
  _id: string;
  name: string;
  url: string;
  packId: string;
  order: number;
  isAnimated: boolean;
  size?: number;
  duration?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  metadata?: {
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface StickerPackWithStickersResponse extends StickerPackResponse {
  stickers: StickerResponse[];
}

export interface UserStickerPacksResponse {
  packs: StickerPackResponse[];
  count: number;
}

export interface SendStickerMessageRequest {
  stickerId: string;
  packId: string;
  chatId: string;
}

// Sticker Categories
export enum StickerCategory {
  EMOTIONS = 'emotions',
  ANIMALS = 'animals',
  CHARACTERS = 'characters',
  REACTIONS = 'reactions',
  GREETINGS = 'greetings',
  HOLIDAYS = 'holidays',
  MISC = 'misc'
}

// Sticker Pack Query Parameters
export interface StickerPackQuery {
  page?: number;
  limit?: number;
  category?: StickerCategory;
  search?: string;
  isDefault?: boolean;
  isPublic?: boolean;
  userId?: string; // For user's owned packs
}

// Sticker Packs List Response
export interface StickerPacksListResponse {
  packs: StickerPackResponse[];
  count: number;
  hasNext: boolean;
  hasPrev: boolean;
}