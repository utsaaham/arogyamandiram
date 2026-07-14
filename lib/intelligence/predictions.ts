// ============================================
// Predictions - deterministic first, honestly gated
// ============================================
//
// Goal ETA from the least-squares weight slope, goal confidence from
// consistency × trend agreement, burnout risk from rising strain + falling
// HRV + sleep debt, and a recovery forecast (sleep needed tonight). Every
// prediction states its basis; when the data can't support one, it says so
// plainly instead of guessing.

import type { Goal } from '@/types';
import type { WeightTrendResult } from '@/lib/weightTrend';
import type { VitalsTrendPoint } from '@/lib/scores';
import type { ConsistencyScores } from './features';

export interface GoalEta {
  available: boolean;
  etaWeeks: number | null;
  etaDate: string | null;
  text: string;
}

export interface GoalConfidence {
  level: 'high' | 'medium' | 'low' | null;
  reason: string;
}

export interface BurnoutRisk {
  level: 'low' | 'moderate' | 'high' | null;
  factors: string[];
  reason: string;
}

export interface RecoveryForecast {
  sleepNeedHours: number | null;
  text: string;
}

export interface Predictions {
  goalEta: GoalEta;
  goalConfidence: GoalConfidence;
  burnoutRisk: BurnoutRisk;
  recoveryForecast: RecoveryForecast;
}

const SLEEP_NEED_HOURS = 8;

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Weeks to reach targetWeight at the current slope; honest gating throughout. */
export function computeGoalEta(
  goal: Goal,
  weightTrend: WeightTrendResult,
  currentWeightKg: number | null,
  targetWeightKg: number | null,
  todayISO: string
): GoalEta {
  const unavailable = (text: string): GoalEta => ({ available: false, etaWeeks: null, etaDate: null, text });

  if (goal !== 'lose_fat' && goal !== 'build_muscle') {
    return unavailable('ETA applies to weight-direction goals; yours is about composition and consistency.');
  }
  if (currentWeightKg === null || targetWeightKg === null || targetWeightKg <= 0) {
    return unavailable('Set a target weight to see an ETA.');
  }
  if (weightTrend.trend === 'unknown' || weightTrend.slopeKgPerWeek === null) {
    return unavailable(`Log your weight a few more times (${weightTrend.samples}/3 recent readings) and the ETA unlocks.`);
  }

  const gapKg = targetWeightKg - currentWeightKg; // negative = need to lose
  if (Math.abs(gapKg) <= 0.5) {
    return unavailable('You are already at your target weight.');
  }

  const slope = weightTrend.slopeKgPerWeek;
  const movingTowardTarget = Math.sign(slope) === Math.sign(gapKg) && Math.abs(slope) >= 0.1;
  if (!movingTowardTarget) {
    return unavailable(
      `At the current trend (${slope > 0 ? '+' : ''}${slope} kg/week) you're not moving toward your target yet.`
    );
  }

  const weeks = Math.abs(gapKg / slope);
  if (weeks > 52) {
    return unavailable('At the current pace this is more than a year out - the trend will sharpen the estimate as you go.');
  }

  const etaWeeks = Math.round(weeks * 10) / 10;
  const eta = new Date(todayISO);
  eta.setDate(eta.getDate() + Math.round(weeks * 7));
  const etaDate = eta.toISOString().slice(0, 10);
  return {
    available: true,
    etaWeeks,
    etaDate,
    text: `At your current pace (${slope > 0 ? '+' : ''}${slope} kg/week) you reach ${targetWeightKg} kg in about ${Math.round(etaWeeks)} week${Math.round(etaWeeks) === 1 ? '' : 's'}.`,
  };
}

