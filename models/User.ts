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
    },
    targets: {
      dailyCalories: { type: Number, default: 2000 },
      dailyWater: { type: Number, default: 2500 },  // ml
      protein: { type: Number, default: 150 },       // g
      carbs: { type: Number, default: 200 },          // g
      fat: { type: Number, default: 67 },             // g
    },
    onboardingComplete: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        // Always strip sensitive fields on JSON serialization
        delete ret.password;
        delete ret.apiKeys;
        delete ret.__v;
        return ret;
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
