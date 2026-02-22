// ============================================
// /api/water - Water Intake Tracking
// ============================================

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import DailyLog from '@/models/DailyLog';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { getToday } from '@/lib/utils';

export const dynamic = 'force-dynamic';

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

    const log = await DailyLog.findOneAndUpdate(
      { userId, date: logDate },
      {
        $inc: { waterIntake: amount },
        $setOnInsert: { userId, date: logDate },
      },
      { new: true, upsert: true }
    ).lean();

    return maskedResponse({
      date: logDate,
      waterIntake: log.waterIntake,
      added: amount,
    });
  } catch (err) {
    console.error('[Water Error]:', err);
    return errorResponse('Failed to log water', 500);
  }
}
