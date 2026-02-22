// ============================================
// /api/daily-log/meal - Add/Remove Meals
// ============================================

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import DailyLog from '@/models/DailyLog';
import { maskedResponse, errorResponse, stripSensitive } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { getToday } from '@/lib/utils';

// POST /api/daily-log/meal - Add a meal
export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const { date, meal } = await req.json();
    const logDate = date || getToday();

    if (!meal || !meal.name || meal.calories === undefined) {
      return errorResponse('Meal name and calories are required', 400);
    }

    await connectDB();

    const log = await DailyLog.findOneAndUpdate(
      { userId, date: logDate },
      {
        $push: { meals: meal },
        $setOnInsert: { userId, date: logDate },
      },
      { new: true, upsert: true, runValidators: true }
    );

    // Trigger recalculation
    await log.save();

    const result = log.toObject();
    return maskedResponse(stripSensitive(result as unknown as Record<string, unknown>), {
      message: 'Meal added',
    });
  } catch (err) {
    console.error('[Meal Add Error]:', err);
    return errorResponse('Failed to add meal', 500);
  }
}

// DELETE /api/daily-log/meal - Remove a meal
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const { date, mealId } = await req.json();
    const logDate = date || getToday();

    if (!mealId) {
      return errorResponse('Meal ID is required', 400);
    }

    await connectDB();

    const log = await DailyLog.findOneAndUpdate(
      { userId, date: logDate },
      { $pull: { meals: { _id: mealId } } },
      { new: true }
    );

    if (!log) return errorResponse('Daily log not found', 404);

    // Trigger recalculation
    await log.save();

    const result = log.toObject();
    return maskedResponse(stripSensitive(result as unknown as Record<string, unknown>), {
      message: 'Meal removed',
    });
  } catch (err) {
    console.error('[Meal Delete Error]:', err);
    return errorResponse('Failed to remove meal', 500);
  }
}
