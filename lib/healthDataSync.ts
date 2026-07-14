import DailyLog from '@/models/DailyLog';
import { decrypt } from '@/lib/encryption';
import { awardDailyXp } from '@/lib/xp';

export type HealthSyncSource = 'manual' | 'auto';

export interface HealthSyncAction {
  field: string;
  status: 'logged' | 'error';
  detail?: string;
}

export interface HealthSyncResult {
  ok: boolean;
  schema: Record<string, string>;
  rowCount: number;
  syncActions: HealthSyncAction[];
  error?: string;
}

const MAX_BATCH_DAYS = 8;
const MAX_BACKFILL_DAYS = 90;
const DAY_MS = 86_400_000;

function deriveWorkoutCategory(type: string): 'cardio' | 'strength' | 'flexibility' | 'sports' | 'other' {
  const t = type.toLowerCase();
  if (/walk|run|jog|cycl|bike|swim|row|elliptic|treadmill|hik|cardio|jump|aerobic|dance|zumba|stair/.test(t)) return 'cardio';
  if (/lift|weight|strength|bench|squat|deadlift|press|curl|pull.?up|push.?up|dumbbell|barbell|resistance/.test(t)) return 'strength';
  if (/yoga|stretch|pilates|flex|mobility|foam/.test(t)) return 'flexibility';
  if (/football|soccer|basketball|tennis|badminton|cricket|volleyball|rugby|hockey|baseball|golf|sport/.test(t)) return 'sports';
  return 'other';
}

function getSchema(rawData: unknown): Record<string, string> {
  const schema: Record<string, string> = {};
  if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
    for (const [k, v] of Object.entries(rawData as Record<string, unknown>)) {
      schema[k] = Array.isArray(v) ? 'array' : typeof v;
    }
  } else if (Array.isArray(rawData) && rawData.length > 0 && typeof rawData[0] === 'object') {
    for (const [k, v] of Object.entries(rawData[0] as Record<string, unknown>)) {
      schema[k] = Array.isArray(v) ? 'array' : typeof v;
    }
  }
  return schema;
}

function to24hTime(value: Date): string {
  return value.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function getValidTimezone(timezone?: string): string | null {
  if (!timezone) return null;
  try {
    Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return null;
  }
}

function toDateKey(date: Date, timezone?: string): string {
  const validTimezone = getValidTimezone(timezone);
  if (!validTimezone) return date.toISOString().slice(0, 10);

  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: validTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value]));
  return `${map.get('year')}-${map.get('month')}-${map.get('day')}`;
}

function getEventTimestamp(record: Record<string, unknown>): number {
  const candidates = [record.receivedAt, record.date, record.timestamp, record.updatedAt, record.createdAt];
  for (const value of candidates) {
    if (typeof value !== 'string') continue;
    const ts = new Date(value).getTime();
    if (!Number.isNaN(ts)) return ts;
  }
  return Number.NEGATIVE_INFINITY;
}

// Normalize the response into a list of day-records, oldest → newest, capped at MAX_BATCH_DAYS.
// Accepts: a bare array, a bare day-object, or an envelope like {days: [...]} / {records: [...]} / {data: [...]}.
function iterateRecords(rawData: unknown): Record<string, unknown>[] {
  let arr: unknown = rawData;

  if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
    const env = rawData as Record<string, unknown>;
    // Unwrap common envelope shapes. First array-valued key wins.
    for (const key of ['days', 'records', 'data', 'items', 'entries']) {
      if (Array.isArray(env[key])) {
        arr = env[key];
        break;
      }
    }
    // No envelope detected → treat the object itself as a single day-record.
    if (arr === rawData) {
      return [env];
    }
  }

  if (!Array.isArray(arr)) return [];

  const records = arr.filter(
    (item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object'
  );
  records.sort((a, b) => getEventTimestamp(a) - getEventTimestamp(b));
  return records.slice(-MAX_BATCH_DAYS);
}

function resolveLogDate(record: Record<string, unknown>, timezone?: string): string {
  const recordDateStr = typeof record.date === 'string' ? record.date : '';
  // A bare YYYY-MM-DD is already the device's local calendar day. `new Date(str)`
  // would parse it as UTC midnight, which then shifts back a day for any
  // west-of-UTC timezone (e.g. America/New_York → off-by-one).
  if (/^\d{4}-\d{2}-\d{2}$/.test(recordDateStr)) {
    return recordDateStr;
  }
  const recordReceivedAtStr = typeof record.receivedAt === 'string' ? record.receivedAt : '';
  const primaryTimestamp = recordDateStr || recordReceivedAtStr;
  const parsed = primaryTimestamp ? new Date(primaryTimestamp) : null;
  return parsed && !Number.isNaN(parsed.getTime())
    ? toDateKey(parsed, timezone)
    : toDateKey(new Date(), timezone);
}

