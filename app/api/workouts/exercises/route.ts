// ============================================
// /api/workouts/exercises - User Exercise Library
// ============================================

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import DailyLog from '@/models/DailyLog';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

// GET /api/workouts/exercises?days=N
// Returns distinct exercise names the user has logged in the last N days,
// sorted by most recently used.
export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const { searchParams } = new URL(req.url);
    const daysParam = searchParams.get('days');
    const days = Math.min(Math.max(parseInt(daysParam || '90', 10), 1), 365);

    await connectDB();

    // Query recent logs with workouts for this user
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);

    const logs = await DailyLog.find(
      {
        userId,
        date: { $gte: sinceStr },
        'workouts.0': { $exists: true },
      },
      { date: 1, workouts: 1 }
    )
      .sort({ date: 1 })
      .lean();

    type WorkoutLike = {
      exercise?: string;
    };

    const exerciseMap = new Map<
      string,
      { name: string; count: number; lastDate: string }
    >();

    for (const log of logs as { date: string; workouts?: WorkoutLike[] }[]) {
      const logDate = log.date;
      for (const w of log.workouts || []) {
        const name = (w.exercise || '').trim();
        if (!name) continue;
        const key = name.toLowerCase();
        const existing = exerciseMap.get(key);
        if (!existing) {
          exerciseMap.set(key, { name, count: 1, lastDate: logDate });
        } else {
          existing.count += 1;
          if (logDate > existing.lastDate) {
            existing.lastDate = logDate;
          }
        }
      }
    }

    const exercises = Array.from(exerciseMap.values()).sort(
      (a, b) => (b.lastDate > a.lastDate ? 1 : -1)
    );

    return maskedResponse({ exercises });
  } catch (err) {
    console.error('[Workout Exercises GET Error]:', err);
    return errorResponse('Failed to fetch exercises', 500);
  }
}

