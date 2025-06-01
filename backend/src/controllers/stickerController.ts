import { Request, Response } from 'express';
import StickerPack from '../models/StickerPack';
import Sticker from '../models/Sticker';
import UserStickerPack from '../models/UserStickerPack';
import Message from '../models/Message';
import {
  CreateStickerPackRequest,
  CreateStickerRequest,
  StickerCategory,
  StickerMessageContent
} from '../types/sticker.types';
import { MessageType } from '../types/message.types';
import { AuthRequest } from '../types/auth.types';

// Get all public sticker packs
export const getStickerPacks = async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category, 
      search,
      isDefault 
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const query: any = { isPublic: true };
    
    if (category) {
      query.category = category;
    }
    
    if (isDefault !== undefined) {
      query.isDefault = isDefault === 'true';
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const [packs, total] = await Promise.all([
      StickerPack.find(query)
        .populate('author', 'firstName lastName')
        .populate({
          path: 'stickerCount'
        })
        .sort({ downloadCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .exec(),
      StickerPack.countDocuments(query)
    ]);

    res.status(200).json({
      message: 'Sticker packs retrieved successfully',
      packs,
      count: total,
      hasNext: skip + limitNum < total,
      hasPrev: pageNum > 1
    });
  } catch (error: any) {
    console.error('Error getting sticker packs:', error);
    res.status(500).json({
      message: 'Failed to get sticker packs',
      error: error.message
    });
  }
};

// Get stickers in a pack
export const getPackStickers = async (req: Request, res: Response) => {
  try {
    const { packId } = req.params;
    
    const pack = await StickerPack.findById(packId);
    if (!pack) {
      return res.status(404).json({
        message: 'Sticker pack not found'
      });
    }

    const stickers = await Sticker.find({ packId })
      .sort({ order: 1, createdAt: 1 })
      .exec();

    res.status(200).json({
      message: 'Pack stickers retrieved successfully',
      pack: {
        _id: pack._id,
        name: pack.name,
        description: pack.description,
        category: pack.category,
        thumbnailUrl: pack.thumbnailUrl
      },
      stickers
    });
  } catch (error: any) {
    console.error('Error getting pack stickers:', error);
    res.status(500).json({
      message: 'Failed to get pack stickers',
      error: error.message
    });
  }
};

// Get user's owned sticker packs
export const getUserStickerPacks = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { page = 1, limit = 20 } = req.query;

    // Get default packs (available to all users)
    const defaultPacks = await (StickerPack as any).getDefaultPacks();
    
    // Get user's purchased packs
    const userPacksResult = await (UserStickerPack as any).getUserPacks(userId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });

    // Extract pack data from ownerships
    const purchasedPacks = userPacksResult.ownerships
      .map((ownership: any) => ownership.packId)
      .filter(Boolean);

    // Combine default and purchased packs
    const allPacks = [
      ...defaultPacks.map((pack: any) => ({ ...pack.toObject(), isOwned: true, isDefault: true })),
      ...purchasedPacks.map((pack: any) => ({ ...pack.toObject(), isOwned: true, isDefault: false }))
    ];

    res.status(200).json({
      message: 'User sticker packs retrieved successfully',
      packs: allPacks,
      count: allPacks.length
    });
  } catch (error: any) {
    console.error('Error getting user sticker packs:', error);
    res.status(500).json({
      message: 'Failed to get user sticker packs',
      error: error.message
    });
  }
};

// Add sticker pack to user (purchase/download)
export const addPackToUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { packId } = req.params;

    // Check if pack exists and is public
    const pack = await StickerPack.findById(packId);
    if (!pack) {
      return res.status(404).json({
        message: 'Sticker pack not found'
      });
    }

    if (!pack.isPublic && !pack.isDefault) {
      return res.status(403).json({
        message: 'This sticker pack is not available for download'
      });
    }

    // Add pack to user (or reactivate if already owned)
    await (UserStickerPack as any).addPackToUser(userId!, packId);
    
    // Increment download count
    await (StickerPack as any).incrementDownload(packId);

    res.status(200).json({
      message: 'Sticker pack added successfully',
      packId
    });
  } catch (error: any) {
    console.error('Error adding pack to user:', error);
    res.status(500).json({
      message: 'Failed to add sticker pack',
      error: error.message
    });
  }
};

