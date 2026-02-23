// ============================================
// API Response Masking Middleware
// ============================================
// Strips sensitive fields from ALL API responses
// so they never appear in browser Network tab.

import { NextResponse } from 'next/server';
import type { SafeUser } from '@/types';
import type { IUser } from '@/types';
import { getAgeFromDateOfBirth } from '@/lib/utils';

// Fields that must NEVER leave the server
const SENSITIVE_FIELDS = [
  'password',
  'apiKeys',
  '__v',
  'apiKeys.openai',
  'apiKeys.edamam',
  'apiKeys.edamam.appId',
  'apiKeys.edamam.appKey',
];

// Internal fields to strip from responses
const INTERNAL_FIELDS = ['__v', 'updatedAt'];

/**
 * Mask a user document into a safe client-side object.
 * Only includes fields needed for rendering.
 */
export function maskUser(user: IUser | Record<string, unknown>): SafeUser {
  const u = (typeof (user as { toObject?: () => Record<string, unknown> }).toObject === 'function'
    ? (user as { toObject: () => Record<string, unknown> }).toObject()
    : user) as Record<string, unknown>;

  const profile = (u.profile ? { ...(u.profile as Record<string, unknown>) } : {}) as Record<string, unknown>;
  const apiKeys = u.apiKeys as Record<string, unknown> | undefined;
  const settings = u.settings as Record<string, unknown> | undefined;
  const targets = u.targets as Record<string, unknown> | undefined;

  // Compute age and normalize dateOfBirth to YYYY-MM-DD for client (e.g. input type="date")
  if (profile.dateOfBirth) {
    const dob = profile.dateOfBirth instanceof Date ? profile.dateOfBirth : new Date(String(profile.dateOfBirth));
    if (!Number.isNaN(dob.getTime())) {
      profile.age = getAgeFromDateOfBirth(dob);
      profile.dateOfBirth = dob.toISOString().split('T')[0];
    }
  }

  const createdAt = u.createdAt as Date | string | undefined;
  const createdAtStr =
    createdAt instanceof Date
      ? createdAt.toISOString()
      : typeof createdAt === 'string'
        ? createdAt
        : undefined;

  return {
    id: String(u._id),
    email: u.email as string,
    profile: profile as unknown as SafeUser['profile'],
    settings: settings as unknown as SafeUser['settings'],
    targets: targets as unknown as SafeUser['targets'],
    onboardingComplete: u.onboardingComplete as boolean,
    hasOpenAiKey: Boolean(apiKeys?.openai),
    hasEdamamKey: Boolean(
      apiKeys?.edamam &&
        (apiKeys.edamam as Record<string, unknown>).appId &&
        (apiKeys.edamam as Record<string, unknown>).appKey
    ),
    ...(createdAtStr && { createdAt: createdAtStr }),
  };
}

/**
 * Deep-strip sensitive fields from any object.
 * Used for generic API responses (daily logs, etc.)
 */
export function stripSensitive<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const cleaned = { ...obj };

  for (const field of [...SENSITIVE_FIELDS, ...INTERNAL_FIELDS]) {
    if (field in cleaned) {
      delete cleaned[field as keyof typeof cleaned];
    }
  }

  // Convert _id to id for client consistency
  if ('_id' in cleaned) {
    (cleaned as Record<string, unknown>).id = String(cleaned._id);
    delete (cleaned as Record<string, unknown>)._id;
  }

  return cleaned;
}

/**
 * Strip sensitive data from an array of documents.
 */
export function stripSensitiveArray<T extends Record<string, unknown>>(arr: T[]): Partial<T>[] {
  return arr.map(stripSensitive);
}

/**
 * Create a masked JSON response.
 * Use this instead of NextResponse.json() in all API routes.
 */
export function maskedResponse<T>(
  data: T,
  options?: { status?: number; message?: string }
) {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(options?.message && { message: options.message }),
    },
    { status: options?.status ?? 200 }
  );
}

/**
 * Create an error response (no sensitive data leakage).
 */
export function errorResponse(
  message: string,
  status: number = 500,
  details?: string
) {
  // Never expose stack traces or internal errors in production
  const isDev = process.env.NODE_ENV === 'development';

  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(isDev && details && { details }),
    },
    { status }
  );
}
