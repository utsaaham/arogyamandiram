import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import DailyLog from '@/models/DailyLog';
import DailyPlan from '@/models/DailyPlan';
import { resolveOpenAIKey } from '@/lib/openaiKey';
import { createOpenAiJson } from '@/lib/openaiJson';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { getToday } from '@/lib/utils';
import { getWeightTrendForUser } from '@/lib/weightTrend';
import { computeWorkoutAdherence } from '@/lib/adherence';
import { getCoachMemoryLines } from '@/lib/intelligence/coachMemory';
import { writeDebugLog } from '@/lib/debugLogWriter';
import { OPENAI_BEST_MODEL } from '@/lib/aiModel';
import { COACH_TONE } from '@/lib/tone';
import {
  buildWorkoutPrompt,
  deriveReadinessSignals,
  type WorkoutRequestBody,
  normalizeWorkoutPlan,
} from '../shared';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;
    await connectDB();

    const today = getToday();
    const [plan, todayLog] = await Promise.all([
      DailyPlan.findOne({ userId, date: today })
        .select('workoutPlan status feedback')
        .lean() as Promise<{ workoutPlan?: unknown; status?: string; feedback?: { workoutDifficulty?: string } } | null>,
      DailyLog.findOne({ userId, date: today })
        .select('workouts')
        .lean() as Promise<{ workouts?: Array<Record<string, unknown>> } | null>,
    ]);

    return maskedResponse({
      workoutPlan: plan?.workoutPlan ?? null,
      status: plan?.status ?? null,
      feedback: plan?.feedback ? { workoutDifficulty: plan.feedback.workoutDifficulty } : null,
      // Used by WorkoutTab to re-hydrate the "Logged" pill across page reloads.
      loggedToday: Array.isArray(todayLog?.workouts) ? todayLog!.workouts : [],
    });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Failed to fetch workout plan', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const body = await req.json().catch(() => ({})) as WorkoutRequestBody;
    const apiKey = await resolveOpenAIKey(userId);
    if (!apiKey) return errorResponse('OpenAI API key required. Add your key in Settings to generate plans.', 403);

    await connectDB();
    const today = getToday();
    const systemPrompt = `You are Ciel, an evidence-based fitness guide generating ONE user's daily workout plan as JSON. ${COACH_TONE}

Your responsibilities, in order:
1. Read the user's last 2 days of workouts (provided in the user message). Decide the right training split for THIS user right now. Choices include — but you may also blend or invent — full body, upper/lower, push-pull-legs, or single-body-part-per-day. Pick what fits their fitness level, recovery state, and what's already been trained recently. Do NOT fall back to a default rule like "always full body for beginners" — use the data.
2. For today, choose body parts the user has NOT trained in the last 1–2 days. Aim for full-body weekly coverage.
3. Apply the readiness signals provided (protein deficit, sleep, steps).
   Progression policy — inputs.progression is the last 7 days of planned-vs-completed strength work:
   - bucket "progress" (≥90% completed) → progress: a small load or rep bump on the main lifts vs the recent sessions in recentLogs.
   - bucket "hold" (60–89%, or no plan history) → repeat a similar prescription; consistency before progression.
   - bucket "deload" (<60%) → cut total working sets by about 35% and keep intensity moderate. Frame it positively in whyToday: a fresh, easy re-entry — never a punishment for missed days.
4. Train for inputs.goal — the goal the USER chose (never second-guess it):
   - lose_fat → higher total work, moderate cardio, keep strength to preserve muscle.
   - build_muscle → more strength volume, longer rests, minimal cardio.
   - recomp → hypertrophy-focused strength (8–12 reps) with modest conditioning.
   - improve_fitness → conditioning, mixed modalities, athletic work.
   - maintain → balanced.
   Cross-check against inputs.targetGap (where they sit vs their target weight) and inputs.weightTrend (the direction their weight is ACTUALLY moving). When goal and trend conflict (e.g. goal build_muscle but trend "losing"), keep training for the goal and flag the conflict with the fix in whyToday ("you're set on building muscle but the scale is trending down — eat more").
5. profile.fatFocusAreas lists where the user says they carry more fat. Spot reduction is not real — NEVER claim an exercise burns fat in one spot. Use focus areas honestly: bias accessory volume toward the muscles under those areas and rely on total-body energy expenditure for the fat itself. When focus areas are set, acknowledge them in whyToday.
   - Good: "Extra core work builds strength under the belly area you flagged; the fat comes off with the overall deficit."
   - Bad: "These crunches will burn your belly fat."
6. Tune the session to profile.physiqueGoal when present — this is the look/performance the user is training toward. Heuristics:
   - lean_toned / healthy_slim → more conditioning, full-body circuits, moderate strength, higher rep ranges (12–20).
   - lean_muscle → hypertrophy emphasis (8–12 reps), modest cardio for recomp.
   - athletic → mixed strength + conditioning + power/plyo; balanced splits.
   - muscular_bulk → strength + hypertrophy (6–12 reps), longer rests, minimal cardio.
   - bodybuilder → split-style isolation + compound work, 8–15 reps, controlled tempo, minimal cardio.
   - powerlifter → heavy compounds (3–6 reps), long rests, low cardio volume.
7. Respect profile.workoutLocation when prescribing exercises. Defaults by location:
   - full_gym → barbells, dumbbells, cables, machines all fair game.
   - home → assume bodyweight + light dumbbells unless equipmentNotes say otherwise.
   - outdoors → bodyweight, pull-up bars, benches, running/sprints. No machines.
   - hotel_travel → bodyweight + light dumbbells if any; assume minimal space.
   Then read profile.equipmentNotes as the user's own description of what they HAVE and what they DON'T HAVE. This is plain free-text — interpret it pragmatically. If they say "no cable machine", do not prescribe cable rows. If they say "I have a pull-up bar and 20kg dumbbells", you may use those. The notes OVERRIDE the location default.
   (Legacy values that may still appear: home_gym = home with rack+barbell+bench+dumbbells; home_dumbbells = home with dumbbells only; home_minimal = home with bodyweight only.)
8. Estimate calories burned with MET × bodyweight × time. Use these ranges; do NOT under- or over-estimate:
   - cardio:           low 3.5–4.5 · medium 5.0–7.0 · high 7.0–10.0
   - strength:         low 3.0–4.0 · medium 4.5–6.0 · high 6.0–8.0
   - core:             low 2.5–3.5 · medium 3.5–4.5 · high 4.5–6.0
   - flexibility:      2.0–2.5 (any intensity)

Hard constraints (always):
- Total session duration must be within ±3 minutes of "Today target minutes".
- The first exercise must have phase="warmup" (3–5 min, low intensity).
- The last 1–2 exercises must have phase="cooldown" or "mobility".
- Pick beginner-friendly, low-equipment exercises unless the user is intermediate or advanced.
- Never recommend spot reduction.

Return JSON only with this exact shape:
{
  "workoutPlan": {
    "name": "string",
    "description": "string",
    "weeklyStrategyChosen": "string — one sentence: which split you picked for the week and why",
    "whyToday": "string — one sentence: why today's session looks the way it does given recent days",
    "readinessAdjustment": "string — how today reflects the readiness signals",
    "exercises": [
      {
        "name": "string",
        "phase": "warmup | strength | cardio | core | mobility | cooldown",
        "slot": "compound | accessory — strength exercises only: big multi-joint lifts are compound and come first, isolation/assistance work is accessory. Omit for non-strength phases.",
        "sets": number,
        "reps": "string — e.g. '10', '10-12', '30 seconds', or 'continuous'",
        "durationMinutes": number,
        "restSeconds": number,
        "category": "cardio | strength | flexibility | core",
        "intensity": "low | medium | high",
        "muscleGroup": "legs | push | pull | core"
      }
    ],
    "estimatedCalories": number,
    "progressionTip": "string — one specific increase for next session",
    "reasoning": "string — short paragraph explaining the choices",
    "durationMinutes": number
  }
}`;
    const user = await User.findById(userId)
      .select('profile.gender profile.age profile.dateOfBirth profile.height profile.weight profile.activityLevel profile.goal profile.targetWeight profile.bodyType profile.bodyFat profile.fatFocusAreas profile.fitnessLevelDerived profile.fitnessLevelUser profile.physiqueGoal profile.workoutLocation profile.equipmentNotes targets')
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
          bodyType?: string;
          bodyFat?: number;
          fatFocusAreas?: string[];
          fitnessLevelDerived?: string;
          fitnessLevelUser?: string;
          physiqueGoal?: string;
          workoutLocation?: string;
          equipmentNotes?: string;
        };
        targets?: {
          dailyWorkoutMinutes?: number;
          dailyCalorieBurn?: number;
          dailyCalories?: number;
          dailyWater?: number;
          protein?: number;
          carbs?: number;
          fat?: number;
          sleepHours?: number;
          dailySteps?: number;
        };
      } | null;

    // 7-day trailing window ending yesterday. We intentionally exclude
    // today — today's workouts are the plan we're generating, and today's
    // partial-day nutrition / steps would skew readiness averages downward
    // (plans are usually generated in the morning before the user has eaten or
    // moved much). A full week gives the split and adherence context a real
    // training cycle to reason over.
    const windowStart = (() => {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      return d.toISOString().slice(0, 10);
    })();
    const windowEnd = (() => {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      return d.toISOString().slice(0, 10);
    })();
    const recentLogs = await DailyLog.find({ userId, date: { $gte: windowStart, $lte: windowEnd } })
      .sort({ date: -1 })
      .limit(7)
      .select('date totalCalories totalProtein totalCarbs totalFat waterIntake caloriesBurned heartRate steps activeCalories distanceKm sleep.duration sleep.quality workouts.exercise workouts.planExerciseName workouts.category workouts.duration workouts.caloriesBurned workouts.sets workouts.reps workouts.source workouts.notes')
      .lean() as Array<{
        date?: string;
        totalCalories?: number;
        totalProtein?: number;
        totalCarbs?: number;
        totalFat?: number;
        waterIntake?: number;
        caloriesBurned?: number;
        heartRate?: number;
        steps?: number;
        activeCalories?: number;
        distanceKm?: number;
        sleep?: { duration?: number; quality?: number };
        workouts?: Array<{
          exercise?: string;
          planExerciseName?: string;
          category?: string;
          duration?: number;
          caloriesBurned?: number;
          sets?: number;
          reps?: number;
          source?: string;
          notes?: string;
        }>;
      }>;

    const recentFeedback = await DailyPlan.find({ userId, date: { $lte: today }, feedback: { $exists: true } })
      .sort({ date: -1 })
      .limit(3)
      .select('date feedback.workoutDifficulty feedback.skippedWorkoutReason')
      .lean() as Array<{
        date?: string;
        feedback?: {
          workoutDifficulty?: string;
          skippedWorkoutReason?: string;
        };
      }>;

    const [weightTrend, progression, knownPatterns] = await Promise.all([
      getWeightTrendForUser(String(userId)),
      computeWorkoutAdherence(String(userId), today),
      getCoachMemoryLines(String(userId)).catch(() => [] as string[]),
    ]);

    const promptContext = {
      profile: user?.profile ?? null,
      targets: user?.targets ?? null,
      recentLogs,
      recentFeedback,
      weightTrend,
      progression,
      knownPatterns,
    };
    const userPrompt = buildWorkoutPrompt(body, today, promptContext);
    const signals = deriveReadinessSignals(body, promptContext);

    const ai = await createOpenAiJson<{ workoutPlan?: Record<string, unknown> }>({
      apiKey,
      systemPrompt,
      userPrompt,
      maxTokens: 1500,
    });
    const workoutPlan = normalizeWorkoutPlan(ai.workoutPlan ?? ai, signals);

    const plan = await DailyPlan.findOneAndUpdate(
      { userId, date: today },
      { $set: { workoutPlan, status: 'ready', generatedAt: new Date() } },
      { new: true, upsert: true }
    ).lean();

    await writeDebugLog({
      userId,
      page: 'today-plan',
      agent: 'workout',
      payload: {
        userRequest: {
          requestedAt: new Date().toISOString(),
          action: 'generate',
          date: today,
          body,
        },
        systemPrompt,
        userPrompt,
        parsedResult: { workoutPlan },
        metadata: {
          status: 'success',
          model: OPENAI_BEST_MODEL,
        },
      },
    });

    return maskedResponse({ workoutPlan: (plan as { workoutPlan?: unknown } | null)?.workoutPlan ?? null });
  } catch (err) {
    console.error('[Workout Plan POST]:', err);
    const msg = err instanceof Error ? err.message : 'Failed to generate workout plan';
    return errorResponse(msg, msg.includes('API key') ? 403 : 500);
  }
}
