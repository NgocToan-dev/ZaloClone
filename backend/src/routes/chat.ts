import express from 'express';
import auth from '@/middleware/auth';
import {
  createChat,
  getUserChats,
  getChatById,
  deleteChat,
  addParticipant,
  removeParticipant,
  getChatParticipants,
  archiveChat,
  markAsRead
} from '@/controllers/chatController';

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// Chat management routes
router.post('/', createChat);
router.get('/', getUserChats);
router.get('/:chatId', getChatById);
router.delete('/:chatId', deleteChat);

// Participant management routes
router.post('/:chatId/participants', addParticipant);
router.delete('/:chatId/participants/:userId', removeParticipant);
router.get('/:chatId/participants', getChatParticipants);

// Chat actions routes
router.put('/:chatId/archive', archiveChat);
router.put('/:chatId/read', markAsRead);

export default router;