// ============================================
// DailyPlan Model - MongoDB/Mongoose
// ============================================
// Stores the AI-generated daily health plan for each user.
// Plans are generated nightly by cron at 11:55 PM.
// Unique index: { userId, date }

import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { Types } from 'mongoose';

export interface IDailyPlanDocument extends Document {
  userId: Types.ObjectId;
  date: string; // 'YYYY-MM-DD' - the day this plan is FOR
  generatedAt: Date;
  status: 'generating' | 'ready' | 'failed';
  errorMessage?: string;

  topInsight?: string; // AI-selected #1 priority for the day
  /** One-sentence "Today's Body Summary" cached per day by /api/intelligence. */
  bodySummary?: string;
  /** Per-metric projection cards (sleep/food/water/workout/steps/heartRate/weight). */
  projections?: {
    sleep?:     { headline?: string; coachNote?: string; actions?: string[] };
    food?:      { headline?: string; coachNote?: string; actions?: string[] };
    water?:     { headline?: string; coachNote?: string; actions?: string[] };
    workout?:   { headline?: string; coachNote?: string; actions?: string[] };
    steps?:     { headline?: string; coachNote?: string; actions?: string[] };
    heartRate?: { headline?: string; coachNote?: string; actions?: string[] };
    weight?:    { headline?: string; coachNote?: string; actions?: string[] };
  };

  /** WHOOP-style AI morning briefing built from scores + full history. */
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
    suggestions: {
      name: string;
      description: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber?: number;
      sugar?: number;
      sodium?: number;
      iron?: number;
      calcium?: number;
      mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      ingredients: string[];
      /** Per-ingredient nutrition; imported plans only. `ingredients` keeps just the names. */
      items?: {
        name: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber: number;
        sugar: number;
        sodium: number;
        iron: number;
        calcium: number;
      }[];
      steps: string[];
      prepMinutes?: number;
      cookMinutes?: number;
      isVegetarian: boolean;
    }[];
    reasoning?: string;
  };

  workoutPlan?: {
    name: string;
    description: string;
    /** @deprecated kept for old plans; new plans use `weeklyStrategyChosen` */
    strategyUsed?: string;
    /** Free-text description of the weekly split the LLM picked */
    weeklyStrategyChosen?: string;
    /** One-line reason for why today's session looks the way it does */
    whyToday?: string;
    readinessAdjustment?: string;
    progressionTip?: string;
    exercises: {
      name: string;
      steps?: string[];
      sets: number;
      reps: string;
      phase?: 'warmup' | 'strength' | 'cardio' | 'core' | 'mobility' | 'cooldown';
      durationMinutes?: number;
      restSeconds: number;
      intensity?: 'low' | 'medium' | 'high';
      category?: string;
      muscleGroup?: 'legs' | 'push' | 'pull' | 'core';
      /** Prescribed load in kg. Source units are preserved in `loadNote`. */
      weightKg?: number;
      loadNote?: string;
      repsMax?: number;
      bodyweight?: boolean;
    }[];
    estimatedCalories: number;
    durationMinutes: number;
    reasoning?: string;
  };

  /** @deprecated replaced by `projections.weight`; still written by the nightly cron path. */
  prediction?: {
    weeklyWeightChangeKg: number;
    projectedWeightKg: number;
    basis: string;
  };

  fitnessLevelDerived?: string;

  feedback?: {
    workoutDifficulty?: 'too_easy' | 'just_right' | 'too_hard';
    skippedWorkoutReason?: 'no_time' | 'tired' | 'injury' | 'other';
    dislikedFoods?: string[];
    replacedMeals?: { original: string; replacement: string }[];
    submittedAt?: Date;
  };

  generationContext?: {
    yesterdayProteinG?: number;
    proteinGapG?: number;
    yesterdayCalories?: number;
    calorieGap?: number;
    recentWorkoutsPerWeek?: number;
    avgWorkoutDurationMin?: number;
  };

}

// Per-ingredient nutrition. `ingredients` above is only names, which loses the
// per-item numbers an imported plan carries. Imported plans populate this instead.
const MealItemSchema = new Schema(
  {
    name: { type: String, required: true },
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    fiber: { type: Number, default: 0 },
    sugar: { type: Number, default: 0 },
    sodium: { type: Number, default: 0 },
    iron: { type: Number, default: 0 },
    calcium: { type: Number, default: 0 },
  },
  { _id: false }
);

const MealSuggestionSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    // Micronutrient totals for the meal. Optional so AI-generated plans, which
    // do not estimate these, stay unchanged.
    fiber: { type: Number, default: 0 },
    sugar: { type: Number, default: 0 },
    sodium: { type: Number, default: 0 },
    iron: { type: Number, default: 0 },
    calcium: { type: Number, default: 0 },
    mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack'], default: 'snack' },
    ingredients: { type: [String], default: [] },
    items: { type: [MealItemSchema], default: undefined },
    steps: { type: [String], default: [] },
    prepMinutes: { type: Number, min: 0, max: 600 },
    cookMinutes: { type: Number, min: 0, max: 600 },
    isVegetarian: { type: Boolean, default: false },
  },
  { _id: false }
);

const ProjectionEntrySchema = new Schema(
  {
    headline: { type: String, default: '' },
    coachNote: { type: String, default: '' },
    actions: { type: [String], default: [] },
  },
  { _id: false }
);

