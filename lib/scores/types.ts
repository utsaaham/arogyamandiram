// Shared types for the Vitals score engine.
// All score functions are pure: they take day inputs and return scores,
// so the same code computes today's scores and historical trends.

import type { HabitKey } from '@/types';

/** Minimal per-day slice of a DailyLog that the score engine consumes. */
export interface DayInput {
  date: string; // YYYY-MM-DD
  // Device vitals
  restingHeartRate?: number;
  hrvSdnnMs?: number;
  respiratoryRate?: number;
  wristTempC?: number;
  vo2Max?: number;
  heartRate?: number; // daily average
  // Activity
  steps?: number;
  activeCalories?: number;
  workouts?: Array<{
    duration: number; // minutes
    caloriesBurned?: number;
    avgHeartRate?: number;
    /** 'device' when synced from the watch; absent for hand-logged workouts */
    source?: string;
  }>;
  // Sleep (the night ending on this date)
  sleep?: {
    duration: number; // hours
    bedtime: string;
    wakeTime: string;
    deepHours?: number;
    remHours?: number;
    coreHours?: number;
    awakeHours?: number;
  };
  // Journal
  habits?: HabitKey[];
  mood?: number;
}

export interface Baseline {
  mean: number;
  std: number;
  count: number;
}

export type GuidanceBand = 'push' | 'maintain' | 'recover' | 'rest';
export type StressLevel = 'low' | 'moderate' | 'high';

export interface ScoreComponent {
  key: string;
  label: string;
  /** 0-100 contribution score; null when the signal is unavailable */
  score: number | null;
  /** Plain-language note, e.g. "HRV 12% below your 2-week baseline" */
  note?: string;
}

export interface ReadinessResult {
  score: number | null;
  components: ScoreComponent[];
  /** The 1-2 components pulling the score down (or up) the most */
  drivers: string[];
}

export interface StrainResult {
  score: number | null;
  /** Estimated minutes in each heart-rate zone from today's workouts */
  zones: { zone: string; minutes: number }[];
  components: ScoreComponent[];
}

export interface SleepResult {
  score: number | null;
  components: ScoreComponent[];
}

export interface StressResult {
  level: StressLevel | null;
  score: number | null; // 0-100 internal index
  components: ScoreComponent[];
}

export interface GuidanceResult {
  band: GuidanceBand;
  reason: string;
}

export interface HabitInsight {
  habit: HabitKey;
  metric: 'readiness' | 'sleep';
  /** Mean score difference on days with the habit vs. without (negative = worse) */
  delta: number;
  text: string;
  sampleWith: number;
  sampleWithout: number;
}

export function clamp(v: number, lo = 0, hi = 100): number {
  return Math.min(hi, Math.max(lo, v));
}

export function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
