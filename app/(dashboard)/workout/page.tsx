'use client';

import { useState, useEffect } from 'react';
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
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import ProgressRing from '@/components/ui/ProgressRing';
import StatCard from '@/components/ui/StatCard';
import AddWorkoutModal from '@/components/workout/AddWorkoutModal';
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
  getToday,
  formatDate,
  getAgeFromDateOfBirth,
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

interface WorkoutHistoryPoint {
  date: string;
  caloriesBurned: number;
  duration: number;
  count: number;
}

export default function WorkoutPage() {
  const { user } = useUser();
  const { log, loading, refetch } = useDailyLog();
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [history, setHistory] = useState<WorkoutHistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const today = getToday();
  const workouts = log?.workouts || [];
  const totalBurned = log?.caloriesBurned || 0;
  const totalDuration = workouts.reduce((s, w) => s + (w.duration || 0), 0);
  const totalSets = workouts.reduce((s, w) => s + (w.sets || 0), 0);

  // Fetch workout history (last 7 days)
  useEffect(() => {
    setHistoryLoading(true);
    api.getWorkoutHistory(7).then((res) => {
      if (res.success && res.data) {
        const data = res.data as { history: WorkoutHistoryPoint[] };
        setHistory(data.history || []);
      }
    }).finally(() => setHistoryLoading(false));
  }, [log]);

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
        const data = res.data as { isPr?: boolean } | undefined;
        const name = typeof workout.exercise === 'string' ? workout.exercise : 'Workout';
        if (data?.isPr) {
          showToast(`${name} added – new personal record!`, 'success');
        } else {
          showToast(`${name} added!`, 'success');
        }
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

  const targets = getTargetsForUser(user ?? undefined);
  const burnGoal = targets.dailyCalorieBurn;
  const recommendedMinutes = targets.dailyWorkoutMinutes;
  const burnPercent = burnGoal > 0 ? Math.min(Math.round((totalBurned / burnGoal) * 100), 100) : 0;

  // Baseline calorie burn from user profile (BMR + TDEE) — matches dashboard
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

  // Time-proportional baseline — exact same logic as dashboard energy balance
  const now = new Date();
  const dayFraction = (now.getHours() * 60 + now.getMinutes()) / 1440;
  const baselineSoFar = baselineBurn ? Math.round(baselineBurn.tdee * dayFraction) : 0;
  const totalBurnedSoFar = baselineSoFar + Math.round(totalBurned);

  // Burn rate calculations
  const burnPerMinute = totalDuration > 0 ? totalBurned / totalDuration : 0;
  const burnPer30Min = burnPerMinute * 30;
  const burnPerHour = burnPerMinute * 60;

  // Chart data: fill in missing days in the last 7
  const chartData = (() => {
    const map = new Map(history.map((h) => [h.date, h]));
    const result: { label: string; date: string; calories: number; duration: number }[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const entry = map.get(dateStr);
      result.push({
        label: i === 0 ? 'Today' : dayNames[d.getDay()],
        date: dateStr,
        calories: entry?.caloriesBurned || 0,
        duration: entry?.duration || 0,
      });
    }
    return result;
  })();

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
          label="Workout Burn"
          value={formatNumber(Math.round(totalBurned))}
          subtitle={`of ${formatNumber(burnGoal)} goal`}
          iconColor="text-accent-rose"
        />
        <StatCard
          icon={Timer}
          label="Duration"
          value={`${totalDuration}`}
          subtitle={`of ${recommendedMinutes} min goal`}
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
        <div className="flex flex-col lg:col-span-2">
          <div className="glass-card flex flex-1 flex-col rounded-2xl p-6">
            <h2 className="mb-4 text-base font-semibold text-text-primary">Today&apos;s Sessions</h2>

            {workouts.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
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
              <div className="flex-1 space-y-3 overflow-y-auto hide-scrollbar">
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

                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                            {workout.duration > 0 ? (
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3 w-3 text-text-muted" />
                                <span className="text-xs text-text-secondary">{workout.duration} min</span>
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
          </div>

          {/* Burn Rate */}
          {totalDuration > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="mb-3 text-sm font-semibold text-text-primary">Burn Rate</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2">
                  <span className="text-xs text-text-secondary">Per minute</span>
                  <span className="text-sm font-semibold text-accent-rose">{burnPerMinute.toFixed(1)} kcal</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2">
                  <span className="text-xs text-text-secondary">Per 30 min</span>
                  <span className="text-sm font-semibold text-accent-amber">{Math.round(burnPer30Min)} kcal</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2">
                  <span className="text-xs text-text-secondary">Per hour</span>
                  <span className="text-sm font-semibold text-accent-violet">{Math.round(burnPerHour)} kcal</span>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-text-muted">
                Average rate across {workouts.length} session{workouts.length !== 1 ? 's' : ''} ({totalDuration} min)
              </p>
            </div>
          )}

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

          {/* Baseline calorie burn */}
          {baselineBurn && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="mb-3 text-sm font-semibold text-text-primary">Baseline Burn</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2">
                  <span className="text-xs text-text-secondary">BMR (at rest)</span>
                  <span className="text-sm font-semibold text-text-primary">{formatNumber(baselineBurn.bmr)} kcal/day</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2">
                  <span className="text-xs text-text-secondary">TDEE (daily total)</span>
                  <span className="text-sm font-semibold text-accent-amber">{formatNumber(baselineBurn.tdee)} kcal/day</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2">
                  <span className="text-xs text-text-secondary">Per hour (sitting)</span>
                  <span className="text-sm font-medium text-text-primary">~{baselineBurn.sittingPerHour} kcal</span>
                </div>
                <div className="mt-1 flex items-center justify-between rounded-lg border border-accent-rose/30 bg-accent-rose/5 px-3 py-2.5">
                  <span className="text-xs font-medium text-text-secondary">Total burn today</span>
                  <span className="text-sm font-bold text-accent-rose">
                    {formatNumber(totalBurnedSoFar)} kcal
                  </span>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-text-muted">
                Baseline so far ({formatNumber(baselineSoFar)}) + workout ({formatNumber(Math.round(totalBurned))})
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Workout History Chart */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="mb-4 text-base font-semibold text-text-primary">Last 7 Days</h2>
        {historyLoading ? (
          <div className="flex h-[200px] items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-violet border-t-transparent" />
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
            <div className="min-w-0 flex-1">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="label"
                    stroke="rgba(255,255,255,0.15)"
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.15)"
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                    tickFormatter={(v: number) => `${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15, 15, 24, 0.95)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      color: '#f0f0f5',
                      backdropFilter: 'blur(12px)',
                    }}
                    formatter={(value: number, name: string) => [
                      `${Math.round(value)} ${name === 'calories' ? 'kcal' : 'min'}`,
                      name === 'calories' ? 'Burned' : 'Duration',
                    ]}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  {burnGoal > 0 && (
                    <ReferenceLine
                      y={burnGoal}
                      stroke="#f43f5e"
                      strokeDasharray="6 4"
                      strokeOpacity={0.4}
                      label={{
                        value: `Goal: ${formatNumber(burnGoal)}`,
                        fill: 'rgba(255,255,255,0.35)',
                        fontSize: 10,
                        position: 'insideTopRight',
                      }}
                    />
                  )}
                  <Bar
                    dataKey="calories"
                    fill="#f43f5e"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                    fillOpacity={0.8}
                  />
                </BarChart>
              </ResponsiveContainer>
              <p className="mt-1 text-center text-[10px] text-text-muted">Calories burned from exercise</p>
            </div>

            {/* Weekly summary chips */}
            <div className="flex flex-row items-stretch gap-2 sm:flex-col sm:justify-center sm:gap-3">
              {(() => {
                const weekCals = chartData.reduce((s, d) => s + d.calories, 0);
                const weekDuration = chartData.reduce((s, d) => s + d.duration, 0);
                const activeDays = chartData.filter((d) => d.calories > 0).length;
                return (
                  <>
                    <div className="flex-1 rounded-xl bg-white/[0.03] px-3 py-2 text-center sm:flex-none">
                      <p className="text-lg font-bold text-accent-rose">{formatNumber(Math.round(weekCals))}</p>
                      <p className="text-[10px] text-text-muted">kcal this week</p>
                    </div>
                    <div className="flex-1 rounded-xl bg-white/[0.03] px-3 py-2 text-center sm:flex-none">
                      <p className="text-lg font-bold text-accent-amber">{weekDuration}</p>
                      <p className="text-[10px] text-text-muted">min this week</p>
                    </div>
                    <div className="flex-1 rounded-xl bg-white/[0.03] px-3 py-2 text-center sm:flex-none">
                      <p className="text-lg font-bold text-accent-emerald">{activeDays}/7</p>
                      <p className="text-[10px] text-text-muted">active days</p>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
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
