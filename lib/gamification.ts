import { startOfDay, subDays, formatISO, isSameDay, getDay, parseISO } from 'date-fns';
import DailyLog from '@/models/DailyLog';
import User from '@/models/User';
import { getBadgeDefinition } from '@/lib/badgeDefinitions';
import { computeDailyXp } from '@/lib/xp';
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

/** Default targets when user.targets is missing (e.g. legacy or malformed docs). */
const DEFAULT_TARGETS: UserTargets = {
  dailyCalories: 2000,
  dailyWater: 2500,
  protein: 150,
  carbs: 200,
  fat: 67,
  idealWeight: 70,
  dailyWorkoutMinutes: 30,
  dailyCalorieBurn: 400,
  sleepHours: 8,
};

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
    starts: {},
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

function isWorkoutSuccess(log: IDailyLog, targets: UserTargets): boolean {
  const burn = log.caloriesBurned ?? 0;

  // Use the greater of the personalised workout-burn target and a
  // sensible floor (300 kcal) so streaks feel meaningful even if
  // targets are unset or very low.
  const baseTarget = targets.dailyCalorieBurn && targets.dailyCalorieBurn > 0
    ? targets.dailyCalorieBurn
    : 300;
  const threshold = Math.max(300, baseTarget);

  return burn >= threshold;
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

  // Track the first calendar day included in the *current* streak run
  // for each habit so the UI can say "Streak started Feb 12".
  let startLogging: string | undefined;
  let startCalories: string | undefined;
  let startWater: string | undefined;
  let startWorkout: string | undefined;
  let startSleep: string | undefined;
  let startWeight: string | undefined;

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

    if (keepLogging && healthySuccess) {
      streaks.current.logging += 1;
      startLogging = dateKey;
    } else {
      keepLogging = false;
    }

    if (keepCalories && caloriesSuccess) {
      streaks.current.calories += 1;
      startCalories = dateKey;
    } else {
      keepCalories = false;
    }

    if (keepWater && waterSuccess) {
      streaks.current.water += 1;
      startWater = dateKey;
    } else {
      keepWater = false;
    }

    if (keepWorkout && workoutSuccess) {
      streaks.current.workout += 1;
      startWorkout = dateKey;
    } else {
      keepWorkout = false;
    }

    if (keepSleep && sleepSuccess) {
      streaks.current.sleep += 1;
      startSleep = dateKey;
    } else {
      keepSleep = false;
    }

    if (keepWeight && weightSuccess) {
      streaks.current.weight += 1;
      startWeight = dateKey;
    } else {
      keepWeight = false;
    }

    currentDate = subDays(currentDate, 1);
    if (!isSameDay(currentDate, fromDate) && currentDate < fromDate) break;
  }

  // Best streaks across the entire window (not just the current run)
  let runLogging = 0;
  let runCalories = 0;
  let runWater = 0;
  let runWorkout = 0;
  let runSleep = 0;
  let runWeight = 0;

  for (const log of logs) {
    const caloriesSuccess = isCalorieSuccess(log, targets);
    const waterSuccess = isWaterSuccess(log, targets);
    const sleepSuccess = isSleepSuccess(log, targets);
    const workoutSuccess = isWorkoutSuccess(log, targets);
    const weightSuccess = isWeightSuccess(log);

    const healthySuccess =
      caloriesSuccess || waterSuccess || sleepSuccess || workoutSuccess || weightSuccess;

    runLogging = healthySuccess ? runLogging + 1 : 0;
    runCalories = caloriesSuccess ? runCalories + 1 : 0;
    runWater = waterSuccess ? runWater + 1 : 0;
    runWorkout = workoutSuccess ? runWorkout + 1 : 0;
    runSleep = sleepSuccess ? runSleep + 1 : 0;
    runWeight = weightSuccess ? runWeight + 1 : 0;

    streaks.best.logging = Math.max(streaks.best.logging, runLogging);
    streaks.best.calories = Math.max(streaks.best.calories, runCalories);
    streaks.best.water = Math.max(streaks.best.water, runWater);
    streaks.best.workout = Math.max(streaks.best.workout, runWorkout);
    streaks.best.sleep = Math.max(streaks.best.sleep, runSleep);
    streaks.best.weight = Math.max(streaks.best.weight, runWeight);
  }

  // Attach optional start dates only when the streak is non-zero.
  streaks.starts = {
    logging: streaks.current.logging > 0 ? startLogging : undefined,
    calories: streaks.current.calories > 0 ? startCalories : undefined,
    water: streaks.current.water > 0 ? startWater : undefined,
    workout: streaks.current.workout > 0 ? startWorkout : undefined,
    sleep: streaks.current.sleep > 0 ? startSleep : undefined,
    weight: streaks.current.weight > 0 ? startWeight : undefined,
  };

  return streaks;
}

