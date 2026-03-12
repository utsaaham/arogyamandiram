'use client';

import { useEffect, useState } from 'react';
import {
  X,
  Loader2,
  Clock,
  Flame,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import api from '@/lib/apiClient';
import { useUser } from '@/hooks/useUser';

interface WorkoutPlan {
  name: string;
  description: string;
  exercises: {
    name: string;
    sets: number;
    reps: string;
    restSeconds: number;
    category: string;
  }[];
  estimatedCalories: number;
  durationMinutes: number;
}

interface AIWorkoutPlanModalProps {
  onClose: () => void;
  onDebugLog?: (log: unknown) => void;
}

export default function AIWorkoutPlanModal({ onClose, onDebugLog }: AIWorkoutPlanModalProps) {
  const { user } = useUser();
  const hasApiKey = user?.hasOpenAiKey;

  const [mounted, setMounted] = useState(false);
  const [focusArea, setFocusArea] = useState('');
  const [workoutDuration, setWorkoutDuration] = useState('30');
  const [workout, setWorkout] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mounted]);

  const handleGenerate = async () => {
    if (!hasApiKey || loading) return;
    setLoading(true);
    setError(null);
    try {
      const context: Record<string, string> = {};
      if (focusArea) context.focusArea = focusArea;
      if (workoutDuration) context.duration = workoutDuration;
      const res = await api.getWorkoutPlan(context);
      if (res.success && res.data) {
        const data = res.data as { plan?: unknown; debugLog?: unknown };
        setWorkout(data.plan && typeof data.plan === 'object' ? (data.plan as WorkoutPlan) : null);
        if (data.debugLog != null && onDebugLog) {
          onDebugLog(data.debugLog);
        }
      } else {
        const rawError = res.error || 'Failed to fetch workout plan';
        const normalized = rawError.toLowerCase();
        if (normalized.includes('openai api key required')) {
          setError('Connect your OpenAI API key in Settings → API Keys to generate workout plans.');
        } else if (normalized.includes('invalid') && normalized.includes('api key')) {
          setError('Your OpenAI API key looks invalid or expired. Update it in Settings → API Keys.');
        } else if (
          normalized.includes('unsupported state') ||
          normalized.includes('unable to authenticate') ||
          normalized.includes('unauthorized')
        ) {
          setError('OpenAI could not authenticate your key. Double-check the key in Settings → API Keys.');
        } else {
          setError(rawError);
        }
      }
    } catch {
      setError('Failed to fetch workout plan');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative z-10 mx-4 flex w-full max-w-lg flex-col overflow-x-visible overflow-y-hidden rounded-3xl border border-neutral-800 bg-workout-bg px-5 pb-5 shadow-lg animate-slide-up sm:rounded-2xl"
        style={{
          maxHeight:
            'min(70dvh, calc(100dvh - max(env(safe-area-inset-top), 12px) - max(env(safe-area-inset-bottom), 16px) - 32px))',
        }}
      >
        <div className="sticky top-0 z-10 -mx-5 mb-2 flex items-center justify-between bg-workout-bg px-5 py-2">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-[#a3a3a3]">
            AI Workout Plan
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-white/[0.06]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="flex-1 space-y-4 overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <p className="text-sm text-text-muted">
            Tell us what type of workout you want, and we&apos;ll build a structured plan with sets, reps, and rest.
          </p>

          <div className="flex flex-wrap gap-3">
            <select
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value)}
              className="rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-2 pr-9 text-xs text-[#a3a3a3] input-no-focus-ring"
            >
              <option value="">Any focus</option>
              <option value="upper body">Upper Body</option>
              <option value="lower body">Lower Body</option>
              <option value="full body">Full Body</option>
              <option value="core">Core</option>
              <option value="cardio">Cardio</option>
              <option value="flexibility">Flexibility</option>
            </select>
            <select
              value={workoutDuration}
              onChange={(e) => setWorkoutDuration(e.target.value)}
              className="rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-2 pr-9 text-xs text-[#a3a3a3] input-no-focus-ring"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
            </select>
          </div>

          {!hasApiKey && (
            <p className="text-xs text-accent-rose">
              Connect your OpenAI API key in Settings → API Keys to use AI Workout Plan.
            </p>
          )}

          {error && (
            <p className="text-xs text-accent-rose">
              {error}
            </p>
          )}

          <div className="space-y-3">
            {loading && !workout && (
              <div className="flex flex-col items-center gap-3 py-10">
                <Loader2 className="h-8 w-8 animate-spin text-accent-rose" />
                <p className="text-sm text-text-muted">Creating your workout plan...</p>
              </div>
            )}

            {!loading && !workout && !error && hasApiKey && (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 px-4 py-6 text-center text-xs text-text-muted">
                Choose a focus and duration, then tap Generate to see a full plan.
              </div>
            )}

            {workout && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4">
                  <p className="text-base font-semibold text-[#a3a3a3]">{workout.name}</p>
                  <p className="mt-1 text-xs text-text-secondary">{workout.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-text-secondary">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-accent-rose" />
                      <span>{workout.durationMinutes} min</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Flame className="h-3.5 w-3.5 text-accent-rose" />
                      <span>~{workout.estimatedCalories} kcal</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>{workout.exercises.length} exercises</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {workout.exercises.map((ex, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-rose/15 text-xs font-bold text-accent-rose">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#a3a3a3]">{ex.name}</p>
                        <p className="text-xs text-text-muted capitalize">{ex.category}</p>
                      </div>
                      <div className="text-right text-[11px] text-text-secondary">
                        <p className="font-semibold text-[#a3a3a3]">
                          {ex.sets} × {ex.reps}
                        </p>
                        <p className="mt-0.5 text-[10px] text-text-muted">{ex.restSeconds}s rest</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 z-10 -mx-6 mt-4 bg-gradient-to-t from-workout-bg via-workout-bg/90 to-transparent px-6 pt-3">
          <button
            onClick={handleGenerate}
            disabled={loading || !hasApiKey}
            className="glass-button mb-1 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-rose px-4 py-3 text-sm font-semibold text-white shadow-glow transition-colors duration-200 hover:bg-accent-rose/90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {workout ? 'New Plan' : 'Generate Plan'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

