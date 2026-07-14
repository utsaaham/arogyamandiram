// ============================================
// AROGYAMANDIRAM - Type Definitions
// ============================================

import { Types } from 'mongoose';

// ---------- User Types ----------

export type Gender = 'male' | 'female' | 'other';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose_fat' | 'build_muscle' | 'recomp' | 'improve_fitness' | 'maintain';
/** Pre-2026 3-value goal strings; still present in stored documents and old clients. */
export type LegacyGoal = 'lose' | 'maintain' | 'gain';
export type UnitSystem = 'metric' | 'imperial';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type WorkoutCategory = 'cardio' | 'strength' | 'flexibility' | 'core' | 'sports' | 'other';
export type BodyType = 'ectomorph' | 'mesomorph' | 'endomorph';
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
export type FatFocusArea = 'belly' | 'hips' | 'thighs' | 'arms' | 'chest' | 'overall';
export type PhysiqueGoal =
  | 'lean_toned'
  | 'lean_muscle'
  | 'athletic'
  | 'muscular_bulk'
  | 'bodybuilder'
  | 'healthy_slim'
  | 'powerlifter';
export type WorkoutLocation =
  | 'full_gym'
  | 'home'
  | 'outdoors'
  | 'hotel_travel';

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
  // Body composition — used for AI plan personalization
  bodyType?: BodyType;
  bodyFat?: number;             // body fat percentage
  fatFocusAreas?: FatFocusArea[];
  fitnessLevelDerived?: FitnessLevel; // auto-calculated from workout logs
  fitnessLevelUser?: FitnessLevel;    // optional manual override
  physiqueGoal?: PhysiqueGoal;        // target body the user is training toward
  workoutLocation?: WorkoutLocation;  // where the user trains
  equipmentNotes?: string;            // free-form notes: gear available or excluded
  timezone?: string;
}

export interface UserApiKeys {
  openai?: string;       // AES-256 encrypted
  fdcApiKey?: string;    // AES-256 encrypted — USDA FoodData Central
}

export interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;      // AES-256 encrypted on server; never sent to client
  fromName: string;
}

export interface ImapSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;      // AES-256 encrypted on server; never sent to client
}

export interface EmailSettings {
  smtp?: SmtpSettings;
  imap?: ImapSettings;
}

export interface ReminderScheduleSettings {
  timezone?: string;
  waterHourlyEnabled?: boolean;
  waterFrequencyMinutes?: number;
  water?: {
    enabled?: boolean;
    startTime?: string;
    endTime?: string;
    frequencyMinutes?: number;
  };
  mealTimes?: {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
  };
  sleepTime?: string;
  workoutTime?: string;
  weighInTime?: string;
  lastSentAt?: {
    water?: string;
    breakfast?: string;
    lunch?: string;
    dinner?: string;
    workout?: string;
    weighIn?: string;
    sleep?: string;
  };
}

export type HealthDataSyncSource = 'manual' | 'auto';
export type DietaryPreference =
  | 'no_preference'
  | 'vegetarian'
  | 'non_vegetarian'
  | 'eggetarian'
  | 'vegan'
  | 'pescatarian'
  | 'flexitarian';

export type CookingSkill = 'beginner' | 'intermediate' | 'confident';

export interface FoodPreferencesSettings {
  dietaryPreference?: DietaryPreference;
  allergies?: string[];
  favoriteCuisines?: string[];
  cookingSkill?: CookingSkill;
  maxCookingMinutes?: number;
}

export interface HealthDataSettings {
  endpoint?: string;
  enabled?: boolean;
  syncIntervalMinutes?: number;
  lastSyncAt?: string;
  lastSyncSource?: HealthDataSyncSource;
  lastSchemaJson?: string;
  lastSyncStatus?: 'ok' | 'error' | '';
  lastSyncError?: string;
}

export interface WaterCustomizationSettings {
  quickAmountsMl?: number[];
}

export type MascotChoice = 'red-panda' | 'kiki';

export interface UserCustomizations {
  water?: WaterCustomizationSettings;
  mascot?: MascotChoice;
}

