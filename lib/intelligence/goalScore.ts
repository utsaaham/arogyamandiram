// ============================================
// Goal Score — how well today's actions align with the user's chosen goal
// ============================================
//
// Deterministic composite of goal-relevant behaviors (calorie adherence,
// protein %, workout completion, steps), weighted per goal. Weights
// renormalize over the behaviors that have data today — same pattern as the
// Vitals scores, so the attribution engine can decompose it too.

import type { Goal } from '@/types';
import type { ScoreComponent } from '@/lib/scores/types';
import type { DailyFeatureRow } from './features';

export interface GoalScoreResult {
  score: number | null;
  goal: Goal;
  components: ScoreComponent[];
}

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Full credit inside [lo, hi] % of calorie target, fading to 0 at ±30 pts outside. */
function calorieBandScore(pct: number, lo: number, hi: number): number {
  if (pct >= lo && pct <= hi) return 100;
  const dist = pct < lo ? lo - pct : pct - hi;
  return clamp(100 - dist * (100 / 30));
}

/** Per-goal calorie bands (as % of the calorie target, which already includes the goal adjustment). */
const CALORIE_BANDS: Record<Goal, { lo: number; hi: number; label: string }> = {
  lose_fat: { lo: 70, hi: 100, label: 'inside your deficit' },
  build_muscle: { lo: 95, hi: 125, label: 'fueling the surplus' },
  recomp: { lo: 85, hi: 110, label: 'near maintenance' },
  improve_fitness: { lo: 85, hi: 115, label: 'near target' },
  maintain: { lo: 85, hi: 115, label: 'near target' },
};

/** Per-goal weights: calorie adherence, protein, workout, steps. */
const WEIGHTS: Record<Goal, { calories: number; protein: number; workout: number; steps: number }> = {
  lose_fat: { calories: 40, protein: 25, workout: 20, steps: 15 },
  build_muscle: { calories: 35, protein: 30, workout: 25, steps: 10 },
  recomp: { calories: 30, protein: 35, workout: 25, steps: 10 },
  improve_fitness: { calories: 15, protein: 20, workout: 40, steps: 25 },
  maintain: { calories: 35, protein: 20, workout: 25, steps: 20 },
};

const STEPS_TARGET_DEFAULT = 8000;

/**
 * Score one day's behaviors against the goal. `stepsTarget` comes from
 * targets.dailySteps when set.
 */
export function computeGoalScore(
  goal: Goal,
  row: DailyFeatureRow,
  stepsTarget = STEPS_TARGET_DEFAULT
): GoalScoreResult {
  const weights = WEIGHTS[goal];
  const band = CALORIE_BANDS[goal];
  const parts: Array<ScoreComponent & { weight: number }> = [];

  if (row.caloriePctOfTarget !== null) {
    const score = Math.round(calorieBandScore(row.caloriePctOfTarget, band.lo, band.hi));
    parts.push({
      key: 'calories',
      label: 'Calorie adherence',
      score,
      note: `${row.caloriePctOfTarget}% of calorie target — ${score >= 80 ? band.label : 'off the band for your goal'}`,
      weight: weights.calories,
    });
  }

  if (row.proteinPctOfTarget !== null) {
    const score = Math.round(clamp(row.proteinPctOfTarget));
    parts.push({
      key: 'protein',
      label: 'Protein',
      score,
      note: `${row.proteinPctOfTarget}% of protein target`,
      weight: weights.protein,
    });
  }

  // Workout: full credit for any session; partial credit for an active day.
  {
    const score = row.workoutDone ? 100 : (row.steps ?? 0) >= stepsTarget ? 60 : 0;
    parts.push({
      key: 'workout',
      label: 'Workout',
      score,
      note: row.workoutDone
        ? `Trained ${row.workoutMinutes} min`
        : score === 60 ? 'No workout, but an active day' : 'No workout logged',
      weight: weights.workout,
    });
  }

  if (row.steps !== null) {
    const score = Math.round(clamp((row.steps / stepsTarget) * 100));
    parts.push({
      key: 'steps',
      label: 'Steps',
      score,
      note: `${row.steps.toLocaleString()} of ${stepsTarget.toLocaleString()} steps`,
      weight: weights.steps,
    });
  }

  // Nothing tracked at all today (workout component alone with no steps data
  // and no workout would make the score a misleading 0).
  const tracked = row.caloriePctOfTarget !== null || row.proteinPctOfTarget !== null
    || row.workoutDone || row.steps !== null;
  if (!tracked) return { score: null, goal, components: [] };

  const totalWeight = parts.reduce((a, p) => a + p.weight, 0);
  const score = Math.round(parts.reduce((a, p) => a + (p.score ?? 0) * p.weight, 0) / totalWeight);

  return { score, goal, components: parts };
}
