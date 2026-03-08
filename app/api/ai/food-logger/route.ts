// ============================================
// /api/ai/food-logger - AI Food Logger (Two-Step SOTA Pipeline)
// ============================================
// Architecture: User Text → [Step 1: Parse] → Structured Items → [Step 2: Nutrition] → Final Output
//
// Step 1: Food parser only — extracts items (name, quantity, unit). No nutrition. Reduces hallucination.
// Step 2: Nutrition engine — takes parsed items, uses web_search, computes macros. Deterministic scaling.
//
// Benefits: smaller prompts, stable parsing, fewer wrong quantities, production-grade pipeline.
// Requires user's OpenAI API key or server default.

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { decrypt } from '@/lib/encryption';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

async function getOpenAIKey(userId: string): Promise<string | null> {
  await connectDB();
  const user = await User.findById(userId).select('+apiKeys.openai').lean();
  const apiKeys = user?.apiKeys as { openai?: string } | undefined;

  if (apiKeys?.openai) {
    try {
      return decrypt(apiKeys.openai);
    } catch (err) {
      console.error('[AI Food Logger Encryption Error]: Failed to decrypt user OpenAI key', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
      // Fall through to server-level key or null so we don't crash the route
    }
  }

  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  return null;
}

// ============================================
// STEP 1 — Meal Understanding (Food Parser)
// ============================================
// Only extracts foods. No nutrition, no calories. Reduces hallucination.

const PARSE_INSTRUCTIONS = `
You are a food parsing engine for a global nutrition tracking app.

The user may describe meals from ANY cuisine (Indian, American, European, Asian, etc.).

Your task is ONLY to identify the foods eaten.

Rules:
- Break the meal into distinct food items.
- Separate combined foods when possible (e.g., "idli with sambar" → idli + sambar).
- Identify quantity if mentioned.
- If quantity is missing, use quantity = 1 and unit = "serving".
- Use standard units: piece, bowl, serving, cup, g, ml, tbsp, tsp.
- Include all items mentioned, even small ones (sauces, oil, chutney, milk).

Return JSON only using tool: parse_meal_foods
`;

const PARSE_MEAL_TOOL = {
  type: 'function' as const,
  name: 'parse_meal_foods',
  description: 'Extract distinct food items from the meal description. No nutrition.',
  strict: true,
  parameters: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: 'List of distinct food and drink items.',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Food item name (e.g. "sambar rice", "chips", "curd rice").' },
            quantity: { type: 'number', description: 'Numeric quantity (e.g. 2 for "2 idlis"). Use 1 if unknown.' },
            unit: { type: 'string', description: 'Unit: piece, bowl, serving, cup, ml, g, tbsp, tsp, etc.' },
          },
          required: ['name', 'quantity', 'unit'],
          additionalProperties: false,
        },
      },
    },
    required: ['items'],
    additionalProperties: false,
  },
} as const;

// ============================================
// STEP 2 — Nutrition Calculation
// ============================================
// Takes structured items, computes nutrition. Deterministic scaling.
// Quantity and unit must be preserved from input (no changing 200 g → 1 serving).

const NUTRITION_INSTRUCTIONS = `
You calculate nutrition for foods.

Input: structured items with name, quantity, unit.

Rules:
- Estimate nutrition per item; scale using the given quantity.
- calories = (protein × 4) + (carbs × 4) + (fat × 9). Round macros to 2 decimals.
- Never change the quantity or unit provided in the input. Return the same quantity and unit for each item.
- If fiber, sugar, sodium, saturatedFat, or cholesterol are unknown, return 0.

Return JSON only using tool: get_meal_nutrition
`;