export interface UserSettings {
  theme: 'dark' | 'light';
  units: UnitSystem;
  /** Master switch for every OpenAI-backed feature in the app. */
  aiEnabled?: boolean;
  /** Master switch for all reminder emails; false stops every scheduled email. */
  emailRemindersEnabled?: boolean;
  notifications: {
    water: boolean;
    meals: boolean;
    weighIn: boolean;
    workout: boolean;
    sleep?: boolean;
  };
  /** Whether the main dashboard tour has been completed at least once. */
  dashboardTourComplete?: boolean;
  /**
   * Version of the dashboard tour the user last completed.
   * Increment app-side constant when major platform updates ship
   * and you want to re-show the tour once.
   */
  dashboardTourVersion?: number;
  /** Suggest-only nudges; dismissal state so they don't nag. */
  nudges?: {
    /**
     * targetWeight value at which the target-reached nudge was dismissed;
     * re-arms automatically when the user sets a new target.
     */
    targetReachedDismissedForTargetWeight?: number | null;
  };
  /** SMTP/IMAP configuration for email reminders. Passwords are server-only. */
  emailSettings?: EmailSettings;
  /** Recipient list for reminder emails. */
  recipientEmails?: string[];
  /** Legacy key kept for backward compatibility. */
  ccEmails?: string[];
  /** Reminder schedule controls (timezone-aware). */
  reminderSchedule?: ReminderScheduleSettings;
  /** User-controlled tracker customization values. */
  customizations?: UserCustomizations;
  /** Status of SMTP/IMAP configuration checks shown in Preferences checklist. */
  emailSetupChecklist?: {
    smtpSaved?: boolean;
    smtpTestSent?: boolean;
    imapSaved?: boolean;
    imapTestSent?: boolean;
    recipientListSaved?: boolean;
    imapReplyVerifiedAt?: string;
    lastUpdatedAt?: string;
  };
  /** External health data sync settings + latest sync metadata. */
  healthData?: HealthDataSettings;
  /** Food planning preferences used by AI meal generation. */
  foodPreferences?: FoodPreferencesSettings;
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
  dailySteps?: number;      // daily step goal (default 8000)
  idealDistance?: number;   // km/day walking or running target
}