interface MapperResult {
  mutated: boolean;
  actions: HealthSyncAction[];
}

async function applySleep(
  record: Record<string, unknown>,
  logDate: string,
  userId: string
): Promise<MapperResult> {
  const actions: HealthSyncAction[] = [];
  const sleepBlock = record.sleep && typeof record.sleep === 'object' ? (record.sleep as Record<string, unknown>) : null;
  const sleepHours = sleepBlock && typeof sleepBlock.totalHours === 'number' ? sleepBlock.totalHours : null;
  if (sleepHours === null || sleepHours <= 0 || sleepHours > 24) {
    return { mutated: false, actions };
  }
  try {
    const rawBedtime = typeof sleepBlock?.bedtime === 'string' ? sleepBlock.bedtime : null;
    const rawWake = typeof sleepBlock?.wake === 'string' ? sleepBlock.wake : null;
    const wakeDate = rawWake ? new Date(rawWake) : null;
    const bedDate = rawBedtime ? new Date(rawBedtime) : null;
    const safeWake = wakeDate && !Number.isNaN(wakeDate.getTime()) ? wakeDate : new Date();
    const safeBed = bedDate && !Number.isNaN(bedDate.getTime())
      ? bedDate
      : new Date(safeWake.getTime() - sleepHours * 60 * 60 * 1000);
    const wakeTime = to24hTime(safeWake);
    const bedtime = to24hTime(safeBed);

    const stages = sleepBlock?.stages && typeof sleepBlock.stages === 'object'
      ? (sleepBlock.stages as Record<string, unknown>)
      : null;
    const stageFields: Record<string, number> = {};
    if (stages && typeof stages.deepHours === 'number') stageFields.deepHours = stages.deepHours;
    if (stages && typeof stages.remHours === 'number') stageFields.remHours = stages.remHours;
    if (stages && typeof stages.coreHours === 'number') stageFields.coreHours = stages.coreHours;
    if (stages && typeof stages.awakeHours === 'number') stageFields.awakeHours = stages.awakeHours;

    await DailyLog.findOneAndUpdate(
      { userId, date: logDate },
      {
        $set: { sleep: { bedtime, wakeTime, duration: sleepHours, quality: 3, notes: '', ...stageFields } },
        $setOnInsert: { userId, date: logDate },
      },
      { new: true, upsert: true }
    );
    actions.push({
      field: 'sleep',
      status: 'logged',
      detail: `${logDate}: ${sleepHours}h sleep logged (bed ${bedtime} → wake ${wakeTime})`,
    });
    return { mutated: true, actions };
  } catch (err) {
    actions.push({
      field: 'sleep',
      status: 'error',
      detail: `${logDate}: ${err instanceof Error ? err.message : String(err)}`,
    });
    return { mutated: false, actions };
  }
}

async function applyDeviceWorkouts(
  record: Record<string, unknown>,
  logDate: string,
  userId: string
): Promise<MapperResult> {
  const actions: HealthSyncAction[] = [];
  const rawDeviceWorkouts = Array.isArray(record.workouts) ? record.workouts : [];
  const mappedDeviceWorkouts = rawDeviceWorkouts
    .filter((w) => w && typeof w === 'object')
    .map((w) => {
      const dw = w as Record<string, unknown>;
      return {
        exercise: typeof dw.type === 'string' ? dw.type.trim() : '',
        duration: typeof dw.durationMin === 'number' ? dw.durationMin : 0,
        caloriesBurned: typeof dw.calories === 'number' ? dw.calories : 0,
        category: deriveWorkoutCategory(typeof dw.type === 'string' ? dw.type : ''),
        source: 'device' as const,
        ...(typeof dw.avgHeartRate === 'number' ? { avgHeartRate: dw.avgHeartRate } : {}),
      };
    })
    .filter((w) => w.exercise && w.duration > 0);

  try {
    const existingLog = await DailyLog.findOne({ userId, date: logDate }).lean();
    type StoredWorkout = { source?: string; exercise: string; duration: number; caloriesBurned: number; category: string };
    const existingWorkouts = (existingLog?.workouts as StoredWorkout[] | undefined) ?? [];
    const manualWorkouts = existingWorkouts.filter((w) => w.source !== 'device');
    const existingDeviceCount = existingWorkouts.length - manualWorkouts.length;

    // Always reconcile to mirror the device snapshot: replace device-source
    // workouts with the new set (even if empty, which wipes stale entries when
    // the user deletes a workout on-device).
    if (existingDeviceCount === 0 && mappedDeviceWorkouts.length === 0) {
      return { mutated: false, actions };
    }

    const log = await DailyLog.findOneAndUpdate(
      { userId, date: logDate },
      {
        $set: { workouts: [...manualWorkouts, ...mappedDeviceWorkouts] },
        $setOnInsert: { userId, date: logDate },
      },
      { new: true, upsert: true }
    );
    if (log) await log.save();
    actions.push({
      field: 'workouts',
      status: 'logged',
      detail: `${logDate}: device workouts ${existingDeviceCount} → ${mappedDeviceWorkouts.length} (${manualWorkouts.length} manual kept)`,
    });
    return { mutated: true, actions };
  } catch (err) {
    actions.push({
      field: 'workouts',
      status: 'error',
      detail: `${logDate}: ${err instanceof Error ? err.message : String(err)}`,
    });
    return { mutated: false, actions };
  }
}

