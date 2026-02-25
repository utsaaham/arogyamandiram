// ============================================
// Health Calculations - BMR, TDEE, Macros, Water
// ============================================
// Formulas: Mifflin-St Jeor (BMR), activity multipliers (TDEE), 35 ml/kg + activity (water),
// Devine formula (ideal weight), NSF-style age bands (sleep).

import type { Gender, ActivityLevel, Goal, UserTargets, UserProfile } from '@/types';
import { getAgeFromDateOfBirth } from '@/lib/utils';

// Activity level multipliers (Harris-Benedict revised)
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,       // Little or no exercise
  light: 1.375,         // Light exercise 1-3 days/week
  moderate: 1.55,       // Moderate exercise 3-5 days/week
  active: 1.725,        // Hard exercise 6-7 days/week
  very_active: 1.9,     // Very hard exercise, physical job
};

// Calorie adjustment based on goal
const GOAL_ADJUSTMENTS: Record<Goal, number> = {
  lose: -500,           // 500 cal deficit (~0.5 kg/week loss)
  maintain: 0,
  gain: 400,            // 400 cal surplus (~0.35 kg/week gain)
};

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor Equation.
 * More accurate than Harris-Benedict for modern populations.
 *
 * @param weight - kg
 * @param height - cm
 * @param age - years
 * @param gender
 */
export function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: Gender
): number {
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  }
  // Female & other use female formula (more conservative)
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

/**
 * Calculate Total Daily Energy Expenditure.
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

/**
 * Calculate daily calorie target based on goal.
 */
export function calculateCalorieTarget(tdee: number, goal: Goal): number {
  const target = tdee + GOAL_ADJUSTMENTS[goal];
  // Minimum safe calorie intake
  return Math.max(target, 1200);
}

/**
 * Calculate macro targets based on calorie goal and body goal.
 * Uses evidence-based macro splits.
 */
export function calculateMacros(
  calories: number,
  weight: number,
  goal: Goal
): { protein: number; carbs: number; fat: number } {
  let proteinRatio: number;
  let fatRatio: number;

  switch (goal) {
    case 'lose':
      // High protein to preserve muscle during deficit
      proteinRatio = 0.35;
      fatRatio = 0.30;
      break;
    case 'gain':
      // Balanced with emphasis on carbs for energy
      proteinRatio = 0.30;
      fatRatio = 0.25;
      break;
    default: // maintain
      proteinRatio = 0.30;
      fatRatio = 0.30;
  }

  const carbRatio = 1 - proteinRatio - fatRatio;

  return {
    protein: Math.round((calories * proteinRatio) / 4), // 4 cal/g protein
    carbs: Math.round((calories * carbRatio) / 4),      // 4 cal/g carbs
    fat: Math.round((calories * fatRatio) / 9),          // 9 cal/g fat
  };
}

/**
 * Calculate daily water intake recommendation (ml).
 * Base: 35 ml per kg body weight; plus activity bonus (standard hydration guidelines).
 */
export function calculateWaterTarget(weight: number, activityLevel: ActivityLevel): number {
  // Base: 35ml per kg of body weight
  let water = weight * 35;

  // Adjust for activity
  const activityBonus: Record<ActivityLevel, number> = {
    sedentary: 0,
    light: 250,
    moderate: 500,
    active: 750,
    very_active: 1000,
  };

  water += activityBonus[activityLevel];

  // Round to nearest 100ml
  return Math.round(water / 100) * 100;
}

/**
 * Calculate ideal body weight (kg) using Devine formula.
 * height in cm.
 */
export function calculateIdealWeight(height: number, gender: Gender): number {
  const heightInches = height / 2.54;
  const base = gender === 'male' ? 50 : 45.5;
  const idealKg = base + 2.3 * Math.max(0, heightInches - 60);
  return Math.round(idealKg * 10) / 10;
}

/**
 * Recommended daily workout duration (minutes) by goal and activity level.
 */
