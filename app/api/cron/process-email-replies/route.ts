// ============================================
// /api/cron/process-email-replies - Trigger IMAP reply processing
// ============================================
// Called by Vercel Cron every 15 minutes.
// Delegates to /api/email/process-replies.

import { NextRequest } from 'next/server';
import { maskedResponse, errorResponse } from '@/lib/apiMask';

export const dynamic = 'force-dynamic';

function validateCronSecret(req: NextRequest): boolean {
  const secret = req.headers.get('x-cron-secret')
    ?? req.headers.get('authorization')?.replace('Bearer ', '');
  return Boolean(process.env.CRON_SECRET && secret === process.env.CRON_SECRET);
}

export async function POST(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return errorResponse('Unauthorized', 401);
  }

  const origin = new URL(req.url).origin;
  const cronSecret = process.env.CRON_SECRET!;

  const res = await fetch(`${origin}/api/email/process-replies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-cron-secret': cronSecret,
    },
  });

  const json = await res.json() as Record<string, unknown>;
  return maskedResponse(json);
}

// Vercel Cron Jobs invoke routes with GET - alias so both GET and POST work
export { POST as GET };
