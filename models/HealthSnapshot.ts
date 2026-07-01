import mongoose, { Schema, type Document } from 'mongoose';
import type { Types } from 'mongoose';

export interface IHealthSnapshotDocument extends Document {
  userId: Types.ObjectId;
  receivedAt: Date;
  payload: Record<string, unknown>;
}

const HealthSnapshotSchema = new Schema<IHealthSnapshotDocument>(
  {
    userId:     { type: Schema.Types.ObjectId, required: true },
    receivedAt: { type: Date, required: true, default: () => new Date() },
    payload:    { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: false }
);

HealthSnapshotSchema.index({ userId: 1, receivedAt: -1 });

// Auto-expire after 90 days — matches MAX_BACKFILL_DAYS in healthDataSync
HealthSnapshotSchema.index({ receivedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const HealthSnapshot =
  (mongoose.models.HealthSnapshot as mongoose.Model<IHealthSnapshotDocument>) ||
  mongoose.model<IHealthSnapshotDocument>('HealthSnapshot', HealthSnapshotSchema);

export default HealthSnapshot;
