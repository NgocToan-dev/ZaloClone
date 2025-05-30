const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  // Authentication
  login,
  register,
  logout,
  
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
} = require('../controllers/userController');

// Authentication routes (public)
router.post('/login', login);
router.post('/register', register);

// Protected routes (require authentication)
router.use(auth); // Apply auth middleware to all routes below

// Logout
router.post('/logout', logout);

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

module.exports = router;