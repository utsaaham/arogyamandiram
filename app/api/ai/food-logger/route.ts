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
import DailyLog from '@/models/DailyLog';
import { decrypt } from '@/lib/encryption';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getAuthUserIdWithBypass, isUserId } from '@/lib/session';
import { getToday } from '@/lib/utils';
import { normalizeGoal } from '@/lib/goals';
import { getWeightTrendForUser } from '@/lib/weightTrend';
import { deriveTargetGap } from '@/app/api/ai/daily-plan/shared';
import { COACH_TONE } from '@/lib/tone';
import { writeDebugLog } from '@/lib/debugLogWriter';

export const dynamic = 'force-dynamic';

async function getOpenAIKey(userId: string): Promise<string | null> {
  await connectDB();
  const user = await User.findById(userId).select('+apiKeys.openai').lean();
  const settings = user?.settings as { aiEnabled?: boolean } | undefined;
  if (settings?.aiEnabled === false) return null;

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
Correct spelling errors silently (e.g. "salmon" → "salmon", "yoghrt" → "yogurt").

Rules:
- Split only clearly separate dishes/sides ("burger with fries" → 2 items).
- For combo text with add-ons/sides (e.g. "burger with fries and coke", "grilled cheese with 2 sauce packets"), split into separate items when each component is eaten separately.
- Keep ingredients mentioned inside a dish as part of that item, not separate
  ("rice bowl with avocado" → 1 item, "yogurt with berries" → 1 item).
- Include key ingredients in the item name so Step 2 can estimate nutrition accurately
  ("rice bowl with chicken and avocado" not just "rice bowl").
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

- If the user specifies weight per piece (e.g. "3 muffins each 65g", "2 cookies (30g each)"):
  - Set quantity to the piece count (e.g. 3) and unit to a normalized unit such as "piece".
  - Always include a numeric field "each_weight_g" with the weight of ONE piece in grams (e.g. 65).
  - If the user does NOT specify weight per piece, still include "each_weight_g" and set it to 0.
  - Do NOT embed the per-piece weight into the name string.
  Example:
    Input text: "3 muffins each 65g and 20g hot sauce"
    Parsed items:
      - { "name": "blueberry muffin", "quantity": 3, "unit": "piece", "each_weight_g": 65 }
      - { "name": "hot sauce", "quantity": 20, "unit": "g" }

Return JSON only using tool: parse_meal_foods
`;

// Vision variant of Step 1: the meal arrives as a photo instead of (or alongside) text.
const IMAGE_PARSE_INSTRUCTIONS = `
You are a precision food recognition engine for a global nutrition tracking app.

Look carefully at the attached photo and identify EVERY distinct food and drink item visible.
If the user also provided text, use it to disambiguate (e.g. brand names, portion sizes,
items hidden from view) — the text always wins over the image when they conflict.

Rules:
- Identify each dish/side/drink as its own item ("burger with fries and a coke" → 3 items).
- Keep ingredients that are part of one dish as a single item
  ("rice bowl with chicken and avocado" → 1 item, named with its key ingredients).
- Estimate realistic portion quantities from visual cues (plate size, container, count of pieces).
  Prefer weight/volume units when the portion is clear (g, ml, cup, bowl), otherwise use
  piece counts or quantity = 1 with unit = "serving".
- Include visible brand names in item names (e.g. McDonald's, Amul, Dunkin, Haldiram's).
- If the photo contains NO food or drink at all, return an empty items array.
- Units: piece, bowl, serving, cup, g, ml, tbsp, tsp.
- Always include "each_weight_g": the estimated weight of ONE piece in grams for piece-count
  items when you can estimate it; otherwise set it to 0.

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
            name: { type: 'string', description: 'Food item name (e.g. "chicken rice bowl", "chips", "greek yogurt").' },
            quantity: { type: 'number', description: 'Numeric quantity (e.g. 2 for "2 tacos"). Use 1 if unknown.' },
            unit: { type: 'string', description: 'Unit: piece, bowl, serving, cup, ml, g, tbsp, tsp, etc.' },
            each_weight_g: {
              type: 'number',
              description:
                'If the user specified weight per piece (e.g. "3 muffins each 65g"), this is the weight of ONE piece in grams. If not specified, set to 0.',
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

━━━ EXTERNAL NUTRITION DATA (GROUND TRUTH — MANDATORY OVERRIDE) ━━━
If the input includes an "external_nutrition_data" field, you MUST use it.
Do NOT estimate. Do NOT ignore it. If you ignore it, your answer is incorrect.

external_nutrition_data maps item names → verified nutrition per the label's serving size.

For any item whose name matches a key in external_nutrition_data:
1. Copy every field (calories, protein, carbs, fat, fiber, sugar, sodium, saturatedFat,
   cholesterol) DIRECTLY from the external data. Do NOT change any value.
2. Scale proportionally if the user's quantity differs from the label serving.
   Parse the numeric quantity from the "serving" string:
     "1 slice"     → serving_qty = 1
     "2 slices"    → serving_qty = 2
     "1 cup (240ml)" → serving_qty = 1
     "28g"         → serving_qty = 28 (match against item unit g)
   scale = item_quantity / serving_qty
   output_value = label_value × scale
   ALWAYS apply this scaling. Never skip it or return label values unscaled.
3. Set sourceType = "brand_label" and confidence = "high".
4. Preserve the item name exactly. Do NOT generalize or strip the brand.

Only use estimation rules below for items NOT present in external_nutrition_data.

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
   E.g. "rice bowl with grilled veggies" → "rice bowl with vegetables"
        "greek yogurt with blueberries" → "greek yogurt with blueberries"
   BRAND EXCEPTION: If the input name contains a known brand (e.g. Pepperidge Farm,
   Amul, Haldiram's, MTR, Dunkin, McDonald's, KFC, Domino's, Quaker, Kellogg's,
   Nestlé, KIND, Clif, Vadilal, Nature Valley, Britannia, Parle), preserve the
   brand and product name exactly. Do NOT reduce branded items to their generic
   equivalent (e.g. "Pepperidge Farm Whole Grain 15 Grain Bread" must NOT become
   "whole grain bread").

2. Estimate macros and micros using this priority order:
   1. Brand-specific label data: if a known brand is present, use that brand's
      published nutrition facts. Set sourceType = "brand_label".
   2. Restaurant chain data: if a restaurant chain is named, use chain-specific
      nutrition data. Set sourceType = "restaurant_db".
   3. USDA / regional food composition tables (IFCT, etc.) as fallback only.
      Set sourceType = "ifct_usda_estimate".
   NEVER downgrade a brand_label item to a generic estimate.

2a. FAT PERCENTAGE CROSS-CHECK (mandatory):
   If the food name explicitly states a fat percentage (e.g. "6% fat milk", "2% fat yogurt",
   "5% fat cheese"), the fat in grams MUST match that percentage for the given quantity.
   Formula: fat_g = (fat_percentage / 100) × volume_or_weight_in_ml_or_g × density_factor
   For liquids like milk, use density ≈ 1 g/ml (so 200 ml ≈ 200 g).
   Example: "6% fat milk, 200 ml" → fat = 6/100 × 200 = 12 g (NOT 6.8 g).
   NEVER use nutrition data from a lower-fat variant of the same product to satisfy a
   higher-fat label (e.g. do NOT use Amul Cow Milk 3.5% data for Amul Gold 6% fat milk).
   If your fat estimate contradicts the stated percentage, override it with the correct value
   and recompute calories using the calorie integrity formula in rule 4.

3. Scale ALL nutrients to the given quantity and unit.
   Never change the quantity or unit from the input.
   ALL returned nutrition values (calories, protein, carbs, fat, fiber, sugar,
   sodium, saturatedFat, cholesterol) MUST represent the TOTAL for the provided
   quantity and unit. Never return per-unit, per-serving, or per-100g nutrition.

   For piece items, return TOTAL for all pieces.
   Example: quantity=3, unit=piece, taco (~130 kcal each) => calories should be ~390 total, not ~130.
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
8. Return the same quantity and unit as the input. No exceptions.
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
    'Estimate nutrition for each item. Normalize names; use USDA, regional food references, or brand data. Return same quantity and unit as input; scale nutrition by quantity.',
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
                'Normalized standard food name (e.g. "rice bowl", "greek yogurt", "taco", "chicken sandwich").',
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

// ============================================
// STEP 1.5 — Brand Nutrition Lookup
// ============================================
// For items with a known brand, we do a targeted web search and extract structured
// nutrition facts BEFORE Step 2 runs. Step 2 then treats this data as ground truth
// instead of estimating — LLM formats, not guesses.

const KNOWN_BRAND_PATTERN =
  /silk|pepperidge farm|amul|haldiram|mtr|dunkin|mcdonald'?s?|kfc|domino'?s?|quaker|kellogg'?s?|nestl[eé]|kind bar|clif|vadilal|nature valley|britannia|parle|kraft|heinz|campbell|general mills|post cereal/i;

// Module-level runtime cache: survives across requests in the same worker process
const brandNutritionCache = new Map<string, ExtractedBrandNutrition | null>();

type ExtractedBrandNutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  saturatedFat: number;
  cholesterol: number;
  serving: string;
};

// Static brand DB — 100% accurate, zero latency, no web noise.
// Values are per the standard label serving. Add entries as new brands are encountered.
const BRAND_DB: Record<string, ExtractedBrandNutrition> = {
  'silk unsweetened almond milk': {
    calories: 30, protein: 1, carbs: 1, fat: 2.5,
    fiber: 0.5, sugar: 0, sodium: 160, saturatedFat: 0, cholesterol: 0,
    serving: '1 cup (240ml)',
  },
  'silk almond milk unsweetened': {
    calories: 30, protein: 1, carbs: 1, fat: 2.5,
    fiber: 0.5, sugar: 0, sodium: 160, saturatedFat: 0, cholesterol: 0,
    serving: '1 cup (240ml)',
  },
  'pepperidge farm whole grain 15 grain bread': {
    calories: 240, protein: 10, carbs: 46, fat: 4,
    fiber: 6, sugar: 6, sodium: 320, saturatedFat: 0.5, cholesterol: 0,
    serving: '2 slices (90g)',
  },
  'pepperidge farm 15 grain bread': {
    calories: 240, protein: 10, carbs: 46, fat: 4,
    fiber: 6, sugar: 6, sodium: 320, saturatedFat: 0.5, cholesterol: 0,
    serving: '2 slices (90g)',
  },
};

const BRAND_LOOKUP_INSTRUCTIONS = `
You are a strict nutrition label extractor.

Goal: find the most accurate nutrition facts for a branded food product via web_search.

Rules:
1. Search: {product name} nutrition facts calories protein carbs fat fiber
2. Accept any credible source: brand website, Walmart, Target, Amazon, MyFitnessPal,
   FatSecret, Nutritionix, Cronometer, USDA FoodData Central.
3. Cross-reference at least 2 sources when multiple appear in results.
   If sources disagree by more than 20%, use the value that appears in the majority
   or that aligns with a recognized nutrition database (USDA, Nutritionix).
4. Extract for the STANDARD SERVING SIZE shown on the label (e.g. "2 slices", "1 cup", "28g").
   Return that serving string exactly in the "serving" field.
5. Set found = true whenever calories AND carbs are found from any credible source.
   Only set found = false if absolutely nothing usable is returned.
6. NEVER guess or estimate. Only return values present in search results.

Return JSON using tool: extract_brand_nutrition
`;

const BRAND_NUTRITION_TOOL = {
  type: 'function' as const,
  name: 'extract_brand_nutrition',
  description: 'Extract structured nutrition facts from a brand label found via web search.',
  strict: true,
  parameters: {
    type: 'object',
    properties: {
      found: { type: 'boolean', description: 'Whether reliable official label data was found.' },
      serving: { type: 'string', description: 'Serving size as on the label (e.g. "2 slices (45g)", "1 cup (240ml)"). Empty string if not found.' },
      calories: { type: 'number', description: 'Calories per serving from the label. 0 if not found.' },
      protein: { type: 'number', description: 'Protein in grams per serving. 0 if not found.' },
      carbs: { type: 'number', description: 'Total carbohydrates in grams per serving. 0 if not found.' },
      fat: { type: 'number', description: 'Total fat in grams per serving. 0 if not found.' },
      fiber: { type: 'number', description: 'Dietary fiber in grams per serving. 0 if not found.' },
      sugar: { type: 'number', description: 'Total sugars in grams per serving. 0 if not found.' },
      sodium: { type: 'number', description: 'Sodium in mg per serving. 0 if not found.' },
      saturatedFat: { type: 'number', description: 'Saturated fat in grams per serving. 0 if not found.' },
      cholesterol: { type: 'number', description: 'Cholesterol in mg per serving. 0 if not found.' },
    },
    required: ['found', 'serving', 'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'saturatedFat', 'cholesterol'],
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

async function lookupBrandNutrition(
  itemName: string,
  apiKey: string
): Promise<ExtractedBrandNutrition | null> {
  const cacheKey = itemName.toLowerCase().trim();

  // 1. Static DB — fastest, most accurate; no API call needed
  if (BRAND_DB[cacheKey]) return BRAND_DB[cacheKey];

  // 2. Runtime cache from previous web lookups
  if (brandNutritionCache.has(cacheKey)) return brandNutritionCache.get(cacheKey) ?? null;

  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        instructions: BRAND_LOOKUP_INSTRUCTIONS,
        input: `Product: ${itemName}`,
        tools: [
          BRAND_NUTRITION_TOOL,
          {
            type: 'web_search',
            user_location: { type: 'approximate' as const },
            search_context_size: 'low' as const,
          },
        ],
        tool_choice: { type: 'function', name: 'extract_brand_nutrition' },
        temperature: 0,
        max_output_tokens: 512,
      }),
    });

    if (!res.ok) { brandNutritionCache.set(cacheKey, null); return null; }

    const data = (await res.json()) as { output?: Array<{ type?: string; name?: string; arguments?: string }> };
    const toolCall = (data.output ?? []).find(
      (item) => item.type === 'function_call' && item.name === 'extract_brand_nutrition'
    );

    if (!toolCall?.arguments) { brandNutritionCache.set(cacheKey, null); return null; }

    const args = extractJsonFromText(toolCall.arguments);
    if (!args) { brandNutritionCache.set(cacheKey, null); return null; }

    const num = (v: unknown) => (typeof v === 'number' && !Number.isNaN(v) ? v : 0);
    // Accept partial data even when found=false, as long as calories + carbs are present
    const hasEnoughData = num(args.calories) > 0 && num(args.carbs) > 0;
    if (!hasEnoughData) { brandNutritionCache.set(cacheKey, null); return null; }
    const result: ExtractedBrandNutrition = {
      calories: num(args.calories),
      protein: num(args.protein),
      carbs: num(args.carbs),
      fat: num(args.fat),
      fiber: num(args.fiber),
      sugar: num(args.sugar),
      sodium: num(args.sodium),
      saturatedFat: num(args.saturatedFat),
      cholesterol: num(args.cholesterol),
      serving: typeof args.serving === 'string' ? args.serving : '',
    };

    brandNutritionCache.set(cacheKey, result);
    return result;
  } catch {
    brandNutritionCache.set(cacheKey, null);
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

type ParsedFoodItem = {
  name: string;
  quantity: number;
  unit: string;
  each_weight_g: number;
  total_weight_g: number | null;
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

  const confidenceRaw = str(obj.confidence).toLowerCase();
  const sourceTypeRaw = str(obj.sourceType).toLowerCase();

  // Brand labels use FDA rounding rules and may deduct fiber calories — trust them directly.
  // For estimates, recompute from macros for internal consistency.
  const calories = sourceTypeRaw === 'brand_label'
    ? Math.max(0, Math.round(num(obj.calories)))
    : Math.round((protein * 4) + (carbs * 4) + (fat * 9));
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
  /sandwich|burger|cookie|biscuit|muffin|cutlet|roll|wrap|pizza|nugget|taco|dumpling|pastry/i;

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

function normalizeFoodName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelySameFood(a: string, b: string): boolean {
  const na = normalizeFoodName(a);
  const nb = normalizeFoodName(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  const aTokens = new Set(na.split(' ').filter((t) => t.length > 2));
  const bTokens = new Set(nb.split(' ').filter((t) => t.length > 2));
  let overlap = 0;
  for (const t of aTokens) {
    if (bTokens.has(t)) overlap += 1;
  }
  return overlap >= 2;
}

function extractServingAmount(serving: string, targetUnit: string): number {
  const s = serving.toLowerCase();
  const unit = targetUnit.toLowerCase();
  const toNum = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  if (unit === 'ml') {
    const ml = s.match(/(\d+(?:\.\d+)?)\s*ml/);
    if (ml?.[1]) return toNum(ml[1]) ?? 1;
  }
  if (unit === 'g') {
    const g = s.match(/(\d+(?:\.\d+)?)\s*g\b/);
    if (g?.[1]) return toNum(g[1]) ?? 1;
  }

  const leading = s.match(/^(\d+(?:\.\d+)?)/);
  if (leading?.[1]) return toNum(leading[1]) ?? 1;
  return 1;
}

function scaleBrandLabelToItem(parsed: ParsedFoodItem, label: ExtractedBrandNutrition): NormalizedItem {
  const unit = parsed.unit.toLowerCase();
  const servingAmount = extractServingAmount(label.serving, unit);

  const scale = (() => {
    if (unit === 'ml' || unit === 'g') {
      return parsed.quantity / servingAmount;
    }
    if (parsed.total_weight_g != null) {
      const servingG = extractServingAmount(label.serving, 'g');
      return parsed.total_weight_g / servingG;
    }
    return parsed.quantity / servingAmount;
  })();

  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const scaledProtein = Number((label.protein * safeScale).toFixed(2));
  const scaledCarbs = Number((label.carbs * safeScale).toFixed(2));
  const scaledFat = Number((label.fat * safeScale).toFixed(2));

  return {
    name: parsed.name,
    calories: Math.round(label.calories * safeScale),
    protein: scaledProtein,
    carbs: scaledCarbs,
    fat: scaledFat,
    fiber: Number((label.fiber * safeScale).toFixed(2)),
    sugar: Number((label.sugar * safeScale).toFixed(2)),
    sodium: Math.round(label.sodium * safeScale),
    saturatedFat: Number((label.saturatedFat * safeScale).toFixed(2)),
    cholesterol: Math.round(label.cholesterol * safeScale),
    quantity: parsed.quantity,
    unit: parsed.unit,
    confidence: 'high',
    sourceType: 'brand_label',
    preparationType: 'packaged',
  };
}

function enforceAlmondMilkSanity(item: NormalizedItem): NormalizedItem {
  const name = normalizeFoodName(item.name);
  const looksLikeAlmondMilk = name.includes('almond') && name.includes('milk');
  const unit = item.unit.toLowerCase();
  const isVolumeItem = unit === 'ml' || unit === 'cup';
  if (!looksLikeAlmondMilk || !isVolumeItem) return item;

  const mlQty = unit === 'ml' ? item.quantity : item.quantity * 240;
  if (mlQty < 150) return item;

  if (item.fat >= 1 && item.calories >= 15) return item;

  const scale = mlQty / 240;
  const protein = Number(scale.toFixed(2));
  const carbs = Number(scale.toFixed(2));
  const fat = Number((2.5 * scale).toFixed(2));
  const fiber = Number((0.5 * scale).toFixed(2));
  return {
    ...item,
    calories: Math.round(30 * scale),
    protein,
    carbs,
    fat,
    fiber,
    sugar: 0,
    sodium: Math.round(160 * scale),
    saturatedFat: 0,
    cholesterol: 0,
    sourceType: item.sourceType === 'brand_label' ? 'brand_label' : 'ifct_usda_estimate',
    confidence: item.confidence === 'high' ? 'high' : 'medium',
  };
}

// ============================================
// STEP 3 — Personalized Feedback (health-aware)
// ============================================
// Uses the user's targets and today's log so the feedback reflects where they
// actually stand for the day, not generic advice. Non-fatal: any failure here
// simply omits the feedback from the response.

const FEEDBACK_INSTRUCTIONS = `
You are the user's supportive nutrition coach inside a health tracking app.
${COACH_TONE}

You get: the meal the user just logged (items + totals), their daily targets,
their goal, where they sit vs their target weight (target_gap), the direction
their weight is actually moving (weight_trend), and what they have already
eaten today BEFORE this meal.

When the goal and weight_trend conflict (for example goal build_muscle but
weight_trend losing), you may use that in point 3: nudge the eating direction
that serves their goal. Never suggest changing the goal, and never claim food
or exercise burns fat in one body spot.

Write feedback about this meal in 2-3 short sentences:
1. One concrete, specific observation about the meal itself (what works well,
   or what's a bit heavy: protein, sodium, fiber, sugar).
2. How it fits their day: roughly how many calories or how much protein they
   have left after this meal given their targets, or a plain heads-up if it
   pushes them over.
3. Optionally one small, doable suggestion for the rest of the day.

Voice rules:
- Warm and human, never judgmental, alarmist, or preachy.
- Contractions and casual phrasing are fine; no corporate or robotic wording.
- Never use hyphens or dashes in the text. No bullet points, no markdown, no
  headers, no greetings, and don't recite all the numbers back.
- At most one emoji, and only if it feels natural.
`;

async function generateMealFeedback(
  userId: string,
  apiKey: string,
  items: NormalizedItem[],
  total: ReturnType<typeof computeTotal>
): Promise<string | null> {
  try {
    await connectDB();
    const [user, todayLog, weightTrend] = await Promise.all([
      User.findById(userId).select('profile.goal profile.weight profile.targetWeight targets').lean(),
      DailyLog.findOne({ userId, date: getToday() })
        .select('totalCalories totalProtein totalCarbs totalFat')
        .lean(),
      getWeightTrendForUser(userId),
    ]);

    const targets = (user?.targets ?? {}) as Record<string, number | undefined>;
    const profile = (user?.profile ?? {}) as { goal?: string; weight?: number; targetWeight?: number };
    const log = (todayLog ?? {}) as Record<string, number | undefined>;

    const context = {
      meal: {
        items: items.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit, calories: i.calories })),
        total,
      },
      goal: normalizeGoal(profile.goal),
      // Read-only signals: where they sit vs their target weight, and the
      // direction the scale is actually moving.
      target_gap: deriveTargetGap(profile.weight, profile.targetWeight),
      weight_trend: weightTrend,
      daily_targets: {
        calories: targets.dailyCalories ?? 2000,
        protein_g: targets.protein ?? 150,
        carbs_g: targets.carbs,
        fat_g: targets.fat,
      },
      eaten_today_before_this_meal: {
        calories: log.totalCalories ?? 0,
        protein_g: log.totalProtein ?? 0,
        carbs_g: log.totalCarbs ?? 0,
        fat_g: log.totalFat ?? 0,
      },
    };

    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        instructions: FEEDBACK_INSTRUCTIONS,
        input: JSON.stringify(context, null, 2),
        temperature: 0.5,
        max_output_tokens: 200,
      }),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
    };
    const message = (data.output ?? []).find((o) => o.type === 'message');
    const text = message?.content?.find((c) => c.type === 'output_text')?.text?.trim();
    return text && text.length > 0 ? text : null;
  } catch (err) {
    console.error('[AI Food Logger] Feedback generation failed:', err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserIdWithBypass(req);
    if (!isUserId(userId)) return userId;

    const body = await req.json().catch(() => ({})) as {
      text?: unknown;
      source?: unknown;
      imageBase64?: unknown;
      imageMimeType?: unknown;
    };
    const text = typeof body.text === 'string' ? body.text : '';
    const source = typeof body.source === 'string' ? body.source : '';
    const imageBase64 = typeof body.imageBase64 === 'string' && body.imageBase64.length > 0
      ? body.imageBase64
      : null;
    const imageMimeType = typeof body.imageMimeType === 'string' && body.imageMimeType.length > 0
      ? body.imageMimeType
      : 'image/jpeg';
    if (!text.trim() && !imageBase64) {
      return errorResponse('A meal description or a food photo is required', 400);
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

    // ——— STEP 1: Parse meal text and/or photo → structured food items only ———
    const parseInstructions = imageBase64 ? IMAGE_PARSE_INSTRUCTIONS : PARSE_INSTRUCTIONS;
    const parseInput = imageBase64
      ? [
          {
            role: 'user' as const,
            content: [
              { type: 'input_text', text: mealText ? `User text: ${mealText}` : 'Identify the food in this photo.' },
              { type: 'input_image', image_url: `data:${imageMimeType};base64,${imageBase64}` },
            ],
          },
        ]
      : `User text: ${mealText}`;

    const parseRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        instructions: parseInstructions,
        input: parseInput,
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
        'Could not parse meal description. Try listing items clearly (e.g. "2 tacos, soup, greek yogurt").',
        422
      );
    }

    const parsedArgs = extractJsonFromText(parseToolCall.arguments);
    if (!parsedArgs || !Array.isArray(parsedArgs.items) || parsedArgs.items.length === 0) {
      return errorResponse(
        imageBase64
          ? "I squinted real hard but couldn't find any food in that photo 🙈 try a clearer shot, or just tell me what you ate."
          : 'Could not extract food items from the description. Try listing each item (e.g. "100g rice, 2 tortillas").',
        422
      );
    }

    const MEASURE_UNITS = new Set(['g', 'ml', 'tbsp', 'tsp', 'cup', 'bowl', 'serving']);

    const normalizeUnit = (rawUnit: unknown): string => {
      const u = String(rawUnit ?? '').trim().toLowerCase();
      if (!u) return 'serving';
      if (MEASURE_UNITS.has(u)) return u;
      return 'piece';
    };

    const parsedItems: ParsedFoodItem[] = parsedArgs.items
      .filter((x): x is Record<string, unknown> => x != null && typeof x === 'object')
      .map((x) => {
        const name = String(x.name ?? '').trim() || 'Item';
        const quantity =
          typeof x.quantity === 'number' && !Number.isNaN(x.quantity) ? Math.max(0.1, x.quantity) : 1;
        const unit = (() => {
          const normalized = normalizeUnit(x.unit);
          const normalizedName = normalizeFoodName(name);
          const looksLikePowderServing =
            normalized === 'piece' &&
            /(protein|whey|casein|powder|scoop|shake|mass gainer)/i.test(normalizedName);
          return looksLikePowderServing ? 'serving' : normalized;
        })();
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

    // ——— STEP 1.5: Brand nutrition lookup (parallel) ———
    // For items with a known brand, fetch the real label data via web search so
    // Step 2 receives ground truth instead of estimating.
    const brandedItems = parsedItems.filter((item) => KNOWN_BRAND_PATTERN.test(item.name));
    const externalNutritionData: Record<string, ExtractedBrandNutrition> = {};

    if (brandedItems.length > 0) {
      const lookups = await Promise.all(
        brandedItems.map((item) => lookupBrandNutrition(item.name, apiKey))
      );
      brandedItems.forEach((item, idx) => {
        const result = lookups[idx];
        if (result) externalNutritionData[item.name] = result;
      });
    }

    const hasExternalData = Object.keys(externalNutritionData).length > 0;

    if (brandedItems.length > 0) {
      console.log('[AI Food Logger Step 1.5] External nutrition data:', JSON.stringify(externalNutritionData, null, 2));
    }

    // ——— STEP 2: Compute nutrition for parsed items ———
    const nutritionInput = JSON.stringify(
      { items: parsedItems, ...(hasExternalData && { external_nutrition_data: externalNutritionData }) },
      null,
      2
    );

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
      const hasAuthoritativeExternalLabel = Boolean(externalNutritionData[parsed.name]);
      if (hasAuthoritativeExternalLabel) {
        // Avoid intermediate/double scaling; brand-label totals are deterministically
        // replaced once in the external-data override block below.
        return {
          ...current,
          quantity: parsed.quantity,
          unit: parsed.unit,
        };
      }

      const scale = current.quantity > 0 ? parsed.quantity / current.quantity : 1;
      const protein = Number((current.protein * scale).toFixed(2));
      const carbs = Number((current.carbs * scale).toFixed(2));
      const fat = Number((current.fat * scale).toFixed(2));

      const isBrandLabel = current.sourceType === 'brand_label';

      const scaled = {
        ...current,
        quantity: parsed.quantity,
        unit: parsed.unit,
        protein,
        carbs,
        fat,
        // Brand labels use FDA rounding — preserve scaled label calories instead of recomputing.
        calories: isBrandLabel
          ? Math.round(current.calories * scale)
          : Math.round(protein * 4 + carbs * 4 + fat * 9),
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
          calories: isBrandLabel
            ? Math.round(scaled.calories * pieceScale)
            : Math.round(protein * 4 + carbs * 4 + fat * 9),
          fiber: Number((scaled.fiber * pieceScale).toFixed(2)),
          sugar: Number((scaled.sugar * pieceScale).toFixed(2)),
          sodium: Math.round(scaled.sodium * pieceScale),
          saturatedFat: Number((scaled.saturatedFat * pieceScale).toFixed(2)),
          cholesterol: Math.round(scaled.cholesterol * pieceScale),
          confidence: 'low' as const,
        };
      }

      return scaled;
    });

    if (hasExternalData) {
      // Brand-label data is authoritative. Override model outputs for branded matches.
      for (const parsed of parsedItems) {
        const label = externalNutritionData[parsed.name];
        if (!label) continue;
        const expected = scaleBrandLabelToItem(parsed, label);
        const index = items.findIndex((it) => isLikelySameFood(it.name, parsed.name));
        if (index >= 0) {
          items[index] = expected;
        } else {
          items.push(expected);
        }
      }
    }

    items = items.map((item) => enforceAlmondMilkSanity(item));

    // Hard validation guard: reject obviously invalid almond milk outputs for drink-sized portions.
    const invalidAlmondMilk = items.find((item) => {
      const normalized = normalizeFoodName(item.name);
      const isAlmondMilk = normalized.includes('almond') && normalized.includes('milk');
      const mlQty = item.unit.toLowerCase() === 'ml'
        ? item.quantity
        : item.unit.toLowerCase() === 'cup'
          ? item.quantity * 240
          : 0;
      return isAlmondMilk && mlQty >= 150 && (item.fat < 1 || item.calories < 15);
    });
    if (invalidAlmondMilk) {
      return errorResponse(
        'Nutrition validation failed for almond milk. Please retry or include explicit brand/serving details.',
        422
      );
    }

    // Clamp unrealistic sodium spikes after normalization/scaling, before totals
    clampSodiumSpikes(items);

    if (items.length === 0) {
      return errorResponse(
        'Could not parse any food items from the description. Try listing each item clearly (e.g. "100g rice, 50ml soup, 2 tortillas").',
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

    // ——— STEP 3: Personalized feedback using the user's targets + today's log ———
    const feedback = await generateMealFeedback(userId, apiKey, items, total);

    const latencyMs = Date.now() - startMs;

    const payload: {
      items: NormalizedItem[];
      total: ReturnType<typeof computeTotal>;
      feedback?: string;
      debugLog?: unknown;
    } = {
      items,
      total,
      ...(feedback ? { feedback } : {}),
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
        userRequest: { text: mealText, source: source || 'direct', requestedAt },
        step1: {
          prompt: `User text: ${mealText}`,
          instructions: PARSE_INSTRUCTIONS,
          response: JSON.stringify({ items: parsedItems }, null, 2),
          parsedItems,
          usage: step1Usage,
        },
        step1_5: {
          brandedItems: brandedItems.map((i) => i.name),
          externalNutritionData: hasExternalData ? externalNutritionData : null,
          cacheHits: brandedItems.filter((i) => brandNutritionCache.has(i.name.toLowerCase().trim())).map((i) => i.name),
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
          pipeline: hasExternalData ? 'three-step-brand' : 'two-step',
        },
      };

      await writeDebugLog({
        userId,
        page: source === 'settings-todos' ? 'settings' : 'food',
        agent: source === 'settings-todos' ? 'todos-food-parser' : 'ai-logger',
        payload: payload.debugLog as Record<string, unknown>,
      });
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
