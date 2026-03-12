'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Flame,
  Heart,
  Dumbbell,
  Footprints,
  Bike,
  Waves,
  Timer,
  Clock,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import api from '@/lib/apiClient';

interface AddWorkoutModalProps {
  onClose: () => void;
  onAdd: (workout: {
    exercise: string;
    category: string;
    duration: number;
    caloriesBurned: number;
    sets?: number;
    reps?: number;
    weight?: number;
    notes?: string;
  }) => void;
  loading?: boolean;
}

const workoutCategories = [
  { key: 'recent', label: 'Recent', icon: Clock },
  { key: 'cardio', label: 'Cardio', icon: Heart },
  { key: 'strength', label: 'Strength', icon: Dumbbell },
  { key: 'flexibility', label: 'Flexibility', icon: Waves },
  { key: 'sports', label: 'Sports', icon: Footprints },
  { key: 'other', label: 'Other', icon: Bike },
];

// Rep-based: measured by number of reps only (no duration)
const REP_BASED_EXERCISES = new Set([
  'Push-ups',
  'Flat Bench Sit-ups',
  'Decline Bench Sit-ups',
  'Standing Cross Crunch',
  'Standing Toe Touch',
  'Pogo Jumps',
  'High Knees',
  'Dumbbell Side Bends',
  'Lateral Raise',
  'Dumbbell Biceps Curl with Rotation',
]);

const presetExercises: Record<string, { name: string; calPerMin?: number; calPerRep?: number }[]> = {
  cardio: [
    { name: 'Running', calPerMin: 10 },
    { name: 'Brisk Walking', calPerMin: 5 },
    { name: 'Cycling', calPerMin: 8 },
    { name: 'Swimming', calPerMin: 9 },
    { name: 'Pogo Jumps', calPerRep: 0.24 }, // light jumping in place, ~2 s/rep
    { name: 'High Knees', calPerRep: 0.28 }, // running in place, knees up, ~1.5–2 s/rep
    { name: 'Jump Rope', calPerMin: 12 },
    { name: 'HIIT', calPerMin: 13 },
    { name: 'Stair Climbing', calPerMin: 8 },
    { name: 'Elliptical', calPerMin: 7 },
    { name: 'Dancing', calPerMin: 6 },
    { name: 'Rowing', calPerMin: 8 },
  ],
  strength: [
    { name: 'Push-ups', calPerRep: 0.4 },
    { name: 'Flat Bench Sit-ups', calPerRep: 0.35 },
    { name: 'Decline Bench Sit-ups', calPerRep: 0.4 },
    { name: 'Standing Cross Crunch', calPerRep: 0.15 }, // dynamic core, ~2 s/rep
    { name: 'Dumbbell Side Bends', calPerRep: 0.12 }, // oblique bends with weight, ~2 s/rep
    { name: 'Lateral Raise', calPerRep: 0.1 }, // shoulder isolation, ~2 s/rep
    { name: 'Dumbbell Biceps Curl with Rotation', calPerRep: 0.12 }, // curl + supination, ~2 s/rep
    { name: 'Weight Training', calPerMin: 6 },
    { name: 'Pull-ups', calPerMin: 8 },
    { name: 'Squats', calPerMin: 7 },
    { name: 'Deadlifts', calPerMin: 7 },
    { name: 'Bench Press', calPerMin: 6 },
    { name: 'Overhead Press', calPerMin: 5 },
    { name: 'Lunges', calPerMin: 6 },
    { name: 'Planks', calPerMin: 4 },
    { name: 'Kettlebell Swings', calPerMin: 10 },
  ],
  flexibility: [
    { name: 'Yoga', calPerMin: 4 },
    { name: 'Stretching', calPerMin: 3 },
    { name: 'Pilates', calPerMin: 5 },
    { name: 'Standing Toe Touch', calPerRep: 0.12 }, // MET 3.0, ~2 s/rep → ~7–8 kcal per 60 reps at 68 kg
    { name: 'Foam Rolling', calPerMin: 2 },
    { name: 'Tai Chi', calPerMin: 3 },
  ],
  sports: [
    { name: 'Cricket', calPerMin: 5 },
    { name: 'Badminton', calPerMin: 7 },
    { name: 'Tennis', calPerMin: 8 },
    { name: 'Football', calPerMin: 9 },
    { name: 'Basketball', calPerMin: 9 },
    { name: 'Table Tennis', calPerMin: 4 },
    { name: 'Kabaddi', calPerMin: 10 },
  ],
  other: [
    { name: 'Hiking', calPerMin: 6 },
    { name: 'Gardening', calPerMin: 4 },
    { name: 'House Cleaning', calPerMin: 3 },
    { name: 'Martial Arts', calPerMin: 10 },
  ],
};

