// ============================================
// /api/workouts - Workout Tracking
// ============================================

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import DailyLog from '@/models/DailyLog';
import { maskedResponse, errorResponse, stripSensitive } from '@/lib/apiMask';
import { getAuthUserId, getAuthUserIdWithBypass, isUserId } from '@/lib/session';
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
    const userId = await getAuthUserIdWithBypass(req);
    if (!isUserId(userId)) return userId;

    const { date, workout } = await req.json();
    const logDate = date || getToday();

    const hasDuration = typeof workout?.duration === 'number' && workout.duration > 0;
    const hasReps = typeof workout?.reps === 'number' && workout.reps > 0;
    if (!workout?.exercise || (!hasDuration && !hasReps)) {
      return errorResponse('Exercise name and either duration (min) or reps (number) are required', 400);
    }

    // Whitelist persisted fields so client cannot inject arbitrary keys.
    const persisted: Record<string, unknown> = {
      exercise: String(workout.exercise),
      category: workout.category,
      duration: workout.duration,
      caloriesBurned: workout.caloriesBurned,
      sets: workout.sets,
      reps: workout.reps,
      weight: workout.weight,
      notes: workout.notes,
      source: workout.source,
    };
    if (typeof workout.externalId === 'string' && workout.externalId.trim()) {
      persisted.externalId = workout.externalId.trim();
    }
    if (typeof workout.startedAt === 'string' && workout.startedAt.trim()) {
      persisted.startedAt = workout.startedAt.trim();
    }
    if (typeof workout.endedAt === 'string' && workout.endedAt.trim()) {
      persisted.endedAt = workout.endedAt.trim();
    }
    if (typeof workout.planExerciseName === 'string' && workout.planExerciseName.trim()) {
      persisted.planExerciseName = workout.planExerciseName.trim();
    }

    await connectDB();

    // Older iOS builds posted a HealthKit snapshot and then appended each of
    // those workouts through this route. Keep that legacy path idempotent so
    // it cannot duplicate a device workout already reconciled by the snapshot.
    if (workout.source === 'device') {
      const existing = await DailyLog.findOne({ userId, date: logDate }).lean();
      type ExistingDeviceWorkout = {
        exercise?: unknown;
        duration?: unknown;
        caloriesBurned?: unknown;
        source?: unknown;
        externalId?: unknown;
      };
      const existingWorkouts = (existing?.workouts ?? []) as ExistingDeviceWorkout[];
      const incomingExternalId = typeof workout.externalId === 'string' ? workout.externalId.trim() : '';
      const duplicate = existingWorkouts.some((entry) => {
        if (entry.source !== 'device') return false;
        if (incomingExternalId && entry.externalId === incomingExternalId) return true;
        return normalizeExerciseName(entry.exercise) === normalizeExerciseName(workout.exercise)
          && Number(entry.duration) === Number(workout.duration)
          && Number(entry.caloriesBurned ?? 0) === Number(workout.caloriesBurned ?? 0);
      });

      if (duplicate && existing) {
        const safe = stripSensitive(existing as unknown as Record<string, unknown>);
        return maskedResponse(
          { ...(safe as Record<string, unknown>), isPr: false },
          { message: 'Workout already synced' }
        );
      }
    }

    const log = await DailyLog.findOneAndUpdate(
      { userId, date: logDate },
      {
        $push: { workouts: persisted },
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

// PUT /api/workouts - Update a workout
export async function PUT(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const { date, workoutId, workout: workoutPayload } = await req.json();
    const logDate = date || getToday();

    if (!workoutId) {
      return errorResponse('Workout ID is required', 400);
    }
    if (!workoutPayload?.exercise) {
      return errorResponse('Exercise name is required', 400);
    }

    const duration = Number(workoutPayload.duration);
    const reps = Number(workoutPayload.reps);
    const hasDuration = Number.isFinite(duration) && duration >= 0;
    const hasReps = Number.isFinite(reps) && reps > 0;
    if (!hasDuration && !hasReps) {
      return errorResponse('Either duration (min) or reps is required', 400);
    }

    await connectDB();

    const category = ['cardio', 'strength', 'flexibility', 'core', 'sports', 'other'].includes(workoutPayload.category)
      ? workoutPayload.category
      : 'other';
    const updateFields: Record<string, unknown> = {
      'workouts.$.exercise': String(workoutPayload.exercise).trim(),
      'workouts.$.category': category,
      'workouts.$.duration': Math.max(0, Number(workoutPayload.duration) || 0),
      'workouts.$.caloriesBurned': Math.max(0, Number(workoutPayload.caloriesBurned) || 0),
      'workouts.$.notes': workoutPayload.notes != null ? String(workoutPayload.notes).trim() : '',
    };
    if (workoutPayload.sets != null) updateFields['workouts.$.sets'] = Math.max(0, Math.round(Number(workoutPayload.sets)));
    if (workoutPayload.reps != null) updateFields['workouts.$.reps'] = Math.max(0, Math.round(Number(workoutPayload.reps)));
    if (workoutPayload.weight != null) updateFields['workouts.$.weight'] = Math.max(0, Number(workoutPayload.weight));
    if (typeof workoutPayload.planExerciseName === 'string' && workoutPayload.planExerciseName.trim()) {
      updateFields['workouts.$.planExerciseName'] = workoutPayload.planExerciseName.trim();
    }

    const log = await DailyLog.findOneAndUpdate(
      { userId, date: logDate, 'workouts._id': workoutId },
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!log) {
      return errorResponse('Workout or log not found', 404);
    }

    await log.save();

    const result = log.toObject();
    return maskedResponse(stripSensitive(result as unknown as Record<string, unknown>), {
      message: 'Workout updated',
    });
  } catch (err) {
    console.error('[Workout Update Error]:', err);
    return errorResponse('Failed to update workout', 500);
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
