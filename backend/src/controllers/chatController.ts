import { Request, Response } from 'express';
import Chat from '@/models/Chat';
import Message from '@/models/Message';
import User from '@/models/User';
import { AuthRequest } from '@/types/auth.types';
import {
  ChatResponse,
  CreateChatRequest,
  ChatListResponse,
  ChatDetailsResponse,
  CreateChatResponse,
  UpdateChatRequest,
  AddParticipantsRequest,
  ChatQuery
} from '@/types/chat.types';
import { TypedResponse } from '@/types/common.types';

// Helper function to format chat response
const formatChatResponse = (chat: any): ChatResponse => ({
  _id: chat._id,
  participants: chat.participants,
  lastMessage: chat.lastMessage,
  name: chat.name,
  avatar: chat.avatar,
  isGroup: chat.isGroup || false,
  archived: chat.archived || false,
  unreadCount: chat.unreadCount || 0,
  createdAt: chat.createdAt,
  updatedAt: chat.updatedAt
});

// Chat management

// Create a new chat
export const createChat = async (
  req: Request<{}, CreateChatResponse, CreateChatRequest>,
  res: TypedResponse<CreateChatResponse>
): Promise<void> => {
  try {
    const { participants } = req.body;
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;

    if (!participants || !Array.isArray(participants)) {
      res.status(400).json({
        message: 'Participants array is required',
        chat: {} as ChatResponse
      });
      return;
    }

    // Add current user to participants if not already included
    const allParticipants = [...new Set([userId?.toString(), ...participants])];

    // For 1-on-1 chats, check if chat already exists
    if (allParticipants.length === 2) {
      const existingChat = await Chat.findOne({
        participants: { $all: allParticipants, $size: 2 }
      })
      .populate('participants', 'firstName lastName email status')
      .populate('lastMessage');

      if (existingChat) {
        res.json({ 
          message: 'Chat already exists',
          chat: formatChatResponse(existingChat) 
        });
        return;
      }
    }

    // Validate all participants exist
    const users = await User.find({ _id: { $in: allParticipants } });
    if (users.length !== allParticipants.length) {
      res.status(400).json({
        message: 'One or more participants not found',
        chat: {} as ChatResponse
      });
      return;
    }

    // Create new chat
    const chat = new Chat({
      participants: allParticipants,
      isGroup: allParticipants.length > 2
    });

    await chat.save();

    // Populate the chat
    const populatedChat = await Chat.findById(chat._id)
      .populate('participants', 'firstName lastName email status')
      .populate('lastMessage');

    res.status(201).json({ 
      message: 'Chat created successfully',
      chat: formatChatResponse(populatedChat) 
    });
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({
      message: 'Server error',
      chat: {} as ChatResponse
    });
  }
};

// Get user chats
export const getUserChats = async (
  req: Request<{}, ChatListResponse, {}, ChatQuery>,
  res: TypedResponse<ChatListResponse>
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;
    const { archived } = req.query;
    const isArchived = String(archived) === 'true';

    const chats = await Chat.find({
      participants: userId,
      archived: isArchived
    })
    .populate('participants', 'firstName lastName email status')
    .populate('lastMessage')
    .sort({ updatedAt: -1 });

    // Add unread count for each chat
    const chatsWithUnread = await Promise.all(chats.map(async (chat) => {
      const unreadCount = await Message.countDocuments({
        chatId: chat._id,
        senderId: { $ne: userId },
        readBy: { $nin: [userId] }
      });
      
      const chatObj = chat.toObject() as any;
      chatObj.unreadCount = unreadCount;
      return formatChatResponse(chatObj);
    }));

    res.json({ 
      chats: chatsWithUnread,
      count: chatsWithUnread.length
    });
  } catch (error) {
    console.error('Get user chats error:', error);
    res.status(500).json({ 
      chats: [],
      count: 0
    });
  }
};

// Get chat by ID
export const getChatById = async (
  req: Request<{ chatId: string }, ChatDetailsResponse>,
  res: TypedResponse<ChatDetailsResponse>
): Promise<void> => {
  try {
    const { chatId } = req.params;
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    })
    .populate('participants', 'firstName lastName email status')
    .populate('lastMessage');

    if (!chat) {
      res.status(404).json({ chat: {} as ChatResponse });
      return;
    }

    res.json({ chat: formatChatResponse(chat) });
  } catch (error) {
    console.error('Get chat by ID error:', error);
    res.status(500).json({ chat: {} as ChatResponse });
  }
};

