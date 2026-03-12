// ============================================
// Meal Ideas Service — Production-grade AI recommendations
// ============================================
// Clean payload, realistic targets, structured history, ~60% token reduction.

import connectDB from '@/lib/db';
import DailyLog from '@/models/DailyLog';
import User from '@/models/User';
import { resolveOpenAIKey } from '@/lib/openaiKey';
import { getToday, toLocalDateString, getAgeFromDateOfBirth } from '@/lib/utils';
import { calculateBMR, calculateTDEE } from '@/lib/health';
import type { ActivityLevel, Goal, Gender } from '@/types';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const MODEL = 'gpt-4o-mini';

export type MealHistoryResult = Record<string, string[]>;

/** Per-day, per-meal-type history for display. */
export type MealHistoryByDay = Record<string, Record<string, { items: string[]; totalCalories: number }>>;

export interface MealSuggestion {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  prepTimeMinutes?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  mealType: string;
  ingredients: string[];
  isVegetarian: boolean;
}

export interface UsageInfo {
  prompt_tokens?: number;
  completion_tokens?: number;
}

export interface UserContext {
  height?: number;
  weight?: number;
  targetWeight?: number;
  activityLevel?: string;
  goal?: string;
  age?: number;
}

/** Normalized for LLM: activity as low|moderate|high */
type ActivityForPrompt = 'low' | 'moderate' | 'high';

export interface AIDebugLog {
  userRequest: { selectedMealTypes: string[]; preferences: string; requestedAt: string };
  mealHistoryByDay: MealHistoryByDay;
  userContext?: UserContext;
  systemPrompt: string;
  userPrompt: string;
  response: string;
  metadata: {
    model: string;
    usage?: UsageInfo;
    latencyMs: number;
    timestamp: string;
  };
}

export interface MealHistoryResultWithDates {
  aggregated: MealHistoryResult;
  byDay: MealHistoryByDay;
}

// ---------- Exclude list: spices, condiments — never include in history ----------

const EXCLUDE_ITEMS = new Set([
  'salt', 'sugar', 'oil', 'ghee', 'butter', 'water',
  'chilli', 'chilli powder', 'red chilli', 'green chilli',
  'turmeric', 'cumin', 'coriander', 'garam masala', 'spices',
  'pepper', 'black pepper', 'ginger', 'garlic', 'onion',
  'lemon', 'lime', 'tamarind', 'curry leaves', 'mustard',
  'hing', 'asafoetida', 'paprika', 'cayenne',
]);

function isMainIngredient(name: string): boolean {
  const n = name.toLowerCase().trim();
  if (n.length < 2) return false;
  if (EXCLUDE_ITEMS.has(n)) return false;
  for (const ex of Array.from(EXCLUDE_ITEMS)) {
    if (n === ex || n.endsWith(` ${ex}`) || n.startsWith(`${ex} `)) return false;
  }
  return true;
}

// ---------- Parse meal strings into structured items ----------

const SPLIT_PATTERNS = /,\s*|\s+and\s+|\s*&\s*/i;

function parseMealIntoItems(mealName: string): string[] {
  const normalized = mealName.trim().replace(/\s+/g, ' ');
  if (!normalized) return [];

  const parts = normalized.split(SPLIT_PATTERNS).map((s) => s.trim()).filter(Boolean);
  const items: string[] = [];
  for (const p of parts) {
    if (p.toLowerCase() === 'with') continue;
    const sub = p.split(/\s+with\s+/i).map((s) => s.trim()).filter(Boolean);
    items.push(...sub);
  }
  return Array.from(new Set(items)).slice(0, 12);
}

function normalizeItemName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^\d+\s*(x\s*)?/i, '')
    .trim();
}

// ---------- Realistic nutrition targets for meal suggestions ----------
// Evidence-based: protein 1.0–1.2g/kg, carbs 45–55%, fat 25–30%.

function computeMealTargets(
  weight: number,
  height: number,
  age: number,
  gender: Gender,
  activityLevel: ActivityLevel,
  goal: Goal
): { calories: number; protein: number; carbs: number; fat: number } {
  const bmr = calculateBMR(weight, height, age, gender);
  const tdee = calculateTDEE(bmr, activityLevel);

  const goalAdjust: Record<Goal, number> = {
    lose: -400,
    maintain: 0,
    gain: 300,
  };
  const calories = Math.max(1200, Math.round(tdee + goalAdjust[goal]));

  const proteinPerKg = goal === 'lose' ? 1.4 : goal === 'gain' ? 1.0 : 1.2;
  const protein = Math.round(weight * proteinPerKg);
  const fat = Math.round((calories * 0.28) / 9);
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);

  return {
    calories: Math.max(1200, calories),
    protein: Math.max(50, Math.min(protein, 180)),
    carbs: Math.max(100, Math.min(carbs, 350)),
    fat: Math.max(40, Math.min(fat, 90)),
  };
}

