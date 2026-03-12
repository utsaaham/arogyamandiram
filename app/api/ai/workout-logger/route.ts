// ============================================
// /api/ai/workout-logger - AI Workout Logger
// ============================================
// Uses OpenAI Responses API to turn a natural-language
// description of completed workouts into structured
// workout entries that can be logged.

import { NextRequest } from 'next/server';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { resolveOpenAIKey } from '@/lib/openaiKey';

export const dynamic = 'force-dynamic';

type OpenAIUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
};

const INSTRUCTIONS = `
You are a workout parser for a fitness logging app.
Convert messy workout text into structured workout entries that match the tool schema.

Parse all exercises mentioned. Normalize typos and common aliases:
- push ups -> Push-ups, pullups -> Pull-ups, situps -> Sit-ups
- dands -> Hindu Push-ups, baithak -> Hindu Squats
- treadmill/thread mill -> Running

For each workout:
- exercise: short standard name
- category: cardio | strength | flexibility | sports | other
- duration: minutes (use explicit duration if provided)
- sets/reps/weight: include when present, else null
- notes: short clarification when useful, else null

Calorie rules:
- If user explicitly gives calories, copy that exact value for that exercise.
- If not provided and category is cardio with duration > 0, estimate realistic calories (never 0).
- If rep-based strength exercise has no calorie info, caloriesBurned may be 0.
- Avoid unrealistic calorie values.

Parsing rules:
- Split into multiple entries if multiple exercises are mentioned.
- "3x12" means 3 sets, 12 reps.
- For rep-only exercises, duration can be 0.

Output rules:
- You MUST call get_workout_log with: { "workouts": [...] }.
- No plain text, no markdown, no explanations.
`;

const WORKOUT_LOG_TOOL = {
  type: 'function' as const,
  name: 'get_workout_log',
  description:
    'Convert a natural-language description of completed workouts into structured workout entries.',
  strict: true,
  parameters: {
    type: 'object',
    properties: {
      workouts: {
        type: 'array',
        description: 'List of structured workout entries parsed from the description.',
        items: {
          type: 'object',
          properties: {
            exercise: {
              type: 'string',
              description: 'Short exercise name, e.g. "Running", "Push-ups".',
            },
            category: {
              type: 'string',
              description:
                'Workout category. One of: "cardio", "strength", "flexibility", "sports", "other".',
            },
            duration: {
              type: 'number',
              description:
                'Duration of this exercise in minutes. Use 0 for purely rep-based strength sets when no time is given.',
            },
            caloriesBurned: {
              type: 'number',
              description: 'Estimated calories burned for this exercise in kilocalories.',
            },
            sets: {
              anyOf: [{ type: 'number' }, { type: 'null' }],
              description: 'Number of sets, if applicable. Use null if not applicable.',
            },
            reps: {
              anyOf: [{ type: 'number' }, { type: 'null' }],
              description: 'Number of reps per set, if applicable. Use null if not applicable.',
            },
            weight: {
              anyOf: [{ type: 'number' }, { type: 'null' }],
              description: 'Weight used in kilograms, if applicable. Use null if not applicable.',
            },
            notes: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
              description: 'Optional short note or clarification for this exercise. Use null if none.',
            },
          },
          required: [
            'exercise',
            'category',
            'duration',
            'caloriesBurned',
            'sets',
            'reps',
            'weight',
            'notes',
          ],
          additionalProperties: false,
        },
      },
    },
    required: ['workouts'],
    additionalProperties: false,
  },
} as const;

/** Seconds per rep for rep-based duration estimation when duration is not provided. */
const SECONDS_PER_REP: { pattern: RegExp; seconds: number }[] = [
  { pattern: /push-?ups?/i, seconds: 2 },
  { pattern: /sit-?ups?/i, seconds: 2 },
  { pattern: /crunches?/i, seconds: 2 },
  { pattern: /pull-?ups?/i, seconds: 3 },
  { pattern: /squats?/i, seconds: 2.5 },
];

function getSecondsPerRep(exerciseName: string): number | null {
  const name = exerciseName.trim().toLowerCase();
  for (const { pattern, seconds } of SECONDS_PER_REP) {
    if (pattern.test(name)) return seconds;
  }
  return null;
}

