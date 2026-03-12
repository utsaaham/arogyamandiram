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
You are a precision food parsing engine for a global nutrition tracking app.

Parse the user's meal into distinct food items from any cuisine worldwide.
Correct spelling errors silently (e.g. "pulov" → "veg pulao", "raitha" → "raita").

Rules:
- Split only clearly separate dishes/sides ("burger with fries" → 2 items).
- For combo text with add-ons/sides (e.g. "burger with fries and coke", "grilled cheese with 2 sauce packets"), split into separate items when each component is eaten separately.
- Keep ingredients mentioned inside a dish as part of that item, not separate
  ("pulao with cashews" → 1 item, "raita with onion" → 1 item).
- Include key ingredients in the item name so Step 2 can estimate nutrition accurately
  ("veg pulao with cashews and soya chunks" not just "veg pulao").
- Preserve known brand names in item names when present (e.g. Vadilal, Haldiram's, MTR, Amul, Dunkin, McDonald's, KFC, Domino's).
- Normalize obvious misspellings of brand names while preserving brand context.
- If quantity is missing, use quantity = 1 and unit = "serving".
- For piece-count items (chips, cookies, crackers, nuggets), always convert to grams
  using standard per-piece weights:
    tortilla chip   → 2.5 g/piece
    potato chip     → 1.5 g/piece
    cracker         → 3 g/piece
    cookie          → 15 g/piece
    nugget          → 18 g/piece
  E.g. "25 tortilla chips" → quantity: 62, unit: "g"
- Units: piece, bowl, serving, cup, g, ml, tbsp, tsp.

- If the user specifies weight per piece (e.g. "3 dosa each 65g", "2 cookies (30g each)"):
  - Set quantity to the piece count (e.g. 3) and unit to a normalized unit such as "piece".
  - Always include a numeric field "each_weight_g" with the weight of ONE piece in grams (e.g. 65).
  - If the user does NOT specify weight per piece, still include "each_weight_g" and set it to 0.
  - Do NOT embed the per-piece weight into the name string.
  Example:
    Input text: "3 dosa each 65g and 20g mango pickle"
    Parsed items:
      - { "name": "dosa with jeera and masala powder", "quantity": 3, "unit": "piece", "each_weight_g": 65 }
      - { "name": "mango pickle", "quantity": 20, "unit": "g" }

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
            each_weight_g: {
              type: 'number',
              description:
                'If the user specified weight per piece (e.g. "3 dosa each 65g"), this is the weight of ONE piece in grams. If not specified, set to 0.',
            },
          },
          required: ['name', 'quantity', 'unit', 'each_weight_g'],
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
You are a clinical-grade nutrition engine for a food tracking app.

Input: structured items with:
  - name (string)
  - quantity (number)
  - unit (string)
  - each_weight_g (number)
  - total_weight_g (number or null)

each_weight_g is ALWAYS present:
- if each_weight_g > 0, the user specified weight per piece
- if each_weight_g = 0, no per-piece weight was provided in the text

total_weight_g is computed by the system:
- if total_weight_g is not null, it already represents the total grams for the item
- if total_weight_g is null, there is no reliable total grams from per-piece weights

If total_weight_g is not null:
  - Always use total_weight_g when estimating nutrition for the TOTAL amount eaten.
  - Do NOT recompute total_weight_g from quantity × each_weight_g.
  - Do NOT change the quantity or unit in your output.

Units will already be normalized to one of: piece, bowl, serving, cup, g, ml, tbsp, tsp.

━━━ MACRO & MICRONUTRIENT RULES ━━━
1. Normalize the food name to its closest standard food.
   Strip purely descriptive qualifiers that don't affect nutrition.
   E.g. "veg pulao with veggies masala" → "veg pulao with soya chunks and cashews"
        "raita with onion and tomato" → "raita"

2. Estimate macros and micros using USDA, IFCT (Indian Food Composition Tables),
   or well-known brand data — whichever is most specific.