/** Default when profile incomplete. */
const DEFAULT_TARGETS = { calories: 2100, protein: 90, carbs: 240, fat: 65 };

// ---------- Payload structure (history-first, minimal tokens) ----------

interface MealHistoryEntry {
  date: string;
  items: string[];
  calories: number;
}

interface PatternSummary {
  baseCarb: string;
  commonProtein: string;
  commonSide: string;
  snackFrequency: 'low' | 'medium' | 'high';
  avgCalories: number;
}

interface UserProfileForPrompt {
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  age: number;
  activityLevel: ActivityForPrompt;
  goal: 'maintain' | 'lose' | 'gain';
}

interface MealPayload {
  userProfile: UserProfileForPrompt;
  mealHistoryLast4Days: MealHistoryEntry[];
  patternSummary: PatternSummary;
  targets: { calories: number; protein: number; carbs: number; fat: number };
  todayIntake: { calories: number; remainingCalories: number };
  task: string;
}

const CARB_KEYWORDS = ['rice', 'roti', 'chapati', 'naan', 'bread', 'dosa', 'idli', 'poha', 'upma'];
const PROTEIN_KEYWORDS = ['dal', 'paneer', 'chicken', 'fish', 'egg', 'rajma', 'chole', 'rajma', 'sambar', 'pappu', 'curry'];
const SIDE_KEYWORDS = ['curd', 'raita', 'salad', 'chutney', 'pickle', 'papad'];
const JUNK_KEYWORDS = ['chips', 'fries', 'fried', 'samosa', 'pakora', 'bhatura', 'puri', 'jalebi', 'biscuit', 'cookie', 'cola', 'soda'];

/** Build meal history: one entry per meal, items filtered (no spices/condiments), calories = total. */
function buildMealHistoryLast4Days(
  byDay: MealHistoryByDay,
  mealTypes: string[],
  limitDays: number = 4
): MealHistoryEntry[] {
  const entries: MealHistoryEntry[] = [];
  const dates = Object.keys(byDay).sort((a, b) => b.localeCompare(a)).slice(0, limitDays);

  for (const date of dates) {
    const dayMeals = byDay[date] ?? {};
    for (const mt of mealTypes) {
      const m = dayMeals[mt];
      if (!m?.items?.length) continue;

      const items: string[] = [];
      for (const name of m.items) {
        const parsed = parseMealIntoItems(name);
        const list = parsed.length > 0 ? parsed : [name];
        for (const p of list) {
          const n = normalizeItemName(p);
          if (isMainIngredient(n)) items.push(n);
        }
      }

      if (items.length > 0) {
        entries.push({
          date,
          items: Array.from(new Set(items)).slice(0, 15),
          calories: Math.round(m.totalCalories),
        });
      }
    }
  }
  return entries;
}

/** Compute pattern summary from history for consistent suggestions. */
function computePatternSummary(
  entries: MealHistoryEntry[]
): PatternSummary {
  const counts = new Map<string, number>();
  let junkCount = 0;
  let totalCount = 0;
  const calories: number[] = [];

  for (const e of entries) {
    calories.push(e.calories);
    for (const item of e.items) {
      const n = item.toLowerCase();
      counts.set(n, (counts.get(n) ?? 0) + 1);
      totalCount++;
      if (JUNK_KEYWORDS.some((k) => n.includes(k))) junkCount++;
    }
  }

  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

  const findTop = (keywords: string[]) => {
    for (const kw of keywords) {
      const found = sorted.find(([k]) => k.includes(kw));
      if (found) return found[0];
    }
    return sorted[0]?.[0] ?? 'rice';
  };

  const junkRatio = totalCount > 0 ? junkCount / totalCount : 0;
  const snackFrequency: PatternSummary['snackFrequency'] =
    junkRatio > 0.3 ? 'high' : junkRatio > 0.1 ? 'medium' : 'low';

  return {
    baseCarb: findTop(CARB_KEYWORDS),
    commonProtein: findTop(PROTEIN_KEYWORDS),
    commonSide: findTop(SIDE_KEYWORDS),
    snackFrequency,
    avgCalories: calories.length > 0 ? Math.round(calories.reduce((a, b) => a + b, 0) / calories.length) : 0,
  };
}

function mapActivityToPrompt(level: string | undefined): ActivityForPrompt {
  const l = (level ?? 'moderate').toLowerCase();
  if (l === 'sedentary' || l === 'light') return 'low';
  if (l === 'active' || l === 'very_active') return 'high';
  return 'moderate';
}

