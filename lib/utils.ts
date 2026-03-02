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

/** Format calories: 1234 -> "1,234 kcal" */
export function formatCalories(cal: number): string {
  return `${formatNumber(Math.round(cal))} kcal`;
}

/** Format water: 1500 -> "1.5 L" or "1500 ml" */
export function formatWater(ml: number): string {
  if (ml >= 1000) {
    return `${(ml / 1000).toFixed(1)} L`;
  }
  return `${ml} ml`;
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
export function formatTime(time: string): string {
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

/** Validate email format */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Debounce function for search inputs */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
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
  return {
    totalCalories: meals.reduce((s, m) => s + (Number(m.calories) || 0), 0),
    totalProtein: meals.reduce((s, m) => s + (Number(m.protein) || 0), 0),
    totalCarbs: meals.reduce((s, m) => s + (Number(m.carbs) || 0), 0),
    totalFat: meals.reduce((s, m) => s + (Number(m.fat) || 0), 0),
    totalFiber: meals.reduce((s, m) => s + (Number(m.fiber) || 0), 0),
    totalSugar: meals.reduce((s, m) => s + (Number(m.sugar) || 0), 0),
    totalSodium: meals.reduce((s, m) => s + (Number(m.sodium) || 0), 0),
  };
}
