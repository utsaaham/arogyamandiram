// ============================================
// /api/plan-import - Import a "My Week" plan file
// ============================================
// POST { html, mode: 'preview' }            -> parse and summarise, writes nothing
// POST { html, mode: 'import', weekStart }  -> write one DailyPlan per day + a WeekPlan
//
// The parse is deterministic (see lib/weekPlanParse), so no AI key is needed and
// the numbers land exactly as the source document states them.
//
// Dates: a newer plan file stamps each day with its own date and asks to roll
// forward in whole weeks, so those files date themselves and weekStart is
// ignored. Older files carry no dates at all and get mapped onto weekStart.

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import DailyPlan from '@/models/DailyPlan';
import WeekPlan from '@/models/WeekPlan';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { getToday } from '@/lib/utils';
import {
  parseWeekPlan, dateForDay, toFoodPlan, toWorkoutPlan,
  resolvePlanWeek, addDays, type ParsedDay,
} from '@/lib/weekPlanParse';

export const dynamic = 'force-dynamic';

// A pasted plan file is ~110 KB. Refuse anything far larger rather than letting
// the parser walk a hostile input.
const MAX_HTML_BYTES = 2_000_000;

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Monday of the week containing `today`, in local time. */
function currentWeekStart(): string {
  const today = getToday();
  const [y, m, d] = today.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // getUTCDay: 0 = Sunday. Shift so Monday is 0.
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const body = await req.json() as { html?: string; mode?: string; weekStart?: string };

    const html = typeof body.html === 'string' ? body.html : '';
    if (!html.trim()) return errorResponse('Paste the plan HTML first.', 400);
    if (html.length > MAX_HTML_BYTES) {
      return errorResponse('That file is too large to import.', 413);
    }

    const mode = body.mode === 'import' ? 'import' : 'preview';

    let parsed;
    try {
      parsed = parseWeekPlan(html);
    } catch (err) {
      // Parse failures are the user's file, not a server fault.
      return errorResponse(err instanceof Error ? err.message : 'Could not parse that file.', 400);
    }

    // A file that dates its own days decides where the week lands; the picker
    // only exists for older files that carry no dates.
    const datedSource = parsed.days.every((d) => d.date !== null);
    const rolled = resolvePlanWeek(parsed, getToday());
    const weekStart = datedSource
      ? rolled.weekStart
      : ISO_DATE.test(String(body.weekStart)) ? String(body.weekStart) : currentWeekStart();
    const rolledWeeks = datedSource ? rolled.rolledWeeks : 0;

    const dateOf = (day: ParsedDay) =>
      datedSource && day.date
        ? addDays(day.date, rolledWeeks * 7)
        : dateForDay(weekStart, day.dayName, WEEKDAYS);

    const days = parsed.days.map((day) => ({
      date: dateOf(day),
      dayName: day.dayName,
      short: day.short,
      focus: day.focus,
      coach: day.coach,
      totals: day.totals,
      mealCount: day.meals.length,
      itemCount: day.meals.reduce((n, m) => n + m.items.length, 0),
      exerciseCount: day.exercises.length,
      mainCount: day.exercises.filter((e) => e.block === 'main').length,
      meals: day.meals,
      exercises: day.exercises,
    }));

    if (mode === 'preview') {
      return maskedResponse({
        weekStart,
        datedSource,
        rolledWeeks,
        weekStarting: parsed.weekStarting,
        sourceUnit: parsed.sourceUnit,
        sessionMinutes: parsed.sessionMinutes,
        guide: parsed.guide.map((g) => ({ key: g.key, label: g.label, size: g.html.length })),
        hasProfile: Boolean(parsed.profile),
        days,
      }, { message: `Parsed ${days.length} days` });
    }

    // ── import ──
    await connectDB();

    const written: string[] = [];
    for (const day of parsed.days) {
      const date = dateOf(day);

      await DailyPlan.findOneAndUpdate(
        { userId, date },
        {
          $set: {
            userId,
            date,
            status: 'ready',
            generatedAt: new Date(),
            foodPlan: toFoodPlan(day),
            workoutPlan: toWorkoutPlan(day, parsed.sessionMinutes),
          },
          $unset: { errorMessage: '' },
        },
        { new: true, upsert: true, runValidators: true }
      );

      written.push(date);
    }

    await WeekPlan.findOneAndUpdate(
      { userId, weekStart },
      {
        $set: {
          userId,
          weekStart,
          dates: written,
          title: 'My Week',
          profile: parsed.profile ?? undefined,
          guide: parsed.guide,
          sourceUnit: parsed.sourceUnit,
          saltPerMeal: parsed.saltPerMeal,
          sessionMinutes: parsed.sessionMinutes ?? undefined,
          parsed: { days: parsed.days },
          importedAt: new Date(),
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    return maskedResponse(
      {
        weekStart,
        datedSource,
        rolledWeeks,
        dates: written,
        days: days.map((d) => ({ date: d.date, dayName: d.dayName, short: d.short })),
      },
      { message: `Imported ${written.length} days starting ${weekStart}` }
    );
  } catch (err) {
    console.error('[Plan Import Error]:', err);
    return errorResponse('Failed to import the plan', 500);
  }
}
