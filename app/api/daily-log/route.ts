// ============================================
// /api/daily-log - Daily Log CRUD
// ============================================

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import DailyLog from '@/models/DailyLog';
import { maskedResponse, errorResponse, stripSensitive } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { getToday, recalcTotalsFromMeals } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// GET /api/daily-log?date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || getToday();

    await connectDB();

    let log = await DailyLog.findOne({ userId, date }).lean();

    // If no log for this date, return empty template
    if (!log) {
      return maskedResponse({
        date,
        weight: null,
        waterIntake: 0,
        meals: [],
        workouts: [],
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        caloriesBurned: 0,
        notes: '',
        isNew: true,
      });
    }

    // Recalculate totals from meals (meal.calories is already total for logged amount)
    const meals = (log as { meals?: Array<{ calories?: number; protein?: number; carbs?: number; fat?: number }> }).meals ?? [];
    const totals = recalcTotalsFromMeals(meals);
    const logWithRecalc = {
      ...log,
      ...totals,
      caloriesBurned:
        ((log as { workouts?: { caloriesBurned?: number }[] }).workouts ?? []).reduce(
          (s, w) => s + (Number(w?.caloriesBurned) || 0),
          0
        ),
    };

    return maskedResponse(stripSensitive(logWithRecalc as unknown as Record<string, unknown>));
  } catch (err) {
    console.error('[DailyLog GET Error]:', err);
    return errorResponse('Failed to fetch daily log', 500);
  }
}

// POST /api/daily-log - Create or update daily log
export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const body = await req.json();
    const date = body.date || getToday();

    await connectDB();

    // Upsert: create if not exists, update if exists
    const log = await DailyLog.findOneAndUpdate(
      { userId, date },
      {
        $set: {
          userId,
          date,
          ...(body.weight !== undefined && { weight: body.weight }),
          ...(body.waterIntake !== undefined && { waterIntake: body.waterIntake }),
          ...(body.notes !== undefined && { notes: body.notes }),
        },
      },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    return maskedResponse(stripSensitive(log as unknown as Record<string, unknown>));
  } catch (err) {
    console.error('[DailyLog POST Error]:', err);
    return errorResponse('Failed to update daily log', 500);
  }
}
