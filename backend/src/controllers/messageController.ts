import { Request, Response } from 'express';
import Message from '../models/Message';
import Chat from '../models/Chat';
import { AuthRequest } from '../types/auth.types';
import {
  SendMessageRequest,
  EditMessageRequest,
  ReactToMessageRequest,
  MarkAsReadRequest,
  MessageQuery,
  MessageResponse,
  SendMessageResponse,
  EditMessageResponse,
  DeleteMessageResponse,
  ReactResponse,
  MarkAsReadResponse,
  MessagesListResponse,
  MessageType
} from '../types/message.types';
import { TypedResponse } from '../types/common.types';

// Helper function to format message response
const formatMessageResponse = (message: any): MessageResponse => ({
  _id: message._id,
  chatId: message.chatId,
  sender: message.senderId || message.sender,
  content: message.content,
  readBy: message.readBy,
  messageType: message.messageType || MessageType.TEXT,
  attachments: message.attachments || [],
  replyTo: message.replyTo,
  reactions: message.reactions || [],
  edited: message.edited || false,
  editedAt: message.editedAt,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt
});

// Send a message
export const sendMessage = async (
  req: Request<{ chatId: string }, SendMessageResponse, SendMessageRequest>,
  res: TypedResponse<SendMessageResponse>
): Promise<void> => {
  try {
    const { chatId } = req.params;
    const { content, messageType = MessageType.TEXT, attachments = [], replyTo } = req.body;
    const authReq = req as AuthRequest;
    const senderId = authReq.user?._id;

    if (!content || content.trim().length === 0) {
      res.status(400).json({
        message: 'Message content is required',
        messageData: {} as MessageResponse
      });
      return;
    }

    // Check if chat exists and user is participant
    const chat = await Chat.findOne({
      _id: chatId,
      participants: senderId
    });

    if (!chat) {
      res.status(404).json({
        message: 'Chat not found',
        messageData: {} as MessageResponse
      });
      return;
    }

    // Create new message
    const message = new Message({
      chatId,
      senderId,
      content: content.trim(),
      messageType,
      attachments,
      replyTo
    });

    await message.save();

    // Update chat's lastMessage and updatedAt
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: message._id,
      updatedAt: new Date()
    });

    // Populate sender info
    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'firstName lastName email')
      .populate('replyTo');

    res.status(201).json({
      message: 'Message sent successfully',
      messageData: formatMessageResponse(populatedMessage)
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      message: 'Server error',
      messageData: {} as MessageResponse
    });
  }
};

// Get messages for a chat
export const getMessages = async (
  req: AuthRequest,
  res: TypedResponse<MessagesListResponse>
): Promise<void> => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50, before, after, search } = req.query as any;
    const userId = req.user?._id;

    // Check if user is participant in this chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      res.status(404).json({
        messages: [],
        count: 0,
        hasNext: false,
        hasPrev: false
      });
      return;
    }

    let query: any = { chatId };
    
    // If 'before' parameter is provided, get messages before that message
    if (before) {
      const beforeMessage = await Message.findById(before);
      if (beforeMessage) {
        query.createdAt = { $lt: beforeMessage.createdAt };
      }
    }

    // If 'after' parameter is provided, get messages after that message
    if (after) {
      const afterMessage = await Message.findById(after);
      if (afterMessage) {
        query.createdAt = { $gt: afterMessage.createdAt };
      }
    }

    // Search in message content
    if (search && search.length >= 2) {
      query.content = { $regex: search, $options: 'i' };
    }

    const pageNum = parseInt(page.toString());
    const limitNum = parseInt(limit.toString());
    const skip = (pageNum - 1) * limitNum;

    const messages = await Message.find(query)
      .populate('senderId', 'firstName lastName email')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .limit(limitNum + 1) // Get one extra to check if there are more
      .skip(skip);

    const hasNext = messages.length > limitNum;
    const actualMessages = hasNext ? messages.slice(0, limitNum) : messages;
    const hasPrev = pageNum > 1;

    res.json({
      messages: actualMessages.reverse().map(formatMessageResponse),
      count: actualMessages.length,
      hasNext,
      hasPrev
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      messages: [],
      count: 0,
      hasNext: false,
      hasPrev: false
    });
  }
};

