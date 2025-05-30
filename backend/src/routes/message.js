const express = require('express');
const { sendMessage } = require('../controllers/messageController');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/messages
// @desc    Send a message
// @access  Private
router.post('/', auth, sendMessage);

module.exports = router;