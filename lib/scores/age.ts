// ArogyaM Age: an estimate of how old the body behaves, WHOOP-Age style.
// Starts from the user's calendar age and shifts it by how their recent
// metrics (VO2max, resting HR, HRV, sleep, activity, BMI) compare to
// age-expected norms. Unlike the other scores, which judge each day against
// the user's own baseline, this one needs population reference curves, so the
// norms below are deliberately simple, documented approximations.
//
// Wellness framing only: this is an estimate, not a diagnosis.

import { bedtimeMinutes } from './baselines';
import type { DayInput } from './types';
import { round1 } from './types';

/** Profile slice the age model needs (all optional; missing data just drops components). */
export interface AgeProfileInput {
  age?: number;
  dateOfBirth?: string | Date;
  gender?: 'male' | 'female' | 'other';
  heightCm?: number;
  weightKg?: number;
}

export interface AgeComponent {
  key: string;
  label: string;
  /** Years added (+) or subtracted (-) from calendar age; null when unavailable */
  yearsDelta: number | null;
  note: string;
  weight: number;
}

export interface ArogyamAgeResult {
  /** The ArogyaM Age, one decimal; null when it can't be computed yet */
  age: number | null;
  chronologicalAge: number | null;
  /** age - chronologicalAge; negative means younger than calendar age */
  delta: number | null;
  components: AgeComponent[];
  confidence: 'low' | 'medium' | 'high';
  /** The component adding the most years, with a concrete way to move it */
  bestLever: { label: string; note: string } | null;
  /** Why the age is null, when it is */
  missingReason: string | null;
}

const WINDOW_DAYS = 30;
const MAX_TOTAL_DELTA = 12;
const MIN_AGE = 18;

function chronologicalAgeOf(profile: AgeProfileInput): number | null {
  if (typeof profile.age === 'number' && profile.age >= 13) return profile.age;
  if (profile.dateOfBirth) {
    const dob = new Date(profile.dateOfBirth);
    if (!Number.isNaN(dob.getTime())) {
      const years = (Date.now() - dob.getTime()) / (365.25 * 86_400_000);
      if (years >= 13 && years <= 120) return Math.floor(years);
    }
  }
  return null;
}

