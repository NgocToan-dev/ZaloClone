const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// User response formatter
const formatUserResponse = (user) => ({
  _id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  fullName: user.fullName,
  status: user.status || 'offline',
  lastSeen: user.lastSeen,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

// Authentication methods

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last seen and status
    user.lastSeen = new Date();
    user.status = 'online';
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: formatUserResponse(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// Register user
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Validate input
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create new user
    const user = new User({
      firstName,
      lastName,
      email,
      password,
      status: 'online'
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: formatUserResponse(user)
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.status = 'offline';
      user.lastSeen = new Date();
      await user.save();
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
};

// Profile methods

// Get user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: formatUserResponse(user)
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: formatUserResponse(user)
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error during profile update' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error during password change' });
  }
};

// User search and discovery

// Search users
const searchUsers = async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters long' });
    }

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } }, // Exclude current user
        {
          $or: [
            { firstName: { $regex: query, $options: 'i' } },
            { lastName: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    })
    .limit(parseInt(limit))
    .select('-password');

    res.json({
      users: users.map(formatUserResponse),
      count: users.length
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error during user search' });
  }
};

// Get user by email
const getUserByEmail = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ 
      email,
      _id: { $ne: req.user._id } // Exclude current user
    }).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: formatUserResponse(user)
    });
  } catch (error) {
    console.error('Get user by email error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// User relationships/contacts

// Get user contacts
const getContacts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('contacts', '-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      contacts: (user.contacts || []).map(formatUserResponse),
      count: (user.contacts || []).length
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add contact
const addContact = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot add yourself as contact' });
    }

    const contactUser = await User.findById(userId);
    if (!contactUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = await User.findById(req.user._id);
    
    // Check if already in contacts
    if (user.contacts && user.contacts.includes(userId)) {
      return res.status(400).json({ message: 'User is already in your contacts' });
    }

    // Add to contacts
    if (!user.contacts) user.contacts = [];
    user.contacts.push(userId);
    await user.save();

    // Also add current user to the other user's contacts (mutual)
    if (!contactUser.contacts) contactUser.contacts = [];
    if (!contactUser.contacts.includes(req.user._id)) {
      contactUser.contacts.push(req.user._id);
      await contactUser.save();
    }

    res.json({
      message: 'Contact added successfully',
      contact: formatUserResponse(contactUser)
    });
  } catch (error) {
    console.error('Add contact error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove contact
const removeContact = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user.contacts || !user.contacts.includes(userId)) {
      return res.status(404).json({ message: 'User not found in contacts' });
    }

    // Remove from contacts
    user.contacts = user.contacts.filter(id => id.toString() !== userId);
    await user.save();

    // Also remove current user from the other user's contacts
    const contactUser = await User.findById(userId);
    if (contactUser && contactUser.contacts) {
      contactUser.contacts = contactUser.contacts.filter(id => id.toString() !== req.user._id.toString());
      await contactUser.save();
    }

    res.json({ message: 'Contact removed successfully' });
  } catch (error) {
    console.error('Remove contact error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// User status

// Update user status
const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['online', 'away', 'busy', 'offline'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be: online, away, busy, or offline' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 
        status,
        lastSeen: status === 'offline' ? new Date() : user.lastSeen
      },
      { new: true }
    );

    res.json({
      message: 'Status updated successfully',
      status: user.status
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get online users
const getOnlineUsers = async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.user._id },
      status: { $in: ['online', 'away', 'busy'] }
    }).select('-password').limit(50);

    res.json({
      users: users.map(formatUserResponse),
      count: users.length
    });
  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user by ID (public endpoint for other services)
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: formatUserResponse(user)
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
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
};