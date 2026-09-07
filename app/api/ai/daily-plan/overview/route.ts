// ============================================
// /api/ai/daily-plan/overview - Daily Outlook
// ============================================
// WHOOP-style AI morning briefing. Unlike the other daily-plan agents this one
// sees the whole picture: today's computed Vitals scores (readiness / strain /
// sleep / stress vs personal baselines), 30-day trends, habit insights, the
// last 7 days of logs, targets, and today's generated food/workout plans.

import connectDB from '@/lib/db';
import DailyLog from '@/models/DailyLog';
import DailyPlan from '@/models/DailyPlan';
import User from '@/models/User';
import { resolveOpenAIKey } from '@/lib/openaiKey';
import { createOpenAiJson } from '@/lib/openaiJson';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { getToday } from '@/lib/utils';
import { normalizeGoal } from '@/lib/goals';
import { getWeightTrendForUser } from '@/lib/weightTrend';
import { getCoachMemoryLines } from '@/lib/intelligence/coachMemory';
import { computeVitals, toDayInput, type VitalsResult } from '@/lib/scores';
import { normalizeOutlook, deriveTargetGap, type OutlookData } from '../shared';

export const dynamic = 'force-dynamic';

const VITALS_WINDOW_DAYS = 45; // 30 trend days + 15 baseline buffer
const RECENT_LOG_DAYS = 7;

type RecentLogLean = {
  date?: string;
  totalCalories?: number;
  totalProtein?: number;
  waterIntake?: number;
  caloriesBurned?: number;
  steps?: number;
  weight?: number;
  sleep?: { duration?: number; quality?: number };
  meals?: Array<{ name?: string; mealType?: string; calories?: number }>;
  workouts?: Array<{ exercise?: string; category?: string; duration?: number }>;
};

function num(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Compact one day of logs for the prompt - names and numbers only. */
function compactLog(log: RecentLogLean) {
  return {
    date: log.date,
    caloriesKcal: num(log.totalCalories) ?? 0,
    proteinG: num(log.totalProtein) ?? 0,
    waterMl: num(log.waterIntake) ?? 0,
    steps: num(log.steps) ?? 0,
    weightKg: num(log.weight) ?? null,
    sleepHours: num(log.sleep?.duration) ?? null,
    sleepQuality1to5: num(log.sleep?.quality) ?? null,
    meals: (log.meals ?? []).map((m) => ({
      name: m.name,
      type: m.mealType,
      kcal: num(m.calories) ?? 0,
    })),
    workouts: (log.workouts ?? []).map((w) => ({
      exercise: w.exercise,
      category: w.category,
      minutes: num(w.duration) ?? 0,
    })),
  };
}

/** Strip the vitals result down to what the model needs. */
function compactVitals(vitals: VitalsResult) {
  return {
    readiness: {
      score: vitals.readiness.score,
      drivers: vitals.readiness.drivers,
      components: vitals.readiness.components
        .filter((c) => c.score !== null)
        .map((c) => ({ key: c.key, label: c.label, score: c.score, note: c.note })),
    },
    strain: { score: vitals.strain.score },
    sleep: {
      score: vitals.sleep.score,
      components: vitals.sleep.components
        .filter((c) => c.score !== null)
        .map((c) => ({ key: c.key, label: c.label, score: c.score, note: c.note })),
    },
    stress: { level: vitals.stress.level },
    guidance: vitals.guidance,
    habitInsights: vitals.insights.map((i) => i.text),
    trendsLast14Days: vitals.trends.slice(-14).map((t) => ({
      date: t.date,
      readiness: t.readiness,
      sleep: t.sleep,
      hrvSdnnMs: t.hrvSdnnMs,
      restingHeartRate: t.restingHeartRate,
    })),
  };
}

async function loadVitals(userId: string, today: string): Promise<VitalsResult> {
  const startDate = new Date(Date.now() - VITALS_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
  const logs = await DailyLog.find(
    { userId, date: { $gte: startDate, $lte: today } },
    {
      date: 1, heartRate: 1, steps: 1, activeCalories: 1,
      restingHeartRate: 1, hrvSdnnMs: 1, respiratoryRate: 1, wristTempC: 1, vo2Max: 1,
      sleep: 1, workouts: 1, habits: 1, mood: 1, _id: 0,
    }
  )
    .sort({ date: 1 })
    .lean();
  const days = (logs as Array<Parameters<typeof toDayInput>[0]>).map(toDayInput);
  return computeVitals(days, today, 30);
}

export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;
    await connectDB();

    const plan = await DailyPlan.findOne({ userId, date: getToday() })
      .select('outlook status generatedAt')
      .lean() as { outlook?: OutlookData; status?: string; generatedAt?: Date } | null;

    return maskedResponse({
      outlook: plan?.outlook && plan.outlook.headline ? plan.outlook : null,
      status: plan?.status ?? null,
      generatedAt: plan?.generatedAt ?? null,
    });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Failed to fetch outlook', 500);
  }
}

