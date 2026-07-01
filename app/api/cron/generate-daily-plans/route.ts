// ============================================
// /api/cron/generate-daily-plans — Nightly plan generation
// ============================================
// Called by Vercel Cron at 23:55 daily.
// For each user with an OpenAI key: analyzes today's logs, derives fitness
// level, and generates tomorrow's personalized food + workout plan.

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import DailyLog from '@/models/DailyLog';
import DailyPlan from '@/models/DailyPlan';
import { decrypt } from '@/lib/encryption';
import { createOpenAiJson } from '@/lib/openaiJson';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getToday, getAgeFromDateOfBirth } from '@/lib/utils';
import { getLatestLoggedWeight } from '@/lib/latestWeight';
import { deriveFitnessLevel } from '@/lib/deriveFitnessLevel';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes — needed for large user bases

// ─── Auth ────────────────────────────────────────────────────────────────────

function validateCronSecret(req: NextRequest): boolean {
  const secret =
    req.headers.get('x-cron-secret') ??
    req.headers.get('authorization')?.replace('Bearer ', '');
  return Boolean(process.env.CRON_SECRET && secret === process.env.CRON_SECRET);
}

// ─── Generate plan for one user ──────────────────────────────────────────────

async function generateForUser(
  userId: string,
  apiKey: string,
  tomorrowDate: string
): Promise<void> {
  const user = await User.findById(userId).lean();
  if (!user) return;

  const profile = user.profile as {
    age?: number; dateOfBirth?: Date | string; gender?: string;
    height?: number; weight?: number; activityLevel?: string; goal?: string;
    targetWeight?: number; bodyType?: string; bodyFat?: number;
    fatFocusAreas?: string[]; fitnessLevelDerived?: string;
  };
  const targets = user.targets as {
    dailyCalories?: number; dailyWater?: number; protein?: number; carbs?: number;
    fat?: number; idealWeight?: number; dailyWorkoutMinutes?: number;
    dailyCalorieBurn?: number; sleepHours?: number;
  };
  const foodPreferences = (user.settings as { foodPreferences?: { dietaryPreference?: string; allergies?: string[] } } | undefined)?.foodPreferences;
  const dietaryPreference = foodPreferences?.dietaryPreference || 'no_preference';
  const allergies = Array.isArray(foodPreferences?.allergies) ? foodPreferences.allergies : [];

  const age = profile.dateOfBirth
    ? getAgeFromDateOfBirth(profile.dateOfBirth)
    : (profile.age ?? 0);
  const latestWeight = await getLatestLoggedWeight(userId);
  const currentWeight = latestWeight ?? profile.weight;

  // Derive fitness level
  const fitnessLevel = await deriveFitnessLevel(userId);

  // Today's log for gap analysis
  const today = getToday();
  const todayLog = await DailyLog.findOne({ userId, date: today }).lean() as {
    totalCalories?: number; totalProtein?: number;
  } | null;

  const todayProtein = Number(todayLog?.totalProtein) || 0;
  const todayCalories = Number(todayLog?.totalCalories) || 0;
  const proteinGap = Math.max(0, (targets.protein ?? 150) - todayProtein);
  const calorieGap = (targets.dailyCalories ?? 2000) - todayCalories;

  // Recent 7 days for trend
  const recentLogs = await DailyLog.find({ userId })
    .sort({ date: -1 })
    .limit(7)
    .lean() as { date: string; totalCalories?: number; totalProtein?: number; waterIntake?: number; workouts?: { duration?: number }[]; sleep?: { duration?: number; quality?: number } }[];

  // Today's feedback for adaptation
  const todayPlan = await DailyPlan.findOne({ userId, date: today }).lean() as {
    feedback?: { dislikedFoods?: string[]; workoutDifficulty?: string };
  } | null;
  const dislikedFoods = todayPlan?.feedback?.dislikedFoods ?? [];
  const lastDifficulty = todayPlan?.feedback?.workoutDifficulty ?? 'just_right';

  // Workout frequency
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 13);
  const cutoff = cutoffDate.toISOString().split('T')[0];
  const workoutDays = await DailyLog.countDocuments({
    userId,
    date: { $gte: cutoff },
    'workouts.0': { $exists: true },
  });
  const workoutsPerWeek = workoutDays / 2;

  const generationContext = {
    yesterdayProteinG: todayProtein,
    proteinGapG: proteinGap,
    yesterdayCalories: todayCalories,
    calorieGap,
    recentWorkoutsPerWeek: workoutsPerWeek,
    avgWorkoutDurationMin: 0,
  };

  // Avg calorie data for prediction
  const avgCalories = recentLogs.length > 0
    ? recentLogs.reduce((s, l) => s + (Number(l.totalCalories) || 0), 0) / recentLogs.length
    : 0;
  const avgDeficit = avgCalories > 0 ? (targets.dailyCalories ?? 2000) - avgCalories : 0;
  const weeklyWeightChangeKg = avgDeficit !== 0 ? Number((-(avgDeficit * 7 / 7700)).toFixed(2)) : 0;

  const profileContext = [
    `Profile: age ${age}y, gender ${profile.gender ?? '—'}, height ${profile.height ?? '—'}cm, weight ${currentWeight ?? '—'}kg.`,
    `Goal: ${profile.goal ?? '—'}, target weight ${profile.targetWeight ?? '—'}kg, activity ${profile.activityLevel ?? '—'}.`,
    `Body: type ${profile.bodyType ?? '—'}, body fat ${profile.bodyFat != null ? profile.bodyFat + '%' : '—'}, fitness ${fitnessLevel}, focus areas: ${profile.fatFocusAreas?.join(', ') || '—'}.`,
    `Targets: ${targets.dailyCalories ?? 2000} kcal, protein ${targets.protein ?? 150}g, water ${targets.dailyWater ?? 2500}ml, workout ${targets.dailyWorkoutMinutes ?? 30}min, sleep ${targets.sleepHours ?? 8}h.`,
  ].join('\n');

  const recentContext = recentLogs.length > 0
    ? `Recent logs: ${JSON.stringify(recentLogs.map(l => ({
        d: l.date,
        cal: Number(l.totalCalories) || 0,
        p: Number(l.totalProtein) || 0,
        wm: Array.isArray(l.workouts) ? l.workouts.reduce((s, w) => s + (Number(w?.duration) || 0), 0) : 0,
      })))}`
    : 'No recent tracking data.';

  const systemPrompt = `You are an elite AI health coach for Arogyamandiram. Generate a complete personalized daily health plan.

IMPORTANT: Respond with this exact JSON:
{
  "topInsight": "One sentence: the #1 priority for the user tomorrow",
  "foodPlan": {
    "suggestions": [{ "name": string, "description": string, "calories": number, "protein": number, "carbs": number, "fat": number, "mealType": "breakfast"|"lunch"|"dinner"|"snack", "ingredients": [string], "isVegetarian": boolean }],
    "reasoning": "1-2 sentences explaining WHY this food plan"
  },
  "workoutPlan": {
    "name": string, "description": string, "progressionTip": string,
    "exercises": [{ "name": string, "sets": number, "reps": string, "durationMinutes": number, "restSeconds": number, "intensity": "low"|"medium"|"high", "category": "cardio"|"strength"|"flexibility"|"sports" }],
    "estimatedCalories": number, "durationMinutes": number, "reasoning": string
  },
  "prediction": { "weeklyWeightChangeKg": number, "projectedWeightKg": number, "basis": string }
}

Rules: 4-6 food suggestions across multiple meal types, avoid disliked foods, adjust workout intensity based on difficulty feedback, protein-focused if gap > 20g.`;

  const userPrompt = [
    profileContext,
    recentContext,
    `Today's intake: ${todayCalories} kcal, ${todayProtein}g protein. Protein gap: ${proteinGap}g.`,
    `Dietary preference: ${dietaryPreference}.`,
    `Allergies or foods to avoid: ${allergies.length > 0 ? allergies.join(', ') : 'None provided'}.`,
    dislikedFoods.length > 0 ? `Avoid foods: ${dislikedFoods.join(', ')}.` : '',
    lastDifficulty === 'too_hard' ? 'Last workout was too hard — suggest lighter/recovery session.' : '',
    lastDifficulty === 'too_easy' ? 'Last workout was too easy — increase difficulty slightly.' : '',
    avgCalories > 0 ? `Avg intake: ${Math.round(avgCalories)} kcal/day. ${avgDeficit > 0 ? 'Deficit' : 'Surplus'}: ${Math.abs(Math.round(avgDeficit))} kcal/day.` : '',
    `Plan date: ${tomorrowDate}`,
  ].filter(Boolean).join('\n');

  const parsed = await createOpenAiJson<{
    topInsight?: string;
    foodPlan?: { suggestions?: unknown[]; reasoning?: string };
    workoutPlan?: Record<string, unknown>;
    prediction?: { weeklyWeightChangeKg?: number; projectedWeightKg?: number; basis?: string };
  }>({
    apiKey,
    systemPrompt,
    userPrompt,
    maxTokens: 2500,
  });

  // Build prediction with fallback math
  const prediction = parsed.prediction ?? {
    weeklyWeightChangeKg: weeklyWeightChangeKg,
    projectedWeightKg: currentWeight ? Number((Number(currentWeight) + weeklyWeightChangeKg * 4).toFixed(1)) : null,
    basis: avgCalories > 0
      ? `Based on ${recentLogs.length}-day avg: ${Math.round(avgCalories)} kcal/day (${Math.abs(Math.round(avgDeficit))} kcal ${avgDeficit > 0 ? 'deficit' : 'surplus'})`
      : 'Insufficient data for prediction',
  };

  await DailyPlan.findOneAndUpdate(
    { userId, date: tomorrowDate },
    {
      $set: {
        status: 'ready',
        generatedAt: new Date(),
        topInsight: parsed.topInsight ?? null,
        'foodPlan.suggestions': parsed.foodPlan?.suggestions ?? [],
        'foodPlan.reasoning': parsed.foodPlan?.reasoning ?? null,
        workoutPlan: parsed.workoutPlan ?? null,
        prediction,
        fitnessLevelDerived: fitnessLevel,
        generationContext,
      },
    },
    { upsert: true }
  );
}

