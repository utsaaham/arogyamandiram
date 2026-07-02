// ============================================
// /api/scores/journal — Vitals habit journal
// ============================================
// POST { habits: HabitKey[], mood?: 1-5, date?: YYYY-MM-DD } → upserts the
// day's DailyLog with the logged habits. Defaults to today.

import { type NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import DailyLog from '@/models/DailyLog';
import { maskedResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { getToday } from '@/lib/utils';
import { HABIT_LABELS, type HabitKey } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!isUserId(userId)) return userId;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const input = (body ?? {}) as { habits?: unknown; mood?: unknown; date?: unknown };

  const validKeys = new Set(Object.keys(HABIT_LABELS));
  const habits = Array.isArray(input.habits)
    ? ([...new Set(input.habits)].filter((h): h is HabitKey => typeof h === 'string' && validKeys.has(h)))
    : null;
  if (habits === null) {
    return NextResponse.json({ error: 'habits must be an array of habit keys' }, { status: 400 });
  }

  const mood = typeof input.mood === 'number' && input.mood >= 1 && input.mood <= 5
    ? Math.round(input.mood)
    : null;

  const date = typeof input.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.date)
    ? input.date
    : getToday();

  await connectDB();

  const update: Record<string, unknown> = { habits };
  if (mood !== null) update.mood = mood;

  await DailyLog.findOneAndUpdate(
    { userId, date },
    { $set: update, $setOnInsert: { userId, date } },
    { upsert: true }
  );

  return maskedResponse({ ok: true, date, habits, mood });
}
