// ============================================
// Frontend API Client
// ============================================
// ALL API calls from the frontend go through this file.
// This centralizes error handling, auth headers, and
// ensures no sensitive data leaks in request payloads.

import type { ApiResponse } from '@/types';

const BASE_URL = '/api';

// Fields that should NEVER be sent from the client
const BLOCKED_REQUEST_FIELDS = ['password', '_id', '__v', 'apiKeys'];

/**
 * Strip any sensitive fields from request body before sending.
 */
function sanitizeRequestBody(body: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...body };
  for (const field of BLOCKED_REQUEST_FIELDS) {
    if (field in sanitized) {
      delete sanitized[field];
    }
  }
  return sanitized;
}

/**
 * Core fetch wrapper with error handling and masking.
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${BASE_URL}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Sanitize body if present
    let body = options.body;
    if (body && typeof body === 'string') {
      try {
        const parsed = JSON.parse(body);
        if (typeof parsed === 'object' && parsed !== null) {
          body = JSON.stringify(sanitizeRequestBody(parsed));
        }
      } catch {
        // Not JSON, leave as-is
      }
    }

    const res = await fetch(url, {
      ...options,
      headers,
      body,
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: json.error || `Request failed with status ${res.status}`,
      };
    }

    return json as ApiResponse<T>;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

// ---------- API Methods ----------

export const api = {
  // Auth & User
  getUser: () => apiFetch('/user'),

  updateProfile: (profile: Record<string, unknown>) =>
    apiFetch('/user', {
      method: 'PUT',
      body: JSON.stringify({ profile }),
    }),

  updateSettings: (settings: Record<string, unknown>) =>
    apiFetch('/user', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    }),

  updateTargets: (targets: Record<string, unknown>) =>
    apiFetch('/user', {
      method: 'PUT',
      body: JSON.stringify({ targets }),
    }),

  recalculateTargets: () =>
    apiFetch('/user/recalculate-targets', {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  // API Keys (sent via dedicated secure endpoint)
  saveApiKeys: (keys: { openai?: string; edamamAppId?: string; edamamAppKey?: string }) =>
    apiFetch('/user/api-keys', {
      method: 'PUT',
      body: JSON.stringify(keys),
    }),

  // Food Search
  searchFoods: (query: string, category?: string) => {
    let endpoint = `/foods?q=${encodeURIComponent(query)}`;
    if (category) endpoint += `&category=${encodeURIComponent(category)}`;
    return apiFetch(endpoint);
  },

  // Daily Log
  getDailyLog: (date: string) =>
    apiFetch(`/daily-log?date=${date}`),

  getCaloriesHistory: (days: number = 30) =>
    apiFetch(`/daily-log?days=${days}`),

  getRecentFoods: (limit: number = 30, days: number = 60) =>
    apiFetch(`/daily-log/recent-foods?limit=${limit}&days=${days}`),

  createOrUpdateLog: (date: string, data: Record<string, unknown>) =>
    apiFetch('/daily-log', {
      method: 'POST',
      body: JSON.stringify({ date, ...data }),
    }),

  // Water
  addWater: (date: string, amount: number) =>
    apiFetch('/water', {
      method: 'POST',
      body: JSON.stringify({ date, amount }),
    }),

  getWaterHistory: (days: number = 30) =>
    apiFetch(`/water?days=${days}`),

  // Weight
  logWeight: (date: string, weight: number) =>
    apiFetch('/weight', {
      method: 'POST',
      body: JSON.stringify({ date, weight }),
    }),

  getWeightHistory: (days: number = 30) =>
    apiFetch(`/weight?days=${days}`),

  // Meals
  addMeal: (date: string, meal: Record<string, unknown>) =>
    apiFetch('/daily-log/meal', {
      method: 'POST',
      body: JSON.stringify({ date, meal }),
    }),

  removeMeal: (date: string, mealId: string) =>
    apiFetch('/daily-log/meal', {
      method: 'DELETE',
      body: JSON.stringify({ date, mealId }),
    }),

  // Workouts
  addWorkout: (date: string, workout: Record<string, unknown>) =>
    apiFetch('/workouts', {
      method: 'POST',
      body: JSON.stringify({ date, workout }),
    }),

  getWorkoutExercises: (days: number = 90) =>
    apiFetch(`/workouts/exercises?days=${days}`),

  removeWorkout: (date: string, workoutId: string) =>
    apiFetch('/workouts', {
      method: 'DELETE',
      body: JSON.stringify({ date, workoutId }),
    }),

  getWorkoutHistory: (days: number = 7) =>
    apiFetch(`/workouts?days=${days}`),

  // Sleep
  logSleep: (date: string, sleepData: Record<string, unknown>) =>
    apiFetch('/sleep', {
      method: 'POST',
      body: JSON.stringify({ date, ...sleepData }),
    }),

  getSleepHistory: (days: number = 30) =>
    apiFetch(`/sleep?days=${days}`),

  // AI
  getMealSuggestions: (context: Record<string, unknown>) =>
    apiFetch('/ai/recommendations', {
      method: 'POST',
      body: JSON.stringify({ type: 'meal', ...context }),
    }),

  getWorkoutPlan: (context: Record<string, unknown>) =>
    apiFetch('/ai/recommendations', {
      method: 'POST',
      body: JSON.stringify({ type: 'workout', ...context }),
    }),

  getInsights: () =>
    apiFetch('/ai/recommendations', {
      method: 'POST',
      body: JSON.stringify({ type: 'insights' }),
    }),

  getSleepTips: () =>
    apiFetch('/ai/recommendations', {
      method: 'POST',
      body: JSON.stringify({ type: 'sleep' }),
    }),

  generateHealthPlan: () =>
    apiFetch('/ai/health-plan', {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  // Onboarding
  completeOnboarding: (data: Record<string, unknown>) =>
    apiFetch('/user/onboarding', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export default api;
