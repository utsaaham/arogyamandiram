'use client';

import { useState } from 'react';
import {
  X,
  Dumbbell,
  Loader2,
  Clock,
  Flame,
} from 'lucide-react';
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
}

export default function AIWorkoutPlanModal({ onClose }: AIWorkoutPlanModalProps) {
  const { user } = useUser();
  const hasApiKey = user?.hasOpenAiKey;

  const [focusArea, setFocusArea] = useState('');
  const [workoutDuration, setWorkoutDuration] = useState('30');
  const [workout, setWorkout] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        const data = res.data as { plan: WorkoutPlan };
        setWorkout(data.plan || null);
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/[0.06] bg-bg-surface p-6 shadow-2xl animate-slide-up sm:rounded-2xl">
        <div className="flex items-start justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-text-primary">
            <Dumbbell className="h-5 w-5 text-accent-rose" />
            AI Workout Plan
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-white/[0.06]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-sm text-text-muted">
          Tell us what type of workout you want, and we&apos;ll build a structured plan with sets, reps, and rest.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <select
            value={focusArea}
            onChange={(e) => setFocusArea(e.target.value)}
            className="glass-input rounded-xl px-3 py-2 text-xs"
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
            className="glass-input rounded-xl px-3 py-2 text-xs"
          >
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">60 minutes</option>
          </select>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !hasApiKey}
          className="glass-button-primary mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Dumbbell className="h-4 w-4" />}
          {workout ? 'New Plan' : 'Generate Plan'}
        </button>

        {!hasApiKey && (
          <p className="mt-2 text-xs text-accent-rose">
            Connect your OpenAI API key in Settings → API Keys to use AI Workout Plan.
          </p>
        )}

        {error && (
          <p className="mt-3 text-xs text-accent-rose">
            {error}
          </p>
        )}

        <div className="mt-5 space-y-3">
          {loading && !workout && (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="h-8 w-8 animate-spin text-accent-rose" />
              <p className="text-sm text-text-muted">Creating your workout plan...</p>
            </div>
          )}

          {!loading && !workout && !error && hasApiKey && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center text-xs text-text-muted">
              Choose a focus and duration, then tap Generate to see a full plan.
            </div>
          )}

          {workout && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                <p className="text-base font-semibold text-text-primary">{workout.name}</p>
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
                    <Dumbbell className="h-3.5 w-3.5 text-accent-rose" />
                    <span>{workout.exercises.length} exercises</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {workout.exercises.map((ex, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-rose/15 text-xs font-bold text-accent-rose">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">{ex.name}</p>
                      <p className="text-xs text-text-muted capitalize">{ex.category}</p>
                    </div>
                    <div className="text-right text-[11px] text-text-secondary">
                      <p className="font-semibold text-text-primary">
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
    </div>
  );
}

