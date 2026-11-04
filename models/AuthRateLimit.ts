import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface AuthRateLimitDocument extends Document {
  key: string;
  attempts: number;
  windowExpiresAt: Date;
  blockedUntil?: Date;
  expiresAt: Date;
}

const AuthRateLimitSchema = new Schema<AuthRateLimitDocument>(
  {
    key: { type: String, required: true, unique: true, index: true },
    attempts: { type: Number, required: true, default: 0, min: 0 },
    windowExpiresAt: { type: Date, required: true },
    blockedUntil: { type: Date },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true },
);

if (process.env.NODE_ENV === 'development' && mongoose.models.AuthRateLimit) {
  delete mongoose.models.AuthRateLimit;
}

const AuthRateLimit: Model<AuthRateLimitDocument> =
  (mongoose.models.AuthRateLimit as Model<AuthRateLimitDocument> | undefined)
  || mongoose.model<AuthRateLimitDocument>('AuthRateLimit', AuthRateLimitSchema);

export default AuthRateLimit;
