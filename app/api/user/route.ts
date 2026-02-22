// ============================================
// /api/user - User Profile CRUD
// ============================================

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { maskedResponse, errorResponse, maskUser } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';

// GET /api/user - Get current user profile (masked)
export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId; // Returns error response

    await connectDB();
    const user = await User.findById(userId).lean();

    if (!user) return errorResponse('User not found', 404);

    return maskedResponse(maskUser(user));
  } catch (err) {
    console.error('[User GET Error]:', err);
    return errorResponse('Failed to fetch user', 500);
  }
}

// PUT /api/user - Update user profile, settings, or targets
export async function PUT(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const body = await req.json();
    const { profile, settings, targets } = body;

    await connectDB();

    const updateData: Record<string, unknown> = {};

    if (profile) {
      // Build dot-notation updates for nested fields
      for (const [key, value] of Object.entries(profile)) {
        if (key === 'dateOfBirth' && value) {
          updateData['profile.dateOfBirth'] = new Date(value as string);
        } else {
          updateData[`profile.${key}`] = value;
        }
      }
    }

    if (settings) {
      for (const [key, value] of Object.entries(settings)) {
        if (key === 'notifications' && typeof value === 'object') {
          for (const [nKey, nVal] of Object.entries(value as Record<string, boolean>)) {
            updateData[`settings.notifications.${nKey}`] = nVal;
          }
        } else {
          updateData[`settings.${key}`] = value;
        }
      }
    }

    if (targets) {
      for (const [key, value] of Object.entries(targets)) {
        updateData[`targets.${key}`] = value;
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!user) return errorResponse('User not found', 404);

    return maskedResponse(maskUser(user), { message: 'Profile updated' });
  } catch (err) {
    console.error('[User PUT Error]:', err);
    return errorResponse('Failed to update user', 500);
  }
}