// Send sticker message
export const sendStickerMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { stickerId, packId, chatId } = req.body;

    // Validate sticker exists
    const sticker = await Sticker.findById(stickerId);
    if (!sticker) {
      return res.status(404).json({
        message: 'Sticker not found'
      });
    }

    // Check if user owns the pack (or it's a default pack)
    const pack = await StickerPack.findById(packId);
    if (!pack) {
      return res.status(404).json({
        message: 'Sticker pack not found'
      });
    }

    // Allow default packs or user-owned packs
    if (!pack.isDefault) {
      const hasAccess = await (UserStickerPack as any).userOwnsPack(userId!, packId);
      if (!hasAccess) {
        return res.status(403).json({
          message: 'You do not have access to this sticker pack'
        });
      }
    }

    // Create sticker message content
    const stickerContent: StickerMessageContent = {
      stickerId: sticker._id,
      packId: pack._id,
      stickerUrl: sticker.url,
      stickerName: sticker.name,
      isAnimated: sticker.isAnimated,
      dimensions: sticker.dimensions
    };

    // Create message
    const message = new Message({
      chatId,
      senderId: userId,
      content: JSON.stringify(stickerContent),
      messageType: MessageType.STICKER,
      attachments: [],
      reactions: []
    });

    const savedMessage = await message.save();
    
    // Populate sender info
    const populatedMessage = await Message.findById(savedMessage._id)
      .populate('senderId', 'firstName lastName email avatar')
      .exec();

    res.status(201).json({
      message: 'Sticker message sent successfully',
      messageData: populatedMessage
    });
  } catch (error: any) {
    console.error('Error sending sticker message:', error);
    res.status(500).json({
      message: 'Failed to send sticker message',
      error: error.message
    });
  }
};

// Create sticker pack (admin only)
export const createStickerPack = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const packData: CreateStickerPackRequest = req.body;

    const pack = new StickerPack({
      ...packData,
      author: userId,
      downloadCount: 0
    });

    const savedPack = await pack.save();
    
    // Populate author info
    const populatedPack = await StickerPack.findById(savedPack._id)
      .populate('author', 'firstName lastName')
      .exec();

    res.status(201).json({
      message: 'Sticker pack created successfully',
      pack: populatedPack
    });
  } catch (error: any) {
    console.error('Error creating sticker pack:', error);
    res.status(500).json({
      message: 'Failed to create sticker pack',
      error: error.message
    });
  }
};

// Add sticker to pack
export const addStickerToPack = async (req: AuthRequest, res: Response) => {
  try {
    const { packId } = req.params;
    const stickerData: CreateStickerRequest = req.body;

    // Check if pack exists
    const pack = await StickerPack.findById(packId);
    if (!pack) {
      return res.status(404).json({
        message: 'Sticker pack not found'
      });
    }

    // Create sticker
    const sticker = new Sticker({
      ...stickerData,
      packId
    });

    const savedSticker = await sticker.save();

    res.status(201).json({
      message: 'Sticker added to pack successfully',
      sticker: savedSticker
    });
  } catch (error: any) {
    console.error('Error adding sticker to pack:', error);
    res.status(500).json({
      message: 'Failed to add sticker to pack',
      error: error.message
    });
  }
};

// Get sticker categories
export const getStickerCategories = async (req: Request, res: Response) => {
  try {
    const categories = Object.values(StickerCategory).map(category => ({
      value: category,
      label: category.charAt(0).toUpperCase() + category.slice(1)
    }));

    res.status(200).json({
      message: 'Sticker categories retrieved successfully',
      categories
    });
  } catch (error: any) {
    console.error('Error getting sticker categories:', error);
    res.status(500).json({
      message: 'Failed to get sticker categories',
      error: error.message
    });
  }
};