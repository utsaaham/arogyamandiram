import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { errorResponse, maskedResponse } from '@/lib/apiMask';
import {
  consumePasswordResetLimit,
  createPasswordResetToken,
  emailSchema,
  getClientIp,
  hashPasswordResetToken,
} from '@/lib/authSecurity';
import { sendPasswordResetEmail } from '@/lib/email/authEmail';
import { decrypt } from '@/lib/encryption';

const GENERIC_MESSAGE = 'If an account exists for that email, a password reset link has been sent.';
const RESET_TOKEN_LIFETIME_MS = 20 * 60 * 1000;

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getApplicationUrl(request: NextRequest): string {
  const configured = process.env.NEXTAUTH_URL;
  if (configured) {
    const url = new URL(configured);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Invalid NEXTAUTH_URL');
    return url.origin;
  }
  if (process.env.NODE_ENV === 'development') return request.nextUrl.origin;
  throw new Error('NEXTAUTH_URL is required for password recovery');
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  try {
    const body = await request.json().catch(() => null) as { email?: unknown } | null;
    const parsedEmail = emailSchema.safeParse(body?.email);
    if (!parsedEmail.success) return errorResponse('Enter a valid email address', 400);

    await connectDB();

    const email = parsedEmail.data;
    const ip = getClientIp(request.headers);
    const limit = await consumePasswordResetLimit(email, ip);
    if (!limit.allowed) {
      return maskedResponse({ accepted: true }, { message: GENERIC_MESSAGE });
    }

    const user = await User.findOne({ email })
      .select('email profile.name settings.emailSettings.smtp')
      .lean();
    if (user?.email) {
      const token = createPasswordResetToken();
      const tokenHash = hashPasswordResetToken(token);
      const expiresAt = new Date(Date.now() + RESET_TOKEN_LIFETIME_MS);

      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            'authSecurity.passwordResetTokenHash': tokenHash,
            'authSecurity.passwordResetExpiresAt': expiresAt,
          },
        },
      );

      try {
        const resetUrl = new URL('/reset-password', getApplicationUrl(request));
        resetUrl.searchParams.set('token', token);
        const smtp = user.settings?.emailSettings?.smtp;
        const fallbackSmtp = smtp?.host && smtp.user && smtp.pass
          ? {
              host: smtp.host,
              port: smtp.port,
              secure: smtp.secure,
              user: smtp.user,
              pass: decrypt(smtp.pass),
              fromName: smtp.fromName,
            }
          : undefined;

        await sendPasswordResetEmail({
          to: user.email,
          name: user.profile?.name,
          resetUrl: resetUrl.toString(),
          fallbackSmtp,
        });
      } catch (error) {
        await User.updateOne(
          { _id: user._id, 'authSecurity.passwordResetTokenHash': tokenHash },
          {
            $unset: {
              'authSecurity.passwordResetTokenHash': 1,
              'authSecurity.passwordResetExpiresAt': 1,
            },
          },
        );
        const code = typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code ?? 'unknown')
          : 'unknown';
        console.error('[Password reset email failed]', { code });
      }
    }

    const remainingDelay = 400 - (Date.now() - startedAt);
    if (remainingDelay > 0) await new Promise((resolve) => setTimeout(resolve, remainingDelay));

    return maskedResponse({ accepted: true }, { message: GENERIC_MESSAGE });
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? 'unknown')
      : 'unknown';
    console.error('[Forgot password error]', { code });
    return errorResponse('Unable to process the request right now. Please try again later.', 500);
  }
}
