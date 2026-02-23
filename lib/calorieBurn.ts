// ============================================
// Baseline Calorie Burn (BMR + TDEE)
// ============================================
// Mifflin–St Jeor equation + activity multipliers.
// Used for "ideal" / baseline burn on workout page.

import type { ActivityLevel, Gender } from '@/types';

/** Activity level → TDEE multiplier (BMR × this = daily burn without structured workouts) */
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2, // sitting most of the day
  light: 1.375, // light activity 1–3 days/week
  moderate: 1.55, // moderate exercise 3–5 days/week
  active: 1.725, // hard exercise 6–7 days/week
  very_active: 1.9, // athlete / physically job
};

/**
 * BMR (Basal Metabolic Rate) — calories burned at complete rest.
 * Mifflin–St Jeor equation (used by MyFitnessPal, Fitbit, etc.).
 * @param weightKg - weight in kg
 * @param heightCm - height in cm
 * @param age - age in years
 * @param gender - male | female | other (other uses male formula)
 */
export function bmrMifflinStJeor(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'female') return base - 161;
  return base + 5; // male or other
}

/**
 * TDEE (Total Daily Energy Expenditure) — daily burn including non-exercise activity.
 * TDEE = BMR × activity multiplier.
 */
export function tdee(bmr: number, activityLevel: ActivityLevel): number {
  const mult = ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.55;
  return bmr * mult;
}

/**
 * Calories burned per hour while sitting (MET ≈ 1.3).
 * Formula: (MET × 3.5 × weightKg) / 200 = kcal/min → × 60 for per hour.
 */
export function sittingCaloriesPerHour(weightKg: number): number {
  const kcalPerMin = (1.3 * 3.5 * weightKg) / 200;
  return kcalPerMin * 60;
}

export interface BaselineBurnInput {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
}

export interface BaselineBurnResult {
  bmr: number;
  tdee: number;
  sittingPerHour: number;
}

/**
 * Compute BMR, TDEE, and sitting calories/hour from user profile (metric units).
 * Returns null if required fields are missing or invalid.
 */
export function computeBaselineBurn(
  input: Partial<BaselineBurnInput>,
): BaselineBurnResult | null {
  const { weightKg, heightCm, age, gender, activityLevel } = input;

  if (
    typeof weightKg !== 'number' ||
    typeof heightCm !== 'number' ||
    weightKg <= 0 ||
    heightCm <= 0
  ) {
    return null;
  }

  const ageNum = typeof age === 'number' && age >= 13 && age <= 120 ? age : 25;
  const genderVal: Gender =
    gender === 'female' || gender === 'male' || gender === 'other'
      ? gender
      : 'male';

  const activityVal: ActivityLevel =
    activityLevel && ACTIVITY_MULTIPLIERS[activityLevel]
      ? activityLevel
      : 'moderate';

  const bmr = bmrMifflinStJeor(weightKg, heightCm, ageNum, genderVal);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee(bmr, activityVal)),
    sittingPerHour: Math.round(sittingCaloriesPerHour(weightKg)),
  };
}

