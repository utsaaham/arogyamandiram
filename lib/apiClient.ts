// ============================================
// Frontend API Client
// ============================================
// ALL API calls from the frontend go through this file.
// This centralizes error handling, auth headers, and
// ensures no sensitive data leaks in request payloads.

import type { ApiResponse, HealthDataSyncSource } from '@/types';

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
      cache: 'no-store',
      headers,
      body,
    });

    // Read as text first: Safari's res.json() throws cryptic errors
    // ("The string did not match the expected pattern.") on empty or
    // non-JSON bodies, and those messages used to leak into toasts.
    const text = await res.text();
    let json: Record<string, unknown> | null = null;
    if (text) {
      try {
        json = JSON.parse(text) as Record<string, unknown>;
      } catch {
        json = null;
      }
    }

    if (!res.ok) {
      return {
        success: false,
        error: (json?.error as string) || `Request failed with status ${res.status}`,
      };
    }

    if (!json) {
      return {
        success: false,
        error: 'The server sent back something we could not read. Give it another try?',
      };
    }

    return json as unknown as ApiResponse<T>;
  } catch {
    return {
      success: false,
      error: 'Could not reach the server. Check your connection and try again.',
    };
  }
}

// ---------- API Methods ----------

export const api = {
  // Auth & User
  getUser: () => apiFetch('/user'),

  /** Update user profile and/or username in one request. */
  updateUser: (body: { profile?: Record<string, unknown>; username?: string }) =>
    apiFetch('/user', {
      method: 'PUT',
      body: JSON.stringify(body),
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
  saveApiKeys: (keys: { openai?: string; fdcApiKey?: string }) =>
    apiFetch('/user/api-keys', {
      method: 'PUT',
      body: JSON.stringify(keys),
    }),

  // Email Settings (SMTP + IMAP — passwords are encrypted server-side)
  saveEmailSettings: (body: {
    smtp?: {
      host?: string; port?: number; secure?: boolean;
      user?: string; pass?: string; fromName?: string;
    };
    imap?: {
      host?: string; port?: number; secure?: boolean;
      user?: string; pass?: string;
    };
  }) =>
    apiFetch('/user/email-settings', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteEmailSettings: (type: 'smtp' | 'imap') =>
    apiFetch('/user/email-settings', {
      method: 'DELETE',
      body: JSON.stringify({ type }),
    }),

  testEmailReminder: (reminderType: string) =>
    apiFetch('/email/send-reminder', {
      method: 'POST',
      body: JSON.stringify({ reminderType }),
    }),

  sendEmailTest: (testMode: 'smtp_test' | 'imap_test') =>
    apiFetch('/email/send-reminder', {
      method: 'POST',
      body: JSON.stringify({ testMode }),
    }),

  verifyImapTestReply: () =>
    apiFetch<{ verified: boolean; verifiedAt?: string; checked?: boolean }>('/email/verify-imap', {
      method: 'POST',
      body: JSON.stringify({}),
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

  removeMeal: (date: string, mealId?: string, index?: number) => {
    const params: Record<string, string> = { date };
    if (mealId) params.mealId = mealId;
    else if (typeof index === 'number' && index >= 0) params.index = String(index);
    return apiFetch(`/daily-log/meal?${new URLSearchParams(params).toString()}`, { method: 'DELETE' });
  },

  // Workouts
  addWorkout: (date: string, workout: Record<string, unknown>) =>
    apiFetch('/workouts', {
      method: 'POST',
      body: JSON.stringify({ date, workout }),
    }),

  updateWorkout: (date: string, workoutId: string, workout: Record<string, unknown>) =>
    apiFetch('/workouts', {
      method: 'PUT',
      body: JSON.stringify({ date, workoutId, workout }),
    }),

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

  // Vitals scores
  getScores: () =>
    apiFetch('/scores'),

  logScoresJournal: (data: { habits: string[]; mood?: number; date?: string }) =>
    apiFetch('/scores/journal', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // AI
  getInsightsEligibility: () =>
    apiFetch('/ai/insights-eligibility'),

  getInsights: (params?: { period?: 'yesterday' | 'week' | 'month' | 'year'; startDate?: string; endDate?: string }) =>
    apiFetch<{ insights?: Record<string, unknown>[]; generatedAt?: string; debugLog?: unknown }>('/ai/recommendations', {
      method: 'POST',
      body: JSON.stringify({ type: 'insights', ...params }),
    }),

  submitPlanFeedback: (data: {
    date: string;
    workoutDifficulty?: string;
    skippedWorkoutReason?: string;
    dislikedFoods?: string[];
    replacedMeals?: { original: string; replacement: string }[];
  }) =>
    apiFetch<{ success: boolean }>('/ai/daily-plan/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  generateHealthPlan: () =>
    apiFetch<{
      user?: Record<string, unknown>;
      explanations?: Record<string, string>;
      debugLog?: unknown;
    }>('/ai/health-plan', {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  // Onboarding
  completeOnboarding: (data: Record<string, unknown>) =>
    apiFetch('/user/onboarding', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Log food via AI food-logger (used by food-category todos)
  logFoodText: (text: string, source?: string) =>
    apiFetch<{ items: Record<string, unknown>[]; total: Record<string, unknown> }>('/ai/food-logger', {
      method: 'POST',
      body: JSON.stringify({ text, source }),
    }),

  // Todos
  getTodosForDate: (date: string) =>
    apiFetch<{ date: string; templates: unknown[]; completions: unknown[] }>(`/todos?date=${date}`),

  toggleTodo: (templateId: string, date: string, completed: boolean) =>
    apiFetch('/todos', {
      method: 'POST',
      body: JSON.stringify({ templateId, date, completed }),
    }),

  getTodoTemplates: () =>
    apiFetch<{ templates: unknown[] }>('/todos/templates'),

  createTodoTemplate: (t: { title: string; note?: string; time?: string; category?: string; frequency?: number; cadence?: string; baseItems?: Record<string, unknown>[] }) =>
    apiFetch('/todos/templates', {
      method: 'POST',
      body: JSON.stringify(t),
    }),

  updateTodoTemplate: (t: { id: string; title?: string; note?: string; time?: string; category?: string; enabled?: boolean; frequency?: number; cadence?: string; baseItems?: Record<string, unknown>[] }) =>
    apiFetch('/todos/templates', {
      method: 'PUT',
      body: JSON.stringify(t),
    }),

  deleteTodoTemplate: (id: string) =>
    apiFetch(`/todos/templates?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // AI Orchestrator
  callOrchestrator: (text: string, imageBase64?: string, imageMimeType?: string) =>
    apiFetch<{
      tool: string;
      result: Record<string, unknown>;
      debugLog: Record<string, unknown>;
    }>('/ai/orchestrator', {
      method: 'POST',
      body: JSON.stringify({ text, imageBase64, imageMimeType }),
    }),

  // Health Data Sync
  getHealthDataConfig: () =>
    apiFetch<{
      endpoint: string;
      hasApiKey: boolean;
      enabled: boolean;
      syncIntervalMinutes: number;
      lastSyncAt: string | null;
      lastSyncSource: HealthDataSyncSource | '';
      lastSchemaJson: string;
      lastSyncStatus: string;
      lastSyncError: string;
    }>('/health-data'),

  saveHealthDataConfig: (cfg: {
    endpoint?: string;
    apiKey?: string;
    clearApiKey?: boolean;
    enabled?: boolean;
    syncIntervalMinutes?: number;
  }) =>
    apiFetch<{ ok: boolean }>('/health-data', {
      method: 'POST',
      body: JSON.stringify(cfg),
    }),

  triggerHealthDataSync: (opts?: { source?: HealthDataSyncSource }) =>
    apiFetch<{
      ok: boolean;
      schema: Record<string, string>;
      rowCount: number;
      syncActions: { field: string; status: string; detail?: string }[];
    }>('/health-data', { method: 'PUT', body: JSON.stringify(opts ?? {}) }),

  getHealthMetricsHistory: (days = 7) =>
    apiFetch<{
      history: { date: string; heartRate?: number; steps?: number; activeCalories?: number; distanceKm?: number }[];
      today:   { date: string; heartRate?: number; steps?: number; activeCalories?: number; distanceKm?: number } | null;
      days: number;
    }>(`/health-metrics?days=${days}`),

  getAiHealthCheck: () =>
    apiFetch<{
      heartRate: { value: number | null; status: 'healthy' | 'low' | 'high' | 'unknown'; message: string };
      steps: { value: number | null; goal: number; achieved: boolean; pct: number; message: string };
      activeCalories: { value: number | null; goal: number; achieved: boolean; message: string };
      distance: { value: number | null; avgKm7d: number | null; message: string };
      overallScore: number;
      summary: string;
      tips: string[];
    }>('/ai/health-check'),
};

export default api;
