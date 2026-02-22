// ============================================
// Session Helper - Get current user in API routes
// ============================================

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { errorResponse } from '@/lib/apiMask';

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
 * Type guard to check if result is a userId string (not an error response)
 */
export function isUserId(result: unknown): result is string {
  return typeof result === 'string';
}
