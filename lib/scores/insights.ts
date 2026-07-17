// Habit correlation insights: "On days with caffeine after 2pm, your next-day
// readiness averages 9 points lower." Patterns and trends only - no causal or
// medical claims. Requires at least 3 days with and 3 days without the habit.

import { HABIT_LABELS, type HabitKey } from '@/types';
import type { DayInput, HabitInsight } from './types';

const MIN_SAMPLES = 3;
const MIN_DELTA = 5;

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * A habit logged on day D is correlated with that night's sleep and the next
 * day's readiness - i.e. the scores at index D+1.
 */
export function computeInsights(
  days: DayInput[],
  scores: Array<{ readiness: number | null; sleep: number | null }>
): HabitInsight[] {
  const habitKeys = new Set<HabitKey>();
  for (const d of days) for (const h of d.habits ?? []) habitKeys.add(h);

  const insights: HabitInsight[] = [];

  for (const habit of habitKeys) {
    for (const metric of ['readiness', 'sleep'] as const) {
      const withHabit: number[] = [];
      const withoutHabit: number[] = [];

      for (let i = 0; i < days.length - 1; i++) {
        // The day series only contains logged dates - require true calendar
        // adjacency so a gap doesn't pair a habit with a much later outcome.
        if (Date.parse(days[i + 1].date) - Date.parse(days[i].date) !== 86_400_000) continue;
        const nextScore = scores[i + 1]?.[metric];
        if (nextScore === null || nextScore === undefined) continue;
        // Only compare against days where the user actually journaled,
        // otherwise "without" is polluted by unlogged days.
        if (!days[i].habits) continue;
        if (days[i].habits!.includes(habit)) withHabit.push(nextScore);
        else withoutHabit.push(nextScore);
      }

      if (withHabit.length < MIN_SAMPLES || withoutHabit.length < MIN_SAMPLES) continue;

      const delta = (mean(withHabit) ?? 0) - (mean(withoutHabit) ?? 0);
      if (Math.abs(delta) < MIN_DELTA) continue;

      const label = HABIT_LABELS[habit] ?? habit;
      const metricLabel = metric === 'readiness' ? 'next-day readiness' : 'sleep score';
      insights.push({
        habit,
        metric,
        delta: Math.round(delta),
        sampleWith: withHabit.length,
        sampleWithout: withoutHabit.length,
        text: `On days with ${label.toLowerCase()}, your ${metricLabel} averages ${Math.abs(Math.round(delta))} points ${delta < 0 ? 'lower' : 'higher'}.`,
      });
    }
  }

  // Strongest correlations first, max 5
  return insights.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 5);
}
