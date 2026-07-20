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
    username: {
      type: String,
      required: false, // legacy users may not have it; new users get it at registration
      unique: true,
      sparse: true, // allow multiple nulls for legacy users
      lowercase: true,
      trim: true,
      index: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username must be at most 30 characters'],
      match: [/^[a-z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true, // allow multiple guests with no email
      lowercase: true,
      trim: true,
      index: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: false,
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
        // 5-value enum plus legacy 3-value strings so old documents still
        // validate; reads normalize via lib/goals.ts normalizeGoal().
        enum: ['lose_fat', 'build_muscle', 'recomp', 'improve_fitness', 'maintain', 'lose', 'gain'],
        default: 'maintain',
      },
      targetWeight: { type: Number, min: 20, max: 500 },
      avatarUrl: { type: String, default: '' },
      // Body composition - used to personalize AI workout + nutrition plans
      bodyType: { type: String, enum: ['ectomorph', 'mesomorph', 'endomorph'] },
      bodyFat: { type: Number, min: 1, max: 60 },           // body fat percentage
      fatFocusAreas: { type: [String], default: [] },
      fitnessLevelDerived: { type: String, enum: ['beginner', 'intermediate', 'advanced'] }, // auto from logs
      fitnessLevelUser: { type: String, enum: ['beginner', 'intermediate', 'advanced'] },    // optional override
      physiqueGoal: {
        type: String,
        enum: ['lean_toned', 'lean_muscle', 'athletic', 'muscular_bulk', 'bodybuilder', 'healthy_slim', 'powerlifter'],
      },
      workoutLocation: {
        type: String,
        enum: ['full_gym', 'home', 'outdoors', 'hotel_travel'],
      },
      equipmentNotes: { type: String, default: '', maxlength: 500 },
      timezone: { type: String, default: '' },
    },
    apiKeys: {
      openai:     { type: String, default: '', select: false },  // AES-256 encrypted
      fdcApiKey:  { type: String, default: '', select: false },  // AES-256 encrypted - USDA FoodData Central
    },
    settings: {
      theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
      units: { type: String, enum: ['metric', 'imperial'], default: 'metric' },
      aiEnabled: { type: Boolean, default: true },
      // Master switch for all reminder emails; false stops every scheduled email.
      emailRemindersEnabled: { type: Boolean, default: true },
      notifications: {
        water: { type: Boolean, default: true },
        meals: { type: Boolean, default: true },
        weighIn: { type: Boolean, default: true },
        workout: { type: Boolean, default: true },
        sleep: { type: Boolean, default: true },
      },
      // Whether the user has completed the main dashboard walkthrough
      dashboardTourComplete: { type: Boolean, default: false },
      // Version of the dashboard tour the user has last completed
      dashboardTourVersion: { type: Number, default: 0 },
      // Suggest-only nudges; dismissal state so they don't nag
      nudges: {
        // targetWeight value at which the target-reached nudge was dismissed;
        // re-arms automatically when the user sets a new target
        targetReachedDismissedForTargetWeight: { type: Number, default: null },
      },
      // Recipient list for reminder emails
      recipientEmails: { type: [String], default: [] },
      // Legacy key retained for backward compatibility
      ccEmails: { type: [String], default: [] },
      reminderSchedule: {
        timezone: { type: String },
        waterHourlyEnabled: { type: Boolean },
        waterFrequencyMinutes: { type: Number, default: 60, min: 15, max: 240 }, // legacy compatibility
        water: {
          enabled: { type: Boolean, default: true },
          startTime: { type: String, default: '06:00' },
          endTime: { type: String, default: '21:00' },
          frequencyMinutes: { type: Number, default: 60, min: 15, max: 240 },
        },
        mealTimes: {
          breakfast: { type: String },
          lunch: { type: String },
          dinner: { type: String },
        },
        sleepTime: { type: String },
        workoutTime: { type: String },
        weighInTime: { type: String },
        lastSentAt: {
          water: { type: Date },
          breakfast: { type: Date },
          lunch: { type: Date },
          dinner: { type: Date },
          workout: { type: Date },
          weighIn: { type: Date },
          sleep: { type: Date },
        },
      },
      customizations: {
        water: {
          quickAmountsMl: {
            type: [Number],
            default: [100, 250, 500, 750],
            validate: {
              validator(values: number[]) {
                return Array.isArray(values) && values.length === 4 && values.every((value) => Number.isInteger(value) && value >= 1 && value <= 5000);
              },
              message: 'Water quick amounts must contain exactly 4 integers between 1 and 5000',
            },
          },
        },
        mascot: { type: String, enum: ['red-panda', 'kiki'], default: 'red-panda' },
      },
      foodPreferences: {
        dietaryPreference: {
          type: String,
          enum: ['no_preference', 'vegetarian', 'non_vegetarian', 'eggetarian', 'vegan', 'pescatarian', 'flexitarian'],
          default: 'no_preference',
        },
        allergies: {
          type: [String],
          default: [],
        },
        favoriteCuisines: {
          type: [String],
          default: [],
        },
        cookingSkill: {
          type: String,
          enum: ['beginner', 'intermediate', 'confident'],
          default: 'beginner',
        },
        maxCookingMinutes: {
          type: Number,
          min: 5,
          max: 180,
          default: 30,
        },
      },
      todoTemplates: {
        type: [
          {
            id:        { type: String, required: true },
            title:     { type: String, required: true },
            note:      { type: String, default: '' },
            time:      { type: String, default: '' },
            category:  { type: String, enum: ['food', 'supplement', 'medicine', 'habit', 'care', 'other'], default: 'other' },
            enabled:   { type: Boolean, default: true },
            frequency: { type: Number, default: 1, min: 1, max: 5 }, // how many times per day (for supplements/medicines)
            times:     { type: [String], default: [] }, // per-dose times ("HH:mm"), index-aligned with dose number
            group:     { type: String, default: 'daily' }, // checklist group id ('daily' is built in)
            cadence:   { type: String, enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom'] }, // per-item schedule
            cadenceDays: { type: Number, min: 2, max: 365 }, // cycle length when cadence === 'custom'
            baseItems: { type: [Schema.Types.Mixed], default: [] }, // pre-parsed food items for food category
          },
        ],
        default: [],
      },
      todoGroups: {
        type: [
          {
            id:   { type: String, required: true },
            name: { type: String, required: true },
          },
        ],
        default: [],
      },
      emailSetupChecklist: {
        smtpSaved: { type: Boolean, default: false },
        smtpTestSent: { type: Boolean, default: false },
        imapSaved: { type: Boolean, default: false },
        imapTestSent: { type: Boolean, default: false },
        recipientListSaved: { type: Boolean, default: false },
        imapReplyVerifiedAt: { type: Date },
        lastUpdatedAt: { type: Date },
      },
      // Health data sync from external source (mobile app, wearable, etc.)
      healthData: {
        endpoint:            { type: String, default: '' },
        apiKeyEncrypted:     { type: String, default: '', select: false }, // AES-256 encrypted
        enabled:             { type: Boolean, default: false },
        syncIntervalMinutes: { type: Number, default: 60, min: 5, max: 1440 },
        lastSyncAt:          { type: Date },
        lastSyncSource:      { type: String, enum: ['auto', 'manual', ''], default: '' },
        lastSchemaJson:      { type: String, default: '' }, // JSON string of last detected schema keys
        lastSyncStatus:      { type: String, enum: ['ok', 'error', ''], default: '' },
        lastSyncError:       { type: String, default: '' },
      },
      // SMTP/IMAP settings for email reminders - passwords are AES-256 encrypted
      emailSettings: {
        smtp: {
          host:     { type: String, default: '' },
          port:     { type: Number, default: 587 },
          secure:   { type: Boolean, default: false },
          user:     { type: String, default: '' },
          pass:     { type: String, default: '' },  // AES-256 encrypted - stripped in maskUser + toJSON
          fromName: { type: String, default: 'ArogyaMandiram' },
        },
        imap: {
          host:   { type: String, default: '' },
          port:   { type: Number, default: 993 },
          secure: { type: Boolean, default: true },
          user:   { type: String, default: '' },
          pass:   { type: String, default: '' },  // AES-256 encrypted - stripped in maskUser + toJSON
        },
      },
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
      dailySteps: { type: Number, default: 8000 },
      idealDistance: { type: Number, default: 5 },  // km/day
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
          healthy: { type: Number, default: 0 },
          calories: { type: Number, default: 0 },
          water: { type: Number, default: 0 },
          workout: { type: Number, default: 0 },
          sleep: { type: Number, default: 0 },
          weight: { type: Number, default: 0 },
          steps: { type: Number, default: 0 },
        },
        best: {
          logging: { type: Number, default: 0 },
          healthy: { type: Number, default: 0 },
          calories: { type: Number, default: 0 },
          water: { type: Number, default: 0 },
          workout: { type: Number, default: 0 },
          sleep: { type: Number, default: 0 },
          weight: { type: Number, default: 0 },
          steps: { type: Number, default: 0 },
        },
      },
      xpTotal: { type: Number, default: 0, min: 0 },
    },
    achievementsUpdatedAt: { type: Date },
    onboardingComplete: { type: Boolean, default: false },
    isGuest: { type: Boolean, default: false, index: true },
    guestFingerprint: {
      type: String,
      default: undefined,
      unique: true,
      sparse: true,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        // Always strip sensitive fields on JSON serialization (omit instead of delete for strict TS)
        const { password, apiKeys, __v, guestFingerprint: _gf, ...safe } = ret;
        // Strip email passwords from nested settings
        const settings = safe.settings as Record<string, unknown> | undefined;
        if (settings) {
          const es = settings.emailSettings as Record<string, unknown> | undefined;
          if (es) {
            const smtp = es.smtp as Record<string, unknown> | undefined;
            const imap = es.imap as Record<string, unknown> | undefined;
            if (smtp) { const { pass: _sp, ...smtpSafe } = smtp; es.smtp = smtpSafe; }
            if (imap) { const { pass: _ip, ...imapSafe } = imap; es.imap = imapSafe; }
          }
        }
        return safe;
      },
    },
  }
);

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();

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

// Recompile the model in development so schema changes survive hot reloads.
if (process.env.NODE_ENV === 'development' && mongoose.models.User) {
  delete mongoose.models.User;
}

const User: Model<IUserDocument> =
  (mongoose.models.User as Model<IUserDocument> | undefined) || mongoose.model<IUserDocument>('User', UserSchema);

export default User;
