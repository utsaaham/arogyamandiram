// ============================================
// Adherence — trailing 7-day planned-vs-logged workout match
// ============================================
//
// Compares what the daily plans prescribed with what the user actually logged
// and buckets the result for progression: a coach progresses you when you show
// up, holds when you're inconsistent, deloads when you've mostly been away.
// Matching is exact via the `planExerciseName` contract, with a fuzzy name
// fallback for orchestrator/free-text logs. Warmup/cooldown/mobility work is
// excluded from the denominator.

import connectDB from '@/lib/db';
import DailyPlan from '@/models/DailyPlan';
import DailyLog from '@/models/DailyLog';
import { toLocalDateString } from '@/lib/utils';

export type ProgressionBucket = 'progress' | 'hold' | 'deload';

export interface AdherenceResult {
  bucket: ProgressionBucket;
  /** 0–100; null when there is no plan history (bucket falls back to 'hold'). */
  adherencePct: number | null;
  plannedCount: number;
  completedCount: number;
  daysWithPlan: number;
}

const EXCLUDED_PHASES = new Set(['warmup', 'cooldown', 'mobility']);

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Loose match for free-text logs: exact, containment, or ≥60% token overlap. */
function fuzzyNameMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const ta = new Set(na.split(' '));
  const tb = new Set(nb.split(' '));
  const common = [...ta].filter((t) => tb.has(t)).length;
  return common / Math.max(ta.size, tb.size) >= 0.6;
}

/**
 * Trailing 7-day adherence ending the day before `endDateExclusive`
 * (pass today — today's plan is the one being generated).
 * Buckets: ≥90% progress · 60–89% hold · <60% deload · no history → hold.
 */
export async function computeWorkoutAdherence(
  userId: string,
  endDateExclusive: string
): Promise<AdherenceResult> {
  await connectDB();

  const start = new Date(endDateExclusive);
  start.setDate(start.getDate() - 7);
  const startStr = toLocalDateString(start);

  const [plans, logs] = await Promise.all([
    DailyPlan.find({ userId, date: { $gte: startStr, $lt: endDateExclusive } })
      .select('date workoutPlan.exercises.name workoutPlan.exercises.phase workoutPlan.exercises.category')
      .lean() as Promise<Array<{
        date?: string;
        workoutPlan?: { exercises?: Array<{ name?: string; phase?: string; category?: string }> };
      }>>,
    DailyLog.find({ userId, date: { $gte: startStr, $lt: endDateExclusive } })
      .select('date workouts.exercise workouts.planExerciseName')
      .lean() as Promise<Array<{
        date?: string;
        workouts?: Array<{ exercise?: string; planExerciseName?: string }>;
      }>>,
  ]);

  const logsByDate = new Map<string, Array<{ exercise?: string; planExerciseName?: string }>>();
  for (const log of logs) {
    if (log.date) logsByDate.set(log.date, log.workouts ?? []);
  }

  let plannedCount = 0;
  let completedCount = 0;
  let daysWithPlan = 0;

  for (const plan of plans) {
    const exercises = plan.workoutPlan?.exercises ?? [];
    const trainable = exercises.filter((ex) => {
      if (!ex.name) return false;
      const phase = (ex.phase ?? '').toLowerCase();
      if (EXCLUDED_PHASES.has(phase)) return false;
      // Old plans without phase tags: flexibility work is cooldown material.
      return Boolean(phase) || (ex.category ?? '').toLowerCase() !== 'flexibility';
    });
    if (trainable.length === 0) continue;
    daysWithPlan += 1;

    const dayWorkouts = plan.date ? (logsByDate.get(plan.date) ?? []) : [];
    for (const ex of trainable) {
      plannedCount += 1;
      const matched = dayWorkouts.some((w) => {
        if (w.planExerciseName && normalizeName(w.planExerciseName) === normalizeName(ex.name!)) return true;
        return Boolean(w.exercise) && fuzzyNameMatch(w.exercise!, ex.name!);
      });
      if (matched) completedCount += 1;
    }
  }

  if (plannedCount === 0) {
    return { bucket: 'hold', adherencePct: null, plannedCount: 0, completedCount: 0, daysWithPlan };
  }

  const adherencePct = Math.round((completedCount / plannedCount) * 100);
  const bucket: ProgressionBucket =
    adherencePct >= 90 ? 'progress' : adherencePct >= 60 ? 'hold' : 'deload';
  return { bucket, adherencePct, plannedCount, completedCount, daysWithPlan };
}
