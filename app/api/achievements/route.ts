// ============================================
// /api/achievements - User streaks & badges
// ============================================

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import DailyLog from '@/models/DailyLog';
import { getAuthUserId, isUserId } from '@/lib/session';
import { maskedResponse } from '@/lib/apiMask';
import { calculateAchievements } from '@/lib/gamification';
import { getToday } from '@/lib/utils';
import { getLevelProgress } from '@/lib/level';

export const dynamic = 'force-dynamic';

const EMPTY_STREAKS = {
  current: { logging: 0, calories: 0, water: 0, workout: 0, sleep: 0, weight: 0 },
  best: { logging: 0, calories: 0, water: 0, workout: 0, sleep: 0, weight: 0 },
  starts: {} as Record<string, undefined>,
};

/** Safe fallback so the Achievements page always renders (no red banner). */
function safeAchievementsPayload() {
  const xpTotal = 0;
  const { level, xpIntoLevel, xpPercent, xpForCurrentLevel } = getLevelProgress(xpTotal);
  return maskedResponse({
    achievements: {
      badges: [],
      streaks: EMPTY_STREAKS,
      xpTotal: 0,
    },
    newlyEarnedBadges: [],
    xpTotal,
    xpToday: 0,
    level,
    xpIntoLevel,
    xpPercent,
    xpForCurrentLevel,
  });
}

// GET /api/achievements - Get current streaks and badges (and update them)
export async function GET(_req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    await connectDB();

    let result;
    try {
      result = await calculateAchievements(userId);
    } catch (calcErr) {
      console.error('[Achievements GET] calculateAchievements failed:', calcErr);
      return safeAchievementsPayload();
    }

    const xpTotal = result.achievements.xpTotal ?? 0;
    const { level, xpIntoLevel, xpPercent, xpForCurrentLevel } = getLevelProgress(xpTotal);

    const today = getToday();
    let xpToday = 0;
    try {
      const todayLog = await DailyLog.findOne(
        { userId, date: today },
        { xpAwarded: 1, _id: 0 }
      ).lean<{ xpAwarded?: number } | null>();
      xpToday = todayLog?.xpAwarded ?? 0;
    } catch (logErr) {
      console.warn('[Achievements GET] todayLog fetch failed:', logErr);
    }

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
    return safeAchievementsPayload();
  }
}

