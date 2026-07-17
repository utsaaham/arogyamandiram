// ============================================
// deriveFitnessLevel - Auto-detect fitness level from workout history
// ============================================
// Called by the nightly cron and optionally after each workout log.
// Looks at the last 14 days of workout data and classifies the user.

import connectDB from '@/lib/db';
import DailyLog from '@/models/DailyLog';
import User from '@/models/User';
import type { Types } from 'mongoose';
import type { FitnessLevel } from '@/types';

/**
 * Derives fitness level from the last 14 days of workout logs.
 * Rules:
 *   - < 2 workouts/week  → beginner
 *   - 2–4 workouts/week  → intermediate
 *   - 5+ workouts/week   → advanced
 *   - downgrade one level if avg workout duration < 20 min
 *
 * Also updates User.profile.fitnessLevelDerived in the database.
 */
export async function deriveFitnessLevel(
  userId: Types.ObjectId | string
): Promise<FitnessLevel> {
  await connectDB();

  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 13); // last 14 days inclusive
  const startDate = cutoff.toISOString().split('T')[0];

  const logs = await DailyLog.find({
    userId,
    date: { $gte: startDate },
    'workouts.0': { $exists: true }, // only days with at least one workout
  })
    .select('date workouts')
    .lean();

  const workoutDays = logs.length;
  const workoutsPerWeek = workoutDays / 2; // 14 days = 2 weeks

  // Calculate average workout duration across all workout entries
  let totalDuration = 0;
  let totalWorkouts = 0;
  for (const log of logs) {
    const workouts = log.workouts as { duration?: number }[] | undefined;
    if (Array.isArray(workouts)) {
      for (const w of workouts) {
        if (typeof w.duration === 'number' && w.duration > 0) {
          totalDuration += w.duration;
          totalWorkouts++;
        }
      }
    }
  }
  const avgDuration = totalWorkouts > 0 ? totalDuration / totalWorkouts : 0;

  let level: FitnessLevel;
  if (workoutsPerWeek >= 5) {
    level = 'advanced';
  } else if (workoutsPerWeek >= 2) {
    level = 'intermediate';
  } else {
    level = 'beginner';
  }

  // Downgrade one level if average session is very short (< 20 min)
  if (avgDuration > 0 && avgDuration < 20) {
    if (level === 'advanced') level = 'intermediate';
    else if (level === 'intermediate') level = 'beginner';
  }

  // Persist to user profile (fire and forget - don't block cron)
  await User.updateOne(
    { _id: userId },
    { $set: { 'profile.fitnessLevelDerived': level } }
  );

  return level;
}
