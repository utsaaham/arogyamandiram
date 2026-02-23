'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Utensils,
  Droplets,
  Scale,
  Dumbbell,
  Sparkles,
  Flame,
  TrendingUp,
  Plus,
  ChevronRight,
  Coffee,
  Sun,
  Moon,
  Cookie,
} from 'lucide-react';
import ProgressRing from '@/components/ui/ProgressRing';
import MacroBar from '@/components/ui/MacroBar';
import StatCard from '@/components/ui/StatCard';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { showToast } from '@/components/ui/Toast';
import { useDailyLog } from '@/hooks/useDailyLog';
import { useUser } from '@/hooks/useUser';
import { computeBaselineBurn } from '@/lib/calorieBurn';
import api from '@/lib/apiClient';
import {
  getGreeting,
  formatCalories,
  formatWater,
  formatNumber,
  calcPercent,
  getToday,
  formatDate,
  cn,
  getAgeFromDateOfBirth,
} from '@/lib/utils';

const mealIcons: Record<string, typeof Coffee> = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
  snack: Cookie,
};

const mealLabels: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const { log, loading: logLoading, refetch } = useDailyLog();
  const [mounted, setMounted] = useState(false);
  const [addingWater, setAddingWater] = useState(false);

  useEffect(() => setMounted(true), []);

  const loading = userLoading || logLoading || !mounted;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <CardSkeleton className="lg:col-span-2 h-64" />
          <CardSkeleton className="h-64" />
        </div>
      </div>
    );
  }

  const targets = user?.targets ?? {
    dailyCalories: 2000,
    dailyWater: 2500,
    protein: 150,
    carbs: 200,
    fat: 67,
    idealWeight: 70,
    dailyWorkoutMinutes: 30,
    dailyCalorieBurn: 400,
    sleepHours: 8,
  };
  const totalCal = log?.totalCalories || 0;
  const burned = log?.caloriesBurned || 0;
  const netCal = totalCal - burned;
  const remaining = Math.max(targets.dailyCalories - totalCal, 0);
  const calPercent = calcPercent(totalCal, targets.dailyCalories);
  const waterPercent = calcPercent(log?.waterIntake || 0, targets.dailyWater);

  // Group meals by type
  const meals = log?.meals || [];
  const mealGroups = meals.reduce<Record<string, typeof meals>>((acc, meal) => {
    const type = meal.mealType || 'snack';
    if (!acc[type]) acc[type] = [];
    acc[type].push(meal);
    return acc;
  }, {});

  const mealGroupCalories = Object.entries(mealGroups).map(([type, items]) => ({
    type,
    calories: items.reduce((s, m) => s + m.calories, 0),
    count: items.length,
  }));

  // Baseline burn (BMR, TDEE, sitting) from profile — same as workout page
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

  // Time-proportional baseline: how much of your TDEE you've passively burned so far today
  const now = new Date();
  const dayFraction = (now.getHours() * 60 + now.getMinutes()) / 1440; // 0..1 through the day
  const baselineSoFar = baselineBurn ? Math.round(baselineBurn.tdee * dayFraction) : 0;

  // Net result: total burned (baseline so far + workouts) minus consumed
  const totalBurnedSoFar = baselineSoFar + Math.round(burned);
  const netResult = totalBurnedSoFar - totalCal; // positive = deficit, negative = surplus

  const today = getToday();

  const handleQuickAddWater = async (amount: number) => {
    if (!amount || addingWater) return;
    setAddingWater(true);
    try {
      const res = await api.addWater(today, amount);
      if (res.success) {
        showToast(`Added ${formatWater(amount)}`, 'success');
        refetch();
      } else {
        showToast(res.error || 'Failed to add water', 'error');
      }
    } catch {
      showToast('Failed to add water', 'error');
    } finally {
      setAddingWater(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {getGreeting()}{user?.profile?.name ? `, ${user.profile.name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-sm text-text-muted">{formatDate(today)}</p>
        </div>
        <Link
          href="/food"
          className="glass-button-primary mt-2 hidden items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium sm:mt-0 sm:flex"
        >
          <Plus className="h-4 w-4" />
          Log Food
        </Link>
      </div>

      {/* Stat Cards Row — hidden on mobile */}
      <div className="hidden grid-cols-2 gap-3 sm:grid sm:grid-cols-4 lg:grid-cols-5">
        <StatCard
          icon={Flame}
          label="Net Calories"
          value={formatNumber(Math.round(netCal))}
          subtitle={`${formatNumber(Math.round(remaining))} remaining`}
          iconColor="text-accent-amber"
        />
        <StatCard
          icon={Droplets}
          label="Water"
          value={formatWater(log?.waterIntake || 0)}
          subtitle={`of ${formatWater(targets.dailyWater)}`}
          iconColor="text-accent-cyan"
        />
        <StatCard
          icon={Dumbbell}
          label="Burned"
          value={`${formatNumber(Math.round(burned))}`}
          subtitle={`${log?.workouts?.length || 0} workout${(log?.workouts?.length || 0) !== 1 ? 's' : ''}`}
          iconColor="text-accent-rose"
        />
        <StatCard
          icon={TrendingUp}
          label="Meals"
          value={`${meals.length}`}
          subtitle={`${formatCalories(totalCal)} total`}
          iconColor="text-accent-emerald"
        />
        <StatCard
          icon={Moon}
          label="Sleep"
          value={log?.sleep ? `${log.sleep.duration.toFixed(1)}h` : '—'}
          subtitle={log?.sleep ? `${log.sleep.quality}/5 quality` : `of ${targets.sleepHours}h target`}
          iconColor="text-accent-violet"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Nutrition + Energy balance stacked, same width */}
        <div className="space-y-6 lg:col-span-2">
          <div className="glass-card space-y-6 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-primary">Today&apos;s Nutrition</h2>
              <Link
                href="/food"
                className="flex items-center gap-1 text-xs font-medium text-accent-violet hover:underline"
              >
                Details <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start sm:justify-around">
              {/* Calorie Ring */}
              <div className="flex flex-col items-center gap-2">
                <ProgressRing
                  progress={calPercent}
                  size={160}
                  strokeWidth={12}
                  color={calPercent > 100 ? 'stroke-accent-rose' : 'stroke-accent-emerald'}
                  value={formatNumber(Math.round(totalCal))}
                  label="kcal consumed"
                  sublabel={`of ${formatNumber(targets.dailyCalories)}`}
                />
              </div>

              {/* Macro Bars */}
              <div className="w-full max-w-xs flex-1 space-y-4">
                <MacroBar
                  label="Protein"
                  current={log?.totalProtein || 0}
                  target={targets.protein}
                  color="bg-accent-violet"
                  bgColor="bg-accent-violet/10"
                />
                <MacroBar
                  label="Carbs"
                  current={log?.totalCarbs || 0}
                  target={targets.carbs}
                  color="bg-accent-amber"
                  bgColor="bg-accent-amber/10"
                />
                <MacroBar
                  label="Fat"
                  current={log?.totalFat || 0}
                  target={targets.fat}
                  color="bg-accent-rose"
                  bgColor="bg-accent-rose/10"
                />

                {/* Macro Summary Chips */}
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Protein', value: log?.totalProtein || 0, color: 'text-accent-violet' },
                    { label: 'Carbs', value: log?.totalCarbs || 0, color: 'text-accent-amber' },
                    { label: 'Fat', value: log?.totalFat || 0, color: 'text-accent-rose' },
                  ].map((m) => (
                    <div key={m.label} className="rounded-xl bg-white/[0.03] px-3 py-2 text-center">
                      <p className={cn('text-lg font-bold', m.color)}>{Math.round(m.value)}g</p>
                      <p className="text-[10px] text-text-muted">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Energy balance: 3 circles — Workouts, Baseline, Net Result */}
          <div className="glass-card rounded-2xl p-6 pb-8">
            <h2 className="mb-6 sm:mb-8 text-base font-semibold text-text-primary">Energy balance</h2>
            <div className="grid grid-cols-3 place-items-center gap-6 [&>*]:scale-[0.82] sm:gap-4 sm:[&>*]:scale-[1.15]">
              {/* 1. Workouts — calories burned from exercise (overflow when exceeding goal) */}
              <ProgressRing
                progress={targets.dailyCalorieBurn > 0 ? Math.round((burned / targets.dailyCalorieBurn) * 100) : 0}
                size={140}
                strokeWidth={10}
                color="stroke-accent-rose"
                overflowColor="stroke-accent-violet"
                value={formatNumber(Math.round(burned))}
                label="Workouts"
                sublabel={burned > targets.dailyCalorieBurn ? `${formatNumber(targets.dailyCalorieBurn)} + ${formatNumber(Math.round(burned - targets.dailyCalorieBurn))} extra` : `of ${formatNumber(targets.dailyCalorieBurn)}`}
              />
              {/* 2. Baseline — time-proportional TDEE burned so far today */}
              <ProgressRing
                progress={baselineBurn ? calcPercent(baselineSoFar, baselineBurn.tdee) : 0}
                size={140}
                strokeWidth={10}
                color="stroke-accent-amber"
                value={baselineBurn ? formatNumber(baselineSoFar) : '—'}
                label="Baseline"
                sublabel={baselineBurn ? `of ${formatNumber(baselineBurn.tdee)}/day` : '—'}
              />
              {/* 3. Net Result — deficit or surplus */}
              <ProgressRing
                progress={100}
                size={140}
                strokeWidth={10}
                color={netResult >= 0 ? 'stroke-accent-emerald' : 'stroke-accent-rose'}
                value={netResult >= 0 ? `-${formatNumber(netResult)}` : `+${formatNumber(-netResult)}`}
                label={netResult >= 0 ? 'Deficit' : 'Surplus'}
                sublabel={netResult >= 0 ? 'losing weight' : 'gaining weight'}
              />
            </div>
          </div>
        </div>

        {/* Right: Water Card */}
        <div className="glass-card flex flex-col rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary">Hydration</h2>
            <Link
              href="/water"
              className="flex items-center gap-1 text-xs font-medium text-accent-cyan hover:underline"
            >
              Track <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-4">
            <ProgressRing
              progress={waterPercent}
              size={130}
              strokeWidth={10}
              color="stroke-accent-cyan"
              value={formatWater(log?.waterIntake || 0)}
              label="of target"
              sublabel={formatWater(targets.dailyWater)}
            />
            <p className="text-sm font-medium text-text-secondary">
              {waterPercent >= 100
                ? '🎉 Goal reached!'
                : `${formatWater(Math.max(targets.dailyWater - (log?.waterIntake || 0), 0))} to go`}
            </p>
            <div className="mt-3 flex w-full flex-col items-stretch gap-2">
              {[100, 250, 500, 750].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickAddWater(amt)}
                  disabled={addingWater}
                  className="w-full rounded-full border border-accent-cyan/30 px-3 py-1.5 text-[11px] font-medium text-text-secondary transition-all hover:bg-accent-cyan/10 hover:text-accent-cyan disabled:opacity-50"
                >
                  {amt} ml
                </button>
              ))}
            </div>
          </div>

          <Link
            href="/water"
            className="glass-button-secondary flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm"
          >
            <Droplets className="h-4 w-4" />
            Add Water
          </Link>
        </div>
      </div>

      {/* Meals by Type + Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Meals Overview */}
        <div className="glass-card space-y-4 rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary">Meals Today</h2>
            <span className="text-xs text-text-muted">{meals.length} items logged</span>
          </div>

          {meals.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
                <Utensils className="h-6 w-6 text-text-muted" />
              </div>
              <p className="text-sm text-text-muted">No meals logged yet today</p>
              <Link
                href="/food"
                className="glass-button-primary rounded-xl px-4 py-2 text-sm font-medium"
              >
                Log your first meal
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => {
                const group = mealGroupCalories.find((g) => g.type === type);
                if (!group) return null;
                const MealIcon = mealIcons[type] || Utensils;
                const items = mealGroups[type] || [];

                return (
                  <div key={type} className="rounded-xl bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06]">
                          <MealIcon className="h-4 w-4 text-text-secondary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">{mealLabels[type]}</p>
                          <p className="text-[11px] text-text-muted">{group.count} item{group.count > 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-text-primary">
                        {formatNumber(Math.round(group.calories))} kcal
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 border-t border-white/[0.04] pt-2">
                      {items.slice(0, 3).map((meal, i) => (
                        <div key={meal._id || i} className="flex items-center justify-between text-xs">
                          <span className="text-text-muted">
                            {meal.name}
                            <span className="ml-1 opacity-50">({meal.quantity}{meal.unit})</span>
                          </span>
                          <span className="text-text-secondary">{Math.round(meal.calories)} kcal</span>
                        </div>
                      ))}
                      {items.length > 3 && (
                        <p className="text-[11px] text-text-muted">+{items.length - 3} more</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-6">
            <h2 className="mb-4 text-base font-semibold text-text-primary">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { href: '/food', icon: Utensils, label: 'Log Food', color: 'text-accent-emerald' },
                { href: '/water', icon: Droplets, label: 'Add Water', color: 'text-accent-cyan' },
                { href: '/weight', icon: Scale, label: 'Log Weight', color: 'text-accent-amber' },
                { href: '/workout', icon: Dumbbell, label: 'Add Workout', color: 'text-accent-rose' },
                { href: '/sleep', icon: Moon, label: 'Log Sleep', color: 'text-accent-violet' },
                { href: '/ai-insights', icon: Sparkles, label: 'AI Insights', color: 'text-accent-violet' },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-secondary transition-all hover:bg-white/[0.04] hover:text-text-primary"
                >
                  <action.icon className={cn('h-4 w-4', action.color)} />
                  <span>{action.label}</span>
                  <ChevronRight className="ml-auto h-4 w-4 text-text-muted" />
                </Link>
              ))}
            </div>
          </div>

          {/* Calorie Breakdown Mini */}
          {totalCal > 0 && (
            <div className="glass-card rounded-2xl p-6">
              <h3 className="mb-3 text-sm font-semibold text-text-primary">Calorie Split</h3>
              <div className="space-y-2">
                {mealGroupCalories.sort((a, b) => b.calories - a.calories).map((g) => {
                  const pct = totalCal > 0 ? Math.round((g.calories / totalCal) * 100) : 0;
                  return (
                    <div key={g.type} className="flex items-center gap-3">
                      <span className="w-16 text-xs text-text-muted capitalize">{g.type}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-accent-violet/60 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs font-medium text-text-secondary">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