// Delete chat
export const deleteChat = async (
  req: Request<{ chatId: string }, { message: string }>,
  res: TypedResponse<{ message: string }>
): Promise<void> => {
  try {
    const { chatId } = req.params;
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      res.status(404).json({ message: 'Chat not found' });
      return;
    }

    // Delete all messages in the chat
    await Message.deleteMany({ chatId });

    // Delete the chat
    await Chat.findByIdAndDelete(chatId);

    res.json({ message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add participant to chat
export const addParticipant = async (
  req: Request<{ chatId: string }, CreateChatResponse, { userId: string }>,
  res: TypedResponse<CreateChatResponse>
): Promise<void> => {
  try {
    const { chatId } = req.params;
    const { userId: newUserId } = req.body;
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      res.status(404).json({
        message: 'Chat not found',
        chat: {} as ChatResponse
      });
      return;
    }

    // Check if user exists
    const newUser = await User.findById(newUserId);
    if (!newUser) {
      res.status(404).json({
        message: 'User not found',
        chat: {} as ChatResponse
      });
      return;
    }

    // Check if user is already a participant
    if (chat.participants.includes(newUserId)) {
      res.status(400).json({
        message: 'User is already a participant',
        chat: {} as ChatResponse
      });
      return;
    }

    // Add participant
    chat.participants.push(newUserId);
    chat.isGroup = chat.participants.length > 2;
    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate('participants', 'firstName lastName email status');

    res.json({
      message: 'Participant added successfully',
      chat: formatChatResponse(updatedChat)
    });
  } catch (error) {
    console.error('Add participant error:', error);
    res.status(500).json({
      message: 'Server error',
      chat: {} as ChatResponse
    });
  }
};

// Remove participant from chat
export const removeParticipant = async (
  req: Request<{ chatId: string; userId: string }, { message: string; chat?: ChatResponse }>,
  res: TypedResponse<{ message: string; chat?: ChatResponse }>
): Promise<void> => {
  try {
    const { chatId, userId: targetUserId } = req.params;
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      res.status(404).json({ message: 'Chat not found' });
      return;
    }

    // Remove participant
    chat.participants = chat.participants.filter(id => id.toString() !== targetUserId);
    
    // If only one participant left, delete the chat
    if (chat.participants.length <= 1) {
      await Message.deleteMany({ chatId });
      await Chat.findByIdAndDelete(chatId);
      res.json({ message: 'Chat deleted as no participants remain' });
      return;
    }

    chat.isGroup = chat.participants.length > 2;
    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate('participants', 'firstName lastName email status');

    res.json({
      message: 'Participant removed successfully',
      chat: formatChatResponse(updatedChat)
    });
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get chat participants
export const getChatParticipants = async (
  req: Request<{ chatId: string }, { participants: any[] }>,
  res: TypedResponse<{ participants: any[] }>
): Promise<void> => {
  try {
    const { chatId } = req.params;
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    }).populate('participants', 'firstName lastName email status');

    if (!chat) {
      res.status(404).json({ participants: [] });
      return;
    }

    res.json({ participants: chat.participants });
  } catch (error) {
    console.error('Get chat participants error:', error);
    res.status(500).json({ participants: [] });
  }
};

// Archive chat
export const archiveChat = async (
  req: Request<{ chatId: string }, CreateChatResponse>,
  res: TypedResponse<CreateChatResponse>
): Promise<void> => {
  try {
    const { chatId } = req.params;
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;

    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, participants: userId },
      { archived: true },
      { new: true }
    ).populate('participants', 'firstName lastName email');

    if (!chat) {
      res.status(404).json({
        message: 'Chat not found',
        chat: {} as ChatResponse
      });
      return;
    }

    res.json({
      message: 'Chat archived successfully',
      chat: formatChatResponse(chat)
    });
  } catch (error) {
    console.error('Archive chat error:', error);
    res.status(500).json({
      message: 'Server error',
      chat: {} as ChatResponse
    });
  }
};

// Mark as read
export const markAsRead = async (
  req: Request<{ chatId: string }, { message: string }>,
  res: TypedResponse<{ message: string }>
): Promise<void> => {
  try {
    const { chatId } = req.params;
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      res.status(404).json({ message: 'Chat not found' });
      return;
    }

    // Mark all messages in chat as read by current user
    await Message.updateMany(
      {
        chatId,
        senderId: { $ne: userId },
        readBy: { $nin: [userId] }
      },
      { $addToSet: { readBy: userId } }
    );

    res.json({ message: 'Chat marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};