// ============================================
// POST /api/auth/register - User Registration
// ============================================

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { maskedResponse, errorResponse, maskUser } from '@/lib/apiMask';
import { getAgeFromDateOfBirth } from '@/lib/utils';
import { emailSchema, emailVerificationProofSchema, resetPasswordSchema } from '@/lib/authSecurity';
import {
  consumeEmailVerificationProof,
  emailVerificationCookieName,
  emailVerificationCookiePath,
  hasValidEmailVerificationProof,
} from '@/lib/emailVerification';

function normalizeUsername(raw: string): string {
  return raw.toLowerCase().trim().replace(/\s+/g, '_');
}

function validateUsername(username: string): string | null {
  const normalized = normalizeUsername(username);
  if (normalized.length < 3) return 'Username must be at least 3 characters';
  if (normalized.length > 30) return 'Username must be at most 30 characters';
  if (!/^[a-z0-9_]+$/.test(normalized)) return 'Username can only contain letters, numbers, and underscores';
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const {
      email,
      password,
      name,
      dateOfBirth,
      username: rawUsername,
    } = await req.json();

    // Validation
    if (!email || !password) {
      return errorResponse('Email and password are required', 400);
    }
    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) return errorResponse('Enter a valid email address', 400);
    const parsedPassword = resetPasswordSchema.shape.password.safeParse(password);
    if (!parsedPassword.success) return errorResponse(parsedPassword.error.issues[0]?.message || 'Invalid password', 400);
    const normalizedEmail = parsedEmail.data;
    const parsedVerificationToken = emailVerificationProofSchema.safeParse(
      req.cookies.get(emailVerificationCookieName('register'))?.value,
    );
    if (!parsedVerificationToken.success) {
      return errorResponse('Verify your email before creating the account', 400);
    }
    if (!rawUsername || typeof rawUsername !== 'string') {
      return errorResponse('Username is required', 400);
    }
    const usernameErr = validateUsername(rawUsername);
    if (usernameErr) return errorResponse(usernameErr, 400);
    const username = normalizeUsername(rawUsername);
    if (!dateOfBirth) {
      return errorResponse('Date of birth is required', 400);
    }
    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) {
      return errorResponse('Invalid date of birth', 400);
    }
    const age = getAgeFromDateOfBirth(dob);
    if (age < 13) {
      return errorResponse('You must be at least 13 years old to register', 400);
    }
    if (age > 120) {
      return errorResponse('Invalid date of birth', 400);
    }

    await connectDB();

    // Check if user exists
    const existingEmail = await User.findOne({ email: normalizedEmail }).lean();
    if (existingEmail) {
      return errorResponse('An account with this email already exists', 409);
    }
    const existingUsername = await User.findOne({ username }).lean();
    if (existingUsername) {
      return errorResponse('This username is already taken', 409);
    }

    const emailVerified = await hasValidEmailVerificationProof({
      email: normalizedEmail,
      purpose: 'register',
      token: parsedVerificationToken.data,
    });
    if (!emailVerified) return errorResponse('Email verification has expired. Request a new code.', 400);

    // Create user (password hashed by pre-save hook); store dateOfBirth, age derived on read
    const user = await User.create({
      username,
      email: normalizedEmail,
      password,
      authSecurity: { emailVerifiedAt: new Date() },
      profile: { name: name || '', dateOfBirth: dob },
    });

    await consumeEmailVerificationProof({
      email: normalizedEmail,
      purpose: 'register',
      token: parsedVerificationToken.data,
    });

    // Return masked user (no password, no apiKeys)
    const safeUser = maskUser(user.toObject());

    const response = maskedResponse(safeUser, { status: 201, message: 'Account created successfully' });
    response.cookies.set(emailVerificationCookieName('register'), '', {
      maxAge: 0,
      path: emailVerificationCookiePath('register'),
    });
    return response;
  } catch (err) {
    const code = typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code ?? 'unknown')
      : 'unknown';
    console.error('[Register Error]', { code });
    return errorResponse('Failed to create account', 500);
  }
}
