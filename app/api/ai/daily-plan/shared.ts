import type { AiMealSuggestion, AiWorkoutPlan, DailyPlanData } from '@/types';
import { getAgeFromDateOfBirth } from '@/lib/utils';

export type FoodRequestBody = {
  lastWeekFoodDetails?: string;
  goal?: string;
  dietaryPreference?: string;
  allergies?: string[];
  targetProteinG?: number;
  targetCalories?: number;
};

export type OverviewRequestBody = {
  lastWeekSummary?: string;
  goal?: string;
  currentWeightKg?: number;
};

export type OverviewYesterdayContext = {
  date: string;
  totals?: {
    caloriesKcal?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
    fiberG?: number;
    sugarG?: number;
    sodiumMg?: number;
    waterMl?: number;
    workoutMinutes?: number;
    caloriesBurnedKcal?: number;
    steps?: number;
    heartRateAvg?: number;
  };
  meals?: Array<{
    mealType?: string;
    name?: string;
    time?: string;
    quantity?: number;
    unit?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    saturatedFat?: number;
    cholesterol?: number;
  }>;
  workouts?: Array<{
    exercise?: string;
    category?: string;
    durationMinutes?: number;
    caloriesBurnedKcal?: number;
    sets?: number;
    reps?: number;
  }>;
  sleep?: { durationHours?: number; quality1to5?: number } | null;
  weightKg?: number | null;
};

export type OverviewPromptContext = {
  profile?: {
    age?: number;
    dateOfBirth?: string | Date;
    gender?: string;
    height?: number;
    weight?: number;
    activityLevel?: string;
    goal?: string;
    targetWeight?: number;
  } | null;
  targets?: {
    dailyCalories?: number;
    dailyWorkoutMinutes?: number;
    dailyCalorieBurn?: number;
    dailyWater?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    sleepHours?: number;
    dailySteps?: number;
  } | null;
  yesterday?: OverviewYesterdayContext | null;
};

export type OverviewProjectionKey =
  | 'sleep'
  | 'food'
  | 'water'
  | 'workout'
  | 'steps'
  | 'heartRate'
  | 'weight';

export type OverviewProjectionEntry = {
  headline: string;
  coachNote: string;
  actions: string[];
};

export type OverviewProjections = Record<OverviewProjectionKey, OverviewProjectionEntry>;

export type WorkoutRequestBody = {
  lastWeekDetails?: string;
  goal?: string;
  fitnessLevel?: string;
  todayAvailableMinutes?: number;
};

export type WorkoutPromptContext = {
  profile?: {
    age?: number;
    dateOfBirth?: string | Date;
    gender?: string;
    height?: number;
    weight?: number;
    activityLevel?: string;
    goal?: string;
    targetWeight?: number;
    bodyType?: string;
    bodyFat?: number;
    fatFocusAreas?: string[];
    fitnessLevelDerived?: string;
    fitnessLevelUser?: string;
    physiqueGoal?: string;
    workoutLocation?: string;
    equipmentNotes?: string;
  } | null;
  targets?: {
    dailyWorkoutMinutes?: number;
    dailyCalorieBurn?: number;
    dailyCalories?: number;
    dailyWater?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    sleepHours?: number;
    dailySteps?: number;
  } | null;
  recentLogs?: Array<{
    date?: string;
    totalCalories?: number;
    totalProtein?: number;
    totalCarbs?: number;
    totalFat?: number;
    waterIntake?: number;
    caloriesBurned?: number;
    heartRate?: number;
    steps?: number;
    activeCalories?: number;
    distanceKm?: number;
    sleep?: { duration?: number; quality?: number } | null;
    workouts?: Array<{
      exercise?: string;
      category?: string;
      duration?: number;
      caloriesBurned?: number;
      sets?: number;
      reps?: number;
      source?: string;
      notes?: string;
      planExerciseName?: string;
    }>;
  }>;
  recentFeedback?: Array<{
    date?: string;
    feedback?: {
      workoutDifficulty?: string;
      skippedWorkoutReason?: string;
    } | null;
  }>;
};

const VALID_MEAL_TYPES = new Set(['breakfast', 'lunch', 'dinner', 'snack']);
const VALID_INTENSITIES = new Set(['low', 'medium', 'high']);
const VALID_CATEGORIES = new Set(['cardio', 'strength', 'flexibility', 'core']);
const VALID_MUSCLE_GROUPS = new Set(['legs', 'push', 'pull', 'core']);
const VALID_PHASES = new Set(['warmup', 'strength', 'cardio', 'core', 'mobility', 'cooldown']);

/**
 * Lightweight readiness signals derived from recent logs. The LLM decides the
 * actual training strategy now; these are just hints about today's recovery.
 */
export type ReadinessSignals = {
  targetDurationMinutes: number;
  readinessAdjustment: string;
  reduceVolume: boolean;
  reduceExtraCardio: boolean;
  includeLightCardio: boolean;
  avoidHighIntensity: boolean;
  bodyFatPct?: number;
  weightKg?: number;
};

/** @deprecated alias for ReadinessSignals; kept for any external callers */
export type WorkoutPlanConstraints = ReadinessSignals;

export type GoalDirection = 'lose' | 'maintain' | 'gain';

