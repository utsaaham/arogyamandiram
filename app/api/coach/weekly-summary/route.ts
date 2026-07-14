// ============================================
// /api/coach/weekly-summary — rolling weekly recap (cached)
// ============================================
// Rolling 7 days ending yesterday: workouts done vs planned (lib/adherence),
// weight delta, strongest-lift delta, protein days hit, plus one AI-written
// "next week" line with a deterministic fallback. Cached per userId+weekEnd.

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import DailyLog from '@/models/DailyLog';
import WeeklySummary from '@/models/WeeklySummary';
import { resolveOpenAIKey } from '@/lib/openaiKey';
import { createOpenAiJson } from '@/lib/openaiJson';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { getToday, getYesterday, toLocalDateString } from '@/lib/utils';
import { computeWorkoutAdherence } from '@/lib/adherence';
import { getCoachMemoryLines } from '@/lib/intelligence/coachMemory';
import { COACH_TONE } from '@/lib/tone';

export const dynamic = 'force-dynamic';

type LogLean = {
  date?: string;
  weight?: number;
  totalProtein?: number;
  workouts?: Array<{ exercise?: string; category?: string; weight?: number }>;
};

type StrongestLift = { exercise: string; fromKg: number; toKg: number; deltaKg: number } | null;

/** Biggest week-over-week load increase among lifts logged with a weight ≥2 times. */
function findStrongestLiftDelta(logs: LogLean[]): StrongestLift {
  const byExercise = new Map<string, { display: string; entries: Array<{ date: string; weight: number }> }>();
  for (const log of logs) {
    for (const w of log.workouts ?? []) {
      const weight = Number(w.weight);
      if (!w.exercise || !Number.isFinite(weight) || weight <= 0) continue;
      const key = w.exercise.toLowerCase().trim();
      if (!byExercise.has(key)) byExercise.set(key, { display: w.exercise, entries: [] });
      byExercise.get(key)!.entries.push({ date: log.date ?? '', weight });
    }
  }

  let best: StrongestLift = null;
  for (const { display, entries } of byExercise.values()) {
    if (entries.length < 2) continue;
    entries.sort((a, b) => a.date.localeCompare(b.date));
    const fromKg = entries[0].weight;
    const toKg = entries[entries.length - 1].weight;
    const deltaKg = Math.round((toKg - fromKg) * 10) / 10;
    if (!best || deltaKg > best.deltaKg) {
      best = { exercise: display, fromKg, toKg, deltaKg };
    }
  }
  return best;
}

function fallbackNextWeekLine(stats: {
  adherencePct: number | null;
  workoutsPlanned: number;
  workoutsDone: number;
  proteinDaysHit: number;
  proteinDaysTracked: number;
}): string {
  if (stats.adherencePct == null) {
    return 'Log a few workouts this week so Ciel can start measuring real progress.';
  }
  if (stats.adherencePct >= 90) {
    return 'Great consistency last week. Keep the rhythm and nudge your main lifts up slightly.';
  }
  if (stats.adherencePct >= 60) {
    return 'Solid week. Aim to complete one more planned session than last week.';
  }
  return 'Fresh start this week: begin with two easy sessions to rebuild the habit.';
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    await connectDB();

    const today = getToday();
    const weekEnd = getYesterday();
    const weekStart = (() => {
      const d = new Date(weekEnd);
      d.setDate(d.getDate() - 6);
      return toLocalDateString(d);
    })();

    const { searchParams } = new URL(req.url);
    const refresh = searchParams.get('refresh') === '1';

    if (!refresh) {
      const cached = await WeeklySummary.findOne({ userId, weekEnd }).lean();
      if (cached) {
        return maskedResponse({ summary: cached, cached: true });
      }
    }

    const [user, logs, adherence] = await Promise.all([
      User.findById(userId).select('targets.protein').lean() as Promise<{ targets?: { protein?: number } } | null>,
      DailyLog.find({ userId, date: { $gte: weekStart, $lte: weekEnd } })
        .sort({ date: 1 })
        .select('date weight totalProtein workouts.exercise workouts.category workouts.weight')
        .lean() as Promise<LogLean[]>,
      // computeWorkoutAdherence's window is the 7 days before `today` —
      // exactly weekStart..weekEnd.
      computeWorkoutAdherence(String(userId), today),
    ]);

    const weights = logs
      .map((l) => ({ date: l.date ?? '', weight: Number(l.weight) }))
      .filter((w) => Number.isFinite(w.weight) && w.weight > 0);
    const startWeightKg = weights.length > 0 ? weights[0].weight : null;
    const endWeightKg = weights.length > 0 ? weights[weights.length - 1].weight : null;
    const weightDeltaKg = startWeightKg != null && endWeightKg != null
      ? Math.round((endWeightKg - startWeightKg) * 10) / 10
      : null;

    const proteinTarget = Number(user?.targets?.protein) || 0;
    const proteinDays = logs.filter((l) => Number(l.totalProtein) > 0);
    const proteinDaysTracked = proteinDays.length;
    const proteinDaysHit = proteinTarget > 0
      ? proteinDays.filter((l) => Number(l.totalProtein) >= proteinTarget).length
      : 0;

    const stats = {
      workoutsPlanned: adherence.plannedCount,
      workoutsDone: adherence.completedCount,
      adherencePct: adherence.adherencePct,
      startWeightKg,
      endWeightKg,
      weightDeltaKg,
      strongestLift: findStrongestLiftDelta(logs),
      proteinDaysHit,
      proteinDaysTracked,
    };

    // One AI-written "next week" line; deterministic fallback without a key.
    let nextWeekLine = fallbackNextWeekLine(stats);
    let aiGenerated = false;
    const apiKey = await resolveOpenAIKey(userId);
    if (apiKey) {
      try {
        const knownPatterns = await getCoachMemoryLines(userId).catch(() => [] as string[]);
        const ai = await createOpenAiJson<{ nextWeekLine?: string }>({
          apiKey,
          systemPrompt: `You are Ciel, writing ONE sentence of fitness advice for the user's next week based on their weekly stats. ${COACH_TONE} knownPatterns are statistically confirmed patterns about this user — you may use them. Respond with JSON: { "nextWeekLine": string } — a single sentence, max 25 words, that names one concrete action for next week grounded in the stats.`,
          userPrompt: JSON.stringify({ weekStart, weekEnd, stats, knownPatterns }),
          maxTokens: 120,
        });
        const line = typeof ai.nextWeekLine === 'string' ? ai.nextWeekLine.trim() : '';
        if (line) {
          nextWeekLine = line;
          aiGenerated = true;
        }
      } catch {
        // keep deterministic fallback
      }
    }

    const summary = await WeeklySummary.findOneAndUpdate(
      { userId, weekEnd },
      {
        $set: {
          weekStart,
          stats,
          nextWeekLine,
          aiGenerated,
          generatedAt: new Date(),
        },
      },
      { new: true, upsert: true }
    ).lean();

    return maskedResponse({ summary, cached: false });
  } catch (err) {
    console.error('[Weekly Summary GET Error]:', err);
    return errorResponse('Failed to build weekly summary', 500);
  }
}
