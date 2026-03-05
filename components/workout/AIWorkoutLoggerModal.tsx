'use client';

import { useState } from 'react';
import { X, Sparkles, Dumbbell, Flame, Clock } from 'lucide-react';
import api from '@/lib/apiClient';

interface WorkoutEntry {
  exercise: string;
  category: string;
  duration: number;
  caloriesBurned: number;
  sets?: number;
  reps?: number;
  weight?: number;
  notes?: string;
}

interface AIWorkoutLoggerModalProps {
  onClose: () => void;
  onAdd: (workouts: WorkoutEntry[]) => void;
  loading?: boolean;
}

const categoryLabels: Record<string, string> = {
  cardio: 'Cardio',
  strength: 'Strength',
  flexibility: 'Flexibility',
  sports: 'Sports',
  other: 'Other',
};

export default function AIWorkoutLoggerModal({ onClose, onAdd, loading }: AIWorkoutLoggerModalProps) {
  const [text, setText] = useState('');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [workouts, setWorkouts] = useState<WorkoutEntry[] | null>(null);

  const handleLookup = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setError('');
    setFetching(true);
    try {
      const res = await api.aiWorkoutLogger(trimmed);
      if (res.success && res.data?.workouts && Array.isArray(res.data.workouts)) {
        const parsed = (res.data.workouts as unknown[]).map((w) => {
          const obj = (w || {}) as Record<string, unknown>;
          return {
            exercise: typeof obj.exercise === 'string' && obj.exercise.trim()
              ? obj.exercise.trim()
              : 'Workout',
            category: typeof obj.category === 'string' && obj.category.trim()
              ? obj.category.trim()
              : 'other',
            duration: Number(obj.duration) || 0,
            caloriesBurned: Number(obj.caloriesBurned) || 0,
            sets: obj.sets != null ? Number(obj.sets) || undefined : undefined,
            reps: obj.reps != null ? Number(obj.reps) || undefined : undefined,
            weight: obj.weight != null ? Number(obj.weight) || undefined : undefined,
            notes: typeof obj.notes === 'string' ? obj.notes : undefined,
          } as WorkoutEntry;
        }).filter((w) => w && Number.isFinite(w.caloriesBurned));

        if (!parsed.length) {
          setError('Could not understand this workout. Try adding a bit more detail.');
          setWorkouts(null);
          return;
        }

        setWorkouts(parsed);
      } else {
        const rawError = res.error || 'Could not get workout from AI. Try again.';
        const normalized = rawError.toLowerCase();

        if (normalized.includes('openai api key required')) {
          setError('Connect your OpenAI API key in Settings → API Keys to use AI Workout Logger.');
        } else if (normalized.includes('invalid') && normalized.includes('api key')) {
          setError('Your OpenAI API key looks invalid or expired. Update it in Settings → API Keys.');
        } else if (
          normalized.includes('unsupported state') ||
          normalized.includes('unable to authenticate') ||
          normalized.includes('unauthorized')
        ) {
          setError('OpenAI could not authenticate your key. Double-check it in Settings → API Keys.');
        } else {
          setError(rawError);
        }
      }
    } catch {
      setError('Something went wrong while talking to AI. Try again in a moment.');
    } finally {
      setFetching(false);
    }
  };

  const handleAdd = () => {
    if (!workouts || !workouts.length) return;
    onAdd(workouts);
  };

  const handleBack = () => {
    setWorkouts(null);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-white/[0.06] bg-bg-surface p-6 shadow-2xl animate-slide-up">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent-violet" />
            AI Workout Logger
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-white/[0.06]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!workouts ? (
          <>
            <p className="mt-4 text-sm text-text-muted">
              Describe what you already did today and we&apos;ll turn it into logged workouts.
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder='e.g., 20 min brisk walking and 3 sets of 12 push-ups with 10kg'
              className="glass-input mt-2 min-h-[100px] w-full rounded-xl px-3 py-2.5 text-sm resize-y"
              disabled={fetching}
              rows={3}
            />
            {error && <p className="mt-2 text-xs text-accent-rose">{error}</p>}
            <button
              onClick={handleLookup}
              disabled={fetching || !text.trim()}
              className="glass-button-primary mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
            >
              {fetching ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Look up workout
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleBack}
              className="mt-2 text-xs text-accent-violet hover:underline"
            >
              ← Change description
            </button>
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-text-primary">Parsed workouts</p>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {workouts.map((w, idx) => {
                  const category = w.category?.toLowerCase() || 'other';
                  const label = categoryLabels[category] || 'Other';
                  return (
                    <div
                      key={`${w.exercise}-${idx}`}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text-primary truncate">
                            {w.exercise}
                          </p>
                          <p className="text-[11px] text-text-muted capitalize">{label}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-right">
                          <div className="flex items-center gap-1 text-xs text-text-secondary">
                            <Clock className="h-3 w-3 text-text-muted" />
                            <span>{Math.round(w.duration)} min</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-text-secondary">
                            <Flame className="h-3 w-3 text-accent-rose" />
                            <span>{Math.round(w.caloriesBurned)} kcal</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-text-secondary">
                        {w.sets && w.reps && (
                          <span>
                            {w.sets}×{w.reps}
                            {w.weight ? ` @ ${w.weight}kg` : ''}
                          </span>
                        )}
                        {!w.sets && w.reps && <span>{w.reps} reps</span>}
                        {w.notes && (
                          <span className="truncate max-w-full opacity-80">“{w.notes}”</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {error && <p className="mt-2 text-xs text-accent-rose">{error}</p>}
            <button
              onClick={handleAdd}
              disabled={loading || !workouts.length}
              className="glass-button-primary mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Dumbbell className="h-4 w-4" />
                  Add {workouts.length === 1 ? 'workout' : `${workouts.length} workouts`} to log
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

