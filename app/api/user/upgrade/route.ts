// ============================================
// POST /api/user/upgrade - Convert guest to full account
// ============================================

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { getAuthUserId, isUserId } from '@/lib/session';
import { maskUser, maskedResponse, errorResponse } from '@/lib/apiMask';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!isUserId(userId)) return userId;

  let body: { email?: string; password?: string; username?: string };
  try {
    body = await req.json() as { email?: string; password?: string; username?: string };
  } catch {
    return errorResponse('Invalid request body', 400);
  }

  const { email, password, username } = body;

  // Basic validation
  if (!email || !password || !username) {
    return errorResponse('Email, password, and username are required', 400);
  }

  const emailTrimmed = email.trim().toLowerCase();
  const usernameTrimmed = username.trim().toLowerCase().replace(/\s+/g, '_');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
    return errorResponse('Invalid email format', 400);
  }
  if (password.length < 8) {
    return errorResponse('Password must be at least 8 characters', 400);
  }
  if (!/^[a-z0-9_]{3,30}$/.test(usernameTrimmed)) {
    return errorResponse('Username must be 3-30 characters: letters, numbers, underscores only', 400);
  }

  await connectDB();

  const user = await User.findById(userId);
  if (!user) return errorResponse('User not found', 404);
  if (!user.isGuest) return errorResponse('Account is already upgraded', 400);

  // Check for duplicates
  const emailConflict = await User.findOne({ email: emailTrimmed });
  if (emailConflict) return errorResponse('Email is already in use', 409);

  const usernameConflict = await User.findOne({ username: usernameTrimmed });
  if (usernameConflict) return errorResponse('Username is already taken', 409);

  // Apply upgrade - pre-save hook will hash the password
  user.email = emailTrimmed;
  user.password = password;
  user.username = usernameTrimmed;
  user.isGuest = false;
  user.set('guestFingerprint', undefined);

  await user.save();

  return maskedResponse(maskUser(user));
}
