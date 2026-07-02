// ============================================
// DailyLog Model - MongoDB/Mongoose
// ============================================

import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { IDailyLog } from '@/types';

export interface IDailyLogDocument extends Omit<IDailyLog, '_id'>, Document {}

const MealEntrySchema = new Schema(
  {
    foodId: { type: String, default: '' },
    name: { type: String, required: true },
    calories: { type: Number, required: true, min: 0 },
    protein: { type: Number, default: 0, min: 0 },
    carbs: { type: Number, default: 0, min: 0 },
    fat: { type: Number, default: 0, min: 0 },
    fiber: { type: Number, default: 0, min: 0 },
    sugar: { type: Number, default: 0, min: 0 },
    sodium: { type: Number, default: 0, min: 0 },
    saturatedFat: { type: Number, default: 0, min: 0 },
    cholesterol: { type: Number, default: 0, min: 0 },
    quantity: { type: Number, default: 1, min: 0 },
    unit: { type: String, default: 'serving' },
    mealType: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'snack'],
      required: true,
    },
    time: { type: String, default: '12:00' },
    isCustom: { type: Boolean, default: false },
  },
  { _id: true }
);

const WorkoutEntrySchema = new Schema(
  {
    exercise: { type: String, required: true },
    category: {
      type: String,
      enum: ['cardio', 'strength', 'flexibility', 'core', 'sports', 'other'],
      default: 'other',
    },
    duration: { type: Number, required: true, min: 0 },  // minutes
    caloriesBurned: { type: Number, default: 0, min: 0 },
    sets: { type: Number, min: 0 },
    reps: { type: Number, min: 0 },
    weight: { type: Number, min: 0 },
    notes: { type: String, default: '' },
    // 'device' = came from health-data sync; 'manual' = user-entered
    source: { type: String, enum: ['manual', 'device'], default: 'manual' },
    // Average heart rate during the workout (device-sourced, bpm)
    avgHeartRate: { type: Number, min: 0, max: 300 },
    // When this log entry was logged from a planned exercise card, this stores
    // the canonical plan exercise name so the UI can re-hydrate "Logged" state.
    planExerciseName: { type: String },
  },
  { _id: true }
);

const WaterLogEntrySchema = new Schema(
  {
    amount: { type: Number, required: true, min: 1 },
    time: { type: String, required: true },
  },
  { _id: true }
);

const SleepEntrySchema = new Schema(
  {
    bedtime: { type: String, required: true },
    wakeTime: { type: String, required: true },
    duration: { type: Number, required: true, min: 0, max: 24 },
    quality: { type: Number, required: true, min: 1, max: 5 },
    notes: { type: String, default: '', maxlength: 500 },
    // Sleep stages (device-sourced, hours)
    deepHours:  { type: Number, min: 0, max: 24 },
    remHours:   { type: Number, min: 0, max: 24 },
    coreHours:  { type: Number, min: 0, max: 24 },
    awakeHours: { type: Number, min: 0, max: 24 },
  },
  { _id: true }
);

const DailyLogSchema = new Schema<IDailyLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'],
    },
    weight: { type: Number, min: 20, max: 500 },
    waterIntake: { type: Number, default: 0, min: 0 },     // total ml
    waterEntries: { type: [WaterLogEntrySchema], default: [] },
    meals: [MealEntrySchema],
    workouts: [WorkoutEntrySchema],
    sleep: { type: SleepEntrySchema, default: undefined },
    totalCalories: { type: Number, default: 0 },
    totalProtein: { type: Number, default: 0 },
    totalCarbs: { type: Number, default: 0 },
    totalFat: { type: Number, default: 0 },
    totalFiber: { type: Number, default: 0 },
    totalSugar: { type: Number, default: 0 },
    totalSodium: { type: Number, default: 0 },
    caloriesBurned: { type: Number, default: 0 },
    // Device-sourced health metrics (populated by health-data sync)
    heartRate:      { type: Number, min: 0, max: 300 },
    steps:          { type: Number, min: 0 },
    activeCalories: { type: Number, min: 0 },
    distanceKm:     { type: Number, min: 0 },
    // Recovery vitals (device-sourced, used by the Vitals scores)
    restingHeartRate: { type: Number, min: 20, max: 200 },
    hrvSdnnMs:        { type: Number, min: 0, max: 500 },
    respiratoryRate:  { type: Number, min: 4, max: 60 },
    wristTempC:       { type: Number, min: 30, max: 45 },
    vo2Max:           { type: Number, min: 10, max: 90 },
    // Habit journal (user-logged via the Vitals page)
    habits: { type: [String], default: undefined },
    mood:   { type: Number, min: 1, max: 5 },
    notes: { type: String, default: '', maxlength: 500 },
    todoCompletions: {
      type: [
        {
          templateId:  { type: String, required: true },
          completedAt: { type: String, required: true },
        },
      ],
      default: [],
    },
    // XP already granted for this calendar day (so we can award only the delta).
    xpAwarded: { type: Number, default: 0, min: 0, max: 50 },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index: one log per user per day
DailyLogSchema.index({ userId: 1, date: 1 }, { unique: true });

// Text index for meal search
DailyLogSchema.index({ 'meals.name': 'text' });

// Pre-save: auto-calculate totals from meals
// Note: meal.calories (and macros) are already the total for the logged quantity from the frontend
DailyLogSchema.pre('save', function (next) {
  if (this.meals && this.meals.length > 0) {
    this.totalCalories = this.meals.reduce((sum, m) => sum + m.calories, 0);
    this.totalProtein = this.meals.reduce((sum, m) => sum + m.protein, 0);
    this.totalCarbs = this.meals.reduce((sum, m) => sum + m.carbs, 0);
    this.totalFat = this.meals.reduce((sum, m) => sum + m.fat, 0);
    this.totalFiber = this.meals.reduce((sum, m) => sum + (m.fiber ?? 0), 0);
    this.totalSugar = this.meals.reduce((sum, m) => sum + (m.sugar ?? 0), 0);
    this.totalSodium = this.meals.reduce((sum, m) => sum + (m.sodium ?? 0), 0);
  } else {
    this.totalCalories = 0;
    this.totalProtein = 0;
    this.totalCarbs = 0;
    this.totalFat = 0;
    this.totalFiber = 0;
    this.totalSugar = 0;
    this.totalSodium = 0;
  }

  if (this.workouts && this.workouts.length > 0) {
    this.caloriesBurned = this.workouts.reduce((sum, w) => sum + w.caloriesBurned, 0);
  } else {
    this.caloriesBurned = 0;
  }

  next();
});

const DailyLog: Model<IDailyLogDocument> =
  mongoose.models.DailyLog || mongoose.model<IDailyLogDocument>('DailyLog', DailyLogSchema);

export default DailyLog;
