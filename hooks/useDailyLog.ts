'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/apiClient';
import { getToday } from '@/lib/utils';

interface MealEntry {
  _id?: string;
  foodId?: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  quantity: number;
  unit: string;
  mealType: string;
  time: string;
  isCustom: boolean;
}

interface WorkoutEntry {
  _id?: string;
  exercise: string;
  category: string;
  duration: number;
  caloriesBurned: number;
  sets?: number;
  reps?: number;
  weight?: number;
  notes?: string;
}

interface SleepEntry {
  _id?: string;
  bedtime: string;
  wakeTime: string;
  duration: number;
  quality: number;
  notes?: string;
}

export interface DailyLogData {
  _id: string;
  date: string;
  weight?: number;
  waterIntake: number;
  meals: MealEntry[];
  workouts: WorkoutEntry[];
  sleep?: SleepEntry;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  caloriesBurned: number;
  notes?: string;
}

export function useDailyLog(date?: string) {
  const [log, setLog] = useState<DailyLogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetDate = date || getToday();

  const fetchLog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDailyLog(targetDate);
      if (res.success && res.data) {
        setLog(res.data as DailyLogData);
      } else {
        setError(res.error || 'Failed to fetch daily log');
      }
    } catch {
      setError('Failed to fetch daily log');
    } finally {
      setLoading(false);
    }
  }, [targetDate]);

  useEffect(() => {
    fetchLog();
  }, [fetchLog]);

  // If the page stays open across midnight, automatically refresh the log
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    const timer = window.setTimeout(() => {
      fetchLog();
    }, msUntilMidnight + 500); // small buffer after midnight

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchLog]);

  return { log, loading, error, refetch: fetchLog };
}
