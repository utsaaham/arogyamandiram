// ============================================
// /api/workouts - Workout Tracking
// ============================================

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import DailyLog from '@/models/DailyLog';
import { maskedResponse, errorResponse, stripSensitive } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { getToday, toLocalDateString } from '@/lib/utils';
import { awardDailyXp } from '@/lib/xp';

export const dynamic = 'force-dynamic';

function normalizeExerciseName(name: unknown): string {
  return typeof name === 'string' ? name.trim().toLowerCase() : '';
}

function computeWorkoutScore(workout: {
  weight?: unknown;
  reps?: unknown;
  duration?: unknown;
}): number {
  const weight = Number(workout.weight) || 0;
  const reps = Number(workout.reps) || 0;
  const duration = Number(workout.duration) || 0;

  // Prefer weight-based PRs, then reps, then duration
  if (weight > 0) return weight;
  if (reps > 0) return reps;
  if (duration > 0) return duration;
  return 0;
}

function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toLocalDateString(d);
}

// GET /api/workouts?days=N - Fetch workout history for charting
export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const { searchParams } = new URL(req.url);
    const days = Math.min(Math.max(parseInt(searchParams.get('days') || '7', 10), 1), 90);

    await connectDB();

    const startDate = getDateDaysAgo(days);
    const logs = await DailyLog.find({
      userId,
      date: { $gte: startDate, $lte: getToday() },
    })
      .sort({ date: 1 })
      .select('date workouts caloriesBurned')
      .lean();

    interface WorkoutDoc {
      caloriesBurned?: number;
      duration?: number;
      category?: string;
    }

    const history = logs.map((l) => {
      const ws = (l.workouts || []) as WorkoutDoc[];
      return {
        date: l.date,
        caloriesBurned: ws.reduce((s, w) => s + (Number(w.caloriesBurned) || 0), 0),
        duration: ws.reduce((s, w) => s + (Number(w.duration) || 0), 0),
        count: ws.length,
      };
    });

    return maskedResponse({ history });
  } catch (err) {
    console.error('[Workout GET Error]:', err);
    return errorResponse('Failed to fetch workout history', 500);
  }
}

// POST /api/workouts - Add a workout
export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const { date, workout } = await req.json();
    const logDate = date || getToday();

    const hasDuration = typeof workout?.duration === 'number' && workout.duration > 0;
    const hasReps = typeof workout?.reps === 'number' && workout.reps > 0;
    if (!workout?.exercise || (!hasDuration && !hasReps)) {
      return errorResponse('Exercise name and either duration (min) or reps (number) are required', 400);
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

    const result = log.toObject() as {
      workouts?: { _id?: unknown; exercise?: unknown; weight?: unknown; reps?: unknown; duration?: unknown }[];
    };

    let isPr = false;

    if (result.workouts && result.workouts.length > 0) {
      const newWorkoutDoc = result.workouts[result.workouts.length - 1];
      const exerciseName = normalizeExerciseName(newWorkoutDoc.exercise);

      if (exerciseName) {
        const newWorkoutId = String(newWorkoutDoc._id ?? '');
        const logs = await DailyLog.find(
          {
            userId,
            'workouts.exercise': { $exists: true },
          },
          { date: 1, workouts: 1 }
        ).lean();

        let newScore = 0;
        let previousBest = 0;

        for (const l of logs as {
          workouts?: { _id?: unknown; exercise?: unknown; weight?: unknown; reps?: unknown; duration?: unknown }[];
        }[]) {
          for (const w of l.workouts || []) {
            if (normalizeExerciseName(w.exercise) !== exerciseName) continue;
            const score = computeWorkoutScore(w);
            if (!score) continue;

            if (String(w._id ?? '') === newWorkoutId) {
              newScore = Math.max(newScore, score);
            } else {
              previousBest = Math.max(previousBest, score);
            }
          }
        }

        if (newScore > 0 && newScore > previousBest) {
          isPr = true;
        }
      }
    }

    const safe = stripSensitive(result as unknown as Record<string, unknown>);

    await awardDailyXp(String(userId), logDate);

    return maskedResponse(
      { ...(safe as Record<string, unknown>), isPr },
      {
        message: isPr ? 'Workout added (new PR!)' : 'Workout added',
      }
    );
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

    await awardDailyXp(String(userId), logDate);

    return maskedResponse(stripSensitive(result as unknown as Record<string, unknown>), {
      message: 'Workout removed',
    });
  } catch (err) {
    console.error('[Workout Delete Error]:', err);
    return errorResponse('Failed to remove workout', 500);
  }
}
