// ============================================
// Goals — user-owned goal enum, normalization, calorie adjustment
// ============================================
//
// The user picks one of five goals; the system never overwrites it. The old
// auto-derivation from weight vs targetWeight lives on only as a read-only
// trend signal (deriveGoalDirection in app/api/ai/daily-plan/shared.ts).
// Stored documents may still hold legacy 3-value strings ('lose' | 'maintain'
// | 'gain') — normalize on read, never migrate data.

import type { Goal, LegacyGoal } from '@/types';

export const GOALS: readonly Goal[] = [
  'lose_fat',
  'build_muscle',
  'recomp',
  'improve_fitness',
  'maintain',
];

/** Shared option list for goal selectors (settings, onboarding). */
export const GOAL_OPTIONS: ReadonlyArray<{ value: Goal; label: string; desc: string }> = [
  { value: 'lose_fat', label: 'Lose Fat', desc: 'Calorie deficit with high protein to keep muscle' },
  { value: 'build_muscle', label: 'Build Muscle', desc: 'Calorie surplus focused on strength training' },
  { value: 'recomp', label: 'Recomposition', desc: 'Lose fat and build muscle at the same time' },
  { value: 'improve_fitness', label: 'Improve Fitness', desc: 'Conditioning and performance at maintenance calories' },
  { value: 'maintain', label: 'Maintain', desc: 'Hold current weight and stay consistent' },
];

const LEGACY_TO_GOAL: Record<string, Goal> = {
  lose: 'lose_fat',
  lose_weight: 'lose_fat',
  fat_loss: 'lose_fat',
  gain: 'build_muscle',
  gain_weight: 'build_muscle',
  muscle_gain: 'build_muscle',
  bulk: 'build_muscle',
};

export function isGoal(value: unknown): value is Goal {
  return typeof value === 'string' && (GOALS as readonly string[]).includes(value);
}

/** True when the input is settable via the API: the new enum or a known legacy string. */
export function isAcceptedGoalInput(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const v = value.toLowerCase().trim();
  return isGoal(v) || v in LEGACY_TO_GOAL;
}

/** Map any stored/inbound goal string to the 5-value enum. Unknown or missing → 'maintain'. */
export function normalizeGoal(value?: string | null): Goal {
  if (!value) return 'maintain';
  const v = value.toLowerCase().trim();
  if (isGoal(v)) return v;
  return LEGACY_TO_GOAL[v] ?? 'maintain';
}

/** Legacy 3-value direction emitted for old clients (read-only alias). */
export function goalToLegacyDirection(goal: Goal): LegacyGoal {
  if (goal === 'lose_fat') return 'lose';
  if (goal === 'build_muscle') return 'gain';
  return 'maintain';
}

/**
 * Daily calorie adjustment (kcal vs TDEE) for a goal.
 *
 * Recomp is dynamic, not a constant: slight deficit when body fat is high
 * (>20% M / >28% F), slight surplus when lean (<15% M / <23% F), else
 * maintenance. Falls back to 0 when body fat is unset. Gender 'other' or
 * missing uses the female thresholds (more conservative).
 */
export function goalCalorieAdjustment(
  goal: Goal,
  profile?: { bodyFat?: number | null; gender?: string | null }
): number {
  switch (goal) {
    case 'lose_fat':
      return -500; // ~0.5 kg/week loss
    case 'build_muscle':
      return 400; // ~0.35 kg/week gain
    case 'recomp': {
      const bodyFat = profile?.bodyFat;
      if (typeof bodyFat !== 'number' || !Number.isFinite(bodyFat)) return 0;
      const male = profile?.gender === 'male';
      const highCut = male ? 20 : 28;
      const leanCut = male ? 15 : 23;
      if (bodyFat > highCut) return -200;
      if (bodyFat < leanCut) return 150;
      return 0;
    }
    default:
      return 0; // improve_fitness, maintain
  }
}
