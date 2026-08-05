// ============================================
// Session Helper - Get current user in API routes
// ============================================

import { createHash, timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { errorResponse } from '@/lib/apiMask';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { decrypt } from '@/lib/encryption';

/**
 * Header carrying the ArogyaM username that scopes a bearer-key lookup.
 * The key itself is only ever stored encrypted, so it cannot be queried
 * directly - the username narrows the lookup to exactly one row, which is
 * then decrypted and compared.
 */
export const BEARER_USERNAME_HEADER = 'x-arogyam-username';

/**
 * Get the authenticated user ID from the session.
 * Returns userId string or a NextResponse error.
 */
export async function getAuthUserId(): Promise<string | ReturnType<typeof errorResponse>> {
  const session = await getServerSession(authOptions);

  if (!session?.user || !(session.user as { id?: string }).id) {
    return errorResponse('Unauthorized', 401);
  }

  return (session.user as { id: string }).id;
}

/**
 * Check if a request carries a valid cron-bypass header pair.
 * Returns the internal userId if valid, or null if not a bypass request.
 * Only works when CRON_SECRET env var is configured.
 */
export function resolveUserIdFromRequest(req: NextRequest): string | null {
  const cronSecret = req.headers.get('x-cron-secret');
  const internalUserId = req.headers.get('x-internal-user-id');
  if (
    process.env.CRON_SECRET &&
    cronSecret === process.env.CRON_SECRET &&
    internalUserId
  ) {
    return internalUserId;
  }
  return null;
}

/** Shape of the health-data credential fields a bearer check needs. */
export interface HealthDataCredentialUser {
  settings?: {
    healthData?: {
      apiKeyEncrypted?: string;
      apiKeyRevokedAt?: Date | string | null;
    };
  };
}

/** Constant-time string compare, via fixed-length digests. */
function safeEquals(a: string, b: string): boolean {
  return timingSafeEqual(
    createHash('sha256').update(a).digest(),
    createHash('sha256').update(b).digest()
  );
}

/**
 * Check a presented bearer key against a user's stored health-data credential.
 * Returns false when no key is set, when the key has been revoked, or when the
 * stored ciphertext cannot be decrypted.
 *
 * Callers that already loaded the user by username (e.g. /api/health-snapshots)
 * should use this directly; everything else goes through resolveBearerUserId.
 */
export function verifyHealthDataKey(
  user: HealthDataCredentialUser,
  presentedKey: string
): boolean {
  const healthData = user.settings?.healthData;
  const encrypted = healthData?.apiKeyEncrypted;
  if (!presentedKey || !encrypted) return false;
  if (healthData?.apiKeyRevokedAt) return false;

  try {
    return safeEquals(decrypt(encrypted), presentedKey);
  } catch {
    return false;
  }
}

/** Pull the raw key out of an `Authorization: Bearer <key>` header. */
export function extractBearerKey(req: NextRequest): string {
  return req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ?? '';
}

/**
 * Resolve a userId from `Authorization: Bearer <key>` plus the username header.
 * Returns null when either header is missing or the credential does not match,
 * so callers can fall through to other auth paths.
 */
export async function resolveBearerUserId(req: NextRequest): Promise<string | null> {
  const presentedKey = extractBearerKey(req);
  const username = req.headers.get(BEARER_USERNAME_HEADER)?.trim() ?? '';
  if (!presentedKey || !username) return null;

  await connectDB();

  let user: (HealthDataCredentialUser & { _id: { toString(): string } }) | null;
  try {
    user = await User.findOne({ username })
      .select('+settings.healthData.apiKeyEncrypted settings.healthData.apiKeyRevokedAt')
      .lean() as typeof user;
  } catch {
    return null;
  }
  if (!user) return null;

  return verifyHealthDataKey(user, presentedKey) ? user._id.toString() : null;
}

/**
 * Get userId from either cron bypass headers or session.
 * Convenience wrapper for routes that support both paths.
 */
export async function getAuthUserIdWithBypass(
  req: NextRequest
): Promise<string | ReturnType<typeof errorResponse>> {
  const fromBypass = resolveUserIdFromRequest(req);
  if (fromBypass) return fromBypass;
  return getAuthUserId();
}

/**
 * Get userId from session cookie or bearer key - no cron bypass.
 *
 * This is the default for routes the iOS app and other headless clients call.
 * The cron bypass grants "act as any user by ID", so it is added only where a
 * route genuinely needs it (see getAuthUserIdWithBypassAndBearer) rather than
 * riding along with bearer support.
 *
 * Deliberately NOT for /api/auth/*, /api/user/upgrade, or anything that can
 * change credentials: a bearer key that can set a password can take the account.
 */
export async function getAuthUserIdWithBearer(
  req: NextRequest
): Promise<string | ReturnType<typeof errorResponse>> {
  const session = await getServerSession(authOptions);
  const sessionUserId = (session?.user as { id?: string } | undefined)?.id;
  if (sessionUserId) return sessionUserId;

  const fromBearer = await resolveBearerUserId(req);
  if (fromBearer) return fromBearer;

  return errorResponse('Unauthorized', 401);
}

/**
 * Get userId from cron bypass headers, session cookie, or bearer key.
 * Only for routes that already accepted the cron bypass before bearer existed.
 */
export async function getAuthUserIdWithBypassAndBearer(
  req: NextRequest
): Promise<string | ReturnType<typeof errorResponse>> {
  const fromBypass = resolveUserIdFromRequest(req);
  if (fromBypass) return fromBypass;
  return getAuthUserIdWithBearer(req);
}

/**
 * Type guard to check if result is a userId string (not an error response)
 */
export function isUserId(result: unknown): result is string {
  return typeof result === 'string';
}
