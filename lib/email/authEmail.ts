import nodemailer from 'nodemailer';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

interface FallbackSmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName?: string;
}

function getAuthEmailConfig(fallback?: FallbackSmtpConfig) {
  const host = process.env.AUTH_SMTP_HOST || process.env.SMTP_HOST;
  const port = Number.parseInt(process.env.AUTH_SMTP_PORT || process.env.SMTP_PORT || '587', 10);
  const secure = (process.env.AUTH_SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;
  const user = process.env.AUTH_SMTP_USER;
  const pass = process.env.AUTH_SMTP_PASS;
  const from = process.env.AUTH_EMAIL_FROM || user;

  if (host && Number.isFinite(port) && user && pass && from) {
    return { host, port, secure, user, pass, from };
  }

  if (fallback?.host && fallback.user && fallback.pass && Number.isFinite(fallback.port)) {
    const safeName = (fallback.fromName || 'Arogyamandiram').replace(/[\r\n"]/g, '').trim();
    return {
      host: fallback.host,
      port: fallback.port,
      secure: fallback.secure,
      user: fallback.user,
      pass: fallback.pass,
      from: `"${safeName}" <${fallback.user}>`,
    };
  }

  throw new Error('Authentication email service is not configured');
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name?: string;
  resetUrl: string;
  fallbackSmtp?: FallbackSmtpConfig;
}): Promise<void> {
  const config = getAuthEmailConfig(params.fallbackSmtp);
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });

  const rawFirstName = params.name?.trim().split(/\s+/)[0] || 'there';
  const firstName = escapeHtml(rawFirstName);
  const resetUrl = escapeHtml(params.resetUrl);

  await transporter.sendMail({
    from: config.from,
    to: params.to,
    subject: 'Reset your Arogyamandiram password',
    text: `Hi ${rawFirstName},\n\nUse this link to reset your Arogyamandiram password. It expires in 20 minutes and can only be used once:\n\n${params.resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `
      <div style="margin:0;padding:32px 16px;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#111827">
        <div style="max-width:560px;margin:0 auto;padding:32px;background:#ffffff;border-radius:12px">
          <h1 style="margin:0 0 16px;font-size:24px">Reset your password</h1>
          <p style="font-size:16px;line-height:1.6">Hi ${firstName},</p>
          <p style="font-size:16px;line-height:1.6">Use the button below to choose a new Arogyamandiram password. This link expires in 20 minutes and can only be used once.</p>
          <p style="margin:28px 0">
            <a href="${resetUrl}" style="display:inline-block;padding:13px 20px;border-radius:9px;background:#059669;color:#ffffff;text-decoration:none;font-weight:700">Reset password</a>
          </p>
          <p style="font-size:13px;line-height:1.6;color:#6b7280">If you did not request this, you can safely ignore this email. Your password has not changed.</p>
        </div>
      </div>
    `,
  });
}

export async function sendEmailVerificationCode(params: {
  to: string;
  code: string;
}): Promise<void> {
  const config = getAuthEmailConfig();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });
  const code = escapeHtml(params.code);

  await transporter.sendMail({
    from: config.from,
    to: params.to,
    subject: `${params.code} is your Arogyamandiram verification code`,
    text: `Your Arogyamandiram verification code is ${params.code}. It expires in 10 minutes. Never share this code with anyone. If you did not request it, you can ignore this email.`,
    html: `
      <div style="margin:0;padding:32px 16px;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#111827">
        <div style="max-width:560px;margin:0 auto;padding:32px;background:#ffffff;border-radius:12px">
          <h1 style="margin:0 0 16px;font-size:24px">Verify your email</h1>
          <p style="font-size:16px;line-height:1.6">Enter this code to confirm that this email address belongs to you:</p>
          <p style="margin:28px 0;font-size:34px;font-weight:800;letter-spacing:8px;color:#047857">${code}</p>
          <p style="font-size:14px;line-height:1.6;color:#4b5563">The code expires in 10 minutes and can only be used once. Never share it with anyone.</p>
          <p style="font-size:13px;line-height:1.6;color:#6b7280">If you did not request this, you can safely ignore this email.</p>
        </div>
      </div>
    `,
  });
}
