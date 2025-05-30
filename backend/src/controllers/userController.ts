import { Request, Response } from 'express';
import User from '../models/User';
import { AuthRequest } from '../types/auth.types';
import {
  UserResponse,
  UpdateProfileRequest,
  SearchUsersQuery,
  AddContactRequest,
  UpdateStatusRequest,
  UserStatus,
  ProfileResponse,
  UpdateProfileResponse,
  UsersListResponse,
  ContactsListResponse,
  AddContactResponse,
  UpdateStatusResponse
} from '../types/user.types';
import { TypedResponse } from '../types/common.types';

// User response formatter
const formatUserResponse = (user: any): UserResponse => ({
  _id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  fullName: user.fullName,
  status: user.status || UserStatus.OFFLINE,
  lastSeen: user.lastSeen,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

// Profile methods

// Get user profile
export const getProfile = async (
  req: AuthRequest,
  res: TypedResponse<ProfileResponse>
): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) {
      res.status(404).json({ user: {} as UserResponse });
      return;
    }

    res.json({
      user: formatUserResponse(user)
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ user: {} as UserResponse });
  }
};

// Update user profile
export const updateProfile = async (
  req: Request<{}, UpdateProfileResponse, UpdateProfileRequest>,
  res: TypedResponse<UpdateProfileResponse>
): Promise<void> => {
  try {
    const { firstName, lastName }: UpdateProfileRequest = req.body;
    const authReq = req as AuthRequest;
    
    const updateData: Partial<UpdateProfileRequest> = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;

    const user = await User.findByIdAndUpdate(
      authReq.user?._id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      res.status(404).json({
        message: 'User not found',
        user: {} as UserResponse
      });
      return;
    }

    res.json({
      message: 'Profile updated successfully',
      user: formatUserResponse(user)
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      message: 'Server error during profile update',
      user: {} as UserResponse
    });
  }
};

// User search and discovery

// Search users
export const searchUsers = async (
  req: AuthRequest,
  res: TypedResponse<UsersListResponse>
): Promise<void> => {
  try {
    const { q: query, limit = 10 } = req.query as any;

    if (!query || query.length < 2) {
      res.status(400).json({
        users: [],
        count: 0
      });
      return;
    }

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user?._id } }, // Exclude current user
        {
          $or: [
            { firstName: { $regex: query, $options: 'i' } },
            { lastName: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    })
    .limit(parseInt(limit.toString()))
    .select('-password');

    res.json({
      users: users.map(formatUserResponse),
      count: users.length
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      users: [],
      count: 0
    });
  }
};

// Get user by email
export const getUserByEmail = async (
  req: Request<{ email: string }, ProfileResponse>,
  res: TypedResponse<ProfileResponse>
): Promise<void> => {
  try {
    const { email } = req.params;
    const authReq = req as AuthRequest;

    if (!email) {
      res.status(400).json({ user: {} as UserResponse });
      return;
    }

    const user = await User.findOne({ 
      email,
      _id: { $ne: authReq.user?._id } // Exclude current user
    }).select('-password');

    if (!user) {
      res.status(404).json({ user: {} as UserResponse });
      return;
    }

    res.json({
      user: formatUserResponse(user)
    });
  } catch (error) {
    console.error('Get user by email error:', error);
    res.status(500).json({ user: {} as UserResponse });
  }
};

// User relationships/contacts

// Get user contacts
export const getContacts = async (
  req: AuthRequest,
  res: TypedResponse<ContactsListResponse>
): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id).populate('contacts', '-password');
    
    if (!user) {
      res.status(404).json({
        contacts: [],
        count: 0
      });
      return;
    }

    res.json({
      contacts: (user.contacts || []).map(formatUserResponse),
      count: (user.contacts || []).length
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      contacts: [],
      count: 0
    });
  }
};

