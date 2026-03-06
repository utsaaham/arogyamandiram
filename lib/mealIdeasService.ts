// ============================================
// Meal Ideas Service — Smart history + two-step AI
// ============================================
// Server-only: uses DailyLog and OpenAI.
// Orchestrates getMealHistory → interest extraction → meal suggestions.

import connectDB from '@/lib/db';
import DailyLog from '@/models/DailyLog';
import { resolveOpenAIKey } from '@/lib/openaiKey';
import { getToday, toLocalDateString } from '@/lib/utils';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const MODEL = 'gpt-4o-mini';

export type MealHistoryResult = Record<string, string[]>;

export interface MealSuggestion {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: string;
  ingredients: string[];
  isVegetarian: boolean;
}

export interface UsageInfo {
  prompt_tokens?: number;
  completion_tokens?: number;
}

export interface AIDebugLog {
  userRequest: { selectedMealTypes: string[]; preferences: string; requestedAt: string };
  mealHistorySent: MealHistoryResult;
  step1Prompt: string;
  step1Response: string;
  step2Prompt: string;
  step2Response: string;
  metadata: {
    model: string;
    step1Usage?: UsageInfo;
    step2Usage?: UsageInfo;
    step1LatencyMs: number;
    step2LatencyMs: number;
    timestamp: string;
  };
}

/** Day range: all 4 types → 2 days; otherwise 6 days per selected type. */
export async function getMealHistory(
  userId: string,
  selectedMealTypes: string[]
): Promise<MealHistoryResult> {
  await connectDB();
  const set = new Set(selectedMealTypes.filter((t) => MEAL_TYPES.includes(t as (typeof MEAL_TYPES)[number])));
  const types = Array.from(set);
  if (types.length === 0) return {};

  const allFour = MEAL_TYPES.every((t) => set.has(t));
  const days = allFour ? 2 : 6;
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

  const result: MealHistoryResult = {};
  for (const t of types) result[t] = [];

  type LogRow = { date: string; meals?: { name?: string; mealType?: string }[] };
  for (const log of logs as LogRow[]) {
    for (const meal of log.meals || []) {
      const mt = meal.mealType;
      const name = (meal.name || '').trim();
      if (mt && set.has(mt) && name) result[mt].push(name);
    }
  }

  return result;
}

/** Format history for the interest-extraction prompt. Empty arrays get "No history available for [type]." */
export function buildInterestExtractionPrompt(history: MealHistoryResult): string {
  const lines: string[] = [];
  const labels: Record<string, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack',
  };
  for (const [type, items] of Object.entries(history)) {
    const label = labels[type] ?? type;
    if (items.length === 0) {
      lines.push(`No history available for ${label}.`);
    } else {
      lines.push(`${label}: ${items.join(', ')}`);
    }
  }
  return lines.join('\n');
}

/** Build Step 2 prompt with interests, preferences, and meal types. */
export function buildMealSuggestionPrompt(
  interests: string,
  preferences: string,
  mealTypes: string[]
): string {
  const typesList = mealTypes.join(', ');
  return `You are a meal planning assistant. Based on the user's food interests and preferences below, suggest 4-6 meal ideas for: ${typesList}.

User Interests (extracted from history): ${interests}
User Stated Preferences: ${preferences || '(none specified)'}
Meal Types Requested: ${typesList}

For each suggestion include: meal name, brief description (with why it matches the user's taste profile and rough prep time), calories, protein, carbs, fat, mealType (one of breakfast/lunch/dinner/snack), ingredients (array of strings), and isVegetarian (boolean). Focus on Indian cuisine where appropriate.`;
}

async function callOpenAIWithMeta(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  jsonMode: boolean = true
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
      temperature: 0.7,
      max_tokens: 1500,
      ...(jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
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
  const rawContent = data.choices?.[0]?.message?.content ?? '';
  const usage = data.usage
    ? { prompt_tokens: data.usage.prompt_tokens, completion_tokens: data.usage.completion_tokens }
    : undefined;
  const content = jsonMode ? JSON.parse(rawContent) : rawContent;
  return { content, usage, latencyMs };
}

/** Orchestrates: getMealHistory → Step 1 (extract interests) → Step 2 (suggestions). Returns suggestions and debugLog. */
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

  const mealHistorySent = await getMealHistory(userId, selectedMealTypes);
  const historyText = buildInterestExtractionPrompt(mealHistorySent);

  const step1System = 'You extract food preferences from meal history. Be concise and structured.';
  const step1User = `Based on the following meal history, extract this user's food preferences, cuisines they enjoy, ingredients they frequently use, and any dietary patterns. Be concise and structured.

Meal History:
${historyText}`;

  const step1 = await callOpenAIWithMeta(apiKey, step1System, step1User, false);
  const step1Response = typeof step1.content === 'string' ? step1.content : JSON.stringify(step1.content);

  const step2System = `You are a nutritionist AI for an Indian health app. Always respond with valid JSON: { "suggestions": [{ "name": string, "description": string, "calories": number, "protein": number, "carbs": number, "fat": number, "mealType": "breakfast"|"lunch"|"dinner"|"snack", "ingredients": string[], "isVegetarian": boolean }] }. Include 4-6 suggestions. Focus on Indian cuisine.`;
  const step2User = buildMealSuggestionPrompt(step1Response, preferences, selectedMealTypes);
  const step2 = await callOpenAIWithMeta(apiKey, step2System, step2User, true);

  let suggestions: MealSuggestion[] = [];
  const step2ResponseStr = JSON.stringify(step2.content);
  try {
    const parsed = step2.content as { suggestions?: MealSuggestion[] };
    suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
  } catch {
    // keep suggestions [] if parse failed
  }

  const debugLog: AIDebugLog = {
    userRequest: { selectedMealTypes, preferences, requestedAt },
    mealHistorySent,
    step1Prompt: step1User,
    step1Response,
    step2Prompt: step2User,
    step2Response: step2ResponseStr,
    metadata: {
      model: MODEL,
      step1Usage: step1.usage,
      step2Usage: step2.usage,
      step1LatencyMs: step1.latencyMs,
      step2LatencyMs: step2.latencyMs,
      timestamp: new Date().toISOString(),
    },
  };

  return { suggestions, debugLog };
}
