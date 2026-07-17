// ============================================
// /api/user/email-settings - Save/delete SMTP + IMAP credentials
// ============================================
// Passwords are AES-256 encrypted before storage (same pattern as /api/user/api-keys).
// Passwords are never returned to the client.

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { decrypt, encrypt } from '@/lib/encryption';
import { maskedResponse, errorResponse, maskUser } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { sendEmail } from '@/lib/email/smtp';
import { getImapTestTemplate, getSmtpTestTemplate } from '@/lib/email/templates';
import type { SmtpSettings } from '@/types';

export const dynamic = 'force-dynamic';

function normalizeTestEmailError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();
  const errObj = (typeof err === 'object' && err !== null) ? (err as Record<string, unknown>) : {};
  const code = String(errObj.code ?? '').toUpperCase();
  const responseCode = typeof errObj.responseCode === 'number' ? errObj.responseCode : undefined;
  const responseText = String(errObj.response ?? '').toLowerCase();
  const command = String(errObj.command ?? '').toUpperCase();

  if (code === 'EAUTH' || responseCode === 535 || command === 'AUTH') {
    return 'SMTP login failed. For Gmail, use a 16-character App Password (not your normal Gmail password).';
  }

  if (code === 'EENVELOPE' || lower.includes('invalid recipient') || responseText.includes('recipient')) {
    return 'Test email failed because one or more recipient emails are invalid. Please review the Recipients list.';
  }

  if (code === 'ECONNECTION' || code === 'ETIMEDOUT' || code === 'ENOTFOUND' || code === 'ECONNREFUSED') {
    return 'Could not connect to the SMTP server. Please verify SMTP host/port and try again.';
  }
  if (code === 'ESOCKET' || command === 'CONN') {
    return 'SMTP connection failed (TLS/socket). Please verify SMTP host/port and use secure=true for port 465, secure=false for port 587.';
  }

  if (
    lower.includes('invalid login')
    || lower.includes('badcredentials')
    || lower.includes('username and password not accepted')
    || lower.includes('535')
  ) {
    return 'SMTP login failed. For Gmail, use a 16-character App Password (not your normal Gmail password).';
  }

  if (lower.includes('econnrefused') || lower.includes('enotfound') || lower.includes('etimedout')) {
    return 'Could not connect to the SMTP server. Please verify SMTP host/port and try again.';
  }

  return 'Test email failed. Please verify SMTP credentials and try again.';
}

function getTestEmailDiagnosticHint(err: unknown): string | undefined {
  const errObj = (typeof err === 'object' && err !== null) ? (err as Record<string, unknown>) : {};
  const code = String(errObj.code ?? '').toUpperCase();
  const responseCode = typeof errObj.responseCode === 'number' ? errObj.responseCode : undefined;
  const command = String(errObj.command ?? '').toUpperCase();

  const parts: string[] = [];
  if (code) parts.push(`code=${code}`);
  if (typeof responseCode === 'number') parts.push(`responseCode=${responseCode}`);
  if (command) parts.push(`command=${command}`);

  return parts.length ? `(${parts.join(', ')})` : undefined;
}

function normalizeEmailUser(rawUser: string | undefined): string | undefined {
  if (typeof rawUser !== 'string') return undefined;
  const value = rawUser.trim().toLowerCase();
  return value || undefined;
}

function normalizeSmtpPassword(rawPass: string | undefined, smtpUser: string | undefined): string | undefined {
  if (typeof rawPass !== 'string') return undefined;
  const trimmed = rawPass.trim();
  if (!trimmed) return undefined;

  // Gmail app-passwords are commonly copied as "abcd efgh ijkl mnop".
  // If it's a gmail account and this exact spaced pattern is provided,
  // normalize by removing spaces before encrypting/storing.
  const isGmail = Boolean(smtpUser?.endsWith('@gmail.com'));
  const compact = trimmed.replace(/\s+/g, '');
  if (isGmail && /^[a-zA-Z0-9 ]+$/.test(trimmed) && compact.length === 16) {
    return compact;
  }

  return trimmed;
}

