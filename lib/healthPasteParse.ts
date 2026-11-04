// ============================================
// Parse a pasted health export into sync-ready day records
// ============================================
// Two things can land in the paste box:
//   1. The JSON from the export card's "Copy JSON" button - either the
//      { extractedAt, days: [...] } envelope or a bare array of days.
//   2. The whole dashboard HTML file, which carries the same week inside a
//      `const RAW = [...]` literal with short keys (avg, rhr, hrv, kcal, km, w).
// Both end up as the record shape lib/healthDataSync already understands, so
// nothing downstream needs to know which one the user pasted.

export type HealthPasteSource = 'json' | 'html';

export interface HealthPasteResult {
  source: HealthPasteSource;
  extractedAt: string | null;
  records: Record<string, unknown>[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function pickNum(src: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const v = num(src[key]);
    if (v !== null) return v;
  }
  return null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Walk a JS array literal from its opening bracket to the matching close,
 * skipping over anything inside a string so a bracket in a workout name
 * cannot end the scan early.
 */
function sliceBalanced(text: string, openIndex: number): string | null {
  const open = text[openIndex];
  const close = open === '[' ? ']' : '}';
  let depth = 0;
  let quote: string | null = null;

  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];

    if (quote) {
      if (ch === '\\') { i++; continue; }
      if (ch === quote) quote = null;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return text.slice(openIndex, i + 1);
    }
  }
  return null;
}

/** Turn a JS object literal (unquoted keys, trailing commas) into JSON. */
function literalToJson(literal: string): string {
  return literal
    // strip // line comments that sit outside strings - the export file has none
    // inside its RAW block, so a simple guard on the preceding char is enough
    .replace(/([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)\s*:/g, '$1"$2":')
    .replace(/,(\s*[\]}])/g, '$1');
}

/** [ "06:41", "Tennis", 67.7, 751, 2.28 ] -> a device workout object. */
function tupleToWorkout(tuple: unknown[], date: string): Record<string, unknown> | null {
  const time = typeof tuple[0] === 'string' ? tuple[0] : '';
  const type = typeof tuple[1] === 'string' ? tuple[1].trim() : '';
  if (!type) return null;

  const durationMin = num(tuple[2]);
  const calories = num(tuple[3]);
  const distanceKm = num(tuple[4]);

  return {
    type,
    ...(durationMin !== null ? { durationMin } : {}),
    ...(calories !== null ? { calories } : {}),
    ...(distanceKm !== null ? { distanceKm } : {}),
    // No offset: healthDataSync only reads the clock time off this, and the
    // record's own `date` is what decides which log day it lands on.
    ...(/^\d{2}:\d{2}$/.test(time) ? { startedAt: `${date}T${time}:00` } : {}),
  };
}

function normalizeWorkouts(raw: unknown, date: string): Record<string, unknown>[] {
  if (!Array.isArray(raw)) return [];
  const out: Record<string, unknown>[] = [];
  for (const item of raw) {
    if (Array.isArray(item)) {
      const mapped = tupleToWorkout(item, date);
      if (mapped) out.push(mapped);
    } else if (isPlainObject(item)) {
      out.push(item);
    }
  }
  return out;
}

function normalizeSleep(raw: unknown): Record<string, unknown> | null {
  if (isPlainObject(raw)) return raw;
  const hours = num(raw);
  return hours !== null && hours > 0 ? { totalHours: hours } : null;
}

/**
 * Map one day - short-key or already-normalized - onto the record shape
 * applyHealthRecords reads. Keys it does not recognise are dropped rather than
 * guessed at, so nothing invented reaches the log.
 */
function normalizeDay(day: Record<string, unknown>): Record<string, unknown> | null {
  const date = typeof day.date === 'string' ? day.date.trim() : '';
  if (!ISO_DATE.test(date)) return null;

  const heartIn = isPlainObject(day.heart) ? day.heart : {};
  const activityIn = isPlainObject(day.activity) ? day.activity : {};
  const vitalsIn = isPlainObject(day.vitals) ? day.vitals : {};

  // Blocks are read first (that is the JSON shape), then the flat short keys the
  // dashboard file uses.
  const heart = {
    avgBpm: pickNum(heartIn, ['avgBpm']) ?? pickNum(day, ['avg']),
    restingBpm: pickNum(heartIn, ['restingBpm']) ?? pickNum(day, ['rhr']),
    hrvSdnnMs: pickNum(heartIn, ['hrvSdnnMs']) ?? pickNum(day, ['hrv']),
  };
  const activity = {
    steps: pickNum(activityIn, ['steps']) ?? pickNum(day, ['steps']),
    activeCalories: pickNum(activityIn, ['activeCalories']) ?? pickNum(day, ['kcal']),
    distanceKm: pickNum(activityIn, ['distanceKm']) ?? pickNum(day, ['km']),
  };
  const vitals = {
    respiratoryRate: pickNum(vitalsIn, ['respiratoryRate']) ?? pickNum(day, ['resp']),
    wristTempC: pickNum(vitalsIn, ['wristTempC']),
    vo2Max: pickNum(vitalsIn, ['vo2Max']) ?? pickNum(day, ['vo2']),
    oxygenSaturationPct: pickNum(vitalsIn, ['oxygenSaturationPct']),
  };

  const workouts = normalizeWorkouts(
    Array.isArray(day.workouts) ? day.workouts : day.w,
    date
  );
  const sleep = normalizeSleep(day.sleep);
  const scores = isPlainObject(day.scores) ? day.scores : null;

  const drop = <T extends Record<string, number | null>>(block: T) =>
    Object.fromEntries(Object.entries(block).filter(([, v]) => v !== null));

  const heartOut = drop(heart);
  const activityOut = drop(activity);
  const vitalsOut = drop(vitals);

  return {
    date,
    ...(Object.keys(heartOut).length ? { heart: heartOut } : {}),
    ...(Object.keys(activityOut).length ? { activity: activityOut } : {}),
    ...(Object.keys(vitalsOut).length ? { vitals: vitalsOut } : {}),
    ...(workouts.length ? { workouts } : {}),
    ...(sleep ? { sleep } : {}),
    // Recovery and strain are the export's own maths, not ours. They ride along
    // in the stored snapshot so we can compare them later, and are ignored by
    // the DailyLog mappers.
    ...(scores ? { scores } : {}),
  };
}

