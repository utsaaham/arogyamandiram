// ============================================
// /api/foods - Food Search API
// ============================================
// Searches built-in Indian food database first.
// If user has Edamam API key, also searches Edamam.

import { NextRequest } from 'next/server';
import { searchFoods, getFoodCategories } from '@/lib/indianFoods';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { decrypt } from '@/lib/encryption';

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const limit = parseInt(searchParams.get('limit') || '20');

    // 1. Search built-in Indian food database
    let results = searchFoods(query, limit);

    // Filter by category if specified
    if (category) {
      results = results.filter((f) => f.category === category);
    }

    // 2. If user has Edamam key and query is specific enough, also search Edamam
    let edamamResults: unknown[] = [];
    if (query.length >= 3) {
      try {
        await connectDB();
        const user = await User.findById(userId).select('+apiKeys.edamam').lean();
        const apiKeys = user?.apiKeys as { edamam?: { appId?: string; appKey?: string } } | undefined;

        let appId = '';
        let appKey = '';

        // Check user's own keys first
        if (apiKeys?.edamam?.appId && apiKeys?.edamam?.appKey) {
          appId = decrypt(apiKeys.edamam.appId);
          appKey = decrypt(apiKeys.edamam.appKey);
        }
        // Fallback to server default
        else if (process.env.EDAMAM_APP_ID && process.env.EDAMAM_APP_KEY) {
          appId = process.env.EDAMAM_APP_ID;
          appKey = process.env.EDAMAM_APP_KEY;
        }

        if (appId && appKey) {
          const edamamUrl = `https://api.edamam.com/api/food-database/v2/parser?ingr=${encodeURIComponent(query)}&app_id=${appId}&app_key=${appKey}`;
          const edamamRes = await fetch(edamamUrl, { signal: AbortSignal.timeout(5000) });

          if (edamamRes.ok) {
            const data = await edamamRes.json();
            edamamResults = (data.hints || []).slice(0, 5).map((hint: {
              food: {
                foodId: string;
                label: string;
                nutrients: { ENERC_KCAL?: number; PROCNT?: number; CHOCDF?: number; FAT?: number; FIBTG?: number };
              };
            }) => ({
              id: `edamam_${hint.food.foodId}`,
              name: hint.food.label,
              category: 'other' as const,
              servingSize: 100,
              servingUnit: 'g',
              calories: Math.round(hint.food.nutrients.ENERC_KCAL || 0),
              protein: Math.round(hint.food.nutrients.PROCNT || 0),
              carbs: Math.round(hint.food.nutrients.CHOCDF || 0),
              fat: Math.round(hint.food.nutrients.FAT || 0),
              fiber: Math.round(hint.food.nutrients.FIBTG || 0),
              isVegetarian: false,
              isVegan: false,
              tags: ['edamam', 'external'],
            }));
          }
        }
      } catch {
        // Edamam search failed - continue with local results only
      }
    }

    return maskedResponse({
      foods: results,
      edamamFoods: edamamResults,
      categories: query ? undefined : getFoodCategories(),
      total: results.length + edamamResults.length,
    });
  } catch (err) {
    console.error('[Food Search Error]:', err);
    return errorResponse('Failed to search foods', 500);
  }
}
