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
      enum: ['cardio', 'strength', 'flexibility', 'sports', 'other'],
      default: 'other',
    },
    duration: { type: Number, required: true, min: 0 },  // minutes
    caloriesBurned: { type: Number, default: 0, min: 0 },
    sets: { type: Number, min: 0 },
    reps: { type: Number, min: 0 },
    weight: { type: Number, min: 0 },
    notes: { type: String, default: '' },
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
    meals: [MealEntrySchema],
    workouts: [WorkoutEntrySchema],
    sleep: { type: SleepEntrySchema, default: undefined },
    totalCalories: { type: Number, default: 0 },
    totalProtein: { type: Number, default: 0 },
    totalCarbs: { type: Number, default: 0 },
    totalFat: { type: Number, default: 0 },
    caloriesBurned: { type: Number, default: 0 },
    notes: { type: String, default: '', maxlength: 500 },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
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
DailyLogSchema.pre('save', function (next) {
  if (this.meals && this.meals.length > 0) {
    this.totalCalories = this.meals.reduce((sum, m) => sum + (m.calories * m.quantity), 0);
    this.totalProtein = this.meals.reduce((sum, m) => sum + (m.protein * m.quantity), 0);
    this.totalCarbs = this.meals.reduce((sum, m) => sum + (m.carbs * m.quantity), 0);
    this.totalFat = this.meals.reduce((sum, m) => sum + (m.fat * m.quantity), 0);
  } else {
    this.totalCalories = 0;
    this.totalProtein = 0;
    this.totalCarbs = 0;
    this.totalFat = 0;
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
