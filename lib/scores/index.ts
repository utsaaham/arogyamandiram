// Vitals score engine orchestrator: turns a series of DailyLogs into the full
// Vitals payload - today's four scores, guidance, trends, and habit insights.

import type { IDailyLog } from '@/types';
import { attributeScore, type ScoreAttribution } from '@/lib/intelligence/attribution';
import { computeArogyamAge, type AgeProfileInput, type ArogyamAgeResult } from './age';
import { baselineOf, column, zScore } from './baselines';
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
export { computeArogyamAge } from './age';
export type { AgeProfileInput, AgeComponent, ArogyamAgeResult } from './age';

export interface VitalsTrendPoint {
  date: string;
  readiness: number | null;
  strain: number | null;
  sleep: number | null;
  stress: number | null;
  hrvSdnnMs: number | null;
  restingHeartRate: number | null;
  vo2Max: number | null;
  respiratoryRate: number | null;
  wristTempC: number | null;
  mood: number | null;
  oxygenSaturationPct: number | null;
}

/** Per-score attribution: why the value, what changed, confidence, fastest lever. */
export interface VitalsAttribution {
  readiness: ScoreAttribution;
  strain: ScoreAttribution;
  sleep: ScoreAttribution;
  stress: ScoreAttribution;
}

/** "Unusual today" callout: a baselined metric sitting |z| > 2 from its own history. */
export interface AnomalyCallout {
  key: string;
  label: string;
  note: string;
}

/** One chained-attribution event: a day where a score moved and why. */
export interface TimelineEvent {
  date: string;
  scoreKey: 'readiness' | 'sleep';
  delta: number;
  reason: string | null;
}

export interface VitalsResult {
  date: string;
  readiness: ReadinessResult;
  strain: StrainResult;
  sleep: SleepResult;
  stress: StressResult;
  guidance: GuidanceResult;
  /** ArogyaM Age estimate; null-age until a profile age and some data exist */
  arogyamAge: ArogyamAgeResult;
  attribution: VitalsAttribution;
  /** Attribution chained over the last week: what moved and why, day by day. */
  timeline: TimelineEvent[];
  /** Metrics sitting far outside their own baseline today (|z| > 2). */
  anomalies: AnomalyCallout[];
  trends: VitalsTrendPoint[];
  insights: HabitInsight[];
  journal: { habits: string[]; mood: number | null };
}

export type { ScoreAttribution } from '@/lib/intelligence/attribution';

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
    oxygenSaturationPct: log.oxygenSaturationPct,
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
 * @param profile   Optional profile slice for ArogyaM Age; omitting it just
 *                  leaves the age null with a "complete your profile" reason.
 */
