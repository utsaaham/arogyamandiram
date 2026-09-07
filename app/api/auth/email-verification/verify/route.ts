import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { errorResponse, maskedResponse } from '@/lib/apiMask';
import { emailVerificationCodeSchema } from '@/lib/authSecurity';
import {
  emailVerificationCookieName,
  emailVerificationCookiePath,
  verifyEmailCode,
} from '@/lib/emailVerification';
import { getAuthUserId, isUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = emailVerificationCodeSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Enter the 6-digit verification code', 400);

    await connectDB();
    const { email, purpose, challengeId, code } = parsed.data;
    let userId: string | undefined;
    if (purpose === 'guest-upgrade') {
      const authUserId = await getAuthUserId();
      if (!isUserId(authUserId)) return authUserId;
      userId = authUserId;
    }

    const result = await verifyEmailCode({ email, purpose, challengeId, code, userId });
    if (!result.token) {
      if (result.error === 'expired') return errorResponse('That code has expired. Request a new one.', 400);
      if (result.error === 'too-many-attempts') return errorResponse('Too many incorrect attempts. Request a new code.', 429);
      return errorResponse('The verification code is incorrect.', 400);
    }

    const response = maskedResponse(
      { verified: true, expiresInSeconds: 900 },
      { message: 'Email verified' },
    );
    response.cookies.set(emailVerificationCookieName(purpose), result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60,
      path: emailVerificationCookiePath(purpose),
    });
    return response;
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? 'unknown')
      : 'unknown';
    console.error('[Email verification failed]', { code });
    return errorResponse('Unable to verify the code right now.', 500);
  }
}
