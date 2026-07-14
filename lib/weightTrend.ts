// ============================================
// Weight trend — least-squares slope over recent weight logs
// ============================================
//
// Read-only signal: the direction the user's weight is ACTUALLY moving,
// independent of the goal they picked. Fed to AI prompts alongside the
// user-owned goal so the coach can call out conflicts ("goal build_muscle
// but trend losing → eat more"). Never writes anything.

import connectDB from '@/lib/db';
import DailyLog from '@/models/DailyLog';
import { toLocalDateString } from '@/lib/utils';

export type WeightTrendDirection = 'losing' | 'gaining' | 'stable' | 'unknown';

export interface WeightTrendResult {
  trend: WeightTrendDirection;
  /** kg per week; negative = losing. Null when trend is 'unknown'. */
  slopeKgPerWeek: number | null;
  samples: number;
}

/** ±0.2 kg/week — smaller slopes read as measurement noise, not a real trend. */
const STABLE_THRESHOLD_KG_PER_WEEK = 0.2;
const MIN_SAMPLES = 3;

/**
 * Least-squares slope over dated weight points. Needs ≥3 points spread over
 * more than one day; otherwise 'unknown'.
 */
export function computeWeightTrend(
  points: Array<{ date?: string; weight?: number | null }>
): WeightTrendResult {
  const clean = points
    .map((p) => ({ time: new Date(String(p.date)).getTime(), weight: Number(p.weight) }))
    .filter((p) => Number.isFinite(p.time) && Number.isFinite(p.weight) && p.weight > 0)
    .sort((a, b) => a.time - b.time);

  if (clean.length < MIN_SAMPLES) {
    return { trend: 'unknown', slopeKgPerWeek: null, samples: clean.length };
  }

  const t0 = clean[0].time;
  const xs = clean.map((p) => (p.time - t0) / 86_400_000); // days
  const ys = clean.map((p) => p.weight);
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  if (den === 0) return { trend: 'unknown', slopeKgPerWeek: null, samples: n };

  const slopeKgPerWeek = (num / den) * 7;
  const trend: WeightTrendDirection =
    slopeKgPerWeek <= -STABLE_THRESHOLD_KG_PER_WEEK ? 'losing'
    : slopeKgPerWeek >= STABLE_THRESHOLD_KG_PER_WEEK ? 'gaining'
    : 'stable';
  return { trend, slopeKgPerWeek: Math.round(slopeKgPerWeek * 100) / 100, samples: n };
}

/** Trend from the user's last `days` days of DailyLog weight entries. */
export async function getWeightTrendForUser(userId: string, days = 14): Promise<WeightTrendResult> {
  await connectDB();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startStr = toLocalDateString(startDate);

  const logs = await DailyLog.find(
    { userId, date: { $gte: startStr }, weight: { $exists: true, $ne: null } },
    { date: 1, weight: 1, _id: 0 }
  )
    .sort({ date: 1 })
    .lean() as Array<{ date?: string; weight?: number }>;

  return computeWeightTrend(logs);
}
