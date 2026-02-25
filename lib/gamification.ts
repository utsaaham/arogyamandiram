import { startOfDay, subDays, formatISO, isSameDay, getDay, parseISO } from 'date-fns';
import DailyLog from '@/models/DailyLog';
import User from '@/models/User';
import { getBadgeDefinition } from '@/lib/badgeDefinitions';
import type {
  IDailyLog,
  UserAchievements,
  UserBadge,
  UserStreaks,
  UserTargets,
} from '@/types';

export interface StreakSummary extends UserStreaks {}

export interface AchievementsResult {
  achievements: UserAchievements;
  newlyEarnedBadges: UserBadge[];
}

function createEmptyStreaks(): UserStreaks {
  return {
    current: {
      logging: 0,
      calories: 0,
      water: 0,
      workout: 0,
      sleep: 0,
      weight: 0,
    },
    best: {
      logging: 0,
      calories: 0,
      water: 0,
      workout: 0,
      sleep: 0,
      weight: 0,
    },
  };
}

function isCalorieSuccess(log: IDailyLog, targets: UserTargets): boolean {
  if (!targets.dailyCalories || targets.dailyCalories <= 0) return false;
  const lower = targets.dailyCalories * 0.85;
  const upper = targets.dailyCalories * 1.15;
  return log.totalCalories >= lower && log.totalCalories <= upper;
}

function isWaterSuccess(log: IDailyLog, targets: UserTargets): boolean {
  if (!targets.dailyWater || targets.dailyWater <= 0) return false;
  return log.waterIntake >= targets.dailyWater;
}

function isSleepSuccess(log: IDailyLog, targets: UserTargets): boolean {
  if (!targets.sleepHours || targets.sleepHours <= 0) return false;
  if (!log.sleep) return false;
  return log.sleep.duration >= targets.sleepHours;
}

function isWorkoutSuccess(log: IDailyLog, _targets: UserTargets): boolean {
  return Boolean(log.workouts && log.workouts.length > 0);
}

function isWeightSuccess(log: IDailyLog): boolean {
  return typeof log.weight === 'number';
}

function isPerfectDay(log: IDailyLog, targets: UserTargets): boolean {
  return (
    isCalorieSuccess(log, targets) &&
    isWaterSuccess(log, targets) &&
    isSleepSuccess(log, targets) &&
    isWorkoutSuccess(log, targets) &&
    isWeightSuccess(log)
  );
}

/** Parse "HH:mm" to minutes since midnight; returns -1 if invalid. */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
}

/** True if time is before 8:00 AM (e.g. "07:30" -> true). */
function isBefore8AM(time: string): boolean {
  return timeToMinutes(time) >= 0 && timeToMinutes(time) < 8 * 60;
}

/** True if time is at or after midnight (00:00) or in early hours (e.g. "00:30", "01:00"). */
function isAfterMidnight(time: string): boolean {
  const mins = timeToMinutes(time);
  return mins >= 0 && (mins < 6 * 60); // 00:00–05:59 = after midnight
}

export async function calculateStreaks(
  userId: string,
  targets: UserTargets,
  daysBack: number = 60
): Promise<UserStreaks> {
  const today = startOfDay(new Date());
  const fromDate = subDays(today, daysBack);

  const logs = await DailyLog.find({
    userId,
    date: {
      $gte: formatISO(fromDate, { representation: 'date' }),
      $lte: formatISO(today, { representation: 'date' }),
    },
  })
    .sort({ date: 1 })
    .lean<IDailyLog[]>();

  if (!logs.length) {
    return createEmptyStreaks();
  }

  const streaks = createEmptyStreaks();
  const byDate = new Map<string, IDailyLog>();
  for (const log of logs) {
    byDate.set(log.date, log);
  }

  let currentDate = today;
  let keepLogging = true;
  let keepCalories = true;
  let keepWater = true;
  let keepWorkout = true;
  let keepSleep = true;
  let keepWeight = true;

  while (keepLogging || keepCalories || keepWater || keepWorkout || keepSleep || keepWeight) {
    const dateKey = formatISO(currentDate, { representation: 'date' });
    const log = byDate.get(dateKey);

    if (!log) break;

    const caloriesSuccess = isCalorieSuccess(log, targets);
    const waterSuccess = isWaterSuccess(log, targets);
    const sleepSuccess = isSleepSuccess(log, targets);
    const workoutSuccess = isWorkoutSuccess(log, targets);
    const weightSuccess = isWeightSuccess(log);

    const healthySuccess =
      caloriesSuccess || waterSuccess || sleepSuccess || workoutSuccess || weightSuccess;

    if (keepLogging && healthySuccess) streaks.current.logging += 1;
    else keepLogging = false;

    if (keepCalories && caloriesSuccess) streaks.current.calories += 1;
    else keepCalories = false;

    if (keepWater && waterSuccess) streaks.current.water += 1;
    else keepWater = false;

    if (keepWorkout && workoutSuccess) streaks.current.workout += 1;
    else keepWorkout = false;

    if (keepSleep && sleepSuccess) streaks.current.sleep += 1;
    else keepSleep = false;

    if (keepWeight && weightSuccess) streaks.current.weight += 1;
    else keepWeight = false;

    currentDate = subDays(currentDate, 1);
    if (!isSameDay(currentDate, fromDate) && currentDate < fromDate) break;
  }

  streaks.best.logging = Math.max(streaks.best.logging, streaks.current.logging);
  streaks.best.calories = Math.max(streaks.best.calories, streaks.current.calories);
  streaks.best.water = Math.max(streaks.best.water, streaks.current.water);
  streaks.best.workout = Math.max(streaks.best.workout, streaks.current.workout);
  streaks.best.sleep = Math.max(streaks.best.sleep, streaks.current.sleep);
  streaks.best.weight = Math.max(streaks.best.weight, streaks.current.weight);

  return streaks;
}