export interface UserStreaks {
  current: {
    logging: number;    // consecutive active days (any log / any goal)
    healthy: number;   // consecutive healthy days (all goals met)
    calories: number;   // consecutive days within calorie target
    water: number;      // consecutive days meeting water goal
    workout: number;    // consecutive days with a workout (meeting burn threshold)
    sleep: number;      // consecutive days meeting sleep target
    weight: number;     // consecutive days logging weight
    steps?: number;     // consecutive days meeting daily step goal
    waterGoal?: number; // consecutive days hitting full daily water target
    protein?: number;   // consecutive days hitting the protein target
    recovery?: number;  // consecutive days with readiness at/above personal baseline
  };
  best: {
    logging: number;
    healthy: number;
    calories: number;
    water: number;
    workout: number;    // longest run of days meeting workout burn threshold
    sleep: number;
    weight: number;
    steps?: number;     // longest run of days meeting daily step goal
    waterGoal?: number; // longest run of days hitting full daily water target
    protein?: number;   // longest run of days hitting the protein target
    recovery?: number;  // longest run of readiness-at/above-baseline days
  };
  /**
   * Optional start dates (ISO YYYY-MM-DD) for the *current* streak run
   * of each habit. Present only when the corresponding `current.*`
   * value is > 0.
   */
  starts?: {
    logging?: string;
    healthy?: string;
    calories?: string;
    water?: string;
    workout?: string;
    sleep?: string;
    weight?: string;
    steps?: string;
    waterGoal?: string;
    protein?: string;
    recovery?: string;
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
  /**
   * Optional: the first day this badge's condition became true based on
   * historical logs (e.g. the first day a 7‑day streak was reached),
   * which can differ from when the badge record itself was created.
   */
  firstEarnedAt?: string;
}

export interface UserAchievements {
  badges: UserBadge[];
  streaks: UserStreaks;
  /** Lifetime XP accumulated from entries + badges. */
  xpTotal?: number;
}

export interface IUser {
  _id: Types.ObjectId;
  username?: string;
  email?: string;
  password?: string;
  isGuest?: boolean;
  guestFingerprint?: string;
  profile: UserProfile;
  apiKeys: UserApiKeys;
  settings: UserSettings;
  targets: UserTargets;
  achievements?: UserAchievements;
  achievementsUpdatedAt?: Date;
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
  sugar?: number;         // g
  sodium?: number;        // mg
  saturatedFat?: number; // g
  cholesterol?: number;   // mg
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
  /** 'device' = from health-data sync; 'manual' = user-entered (default) */
  source?: 'manual' | 'device';
  /** Average heart rate during the workout (device-sourced, bpm) */
  avgHeartRate?: number;
  notes?: string;
  /** When this log entry corresponds to a planned exercise from DailyPlan.workoutPlan.exercises[].name */
  planExerciseName?: string;
}

export type SleepQuality = 1 | 2 | 3 | 4 | 5;

export interface SleepEntry {
  _id?: string;
  bedtime: string;        // ISO datetime or HH:mm
  wakeTime: string;       // ISO datetime or HH:mm
  duration: number;       // hours (decimal, e.g. 7.5)
  quality: SleepQuality;  // 1-5 star rating
  notes?: string;
  // Sleep stages (device-sourced, hours) — used by the Vitals sleep score
  deepHours?:  number;
  remHours?:   number;
  coreHours?:  number;
  awakeHours?: number;
}

export interface WaterLogEntry {
  _id?: string;
  amount: number;         // ml
  time: string;           // HH:mm format
}

/** Behaviors the user can log in the Vitals habit journal. */
export type HabitKey =
  | 'alcohol'
  | 'caffeine_late'
  | 'late_meal'
  | 'screen_before_bed'
  | 'meditation'
  | 'stretching'
  | 'supplements'
  | 'soreness'
  | 'high_stress_day'
  | 'travel'
  | 'illness';

export const HABIT_LABELS: Record<HabitKey, string> = {
  alcohol: 'Alcohol',
  caffeine_late: 'Caffeine after 2pm',
  late_meal: 'Late meal',
  screen_before_bed: 'Screen before bed',
  meditation: 'Meditation',
  stretching: 'Stretching',
  supplements: 'Supplements',
  soreness: 'Muscle soreness',
  high_stress_day: 'Stressful day',
  travel: 'Travel',
  illness: 'Feeling sick',
};

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
  totalFiber?: number;
  totalSugar?: number;
  totalSodium?: number;
  caloriesBurned: number;
  // Device-sourced metrics (populated by health-data sync)
  heartRate?:      number;
  steps?:          number;
  activeCalories?: number;
  distanceKm?:     number;
  // Recovery vitals (device-sourced, used by the Vitals scores)
  restingHeartRate?: number;  // bpm
  hrvSdnnMs?:        number;  // ms
  respiratoryRate?:  number;  // breaths/min
  wristTempC?:       number;  // °C, sleeping wrist temperature
  vo2Max?:           number;  // mL/(kg·min)
  // Habit journal (user-logged, correlated against scores)
  habits?: HabitKey[];
  mood?: number;              // 1-5 subjective rating
  notes?: string;
  todoCompletions?: Array<{ templateId: string; completedAt: string }>;
  /** XP already awarded for this specific date (0–50). */
  xpAwarded?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ---------- Food Database Types ----------

/** A single serving option for a food, e.g. { label: "1 large", grams: 50 } */
export interface FoodMeasure {
  label: string;  // display label, e.g. "1 large", "1 cup", "1 tbsp"
  grams: number;  // gram (or ml) equivalent of 1 unit of this measure
}

export interface FoodItem {
  id: string;
  name: string;
  /** Legacy optional localized display name kept for backward compatibility. */
  nameHindi?: string;
  category: FoodCategory;
  servingSize: number;    // always 100 — nutritional values are per 100g/ml
  servingUnit: string;    // 'g' or 'ml'
  calories: number;       // per 100g/ml
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  isVegetarian: boolean;
  isVegan: boolean;
  tags: string[];
  measures?: FoodMeasure[]; // natural serving options from USDA (e.g. 1 egg, 1 cup)
}

export type FoodCategory =
  // Legacy stored categories kept for backward compatibility with cached food docs.
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
  username?: string;
  email?: string;
  isGuest?: boolean;
  profile: UserProfile;
  settings: UserSettings;
  targets: UserTargets;
  onboardingComplete: boolean;
  hasOpenAiKey: boolean;    // boolean only, never the actual key
  hasFdcKey: boolean;       // boolean only
  hasSmtp: boolean;         // true if SMTP is configured
  hasImap: boolean;         // true if IMAP is configured
  smtpUser?: string;        // display username only (no password)
  imapUser?: string;        // display username only (no password)
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
  steps: string[];
  prepMinutes?: number;
  cookMinutes?: number;
  isVegetarian: boolean;
}

