// ============================================
// Session Helper - Get current user in API routes
// ============================================

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { errorResponse } from '@/lib/apiMask';

/**
 * Get the authenticated user ID from the session.
 * Returns userId string or a NextResponse error.
 */
export async function getAuthUserId(): Promise<string | ReturnType<typeof errorResponse>> {
  const session = await getServerSession(authOptions);

  if (session?.authError === 'SessionRevoked' || !session?.user || !(session.user as { id?: string }).id) {
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
 * Type guard to check if result is a userId string (not an error response)
 */
export function isUserId(result: unknown): result is string {
  return typeof result === 'string';
}
