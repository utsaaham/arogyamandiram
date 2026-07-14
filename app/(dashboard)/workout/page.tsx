'use client';

import { useState, useEffect } from 'react';
import {
  Dumbbell,
  Pencil,
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
  BarChart3,
} from 'lucide-react';
import DashboardPageShell from '@/components/layout/DashboardPageShell';
import MetricChart from '@/components/ui/MetricChart';
import ProgressRing from '@/components/ui/ProgressRing';
import StatCard from '@/components/ui/StatCard';
import WorkoutCard from '@/components/ui/workout-card';
import EditWorkoutModal, { type WorkoutEntryForEdit } from '@/components/workout/EditWorkoutModal';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { showToast } from '@/components/ui/Toast';
import { useDailyLog } from '@/hooks/useDailyLog';
import { useUser } from '@/hooks/useUser';
import api from '@/lib/apiClient';
import { computeBaselineBurn } from '@/lib/calorieBurn';
import { getTargetsForUser } from '@/lib/health';
import {
  cn,
  formatNumber,
  formatDuration,
  getToday,
  getAgeFromDateOfBirth,
} from '@/lib/utils';

const categoryIcons: Record<string, typeof Dumbbell> = {
  cardio: Heart,
  strength: Dumbbell,
  core: Zap,
  flexibility: Waves,
  sports: Footprints,
  other: Bike,
};

const categoryColors: Record<string, string> = {
  cardio: 'text-accent-rose bg-accent-rose/10',
  strength: 'text-accent-violet bg-accent-violet/10',
  core: 'text-orange-400 bg-orange-400/10',
  flexibility: 'text-accent-cyan bg-accent-cyan/10',
  sports: 'text-accent-emerald bg-accent-emerald/10',
  other: 'text-accent-amber bg-accent-amber/10',
};

const categoryTextColors: Record<string, string> = {
  cardio: 'text-accent-rose',
  strength: 'text-accent-violet',
  core: 'text-orange-400',
  flexibility: 'text-accent-cyan',
  sports: 'text-accent-emerald',
  other: 'text-accent-amber',
};

interface WorkoutHistoryPoint {
  date: string;
  caloriesBurned: number;
  duration: number;
  count: number;
}

