// ============================================
// /api/email/process-replies - Poll IMAP and auto-log email replies
// ============================================
// Called by the cron job every 15 minutes.
// For each user with IMAP configured, fetches unread replies to
// ArogyaMandiram reminder emails and routes them to the appropriate
// logging API (food, water, weight, workout).

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { decrypt } from '@/lib/encryption';
import { fetchUnreadReplies, detectReminderType, markMessageSeen } from '@/lib/email/imap';
import { errorResponse, maskedResponse } from '@/lib/apiMask';
import type { ImapSettings } from '@/types';
import type { ReminderType } from '@/lib/email/imap';

export const dynamic = 'force-dynamic';
// Vercel max function duration (Pro: 60s, Hobby: 10s)
export const maxDuration = 60;

function validateCronSecret(req: NextRequest): boolean {
  const secret = req.headers.get('x-cron-secret')
    ?? req.headers.get('authorization')?.replace('Bearer ', '');
  return Boolean(process.env.CRON_SECRET && secret === process.env.CRON_SECRET);
}

/** Enrich the reply text with context based on reminder type */
function buildEnrichedText(reminderType: ReminderType, replyBody: string): string {
  const body = replyBody.trim().slice(0, 500);
  switch (reminderType) {
    case 'breakfast': return `for breakfast I had: ${body}`;
    case 'lunch':     return `for lunch I had: ${body}`;
    case 'dinner':    return `for dinner I had: ${body}`;
    case 'water':     return `I drank water: ${body}`; // orchestrator defaults to 250ml if no amount
    case 'weighIn':   return `my weight today is: ${body}`; // orchestrator extracts weight_kg
    case 'workout':   return `I completed a workout today: ${body}`; // workout-logger parses
    case 'sleep':     return `I slept: ${body}`; // orchestrator extracts duration + quality
  }
}

const MEAL_TYPE_MAP: Partial<Record<ReminderType, string>> = {
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
};

function extractTrackedUserId(inReplyTo: string | null): string | null {
  if (!inReplyTo) return null;
  // Matches message-id format: <am-<userId>-<kind>-<ts>@arogyamandiram.local>
  const match = inReplyTo.match(/am-([a-f0-9]{24})-/i);
  return match?.[1] ?? null;
}

