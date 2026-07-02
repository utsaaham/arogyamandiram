import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import DailyLog from '@/models/DailyLog';
import DailyPlan from '@/models/DailyPlan';
import User from '@/models/User';
import { resolveOpenAIKey } from '@/lib/openaiKey';
import { createOpenAiJson } from '@/lib/openaiJson';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { getToday, getYesterday } from '@/lib/utils';
import { writeDebugLog } from '@/lib/debugLogWriter';
import {
  buildOverviewPrompt,
  type OverviewRequestBody,
  type OverviewPromptContext,
  type OverviewYesterdayContext,
  normalizeOverview,
} from '../shared';
import { OPENAI_BEST_MODEL } from '@/lib/aiModel';

export const dynamic = 'force-dynamic';

type DailyLogLean = {
  date?: string;
  totalCalories?: number;
  totalProtein?: number;
  totalCarbs?: number;
  totalFat?: number;
  totalFiber?: number;
  totalSugar?: number;
  totalSodium?: number;
  waterIntake?: number;
  caloriesBurned?: number;
  steps?: number;
  heartRate?: number;
  weight?: number;
  sleep?: { duration?: number; quality?: number };
  meals?: Array<{
    name?: string;
    mealType?: string;
    time?: string;
    quantity?: number;
    unit?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    saturatedFat?: number;
    cholesterol?: number;
  }>;
  workouts?: Array<{
    exercise?: string;
    category?: string;
    duration?: number;
    caloriesBurned?: number;
    sets?: number;
    reps?: number;
  }>;
};

function toFiniteNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function buildYesterdayContext(log: DailyLogLean | null, date: string): OverviewYesterdayContext | null {
  if (!log) return { date, totals: {}, meals: [], workouts: [], sleep: null, weightKg: null };

  const totalWorkoutMinutes = Array.isArray(log.workouts)
    ? log.workouts.reduce((sum, w) => sum + (Number(w?.duration) || 0), 0)
    : 0;

  return {
    date,
    totals: {
      caloriesKcal: toFiniteNumber(log.totalCalories),
      proteinG: toFiniteNumber(log.totalProtein),
      carbsG: toFiniteNumber(log.totalCarbs),
      fatG: toFiniteNumber(log.totalFat),
      fiberG: toFiniteNumber(log.totalFiber),
      sugarG: toFiniteNumber(log.totalSugar),
      sodiumMg: toFiniteNumber(log.totalSodium),
      waterMl: toFiniteNumber(log.waterIntake),
      workoutMinutes: totalWorkoutMinutes,
      caloriesBurnedKcal: toFiniteNumber(log.caloriesBurned),
      steps: toFiniteNumber(log.steps),
      heartRateAvg: toFiniteNumber(log.heartRate),
    },
    meals: Array.isArray(log.meals)
      ? log.meals.map((m) => ({
          mealType: m.mealType,
          name: m.name,
          time: m.time,
          quantity: toFiniteNumber(m.quantity),
          unit: m.unit,
          calories: toFiniteNumber(m.calories),
          protein: toFiniteNumber(m.protein),
          carbs: toFiniteNumber(m.carbs),
          fat: toFiniteNumber(m.fat),
          fiber: toFiniteNumber(m.fiber),
          sugar: toFiniteNumber(m.sugar),
          sodium: toFiniteNumber(m.sodium),
          saturatedFat: toFiniteNumber(m.saturatedFat),
          cholesterol: toFiniteNumber(m.cholesterol),
        }))
      : [],
    workouts: Array.isArray(log.workouts)
      ? log.workouts.map((w) => ({
          exercise: w.exercise,
          category: w.category,
          durationMinutes: toFiniteNumber(w.duration),
          caloriesBurnedKcal: toFiniteNumber(w.caloriesBurned),
          sets: toFiniteNumber(w.sets),
          reps: toFiniteNumber(w.reps),
        }))
      : [],
    sleep: log.sleep
      ? {
          durationHours: toFiniteNumber(log.sleep.duration),
          quality1to5: toFiniteNumber(log.sleep.quality),
        }
      : null,
    weightKg: toFiniteNumber(log.weight) ?? null,
  };
}

