'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import api from '@/lib/apiClient';
import { getToday } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export type OrchestratorTool =
  | 'water'
  | 'weight'
  | 'sleep'
  | 'food-ai-logger'
  | 'meal-ideas'
  | 'workout-ai-logger'
  | 'workout-plan'
  | 'custom-food';

export interface ParsedFoodItem {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface ParsedWorkoutItem {
  exercise: string;
  category: string;
  duration: number;
  caloriesBurned: number;
  sets?: number | null;
  reps?: number | null;
  weight?: number | null;
  notes?: string | null;
}

export interface MealSuggestion {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: string;
  ingredients: string[];
  isVegetarian: boolean;
}

export interface WorkoutPlan {
  name?: string;
  exercises?: Array<{
    exercise: string;
    sets: number;
    reps: number | string;
    restSeconds: number;
    category: string;
  }>;
}

export interface ToolResult {
  summary: string;
  logged?: { field: string; value: string };
  // Pending simple logs (confirmed client-side)
  pendingWater?: { amountMl: number };
  pendingWeight?: { weightKg: number };
  pendingSleep?: { durationHours: number; quality: number; bedtime: string; wakeTime: string };
  // Pending parsed logs
  foodItems?: ParsedFoodItem[];
  foodTotal?: Record<string, number>;
  workoutItems?: ParsedWorkoutItem[];
  mealSuggestions?: MealSuggestion[];
  workoutPlan?: WorkoutPlan;
  openCustomFood?: true;
}

export interface ConversationEntry {
  id: string;
  userText: string;
  /** Data URL of the photo the user attached, for rendering in the chat bubble */
  userImage?: string;
  status: 'pending' | 'success' | 'error' | 'awaiting-confirm' | 'cancelled';
  tool: OrchestratorTool | null;
  result: ToolResult | null;
  errorMessage?: string;
  timestamp: string;
}

// Maps tool names to their tracking page routes
const TOOL_ROUTE: Partial<Record<OrchestratorTool, string>> = {
  water: '/water',
  weight: '/weight',
  sleep: '/sleep',
  'food-ai-logger': '/food',
  'workout-ai-logger': '/workout',
};

interface OrchestratorSidebarContextValue {
  isOpen: boolean;
  sidebarWidth: number;
  setSidebarWidth: (w: number) => void;
  conversation: ConversationEntry[];
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  submitCommand: (text: string, imageBase64?: string, imageMimeType?: string) => Promise<void>;
  confirmSimpleEntry: (id: string) => Promise<string | undefined>;
  confirmFoodEntry: (id: string, mealType: string, time?: string) => Promise<string | undefined>;
  confirmWorkoutEntry: (id: string) => Promise<string | undefined>;
  cancelEntry: (id: string) => void;
}

// ─── Context ────────────────────────────────────────────────────────────────

const OrchestratorSidebarContext = createContext<OrchestratorSidebarContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────

export function OrchestratorSidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('orchestratorSidebarOpen') === 'true';
  });
  const [sidebarWidth, setSidebarWidth] = useState(464);
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const idCounterRef = useRef(0);

  const genId = () => {
    idCounterRef.current += 1;
    return `orch-${Date.now()}-${idCounterRef.current}`;
  };

  const openSidebar = useCallback(() => { setIsOpen(true); localStorage.setItem('orchestratorSidebarOpen', 'true'); }, []);
  const closeSidebar = useCallback(() => { setIsOpen(false); localStorage.setItem('orchestratorSidebarOpen', 'false'); }, []);
  const toggleSidebar = useCallback(() => setIsOpen((v) => { const next = !v; localStorage.setItem('orchestratorSidebarOpen', String(next)); return next; }), []);

  const updateEntry = useCallback(
    (id: string, patch: Partial<ConversationEntry>) => {
      setConversation((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
      );
    },
    []
  );

  const submitCommand = useCallback(
    async (text: string, imageBase64?: string, imageMimeType?: string) => {
      const id = genId();
      const entry: ConversationEntry = {
        id,
        userText: text,
        userImage: imageBase64
          ? `data:${imageMimeType ?? 'image/jpeg'};base64,${imageBase64}`
          : undefined,
        status: 'pending',
        tool: null,
        result: null,
        timestamp: new Date().toISOString(),
      };
      setConversation((prev) => [...prev, entry]);

      try {
        const res = await api.callOrchestrator(text, imageBase64, imageMimeType);
        if (!res.success || !res.data) {
          updateEntry(id, {
            status: 'error',
            errorMessage: (res as { error?: string }).error || 'Orchestrator failed',
          });
          return;
        }

        const { tool, result } = res.data as unknown as {
          tool: OrchestratorTool;
          result: ToolResult;
        };

        // Tools that need confirmation before logging
        const needsConfirm =
          tool === 'water' ||
          tool === 'weight' ||
          tool === 'sleep' ||
          tool === 'food-ai-logger' ||
          tool === 'workout-ai-logger';

        updateEntry(id, {
          tool,
          result,
          status: needsConfirm ? 'awaiting-confirm' : 'success',
        });

        if (!needsConfirm) {
          window.dispatchEvent(new Event('orchestrator:log-updated'));
        }
      } catch (err) {
        updateEntry(id, {
          status: 'error',
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
    [updateEntry]
  );

  const confirmSimpleEntry = useCallback(
    async (id: string): Promise<string | undefined> => {
      const entry = conversation.find((e) => e.id === id);
      if (!entry?.result) return undefined;

      const today = getToday();
      try {
        const { pendingWater, pendingWeight, pendingSleep } = entry.result;
        if (pendingWater) {
          await api.addWater(today, pendingWater.amountMl);
        } else if (pendingWeight) {
          await api.logWeight(today, pendingWeight.weightKg);
        } else if (pendingSleep) {
          await api.logSleep(today, {
            bedtime: pendingSleep.bedtime,
            wakeTime: pendingSleep.wakeTime,
            duration: pendingSleep.durationHours,
            quality: pendingSleep.quality,
          });
        }
        updateEntry(id, { status: 'success' });
        window.dispatchEvent(new Event('orchestrator:log-updated'));
        return entry.tool ? TOOL_ROUTE[entry.tool] : undefined;
      } catch (err) {
        updateEntry(id, {
          status: 'error',
          errorMessage: err instanceof Error ? err.message : 'Failed to log',
        });
        return undefined;
      }
    },
    [conversation, updateEntry]
  );

  const confirmFoodEntry = useCallback(
    async (id: string, mealType: string, time?: string): Promise<string | undefined> => {
      const entry = conversation.find((e) => e.id === id);
      if (!entry?.result?.foodItems) return undefined;

      const today = getToday();
      try {
        for (const item of entry.result.foodItems) {
          await api.addMeal(today, { ...item, mealType, ...(time ? { time } : {}) });
        }
        const itemCount = entry.result.foodItems.length;
        updateEntry(id, {
          status: 'success',
          result: {
            ...entry.result,
            summary: itemCount === 1
              ? 'Added 1 food item. You can view it in Food below the search bar.'
              : `Added ${itemCount} food items. You can view them in Food below the search bar.`,
          },
        });
        window.dispatchEvent(new Event('orchestrator:log-updated'));
        return TOOL_ROUTE['food-ai-logger'];
      } catch (err) {
        updateEntry(id, {
          status: 'error',
          errorMessage: err instanceof Error ? err.message : 'Failed to log food',
        });
        return undefined;
      }
    },
    [conversation, updateEntry]
  );

  const confirmWorkoutEntry = useCallback(
    async (id: string): Promise<string | undefined> => {
      const entry = conversation.find((e) => e.id === id);
      if (!entry?.result?.workoutItems) return undefined;

      const today = getToday();
      try {
        for (const workout of entry.result.workoutItems) {
          await api.addWorkout(today, workout as unknown as Record<string, unknown>);
        }
        updateEntry(id, { status: 'success' });
        window.dispatchEvent(new Event('orchestrator:log-updated'));
        return TOOL_ROUTE['workout-ai-logger'];
      } catch (err) {
        updateEntry(id, {
          status: 'error',
          errorMessage: err instanceof Error ? err.message : 'Failed to log workout',
        });
        return undefined;
      }
    },
    [conversation, updateEntry]
  );

  const cancelEntry = useCallback(
    (id: string) => updateEntry(id, { status: 'cancelled' }),
    [updateEntry]
  );

  return (
    <OrchestratorSidebarContext.Provider
      value={{
        isOpen,
        sidebarWidth,
        setSidebarWidth,
        conversation,
        openSidebar,
        closeSidebar,
        toggleSidebar,
        submitCommand,
        confirmSimpleEntry,
        confirmFoodEntry,
        confirmWorkoutEntry,
        cancelEntry,
      }}
    >
      {children}
    </OrchestratorSidebarContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useOrchestratorSidebar(): OrchestratorSidebarContextValue {
  const ctx = useContext(OrchestratorSidebarContext);
  if (!ctx) throw new Error('useOrchestratorSidebar must be used within OrchestratorSidebarProvider');
  return ctx;
}
