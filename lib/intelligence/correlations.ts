// ============================================
// Correlation & triggers engine - generalizes habit insights to ALL features
// ============================================
//
// Binarizes each continuous feature (vs its median, or vs 100% for
// %-of-target features), then compares outcome scores on high vs low days.
// Guardrails from the original habit-insights engine are kept: at least 3
// samples on each side and a minimum 5-point delta - the engine stays silent
// on noise. Every insight carries sample counts → surfaced confidence.
// Compound patterns come from fixed rule templates (never free-form mining).
// Correlation, not causation - phrased accordingly in the UI.

import type { DailyFeatureRow } from './features';
import type { ConfidenceLevel } from './attribution';

const MIN_SAMPLES = 3;
const MIN_DELTA = 5;

export type OutcomeKey = 'readiness' | 'sleep';

export interface FeatureInsight {
  featureKey: string;
  featureLabel: string;
  outcome: OutcomeKey;
  /** Outcome mean on "high/true" days minus "low/false" days. */
  delta: number;
  /** delta / std(outcome) - comparable across features for trigger ranking. */
  effectSize: number;
  sampleHigh: number;
  sampleLow: number;
  confidence: ConfidenceLevel;
  text: string;
}

export interface CompoundInsight {
  key: string;
  outcome: OutcomeKey;
  delta: number;
  sampleWith: number;
  sampleWithout: number;
  confidence: ConfidenceLevel;
  text: string;
}

export interface CorrelationResults {
  insights: FeatureInsight[];
  /** Ranked by |effectSize| - "for you, sleep moves recovery 3× more than protein". */
  triggers: FeatureInsight[];
  compound: CompoundInsight[];
}

interface FeatureSpec {
  key: string;
  label: string;
  /** Extract the raw value; null = not tracked that day. */
  value: (r: DailyFeatureRow) => number | boolean | null;
  /** 'target100' splits at 100%; 'median' splits at the observed median; booleans use identity. */
  split: 'median' | 'target100' | 'boolean';
  /** Phrase for the "high/true" side, e.g. "protein at target". */
  highPhrase: string;
  lowPhrase: string;
}

const FEATURES: FeatureSpec[] = [
  { key: 'protein', label: 'Protein', value: (r) => r.proteinPctOfTarget, split: 'target100', highPhrase: 'protein at target', lowPhrase: 'protein under target' },
  { key: 'hydration', label: 'Hydration', value: (r) => r.hydrationPctOfTarget, split: 'target100', highPhrase: 'hydration at target', lowPhrase: 'hydration under target' },
  { key: 'calories', label: 'Calories', value: (r) => r.caloriePctOfTarget, split: 'target100', highPhrase: 'calories at or above target', lowPhrase: 'calories under target' },
  { key: 'sleepDuration', label: 'Sleep duration', value: (r) => r.sleepDurationH, split: 'median', highPhrase: 'longer-than-usual sleep', lowPhrase: 'shorter-than-usual sleep' },
  { key: 'bedtime', label: 'Bedtime', value: (r) => r.bedtimeMin, split: 'median', highPhrase: 'later-than-usual bedtime', lowPhrase: 'earlier-than-usual bedtime' },
  { key: 'lateMeal', label: 'Last meal time', value: (r) => r.lastMealMin, split: 'median', highPhrase: 'later last meal', lowPhrase: 'earlier last meal' },
  { key: 'strainLoad', label: 'Strain load', value: (r) => r.strainLoadKcal, split: 'median', highPhrase: 'higher training load', lowPhrase: 'lighter training load' },
  { key: 'steps', label: 'Steps', value: (r) => r.steps, split: 'median', highPhrase: 'more steps than usual', lowPhrase: 'fewer steps than usual' },
  { key: 'workout', label: 'Workout', value: (r) => r.workoutDone, split: 'boolean', highPhrase: 'a workout', lowPhrase: 'no workout' },
  // Long-term rhythm: weekend vs weekday pattern
  { key: 'weekend', label: 'Weekend', value: (r) => r.isWeekend, split: 'boolean', highPhrase: 'weekends', lowPhrase: 'weekdays' },
];

