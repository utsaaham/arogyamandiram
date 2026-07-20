// ============================================
// /api/todos - Daily todo completions
// ============================================
// GET ?date=YYYY-MM-DD → { templates, completions }
// POST { templateId, date, completed } → toggle completion

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import DailyLog from '@/models/DailyLog';
import User from '@/models/User';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { cadenceOf, groupOf, groupsForResponse, needsLastDone, type RawTemplate, type TodoGroup } from '@/lib/checklistGroups';
import { getAuthUserId, isUserId } from '@/lib/session';
import { getToday } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || getToday();

    await connectDB();

    const [user, log] = await Promise.all([
      User.findById(userId).select('settings.todoTemplates settings.todoGroups').lean(),
      DailyLog.findOne({ userId, date }, { todoCompletions: 1 }).lean(),
    ]);

    const settings = (user as { settings?: { todoTemplates?: unknown[]; todoGroups?: TodoGroup[] } } | null)?.settings;
    const templates = (settings?.todoTemplates ?? []) as Array<RawTemplate & { enabled?: boolean }>;

    const completions = (
      (log as { todoCompletions?: unknown[] } | null)?.todoCompletions ?? []
    ) as Array<{ templateId: string; completedAt: string }>;

    // Cycling items repeat on a cadence, so each one needs its most recent
    // completion date (any day, not just today) to know where it stands.
    const enabledTemplates = templates.filter((t) => t.enabled);
    const cycleIds = enabledTemplates.filter(needsLastDone).map((t) => t.id);
    const lastDone = new Map<string, string>();
    if (cycleIds.length > 0) {
      const historyLogs = await DailyLog.find(
        { userId, date: { $lte: date }, 'todoCompletions.templateId': { $in: cycleIds } },
        { date: 1, 'todoCompletions.templateId': 1 }
      )
        .sort({ date: -1 })
        .limit(200)
        .lean();
      for (const h of historyLogs as Array<{ date: string; todoCompletions?: Array<{ templateId: string }> }>) {
        for (const c of h.todoCompletions ?? []) {
          if (cycleIds.includes(c.templateId) && !lastDone.has(c.templateId)) {
            lastDone.set(c.templateId, h.date);
          }
        }
      }
    }

    return maskedResponse({
      date,
      templates: enabledTemplates.map((t) => ({
        ...t,
        group: groupOf(t),
        cadence: cadenceOf(t),
        ...(needsLastDone(t) ? { lastDone: lastDone.get(t.id) ?? null } : {}),
      })),
      completions,
      groups: groupsForResponse(settings?.todoGroups, templates),
    });
  } catch (err) {
    console.error('[Todos GET Error]:', err);
    return errorResponse('Could not load your checklist. Give it another try?', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const body = (await req.json()) as { templateId?: string; date?: string; completed?: boolean };
    const { templateId, completed } = body;
    const date = body.date || getToday();

    if (!templateId) return errorResponse('templateId is required', 400);

    await connectDB();

    if (completed) {
      // Add completion (avoid duplicates). Check first: an upsert whose query
      // excludes the existing {userId, date} doc via $ne would try to insert a
      // duplicate and trip the unique index.
      const already = await DailyLog.findOne(
        { userId, date, 'todoCompletions.templateId': templateId },
        { _id: 1 }
      ).lean();
      if (!already) {
        await DailyLog.findOneAndUpdate(
          { userId, date },
          {
            $push: { todoCompletions: { templateId, completedAt: new Date().toISOString() } },
            $setOnInsert: { userId, date },
          },
          { upsert: true, new: true, strict: false }
        );
      }
    } else {
      // Remove completion
      await DailyLog.findOneAndUpdate(
        { userId, date },
        { $pull: { todoCompletions: { templateId } } },
        { new: true, strict: false }
      );
    }

    return maskedResponse({ ok: true, templateId, date, completed });
  } catch (err) {
    console.error('[Todos POST Error]:', err);
    return errorResponse('That check did not stick. Try again?', 500);
  }
}