// Edit a message
export const editMessage = async (
  req: Request<{ messageId: string }, EditMessageResponse, EditMessageRequest>,
  res: TypedResponse<EditMessageResponse>
): Promise<void> => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;

    if (!content || content.trim().length === 0) {
      res.status(400).json({
        message: 'Message content is required',
        messageData: {} as MessageResponse
      });
      return;
    }

    // Find message and check if user is the sender
    const message = await Message.findOne({
      _id: messageId,
      senderId: userId
    });

    if (!message) {
      res.status(404).json({
        message: 'Message not found or you are not authorized to edit it',
        messageData: {} as MessageResponse
      });
      return;
    }

    // Update message
    message.content = content.trim();
    message.edited = true;
    message.editedAt = new Date();
    await message.save();

    // Populate sender info
    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'firstName lastName email')
      .populate('replyTo');

    res.json({
      message: 'Message edited successfully',
      messageData: formatMessageResponse(populatedMessage)
    });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({
      message: 'Server error',
      messageData: {} as MessageResponse
    });
  }
};

// Delete a message
export const deleteMessage = async (
  req: Request<{ messageId: string }, DeleteMessageResponse>,
  res: TypedResponse<DeleteMessageResponse>
): Promise<void> => {
  try {
    const { messageId } = req.params;
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;

    // Find message and check if user is the sender
    const message = await Message.findOne({
      _id: messageId,
      senderId: userId
    });

    if (!message) {
      res.status(404).json({
        message: 'Message not found or you are not authorized to delete it',
        messageId: ''
      });
      return;
    }

    await Message.findByIdAndDelete(messageId);

    res.json({
      message: 'Message deleted successfully',
      messageId
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      message: 'Server error',
      messageId: ''
    });
  }
};

// React to a message
export const reactToMessage = async (
  req: Request<{ messageId: string }, ReactResponse, ReactToMessageRequest>,
  res: TypedResponse<ReactResponse>
): Promise<void> => {
  try {
    const { messageId } = req.params;
    const { reaction } = req.body;
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;

    if (!reaction || reaction.trim().length === 0) {
      res.status(400).json({
        message: 'Reaction is required',
        messageId: '',
        reaction: {} as any
      });
      return;
    }

    const message = await Message.findById(messageId);
    if (!message) {
      res.status(404).json({
        message: 'Message not found',
        messageId: '',
        reaction: {} as any
      });
      return;
    }

    // Validate user has access to this message's chat
    const chat = await Chat.findOne({
      _id: message.chatId,
      participants: userId
    });

    if (!chat) {
      res.status(403).json({
        message: 'Access denied',
        messageId: '',
        reaction: {} as any
      });
      return;
    }

    // Check if user already reacted with the same emoji
    const existingReactionIndex = message.reactions.findIndex(
      r => r.userId.toString() === userId?.toString() && r.reaction === reaction
    );

    if (existingReactionIndex !== -1) {
      // If same reaction exists, remove it (toggle behavior)
      message.reactions.splice(existingReactionIndex, 1);
      await message.save();
      
      res.json({
        message: 'Reaction removed successfully',
        messageId,
        reaction: { userId: userId!, reaction, createdAt: new Date() }
      });
      return;
    }

    // Check if user has any other reaction
    const otherReactionIndex = message.reactions.findIndex(
      r => r.userId.toString() === userId?.toString()
    );

    if (otherReactionIndex !== -1) {
      // Update existing reaction to new emoji
      message.reactions[otherReactionIndex].reaction = reaction;
      message.reactions[otherReactionIndex].createdAt = new Date();
    } else {
      // Add new reaction
      message.reactions.push({
        userId: userId!,
        reaction,
        createdAt: new Date()
      });
    }

    await message.save();

    const newReaction = message.reactions.find(
      r => r.userId.toString() === userId?.toString()
    );

    res.json({
      message: 'Reaction added successfully',
      messageId,
      reaction: newReaction!
    });
  } catch (error) {
    console.error('React to message error:', error);
    res.status(500).json({
      message: 'Server error',
      messageId: '',
      reaction: {} as any
    });
  }
};

