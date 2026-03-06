// ============================================
// /api/ai/meal-ideas — Smart Meal Ideas (history + two-step AI)
// ============================================
// POST: selectedMealTypes, preferences. Returns suggestions + optional debugLog when DEBUG_MODE.

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { getMealIdeas } from '@/lib/mealIdeasService';

export const dynamic = 'force-dynamic';

const ALLOWED_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const body = await req.json();
    const selectedMealTypes = body.selectedMealTypes as unknown;
    const preferences = typeof body.preferences === 'string' ? body.preferences : '';

    if (!Array.isArray(selectedMealTypes) || selectedMealTypes.length === 0) {
      return errorResponse('selectedMealTypes must be a non-empty array', 400);
    }
    const valid = selectedMealTypes.filter((t: unknown) =>
      typeof t === 'string' && ALLOWED_MEAL_TYPES.includes(t)
    );
    if (valid.length === 0) {
      return errorResponse(
        'selectedMealTypes must contain at least one of: breakfast, lunch, dinner, snack',
        400
      );
    }

    await connectDB();
    const { suggestions, debugLog } = await getMealIdeas(userId, valid, preferences);

    const payload: { suggestions: typeof suggestions; debugLog?: typeof debugLog } = { suggestions };
    if (process.env.NEXT_PUBLIC_DEBUG_MODE === 'true') {
      payload.debugLog = debugLog;
    }
    return maskedResponse(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Meal ideas request failed';
    if (message.includes('OpenAI API key required')) {
      return errorResponse(message, 403);
    }
    console.error('[Meal Ideas API Error]:', err);
    return errorResponse(message, 500);
  }
}