export default function WorkoutPage() {
  const { user } = useUser();
  const { log, loading, refetch } = useDailyLog();
  const [editingWorkout, setEditingWorkout] = useState<WorkoutEntryForEdit | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [addingWorkout, setAddingWorkout] = useState(false);
  const [savingAdd, setSavingAdd] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [history, setHistory] = useState<WorkoutHistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [period, setPeriod] = useState(7);

  const today = getToday();
  const workouts = log?.workouts || [];
  const totalBurned = log?.caloriesBurned || 0;
  const totalDuration = workouts.reduce((s, w) => s + (w.duration || 0), 0);
  const totalSets = workouts.reduce((s, w) => s + (w.sets || 0), 0);

  // Fetch workout history for selected period
  useEffect(() => {
    setHistoryLoading(true);
    api.getWorkoutHistory(period).then((res) => {
      if (res.success && res.data) {
        const data = res.data as { history: WorkoutHistoryPoint[] };
        setHistory(data.history || []);
      }
    }).finally(() => setHistoryLoading(false));
  }, [log, period]);

  // Group by category
  const categoryBreakdown = workouts.reduce<Record<string, { count: number; calories: number; duration: number }>>((acc, w) => {
    const cat = w.category || 'other';
    if (!acc[cat]) acc[cat] = { count: 0, calories: 0, duration: 0 };
    acc[cat].count++;
    acc[cat].calories += w.caloriesBurned || 0;
    acc[cat].duration += w.duration || 0;
    return acc;
  }, {});

  const handleEditSave = async (updated: Omit<WorkoutEntryForEdit, 'id'>) => {
    if (!editingWorkout) return;
    setSavingEdit(true);
    try {
      const res = await api.updateWorkout(today, editingWorkout.id, updated);
      if (res.success) {
        showToast('Workout updated', 'success');
        setEditingWorkout(null);
        refetch();
      } else {
        showToast(res.error || 'Failed to update workout', 'error');
      }
    } catch {
      showToast('Failed to update workout', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAddSave = async (workout: Omit<WorkoutEntryForEdit, 'id'>) => {
    setSavingAdd(true);
    try {
      const res = await api.addWorkout(today, workout as Record<string, unknown>);
      if (res.success) {
        showToast('Workout added', 'success');
        setAddingWorkout(false);
        refetch();
      } else {
        showToast(res.error || 'Failed to add workout', 'error');
      }
    } catch {
      showToast('Failed to add workout', 'error');
    } finally {
      setSavingAdd(false);
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

  const targets = getTargetsForUser(user ?? undefined);
  const burnGoal = targets.dailyCalorieBurn;
  const recommendedMinutes = targets.dailyWorkoutMinutes;
  const burnPercent = burnGoal > 0 ? Math.min(Math.round((totalBurned / burnGoal) * 100), 100) : 0;

  // Baseline calorie burn from user profile (BMR + TDEE) - matches dashboard
  const profile = user?.profile;
  const age =
    profile?.dateOfBirth != null
      ? getAgeFromDateOfBirth(profile.dateOfBirth)
      : (typeof profile?.age === 'number' ? profile.age : undefined);
  const baselineBurn =
    profile &&
    profile.weight > 0 &&
    profile.height > 0
      ? computeBaselineBurn({
          weightKg: profile.weight,
          heightCm: profile.height,
          age,
          gender: profile.gender,
          activityLevel: profile.activityLevel,
        })
      : null;

  // Time-proportional baseline - exact same logic as dashboard energy balance
  const now = new Date();
  const dayFraction = (now.getHours() * 60 + now.getMinutes()) / 1440;
  const baselineSoFar = baselineBurn ? Math.round(baselineBurn.tdee * dayFraction) : 0;
  const totalBurnedSoFar = baselineSoFar + Math.round(totalBurned);

  // Burn rate calculations
  const burnPerMinute = totalDuration > 0 ? totalBurned / totalDuration : 0;
  const burnPer30Min = burnPerMinute * 30;
  const burnPerHour = burnPerMinute * 60;

  // Chart data: fill in missing days across the selected period
  const chartData = (() => {
    const map = new Map(history.map((h) => [h.date, h]));
    const result: { date: string; calories: number; duration: number }[] = [];
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const entry = map.get(dateStr);
      result.push({
        date: dateStr,
        calories: entry?.caloriesBurned || 0,
        duration: entry?.duration || 0,
      });
    }
    return result;
  })();

  return (
    <div className="workout-page animate-fade-in flex flex-col max-lg:mobile-dash cards-stack-desktop">
      <DashboardPageShell
        title="Workouts"
        subtitle="Build consistency with every session"
        icon={Dumbbell}
        mobileVariant="card"
        mobileCardClassName="dashboard-unified-card border text-text-primary"
      />

      {/* Stats */}
      <div className="mobile-fade-up mobile-dash-px lg:px-0">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={Flame}
            label="Workout Burn"
            value={formatNumber(Math.round(totalBurned))}
            subtitle={`of ${formatNumber(burnGoal)} goal`}
            iconColor="text-accent-rose"
            variant="workout"
          />
          <StatCard
            icon={Timer}
            label="Duration"
            value={`${totalDuration}`}
            subtitle={`of ${recommendedMinutes} min goal`}
            iconColor="text-neutral-400"
            variant="workout"
          />
          <StatCard
            icon={Dumbbell}
            label="Workouts"
            value={`${workouts.length}`}
            subtitle="sessions today"
            iconColor="text-accent-rose"
            variant="workout"
          />
          <StatCard
            icon={Zap}
            label="Total Sets"
            value={`${totalSets}`}
            subtitle="across all exercises"
            iconColor="text-accent-emerald"
            variant="workout"
          />
        </div>
      </div>

      <div className="mobile-fade-up mobile-dash-px lg:px-0">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-4">
        {/* Workout List */}
        <div className="flex flex-col lg:relative lg:col-span-2">
          <WorkoutCard className="flex flex-1 flex-col p-6 lg:absolute lg:inset-0 lg:min-h-0">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-400">Today&apos;s Sessions</h2>
              <button
                onClick={() => setAddingWorkout(true)}
                className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-white/[0.08]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Workout
              </button>
            </div>

            {workouts.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]">
                  <Dumbbell className="h-7 w-7 text-text-muted" />
                </div>
                <p className="text-sm text-text-muted">No workouts logged today</p>
                <button
                  onClick={() => setAddingWorkout(true)}
                  className="mt-1 flex items-center gap-1.5 rounded-xl bg-white/[0.06] px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-white/[0.1]"
                >
                  <Plus className="h-4 w-4" />
                  Add Workout
                </button>
              </div>
            ) : (
              <div className="flex-1 space-y-3 overflow-y-auto min-h-0 hide-scrollbar">
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
                        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', colorClasses)}>
                          <CatIcon className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-semibold text-neutral-400">{workout.exercise}</p>
                              <p className="text-xs capitalize text-text-muted">{cat}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-all group-hover:opacity-100">
                              <button
                                onClick={() =>
                                  workout._id &&
                                  setEditingWorkout({
                                    id: String(workout._id),
                                    exercise: workout.exercise ?? '',
                                    category: workout.category ?? 'other',
                                    duration: workout.duration ?? 0,
                                    caloriesBurned: workout.caloriesBurned ?? 0,
                                    sets: workout.sets,
                                    reps: workout.reps,
                                    weight: workout.weight,
                                    notes: workout.notes,
                                  })
                                }
                                className="rounded-lg p-1.5 text-text-muted hover:bg-white/[0.06] hover:text-text-primary"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => workout._id && handleDelete(workout._id)}
                                disabled={deletingId === workout._id}
                                className="rounded-lg p-1.5 text-text-muted hover:bg-accent-rose/10 hover:text-accent-rose"
                              >
                                {deletingId === workout._id ? (
                                  <div className="h-3.5 w-3.5 animate-spin rounded-full border border-accent-rose border-t-transparent" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                            {workout.duration > 0 ? (
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3 w-3 text-text-muted" />
                                <span className="text-xs text-text-secondary">{formatDuration(workout.duration)}</span>
                              </div>
                            ) : workout.reps != null && workout.reps > 0 ? (
                              <div className="flex items-center gap-1.5">
                                <TrendingUp className="h-3 w-3 text-text-muted" />
                                <span className="text-xs text-text-secondary">{workout.reps} reps</span>
                              </div>
                            ) : null}
                            <div className="flex items-center gap-1.5">
                              <Flame className="h-3 w-3 text-accent-rose" />
                              <span className="text-xs text-text-secondary">{workout.caloriesBurned} kcal</span>
                            </div>
                            {workout.sets && workout.duration > 0 && (
                              <div className="flex items-center gap-1.5">
                                <TrendingUp className="h-3 w-3 text-text-muted" />
                                <span className="text-xs text-text-secondary">
                                  {workout.sets}×{workout.reps || '?'}
                                  {workout.weight ? ` @ ${workout.weight}kg` : ''}
                                </span>
                              </div>
                            )}
                          </div>

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
          </WorkoutCard>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Burn Goal Ring */}
          <WorkoutCard className="flex flex-col items-center p-6">
            <ProgressRing
              progress={burnPercent}
              size={130}
              strokeWidth={10}
              color="stroke-accent-rose"
              value={formatNumber(Math.round(totalBurned))}
              label="Workout burn"
              sublabel={`of ${formatNumber(burnGoal)} goal`}
            />
            <p className="mt-3 text-center text-sm font-medium text-text-secondary">
              {burnPercent >= 100
                ? '🔥 Workout burn goal achieved!'
                : `${formatNumber(Math.max(burnGoal - totalBurned, 0))} kcal to go`}
            </p>
            <p className="mt-1 text-center text-xs text-text-muted">
              {recommendedMinutes} min target · {totalDuration} min done
            </p>
          </WorkoutCard>

          {/* Burn Rate */}
          {totalDuration > 0 && (
            <WorkoutCard className="p-5">
              <h3 className="mb-3 text-sm font-semibold text-neutral-400">Burn Rate</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2">
                  <span className="text-xs text-neutral-400">Per minute</span>
                  <span className="text-sm font-semibold text-neutral-400">{burnPerMinute.toFixed(1)} kcal</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2">
                  <span className="text-xs text-neutral-400">Per 30 min</span>
                  <span className="text-sm font-semibold text-neutral-400">{Math.round(burnPer30Min)} kcal</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2">
                  <span className="text-xs text-neutral-400">Per hour</span>
                  <span className="text-sm font-semibold text-neutral-400">{Math.round(burnPerHour)} kcal</span>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-neutral-400">
                Average rate across {workouts.length} session{workouts.length !== 1 ? 's' : ''} ({totalDuration} min)
              </p>
            </WorkoutCard>
          )}

          {/* Category Breakdown */}
          {Object.keys(categoryBreakdown).length > 0 && (
            <WorkoutCard className="p-5">
              <h3 className="mb-3 text-sm font-semibold text-neutral-400">Category Breakdown</h3>
              <div className="space-y-3">
                {Object.entries(categoryBreakdown).map(([cat, data]) => {
                  const CatIcon = categoryIcons[cat] || Dumbbell;
                  const textColor = categoryTextColors[cat] || 'text-text-secondary';
                  const pct = data.calories > 0 || data.duration > 0 ? 100 : 0;

                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CatIcon className={cn('h-3.5 w-3.5', textColor)} />
                          <span className="text-xs font-medium capitalize text-neutral-400">{cat}</span>
                        </div>
                        <span className="text-xs text-neutral-400">
                          {data.calories} kcal
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className={cn('h-full rounded-full transition-all duration-500', {
                            'bg-accent-rose': cat === 'cardio',
                            'bg-accent-violet': cat === 'strength',
                            'bg-orange-400': cat === 'core',
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
            </WorkoutCard>
          )}

          {/* Baseline calorie burn – hidden on mobile, visible on laptop/desktop */}
          {baselineBurn && (
            <WorkoutCard className="hidden lg:block p-5">
              <h3 className="mb-3 text-sm font-semibold text-neutral-400">Baseline Burn</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2">
                  <span className="text-xs text-neutral-400">BMR (at rest)</span>
                  <span className="text-sm font-semibold text-neutral-400">{formatNumber(baselineBurn.bmr)} kcal/day</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2">
                  <span className="text-xs text-neutral-400">TDEE (daily total)</span>
                  <span className="text-sm font-semibold text-neutral-400">{formatNumber(baselineBurn.tdee)} kcal/day</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2">
                  <span className="text-xs text-neutral-400">Per hour (sitting)</span>
                  <span className="text-sm font-medium text-neutral-400">~{baselineBurn.sittingPerHour} kcal</span>
                </div>
                <div className="mt-1 flex items-center justify-between rounded-lg border border-accent-rose/30 bg-accent-rose/5 px-3 py-2.5">
                  <span className="text-xs font-medium text-neutral-400">Total burn today</span>
                  <span className="text-sm font-bold text-neutral-400">
                    {formatNumber(totalBurnedSoFar)} kcal
                  </span>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-neutral-400">
                Baseline so far ({formatNumber(baselineSoFar)}) + workout ({formatNumber(Math.round(totalBurned))})
              </p>
            </WorkoutCard>
          )}
        </div>
      </div>

      {/* Workout History Chart – hidden on mobile, visible on laptop/desktop */}
      <WorkoutCard className="hidden lg:block p-6 lg:mt-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-accent-rose" />
            <h2 className="text-base font-semibold text-neutral-400">Daily Calories Burned</h2>
          </div>
          <div className="flex gap-1.5">
            {[
              { key: 7, label: '7D' },
              { key: 14, label: '2W' },
              { key: 30, label: '1M' },
              { key: 90, label: '3M' },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setPeriod(opt.key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                  period === opt.key
                    ? 'bg-white/[0.08] text-neutral-400'
                    : 'bg-white/[0.02] text-neutral-400/70 hover:bg-white/[0.06]',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {historyLoading ? (
          <div className="flex h-60 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-rose border-t-transparent" />
          </div>
        ) : (
          <>
            <MetricChart
              data={chartData.map((d) => ({ date: d.date, value: d.calories }))}
              color="#f43f5e"
              gradientId="workoutGrad"
              gradientFrom="#7f1d1d"
              gradientTo="#020617"
              unit=""
              tooltipUnit=" kcal"
              formatY={(v) => formatNumber(Math.round(v))}
              height={240}
              targetValue={burnGoal > 0 ? burnGoal : undefined}
              targetLabel={burnGoal > 0 ? `Goal: ${formatNumber(burnGoal)} kcal` : undefined}
            />
            {chartData.length > 0 && (() => {
              const active = chartData.filter((d) => d.calories > 0);
              const avg = active.length > 0
                ? Math.round(active.reduce((s, d) => s + d.calories, 0) / active.length)
                : 0;
              const best = active.length > 0 ? Math.max(...active.map((d) => d.calories)) : 0;
              return (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-black/40 p-3 text-center shadow-lg">
                    <p className="text-lg font-semibold text-neutral-400">{formatNumber(avg)} kcal</p>
                    <p className="text-[11px] text-neutral-400/70">Daily Average</p>
                  </div>
                  <div className="rounded-xl bg-black/40 p-3 text-center shadow-lg">
                    <p className="text-lg font-semibold text-neutral-400">{`${active.length}/${chartData.length}`}</p>
                    <p className="text-[11px] text-neutral-400/70">Active Days</p>
                  </div>
                  <div className="rounded-xl bg-black/40 p-3 text-center shadow-lg">
                    <p className="text-lg font-semibold text-neutral-400">{formatNumber(Math.round(best))} kcal</p>
                    <p className="text-[11px] text-neutral-400/70">Best Day</p>
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </WorkoutCard>
      </div>

      {/* Modals */}
      {editingWorkout && (
        <EditWorkoutModal
          workout={editingWorkout}
          onClose={() => setEditingWorkout(null)}
          onSave={handleEditSave}
          loading={savingEdit}
        />
      )}
      {addingWorkout && (
        <EditWorkoutModal
          mode="add"
          workout={{ id: '', exercise: '', category: 'other', duration: 0, caloriesBurned: 0 }}
          onClose={() => setAddingWorkout(false)}
          onSave={handleAddSave}
          loading={savingAdd}
        />
      )}
    </div>
  );
}
