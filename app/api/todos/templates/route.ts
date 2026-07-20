// ============================================
// /api/todos/templates - Manage recurring todo templates
// ============================================
// GET    → { templates, groups }
// POST   { title, note?, time?, category?, group?, cadence?, cadenceDays? } → create template
// PUT    { id, ...same fields..., enabled? } → update template
// DELETE ?id= → delete template

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import DailyLog from '@/models/DailyLog';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { DEFAULT_CUSTOM_DAYS, isCareCadence } from '@/lib/careCadence';
import {
  cadenceOf, groupOf, groupsForResponse, needsLastDone, sanitizeGroupId,
  type RawTemplate, type TodoGroup,
} from '@/lib/checklistGroups';
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

/** Cycle length for custom cadences, clamped to 2-365 days. */
function sanitizeCadenceDays(raw: unknown): number {
  const n = typeof raw === 'number' ? Math.round(raw) : NaN;
  if (!Number.isFinite(n)) return DEFAULT_CUSTOM_DAYS;
  return Math.min(365, Math.max(2, n));
}

/** Valid YYYY-MM-DD not in the future, for anchoring a cycling item. */
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
    const user = await User.findById(userId).select('settings.todoTemplates settings.todoGroups').lean();
    const settings = (user as { settings?: { todoTemplates?: unknown[]; todoGroups?: TodoGroup[] } } | null)?.settings;
    const templates = (settings?.todoTemplates ?? []) as RawTemplate[];

    // Cycling items anchor to their most recent completion; the settings
    // form needs it to show "when did you last do this?" on edit.
    const cycleIds = templates.filter(needsLastDone).map((t) => t.id);
    const lastDone = new Map<string, string>();
    if (cycleIds.length > 0) {
      const historyLogs = await DailyLog.find(
        { userId, 'todoCompletions.templateId': { $in: cycleIds } },
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
      templates: templates.map((t) => ({
        ...t,
        group: groupOf(t),
        cadence: cadenceOf(t),
        ...(needsLastDone(t) ? { lastDone: lastDone.get(t.id) ?? null } : {}),
      })),
      groups: groupsForResponse(settings?.todoGroups, templates),
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
      group?: string;
      frequency?: number;
      times?: unknown[];
      cadence?: string;
      cadenceDays?: number;
      lastDone?: string;
      baseItems?: unknown[];
    };

    const title = body.title?.trim();
    if (!title) return errorResponse('title is required', 400);

    const rawFreq = typeof body.frequency === 'number' ? body.frequency : 1;
    const frequency = Math.min(5, Math.max(1, Math.round(rawFreq)));
    const category = body.category ?? 'other';
    const times = sanitizeTimes(body.times).slice(0, frequency);

    await connectDB();

    // Validate the target group against the user's real groups.
    const owner = await User.findById(userId).select('settings.todoTemplates settings.todoGroups').lean();
    const ownerSettings = (owner as { settings?: { todoTemplates?: unknown[]; todoGroups?: TodoGroup[] } } | null)?.settings;
    const knownGroups = groupsForResponse(ownerSettings?.todoGroups, (ownerSettings?.todoTemplates ?? []) as RawTemplate[]);

    // Every item carries its own schedule now; daily is the default. Legacy
    // clients that send category 'care' without a cadence keep cycling monthly.
    const cadence = isCareCadence(body.cadence)
      ? body.cadence
      : category === 'care' ? 'monthly' as const : 'daily' as const;

    const newTemplate = {
      id: crypto.randomUUID(),
      title,
      note: body.note?.trim() ?? '',
      // Keep the single time in sync with dose 1 for older readers.
      time: (times[0] || body.time?.trim()) ?? '',
      category,
      group: sanitizeGroupId(body.group, knownGroups),
      enabled: true,
      frequency,
      times,
      cadence,
      ...(cadence === 'custom' ? { cadenceDays: sanitizeCadenceDays(body.cadenceDays) } : {}),
      baseItems: Array.isArray(body.baseItems) ? body.baseItems : [],
    };

    await User.findByIdAndUpdate(userId, {
      $push: { 'settings.todoTemplates': newTemplate },
    });

    // "When did you last do this?" anchors a cycling item to a real date.
    const lastDone = cadence !== 'daily' ? sanitizeLastDone(body.lastDone) : null;
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
      group?: string;
      enabled?: boolean;
      frequency?: number;
      times?: unknown[];
      cadence?: string;
      cadenceDays?: number;
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
    if (isCareCadence(body.cadence)) {
      updateFields['settings.todoTemplates.$.cadence'] = body.cadence;
      if (body.cadence === 'custom') {
        updateFields['settings.todoTemplates.$.cadenceDays'] = sanitizeCadenceDays(body.cadenceDays);
      }
    }
    if (Array.isArray(body.baseItems)) updateFields['settings.todoTemplates.$.baseItems'] = body.baseItems;
    if (body.frequency !== undefined) {
      updateFields['settings.todoTemplates.$.frequency'] = Math.min(5, Math.max(1, Math.round(body.frequency)));
    }
    if (body.times !== undefined) {
      const times = sanitizeTimes(body.times);
      updateFields['settings.todoTemplates.$.times'] = times;
      if (times[0]) updateFields['settings.todoTemplates.$.time'] = times[0];
    }
    if (body.group !== undefined) {
      const owner = await User.findById(userId).select('settings.todoTemplates settings.todoGroups').lean();
      const ownerSettings = (owner as { settings?: { todoTemplates?: unknown[]; todoGroups?: TodoGroup[] } } | null)?.settings;
      const knownGroups = groupsForResponse(ownerSettings?.todoGroups, (ownerSettings?.todoTemplates ?? []) as RawTemplate[]);
      updateFields['settings.todoTemplates.$.group'] = sanitizeGroupId(body.group, knownGroups);
    }

    await User.findOneAndUpdate(
      { _id: userId, 'settings.todoTemplates.id': body.id },
      { $set: updateFields }
    );

    // Re-anchor the cycle when the user tells us the real last-done date.
    const lastDone = body.category === 'care' || (isCareCadence(body.cadence) && body.cadence !== 'daily')
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