const SYSTEM_PROMPT = `You are Ciel, the user's personal health guide, writing their Daily Outlook as a WHOOP-style morning briefing. You can see their whole picture: today's computed scores vs their own baselines, two weeks of trends, seven days of logged meals, workouts, water, sleep and weight, habit correlations, and today's generated meal and workout plans. Speak in second person, warm and confident, like Ciel has already read everything. Anchor every claim to their real numbers. Return JSON only with this exact shape:
{
  "headline": "one line, max 60 characters, capturing today's readiness story",
  "recoverySummary": "2-3 sentences on how they arrived at today: cite actual values and how they compare to their baseline or trend (for example HRV, resting HR, sleep hours, readiness score). If wearable data is missing, say so plainly and read their logged sleep, food and training instead.",
  "today": {
    "effort": "push" | "maintain" | "recover" | "rest",
    "note": "1-2 sentences on how to attack the day given the effort level",
    "activities": ["2-3 concrete activity suggestions sized to the effort level and their recent training, for example '30 min zone-2 jog' or '20 min mobility work'"],
    "bestWindow": "best time of day to train based on their logged workout times, or empty string"
  },
  "focus": [
    { "metric": "sleep" | "food" | "water" | "workout" | "steps" | "stress" | "weight", "headline": "short stat verdict like '5.8 h avg, under target'", "note": "1-2 sentences with one concrete action for today" }
  ],
  "watchOuts": ["0-2 short flags, only when data genuinely shows one: resting HR elevated vs baseline, HRV depressed, sleep debt building, several high-stress days. Empty array on normal days."],
  "tonight": {
    "sleepNeedHours": number,
    "bedtimeWindow": "a 30-minute window like '10:30-11:00 pm', derived from their usual wake time and sleepNeedHours, or empty string",
    "note": "one sentence on why tonight's sleep matters given today"
  }
}

Hard rules:
- "today.effort" MUST equal inputs.vitals.guidance.band. Do not override it.
- "focus" has at most 3 entries. Pick the metrics that most need attention today from the 7-day logs vs targets. Do not pad; 1-2 strong entries beat 3 weak ones.
- "tonight.sleepNeedHours": start from the sleep target, add up to 1 h when recent nights ran short or today is a push day, subtract nothing. Stay between 6 and 10.
- Never invent numbers. Every figure you cite must appear in the inputs.
- inputs.profile.goal is the goal the user chose; inputs.targetGap is where they sit vs their target weight; inputs.weightTrend is the direction the scale is actually moving. If the goal and the trend conflict (for example goal build_muscle while weightTrend is losing), say so plainly with the fix. Never suggest changing the goal.
- Never claim spot reduction. If profile.fatFocusAreas is set, treat it as where they want to see change; fat comes off the whole body through the overall deficit.
- inputs.knownPatterns (when present) are durable, statistically confirmed patterns about THIS user. You may reference them to personalize advice, but never restate their numbers incorrectly.
- Scores of null mean no wearable data, not a bad score. Never scold about missing data more than once.
- No em dashes anywhere. No medical claims or diagnoses. No "consider" or "try to"; give direct actions.
- Keep the whole thing tight: this is a briefing they read in 30 seconds with their coffee.`;

