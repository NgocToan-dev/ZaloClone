import express from 'express';
import auth from '../middleware/auth';
import {
  // Profile
  getProfile,
  updateProfile,
  
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
} from '../controllers/userController';

const router = express.Router();

// Apply auth middleware to all routes (all user routes require authentication)
router.use(auth);

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Search and discovery routes
router.get('/search', searchUsers);
router.get('/email/:email', getUserByEmail);
router.get('/online', getOnlineUsers);

// Contact management routes
router.get('/contacts', getContacts);
router.post('/contacts', addContact);
router.delete('/contacts/:userId', removeContact);

// Status management routes
router.put('/status', updateStatus);

// User by ID route (must be last due to catch-all nature)
router.get('/info/:id', getUserById);

export default router;