export async function POST(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return errorResponse('Unauthorized', 401);
  }

  const imapPortRaw = process.env.IMAP_PORT ?? '993';
  const imapPort = parseInt(imapPortRaw, 10);
  if (Number.isNaN(imapPort)) {
    return errorResponse('IMAP_PORT must be a valid number in environment', 500);
  }

  await connectDB();

  const cronSecret = process.env.CRON_SECRET!;
  const origin = new URL(req.url).origin;

  const bypassHeaders = {
    'Content-Type': 'application/json',
    'x-cron-secret': cronSecret,
  };

  // Find all users with IMAP configured
  const users = await User.find({
    'settings.emailSettings.imap.host': { $exists: true, $ne: '' },
    'settings.emailSettings.imap.pass': { $exists: true, $ne: '' },
  })
    .lean();

  let processed = 0;
  const errors: string[] = [];

  for (const user of users) {
    const userId = String(user._id);
    const settings = (user.settings as Record<string, unknown>);
    const emailSettings = settings?.emailSettings as Record<string, unknown> | undefined;
    const imapRaw = emailSettings?.imap as Record<string, unknown> | undefined;

    if (!imapRaw?.host || !imapRaw?.pass) continue;

    let imapConfig: ImapSettings;
    try {
      imapConfig = {
        host:   imapRaw.host as string,
        port:   imapPort,
        secure: (imapRaw.secure as boolean) ?? true,
        user:   imapRaw.user as string,
        pass:   decrypt(imapRaw.pass as string),
      };
    } catch {
      errors.push(`${userId}: failed to decrypt IMAP password`);
      continue;
    }

    let replies;
    try {
      replies = await fetchUnreadReplies(imapConfig, 'ArogyaMandiram:');
    } catch (err) {
      errors.push(`${userId}: IMAP fetch failed - ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    let imapTestReplyVerified = false;
    for (const reply of replies) {
      const isImapTestReply = reply.subject.toLowerCase().includes('imap test');
      const trackedUserId = extractTrackedUserId(reply.inReplyTo);
      if (trackedUserId && trackedUserId !== userId) {
        // Shared inbox scenario: this reply belongs to another app user.
        continue;
      }
      const reminderType = detectReminderType(reply.subject);
      if (!reminderType) continue;

      const enrichedText = buildEnrichedText(reminderType, reply.textBody);
      const userBypassHeaders = {
        ...bypassHeaders,
        'x-internal-user-id': userId,
      };

      try {
        if (reminderType === 'breakfast' || reminderType === 'lunch' || reminderType === 'dinner') {
          // Step 1: Parse food items via food-logger
          const foodRes = await fetch(`${origin}/api/ai/food-logger`, {
            method: 'POST',
            headers: userBypassHeaders,
            body: JSON.stringify({ text: enrichedText }),
          });
          const foodJson = await foodRes.json() as {
            success: boolean;
            data?: { items?: Array<Record<string, unknown>> };
            error?: string;
          };

          if (!foodJson.success || !foodJson.data?.items?.length) {
            errors.push(`${userId}: food-logger failed for ${reminderType} - ${foodJson.error ?? 'no items'}`);
            continue;
          }

          const mealType = MEAL_TYPE_MAP[reminderType] ?? 'snack';

          // Step 2: Log each food item
          for (const item of foodJson.data.items) {
            const meal = { ...item, mealType, source: 'email_reply' };
            const mealRes = await fetch(`${origin}/api/daily-log/meal`, {
              method: 'POST',
              headers: userBypassHeaders,
              body: JSON.stringify({ meal }),
            });
            if (!mealRes.ok) {
              const mealJson = await mealRes.json() as { error?: string };
              errors.push(`${userId}: meal log failed - ${mealJson.error ?? mealRes.status}`);
            }
          }

          processed++;
        } else if (reminderType === 'workout') {
          // Step 1: Parse workout via workout-logger
          const woRes = await fetch(`${origin}/api/ai/workout-logger`, {
            method: 'POST',
            headers: userBypassHeaders,
            body: JSON.stringify({ text: enrichedText }),
          });
          const woJson = await woRes.json() as {
            success: boolean;
            data?: { workouts?: Array<Record<string, unknown>> };
            error?: string;
          };

          if (!woJson.success || !woJson.data?.workouts?.length) {
            errors.push(`${userId}: workout-logger failed - ${woJson.error ?? 'no workouts'}`);
            continue;
          }

          // Step 2: Log each workout
          for (const workout of woJson.data.workouts) {
            const woLogRes = await fetch(`${origin}/api/workouts`, {
              method: 'POST',
              headers: userBypassHeaders,
              body: JSON.stringify({ workout }),
            });
            if (!woLogRes.ok) {
              const woLogJson = await woLogRes.json() as { error?: string };
              errors.push(`${userId}: workout log failed - ${woLogJson.error ?? woLogRes.status}`);
            }
          }

          processed++;
        } else {
          // water, weighIn or sleep - route through orchestrator (handles parsing + logging)
          const orchRes = await fetch(`${origin}/api/ai/orchestrator`, {
            method: 'POST',
            headers: userBypassHeaders,
            body: JSON.stringify({ text: enrichedText }),
          });
          const orchJson = await orchRes.json() as {
            success: boolean;
            data?: { tool?: string; result?: Record<string, unknown> };
            error?: string;
          };

          if (!orchJson.success) {
            errors.push(`${userId}: orchestrator failed for ${reminderType} - ${orchJson.error}`);
            continue;
          }

          const orchTool = orchJson.data?.tool;
          const orchResult = orchJson.data?.result ?? {};

          // Auto-confirm water/weight/sleep pending actions
          if (orchTool === 'water' && orchResult.pendingWater) {
            const { amountMl } = orchResult.pendingWater as { amountMl: number };
            await fetch(`${origin}/api/water`, {
              method: 'POST',
              headers: userBypassHeaders,
              body: JSON.stringify({ amount: amountMl }),
            });
          } else if (orchTool === 'weight' && orchResult.pendingWeight) {
            const { weightKg } = orchResult.pendingWeight as { weightKg: number };
            await fetch(`${origin}/api/weight`, {
              method: 'POST',
              headers: userBypassHeaders,
              body: JSON.stringify({ weight: weightKg }),
            });
          } else if (orchTool === 'sleep' && orchResult.pendingSleep) {
            const { durationHours, quality, bedtime, wakeTime } = orchResult.pendingSleep as {
              durationHours: number;
              quality: number;
              bedtime?: string;
              wakeTime?: string;
            };
            await fetch(`${origin}/api/sleep`, {
              method: 'POST',
              headers: userBypassHeaders,
              body: JSON.stringify({
                duration: durationHours,
                quality,
                bedtime,
                wakeTime,
              }),
            });
          }

          processed++;
          if (isImapTestReply) imapTestReplyVerified = true;
        }

        // Mark as seen only after successful processing for the matched app user.
        await markMessageSeen(imapConfig, reply.uid);
      } catch (err) {
        errors.push(`${userId}: unhandled error for ${reminderType} - ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (imapTestReplyVerified) {
      await User.findByIdAndUpdate(userId, {
        $set: {
          'settings.emailSetupChecklist.imapReplyVerifiedAt': new Date(),
          'settings.emailSetupChecklist.lastUpdatedAt': new Date(),
        },
      });
    }

  }

  return maskedResponse({ processed, errors, usersScanned: users.length });
}
