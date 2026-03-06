'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

/** Meal Ideas debug log shape (matches API response). */
export interface MealIdeasDebugLog {
  userRequest: { selectedMealTypes: string[]; preferences: string; requestedAt: string };
  mealHistorySent: Record<string, string[]>;
  step1Prompt: string;
  step1Response: string;
  step2Prompt: string;
  step2Response: string;
  metadata: {
    model: string;
    step1Usage?: { prompt_tokens?: number; completion_tokens?: number };
    step2Usage?: { prompt_tokens?: number; completion_tokens?: number };
    step1LatencyMs: number;
    step2LatencyMs: number;
    timestamp: string;
  };
}

interface DebugLogsState {
  /** All Meal Ideas logs (newest first). Multiple requests are kept and grouped by day. */
  mealIdeasLogs: MealIdeasDebugLog[];
  /** Latest single log for backward compatibility (e.g. Food page panel). */
  mealIdeasLog: MealIdeasDebugLog | null;
  aiLoggerLog: unknown | null;
}

interface DebugLogsContextValue extends DebugLogsState {
  /** Append a new Meal Ideas log (e.g. after each "Get Suggestions" request). */
  addMealIdeasLog: (log: MealIdeasDebugLog) => void;
  setAiLoggerLog: (log: unknown | null) => void;
}

const DebugLogsContext = createContext<DebugLogsContextValue | null>(null);

const MAX_MEAL_IDEAS_LOGS = 100;

export function DebugLogsProvider({ children }: { children: ReactNode }) {
  const [mealIdeasLogs, setMealIdeasLogs] = useState<MealIdeasDebugLog[]>([]);
  const [aiLoggerLog, setAiLoggerLog] = useState<unknown | null>(null);

  const addMealIdeasLog = useCallback((log: MealIdeasDebugLog) => {
    setMealIdeasLogs((prev) => [log, ...prev].slice(0, MAX_MEAL_IDEAS_LOGS));
  }, []);

  const mealIdeasLog = mealIdeasLogs[0] ?? null;

  const value: DebugLogsContextValue = {
    mealIdeasLogs,
    mealIdeasLog,
    aiLoggerLog,
    addMealIdeasLog,
    setAiLoggerLog: useCallback((log) => setAiLoggerLog(log), []),
  };
  return (
    <DebugLogsContext.Provider value={value}>
      {children}
    </DebugLogsContext.Provider>
  );
}

export function useDebugLogs(): DebugLogsContextValue {
  const ctx = useContext(DebugLogsContext);
  if (!ctx) {
    return {
      mealIdeasLogs: [],
      mealIdeasLog: null,
      aiLoggerLog: null,
      addMealIdeasLog: () => {},
      setAiLoggerLog: () => {},
    };
  }
  return ctx;
}
