const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
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
  
  // Legacy
  getChats
} = require('../controllers/chatController');

// All routes require authentication
router.use(auth);

// Chat management routes
router.post('/', createChat);
router.get('/user', getUserChats);
router.get('/search', searchChats);
router.get('/active', getActiveChats);
router.get('/archived', getArchivedChats);
router.get('/unread-count', getUnreadCount);

// Batch operations
router.put('/batch/read', markMultipleAsRead);
router.put('/batch/archive', archiveMultiple);
router.delete('/batch', deleteMultiple);

// Individual chat routes
router.get('/:chatId', getChatById);
router.delete('/:chatId', deleteChat);

// Chat participants
router.get('/:chatId/participants', getChatParticipants);
router.post('/:chatId/participants', addParticipant);
router.delete('/:chatId/participants/:userId', removeParticipant);
router.post('/:chatId/leave', leaveChat);

// Chat messages
router.get('/:chatId/messages', getChatMessages);
router.get('/:chatId/last-message', getLastMessage);

// Chat actions
router.put('/:chatId/archive', archiveChat);
router.put('/:chatId/unarchive', unarchiveChat);
router.put('/:chatId/read', markAsRead);
router.put('/:chatId/unread', markAsUnread);

// Group chat specific
router.put('/:chatId/name', updateChatName);
router.put('/:chatId/avatar', updateChatAvatar);

// Chat statistics
router.get('/:chatId/stats', getChatStats);

// Legacy route (for backwards compatibility)
router.get('/', getChats);

module.exports = router;