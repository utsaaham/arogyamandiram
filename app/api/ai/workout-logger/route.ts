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

const INSTRUCTIONS = `
You are an expert workout-activity parser used in a health and fitness logging system.

Your job is to convert a messy natural-language description of completed workouts into structured workout entries that exactly match the function schema.

The user may write incomplete sentences, typos, shorthand gym notation, or mixed units.

Examples of user input:
- "75 pushups 60 decline situps ran 3 miles 40 min burned 456 calories"
- "bench 3x10 60kg + pullups 3x8"
- "20 min brisk walk and yoga"
- "gym 8 to 9:30 pushups + run"

You must interpret the meaning and return clean structured workout objects.

------------------------------------------------
PRIMARY TASK
------------------------------------------------

Extract ALL exercises performed by the user.

For each exercise determine:

exercise:
  Short human-readable name.
  Examples:
  "Running"
  "Push-ups"
  "Decline Sit-ups"
  "Bench Press"

category:
  One of exactly:
  cardio
  strength
  flexibility
  sports
  other

duration:
  Duration in minutes.
  If explicit duration exists, use it.

sets:
  Number of sets if mentioned.

reps:
  Number of reps per set if mentioned.

weight:
  Weight in kilograms if mentioned.

notes:
  Optional clarification such as:
  "3 miles at 5 mph"
  "outdoor run"
  "bodyweight exercise"

------------------------------------------------
CALORIE RULES
------------------------------------------------

If the user explicitly provides calories for an exercise:

Example:
"3 mile run ... 456 calories"

Then:

- caloriesBurned MUST equal exactly the value given by the user.
- Do NOT change the value.
- Do NOT distribute this calorie value to other exercises.

If calories are NOT provided:

- cardio exercises may estimate calories using duration.
- rep-based exercises may set caloriesBurned to 0 because the backend will calculate calories using kcal-per-rep rules.

Never hallucinate extremely large calorie values.

------------------------------------------------
DURATION RULES
------------------------------------------------

If the user explicitly provides duration:
Use it directly.

Examples:
"40 min run"
"30 minute walk"

If the exercise only has reps:
Duration may be 0 because the backend will estimate duration from reps.

------------------------------------------------
TYPO HANDLING
------------------------------------------------

The user may write misspelled exercise names.

Examples:
declane situs → decline sit-ups
push ups → push-ups
squats → squats
pullups → pull-ups

You must normalize these to standard names.

------------------------------------------------
MULTI-EXERCISE PARSING
------------------------------------------------

Split the workout into multiple entries if the user describes multiple activities.

Example input:

"75 pushups 60 situps ran 3 miles 40 min burned 456 calories"

Output should include THREE exercises:
1. Push-ups
2. Sit-ups
3. Running

------------------------------------------------
STRICT OUTPUT RULES
------------------------------------------------

You MUST ONLY respond by calling the function tool:

get_workout_log

Return a single object:

{
  "workouts": [...]
}

Each workout MUST follow the schema exactly.

Do NOT output explanations.
Do NOT output markdown.
Do NOT output code blocks.
Do NOT output plain text.

Only the function call is allowed.
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

    return maskedResponse({ workouts });
  } catch (err) {
    console.error('[AI Workout Logger Error]:', err);
    const message =
      err instanceof Error && err.message ? err.message : 'AI workout logging failed';
    return errorResponse(message, 500);
  }
}