function buildUserProfileForPrompt(ctx: UserContext): UserProfileForPrompt {
  return {
    heightCm: ctx.height ?? 0,
    weightKg: ctx.weight ?? 0,
    targetWeightKg: ctx.targetWeight ?? 0,
    age: ctx.age ?? 30,
    activityLevel: mapActivityToPrompt(ctx.activityLevel),
    goal: (ctx.goal === 'lose' || ctx.goal === 'gain' ? ctx.goal : 'maintain') as UserProfileForPrompt['goal'],
  };
}

function buildPayload(
  byDay: MealHistoryByDay,
  mealTypes: string[],
  userContext: UserContext,
  targets: { calories: number; protein: number; carbs: number; fat: number },
  preferences: string
): MealPayload {
  const mealHistoryLast4Days = buildMealHistoryLast4Days(byDay, mealTypes, 4);
  const patternSummary = computePatternSummary(mealHistoryLast4Days);
  const userProfile = buildUserProfileForPrompt(userContext);
  const today = getToday();
  const todayMeals = byDay[today] ?? {};
  const todayCalories = Object.values(todayMeals).reduce(
    (sum, meal) => sum + (meal.totalCalories || 0),
    0
  );
  const remainingCalories = Math.max(0, Math.round(targets.calories - todayCalories));

  const typesStr = mealTypes.join(', ');
  let task = `Suggest 4 ${typesStr} meals.`;
  if (preferences.trim()) task += ` ${preferences.trim()}`;

  return {
    userProfile,
    mealHistoryLast4Days,
    patternSummary,
    targets,
    todayIntake: {
      calories: Math.round(todayCalories),
      remainingCalories,
    },
    task,
  };
}

// ---------- System prompt (compressed for latency) ----------

const SYSTEM_PROMPT = `Suggest meals based on the user's recent meal history and today's remaining calorie budget.

Rules:
- Use userProfile (height, weight, age, activity level, goal) to estimate appropriate calorie ranges and portion sizes.
- Follow similar meal structure and cuisine cues from patternSummary.
- Avoid repeating identical meals.
- Improve nutrition slightly (more vegetables, fewer processed snacks).
- Respect todayIntake.remainingCalories so suggestions fit the day realistically.
- Descriptions must be under 12 words and include one practical cue (time-saving, prep style, or nutrition focus).
- Infer cuisine from foods — do not assume.
- Keep suggestions culturally relevant to the user's recent patterns unless preferences ask otherwise.
- Include estimated prepTimeMinutes and difficulty.

Return JSON only: {"suggestions":[{"name","description","calories","protein","carbs","fat","fiber","sugar","sodium","prepTimeMinutes","difficulty","mealType","ingredients","isVegetarian"}]}`;

// ---------- Data fetching ----------

export async function getMealHistory(
  userId: string,
  selectedMealTypes: string[]
): Promise<MealHistoryResultWithDates> {
  await connectDB();
  const set = new Set(selectedMealTypes.filter((t) => MEAL_TYPES.includes(t as (typeof MEAL_TYPES)[number])));
  const types = Array.from(set);
  if (types.length === 0) return { aggregated: {}, byDay: {} };

  const allFour = MEAL_TYPES.every((t) => set.has(t));
  const days = allFour ? 4 : 6;
  const todayStr = getToday();
  const startDate = (() => {
    const d = new Date(todayStr + 'T00:00:00');
    d.setDate(d.getDate() - (days - 1));
    return toLocalDateString(d);
  })();

  const logs = await DailyLog.find(
    { userId, date: { $gte: startDate, $lte: todayStr }, 'meals.0': { $exists: true } },
    { date: 1, meals: 1 }
  )
    .sort({ date: -1 })
    .lean();

  const aggregated: MealHistoryResult = {};
  for (const t of types) aggregated[t] = [];

  const byDay: MealHistoryByDay = {};

  type LogRow = { date: string; meals?: { name?: string; mealType?: string; calories?: number }[] };
  for (const log of logs as LogRow[]) {
    const date = log.date;
    if (!byDay[date]) byDay[date] = {};

    for (const meal of log.meals || []) {
      const mt = meal.mealType;
      const name = (meal.name || '').trim();
      const calories = meal.calories ?? 0;
      if (mt && set.has(mt) && name) {
        aggregated[mt].push(name);
        if (!byDay[date][mt]) byDay[date][mt] = { items: [], totalCalories: 0 };
        byDay[date][mt].items.push(name);
        byDay[date][mt].totalCalories += calories;
      }
    }
  }

  return { aggregated, byDay };
}

