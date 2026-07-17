// ============================================
// /api/health-metrics - Device health metrics history
// ============================================
// GET ?days=N → last N days of heartRate, steps, activeCalories, distanceKm

import { type NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import DailyLog from '@/models/DailyLog';
import User from '@/models/User';
import { maskedResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { getToday } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function getValidTimezone(rawTimezone: string | undefined): string | null {
  if (!rawTimezone) return null;
  try {
    Intl.DateTimeFormat('en-US', { timeZone: rawTimezone }).format(new Date());
    return rawTimezone;
  } catch {
    return null;
  }
}

function toDateKey(date: Date, timezone?: string): string {
  const tz = getValidTimezone(timezone);
  if (!tz) return date.toISOString().slice(0, 10);

  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value]));
  return `${map.get('year')}-${map.get('month')}-${map.get('day')}`;
}

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!isUserId(userId)) return userId;

  const { searchParams } = new URL(req.url);
  const days = Math.min(Math.max(parseInt(searchParams.get('days') || '7', 10), 1), 90);

  await connectDB();

  const user = await User.findById(userId)
    .select('profile.timezone settings.reminderSchedule.timezone')
    .lean() as {
    profile?: { timezone?: string };
    settings?: { reminderSchedule?: { timezone?: string } };
  } | null;
  const timezone = user?.profile?.timezone || user?.settings?.reminderSchedule?.timezone || undefined;
  const today = timezone ? toDateKey(new Date(), timezone) : getToday();
  const startDate = timezone
    ? toDateKey(new Date(Date.now() - days * 86_400_000), timezone)
    : new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

  const logs = await DailyLog.find(
    { userId, date: { $gte: startDate, $lte: today } },
    { date: 1, heartRate: 1, steps: 1, activeCalories: 1, distanceKm: 1, _id: 0 }
  )
    .sort({ date: 1 })
    .lean();

  const todayLog = (logs as { date: string; heartRate?: number; steps?: number; activeCalories?: number; distanceKm?: number }[]).find((l) => l.date === today) ?? null;

  return maskedResponse({ history: logs, today: todayLog, days });
}
