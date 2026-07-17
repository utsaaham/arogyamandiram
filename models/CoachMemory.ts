// ============================================
// CoachMemory Model - durable personal patterns
// ============================================
// Correlation-engine outputs that keep re-appearing persist here as pattern
// statements with confidence + sample counts ("recovers better with 8+ h
// sleep"). Injected into every LLM prompt so the coach gets smarter over
// months. Patterns that stop holding decay: a pattern not re-confirmed for
// DECAY_DAYS is deactivated, never deleted.

import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface ICoachMemory {
  userId: mongoose.Types.ObjectId;
  /** Stable identity: `${featureKey}:${outcome}` or `compound:${key}`. */
  patternKey: string;
  text: string;
  delta: number;
  confidence: 'high' | 'medium' | 'low';
  sampleCount: number;
  timesConfirmed: number;
  firstSeenAt: Date;
  lastConfirmedAt: Date;
  active: boolean;
}

export interface ICoachMemoryDocument extends ICoachMemory, Document {}

const CoachMemorySchema = new Schema<ICoachMemoryDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    patternKey: { type: String, required: true },
    text: { type: String, required: true },
    delta: { type: Number, required: true },
    confidence: { type: String, enum: ['high', 'medium', 'low'], required: true },
    sampleCount: { type: Number, default: 0 },
    timesConfirmed: { type: Number, default: 1 },
    firstSeenAt: { type: Date, default: () => new Date() },
    lastConfirmedAt: { type: Date, default: () => new Date() },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CoachMemorySchema.index({ userId: 1, patternKey: 1 }, { unique: true });

const CoachMemory: Model<ICoachMemoryDocument> =
  mongoose.models.CoachMemory ||
  mongoose.model<ICoachMemoryDocument>('CoachMemory', CoachMemorySchema);

export default CoachMemory;
