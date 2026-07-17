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
import { COACH_TONE } from '@/lib/tone';

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
            favoriteCuisines?: string[];
            cookingSkill?: string;
            maxCookingMinutes?: number;
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
    const favoriteCuisines = Array.isArray(body.favoriteCuisines) && body.favoriteCuisines.length > 0
      ? body.favoriteCuisines
      : (user?.settings?.foodPreferences?.favoriteCuisines ?? []);
    const cookingSkill = body.cookingSkill?.trim()
      || user?.settings?.foodPreferences?.cookingSkill
      || 'beginner';
    const maxCookingMinutes = Number(body.maxCookingMinutes)
      || Number(user?.settings?.foodPreferences?.maxCookingMinutes)
      || 30;
    const targetProteinG = Number(user?.targets?.protein) || undefined;
    const targetCalories = Number(user?.targets?.dailyCalories) || undefined;
    const systemPrompt = `You are Ciel, the user's practical nutrition guide. ${COACH_TONE} Create a simple food plan for today based on the user's last week of food details.
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
        "mealType": "breakfast" | "lunch" | "dinner" | "snack",
        "ingredients": ["quantity + ingredient"],
        "steps": ["short cooking step in order"],
        "prepMinutes": number,
        "cookMinutes": number,
        "isVegetarian": boolean
      }
    ],
    "reasoning": "string"
  }
}
Keep suggestions realistic and easy to follow. Ciel should explain how to make every dish, not just name it.`;
    const userPrompt = buildFoodPrompt({
      ...body,
      dietaryPreference,
      allergies,
      favoriteCuisines,
      cookingSkill,
      maxCookingMinutes,
      targetProteinG,
      targetCalories,
    }, today);
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
        maxTokens: 3000,
        onDebug: (debug) => {
          openAiDebug = debug;
        },
      });
      return normalizeFoodPlan(ai.foodPlan ?? ai);
    };

    let foodPlan = await runFoodGeneration(userPrompt);
    const totalProtein = foodPlan.suggestions.reduce((sum, meal) => sum + (Number(meal.protein) || 0), 0);
    const totalCalories = foodPlan.suggestions.reduce((sum, meal) => sum + (Number(meal.calories) || 0), 0);
    const proteinRange = targetProteinG && targetProteinG > 0
      ? { min: Math.round(targetProteinG) + 5, max: Math.round(targetProteinG) + 10 }
      : null;
    const calorieRange = targetCalories && targetCalories > 0
      ? { min: Math.round(targetCalories * 0.9), max: Math.round(targetCalories * 0.95) }
      : null;
    const proteinOutsideRange = proteinRange
      ? totalProtein < proteinRange.min || totalProtein > proteinRange.max
      : false;
    const caloriesOutsideRange = calorieRange
      ? totalCalories < calorieRange.min || totalCalories > calorieRange.max
      : false;
    if (proteinOutsideRange || caloriesOutsideRange) {
      const reinforcedPrompt = [
        userPrompt,
        `Critical correction: the previous totals were ${totalProtein}g protein and ${totalCalories} kcal.`,
        proteinRange ? `Regenerate with total protein between ${proteinRange.min}g and ${proteinRange.max}g.` : '',
        calorieRange ? `Regenerate with total calories between ${calorieRange.min} and ${calorieRange.max} kcal.` : '',
        'Use vegetables, fruit, whole grains, legumes, lean proteins, and unsaturated fats. Keep processed foods, added sugar, and excess sodium low.',
        'Add every meal total before responding and stay inside both ranges.',
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
