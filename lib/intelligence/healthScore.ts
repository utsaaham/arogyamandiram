// ============================================
// Health Score — the 0-100 capstone composite (monthly rolling)
// ============================================
//
// Combines recovery, sleep, nutrition, training, consistency, stress, and
// trend direction over a rolling 30 days. Never a black box: components
// carry weights so the attribution engine can decompose it exactly —
// tappable like every other score, with the one change that would raise it
// most. Revives the "Wellness Age" idea from docs/arogyam-scores-plan.md now
// that the feature store provides the weeks of history it needed.

import type { ScoreComponent } from '@/lib/scores/types';
import type { VitalsTrendPoint } from '@/lib/scores';
import type { ConsistencyScores } from './features';

export interface HealthScoreResult {
  score: number | null;
  components: ScoreComponent[];
  /** Score over the last 30 days minus the 30 days before; null when history is short. */
  monthlyDelta: number | null;
  daysOfData: number;
}

function mean(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Slope of readiness over the window mapped to 0-100 (50 = flat). */
function trendDirectionScore(trends: VitalsTrendPoint[]): number | null {
  const pts = trends
    .map((t, i) => ({ x: i, y: t.readiness }))
    .filter((p): p is { x: number; y: number } => p.y !== null);
  if (pts.length < 7) return null;
  const n = pts.length;
  const meanX = pts.reduce((a, p) => a + p.x, 0) / n;
  const meanY = pts.reduce((a, p) => a + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of pts) {
    num += (p.x - meanX) * (p.y - meanY);
    den += (p.x - meanX) ** 2;
  }
  if (den === 0) return null;
  const slopePerDay = num / den; // readiness pts/day
  // ±0.5 pts/day maps to ±50 around the neutral 50.
  return Math.round(clamp(50 + slopePerDay * 100));
}

function buildComponents(
  trends: VitalsTrendPoint[],
  consistency: ConsistencyScores | null,
  goalScores: Array<number | null>
): Array<ScoreComponent & { weight: number }> {
  const parts: Array<ScoreComponent & { weight: number }> = [];

  const recovery = mean(trends.map((t) => t.readiness));
  if (recovery !== null) {
    parts.push({ key: 'recovery', label: 'Recovery', score: Math.round(recovery), note: `Average readiness ${Math.round(recovery)} this month`, weight: 20 });
  }
  const sleep = mean(trends.map((t) => t.sleep));
  if (sleep !== null) {
    parts.push({ key: 'sleep', label: 'Sleep', score: Math.round(sleep), note: `Average sleep score ${Math.round(sleep)}`, weight: 20 });
  }
  const goalAlignment = mean(goalScores);
  if (goalAlignment !== null) {
    parts.push({ key: 'nutritionTraining', label: 'Goal alignment', score: Math.round(goalAlignment), note: `Daily actions averaged ${Math.round(goalAlignment)}% aligned with your goal`, weight: 20 });
  }
  if (consistency) {
    const cons = mean([
      consistency.workoutPct,
      consistency.proteinPct,
      consistency.hydrationPct,
      consistency.sleepPct,
    ]);
    if (cons !== null) {
      parts.push({ key: 'consistency', label: 'Consistency', score: Math.round(cons), note: `Behaviors hit ${Math.round(cons)}% of tracked days`, weight: 15 });
    }
  }
  const stress = mean(trends.map((t) => t.stress));
  if (stress !== null) {
    const inverted = Math.round(clamp(100 - stress));
    parts.push({ key: 'stress', label: 'Stress', score: inverted, note: `Average stress index ${Math.round(stress)}/100 (lower is better)`, weight: 10 });
  }
  const direction = trendDirectionScore(trends);
  if (direction !== null) {
    parts.push({
      key: 'trend',
      label: 'Trend direction',
      score: direction,
      note: direction > 55 ? 'Readiness trending up this month' : direction < 45 ? 'Readiness trending down this month' : 'Readiness holding steady',
      weight: 15,
    });
  }

  return parts;
}

function blend(parts: Array<ScoreComponent & { weight: number }>): number | null {
  if (parts.length < 2) return null; // one signal isn't a health score
  const totalWeight = parts.reduce((a, p) => a + p.weight, 0);
  return Math.round(parts.reduce((a, p) => a + (p.score ?? 0) * p.weight, 0) / totalWeight);
}

/**
 * @param trends       Daily trend points, ascending; ideally ≥60 days for the monthly delta.
 * @param consistency  Trailing-30d behavior hit rates.
 * @param goalScores   Per-day goal scores aligned to the SAME dates as `trends`' tail.
 */
export function computeHealthScore(
  trends: VitalsTrendPoint[],
  consistency: ConsistencyScores | null,
  goalScores: Array<number | null>
): HealthScoreResult {
  const last30 = trends.slice(-30);
  const goalLast30 = goalScores.slice(-30);
  const currentParts = buildComponents(last30, consistency, goalLast30);
  const score = blend(currentParts);

  // Monthly delta: same composite over the previous 30 days (consistency
  // history isn't stored per-month, so the prior blend omits it — noted
  // honestly by keying the delta only off shared components).
  let monthlyDelta: number | null = null;
  const prev30 = trends.slice(-60, -30);
  if (score !== null && prev30.length >= 15) {
    const prevParts = buildComponents(prev30, null, goalScores.slice(-60, -30));
    const sharedKeys = new Set(prevParts.map((p) => p.key));
    const currentShared = blend(currentParts.filter((p) => sharedKeys.has(p.key)));
    const prevScore = blend(prevParts);
    if (prevScore !== null && currentShared !== null) {
      monthlyDelta = Math.round(currentShared - prevScore);
    }
  }

  return {
    score,
    components: currentParts,
    monthlyDelta,
    daysOfData: last30.filter((t) => t.readiness !== null || t.sleep !== null).length,
  };
}