const exerciseThumbnails: Record<string, string> = {
  Running: '🏃‍♂️',
  'Brisk Walking': '🚶‍♀️',
  Cycling: '🚴‍♂️',
  Swimming: '🏊‍♂️',
  'Jump Rope': '🪢',
  HIIT: '⚡️',
  'Stair Climbing': '🪜',
  Elliptical: '🏃',
  Dancing: '💃',
  Rowing: '🚣‍♂️',
  'Weight Training': '🏋️‍♂️',
  'Pull-ups': '🤸‍♂️',
  Squats: '🏋️',
  Deadlifts: '🏋️‍♀️',
  'Bench Press': '🛋️',
  'Overhead Press': '💪',
  Lunges: '🦵',
  Planks: '📏',
  'Kettlebell Swings': '🏋️‍♂️',
  Yoga: '🧘‍♀️',
  Stretching: '🤸‍♀️',
  Pilates: '🧘',
  'Foam Rolling': '🧽',
  'Tai Chi': '🌬️',
  Cricket: '🏏',
  Badminton: '🏸',
  Tennis: '🎾',
  Football: '⚽️',
  Basketball: '🏀',
  'Table Tennis': '🏓',
  Kabaddi: '🤼‍♂️',
  Hiking: '🥾',
  Gardening: '🪴',
  'House Cleaning': '🧹',
  'Martial Arts': '🥋',
};

