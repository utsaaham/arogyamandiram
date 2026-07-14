// ============================================
// Attribution engine — exact per-component score decomposition
// ============================================
//
// Every Vitals score is a linear weighted blend of components (weights
// renormalize over the signals present), so attribution is exact arithmetic,
// not inference: contribution_i = score_i × weight_i / Σweights, penalties
// subtract directly. Day-over-day deltas come from comparing today's and
// yesterday's contributions per component key.
//
// Design rule for the whole lib/intelligence/ layer: the LLM never computes —
// it only phrases what this deterministic layer proved.

import type { ScoreComponent } from '@/lib/scores/types';

export interface ComponentContribution {
  key: string;
  label: string;
  /** The component's own 0-100 score (null for penalties). */
  componentScore: number | null;
  /** Share of the blend after renormalization, 0-100. Null for penalties. */
  weightPct: number | null;
  /** Points this component adds to the final score (negative for penalties). */
  contributionPts: number;
  note?: string;
}

export interface DayOverDayChange {
  /** Today's score minus yesterday's; null when either day is missing. */
  totalDelta: number | null;
  /** Per-component contribution change, biggest movers first. */
  byComponent: Array<{ key: string; label: string; deltaPts: number }>;
  /** One plain sentence naming the single biggest reason, or null. */
  biggestReason: string | null;
  /** 'up' | 'down' | 'flat' | null — the arrow the UI renders. */
  direction: 'up' | 'down' | 'flat' | null;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ScoreAttribution {
  score: number | null;
  contributions: ComponentContribution[];
  /** Penalty/annotation components (respiratory, wrist temp) — direct point hits. */
  penalties: ComponentContribution[];
  changeVsYesterday: DayOverDayChange;
  /** "12% above your normal" — today vs the mean of recent prior scores. */
  vsBaseline: { pct: number | null; phrase: string | null };
  /** Data confidence for this score, from signals present + history depth. */
  confidence: { level: ConfidenceLevel; reason: string };
  /** The one component with the most headroom × weight — the fastest lever. */
  fastestLever: { key: string; label: string; note: string } | null;
}

/** Extract "−7 pts"-style penalty magnitude from a penalty note, else 0. */
function penaltyPts(note?: string): number {
  const m = note?.match(/[−-](\d+(?:\.\d+)?)\s*pts?/);
  return m ? -Number(m[1]) : 0;
}

/** Decompose one day's components into exact point contributions. */
export function decompose(components: ScoreComponent[]): {
  contributions: ComponentContribution[];
  penalties: ComponentContribution[];
} {
  const weighted = components.filter((c) => typeof c.weight === 'number' && c.score !== null);
  const totalWeight = weighted.reduce((a, c) => a + (c.weight ?? 0), 0);

  const contributions: ComponentContribution[] = weighted.map((c) => {
    const share = totalWeight > 0 ? (c.weight ?? 0) / totalWeight : 0;
    return {
      key: c.key,
      label: c.label,
      componentScore: c.score,
      weightPct: Math.round(share * 100),
      contributionPts: Math.round((c.score ?? 0) * share * 10) / 10,
      note: c.note,
    };
  });

  const penalties: ComponentContribution[] = components
    .filter((c) => typeof c.weight !== 'number')
    .map((c) => ({
      key: c.key,
      label: c.label,
      componentScore: null,
      weightPct: null,
      contributionPts: penaltyPts(c.note),
      note: c.note,
    }));

  return { contributions, penalties };
}

function changeVsYesterday(
  todayScore: number | null,
  todayComponents: ScoreComponent[],
  yesterdayScore: number | null,
  yesterdayComponents: ScoreComponent[] | null
): DayOverDayChange {
  if (todayScore === null || yesterdayScore === null || !yesterdayComponents) {
    return { totalDelta: null, byComponent: [], biggestReason: null, direction: null };
  }

  const totalDelta = Math.round(todayScore - yesterdayScore);
  const today = decompose(todayComponents);
  const yesterday = decompose(yesterdayComponents);

  const keys = new Set([
    ...today.contributions.map((c) => c.key),
    ...yesterday.contributions.map((c) => c.key),
    ...today.penalties.map((c) => c.key),
    ...yesterday.penalties.map((c) => c.key),
  ]);

  const byComponent: Array<{ key: string; label: string; deltaPts: number }> = [];
  for (const key of keys) {
    const t = today.contributions.find((c) => c.key === key) ?? today.penalties.find((c) => c.key === key);
    const y = yesterday.contributions.find((c) => c.key === key) ?? yesterday.penalties.find((c) => c.key === key);
    const deltaPts = Math.round(((t?.contributionPts ?? 0) - (y?.contributionPts ?? 0)) * 10) / 10;
    if (deltaPts !== 0) {
      byComponent.push({ key, label: t?.label ?? y?.label ?? key, deltaPts });
    }
  }
  byComponent.sort((a, b) => Math.abs(b.deltaPts) - Math.abs(a.deltaPts));

  const biggest = byComponent[0] ?? null;
  const biggestReason = biggest
    ? `${biggest.label} ${biggest.deltaPts > 0 ? 'added' : 'cost'} ${Math.abs(Math.round(biggest.deltaPts))} points vs yesterday`
    : null;

  return {
    totalDelta,
    byComponent,
    biggestReason,
    direction: totalDelta > 1 ? 'up' : totalDelta < -1 ? 'down' : 'flat',
  };
}

/** "12% above your normal" from today's score vs recent prior scores. */
export function baselinePhrase(
  todayScore: number | null,
  priorScores: Array<number | null>,
  window = 14
): { pct: number | null; phrase: string | null } {
  if (todayScore === null) return { pct: null, phrase: null };
  const sample = priorScores.slice(-window).filter((s): s is number => s !== null);
  if (sample.length < 3) return { pct: null, phrase: null };
  const mean = sample.reduce((a, b) => a + b, 0) / sample.length;
  if (mean <= 0) return { pct: null, phrase: null };
  const pct = Math.round(((todayScore - mean) / mean) * 100);
  const phrase = pct === 0
    ? 'right at your normal'
    : `${Math.abs(pct)}% ${pct > 0 ? 'above' : 'below'} your normal`;
  return { pct, phrase };
}

/** Confidence from signals present today + how much history backs the baseline. */
export function confidenceFor(
  componentsPresent: number,
  priorDaysWithScore: number
): { level: ConfidenceLevel; reason: string } {
  if (componentsPresent >= 3 && priorDaysWithScore >= 10) {
    return { level: 'high', reason: `${componentsPresent} signals, ${priorDaysWithScore} days of history` };
  }
  if (componentsPresent >= 2 && priorDaysWithScore >= 5) {
    return { level: 'medium', reason: `${componentsPresent} signals, ${priorDaysWithScore} days of history` };
  }
  return {
    level: 'low',
    reason: componentsPresent < 2
      ? 'few signals available today'
      : 'limited history so far',
  };
}

/** The component where improvement moves the score most: headroom × weight share. */
function fastestLever(contributions: ComponentContribution[]): ScoreAttribution['fastestLever'] {
  let best: { c: ComponentContribution; gain: number } | null = null;
  for (const c of contributions) {
    if (c.componentScore === null || c.weightPct === null) continue;
    const headroom = 100 - c.componentScore;
    const gain = (headroom * c.weightPct) / 100;
    if (gain > 0 && (!best || gain > best.gain)) best = { c, gain };
  }
  if (!best || best.gain < 2) return null;
  return {
    key: best.c.key,
    label: best.c.label,
    note: `Improving ${best.c.label} has the most room to lift this score (up to ~${Math.round(best.gain)} pts)`,
  };
}

/**
 * Full attribution for one score on one day, judged against yesterday and its
 * own recent history.
 */
export function attributeScore(params: {
  todayScore: number | null;
  todayComponents: ScoreComponent[];
  yesterdayScore: number | null;
  yesterdayComponents: ScoreComponent[] | null;
  priorScores: Array<number | null>;
}): ScoreAttribution {
  const { contributions, penalties } = decompose(params.todayComponents);
  const priorDaysWithScore = params.priorScores.filter((s) => s !== null).length;

  return {
    score: params.todayScore,
    contributions: [...contributions].sort((a, b) => b.contributionPts - a.contributionPts),
    penalties,
    changeVsYesterday: changeVsYesterday(
      params.todayScore,
      params.todayComponents,
      params.yesterdayScore,
      params.yesterdayComponents
    ),
    vsBaseline: baselinePhrase(params.todayScore, params.priorScores),
    confidence: confidenceFor(contributions.length, priorDaysWithScore),
    fastestLever: fastestLever(contributions),
  };
}
