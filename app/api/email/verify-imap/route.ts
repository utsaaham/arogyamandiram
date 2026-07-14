// ============================================
// /api/email/verify-imap - Check IMAP test reply for current user
// ============================================
// Authenticated endpoint used by Preferences to poll every minute
// for up to 10 minutes after sending IMAP test email.

import connectDB from '@/lib/db';
import User from '@/models/User';
import { decrypt } from '@/lib/encryption';
import { hasReplyWithSubject } from '@/lib/email/imap';
import { errorResponse, maskedResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import type { ImapSettings } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    await connectDB();

    const user = await User.findById(userId).lean();
    if (!user) return errorResponse('User not found', 404);

    const settings = (user.settings as Record<string, unknown>) ?? {};
    const checklist = (settings.emailSetupChecklist as Record<string, unknown> | undefined) ?? {};
    const alreadyVerified = checklist.imapReplyVerifiedAt;
    if (alreadyVerified) {
      return maskedResponse({
        verified: true,
        verifiedAt: new Date(alreadyVerified as string | Date).toISOString(),
        checked: false,
      });
    }

    const emailSettings = (settings.emailSettings as Record<string, unknown> | undefined) ?? {};
    const imapRaw = (emailSettings.imap as Record<string, unknown> | undefined) ?? {};

    if (!imapRaw.host || !imapRaw.user || !imapRaw.pass) {
      return errorResponse('IMAP is not fully configured yet', 400);
    }

    const imapPort = parseInt(process.env.IMAP_PORT ?? '993', 10);
    if (Number.isNaN(imapPort)) {
      return errorResponse('IMAP_PORT must be a valid number in environment', 500);
    }

    const imapConfig: ImapSettings = {
      host: imapRaw.host as string,
      port: imapPort,
      secure: (imapRaw.secure as boolean) ?? true,
      user: imapRaw.user as string,
      pass: decrypt(imapRaw.pass as string),
    };

    const hasImapTestReply = await hasReplyWithSubject(imapConfig, 'ArogyaMandiram: IMAP test');

    if (hasImapTestReply) {
      const now = new Date();
      await User.findByIdAndUpdate(userId, {
        $set: {
          'settings.emailSetupChecklist.imapReplyVerifiedAt': now,
          'settings.emailSetupChecklist.lastUpdatedAt': now,
        },
      });
      return maskedResponse({
        verified: true,
        verifiedAt: now.toISOString(),
        checked: true,
      });
    }

    return maskedResponse({
      verified: false,
      checked: true,
    });
  } catch (err) {
    console.error('[Verify IMAP Error]:', err);
    return errorResponse('Failed to verify IMAP test reply', 500);
  }
}