const MEAL_NUTRITION_TOOL = {
  type: 'function' as const,
  name: 'get_meal_nutrition',
  description:
    'Estimate nutrition for each item. Use web_search if needed. Return same quantity and unit as input; scale nutrition by quantity.',
  strict: true,
  parameters: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description:
          'List of ALL distinct food and drink items in the described meal, each with its own nutrition and quantity.',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description:
                'Short human-readable item name (e.g. "idli", "sambar", "chicken sandwich", "fries").',
            },
            calories: {
              type: 'number',
              description: 'Total energy in kilocalories for this ONE item (after scaling by quantity).',
            },
            protein: {
              type: 'number',
              description: 'Total protein in grams for this item.',
            },
            carbs: {
              type: 'number',
              description: 'Total carbohydrates in grams for this item.',
            },
            fat: {
              type: 'number',
              description: 'Total fat in grams for this item.',
            },
            fiber: {
              type: 'number',
              description: 'Total dietary fiber in grams for this item. Use 0 if unknown.',
            },
            sugar: {
              type: 'number',
              description: 'Total sugars in grams for this item. Use 0 if unknown.',
            },
            sodium: {
              type: 'number',
              description: 'Total sodium in milligrams for this item. Use 0 if unknown.',
            },
            saturatedFat: {
              type: 'number',
              description: 'Total saturated fat in grams for this item. Use 0 if unknown.',
            },
            cholesterol: {
              type: 'number',
              description: 'Total cholesterol in milligrams for this item. Use 0 if unknown.',
            },
            quantity: {
              type: 'number',
              description:
                'Must match the input quantity exactly (e.g. input 200 g → quantity 200). Do not change to 1 or serving.',
            },
            unit: {
              type: 'string',
              description:
                'Must match the input unit exactly (e.g. g, ml, piece, serving). Do not change the unit from the input.',
            },
          },
          required: [
            'name',
            'calories',
            'protein',
            'carbs',
            'fat',
            'fiber',
            'sugar',
            'sodium',
            'saturatedFat',
            'cholesterol',
            'quantity',
            'unit',
          ],
          additionalProperties: false,
        },
      },
    },
    required: ['items'],
    additionalProperties: false,
  },
} as const;

function extractJsonFromText(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const jsonBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = jsonBlock ? jsonBlock[1].trim() : trimmed;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

type NormalizedItem = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  saturatedFat: number;
  cholesterol: number;
  quantity: number;
  unit: string;
};

function normalizeItem(obj: Record<string, unknown>): NormalizedItem {
  const num = (v: unknown) =>
    typeof v === 'number' && !Number.isNaN(v) ? v : 0;
  const str = (v: unknown) =>
    typeof v === 'string' ? v : String(v ?? '');

  const protein = Math.max(0, num(obj.protein));
  const carbs = Math.max(0, num(obj.carbs));
  const fat = Math.max(0, num(obj.fat));
  const calories = Math.round((protein * 4) + (carbs * 4) + (fat * 9));

  return {
    name: str(obj.name).trim() || 'Item',
    calories,
    protein: Number(protein.toFixed(2)),
    carbs: Number(carbs.toFixed(2)),
    fat: Number(fat.toFixed(2)),
    fiber: Math.max(0, num(obj.fiber)),
    sugar: Math.max(0, num(obj.sugar)),
    sodium: Math.max(0, num(obj.sodium)),
    saturatedFat: Math.max(0, num(obj.saturatedFat)),
    cholesterol: Math.max(0, num(obj.cholesterol)),
    quantity: Math.max(0.1, num(obj.quantity)) || 1,
    unit: str(obj.unit).trim() || 'serving',
  };
}