// ─── Main cron handler ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return errorResponse('Unauthorized', 401);
  }

  await connectDB();

  // Calculate tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = tomorrow.toISOString().split('T')[0];

  // Find all users with OpenAI keys who have not disabled AI globally.
  const users = await User.find({
    'apiKeys.openai': { $exists: true, $ne: '' },
    'settings.aiEnabled': { $ne: false },
  })
    .select('+apiKeys.openai')
    .select('_id')
    .lean() as { _id: { toString(): string }; apiKeys?: { openai?: string } }[];

  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const user of users) {
    const userId = user._id.toString();
    try {
      const encryptedKey = user.apiKeys?.openai;
      if (!encryptedKey) continue;

      let apiKey: string;
      try {
        apiKey = decrypt(encryptedKey);
      } catch {
        continue; // skip users with corrupt keys silently
      }

      await generateForUser(userId, apiKey, tomorrowDate);
      processed++;
    } catch (err) {
      failed++;
      const msg = `User ${userId}: ${err instanceof Error ? err.message : String(err)}`;
      errors.push(msg);
      console.error('[Cron Generate Daily Plans]', msg);

      // Mark plan as failed
      await DailyPlan.findOneAndUpdate(
        { userId, date: tomorrowDate },
        { $set: { status: 'failed', errorMessage: msg } },
        { upsert: true }
      ).catch(() => {});
    }
  }

  console.log(`[Cron Generate Daily Plans] Completed: ${processed} processed, ${failed} failed`);

  return maskedResponse({
    processed,
    failed,
    tomorrowDate,
    ...(errors.length > 0 ? { errors: errors.slice(0, 5) } : {}), // cap error list
  });
}