/** Fetch logs for aggregates and challenge checks (e.g. last several years). */
async function getLogsForBadges(userId: string, daysBack: number = 3650): Promise<IDailyLog[]> {
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
  earnedAtIso: string,
  firstEarnedAtIso?: string
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
    earnedAt: earnedAtIso,
    ...(firstEarnedAtIso ? { firstEarnedAt: firstEarnedAtIso } : {}),
  };
  newBadges.push(badge);
  existingIds.add(badgeId);
}

export async function calculateAchievements(userId: string): Promise<AchievementsResult> {
  const user = await User.findById(userId).lean();
  if (!user) {
    throw new Error('User not found');
  }

  // Normalize so new/legacy users never have undefined.badges or missing targets
  const targets: UserTargets =
    user.targets && typeof user.targets === 'object'
      ? { ...DEFAULT_TARGETS, ...user.targets }
      : DEFAULT_TARGETS;

  const existingAchievements: UserAchievements = {
    badges: Array.isArray(user.achievements?.badges) ? user.achievements.badges : [],
    streaks:
      user.achievements?.streaks &&
      typeof user.achievements.streaks === 'object' &&
      user.achievements.streaks.current &&
      user.achievements.streaks.best
        ? user.achievements.streaks
        : createEmptyStreaks(),
    xpTotal: typeof user.achievements?.xpTotal === 'number' ? user.achievements.xpTotal : 0,
  };

  const existingBadgeIds = new Set(existingAchievements.badges.map((b) => b.id));
  const newBadges: UserBadge[] = [];
  const nowIso = new Date().toISOString();

  const [streaks, logs] = await Promise.all([
    calculateStreaks(userId, targets),
    getLogsForBadges(userId),
  ]);

  const logsList = Array.isArray(logs) ? logs : [];

  // ----- First-earned dates for streak-related badges -----
  type HabitKey = 'water' | 'calories' | 'workout' | 'sleep' | 'weight';
  const streakLoggingThresholds = [3, 7, 14, 30, 50, 100] as const;
  const streakHabitThresholds = [7, 14, 30, 50, 100] as const;

  const firstLogging: Partial<Record<(typeof streakLoggingThresholds)[number], string>> = {};
  const firstHabit: Record<HabitKey, Partial<Record<(typeof streakHabitThresholds)[number], string>>> = {
    water: {},
    calories: {},
    workout: {},
    sleep: {},
    weight: {},
  };

  let runLogging = 0;
  let runCalories = 0;
  let runWater = 0;
  let runWorkout = 0;
  let runSleep = 0;
  let runWeight = 0;

  // Start dates for the current running streak of each type. These let us
  // say \"first earned\" based on the *beginning* of the streak window
  // instead of the day the threshold was finally crossed.
  let runStartLogging: string | undefined;
  let runStartCalories: string | undefined;
  let runStartWater: string | undefined;
  let runStartWorkout: string | undefined;
  let runStartSleep: string | undefined;
  let runStartWeight: string | undefined;

  for (const log of logsList) {
    const caloriesSuccess = isCalorieSuccess(log, targets);
    const waterSuccess = isWaterSuccess(log, targets);
    const sleepSuccess = isSleepSuccess(log, targets);
    const workoutSuccess = isWorkoutSuccess(log, targets);
    const weightSuccess = isWeightSuccess(log);

    const healthySuccess =
      caloriesSuccess || waterSuccess || sleepSuccess || workoutSuccess || weightSuccess;

    // Logging (any healthy success)
    if (healthySuccess) {
      if (runLogging === 0) runStartLogging = log.date;
      runLogging += 1;
    } else {
      runLogging = 0;
      runStartLogging = undefined;
    }

    // Per-habit runs – set start date when entering a new run
    if (caloriesSuccess) {
      if (runCalories === 0) runStartCalories = log.date;
      runCalories += 1;
    } else {
      runCalories = 0;
      runStartCalories = undefined;
    }

    if (waterSuccess) {
      if (runWater === 0) runStartWater = log.date;
      runWater += 1;
    } else {
      runWater = 0;
      runStartWater = undefined;
    }

    if (workoutSuccess) {
      if (runWorkout === 0) runStartWorkout = log.date;
      runWorkout += 1;
    } else {
      runWorkout = 0;
      runStartWorkout = undefined;
    }

    if (sleepSuccess) {
      if (runSleep === 0) runStartSleep = log.date;
      runSleep += 1;
    } else {
      runSleep = 0;
      runStartSleep = undefined;
    }

    if (weightSuccess) {
      if (runWeight === 0) runStartWeight = log.date;
      runWeight += 1;
    } else {
      runWeight = 0;
      runStartWeight = undefined;
    }

    for (const t of streakLoggingThresholds) {
      if (runLogging >= t && !firstLogging[t] && runStartLogging) {
        firstLogging[t] = runStartLogging;
      }
    }

    for (const t of streakHabitThresholds) {
      if (runCalories >= t && !firstHabit.calories[t] && runStartCalories) {
        firstHabit.calories[t] = runStartCalories;
      }
      if (runWater >= t && !firstHabit.water[t] && runStartWater) {
        firstHabit.water[t] = runStartWater;
      }
      if (runWorkout >= t && !firstHabit.workout[t] && runStartWorkout) {
        firstHabit.workout[t] = runStartWorkout;
      }
      if (runSleep >= t && !firstHabit.sleep[t] && runStartSleep) {
        firstHabit.sleep[t] = runStartSleep;
      }
      if (runWeight >= t && !firstHabit.weight[t] && runStartWeight) {
        firstHabit.weight[t] = runStartWeight;
      }
    }
  }

  const badgeFirstEarned: Record<string, string> = {};

  // Map logging thresholds to streak_any_* badges
  const streakLoggingBadgeIds = [
    'streak_any_3',
    'streak_any_7',
    'streak_any_14',
    'streak_any_30',
    'streak_any_50',
    'streak_any_100',
  ] as const;
  streakLoggingThresholds.forEach((t, idx) => {
    const d = firstLogging[t];
    if (d) {
      badgeFirstEarned[streakLoggingBadgeIds[idx]] = d;
    }
  });

  // Map per-habit thresholds to streak_<habit>_* badges
  const habitPrefixes: Record<HabitKey, string> = {
    water: 'streak_water_',
    calories: 'streak_calories_',
    workout: 'streak_workout_',
    sleep: 'streak_sleep_',
    weight: 'streak_weight_',
  };

  (Object.keys(firstHabit) as HabitKey[]).forEach((habit) => {
    const prefix = habitPrefixes[habit];
    for (const t of streakHabitThresholds) {
      const d = firstHabit[habit][t];
      if (d) {
        const badgeId = `${prefix}${t}`;
        badgeFirstEarned[badgeId] = d;
      }
    }
  });

  const byDate = new Map<string, IDailyLog>();
  for (const log of logsList) {
    byDate.set(log.date, log);
  }

  // ----- Aggregates -----
  let totalMeals = 0;
  let totalWorkouts = 0;
  let totalCaloriesBurned = 0;
  let sleepEntryCount = 0;
  let weightEntryCount = 0;
  let firstMealDate: string | undefined;
  let firstWaterDate: string | undefined;
  let firstWorkoutDate: string | undefined;
  let firstWeightDate: string | undefined;
  let firstSleepDate: string | undefined;
  let firstPerfectDayDate: string | undefined;
  let firstEarlyBirdDate: string | undefined;
  let firstNightOwlDate: string | undefined;
  let hasFirstMeal = false;
  let hasFirstWater = false;
  let hasFirstWorkout = false;
  let hasFirstWeight = false;
  let hasFirstSleep = false;
  let hasPerfectDay = false;
  let hasEarlyBird = false;
  let hasNightOwl = false;

  for (const log of logsList) {
    totalMeals += log.meals?.length ?? 0;
    totalWorkouts += (log.workouts?.length ?? 0);
    totalCaloriesBurned += log.caloriesBurned ?? 0;
    if (log.sleep) sleepEntryCount += 1;
    if (typeof log.weight === 'number') weightEntryCount += 1;

    if ((log.meals?.length ?? 0) > 0) {
      if (!firstMealDate) firstMealDate = log.date;
      hasFirstMeal = true;
    }
    if ((log.waterIntake ?? 0) > 0 || (log.waterEntries?.length ?? 0) > 0) {
      if (!firstWaterDate) firstWaterDate = log.date;
      hasFirstWater = true;
    }
    if ((log.workouts?.length ?? 0) > 0) {
      if (!firstWorkoutDate) firstWorkoutDate = log.date;
      hasFirstWorkout = true;
    }
    if (typeof log.weight === 'number') {
      if (!firstWeightDate) firstWeightDate = log.date;
      hasFirstWeight = true;
    }
    if (log.sleep) {
      if (!firstSleepDate) firstSleepDate = log.date;
      hasFirstSleep = true;
    }

    if (isPerfectDay(log, targets)) {
      if (!firstPerfectDayDate) firstPerfectDayDate = log.date;
      hasPerfectDay = true;
    }

    for (const meal of log.meals ?? []) {
      if (meal.time && isBefore8AM(meal.time)) {
        if (!firstEarlyBirdDate) firstEarlyBirdDate = log.date;
        hasEarlyBird = true;
      }
    }
    const bedtimeAfterMidnight = log.sleep?.bedtime && isAfterMidnight(log.sleep.bedtime);
    const wakeAfterMidnight = log.sleep?.wakeTime && isAfterMidnight(log.sleep.wakeTime);
    if (bedtimeAfterMidnight || wakeAfterMidnight) {
      if (!firstNightOwlDate) firstNightOwlDate = log.date;
      hasNightOwl = true;
    }
  }

  // Map first log dates for \"first_*\" and selected challenge badges.
  if (firstMealDate) badgeFirstEarned['first_meal'] = firstMealDate;
  if (firstWaterDate) badgeFirstEarned['first_water'] = firstWaterDate;
  if (firstWorkoutDate) badgeFirstEarned['first_workout'] = firstWorkoutDate;
  if (firstWeightDate) badgeFirstEarned['first_weight'] = firstWeightDate;
  if (firstSleepDate) badgeFirstEarned['first_sleep'] = firstSleepDate;
  if (firstPerfectDayDate) badgeFirstEarned['first_perfect_day'] = firstPerfectDayDate;
  if (firstEarlyBirdDate) badgeFirstEarned['challenge_early_bird'] = firstEarlyBirdDate;
  if (firstNightOwlDate) badgeFirstEarned['challenge_night_owl'] = firstNightOwlDate;

  // ----- First-time -----
  if (hasFirstMeal) awardBadge('first_meal', existingBadgeIds, newBadges, nowIso);
  if (hasFirstWater) awardBadge('first_water', existingBadgeIds, newBadges, nowIso);
  if (hasFirstWorkout) awardBadge('first_workout', existingBadgeIds, newBadges, nowIso);
  if (hasFirstWeight) awardBadge('first_weight', existingBadgeIds, newBadges, nowIso);
  if (hasFirstSleep) awardBadge('first_sleep', existingBadgeIds, newBadges, nowIso);
  if (hasPerfectDay) awardBadge('first_perfect_day', existingBadgeIds, newBadges, nowIso);

  // ----- Logging streak (any) -----
  const loggingThresholds = [3, 7, 14, 30, 50, 100];
  const loggingBadgeIds = ['streak_any_3', 'streak_any_7', 'streak_any_14', 'streak_any_30', 'streak_any_50', 'streak_any_100'] as const;
  for (let i = 0; i < loggingThresholds.length; i++) {
    if (streaks.current.logging >= loggingThresholds[i]) {
      const id = loggingBadgeIds[i];
      const first = badgeFirstEarned[id];
      awardBadge(id, existingBadgeIds, newBadges, nowIso, first);
    }
  }

  // ----- Per-habit streaks -----
  const habitKeys = ['water', 'calories', 'workout', 'sleep', 'weight'] as const;
  const thresholds = [7, 14, 30, 50, 100];
  for (const key of habitKeys) {
    const current = streaks.current[key];
    const prefix = `streak_${key}_`;
    for (const t of thresholds) {
      if (current >= t) {
        const badgeId = `${prefix}${t}`;
        const first = badgeFirstEarned[badgeId];
        awardBadge(badgeId, existingBadgeIds, newBadges, nowIso, first);
      }
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
  const dateKeys = Array.from(byDate.keys());
  for (const dateKey of dateKeys) {
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
    for (const dateKey of dateKeys) {
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

  const mergedBadges = [...existingAchievements.badges, ...newBadges].map((badge) => {
    const first = badgeFirstEarned[badge.id];
    if (first) {
      return { ...badge, firstEarnedAt: first };
    }
    return badge;
  });

  // Lifetime XP:
  // - Start from existing total if present
  // - Optionally rehydrate from DailyLog.xpAwarded / computeDailyXp when xpTotal is missing or zero
  // - Add a bonus for newly earned badges
  let baseXpTotal = existingAchievements.xpTotal ?? 0;

  if (!baseXpTotal) {
    try {
      let xpFromLogs = 0;
      for (const log of logsList) {
        const awarded = (log as IDailyLog & { xpAwarded?: number }).xpAwarded;
        if (typeof awarded === 'number' && Number.isFinite(awarded) && awarded > 0) {
          xpFromLogs += awarded;
        } else {
          xpFromLogs += computeDailyXp(log, targets);
        }
      }
      if (xpFromLogs > baseXpTotal) {
        baseXpTotal = xpFromLogs;
      }
    } catch (rehydrateErr) {
      console.warn('[calculateAchievements] XP rehydration skipped:', rehydrateErr);
      // baseXpTotal stays 0 or existing value
    }
  }

  const badgeXpDelta = newBadges.length * 10;
  const xpTotal = baseXpTotal + badgeXpDelta;

  const mergedAchievements: UserAchievements = {
    ...existingAchievements,
    badges: mergedBadges,
    streaks,
    xpTotal,
  };

  await User.findByIdAndUpdate(userId, { achievements: mergedAchievements }).exec();

  return {
    achievements: mergedAchievements,
    newlyEarnedBadges: newBadges,
  };
}
