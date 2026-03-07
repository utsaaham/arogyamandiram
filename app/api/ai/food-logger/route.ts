// ============================================
// /api/ai/food-logger - AI Food Logger with Web Search
// ============================================
// Uses OpenAI Responses API with web_search to get nutrition for user-described meals.
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

const INSTRUCTIONS = `
You are a precision nutrition assistant for an Indian-focused health app.

The user will describe what they ate (e.g. "2 idlis and sambar, chicken sandwich and fries").

Your job is to produce a LIST of distinct food and drink items with per-item nutrition using the following strict rules:

1) INGREDIENT COMPLETENESS RULE
- Parse the description into ALL distinct food and drink items with their quantities and units.
- EVERY mentioned item MUST be included as its own entry in the items array.
- You MUST NOT ignore any ingredient, even very small amounts (e.g. 20 ml milk, 40 ml milk, 1 tsp oil, a small chutney serving, etc.).
- Water has 0 macros but must still be considered as an item (it will not change totals).
- Example: "2 idlis and sambar, chicken sandwich and fries" MUST become at least:
  - 2 idlis
  - sambar
  - chicken sandwich
  - fries

2) STRICT QUANTITY SCALING RULE
- For EACH item, use web_search when needed to find accurate nutrition.
- If nutrition is given per 100 g or 100 ml, you MUST scale linearly to the exact quantity consumed.
  Example: if milk has 3.2 g protein per 100 ml and the user had 40 ml:
  protein_for_milk = 3.2 × (40 / 100) = 1.28 g
- If nutrition is given per serving, scale proportionally when multiple servings or partial servings are implied.
- You MUST always perform explicit proportional math internally for calories, protein, carbs, fat, fiber, sugar, sodium, saturatedFat, and cholesterol for each item before aggregation.

3) AGGREGATION RULE
- After computing per-item nutrition, aggregate ALL items into ONE combined meal.
- For the final meal, SUM across all items:
  - protein
  - carbs
  - fat
  - fiber
  - sugar
  - sodium
  - saturatedFat
  - cholesterol
- Never return macros or calories that only reflect the main or largest item; the totals MUST include contributions from every item, including small ones.

4) CALORIE VALIDATION RULE (MANDATORY)
- After aggregating protein, carbs, and fat for the combined meal, recompute calories using:
  calories_from_macros = (protein × 4) + (carbs × 4) + (fat × 9)
- The reported calories field in the final object MUST match calories_from_macros within ±5 kcal.
- If there is any mismatch larger than 5 kcal, you MUST adjust the final calories value so that it equals calories_from_macros (rounded to the nearest whole number).

5) DETERMINISTIC OUTPUT RULE
- Do not estimate loosely; always choose reasonable, standard reference values and apply strict proportional math.
- Avoid random variation between runs for the same input.
- Round all macro fields (protein, carbs, fat, fiber, sugar, sodium, saturatedFat, cholesterol) to 2 decimal places in the final output.
- Round calories in the final output to the nearest whole number.

6) RESPONSE FORMAT RULE
- You MUST respond ONLY by calling the function tool "get_meal_nutrition".
- Return an object with an "items" array. Each element in "items" is ONE food or drink item from the meal description with its own nutrition.
- Do NOT return any free-form text, markdown, code blocks, or explanations outside the function call.
`;

const MEAL_NUTRITION_TOOL = {
  type: 'function' as const,
  name: 'get_meal_nutrition',
  description:
    'Compute nutrition for ALL distinct items in the described meal, using web_search as needed. Return a list of items with per-item nutrition.',
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
                'Quantity multiplier for this item (e.g. 2 idlis, 1 bowl of sambar, 1 sandwich). Use 1 for a typical single portion.',
            },
            unit: {
              type: 'string',
              description:
                'High-level unit describing the amount for this item, like "piece", "bowl", "sandwich", "serving", etc.',
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

    const userMessage = `The user ate: "${text.trim()}". List EACH food and drink item separately with its own nutrition (per-item calories, protein, carbs, fat, etc.). Return an "items" array with one object per item.`;
    const requestedAt = new Date().toISOString();
    const startMs = Date.now();

    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        instructions: INSTRUCTIONS,
        input: userMessage,
        tools: [
          MEAL_NUTRITION_TOOL,
          {
            type: 'web_search',
            user_location: { type: 'approximate' as const },
            search_context_size: 'medium' as const,
          },
        ],
        tool_choice: {
          type: 'function',
          name: 'get_meal_nutrition',
        },
        temperature: 0.3,
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

    const parsedArgs = extractJsonFromText(toolCall.arguments);

    if (!parsedArgs) {
      return errorResponse(
        'Could not parse nutrition data from AI response. Try describing the meal in more detail.',
        422
      );
    }

    const rawItems = Array.isArray(parsedArgs.items) ? parsedArgs.items : [];
    const items: NormalizedItem[] = rawItems
      .filter((x): x is Record<string, unknown> => x != null && typeof x === 'object')
      .map(normalizeItem)
      .filter((i) => (i.name && i.name !== 'Item') || i.calories > 0);

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
      const usage = (data as { usage?: { prompt_tokens?: number; completion_tokens?: number } }).usage;
      payload.debugLog = {
        userRequest: { text: text.trim(), requestedAt },
        instructions: INSTRUCTIONS,
        prompt: userMessage,
        response: toolCall.arguments,
        metadata: {
          model: 'gpt-4o',
          usage: usage ? { prompt_tokens: usage.prompt_tokens, completion_tokens: usage.completion_tokens } : undefined,
          latencyMs,
          timestamp: new Date().toISOString(),
          status: 'success',
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
