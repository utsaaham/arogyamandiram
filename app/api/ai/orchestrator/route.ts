// ============================================
// /api/ai/orchestrator - Health command router
// ============================================
// One model reads the user's message, figures out what they meant,
// and sends it to the right health tool.

import { NextRequest } from 'next/server';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { resolveOpenAIKey } from '@/lib/openaiKey';
import { OPENAI_ORCHESTRATOR_MODEL } from '@/lib/aiModel';

export const dynamic = 'force-dynamic';

// ─── Types ──────────────────────────────────────────────────────────────────

type OrchestratorTool =
  | 'water'
  | 'weight'
  | 'sleep'
  | 'food-ai-logger'
  | 'meal-ideas'
  | 'workout-ai-logger'
  | 'workout-plan'
  | 'custom-food'
  | 'unknown';

interface IntentParams {
  // water
  amount_ml?: number;
  // weight
  weight_kg?: number;
  // sleep
  duration_hours?: number;
  quality?: number;
  // food / workout AI logger
  text?: string;
  // meal-ideas
  meal_types?: string[];
  preferences?: string;
  // workout-plan
  focus_area?: string;
  duration_minutes?: number;
}

interface ClassifyResult {
  tool: OrchestratorTool;
  params: IntentParams;
  confidence: 'high' | 'medium' | 'low';
}

// ─── Intent Classification Tool Schema ──────────────────────────────────────

const ORCHESTRATOR_SYSTEM = `You route health-related messages for Arogyamandiram.
Read the user's natural language input, decide which tool to use, and extract the needed parameters.

Available tools:
- water: Log water intake. Extract amount_ml (convert: 1 glass/cup = 250ml, 1 bottle = 500ml).
- weight: Log body weight. Extract weight_kg (convert lbs → kg if needed: 1 lb = 0.453592 kg).
- sleep: Log sleep. Extract duration_hours (number), quality (1=very poor, 2=poor, 3=fair, 4=good, 5=excellent; default 3 if not mentioned).
- food-ai-logger: Parse and log food or meals. Use this when user mentions eating, food, meals, snacks. Extract text (the user's original input as-is).
- meal-ideas: Suggest meal ideas. Use when user asks for suggestions, ideas, or what to eat. Extract meal_types (array of: breakfast, lunch, dinner, snack) based on context; extract preferences (any dietary notes, default "").
- workout-ai-logger: Parse and log completed workouts. Use when user mentions exercise they already did. Extract text (the user's original input as-is).
- workout-plan: Generate a workout plan. Use when user wants a plan, routine, or scheduled workout. Extract focus_area (upper body/lower body/full body/core/cardio/flexibility, default "full body") and duration_minutes (15–60, default 30).
- custom-food: User wants to manually enter a custom food item without AI parsing.

- unknown: Use this when the input is not related to health logging at all (greetings, random text, questions you can't answer, etc.).

Confidence: high if intent is clear, medium if somewhat ambiguous, low if very unclear.
If the input is a greeting, gibberish, or clearly not a health command, use tool=unknown.
Always call classify_intent. Do not reply in plain text.`;

