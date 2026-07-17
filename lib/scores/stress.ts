// Stress estimate (Low / Moderate / High): inferred from HR elevation, HRV
// suppression, and accumulated sleep debt vs. the user's own baselines.
// Explicitly an estimate - never presented as a diagnosis.

import { baselineOf, column, zScore } from './baselines';
import { clamp, type DayInput, type ScoreComponent, type StressLevel, type StressResult } from './types';

const SLEEP_NEED_HOURS = 8;

function levelFor(score: number): StressLevel {
  if (score < 35) return 'low';
  if (score < 65) return 'moderate';
  return 'high';
}

export function computeStress(days: DayInput[], index: number): StressResult {
  const day = days[index];
  if (!day) return { level: null, score: null, components: [] };

  const parts: Array<ScoreComponent & { weight: number; stress01: number }> = [];

  // Daily average HR elevated vs. baseline
  if (typeof day.heartRate === 'number') {
    const base = baselineOf(column(days, (d) => d.heartRate), index);
    if (base) {
      const z = zScore(day.heartRate, base);
      const stress01 = clamp(z / 2, 0, 1);
      parts.push({
        key: 'heartRate',
        label: 'Heart rate',
        stress01,
        score: Math.round(stress01 * 100),
        note: z > 0.5 ? 'Average heart rate above your usual' : 'Heart rate near your usual',
        weight: 35,
      });
    }
  }

  // HRV suppressed vs. baseline
  if (typeof day.hrvSdnnMs === 'number') {
    const base = baselineOf(column(days, (d) => d.hrvSdnnMs), index);
    if (base) {
      const z = zScore(day.hrvSdnnMs, base);
      const stress01 = clamp(-z / 2, 0, 1);
      parts.push({
        key: 'hrv',
        label: 'HRV',
        stress01,
        score: Math.round(stress01 * 100),
        note: z < -0.5 ? 'HRV below your usual' : 'HRV near your usual',
        weight: 35,
      });
    }
  }

  // Sleep debt over the last 3 nights
  let debt = 0;
  let nights = 0;
  for (let i = Math.max(0, index - 2); i <= index; i++) {
    const s = days[i]?.sleep;
    if (s && s.duration > 0) {
      debt += Math.max(0, SLEEP_NEED_HOURS - s.duration);
      nights++;
    }
  }
  if (nights > 0) {
    const stress01 = clamp(debt / 6, 0, 1); // 6h cumulative debt = max
    parts.push({
      key: 'sleepDebt',
      label: 'Sleep debt',
      stress01,
      score: Math.round(stress01 * 100),
      note: debt >= 1 ? `~${Math.round(debt * 10) / 10}h sleep debt over ${nights} night${nights > 1 ? 's' : ''}` : 'Little to no sleep debt',
      weight: 30,
    });
  }

  if (parts.length === 0) return { level: null, score: null, components: [] };

  const totalWeight = parts.reduce((a, p) => a + p.weight, 0);
  const score = Math.round(
    (parts.reduce((a, p) => a + p.stress01 * p.weight, 0) / totalWeight) * 100
  );

  return {
    level: levelFor(score),
    score,
    // Weights stay on the components so attribution can decompose the blend.
    components: parts.map(({ stress01: _s, ...c }) => c),
  };
}