3. Scale ALL nutrients to the given quantity and unit.
   Never change the quantity or unit from the input.
   ALL returned nutrition values (calories, protein, carbs, fat, fiber, sugar,
   sodium, saturatedFat, cholesterol) MUST represent the TOTAL for the provided
   quantity and unit. Never return per-unit, per-serving, or per-100g nutrition.

   For piece items, return TOTAL for all pieces.
   Example: quantity=3, unit=piece, dosa (~130 kcal each) => calories should be ~390 total, not ~130.
   If total_weight_g is provided, base nutrition on total_weight_g for the whole eaten quantity.

4. Calorie integrity check:
   calories = (protein × 4) + (carbs × 4) + (fat × 9)
   If your computed calories deviate from this formula by more than 3%,
   adjust the macro with the highest uncertainty (usually carbs or fat) until the equation holds.

5. NEVER return 0 for fiber, sugar, sodium, saturatedFat, or cholesterol
   unless the nutrient is genuinely negligible (e.g. cholesterol in pure sugar).
   Always estimate realistic typical values from food composition data.

━━━ OUTPUT RULES ━━━
6. Return protein, carbs, fat rounded to 2 decimal places.
7. Return sodium and cholesterol as whole numbers (mg).
8. Return the same quantity and unit as the input — no exceptions.
9. Units in your output must be one of: piece, bowl, serving, cup, g, ml, tbsp, tsp.
10. Add:
   - confidence: "high" | "medium" | "low"
   - sourceType: "brand_label" | "restaurant_db" | "ifct_usda_estimate"
   - preparationType: "homemade" | "restaurant" | "packaged" | "unknown"