// PUT /api/user/email-settings - Save SMTP and/or IMAP settings
export async function PUT(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const body = await req.json() as {
      smtp?: {
        host?: string;
        port?: number;
        secure?: boolean;
        user?: string;
        pass?: string;
        fromName?: string;
      };
      imap?: {
        host?: string;
        port?: number;
        secure?: boolean;
        user?: string;
        pass?: string;
      };
    };

    await connectDB();
    const existingUser = await User.findById(userId).lean();
    if (!existingUser) return errorResponse('User not found', 404);
    const existingSettings = (existingUser.settings as Record<string, unknown>) ?? {};
    const existingEmailSettings = (existingSettings.emailSettings as Record<string, unknown>) ?? {};
    const existingSmtp = (existingEmailSettings.smtp as Record<string, unknown>) ?? {};
    const existingSmtpUser = String(existingSmtp.user ?? '').trim().toLowerCase();
    const existingSmtpHasPass = Boolean(existingSmtp.pass);

    const updateData: Record<string, unknown> = {};

    if (body.smtp) {
      const s = body.smtp;
      const incomingSmtpUser = normalizeEmailUser(s.user);
      const normalizedSmtpPass = normalizeSmtpPassword(s.pass, incomingSmtpUser ?? existingSmtpUser);
      const smtpUserChanged = incomingSmtpUser !== undefined && incomingSmtpUser !== existingSmtpUser;
      const hasNewPass = Boolean(normalizedSmtpPass);

      if (smtpUserChanged && !hasNewPass) {
        return errorResponse(
          'SMTP email changed. Please enter the SMTP app password again to verify the new account.',
          400
        );
      }
      if (!hasNewPass && !existingSmtpHasPass) {
        return errorResponse('Please enter SMTP app password to complete SMTP setup.', 400);
      }

      const smtpHost = process.env.SMTP_HOST;
      const smtpPortRaw = process.env.SMTP_PORT ?? '587';
      const smtpPort = parseInt(smtpPortRaw, 10);
      if (!smtpHost) {
        return errorResponse('SMTP_HOST is not configured in environment', 500);
      }
      if (Number.isNaN(smtpPort)) {
        return errorResponse('SMTP_PORT must be a valid number in environment', 500);
      }
      const effectiveSmtpSecure = typeof s.secure === 'boolean' ? s.secure : smtpPort === 465;
      updateData['settings.emailSettings.smtp.host'] = smtpHost;
      updateData['settings.emailSettings.smtp.port'] = smtpPort;
      updateData['settings.emailSettings.smtp.secure'] = effectiveSmtpSecure;
      if (incomingSmtpUser !== undefined) updateData['settings.emailSettings.smtp.user'] = incomingSmtpUser;
      if (s.fromName !== undefined) updateData['settings.emailSettings.smtp.fromName'] = s.fromName;
      // Only encrypt and update password if a new one is provided
      if (normalizedSmtpPass) {
        updateData['settings.emailSettings.smtp.pass'] = encrypt(normalizedSmtpPass);
      }
    }

    if (body.imap) {
      const i = body.imap;
      const incomingImapUser = normalizeEmailUser(i.user);
      const normalizedImapPass = typeof i.pass === 'string' ? i.pass.trim() : undefined;
      const imapHost = process.env.IMAP_HOST;
      const imapPortRaw = process.env.IMAP_PORT ?? '993';
      const imapPort = parseInt(imapPortRaw, 10);
      if (!imapHost) {
        return errorResponse('IMAP_HOST is not configured in environment', 500);
      }
      if (Number.isNaN(imapPort)) {
        return errorResponse('IMAP_PORT must be a valid number in environment', 500);
      }
      updateData['settings.emailSettings.imap.host'] = imapHost;
      updateData['settings.emailSettings.imap.port'] = imapPort;
      if (i.secure !== undefined) updateData['settings.emailSettings.imap.secure'] = i.secure;
      if (incomingImapUser !== undefined) updateData['settings.emailSettings.imap.user'] = incomingImapUser;
      if (normalizedImapPass) {
        updateData['settings.emailSettings.imap.pass'] = encrypt(normalizedImapPass);
      }
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse('No settings provided', 400);
    }

    const checklistUpdates: Record<string, unknown> = {
      'settings.emailSetupChecklist.lastUpdatedAt': new Date(),
    };
    if (body.smtp) checklistUpdates['settings.emailSetupChecklist.smtpSaved'] = true;
    if (body.imap) checklistUpdates['settings.emailSetupChecklist.imapSaved'] = true;

    await User.findByIdAndUpdate(userId, { $set: { ...updateData, ...checklistUpdates } });

    // Re-fetch with email pass fields so maskUser can compute hasSmtp/hasImap
    const user = await User.findById(userId)
      .select('+apiKeys.openai +apiKeys.fdcApiKey')
      .lean();

    if (!user) return errorResponse('User not found', 404);

    const settings = (user.settings as Record<string, unknown>) ?? {};
    const emailSettings = (settings.emailSettings as Record<string, unknown>) ?? {};
    const smtpRaw = (emailSettings.smtp as Record<string, unknown>) ?? {};
    const recipientEmails = ((settings.recipientEmails as string[] | undefined)
      ?? (settings.ccEmails as string[] | undefined)
      ?? [])
      .map((email) => String(email).trim().toLowerCase())
      .filter((email) => email.includes('@'));
    const sendTo = recipientEmails.length ? recipientEmails.join(', ') : (user.email ? String(user.email) : '');

    const smtpHost = smtpRaw.host as string | undefined;
    const smtpUser = smtpRaw.user as string | undefined;
    const smtpEncryptedPass = smtpRaw.pass as string | undefined;
    const smtpPort = typeof smtpRaw.port === 'number'
      ? smtpRaw.port
      : parseInt(process.env.SMTP_PORT ?? '587', 10);
    const smtpSecure = typeof smtpRaw.secure === 'boolean'
      ? smtpRaw.secure
      : (Number.isNaN(smtpPort) ? process.env.SMTP_SECURE === 'true' : smtpPort === 465);
    const smtpFromName = (smtpRaw.fromName as string | undefined) || 'ArogyaMandiram';
    const userName = ((user.profile as Record<string, unknown>)?.name as string | undefined) || '';

    const needsSmtpTest = Boolean(body.smtp);
    const needsImapTest = Boolean(body.imap);
    let smtpTestSent = false;
    let imapTestSent = false;
    let testError = '';

    if (smtpHost && smtpUser && smtpEncryptedPass && (needsSmtpTest || needsImapTest)) {
      const smtpConfig: SmtpSettings = {
        host: smtpHost,
        port: Number.isNaN(smtpPort) ? (smtpSecure ? 465 : 587) : smtpPort,
        secure: smtpSecure,
        user: smtpUser,
        pass: decrypt(smtpEncryptedPass),
        fromName: smtpFromName,
      };

      try {
        if (needsSmtpTest) {
          const smtpTemplate = getSmtpTestTemplate(userName);
          await sendEmail(smtpConfig, {
            to: sendTo,
            subject: smtpTemplate.subject,
            html: smtpTemplate.html,
          });
          smtpTestSent = true;
        }

        if (needsImapTest) {
          const imapTemplate = getImapTestTemplate(userName);
          await sendEmail(smtpConfig, {
            to: sendTo,
            subject: imapTemplate.subject,
            html: imapTemplate.html,
          });
          imapTestSent = true;
        }
      } catch (err) {
        const debug = (typeof err === 'object' && err !== null) ? (err as Record<string, unknown>) : {};
        console.error('[Email Settings Test Email Error]', {
          userId: String(userId),
          code: debug.code ?? null,
          responseCode: debug.responseCode ?? null,
          command: debug.command ?? null,
          message: err instanceof Error ? err.message : String(err),
        });
        const normalized = normalizeTestEmailError(err);
        const hint = getTestEmailDiagnosticHint(err);
        testError = hint ? `${normalized} ${hint}` : normalized;
      }
    } else if (needsSmtpTest || needsImapTest) {
      testError = 'SMTP is not configured correctly, so test email could not be sent.';
    }

    const postChecklist: Record<string, unknown> = {
      'settings.emailSetupChecklist.recipientListSaved': true,
      'settings.emailSetupChecklist.lastUpdatedAt': new Date(),
    };
    if (smtpTestSent) postChecklist['settings.emailSetupChecklist.smtpTestSent'] = true;
    if (imapTestSent) postChecklist['settings.emailSetupChecklist.imapTestSent'] = true;

    await User.findByIdAndUpdate(userId, { $set: postChecklist });

    const refreshedUser = await User.findById(userId)
      .select('+apiKeys.openai +apiKeys.fdcApiKey')
      .lean();

    if (!refreshedUser) return errorResponse('User not found', 404);

    const allRequestedTestsSent = (!needsSmtpTest || smtpTestSent) && (!needsImapTest || imapTestSent);
    const message = allRequestedTestsSent
      ? 'Email settings saved securely and test email sent'
      : `Email settings saved, but test email failed: ${testError || 'Please verify SMTP credentials and try again.'}`;

    return maskedResponse(
      {
        user: maskUser(refreshedUser),
        emailTest: {
          smtpTestSent,
          imapTestSent,
          error: testError || undefined,
        },
      },
      { message }
    );
  } catch (err) {
    console.error('[Email Settings PUT Error]:', err);
    return errorResponse('Failed to save email settings', 500);
  }
}

// DELETE /api/user/email-settings - Remove SMTP or IMAP config
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const { type } = await req.json() as { type?: string };

    if (type !== 'smtp' && type !== 'imap') {
      return errorResponse('type must be "smtp" or "imap"', 400);
    }

    await connectDB();

    await User.findByIdAndUpdate(userId, {
      $set: {
        [`settings.emailSettings.${type}.host`]:   '',
        [`settings.emailSettings.${type}.user`]:   '',
        [`settings.emailSettings.${type}.pass`]:   '',
      },
    });

    return maskedResponse(null, { message: `${type.toUpperCase()} settings removed` });
  } catch (err) {
    console.error('[Email Settings DELETE Error]:', err);
    return errorResponse('Failed to remove email settings', 500);
  }
}
