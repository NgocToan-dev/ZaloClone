import express from 'express';
import auth from '../middleware/auth';
import {
  sendMessage,
  getMessages,
  editMessage,
  deleteMessage,
  reactToMessage,
  removeReaction,
  getMessageReactions,
  markAsRead,
  getMessageById
} from '../controllers/messageController';

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// Message routes
router.post('/:chatId', sendMessage);
router.get('/:chatId', getMessages);
router.get('/single/:messageId', getMessageById);
router.put('/:messageId', editMessage);
router.delete('/:messageId', deleteMessage);

// Reaction routes
router.post('/:messageId/react', reactToMessage);
router.delete('/:messageId/react', removeReaction);
router.get('/:messageId/reactions', getMessageReactions);

// Read status
router.put('/:chatId/read', markAsRead);

export default router;