// ============================================
// /api/user - User Profile CRUD
// ============================================

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { maskedResponse, errorResponse, maskUser } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { getAgeFromDateOfBirth } from '@/lib/utils';
import { generateTargets } from '@/lib/health';

export const dynamic = 'force-dynamic';

// GET /api/user - Get current user profile (masked)
export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId; // Returns error response

    await connectDB();
    // Include apiKeys so maskUser can compute hasOpenAiKey/hasEdamamKey (values are never sent to client)
    const user = await User.findById(userId)
      .select('+apiKeys.openai +apiKeys.edamam.appId +apiKeys.edamam.appKey')
      .lean();

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

      // Recompute formula-based targets when profile has all required fields
      const weight = typeof profile.weight === 'number' ? profile.weight : undefined;
      const height = typeof profile.height === 'number' ? profile.height : undefined;
      const gender = profile.gender as string | undefined;
      const activityLevel = profile.activityLevel as string | undefined;
      const goal = profile.goal as string | undefined;
      let age: number | undefined;
      if (profile.dateOfBirth) {
        const dob = new Date(profile.dateOfBirth);
        if (!Number.isNaN(dob.getTime())) age = getAgeFromDateOfBirth(dob);
      } else if (typeof profile.age === 'number') {
        age = profile.age;
      }
      const hasRequired =
        weight != null && weight > 0 &&
        height != null && height > 0 &&
        gender && activityLevel && goal &&
        age != null && age >= 13 && age <= 120;
      if (hasRequired) {
        const generated = generateTargets(weight!, height!, age!, gender as 'male' | 'female' | 'other', activityLevel as 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active', goal as 'lose' | 'maintain' | 'gain');
        for (const [key, value] of Object.entries(generated)) {
          updateData[`targets.${key}`] = value;
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

    // Only apply body.targets if we didn't already set targets from profile formulas
    if (targets && !Object.keys(updateData).some((k) => k.startsWith('targets.'))) {
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