Return JSON only using tool: get_meal_nutrition
`;

const MEAL_NUTRITION_TOOL = {
  type: 'function' as const,
  name: 'get_meal_nutrition',
  description:
    'Estimate nutrition for each item. Normalize names; use USDA or Indian food references. Return same quantity and unit as input; scale nutrition by quantity.',
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
                'Normalized standard food name (e.g. "veg pulao", "raita", "idli", "chicken sandwich").',
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
              description:
                'Total dietary fiber in grams. Estimate typical values when unknown; use 0 only if negligible.',
            },
            sugar: {
              type: 'number',
              description:
                'Total sugars in grams. Estimate typical values when unknown; use 0 only if negligible.',
            },
            sodium: {
              type: 'number',
              description:
                'Total sodium in mg. Estimate typical values when unknown; use 0 only if negligible.',
            },
            saturatedFat: {
              type: 'number',
              description:
                'Total saturated fat in grams. Estimate typical values when unknown; use 0 only if negligible.',
            },
            cholesterol: {
              type: 'number',
              description:
                'Total cholesterol in mg. Estimate typical values when unknown; use 0 only if negligible.',
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
            confidence: {
              type: 'string',
              description: 'Confidence in estimate: high, medium, or low.',
            },
            sourceType: {
              type: 'string',
              description: 'Primary data source used: brand_label, restaurant_db, or ifct_usda_estimate.',
            },
            preparationType: {
              type: 'string',
              description: 'Whether the logged item is homemade, restaurant, packaged, or unknown.',
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
            'confidence',
            'sourceType',
            'preparationType',
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
  confidence: 'high' | 'medium' | 'low';
  sourceType: 'brand_label' | 'restaurant_db' | 'ifct_usda_estimate';
  preparationType: 'homemade' | 'restaurant' | 'packaged' | 'unknown';
};

type NutritionConfidence = 'high' | 'medium' | 'low';
type NutritionSourceType = 'brand_label' | 'restaurant_db' | 'ifct_usda_estimate';
type NutritionPreparationType = 'homemade' | 'restaurant' | 'packaged' | 'unknown';

function normalizeItem(obj: Record<string, unknown>): NormalizedItem {
  const num = (v: unknown) =>
    typeof v === 'number' && !Number.isNaN(v) ? v : 0;
  const str = (v: unknown) =>
    typeof v === 'string' ? v : String(v ?? '');

  const protein = Math.max(0, num(obj.protein));
  const carbs = Math.max(0, num(obj.carbs));
  const fat = Math.max(0, num(obj.fat));
  const calories = Math.round((protein * 4) + (carbs * 4) + (fat * 9));

  const confidenceRaw = str(obj.confidence).toLowerCase();
  const sourceTypeRaw = str(obj.sourceType).toLowerCase();
  const preparationTypeRaw = str(obj.preparationType).toLowerCase();
  const confidence: NutritionConfidence =
    confidenceRaw === 'high' || confidenceRaw === 'medium' || confidenceRaw === 'low'
      ? (confidenceRaw as NutritionConfidence)
      : 'medium';
  const sourceType: NutritionSourceType =
    sourceTypeRaw === 'brand_label' ||
    sourceTypeRaw === 'restaurant_db' ||
    sourceTypeRaw === 'ifct_usda_estimate'
      ? (sourceTypeRaw as NutritionSourceType)
      : 'ifct_usda_estimate';
  const preparationType: NutritionPreparationType =
    preparationTypeRaw === 'homemade' ||
    preparationTypeRaw === 'restaurant' ||
    preparationTypeRaw === 'packaged' ||
    preparationTypeRaw === 'unknown'
      ? (preparationTypeRaw as NutritionPreparationType)
      : 'unknown';

  return {
    name: str(obj.name).trim() || 'Item',
    calories,
    protein: Number(protein.toFixed(2)),
    carbs: Number(carbs.toFixed(2)),
    fat: Number(fat.toFixed(2)),
    fiber: Number(Math.max(0, num(obj.fiber)).toFixed(2)),
    sugar: Number(Math.max(0, num(obj.sugar)).toFixed(2)),
    sodium: Math.round(Math.max(0, num(obj.sodium))),
    saturatedFat: Number(Math.max(0, num(obj.saturatedFat)).toFixed(2)),
    cholesterol: Math.round(Math.max(0, num(obj.cholesterol))),
    quantity: Math.max(0.1, num(obj.quantity)) || 1,
    unit: str(obj.unit).trim() || 'serving',
    confidence,
    sourceType,
    preparationType,
  };
}

const DENSE_PIECE_ITEM_PATTERN =
  /dosa|idli|chapati|roti|paratha|puri|sandwich|burger|cookie|biscuit|samosa|cutlet|roll|wrap|pizza|nugget/i;

function computeTotal(items: NormalizedItem[]) {
  const caloriesSum = items.reduce((s, i) => s + i.calories, 0);
  const proteinSum = items.reduce((s, i) => s + i.protein, 0);
  const carbsSum = items.reduce((s, i) => s + i.carbs, 0);
  const fatSum = items.reduce((s, i) => s + i.fat, 0);
  const fiberSum = items.reduce((s, i) => s + i.fiber, 0);
  const sugarSum = items.reduce((s, i) => s + i.sugar, 0);
  const sodiumSum = items.reduce((s, i) => s + i.sodium, 0);
  const saturatedFatSum = items.reduce((s, i) => s + i.saturatedFat, 0);
  const cholesterolSum = items.reduce((s, i) => s + i.cholesterol, 0);

  return {
    calories: Math.round(caloriesSum),
    protein: Number(proteinSum.toFixed(2)),
    carbs: Number(carbsSum.toFixed(2)),
    fat: Number(fatSum.toFixed(2)),
    fiber: Number(fiberSum.toFixed(2)),
    sugar: Number(sugarSum.toFixed(2)),
    sodium: Math.round(sodiumSum),
    saturatedFat: Number(saturatedFatSum.toFixed(2)),
    cholesterol: Math.round(cholesterolSum),
  };
}

function clampSodiumSpikes(items: NormalizedItem[]) {
  for (const item of items) {
    const name = item.name.toLowerCase();

    if (name.includes('pickle') && item.sodium > 1200) {
      item.sodium = 800;
    }

    if (name.includes('chips') && item.sodium > 900) {
      item.sodium = 700;
    }

    if (name.includes('sauce') && item.sodium > 1200) {
      item.sodium = 900;
    }
  }
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

    type ParsedItem = {
      name: string;
      quantity: number;
      unit: string;
      each_weight_g: number;
      total_weight_g: number | null;
    };

    const MEASURE_UNITS = new Set(['g', 'ml', 'tbsp', 'tsp', 'cup', 'bowl', 'serving']);

    const normalizeUnit = (rawUnit: unknown): string => {
      const u = String(rawUnit ?? '').trim().toLowerCase();
      if (!u) return 'serving';
      if (MEASURE_UNITS.has(u)) return u;
      return 'piece';
    };

    const parsedItems: ParsedItem[] = parsedArgs.items
      .filter((x): x is Record<string, unknown> => x != null && typeof x === 'object')
      .map((x) => {
        const name = String(x.name ?? '').trim() || 'Item';
        const quantity =
          typeof x.quantity === 'number' && !Number.isNaN(x.quantity) ? Math.max(0.1, x.quantity) : 1;
        const unit = normalizeUnit(x.unit);
        const each_weight_g =
          typeof x.each_weight_g === 'number' && !Number.isNaN(x.each_weight_g)
            ? Math.max(0, x.each_weight_g)
            : 0;
        const total_weight_g =
          unit === 'piece' && each_weight_g > 0 ? quantity * each_weight_g : null;

        return {
          name,
          quantity,
          unit,
          each_weight_g,
          total_weight_g,
        };
      })
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
      .filter((i) => i.calories > 0 || i.name !== 'Item');

    // Safeguard: preserve quantity and unit from Step-1; scale nutrition if model used different quantity.
    // Match items by normalized name to avoid index-based mismatches if the model reorders items.
    const parsedByName = new Map(
      parsedItems.map((parsed) => [parsed.name.toLowerCase(), parsed] as const)
    );

    items = items.map((current) => {
      const parsed = parsedByName.get(current.name.toLowerCase());
      if (!parsed) return current;

      const scale = current.quantity > 0 ? parsed.quantity / current.quantity : 1;
      const protein = Number((current.protein * scale).toFixed(2));
      const carbs = Number((current.carbs * scale).toFixed(2));
      const fat = Number((current.fat * scale).toFixed(2));

      const scaled = {
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

      // Guard against model returning per-piece values for multi-piece foods.
      if (
        parsed.unit === 'piece' &&
        parsed.quantity > 1 &&
        parsed.each_weight_g > 0 &&
        DENSE_PIECE_ITEM_PATTERN.test(scaled.name) &&
        scaled.calories / parsed.quantity < 50
      ) {
        const pieceScale = parsed.quantity;
        const protein = Number((scaled.protein * pieceScale).toFixed(2));
        const carbs = Number((scaled.carbs * pieceScale).toFixed(2));
        const fat = Number((scaled.fat * pieceScale).toFixed(2));
        return {
          ...scaled,
          protein,
          carbs,
          fat,
          calories: Math.round(protein * 4 + carbs * 4 + fat * 9),
          fiber: Number((scaled.fiber * pieceScale).toFixed(2)),
          sugar: Number((scaled.sugar * pieceScale).toFixed(2)),
          sodium: Math.round(scaled.sodium * pieceScale),
          saturatedFat: Number((scaled.saturatedFat * pieceScale).toFixed(2)),
          cholesterol: Math.round(scaled.cholesterol * pieceScale),
          confidence: 'low',
        };
      }

      return scaled;
    });

    // Clamp unrealistic sodium spikes after normalization/scaling, before totals
    clampSodiumSpikes(items);

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
