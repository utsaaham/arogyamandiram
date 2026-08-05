// ============================================
// /api/health-data - Health data sync settings + manual sync trigger
// ============================================
// GET  → return current health data config (endpoint, enabled, interval, last sync)
// POST → save config (endpoint, apiKey, enabled, syncIntervalMinutes)
// PUT  → trigger a manual sync now

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { encrypt } from '@/lib/encryption';
import { runHealthDataSync, type HealthSyncSource } from '@/lib/healthDataSync';

export const dynamic = 'force-dynamic';

// ─── GET: return health data config ─────────────────────────────────────────

export async function GET() {
  const userId = await getAuthUserId();
  if (!isUserId(userId)) return userId;

  await connectDB();
  const user = await User.findById(userId)
    .select('+settings.healthData.apiKeyEncrypted')
    .lean();
  if (!user) return errorResponse('User not found', 404);

  const hd = (user.settings as Record<string, unknown>)?.healthData as Record<string, unknown> | undefined;

  return maskedResponse({
    endpoint: (hd?.endpoint as string) || '',
    hasApiKey: !!(hd?.apiKeyEncrypted as string),
    apiKeyRevokedAt: (hd?.apiKeyRevokedAt as Date | null) ?? null,
    enabled: (hd?.enabled as boolean) ?? false,
    syncIntervalMinutes: (hd?.syncIntervalMinutes as number) ?? 60,
    lastSyncAt: (hd?.lastSyncAt as Date | null) ?? null,
    lastSyncSource: (hd?.lastSyncSource as HealthSyncSource | '') ?? '',
    lastSchemaJson: (hd?.lastSchemaJson as string) || '',
    lastSyncStatus: (hd?.lastSyncStatus as string) || '',
    lastSyncError: (hd?.lastSyncError as string) || '',
  });
}

// ─── POST: save config ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!isUserId(userId)) return userId;

  const body = (await req.json()) as {
    endpoint?: string;
    apiKey?: string;
    clearApiKey?: boolean;
    revoked?: boolean;
    enabled?: boolean;
    syncIntervalMinutes?: number;
  };

  await connectDB();

  const update: Record<string, unknown> = {};
  if (typeof body.endpoint === 'string') {
    update['settings.healthData.endpoint'] = body.endpoint.trim();
  }
  if (body.clearApiKey) {
    update['settings.healthData.apiKeyEncrypted'] = '';
    update['settings.healthData.apiKeyRevokedAt'] = null;
  } else if (typeof body.apiKey === 'string' && body.apiKey.trim()) {
    update['settings.healthData.apiKeyEncrypted'] = encrypt(body.apiKey.trim());
    // A newly issued key starts live; saving one un-revokes.
    update['settings.healthData.apiKeyRevokedAt'] = null;
  }
  // Kill switch. Independent of `enabled`, which only gates the pull cron.
  // Applied after the key writes above so an explicit revoke always wins.
  if (typeof body.revoked === 'boolean') {
    update['settings.healthData.apiKeyRevokedAt'] = body.revoked ? new Date() : null;
  }
  if (typeof body.enabled === 'boolean') {
    update['settings.healthData.enabled'] = body.enabled;
  }
  if (typeof body.syncIntervalMinutes === 'number') {
    update['settings.healthData.syncIntervalMinutes'] = Math.max(5, Math.min(1440, body.syncIntervalMinutes));
  }

  if (Object.keys(update).length === 0) {
    return errorResponse('No fields to update', 400);
  }

  await User.findByIdAndUpdate(userId, { $set: update });
  return maskedResponse({ ok: true });
}

// ─── PUT: trigger manual sync ────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!isUserId(userId)) return userId;

  const body = await req.json().catch(() => ({})) as { source?: HealthSyncSource };
  const syncSource: HealthSyncSource = body.source === 'auto' ? 'auto' : 'manual';

  await connectDB();
  const user = await User.findById(userId)
    .select('+settings.healthData.apiKeyEncrypted')
    .lean();
  if (!user) return errorResponse('User not found', 404);

  const hd = (user.settings as Record<string, unknown>)?.healthData as Record<string, unknown> | undefined;
  const endpoint = (hd?.endpoint as string) || '';

  if (!endpoint) {
    return errorResponse('No health data endpoint configured', 400);
  }

  const syncResult = await runHealthDataSync({
    userId,
    endpoint,
    apiKeyEncrypted: (hd?.apiKeyEncrypted as string) || '',
    timezone:
      (user.profile as { timezone?: string } | undefined)?.timezone
      || ((user.settings as Record<string, unknown> | undefined)?.reminderSchedule as { timezone?: string } | undefined)?.timezone
      || undefined,
  });

  if (!syncResult.ok) {
    await User.findByIdAndUpdate(userId, {
      $set: {
        'settings.healthData.lastSyncAt': new Date(),
        'settings.healthData.lastSyncSource': syncSource,
        'settings.healthData.lastSyncStatus': 'error',
        'settings.healthData.lastSyncError': syncResult.error || 'Sync failed',
      },
    });
    return errorResponse(syncResult.error || 'Failed to fetch health data', 502);
  }

  await User.findByIdAndUpdate(userId, {
    $set: {
      'settings.healthData.lastSyncAt': new Date(),
      'settings.healthData.lastSyncSource': syncSource,
      'settings.healthData.lastSyncStatus': 'ok',
      'settings.healthData.lastSyncError': '',
      'settings.healthData.lastSchemaJson': JSON.stringify(syncResult.schema),
    },
  });

  return maskedResponse({
    ok: true,
    schema: syncResult.schema,
    rowCount: syncResult.rowCount,
    syncActions: syncResult.syncActions,
  });
}