export interface AiWorkoutPlan {
  name: string;
  description: string;
  /** @deprecated kept for backwards-compat with old plans; new plans use `weeklyStrategyChosen` */
  strategyUsed?: string;
  /** Free-text description of the weekly split the LLM chose for this user this week */
  weeklyStrategyChosen?: string;
  /** One-line reason for today's session given recent days */
  whyToday?: string;
  readinessAdjustment?: string;
  progressionTip?: string;
  reasoning?: string;
  exercises: {
    name: string;
    steps?: string[];
    sets: number;
    reps: string;
    /** Workout-flow phase, used for ordering and UI grouping */
    phase?: 'warmup' | 'strength' | 'cardio' | 'core' | 'mobility' | 'cooldown';
    /** Strength only: compound lifts come before accessories (LLM-tagged) */
    slot?: 'compound' | 'accessory';
    /** Server-stamped 1..n gym order — do in this order */
    order?: number;
    durationMinutes?: number;
    restSeconds: number;
    intensity?: 'low' | 'medium' | 'high';
    category: WorkoutCategory;
    muscleGroup?: 'legs' | 'push' | 'pull' | 'core';
  }[];
  estimatedCalories: number;
  durationMinutes: number;
}

export interface DailyPlanData {
  _id: string;
  date: string;
  generatedAt: string;
  status: 'generating' | 'ready' | 'failed';
  topInsight?: string;
  /** One-sentence "Today's Body Summary" cached per day by /api/intelligence. */
  bodySummary?: string;
  projections?: {
    sleep?:     { headline?: string; coachNote?: string; actions?: string[] };
    food?:      { headline?: string; coachNote?: string; actions?: string[] };
    water?:     { headline?: string; coachNote?: string; actions?: string[] };
    workout?:   { headline?: string; coachNote?: string; actions?: string[] };
    steps?:     { headline?: string; coachNote?: string; actions?: string[] };
    heartRate?: { headline?: string; coachNote?: string; actions?: string[] };
    weight?:    { headline?: string; coachNote?: string; actions?: string[] };
  };
  outlook?: {
    headline?: string;
    recoverySummary?: string;
    today?: {
      effort?: 'push' | 'maintain' | 'recover' | 'rest';
      note?: string;
      activities?: string[];
      bestWindow?: string;
    };
    focus?: { metric?: string; headline?: string; note?: string }[];
    watchOuts?: string[];
    tonight?: {
      sleepNeedHours?: number | null;
      bedtimeWindow?: string;
      note?: string;
    };
  };
  foodPlan?: {
    suggestions: AiMealSuggestion[];
    reasoning?: string;
  };
  workoutPlan?: AiWorkoutPlan & { reasoning?: string };
  prediction?: {
    weeklyWeightChangeKg: number;
    projectedWeightKg: number;
    basis: string;
  };
  fitnessLevelDerived?: FitnessLevel;
  feedback?: {
    workoutDifficulty?: 'too_easy' | 'just_right' | 'too_hard';
    skippedWorkoutReason?: 'no_time' | 'tired' | 'injury' | 'other';
    dislikedFoods?: string[];
    replacedMeals?: { original: string; replacement: string }[];
    submittedAt?: string;
  };
  generationContext?: {
    yesterdayProteinG?: number;
    proteinGapG?: number;
    yesterdayCalories?: number;
    calorieGap?: number;
    recentWorkoutsPerWeek?: number;
    avgWorkoutDurationMin?: number;
  };
  yesterdayFeedback?: {
    workoutDifficulty?: 'too_easy' | 'just_right' | 'too_hard';
  };
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
