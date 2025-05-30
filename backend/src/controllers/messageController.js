const Message = require('../models/Message');
const Chat = require('../models/Chat');

// Send a message
const sendMessage = async (req, res) => {
  try {
    const { chatId, content } = req.body;
    const senderId = req.user._id;

    // Check if chat exists and user is participant
    const chat = await Chat.findOne({
      _id: chatId,
      participants: senderId
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Create new message
    const message = new Message({
      chatId,
      senderId,
      content
    });

    await message.save();

    // Update chat's lastMessage and updatedAt
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: message._id,
      updatedAt: new Date()
    });

    // Populate sender info
    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'firstName lastName');

    res.status(201).json({ message: populatedMessage });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  sendMessage
};