// ============================================
// /api/scores - Vitals daily scores
// ============================================
// GET → today's Readiness / Strain / Sleep / Stress scores, Today's Guidance,
//       30-day trends, and habit correlation insights.
// Wellness estimates only - never diagnostic.

import connectDB from '@/lib/db';
import DailyLog from '@/models/DailyLog';
import User from '@/models/User';
import { maskedResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { computeVitals, toDayInput } from '@/lib/scores';
import { getToday } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const TREND_DAYS = 30;
const BASELINE_BUFFER_DAYS = 15; // extra history so the oldest trend day still has a baseline

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

export async function GET() {
  const userId = await getAuthUserId();
  if (!isUserId(userId)) return userId;

  await connectDB();

  const user = await User.findById(userId)
    .select('profile.timezone profile.age profile.dateOfBirth profile.gender profile.height profile.weight settings.reminderSchedule.timezone')
    .lean() as {
    profile?: {
      timezone?: string;
      age?: number;
      dateOfBirth?: Date;
      gender?: 'male' | 'female' | 'other';
      height?: number;
      weight?: number;
    };
    settings?: { reminderSchedule?: { timezone?: string } };
  } | null;
  const timezone = user?.profile?.timezone || user?.settings?.reminderSchedule?.timezone || undefined;
  const today = timezone ? toDateKey(new Date(), timezone) : getToday();

  const windowDays = TREND_DAYS + BASELINE_BUFFER_DAYS;
  const startDate = timezone
    ? toDateKey(new Date(Date.now() - windowDays * 86_400_000), timezone)
    : new Date(Date.now() - windowDays * 86_400_000).toISOString().slice(0, 10);

  const logs = await DailyLog.find(
    { userId, date: { $gte: startDate, $lte: today } },
    {
      date: 1, heartRate: 1, steps: 1, activeCalories: 1,
      restingHeartRate: 1, hrvSdnnMs: 1, respiratoryRate: 1, wristTempC: 1, vo2Max: 1,
      oxygenSaturationPct: 1,
      sleep: 1, workouts: 1, habits: 1, mood: 1, _id: 0,
    }
  )
    .sort({ date: 1 })
    .lean();

  const days = (logs as Array<Parameters<typeof toDayInput>[0]>).map(toDayInput);
  const vitals = computeVitals(days, today, TREND_DAYS, {
    age: user?.profile?.age,
    dateOfBirth: user?.profile?.dateOfBirth,
    gender: user?.profile?.gender,
    heightCm: user?.profile?.height,
    weightKg: user?.profile?.weight,
  });

  return maskedResponse(vitals);
}
