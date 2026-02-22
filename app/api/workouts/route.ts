// ============================================
// /api/workouts - Workout Tracking
// ============================================

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import DailyLog from '@/models/DailyLog';
import { maskedResponse, errorResponse, stripSensitive } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { getToday } from '@/lib/utils';

// POST /api/workouts - Add a workout
export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const { date, workout } = await req.json();
    const logDate = date || getToday();

    if (!workout || !workout.exercise || !workout.duration) {
      return errorResponse('Exercise name and duration are required', 400);
    }

    await connectDB();

    const log = await DailyLog.findOneAndUpdate(
      { userId, date: logDate },
      {
        $push: { workouts: workout },
        $setOnInsert: { userId, date: logDate },
      },
      { new: true, upsert: true, runValidators: true }
    );

    // Trigger recalculation
    await log.save();

    const result = log.toObject();
    return maskedResponse(stripSensitive(result as unknown as Record<string, unknown>), {
      message: 'Workout added',
    });
  } catch (err) {
    console.error('[Workout Add Error]:', err);
    return errorResponse('Failed to add workout', 500);
  }
}

// DELETE /api/workouts - Remove a workout
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const { date, workoutId } = await req.json();
    const logDate = date || getToday();

    if (!workoutId) {
      return errorResponse('Workout ID is required', 400);
    }

    await connectDB();

    const log = await DailyLog.findOneAndUpdate(
      { userId, date: logDate },
      { $pull: { workouts: { _id: workoutId } } },
      { new: true }
    );

    if (!log) return errorResponse('Daily log not found', 404);

    await log.save();

    const result = log.toObject();
    return maskedResponse(stripSensitive(result as unknown as Record<string, unknown>), {
      message: 'Workout removed',
    });
  } catch (err) {
    console.error('[Workout Delete Error]:', err);
    return errorResponse('Failed to remove workout', 500);
  }
}