function daysFromParsedJson(parsed: unknown): { days: unknown[]; extractedAt: string | null } {
  if (Array.isArray(parsed)) return { days: parsed, extractedAt: null };

  if (isPlainObject(parsed)) {
    const extractedAt = typeof parsed.extractedAt === 'string' ? parsed.extractedAt : null;
    for (const key of ['days', 'records', 'data', 'items', 'entries']) {
      if (Array.isArray(parsed[key])) return { days: parsed[key] as unknown[], extractedAt };
    }
    return { days: [parsed], extractedAt };
  }

  return { days: [], extractedAt: null };
}

/** Pull the `const RAW = [...]` week out of a pasted dashboard file. */
function daysFromHtml(text: string): { days: unknown[]; extractedAt: string | null } {
  const assignment = /(?:const|let|var)\s+RAW\s*=\s*\[/.exec(text);
  if (!assignment) {
    throw new Error('No health data found in that file. Use the export card\'s "Copy JSON" button and paste the JSON instead.');
  }

  const literal = sliceBalanced(text, assignment.index + assignment[0].length - 1);
  if (!literal) throw new Error('The data block in that file is incomplete. Paste the whole file, or use "Copy JSON".');

  let days: unknown;
  try {
    days = JSON.parse(literalToJson(literal));
  } catch {
    throw new Error('Could not read the data block in that file. Use the export card\'s "Copy JSON" button and paste the JSON instead.');
  }
  if (!Array.isArray(days)) throw new Error('The data block in that file is not a list of days.');

  const stamp = /EXTRACTED_AT\s*=\s*"([^"]+)"/.exec(text);
  return { days, extractedAt: stamp ? stamp[1] : null };
}

/**
 * Parse pasted text into day records. Throws with a message meant for the user
 * when the paste is not something we can read.
 */
export function parseHealthPaste(input: string): HealthPasteResult {
  const text = input.trim();
  if (!text) throw new Error('Paste the export first.');

  const looksLikeJson = text.startsWith('{') || text.startsWith('[');
  let source: HealthPasteSource;
  let days: unknown[];
  let extractedAt: string | null;

  if (looksLikeJson) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('That looks like JSON but it did not parse. Copy it again with the "Copy JSON" button.');
    }
    source = 'json';
    ({ days, extractedAt } = daysFromParsedJson(parsed));
  } else {
    source = 'html';
    ({ days, extractedAt } = daysFromHtml(text));
  }

  const records: Record<string, unknown>[] = [];
  for (const day of days) {
    if (!isPlainObject(day)) continue;
    const normalized = normalizeDay(day);
    if (normalized) records.push(normalized);
  }

  if (records.length === 0) {
    throw new Error('No dated days found in that paste. Each day needs a date like 2026-09-01.');
  }

  // Oldest first, and one record per date - a later duplicate wins.
  const byDate = new Map<string, Record<string, unknown>>();
  for (const record of records) byDate.set(record.date as string, record);

  return {
    source,
    extractedAt,
    records: [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date))),
  };
}

/** One line per day for the preview table, so the user sees what will be written. */
export function summarizeRecords(records: Record<string, unknown>[]) {
  return records.map((record) => {
    const heart = isPlainObject(record.heart) ? record.heart : {};
    const activity = isPlainObject(record.activity) ? record.activity : {};
    const sleep = isPlainObject(record.sleep) ? record.sleep : {};
    const workouts = Array.isArray(record.workouts) ? record.workouts : [];

    return {
      date: record.date as string,
      restingBpm: num(heart.restingBpm),
      hrvSdnnMs: num(heart.hrvSdnnMs),
      steps: num(activity.steps),
      activeCalories: num(activity.activeCalories),
      sleepHours: num(sleep.totalHours),
      workoutCount: workouts.length,
      workoutNames: workouts
        .map((w) => (isPlainObject(w) && typeof w.type === 'string' ? w.type : ''))
        .filter(Boolean) as string[],
    };
  });
}