export function computeVitals(days: DayInput[], today: string, trendDays = 30, profile: AgeProfileInput = {}): VitalsResult {
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
        respiratoryRate: d.respiratoryRate ?? null,
        wristTempC: d.wristTempC ?? null,
        mood: d.mood ?? null,
        oxygenSaturationPct: d.oxygenSaturationPct ?? null,
      };
    });

  const insights = computeInsights(
    series,
    perDay.map((p) => ({ readiness: p.readiness.score, sleep: p.sleep.score }))
  );

  const todayInput = series[todayIndex];

  // Anomaly detection: the respiratory/wrist-temp z-penalty pattern extended
  // to every baselined metric - |z| > 2 vs the user's own history flags an
  // "Unusual today" callout (signal, not diagnosis).
  const ANOMALY_METRICS: Array<{
    key: string;
    label: string;
    pick: (d: DayInput) => number | undefined;
    format: (v: number, meanV: number) => string;
  }> = [
    { key: 'hrv', label: 'HRV', pick: (d) => d.hrvSdnnMs, format: (v, m) => `HRV ${Math.round(v)} ms vs ~${Math.round(m)} ms usual` },
    { key: 'restingHr', label: 'Resting heart rate', pick: (d) => d.restingHeartRate, format: (v, m) => `Resting HR ${Math.round(v)} bpm vs ~${Math.round(m)} bpm usual` },
    { key: 'respiratoryRate', label: 'Respiratory rate', pick: (d) => d.respiratoryRate, format: (v, m) => `Breathing ${v.toFixed(1)}/min vs ~${m.toFixed(1)} usual` },
    { key: 'wristTemp', label: 'Wrist temperature', pick: (d) => d.wristTempC, format: (v, m) => `Wrist temp ${v.toFixed(1)}°C vs ~${m.toFixed(1)}°C usual` },
    { key: 'heartRate', label: 'Average heart rate', pick: (d) => d.heartRate, format: (v, m) => `Avg HR ${Math.round(v)} bpm vs ~${Math.round(m)} bpm usual` },
    { key: 'oxygenSaturation', label: 'Blood oxygen', pick: (d) => d.oxygenSaturationPct, format: (v, m) => `Blood oxygen ${v.toFixed(1)}% vs ~${m.toFixed(1)}% usual` },
  ];
  const anomalies: AnomalyCallout[] = [];
  for (const metric of ANOMALY_METRICS) {
    const value = metric.pick(todayInput);
    if (typeof value !== 'number') continue;
    const base = baselineOf(column(series, metric.pick), todayIndex);
    if (!base) continue;
    const z = zScore(value, base);
    if (Math.abs(z) > 2) {
      anomalies.push({
        key: metric.key,
        label: metric.label,
        note: `Unusual today: ${metric.format(value, base.mean)}`,
      });
    }
  }

  // Exact attribution per score: today vs yesterday plus each score's own
  // recent history (baseline phrasing + confidence).
  const yesterdayIndex = todayIndex - 1;
  const attributionFor = (
    pick: (p: (typeof perDay)[number]) => { score: number | null; components: ReadinessResult['components'] }
  ) => attributeScore({
    todayScore: pick(perDay[todayIndex]).score,
    todayComponents: pick(perDay[todayIndex]).components,
    yesterdayScore: yesterdayIndex >= 0 ? pick(perDay[yesterdayIndex]).score : null,
    yesterdayComponents: yesterdayIndex >= 0 ? pick(perDay[yesterdayIndex]).components : null,
    priorScores: perDay.slice(0, todayIndex).map((p) => pick(p).score),
  });

  const attribution: VitalsAttribution = {
    readiness: attributionFor((p) => p.readiness),
    strain: attributionFor((p) => p.strain),
    sleep: attributionFor((p) => p.sleep),
    stress: attributionFor((p) => p.stress),
  };

  // Timeline: chain day-over-day attribution across the last week - every day
  // a score moved meaningfully, name the biggest reason.
  const TIMELINE_DAYS = 7;
  const TIMELINE_MIN_DELTA = 8;
  const timeline: TimelineEvent[] = [];
  for (let i = Math.max(1, series.length - TIMELINE_DAYS); i <= todayIndex; i++) {
    for (const scoreKey of ['readiness', 'sleep'] as const) {
      const todayResult = perDay[i][scoreKey];
      const prevResult = perDay[i - 1][scoreKey];
      if (todayResult.score === null || prevResult.score === null) continue;
      const delta = Math.round(todayResult.score - prevResult.score);
      if (Math.abs(delta) < TIMELINE_MIN_DELTA) continue;
      const attr = attributeScore({
        todayScore: todayResult.score,
        todayComponents: todayResult.components,
        yesterdayScore: prevResult.score,
        yesterdayComponents: prevResult.components,
        priorScores: [],
      });
      timeline.push({
        date: series[i].date,
        scoreKey,
        delta,
        reason: attr.changeVsYesterday.biggestReason,
      });
    }
  }

  return {
    date: today,
    readiness: perDay[todayIndex].readiness,
    strain: perDay[todayIndex].strain,
    sleep: perDay[todayIndex].sleep,
    stress: perDay[todayIndex].stress,
    guidance: computeGuidance(todayInput, perDay[todayIndex].readiness),
    arogyamAge: computeArogyamAge(series, profile),
    attribution,
    timeline,
    anomalies,
    trends,
    insights,
    journal: {
      habits: todayInput.habits ?? [],
      mood: todayInput.mood ?? null,
    },
  };
}
