// ============================================
// /api/water - Water Intake Tracking
// ============================================

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import DailyLog from '@/models/DailyLog';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { getToday, toLocalDateString } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// GET /api/water?days=30 - Get water intake history
export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const { searchParams } = new URL(req.url);
    const days = Math.min(parseInt(searchParams.get('days') || '30', 10) || 30, 365);

    await connectDB();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startStr = toLocalDateString(startDate);

    const logs = await DailyLog.find(
      {
        userId,
        date: { $gte: startStr },
        waterIntake: { $exists: true, $gt: 0 },
      },
      { date: 1, waterIntake: 1, _id: 0 }
    )
      .sort({ date: 1 })
      .lean();

    return maskedResponse({
      history: logs.map((log) => ({
        date: (log as { date: string }).date,
        waterIntake: Number((log as { waterIntake?: number }).waterIntake) || 0,
      })),
      count: logs.length,
      period: `${days} days`,
    });
  } catch (err) {
    console.error('[Water GET Error]:', err);
    return errorResponse('Failed to fetch water history', 500);
  }
}

// POST /api/water - Add water intake
export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const { date, amount } = await req.json();
    const logDate = date || getToday();

    if (!amount || amount <= 0) {
      return errorResponse('Water amount must be positive (in ml)', 400);
    }

    await connectDB();

    const now = new Date();
    const time = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const log = await DailyLog.findOneAndUpdate(
      { userId, date: logDate },
      {
        $inc: { waterIntake: amount },
        $push: { waterEntries: { amount, time } },
        $setOnInsert: { userId, date: logDate },
      },
      { new: true, upsert: true, strict: false }
    ).lean();

    return maskedResponse({
      date: logDate,
      waterIntake: log.waterIntake,
      waterEntries: (log.waterEntries ?? []).map((e: { amount: number; time: string }) => ({
        amount: e.amount,
        time: e.time,
      })),
      added: amount,
    });
  } catch (err) {
    console.error('[Water Error]:', err);
    return errorResponse('Failed to log water', 500);
  }
}