function computeTotal(items: NormalizedItem[]) {
  return {
    calories: items.reduce((s, i) => s + i.calories, 0),
    protein: items.reduce((s, i) => s + i.protein, 0),
    carbs: items.reduce((s, i) => s + i.carbs, 0),
    fat: items.reduce((s, i) => s + i.fat, 0),
    fiber: items.reduce((s, i) => s + i.fiber, 0),
    sugar: items.reduce((s, i) => s + i.sugar, 0),
    sodium: items.reduce((s, i) => s + i.sodium, 0),
    saturatedFat: items.reduce((s, i) => s + i.saturatedFat, 0),
    cholesterol: items.reduce((s, i) => s + i.cholesterol, 0),
  };
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const { text } = await req.json();
    if (!text || typeof text !== 'string' || !text.trim()) {
      return errorResponse('Text description of the meal is required', 400);
    }

    const apiKey = await getOpenAIKey(userId);
    if (!apiKey) {
      return errorResponse(
        'OpenAI API key required. Add your key in Settings to enable AI Food Logger.',
        403
      );
    }

    const mealText = text.trim();
    const requestedAt = new Date().toISOString();
    const startMs = Date.now();

    // ——— STEP 1: Parse meal text → structured food items only ———
    const parseRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        instructions: PARSE_INSTRUCTIONS,
        input: `User text: ${mealText}`,
        tools: [PARSE_MEAL_TOOL],
        tool_choice: { type: 'function', name: 'parse_meal_foods' },
        temperature: 0.2,
        max_output_tokens: 1024,
      }),
    });

    if (!parseRes.ok) {
      const err = await parseRes.json().catch(() => ({}));
      const status = parseRes.status;
      const apiError = (err as { error?: { message?: string } })?.error;
      const rawMessage = apiError?.message;

      if (status === 401 || status === 403) {
        return errorResponse(
          'Your OpenAI API key looks invalid or expired. Update it in Settings → API Keys.',
          400
        );
      }

      if (status >= 500) {
        return errorResponse(
          'AI service is temporarily unavailable. Please try again in a few minutes.',
          502
        );
      }

      return errorResponse(rawMessage || `OpenAI API error: ${status}`, 400);
    }

    const parseData = (await parseRes.json()) as {
      output?: Array<{ type?: string; name?: string; arguments?: string }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; input_tokens?: number; output_tokens?: number };
      error?: { message?: string };
    };

    if (parseData.error?.message) {
      return errorResponse(parseData.error.message, 400);
    }

    const parseToolCall = (parseData.output ?? []).find(
      (item) => item.type === 'function_call' && item.name === 'parse_meal_foods'
    );

    if (!parseToolCall || typeof parseToolCall.arguments !== 'string') {
      return errorResponse(
        'Could not parse meal description. Try listing items clearly (e.g. "2 idlis, sambar, curd rice").',
        422
      );
    }

    const parsedArgs = extractJsonFromText(parseToolCall.arguments);
    if (!parsedArgs || !Array.isArray(parsedArgs.items) || parsedArgs.items.length === 0) {
      return errorResponse(
        'Could not extract food items from the description. Try listing each item (e.g. "100g rice, 2 chapatis").',
        422
      );
    }

    type ParsedItem = { name: string; quantity: number; unit: string };
    const parsedItems: ParsedItem[] = parsedArgs.items
      .filter((x): x is Record<string, unknown> => x != null && typeof x === 'object')
      .map((x) => ({
        name: String(x.name ?? '').trim() || 'Item',
        quantity: typeof x.quantity === 'number' && !Number.isNaN(x.quantity) ? Math.max(0.1, x.quantity) : 1,
        unit: String(x.unit ?? 'serving').trim() || 'serving',
      }))
      .filter((i) => i.name && i.name !== 'Item');

    if (parsedItems.length === 0) {
      return errorResponse(
        'Could not extract any food items. Try describing the meal in more detail.',
        422
      );
    }

    // ——— STEP 2: Compute nutrition for parsed items ———
    const nutritionInput = JSON.stringify({ items: parsedItems }, null, 2);

    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        instructions: NUTRITION_INSTRUCTIONS,
        input: `Input:\n${nutritionInput}`,
        tools: [
          MEAL_NUTRITION_TOOL,
          {
            type: 'web_search',
            user_location: { type: 'approximate' as const },
            search_context_size: 'medium' as const,
          },
        ],
        tool_choice: { type: 'function', name: 'get_meal_nutrition' },
        temperature: 0.2,
        max_output_tokens: 4096,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const status = res.status;
      const apiError = (err as { error?: { message?: string } })?.error;
      const rawMessage = apiError?.message;

      if (status === 401 || status === 403) {
        return errorResponse(
          'Your OpenAI API key looks invalid or expired. Update it in Settings → API Keys.',
          400
        );
      }

      if (status >= 500) {
        return errorResponse(
          'AI service is temporarily unavailable. Please try again in a few minutes.',
          502
        );
      }

      return errorResponse(rawMessage || `OpenAI API error: ${status}`, 400);
    }

    const data = (await res.json()) as {
      output?: Array<{
        type?: string;
        name?: string;
        arguments?: string;
        role?: string;
        content?: Array<{ type?: string; text?: string }>;
      }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; input_tokens?: number; output_tokens?: number };
      error?: { message?: string };
    };

    if (data.error?.message) {
      return errorResponse(data.error.message, 400);
    }

    const toolCall = (data.output ?? []).find(
      (item) => item.type === 'function_call' && item.name === 'get_meal_nutrition'
    );

    if (!toolCall || typeof toolCall.arguments !== 'string') {
      return errorResponse(
        'Could not parse nutrition data from AI response. Try describing the meal in more detail.',
        422
      );
    }

    const nutritionArgs = extractJsonFromText(toolCall.arguments);

    if (!nutritionArgs) {
      return errorResponse(
        'Could not parse nutrition data from AI response. Try describing the meal in more detail.',
        422
      );
    }

    const rawItems = Array.isArray(nutritionArgs.items) ? nutritionArgs.items : [];
    let items: NormalizedItem[] = rawItems
      .filter((x): x is Record<string, unknown> => x != null && typeof x === 'object')
      .map(normalizeItem)
      .filter((i) => (i.name && i.name !== 'Item') || i.calories > 0);

    // Safeguard: preserve quantity and unit from Step-1; scale nutrition if model used different quantity
    for (let i = 0; i < items.length && i < parsedItems.length; i++) {
      const parsed = parsedItems[i];
      const current = items[i];
      const scale = current.quantity > 0 ? parsed.quantity / current.quantity : 1;
      const protein = Number((current.protein * scale).toFixed(2));
      const carbs = Number((current.carbs * scale).toFixed(2));
      const fat = Number((current.fat * scale).toFixed(2));
      items[i] = {
        ...current,
        quantity: parsed.quantity,
        unit: parsed.unit,
        protein,
        carbs,
        fat,
        calories: Math.round(protein * 4 + carbs * 4 + fat * 9),
        fiber: Number((current.fiber * scale).toFixed(2)),
        sugar: Number((current.sugar * scale).toFixed(2)),
        sodium: Math.round(current.sodium * scale),
        saturatedFat: Number((current.saturatedFat * scale).toFixed(2)),
        cholesterol: Math.round(current.cholesterol * scale),
      };
    }

    if (items.length === 0) {
      return errorResponse(
        'Could not parse any food items from the description. Try listing each item clearly (e.g. "100g rice, 50ml dal, 2 chapatis").',
        422
      );
    }

    // Guard against pathological cases where the AI returns zero calories and zero macros
    // for every item. In that scenario it is safer to fail than to silently log zeros.
    const allZeroNutrition = items.every(
      (item) =>
        item.calories === 0 &&
        item.protein === 0 &&
        item.carbs === 0 &&
        item.fat === 0
    );

    if (allZeroNutrition) {
      return errorResponse(
        'AI could not reliably estimate nutrition for this description. Try adding more detail (quantities, units, item names).',
        422
      );
    }

    const total = computeTotal(items);
    const latencyMs = Date.now() - startMs;

    const payload: { items: NormalizedItem[]; total: ReturnType<typeof computeTotal>; debugLog?: unknown } = {
      items,
      total,
    };
    if (process.env.NEXT_PUBLIC_DEBUG_MODE === 'true') {
      const step1Usage = parseData.usage;
      const step2Usage = data.usage;
      const pt = (u: typeof step1Usage) => (u?.prompt_tokens ?? u?.input_tokens ?? 0);
      const ct = (u: typeof step1Usage) => (u?.completion_tokens ?? u?.output_tokens ?? 0);
      const combinedUsage = step1Usage && step2Usage
        ? {
            prompt_tokens: pt(step1Usage) + pt(step2Usage),
            completion_tokens: ct(step1Usage) + ct(step2Usage),
          }
        : step2Usage ?? step1Usage;

      payload.debugLog = {
        userRequest: { text: mealText, requestedAt },
        step1: {
          prompt: `User text: ${mealText}`,
          instructions: PARSE_INSTRUCTIONS,
          response: JSON.stringify({ items: parsedItems }, null, 2),
          parsedItems,
          usage: step1Usage,
        },
        step2: {
          prompt: nutritionInput,
          instructions: NUTRITION_INSTRUCTIONS,
          response: toolCall.arguments,
          finalItems: items,
          total,
          usage: step2Usage,
        },
        metadata: {
          model: 'gpt-4o',
          usage: combinedUsage,
          step1Usage,
          step2Usage,
          latencyMs,
          timestamp: new Date().toISOString(),
          status: 'success',
          pipeline: 'two-step',
        },
      };
    }
    return maskedResponse(payload);
  } catch (err) {
    console.error('[AI Food Logger Error]:', err);
    const message =
      err instanceof Error && err.message
        ? err.message
        : 'Failed to get nutrition from AI';
    return errorResponse(message, 500);
  }
}
