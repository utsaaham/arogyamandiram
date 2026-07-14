// ============================================
// /api/intelligence - deterministic intelligence layer payload
// ============================================
// GET → Goal Score (with exact attribution), behavior consistency,
//       feature↔score correlations, personal triggers, compound patterns,
//       today's single best action (priority), and Today's Body Summary
//       (LLM-phrased over the deterministic layer, cached per day).
// Everything numeric here is computed arithmetic - the LLM only phrases it.
// Side effect: confirmed correlation patterns persist to CoachMemory.

import connectDB from '@/lib/db';
import User from '@/models/User';
import DailyLog from '@/models/DailyLog';
import DailyPlan from '@/models/DailyPlan';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { getToday } from '@/lib/utils';
import { normalizeGoal } from '@/lib/goals';
import { resolveOpenAIKey } from '@/lib/openaiKey';
import { createOpenAiJson } from '@/lib/openaiJson';
import { COACH_TONE } from '@/lib/tone';
import { getDailyFeaturesForUser, computeConsistency } from '@/lib/intelligence/features';
import { computeCorrelations } from '@/lib/intelligence/correlations';
import { computeGoalScore } from '@/lib/intelligence/goalScore';
import { attributeScore, type ScoreAttribution } from '@/lib/intelligence/attribution';
import { computePriority } from '@/lib/intelligence/priority';
import { updateCoachMemory } from '@/lib/intelligence/coachMemory';
import {
  computeGoalEta, computeGoalConfidence, computeBurnoutRisk, computeRecoveryForecast,
} from '@/lib/intelligence/predictions';
import { computeHealthScore } from '@/lib/intelligence/healthScore';
import { getWeightTrendForUser } from '@/lib/weightTrend';
import { getLatestLoggedWeight } from '@/lib/latestWeight';
import { computeVitals, toDayInput, type VitalsResult } from '@/lib/scores';

export const dynamic = 'force-dynamic';

// 75 days: 30 for the current month, 30 for the monthly delta, 15 baseline buffer.
const WINDOW_DAYS = 75;

/** Deterministic body summary - the fallback and the LLM's source of truth. */
function deterministicBodySummary(
  vitals: VitalsResult,
  goalAttribution: ScoreAttribution | null
): string | null {
  const readiness = vitals.readiness.score;
  if (readiness === null) return null;
  const parts: string[] = [];
  const level = readiness >= 67 ? 'well recovered' : readiness >= 40 ? 'moderately recovered' : 'running low';
  const baseline = vitals.attribution.readiness.vsBaseline.phrase;
  parts.push(`You're ${level} today (readiness ${readiness}${baseline ? `, ${baseline}` : ''})`);
  const driver = vitals.readiness.drivers[0];
  if (driver) parts.push(driver.toLowerCase());
  const lever = goalAttribution?.fastestLever ?? vitals.attribution.readiness.fastestLever;
  if (lever) parts.push(lever.note.toLowerCase());
  return parts.join('; ') + '.';
}

