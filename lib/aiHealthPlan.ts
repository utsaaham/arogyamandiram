// ============================================
// AI Health Plan - Shared logic for generating personalized targets
// ============================================

import connectDB from '@/lib/db';
import User from '@/models/User';
import { decrypt } from '@/lib/encryption';
import { getAgeFromDateOfBirth } from '@/lib/utils';
import { calculateIdealWeight } from '@/lib/health';
import type { UserTargets } from '@/types';

type OpenAIUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

export async function getOpenAIKeyForHealthPlan(userId: string): Promise<string | null> {
  await connectDB();
  const user = await User.findById(userId).select('+apiKeys.openai').lean();
  const apiKeys = user?.apiKeys as { openai?: string } | undefined;

  if (apiKeys?.openai) {
    try {
      return decrypt(apiKeys.openai);
    } catch (err) {
      console.error('[AI Health Plan Encryption Error]: Failed to decrypt user OpenAI key', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
      // fall through to server-level key or null
    }
  }

  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  return null;
}

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<{
  parsed: Record<string, unknown>;
  rawText: string;
  usage: OpenAIUsage;
  latencyMs: number;
  model: string;
  timestamp: string;
}> {
  const startedAt = Date.now();
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
  const rawText = data?.choices?.[0]?.message?.content;
  if (typeof rawText !== 'string' || !rawText.trim()) {
    throw new Error('OpenAI returned an empty response.');
  }
  return {
    parsed: JSON.parse(rawText),
    rawText,
    usage: (data?.usage ?? {}) as OpenAIUsage,
    latencyMs: Math.max(0, Date.now() - startedAt),
    model: typeof data?.model === 'string' ? data.model : 'gpt-4o-mini',
    timestamp: new Date().toISOString(),
  };
}

function normalizeIdealWeight(
  rawIdealWeight: unknown,
  heightCm?: number,
  gender?: string
): number {
  const numeric = Number(rawIdealWeight);
  const hasHeight = typeof heightCm === 'number' && heightCm > 0;
  const inferredGender = gender === 'female' ? 'female' : 'male';

  // If model returned BMI-like value (e.g. 21.6), convert to kg using height.
  if (Number.isFinite(numeric) && numeric >= 10 && numeric < 40 && hasHeight) {
    const heightM = (heightCm as number) / 100;
    const weightKg = numeric * heightM * heightM;
    return Math.round(Math.max(40, Math.min(200, weightKg)) * 10) / 10;
  }

  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.round(Math.max(40, Math.min(200, numeric)) * 10) / 10;
  }

  if (hasHeight) {
    return calculateIdealWeight(heightCm as number, inferredGender);
  }

  return 70;
}

export function clampTargets(
  raw: Record<string, unknown>,
  profileContext?: { heightCm?: number; gender?: string }
): UserTargets {
  return {
    dailyCalories: Math.max(1200, Math.min(5000, Number(raw.dailyCalories) || 2000)),
    dailyWater: Math.max(1000, Math.min(6000, Number(raw.dailyWater) || 2500)),
    protein: Math.max(50, Math.min(300, Number(raw.protein) || 100)),
    carbs: Math.max(100, Math.min(500, Number(raw.carbs) || 200)),
    fat: Math.max(40, Math.min(150, Number(raw.fat) || 65)),
    idealWeight: normalizeIdealWeight(
      raw.idealWeight,
      profileContext?.heightCm,
      profileContext?.gender
    ),
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
    "idealWeight": number (kg, actual body weight target in kilograms, NOT BMI),
    "dailyWorkoutMinutes": number (15-120, recommended daily exercise duration),
    "dailyCalorieBurn": number (kcal to burn via exercise per day, 100-1000),
    "sleepHours": number (6-10, recommended sleep)
  },
  "explanations": {
    "idealWeight": "one short sentence with the computed kg value",
    "dailyCalories": "one short sentence with rationale",
    "dailyWater": "one short sentence with rationale",
    "protein": "one short sentence with rationale",
    "fat": "one short sentence with rationale",
    "dailyWorkoutMinutes": "one short sentence with rationale",
    "sleepHours": "one short sentence with rationale",
    "note": "one short personalized coaching note"
  }
}
Use science-backed ranges.
For idealWeight:
- choose a healthy BMI (18.5-24.9), then convert to kg as weight_kg = BMI * (height_m)^2
- return actual weight in kilograms, not BMI value
- example: height 170cm, BMI 22 => 22 * 1.70^2 = 63.6 kg
For water consider weight and activity. For calories use TDEE-based estimate for their goal (lose/maintain/gain). For workout minutes and calorie burn align with WHO guidelines and their goal. All numbers must be integers except idealWeight (one decimal).`;

export interface GenerateHealthPlanResult {
  targets: UserTargets;
  explanations: Record<string, string> | null;
  debugLog?: Record<string, unknown>;
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

  const requestedAt = new Date().toISOString();
  const userPrompt = `User: ${profile.name ?? 'User'}, ${age} years, ${gender}, ${height} cm, ${weight} kg. Activity: ${activityLevel}. Goal: ${goal}.${targetWeight != null ? ` Target weight: ${targetWeight} kg.` : ''} Generate the health plan JSON.`;

  const ai = await callOpenAI(apiKey, SYSTEM_PROMPT, userPrompt);
  const result = ai.parsed;
  const rawTargets: Record<string, unknown> =
    result.targets && typeof result.targets === 'object'
      ? (result.targets as Record<string, unknown>)
      : {};
  const targets = clampTargets(rawTargets, {
    heightCm: height,
    gender,
  });
  const explanations: Record<string, string> | null =
    result.explanations && typeof result.explanations === 'object'
      ? Object.fromEntries(
          Object.entries(result.explanations as Record<string, unknown>)
            .filter(([, value]) => typeof value === 'string')
            .map(([key, value]) => [key, value as string])
        )
      : null;
  const isDebugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';
  const debugLog = isDebugMode
    ? {
        userRequest: {
          requestedAt,
          profile: {
            age,
            gender,
            height,
            weight,
            activityLevel,
            goal,
            ...(targetWeight != null ? { targetWeight } : {}),
          },
        },
        systemPrompt: SYSTEM_PROMPT,
        userPrompt,
        response: ai.rawText,
        parsedResult: result,
        clampedTargets: targets,
        explanations,
        metadata: {
          model: ai.model,
          usage: ai.usage,
          latencyMs: ai.latencyMs,
          timestamp: ai.timestamp,
          status: 'success',
        },
      }
    : undefined;

  return { targets, explanations, ...(debugLog ? { debugLog } : {}) };
}