const ProjectionsSchema = new Schema(
  {
    sleep:     { type: ProjectionEntrySchema, default: undefined },
    food:      { type: ProjectionEntrySchema, default: undefined },
    water:     { type: ProjectionEntrySchema, default: undefined },
    workout:   { type: ProjectionEntrySchema, default: undefined },
    steps:     { type: ProjectionEntrySchema, default: undefined },
    heartRate: { type: ProjectionEntrySchema, default: undefined },
    weight:    { type: ProjectionEntrySchema, default: undefined },
  },
  { _id: false }
);

const OutlookFocusSchema = new Schema(
  {
    metric: { type: String, default: '' },
    headline: { type: String, default: '' },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const OutlookSchema = new Schema(
  {
    headline: { type: String, default: '' },
    recoverySummary: { type: String, default: '' },
    today: {
      effort: { type: String, enum: ['push', 'maintain', 'recover', 'rest'] },
      note: { type: String, default: '' },
      activities: { type: [String], default: [] },
      bestWindow: { type: String, default: '' },
    },
    focus: { type: [OutlookFocusSchema], default: [] },
    watchOuts: { type: [String], default: [] },
    tonight: {
      sleepNeedHours: { type: Number, default: null },
      bedtimeWindow: { type: String, default: '' },
      note: { type: String, default: '' },
    },
  },
  { _id: false }
);

const ExerciseSchema = new Schema(
  {
    name: { type: String, required: true },
    steps: { type: [String], default: undefined },
    sets: { type: Number, default: 1 },
    reps: { type: String, default: '1' },
    phase: { type: String, enum: ['warmup', 'strength', 'cardio', 'core', 'mobility', 'cooldown'] },
    // Strength only: compound lifts sort before accessories
    slot: { type: String, enum: ['compound', 'accessory'] },
    // Server-stamped 1..n gym order (stampOrderAndPhase)
    order: { type: Number },
    durationMinutes: { type: Number },
    restSeconds: { type: Number, default: 60 },
    intensity: { type: String, enum: ['low', 'medium', 'high'] },
    category: { type: String },
    muscleGroup: { type: String, enum: ['legs', 'push', 'pull', 'core'] },
    // Prescribed load. Stored in kg to match the workout UI, which renders a bare
    // "kg" suffix. `loadNote` keeps the source wording ("45 lb, the empty bar")
    // so the original units survive the conversion.
    weightKg: { type: Number, min: 0 },
    loadNote: { type: String },
    // Top of a rep range: reps "6", repsMax "8" for a prescribed 6 to 8.
    repsMax: { type: Number, min: 0 },
    bodyweight: { type: Boolean },
  },
  { _id: false }
);

const DailyPlanSchema = new Schema<IDailyPlanDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true }, // 'YYYY-MM-DD'
    generatedAt: { type: Date, default: () => new Date() },
    status: { type: String, enum: ['generating', 'ready', 'failed'], default: 'generating' },
    errorMessage: { type: String },

    topInsight: { type: String },
    // One-sentence "Today's Body Summary" (LLM-phrased over deterministic
    // attribution; cached per day by /api/intelligence)
    bodySummary: { type: String },
    projections: { type: ProjectionsSchema, default: undefined },
    outlook: { type: OutlookSchema, default: undefined },

    foodPlan: {
      suggestions: { type: [MealSuggestionSchema], default: [] },
      reasoning: { type: String },
    },

    workoutPlan: {
      name: { type: String },
      description: { type: String },
      // strategyUsed kept (no enum) for old plans; new plans use weeklyStrategyChosen.
      strategyUsed: { type: String },
      weeklyStrategyChosen: { type: String },
      whyToday: { type: String },
      readinessAdjustment: { type: String },
      progressionTip: { type: String },
      exercises: { type: [ExerciseSchema], default: [] },
      estimatedCalories: { type: Number, default: 0 },
      durationMinutes: { type: Number, default: 0 },
      reasoning: { type: String },
    },

    prediction: {
      weeklyWeightChangeKg: { type: Number },
      projectedWeightKg: { type: Number },
      basis: { type: String },
    },

    fitnessLevelDerived: { type: String, enum: ['beginner', 'intermediate', 'advanced'] },

    feedback: {
      workoutDifficulty: { type: String, enum: ['too_easy', 'just_right', 'too_hard'] },
      skippedWorkoutReason: { type: String, enum: ['no_time', 'tired', 'injury', 'other'] },
      dislikedFoods: { type: [String], default: [] },
      replacedMeals: {
        type: [
          {
            original: { type: String, required: true },
            replacement: { type: String, required: true },
          },
        ],
        default: [],
      },
      submittedAt: { type: Date },
    },

    generationContext: {
      yesterdayProteinG: { type: Number },
      proteinGapG: { type: Number },
      yesterdayCalories: { type: Number },
      calorieGap: { type: Number },
      recentWorkoutsPerWeek: { type: Number },
      avgWorkoutDurationMin: { type: Number },
    },

  },
  {
    timestamps: true,
  }
);

// Compound unique index: one plan per user per day
DailyPlanSchema.index({ userId: 1, date: 1 }, { unique: true });

const DailyPlan: Model<IDailyPlanDocument> =
  mongoose.models.DailyPlan ||
  mongoose.model<IDailyPlanDocument>('DailyPlan', DailyPlanSchema);

export default DailyPlan;