export function calculateDailyWorkoutMinutes(goal: Goal, activityLevel: ActivityLevel): number {
  const byGoal: Record<Goal, number> = {
    lose: 45,
    maintain: 30,
    gain: 40,
  };
  let mins = byGoal[goal];
  if (activityLevel === 'sedentary' || activityLevel === 'light') mins = Math.min(mins + 10, 60);
  if (activityLevel === 'very_active') mins = Math.max(mins - 5, 25);
  return mins;
}

/**
 * Recommended daily calories to burn via exercise (kcal).
 */
export function calculateDailyCalorieBurn(goal: Goal): number {
  const byGoal: Record<Goal, number> = {
    lose: 450,
    maintain: 300,
    gain: 250,
  };
  return byGoal[goal];
}

/**
 * Recommended sleep hours by age (NSF-style guidelines).
 * Teens 14-17: 9h; Adults 18-64: 8h; Older adults 65+: 7.5h.
 */
export function calculateSleepHours(age: number): number {
  if (age < 14) return 9;
  if (age < 18) return 9;   // teens 14-17
  if (age >= 65) return 7.5; // older adults
  return 8;                  // adults 18-64
}

/**
 * Generate all user targets from profile data.
 */
export function generateTargets(
  weight: number,
  height: number,
  age: number,
  gender: Gender,
  activityLevel: ActivityLevel,
  goal: Goal
): UserTargets {
  const bmr = calculateBMR(weight, height, age, gender);
  const tdee = calculateTDEE(bmr, activityLevel);
  const dailyCalories = calculateCalorieTarget(tdee, goal);
  const macros = calculateMacros(dailyCalories, weight, goal);
  const dailyWater = calculateWaterTarget(weight, activityLevel);
  const idealWeight = calculateIdealWeight(height, gender);
  const dailyWorkoutMinutes = calculateDailyWorkoutMinutes(goal, activityLevel);
  const dailyCalorieBurn = calculateDailyCalorieBurn(goal);
  const sleepHours = calculateSleepHours(age);

  return {
    dailyCalories,
    dailyWater,
    ...macros,
    idealWeight,
    dailyWorkoutMinutes,
    dailyCalorieBurn,
    sleepHours,
  };
}

/** Default targets when profile is incomplete (safe fallbacks). */
const DEFAULT_TARGETS: UserTargets = {
  dailyCalories: 2000,
  dailyWater: 2500,
  protein: 150,
  carbs: 200,
  fat: 67,
  idealWeight: 70,
  dailyWorkoutMinutes: 30,
  dailyCalorieBurn: 400,
  sleepHours: 8,
};

/** User-like object with optional profile and targets (e.g. from API). */
export interface UserWithTargets {
  profile?: UserProfile | null;
  targets?: UserTargets | null;
}

/**
 * Returns formula-based targets for display: uses stored targets if complete,
 * else computes from profile via generateTargets(), else safe defaults.
 */
export function getTargetsForUser(user: UserWithTargets | null | undefined): UserTargets {
  const t = user?.targets;
  if (t != null) return t as UserTargets;

  const p = user?.profile;
  if (!p) return DEFAULT_TARGETS;

  const weight = p.weight > 0 ? p.weight : 0;
  const height = p.height > 0 ? p.height : 0;
  const gender = p.gender as Gender | undefined;
  const activityLevel = p.activityLevel as ActivityLevel | undefined;
  const goal = p.goal as Goal | undefined;

  let age: number;
  if (p.dateOfBirth) {
    age = getAgeFromDateOfBirth(p.dateOfBirth);
  } else if (typeof p.age === 'number' && p.age >= 13 && p.age <= 120) {
    age = p.age;
  } else {
    return DEFAULT_TARGETS;
  }

  if (
    !gender ||
    !activityLevel ||
    !goal ||
    weight <= 0 ||
    height <= 0
  ) {
    return DEFAULT_TARGETS;
  }

  return generateTargets(weight, height, age, gender, activityLevel, goal);
}
