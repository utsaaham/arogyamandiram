// ============================================
// /api/todos/templates - Manage recurring todo templates
// ============================================
// GET    → list all templates
// POST   { title, note?, time?, category? } → create template
// PUT    { id, title?, note?, time?, category?, enabled? } → update template
// DELETE ?id= → delete template

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import DailyLog from '@/models/DailyLog';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { DEFAULT_CARE_CADENCE, isCareCadence } from '@/lib/careCadence';
import { getAuthUserId, isUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** Sanitize per-dose times: keep valid "HH:mm" strings, cap at 5 doses. */
function sanitizeTimes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 5)
    .map((t) => String(t ?? '').trim())
    .map((t) => (/^\d{1,2}:\d{2}$/.test(t) ? t : ''));
}

/** Valid YYYY-MM-DD not in the future, for anchoring a care item's cycle. */
function sanitizeLastDone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const then = new Date(`${value}T00:00:00Z`).getTime();
  if (Number.isNaN(then) || then > Date.now()) return null;
  return value;
}

/** Record a completion on the given date so the care cycle anchors to it. */
async function recordCareCompletion(userId: string, templateId: string, date: string) {
  // Check first: an upsert whose query excludes the existing {userId, date}
  // doc (via $ne) would try to insert a duplicate and hit the unique index.
  const already = await DailyLog.findOne(
    { userId, date, 'todoCompletions.templateId': templateId },
    { _id: 1 }
  ).lean();
  if (already) return;

  await DailyLog.findOneAndUpdate(
    { userId, date },
    {
      $push: { todoCompletions: { templateId, completedAt: new Date(`${date}T12:00:00Z`).toISOString() } },
      $setOnInsert: { userId, date },
    },
    { upsert: true, new: true, strict: false }
  );
}

export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    await connectDB();
    const user = await User.findById(userId).select('settings.todoTemplates').lean();
    const templates = (
      (user as { settings?: { todoTemplates?: unknown[] } } | null)?.settings?.todoTemplates ?? []
    ) as Array<Record<string, unknown> & { id: string; category?: string }>;

    // Care items anchor their cycle to their most recent completion; the
    // settings form needs it to show "when did you last do this?" on edit.
    const careIds = templates.filter((t) => t.category === 'care').map((t) => t.id);
    const lastDone = new Map<string, string>();
    if (careIds.length > 0) {
      const historyLogs = await DailyLog.find(
        { userId, 'todoCompletions.templateId': { $in: careIds } },
        { date: 1, 'todoCompletions.templateId': 1 }
      )
        .sort({ date: -1 })
        .limit(200)
        .lean();
      for (const h of historyLogs as Array<{ date: string; todoCompletions?: Array<{ templateId: string }> }>) {
        for (const c of h.todoCompletions ?? []) {
          if (careIds.includes(c.templateId) && !lastDone.has(c.templateId)) {
            lastDone.set(c.templateId, h.date);
          }
        }
      }
    }

    return maskedResponse({
      templates: templates.map((t) =>
        t.category === 'care' ? { ...t, lastDone: lastDone.get(t.id) ?? null } : t
      ),
    });
  } catch (err) {
    console.error('[Todo Templates GET Error]:', err);
    return errorResponse('Could not load your checklist items. Give it another try?', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const body = (await req.json()) as {
      title?: string;
      note?: string;
      time?: string;
      category?: string;
      frequency?: number;
      times?: unknown[];
      cadence?: string;
      lastDone?: string;
      baseItems?: unknown[];
    };

    const title = body.title?.trim();
    if (!title) return errorResponse('title is required', 400);

    const rawFreq = typeof body.frequency === 'number' ? body.frequency : 1;
    const frequency = Math.min(5, Math.max(1, Math.round(rawFreq)));
    const category = body.category ?? 'other';
    const times = sanitizeTimes(body.times).slice(0, frequency);

    const newTemplate = {
      id: crypto.randomUUID(),
      title,
      note: body.note?.trim() ?? '',
      // Keep the single time in sync with dose 1 for older readers.
      time: (times[0] || body.time?.trim()) ?? '',
      category,
      enabled: true,
      frequency,
      times,
      // Care items repeat on a cadence instead of resetting daily
      ...(category === 'care'
        ? { cadence: isCareCadence(body.cadence) ? body.cadence : DEFAULT_CARE_CADENCE }
        : {}),
      baseItems: Array.isArray(body.baseItems) ? body.baseItems : [],
    };

    await connectDB();
    await User.findByIdAndUpdate(userId, {
      $push: { 'settings.todoTemplates': newTemplate },
    });

    // "When did you last do this?" anchors the care cycle to a real date.
    const lastDone = category === 'care' ? sanitizeLastDone(body.lastDone) : null;
    if (lastDone) {
      await recordCareCompletion(userId, newTemplate.id, lastDone);
    }

    return maskedResponse({ template: newTemplate });
  } catch (err) {
    console.error('[Todo Templates POST Error]:', err);
    return errorResponse('Could not add that item. Try once more?', 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const body = (await req.json()) as {
      id?: string;
      title?: string;
      note?: string;
      time?: string;
      category?: string;
      enabled?: boolean;
      frequency?: number;
      times?: unknown[];
      cadence?: string;
      lastDone?: string;
      baseItems?: unknown[];
    };

    if (!body.id) return errorResponse('id is required', 400);

    await connectDB();

    const updateFields: Record<string, unknown> = {};
    if (body.title !== undefined) updateFields['settings.todoTemplates.$.title'] = body.title.trim();
    if (body.note !== undefined) updateFields['settings.todoTemplates.$.note'] = body.note.trim();
    if (body.time !== undefined) updateFields['settings.todoTemplates.$.time'] = body.time.trim();
    if (body.category !== undefined) updateFields['settings.todoTemplates.$.category'] = body.category;
    if (body.enabled !== undefined) updateFields['settings.todoTemplates.$.enabled'] = body.enabled;
    if (isCareCadence(body.cadence)) updateFields['settings.todoTemplates.$.cadence'] = body.cadence;
    if (Array.isArray(body.baseItems)) updateFields['settings.todoTemplates.$.baseItems'] = body.baseItems;
    if (body.frequency !== undefined) {
      updateFields['settings.todoTemplates.$.frequency'] = Math.min(5, Math.max(1, Math.round(body.frequency)));
    }
    if (body.times !== undefined) {
      const times = sanitizeTimes(body.times);
      updateFields['settings.todoTemplates.$.times'] = times;
      if (times[0]) updateFields['settings.todoTemplates.$.time'] = times[0];
    }

    await User.findOneAndUpdate(
      { _id: userId, 'settings.todoTemplates.id': body.id },
      { $set: updateFields }
    );

    // Re-anchor the care cycle when the user tells us the real last-done date.
    const lastDone = body.category === 'care' || isCareCadence(body.cadence)
      ? sanitizeLastDone(body.lastDone)
      : null;
    if (lastDone) {
      await recordCareCompletion(userId, body.id, lastDone);
    }

    return maskedResponse({ ok: true });
  } catch (err) {
    console.error('[Todo Templates PUT Error]:', err);
    return errorResponse('That edit did not save. Try once more?', 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse('id is required', 400);

    await connectDB();
    await User.findByIdAndUpdate(userId, {
      $pull: { 'settings.todoTemplates': { id } },
    });

    return maskedResponse({ ok: true });
  } catch (err) {
    console.error('[Todo Templates DELETE Error]:', err);
    return errorResponse('Could not delete that item. Try once more?', 500);
  }
}
