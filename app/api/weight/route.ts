// ============================================
// /api/weight - Weight Tracking
// ============================================

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import DailyLog from '@/models/DailyLog';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { getToday, toLocalDateString } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// GET /api/weight?days=30 - Get weight history
export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');

    await connectDB();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startStr = toLocalDateString(startDate);

    const logs = await DailyLog.find(
      {
        userId,
        date: { $gte: startStr },
        weight: { $exists: true, $ne: null },
      },
      { date: 1, weight: 1, _id: 0 }
    )
      .sort({ date: 1 })
      .lean();

    return maskedResponse({
      history: logs,
      count: logs.length,
      period: `${days} days`,
    });
  } catch (err) {
    console.error('[Weight GET Error]:', err);
    return errorResponse('Failed to fetch weight history', 500);
  }
}

// POST /api/weight - Log today's weight
export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const { date, weight } = await req.json();
    const logDate = date || getToday();

    if (!weight || weight <= 0) {
      return errorResponse('Weight must be a positive number', 400);
    }

    await connectDB();

    const log = await DailyLog.findOneAndUpdate(
      { userId, date: logDate },
      {
        $set: { weight },
        $setOnInsert: { userId, date: logDate },
      },
      { new: true, upsert: true }
    ).lean();

    return maskedResponse({
      date: logDate,
      weight: log.weight,
    });
  } catch (err) {
    console.error('[Weight POST Error]:', err);
    return errorResponse('Failed to log weight', 500);
  }
}
