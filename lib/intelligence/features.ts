// ============================================
// Feature store - one normalized row per day, fusing all sources
// ============================================
//
// This IS the wearable-fusion layer: sleep, nutrition %, hydration %, strain
// load, workout done, time-of-day features (bedtime, last meal, workout
// start when known), habits, mood, weekday/weekend - all in one row the
// correlation and prediction engines consume. Pure mapping + a Mongo loader;
// rows are cheap to compute so there is no cache collection yet (add
// models/DailyFeatures.ts + a nightly cron if volumes ever demand it).

import connectDB from '@/lib/db';
import DailyLog from '@/models/DailyLog';
import User from '@/models/User';
import { toLocalDateString } from '@/lib/utils';
import { bedtimeMinutes } from '@/lib/scores/baselines';

export interface DailyFeatureRow {
  date: string;
  weekday: number; // 0 = Sunday
  isWeekend: boolean;
  // Sleep (the night ending on this date)
  sleepDurationH: number | null;
  sleepDebtH: number | null; // vs an 8h need
  bedtimeMin: number | null; // minutes since noon (see baselines.bedtimeMinutes)
  // Nutrition
  caloriePctOfTarget: number | null;
  proteinPctOfTarget: number | null;
  hydrationPctOfTarget: number | null;
  lastMealMin: number | null; // minutes since 4am of the latest logged meal (see mealMinutes)
  // Activity
  steps: number | null;
  strainLoadKcal: number | null; // active calories + hand-logged workout kcal
  workoutDone: boolean;
  workoutMinutes: number;
  // Journal / misc
  mood: number | null;
  habits: string[];
  weightLogged: boolean;
}

export interface ConsistencyScores {
  /** Trailing-window share of days each behavior hit, 0-100; null = no data. */
  workoutPct: number | null;
  proteinPct: number | null;
  hydrationPct: number | null;
  sleepPct: number | null; // nights with ≥7h
  weighInPct: number | null;
  windowDays: number;
}

const SLEEP_NEED_HOURS = 8;

type FeatureLogLean = {
  date?: string;
  totalCalories?: number;
  totalProtein?: number;
  waterIntake?: number;
  steps?: number;
  activeCalories?: number;
  weight?: number;
  mood?: number;
  habits?: string[];
  sleep?: { duration?: number; bedtime?: string };
  meals?: Array<{ time?: string }>;
  workouts?: Array<{ duration?: number; caloriesBurned?: number; source?: string }>;
};

function pctOf(value: number | undefined, target: number | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (typeof target !== 'number' || target <= 0) return null;
  return Math.round((value / target) * 100);
}

/**
 * Meal lateness in minutes since 4am, so a post-midnight snack ranks later
 * than an evening dinner. bedtimeMinutes' noon wrap fits nights, not meals -
 * it would rank an 8am breakfast as the latest meal of the day.
 */
function mealMinutes(time: string): number | null {
  const sinceNoon = bedtimeMinutes(time);
  if (sinceNoon === null) return null;
  const sinceMidnight = (sinceNoon + 720) % 1440;
  return (sinceMidnight - 240 + 1440) % 1440;
}

