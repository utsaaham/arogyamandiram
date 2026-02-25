// ============================================
// AROGYAMANDIRAM - Type Definitions
// ============================================

import { Types } from 'mongoose';

// ---------- User Types ----------

export type Gender = 'male' | 'female' | 'other';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose' | 'maintain' | 'gain';
export type UnitSystem = 'metric' | 'imperial';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type WorkoutCategory = 'cardio' | 'strength' | 'flexibility' | 'sports' | 'other';

export interface UserProfile {
  name: string;
  /** Computed from dateOfBirth when present; otherwise stored value (legacy). */
  age?: number;
  /** Source of truth for age; age is derived from this. */
  dateOfBirth?: string; // ISO date YYYY-MM-DD
  gender: Gender;
  height: number;       // cm (metric) or inches (imperial)
  weight: number;       // kg (metric) or lbs (imperial)
  activityLevel: ActivityLevel;
  goal: Goal;
  targetWeight: number;
  avatarUrl?: string;
}

export interface UserApiKeys {
  openai?: string;       // AES-256 encrypted
  edamam?: {
    appId: string;       // AES-256 encrypted
    appKey: string;      // AES-256 encrypted
  };
}

export interface UserSettings {
  theme: 'dark' | 'light';
  units: UnitSystem;
  notifications: {
    water: boolean;
    meals: boolean;
    weighIn: boolean;
    workout: boolean;
  };
}

export interface UserTargets {
  dailyCalories: number;
  dailyWater: number;     // ml
  protein: number;        // grams
  carbs: number;          // grams
  fat: number;            // grams
  idealWeight: number;   // kg - recommended ideal weight
  dailyWorkoutMinutes: number;  // recommended daily exercise duration
  dailyCalorieBurn: number;     // recommended daily calories to burn via exercise
  sleepHours: number;    // recommended sleep hours
}

export interface UserStreaks {
  current: {
    logging: number;    // consecutive days with any log
    calories: number;   // consecutive days within calorie target
    water: number;      // consecutive days meeting water goal
    workout: number;    // consecutive days with a workout
    sleep: number;      // consecutive days meeting sleep target
    weight: number;     // consecutive days logging weight
  };
  best: {
    logging: number;
    calories: number;
    water: number;
    workout: number;
    sleep: number;
    weight: number;
  };
}

export type BadgeCategory = 'streak' | 'milestone' | 'challenge' | 'first' | 'other';

export interface UserBadge {
  id: string;           // unique badge id (e.g. 'streak_7_any')
  name: string;
  description: string;
  icon: string;         // emoji or icon name
  category: BadgeCategory;
  earnedAt: string;     // ISO date string
}

export interface UserAchievements {
  badges: UserBadge[];
  streaks: UserStreaks;
}

export interface IUser {
  _id: Types.ObjectId;
  email: string;
  password: string;
  profile: UserProfile;
  apiKeys: UserApiKeys;
  settings: UserSettings;
  targets: UserTargets;
  achievements?: UserAchievements;
  onboardingComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ---------- Daily Log Types ----------

export interface MealEntry {
  _id?: string;
  foodId?: string;        // reference to food database
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  quantity: number;
  unit: string;           // g, ml, piece, cup, tbsp, etc.
  mealType: MealType;
  time: string;           // HH:mm format
  isCustom: boolean;      // user-added food
}

export interface WorkoutEntry {
  _id?: string;
  exercise: string;
  category: WorkoutCategory;
  duration: number;       // minutes
  caloriesBurned: number;
  sets?: number;
  reps?: number;
  weight?: number;        // kg or lbs
  notes?: string;
}

export type SleepQuality = 1 | 2 | 3 | 4 | 5;

export interface SleepEntry {
  _id?: string;
  bedtime: string;        // ISO datetime or HH:mm
  wakeTime: string;       // ISO datetime or HH:mm
  duration: number;       // hours (decimal, e.g. 7.5)
  quality: SleepQuality;  // 1-5 star rating
  notes?: string;
}

export interface WaterLogEntry {
  _id?: string;
  amount: number;         // ml
  time: string;           // HH:mm format
}

export interface IDailyLog {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  date: string;           // YYYY-MM-DD
  weight?: number;
  waterIntake: number;    // total ml
  waterEntries: WaterLogEntry[];
  meals: MealEntry[];
  workouts: WorkoutEntry[];
  sleep?: SleepEntry;     // single entry per day
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  caloriesBurned: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---------- Food Database Types ----------

export interface FoodItem {
  id: string;
  name: string;
  nameHindi?: string;
  category: FoodCategory;
  servingSize: number;
  servingUnit: string;
  calories: number;       // per serving
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  isVegetarian: boolean;
  isVegan: boolean;
  tags: string[];
}

export type FoodCategory =
  | 'curry'
  | 'dal'
  | 'bread'
  | 'rice'
  | 'sweet'
  | 'snack'
  | 'beverage'
  | 'chutney'
  | 'raita'
  | 'salad'
  | 'breakfast'
  | 'street_food'
  | 'non_veg'
  | 'seafood'
  | 'dry_fruit'
  | 'fruit'
  | 'other';

// ---------- API Response Types ----------

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Safe user (no sensitive fields) - sent to client
export interface SafeUser {
  id: string;
  email: string;
  profile: UserProfile;
  settings: UserSettings;
  targets: UserTargets;
  onboardingComplete: boolean;
  hasOpenAiKey: boolean;    // boolean only, never the actual key
  hasEdamamKey: boolean;    // boolean only
  createdAt?: string;      // ISO date string, for "at least one week" checks
}

// ---------- AI Types ----------

export interface AiMealSuggestion {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: MealType;
  ingredients: string[];
  isVegetarian: boolean;
}

export interface AiWorkoutPlan {
  name: string;
  description: string;
  exercises: {
    name: string;
    sets: number;
    reps: string;
    restSeconds: number;
    category: WorkoutCategory;
  }[];
  estimatedCalories: number;
  durationMinutes: number;
}

export interface AiInsight {
  title: string;
  description: string;
  type: 'success' | 'warning' | 'info' | 'tip';
  metric?: string;
  value?: string;
}

export interface AiSleepAnalysis {
  score: number;         // 0-100 sleep score
  summary: string;
  tips: { title: string; description: string }[];
}
