'use client';

import { useState } from 'react';
import {
  Dumbbell,
  Plus,
  Trash2,
  Flame,
  Clock,
  Heart,
  Waves,
  Footprints,
  Bike,
  TrendingUp,
  Timer,
  Zap,
} from 'lucide-react';
import ProgressRing from '@/components/ui/ProgressRing';
import StatCard from '@/components/ui/StatCard';
import AddWorkoutModal from '@/components/workout/AddWorkoutModal';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { showToast } from '@/components/ui/Toast';
import { useDailyLog } from '@/hooks/useDailyLog';
import { useUser } from '@/hooks/useUser';
import api from '@/lib/apiClient';
import {
  cn,
  formatNumber,
  getToday,
  formatDate,
} from '@/lib/utils';

const categoryIcons: Record<string, typeof Dumbbell> = {
  cardio: Heart,
  strength: Dumbbell,
  flexibility: Waves,
  sports: Footprints,
  other: Bike,
};

const categoryColors: Record<string, string> = {
  cardio: 'text-accent-rose bg-accent-rose/10',
  strength: 'text-accent-violet bg-accent-violet/10',
  flexibility: 'text-accent-cyan bg-accent-cyan/10',
  sports: 'text-accent-emerald bg-accent-emerald/10',
  other: 'text-accent-amber bg-accent-amber/10',
};

const categoryTextColors: Record<string, string> = {
  cardio: 'text-accent-rose',
  strength: 'text-accent-violet',
  flexibility: 'text-accent-cyan',
  sports: 'text-accent-emerald',
  other: 'text-accent-amber',
};

