import express from 'express';
import { auth } from '../middleware/auth';
import {
  getStickerPacks,
  getPackStickers,
  getUserStickerPacks,
  addPackToUser,
  sendStickerMessage,
  createStickerPack,
  addStickerToPack,
  getStickerCategories
} from '../controllers/stickerController';

const router = express.Router();

// Public routes
router.get('/packs', getStickerPacks);
router.get('/pack/:packId', getPackStickers);
router.get('/categories', getStickerCategories);

// Protected routes
router.use(auth);

// User sticker management
router.get('/user/packs', getUserStickerPacks);
router.post('/user/pack/:packId', addPackToUser);

// Sticker messaging
router.post('/message', sendStickerMessage);

// Admin routes (TODO: Add admin middleware)
router.post('/pack', createStickerPack);
router.post('/pack/:packId/sticker', addStickerToPack);

export default router;