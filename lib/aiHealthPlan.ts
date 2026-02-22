// ============================================
// AI Health Plan - Shared logic for generating personalized targets
// ============================================

import connectDB from '@/lib/db';
import User from '@/models/User';
import { decrypt } from '@/lib/encryption';
import { getAgeFromDateOfBirth } from '@/lib/utils';
import type { UserTargets } from '@/types';

export async function getOpenAIKeyForHealthPlan(userId: string): Promise<string | null> {
  await connectDB();
  const user = await User.findById(userId).select('+apiKeys.openai').lean();
  const apiKeys = user?.apiKeys as { openai?: string } | undefined;
  if (apiKeys?.openai) return decrypt(apiKeys.openai);
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
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
      temperature: 0.5,
      max_tokens: 1200,
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

export function clampTargets(raw: Record<string, unknown>): UserTargets {
  return {
    dailyCalories: Math.max(1200, Math.min(5000, Number(raw.dailyCalories) || 2000)),
    dailyWater: Math.max(1000, Math.min(6000, Number(raw.dailyWater) || 2500)),
    protein: Math.max(50, Math.min(300, Number(raw.protein) || 100)),
    carbs: Math.max(100, Math.min(500, Number(raw.carbs) || 200)),
    fat: Math.max(40, Math.min(150, Number(raw.fat) || 65)),
    idealWeight: Math.max(40, Math.min(200, Number(raw.idealWeight) || 70)),
    dailyWorkoutMinutes: Math.max(15, Math.min(120, Number(raw.dailyWorkoutMinutes) || 30)),
    dailyCalorieBurn: Math.max(100, Math.min(1000, Number(raw.dailyCalorieBurn) || 400)),
    sleepHours: Math.max(6, Math.min(10, Number(raw.sleepHours) || 8)),
  };
}

const SYSTEM_PROMPT = `You are a certified nutritionist and fitness expert for the Indian health app Arogyamandiram. Generate a personalized health plan based on the user's profile. Respond ONLY with valid JSON in this exact shape (no markdown, no extra text):
{
  "targets": {
    "dailyCalories": number (kcal, 1200-5000),
    "dailyWater": number (ml, 1000-6000),
    "protein": number (grams),
    "carbs": number (grams),
    "fat": number (grams),
    "idealWeight": number (kg, healthy range for their height/gender),
    "dailyWorkoutMinutes": number (15-120, recommended daily exercise duration),
    "dailyCalorieBurn": number (kcal to burn via exercise per day, 100-1000),
    "sleepHours": number (6-10, recommended sleep)
  },
  "explanations": {
    "idealWeight": "one short sentence",
    "dailyCalories": "one short sentence",
    "dailyWater": "one short sentence",
    "dailyWorkoutMinutes": "one short sentence",
    "sleepHours": "one short sentence"
  }
}
Use science-backed ranges. For ideal weight use healthy BMI range for height and gender. For water consider weight and activity. For calories use TDEE-based estimate for their goal (lose/maintain/gain). For workout minutes and calorie burn align with WHO guidelines and their goal. All numbers must be integers except idealWeight (one decimal).`;

export interface GenerateHealthPlanResult {
  targets: UserTargets;
  explanations: Record<string, string> | null;
}

/**
 * Generate AI health plan targets for a user. Returns null if no API key or error.
 */
export async function generateHealthPlanTargets(userId: string): Promise<GenerateHealthPlanResult | null> {
  const apiKey = await getOpenAIKeyForHealthPlan(userId);
  if (!apiKey) return null;

  await connectDB();
  const user = await User.findById(userId).lean();
  if (!user) return null;

  const profile = user.profile as {
    name?: string;
    age?: number;
    dateOfBirth?: Date | string;
    gender?: string;
    height?: number;
    weight?: number;
    activityLevel?: string;
    goal?: string;
    targetWeight?: number;
  };

  const age = profile.dateOfBirth
    ? getAgeFromDateOfBirth(profile.dateOfBirth)
    : (profile.age ?? 25);
  const height = profile.height ?? 170;
  const weight = profile.weight ?? 70;
  const gender = profile.gender ?? 'male';
  const activityLevel = profile.activityLevel ?? 'moderate';
  const goal = profile.goal ?? 'maintain';
  const targetWeight = profile.targetWeight;

  const userPrompt = `User: ${profile.name ?? 'User'}, ${age} years, ${gender}, ${height} cm, ${weight} kg. Activity: ${activityLevel}. Goal: ${goal}.${targetWeight != null ? ` Target weight: ${targetWeight} kg.` : ''} Generate the health plan JSON.`;

  const result = await callOpenAI(apiKey, SYSTEM_PROMPT, userPrompt);
  const rawTargets = result?.targets && typeof result.targets === 'object' ? result.targets : {};
  const targets = clampTargets(rawTargets);
  const explanations = result?.explanations && typeof result.explanations === 'object' ? result.explanations : null;

  return { targets, explanations };
}
