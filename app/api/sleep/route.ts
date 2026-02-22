// ============================================
// /api/sleep - Sleep Tracking
// ============================================

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import DailyLog from '@/models/DailyLog';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { getToday } from '@/lib/utils';
import type { SleepQuality } from '@/types';

export const dynamic = 'force-dynamic';

function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

// POST /api/sleep - Log or update sleep for a date
export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const body = await req.json();
    const { date, bedtime, wakeTime, duration, quality, notes } = body;
    const logDate = date || getToday();

    if (!bedtime || !wakeTime) {
      return errorResponse('Bedtime and wake time are required', 400);
    }
    const dur = typeof duration === 'number' ? duration : parseFloat(duration);
    if (Number.isNaN(dur) || dur < 0 || dur > 24) {
      return errorResponse('Duration must be between 0 and 24 hours', 400);
    }
    const q = typeof quality === 'number' ? quality : parseInt(quality, 10);
    if (![1, 2, 3, 4, 5].includes(q)) {
      return errorResponse('Quality must be 1–5', 400);
    }

    await connectDB();

    const sleepEntry = {
      bedtime: String(bedtime),
      wakeTime: String(wakeTime),
      duration: dur,
      quality: q as SleepQuality,
      notes: notes ? String(notes).slice(0, 500) : '',
    };

    const log = await DailyLog.findOneAndUpdate(
      { userId, date: logDate },
      {
        $set: { sleep: sleepEntry },
        $setOnInsert: { userId, date: logDate },
      },
      { new: true, upsert: true }
    ).lean();

    return maskedResponse({
      date: logDate,
      sleep: log.sleep,
    });
  } catch (err) {
    console.error('[Sleep POST Error]:', err);
    return errorResponse('Failed to log sleep', 500);
  }
}

// GET /api/sleep - Fetch sleep history for charting
export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const { searchParams } = new URL(req.url);
    const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30', 10), 1), 90);

    await connectDB();

    const startDate = getDateDaysAgo(days);
    const logs = await DailyLog.find({
      userId,
      date: { $gte: startDate, $lte: getToday() },
      'sleep.duration': { $exists: true, $ne: null },
    })
      .sort({ date: 1 })
      .select('date sleep')
      .lean();

    const history = logs.map((l) => ({
      date: l.date,
      sleep: l.sleep,
    }));

    return maskedResponse({ history });
  } catch (err) {
    console.error('[Sleep GET Error]:', err);
    return errorResponse('Failed to fetch sleep history', 500);
  }
}
