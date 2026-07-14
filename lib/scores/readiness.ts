// Readiness score (0-100): how ready the body is for load today, judged
// against the user's own 14-day baselines. Weights renormalize across the
// signals that are actually available, so the score works from day one and
// sharpens as HRV / resting-HR data arrives from the device.
//
// Wellness framing only: this is a readiness *estimate*, not a diagnosis.

import { baselineOf, column, zScore } from './baselines';
import { computeSleep } from './sleep';
import { computeStrain } from './strain';
import { clamp, type DayInput, type ReadinessResult, type ScoreComponent } from './types';

function scoreFromZ(z: number): number {
  // z = 0 → 50, each std ±25 points
  return clamp(50 + z * 25);
}

export function computeReadiness(days: DayInput[], index: number): ReadinessResult {
  const day = days[index];
  if (!day) return { score: null, components: [], drivers: [] };

  const parts: Array<ScoreComponent & { weight: number }> = [];

  // HRV vs. baseline — higher than usual is good
  if (typeof day.hrvSdnnMs === 'number') {
    const base = baselineOf(column(days, (d) => d.hrvSdnnMs), index);
    if (base) {
      const z = zScore(day.hrvSdnnMs, base);
      const pct = Math.round(((day.hrvSdnnMs - base.mean) / base.mean) * 100);
      parts.push({
        key: 'hrv',
        label: 'HRV',
        score: Math.round(scoreFromZ(z)),
        note: pct === 0 ? 'HRV at your baseline' : `HRV ${Math.abs(pct)}% ${pct > 0 ? 'above' : 'below'} your baseline`,
        weight: 30,
      });
    }
  }

  // Resting HR vs. baseline — elevated is a recovery red flag
  if (typeof day.restingHeartRate === 'number') {
    const base = baselineOf(column(days, (d) => d.restingHeartRate), index);
    if (base) {
      const z = zScore(day.restingHeartRate, base);
      const diff = Math.round(day.restingHeartRate - base.mean);
      parts.push({
        key: 'restingHr',
        label: 'Resting heart rate',
        score: Math.round(scoreFromZ(-z)),
        note: diff === 0 ? 'Resting HR at your baseline' : `Resting HR ${Math.abs(diff)} bpm ${diff > 0 ? 'above' : 'below'} your baseline`,
        weight: 25,
      });
    }
  }

  // Last night's sleep
  const sleep = computeSleep(days, index);
  if (sleep.score !== null) {
    parts.push({
      key: 'sleep',
      label: 'Sleep',
      score: sleep.score,
      note: day.sleep ? `Slept ${day.sleep.duration}h` : undefined,
      weight: 30,
    });
  }

  // Yesterday's strain — a heavy day lowers today's readiness
  if (index > 0) {
    const yesterday = computeStrain(days, index - 1);
    if (yesterday.score !== null) {
      parts.push({
        key: 'priorStrain',
        label: "Yesterday's strain",
        score: Math.round(clamp(100 - Math.max(0, yesterday.score - 50) * 1.5)),
        note: yesterday.score >= 70 ? `High strain yesterday (${yesterday.score})` : `Strain yesterday: ${yesterday.score}`,
        weight: 15,
      });
    }
  }

  if (parts.length === 0) {
    return { score: null, components: [], drivers: [] };
  }

  const totalWeight = parts.reduce((a, p) => a + p.weight, 0);
  let score = parts.reduce((a, p) => a + (p.score ?? 0) * p.weight, 0) / totalWeight;

  // Penalty modifiers: unusual respiratory rate or elevated wrist temperature
  // subtract from the blend rather than joining the weighted average.
  const penalties: ScoreComponent[] = [];
  if (typeof day.respiratoryRate === 'number') {
    const base = baselineOf(column(days, (d) => d.respiratoryRate), index);
    if (base) {
      const z = Math.abs(zScore(day.respiratoryRate, base));
      if (z > 1.5) {
        const penalty = Math.min((z - 1.5) * 6, 10);
        score -= penalty;
        penalties.push({
          key: 'respiratoryRate',
          label: 'Respiratory rate',
          score: null,
          note: `Breathing rate unusual vs. baseline (−${Math.round(penalty)} pts)`,
        });
      }
    }
  }
  if (typeof day.wristTempC === 'number') {
    const base = baselineOf(column(days, (d) => d.wristTempC), index);
    if (base) {
      const dev = day.wristTempC - base.mean;
      if (dev > 0.3) {
        const penalty = Math.min((dev - 0.3) * 20, 10);
        score -= penalty;
        penalties.push({
          key: 'wristTemp',
          label: 'Wrist temperature',
          score: null,
          note: `Wrist temp +${dev.toFixed(1)}°C above baseline (−${Math.round(penalty)} pts)`,
        });
      }
    }
  }

  // Weights stay on the components so attribution can decompose the blend.
  const components = [...parts, ...penalties];

  // Drivers: the weakest signals (or a positive note when everything is strong)
  const scored = parts.filter((p) => p.score !== null).sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
  const weak = scored.filter((p) => (p.score ?? 100) < 60).slice(0, 2);
  const drivers = weak.length > 0
    ? weak.map((p) => p.note ?? p.label)
    : ['All recovery signals look good today'];
  for (const p of penalties) if (p.note) drivers.push(p.note);

  return {
    score: Math.round(clamp(score)),
    components,
    drivers: drivers.slice(0, 3),
  };
}