export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;
    await connectDB();

    const today = getToday();

    const plan = await DailyPlan.findOne({ userId, date: today })
      .select('topInsight projections status')
      .lean() as { topInsight?: string; projections?: unknown; status?: string } | null;

    type DayLogSummary = {
      totalCalories?: number; totalProtein?: number; totalCarbs?: number; totalFat?: number;
      waterIntake?: number; workouts?: { duration?: number }[];
      sleep?: { duration?: number; quality?: number }; weight?: number;
    };
    const yesterdayDate = getYesterday();
    const [todayLog, yesterdayLog] = await Promise.all([
      DailyLog.findOne({ userId, date: today })
        .select('totalCalories totalProtein totalCarbs totalFat waterIntake workouts sleep weight')
        .lean() as Promise<DayLogSummary | null>,
      DailyLog.findOne({ userId, date: yesterdayDate })
        .select('totalCalories totalProtein totalCarbs totalFat waterIntake workouts sleep weight')
        .lean() as Promise<DayLogSummary | null>,
    ]);

    const yesterdayPlan = await DailyPlan.findOne({ userId, date: yesterdayDate })
      .select('feedback')
      .lean() as { feedback?: { workoutDifficulty?: string } } | null;

    const summarize = (log: DayLogSummary | null) => log ? {
      totalCalories: Number(log.totalCalories) || 0,
      totalProtein: Number(log.totalProtein) || 0,
      totalCarbs: Number(log.totalCarbs) || 0,
      totalFat: Number(log.totalFat) || 0,
      waterIntake: Number(log.waterIntake) || 0,
      workoutMinutes: Array.isArray(log.workouts)
        ? log.workouts.reduce((s, w) => s + (Number(w?.duration) || 0), 0) : 0,
      sleep: log.sleep
        ? { duration: Number(log.sleep.duration) || 0, quality: Number(log.sleep.quality) || 0 }
        : null,
      weight: Number(log.weight) || null,
    } : null;

    return maskedResponse({
      topInsight: plan?.topInsight ?? null,
      projections: plan?.projections ?? null,
      status: plan?.status ?? null,
      todayLog: summarize(todayLog),
      yesterdayLog: summarize(yesterdayLog),
      yesterdayFeedback: yesterdayPlan?.feedback
        ? { workoutDifficulty: yesterdayPlan.feedback.workoutDifficulty } : null,
    });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Failed to fetch overview', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const body = await req.json().catch(() => ({})) as OverviewRequestBody;
    const apiKey = await resolveOpenAIKey(userId);
    if (!apiKey) return errorResponse('OpenAI API key required. Add your key in Settings to generate plans.', 403);

    await connectDB();
    const today = getToday();
    const yesterday = getYesterday();

    const user = await User.findById(userId)
      .select(
        'profile.gender profile.age profile.dateOfBirth profile.height profile.weight ' +
        'profile.activityLevel profile.goal profile.targetWeight targets'
      )
      .lean() as {
        profile?: {
          gender?: string;
          age?: number;
          dateOfBirth?: string | Date;
          height?: number;
          weight?: number;
          activityLevel?: string;
          goal?: string;
          targetWeight?: number;
        };
        targets?: {
          dailyCalories?: number;
          dailyWorkoutMinutes?: number;
          dailyCalorieBurn?: number;
          dailyWater?: number;
          protein?: number;
          carbs?: number;
          fat?: number;
          sleepHours?: number;
          dailySteps?: number;
        };
      } | null;

    const yesterdayLog = await DailyLog.findOne({ userId, date: yesterday })
      .select(
        'date totalCalories totalProtein totalCarbs totalFat totalFiber totalSugar totalSodium ' +
        'waterIntake caloriesBurned steps heartRate weight sleep.duration sleep.quality ' +
        'meals.name meals.mealType meals.time meals.quantity meals.unit ' +
        'meals.calories meals.protein meals.carbs meals.fat ' +
        'meals.fiber meals.sugar meals.sodium meals.saturatedFat meals.cholesterol ' +
        'workouts.exercise workouts.category workouts.duration workouts.caloriesBurned workouts.sets workouts.reps'
      )
      .lean() as DailyLogLean | null;

    const promptContext: OverviewPromptContext = {
      profile: user?.profile ?? null,
      targets: user?.targets ?? null,
      yesterday: buildYesterdayContext(yesterdayLog, yesterday),
    };

    const systemPrompt = `You are a warm, direct fitness coach speaking to one person. Generate a daily overview for TODAY using ONLY yesterday's logged data (\`yesterday.totals\`, \`yesterday.meals\`, \`yesterday.workouts\`, \`yesterday.sleep\`, \`yesterday.weightKg\`) and the user's targets. Return JSON only with this exact shape:
{
  "topInsight": "string, one short sentence: the single biggest thing the user should focus on today",
  "projections": {
    "sleep":     { "headline": string, "coachNote": string, "actions": string[] },
    "food":      { "headline": string, "coachNote": string, "actions": string[] },
    "water":     { "headline": string, "coachNote": string, "actions": string[] },
    "workout":   { "headline": string, "coachNote": string, "actions": string[] },
    "steps":     { "headline": string, "coachNote": string, "actions": string[] },
    "heartRate": { "headline": string, "coachNote": string, "actions": string[] },
    "weight":    { "headline": string, "coachNote": string, "actions": string[] }
  }
}

Hard rules for projections:
- All 7 keys must be present. Never omit one.
- The UI prepends "At this rate →" to every headline, so do NOT include that phrase yourself.
- "headline": short stat with a verdict word baked in, based on YESTERDAY's number vs target. Examples: "6 h, short", "1850 kcal, 400 short", "1.1 L, way under", "+0.3 kg/wk, drifting up", "72 bpm, slightly elevated", "4.2k, sedentary", "22 min, light".
- "coachNote": 2–3 sentences. Diagnosis + reasoning grounded in yesterday's actual numbers or meal names from \`yesterday.meals\`. Reference real numbers or items, not generic advice.
- "actions": 3–4 imperative steps for TODAY. Each starts with a verb. No "consider", "try to", "may want to". "Phone in another room at 9 pm." not "Try to use phone less."
- For the "food" projection: when yesterday.meals has items, at least one action must be "Cut <named item>" using a real item name, AND at least one action must be "Swap for <named item or specific food>". Call out items by name in coachNote too.
- For "weight": headline must include kg/wk and a 4-week projection ("+0.3 kg/wk, drifting up (about 66.2 kg in 4 weeks)") based on yesterday's calorie balance vs target. If yesterday has no food logged, headline = "No data, flat" and projection stays at current weight.
- For "heartRate": treat \`yesterday.totals.heartRateAvg\` as the daily AVERAGE HR (not resting). Don't claim it's resting.
- "steps" and "heartRate" data comes from health-app sync, so it can be present even when food/water aren't logged.
- Tone: coach friend, not clinic. No "I noticed", no "you may want to", no medical phrasing. Direct, warm, specific. Write like a human: everyday words, a little playful is fine. Never use em dashes anywhere in your output.
- Goal-matched framing. profile.goal "maintain" → energy/recovery framing; "lose" → fat-loss framing; "gain" → muscle framing.
- If yesterday has NO data for a metric (value is 0 or missing): headline = a short "Didn't log" or "No data" verdict, coachNote = 1–2 sentences explaining what to log today and why, actions = 3–4 starter steps. Never invent numbers.
- Do not output any field other than topInsight and projections.`;

    const userPrompt = buildOverviewPrompt(body, today, promptContext);
    const ai = await createOpenAiJson<{
      topInsight?: string;
      projections?: Record<string, { headline?: string; coachNote?: string; actions?: unknown[] }>;
    }>({
      apiKey,
      systemPrompt,
      userPrompt,
      maxTokens: 3500,
    });
    const overview = normalizeOverview(ai);

    await DailyPlan.findOneAndUpdate(
      { userId, date: today },
      {
        $set: {
          topInsight: overview.topInsight,
          projections: overview.projections,
          status: 'ready',
          generatedAt: new Date(),
        },
        $unset: { yesterdayInsights: '', prediction: '' },
      },
      { upsert: true }
    );

    await writeDebugLog({
      userId,
      page: 'today-plan',
      agent: 'overview',
      payload: {
        userRequest: {
          requestedAt: new Date().toISOString(),
          action: 'generate',
          date: today,
          body,
        },
        promptContext,
        systemPrompt,
        userPrompt,
        parsedResult: overview,
        metadata: {
          status: 'success',
          model: OPENAI_BEST_MODEL,
        },
      },
    });

    return maskedResponse(overview);
  } catch (err) {
    console.error('[Overview POST]:', err);
    const msg = err instanceof Error ? err.message : 'Failed to generate overview';
    return errorResponse(msg, msg.includes('API key') ? 403 : 500);
  }
}