export function confidenceFromSamples(minSide: number): ConfidenceLevel {
  if (minSide >= 10) return 'high';
  if (minSide >= 5) return 'medium';
  return 'low';
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function std(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const OUTCOME_LABELS: Record<OutcomeKey, string> = {
  readiness: 'next-day readiness',
  sleep: 'sleep score',
};

/**
 * Correlate every feature on day i with the outcome scores at day i+1
 * (same convention as the habit engine: a behavior affects that night's
 * sleep and the next morning's readiness).
 */
export function computeCorrelations(
  rows: DailyFeatureRow[],
  outcomes: Array<{ readiness: number | null; sleep: number | null }>
): CorrelationResults {
  const insights: FeatureInsight[] = [];

  for (const outcome of ['readiness', 'sleep'] as const) {
    const allOutcomeValues = outcomes
      .map((o) => o[outcome])
      .filter((v): v is number => v !== null);
    const outcomeStd = std(allOutcomeValues);

    for (const spec of FEATURES) {
      // Pair feature day i with outcome day i+1.
      const pairs: Array<{ raw: number | boolean; score: number }> = [];
      for (let i = 0; i < rows.length - 1; i++) {
        const raw = spec.value(rows[i]);
        const score = outcomes[i + 1]?.[outcome];
        if (raw === null || score === null || score === undefined) continue;
        pairs.push({ raw, score });
      }
      if (pairs.length < MIN_SAMPLES * 2) continue;

      let high: number[] = [];
      let low: number[] = [];
      if (spec.split === 'boolean') {
        high = pairs.filter((p) => p.raw === true).map((p) => p.score);
        low = pairs.filter((p) => p.raw === false).map((p) => p.score);
      } else {
        const numeric = pairs.filter((p): p is { raw: number; score: number } => typeof p.raw === 'number');
        const cut = spec.split === 'target100' ? 100 : median(numeric.map((p) => p.raw));
        high = numeric.filter((p) => p.raw >= cut).map((p) => p.score);
        low = numeric.filter((p) => p.raw < cut).map((p) => p.score);
      }

      if (high.length < MIN_SAMPLES || low.length < MIN_SAMPLES) continue;
      const delta = mean(high) - mean(low);
      if (Math.abs(delta) < MIN_DELTA) continue;

      const effectSize = outcomeStd > 0 ? delta / outcomeStd : 0;
      const better = delta > 0;
      insights.push({
        featureKey: spec.key,
        featureLabel: spec.label,
        outcome,
        delta: Math.round(delta),
        effectSize: Math.round(effectSize * 100) / 100,
        sampleHigh: high.length,
        sampleLow: low.length,
        confidence: confidenceFromSamples(Math.min(high.length, low.length)),
        text: `On days with ${spec.highPhrase}, your ${OUTCOME_LABELS[outcome]} averages ${Math.abs(Math.round(delta))} points ${better ? 'higher' : 'lower'} than days with ${spec.lowPhrase}.`,
      });
    }
  }

  insights.sort((a, b) => Math.abs(b.effectSize) - Math.abs(a.effectSize));

  return {
    insights: insights.slice(0, 10),
    triggers: insights.slice(0, 5),
    compound: computeCompound(rows, outcomes),
  };
}

// ── Compound patterns: fixed 2-feature rule templates ────────────────────────

interface CompoundTemplate {
  key: string;
  outcome: OutcomeKey;
  when: (r: DailyFeatureRow) => boolean | null; // null = one of the inputs untracked
  phrase: string;
}

const COMPOUND_TEMPLATES: CompoundTemplate[] = [
  {
    key: 'shortSleep+highLoad',
    outcome: 'readiness',
    when: (r) => (r.sleepDurationH === null || r.strainLoadKcal === null)
      ? null
      : r.sleepDurationH < 6.5 && r.strainLoadKcal > 400,
    phrase: 'short sleep combined with a heavy training day',
  },
  {
    key: 'lateMeal+lateBed',
    outcome: 'sleep',
    when: (r) => (r.lastMealMin === null || r.bedtimeMin === null)
      ? null
      : r.lastMealMin > 540 /* after ~21:00 */ && r.bedtimeMin > 690 /* after ~23:30 */,
    phrase: 'a late meal followed by a late bedtime',
  },
  {
    key: 'lowProtein+workout',
    outcome: 'readiness',
    when: (r) => (r.proteinPctOfTarget === null)
      ? null
      : r.workoutDone && r.proteinPctOfTarget < 80,
    phrase: 'training days with protein well under target',
  },
];

function computeCompound(
  rows: DailyFeatureRow[],
  outcomes: Array<{ readiness: number | null; sleep: number | null }>
): CompoundInsight[] {
  const results: CompoundInsight[] = [];
  for (const tpl of COMPOUND_TEMPLATES) {
    const withPattern: number[] = [];
    const withoutPattern: number[] = [];
    for (let i = 0; i < rows.length - 1; i++) {
      const flag = tpl.when(rows[i]);
      const score = outcomes[i + 1]?.[tpl.outcome];
      if (flag === null || score === null || score === undefined) continue;
      (flag ? withPattern : withoutPattern).push(score);
    }
    if (withPattern.length < MIN_SAMPLES || withoutPattern.length < MIN_SAMPLES) continue;
    const delta = mean(withPattern) - mean(withoutPattern);
    if (Math.abs(delta) < MIN_DELTA) continue;
    results.push({
      key: tpl.key,
      outcome: tpl.outcome,
      delta: Math.round(delta),
      sampleWith: withPattern.length,
      sampleWithout: withoutPattern.length,
      confidence: confidenceFromSamples(Math.min(withPattern.length, withoutPattern.length)),
      text: `After ${tpl.phrase}, your ${OUTCOME_LABELS[tpl.outcome]} averages ${Math.abs(Math.round(delta))} points ${delta > 0 ? 'higher' : 'lower'}.`,
    });
  }
  return results.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}