/** Confidence = behavior consistency × whether the scale agrees with the goal. */
export function computeGoalConfidence(
  goal: Goal,
  weightTrend: WeightTrendResult,
  consistency: ConsistencyScores
): GoalConfidence {
  const parts = [consistency.workoutPct, consistency.proteinPct, consistency.sleepPct]
    .filter((v): v is number => v !== null);
  if (parts.length === 0) {
    return { level: null, reason: 'Not enough logged behavior yet to judge confidence.' };
  }
  const behaviorScore = parts.reduce((a, b) => a + b, 0) / parts.length;

  const wantsLoss = goal === 'lose_fat';
  const wantsGain = goal === 'build_muscle';
  const trendAgrees =
    (wantsLoss && weightTrend.trend === 'losing') ||
    (wantsGain && weightTrend.trend === 'gaining') ||
    (!wantsLoss && !wantsGain && weightTrend.trend !== 'unknown');

  let level: 'high' | 'medium' | 'low';
  if (behaviorScore >= 70 && trendAgrees) level = 'high';
  else if (behaviorScore >= 40 || trendAgrees) level = 'medium';
  else level = 'low';

  const reason = `Behavior consistency ${Math.round(behaviorScore)}%${
    weightTrend.trend !== 'unknown'
      ? `, and the scale trend (${weightTrend.trend}) ${trendAgrees ? 'agrees with' : 'conflicts with'} your goal`
      : ''
  }.`;
  return { level, reason };
}

/** Rising strain + falling HRV + accumulating sleep debt over ~2 weeks. */
export function computeBurnoutRisk(trends: VitalsTrendPoint[]): BurnoutRisk {
  const recent = trends.slice(-14);
  if (recent.length < 8) {
    return { level: null, factors: [], reason: 'Needs about two weeks of data to assess.' };
  }
  const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
  const secondHalf = recent.slice(Math.floor(recent.length / 2));

  const factors: string[] = [];

  const strainA = mean(firstHalf.map((t) => t.strain).filter((v): v is number => v !== null));
  const strainB = mean(secondHalf.map((t) => t.strain).filter((v): v is number => v !== null));
  if (strainA !== null && strainB !== null && strainB - strainA >= 8) {
    factors.push(`strain climbing (${Math.round(strainA)} → ${Math.round(strainB)})`);
  }

  const hrvA = mean(firstHalf.map((t) => t.hrvSdnnMs).filter((v): v is number => v !== null));
  const hrvB = mean(secondHalf.map((t) => t.hrvSdnnMs).filter((v): v is number => v !== null));
  if (hrvA !== null && hrvB !== null && hrvA > 0 && (hrvA - hrvB) / hrvA >= 0.08) {
    factors.push(`HRV drifting down (~${Math.round(((hrvA - hrvB) / hrvA) * 100)}%)`);
  }

  const sleepScores = secondHalf.map((t) => t.sleep).filter((v): v is number => v !== null);
  const sleepMean = mean(sleepScores);
  if (sleepMean !== null && sleepMean < 60) {
    factors.push('sleep running short this week');
  }

  const level = factors.length >= 2 ? 'high' : factors.length === 1 ? 'moderate' : 'low';
  const reason = factors.length > 0
    ? `Signals: ${factors.join('; ')}.`
    : 'Load, recovery and sleep all look sustainable right now.';
  return { level, factors, reason };
}

/** Inverted readiness: how much sleep tonight to be push-ready tomorrow. */
export function computeRecoveryForecast(
  recentSleepHours: Array<number | null>
): RecoveryForecast {
  const nights = recentSleepHours.slice(-3).filter((v): v is number => v !== null && v > 0);
  if (nights.length === 0) {
    return { sleepNeedHours: null, text: 'Log sleep for a night or two and the forecast unlocks.' };
  }
  const debt = nights.reduce((a, h) => a + Math.max(0, SLEEP_NEED_HOURS - h), 0);
  const needed = Math.min(10, Math.max(6.5, SLEEP_NEED_HOURS + Math.min(debt * 0.5, 2)));
  const rounded = Math.round(needed * 2) / 2;
  return {
    sleepNeedHours: rounded,
    text: debt >= 1
      ? `You're carrying ~${Math.round(debt * 10) / 10}h of sleep debt - about ${rounded}h tonight sets up a push-ready tomorrow.`
      : `Little sleep debt - around ${rounded}h tonight keeps you push-ready.`,
  };
}
