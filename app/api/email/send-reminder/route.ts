// ============================================
// /api/email/send-reminder — Send one reminder email
// ============================================
// Used by cron (with X-Cron-Secret + userId body param) and by the
// preferences page for "send test" (session auth, no userId body param).

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { decrypt } from '@/lib/encryption';
import { sendEmail } from '@/lib/email/smtp';
import { getImapTestTemplate, getReminderTemplate, getSmtpTestTemplate } from '@/lib/email/templates';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import type { SmtpSettings } from '@/types';
import type { ReminderType } from '@/lib/email/imap';

export const dynamic = 'force-dynamic';

const VALID_TYPES: ReminderType[] = ['water', 'breakfast', 'lunch', 'dinner', 'workout', 'weighIn', 'sleep'];

function buildTrackingMessageId(
  userId: string,
  kind: string
): string {
  const safeKind = kind.replace(/[^a-zA-Z0-9_-]/g, '');
  return `<am-${userId}-${safeKind}-${Date.now()}@arogyamandiram.local>`;
}

function isCronRequest(req: NextRequest): boolean {
  const secret = req.headers.get('x-cron-secret');
  return Boolean(process.env.CRON_SECRET && secret === process.env.CRON_SECRET);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      reminderType?: string;
      userId?: string;
      testMode?: 'smtp_test' | 'imap_test';
    };

    const { reminderType, userId: bodyUserId, testMode } = body;

    if (testMode !== 'smtp_test' && testMode !== 'imap_test' && (!reminderType || !VALID_TYPES.includes(reminderType as ReminderType))) {
      return errorResponse(`reminderType must be one of: ${VALID_TYPES.join(', ')}`, 400);
    }

    // Resolve userId: cron passes it in body + secret header; UI uses session
    let userId: string;

    if (bodyUserId && isCronRequest(req)) {
      userId = bodyUserId;
    } else {
      const authResult = await getAuthUserId();
      if (!isUserId(authResult)) return authResult;
      userId = authResult;
    }

    await connectDB();

    const user = await User.findById(userId).lean();

    if (!user) return errorResponse('User not found', 404);

    // Master switch: user turned off all reminder emails. Test emails from the
    // settings page are still allowed so SMTP setup can be verified.
    const remindersEnabled = ((user.settings as Record<string, unknown>)?.emailRemindersEnabled as boolean | undefined) ?? true;
    if (!testMode && !remindersEnabled) {
      return maskedResponse({ sent: false, skipped: true }, { message: 'Email reminders are turned off' });
    }

    const smtpSettings = (user.settings as Record<string, unknown>)?.emailSettings as
      | { smtp?: Record<string, unknown> }
      | undefined;

    if (!smtpSettings?.smtp?.host || !smtpSettings.smtp.pass || !smtpSettings.smtp.user) {
      return errorResponse('SMTP not configured. Please configure SMTP in Preferences first.', 400);
    }

    const rawPass = smtpSettings.smtp.pass as string;
    const smtpHost = smtpSettings.smtp.host as string | undefined;
    const smtpStoredSecure = smtpSettings.smtp.secure as boolean | undefined;
    const smtpStoredPort = smtpSettings.smtp.port as number | undefined;
    const smtpSecure = typeof smtpStoredSecure === 'boolean'
      ? smtpStoredSecure
      : process.env.SMTP_SECURE === 'true';
    const smtpPort = typeof smtpStoredPort === 'number'
      ? smtpStoredPort
      : parseInt(process.env.SMTP_PORT ?? (smtpSecure ? '465' : '587'), 10);
    if (!smtpHost) {
      return errorResponse('SMTP_HOST is not configured in environment', 500);
    }

    const smtpConfig: SmtpSettings = {
      host: smtpHost,
      port: Number.isNaN(smtpPort) ? (smtpSecure ? 465 : 587) : smtpPort,
      secure: smtpSecure,
      user: smtpSettings.smtp.user as string,
      pass: decrypt(rawPass),
      fromName: 'ArogyaMandiram',
    };

    const userName = (user.profile as Record<string, unknown>)?.name as string || '';
    const toEmail = (user.email as string | undefined) ?? '';
    const settings = (user.settings as Record<string, unknown>) ?? {};
    const recipientEmails = ((settings.recipientEmails as string[] | undefined)
      ?? (settings.ccEmails as string[] | undefined)
      ?? [])
      .map((email) => String(email).trim().toLowerCase())
      .filter((email) => email.includes('@'));
    const sendTo = recipientEmails.length ? recipientEmails.join(', ') : toEmail;

    const userGender = (user.profile as Record<string, unknown>)?.gender as string | undefined;
    const { subject, html } = testMode === 'smtp_test'
      ? getSmtpTestTemplate(userName)
      : testMode === 'imap_test'
        ? getImapTestTemplate(userName)
        : getReminderTemplate(reminderType as ReminderType, userName, userGender);

    const { messageId } = await sendEmail(smtpConfig, {
      to: sendTo,
      subject,
      html,
      messageId: buildTrackingMessageId(userId, testMode ?? (reminderType as string)),
    });

    if (testMode) {
      const checklistUpdate: Record<string, unknown> = {
        'settings.emailSetupChecklist.lastUpdatedAt': new Date(),
      };
      if (testMode === 'smtp_test') checklistUpdate['settings.emailSetupChecklist.smtpTestSent'] = true;
      if (testMode === 'imap_test') checklistUpdate['settings.emailSetupChecklist.imapTestSent'] = true;
      await User.findByIdAndUpdate(userId, { $set: checklistUpdate });
    }

    // Write SMTP debug log (dev/debug only — filesystem not writable in production)
    if (process.env.NEXT_PUBLIC_DEBUG_MODE === 'true') {
      try {
        const { promises: fsp } = await import('fs');
        const pathMod = await import('path');
        const userLogId = (user.username as string | undefined)?.trim() || userId;
        const dir = pathMod.join(process.cwd(), '.debug-logs', userLogId, 'email', 'smtp');
        await fsp.mkdir(dir, { recursive: true });
        const now = new Date();
        const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 24);
        const id = `${ts}-${Math.random().toString(36).slice(2, 6)}`;
        await fsp.writeFile(
          pathMod.join(dir, `${id}.json`),
          JSON.stringify({
            userId,
            metadata: { timestamp: now.toISOString(), username: userLogId },
            userRequest: {
              requestedAt: now.toISOString(),
              reminderType: testMode ? undefined : (reminderType ?? null),
              testMode: testMode ?? null,
            },
            result: { messageId, to: sendTo, sent: true },
          }, null, 2)
        );
      } catch { /* non-fatal */ }
    }

    return maskedResponse({ sent: true, messageId }, { message: testMode ? 'Test email sent' : 'Reminder sent' });
  } catch (err) {
    console.error('[Send Reminder Error]:', err);
    const msg = err instanceof Error ? err.message : 'Failed to send reminder';
    return errorResponse(msg, 500);
  }
}