// Remove reaction from a message
export const removeReaction = async (
  req: Request<{ messageId: string }, { message: string; messageId: string }>,
  res: TypedResponse<{ message: string; messageId: string }>
): Promise<void> => {
  try {
    const { messageId } = req.params;
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;

    const message = await Message.findById(messageId);
    if (!message) {
      res.status(404).json({
        message: 'Message not found',
        messageId: ''
      });
      return;
    }

    // Validate user has access to this message's chat
    const chat = await Chat.findOne({
      _id: message.chatId,
      participants: userId
    });

    if (!chat) {
      res.status(403).json({
        message: 'Access denied',
        messageId: ''
      });
      return;
    }

    // Remove user's reaction
    const initialLength = message.reactions.length;
    message.reactions = message.reactions.filter(
      r => r.userId.toString() !== userId?.toString()
    );

    if (message.reactions.length === initialLength) {
      res.status(404).json({
        message: 'No reaction found to remove',
        messageId
      });
      return;
    }

    await message.save();

    res.json({
      message: 'Reaction removed successfully',
      messageId
    });
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({
      message: 'Server error',
      messageId: ''
    });
  }
};

// Get reactions for a message
export const getMessageReactions = async (
  req: Request<{ messageId: string }, { reactions: any[] }>,
  res: TypedResponse<{ reactions: any[] }>
): Promise<void> => {
  try {
    const { messageId } = req.params;
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;

    const message = await Message.findById(messageId)
      .populate('reactions.userId', 'firstName lastName email');

    if (!message) {
      res.status(404).json({
        reactions: []
      });
      return;
    }

    // Validate user has access to this message's chat
    const chat = await Chat.findOne({
      _id: message.chatId,
      participants: userId
    });

    if (!chat) {
      res.status(403).json({
        reactions: []
      });
      return;
    }

    res.json({
      reactions: message.reactions
    });
  } catch (error) {
    console.error('Get reactions error:', error);
    res.status(500).json({
      reactions: []
    });
  }
};

// Mark messages as read
export const markAsRead = async (
  req: Request<{ chatId: string }, MarkAsReadResponse, MarkAsReadRequest>,
  res: TypedResponse<MarkAsReadResponse>
): Promise<void> => {
  try {
    const { chatId } = req.params;
    const { messageIds } = req.body;
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;

    // Check if user is participant in the chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      res.status(404).json({
        message: 'Chat not found',
        readCount: 0
      });
      return;
    }

    let query: any = { chatId };
    
    if (messageIds && messageIds.length > 0) {
      query._id = { $in: messageIds };
    }

    // Mark messages as read
    const result = await Message.updateMany(
      {
        ...query,
        senderId: { $ne: userId },
        readBy: { $nin: [userId] }
      },
      { $addToSet: { readBy: userId } }
    );

    res.json({
      message: 'Messages marked as read',
      readCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      message: 'Server error',
      readCount: 0
    });
  }
};

// Get message by ID
export const getMessageById = async (
  req: Request<{ messageId: string }, { message: MessageResponse }>,
  res: TypedResponse<{ message: MessageResponse }>
): Promise<void> => {
  try {
    const { messageId } = req.params;
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;

    const message = await Message.findById(messageId)
      .populate('senderId', 'firstName lastName email')
      .populate('replyTo');

    if (!message) {
      res.status(404).json({ message: {} as MessageResponse });
      return;
    }

    // Check if user is participant in the chat
    const chat = await Chat.findOne({
      _id: message.chatId,
      participants: userId
    });

    if (!chat) {
      res.status(403).json({ message: {} as MessageResponse });
      return;
    }

    res.json({ message: formatMessageResponse(message) });
  } catch (error) {
    console.error('Get message by ID error:', error);
    res.status(500).json({ message: {} as MessageResponse });
  }
};