export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    await connectDB();
    const today = getToday();

    const startDate = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);

    const [user, rows, logs, todayLog, weightTrend, latestWeight] = await Promise.all([
      User.findById(userId)
        .select('profile.goal profile.weight profile.targetWeight targets.dailySteps targets.dailyWater targets.protein targets.sleepHours targets.dailyWorkoutMinutes')
        .lean() as Promise<{
          profile?: { goal?: string; weight?: number; targetWeight?: number };
          targets?: {
            dailySteps?: number; dailyWater?: number; protein?: number;
            sleepHours?: number; dailyWorkoutMinutes?: number;
          };
        } | null>,
      getDailyFeaturesForUser(String(userId), WINDOW_DAYS),
      DailyLog.find(
        { userId, date: { $gte: startDate, $lte: today } },
        {
          date: 1, heartRate: 1, steps: 1, activeCalories: 1,
          restingHeartRate: 1, hrvSdnnMs: 1, respiratoryRate: 1, wristTempC: 1, vo2Max: 1,
          sleep: 1, workouts: 1, habits: 1, mood: 1, _id: 0,
        }
      ).sort({ date: 1 }).lean(),
      DailyLog.findOne({ userId, date: today })
        .select('waterIntake totalProtein steps sleep.duration workouts._id')
        .lean() as Promise<{
          waterIntake?: number; totalProtein?: number; steps?: number;
          sleep?: { duration?: number }; workouts?: unknown[];
        } | null>,
      getWeightTrendForUser(String(userId)),
      getLatestLoggedWeight(String(userId)),
    ]);

    const goal = normalizeGoal(user?.profile?.goal);
    const targets = user?.targets ?? {};
    const stepsTarget = targets.dailySteps ?? 8000;

    // Outcome scores per day, aligned to feature rows by date.
    const days = (logs as Array<Parameters<typeof toDayInput>[0]>).map(toDayInput);
    const vitals = computeVitals(days, today, WINDOW_DAYS);
    const outcomeByDate = new Map(
      vitals.trends.map((t) => [t.date, { readiness: t.readiness, sleep: t.sleep }])
    );
    const outcomes = rows.map((r) => outcomeByDate.get(r.date) ?? { readiness: null, sleep: null });

    const correlations = computeCorrelations(rows, outcomes);

    // Persist confirmed patterns to coach memory (non-blocking).
    void updateCoachMemory(String(userId), correlations).catch(() => {});

    // Goal Score for every day → today's score with exact attribution.
    const goalScores = rows.map((r) => computeGoalScore(goal, r, stepsTarget));
    const todayIdx = rows.findIndex((r) => r.date === today);
    const goalToday = todayIdx >= 0 ? goalScores[todayIdx] : null;
    const goalYesterday = todayIdx > 0 ? goalScores[todayIdx - 1] : null;

    const goalAttribution = goalToday
      ? attributeScore({
          todayScore: goalToday.score,
          todayComponents: goalToday.components,
          yesterdayScore: goalYesterday?.score ?? null,
          yesterdayComponents: goalYesterday?.components ?? null,
          priorScores: goalScores.slice(0, Math.max(0, todayIdx)).map((g) => g.score),
        })
      : null;

    // Today's single best action, ranked deterministically.
    const priority = computePriority(
      {
        waterMl: todayLog?.waterIntake ?? null,
        waterTargetMl: targets.dailyWater ?? null,
        proteinG: todayLog?.totalProtein ?? null,
        proteinTargetG: targets.protein ?? null,
        sleepDurationH: todayLog?.sleep?.duration ?? null,
        sleepTargetH: targets.sleepHours ?? null,
        workoutDone: (todayLog?.workouts?.length ?? 0) > 0,
        workoutTargetMin: targets.dailyWorkoutMinutes ?? null,
        steps: todayLog?.steps ?? null,
        stepsTarget,
      },
      correlations.triggers
    );

    // Today's Body Summary: deterministic sentence, LLM-rephrased once per day.
    const deterministic = deterministicBodySummary(vitals, goalAttribution);
    let bodySummary: { text: string; aiGenerated: boolean } | null = deterministic
      ? { text: deterministic, aiGenerated: false }
      : null;
    if (deterministic) {
      const cachedPlan = await DailyPlan.findOne({ userId, date: today })
        .select('bodySummary')
        .lean() as { bodySummary?: string } | null;
      if (cachedPlan?.bodySummary) {
        bodySummary = { text: cachedPlan.bodySummary, aiGenerated: true };
      } else {
        const apiKey = await resolveOpenAIKey(String(userId));
        if (apiKey) {
          try {
            const ai = await createOpenAiJson<{ summary?: string }>({
              apiKey,
              systemPrompt: `You rewrite ONE sentence about the user's body today. ${COACH_TONE} You are given deterministic facts; rephrase them into one natural sentence (max 30 words). Never change, add, or contradict any number or direction. Respond with JSON: { "summary": string }.`,
              userPrompt: JSON.stringify({
                facts: deterministic,
                priorityAction: priority?.detail ?? null,
              }),
              maxTokens: 100,
            });
            const line = typeof ai.summary === 'string' ? ai.summary.trim() : '';
            if (line) {
              bodySummary = { text: line, aiGenerated: true };
              await DailyPlan.findOneAndUpdate(
                { userId, date: today },
                { $set: { bodySummary: line } },
                { upsert: true }
              );
            }
          } catch {
            // deterministic fallback already set
          }
        }
      }
    }

    // Predictions - deterministic and honestly gated.
    const consistency = computeConsistency(rows);

    // Health Score capstone: goal scores aligned to trend dates, then blend.
    const goalScoreByDate = new Map(rows.map((r, i) => [r.date, goalScores[i]?.score ?? null]));
    const goalScoresAligned = vitals.trends.map((t) => goalScoreByDate.get(t.date) ?? null);
    const healthScore = computeHealthScore(vitals.trends, consistency, goalScoresAligned);
    const healthAttribution = healthScore.score !== null
      ? attributeScore({
          todayScore: healthScore.score,
          todayComponents: healthScore.components,
          yesterdayScore: null,
          yesterdayComponents: null,
          priorScores: [],
        })
      : null;
    const currentWeightKg = latestWeight ?? user?.profile?.weight ?? null;
    const predictions = {
      goalEta: computeGoalEta(goal, weightTrend, currentWeightKg, user?.profile?.targetWeight ?? null, today),
      goalConfidence: computeGoalConfidence(goal, weightTrend, consistency),
      burnoutRisk: computeBurnoutRisk(vitals.trends),
      recoveryForecast: computeRecoveryForecast(rows.map((r) => r.sleepDurationH)),
    };

    return maskedResponse({
      goal,
      goalScore: goalToday ? { score: goalToday.score, components: goalToday.components } : null,
      goalAttribution,
      consistency,
      correlations,
      priority,
      bodySummary,
      timeline: vitals.timeline,
      anomalies: vitals.anomalies,
      predictions,
      healthScore: {
        score: healthScore.score,
        monthlyDelta: healthScore.monthlyDelta,
        daysOfData: healthScore.daysOfData,
        components: healthScore.components,
      },
      healthAttribution,
      windowDays: rows.length,
    });
  } catch (err) {
    console.error('[Intelligence GET Error]:', err);
    return errorResponse('Failed to compute intelligence payload', 500);
  }
}
