import crypto from 'crypto';
import { z } from 'zod';
import AuthRateLimit from '@/models/AuthRateLimit';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_BLOCK_MS = 15 * 60 * 1000;
const RESET_WINDOW_MS = 60 * 60 * 1000;
const RESET_BLOCK_MS = 60 * 60 * 1000;
const EMAIL_CODE_WINDOW_MS = 15 * 60 * 1000;
const EMAIL_CODE_NETWORK_WINDOW_MS = 60 * 60 * 1000;

export const DUMMY_PASSWORD_HASH = '$2a$12$7bN6RIxj5VjqicehlzXCdeTRSIeq6AfH/2ron65dYwXSnFEUzKkgy';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .max(254, 'Email address is too long');

export const loginCredentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(40).max(128).regex(/^[A-Za-z0-9_-]+$/),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be 72 characters or fewer')
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be 72 bytes or fewer'),
});

export const emailVerificationPurposeSchema = z.enum(['register', 'guest-upgrade']);

export const emailVerificationRequestSchema = z.object({
  email: emailSchema,
  purpose: emailVerificationPurposeSchema,
});

export const emailVerificationCodeSchema = z.object({
  email: emailSchema,
  purpose: emailVerificationPurposeSchema,
  challengeId: z.string().min(24).max(64).regex(/^[A-Za-z0-9_-]+$/),
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

export const emailVerificationProofSchema = z.string().min(40).max(128).regex(/^[A-Za-z0-9_-]+$/);

type HeaderSource = Headers | Record<string, string | string[] | undefined> | undefined;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function getClientIp(headers: HeaderSource): string {
  const readHeader = (name: string): string | undefined => {
    if (!headers) return undefined;
    if (headers instanceof Headers) return headers.get(name) ?? undefined;
    const value = headers[name] ?? headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  };

  const forwarded = readHeader('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded
    || readHeader('cf-connecting-ip')?.trim()
    || readHeader('x-real-ip')?.trim()
    || 'unknown';
}

function identifierKey(scope: string, value: string): string {
  const secret = process.env.NEXTAUTH_SECRET
    ?? (process.env.NODE_ENV === 'development' ? 'dev-secret-min-32-chars-for-jwt-signing' : undefined);
  if (!secret) throw new Error('NEXTAUTH_SECRET is required for authentication rate limiting');
  return crypto.createHmac('sha256', secret).update(`${scope}:${value}`).digest('hex');
}

interface LimitPolicy {
  scope: string;
  maxAttempts: number;
  windowMs: number;
  blockMs: number;
}

interface LimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

async function inspectLimit(policy: LimitPolicy, identifier: string): Promise<LimitResult> {
  const now = new Date();
  const entry = await AuthRateLimit.findOne({ key: identifierKey(policy.scope, identifier) }).lean();
  if (!entry) return { allowed: true, retryAfterSeconds: 0 };

  if (entry.blockedUntil && entry.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.blockedUntil.getTime() - now.getTime()) / 1000)),
    };
  }

  if (entry.windowExpiresAt <= now) return { allowed: true, retryAfterSeconds: 0 };
  if (entry.attempts < policy.maxAttempts) return { allowed: true, retryAfterSeconds: 0 };

  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((entry.windowExpiresAt.getTime() - now.getTime()) / 1000)),
  };
}

async function recordHit(policy: LimitPolicy, identifier: string): Promise<void> {
  const now = new Date();
  const key = identifierKey(policy.scope, identifier);
  const existing = await AuthRateLimit.findOne({ key });

  if (!existing || existing.windowExpiresAt <= now) {
    try {
      await AuthRateLimit.findOneAndUpdate(
        { key },
        {
          $set: {
            attempts: 1,
            windowExpiresAt: new Date(now.getTime() + policy.windowMs),
            expiresAt: new Date(now.getTime() + policy.windowMs + policy.blockMs),
          },
          $unset: { blockedUntil: 1 },
        },
        { upsert: true },
      );
    } catch (error) {
      if (!(typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000)) {
        throw error;
      }
      await AuthRateLimit.updateOne({ key }, { $inc: { attempts: 1 } });
    }
    return;
  }

  existing.attempts += 1;
  if (existing.attempts >= policy.maxAttempts) {
    existing.blockedUntil = new Date(now.getTime() + policy.blockMs);
    existing.expiresAt = new Date(existing.blockedUntil.getTime() + policy.windowMs);
  }
  await existing.save();
}

