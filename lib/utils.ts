// ============================================
// Utility Functions
// ============================================

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format number with commas: 1234 -> "1,234" */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-IN');
}

/** Format water: 1500 -> "1.5 L" or "1500 ml" */
export function formatWater(ml: number): string {
  if (ml >= 1000) {
    return `${(ml / 1000).toFixed(1)} L`;
  }
  return `${ml} ml`;
}

/** Format duration in minutes: 0.5 -> "30s", 1 -> "1 min", 1.5 -> "1m 30s", 12 -> "12 min" */
export function formatDuration(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return '0 min';
  if (min < 1) {
    const seconds = Math.round(min * 60);
    return `${seconds}s`;
  }
  const whole = Math.floor(min);
  const remSeconds = Math.round((min - whole) * 60);
  if (remSeconds === 0) return `${whole} min`;
  return `${whole}m ${remSeconds}s`;
}

/** Format weight: 72.5 -> "72.5 kg" */
export function formatWeight(kg: number, unit: 'metric' | 'imperial' = 'metric'): string {
  if (unit === 'imperial') {
    return `${(kg * 2.20462).toFixed(1)} lbs`;
  }
  return `${kg.toFixed(1)} kg`;
}

/** Convert a Date to local YYYY-MM-DD */
export function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Get today's date as YYYY-MM-DD (local time) */
export function getToday(): string {
  return toLocalDateString(new Date());
}

/** Get yesterday's date as YYYY-MM-DD (local time, for "last night" sleep) */
export function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toLocalDateString(d);
}

/** Calculate age in years from date of birth (ISO date string or Date). */
export function getAgeFromDateOfBirth(dob: string | Date): number {
  const birth = typeof dob === 'string' ? new Date(dob) : dob;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return Math.max(0, age);
}

/** Format date for display: "2024-01-15" -> "Jan 15, 2024" */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Format time: "14:30" -> "2:30 PM" */
export function formatTime(time: string | undefined | null): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

/** Calculate percentage with bounds */
export function calcPercent(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
}

/** Get current time as HH:mm */
export function getCurrentTime(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

/** Get a greeting based on time of day */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

type MealForRecalc = {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
};

/** Recalculate daily log totals from meals. Meal calories/macros are already totals for the logged amount. */
export function recalcTotalsFromMeals(meals: Array<MealForRecalc>): {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  totalSugar: number;
  totalSodium: number;
} {
  if (!meals?.length) {
    return {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      totalFiber: 0,
      totalSugar: 0,
      totalSodium: 0,
    };
  }
  // Meals carry one-decimal macros, and adding those in binary floating point
  // leaves noise (32.6 + 44.2 + 35.8 + 32.5 = 145.10000000000002). Round each
  // total so the artifact is never displayed or persisted. Whole-number inputs
  // are unaffected.
  const sum = (pick: (m: MealForRecalc) => unknown) =>
    Math.round(meals.reduce((s, m) => s + (Number(pick(m)) || 0), 0) * 10) / 10;

  return {
    totalCalories: sum((m) => m.calories),
    totalProtein: sum((m) => m.protein),
    totalCarbs: sum((m) => m.carbs),
    totalFat: sum((m) => m.fat),
    totalFiber: sum((m) => m.fiber),
    totalSugar: sum((m) => m.sugar),
    totalSodium: sum((m) => m.sodium),
  };
}
