// ============================================
// SMTP Email Sender - nodemailer wrapper
// ============================================
// Accepts a user's decrypted SMTP config from Preferences.
// Callers are responsible for decrypting the password before passing it in.

import nodemailer from 'nodemailer';
import type { SmtpSettings } from '@/types';

export interface SendEmailParams {
  to: string;
  cc?: string;
  subject: string;
  html: string;
  /** Optional custom Message-ID for threading (e.g. <reminder-123@arogyamandiram>) */
  messageId?: string;
}

export interface SendEmailResult {
  messageId: string;
}

export async function sendEmail(
  smtpConfig: SmtpSettings,
  params: SendEmailParams
): Promise<SendEmailResult> {

  if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
    throw new Error('SMTP not configured. Please configure SMTP in Preferences.');
  }

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass,
    },
  });

  const mailOptions: nodemailer.SendMailOptions = {
    from: `"${smtpConfig.fromName}" <${smtpConfig.user}>`,
    to: params.to,
    ...(params.cc && { cc: params.cc }),
    subject: params.subject,
    html: params.html,
  };

  if (params.messageId) {
    mailOptions.messageId = params.messageId;
  }

  const info = await transporter.sendMail(mailOptions);

  return { messageId: info.messageId as string };
}
