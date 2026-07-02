import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import DailyPlan from '@/models/DailyPlan';
import User from '@/models/User';
import { resolveOpenAIKey } from '@/lib/openaiKey';
import { createOpenAiJson } from '@/lib/openaiJson';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { getToday } from '@/lib/utils';
import { writeDebugLog } from '@/lib/debugLogWriter';
import { buildFoodPrompt, type FoodRequestBody, normalizeFoodPlan } from '../shared';
import { OPENAI_BEST_MODEL } from '@/lib/aiModel';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;
    await connectDB();

    const plan = await DailyPlan.findOne({ userId, date: getToday() })
      .select('foodPlan status')
      .lean() as { foodPlan?: unknown; status?: string } | null;

    return maskedResponse({ foodPlan: plan?.foodPlan ?? null, status: plan?.status ?? null });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Failed to fetch food plan', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const body = await req.json().catch(() => ({})) as FoodRequestBody;
    const apiKey = await resolveOpenAIKey(userId);
    if (!apiKey) return errorResponse('OpenAI API key required. Add your key in Settings to generate plans.', 403);

    await connectDB();
    const today = getToday();
    const user = await User.findById(userId)
      .select('settings.foodPreferences targets.protein targets.dailyCalories')
      .lean() as {
        settings?: {
          foodPreferences?: {
            dietaryPreference?: string;
            allergies?: string[];
          };
        };
        targets?: {
          protein?: number;
          dailyCalories?: number;
        };
      } | null;
    const dietaryPreference = body.dietaryPreference?.trim()
      || user?.settings?.foodPreferences?.dietaryPreference
      || 'no_preference';
    const allergies = Array.isArray(body.allergies) && body.allergies.length > 0
      ? body.allergies
      : (user?.settings?.foodPreferences?.allergies ?? []);
    const targetProteinG = Number(user?.targets?.protein) || undefined;
    const targetCalories = Number(user?.targets?.dailyCalories) || undefined;
    const systemPrompt = `You are a practical nutrition coach. Write every user-facing sentence like a warm human coach: plain everyday words, encouraging, a little playful when it fits. Never use em dashes. Create a simple food plan for TODAY based on the user's last-week food details.
Return JSON only with this shape:
{
  "foodPlan": {
    "suggestions": [
      {
        "name": "string",
        "description": "string",
        "calories": number,
        "protein": number,
        "carbs": number,
        "fat": number,
        "mealType": "breakfast" | "lunch" | "dinner" | "snack"
      }
    ],
    "reasoning": "string"
  }
}
Keep suggestions realistic and easy to follow.`;
    const userPrompt = buildFoodPrompt({ ...body, dietaryPreference, allergies, targetProteinG, targetCalories }, today);
    let openAiDebug:
      | {
          endpoint: string;
          requestBody: Record<string, unknown>;
          rawResponse: unknown;
          usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
          status: number;
        }
      | undefined;

    const runFoodGeneration = async (prompt: string) => {
      const ai = await createOpenAiJson<{
        foodPlan?: { suggestions?: unknown[]; reasoning?: string };
      }>({
        apiKey,
        systemPrompt,
        userPrompt: prompt,
        maxTokens: 1500,
        onDebug: (debug) => {
          openAiDebug = debug;
        },
      });
      return normalizeFoodPlan(ai.foodPlan ?? ai);
    };

    let foodPlan = await runFoodGeneration(userPrompt);
    const totalProtein = foodPlan.suggestions.reduce((sum, meal) => sum + (Number(meal.protein) || 0), 0);
    const minimumProteinFloor = targetProteinG && targetProteinG > 0
      ? Math.max(60, Math.round(targetProteinG * 0.75))
      : null;
    if (minimumProteinFloor && totalProtein < minimumProteinFloor) {
      const reinforcedPrompt = [
        userPrompt,
        `Critical correction: the previous plan was too low protein (${totalProtein}g).`,
        `Regenerate with total protein >= ${minimumProteinFloor}g while keeping calories realistic and meal quality practical.`,
        'Ensure breakfast/lunch/dinner each include meaningful protein sources.',
      ].join('\n');
      foodPlan = await runFoodGeneration(reinforcedPrompt);
    }

    await DailyPlan.findOneAndUpdate(
      { userId, date: today },
      {
        $set: {
          'foodPlan.suggestions': foodPlan.suggestions,
          'foodPlan.reasoning': foodPlan.reasoning ?? null,
          status: 'ready',
          generatedAt: new Date(),
        },
      },
      { new: true, upsert: true }
    ).lean();

    await writeDebugLog({
      userId,
      page: 'today-plan',
      agent: 'food',
      payload: {
        userRequest: {
          requestedAt: new Date().toISOString(),
          action: 'generate',
          date: today,
          body,
        },
        systemPrompt,
        userPrompt,
        openAiRequest: openAiDebug
          ? {
              endpoint: openAiDebug.endpoint,
              body: openAiDebug.requestBody,
              status: openAiDebug.status,
            }
          : null,
        openAiResponse: openAiDebug?.rawResponse ?? null,
        parsedResult: { foodPlan },
        metadata: {
          status: 'success',
          model: (typeof openAiDebug?.requestBody?.model === 'string' ? openAiDebug.requestBody.model : OPENAI_BEST_MODEL),
          usage: openAiDebug?.usage,
        },
      },
    });

    return maskedResponse({ foodPlan });
  } catch (err) {
    console.error('[Food Plan POST]:', err);
    const msg = err instanceof Error ? err.message : 'Failed to generate food plan';
    return errorResponse(msg, msg.includes('API key') ? 403 : 500);
  }
}
