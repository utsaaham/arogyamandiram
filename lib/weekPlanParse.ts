// ============================================
// lib/weekPlanParse - "My Week" artifact parser
// ============================================
// Turns the pasted HTML of a My Week plan file into structured days.
//
// The source file declares its own food row order, so this is a deterministic
// parse rather than an AI extraction: exact numbers, no estimation, no tokens.
//
//   /* row order: name, protein, kcal, carbs, fat, fibre, sugar, sodium, iron, calcium */
//
// Two generations of the document are supported and both land in the same
// ParsedWeekPlan:
//
//   legacy - `const PLAN = { Monday: {...} }` with positional food rows and
//            positional exercise rows, and no dates of its own.
//   dated  - `const DATA = { days: [ { date, day, ... } ] }` with named food
//            fields (fibre, not fiber) and named exercise fields. Each day
//            carries its own date, so the week needs no mapping onto a Monday.
//
// SECURITY: the pasted document contains a full <script> block. None of it is
// executed. Only the named data literals (DATA, PLAN, SHAKE, DAYS) are sliced
// out by bracket matching and evaluated in an empty VM context with a hard
// timeout, so pasting a hostile file cannot reach the filesystem, the network
// or globals.

import vm from 'node:vm';

const LB_TO_KG = 0.45359237;

/** Index of each field inside a food row. Declared by the source document. */
const F = {
  name: 0, protein: 1, kcal: 2, carbs: 3, fat: 4,
  fiber: 5, sugar: 6, sodium: 7, iron: 8, calcium: 9,
} as const;

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type Phase = 'warmup' | 'strength' | 'cardio' | 'core' | 'mobility' | 'cooldown';
export type Block = 'warm' | 'main' | 'cool';

export interface ParsedMealItem {
  name: string;
  calories: number; protein: number; carbs: number; fat: number;
  fiber: number; sugar: number; sodium: number; iron: number; calcium: number;
}

export interface ParsedMeal {
  slot: string;
  mealType: MealType;
  name: string;
  description: string;
  items: ParsedMealItem[];
  steps: string[];
  totals: Omit<ParsedMealItem, 'name'>;
}

export interface ParsedExercise {
  block: Block;
  phase: Phase;
  name: string;
  category: string;
  muscleGroup?: 'legs' | 'push' | 'pull' | 'core';
  sets: number | null;
  reps: string | null;
  repsMax: number | null;
  durationMinutes: number | null;
  weightKg: number | null;
  loadNote: string;
  bodyweight: boolean;
  restSeconds: number;
  intensity: 'low' | 'medium' | 'high';
  notes: string;
  prescription: string;
}

export interface ParsedDay {
  dayName: string;
  /** The date the document stamps on this day, if it carries one. */
  date: string | null;
  short: string;
  focus: string;
  coach: string;
  meals: ParsedMeal[];
  exercises: ParsedExercise[];
  totals: Omit<ParsedMealItem, 'name'>;
}

export interface ParsedWeekPlan {
  days: ParsedDay[];
  profile: Record<string, unknown> | null;
  guide: { key: string; label: string; html: string }[];
  saltPerMeal: number;
  sessionMinutes: number | null;
  sourceUnit: 'lb' | 'kg';
  /** The Monday the document was written for, when it declares one. */
  weekStarting: string | null;
  /** The document asks to be read as the current week rather than the written one. */
  autoRollWeek: boolean;
}

// ── literal extraction ───────────────────────────────────────────────────────

/**
 * Slice `const <name> = <literal>` out of source by matching brackets.
 * Bracket characters inside string literals are ignored, which matters because
 * meal names and cues in this document contain apostrophes and punctuation.
 */