/** Estimate duration in minutes from total reps using known seconds-per-rep. Always returns at least 1. */
function estimateDurationFromReps(totalReps: number, secondsPerRep: number): number {
  const totalSeconds = totalReps * secondsPerRep;
  const minutes = totalSeconds / 60;
  return Math.max(1, Math.round(minutes));
}

/** Kcal per rep for rep-based calorie estimation when user did not provide calories. */
const KCAL_PER_REP: { pattern: RegExp; kcalPerRep: number }[] = [
  { pattern: /push-?ups?/i, kcalPerRep: 0.29 },
  { pattern: /sit-?ups?|crunches?/i, kcalPerRep: 0.25 },
  { pattern: /squats?/i, kcalPerRep: 0.32 },
  { pattern: /pull-?ups?/i, kcalPerRep: 1 },
];

function getKcalPerRep(exerciseName: string): number | null {
  const name = exerciseName.trim().toLowerCase();
  for (const { pattern, kcalPerRep } of KCAL_PER_REP) {
    if (pattern.test(name)) return kcalPerRep;
  }
  return null;
}

/** Kcal per minute fallback for cardio exercises when model returns 0 calories. */
const KCAL_PER_MIN: { pattern: RegExp; kcalPerMin: number }[] = [
  { pattern: /treadmill|running|run\b/i, kcalPerMin: 10 },
  { pattern: /jogging|jog\b/i, kcalPerMin: 8 },
  { pattern: /brisk walk|walking|walk\b/i, kcalPerMin: 4.5 },
  { pattern: /cycling|biking|bike\b/i, kcalPerMin: 8 },
  { pattern: /swimming|swim\b/i, kcalPerMin: 9 },
  { pattern: /elliptical/i, kcalPerMin: 7 },
  { pattern: /rowing|rower/i, kcalPerMin: 8 },
  { pattern: /jump rope|skipping/i, kcalPerMin: 11 },
  { pattern: /stairs|stair climber/i, kcalPerMin: 8 },
];

function getKcalPerMin(exerciseName: string): number | null {
  const name = exerciseName.trim().toLowerCase();
  for (const { pattern, kcalPerMin } of KCAL_PER_MIN) {
    if (pattern.test(name)) return kcalPerMin;
  }
  return null;
}