export async function getUserProfileForMealIdeas(userId: string): Promise<UserContext> {
  await connectDB();
  const user = await User.findById(userId).select('profile').lean();
  const profile = user?.profile as {
    height?: number;
    weight?: number;
    targetWeight?: number;
    activityLevel?: string;
    goal?: string;
    gender?: string;
    dateOfBirth?: Date | string;
    age?: number;
  } | undefined;

  if (!profile) return {};

  let age: number | undefined;
  if (profile.dateOfBirth) {
    age = getAgeFromDateOfBirth(profile.dateOfBirth);
  } else if (typeof profile.age === 'number' && profile.age >= 13) {
    age = profile.age;
  }

  return {
    height: profile.height,
    weight: profile.weight,
    targetWeight: profile.targetWeight,
    activityLevel: profile.activityLevel ?? 'moderate',
    goal: profile.goal ?? 'maintain',
    age,
  };
}

async function computeTargets(profile: UserContext, userId: string): Promise<typeof DEFAULT_TARGETS> {
  const weight = profile.weight ?? 0;
  const height = profile.height ?? 0;
  const activityLevel = (profile.activityLevel ?? 'moderate') as ActivityLevel;
  const goal = (profile.goal ?? 'maintain') as Goal;

  if (weight <= 0 || height <= 0) return DEFAULT_TARGETS;

  await connectDB();
  const user = await User.findById(userId).select('profile').lean();
  const p = user?.profile as { gender?: string; dateOfBirth?: Date | string; age?: number } | undefined;
  if (!p) return DEFAULT_TARGETS;

  let age: number;
  if (p.dateOfBirth) {
    age = getAgeFromDateOfBirth(p.dateOfBirth);
  } else if (typeof p.age === 'number' && p.age >= 13) {
    age = p.age;
  } else {
    age = 30;
  }

  const gender = (p.gender ?? 'male') as Gender;
  return computeMealTargets(weight, height, age, gender, activityLevel, goal);
}

// ---------- OpenAI API call ----------

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<{ content: unknown; usage?: UsageInfo; latencyMs: number }> {
  const start = Date.now();
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 450,
      response_format: { type: 'json_object' as const },
    }),
  });

  const latencyMs = Date.now() - start;

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const status = res.status;
    const rawMessage: string | undefined = (err as { error?: { message?: string } }).error?.message;
    if (status === 401 || status === 403) {
      throw new Error(
        'Your OpenAI API key looks invalid or expired. Update it in Settings → API Keys.'
      );
    }
    if (status >= 500) {
      throw new Error('AI service is temporarily unavailable. Please try again in a few minutes.');
    }
    throw new Error(rawMessage || `OpenAI API error: ${status}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const rawContent = (data.choices?.[0]?.message?.content ?? '').trim();
  const usage = data.usage
    ? { prompt_tokens: data.usage.prompt_tokens, completion_tokens: data.usage.completion_tokens }
    : undefined;

  if (!rawContent) {
    throw new Error('AI returned empty response. Try again.');
  }

  let content: unknown;
  try {
    content = JSON.parse(rawContent);
  } catch {
    throw new Error('AI returned invalid response. Please try again.');
  }
  return { content, usage, latencyMs };
}

export async function getMealIdeas(
  userId: string,
  selectedMealTypes: string[],
  preferences: string
): Promise<{ suggestions: MealSuggestion[]; debugLog: AIDebugLog }> {
  const requestedAt = new Date().toISOString();
  const apiKey = await resolveOpenAIKey(userId);
  if (!apiKey) {
    throw new Error(
      'OpenAI API key required. Add your key in Settings to enable AI features.'
    );
  }

  const [userContext, { byDay: mealHistoryByDay }] = await Promise.all([
    getUserProfileForMealIdeas(userId),
    getMealHistory(userId, selectedMealTypes),
  ]);

  const targets = await computeTargets(userContext, userId);
  const payload = buildPayload(
    mealHistoryByDay,
    selectedMealTypes,
    userContext,
    targets,
    preferences
  );

  const userPrompt = JSON.stringify(payload);
  const result = await callOpenAI(apiKey, SYSTEM_PROMPT, userPrompt);

  let suggestions: MealSuggestion[] = [];
  try {
    const parsed = result.content as { suggestions?: MealSuggestion[] };
    suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
  } catch {
    // keep suggestions [] if parse failed
  }

  const debugLog: AIDebugLog = {
    userRequest: { selectedMealTypes, preferences, requestedAt },
    mealHistoryByDay,
    userContext,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    response: JSON.stringify(result.content),
    metadata: {
      model: MODEL,
      usage: result.usage,
      latencyMs: result.latencyMs,
      timestamp: new Date().toISOString(),
    },
  };

  return { suggestions, debugLog };
}
