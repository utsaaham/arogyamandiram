// ============================================
// /api/ai/recommendations - AI-Powered Suggestions
// ============================================
// Uses OpenAI GPT for personalized recommendations.
// Requires user's OpenAI API key or server default.

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import DailyLog from '@/models/DailyLog';
import { resolveOpenAIKey } from '@/lib/openaiKey';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { getToday, getYesterday, getAgeFromDateOfBirth, toLocalDateString } from '@/lib/utils';
import { getLatestLoggedWeight } from '@/lib/latestWeight';

export const dynamic = 'force-dynamic';

type OpenAIUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

type OpenAICallResult = {
  parsed: Record<string, unknown>;
  rawText: string;
  usage: OpenAIUsage;
  latencyMs: number;
  model: string;
  timestamp: string;
};

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<OpenAICallResult> {
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
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const status = res.status;
    const rawMessage: string | undefined = err.error?.message;

    if (status === 401 || status === 403) {
      throw new Error(
        'Your OpenAI API key looks invalid or expired. Update it in Settings → API Keys.'
      );
    }

    if (status >= 500) {
      throw new Error('AI service is temporarily unavailable. Please try again in a few minutes.');
    }

    throw new Error(rawMessage || `OpenAI API error: ${status}`);
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

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const { type, ...context } = await req.json();

    const apiKey = await resolveOpenAIKey(userId);
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
    const latestLoggedWeight = await getLatestLoggedWeight(userId);
    const currentWeight = latestLoggedWeight ?? profile.weight;

    // Get recent logs for context (meal, workout, sleep use last 7 days; insights uses period-specific range)
    const recentLogs =
      type === 'insights'
        ? []
        : await DailyLog.find({ userId }).sort({ date: -1 }).limit(7).lean();

    // Privacy: never send name or email - only anonymized health metrics.
    const buildProfileContext = (recommendationType: string) => {
      const base = [
        `User profile (anonymized): age ${age}y, gender ${profile.gender ?? '—'}, height ${profile.height ?? '—'}cm, current weight ${currentWeight ?? '—'}kg.`,
        `Activity ${profile.activityLevel ?? '—'}, goal ${profile.goal ?? '—'}, target weight ${profile.targetWeight ?? '—'}kg.`,
      ];

      if (recommendationType === 'meal') {
        base.push(
          `Nutrition targets: ${targets.dailyCalories} kcal, protein ${targets.protein}g, carbs ${targets.carbs}g, fat ${targets.fat}g, water ${targets.dailyWater}ml.`
        );
      } else if (recommendationType === 'sleep') {
        base.push(`Sleep target: ${targets.sleepHours ?? '—'} hours.`);
      } else {
        base.push(
          `Daily targets: ${targets.dailyCalories} kcal, protein ${targets.protein}g, carbs ${targets.carbs}g, fat ${targets.fat}g, water ${targets.dailyWater}ml.`
        );
        base.push(
          `Extended targets: ideal weight ${targets.idealWeight ?? '—'}kg, workout ${targets.dailyWorkoutMinutes ?? '—'} min/day, burn ${targets.dailyCalorieBurn ?? '—'} kcal/day, sleep ${targets.sleepHours ?? '—'}h.`
        );
      }

      return base.join('\n');
    };

    type LogWithSleep = {
      date: string;
      totalCalories?: number;
      totalProtein?: number;
      totalCarbs?: number;
      totalFat?: number;
      waterIntake?: number;
      weight?: number;
      caloriesBurned?: number;
      workouts?: { duration?: number }[];
      sleep?: { duration?: number; quality?: number; bedtime?: string; wakeTime?: string };
    };
    const buildLogContext = (logs: LogWithSleep[], label: string) =>
      logs.length > 0
        ? `${label}: ${JSON.stringify(
            logs.map((l) => ({
              ...(() => {
                const row: Record<string, unknown> = { d: l.date };
                const cal = Number(l.totalCalories) || 0;
                const protein = Number(l.totalProtein) || 0;
                const carbs = Number(l.totalCarbs) || 0;
                const fat = Number(l.totalFat) || 0;
                const water = Number(l.waterIntake) || 0;
                const weight = Number(l.weight);
                const burned = Number(l.caloriesBurned) || 0;
                const workoutMinutes = Array.isArray(l.workouts)
                  ? l.workouts.reduce((sum, w) => sum + (Number(w?.duration) || 0), 0)
                  : 0;
                const workoutCount = Array.isArray(l.workouts) ? l.workouts.length : 0;

                if (cal > 0) row.cal = cal;
                if (protein > 0) row.p = protein;
                if (carbs > 0) row.c = carbs;
                if (fat > 0) row.f = fat;
                if (water > 0) row.w = water;
                if (Number.isFinite(weight) && weight > 0) row.wt = weight;
                if (burned > 0) row.b = burned;
                if (workoutMinutes > 0) row.wm = workoutMinutes;
                if (workoutCount > 0) row.wc = workoutCount;
                if (l.sleep && (Number(l.sleep.duration) > 0 || Number(l.sleep.quality) > 0)) {
                  row.s = {
                    d: Number(l.sleep.duration) || undefined,
                    q: Number(l.sleep.quality) || undefined,
                  };
                }
                return row;
              })(),
            }))
          )}`
        : 'No recent tracking data available.';

    const toMetricsRow = (l: LogWithSleep) => ({
      date: l.date,
      cal: Number(l.totalCalories) || 0,
      protein: Number(l.totalProtein) || 0,
      carbs: Number(l.totalCarbs) || 0,
      fat: Number(l.totalFat) || 0,
      water: Number(l.waterIntake) || 0,
      weight: Number(l.weight) || undefined,
      burned: Number(l.caloriesBurned) || 0,
      workoutMinutes: Array.isArray(l.workouts)
        ? l.workouts.reduce((sum, w) => sum + (Number(w?.duration) || 0), 0)
        : 0,
      workoutCount: Array.isArray(l.workouts) ? l.workouts.length : 0,
      sleepDuration: Number(l.sleep?.duration) || 0,
      sleepQuality: Number(l.sleep?.quality) || 0,
    });

    const avg = (values: number[]) =>
      values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)) : 0;

    const trend = (values: number[]) => {
      if (values.length < 2) return 'stable';
      const first = values[0] ?? 0;
      const last = values[values.length - 1] ?? 0;
      const threshold = Math.max(1, Math.abs(first) * 0.05);
      if (last - first > threshold) return 'up';
      if (first - last > threshold) return 'down';
      return 'stable';
    };

    const buildInsightsAggregateContext = (
      logs: LogWithSleep[],
      period: 'month' | 'year',
      startDate: string,
      endDate: string
    ) => {
      const rows = logs
        .map(toMetricsRow)
        .sort((a, b) => a.date.localeCompare(b.date));

      const expectedDays =
        period === 'month'
          ? 30
          : Math.max(
              1,
              Math.floor(
                (new Date(endDate + 'T00:00:00').getTime() -
                  new Date(startDate + 'T00:00:00').getTime()) /
                  (24 * 60 * 60 * 1000)
              ) + 1
            );

      const consistencyPct = Math.round((rows.length / expectedDays) * 100);

      const buckets = new Map<string, typeof rows>();
      for (const row of rows) {
        if (period === 'month') {
          const dayOffset = Math.max(
            0,
            Math.floor(
              (new Date(row.date + 'T00:00:00').getTime() -
                new Date(startDate + 'T00:00:00').getTime()) /
                (24 * 60 * 60 * 1000)
            )
          );
          const weekIdx = Math.floor(dayOffset / 7) + 1;
          const key = `week_${weekIdx}`;
          const group = buckets.get(key) ?? [];
          group.push(row);
          buckets.set(key, group);
        } else {
          const key = row.date.slice(0, 7); // YYYY-MM
          const group = buckets.get(key) ?? [];
          group.push(row);
          buckets.set(key, group);
        }
      }

      const summarizedBuckets = Array.from(buckets.entries()).map(([key, group]) => {
        const sorted = group.sort((a, b) => a.date.localeCompare(b.date));
        return {
          bucket: key,
          from: sorted[0]?.date,
          to: sorted[sorted.length - 1]?.date,
          daysLogged: sorted.length,
          averages: {
            calories: avg(sorted.map((g) => g.cal)),
            protein: avg(sorted.map((g) => g.protein)),
            carbs: avg(sorted.map((g) => g.carbs)),
            fat: avg(sorted.map((g) => g.fat)),
            water: avg(sorted.map((g) => g.water)),
            burned: avg(sorted.map((g) => g.burned)),
            workoutMinutes: avg(sorted.map((g) => g.workoutMinutes)),
            sleepDuration: avg(sorted.map((g) => g.sleepDuration).filter((v) => v > 0)),
            sleepQuality: avg(sorted.map((g) => g.sleepQuality).filter((v) => v > 0)),
          },
          totals: {
            workouts: sorted.reduce((sum, g) => sum + g.workoutCount, 0),
          },
        };
      });

      const bestWorkoutDay = rows.reduce(
        (best, row) => (row.burned > (best?.burned ?? -1) ? row : best),
        null as (typeof rows)[number] | null
      );
      const bestHydrationDay = rows.reduce(
        (best, row) => (row.water > (best?.water ?? -1) ? row : best),
        null as (typeof rows)[number] | null
      );

      return `Aggregated tracking data (${startDate} to ${endDate}): ${JSON.stringify({
        period,
        daysLogged: rows.length,
        expectedDays,
        consistencyPct,
        overallAverages: {
          calories: avg(rows.map((r) => r.cal)),
          protein: avg(rows.map((r) => r.protein)),
          carbs: avg(rows.map((r) => r.carbs)),
          fat: avg(rows.map((r) => r.fat)),
          water: avg(rows.map((r) => r.water)),
          burned: avg(rows.map((r) => r.burned)),
          workoutMinutes: avg(rows.map((r) => r.workoutMinutes)),
          sleepDuration: avg(rows.map((r) => r.sleepDuration).filter((v) => v > 0)),
          sleepQuality: avg(rows.map((r) => r.sleepQuality).filter((v) => v > 0)),
        },
        trend: {
          calories: trend(rows.map((r) => r.cal)),
          protein: trend(rows.map((r) => r.protein)),
          carbs: trend(rows.map((r) => r.carbs)),
          fat: trend(rows.map((r) => r.fat)),
          water: trend(rows.map((r) => r.water)),
          burned: trend(rows.map((r) => r.burned)),
          workoutMinutes: trend(rows.map((r) => r.workoutMinutes)),
          weight: trend(rows.map((r) => r.weight).filter((v): v is number => typeof v === 'number')),
        },
        bestDays: {
          workout: bestWorkoutDay ? { date: bestWorkoutDay.date, burned: bestWorkoutDay.burned } : null,
          hydration: bestHydrationDay ? { date: bestHydrationDay.date, water: bestHydrationDay.water } : null,
        },
        buckets: summarizedBuckets,
      })}`;
    };

    const recentContext = buildLogContext(recentLogs as LogWithSleep[], 'Recent 7-day data');

    const isDebugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';
    let result: Record<string, unknown>;
    let debugLog: Record<string, unknown> | undefined;

    switch (type) {
      case 'meal': {
        const systemPrompt = `You are a nutritionist AI for an Indian health app called Arogyamandiram. Suggest Indian meals that fit the user's dietary needs. Always respond with JSON: { "suggestions": [{ "name": string, "description": string, "calories": number, "protein": number, "carbs": number, "fat": number, "mealType": "breakfast"|"lunch"|"dinner"|"snack", "ingredients": string[], "isVegetarian": boolean }] }. Include 4-6 suggestions. Focus on Indian cuisine.`;
        const userPrompt = `${buildProfileContext('meal')}\n${recentContext}\nToday's date: ${getToday()}\n${context.mealType ? `Suggest for: ${context.mealType}` : 'Suggest meals for the full day'}\n${context.preferences ? `Preferences: ${context.preferences}` : ''}`;
        const ai = await callOpenAI(apiKey, systemPrompt, userPrompt);
        result = ai.parsed;
        break;
      }

      case 'workout': {
        const systemPrompt = `You are a fitness trainer AI for Arogyamandiram health app. Create a workout plan based on user's goal, fitness level, and their recommended daily workout duration and calorie burn goal when provided.
Always respond with JSON:
{ "plan": { "name": string, "description": string, "progressionTip": string, "exercises": [{ "name": string, "sets": number, "reps": string, "durationMinutes": number, "restSeconds": number, "intensity": "low"|"medium"|"high", "category": "cardio"|"strength"|"flexibility"|"sports" }], "estimatedCalories": number, "durationMinutes": number } }.
Rules:
- Build a balanced session order: warm-up first, then main work, then cool-down.
- "reps" must be reps/rep-ranges only (e.g. "10-12"), never time strings.
- For time-based exercises set durationMinutes > 0 and keep reps simple (e.g. "1").
- Keep total duration close to requested/recommended duration.
- Keep estimatedCalories realistic and aligned with the user's daily calorie burn target.
- Use the user's current body weight in the profile context to estimate calorie burn.`;
        const userPrompt = `${buildProfileContext('workout')}\n${recentContext}\n${context.focusArea ? `Focus area: ${context.focusArea}` : ''}\n${context.duration ? `Duration: ${context.duration} minutes` : 'Use their recommended daily workout duration if provided'}`;
        const ai = await callOpenAI(apiKey, systemPrompt, userPrompt);
        result = ai.parsed;
        if (isDebugMode) {
          debugLog = {
            userRequest: {
              type: 'workout',
              focusArea: typeof context.focusArea === 'string' ? context.focusArea : '',
              duration: typeof context.duration === 'string' ? context.duration : '',
              requestedAt: ai.timestamp,
            },
            systemPrompt,
            userPrompt,
            response: ai.rawText,
            parsedResult: ai.parsed,
            metadata: {
              model: ai.model,
              usage: ai.usage,
              latencyMs: ai.latencyMs,
              timestamp: ai.timestamp,
              status: 'success',
            },
          };
        }
        break;
      }

      case 'insights': {
        const period = (context.period as 'yesterday' | 'week' | 'month' | 'year') || 'week';
        const customStart = context.startDate as string | undefined;
        const customEnd = context.endDate as string | undefined;

        const logStats = await DailyLog.aggregate([
          { $match: { userId } },
          { $group: { _id: null, count: { $sum: 1 } } },
        ]);
        const distinctLogDays = logStats[0]?.count ?? 0;
        const eligMonth = distinctLogDays >= 14;
        const eligYear = distinctLogDays >= 60;
        if (period === 'yesterday') {
          const yesterdayDate = getYesterday();
          const hasYesterdayLog = await DailyLog.exists({ userId, date: yesterdayDate });
          if (!hasYesterdayLog) {
            return errorResponse("No data for yesterday. Log something (food, water, weight, sleep, or workout) to see yesterday's insights.", 400);
          }
        }
        if (period === 'month' && !eligMonth) {
          return errorResponse('Monthly insights require at least 14 days of logging.', 400);
        }
        if (period === 'year' && !eligYear) {
          return errorResponse('Yearly insights require at least 60 days of logging.', 400);
        }

        const today = getToday();
        let startDate: string;
        let endDate: string;
        if (period === 'yesterday') {
          startDate = endDate = getYesterday();
        } else if (customStart && customEnd) {
          startDate = customStart;
          endDate = customEnd;
        } else {
          endDate = today;
          const d = new Date(today + 'T00:00:00');
          if (period === 'week') {
            d.setDate(d.getDate() - 6);
            startDate = toLocalDateString(d);
          } else if (period === 'month') {
            d.setDate(d.getDate() - 29);
            startDate = toLocalDateString(d);
          } else {
            d.setDate(d.getDate() - 364);
            startDate = toLocalDateString(d);
          }
        }

        const insightLogs = await DailyLog.find({ userId, date: { $gte: startDate, $lte: endDate } })
          .sort({ date: -1 })
          .lean();
        const periodLabels: Record<string, string> = {
          yesterday: "yesterday's",
          week: 'weekly',
          month: 'monthly',
          year: 'yearly',
        };
        const insightContext =
          period === 'month' || period === 'year'
            ? buildInsightsAggregateContext(
                insightLogs as LogWithSleep[],
                period,
                startDate,
                endDate
              )
            : buildLogContext(
                insightLogs as LogWithSleep[],
                `Tracking data for selected period (${startDate} to ${endDate})`
              );
        const periodLabel = periodLabels[period] ?? 'weekly';
        const systemPrompt = `You are a health analytics AI for Arogyamandiram. Analyze the user's tracking data and provide actionable insights.
Sleep quality is on a 1-5 scale (1=poor, 5=excellent).
Always respond with JSON:
{ "insights": [{ "title": string, "description": string, "type": "success"|"warning"|"info"|"tip", "metric": string, "value": string, "priority": "high"|"medium"|"low" }] }.
Provide 4-6 insights.
Rules:
- Include trend thinking (improving/declining/stable) where possible, not only single data-point commentary.
- When data is aggregated (monthly/yearly), use the aggregate buckets and trends instead of asking for day-level detail.
- At least one insight should be motivational and practical.
- Be specific and actionable (avoid vague advice like "exercise more").
- Compare current values against targets in the value field when possible (e.g. "900 ml / 2500 ml target").
- Reference progress vs ideal weight, workout goal, calorie burn goal, macro targets, and sleep target when relevant.
- Be encouraging but honest.`;
        const userPrompt = `${buildProfileContext('insights')}\n${insightContext}\nProvide ${periodLabel} insights and recommendations.`;
        const ai = await callOpenAI(apiKey, systemPrompt, userPrompt);
        result = { ...ai.parsed, generatedAt: new Date().toISOString() };
        if (isDebugMode) {
          debugLog = {
            userRequest: {
              type: 'insights',
              period,
              startDate,
              endDate,
              requestedAt: ai.timestamp,
            },
            systemPrompt,
            userPrompt,
            response: ai.rawText,
            parsedResult: ai.parsed,
            metadata: {
              model: ai.model,
              usage: ai.usage,
              latencyMs: ai.latencyMs,
              timestamp: ai.timestamp,
              status: 'success',
            },
          };
        }
        break;
      }

      case 'sleep': {
        const systemPrompt = `You are a sleep coach AI for Arogyamandiram health app. Analyze the user's sleep data (duration, quality, consistency of bed/wake times) and their target sleep hours. Always respond with JSON: { "summary": string, "tips": [{ "title": string, "description": string }] }. Provide 4-6 personalized tips. Include advice on: bedtime routine, caffeine cutoff, screen time, consistency, sleep environment, or stress if relevant. Be encouraging. If they have little or no sleep data, give general evidence-based sleep hygiene tips.`;
        const userPrompt = `${buildProfileContext('sleep')}\n${recentContext}\nProvide personalized sleep analysis and actionable tips.`;
        const ai = await callOpenAI(apiKey, systemPrompt, userPrompt);
        result = ai.parsed;
        break;
      }

      default:
        return errorResponse('Invalid recommendation type. Use: meal, workout, insights, or sleep', 400);
    }

    if (isDebugMode && debugLog) {
      return maskedResponse({ ...result, debugLog });
    }
    return maskedResponse(result);
  } catch (err) {
    console.error('[AI Recommendations Error]:', err);
    const message = err instanceof Error ? err.message : 'AI recommendation failed';
    return errorResponse(message, 500);
  }
}
