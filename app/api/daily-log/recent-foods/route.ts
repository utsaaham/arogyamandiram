// ============================================
// /api/daily-log/recent-foods - User Recent Foods
// ============================================

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import DailyLog from '@/models/DailyLog';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

// GET /api/daily-log/recent-foods?days=N&limit=M
// Returns distinct food names the user has logged recently, sorted by recency.
export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const { searchParams } = new URL(req.url);
    const daysParam = searchParams.get('days');
    const limitParam = searchParams.get('limit');

    const days = Math.min(Math.max(parseInt(daysParam || '60', 10), 1), 365);
    const limit = Math.min(Math.max(parseInt(limitParam || '30', 10), 1), 100);

    await connectDB();

    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);

    const logs = await DailyLog.find(
      {
        userId,
        date: { $gte: sinceStr },
        'meals.0': { $exists: true },
      },
      { date: 1, meals: 1 }
    )
      .sort({ date: 1 })
      .lean();

    type MealLike = {
      name?: string;
    };

    const foodMap = new Map<
      string,
      { name: string; count: number; lastDate: string }
    >();

    for (const log of logs as { date: string; meals?: MealLike[] }[]) {
      const logDate = log.date;
      for (const meal of log.meals || []) {
        const name = (meal.name || '').trim();
        if (!name) continue;
        const key = name.toLowerCase();
        const existing = foodMap.get(key);
        if (!existing) {
          foodMap.set(key, { name, count: 1, lastDate: logDate });
        } else {
          existing.count += 1;
          if (logDate > existing.lastDate) {
            existing.lastDate = logDate;
          }
        }
      }
    }

    const recentFoods = Array.from(foodMap.values())
      .sort((a, b) => (b.lastDate > a.lastDate ? 1 : -1))
      .slice(0, limit);

    return maskedResponse({ recentFoods });
  } catch (err) {
    console.error('[Recent Foods GET Error]:', err);
    return errorResponse('Failed to fetch recent foods', 500);
  }
}