export default function AddWorkoutModal({ onClose, onAdd, loading }: AddWorkoutModalProps) {
  const [mounted, setMounted] = useState(false);
  const [category, setCategory] = useState('cardio');
  const [exercise, setExercise] = useState('');
  const [customExercise, setCustomExercise] = useState('');
  const [duration, setDuration] = useState('30');
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weightUsed, setWeightUsed] = useState('');
  const [notes, setNotes] = useState('');

  const [recentExercises, setRecentExercises] = useState<{ name: string; count: number; lastDate: string }[]>([]);

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

  useEffect(() => {
    let cancelled = false;
    api.getWorkoutExercises(180).then((res) => {
      if (!res.success || !res.data || cancelled) return;
      const data = res.data as { exercises?: { name: string; count: number; lastDate: string }[] };
      setRecentExercises(data.exercises || []);
    }).catch(() => {
      // ignore
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const presets = presetExercises[category] || [];
  const selectedPreset = presets.find((p) => p.name === exercise);
  const isRepBased = selectedPreset && REP_BASED_EXERCISES.has(selectedPreset.name);

  // Auto-calculate calories: rep-based uses calPerRep * reps, else calPerMin * duration
  const estimatedCal = selectedPreset
    ? isRepBased
      ? Math.round((selectedPreset.calPerRep ?? 0) * (parseInt(reps) || 0))
      : Math.round((selectedPreset.calPerMin ?? 0) * (parseInt(duration) || 0))
    : parseInt(caloriesBurned) || 0;

  const handleExerciseSelect = (name: string) => {
    setExercise(name);
    setCustomExercise('');
    const preset = presets.find((p) => p.name === name);
    if (preset) {
      if (REP_BASED_EXERCISES.has(name) && preset.calPerRep) {
        setCaloriesBurned(Math.round(preset.calPerRep * (parseInt(reps) || 0)).toString());
      } else if (preset.calPerMin) {
        setCaloriesBurned(Math.round(preset.calPerMin * (parseInt(duration) || 30)).toString());
      }
    }
  };

  const handleSuggestionSelect = (name: string) => {
    // If this is a known preset, switch to its category automatically
    let targetCategory: string | null = null;
    for (const [catKey, list] of Object.entries(presetExercises)) {
      if (list.some((p) => p.name === name)) {
        targetCategory = catKey;
        break;
      }
    }

    if (targetCategory) {
      setCategory(targetCategory);
      setExercise(name);
      setCustomExercise('');
    } else {
      setCustomExercise(name);
      setExercise('');
    }
  };

  const handleDurationChange = (val: string) => {
    setDuration(val);
    if (selectedPreset && selectedPreset.calPerMin) {
      setCaloriesBurned(Math.round(selectedPreset.calPerMin * (parseInt(val) || 0)).toString());
    }
  };

  const handleRepsChange = (val: string) => {
    setReps(val);
    if (selectedPreset && selectedPreset.calPerRep) {
      setCaloriesBurned(Math.round(selectedPreset.calPerRep * (parseInt(val) || 0)).toString());
    }
  };

  const handleSubmit = () => {
    const exerciseName = customExercise || exercise;
    if (!exerciseName) return;
    const sendCategory = category === 'recent' ? 'other' : category;

    const totalReps = parseInt(reps) || 0;
    if (isRepBased) {
      onAdd({
        exercise: exerciseName,
        category: sendCategory,
        duration: 0,
        caloriesBurned: parseInt(caloriesBurned) || estimatedCal,
        reps: totalReps,
        ...(notes && { notes }),
      });
      return;
    }

    onAdd({
      exercise: exerciseName,
      category: sendCategory,
      duration: parseInt(duration) || 0,
      caloriesBurned: parseInt(caloriesBurned) || estimatedCal,
      ...(sets && { sets: parseInt(sets) }),
      ...(reps && { reps: parseInt(reps) }),
      ...(weightUsed && { weight: parseFloat(weightUsed) }),
      ...(notes && { notes }),
    });
  };

  const isStrength = category === 'strength';
  const canSubmit = (exercise || customExercise) && (isRepBased ? (parseInt(reps) || 0) > 0 : duration);

  const currentExerciseName = customExercise || exercise;

  const allPresetNames = Object.values(presetExercises)
    .flat()
    .map((p) => p.name);

  const historyNames = recentExercises.map((e) => e.name);

  const suggestionPool = Array.from(new Set([...allPresetNames, ...historyNames]));

  const query = currentExerciseName.trim().toLowerCase();
  // Only show suggestion pills when user has typed; Recent tab has its own list, other tabs stay minimal until search.
  const suggestions =
    query.length > 0
      ? suggestionPool
          .filter((name) => name.toLowerCase().includes(query) && name !== currentExerciseName)
          .slice(0, 6)
      : [];

  const categoryMeta = workoutCategories.find((c) => c.key === category);
  const exerciseEmoji =
    (currentExerciseName && exerciseThumbnails[currentExerciseName]) ||
    (category === 'cardio'
      ? '🏃‍♂️'
      : category === 'strength'
        ? '🏋️‍♂️'
        : category === 'flexibility'
          ? '🧘‍♀️'
          : category === 'sports'
            ? '🏅'
            : '💪');

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
          <h3 className="text-lg font-semibold text-text-primary">Add Workout</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-white/[0.06]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="flex-1 space-y-5 overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Category */}
          <div>
            <label className="text-xs font-medium text-text-muted">Category</label>
            <div className="mt-2 flex gap-2 overflow-x-auto hide-scrollbar">
              {workoutCategories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => {
                    setCategory(cat.key);
                    setExercise('');
                    setCustomExercise('');
                  }}
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

          {/* Exercise: Recent list (when Recent tab) or preset grid (Cardio/Strength/etc.) + search */}
          <div>
            <label className="text-xs font-medium text-text-muted">Exercise</label>
            {category === 'recent' ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {recentExercises.length === 0 ? (
                  <p className="text-xs text-text-muted">
                    No recent exercises yet. Log a workout from any category to see them here.
                  </p>
                ) : (
                  recentExercises.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => handleSuggestionSelect(item.name)}
                      className={cn(
                        'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                        exercise === item.name || customExercise === item.name
                          ? 'bg-accent-rose/15 text-accent-rose ring-1 ring-accent-rose/30'
                          : 'bg-white/[0.04] text-text-muted hover:bg-white/[0.08]'
                      )}
                    >
                      {item.name}
                      {item.count > 1 && <span className="ml-1 opacity-70">({item.count}×)</span>}
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => handleExerciseSelect(p.name)}
                    className={cn(
                      'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                      exercise === p.name
                        ? 'bg-accent-rose/15 text-accent-rose ring-1 ring-accent-rose/30'
                        : 'bg-white/[0.04] text-text-muted hover:bg-white/[0.08]'
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
            <input
              type="text"
              value={customExercise}
              onChange={(e) => {
                setCustomExercise(e.target.value);
                setExercise('');
              }}
              placeholder="Start typing to search or add your own..."
              className="glass-input mt-2 w-full rounded-xl px-3 py-2 text-sm"
            />
            {suggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {suggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleSuggestionSelect(name)}
                    className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-text-muted hover:bg-white/[0.08]"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Exercise preview */}
          {currentExerciseName && (
            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-2xl">
                <span aria-hidden="true">{exerciseEmoji}</span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#a3a3a3]">{currentExerciseName}</p>
                {categoryMeta && <p className="text-[11px] text-[#a3a3a3]">{categoryMeta.label} exercise</p>}
              </div>
            </div>
          )}

          {/* Rep-based: Number of reps only */}
          {isRepBased && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-text-muted">Number of reps</label>
                <div className="mt-1 flex items-center gap-1">
                  <input
                    type="number"
                    value={reps}
                    onChange={(e) => handleRepsChange(e.target.value)}
                    className="glass-input w-full rounded-xl px-3 py-2 text-sm"
                    min={1}
                    placeholder="e.g. 20"
                  />
                </div>
                <div className="mt-1.5 flex gap-1">
                  {[10, 20, 30, 50].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRepsChange(r.toString())}
                      className={cn(
                        'rounded-md px-2 py-0.5 text-[10px] font-medium',
                        parseInt(reps) === r
                          ? 'bg-accent-rose/15 text-accent-rose'
                          : 'bg-white/[0.04] text-text-muted'
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted">Calories Burned</label>
                <div className="mt-1 flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 text-accent-rose" />
                  <input
                    type="number"
                    value={caloriesBurned || estimatedCal.toString()}
                    onChange={(e) => setCaloriesBurned(e.target.value)}
                    className="glass-input w-full rounded-xl px-3 py-2 text-sm"
                    min={0}
                  />
                </div>
                {selectedPreset?.calPerRep && (
                  <p className="mt-1.5 text-[10px] text-text-muted">~{selectedPreset.calPerRep} cal/rep estimated</p>
                )}
              </div>
            </div>
          )}

          {/* Duration + Calories (when not rep-based) */}
          {!isRepBased && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-text-muted">Duration (min)</label>
                <div className="mt-1 flex items-center gap-1">
                  <Timer className="h-3.5 w-3.5 text-text-muted" />
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => handleDurationChange(e.target.value)}
                    className="glass-input w-full rounded-xl px-3 py-2 text-sm"
                    min={1}
                  />
                </div>
                <div className="mt-1.5 flex gap-1">
                  {[15, 30, 45, 60].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleDurationChange(d.toString())}
                      className={cn(
                        'rounded-md px-2 py-0.5 text-[10px] font-medium',
                        parseInt(duration) === d
                          ? 'bg-accent-rose/15 text-accent-rose'
                          : 'bg-white/[0.04] text-text-muted'
                      )}
                    >
                      {d}m
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted">Calories Burned</label>
                <div className="mt-1 flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 text-accent-rose" />
                  <input
                    type="number"
                    value={caloriesBurned || estimatedCal.toString()}
                    onChange={(e) => setCaloriesBurned(e.target.value)}
                    className="glass-input w-full rounded-xl px-3 py-2 text-sm"
                    min={0}
                  />
                </div>
                {selectedPreset?.calPerMin && (
                  <p className="mt-1.5 text-[10px] text-text-muted">~{selectedPreset.calPerMin} cal/min estimated</p>
                )}
              </div>
            </div>
          )}

          {/* Strength-specific fields (sets/reps/weight when not rep-based) */}
          {isStrength && !isRepBased && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-text-muted">Sets</label>
                <input
                  type="number"
                  value={sets}
                  onChange={(e) => setSets(e.target.value)}
                  className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
                  placeholder="3"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted">Reps</label>
                <input
                  type="number"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
                  placeholder="12"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted">Weight (kg)</label>
                <input
                  type="number"
                  value={weightUsed}
                  onChange={(e) => setWeightUsed(e.target.value)}
                  className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
                  placeholder="20"
                  step={0.5}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-text-muted">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="glass-input mt-1 w-full resize-none rounded-xl px-3 py-2 text-sm"
              rows={2}
              placeholder="How did it feel? Any PRs?"
            />
          </div>
        </div>

        <div className="sticky bottom-0 z-10 -mx-6 mt-4 bg-gradient-to-t from-workout-bg via-workout-bg/90 to-transparent px-6 pt-3">
          <button
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            className="glass-button mb-1 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-rose px-4 py-3 text-sm font-semibold text-[#a3a3a3] shadow-glow transition-colors duration-200 hover:bg-accent-rose/90 disabled:opacity-50"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Add Workout
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
