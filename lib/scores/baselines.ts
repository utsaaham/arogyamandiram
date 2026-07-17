// Rolling personal baselines: every signal is judged against the user's own
// recent history (up to 14 prior days), never against population norms.

import type { Baseline, DayInput } from './types';

export const BASELINE_DAYS = 14;
const MIN_SAMPLES = 3;

/** Mean/std of the last `window` values before (excluding) `endIndex`. */
export function baselineOf(values: Array<number | undefined>, endIndex: number, window = BASELINE_DAYS): Baseline | null {
  const start = Math.max(0, endIndex - window);
  const sample: number[] = [];
  for (let i = start; i < endIndex; i++) {
    const v = values[i];
    if (typeof v === 'number' && Number.isFinite(v)) sample.push(v);
  }
  if (sample.length < MIN_SAMPLES) return null;

  const mean = sample.reduce((a, b) => a + b, 0) / sample.length;
  const variance = sample.reduce((a, b) => a + (b - mean) ** 2, 0) / sample.length;
  return { mean, std: Math.sqrt(variance), count: sample.length };
}

/**
 * Z-score of `value` against a baseline. When the baseline is nearly flat
 * (std ≈ 0), fall back to relative deviation so a real change still registers.
 */
export function zScore(value: number, baseline: Baseline): number {
  const minStd = Math.max(baseline.std, Math.abs(baseline.mean) * 0.03, 1e-6);
  return (value - baseline.mean) / minStd;
}

/** Extract one metric column from the day series, aligned by index. */
export function column(days: DayInput[], pick: (d: DayInput) => number | undefined): Array<number | undefined> {
  return days.map(pick);
}

/** Parse "HH:mm" (or ISO datetime) to minutes-since-noon so bedtimes around midnight compare linearly. */
export function bedtimeMinutes(bedtime: string): number | null {
  let h: number | null = null;
  let m = 0;
  const hhmm = bedtime.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) {
    h = parseInt(hhmm[1], 10);
    m = parseInt(hhmm[2], 10);
  } else {
    const dt = new Date(bedtime);
    if (!Number.isNaN(dt.getTime())) {
      h = dt.getHours();
      m = dt.getMinutes();
    }
  }
  if (h === null || h > 23) return null;
  // Minutes since noon: 22:30 → 630, 00:30 → 750 - keeps midnight continuous.
  return ((h + 12) % 24) * 60 + m;
}