function windowValues(days: DayInput[], pick: (d: DayInput) => number | undefined): number[] {
  const out: number[] = [];
  for (const d of days.slice(-WINDOW_DAYS)) {
    const v = pick(d);
    if (typeof v === 'number' && Number.isFinite(v)) out.push(v);
  }
  return out;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function std(values: number[]): number | null {
  const m = mean(values);
  if (m === null || values.length < 2) return null;
  return Math.sqrt(values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length);
}

function clampYears(v: number, lo: number, hi: number): number {
  return round1(Math.min(hi, Math.max(lo, v)));
}

// Expected VO2max (ml/kg/min) by age, approximating ACSM population means:
// declines roughly 0.35-0.4 per year from a young-adult peak. 'other' or
// unknown sex uses the midpoint of the two curves.
function expectedVo2(age: number, gender?: string): { intercept: number; slope: number } {
  if (gender === 'male') return { intercept: 56, slope: 0.37 };
  if (gender === 'female') return { intercept: 47, slope: 0.31 };
  return { intercept: 51.5, slope: 0.34 };
}

// Expected HRV (SDNN, ms) by age: roughly 65 ms in the early 20s falling to
// ~35 ms around 60. Modeled as 80 - 0.75*age, floored at 20 ms.
const HRV_INTERCEPT = 80;
const HRV_SLOPE = 0.75;

const LEVER_NOTES: Record<string, string> = {
  vo2: 'Cardio moves this fastest: 2-3 zone-2 sessions a week, plus one harder interval day.',
  restingHr: 'Consistent cardio and better sleep bring resting HR down over a few weeks.',
  hrv: 'HRV responds to sleep regularity, easier training weeks, and less late food and alcohol.',
  sleep: 'Aim for 7-9 hours with a bedtime that stays within about an hour night to night.',
  activity: 'Work toward 150 active minutes a week; even brisk walking counts.',
  bmi: 'A small, steady calorie deficit with enough protein moves BMI the healthy way.',
};

/**
 * Compute ArogyaM Age from the recent day series plus profile.
 *
 * @param days     Day inputs sorted ascending by date (same series the other
 *                 scores use). The last WINDOW_DAYS entries are considered.
 * @param profile  Age/sex/height/weight slice of the user profile. Missing
 *                 fields just drop their components; without an age or date
 *                 of birth the result carries a missingReason instead.
 */
export function computeArogyamAge(days: DayInput[], profile: AgeProfileInput): ArogyamAgeResult {
  const chronoAge = chronologicalAgeOf(profile);
  const components: AgeComponent[] = [];

  // Cardio fitness via VO2max: strongest single signal we have.
  const vo2 = mean(windowValues(days, (d) => d.vo2Max));
  if (vo2 !== null && chronoAge !== null) {
    const { intercept, slope } = expectedVo2(chronoAge, profile.gender);
    const fitnessAge = Math.min(80, Math.max(MIN_AGE, (intercept - vo2) / slope));
    components.push({
      key: 'vo2',
      label: 'Cardio fitness',
      yearsDelta: clampYears((fitnessAge - chronoAge) * 0.9, -12, 12),
      note: `VO₂max ${round1(vo2)} reads like a fitness age of ~${Math.round(fitnessAge)}`,
      weight: 30,
    });
  }

  // Resting heart rate vs. a healthy adult band centered on ~62 bpm.
  const rhr = mean(windowValues(days, (d) => d.restingHeartRate));
  if (rhr !== null) {
    components.push({
      key: 'restingHr',
      label: 'Resting heart rate',
      yearsDelta: clampYears((rhr - 62) * 0.25, -6, 8),
      note: `Resting HR averaging ${Math.round(rhr)} bpm over the last month`,
      weight: 15,
    });
  }

  // HRV vs. the age-expected SDNN curve.
  const hrv = mean(windowValues(days, (d) => d.hrvSdnnMs));
  if (hrv !== null && chronoAge !== null) {
    const hrvAge = Math.min(80, Math.max(MIN_AGE, (HRV_INTERCEPT - hrv) / HRV_SLOPE));
    components.push({
      key: 'hrv',
      label: 'HRV',
      yearsDelta: clampYears((hrvAge - chronoAge) * 0.5, -8, 8),
      note: `HRV averaging ${Math.round(hrv)} ms vs ~${Math.round(HRV_INTERCEPT - HRV_SLOPE * chronoAge)} ms expected at ${chronoAge}`,
      weight: 15,
    });
  }

  // Sleep: duration in the 7-9h band plus bedtime consistency.
  const sleepDurations = windowValues(days, (d) => d.sleep?.duration);
  const avgSleep = mean(sleepDurations);
  if (avgSleep !== null) {
    let years: number;
    if (avgSleep >= 7 && avgSleep <= 9) years = -1.5;
    else if (avgSleep >= 6) years = 1; // mildly short or long (>9h lands here too)
    else years = 3;

    const bedtimes = days
      .slice(-WINDOW_DAYS)
      .map((d) => (d.sleep ? bedtimeMinutes(d.sleep.bedtime) : null))
      .filter((v): v is number => v !== null);
    const bedtimeStd = std(bedtimes);
    let consistencyNote = '';
    if (bedtimeStd !== null) {
      if (bedtimeStd <= 45) { years -= 1; consistencyNote = ', very consistent bedtime'; }
      else if (bedtimeStd >= 90) { years += 1; consistencyNote = ', bedtime varies a lot'; }
    }
    components.push({
      key: 'sleep',
      label: 'Sleep',
      yearsDelta: clampYears(years, -2.5, 4),
      note: `Averaging ${round1(avgSleep)}h a night${consistencyNote}`,
      weight: 15,
    });
  }

  // Activity: weekly workout minutes against the 150-minute guideline, plus steps.
  const recentDays = days.slice(-WINDOW_DAYS);
  const daysSpan = Math.max(7, recentDays.length);
  const totalWorkoutMin = recentDays.reduce(
    (sum, d) => sum + (d.workouts ?? []).reduce((a, w) => a + (w.duration || 0), 0),
    0
  );
  const weeklyMin = (totalWorkoutMin / daysSpan) * 7;
  const avgSteps = mean(windowValues(days, (d) => d.steps));
  if (totalWorkoutMin > 0 || avgSteps !== null) {
    let years: number;
    if (weeklyMin >= 150) years = -2.5;
    else if (weeklyMin >= 75) years = -1;
    else if (weeklyMin > 0) years = 1;
    else years = 3;
    if (avgSteps !== null) {
      if (avgSteps >= 8000) years -= 1;
      else if (avgSteps < 4000) years += 1;
    }
    const stepsNote = avgSteps !== null ? `, ~${Math.round(avgSteps / 100) * 100} steps/day` : '';
    components.push({
      key: 'activity',
      label: 'Activity',
      yearsDelta: clampYears(years, -3.5, 4),
      note: `~${Math.round(weeklyMin)} workout minutes a week${stepsNote}`,
      weight: 15,
    });
  }

  // Body composition via BMI from the profile.
  if (typeof profile.heightCm === 'number' && profile.heightCm > 0 && typeof profile.weightKg === 'number') {
    const bmi = profile.weightKg / (profile.heightCm / 100) ** 2;
    let years: number;
    if (bmi >= 18.5 && bmi < 25) years = -1;
    else if (bmi < 18.5) years = 1.5;
    else if (bmi < 30) years = 1.5;
    else if (bmi < 35) years = 3;
    else years = 5;
    components.push({
      key: 'bmi',
      label: 'Body composition',
      yearsDelta: clampYears(years, -1, 5),
      note: `BMI ${round1(bmi)}`,
      weight: 10,
    });
  }

  if (chronoAge === null) {
    return {
      age: null, chronologicalAge: null, delta: null, components,
      confidence: 'low', bestLever: null,
      missingReason: 'Add your age or date of birth in Settings to unlock ArogyaM Age.',
    };
  }
  if (components.length === 0) {
    return {
      age: null, chronologicalAge: chronoAge, delta: null, components,
      confidence: 'low', bestLever: null,
      missingReason: 'Log workouts and sleep, or sync health data from the iOS app, and your ArogyaM Age will appear.',
    };
  }

  const totalWeight = components.reduce((a, c) => a + c.weight, 0);
  const rawDelta = components.reduce((a, c) => a + (c.yearsDelta ?? 0) * c.weight, 0) / totalWeight;
  const delta = clampYears(rawDelta, -MAX_TOTAL_DELTA, MAX_TOTAL_DELTA);
  const age = round1(Math.max(MIN_AGE, chronoAge + delta));

  // Confidence: device signals (VO2max or HRV) plus breadth of components.
  const hasDeviceSignal = components.some((c) => c.key === 'vo2' || c.key === 'hrv');
  const confidence: ArogyamAgeResult['confidence'] =
    hasDeviceSignal && components.length >= 4 ? 'high' : components.length >= 3 ? 'medium' : 'low';

  const worst = [...components]
    .filter((c) => (c.yearsDelta ?? 0) > 0.5)
    .sort((a, b) => (b.yearsDelta ?? 0) - (a.yearsDelta ?? 0))[0];
  const bestLever = worst
    ? { label: worst.label, note: LEVER_NOTES[worst.key] ?? worst.note }
    : null;

  return {
    age,
    chronologicalAge: chronoAge,
    delta: round1(age - chronoAge),
    components,
    confidence,
    bestLever,
    missingReason: null,
  };
}
