// ============================================
// /api/achievements - User streaks & badges
// ============================================

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { getAuthUserId, isUserId } from '@/lib/session';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { calculateAchievements } from '@/lib/gamification';

export const dynamic = 'force-dynamic';

// GET /api/achievements - Get current streaks and badges (and update them)
export async function GET(_req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    await connectDB();

    const result = await calculateAchievements(userId);

    return maskedResponse({
      achievements: result.achievements,
      newlyEarnedBadges: result.newlyEarnedBadges,
    });
  } catch (err) {
    console.error('[Achievements GET Error]:', err);
    return errorResponse('Failed to fetch achievements', 500);
  }
}

