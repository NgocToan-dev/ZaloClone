import { Server } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import User from '@/models/User';
import Message from '@/models/Message';
import Chat from '@/models/Chat';
import {
  AuthenticatedSocket,
  SocketAuthData,
  JoinChatData,
  LeaveChatData,
  SendMessageSocketData,
  MessageSentSocketData,
  TypingSocketData,
  MarkAsReadSocketData,
  SocketEvents,
  SocketErrorData,
  ConnectedUser
} from '@/types/socket.types';
import { TokenPayload } from '@/types/auth.types';

// Store connected users
const connectedUsers = new Map<string, ConnectedUser>();

// Socket authentication middleware
const authenticateSocket = async (socket: AuthenticatedSocket, next: (err?: Error) => void): Promise<void> => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    socket.userId = user._id.toString();
    socket.user = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      status: user.status
    };
    
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error: Invalid token'));
  }
};

// Handle user connection
const handleConnection = (socket: AuthenticatedSocket): void => {
  const userId = socket.userId!;
  const user = socket.user!;
  
  console.log(`✅ User ${user.firstName} ${user.lastName} connected (${userId})`);

  // Store connected user
  connectedUsers.set(userId, {
    socketId: socket.id,
    userId,
    user,
    connectedAt: new Date(),
    activeChats: new Set()
  });

  // Join user to their personal room
  socket.join(userId);

  // Update user status to online
  User.findByIdAndUpdate(userId, { 
    status: 'online',
    lastSeen: new Date()
  }).catch(err => console.error('Error updating user status:', err));

  // Emit user online status to contacts
  socket.broadcast.emit(SocketEvents.USER_ONLINE, {
    userId,
    isOnline: true
  });

  // Send auth success
  socket.emit(SocketEvents.AUTH_SUCCESS, {
    message: 'Authentication successful',
    user
  });
};

// Handle user disconnection
const handleDisconnection = (socket: AuthenticatedSocket): void => {
  const userId = socket.userId;
  const user = socket.user;
  
  if (userId && user) {
    console.log(`❌ User ${user.firstName} ${user.lastName} disconnected (${userId})`);

    // Remove from connected users
    connectedUsers.delete(userId);

    // Update user status to offline
    User.findByIdAndUpdate(userId, { 
      status: 'offline',
      lastSeen: new Date()
    }).catch(err => console.error('Error updating user status:', err));

    // Emit user offline status
    socket.broadcast.emit(SocketEvents.USER_OFFLINE, {
      userId,
      isOnline: false,
      lastSeen: new Date()
    });
  }
};

// Handle joining a chat room
const handleJoinChat = (socket: AuthenticatedSocket, data: JoinChatData): void => {
  const { chatId } = data;
  const userId = socket.userId!;
  
  socket.join(chatId);
  
  // Add to user's active chats
  const connectedUser = connectedUsers.get(userId);
  if (connectedUser) {
    connectedUser.activeChats.add(chatId);
  }
  
  console.log(`📥 User ${userId} joined chat ${chatId}`);
  
  // Notify other participants
  socket.to(chatId).emit(SocketEvents.USER_ONLINE, {
    userId,
    chatId,
    isOnline: true
  });
};

// Handle leaving a chat room
const handleLeaveChat = (socket: AuthenticatedSocket, data: LeaveChatData): void => {
  const { chatId } = data;
  const userId = socket.userId!;
  
  socket.leave(chatId);
  
  // Remove from user's active chats
  const connectedUser = connectedUsers.get(userId);
  if (connectedUser) {
    connectedUser.activeChats.delete(chatId);
  }
  
  console.log(`📤 User ${userId} left chat ${chatId}`);
};

// Handle sending a message
const handleSendMessage = async (socket: AuthenticatedSocket, data: SendMessageSocketData): Promise<void> => {
  try {
    const { chatId, content, messageType = 'text', replyTo } = data;
    const userId = socket.userId!;

    if (!content || content.trim().length === 0) {
      socket.emit(SocketEvents.ERROR, {
        message: 'Message content is required'
      } as SocketErrorData);
      return;
    }

    // Verify user is participant in the chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      socket.emit(SocketEvents.ERROR, {
        message: 'Chat not found or you are not a participant'
      } as SocketErrorData);
      return;
    }

    // Create new message
    const message = new Message({
      chatId,
      senderId: userId,
      content: content.trim(),
      messageType,
      replyTo
    });

    await message.save();

    // Update chat's lastMessage
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: message._id,
      updatedAt: new Date()
    });

    // Populate sender info
    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'firstName lastName email')
      .populate('replyTo');

    const messageData: MessageSentSocketData = {
      chatId,
      message: populatedMessage
    };

    // Emit message to all users in the chat
    socket.to(chatId).emit(SocketEvents.MESSAGE_RECEIVED, messageData);
    
    // Confirm to sender
    socket.emit(SocketEvents.MESSAGE_SENT, messageData);

    console.log(`💬 Message sent in chat ${chatId} by user ${userId}`);
  } catch (error) {
    console.error('Send message error:', error);
    socket.emit(SocketEvents.ERROR, {
      message: 'Failed to send message',
      details: error
    } as SocketErrorData);
  }
};

