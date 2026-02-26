// ============================================
// /api/achievements - User streaks & badges
// ============================================

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import DailyLog from '@/models/DailyLog';
import { getAuthUserId, isUserId } from '@/lib/session';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { calculateAchievements } from '@/lib/gamification';
import { getToday } from '@/lib/utils';
import { getLevelProgress } from '@/lib/level';

export const dynamic = 'force-dynamic';

// GET /api/achievements - Get current streaks and badges (and update them)
export async function GET(_req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    await connectDB();

    const result = await calculateAchievements(userId);
    const xpTotal = result.achievements.xpTotal ?? 0;
    const { level, xpIntoLevel, xpPercent, xpForCurrentLevel } = getLevelProgress(xpTotal);

    // Optional: XP already awarded for *today* (0–50).
    const today = getToday();
    const todayLog = await DailyLog.findOne(
      { userId, date: today },
      { xpAwarded: 1, _id: 0 }
    ).lean<{ xpAwarded?: number } | null>();
    const xpToday = todayLog?.xpAwarded ?? 0;

    return maskedResponse({
      achievements: result.achievements,
      newlyEarnedBadges: result.newlyEarnedBadges,
      xpTotal,
      xpToday,
      level,
      xpIntoLevel,
      xpPercent,
      xpForCurrentLevel,
    });
  } catch (err) {
    console.error('[Achievements GET Error]:', err);
    return errorResponse('Failed to fetch achievements', 500);
  }
}

