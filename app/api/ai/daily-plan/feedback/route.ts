// ============================================
// /api/ai/daily-plan/feedback - Save user feedback on daily plan
// ============================================
// POST: upserts feedback on a DailyPlan document for the given date

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import DailyPlan from '@/models/DailyPlan';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { getToday } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const body = await req.json() as {
      date?: string;
      workoutDifficulty?: 'too_easy' | 'just_right' | 'too_hard';
      skippedWorkoutReason?: 'no_time' | 'tired' | 'injury' | 'other';
      dislikedFoods?: string[];
      replacedMeals?: { original: string; replacement: string }[];
    };

    const date = body.date || getToday();

    // Validate difficulty if provided
    const validDifficulties = ['too_easy', 'just_right', 'too_hard'];
    if (body.workoutDifficulty && !validDifficulties.includes(body.workoutDifficulty)) {
      return errorResponse('Invalid workoutDifficulty value', 400);
    }

    const validReasons = ['no_time', 'tired', 'injury', 'other'];
    if (body.skippedWorkoutReason && !validReasons.includes(body.skippedWorkoutReason)) {
      return errorResponse('Invalid skippedWorkoutReason value', 400);
    }

    await connectDB();

    const feedbackUpdate: Record<string, unknown> = { 'feedback.submittedAt': new Date() };
    if (body.workoutDifficulty) feedbackUpdate['feedback.workoutDifficulty'] = body.workoutDifficulty;
    if (body.skippedWorkoutReason) feedbackUpdate['feedback.skippedWorkoutReason'] = body.skippedWorkoutReason;
    if (Array.isArray(body.dislikedFoods)) feedbackUpdate['feedback.dislikedFoods'] = body.dislikedFoods;
    if (Array.isArray(body.replacedMeals)) feedbackUpdate['feedback.replacedMeals'] = body.replacedMeals;

    const result = await DailyPlan.findOneAndUpdate(
      { userId, date },
      { $set: feedbackUpdate },
      { new: true, upsert: false } // don't create a plan just for feedback
    ).lean();

    if (!result) {
      return errorResponse('No plan found for this date', 404);
    }

    return maskedResponse({ success: true, date });
  } catch (err) {
    console.error('[Daily Plan Feedback Error]:', err);
    return errorResponse(err instanceof Error ? err.message : 'Failed to save feedback', 500);
  }
}
