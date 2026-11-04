// ============================================
// models/WeekPlan - An imported week plan, stored whole
// ============================================
// DailyPlan holds the per-day food and workout plan that Ciel renders. This
// model holds everything in an imported plan that is not per-day and therefore
// has nowhere else to live: the profile block, the written guidance panels, and
// the parsed source itself.
//
// Keeping the raw parse means a later mapping change can be replayed against
// the original import without asking the user to paste the file again.

import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IWeekPlan {
  _id: string;
  userId: mongoose.Types.ObjectId;
  /** Monday of the week this plan was imported onto, 'YYYY-MM-DD'. */
  weekStart: string;
  /** Dates actually written, in order. */
  dates: string[];
  title: string;
  /** The source document's own profile block, stored as given. */
  profile?: Record<string, unknown>;
  /** Written guidance panels, keyed by section. */
  guide: { key: string; label: string; html: string }[];
  /** Unit the source prescribed loads in, before conversion to kg. */
  sourceUnit: 'lb' | 'kg';
  saltPerMeal: number;
  sessionMinutes?: number;
  /** Full parsed structure, for replay. */
  parsed: Record<string, unknown>;
  importedAt: Date;
}

export interface IWeekPlanDocument extends Omit<IWeekPlan, '_id'>, Document {}

const GuideSectionSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, default: '' },
    html: { type: String, default: '' },
  },
  { _id: false }
);

const WeekPlanSchema = new Schema<IWeekPlanDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    weekStart: { type: String, required: true },
    dates: { type: [String], default: [] },
    title: { type: String, default: 'My Week' },
    profile: { type: Schema.Types.Mixed },
    guide: { type: [GuideSectionSchema], default: [] },
    sourceUnit: { type: String, enum: ['lb', 'kg'], default: 'kg' },
    saltPerMeal: { type: Number, default: 0 },
    sessionMinutes: { type: Number },
    parsed: { type: Schema.Types.Mixed },
    importedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

// One imported plan per user per week; re-importing the same week replaces it.
WeekPlanSchema.index({ userId: 1, weekStart: 1 }, { unique: true });

const WeekPlan: Model<IWeekPlanDocument> =
  mongoose.models.WeekPlan ||
  mongoose.model<IWeekPlanDocument>('WeekPlan', WeekPlanSchema);

export default WeekPlan;