function extractJsonFromText(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const jsonBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = jsonBlock ? jsonBlock[1].trim() : trimmed;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

type RawWorkout = Record<string, unknown>;

function normalizeWorkout(raw: RawWorkout) {
  const str = (v: unknown) => (typeof v === 'string' ? v : String(v ?? '')).trim();
  const num = (v: unknown) => {
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    const parsed = Number(v);
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  const intOrUndefined = (v: unknown) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return undefined;
    const rounded = Math.round(n);
    return rounded > 0 ? rounded : undefined;
  };

  const exercise = str(raw.exercise) || 'Workout';

  const categoryRaw = str(raw.category).toLowerCase();
  const allowedCategories = ['cardio', 'strength', 'flexibility', 'sports', 'other'] as const;
  const category = allowedCategories.includes(categoryRaw as (typeof allowedCategories)[number])
    ? categoryRaw
    : 'other';

  let duration = Math.max(0, num(raw.duration));
  let caloriesBurned = Math.max(0, num(raw.caloriesBurned));

  const sets = intOrUndefined(raw.sets);
  const reps = intOrUndefined(raw.reps);
  const weightValue = Number(raw.weight);
  const weight = Number.isFinite(weightValue) && weightValue > 0 ? weightValue : undefined;

  const notes = str(raw.notes);

  // When duration is 0 but we have reps, estimate duration from seconds-per-rep rules
  const totalReps = (sets ?? 1) * (reps ?? 0);
  if (duration <= 0 && (reps !== undefined || sets !== undefined) && totalReps > 0) {
    const secPerRep = getSecondsPerRep(exercise);
    if (secPerRep !== null) {
      duration = estimateDurationFromReps(totalReps, secPerRep);
    }
  }

  // When user did not provide calories (0) and exercise has reps, estimate from kcal/rep
  if (caloriesBurned === 0 && totalReps > 0) {
    const kcalPerRep = getKcalPerRep(exercise);
    if (kcalPerRep !== null) {
      caloriesBurned = Math.round(kcalPerRep * totalReps);
    }
  }

  // Cardio fallback: if model returns 0 but duration exists, estimate from kcal/min
  if (caloriesBurned === 0 && category === 'cardio' && duration > 0) {
    const kcalPerMin = getKcalPerMin(exercise) ?? 6;
    caloriesBurned = Math.round(kcalPerMin * duration);
  }

  return {
    exercise,
    category,
    duration,
    caloriesBurned,
    ...(sets !== undefined && { sets }),
    ...(reps !== undefined && { reps }),
    ...(weight !== undefined && { weight }),
    ...(notes && { notes }),
  };
}

export async function POST(req: NextRequest) {
  try {
    const isDebugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const { text } = await req.json();
    if (!text || typeof text !== 'string' || !text.trim()) {
      return errorResponse('Text description of the workout is required', 400);
    }

    const apiKey = await resolveOpenAIKey(userId);
    if (!apiKey) {
      return errorResponse(
        'OpenAI API key required. Add your key in Settings to enable AI Workout Logger.',
        403
      );
    }

    const userMessage = `The user describes completed workouts: "${text.trim()}". Parse this into structured workout entries that can be logged.`;
    const requestedAt = new Date().toISOString();
    const startedAt = Date.now();

    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        instructions: INSTRUCTIONS,
        input: userMessage,
        tools: [WORKOUT_LOG_TOOL],
        tool_choice: {
          type: 'function',
          name: 'get_workout_log',
        },
        temperature: 0.3,
        max_output_tokens: 2048,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const status = res.status;
      const apiError = (err as { error?: { message?: string } })?.error;
      const rawMessage = apiError?.message;

      if (status === 401 || status === 403) {
        return errorResponse(
          'Your OpenAI API key looks invalid or expired. Update it in Settings → API Keys.',
          400
        );
      }

      if (status >= 500) {
        return errorResponse(
          'AI service is temporarily unavailable. Please try again in a few minutes.',
          502
        );
      }

      return errorResponse(rawMessage || `OpenAI API error: ${status}`, 400);
    }

    const data = (await res.json()) as {
      model?: string;
      usage?: OpenAIUsage;
      output?: Array<{
        type?: string;
        name?: string;
        arguments?: string;
        role?: string;
        content?: Array<{ type?: string; text?: string }>;
      }>;
      error?: { message?: string };
    };

    if (data.error?.message) {
      return errorResponse(data.error.message, 400);
    }

    const toolCall = (data.output ?? []).find(
      (item) => item.type === 'function_call' && item.name === 'get_workout_log'
    );

    if (!toolCall || typeof toolCall.arguments !== 'string') {
      return errorResponse(
        'Could not parse workout data from AI response. Try describing the workout in more detail.',
        422
      );
    }

    const parsedArgs = extractJsonFromText(toolCall.arguments);
    if (!parsedArgs) {
      return errorResponse(
        'Could not parse workout data from AI response. Try describing the workout in more detail.',
        422
      );
    }

    const rawWorkouts = Array.isArray(parsedArgs.workouts)
      ? (parsedArgs.workouts as unknown[])
      : Array.isArray(parsedArgs)
        ? (parsedArgs as unknown[])
        : [];

    if (!rawWorkouts.length) {
      return errorResponse(
        'Could not parse workout data from AI response. Try describing the workout in more detail.',
        422
      );
    }

    const workouts = rawWorkouts
      .map((w) => (w && typeof w === 'object' ? normalizeWorkout(w as RawWorkout) : null))
      .filter((w) => w !== null) as ReturnType<typeof normalizeWorkout>[];

    if (!workouts.length) {
      return errorResponse(
        'Could not parse workout data from AI response. Try describing the workout in more detail.',
        422
      );
    }

    if (isDebugMode) {
      const timestamp = new Date().toISOString();
      const debugLog = {
        userRequest: {
          text: text.trim(),
          requestedAt,
        },
        instructions: INSTRUCTIONS,
        userMessage,
        response: JSON.stringify(data, null, 2),
        parsedResult: {
          workouts,
        },
        metadata: {
          model: typeof data.model === 'string' ? data.model : 'gpt-4o',
          usage: data.usage ?? {},
          latencyMs: Math.max(0, Date.now() - startedAt),
          timestamp,
          status: 'success',
        },
      };
      return maskedResponse({ workouts, debugLog });
    }

    return maskedResponse({ workouts });
  } catch (err) {
    console.error('[AI Workout Logger Error]:', err);
    const message =
      err instanceof Error && err.message ? err.message : 'AI workout logging failed';
    return errorResponse(message, 500);
  }
}