export default function WorkoutPage() {
  const { user } = useUser();
  const { log, loading, refetch } = useDailyLog();
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const today = getToday();
  const workouts = log?.workouts || [];
  const totalBurned = log?.caloriesBurned || 0;
  const totalDuration = workouts.reduce((s, w) => s + (w.duration || 0), 0);
  const totalSets = workouts.reduce((s, w) => s + (w.sets || 0), 0);

  // Group by category
  const categoryBreakdown = workouts.reduce<Record<string, { count: number; calories: number; duration: number }>>((acc, w) => {
    const cat = w.category || 'other';
    if (!acc[cat]) acc[cat] = { count: 0, calories: 0, duration: 0 };
    acc[cat].count++;
    acc[cat].calories += w.caloriesBurned || 0;
    acc[cat].duration += w.duration || 0;
    return acc;
  }, {});

  const handleAdd = async (workout: Record<string, unknown>) => {
    setAdding(true);
    try {
      const res = await api.addWorkout(today, workout);
      if (res.success) {
        showToast(`${workout.exercise} added!`, 'success');
        setShowAdd(false);
        refetch();
      } else {
        showToast(res.error || 'Failed to add workout', 'error');
      }
    } catch {
      showToast('Failed to add workout', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (workoutId: string) => {
    setDeletingId(workoutId);
    try {
      const res = await api.removeWorkout(today, workoutId);
      if (res.success) {
        showToast('Workout removed', 'info');
        refetch();
      } else {
        showToast(res.error || 'Failed to remove', 'error');
      }
    } catch {
      showToast('Failed to remove workout', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <CardSkeleton className="h-72" />
      </div>
    );
  }

  const burnGoal = user?.targets?.dailyCalorieBurn ?? 400;
  const recommendedMinutes = user?.targets?.dailyWorkoutMinutes ?? 30;
  const burnPercent = burnGoal > 0 ? Math.min(Math.round((totalBurned / burnGoal) * 100), 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Workouts</h1>
          <p className="text-sm text-text-muted">{formatDate(today)}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="glass-button-primary mt-2 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium sm:mt-0"
        >
          <Plus className="h-4 w-4" />
          Add Workout
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={Flame}
          label="Calories Burned"
          value={formatNumber(Math.round(totalBurned))}
          subtitle="kcal today"
          iconColor="text-accent-rose"
        />
        <StatCard
          icon={Timer}
          label="Duration"
          value={`${totalDuration}`}
          subtitle="minutes total"
          iconColor="text-accent-amber"
        />
        <StatCard
          icon={Dumbbell}
          label="Workouts"
          value={`${workouts.length}`}
          subtitle="sessions today"
          iconColor="text-accent-violet"
        />
        <StatCard
          icon={Zap}
          label="Total Sets"
          value={`${totalSets}`}
          subtitle="across all exercises"
          iconColor="text-accent-emerald"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Workout List */}
        <div className="space-y-4 lg:col-span-2">
          <div className="glass-card rounded-2xl p-6">
            <h2 className="mb-4 text-base font-semibold text-text-primary">Today&apos;s Sessions</h2>

            {workouts.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]">
                  <Dumbbell className="h-7 w-7 text-text-muted" />
                </div>
                <p className="text-sm text-text-muted">No workouts logged today</p>
                <p className="text-xs text-text-muted">Track your exercises to see calories burned</p>
                <button
                  onClick={() => setShowAdd(true)}
                  className="glass-button-primary mt-2 rounded-xl px-4 py-2 text-sm font-medium"
                >
                  Add your first workout
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {workouts.map((workout, i) => {
                  const cat = workout.category || 'other';
                  const CatIcon = categoryIcons[cat] || Dumbbell;
                  const colorClasses = categoryColors[cat] || categoryColors.other;

                  return (
                    <div
                      key={workout._id || i}
                      className="group rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 transition-all hover:border-white/[0.08]"
                    >
                      <div className="flex items-start gap-3">
                        {/* Category Icon */}
                        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', colorClasses)}>
                          <CatIcon className="h-5 w-5" />
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-semibold text-text-primary">{workout.exercise}</p>
                              <p className="text-xs capitalize text-text-muted">{cat}</p>
                            </div>
                            <button
                              onClick={() => workout._id && handleDelete(workout._id)}
                              disabled={deletingId === workout._id}
                              className="shrink-0 rounded-lg p-1.5 text-text-muted opacity-0 transition-all hover:bg-accent-rose/10 hover:text-accent-rose group-hover:opacity-100"
                            >
                              {deletingId === workout._id ? (
                                <div className="h-3.5 w-3.5 animate-spin rounded-full border border-accent-rose border-t-transparent" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Stats row */}
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3 w-3 text-text-muted" />
                              <span className="text-xs text-text-secondary">{workout.duration} min</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Flame className="h-3 w-3 text-accent-rose" />
                              <span className="text-xs text-text-secondary">{workout.caloriesBurned} kcal</span>
                            </div>
                            {workout.sets && (
                              <div className="flex items-center gap-1.5">
                                <TrendingUp className="h-3 w-3 text-text-muted" />
                                <span className="text-xs text-text-secondary">
                                  {workout.sets}×{workout.reps || '?'}
                                  {workout.weight ? ` @ ${workout.weight}kg` : ''}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Notes */}
                          {workout.notes && (
                            <p className="mt-2 rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-text-muted">
                              {workout.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Burn Goal Ring */}
          <div className="glass-card flex flex-col items-center rounded-2xl p-6">
            <ProgressRing
              progress={burnPercent}
              size={130}
              strokeWidth={10}
              color="stroke-accent-rose"
              value={`${formatNumber(Math.round(totalBurned))}`}
              label="kcal burned"
              sublabel={`of ${formatNumber(burnGoal)} goal`}
            />
            <p className="mt-3 text-center text-sm font-medium text-text-secondary">
              {burnPercent >= 100
                ? '🔥 Burn goal achieved!'
                : `${formatNumber(Math.max(burnGoal - totalBurned, 0))} kcal to go`}
            </p>
            <p className="mt-1 text-center text-xs text-text-muted">
              Recommended: {recommendedMinutes} min activity today · {totalDuration} min done
            </p>
          </div>

          {/* Category Breakdown */}
          {Object.keys(categoryBreakdown).length > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="mb-3 text-sm font-semibold text-text-primary">Category Breakdown</h3>
              <div className="space-y-3">
                {Object.entries(categoryBreakdown).map(([cat, data]) => {
                  const CatIcon = categoryIcons[cat] || Dumbbell;
                  const textColor = categoryTextColors[cat] || 'text-text-secondary';
                  const pct = totalBurned > 0 ? Math.round((data.calories / totalBurned) * 100) : 0;

                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CatIcon className={cn('h-3.5 w-3.5', textColor)} />
                          <span className="text-xs font-medium capitalize text-text-secondary">{cat}</span>
                        </div>
                        <span className="text-xs text-text-muted">
                          {data.calories} kcal · {data.duration}min
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className={cn('h-full rounded-full transition-all duration-500', {
                            'bg-accent-rose': cat === 'cardio',
                            'bg-accent-violet': cat === 'strength',
                            'bg-accent-cyan': cat === 'flexibility',
                            'bg-accent-emerald': cat === 'sports',
                            'bg-accent-amber': cat === 'other',
                          })}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Time Breakdown */}
          {totalDuration > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="mb-3 text-sm font-semibold text-text-primary">Time Summary</h3>
              <div className="text-center">
                <p className="text-3xl font-bold text-accent-amber">{totalDuration}</p>
                <p className="text-xs text-text-muted">minutes active today</p>
              </div>
              {totalDuration >= 30 && (
                <div className="mt-3 rounded-lg bg-accent-emerald/10 px-3 py-2 text-center text-[11px] font-medium text-accent-emerald">
                  ✅ WHO recommends 150+ min/week of activity
                </div>
              )}
            </div>
          )}

          {/* Motivational */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="mb-2 text-sm font-semibold text-text-primary">💪 Motivation</h3>
            <p className="text-xs leading-relaxed text-text-muted">
              {workouts.length === 0
                ? "Every fitness journey starts with a single step. Log your first workout to get started!"
                : workouts.length === 1
                ? "Great start! Consistency is the key to results. Try to work out at least 3-4 times a week."
                : totalBurned > 300
                ? "Incredible effort today! Your body is thanking you for the hard work."
                : "Good work getting active today! Keep pushing — progress takes consistency."}
            </p>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showAdd && (
        <AddWorkoutModal
          onClose={() => setShowAdd(false)}
          onAdd={(workout) => handleAdd(workout as Record<string, unknown>)}
          loading={adding}
        />
      )}
    </div>
  );
}