// Add contact
export const addContact = async (
  req: Request<{}, AddContactResponse, AddContactRequest>,
  res: TypedResponse<AddContactResponse>
): Promise<void> => {
  try {
    const { userId }: AddContactRequest = req.body;
    const authReq = req as AuthRequest;

    if (!userId) {
      res.status(400).json({
        message: 'User ID is required',
        contact: {} as UserResponse
      });
      return;
    }

    if (userId === authReq.user?._id.toString()) {
      res.status(400).json({
        message: 'Cannot add yourself as contact',
        contact: {} as UserResponse
      });
      return;
    }

    const contactUser = await User.findById(userId);
    if (!contactUser) {
      res.status(404).json({
        message: 'User not found',
        contact: {} as UserResponse
      });
      return;
    }

    const user = await User.findById(authReq.user?._id);
    if (!user) {
      res.status(404).json({
        message: 'Current user not found',
        contact: {} as UserResponse
      });
      return;
    }
    
    // Check if already in contacts
    if (user.contacts && user.contacts.includes(userId)) {
      res.status(400).json({
        message: 'User is already in your contacts',
        contact: {} as UserResponse
      });
      return;
    }

    // Add to contacts
    if (!user.contacts) user.contacts = [];
    user.contacts.push(userId);
    await user.save();

    // Also add current user to the other user's contacts (mutual)
    if (!contactUser.contacts) contactUser.contacts = [];
    if (!contactUser.contacts.includes(authReq.user!._id)) {
      contactUser.contacts.push(authReq.user!._id);
      await contactUser.save();
    }

    res.json({
      message: 'Contact added successfully',
      contact: formatUserResponse(contactUser)
    });
  } catch (error) {
    console.error('Add contact error:', error);
    res.status(500).json({
      message: 'Server error',
      contact: {} as UserResponse
    });
  }
};

// Remove contact
export const removeContact = async (
  req: Request<{ userId: string }, { message: string }>,
  res: TypedResponse<{ message: string }>
): Promise<void> => {
  try {
    const { userId } = req.params;
    const authReq = req as AuthRequest;

    if (!userId) {
      res.status(400).json({ message: 'User ID is required' });
      return;
    }

    const user = await User.findById(authReq.user?._id);
    if (!user || !user.contacts || !user.contacts.includes(userId)) {
      res.status(404).json({ message: 'User not found in contacts' });
      return;
    }

    // Remove from contacts
    user.contacts = user.contacts.filter(id => id.toString() !== userId);
    await user.save();

    // Also remove current user from the other user's contacts
    const contactUser = await User.findById(userId);
    if (contactUser && contactUser.contacts) {
      contactUser.contacts = contactUser.contacts.filter(id => id.toString() !== authReq.user?._id.toString());
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
export const updateStatus = async (
  req: Request<{}, UpdateStatusResponse, UpdateStatusRequest>,
  res: TypedResponse<UpdateStatusResponse>
): Promise<void> => {
  try {
    const { status }: UpdateStatusRequest = req.body;
    const authReq = req as AuthRequest;

    if (!status || !Object.values(UserStatus).includes(status)) {
      res.status(400).json({
        message: 'Invalid status. Must be: online, away, busy, or offline',
        status: UserStatus.OFFLINE
      });
      return;
    }

    const user = await User.findByIdAndUpdate(
      authReq.user?._id,
      { 
        status,
        lastSeen: status === UserStatus.OFFLINE ? new Date() : undefined
      },
      { new: true }
    );

    if (!user) {
      res.status(404).json({
        message: 'User not found',
        status: UserStatus.OFFLINE
      });
      return;
    }

    res.json({
      message: 'Status updated successfully',
      status: user.status
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      message: 'Server error',
      status: UserStatus.OFFLINE
    });
  }
};

// Get online users
export const getOnlineUsers = async (
  req: AuthRequest,
  res: TypedResponse<UsersListResponse>
): Promise<void> => {
  try {
    const users = await User.find({
      _id: { $ne: req.user?._id },
      status: { $in: [UserStatus.ONLINE, UserStatus.AWAY, UserStatus.BUSY] }
    }).select('-password').limit(50);

    res.json({
      users: users.map(formatUserResponse),
      count: users.length
    });
  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({
      users: [],
      count: 0
    });
  }
};

// Get user by ID (public endpoint for other services)
export const getUserById = async (
  req: Request<{ id: string }, ProfileResponse>,
  res: TypedResponse<ProfileResponse>
): Promise<void> => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id).select('-password');
    if (!user) {
      res.status(404).json({ user: {} as UserResponse });
      return;
    }

    res.json({
      user: formatUserResponse(user)
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ user: {} as UserResponse });
  }
};