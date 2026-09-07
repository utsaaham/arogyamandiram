import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { errorResponse, maskedResponse } from '@/lib/apiMask';
import { clearLoginFailures, getClientIp, hashPasswordResetToken, resetPasswordSchema } from '@/lib/authSecurity';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || 'Invalid password reset request', 400);
    }

    await connectDB();

    const tokenHash = hashPasswordResetToken(parsed.data.token);
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const now = new Date();

    const user = await User.findOneAndUpdate(
      {
        'authSecurity.passwordResetTokenHash': tokenHash,
        'authSecurity.passwordResetExpiresAt': { $gt: now },
      },
      {
        $set: {
          password: passwordHash,
          'authSecurity.passwordChangedAt': now,
        },
        $unset: {
          'authSecurity.passwordResetTokenHash': 1,
          'authSecurity.passwordResetExpiresAt': 1,
        },
        $inc: { 'authSecurity.sessionVersion': 1 },
      },
      { new: true },
    ).select('_id email');

    if (!user) {
      return errorResponse('This reset link is invalid or has expired. Request a new one.', 400);
    }

    if (user.email) {
      await clearLoginFailures(user.email, getClientIp(request.headers));
    }

    return maskedResponse(
      { passwordReset: true },
      { message: 'Password updated. You can now sign in with your new password.' },
    );
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? 'unknown')
      : 'unknown';
    console.error('[Reset password error]', { code });
    return errorResponse('Unable to reset the password right now. Please try again later.', 500);
  }
}
