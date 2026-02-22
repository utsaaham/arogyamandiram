// ============================================
// /api/user/onboarding - Complete User Onboarding
// ============================================

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { maskedResponse, errorResponse, maskUser } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { generateTargets } from '@/lib/health';
import { getAgeFromDateOfBirth } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const { profile } = await req.json();

    if (!profile?.gender || !profile?.height || !profile?.weight) {
      return errorResponse('Please complete all profile fields', 400);
    }

    // Age from dateOfBirth (preferred) or legacy profile.age
    let age: number;
    if (profile.dateOfBirth) {
      const dob = new Date(profile.dateOfBirth);
      if (Number.isNaN(dob.getTime())) {
        return errorResponse('Invalid date of birth', 400);
      }
      age = getAgeFromDateOfBirth(dob);
      if (age < 13) return errorResponse('You must be at least 13 years old', 400);
      if (age > 120) return errorResponse('Invalid date of birth', 400);
    } else if (typeof profile?.age === 'number' && profile.age >= 13 && profile.age <= 120) {
      age = profile.age;
    } else {
      return errorResponse('Please enter your date of birth', 400);
    }

    await connectDB();

    // Build profile for DB: store dateOfBirth when provided, and age for legacy/compat
    const profileToSave = {
      ...profile,
      age,
      ...(profile.dateOfBirth && { dateOfBirth: new Date(profile.dateOfBirth) }),
    };

    // Auto-generate health targets from profile
    const targets = generateTargets(
      profile.weight,
      profile.height,
      age,
      profile.gender,
      profile.activityLevel || 'moderate',
      profile.goal || 'maintain'
    );

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          profile: profileToSave,
          targets,
          onboardingComplete: true,
        },
      },
      { new: true, runValidators: true }
    ).lean();

    if (!user) return errorResponse('User not found', 404);

    return maskedResponse(maskUser(user), { message: 'Welcome to Arogyamandiram!' });
  } catch (err) {
    console.error('[Onboarding Error]:', err);
    return errorResponse('Failed to complete onboarding', 500);
  }
}
