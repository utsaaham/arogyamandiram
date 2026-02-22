// ============================================
// POST /api/auth/register - User Registration
// ============================================

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { maskedResponse, errorResponse, maskUser } from '@/lib/apiMask';
import { getAgeFromDateOfBirth } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, dateOfBirth } = await req.json();

    // Validation
    if (!email || !password) {
      return errorResponse('Email and password are required', 400);
    }
    if (password.length < 8) {
      return errorResponse('Password must be at least 8 characters', 400);
    }
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
    const existing = await User.findOne({ email: email.toLowerCase() }).lean();
    if (existing) {
      return errorResponse('An account with this email already exists', 409);
    }

    // Create user (password hashed by pre-save hook); store dateOfBirth, age derived on read
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      profile: { name: name || '', dateOfBirth: dob },
    });

    // Return masked user (no password, no apiKeys)
    const safeUser = maskUser(user.toObject());

    return maskedResponse(safeUser, { status: 201, message: 'Account created successfully' });
  } catch (err) {
    console.error('[Register Error]:', err);
    return errorResponse('Failed to create account', 500);
  }
}