const CLASSIFY_TOOL = {
  type: 'function' as const,
  name: 'classify_intent',
  description: 'Classify the user health command intent and extract parameters',
  parameters: {
    type: 'object',
    properties: {
      tool: {
        type: 'string',
        enum: ['water', 'weight', 'sleep', 'food-ai-logger', 'meal-ideas', 'workout-ai-logger', 'workout-plan', 'custom-food', 'unknown'],
        description: 'Which tool to use',
      },
      params: {
        type: 'object',
        properties: {
          amount_ml: { type: 'number', description: 'Water amount in ml' },
          weight_kg: { type: 'number', description: 'Weight in kg' },
          duration_hours: { type: 'number', description: 'Sleep duration in hours' },
          quality: { type: 'number', description: 'Sleep quality 1-5' },
          text: { type: 'string', description: 'Original user input for AI parsers' },
          meal_types: {
            type: 'array',
            items: { type: 'string' },
            description: 'Meal types for meal ideas',
          },
          preferences: { type: 'string', description: 'Dietary preferences for meal ideas' },
          focus_area: { type: 'string', description: 'Workout focus area' },
          duration_minutes: { type: 'number', description: 'Workout plan duration in minutes' },
        },
        required: [],
        additionalProperties: false,
      },
      confidence: {
        type: 'string',
        enum: ['high', 'medium', 'low'],
        description: 'How confident the classification is',
      },
    },
    required: ['tool', 'params', 'confidence'],
    additionalProperties: false,
  },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nowTimeString(): string {
  const d = new Date();
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function subtractHoursFromNow(hours: number): string {
  const d = new Date(Date.now() - hours * 60 * 60 * 1000);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ─── AI Tool Executors (call existing routes) ─────────────────────────────────

async function callInternalRoute(
  req: NextRequest,
  path: string,
  body: Record<string, unknown>
) {
  const { origin } = new URL(req.url);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    cookie: req.headers.get('cookie') ?? '',
  };
  // Forward cron bypass headers so sub-routes can also skip auth
  const cronSecret = req.headers.get('x-cron-secret');
  const internalUserId = req.headers.get('x-internal-user-id');
  if (cronSecret) headers['x-cron-secret'] = cronSecret;
  if (internalUserId) headers['x-internal-user-id'] = internalUserId;

  const res = await fetch(`${origin}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json() as { success: boolean; data?: unknown; error?: string };
  return { status: res.status, json };
}

// ─── Main Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Allow cron-originated calls to bypass session auth using an internal header.
    // Only accepted when X-Cron-Secret matches the CRON_SECRET env var.
    const cronSecret = req.headers.get('x-cron-secret');
    const internalUserId = req.headers.get('x-internal-user-id');
    const isCronBypass =
      Boolean(process.env.CRON_SECRET) &&
      cronSecret === process.env.CRON_SECRET &&
      Boolean(internalUserId);

    let userId: string;
    if (isCronBypass) {
      userId = internalUserId!;
    } else {
      const authResult = await getAuthUserId();
      if (!isUserId(authResult)) return authResult;
      userId = authResult;
    }

    const body = (await req.json()) as { text?: string; imageBase64?: string; imageMimeType?: string };
    const { imageBase64, imageMimeType } = body;
    const text = body.text ?? '';
    if (!text.trim() && !imageBase64) {
      return errorResponse('text or image is required', 400);
    }
    const userInput = text.trim().slice(0, 600);

    const openaiKey = await resolveOpenAIKey(String(userId));
    if (!openaiKey) {
      return errorResponse('No OpenAI API key configured. Add one in Settings → API Keys.', 400);
    }

    // ── Step 1: Intent Classification ──────────────────────────────────────
    const classifySystemPrompt = imageBase64
      ? `${ORCHESTRATOR_SYSTEM}\nThe user has also attached an image. Use it to help identify food items, workout equipment, or other health-relevant content. If the image shows food or drink, choose food-ai-logger - the food tool will analyze the photo itself, so params.text only needs the user's own words (or "" if they wrote nothing).`
      : ORCHESTRATOR_SYSTEM;
    const classifyUserPrompt = userInput || '(image attached)';

    const openaiRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_ORCHESTRATOR_MODEL,
        instructions: classifySystemPrompt,
        input: imageBase64
          ? [
              {
                role: 'user',
                content: [
                  { type: 'input_text', text: classifyUserPrompt },
                  { type: 'input_image', image_url: `data:${imageMimeType ?? 'image/jpeg'};base64,${imageBase64}` },
                ],
              },
            ]
          : classifyUserPrompt,
        tools: [CLASSIFY_TOOL],
        tool_choice: { type: 'function', name: 'classify_intent' },
        temperature: 0,
      }),
    });

    if (!openaiRes.ok) {
      const errBody = await openaiRes.text();
      console.error('[Orchestrator] OpenAI classify error:', errBody);
      return errorResponse("I couldn't quite make sense of that one 🙈 mind trying again?", 502);
    }

    const classifyData = await openaiRes.json() as {
      output?: Array<{
        type: string;
        name?: string;
        arguments?: string;
        content?: Array<{ type: string; text?: string }>;
      }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    // Extract tool call result
    const toolCallItem = classifyData.output?.find(
      (o) => o.type === 'function_call' && o.name === 'classify_intent'
    );
    if (!toolCallItem?.arguments) {
      return errorResponse('Orchestrator could not classify intent', 422);
    }

    let classified: ClassifyResult;
    try {
      classified = JSON.parse(toolCallItem.arguments) as ClassifyResult;
    } catch {
      return errorResponse('Failed to parse intent classification', 422);
    }

    // ── Step 2: Tool Execution ───────────────────────────────────────────────
    const { tool, params } = classified;
    let result: Record<string, unknown>;

    if (tool === 'water') {
      const amountMl = Math.round(Number(params.amount_ml) || 250);
      result = {
        summary: `${amountMl}ml of hydration goodness coming up 💧 shall I pour it into your log?`,
        pendingWater: { amountMl },
      };
    } else if (tool === 'weight') {
      const weightKg = Number(params.weight_kg) || 0;
      if (!weightKg || weightKg <= 0) {
        return errorResponse('Could not extract a valid weight value', 422);
      }
      result = {
        summary: `Noting you at ${weightKg} kg, looking good 😉 want me to save it?`,
        pendingWeight: { weightKg },
      };
    } else if (tool === 'sleep') {
      const durationHours = Number(params.duration_hours) || 0;
      if (!durationHours || durationHours <= 0 || durationHours > 24) {
        return errorResponse('Could not extract a valid sleep duration', 422);
      }
      const quality = Math.min(5, Math.max(1, Math.round(Number(params.quality) || 3)));
      const qualityLabel = quality === 1 ? 'Very Poor' : quality === 2 ? 'Poor' : quality === 3 ? 'Fair' : quality === 4 ? 'Good' : 'Excellent';
      const wakeTime = nowTimeString();
      const bedtime = subtractHoursFromNow(durationHours);
      result = {
        summary: `${durationHours}h of beauty sleep, ${qualityLabel.toLowerCase()} quality 😴 shall I tuck it into your log?`,
        pendingSleep: { durationHours, quality, bedtime, wakeTime },
      };
    } else if (tool === 'food-ai-logger') {
      const foodText = params.text || userInput;
      const { status, json } = await callInternalRoute(req, '/api/ai/food-logger', {
        text: foodText,
        ...(imageBase64 ? { imageBase64, imageMimeType } : {}),
      });
      const d = (json as { data?: { items?: unknown[]; total?: unknown; feedback?: string } }).data;
      if (!json.success || !d?.items?.length) {
        return errorResponse((json as { error?: string }).error || 'Food logging failed', status);
      }
      result = {
        summary: d.items.length === 1
          ? 'I found one food item. Review the details below.'
          : `I found ${d.items.length} food items. Review the details below.`,
        foodItems: d.items,
        foodTotal: d.total as Record<string, number> | undefined,
        ...(d.feedback ? { feedback: d.feedback } : {}),
      };
    } else if (tool === 'meal-ideas') {
      const mealTypes = Array.isArray(params.meal_types) && params.meal_types.length > 0
        ? params.meal_types
        : ['lunch'];
      const toolPayload = { selectedMealTypes: mealTypes, preferences: params.preferences ?? '' };
      const { status, json } = await callInternalRoute(req, '/api/ai/meal-ideas', toolPayload);
      const d2 = (json as { data?: { suggestions?: unknown[] } }).data;
      if (!json.success || !d2?.suggestions) {
        return errorResponse((json as { error?: string }).error || 'Meal ideas failed', status);
      }
      result = {
        summary: `Whipped up ${(d2.suggestions as unknown[]).length} tasty idea${(d2.suggestions as unknown[]).length !== 1 ? 's' : ''} just for you 😘`,
        mealSuggestions: d2.suggestions,
      };
    } else if (tool === 'workout-ai-logger') {
      const toolPayload = { text: params.text || userInput };
      const { status, json } = await callInternalRoute(req, '/api/ai/workout-logger', toolPayload);
      const d3 = (json as { data?: { workouts?: unknown[] } }).data;
      if (!json.success || !d3?.workouts?.length) {
        return errorResponse((json as { error?: string }).error || 'Workout logging failed', status);
      }
      result = {
        summary: `Look at you go 💪 I caught ${d3.workouts.length} workout${d3.workouts.length !== 1 ? 's' : ''} in there. Want me to log ${d3.workouts.length !== 1 ? 'them' : 'it'}?`,
        workoutItems: d3.workouts,
      };
    } else if (tool === 'workout-plan') {
      const focusArea = params.focus_area || 'full body';
      const durationMinutes = Number(params.duration_minutes) || 30;
      const toolPayload = { type: 'workout', focusArea, duration: durationMinutes };
      const { status, json } = await callInternalRoute(req, '/api/ai/recommendations', toolPayload);
      const d4 = (json as { data?: { plan?: unknown } }).data;
      if (!json.success || !d4?.plan) {
        return errorResponse((json as { error?: string }).error || 'Workout plan failed', status);
      }
      result = {
        summary: `Made you a ${durationMinutes} min ${focusArea} plan, now go crush it for me 💪`,
        workoutPlan: d4.plan as Record<string, unknown>,
      };
    } else if (tool === 'custom-food') {
      result = {
        summary: 'Opening the kitchen for you 😋',
        openCustomFood: true,
      };
    } else {
      // unknown - not a health command
      result = {
        summary: "Hmm, that one went over my head 🙈 whisper me things like \"I drank 500ml of water\" or \"had rice for lunch\" and I'll take care of the rest 💛",
      };
    }

    return maskedResponse({
      tool,
      result,
    });
  } catch (err) {
    console.error('[Orchestrator Error]:', err);
    return errorResponse('Orchestrator failed', 500, err instanceof Error ? err.message : undefined);
  }
}
