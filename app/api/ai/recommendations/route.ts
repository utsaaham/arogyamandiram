// ============================================
// /api/ai/recommendations - AI-Powered Suggestions
// ============================================
// Uses OpenAI GPT for personalized recommendations.
// Requires user's OpenAI API key or server default.

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import DailyLog from '@/models/DailyLog';
import { decrypt } from '@/lib/encryption';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { getToday, getAgeFromDateOfBirth } from '@/lib/utils';

async function getOpenAIKey(userId: string): Promise<string | null> {
  await connectDB();
  const user = await User.findById(userId).select('+apiKeys.openai').lean();
  const apiKeys = user?.apiKeys as { openai?: string } | undefined;

  // User's own key first
  if (apiKeys?.openai) {
    return decrypt(apiKeys.openai);
  }

  // Fallback to server default
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }

  return null;
}

async function callOpenAI(apiKey: string, systemPrompt: string, userPrompt: string) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI API error: ${res.status}`);
  }

  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const { type, ...context } = await req.json();

    const apiKey = await getOpenAIKey(userId);
    if (!apiKey) {
      return errorResponse(
        'OpenAI API key required. Add your key in Settings to enable AI features.',
        403
      );
    }

    await connectDB();
    const user = await User.findById(userId).lean();
    if (!user) return errorResponse('User not found', 404);

    const profile = user.profile as { name?: string; age?: number; dateOfBirth?: Date | string; gender?: string; height?: number; weight?: number; activityLevel?: string; goal?: string; targetWeight?: number };
    const targets = user.targets;
    const age = profile.dateOfBirth
      ? getAgeFromDateOfBirth(profile.dateOfBirth)
      : (profile.age ?? 0);

    // Get recent logs for context
    const recentLogs = await DailyLog.find({ userId })
      .sort({ date: -1 })
      .limit(7)
      .lean();

    const profileContext = `
User Profile: ${profile.name}, ${age}y, ${profile.gender}, ${profile.height}cm, ${profile.weight}kg
Activity: ${profile.activityLevel}, Goal: ${profile.goal}, Target Weight: ${profile.targetWeight}kg
Daily Targets: ${targets.dailyCalories} kcal, ${targets.protein}g protein, ${targets.carbs}g carbs, ${targets.fat}g fat, ${targets.dailyWater}ml water
    `.trim();

    const recentContext = recentLogs.length > 0
      ? `Recent 7-day data: ${JSON.stringify(
          recentLogs.map((l) => ({
            date: l.date,
            cal: l.totalCalories,
            water: l.waterIntake,
            weight: l.weight,
            burned: l.caloriesBurned,
          }))
        )}`
      : 'No recent tracking data available.';

    let result;

    switch (type) {
      case 'meal': {
        const systemPrompt = `You are a nutritionist AI for an Indian health app called Arogyamandiram. Suggest Indian meals that fit the user's dietary needs. Always respond with JSON: { "suggestions": [{ "name": string, "description": string, "calories": number, "protein": number, "carbs": number, "fat": number, "mealType": "breakfast"|"lunch"|"dinner"|"snack", "ingredients": string[], "isVegetarian": boolean }] }. Include 4-6 suggestions. Focus on Indian cuisine.`;
        const userPrompt = `${profileContext}\n${recentContext}\nToday's date: ${getToday()}\n${context.mealType ? `Suggest for: ${context.mealType}` : 'Suggest meals for the full day'}\n${context.preferences ? `Preferences: ${context.preferences}` : ''}`;
        result = await callOpenAI(apiKey, systemPrompt, userPrompt);
        break;
      }

      case 'workout': {
        const systemPrompt = `You are a fitness trainer AI for Arogyamandiram health app. Create a workout plan based on user's goal and fitness level. Always respond with JSON: { "plan": { "name": string, "description": string, "exercises": [{ "name": string, "sets": number, "reps": string, "restSeconds": number, "category": "cardio"|"strength"|"flexibility"|"sports" }], "estimatedCalories": number, "durationMinutes": number } }`;
        const userPrompt = `${profileContext}\n${recentContext}\n${context.focusArea ? `Focus area: ${context.focusArea}` : ''}\n${context.duration ? `Duration: ${context.duration} minutes` : 'Duration: 30-45 minutes'}`;
        result = await callOpenAI(apiKey, systemPrompt, userPrompt);
        break;
      }

      case 'insights': {
        const systemPrompt = `You are a health analytics AI for Arogyamandiram. Analyze the user's recent tracking data and provide actionable insights. Always respond with JSON: { "insights": [{ "title": string, "description": string, "type": "success"|"warning"|"info"|"tip", "metric": string, "value": string }] }. Provide 4-6 insights. Be encouraging but honest.`;
        const userPrompt = `${profileContext}\n${recentContext}\nProvide weekly insights and recommendations.`;
        result = await callOpenAI(apiKey, systemPrompt, userPrompt);
        break;
      }

      default:
        return errorResponse('Invalid recommendation type. Use: meal, workout, or insights', 400);
    }

    return maskedResponse(result);
  } catch (err) {
    console.error('[AI Recommendations Error]:', err);
    const message = err instanceof Error ? err.message : 'AI recommendation failed';
    return errorResponse(message, 500);
  }
}
