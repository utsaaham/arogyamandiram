import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type EmailVerificationPurpose = 'register' | 'guest-upgrade';

export interface EmailVerificationDocument extends Document {
  lookupKey: string;
  challengeId: string;
  email: string;
  purpose: EmailVerificationPurpose;
  userId?: string;
  codeHash: string;
  codeExpiresAt: Date;
  attempts: number;
  verifiedAt?: Date;
  proofHash?: string;
  proofExpiresAt?: Date;
  consumedAt?: Date;
  expiresAt: Date;
}

const EmailVerificationSchema = new Schema<EmailVerificationDocument>(
  {
    lookupKey: { type: String, required: true, unique: true, index: true },
    challengeId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    purpose: { type: String, required: true, enum: ['register', 'guest-upgrade'] },
    userId: { type: String, index: true },
    codeHash: { type: String, required: true, select: false },
    codeExpiresAt: { type: Date, required: true },
    attempts: { type: Number, required: true, default: 0, min: 0 },
    verifiedAt: { type: Date },
    proofHash: { type: String, select: false },
    proofExpiresAt: { type: Date },
    consumedAt: { type: Date },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true },
);

if (process.env.NODE_ENV === 'development' && mongoose.models.EmailVerification) {
  delete mongoose.models.EmailVerification;
}

const EmailVerification: Model<EmailVerificationDocument> =
  (mongoose.models.EmailVerification as Model<EmailVerificationDocument> | undefined)
  || mongoose.model<EmailVerificationDocument>('EmailVerification', EmailVerificationSchema);

export default EmailVerification;
