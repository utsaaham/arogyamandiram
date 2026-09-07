// ============================================
// POST /api/user/upgrade - Convert guest to full account
// ============================================

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { getAuthUserId, isUserId } from '@/lib/session';
import { maskUser, maskedResponse, errorResponse } from '@/lib/apiMask';
import { emailSchema, emailVerificationProofSchema, resetPasswordSchema } from '@/lib/authSecurity';
import {
  consumeEmailVerificationProof,
  emailVerificationCookieName,
  emailVerificationCookiePath,
  hasValidEmailVerificationProof,
} from '@/lib/emailVerification';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!isUserId(userId)) return userId;

  let body: { email?: string; password?: string; username?: string };
  try {
    body = await req.json() as typeof body;
  } catch {
    return errorResponse('Invalid request body', 400);
  }

  const { email, password, username } = body;

  // Basic validation
  if (!email || !password || !username) {
    return errorResponse('Email, password, and username are required', 400);
  }

  const parsedEmail = emailSchema.safeParse(email);
  if (!parsedEmail.success) return errorResponse('Enter a valid email address', 400);
  const parsedPassword = resetPasswordSchema.shape.password.safeParse(password);
  if (!parsedPassword.success) return errorResponse(parsedPassword.error.issues[0]?.message || 'Invalid password', 400);
  const parsedVerificationToken = emailVerificationProofSchema.safeParse(
    req.cookies.get(emailVerificationCookieName('guest-upgrade'))?.value,
  );
  if (!parsedVerificationToken.success) return errorResponse('Verify your email before saving the account', 400);

  const emailTrimmed = parsedEmail.data;
  const usernameTrimmed = username.trim().toLowerCase().replace(/\s+/g, '_');

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

  const emailVerified = await hasValidEmailVerificationProof({
    email: emailTrimmed,
    purpose: 'guest-upgrade',
    token: parsedVerificationToken.data,
    userId,
  });
  if (!emailVerified) return errorResponse('Email verification has expired. Request a new code.', 400);

  // Apply upgrade - pre-save hook will hash the password
  user.email = emailTrimmed;
  user.password = password;
  user.username = usernameTrimmed;
  user.isGuest = false;
  user.set('authSecurity.emailVerifiedAt', new Date());
  user.set('guestFingerprint', undefined);

  await user.save();

  await consumeEmailVerificationProof({
    email: emailTrimmed,
    purpose: 'guest-upgrade',
    token: parsedVerificationToken.data,
    userId,
  });

  const response = maskedResponse(maskUser(user));
  response.cookies.set(emailVerificationCookieName('guest-upgrade'), '', {
    maxAge: 0,
    path: emailVerificationCookiePath('guest-upgrade'),
  });
  return response;
}