/** Map one DailyLog to a normalized feature row. Pure. */
export function toFeatureRow(
  log: FeatureLogLean,
  targets: { dailyCalories?: number; protein?: number; dailyWater?: number }
): DailyFeatureRow {
  const date = String(log.date ?? '');
  // Date-only strings parse as UTC midnight, so read the weekday in UTC too -
  // local getDay() shifts every date back a day on UTC-negative servers.
  const d = new Date(date);
  const weekday = Number.isNaN(d.getTime()) ? 0 : d.getUTCDay();

  const sleepDurationH = typeof log.sleep?.duration === 'number' && log.sleep.duration > 0
    ? log.sleep.duration
    : null;

  const mealTimes = (log.meals ?? [])
    .map((m) => (m.time ? mealMinutes(m.time) : null))
    .filter((v): v is number => v !== null);

  const manualWorkoutKcal = (log.workouts ?? [])
    .filter((w) => w.source !== 'device')
    .reduce((s, w) => s + (w.caloriesBurned ?? 0), 0);
  const hasEnergy = typeof log.activeCalories === 'number' || manualWorkoutKcal > 0;
  const workoutMinutes = (log.workouts ?? []).reduce((s, w) => s + (w.duration ?? 0), 0);

  return {
    date,
    weekday,
    isWeekend: weekday === 0 || weekday === 6,
    sleepDurationH,
    sleepDebtH: sleepDurationH !== null ? Math.max(0, SLEEP_NEED_HOURS - sleepDurationH) : null,
    bedtimeMin: log.sleep?.bedtime ? bedtimeMinutes(log.sleep.bedtime) : null,
    caloriePctOfTarget: pctOf(log.totalCalories, targets.dailyCalories),
    proteinPctOfTarget: pctOf(log.totalProtein, targets.protein),
    hydrationPctOfTarget: pctOf(log.waterIntake, targets.dailyWater),
    lastMealMin: mealTimes.length > 0 ? Math.max(...mealTimes) : null,
    steps: typeof log.steps === 'number' ? log.steps : null,
    strainLoadKcal: hasEnergy ? (log.activeCalories ?? 0) + manualWorkoutKcal : null,
    workoutDone: (log.workouts ?? []).length > 0,
    workoutMinutes,
    mood: typeof log.mood === 'number' ? log.mood : null,
    habits: log.habits ?? [],
    weightLogged: typeof log.weight === 'number' && log.weight > 0,
  };
}

/** Trailing-window hit rates for the behaviors the coach cares about. */
export function computeConsistency(rows: DailyFeatureRow[], windowDays = 30): ConsistencyScores {
  const window = rows.slice(-windowDays);
  const rate = (hit: (r: DailyFeatureRow) => boolean, tracked: (r: DailyFeatureRow) => boolean): number | null => {
    const eligible = window.filter(tracked);
    if (eligible.length === 0) return null;
    return Math.round((eligible.filter(hit).length / eligible.length) * 100);
  };
  return {
    workoutPct: window.length > 0 ? Math.round((window.filter((r) => r.workoutDone).length / window.length) * 100) : null,
    proteinPct: rate((r) => (r.proteinPctOfTarget ?? 0) >= 100, (r) => r.proteinPctOfTarget !== null),
    hydrationPct: rate((r) => (r.hydrationPctOfTarget ?? 0) >= 100, (r) => r.hydrationPctOfTarget !== null),
    sleepPct: rate((r) => (r.sleepDurationH ?? 0) >= 7, (r) => r.sleepDurationH !== null),
    weighInPct: window.length > 0 ? Math.round((window.filter((r) => r.weightLogged).length / window.length) * 100) : null,
    windowDays: window.length,
  };
}

/** Load feature rows for the trailing `days` window (ascending by date). */
export async function getDailyFeaturesForUser(userId: string, days = 45): Promise<DailyFeatureRow[]> {
  await connectDB();

  const start = new Date();
  start.setDate(start.getDate() - days);
  const startStr = toLocalDateString(start);

  const [user, logs] = await Promise.all([
    User.findById(userId).select('targets.dailyCalories targets.protein targets.dailyWater').lean() as Promise<{
      targets?: { dailyCalories?: number; protein?: number; dailyWater?: number };
    } | null>,
    DailyLog.find(
      { userId, date: { $gte: startStr } },
      {
        date: 1, totalCalories: 1, totalProtein: 1, waterIntake: 1, steps: 1,
        activeCalories: 1, weight: 1, mood: 1, habits: 1,
        'sleep.duration': 1, 'sleep.bedtime': 1,
        'meals.time': 1,
        'workouts.duration': 1, 'workouts.caloriesBurned': 1, 'workouts.source': 1,
        _id: 0,
      }
    ).sort({ date: 1 }).lean() as Promise<FeatureLogLean[]>,
  ]);

  const targets = user?.targets ?? {};
  return logs.map((log) => toFeatureRow(log, targets));
}