async function applyMetrics(
  record: Record<string, unknown>,
  logDate: string,
  userId: string
): Promise<MapperResult> {
  const actions: HealthSyncAction[] = [];
  const heartBlock = record.heart && typeof record.heart === 'object' ? (record.heart as Record<string, unknown>) : null;
  const activityBlock = record.activity && typeof record.activity === 'object' ? (record.activity as Record<string, unknown>) : null;
  const vitalsBlock = record.vitals && typeof record.vitals === 'object' ? (record.vitals as Record<string, unknown>) : null;

  const sampledMetrics: Record<string, number> = {};
  const cumulativeMetrics: Record<string, number> = {};
  if (heartBlock && typeof heartBlock.avgBpm === 'number') sampledMetrics.heartRate = heartBlock.avgBpm;
  if (heartBlock && typeof heartBlock.restingBpm === 'number') sampledMetrics.restingHeartRate = heartBlock.restingBpm;
  if (heartBlock && typeof heartBlock.hrvSdnnMs === 'number') sampledMetrics.hrvSdnnMs = heartBlock.hrvSdnnMs;
  if (activityBlock && typeof activityBlock.steps === 'number' && activityBlock.steps > 0) cumulativeMetrics.steps = activityBlock.steps;
  if (activityBlock && typeof activityBlock.activeCalories === 'number' && activityBlock.activeCalories > 0) cumulativeMetrics.activeCalories = activityBlock.activeCalories;
  if (activityBlock && typeof activityBlock.distanceKm === 'number' && activityBlock.distanceKm > 0) cumulativeMetrics.distanceKm = activityBlock.distanceKm;
  if (vitalsBlock && typeof vitalsBlock.respiratoryRate === 'number') sampledMetrics.respiratoryRate = vitalsBlock.respiratoryRate;
  if (vitalsBlock && typeof vitalsBlock.wristTempC === 'number') sampledMetrics.wristTempC = vitalsBlock.wristTempC;
  if (vitalsBlock && typeof vitalsBlock.vo2Max === 'number') sampledMetrics.vo2Max = vitalsBlock.vo2Max;

  const metricsUpdate = { ...sampledMetrics, ...cumulativeMetrics };

  if (Object.keys(metricsUpdate).length === 0) {
    return { mutated: false, actions };
  }

  try {
    await DailyLog.findOneAndUpdate(
      { userId, date: logDate },
      {
        ...(Object.keys(sampledMetrics).length > 0 ? { $set: sampledMetrics } : {}),
        // Activity totals are cumulative within a calendar day. HealthKit can
        // briefly return zero or a partial total while sources are refreshing;
        // never let that erase a higher value already synced for the same day.
        ...(Object.keys(cumulativeMetrics).length > 0 ? { $max: cumulativeMetrics } : {}),
        $setOnInsert: { userId, date: logDate },
      },
      { upsert: true, strict: false }
    );
    for (const [field, val] of Object.entries(metricsUpdate)) {
      actions.push({ field, status: 'logged', detail: `${logDate}: ${field}=${val}` });
    }
    return { mutated: true, actions };
  } catch (err) {
    actions.push({
      field: 'metrics',
      status: 'error',
      detail: `${logDate}: ${err instanceof Error ? err.message : String(err)}`,
    });
    return { mutated: false, actions };
  }
}

