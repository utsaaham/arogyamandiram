// ============================================
// /api/ai/food-logger - AI Food Logger with Web Search
// ============================================
// Uses OpenAI Responses API with web_search to get nutrition for user-described meals.
// Requires user's OpenAI API key or server default.

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { decrypt } from '@/lib/encryption';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

async function getOpenAIKey(userId: string): Promise<string | null> {
  await connectDB();
  const user = await User.findById(userId).select('+apiKeys.openai').lean();
  const apiKeys = user?.apiKeys as { openai?: string } | undefined;
  if (apiKeys?.openai) return decrypt(apiKeys.openai);
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  return null;
}

const INSTRUCTIONS = `You are a nutrition assistant. The user will describe what they ate (e.g. "2 idlis and sambar", "chicken sandwich and fries"). Use web search to find accurate nutritional information. Return exactly one JSON object (no markdown, no code block) with these keys only:
name (string): short meal name
calories (number): total kcal
protein (number): grams
carbs (number): grams
fat (number): grams
fiber (number): grams, 0 if unknown
sugar (number): grams, 0 if unknown
sodium (number): mg, 0 if unknown
saturatedFat (number): grams, 0 if unknown
cholesterol (number): mg, 0 if unknown
quantity (number): 1 for one serving, or number of items/servings
unit (string): "g", "serving", "piece", "bowl", "plate", etc.
If multiple items are described, combine into one meal with aggregated nutrition and a combined name. Return only valid JSON.`;

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

function normalizeMeal(obj: Record<string, unknown>) {
  const num = (v: unknown) => (typeof v === 'number' && !Number.isNaN(v) ? v : 0);
  const str = (v: unknown) => (typeof v === 'string' ? v : String(v ?? ''));
  return {
    name: str(obj.name).trim() || 'Meal',
    calories: Math.max(0, num(obj.calories)),
    protein: Math.max(0, num(obj.protein)),
    carbs: Math.max(0, num(obj.carbs)),
    fat: Math.max(0, num(obj.fat)),
    fiber: Math.max(0, num(obj.fiber)),
    sugar: Math.max(0, num(obj.sugar)),
    sodium: Math.max(0, num(obj.sodium)),
    saturatedFat: Math.max(0, num(obj.saturatedFat)),
    cholesterol: Math.max(0, num(obj.cholesterol)),
    quantity: Math.max(0.1, num(obj.quantity)) || 1,
    unit: str(obj.unit).trim() || 'serving',
  };
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const { text } = await req.json();
    if (!text || typeof text !== 'string' || !text.trim()) {
      return errorResponse('Text description of the meal is required', 400);
    }

    const apiKey = await getOpenAIKey(userId);
    if (!apiKey) {
      return errorResponse(
        'OpenAI API key required. Add your key in Settings to enable AI Food Logger.',
        403
      );
    }

    const userMessage = `What are the nutrition facts for this meal? "${text.trim()}"`;

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
        text: { format: { type: 'text' } },
        tools: [
          {
            type: 'web_search',
            user_location: { type: 'approximate' as const },
            search_context_size: 'medium' as const,
          },
        ],
        temperature: 0.3,
        max_output_tokens: 2048,
        include: ['web_search_call.action.sources'],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = (err as { error?: { message?: string } })?.error?.message || `OpenAI API error: ${res.status}`;
      return errorResponse(msg, res.status >= 500 ? 502 : 400);
    }

    const data = (await res.json()) as {
      output?: Array<{
        type?: string;
        role?: string;
        content?: Array<{ type?: string; text?: string }>;
      }>;
      error?: { message?: string };
    };

    if (data.error?.message) {
      return errorResponse(data.error.message, 400);
    }

    let responseText = '';
    for (const item of data.output ?? []) {
      if (item.type === 'message' && item.role === 'assistant' && Array.isArray(item.content)) {
        for (const block of item.content) {
          if (block.type === 'output_text' && typeof block.text === 'string') {
            responseText += block.text;
          }
        }
      }
    }

    const parsed = extractJsonFromText(responseText);
    if (!parsed) {
      return errorResponse('Could not parse nutrition data from AI response. Try describing the meal in more detail.', 422);
    }

    const meal = normalizeMeal(parsed);
    return maskedResponse({ meal });
  } catch (err) {
    console.error('[AI Food Logger Error]:', err);
    return errorResponse('Failed to get nutrition from AI', 500);
  }
}
