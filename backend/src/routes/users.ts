import express from 'express';
import auth from '@/middleware/auth';
import {
  // Profile
  getProfile,
  updateProfile,
  changePassword,
  
  // Search and discovery
  searchUsers,
  getUserByEmail,
  getUserById,
  
  // Contacts
  getContacts,
  addContact,
  removeContact,
  
  // Status
  updateStatus,
  getOnlineUsers
} from '@/controllers/userController';

const router = express.Router();

// Apply auth middleware to all routes (all user routes require authentication)
router.use(auth);

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);

// Search and discovery routes
router.get('/search', searchUsers);
router.get('/email/:email', getUserByEmail);
router.get('/online', getOnlineUsers);
router.get('/:id', getUserById);

// Contact management routes
router.get('/contacts', getContacts);
router.post('/contacts', addContact);
router.delete('/contacts/:userId', removeContact);

// Status management routes
router.put('/status', updateStatus);

export default router;