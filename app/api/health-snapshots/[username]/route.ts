// POST — phone pushes snapshot records directly (bare array, envelope {days:[...]}, or single object)
// GET  — runHealthDataSync pulls recent snapshots as a bare array
//
// Auth: both verbs require Authorization: Bearer <apiKey> where apiKey
// matches the decrypted settings.healthData.apiKeyEncrypted for the username
// in the path. No session cookie needed — designed for device-to-server calls.

import { type NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import HealthSnapshot from '@/models/HealthSnapshot';
import { decrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

const MAX_RECORDS_PER_PUSH = 30;
const RETURN_DAYS = 10;

async function resolveUser(username: string, bearer: string) {
  if (!bearer || !username) return null;

  let user: { _id: { toString(): string }; settings?: { healthData?: { apiKeyEncrypted?: string } } } | null;
  try {
    user = await User.findOne({ username })
      .select('+settings.healthData.apiKeyEncrypted')
      .lean() as typeof user;
  } catch {
    return null;
  }
  if (!user) return null;

  const encrypted = user.settings?.healthData?.apiKeyEncrypted;
  if (!encrypted) return null;

  try {
    const key = decrypt(encrypted);
    return key === bearer ? user : null;
  } catch {
    return null;
  }
}

function extractBearer(req: NextRequest): string {
  return req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ?? '';
}

// ─── POST: phone → arogyamandiram ───────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const bearer = extractBearer(req);

  await connectDB();

  const user = await resolveUser(username, bearer);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user._id.toString();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Normalise: bare array, envelope {days/records/data:[...]}, or single object
  let records: unknown[];
  if (Array.isArray(body)) {
    records = body;
  } else if (body && typeof body === 'object') {
    const env = body as Record<string, unknown>;
    const envelopeKey = ['days', 'records', 'data', 'items', 'entries'].find((k) => Array.isArray(env[k]));
    records = envelopeKey ? (env[envelopeKey] as unknown[]) : [body];
  } else {
    records = [];
  }

  console.error('[health-snapshots POST] raw body:', JSON.stringify(body, null, 2));
  console.error('[health-snapshots POST] records extracted:', records.length, JSON.stringify(records, null, 2));

  if (records.length === 0) {
    return NextResponse.json({ error: 'No records provided' }, { status: 400 });
  }

  const now = new Date();
  const docs = records
    .slice(0, MAX_RECORDS_PER_PUSH)
    .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === 'object' && !Array.isArray(r))
    .map((payload) => ({ userId, receivedAt: now, payload }));

  if (docs.length === 0) {
    return NextResponse.json({ error: 'No valid records after filtering' }, { status: 400 });
  }

  await HealthSnapshot.insertMany(docs, { ordered: false });

  console.error('[health-snapshots POST] stored', docs.length, 'docs for userId', userId);
  return NextResponse.json({ ok: true, count: docs.length });
}

// ─── GET: runHealthDataSync → arogyamandiram ─────────────────────────────────
// Returns a bare array of payload objects so iterateRecords() needs no changes.

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const bearer = extractBearer(req);

  await connectDB();

  const user = await resolveUser(username, bearer);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user._id.toString();
  const since = new Date(Date.now() - RETURN_DAYS * 24 * 60 * 60 * 1000);

  const snapshots = await HealthSnapshot.find(
    { userId, receivedAt: { $gte: since } },
    { payload: 1, receivedAt: 1, _id: 0 }
  )
    .sort({ receivedAt: 1 })
    .lean();

  const payloads = snapshots.map((s: { payload: unknown; receivedAt: unknown }) => ({
    ...(s.payload as Record<string, unknown>),
    receivedAt: (s.receivedAt as Date).toISOString(),
  }));

  return NextResponse.json(payloads);
}