/**
 * Map normalized day-records into DailyLog (sleep, device workouts, metrics)
 * and award XP for today/yesterday. Shared by the pull-based cron sync and
 * the push path (/api/health-snapshots POST), so data lands in the log the
 * moment the phone uploads it - no cron required.
 */
export async function applyHealthRecords(input: {
  userId: string;
  records: Record<string, unknown>[];
  timezone?: string;
}): Promise<HealthSyncAction[]> {
  const syncActions: HealthSyncAction[] = [];
  const todayKey = toDateKey(new Date(), input.timezone);
  const yesterdayKey = toDateKey(new Date(Date.now() - DAY_MS), input.timezone);
  const cutoffKey = toDateKey(new Date(Date.now() - MAX_BACKFILL_DAYS * DAY_MS), input.timezone);
  const seenDates = new Set<string>();

  for (const record of input.records) {
    const logDate = resolveLogDate(record, input.timezone);

    if (logDate < cutoffKey) {
      syncActions.push({
        field: 'record',
        status: 'error',
        detail: `Skipped ${logDate}: older than ${MAX_BACKFILL_DAYS}d cutoff`,
      });
      continue;
    }

    // If two records resolve to the same date, the later one (newer timestamp,
    // since we sorted ascending) wins - but warn so callers know to dedupe upstream.
    if (seenDates.has(logDate)) {
      syncActions.push({
        field: 'record',
        status: 'error',
        detail: `Duplicate ${logDate} in batch; later entry overwrites earlier`,
      });
    }
    seenDates.add(logDate);

    const sleepRes = await applySleep(record, logDate, input.userId);
    const workoutRes = await applyDeviceWorkouts(record, logDate, input.userId);
    const metricsRes = await applyMetrics(record, logDate, input.userId);

    syncActions.push(...sleepRes.actions, ...workoutRes.actions, ...metricsRes.actions);

    const mutated = sleepRes.mutated || workoutRes.mutated || metricsRes.mutated;
    // XP cap: only today + yesterday earn XP from sync; older backfilled days
    // are stored (and contribute to streaks via gamification recalc) but skip XP.
    if (mutated && (logDate === todayKey || logDate === yesterdayKey)) {
      await awardDailyXp(input.userId, logDate).catch(() => {});
    }
  }

  return syncActions;
}

export async function runHealthDataSync(input: {
  userId: string;
  endpoint: string;
  apiKeyEncrypted?: string;
  timezone?: string;
}): Promise<HealthSyncResult> {
  const syncActions: HealthSyncAction[] = [];
  const endpoint = input.endpoint.trim();
  if (!endpoint) {
    return {
      ok: false,
      schema: {},
      rowCount: 0,
      syncActions,
      error: 'No health data endpoint configured',
    };
  }

  let apiKey = '';
  if (input.apiKeyEncrypted?.trim()) {
    try {
      apiKey = decrypt(input.apiKeyEncrypted.trim());
    } catch {
      apiKey = '';
    }
  }

  let rawData: unknown;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    let res: Response;
    try {
      res = await fetch(endpoint, { method: 'GET', headers, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      const detail = `HTTP ${res.status} from ${endpoint}: ${errText.slice(0, 200) || 'Health endpoint request failed'}`;
      console.error('[healthDataSync] HTTP error:', detail);
      return { ok: false, schema: {}, rowCount: 0, syncActions, error: detail };
    }
    rawData = await res.json();
  } catch (err) {
    const base = err instanceof Error ? err.message : String(err);
    const cause = err instanceof Error && (err as NodeJS.ErrnoException & { cause?: unknown }).cause;
    const causeMsg = cause instanceof Error
      ? ` (cause: ${cause.message})`
      : cause
        ? ` (cause: ${String(cause)})`
        : '';
    const detail = `${base}${causeMsg} [endpoint: ${endpoint}]`;
    console.error('[healthDataSync] fetch error:', detail);
    return {
      ok: false,
      schema: {},
      rowCount: 0,
      syncActions,
      error: detail.slice(0, 400),
    };
  }

  const schema = getSchema(rawData);
  const records = iterateRecords(rawData);
  const rowCount = records.length;

  if (records.length === 0) {
    return { ok: true, schema, rowCount, syncActions };
  }

  const applied = await applyHealthRecords({
    userId: input.userId,
    records,
    timezone: input.timezone,
  });
  syncActions.push(...applied);

  return { ok: true, schema, rowCount, syncActions };
}