// Handle typing indicators
const handleTyping = (socket: AuthenticatedSocket, data: TypingSocketData): void => {
  const { chatId, isTyping } = data;
  const userId = socket.userId!;

  // Emit typing status to other participants in the chat
  socket.to(chatId).emit(SocketEvents.USER_TYPING, {
    chatId,
    userId,
    isTyping
  });

  console.log(`⌨️  User ${userId} ${isTyping ? 'started' : 'stopped'} typing in chat ${chatId}`);
};

// Handle marking messages as read
const handleMarkAsRead = async (socket: AuthenticatedSocket, data: MarkAsReadSocketData): Promise<void> => {
  try {
    const { chatId, messageIds } = data;
    const userId = socket.userId!;

    // Check if user is participant in the chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      socket.emit(SocketEvents.ERROR, {
        message: 'Chat not found'
      } as SocketErrorData);
      return;
    }

    let query: any = { chatId };
    
    if (messageIds && messageIds.length > 0) {
      query._id = { $in: messageIds };
    }

    // Mark messages as read
    await Message.updateMany(
      {
        ...query,
        senderId: { $ne: userId },
        readBy: { $nin: [userId] }
      },
      { $addToSet: { readBy: userId } }
    );

    // Notify other participants
    socket.to(chatId).emit(SocketEvents.MESSAGE_READ, {
      chatId,
      userId,
      messageIds
    });

    console.log(`✅ User ${userId} marked messages as read in chat ${chatId}`);
  } catch (error) {
    console.error('Mark as read error:', error);
    socket.emit(SocketEvents.ERROR, {
      message: 'Failed to mark messages as read',
      details: error
    } as SocketErrorData);
  }
};

// Main socket handler
const socketHandler = (io: Server): void => {
  // Use authentication middleware
  io.use(authenticateSocket);

  io.on(SocketEvents.CONNECTION, (socket: AuthenticatedSocket) => {
    // Handle initial connection
    handleConnection(socket);

    // Handle joining a chat room
    socket.on(SocketEvents.JOIN_CHAT, (data: JoinChatData) => {
      handleJoinChat(socket, data);
    });

    // Handle leaving a chat room
    socket.on(SocketEvents.LEAVE_CHAT, (data: LeaveChatData) => {
      handleLeaveChat(socket, data);
    });

    // Handle sending a message
    socket.on(SocketEvents.SEND_MESSAGE, (data: SendMessageSocketData) => {
      handleSendMessage(socket, data);
    });

    // Handle typing indicators
    socket.on(SocketEvents.TYPING_START, (data: TypingSocketData) => {
      handleTyping(socket, { ...data, isTyping: true });
    });

    socket.on(SocketEvents.TYPING_STOP, (data: TypingSocketData) => {
      handleTyping(socket, { ...data, isTyping: false });
    });

    // Handle marking messages as read
    socket.on(SocketEvents.MARK_AS_READ, (data: MarkAsReadSocketData) => {
      handleMarkAsRead(socket, data);
    });

    // Handle disconnect
    socket.on(SocketEvents.DISCONNECT, () => {
      handleDisconnection(socket);
    });

    // Handle errors
    socket.on('error', (error: Error) => {
      console.error('Socket error:', error);
    });
  });

  console.log('🔌 Socket.IO server initialized');
};

// Get connected users (for debugging/admin purposes)
export const getConnectedUsers = (): ConnectedUser[] => {
  return Array.from(connectedUsers.values());
};

// Get user's active chats
export const getUserActiveChats = (userId: string): string[] => {
  const user = connectedUsers.get(userId);
  return user ? Array.from(user.activeChats) : [];
};

// Check if user is online
export const isUserOnline = (userId: string): boolean => {
  return connectedUsers.has(userId);
};

export default socketHandler;