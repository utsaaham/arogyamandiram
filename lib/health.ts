// ============================================
// Health Calculations - BMR, TDEE, Macros, Water
// ============================================

import type { Gender, ActivityLevel, Goal, UserTargets } from '@/types';

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
 * Based on weight and activity level.
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

  return {
    dailyCalories,
    dailyWater,
    ...macros,
  };
}
