// ============================================
// WeeklySummary Model - cached weekly coach recap
// ============================================
// One document per user per rolling week (7 days ending `weekEnd`, which is
// yesterday at generation time). Cached so the Weekly tab loads instantly and
// the AI "next week" line is written at most once per week window.

import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IWeeklySummary {
  userId: mongoose.Types.ObjectId;
  weekEnd: string;   // 'YYYY-MM-DD' - last day included in the window
  weekStart: string; // 'YYYY-MM-DD' - first day included
  stats: {
    workoutsPlanned: number;
    workoutsDone: number;
    adherencePct: number | null;
    startWeightKg: number | null;
    endWeightKg: number | null;
    weightDeltaKg: number | null;
    strongestLift: {
      exercise: string;
      fromKg: number;
      toKg: number;
      deltaKg: number;
    } | null;
    proteinDaysHit: number;
    proteinDaysTracked: number;
  };
  nextWeekLine: string;
  /** false when the line came from the deterministic fallback (no AI key). */
  aiGenerated: boolean;
  generatedAt: Date;
}

export interface IWeeklySummaryDocument extends IWeeklySummary, Document {}

const WeeklySummarySchema = new Schema<IWeeklySummaryDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    weekEnd: { type: String, required: true },
    weekStart: { type: String, required: true },
    stats: {
      workoutsPlanned: { type: Number, default: 0 },
      workoutsDone: { type: Number, default: 0 },
      adherencePct: { type: Number, default: null },
      startWeightKg: { type: Number, default: null },
      endWeightKg: { type: Number, default: null },
      weightDeltaKg: { type: Number, default: null },
      strongestLift: {
        type: {
          exercise: { type: String },
          fromKg: { type: Number },
          toKg: { type: Number },
          deltaKg: { type: Number },
        },
        default: null,
      },
      proteinDaysHit: { type: Number, default: 0 },
      proteinDaysTracked: { type: Number, default: 0 },
    },
    nextWeekLine: { type: String, default: '' },
    aiGenerated: { type: Boolean, default: false },
    generatedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

// One cached summary per user per week window
WeeklySummarySchema.index({ userId: 1, weekEnd: 1 }, { unique: true });

const WeeklySummary: Model<IWeeklySummaryDocument> =
  mongoose.models.WeeklySummary ||
  mongoose.model<IWeeklySummaryDocument>('WeeklySummary', WeeklySummarySchema);

export default WeeklySummary;