export type WeeklyWorkoutSummary = {
  daysWithWorkout: number;
  daysSkipped: number;
  totalWorkouts: number;
  categoriesTouched: Record<string, number>;
  muscleGroupsTouched: Record<string, number>;
  lastWorkoutDate: string | null;
  lastWorkoutCategory: string | null;
  byDay: Array<{
    date: string;
    entries: Array<{
      exercise: string;
      category: string;
      durationMinutes: number;
      caloriesBurnedKcal: number;
      sets: number;
      reps: number;
      notes: string;
    }>;
  }>;
};

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() || fallback : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toFinite(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function sanitizeWorkoutContext(context?: WorkoutPromptContext) {
  if (!context) return null;

  const profile = context.profile
    ? {
        age: (() => {
          if (context.profile?.dateOfBirth) {
            const derived = getAgeFromDateOfBirth(context.profile.dateOfBirth);
            if (Number.isFinite(derived) && derived > 0) return derived;
          }
          return toFinite(context.profile.age);
        })(),
        gender: asString(context.profile.gender),
        heightCm: toFinite(context.profile.height),
        weightKg: toFinite(context.profile.weight),
        activityLevel: asString(context.profile.activityLevel),
        goal: asString(context.profile.goal),
        targetWeightKg: toFinite(context.profile.targetWeight),
        bodyType: asString(context.profile.bodyType),
        bodyFatPct: toFinite(context.profile.bodyFat),
        fatFocusAreas: Array.isArray(context.profile.fatFocusAreas)
          ? context.profile.fatFocusAreas.map((a) => asString(a)).filter(Boolean)
          : [],
        fitnessLevel: asString(context.profile.fitnessLevelDerived || context.profile.fitnessLevelUser),
        physiqueGoal: asString(context.profile.physiqueGoal),
        workoutLocation: asString(context.profile.workoutLocation),
        equipmentNotes: asString(context.profile.equipmentNotes),
      }
    : null;

  const targets = context.targets
    ? {
        dailyWorkoutMinutes: toFinite(context.targets.dailyWorkoutMinutes),
        dailyCalorieBurnKcal: toFinite(context.targets.dailyCalorieBurn),
        dailyCaloriesKcal: toFinite(context.targets.dailyCalories),
        dailyWaterMl: toFinite(context.targets.dailyWater),
        proteinG: toFinite(context.targets.protein),
        carbsG: toFinite(context.targets.carbs),
        fatG: toFinite(context.targets.fat),
        sleepHours: toFinite(context.targets.sleepHours),
        dailySteps: toFinite(context.targets.dailySteps),
      }
    : null;

  const recentLogs = Array.isArray(context.recentLogs)
    ? context.recentLogs
        .map((log) => ({
          ...(() => {
            const sleepDuration = toFinite(log.sleep?.duration);
            const sleepQuality = toFinite(log.sleep?.quality);
            const hasSleepData = typeof sleepDuration === 'number' || typeof sleepQuality === 'number';
            return {
              recovery: hasSleepData
                ? {
                    sleepDurationHours: sleepDuration,
                    sleepQuality1to5: sleepQuality,
                  }
                : {
                    sleepStatus: 'not_recorded',
                  },
            };
          })(),
          date: asString(log.date),
          nutrition: {
            caloriesKcal: toFinite(log.totalCalories) ?? 0,
            proteinG: toFinite(log.totalProtein) ?? 0,
            carbsG: toFinite(log.totalCarbs) ?? 0,
            fatG: toFinite(log.totalFat) ?? 0,
          },
          hydration: {
            waterMl: toFinite(log.waterIntake) ?? 0,
          },
          activity: {
            caloriesBurnedKcal: toFinite(log.caloriesBurned) ?? 0,
            steps: toFinite(log.steps) ?? 0,
            activeCaloriesKcal: toFinite(log.activeCalories) ?? 0,
            distanceKm: toFinite(log.distanceKm) ?? 0,
            heartRateAvg: toFinite(log.heartRate) ?? 0,
          },
          workouts: Array.isArray(log.workouts)
            ? log.workouts.map((w) => ({
                exercise: asString(w.exercise),
                planExerciseName: asString(w.planExerciseName),
                category: asString(w.category, 'other'),
                durationMinutes: toFinite(w.duration) ?? 0,
                caloriesBurnedKcal: toFinite(w.caloriesBurned) ?? 0,
                sets: toFinite(w.sets) ?? 0,
                reps: toFinite(w.reps) ?? 0,
                source: asString(w.source, 'manual'),
                notes: asString(w.notes),
              }))
            : [],
        }))
        .slice(0, 7)
    : [];

  const recentFeedback = Array.isArray(context.recentFeedback)
    ? context.recentFeedback
        .map((entry) => ({
          date: asString(entry.date),
          workoutDifficulty: asString(entry.feedback?.workoutDifficulty),
          skippedWorkoutReason: asString(entry.feedback?.skippedWorkoutReason),
        }))
        .filter((entry) => entry.date && (entry.workoutDifficulty || entry.skippedWorkoutReason))
        .slice(0, 3)
    : [];

  return { profile, targets, recentLogs, recentFeedback };
}

/**
 * Derive readiness/recovery signals from recent logs.
 *
 * Note: this no longer chooses a training strategy or required muscle-group
 * components — that decision is delegated to the LLM, which is given the full
 * weekly history. Server-side here we only compute objective signals about
 * recovery (protein deficit, sleep, steps) and the time budget for today.
 */
export function deriveReadinessSignals(
  body: WorkoutRequestBody,
  context?: WorkoutPromptContext
): ReadinessSignals {
  const sanitized = sanitizeWorkoutContext(context);
  const bodyFatPct = toFinite(sanitized?.profile?.bodyFatPct);

  const minutes = Number(body.todayAvailableMinutes);
  const targetDurationMinutes = Number.isFinite(minutes) && minutes > 0
    ? clamp(Math.round(minutes), 12, 120)
    : clamp(Math.round(sanitized?.targets?.dailyWorkoutMinutes ?? 30), 12, 120);

  const recentLogs = sanitized?.recentLogs ?? [];
  const proteinTarget = sanitized?.targets?.proteinG;
  const proteinRatios = recentLogs
    .map((log) => {
      const protein = toFinite(log.nutrition?.proteinG);
      if (!proteinTarget || proteinTarget <= 0 || protein == null || protein < 0) return null;
      return protein / proteinTarget;
    })
    .filter((v): v is number => typeof v === 'number');
  const avgProteinRatio = proteinRatios.length > 0
    ? proteinRatios.reduce((sum, ratio) => sum + ratio, 0) / proteinRatios.length
    : 1;

  const stepValues = recentLogs
    .map((log) => toFinite(log.activity?.steps))
    .filter((v): v is number => typeof v === 'number' && v >= 0);
  const avgSteps = stepValues.length > 0
    ? stepValues.reduce((sum, steps) => sum + steps, 0) / stepValues.length
    : 0;

  const sleepDurations = recentLogs
    .map((log) => toFinite(log.recovery?.sleepDurationHours))
    .filter((v): v is number => typeof v === 'number' && v > 0);
  const avgSleepHours = sleepDurations.length > 0
    ? sleepDurations.reduce((sum, hours) => sum + hours, 0) / sleepDurations.length
    : (sanitized?.targets?.sleepHours ?? 7);

  const stepsTarget = sanitized?.targets?.dailySteps ?? 8000;
  const reduceVolume = avgProteinRatio < 0.7;
  const reduceExtraCardio = avgSteps > stepsTarget || avgSteps > 8000;
  const includeLightCardio = avgSteps > 0 && avgSteps < 3000;
  const avoidHighIntensity = avgSleepHours < 6;

  const readinessLines: string[] = [];
  if (reduceVolume) readinessLines.push('reduced volume because recent protein intake is under 70% of target');
  if (reduceExtraCardio) readinessLines.push('reduced extra cardio because recent steps already exceed target');
  if (includeLightCardio) readinessLines.push('included light cardio because recent step count is low');
  if (avoidHighIntensity) readinessLines.push('avoided high intensity because recent sleep is under 6 hours');
  if (readinessLines.length === 0) readinessLines.push('normal volume and intensity based on current readiness');

  return {
    targetDurationMinutes,
    readinessAdjustment: readinessLines.join('; '),
    reduceVolume,
    reduceExtraCardio,
    includeLightCardio,
    avoidHighIntensity,
    bodyFatPct,
    weightKg: toFinite(sanitized?.profile?.weightKg),
  };
}

/** @deprecated kept as alias; new callers should use `deriveReadinessSignals` */
export const deriveWorkoutPlanConstraints = deriveReadinessSignals;

/**
 * Derive the user's goal direction from current vs. target weight, falling back
 * to the explicit `profile.goal` field only if weight data is missing.
 *
 * Uses a 0.5 kg deadband — wide enough to absorb day-to-day water-weight noise
 * but tight enough that a 1 kg gap from target reads as a real intent to lose
 * (e.g. weight 66, target 65 → "lose").
 */
export function deriveGoalDirection(
  weightKg?: number,
  targetWeightKg?: number,
  profileGoal?: string
): GoalDirection {
  const weight = toFinite(weightKg);
  const target = toFinite(targetWeightKg);
  if (typeof weight === 'number' && typeof target === 'number' && target > 0) {
    const delta = weight - target;
    if (delta > 0.5) return 'lose';
    if (delta < -0.5) return 'gain';
    return 'maintain';
  }
  const fallback = asString(profileGoal).toLowerCase();
  if (fallback === 'lose' || fallback === 'lose_weight' || fallback === 'fat_loss') return 'lose';
  if (fallback === 'gain' || fallback === 'gain_weight' || fallback === 'muscle_gain' || fallback === 'bulk') return 'gain';
  return 'maintain';
}

/**
 * Build a compact summary of the recent workout window (yesterday and the day
 * before) for the LLM. Today is intentionally excluded — today's workouts are
 * the plan we're about to generate, and today's partial-day nutrition / steps
 * would skew readiness averages.
 */
export function buildWeeklyWorkoutSummary(
  context: WorkoutPromptContext | undefined,
  _todayDate: string
): WeeklyWorkoutSummary {
  void _todayDate;
  const sanitized = sanitizeWorkoutContext(context);
  const logs = sanitized?.recentLogs ?? [];

  const categoriesTouched: Record<string, number> = {};
  const muscleGroupsTouched: Record<string, number> = {};
  let totalWorkouts = 0;
  let daysWithWorkout = 0;
  let lastWorkoutDate: string | null = null;
  let lastWorkoutCategory: string | null = null;

  const byDay: WeeklyWorkoutSummary['byDay'] = [];

  for (const log of logs) {
    const date = asString(log.date);
    const workouts = (log.workouts ?? []).map((w) => ({
      exercise: asString(w.exercise),
      category: asString(w.category, 'other'),
      durationMinutes: toFinite(w.durationMinutes) ?? 0,
      caloriesBurnedKcal: toFinite(w.caloriesBurnedKcal) ?? 0,
      sets: toFinite(w.sets) ?? 0,
      reps: toFinite(w.reps) ?? 0,
      notes: asString(w.notes),
    }));
    byDay.push({ date, entries: workouts });
    if (workouts.length > 0) {
      daysWithWorkout += 1;
      totalWorkouts += workouts.length;
      for (const w of workouts) {
        categoriesTouched[w.category] = (categoriesTouched[w.category] ?? 0) + 1;
      }
      if (!lastWorkoutDate || date > lastWorkoutDate) {
        lastWorkoutDate = date;
        lastWorkoutCategory = workouts[0]?.category ?? null;
      }
    }
  }

  // Oldest first for readability.
  byDay.sort((a, b) => a.date.localeCompare(b.date));

  return {
    daysWithWorkout,
    daysSkipped: byDay.length - daysWithWorkout,
    totalWorkouts,
    categoriesTouched,
    muscleGroupsTouched,
    lastWorkoutDate,
    lastWorkoutCategory,
    byDay,
  };
}

export function buildFoodPrompt(body: FoodRequestBody, date: string): string {
  const details = body.lastWeekFoodDetails?.trim() || 'No previous food details provided.';
  const goal = body.goal?.trim() || 'Eat balanced meals for health';
  const dietaryPreferenceRaw = body.dietaryPreference?.trim() || 'no_preference';
  const dietaryPreference = (() => {
    if (dietaryPreferenceRaw === 'vegetarian') return 'Vegetarian';
    if (dietaryPreferenceRaw === 'non_vegetarian') return 'Non-vegetarian';
    if (dietaryPreferenceRaw === 'vegan') return 'Vegan';
    return 'No specific preference';
  })();
  const allergies = Array.isArray(body.allergies)
    ? body.allergies.map((entry) => entry.trim()).filter(Boolean)
    : [];
  const targetProtein = Number(body.targetProteinG);
  const targetCalories = Number(body.targetCalories);
  const proteinLine = Number.isFinite(targetProtein) && targetProtein > 0
    ? `Daily protein target: ${Math.round(targetProtein)}g`
    : 'Daily protein target: not provided';
  const caloriesLine = Number.isFinite(targetCalories) && targetCalories > 0
    ? `Daily calories target: ${Math.round(targetCalories)} kcal`
    : 'Daily calories target: not provided';
  return [
    `Plan date: ${date}`,
    `Goal: ${goal}`,
    `Dietary preference: ${dietaryPreference}`,
    `Allergies or avoid list: ${allergies.length > 0 ? allergies.join(', ') : 'None provided'}`,
    proteinLine,
    caloriesLine,
    'Protein rule: Keep total daily protein close to the protein target and keep each main meal protein-forward.',
    `Last week food details from user: ${details}`,
  ].join('\n');
}

export function buildOverviewPrompt(
  body: OverviewRequestBody,
  date: string,
  context?: OverviewPromptContext,
): string {
  const goal = body.goal?.trim() || asString(context?.profile?.goal) || 'General health improvement';
  const weightFromBody = Number(body.currentWeightKg);
  const weightKg = Number.isFinite(weightFromBody) && weightFromBody > 0
    ? weightFromBody
    : toFinite(context?.profile?.weight);

  const profile = context?.profile
    ? {
        age: (() => {
          if (context.profile?.dateOfBirth) {
            const derived = getAgeFromDateOfBirth(context.profile.dateOfBirth);
            if (Number.isFinite(derived) && derived > 0) return derived;
          }
          return toFinite(context.profile.age);
        })(),
        gender: asString(context.profile.gender) || undefined,
        heightCm: toFinite(context.profile.height),
        weightKg,
        activityLevel: asString(context.profile.activityLevel) || undefined,
        targetWeightKg: toFinite(context.profile.targetWeight),
      }
    : null;

  const targets = context?.targets
    ? {
        dailyCaloriesKcal: toFinite(context.targets.dailyCalories),
        proteinG: toFinite(context.targets.protein),
        carbsG: toFinite(context.targets.carbs),
        fatG: toFinite(context.targets.fat),
        dailyWaterMl: toFinite(context.targets.dailyWater),
        dailyWorkoutMinutes: toFinite(context.targets.dailyWorkoutMinutes),
        dailyCalorieBurnKcal: toFinite(context.targets.dailyCalorieBurn),
        sleepHours: toFinite(context.targets.sleepHours),
        dailySteps: toFinite(context.targets.dailySteps),
      }
    : null;

  const yesterday = context?.yesterday
    ? {
        date: asString(context.yesterday.date),
        totals: context.yesterday.totals ?? {},
        meals: Array.isArray(context.yesterday.meals) ? context.yesterday.meals : [],
        workouts: Array.isArray(context.yesterday.workouts) ? context.yesterday.workouts : [],
        sleep: context.yesterday.sleep ?? null,
        weightKg: context.yesterday.weightKg ?? null,
      }
    : null;

  const fallbackSummary = body.lastWeekSummary?.trim();
  const inputs = {
    planDate: date,
    goal,
    profile,
    targets,
    yesterday,
    ...(fallbackSummary ? { lastWeekSummaryFromUser: fallbackSummary } : {}),
  };

  return [
    'Inputs are provided as a JSON object below. Generate the daily overview using YESTERDAY\'s data only (yesterday.totals, yesterday.meals, yesterday.workouts, yesterday.sleep, yesterday.weightKg) plus the user\'s targets. The UI will prepend "At this rate →" to every projection.headline, so do NOT write that phrase yourself. Every projection.coachNote must reference real numbers or named items from yesterday, and every projection.actions[] step must begin with a verb. Do not invent values that are not in the inputs.',
    JSON.stringify({ inputs }, null, 2),
  ].join('\n');
}

const WEEKDAY_KEYS: Array<'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'> = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

/** Parse a "Planned: X | Executed: Y" notes string into structured fields. */
function parsePlannedExecuted(notes: string): { planned?: string; executed?: string } {
  if (!notes) return {};
  const planned = notes.match(/Planned:\s*([^|]+?)\s*(?:\||$)/i);
  const executed = notes.match(/Executed:\s*([\s\S]+?)\s*$/i);
  const out: { planned?: string; executed?: string } = {};
  if (planned && planned[1]) out.planned = planned[1].trim();
  if (executed && executed[1]) out.executed = executed[1].trim();
  return out;
}

/** Derive a per-day muscle-group / category summary string for lastWeekSplit. */
function summarizeDaySplit(entries: WeeklyWorkoutSummary['byDay'][number]['entries']): string {
  if (entries.length === 0) return 'rest';
  const groups = new Set<string>();
  for (const e of entries) {
    const cat = (e.category || '').toLowerCase();
    if (cat === 'cardio') { groups.add('cardio'); continue; }
    if (cat === 'flexibility') { groups.add('mobility'); continue; }
    groups.add(inferMuscleGroup(e.exercise || '', cat));
  }
  return Array.from(groups).join(', ') || 'rest';
}

export function buildWorkoutPrompt(
  body: WorkoutRequestBody,
  date: string,
  context?: WorkoutPromptContext
): string {
  const sanitized = sanitizeWorkoutContext(context);
  const signals = deriveReadinessSignals(body, context);
  const fitnessLevel = body.fitnessLevel?.trim() || sanitized?.profile?.fitnessLevel || 'beginner';
  const weightKg = sanitized?.profile?.weightKg;
  const targetWeightKg = sanitized?.profile?.targetWeightKg;
  const goalDirection = deriveGoalDirection(weightKg, targetWeightKg, sanitized?.profile?.goal);
  const weeklySummary = buildWeeklyWorkoutSummary(context, date);

  const profileForPrompt = sanitized?.profile
    ? {
        age: sanitized.profile.age,
        gender: sanitized.profile.gender,
        heightCm: sanitized.profile.heightCm,
        weightKg: sanitized.profile.weightKg,
        activityLevel: sanitized.profile.activityLevel,
        goal: goalDirection,
        targetWeightKg: sanitized.profile.targetWeightKg,
        bodyType: sanitized.profile.bodyType,
        bodyFatPct: sanitized.profile.bodyFatPct,
        fitnessLevel: sanitized.profile.fitnessLevel,
        physiqueGoal: sanitized.profile.physiqueGoal,
        workoutLocation: sanitized.profile.workoutLocation,
        equipmentNotes: sanitized.profile.equipmentNotes,
      }
    : null;

  // Build a per-weekday split map from the rolling window. Only includes days we
  // have logs for — we don't pre-fill "rest" for missing days, since absent data
  // is not the same as a confirmed rest day.
  const lastWeekSplit: Record<string, string> = {};
  for (const day of weeklySummary.byDay) {
    const d = new Date(day.date);
    if (Number.isNaN(d.getTime())) continue;
    const key = WEEKDAY_KEYS[d.getDay()];
    lastWeekSplit[key] = summarizeDaySplit(day.entries);
  }

  // Build full per-day recentLogs array with recovery / nutrition / hydration / activity / workouts.
  const sanitizedLogs = sanitized?.recentLogs ?? [];
  const logsByDate = new Map(sanitizedLogs.map((log) => [asString(log.date), log]));
  const recentLogs = weeklySummary.byDay.map((day) => {
    const log = logsByDate.get(day.date);
    const workouts = day.entries.map((w) => {
      const { planned, executed } = parsePlannedExecuted(w.notes);
      const details: Record<string, unknown> = {
        type: w.category,
      };
      if (w.sets > 0) details.sets = w.sets;
      if (w.reps > 0) details.reps = w.reps;
      if (w.durationMinutes > 0) details.durationMinutes = w.durationMinutes;
      if (w.caloriesBurnedKcal > 0) details.caloriesKcal = Math.round(w.caloriesBurnedKcal);
      if (planned) details.planned = planned;
      if (executed) details.executed = executed;
      return { exercise: w.exercise, details };
    });
    return {
      date: day.date,
      recovery: log?.recovery ?? { sleepStatus: 'not_recorded' },
      nutrition: log?.nutrition,
      hydration: log?.hydration,
      activity: log?.activity,
      workouts,
    };
  });

  const inputs = {
    planDate: date,
    goal: goalDirection,
    fitnessLevel,
    todayWorkoutTargetMinutes: signals.targetDurationMinutes,
    readinessSignals: signals.readinessAdjustment,
    lastWeekSplit,
    profile: profileForPrompt,
    targets: sanitized?.targets ?? null,
    recentLogs,
    ...(sanitized?.recentFeedback?.length ? { recentFeedback: sanitized.recentFeedback } : {}),
  };

  // The model gets a structured JSON object preceded by a one-line directive so
  // it knows how to interpret it.
  return [
    'Inputs are provided as a JSON object below. Decide today\'s session structure and per-exercise prescription. Use lastWeekSplit + today\'s workouts in recentLogs to avoid repeating body parts already trained in the last 1–2 days. Only days with logged data are included; absent days are unknown, not confirmed rest.',
    JSON.stringify({ inputs }, null, 2),
  ].join('\n');
}

export function normalizeFoodPlan(input: unknown): NonNullable<DailyPlanData['foodPlan']> {
  const root = (input && typeof input === 'object') ? input as Record<string, unknown> : {};
  const rawSuggestions = Array.isArray(root.suggestions) ? root.suggestions : [];
  const suggestions: AiMealSuggestion[] = rawSuggestions
    .map((raw) => {
      const meal = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
      const mealType = asString(meal.mealType, 'snack').toLowerCase();
      return {
        name: asString(meal.name, 'Meal suggestion'),
        description: asString(meal.description),
        calories: clamp(Math.round(asNumber(meal.calories, 350)), 0, 2000),
        protein: clamp(Math.round(asNumber(meal.protein, 15)), 0, 300),
        carbs: clamp(Math.round(asNumber(meal.carbs, 40)), 0, 400),
        fat: clamp(Math.round(asNumber(meal.fat, 10)), 0, 200),
        mealType: (VALID_MEAL_TYPES.has(mealType) ? mealType : 'snack') as AiMealSuggestion['mealType'],
        ingredients: Array.isArray(meal.ingredients)
          ? meal.ingredients.map((item) => String(item).trim()).filter(Boolean).slice(0, 20)
          : [],
        isVegetarian: Boolean(meal.isVegetarian),
      };
    })
    .filter((meal) => meal.name.length > 0)
    .slice(0, 12);

  return {
    suggestions,
    reasoning: asString(root.reasoning) || undefined,
  };
}

function inferMuscleGroup(name: string, category: string): 'legs' | 'push' | 'pull' | 'core' {
  const n = name.toLowerCase();
  if (category === 'core' || /core|plank|crunch|dead bug|bird dog|russian twist|hollow hold/.test(n)) return 'core';
  if (/squat|lunge|glute|hamstring|calf|step-up|wall sit/.test(n)) return 'legs';
  if (/push|press|dip|chest|shoulder|tricep/.test(n)) return 'push';
  if (/row|pull|lat|rear delt|bicep/.test(n)) return 'pull';
  return category === 'cardio' ? 'legs' : 'push';
}

type WorkoutExercise = AiWorkoutPlan['exercises'][number];
const EQUIPMENT_MAP: Record<string, string> = {
  'Bent Over Dumbbell Rows': 'Resistance Band Rows',
  'Lat Pulldown': 'Towel Rows',
  'Cable Row': 'Seated Resistance Band Rows',
};

function normalizeMuscleGroup(exercise: WorkoutExercise): WorkoutExercise {
  if (exercise.category === 'cardio') {
    return { ...exercise, muscleGroup: 'legs' };
  }
  if (exercise.category === 'flexibility') {
    return { ...exercise, muscleGroup: 'core' };
  }
  return exercise;
}

function enforceBeginnerEquipment(exercise: WorkoutExercise): WorkoutExercise {
  const replacement = EQUIPMENT_MAP[exercise.name];
  if (!replacement) return exercise;
  return { ...exercise, name: replacement };
}

function normalizeWarmup(exercise: WorkoutExercise): WorkoutExercise {
  return {
    ...exercise,
    sets: 1,
    reps: 'continuous',
    durationMinutes: clamp(Math.round(asNumber(exercise.durationMinutes, 4)), 3, 5),
    restSeconds: 0,
    intensity: 'low',
    category: 'cardio',
    muscleGroup: 'legs',
  };
}

function defaultWarmup(): WorkoutExercise {
  return {
    name: 'March in Place + Arm Circles',
    sets: 1,
    reps: 'continuous',
    durationMinutes: 4,
    restSeconds: 0,
    category: 'cardio',
    intensity: 'low',
    muscleGroup: 'legs',
  };
}

function isLikelyWarmup(exercise: WorkoutExercise): boolean {
  const name = exercise.name.toLowerCase();
  return /warm.?up|march in place|arm circles|mobility|joint rotation/.test(name)
    || (exercise.category === 'flexibility' && exercise.intensity === 'low' && (exercise.durationMinutes ?? 0) <= 5);
}

function ensureMinCooldown(exercises: WorkoutExercise[]): WorkoutExercise[] {
  const stretches = exercises.filter((exercise) => exercise.category === 'flexibility');
  if (stretches.length >= 2) {
    return stretches.slice(0, 4).map((stretch) => ({
      ...stretch,
      sets: Math.max(1, stretch.sets),
      restSeconds: 0,
      intensity: 'low',
      muscleGroup: 'core',
    }));
  }
  const required: WorkoutExercise[] = [
    {
      name: 'Standing Quad Stretch',
      sets: 1,
      reps: '30 seconds each leg',
      durationMinutes: 2,
      restSeconds: 0,
      category: 'flexibility',
      intensity: 'low',
      muscleGroup: 'core',
    },
    {
      name: 'Hamstring Stretch',
      sets: 1,
      reps: '30 seconds each leg',
      durationMinutes: 2,
      restSeconds: 0,
      category: 'flexibility',
      intensity: 'low',
      muscleGroup: 'core',
    },
  ];
  return [...stretches, ...required].slice(0, 2);
}

function enforceWorkoutOrder(exercises: WorkoutExercise[]): WorkoutExercise[] {
  const warmupCandidates: WorkoutExercise[] = [];
  const strength: WorkoutExercise[] = [];
  const cardio: WorkoutExercise[] = [];
  const core: WorkoutExercise[] = [];
  const cooldownCandidates: WorkoutExercise[] = [];

  for (const exercise of exercises) {
    if (isLikelyWarmup(exercise)) {
      warmupCandidates.push(exercise);
    } else if (exercise.category === 'strength') {
      strength.push(exercise);
    } else if (exercise.category === 'cardio') {
      cardio.push(exercise);
    } else if (exercise.category === 'core') {
      core.push(exercise);
    } else if (exercise.category === 'flexibility') {
      cooldownCandidates.push(exercise);
    }
  }

  const warmup = warmupCandidates.length > 0
    ? [normalizeWarmup(warmupCandidates[0])]
    : [defaultWarmup()];
  const cooldown = ensureMinCooldown([...warmupCandidates.slice(1), ...cooldownCandidates]);
  return [...warmup, ...strength, ...cardio, ...core, ...cooldown];
}

function dedupeExercises(exercises: WorkoutExercise[]): WorkoutExercise[] {
  const seen = new Set<string>();
  const deduped: WorkoutExercise[] = [];
  for (const exercise of exercises) {
    const key = `${exercise.name.toLowerCase()}|${exercise.category}|${exercise.muscleGroup}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(exercise);
  }
  return deduped;
}

function estimateCaloriesFromMet(exercises: AiWorkoutPlan['exercises'], weightKg?: number): number {
  const weight = clamp(Math.round((weightKg ?? 70) * 10) / 10, 40, 160);
  const total = exercises.reduce((sum, exercise) => {
    const minutes = clamp(Math.round(asNumber(exercise.durationMinutes, 0)), 0, 180);
    const intensity = exercise.intensity ?? 'medium';
    const met = (() => {
      if (exercise.category === 'cardio') return intensity === 'low' ? 4.2 : intensity === 'high' ? 6 : 5;
      if (exercise.category === 'strength') return intensity === 'low' ? 3.5 : intensity === 'high' ? 6 : 4.8;
      if (exercise.category === 'core') return intensity === 'low' ? 3 : intensity === 'high' ? 4.5 : 3.8;
      return 2.5;
    })();
    return sum + ((met * 3.5 * weight) / 200) * minutes;
  }, 0);
  return clamp(Math.round(total), 40, 1200);
}

function generateProgression(exercises: WorkoutExercise[]): string {
  const push = exercises.find((exercise) => exercise.muscleGroup === 'push');
  const core = exercises.find((exercise) => exercise.muscleGroup === 'core');
  return `Next session: add +2 reps to ${push?.name || 'your push exercise'} and +5 sec to ${core?.name || 'your core holds'}`;
}

function alignDuration(exercises: AiWorkoutPlan['exercises'], targetMinutes: number): AiWorkoutPlan['exercises'] {
  const target = clamp(targetMinutes, 12, 120);
  const current = exercises.reduce((sum, ex) => sum + clamp(Math.round(asNumber(ex.durationMinutes, 0)), 0, 180), 0);
  if (Math.abs(current - target) <= 3) return exercises;
  const updated = exercises.map((exercise) => ({ ...exercise }));
  let delta = target - current;
  const priorities = delta > 0
    ? updated
    : updated.filter((exercise) => exercise.category === 'cardio' || exercise.category === 'strength');
  for (const exercise of priorities) {
    if (Math.abs(delta) <= 3) break;
    const currentDuration = clamp(Math.round(asNumber(exercise.durationMinutes, 5)), 1, 180);
    if (delta > 0) {
      const add = Math.min(4, delta);
      exercise.durationMinutes = currentDuration + add;
      delta -= add;
    } else {
      const removable = Math.max(0, currentDuration - 3);
      const remove = Math.min(removable, Math.abs(delta));
      exercise.durationMinutes = currentDuration - remove;
      delta += remove;
    }
  }
  return updated;
}

export function normalizeWorkoutPlan(input: unknown, signals?: ReadinessSignals): AiWorkoutPlan {
  const parsedRoot = (input && typeof input === 'object') ? input as Record<string, unknown> : {};
  const root = (parsedRoot.workoutPlan && typeof parsedRoot.workoutPlan === 'object')
    ? parsedRoot.workoutPlan as Record<string, unknown>
    : parsedRoot;
  const rawExercises = Array.isArray(root.exercises) ? root.exercises : [];

  let exercises: AiWorkoutPlan['exercises'] = rawExercises
    .map((raw) => {
      const ex = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
      const intensity = asString(ex.intensity, 'medium').toLowerCase();
      const category = asString(ex.category, 'strength').toLowerCase();
      const muscleGroupRaw = asString(ex.muscleGroup).toLowerCase();
      const phaseRaw = asString(ex.phase).toLowerCase();
      const name = asString(ex.name, 'Exercise');
      const steps = Array.isArray(ex.steps)
        ? ex.steps.map((step) => String(step).trim()).filter(Boolean).slice(0, 10)
        : [];
      const safeCategory = (VALID_CATEGORIES.has(category) ? category : 'strength') as AiWorkoutPlan['exercises'][number]['category'];
      const inferredMuscleGroup = inferMuscleGroup(name, safeCategory);
      const phase = VALID_PHASES.has(phaseRaw) ? (phaseRaw as NonNullable<AiWorkoutPlan['exercises'][number]['phase']>) : undefined;

      return {
        name,
        ...(steps.length > 0 ? { steps } : {}),
        ...(phase ? { phase } : {}),
        sets: clamp(Math.round(asNumber(ex.sets, 3)), 1, 20),
        reps: asString(ex.reps, '10-12'),
        durationMinutes: clamp(Math.round(asNumber(ex.durationMinutes, 5)), 1, 180),
        restSeconds: clamp(Math.round(asNumber(ex.restSeconds, 60)), 0, 600),
        intensity: (VALID_INTENSITIES.has(intensity) ? intensity : 'medium') as 'low' | 'medium' | 'high',
        category: safeCategory,
        muscleGroup: (VALID_MUSCLE_GROUPS.has(muscleGroupRaw) ? muscleGroupRaw : inferredMuscleGroup) as 'legs' | 'push' | 'pull' | 'core',
      };
    })
    .filter((exercise) => exercise.name.length > 0)
    .slice(0, 20);

  exercises = exercises.map(normalizeMuscleGroup).map(enforceBeginnerEquipment);
  exercises = dedupeExercises(exercises);

  // Honour readiness signals (volume/intensity/cardio adjustments). We deliberately
  // do NOT inject "required" body-part components anymore — the LLM decides.
  if (signals?.reduceVolume) {
    exercises = exercises.map((exercise) => ({
      ...exercise,
      sets: exercise.category === 'flexibility' ? exercise.sets : Math.max(2, Math.min(exercise.sets, 3)),
    }));
  }

  if (signals?.avoidHighIntensity) {
    exercises = exercises.map((exercise) => ({
      ...exercise,
      intensity: exercise.intensity === 'high' ? 'medium' : exercise.intensity,
    }));
  }

  if (signals?.reduceExtraCardio) {
    exercises = exercises.map((exercise) => ({
      ...exercise,
      durationMinutes: exercise.category === 'cardio' && !isLikelyWarmup(exercise)
        ? Math.min(exercise.durationMinutes ?? 5, 10)
        : exercise.durationMinutes,
    }));
  }

  if (signals?.includeLightCardio && !exercises.some((exercise) => exercise.category === 'cardio' && (exercise.durationMinutes ?? 0) >= 6)) {
    exercises.push({
      name: 'Brisk Walk',
      sets: 1,
      reps: 'steady pace',
      durationMinutes: 8,
      restSeconds: 0,
      category: 'cardio',
      intensity: 'low',
      muscleGroup: 'legs',
      phase: 'cardio',
    });
  }

  exercises = enforceWorkoutOrder(exercises);
  exercises = alignDuration(exercises, signals?.targetDurationMinutes ?? Math.round(asNumber(root.durationMinutes, 30)));

  const durationMinutes = exercises.reduce((sum, exercise) => sum + (exercise.durationMinutes ?? 0), 0);
  const readinessAdjustment = signals?.readinessAdjustment ?? 'normal volume and intensity based on current readiness';
  const weeklyStrategyChosen = asString(root.weeklyStrategyChosen) || asString(root.strategyUsed) || undefined;
  const whyToday = asString(root.whyToday) || undefined;

  return {
    name: asString(root.name, 'Today Workout'),
    description: asString(root.description, 'Daily training designed from your profile, behavior, and recovery signals.'),
    weeklyStrategyChosen,
    whyToday,
    readinessAdjustment,
    progressionTip: asString(root.progressionTip) || generateProgression(exercises),
    reasoning: asString(root.reasoning, `Plan built from profile, weekly history, and readiness. Readiness: ${readinessAdjustment}.`),
    exercises,
    estimatedCalories: Number.isFinite(asNumber(root.estimatedCalories, NaN))
      ? clamp(Math.round(asNumber(root.estimatedCalories, 0)), 40, 1200)
      : estimateCaloriesFromMet(exercises, signals?.weightKg),
    durationMinutes: clamp(Math.round(durationMinutes), 12, 180),
  };
}

const PROJECTION_KEYS: OverviewProjectionKey[] = [
  'sleep', 'food', 'water', 'workout', 'steps', 'heartRate', 'weight',
];

function normalizeProjectionEntry(raw: unknown): OverviewProjectionEntry {
  const obj = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
  const headline = asString(obj.headline);
  const coachNote = asString(obj.coachNote);
  const rawActions = Array.isArray(obj.actions) ? obj.actions : [];
  const actions = rawActions
    .map((a) => asString(a))
    .filter((a) => a.length > 0)
    .slice(0, 6);
  return {
    headline: headline || 'No data yet',
    coachNote: coachNote || '',
    actions,
  };
}

export function normalizeOverview(input: unknown): {
  topInsight: string | null;
  projections: OverviewProjections;
} {
  const root = (input && typeof input === 'object') ? input as Record<string, unknown> : {};
  const projectionsRoot = (root.projections && typeof root.projections === 'object')
    ? root.projections as Record<string, unknown>
    : {};

  const projections = PROJECTION_KEYS.reduce((acc, key) => {
    acc[key] = normalizeProjectionEntry(projectionsRoot[key]);
    return acc;
  }, {} as OverviewProjections);

  return {
    topInsight: asString(root.topInsight) || null,
    projections,
  };
}
