// Strain score (0-100): daily cardiovascular load vs. the user's own baseline.
// A typical day for the user lands around 45; hard training days push toward 100.

import { baselineOf, column } from './baselines';
import { clamp, type DayInput, type ScoreComponent, type StrainResult } from './types';

// Fallback denominators when a user has no baseline yet
const FALLBACK_ACTIVE_CAL = 400;
const FALLBACK_STEPS = 7000;

// Heart-rate zone bounds (bpm) - fixed, explainable thresholds for v1
const ZONE_BOUNDS: Array<{ zone: string; min: number; max: number; intensity: number }> = [
  { zone: 'Z1 · Easy', min: 0, max: 114, intensity: 1 },
  { zone: 'Z2 · Light', min: 114, max: 133, intensity: 1.5 },
  { zone: 'Z3 · Moderate', min: 133, max: 152, intensity: 2 },
  { zone: 'Z4 · Hard', min: 152, max: 171, intensity: 2.5 },
  { zone: 'Z5 · Max', min: 171, max: 300, intensity: 3 },
];

function zoneFor(avgHeartRate: number | undefined) {
  if (typeof avgHeartRate !== 'number') return null;
  return ZONE_BOUNDS.find((z) => avgHeartRate >= z.min && avgHeartRate < z.max) ?? null;
}

// Total active energy for a day: watch active calories plus hand-logged
// workouts. The watch already counts its own workouts, so only non-device
// entries are added on top - and a gym session logged without the watch
// still shows up here.
function effectiveActiveCalories(day: DayInput): { total: number; manual: number; hasWatch: boolean } | null {
  const manual = (day.workouts ?? [])
    .filter((w) => w.source !== 'device')
    .reduce((sum, w) => sum + (w.caloriesBurned ?? 0), 0);
  const hasWatch = typeof day.activeCalories === 'number';
  if (!hasWatch && manual <= 0) return null;
  return { total: (day.activeCalories ?? 0) + manual, manual, hasWatch };
}

export function computeStrain(days: DayInput[], index: number): StrainResult {
  const day = days[index];
  if (!day) return { score: null, zones: [], components: [] };

  const hasActivity =
    typeof day.activeCalories === 'number' ||
    typeof day.steps === 'number' ||
    (day.workouts?.length ?? 0) > 0;
  if (!hasActivity) return { score: null, zones: [], components: [] };

  const parts: Array<ScoreComponent & { weight: number; raw: number }> = [];

  // Active energy (watch + hand-logged workouts) vs. baseline
  const energy = effectiveActiveCalories(day);
  if (energy) {
    const base = baselineOf(
      column(days, (d) => effectiveActiveCalories(d)?.total),
      index
    );
    const denom = Math.max(base?.mean ?? FALLBACK_ACTIVE_CAL, 150);
    const ratio = Math.min(energy.total / denom, 2);
    const sourceNote = energy.manual > 0
      ? (energy.hasWatch ? ' (watch + logged workouts)' : ' (logged workouts)')
      : '';
    parts.push({
      key: 'activeCalories',
      label: 'Active energy',
      raw: ratio,
      score: Math.round(clamp(ratio * 50)),
      note: `${Math.round(energy.total)} kcal${sourceNote} vs. ~${Math.round(denom)} kcal typical`,
      weight: 45,
    });
  }

  // Steps vs. baseline
  if (typeof day.steps === 'number') {
    const base = baselineOf(column(days, (d) => d.steps), index);
    const denom = Math.max(base?.mean ?? FALLBACK_STEPS, 2000);
    const ratio = Math.min(day.steps / denom, 2);
    parts.push({
      key: 'steps',
      label: 'Steps',
      raw: ratio,
      score: Math.round(clamp(ratio * 50)),
      note: `${day.steps.toLocaleString()} steps vs. ~${Math.round(denom).toLocaleString()} typical`,
      weight: 25,
    });
  }

  // Workout load: minutes weighted by heart-rate intensity (90 intense-minutes ≈ full)
  const workouts = day.workouts ?? [];
  const zoneMinutes = new Map<string, number>();
  let load = 0;
  for (const w of workouts) {
    const zone = zoneFor(w.avgHeartRate);
    const intensity = zone?.intensity ?? 1.5;
    load += w.duration * intensity;
    if (zone) zoneMinutes.set(zone.zone, (zoneMinutes.get(zone.zone) ?? 0) + w.duration);
  }
  if (workouts.length > 0) {
    parts.push({
      key: 'workouts',
      label: 'Workouts',
      raw: load,
      score: Math.round(clamp((load / 90) * 100)),
      note: `${workouts.length} workout${workouts.length > 1 ? 's' : ''}, ${Math.round(load)} intensity-minutes`,
      weight: 30,
    });
  }

  const totalWeight = parts.reduce((a, p) => a + p.weight, 0);
  const score = totalWeight > 0
    ? Math.round(parts.reduce((a, p) => a + (p.score ?? 0) * p.weight, 0) / totalWeight)
    : null;

  const zones = ZONE_BOUNDS
    .map(({ zone }) => ({ zone, minutes: Math.round(zoneMinutes.get(zone) ?? 0) }))
    .filter((z) => z.minutes > 0);

  return {
    score,
    zones,
    // Weights stay on the components so attribution can decompose the blend.
    components: parts.map(({ raw: _r, ...c }) => c),
  };
}