function sliceLiteral(src: string, name: string): string | null {
  const assign = new RegExp(`const\\s+${name}\\s*=\\s*`);
  const m = src.match(assign);
  if (!m || m.index === undefined) return null;

  const open = m.index + m[0].length;
  if (src[open] !== '{' && src[open] !== '[') return null;

  let depth = 0;
  let quote: string | null = null;
  let escaped = false;

  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (escaped) { escaped = false; continue; }
    if (quote) {
      if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') {
      depth--;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  return null;
}

/** Evaluate a pure data literal with no globals and a hard timeout. */
function evalLiteral<T>(literal: string, label: string): T {
  try {
    return vm.runInNewContext(`(${literal})`, Object.create(null), {
      timeout: 1000,
      displayErrors: false,
    }) as T;
  } catch (err) {
    throw new Error(`Could not read ${label} from the pasted file: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ── field parsing ────────────────────────────────────────────────────────────

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** "4 sets x 6 to 8" -> sets 4, reps "6", repsMax 8.  "25 to 30 minutes" -> 25 min. */
function parsePrescription(text: unknown): Pick<ParsedExercise, 'sets' | 'reps' | 'repsMax' | 'durationMinutes'> {
  const t = String(text ?? '').trim();
  const empty = { sets: null, reps: null, repsMax: null, durationMinutes: null };
  if (!t) return empty;

  const setsMatch = t.match(/^(\d+)\s*sets?\s*(?:x|×)\s*(.+)$/i);
  if (setsMatch) {
    const sets = num(setsMatch[1]);
    const rest = setsMatch[2];

    const secs = rest.match(/(\d+(?:\.\d+)?)\s*seconds?/i);
    if (secs) return { sets, reps: null, repsMax: null, durationMinutes: num(secs[1]) / 60 };

    const range = rest.match(/(\d+)\s*to\s*(\d+)/);
    if (range) return { sets, reps: range[1], repsMax: num(range[2]), durationMinutes: null };

    const single = rest.match(/(\d+)/);
    return { sets, reps: single ? single[1] : null, repsMax: null, durationMinutes: null };
  }

  const mins = t.match(/(\d+)(?:\s*to\s*\d+)?\s*minutes?/i);
  if (mins) return { ...empty, durationMinutes: num(mins[1]) };

  const secOnly = t.match(/(\d+)\s*seconds?/i);
  if (secOnly) return { ...empty, durationMinutes: num(secOnly[1]) / 60 };

  return empty;
}

/**
 * "45 lb, the empty bar" -> 20.4 kg. "Bodyweight only for now" -> bodyweight.
 * The workout UI renders a bare "kg" suffix, so pounds must be converted here
 * rather than stored raw.
 */
function parseLoad(text: unknown): { weightKg: number | null; bodyweight: boolean } {
  const t = String(text ?? '');
  if (/bodyweight/i.test(t)) return { weightKg: null, bodyweight: true };

  const lb = t.match(/(\d+(?:\.\d+)?)\s*(?:to\s*\d+(?:\.\d+)?\s*)?lb/i);
  if (lb) return { weightKg: round1(num(lb[1]) * LB_TO_KG), bodyweight: false };

  const kg = t.match(/(\d+(?:\.\d+)?)\s*(?:to\s*\d+(?:\.\d+)?\s*)?kg/i);
  if (kg) return { weightKg: round1(num(kg[1])), bodyweight: false };

  return { weightKg: null, bodyweight: false };
}

const CORE = /crunch|knee raise|dead bug|bird dog|plank|twist|russian|glute bridge/i;
// Checked before CARDIO: "Walking lunge" is a leg exercise, not a walk. Likewise
// "rower"/"rowing" is cardio while a bare "row" is a back exercise, so `row`
// carries a word boundary here and the cardio pattern spells out the suffixes.
const STRENGTH = /lunge|squat|press|curl|\brow\b|deadlift|raise|fly|pulldown|pull ?up|thrust|extension|pushdown|carry|bench|good morning/i;
const CARDIO = /walk|bike|treadmill|elliptical|row(?:er|ing)|arc trainer|stair|cardio/i;
const MOBILITY = /stretch|foam roll|cat cow|mobility|circles|swing|hang|pull apart/i;

function categorize(name: string): string {
  if (CORE.test(name)) return 'core';
  if (STRENGTH.test(name)) return 'strength';
  if (CARDIO.test(name)) return 'cardio';
  if (MOBILITY.test(name)) return 'flexibility';
  return 'strength';
}

function toPhase(block: Block, category: string): Phase {
  if (block === 'warm') return 'warmup';
  if (block === 'cool') return 'cooldown';
  if (category === 'cardio') return 'cardio';
  if (category === 'core') return 'core';
  if (category === 'flexibility') return 'mobility';
  return 'strength';
}

/** Only map when the day's label is unambiguous; "Upper" spans push and pull. */
function toMuscleGroup(short: string): ParsedExercise['muscleGroup'] {
  const s = String(short).toLowerCase();
  if (s === 'legs') return 'legs';
  if (s === 'push') return 'push';
  if (s === 'pull') return 'pull';
  return undefined;
}

/** Rows that are instructions, not loggable exercises. */
const NOT_EXERCISES = /^(weigh in|nothing else|rest)$/i;

const MEAL_TYPE_BY_SLOT: Record<string, MealType> = {
  breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner',
};

const GUIDE_LABELS: Record<string, string> = {
  me: 'About me', train: 'Training', food: 'Food', gym: 'My gym', life: 'Sleep and hair',
};

// ── row access, positional or named ──────────────────────────────────────────

/** A food or exercise row: a positional array in legacy files, an object in dated ones. */
type RawRow = unknown[] | Record<string, unknown>;

const isRow = (v: unknown): v is RawRow =>
  Array.isArray(v) || (Boolean(v) && typeof v === 'object');

/** Read a field by position on an array row, or by name on an object row. */
function field(row: RawRow, index: number, ...names: string[]): unknown {
  if (Array.isArray(row)) return row[index];
  for (const name of names) {
    if (row[name] !== undefined) return row[name];
  }
  return undefined;
}

function rowToItem(row: RawRow): ParsedMealItem {
  return {
    name: String(field(row, F.name, 'name') ?? ''),
    protein: num(field(row, F.protein, 'protein')),
    calories: num(field(row, F.kcal, 'kcal')),
    carbs: num(field(row, F.carbs, 'carbs')),
    fat: num(field(row, F.fat, 'fat')),
    // The dated document spells it the British way.
    fiber: num(field(row, F.fiber, 'fibre', 'fiber')),
    sugar: num(field(row, F.sugar, 'sugar')),
    sodium: num(field(row, F.sodium, 'sodium')),
    iron: num(field(row, F.iron, 'iron')),
    calcium: num(field(row, F.calcium, 'calcium')),
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Add whole days to a YYYY-MM-DD in UTC, so no local DST shift can move it. */
export function addDays(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

const DAY_MS = 86_400_000;

/** Monday on or before the given date. */
function mondayOf(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  return addDays(dateISO, -((base.getUTCDay() + 6) % 7));
}

/**
 * Where a dated plan's week actually lands. The document rolls itself forward
 * in whole weeks when autoRollWeek is set, which is how the same file keeps
 * showing the week you are in - so an import honours the same rule rather than
 * writing days into a week that has already passed.
 */
export function resolvePlanWeek(
  parsed: Pick<ParsedWeekPlan, 'weekStarting' | 'autoRollWeek'>,
  todayISO: string
): { weekStart: string; rolledWeeks: number } {
  const written = parsed.weekStarting;
  if (!written) return { weekStart: mondayOf(todayISO), rolledWeeks: 0 };
  if (!parsed.autoRollWeek) return { weekStart: written, rolledWeeks: 0 };

  const thisMonday = mondayOf(todayISO);
  const rolledWeeks = Math.round(
    (Date.parse(`${thisMonday}T00:00:00Z`) - Date.parse(`${written}T00:00:00Z`)) / (7 * DAY_MS)
  );
  return { weekStart: addDays(written, rolledWeeks * 7), rolledWeeks };
}

// ── guide panels ─────────────────────────────────────────────────────────────

/** Capture each helper section's markup so the written guidance is not lost. */
function extractGuide(html: string): ParsedWeekPlan['guide'] {
  const out: ParsedWeekPlan['guide'] = [];
  const re = /data-gs="([a-z]+)"[^>]*>/gi;
  const marks: { key: string; start: number }[] = [];

  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    marks.push({ key: m[1], start: m.index + m[0].length });
  }

  marks.forEach((mark, i) => {
    const end = i + 1 < marks.length
      ? html.lastIndexOf('<div', marks[i + 1].start)
      : html.indexOf('</section>', mark.start);
    const body = html.slice(mark.start, end === -1 ? undefined : end).trim();
    if (body) out.push({ key: mark.key, label: GUIDE_LABELS[mark.key] ?? mark.key, html: body });
  });

  return out;
}

// ── main ─────────────────────────────────────────────────────────────────────

/** One day as the source wrote it, before any interpretation. */
interface RawDay {
  dayName: string;
  date: string | null;
  short: string;
  focus: string;
  coach: string;
  meals: Record<string, unknown>[];
  warm: RawRow[];
  main: RawRow[];
  cool: RawRow[];
}

interface SourceBlocks {
  rawDays: RawDay[];
  me: Record<string, unknown> | null;
  shake: RawRow | null;
  saltPerMeal: number;
  weekStarting: string | null;
  autoRollWeek: boolean;
}

const rowList = (v: unknown): RawRow[] => (Array.isArray(v) ? v.filter(isRow) : []);

const asObject = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/** `const DATA = {...}`: named fields throughout, and every day carries its date. */
function readDatedSource(src: string): SourceBlocks {
  const literal = sliceLiteral(src, 'DATA');
  if (!literal) throw new Error('Found a DATA block but could not read it. The file may be truncated.');

  const DATA = evalLiteral<Record<string, unknown>>(literal, 'DATA');
  const days = Array.isArray(DATA.days) ? (DATA.days as unknown[]) : [];

  const rawDays: RawDay[] = days
    .map(asObject)
    .filter((d): d is Record<string, unknown> => d !== null)
    .map((d) => {
      const date = String(d.date ?? '');
      return {
        dayName: String(d.day ?? ''),
        date: ISO_DATE.test(date) ? date : null,
        short: String(d.short ?? ''),
        focus: String(d.focus ?? ''),
        coach: String(d.coach ?? ''),
        meals: rowList(d.meals).map((m) => asObject(m) ?? {}),
        warm: rowList(d.warmUp ?? d.warm),
        main: rowList(d.main),
        cool: rowList(d.coolDown ?? d.cool),
      };
    });

  const written = String(DATA.weekStarting ?? '');
  const salt = asObject(DATA.cookingSaltPerMeal);

  return {
    rawDays,
    me: asObject(DATA.profile),
    shake: isRow(DATA.shake) ? (DATA.shake as RawRow) : null,
    saltPerMeal: num(salt?.sodium),
    weekStarting: ISO_DATE.test(written) ? written : null,
    // Absent means roll, matching the document: only an explicit false pins it.
    autoRollWeek: DATA.autoRollWeek !== false,
  };
}

/** `const PLAN = {...}`: positional rows, weekday keys, no dates. */
function readLegacySource(src: string): SourceBlocks {
  const planLiteral = sliceLiteral(src, 'PLAN');
  if (!planLiteral) throw new Error('Found a PLAN block but could not read it. The file may be truncated.');

  const PLAN = evalLiteral<Record<string, Record<string, unknown>>>(planLiteral, 'PLAN');

  const shakeLiteral = sliceLiteral(src, 'SHAKE');
  const SHAKE = shakeLiteral ? evalLiteral<unknown[]>(shakeLiteral, 'SHAKE') : null;

  const daysLiteral = sliceLiteral(src, 'DAYS');
  const DAYS = daysLiteral ? evalLiteral<string[]>(daysLiteral, 'DAYS') : Object.keys(PLAN);

  const meLiteral = sliceLiteral(src, 'ME');
  const ME = meLiteral ? evalLiteral<Record<string, unknown>>(meLiteral, 'ME') : null;

  const saltMatch = src.match(/const\s+SALT_PER_MEAL\s*=\s*(\d+)/);

  const rawDays: RawDay[] = DAYS.filter((d) => PLAN[d]).map((dayName) => {
    const day = PLAN[dayName];
    return {
      dayName,
      date: null,
      short: String(day.short ?? ''),
      focus: String(day.focus ?? ''),
      coach: String(day.coach ?? ''),
      meals: rowList(day.meals).map((m) => asObject(m) ?? {}),
      warm: rowList(day.warm),
      main: rowList(day.main),
      cool: rowList(day.cool),
    };
  });

  return {
    rawDays,
    me: ME,
    shake: SHAKE,
    saltPerMeal: saltMatch ? num(saltMatch[1]) : 0,
    weekStarting: null,
    autoRollWeek: false,
  };
}

export function parseWeekPlan(html: string): ParsedWeekPlan {
  if (!html || typeof html !== 'string') throw new Error('No HTML provided.');

  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((s) => s[1]);
  // Both patterns require the opening brace, so the derived `const PLAN =
  // Object.fromEntries(...)` line in a dated file is not mistaken for the data.
  const dated = scripts.find((s) => /const\s+DATA\s*=\s*\{/.test(s));
  const legacy = scripts.find((s) => /const\s+PLAN\s*=\s*\{/.test(s));
  if (!dated && !legacy) {
    throw new Error('No plan data found. Paste the full My Week HTML file, including its <script> tag.');
  }

  const { rawDays, me: ME, shake: SHAKE, saltPerMeal, weekStarting, autoRollWeek } =
    dated ? readDatedSource(dated) : readLegacySource(legacy as string);

  const training = (ME?.training ?? {}) as Record<string, unknown>;
  const sessionMatch = String(training.session ?? '').match(/(\d+)\s*minutes?/i);
  const sessionMinutes = sessionMatch ? num(sessionMatch[1]) : null;

  const sourceUnit: 'lb' | 'kg' = /pound|lb/i.test(String(training.units ?? '')) ? 'lb' : 'kg';

  const emptyTotals = (): Omit<ParsedMealItem, 'name'> => ({
    calories: 0, protein: 0, carbs: 0, fat: 0,
    fiber: 0, sugar: 0, sodium: 0, iron: 0, calcium: 0,
  });

  const sumItems = (items: ParsedMealItem[], salt: number) => {
    const t = emptyTotals();
    for (const i of items) {
      t.calories += i.calories; t.protein += i.protein; t.carbs += i.carbs; t.fat += i.fat;
      t.fiber += i.fiber; t.sugar += i.sugar; t.sodium += i.sodium;
      t.iron += i.iron; t.calcium += i.calcium;
    }
    t.sodium += salt;
    (Object.keys(t) as (keyof typeof t)[]).forEach((k) => { t[k] = round1(t[k]); });
    return t;
  };

  const days: ParsedDay[] = rawDays.map((day) => {
    const dayName = day.dayName;
    const short = day.short;

    // ── meals ──
    const meals: ParsedMeal[] = day.meals.map((m) => {
      const slot = String(m.slot ?? '');
      const items = rowList(m.items).map(rowToItem);
      return {
        slot,
        mealType: MEAL_TYPE_BY_SLOT[slot.toLowerCase()] ?? 'snack',
        name: String(m.name ?? ''),
        description: String(m.tag ?? ''),
        items,
        steps: ((m.steps ?? []) as unknown[]).map(String),
        // The source adds a fixed cooking-salt allowance to each meal.
        totals: sumItems(items, saltPerMeal),
      };
    });

    if (SHAKE) {
      const shakeItem = rowToItem(SHAKE);
      meals.push({
        slot: dayName === 'Sunday' ? 'Any time' : 'After training',
        mealType: 'snack',
        name: 'Shake',
        description: 'One scoop in 250 ml milk',
        items: [shakeItem],
        steps: [],
        // No cooking salt on the shake, matching the source.
        totals: sumItems([shakeItem], 0),
      });
    }

    // ── exercises ──
    // Legacy rows are positional - warm and cool are [name, dose, cue] and main
    // is [name, sets, load, cue]. Dated rows carry the same fields by name.
    const fromRows = (list: RawRow[], block: Block): ParsedExercise[] => {
      const isMain = block === 'main';
      const easyDay = /^(rest|easy)$/i.test(short);
      const doseKey = isMain ? 'sets' : 'dose';

      return list
        .filter((r) => !NOT_EXERCISES.test(String(field(r, 0, 'name') ?? '').trim()))
        .map((r, i) => {
          const name = String(field(r, 0, 'name') ?? '');
          const dose = field(r, 1, doseKey, 'sets', 'dose');
          const category = categorize(name);
          const prescription = parsePrescription(dose);
          const loadNote = isMain ? String(field(r, 2, 'load') ?? '') : '';
          const load = parseLoad(loadNote);

          // The plan prescribes two to three minutes on the first two lifts and
          // ninety seconds on everything else. Rest between sets is meaningless
          // for steady cardio and stretching, so those carry none.
          const loadBearing = category === 'strength' || category === 'core';
          const restSeconds = !isMain || !loadBearing ? 0 : i < 2 ? 150 : 90;

          const intensity: ParsedExercise['intensity'] =
            !isMain || easyDay ? 'low' : i < 2 ? 'high' : 'medium';

          return {
            block,
            phase: toPhase(block, category),
            name,
            category,
            muscleGroup: isMain ? toMuscleGroup(short) : undefined,
            sets: prescription.sets,
            reps: prescription.reps,
            repsMax: prescription.repsMax,
            durationMinutes: prescription.durationMinutes,
            weightKg: load.weightKg,
            loadNote,
            bodyweight: load.bodyweight,
            restSeconds,
            intensity,
            notes: String(field(r, isMain ? 3 : 2, 'cue') ?? ''),
            prescription: String(dose ?? ''),
          };
        });
    };

    const exercises = [
      ...fromRows(day.warm, 'warm'),
      ...fromRows(day.main, 'main'),
      ...fromRows(day.cool, 'cool'),
    ];

    const dayTotals = emptyTotals();
    for (const m of meals) {
      (Object.keys(dayTotals) as (keyof typeof dayTotals)[]).forEach((k) => {
        dayTotals[k] += m.totals[k];
      });
    }
    (Object.keys(dayTotals) as (keyof typeof dayTotals)[]).forEach((k) => {
      dayTotals[k] = round1(dayTotals[k]);
    });

    return {
      dayName,
      date: day.date,
      short,
      focus: day.focus,
      coach: day.coach,
      meals,
      exercises,
      totals: dayTotals,
    };
  });

  if (!days.length) throw new Error('The plan data parsed but contained no days.');

  return {
    days,
    profile: ME,
    guide: extractGuide(html),
    saltPerMeal,
    sessionMinutes,
    sourceUnit,
    weekStarting,
    autoRollWeek,
  };
}

// ── mapping into DailyPlan ───────────────────────────────────────────────────

/** Monday-based date for a weekday name, given the Monday the week starts on. */
export function dateForDay(weekStartISO: string, dayName: string, days: string[]): string {
  const idx = days.indexOf(dayName);
  const [y, m, d] = weekStartISO.split('-').map(Number);
  // Construct in UTC so a local DST shift cannot move the date across a boundary.
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + (idx < 0 ? 0 : idx));
  return base.toISOString().slice(0, 10);
}

export function toFoodPlan(day: ParsedDay) {
  return {
    suggestions: day.meals.map((m) => ({
      name: m.name,
      description: m.description,
      calories: Math.round(m.totals.calories),
      protein: m.totals.protein,
      carbs: m.totals.carbs,
      fat: m.totals.fat,
      fiber: m.totals.fiber,
      sugar: m.totals.sugar,
      sodium: Math.round(m.totals.sodium),
      iron: m.totals.iron,
      calcium: Math.round(m.totals.calcium),
      mealType: m.mealType,
      ingredients: m.items.map((i) => i.name),
      items: m.items,
      steps: m.steps,
      isVegetarian: true,
    })),
    reasoning: day.coach,
  };
}

export function toWorkoutPlan(day: ParsedDay, sessionMinutes: number | null) {
  const explicit = day.exercises.reduce((n, e) => n + (e.durationMinutes ?? 0), 0);
  const hasSets = day.exercises.some((e) => (e.sets ?? 0) > 0);

  return {
    name: `${day.dayName} - ${day.short}`,
    description: day.focus,
    whyToday: day.coach,
    exercises: day.exercises.map((e) => ({
      name: e.name,
      steps: e.notes ? [e.notes] : undefined,
      sets: e.sets ?? 1,
      reps: e.reps ?? (e.durationMinutes ? `${e.durationMinutes} min` : '1'),
      repsMax: e.repsMax ?? undefined,
      phase: e.phase,
      durationMinutes: e.durationMinutes ?? undefined,
      restSeconds: e.restSeconds,
      intensity: e.intensity,
      category: e.category,
      muscleGroup: e.muscleGroup,
      weightKg: e.weightKg ?? undefined,
      loadNote: e.loadNote || undefined,
      bodyweight: e.bodyweight || undefined,
    })),
    // Not estimated: the source document prescribes no calorie burn.
    estimatedCalories: 0,
    durationMinutes: hasSets && sessionMinutes ? sessionMinutes : Math.round(explicit),
  };
}