export async function POST() {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const apiKey = await resolveOpenAIKey(userId);
    if (!apiKey) return errorResponse('OpenAI API key required. Add your key in Settings to generate plans.', 403);

    await connectDB();
    const today = getToday();

    const [user, vitals, recentLogs, todayPlan] = await Promise.all([
      User.findById(userId)
        .select('profile.gender profile.age profile.dateOfBirth profile.height profile.weight profile.activityLevel profile.goal profile.targetWeight profile.fatFocusAreas targets')
        .lean() as Promise<{
          profile?: Record<string, unknown>;
          targets?: Record<string, unknown>;
        } | null>,
      loadVitals(userId, today),
      DailyLog.find({ userId, date: { $lt: today } })
        .sort({ date: -1 })
        .limit(RECENT_LOG_DAYS)
        .select(
          'date totalCalories totalProtein waterIntake caloriesBurned steps weight ' +
          'sleep.duration sleep.quality meals.name meals.mealType meals.calories ' +
          'workouts.exercise workouts.category workouts.duration'
        )
        .lean() as Promise<RecentLogLean[]>,
      DailyPlan.findOne({ userId, date: today })
        .select('foodPlan.suggestions.name foodPlan.suggestions.mealType workoutPlan.name workoutPlan.durationMinutes workoutPlan.whyToday')
        .lean() as Promise<{
          foodPlan?: { suggestions?: Array<{ name?: string; mealType?: string }> };
          workoutPlan?: { name?: string; durationMinutes?: number; whyToday?: string };
        } | null>,
    ]);

    const todayLog = await DailyLog.findOne({ userId, date: today })
      .select(
        'date totalCalories totalProtein waterIntake caloriesBurned steps weight ' +
        'sleep.duration sleep.quality meals.name meals.mealType meals.calories ' +
        'workouts.exercise workouts.category workouts.duration'
      )
      .lean() as RecentLogLean | null;

    const [weightTrend, knownPatterns] = await Promise.all([
      getWeightTrendForUser(String(userId)),
      getCoachMemoryLines(String(userId)).catch(() => [] as string[]),
    ]);
    const profileRaw = user?.profile as { goal?: string; weight?: number; targetWeight?: number } | undefined;

    const inputs = {
      planDate: today,
      profile: user?.profile
        ? { ...user.profile, goal: normalizeGoal(profileRaw?.goal) }
        : null,
      // Read-only signals beside the user-owned goal: where they sit vs their
      // target and which way the scale is actually moving.
      targetGap: deriveTargetGap(profileRaw?.weight, profileRaw?.targetWeight),
      weightTrend,
      ...(knownPatterns.length > 0 ? { knownPatterns } : {}),
      targets: user?.targets ?? null,
      vitals: compactVitals(vitals),
      todaySoFar: todayLog ? compactLog(todayLog) : null,
      last7Days: recentLogs.map(compactLog).reverse(),
      todaysPlans: {
        meals: todayPlan?.foodPlan?.suggestions?.map((s) => `${s.mealType}: ${s.name}`) ?? [],
        workout: todayPlan?.workoutPlan?.name
          ? { name: todayPlan.workoutPlan.name, minutes: todayPlan.workoutPlan.durationMinutes, whyToday: todayPlan.workoutPlan.whyToday }
          : null,
      },
    };

    const userPrompt = [
      'Inputs are provided as a JSON object below. Write today\'s Daily Outlook. today.effort must equal inputs.vitals.guidance.band.',
      JSON.stringify({ inputs }, null, 2),
    ].join('\n');

    const ai = await createOpenAiJson<Record<string, unknown>>({
      apiKey,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 2000,
    });
    const outlook = normalizeOutlook(ai, vitals.guidance.band);

    await DailyPlan.findOneAndUpdate(
      { userId, date: today },
      {
        $set: {
          outlook,
          topInsight: outlook.headline,
          status: 'ready',
          generatedAt: new Date(),
        },
        $unset: { projections: '', yesterdayInsights: '', prediction: '' },
      },
      { upsert: true }
    );

    return maskedResponse({ outlook });
  } catch (err) {
    console.error('[Outlook POST]:', err);
    const msg = err instanceof Error ? err.message : 'Failed to generate outlook';
    return errorResponse(msg, msg.includes('API key') ? 403 : 500);
  }
}
