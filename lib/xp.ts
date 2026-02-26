// ============================================
// XP System - Per-Day Entry-Based XP
// ============================================
//
// XP is awarded from *totals per calendar day* (DailyLog), not per-entry,
// to avoid farming XP by splitting data into many tiny logs.
// Each day is capped at 50 XP. XP is monotonic: it never goes down.
//
// This module is intentionally self-contained so API routes can simply call
// `awardDailyXp(userId, date)` after mutating a DailyLog.

import type { IDailyLog, UserTargets } from '@/types';
import DailyLog from '@/models/DailyLog';
import User from '@/models/User';

const DAILY_XP_CAP = 50;

function clampDaily(xp: number): number {
  if (Number.isNaN(xp) || !Number.isFinite(xp)) return 0;
  return Math.min(DAILY_XP_CAP, Math.max(0, Math.round(xp)));
}

/**
 * Compute potential XP for a given date from the day's totals and targets.
 * This uses broad, forgiving ranges so that logging consistently feels rewarded.
 */
export function computeDailyXp(log: IDailyLog, targets: UserTargets): number {
  const mealsCount = log.meals?.length ?? 0;
  // Encourage regular meals: up to 4 meals -> 8 XP.
  let xpMeals = Math.min(8, mealsCount * 2);

  // Hydration: progress towards target + bonus when target hit.
  const waterTarget = targets.dailyWater || 0;
  let xpWater = 0;
  if (waterTarget > 0) {
    const ratio = Math.min(1, (log.waterIntake || 0) / waterTarget);
    xpWater = Math.round(ratio * 10);
    if (log.waterIntake >= waterTarget) xpWater += 5;
    xpWater = Math.min(15, xpWater);
  }

  // Workouts: based on calories burned vs target.
  const workoutTargetBurn = targets.dailyCalorieBurn || 0;
  let xpWorkout = 0;
  if (workoutTargetBurn > 0) {
    const burned = log.caloriesBurned || 0;
    const ratio = Math.min(1, burned / workoutTargetBurn);
    xpWorkout = Math.round(ratio * 15);
    if (burned >= workoutTargetBurn) xpWorkout += 5;
    xpWorkout = Math.min(20, xpWorkout);
  } else if ((log.workouts?.length ?? 0) > 0) {
    // Fallback when target is unset: small reward per workout.
    xpWorkout = Math.min(20, (log.workouts.length || 0) * 4);
  }

  // Sleep: reward logging plus hitting target hours.
  let xpSleep = 0;
  const sleepTarget = targets.sleepHours || 0;
  if (log.sleep && sleepTarget > 0) {
    xpSleep += 4; // logged at all
    const dur = log.sleep.duration || 0;
    if (dur > 0) {
      const ratio = Math.min(1, dur / sleepTarget);
      xpSleep += Math.round(ratio * 6);
    }
    xpSleep = Math.min(10, xpSleep);
  }

  // Weight logging: small daily bonus when present.
  const xpWeight = typeof log.weight === 'number' ? 3 : 0;

  // Calories within a healthy band around target.
  let xpCaloriesSuccess = 0;
  if (targets.dailyCalories && targets.dailyCalories > 0) {
    const lower = targets.dailyCalories * 0.85;
    const upper = targets.dailyCalories * 1.15;
    if (log.totalCalories >= lower && log.totalCalories <= upper) {
      xpCaloriesSuccess = 5;
    }
  }

  // Perfect day bonus when all major habits meet goal.
  const waterGoalMet = waterTarget > 0 && log.waterIntake >= waterTarget;
  const workoutGoalMet =
    workoutTargetBurn > 0 && (log.caloriesBurned || 0) >= workoutTargetBurn;
  const sleepGoalMet =
    sleepTarget > 0 && !!log.sleep && log.sleep.duration >= sleepTarget;
  const weightLogged = typeof log.weight === 'number';
  const perfectDay =
    waterGoalMet && workoutGoalMet && sleepGoalMet && weightLogged && xpCaloriesSuccess > 0;

  const xpPerfect = perfectDay ? 10 : 0;

  const sum =
    xpMeals + xpWater + xpWorkout + xpSleep + xpWeight + xpCaloriesSuccess + xpPerfect;

  return clampDaily(sum);
}

/**
 * Award XP for a given user/date based on the latest DailyLog + targets.
 * - Reads the existing xpAwarded for that date.
 * - Computes the new potential XP (capped).
 * - Adds only the positive delta to User.achievements.xpTotal.
 */
export async function awardDailyXp(userId: string, date: string): Promise<{
  delta: number;
  xpTotal: number;
  xpForDay: number;
}> {
  const [userDoc, log] = await Promise.all([
    User.findById(userId)
      .select({ targets: 1, achievements: 1 })
      .lean<{ targets: UserTargets; achievements?: { xpTotal?: number } } | null>(),
    DailyLog.findOne({ userId, date }).lean<(IDailyLog & { xpAwarded?: number }) | null>(),
  ]);

  if (!userDoc || !log) {
    return {
      delta: 0,
      xpTotal: userDoc?.achievements?.xpTotal ?? 0,
      xpForDay: 0,
    };
  }

  const xpForDay = clampDaily(computeDailyXp(log as IDailyLog, userDoc.targets));
  const alreadyAwarded = clampDaily(log.xpAwarded ?? 0);
  const delta = Math.max(0, xpForDay - alreadyAwarded);

  const currentTotal = userDoc.achievements?.xpTotal ?? 0;
  const xpTotal = currentTotal + delta;

  if (delta > 0 || xpForDay !== alreadyAwarded) {
    await Promise.all([
      DailyLog.updateOne(
        { userId, date },
        { $set: { xpAwarded: xpForDay } },
        { upsert: false }
      ).exec(),
      User.updateOne(
        { _id: userId },
        { $set: { 'achievements.xpTotal': xpTotal } },
        { upsert: false }
      ).exec(),
    ]);
  }

  return { delta, xpTotal, xpForDay };
}

