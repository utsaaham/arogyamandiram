// ============================================
// Priority engine - the single best action today
// ============================================
//
// Every candidate action carries a concrete number computed from the user's
// ACTUAL gap ("700 ml more water", "30 g more protein", "bed 45 min
// earlier"). Ranking is deterministic: base impact × gap severity × a
// personal multiplier from the correlation engine's effect sizes. The LLM
// only ever phrases the winner - it never picks it.

import type { FeatureInsight } from './correlations';

export interface PriorityInputs {
  waterMl: number | null;
  waterTargetMl: number | null;
  proteinG: number | null;
  proteinTargetG: number | null;
  sleepDurationH: number | null; // last night
  sleepTargetH: number | null;
  workoutDone: boolean;
  workoutTargetMin: number | null;
  steps: number | null;
  stepsTarget: number | null;
}

export interface PriorityAction {
  key: 'water' | 'protein' | 'sleep' | 'workout' | 'steps';
  title: string;
  /** The concrete instruction, always with the user's actual number. */
  detail: string;
  /** Why this one won, in plain words. */
  why: string;
}

interface Candidate extends PriorityAction {
  score: number;
}

/** Personal multiplier: 1 + |effect size| of the matching trigger, capped at 2×. */
function personalMultiplier(triggers: FeatureInsight[], featureKey: string): number {
  const t = triggers.find((x) => x.featureKey === featureKey);
  if (!t) return 1;
  return Math.min(2, 1 + Math.abs(t.effectSize));
}

export function computePriority(
  inputs: PriorityInputs,
  triggers: FeatureInsight[] = []
): PriorityAction | null {
  const candidates: Candidate[] = [];

  // Hydration gap
  if (inputs.waterTargetMl && inputs.waterTargetMl > 0 && inputs.waterMl !== null) {
    const gap = inputs.waterTargetMl - inputs.waterMl;
    if (gap >= 250) {
      const rounded = Math.round(gap / 50) * 50;
      candidates.push({
        key: 'water',
        title: 'Drink more water',
        detail: `${rounded.toLocaleString()} ml more water gets you to today's target.`,
        why: `You're at ${Math.round((inputs.waterMl / inputs.waterTargetMl) * 100)}% of your hydration target.`,
        score: 2 * (gap / inputs.waterTargetMl) * personalMultiplier(triggers, 'hydration'),
      });
    }
  }

  // Protein gap
  if (inputs.proteinTargetG && inputs.proteinTargetG > 0 && inputs.proteinG !== null) {
    const gap = inputs.proteinTargetG - inputs.proteinG;
    if (gap >= 15) {
      const rounded = Math.round(gap / 5) * 5;
      candidates.push({
        key: 'protein',
        title: 'Close the protein gap',
        detail: `About ${rounded} g more protein today hits your target.`,
        why: `You're at ${Math.round((inputs.proteinG / inputs.proteinTargetG) * 100)}% of your protein target.`,
        score: 2.5 * (gap / inputs.proteinTargetG) * personalMultiplier(triggers, 'protein'),
      });
    }
  }

  // Sleep debt → earlier bedtime tonight
  if (inputs.sleepTargetH && inputs.sleepTargetH > 0 && inputs.sleepDurationH !== null) {
    const debtH = inputs.sleepTargetH - inputs.sleepDurationH;
    if (debtH >= 0.5) {
      const minutes = Math.round((debtH * 60) / 15) * 15;
      candidates.push({
        key: 'sleep',
        title: 'Get to bed earlier',
        detail: `Be in bed about ${minutes} minutes earlier tonight to repay last night's short sleep.`,
        why: `Last night was ${inputs.sleepDurationH}h against a ${inputs.sleepTargetH}h need.`,
        score: 3 * (debtH / inputs.sleepTargetH) * personalMultiplier(triggers, 'sleepDuration'),
      });
    }
  }

  // Workout not done yet
  if (!inputs.workoutDone && inputs.workoutTargetMin && inputs.workoutTargetMin > 0) {
    candidates.push({
      key: 'workout',
      title: 'Fit in your session',
      detail: `A ${inputs.workoutTargetMin}-minute session still fits today.`,
      why: 'No workout logged yet today.',
      score: 2.5 * personalMultiplier(triggers, 'workout'),
    });
  }

  // Steps gap
  if (inputs.stepsTarget && inputs.stepsTarget > 0 && inputs.steps !== null) {
    const gap = inputs.stepsTarget - inputs.steps;
    if (gap >= 2000) {
      const rounded = Math.round(gap / 500) * 500;
      candidates.push({
        key: 'steps',
        title: 'Move a little more',
        detail: `About ${rounded.toLocaleString()} more steps reaches your daily target.`,
        why: `You're at ${Math.round((inputs.steps / inputs.stepsTarget) * 100)}% of your step target.`,
        score: 1.5 * (gap / inputs.stepsTarget) * personalMultiplier(triggers, 'steps'),
      });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  const { score: _s, ...winner } = candidates[0];
  return winner;
}
