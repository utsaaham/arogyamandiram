// ============================================
// /api/health-import - Paste a health export instead of connecting a device
// ============================================
// POST { text, mode: 'preview' } -> parse and summarise, writes nothing
// POST { text, mode: 'import'  } -> store the raw snapshot + map it into DailyLog
//
// The paste path reuses applyHealthRecords, so a pasted week lands in exactly
// the same place a phone push would put it. No AI, no guessing: whatever the
// export states is what gets written.

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import HealthSnapshot from '@/models/HealthSnapshot';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { applyHealthRecords } from '@/lib/healthDataSync';
import { parseHealthPaste, summarizeRecords } from '@/lib/healthPasteParse';

export const dynamic = 'force-dynamic';

// A pasted dashboard file is ~30 KB. Refuse anything far larger rather than
// letting the parser walk a hostile input.
const MAX_TEXT_BYTES = 2_000_000;
const MAX_DAYS_PER_IMPORT = 31;

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const body = (await req.json()) as { text?: string; mode?: string };

    const text = typeof body.text === 'string' ? body.text : '';
    if (!text.trim()) return errorResponse('Paste the export first.', 400);
    if (text.length > MAX_TEXT_BYTES) return errorResponse('That paste is too large to import.', 413);

    const mode = body.mode === 'import' ? 'import' : 'preview';

    let parsed;
    try {
      parsed = parseHealthPaste(text);
    } catch (err) {
      // Parse failures are the user's paste, not a server fault.
      return errorResponse(err instanceof Error ? err.message : 'Could not read that paste.', 400);
    }

    const records = parsed.records.slice(-MAX_DAYS_PER_IMPORT);
    const skipped = parsed.records.length - records.length;
    const days = summarizeRecords(records);

    if (mode === 'preview') {
      return maskedResponse(
        { source: parsed.source, extractedAt: parsed.extractedAt, skipped, days },
        { message: `Read ${days.length} day${days.length === 1 ? '' : 's'}` }
      );
    }

    // ── import ──
    await connectDB();

    const user = await User.findById(userId)
      .select('profile.timezone settings.reminderSchedule.timezone')
      .lean();
    if (!user) return errorResponse('User not found', 404);

    const timezone =
      (user.profile as { timezone?: string } | undefined)?.timezone
      || ((user.settings as Record<string, unknown> | undefined)?.reminderSchedule as { timezone?: string } | undefined)?.timezone
      || undefined;

    const now = new Date();

    // Keep the raw day as pasted. HealthSnapshot is the archive the mappers can
    // be re-run against later, so it holds fields DailyLog has no column for
    // (recovery, strain) as well as the ones it does.
    await HealthSnapshot.insertMany(
      records.map((payload) => ({ userId, receivedAt: now, payload })),
      { ordered: false }
    );

    let actions;
    try {
      actions = await applyHealthRecords({ userId, records, timezone });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await User.findByIdAndUpdate(userId, {
        $set: {
          'settings.healthData.lastSyncAt': now,
          'settings.healthData.lastSyncSource': 'manual',
          'settings.healthData.lastSyncStatus': 'error',
          'settings.healthData.lastSyncError': message,
        },
      }).catch(() => {});
      // The snapshots are stored either way, so say so rather than implying
      // nothing happened.
      return errorResponse(`Saved the raw snapshot but could not map it into your log: ${message}`, 500);
    }

    const logged = actions.filter((a) => a.status === 'logged');
    const failed = actions.filter((a) => a.status === 'error');

    await User.findByIdAndUpdate(userId, {
      $set: {
        'settings.healthData.lastSyncAt': now,
        'settings.healthData.lastSyncSource': 'manual',
        'settings.healthData.lastSyncStatus': failed.length && !logged.length ? 'error' : 'ok',
        'settings.healthData.lastSyncError': failed.length && !logged.length ? (failed[0].detail || 'Import failed') : '',
      },
    });

    return maskedResponse(
      {
        source: parsed.source,
        extractedAt: parsed.extractedAt,
        skipped,
        dates: records.map((r) => r.date as string),
        days,
      },
      { message: `Imported ${records.length} day${records.length === 1 ? '' : 's'}` }
    );
  } catch (err) {
    console.error('[Health Import Error]:', err);
    return errorResponse('Failed to import that health export', 500);
  }
}
