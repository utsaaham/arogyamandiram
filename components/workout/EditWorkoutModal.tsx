'use client';

import { useState, useEffect } from 'react';
import { X, Save, Flame, Timer, Heart, Dumbbell, Waves, Footprints, Bike } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WorkoutEntryForEdit {
  id: string;
  exercise: string;
  category: string;
  duration: number;
  caloriesBurned: number;
  sets?: number;
  reps?: number;
  weight?: number;
  notes?: string;
}

interface EditWorkoutModalProps {
  workout: WorkoutEntryForEdit;
  onClose: () => void;
  onSave: (updated: Omit<WorkoutEntryForEdit, 'id'>) => void;
  loading?: boolean;
}

const workoutCategories = [
  { key: 'cardio', label: 'Cardio', icon: Heart },
  { key: 'strength', label: 'Strength', icon: Dumbbell },
  { key: 'flexibility', label: 'Flexibility', icon: Waves },
  { key: 'sports', label: 'Sports', icon: Footprints },
  { key: 'other', label: 'Other', icon: Bike },
];

export default function EditWorkoutModal({ workout, onClose, onSave, loading }: EditWorkoutModalProps) {
  const [exercise, setExercise] = useState(workout.exercise);
  const [category, setCategory] = useState(workout.category || 'other');
  const [duration, setDuration] = useState(String(workout.duration ?? 0));
  const [caloriesBurned, setCaloriesBurned] = useState(String(workout.caloriesBurned ?? 0));
  const [sets, setSets] = useState(workout.sets != null ? String(workout.sets) : '');
  const [reps, setReps] = useState(workout.reps != null ? String(workout.reps) : '');
  const [weightUsed, setWeightUsed] = useState(workout.weight != null ? String(workout.weight) : '');
  const [notes, setNotes] = useState(workout.notes ?? '');

  useEffect(() => {
    setExercise(workout.exercise);
    setCategory(workout.category || 'other');
    setDuration(String(workout.duration ?? 0));
    setCaloriesBurned(String(workout.caloriesBurned ?? 0));
    setSets(workout.sets != null ? String(workout.sets) : '');
    setReps(workout.reps != null ? String(workout.reps) : '');
    setWeightUsed(workout.weight != null ? String(workout.weight) : '');
    setNotes(workout.notes ?? '');
  }, [workout]);

  const handleSave = () => {
    const exerciseName = exercise.trim();
    if (!exerciseName) return;
    const dur = parseInt(duration, 10) || 0;
    const repsNum = parseInt(reps, 10);
    if (dur <= 0 && (!repsNum || repsNum <= 0)) return;

    onSave({
      exercise: exerciseName,
      category: category === 'recent' ? 'other' : category,
      duration: dur,
      caloriesBurned: Math.max(0, parseInt(caloriesBurned, 10) || 0),
      ...(sets.trim() && { sets: Math.max(0, parseInt(sets, 10) || 0) }),
      ...(reps.trim() && { reps: Math.max(0, parseInt(reps, 10) || 0) }),
      ...(weightUsed.trim() && { weight: Math.max(0, parseFloat(weightUsed) || 0) }),
      ...(notes.trim() && { notes: notes.trim() }),
    });
  };

  const canSave =
    exercise.trim() &&
    ((parseInt(duration, 10) || 0) > 0 || (parseInt(reps, 10) || 0) > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-white/[0.06] bg-bg-surface p-6 shadow-2xl animate-slide-up">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-text-primary">Edit Workout</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-white/[0.06]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <div>
            <label className="text-xs font-medium text-text-muted">Exercise</label>
            <input
              type="text"
              value={exercise}
              onChange={(e) => setExercise(e.target.value)}
              className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
              placeholder="e.g. Running, Push-ups"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-muted">Category</label>
            <div className="mt-2 flex gap-2 overflow-x-auto hide-scrollbar">
              {workoutCategories.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategory(cat.key)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all',
                    category === cat.key
                      ? 'bg-accent-rose/15 text-accent-rose ring-1 ring-accent-rose/30'
                      : 'bg-white/[0.04] text-text-muted hover:bg-white/[0.06]'
                  )}
                >
                  <cat.icon className="h-3.5 w-3.5" />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-muted">Duration (min)</label>
              <div className="mt-1 flex items-center gap-1">
                <Timer className="h-3.5 w-3.5 text-text-muted" />
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="glass-input w-full rounded-xl px-3 py-2 text-sm"
                  min={0}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted">Calories Burned</label>
              <div className="mt-1 flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-accent-rose" />
                <input
                  type="number"
                  value={caloriesBurned}
                  onChange={(e) => setCaloriesBurned(e.target.value)}
                  className="glass-input w-full rounded-xl px-3 py-2 text-sm"
                  min={0}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-text-muted">Sets</label>
              <input
                type="number"
                value={sets}
                onChange={(e) => setSets(e.target.value)}
                className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
                min={0}
                placeholder="—"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted">Reps</label>
              <input
                type="number"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
                min={0}
                placeholder="—"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted">Weight (kg)</label>
              <input
                type="number"
                value={weightUsed}
                onChange={(e) => setWeightUsed(e.target.value)}
                className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
                min={0}
                step={0.5}
                placeholder="—"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-muted">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="glass-input mt-1 w-full resize-none rounded-xl px-3 py-2 text-sm"
              rows={2}
              placeholder="How did it feel?"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="glass-button-secondary flex-1 rounded-xl px-4 py-3 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !canSave}
            className="glass-button-primary flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
