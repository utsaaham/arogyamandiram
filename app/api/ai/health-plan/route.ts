// ============================================
// /api/ai/health-plan - AI-Generated Personalized Health Targets
// ============================================
// Generates comprehensive health targets (calories, water, macros, ideal weight,
// workout duration, calorie burn, sleep) and saves to user profile.

import { NextRequest } from 'next/server';
import User from '@/models/User';
import { maskedResponse, errorResponse, maskUser } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { generateHealthPlanTargets, getOpenAIKeyForHealthPlan } from '@/lib/aiHealthPlan';

export async function POST(_req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const apiKey = await getOpenAIKeyForHealthPlan(userId);
    if (!apiKey) {
      return errorResponse(
        'OpenAI API key required. Add your key in Settings to enable AI health plan.',
        403
      );
    }

    const result = await generateHealthPlanTargets(userId);
    if (!result) return errorResponse('User not found or failed to generate plan', 404);

    const { targets, explanations } = result;

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: { targets } },
      { new: true, runValidators: true }
    )
      .select('+apiKeys.openai +apiKeys.edamam.appId +apiKeys.edamam.appKey')
      .lean();

    if (!updated) return errorResponse('User not found', 404);

    return maskedResponse(
      { user: maskUser(updated), explanations },
      { message: 'Health plan updated' }
    );
  } catch (err) {
    console.error('[AI Health Plan Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to generate health plan';
    return errorResponse(message, 500);
  }
}