const LOGIN_COMBINATION_POLICY: LimitPolicy = {
  scope: 'login-combination',
  maxAttempts: 5,
  windowMs: LOGIN_WINDOW_MS,
  blockMs: LOGIN_BLOCK_MS,
};

const LOGIN_NETWORK_POLICY: LimitPolicy = {
  scope: 'login-network',
  maxAttempts: 30,
  windowMs: LOGIN_WINDOW_MS,
  blockMs: LOGIN_BLOCK_MS,
};

const RESET_EMAIL_POLICY: LimitPolicy = {
  scope: 'reset-email',
  maxAttempts: 3,
  windowMs: RESET_WINDOW_MS,
  blockMs: RESET_BLOCK_MS,
};

const RESET_NETWORK_POLICY: LimitPolicy = {
  scope: 'reset-network',
  maxAttempts: 10,
  windowMs: RESET_WINDOW_MS,
  blockMs: RESET_BLOCK_MS,
};

const EMAIL_CODE_EMAIL_POLICY: LimitPolicy = {
  scope: 'email-code-email',
  maxAttempts: 3,
  windowMs: EMAIL_CODE_WINDOW_MS,
  blockMs: EMAIL_CODE_WINDOW_MS,
};

const EMAIL_CODE_NETWORK_POLICY: LimitPolicy = {
  scope: 'email-code-network',
  maxAttempts: 20,
  windowMs: EMAIL_CODE_NETWORK_WINDOW_MS,
  blockMs: EMAIL_CODE_NETWORK_WINDOW_MS,
};

export async function inspectLoginLimit(email: string, ip: string): Promise<LimitResult> {
  const [combination, network] = await Promise.all([
    inspectLimit(LOGIN_COMBINATION_POLICY, `${email}:${ip}`),
    inspectLimit(LOGIN_NETWORK_POLICY, ip),
  ]);

  if (!combination.allowed) return combination;
  return network;
}

export async function recordLoginFailure(email: string, ip: string): Promise<void> {
  await Promise.all([
    recordHit(LOGIN_COMBINATION_POLICY, `${email}:${ip}`),
    recordHit(LOGIN_NETWORK_POLICY, ip),
  ]);
}

export async function clearLoginFailures(email: string, ip: string): Promise<void> {
  await AuthRateLimit.deleteOne({ key: identifierKey(LOGIN_COMBINATION_POLICY.scope, `${email}:${ip}`) });
}

export async function consumePasswordResetLimit(email: string, ip: string): Promise<LimitResult> {
  const [emailLimit, networkLimit] = await Promise.all([
    inspectLimit(RESET_EMAIL_POLICY, email),
    inspectLimit(RESET_NETWORK_POLICY, ip),
  ]);
  const denied = !emailLimit.allowed ? emailLimit : !networkLimit.allowed ? networkLimit : null;
  if (denied) return denied;

  await Promise.all([
    recordHit(RESET_EMAIL_POLICY, email),
    recordHit(RESET_NETWORK_POLICY, ip),
  ]);
  return { allowed: true, retryAfterSeconds: 0 };
}

export async function consumeEmailVerificationRequestLimit(email: string, ip: string): Promise<LimitResult> {
  const [emailLimit, networkLimit] = await Promise.all([
    inspectLimit(EMAIL_CODE_EMAIL_POLICY, email),
    inspectLimit(EMAIL_CODE_NETWORK_POLICY, ip),
  ]);
  const denied = !emailLimit.allowed ? emailLimit : !networkLimit.allowed ? networkLimit : null;
  if (denied) return denied;

  await Promise.all([
    recordHit(EMAIL_CODE_EMAIL_POLICY, email),
    recordHit(EMAIL_CODE_NETWORK_POLICY, ip),
  ]);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function hashPasswordResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createPasswordResetToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}
