import crypto from 'crypto';
import EmailVerification, { type EmailVerificationPurpose } from '@/models/EmailVerification';

const CODE_LIFETIME_MS = 10 * 60 * 1000;
const PROOF_LIFETIME_MS = 15 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

export function emailVerificationCookieName(purpose: EmailVerificationPurpose): string {
  return purpose === 'register'
    ? 'arogyam_email_register_proof'
    : 'arogyam_email_guest_upgrade_proof';
}

export function emailVerificationCookiePath(purpose: EmailVerificationPurpose): string {
  return purpose === 'register' ? '/api/auth/register' : '/api/user/upgrade';
}

function verificationSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
    ?? (process.env.NODE_ENV === 'development' ? 'dev-secret-min-32-chars-for-jwt-signing' : undefined);
  if (!secret) throw new Error('NEXTAUTH_SECRET is required for email verification');
  return secret;
}

function hmac(value: string): string {
  return crypto.createHmac('sha256', verificationSecret()).update(value).digest('hex');
}

function lookupKey(email: string, purpose: EmailVerificationPurpose, userId?: string): string {
  return hmac(`email-verification:${purpose}:${userId || 'anonymous'}:${email}`);
}

function codeHash(challengeId: string, code: string): string {
  return hmac(`email-code:${challengeId}:${code}`);
}

function proofHash(token: string): string {
  return hmac(`email-proof:${token}`);
}

export async function createEmailVerificationChallenge(params: {
  email: string;
  purpose: EmailVerificationPurpose;
  userId?: string;
}): Promise<{ challengeId: string; code: string }> {
  const now = Date.now();
  const challengeId = crypto.randomBytes(24).toString('base64url');
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

  await EmailVerification.findOneAndUpdate(
    { lookupKey: lookupKey(params.email, params.purpose, params.userId) },
    {
      $set: {
        challengeId,
        email: params.email,
        purpose: params.purpose,
        userId: params.userId,
        codeHash: codeHash(challengeId, code),
        codeExpiresAt: new Date(now + CODE_LIFETIME_MS),
        attempts: 0,
        expiresAt: new Date(now + CODE_LIFETIME_MS + PROOF_LIFETIME_MS),
      },
      $unset: {
        verifiedAt: 1,
        proofHash: 1,
        proofExpiresAt: 1,
        consumedAt: 1,
      },
    },
    { upsert: true, setDefaultsOnInsert: true },
  );

  return { challengeId, code };
}

export async function discardEmailVerificationChallenge(challengeId: string): Promise<void> {
  await EmailVerification.deleteOne({ challengeId });
}

export async function verifyEmailCode(params: {
  email: string;
  purpose: EmailVerificationPurpose;
  challengeId: string;
  code: string;
  userId?: string;
}): Promise<{ token?: string; error?: 'invalid' | 'expired' | 'too-many-attempts' }> {
  const record = await EmailVerification.findOne({
    challengeId: params.challengeId,
    email: params.email,
    purpose: params.purpose,
    userId: params.userId,
    consumedAt: { $exists: false },
    verifiedAt: { $exists: false },
  }).select('+codeHash');

  if (!record) return { error: 'invalid' };
  if (record.attempts >= MAX_CODE_ATTEMPTS) return { error: 'too-many-attempts' };
  if (record.codeExpiresAt <= new Date()) return { error: 'expired' };

  const expected = Buffer.from(record.codeHash, 'hex');
  const supplied = Buffer.from(codeHash(record.challengeId, params.code), 'hex');
  const matches = expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);

  if (!matches) {
    await EmailVerification.updateOne(
      { _id: record._id, verifiedAt: { $exists: false }, attempts: { $lt: MAX_CODE_ATTEMPTS } },
      { $inc: { attempts: 1 } },
    );
    return { error: record.attempts + 1 >= MAX_CODE_ATTEMPTS ? 'too-many-attempts' : 'invalid' };
  }

  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  const verified = await EmailVerification.updateOne(
    {
      _id: record._id,
      verifiedAt: { $exists: false },
      attempts: { $lt: MAX_CODE_ATTEMPTS },
      codeExpiresAt: { $gt: new Date() },
    },
    {
      $set: {
        verifiedAt: new Date(now),
        proofHash: proofHash(token),
        proofExpiresAt: new Date(now + PROOF_LIFETIME_MS),
        expiresAt: new Date(now + PROOF_LIFETIME_MS + 60_000),
      },
    },
  );
  if (verified.modifiedCount !== 1) return { error: 'invalid' };

  return { token };
}

export async function hasValidEmailVerificationProof(params: {
  email: string;
  purpose: EmailVerificationPurpose;
  token: string;
  userId?: string;
}): Promise<boolean> {
  const record = await EmailVerification.findOne({
    lookupKey: lookupKey(params.email, params.purpose, params.userId),
    email: params.email,
    purpose: params.purpose,
    userId: params.userId,
    verifiedAt: { $exists: true },
    proofHash: proofHash(params.token),
    proofExpiresAt: { $gt: new Date() },
    consumedAt: { $exists: false },
  }).select('_id');
  return Boolean(record);
}

export async function consumeEmailVerificationProof(params: {
  email: string;
  purpose: EmailVerificationPurpose;
  token: string;
  userId?: string;
}): Promise<boolean> {
  const result = await EmailVerification.updateOne(
    {
      lookupKey: lookupKey(params.email, params.purpose, params.userId),
      email: params.email,
      purpose: params.purpose,
      userId: params.userId,
      verifiedAt: { $exists: true },
      proofHash: proofHash(params.token),
      proofExpiresAt: { $gt: new Date() },
      consumedAt: { $exists: false },
    },
    { $set: { consumedAt: new Date() } },
  );
  return result.modifiedCount === 1;
}