/** Fetch logs for aggregates and challenge checks (e.g. last 400 days). */
async function getLogsForBadges(userId: string, daysBack: number = 400): Promise<IDailyLog[]> {
  const today = startOfDay(new Date());
  const fromDate = subDays(today, daysBack);
  return DailyLog.find({
    userId,
    date: {
      $gte: formatISO(fromDate, { representation: 'date' }),
      $lte: formatISO(today, { representation: 'date' }),
    },
  })
    .sort({ date: 1 })
    .lean<IDailyLog[]>();
}

function awardBadge(
  badgeId: string,
  existingIds: Set<string>,
  newBadges: UserBadge[],
  nowIso: string
): void {
  if (existingIds.has(badgeId)) return;
  const def = getBadgeDefinition(badgeId);
  if (!def) return;
  const badge: UserBadge = {
    id: def.id,
    name: def.name,
    description: def.description,
    icon: def.icon,
    category: def.category,
    earnedAt: nowIso,
  };
  newBadges.push(badge);
  existingIds.add(badgeId);
}

export async function calculateAchievements(userId: string): Promise<AchievementsResult> {
  const user = await User.findById(userId).lean();
  if (!user) {
    throw new Error('User not found');
  }

  const existingAchievements: UserAchievements = user.achievements ?? {
    badges: [],
    streaks: createEmptyStreaks(),
  };

  const existingBadgeIds = new Set(existingAchievements.badges.map((b) => b.id));
  const newBadges: UserBadge[] = [];
  const nowIso = new Date().toISOString();
  const targets = user.targets;

  const [streaks, logs] = await Promise.all([
    calculateStreaks(userId, targets),
    getLogsForBadges(userId),
  ]);

  const byDate = new Map<string, IDailyLog>();
  for (const log of logs) {
    byDate.set(log.date, log);
  }

  // ----- Aggregates -----
  let totalMeals = 0;
  let totalWorkouts = 0;
  let totalCaloriesBurned = 0;
  let sleepEntryCount = 0;
  let weightEntryCount = 0;
  let hasFirstMeal = false;
  let hasFirstWater = false;
  let hasFirstWorkout = false;
  let hasFirstWeight = false;
  let hasFirstSleep = false;
  let hasPerfectDay = false;
  let hasEarlyBird = false;
  let hasNightOwl = false;

  for (const log of logs) {
    totalMeals += log.meals?.length ?? 0;
    totalWorkouts += (log.workouts?.length ?? 0);
    totalCaloriesBurned += log.caloriesBurned ?? 0;
    if (log.sleep) sleepEntryCount += 1;
    if (typeof log.weight === 'number') weightEntryCount += 1;

    if ((log.meals?.length ?? 0) > 0) hasFirstMeal = true;
    if ((log.waterIntake ?? 0) > 0) hasFirstWater = true;
    if ((log.workouts?.length ?? 0) > 0) hasFirstWorkout = true;
    if (typeof log.weight === 'number') hasFirstWeight = true;
    if (log.sleep) hasFirstSleep = true;

    if (isPerfectDay(log, targets)) hasPerfectDay = true;

    for (const meal of log.meals ?? []) {
      if (meal.time && isBefore8AM(meal.time)) hasEarlyBird = true;
    }
    if (log.sleep?.bedtime && isAfterMidnight(log.sleep.bedtime)) hasNightOwl = true;
    if (log.sleep?.wakeTime && isAfterMidnight(log.sleep.wakeTime)) hasNightOwl = true;
  }

  // ----- First-time -----
  if (hasFirstMeal) awardBadge('first_meal', existingBadgeIds, newBadges, nowIso);
  if (hasFirstWater) awardBadge('first_water', existingBadgeIds, newBadges, nowIso);
  if (hasFirstWorkout) awardBadge('first_workout', existingBadgeIds, newBadges, nowIso);
  if (hasFirstWeight) awardBadge('first_weight', existingBadgeIds, newBadges, nowIso);
  if (hasFirstSleep) awardBadge('first_sleep', existingBadgeIds, newBadges, nowIso);
  if (hasPerfectDay) awardBadge('first_perfect_day', existingBadgeIds, newBadges, nowIso);

  // ----- Logging streak (any) -----
  const loggingThresholds = [3, 7, 14, 30, 50, 100];
  const loggingBadgeIds = ['streak_any_3', 'streak_any_7', 'streak_any_14', 'streak_any_30', 'streak_any_50', 'streak_any_100'];
  for (let i = 0; i < loggingThresholds.length; i++) {
    if (streaks.current.logging >= loggingThresholds[i]) {
      awardBadge(loggingBadgeIds[i], existingBadgeIds, newBadges, nowIso);
    }
  }

  // ----- Per-habit streaks -----
  const habitKeys = ['water', 'calories', 'workout', 'sleep', 'weight'] as const;
  const thresholds = [7, 14, 30, 50, 100];
  for (const key of habitKeys) {
    const current = streaks.current[key];
    const prefix = `streak_${key}_`;
    for (const t of thresholds) {
      if (current >= t) awardBadge(`${prefix}${t}`, existingBadgeIds, newBadges, nowIso);
    }
  }

  // ----- Milestones -----
  if (totalMeals >= 50) awardBadge('milestone_meals_50', existingBadgeIds, newBadges, nowIso);
  if (totalMeals >= 100) awardBadge('milestone_meals_100', existingBadgeIds, newBadges, nowIso);
  if (totalWorkouts >= 50) awardBadge('milestone_workouts_50', existingBadgeIds, newBadges, nowIso);
  if (totalWorkouts >= 100) awardBadge('milestone_workouts_100', existingBadgeIds, newBadges, nowIso);
  if (totalCaloriesBurned >= 10_000) awardBadge('milestone_calories_burned_10k', existingBadgeIds, newBadges, nowIso);
  if (sleepEntryCount >= 50) awardBadge('milestone_sleep_50', existingBadgeIds, newBadges, nowIso);
  if (weightEntryCount >= 30) awardBadge('milestone_weight_30', existingBadgeIds, newBadges, nowIso);

  // ----- Challenges -----
  if (streaks.current.water >= 7) awardBadge('challenge_hydration_week', existingBadgeIds, newBadges, nowIso);
  if (streaks.current.logging >= 30) awardBadge('challenge_no_skip_month', existingBadgeIds, newBadges, nowIso);
  if (hasEarlyBird) awardBadge('challenge_early_bird', existingBadgeIds, newBadges, nowIso);
  if (hasNightOwl) awardBadge('challenge_night_owl', existingBadgeIds, newBadges, nowIso);

  // Perfect week = 7 consecutive calendar days each with all five habits successful
  let perfectWeekFound = false;
  for (const dateKey of byDate.keys()) {
    const start = parseISO(dateKey);
    let allPerfect = true;
    for (let offset = 0; offset < 7; offset++) {
      const d = subDays(start, offset);
      const key = formatISO(d, { representation: 'date' });
      const log = byDate.get(key);
      if (!log || !isPerfectDay(log, targets)) {
        allPerfect = false;
        break;
      }
    }
    if (allPerfect) {
      perfectWeekFound = true;
      break;
    }
  }
  if (perfectWeekFound) awardBadge('challenge_perfect_week', existingBadgeIds, newBadges, nowIso);

  // Weekend warrior: 2 consecutive calendar days that are weekend (Sat or Sun), both with workout
  const weekendWarriorFound = (() => {
    for (const dateKey of byDate.keys()) {
      const d1 = parseISO(dateKey);
      const d2 = subDays(d1, 1);
      const day1 = getDay(d1); // 0 = Sun, 6 = Sat
      const day2 = getDay(d2);
      const weekend1 = day1 === 0 || day1 === 6;
      const weekend2 = day2 === 0 || day2 === 6;
      if (!weekend1 || !weekend2) continue;
      const key2 = formatISO(d2, { representation: 'date' });
      const log1 = byDate.get(dateKey);
      const log2 = byDate.get(key2);
      if (log1 && log2 && isWorkoutSuccess(log1, targets) && isWorkoutSuccess(log2, targets)) {
        return true;
      }
    }
    return false;
  })();
  if (weekendWarriorFound) awardBadge('challenge_weekend_warrior', existingBadgeIds, newBadges, nowIso);

  const mergedBadges = [...existingAchievements.badges, ...newBadges];
  const mergedAchievements: UserAchievements = {
    badges: mergedBadges,
    streaks,
  };

  await User.findByIdAndUpdate(userId, { achievements: mergedAchievements }).exec();

  return {
    achievements: mergedAchievements,
    newlyEarnedBadges: newBadges,
  };
}
