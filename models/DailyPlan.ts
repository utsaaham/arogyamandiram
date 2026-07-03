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
  date: string; // 'YYYY-MM-DD' — the day this plan is FOR
  generatedAt: Date;
  status: 'generating' | 'ready' | 'failed';
  errorMessage?: string;

  topInsight?: string; // AI-selected #1 priority for the day
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
      mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      ingredients: string[];
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

const MealSuggestionSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack'], default: 'snack' },
    ingredients: { type: [String], default: [] },
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
    durationMinutes: { type: Number },
    restSeconds: { type: Number, default: 60 },
    intensity: { type: String, enum: ['low', 'medium', 'high'] },
    category: { type: String },
    muscleGroup: { type: String, enum: ['legs', 'push', 'pull', 'core'] },
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
