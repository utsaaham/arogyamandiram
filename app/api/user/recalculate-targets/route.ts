// ============================================
// /api/user/recalculate-targets - Recompute targets from profile formulas
// ============================================

import connectDB from '@/lib/db';
import User from '@/models/User';
import { maskedResponse, errorResponse, maskUser } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { getAgeFromDateOfBirth } from '@/lib/utils';
import { generateTargets } from '@/lib/health';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    await connectDB();
    const user = await User.findById(userId).lean();
    if (!user) return errorResponse('User not found', 404);

    const profile = user.profile as { weight?: number; height?: number; gender?: string; activityLevel?: string; goal?: string; dateOfBirth?: Date; age?: number } | undefined;
    if (!profile) return errorResponse('Complete your profile first', 400);

    let age: number;
    if (profile.dateOfBirth) {
      age = getAgeFromDateOfBirth(profile.dateOfBirth);
    } else if (typeof profile.age === 'number' && profile.age >= 13 && profile.age <= 120) {
      age = profile.age;
    } else {
      return errorResponse('Profile must include date of birth or age', 400);
    }

    const weight = typeof profile.weight === 'number' ? profile.weight : 0;
    const height = typeof profile.height === 'number' ? profile.height : 0;
    const gender = profile.gender;
    const activityLevel = profile.activityLevel;
    const goal = profile.goal;

    if (!weight || !height || !gender || !activityLevel || !goal) {
      return errorResponse('Profile must include weight, height, gender, activity level, and goal', 400);
    }

    const targets = generateTargets(
      weight,
      height,
      age,
      gender as 'male' | 'female' | 'other',
      activityLevel as 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active',
      goal as 'lose' | 'maintain' | 'gain'
    );

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: { targets } },
      { new: true, runValidators: true }
    )
      .select('+apiKeys.openai +apiKeys.edamam.appId +apiKeys.edamam.appKey')
      .lean();

    if (!updated) return errorResponse('User not found', 404);

    return maskedResponse(maskUser(updated), { message: 'Targets recalculated from profile' });
  } catch (err) {
    console.error('[Recalculate targets Error]:', err);
    return errorResponse('Failed to recalculate targets', 500);
  }
}
