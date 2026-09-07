import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { errorResponse, maskedResponse } from '@/lib/apiMask';
import {
  consumeEmailVerificationRequestLimit,
  emailVerificationRequestSchema,
  getClientIp,
} from '@/lib/authSecurity';
import {
  createEmailVerificationChallenge,
  discardEmailVerificationChallenge,
} from '@/lib/emailVerification';
import { sendEmailVerificationCode } from '@/lib/email/authEmail';
import { getAuthUserId, isUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = emailVerificationRequestSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Enter a valid email address', 400);

    await connectDB();
    const { email, purpose } = parsed.data;
    let userId: string | undefined;

    if (purpose === 'guest-upgrade') {
      const authUserId = await getAuthUserId();
      if (!isUserId(authUserId)) return authUserId;
      const guest = await User.findById(authUserId).select('isGuest').lean();
      if (!guest?.isGuest) return errorResponse('Guest account required', 403);
      userId = authUserId;
    }

    const limit = await consumeEmailVerificationRequestLimit(email, getClientIp(request.headers));
    if (!limit.allowed) {
      return errorResponse(`Too many codes requested. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`, 429);
    }

    const existing = await User.exists({ email });
    if (existing) return errorResponse('An account with this email already exists', 409);

    const challenge = await createEmailVerificationChallenge({ email, purpose, userId });
    try {
      await sendEmailVerificationCode({ to: email, code: challenge.code });
    } catch (error) {
      await discardEmailVerificationChallenge(challenge.challengeId);
      const code = typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code ?? 'unknown')
        : 'unknown';
      console.error('[Email verification delivery failed]', { code });
      return errorResponse('Verification email could not be sent. Please try again later.', 503);
    }

    return maskedResponse(
      { challengeId: challenge.challengeId, expiresInSeconds: 600 },
      { message: 'Verification code sent' },
    );
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? 'unknown')
      : 'unknown';
    console.error('[Email verification request failed]', { code });
    return errorResponse('Unable to send a verification code right now.', 500);
  }
}
