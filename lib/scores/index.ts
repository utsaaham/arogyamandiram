// Vitals score engine orchestrator: turns a series of DailyLogs into the full
// Vitals payload — today's four scores, guidance, trends, and habit insights.

import type { IDailyLog } from '@/types';
import { computeGuidance } from './guidance';
import { computeInsights } from './insights';
import { computeReadiness } from './readiness';
import { computeSleep } from './sleep';
import { computeStrain } from './strain';
import { computeStress } from './stress';
import type { DayInput, HabitInsight, GuidanceResult, ReadinessResult, SleepResult, StrainResult, StressResult } from './types';

export type {
  DayInput, GuidanceResult, HabitInsight, ReadinessResult, ScoreComponent,
  SleepResult, StrainResult, StressResult,
} from './types';

export interface VitalsTrendPoint {
  date: string;
  readiness: number | null;
  strain: number | null;
  sleep: number | null;
  stress: number | null;
  hrvSdnnMs: number | null;
  restingHeartRate: number | null;
  vo2Max: number | null;
}

export interface VitalsResult {
  date: string;
  readiness: ReadinessResult;
  strain: StrainResult;
  sleep: SleepResult;
  stress: StressResult;
  guidance: GuidanceResult;
  trends: VitalsTrendPoint[];
  insights: HabitInsight[];
  journal: { habits: string[]; mood: number | null };
}

type LeanLog = Partial<IDailyLog> & { date: string };

/** Map a lean DailyLog document to the engine's DayInput shape. */
export function toDayInput(log: LeanLog): DayInput {
  return {
    date: log.date,
    restingHeartRate: log.restingHeartRate,
    hrvSdnnMs: log.hrvSdnnMs,
    respiratoryRate: log.respiratoryRate,
    wristTempC: log.wristTempC,
    vo2Max: log.vo2Max,
    heartRate: log.heartRate,
    steps: log.steps,
    activeCalories: log.activeCalories,
    workouts: (log.workouts ?? []).map((w) => ({
      duration: w.duration,
      caloriesBurned: w.caloriesBurned,
      avgHeartRate: w.avgHeartRate,
      source: (w as { source?: string }).source,
    })),
    sleep: log.sleep
      ? {
          duration: log.sleep.duration,
          bedtime: log.sleep.bedtime,
          wakeTime: log.sleep.wakeTime,
          deepHours: log.sleep.deepHours,
          remHours: log.sleep.remHours,
          coreHours: log.sleep.coreHours,
          awakeHours: log.sleep.awakeHours,
        }
      : undefined,
    habits: log.habits,
    mood: log.mood,
  };
}

/**
 * Compute the full Vitals payload.
 *
 * @param days   Day inputs sorted ascending by date. May have gaps; baselines
 *               and trends key off array positions of days that have data.
 * @param today  YYYY-MM-DD in the user's timezone. If the last entry isn't
 *               today, today's scores compute from whatever partial data exists.
 * @param trendDays How many trailing days to include in `trends`.
 */
export function computeVitals(days: DayInput[], today: string, trendDays = 30): VitalsResult {
  // Ensure there's an entry for today so baselines index correctly.
  let series = days;
  if (series.length === 0 || series[series.length - 1].date < today) {
    series = [...days, { date: today }];
  }
  const todayIndex = series.length - 1;

  // Per-day scores across the series (each day judged against its own past)
  const perDay = series.map((_, i) => ({
    readiness: computeReadiness(series, i),
    strain: computeStrain(series, i),
    sleep: computeSleep(series, i),
    stress: computeStress(series, i),
  }));

  const trends: VitalsTrendPoint[] = series
    .slice(Math.max(0, series.length - trendDays))
    .map((d, offset) => {
      const i = Math.max(0, series.length - trendDays) + offset;
      return {
        date: d.date,
        readiness: perDay[i].readiness.score,
        strain: perDay[i].strain.score,
        sleep: perDay[i].sleep.score,
        stress: perDay[i].stress.score,
        hrvSdnnMs: d.hrvSdnnMs ?? null,
        restingHeartRate: d.restingHeartRate ?? null,
        vo2Max: d.vo2Max ?? null,
      };
    });

  const insights = computeInsights(
    series,
    perDay.map((p) => ({ readiness: p.readiness.score, sleep: p.sleep.score }))
  );

  const todayInput = series[todayIndex];

  return {
    date: today,
    readiness: perDay[todayIndex].readiness,
    strain: perDay[todayIndex].strain,
    sleep: perDay[todayIndex].sleep,
    stress: perDay[todayIndex].stress,
    guidance: computeGuidance(todayInput, perDay[todayIndex].readiness),
    trends,
    insights,
    journal: {
      habits: todayInput.habits ?? [],
      mood: todayInput.mood ?? null,
    },
  };
}
