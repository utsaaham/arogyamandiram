// ============================================
// /api/ai/health-check — AI-Powered Health Analysis
// ============================================
// GET → analyses today's wearable metrics (heart rate, steps, active calories,
// distance) against the user's goals and returns an AI health report.

import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import DailyLog from '@/models/DailyLog';
import { resolveOpenAIKey } from '@/lib/openaiKey';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { getToday } from '@/lib/utils';
import { OPENAI_BEST_MODEL } from '@/lib/aiModel';

export const dynamic = 'force-dynamic';

type HealthCheckResult = {
  heartRate: { value: number | null; status: 'healthy' | 'low' | 'high' | 'unknown'; message: string };
  steps: { value: number | null; goal: number; achieved: boolean; pct: number; message: string };
  activeCalories: { value: number | null; goal: number; achieved: boolean; message: string };
  distance: { value: number | null; avgKm7d: number | null; message: string };
  overallScore: number;
  summary: string;
  tips: string[];
};

export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

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

    const targets = user.targets as {
      dailyCalories?: number; dailyWater?: number; dailyCalorieBurn?: number;
      sleepHours?: number; dailySteps?: number;
    };

    const today = getToday();
    const sevenDaysAgo = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return d.toISOString().split('T')[0];
    })();

    type HealthLogRow = {
      date: string;
      heartRate?: number; steps?: number; activeCalories?: number; distanceKm?: number;
      caloriesBurned?: number; sleep?: { duration?: number };
    };

    const logs = await DailyLog.find({
      userId,
      date: { $gte: sevenDaysAgo, $lte: today },
    })
      .select('date heartRate steps activeCalories distanceKm caloriesBurned sleep')
      .sort({ date: -1 })
      .lean<HealthLogRow[]>();

    const todayLog = logs.find((l) => l.date === today) ?? null;
    const allLogs = logs;

    const stepGoal = targets.dailySteps ?? 8000;
    const calBurnGoal = targets.dailyCalorieBurn ?? 400;

    // Compute 7-day averages
    const hrValues = allLogs.map((l) => l.heartRate).filter((v): v is number => v != null && v > 0);
    const stepValues = allLogs.map((l) => l.steps).filter((v): v is number => v != null && v > 0);
    const acValues = allLogs.map((l) => l.activeCalories).filter((v): v is number => v != null && v > 0);
    const distValues = allLogs.map((l) => l.distanceKm).filter((v): v is number => v != null && v > 0);

    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
    const avgHr7d = avg(hrValues);
    const avgSteps7d = avg(stepValues);
    const avgAc7d = avg(acValues);
    const avgDist7d = distValues.length ? Number((distValues.reduce((a, b) => a + b, 0) / distValues.length).toFixed(2)) : null;

    const todayHr = todayLog?.heartRate ?? null;
    const todaySteps = todayLog?.steps ?? null;
    const todayAc = todayLog?.activeCalories ?? null;
    const todayDist = todayLog?.distanceKm ?? null;

    // Build prompt context
    const contextLines = [
      `Daily targets: step goal ${stepGoal} steps, active calorie burn goal ${calBurnGoal} kcal.`,
      `Today's metrics: heart rate ${todayHr != null ? todayHr + ' bpm' : 'no data'}, steps ${todaySteps != null ? todaySteps : 'no data'}, active calories ${todayAc != null ? todayAc + ' kcal' : 'no data'}, distance ${todayDist != null ? todayDist + ' km' : 'no data'}.`,
      avgHr7d != null ? `7-day avg heart rate: ${avgHr7d} bpm.` : 'Heart rate: no historical data.',
      avgSteps7d != null ? `7-day avg steps: ${avgSteps7d}.` : 'Steps: no historical data.',
      avgAc7d != null ? `7-day avg active calories: ${avgAc7d} kcal.` : 'Active calories: no historical data.',
      avgDist7d != null ? `7-day avg distance: ${avgDist7d} km.` : 'Distance: no historical data.',
    ].join('\n');

    const systemPrompt = `You are a health data analyst for a wellness app. Write every user-facing sentence like a warm human coach: plain everyday words, encouraging, a little playful when it fits. Never use em dashes. Analyse the user's wearable metrics and return a structured health report.

Heart rate health guidelines (resting):
- Below 55 bpm: low (could indicate bradycardia; advise to consult a doctor if symptomatic)
- 55–75 bpm: optimal (healthy athletic range)
- 76–100 bpm: healthy (normal resting range)
- Above 100 bpm: high (could indicate tachycardia; advise to monitor)
- If no data: status "unknown"

Step goal: any value >= dailySteps target = achieved.
Active calorie goal: any value >= calorie burn goal = achieved.

Respond ONLY with valid JSON in this exact shape (no markdown, no extra text):
{
  "heartRate": { "value": number|null, "status": "healthy"|"low"|"high"|"unknown", "message": "one sentence" },
  "steps": { "value": number|null, "goal": number, "achieved": boolean, "pct": number, "message": "one sentence" },
  "activeCalories": { "value": number|null, "goal": number, "achieved": boolean, "message": "one sentence" },
  "distance": { "value": number|null, "avgKm7d": number|null, "message": "one sentence" },
  "overallScore": number (0-100, weighted: heart 25%, steps 30%, activeCalories 25%, distance 20%),
  "summary": "2-3 sentence personalised summary",
  "tips": ["tip1", "tip2", "tip3"] (2-4 actionable tips)
}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: OPENAI_BEST_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: contextLines },
        ],
        temperature: 0.4,
        max_completion_tokens: 800,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const status = res.status;
      if (status === 401 || status === 403) {
        return errorResponse('Your OpenAI API key looks invalid or expired. Update it in Settings → API Keys.', 403);
      }
      if (status >= 500) {
        return errorResponse('AI service is temporarily unavailable. Please try again in a few minutes.', 503);
      }
      const rawMessage = (err as { error?: { message?: string } }).error?.message;
      return errorResponse(rawMessage || `OpenAI API error: ${status}`, 500);
    }

    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    const rawText = data?.choices?.[0]?.message?.content;
    if (typeof rawText !== 'string' || !rawText.trim()) {
      return errorResponse('AI returned an empty response.', 500);
    }

    let parsed: HealthCheckResult;
    try {
      parsed = JSON.parse(rawText) as HealthCheckResult;
    } catch {
      return errorResponse('Failed to parse AI health check response.', 500);
    }

    // Patch in actual values in case AI hallucinated different numbers
    parsed.heartRate.value = todayHr;
    parsed.steps.value = todaySteps;
    parsed.steps.goal = stepGoal;
    parsed.steps.pct = todaySteps != null ? Math.round((todaySteps / stepGoal) * 100) : 0;
    parsed.steps.achieved = todaySteps != null && todaySteps >= stepGoal;
    parsed.activeCalories.value = todayAc;
    parsed.activeCalories.goal = calBurnGoal;
    parsed.activeCalories.achieved = todayAc != null && todayAc >= calBurnGoal;
    parsed.distance.value = todayDist;
    parsed.distance.avgKm7d = avgDist7d;

    return maskedResponse(parsed);
  } catch (err) {
    console.error('[Health Check Error]:', err);
    return NextResponse.json({ success: false, error: 'Health check failed' }, { status: 500 });
  }
}
