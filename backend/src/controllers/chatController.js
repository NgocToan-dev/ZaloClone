const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');

// Helper function to format chat response
const formatChatResponse = (chat) => ({
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
const createChat = async (req, res) => {
  try {
    const { participants } = req.body;
    const userId = req.user._id;

    if (!participants || !Array.isArray(participants)) {
      return res.status(400).json({ message: 'Participants array is required' });
    }

    // Add current user to participants if not already included
    const allParticipants = [...new Set([userId.toString(), ...participants])];

    // For 1-on-1 chats, check if chat already exists
    if (allParticipants.length === 2) {
      const existingChat = await Chat.findOne({
        participants: { $all: allParticipants, $size: 2 }
      })
      .populate('participants', 'firstName lastName email status')
      .populate('lastMessage');

      if (existingChat) {
        return res.json({ chat: formatChatResponse(existingChat) });
      }
    }

    // Validate all participants exist
    const users = await User.find({ _id: { $in: allParticipants } });
    if (users.length !== allParticipants.length) {
      return res.status(400).json({ message: 'One or more participants not found' });
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

    res.status(201).json({ chat: formatChatResponse(populatedChat) });
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user chats
const getUserChats = async (req, res) => {
  try {
    const userId = req.user._id;
    const { archived = false } = req.query;

    const chats = await Chat.find({
      participants: userId,
      archived: archived === 'true'
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
      
      const chatObj = chat.toObject();
      chatObj.unreadCount = unreadCount;
      return formatChatResponse(chatObj);
    }));

    res.json({ chats: chatsWithUnread });
  } catch (error) {
    console.error('Get user chats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get chat by ID
const getChatById = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    })
    .populate('participants', 'firstName lastName email status')
    .populate('lastMessage');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.json({ chat: formatChatResponse(chat) });
  } catch (error) {
    console.error('Get chat by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete chat
const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
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

// Chat participants

// Add participant to chat
const addParticipant = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId: newUserId } = req.body;
    const userId = req.user._id;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user exists
    const newUser = await User.findById(newUserId);
    if (!newUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already a participant
    if (chat.participants.includes(newUserId)) {
      return res.status(400).json({ message: 'User is already a participant' });
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
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove participant from chat
const removeParticipant = async (req, res) => {
  try {
    const { chatId, userId: targetUserId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Remove participant
    chat.participants = chat.participants.filter(id => id.toString() !== targetUserId);
    
    // If only one participant left, delete the chat
    if (chat.participants.length <= 1) {
      await Message.deleteMany({ chatId });
      await Chat.findByIdAndDelete(chatId);
      return res.json({ message: 'Chat deleted as no participants remain' });
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
const getChatParticipants = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    }).populate('participants', 'firstName lastName email status');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.json({ participants: chat.participants });
  } catch (error) {
    console.error('Get chat participants error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Leave chat
const leaveChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Remove user from participants
    chat.participants = chat.participants.filter(id => id.toString() !== userId.toString());
    
    // If no participants left, delete the chat
    if (chat.participants.length === 0) {
      await Message.deleteMany({ chatId });
      await Chat.findByIdAndDelete(chatId);
      return res.json({ message: 'Chat deleted' });
    }

    await chat.save();
    res.json({ message: 'Left chat successfully' });
  } catch (error) {
    console.error('Leave chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Chat messages

// Get chat messages
const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50, before } = req.query;
    const userId = req.user._id;

    // Check if user is participant in this chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    let query = { chatId };
    
    // If 'before' parameter is provided, get messages before that message
    if (before) {
      const beforeMessage = await Message.findById(before);
      if (beforeMessage) {
        query.createdAt = { $lt: beforeMessage.createdAt };
      }
    }

    const messages = await Message.find(query)
      .populate('senderId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get last message
const getLastMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const lastMessage = await Message.findOne({ chatId })
      .populate('senderId', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ message: lastMessage });
  } catch (error) {
    console.error('Get last message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Chat search and filtering

// Search chats
const searchChats = async (req, res) => {
  try {
    const { q: query } = req.query;
    const userId = req.user._id;

    if (!query || query.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    // Search in participant names and chat names
    const chats = await Chat.find({
      participants: userId,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        // You might want to search in participant names too
      ]
    })
    .populate('participants', 'firstName lastName email')
    .populate('lastMessage')
    .sort({ updatedAt: -1 });

    res.json({ chats: chats.map(formatChatResponse) });
  } catch (error) {
    console.error('Search chats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get active chats
const getActiveChats = async (req, res) => {
  try {
    const userId = req.user._id;

    const chats = await Chat.find({
      participants: userId,
      archived: { $ne: true }
    })
    .populate('participants', 'firstName lastName email status')
    .populate('lastMessage')
    .sort({ updatedAt: -1 });

    res.json({ chats: chats.map(formatChatResponse) });
  } catch (error) {
    console.error('Get active chats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get archived chats
const getArchivedChats = async (req, res) => {
  try {
    const userId = req.user._id;

    const chats = await Chat.find({
      participants: userId,
      archived: true
    })
    .populate('participants', 'firstName lastName email')
    .populate('lastMessage')
    .sort({ updatedAt: -1 });

    res.json({ chats: chats.map(formatChatResponse) });
  } catch (error) {
    console.error('Get archived chats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Chat actions

// Archive chat
const archiveChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, participants: userId },
      { archived: true },
      { new: true }
    ).populate('participants', 'firstName lastName email');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.json({
      message: 'Chat archived successfully',
      chat: formatChatResponse(chat)
    });
  } catch (error) {
    console.error('Archive chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Unarchive chat
const unarchiveChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, participants: userId },
      { archived: false },
      { new: true }
    ).populate('participants', 'firstName lastName email');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.json({
      message: 'Chat unarchived successfully',
      chat: formatChatResponse(chat)
    });
  } catch (error) {
    console.error('Unarchive chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark as read
const markAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
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

// Mark as unread
const markAsUnread = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Remove user from readBy array of recent messages
    await Message.updateMany(
      { chatId },
      { $pull: { readBy: userId } }
    );

    res.json({ message: 'Chat marked as unread' });
  } catch (error) {
    console.error('Mark as unread error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Group chat specific

// Update chat name
const updateChatName = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { name } = req.body;
    const userId = req.user._id;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Chat name is required' });
    }

    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, participants: userId },
      { name: name.trim() },
      { new: true }
    ).populate('participants', 'firstName lastName email');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.json({
      message: 'Chat name updated successfully',
      chat: formatChatResponse(chat)
    });
  } catch (error) {
    console.error('Update chat name error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update chat avatar
const updateChatAvatar = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { avatar } = req.body;
    const userId = req.user._id;

    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, participants: userId },
      { avatar },
      { new: true }
    ).populate('participants', 'firstName lastName email');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.json({
      message: 'Chat avatar updated successfully',
      chat: formatChatResponse(chat)
    });
  } catch (error) {
    console.error('Update chat avatar error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Chat statistics

// Get chat stats
const getChatStats = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const totalMessages = await Message.countDocuments({ chatId });
    const unreadMessages = await Message.countDocuments({
      chatId,
      senderId: { $ne: userId },
      readBy: { $nin: [userId] }
    });

    res.json({
      totalMessages,
      unreadMessages,
      participantCount: chat.participants.length,
      createdAt: chat.createdAt
    });
  } catch (error) {
    console.error('Get chat stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get unread count
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all chats for user
    const userChats = await Chat.find({ participants: userId }).select('_id');
    const chatIds = userChats.map(chat => chat._id);

    // Count unread messages across all chats
    const unreadCount = await Message.countDocuments({
      chatId: { $in: chatIds },
      senderId: { $ne: userId },
      readBy: { $nin: [userId] }
    });

    res.json({ count: unreadCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Batch operations

// Mark multiple as read
const markMultipleAsRead = async (req, res) => {
  try {
    const { chatIds } = req.body;
    const userId = req.user._id;

    if (!chatIds || !Array.isArray(chatIds)) {
      return res.status(400).json({ message: 'Chat IDs array is required' });
    }

    // Verify user is participant in all chats
    const userChats = await Chat.find({
      _id: { $in: chatIds },
      participants: userId
    });

    const validChatIds = userChats.map(chat => chat._id);

    // Mark messages as read
    await Message.updateMany(
      {
        chatId: { $in: validChatIds },
        senderId: { $ne: userId },
        readBy: { $nin: [userId] }
      },
      { $addToSet: { readBy: userId } }
    );

    res.json({
      message: 'Chats marked as read',
      updatedCount: validChatIds.length
    });
  } catch (error) {
    console.error('Mark multiple as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Archive multiple
const archiveMultiple = async (req, res) => {
  try {
    const { chatIds } = req.body;
    const userId = req.user._id;

    if (!chatIds || !Array.isArray(chatIds)) {
      return res.status(400).json({ message: 'Chat IDs array is required' });
    }

    const result = await Chat.updateMany(
      {
        _id: { $in: chatIds },
        participants: userId
      },
      { archived: true }
    );

    res.json({
      message: 'Chats archived successfully',
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Archive multiple error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete multiple
const deleteMultiple = async (req, res) => {
  try {
    const { chatIds } = req.body;
    const userId = req.user._id;

    if (!chatIds || !Array.isArray(chatIds)) {
      return res.status(400).json({ message: 'Chat IDs array is required' });
    }

    // Verify user is participant in all chats
    const userChats = await Chat.find({
      _id: { $in: chatIds },
      participants: userId
    });

    const validChatIds = userChats.map(chat => chat._id);

    // Delete messages first
    await Message.deleteMany({ chatId: { $in: validChatIds } });

    // Delete chats
    await Chat.deleteMany({ _id: { $in: validChatIds } });

    res.json({
      message: 'Chats deleted successfully',
      deletedCount: validChatIds.length
    });
  } catch (error) {
    console.error('Delete multiple error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  // Chat management
  createChat,
  getUserChats,
  getChatById,
  deleteChat,
  
  // Participants
  addParticipant,
  removeParticipant,
  getChatParticipants,
  leaveChat,
  
  // Messages
  getChatMessages,
  getLastMessage,
  
  // Search and filtering
  searchChats,
  getActiveChats,
  getArchivedChats,
  
  // Actions
  archiveChat,
  unarchiveChat,
  markAsRead,
  markAsUnread,
  
  // Group chat
  updateChatName,
  updateChatAvatar,
  
  // Statistics
  getChatStats,
  getUnreadCount,
  
  // Batch operations
  markMultipleAsRead,
  archiveMultiple,
  deleteMultiple,
  
  // Legacy (for compatibility)
  getChats: getUserChats
};