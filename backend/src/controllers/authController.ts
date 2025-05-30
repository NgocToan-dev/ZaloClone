import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import User from '@/models/User';
import { 
  LoginRequestBody, 
  RegisterRequestBody, 
  AuthResponseData,
  UserResponseData,
  TokenPayload,
  AuthRequest 
} from '@/types/auth.types';
import { UserStatus } from '@/types/user.types';
import { TypedResponse } from '@/types/common.types';

// Generate JWT Token
const generateToken = (userId: string): string => {
  const payload = { userId };
  const secret = process.env.JWT_SECRET!;
  
  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  } as any);
};

// User response formatter for auth endpoints
const formatAuthResponse = (user: any) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  fullName: user.fullName,
  status: user.status || UserStatus.OFFLINE,
  lastSeen: user.lastSeen,
  createdAt: user.createdAt
});

// Register user
export const register = async (
  req: Request<{}, AuthResponseData, RegisterRequestBody>,
  res: TypedResponse<AuthResponseData>
): Promise<void> => {
  try {
    const { firstName, lastName, email, password }: RegisterRequestBody = req.body;

    // Validate input
    if (!firstName || !lastName || !email || !password) {
      res.status(400).json({
        message: 'All fields are required',
        token: '',
        user: {} as any
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        message: 'Password must be at least 6 characters long',
        token: '',
        user: {} as any
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        message: 'User already exists with this email',
        token: '',
        user: {} as any
      });
      return;
    }

    // Create new user with online status
    const user = new User({
      firstName,
      lastName,
      email,
      password,
      status: UserStatus.ONLINE,
      lastSeen: new Date()
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: formatAuthResponse(user)
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      message: 'Server error during registration',
      token: '',
      user: {} as any
    });
  }
};

// Login user
export const login = async (
  req: Request<{}, AuthResponseData, LoginRequestBody>,
  res: TypedResponse<AuthResponseData>
): Promise<void> => {
  try {
    const { email, password }: LoginRequestBody = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        message: 'Email and password are required',
        token: '',
        user: {} as any
      });
      return;
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({
        message: 'Invalid credentials',
        token: '',
        user: {} as any
      });
      return;
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(400).json({
        message: 'Invalid credentials',
        token: '',
        user: {} as any
      });
      return;
    }

    // Update user session/cache - set online status and last seen
    user.status = UserStatus.ONLINE;
    user.lastSeen = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: formatAuthResponse(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Server error during login',
      token: '',
      user: {} as any
    });
  }
};

// Logout user
export const logout = async (
  req: AuthRequest,
  res: TypedResponse<{ message: string; user?: any }>
): Promise<void> => {
  try {
    // Update user session/cache - set offline status
    const user = await User.findById(req.user?._id);
    if (user) {
      user.status = UserStatus.OFFLINE;
      user.lastSeen = new Date();
      await user.save();
    }

    res.json({ 
      message: 'Logout successful',
      user: user ? formatAuthResponse(user) : null
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      message: 'Server error during logout'
    });
  }
};

// Get current user (with fresh data)
export const getMe = async (
  req: AuthRequest,
  res: TypedResponse<UserResponseData>
): Promise<void> => {
  try {
    // Get fresh user data from database
    const user = await User.findById(req.user?._id);
    if (!user) {
      res.status(404).json({
        user: {} as any
      });
      return;
    }

    res.json({
      user: formatAuthResponse(user)
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      user: {} as any
    });
  }
};

// Refresh token
export const refreshToken = async (
  req: AuthRequest,
  res: TypedResponse<AuthResponseData>
): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) {
      res.status(404).json({
        message: 'User not found',
        token: '',
        user: {} as any
      });
      return;
    }

    // Generate new token
    const token = generateToken(user._id);

    res.json({
      message: 'Token refreshed successfully',
      token,
      user: formatAuthResponse(user)
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      message: 'Server error during token refresh',
      token: '',
      user: {} as any
    });
  }
};