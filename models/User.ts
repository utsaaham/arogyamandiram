// ============================================
// User Model - MongoDB/Mongoose
// ============================================

import mongoose, { Schema, type Document, type Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import type { IUser } from '@/types';

export interface IUserDocument extends Omit<IUser, '_id'>, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never returned in queries by default
    },
    profile: {
      name: { type: String, default: '' },
      dateOfBirth: { type: Date },
      age: { type: Number, min: 13, max: 120 },
      gender: { type: String, enum: ['male', 'female', 'other'] },
      height: { type: Number, min: 50, max: 300 },   // cm
      weight: { type: Number, min: 20, max: 500 },    // kg
      activityLevel: {
        type: String,
        enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'],
        default: 'moderate',
      },
      goal: {
        type: String,
        enum: ['lose', 'maintain', 'gain'],
        default: 'maintain',
      },
      targetWeight: { type: Number, min: 20, max: 500 },
      avatarUrl: { type: String, default: '' },
    },
    apiKeys: {
      openai: { type: String, default: '', select: false },     // AES-256 encrypted
      edamam: {
        appId: { type: String, default: '', select: false },    // AES-256 encrypted
        appKey: { type: String, default: '', select: false },   // AES-256 encrypted
      },
    },
    settings: {
      theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
      units: { type: String, enum: ['metric', 'imperial'], default: 'metric' },
      notifications: {
        water: { type: Boolean, default: true },
        meals: { type: Boolean, default: true },
        weighIn: { type: Boolean, default: true },
        workout: { type: Boolean, default: true },
      },
      // Whether the user has completed the main dashboard walkthrough
      dashboardTourComplete: { type: Boolean, default: false },
    },
    targets: {
      dailyCalories: { type: Number, default: 2000 },
      dailyWater: { type: Number, default: 2500 },  // ml
      protein: { type: Number, default: 150 },       // g
      carbs: { type: Number, default: 200 },        // g
      fat: { type: Number, default: 67 },            // g
      idealWeight: { type: Number, default: 70 },   // kg
      dailyWorkoutMinutes: { type: Number, default: 30 },
      dailyCalorieBurn: { type: Number, default: 400 },
      sleepHours: { type: Number, default: 8 },
    },
    achievements: {
      badges: {
        type: [
          {
            id: { type: String, required: true },
            name: { type: String, required: true },
            description: { type: String, default: '' },
            icon: { type: String, default: '🏅' },
            category: {
              type: String,
              enum: ['streak', 'milestone', 'challenge', 'first', 'other'],
              default: 'other',
            },
            earnedAt: { type: Date, required: true },
          },
        ],
        default: [],
      },
      streaks: {
        current: {
          logging: { type: Number, default: 0 },
          calories: { type: Number, default: 0 },
          water: { type: Number, default: 0 },
          workout: { type: Number, default: 0 },
          sleep: { type: Number, default: 0 },
          weight: { type: Number, default: 0 },
        },
        best: {
          logging: { type: Number, default: 0 },
          calories: { type: Number, default: 0 },
          water: { type: Number, default: 0 },
          workout: { type: Number, default: 0 },
          sleep: { type: Number, default: 0 },
          weight: { type: Number, default: 0 },
        },
      },
      xpTotal: { type: Number, default: 0, min: 0 },
    },
    onboardingComplete: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        // Always strip sensitive fields on JSON serialization (omit instead of delete for strict TS)
        const { password, apiKeys, __v, ...safe } = ret;
        return safe;
      },
    },
  }
);

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err as Error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Prevent model recompilation in dev (hot reload)
const User: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);

export default User;
