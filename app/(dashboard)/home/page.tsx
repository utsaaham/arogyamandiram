'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import ProgressRing from '@/components/ui/ProgressRing';
import WaterGlass from '@/components/water/WaterGlass';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useDailyLog } from '@/hooks/useDailyLog';
import { useUser } from '@/hooks/useUser';
import { useAchievements } from '@/hooks/useAchievements';
import {
  getGreeting,
  formatWater,
  formatNumber,
  calcPercent,
  cn,
} from '@/lib/utils';
import { getLevelProgress, BASE_LEVEL_XP } from '@/lib/level';
import { getTargetsForUser } from '@/lib/health';
import { BadgeCard } from '@/components/achievements/BadgeCard';
import { BadgeDetailModal } from '@/components/achievements/BadgeDetailModal';
import { StreakCard as AchievementStreakCard } from '@/components/achievements/StreakCard';
import StatMini from '@/components/ui/StatMini';
import { Droplets, Flame, Moon, Utensils, HeartPulse, Footprints, MapPin, Activity } from 'lucide-react';
import api from '@/lib/apiClient';
import type { UserBadge, UserStreaks } from '@/types';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Mobile design colors (TopBar-style uses teal #14dcb4) */
const M_COLORS = {
  green: '#00e5a0',
  teal: '#14dcb4',
  purple: '#8b78ff',
  orange: '#f5a623',
  red: '#ff5c7c',
  muted: '#5a6677',
  text: '#f0f4f8',
} as const;


export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const { log, loading: logLoading, refetch: refetchDailyLog } = useDailyLog();
  const { achievements } = useAchievements();
  const [mounted, setMounted] = useState(false);
  const [healthMetrics, setHealthMetrics] = useState<{
    heartRate?: number;
    steps?: number;
    activeCalories?: number;
    distanceKm?: number;
  } | null>(null);

  useEffect(() => setMounted(true), []);

  const loadHealthMetrics = useCallback(() => {
    api.getHealthMetricsHistory(1).then((res) => {
      if (res.success) {
        setHealthMetrics(res.data?.today ?? null);
      }
    }).catch(() => {});
  }, []);

  const refreshWearableMetrics = useCallback(() => {
    loadHealthMetrics();
    refetchDailyLog();
  }, [loadHealthMetrics, refetchDailyLog]);

  useEffect(() => {
    refreshWearableMetrics();

    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') refreshWearableMetrics();
    };
    const interval = window.setInterval(refreshIfVisible, 60_000);
    window.addEventListener('focus', refreshWearableMetrics);
    document.addEventListener('visibilitychange', refreshIfVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshWearableMetrics);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [refreshWearableMetrics]);


  const loading = userLoading || logLoading || !mounted;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <CardSkeleton className="h-64 lg:col-span-2" />
          <CardSkeleton className="h-64" />
        </div>
      </div>
    );
  }

  const targets = getTargetsForUser(user ?? undefined);
  const preferPopulated = (primary?: number, fallback?: number) => {
    if (typeof primary === 'number' && primary > 0) return primary;
    if (typeof fallback === 'number' && fallback > 0) return fallback;
    return primary ?? fallback;
  };
  const wearableMetrics = {
    heartRate: preferPopulated(healthMetrics?.heartRate, log?.heartRate),
    steps: preferPopulated(healthMetrics?.steps, log?.steps),
    activeCalories: preferPopulated(healthMetrics?.activeCalories, log?.activeCalories),
    distanceKm: preferPopulated(healthMetrics?.distanceKm, log?.distanceKm),
  };
  const totalCal = log?.totalCalories || 0;
  const burned = log?.caloriesBurned || 0;
  const remaining = Math.max(targets.dailyCalories - totalCal, 0);
  const calPercent = calcPercent(totalCal, targets.dailyCalories);
  const meals = log?.meals || [];

  const xpTotal = achievements?.xpTotal ?? 0;
  const loggingStreak = achievements?.streaks.current.logging ?? 0;
  const { level, xpIntoLevel, xpPercent, xpForCurrentLevel } = getLevelProgress(xpTotal);

  const earnedBadges = achievements?.badges ?? [];
  const earnedById = new Map<string, UserBadge>();
  for (const b of earnedBadges) earnedById.set(b.id, b);

  const todayDayIndex = new Date().getDay();
  const displayDayIndex = todayDayIndex === 0 ? 6 : todayDayIndex - 1;

  const userName = user?.profile?.name ? user.profile.name.split(' ')[0] : '';

  return (
    <div className="animate-fade-in">
      {/* ─── Desktop / iPad (lg+) ─── */}
      <div className="hidden flex-col gap-3 lg:flex">
        {/* Top row */}
          <div className="flex flex-wrap items-start justify-between gap-4 pt-3">
          <div>
            <h1
              className="font-heading text-[32px] font-normal tracking-[0.03em] leading-none"
              style={{ color: '#e5e5e5' }}
            >
              {getGreeting()}
              {userName ? `, ${userName}` : ''} 👋
            </h1>
            <p className="font-body mt-0.5 text-[13px] text-text-muted">
              Build momentum one healthy choice at a time.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-2.5" style={{ background: 'linear-gradient(160deg, #111712 0%, #0c1410 100%)' }}>
            <span className="font-heading text-xl tracking-[0.03em] text-accent-emerald">LV {level}</span>
            <div className="h-1.5 w-[110px] overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent-emerald to-accent-emerald/80 transition-all duration-500"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
            <span className="font-body text-[11px] text-text-muted whitespace-nowrap">
              {xpIntoLevel} / {xpForCurrentLevel || BASE_LEVEL_XP} XP
            </span>
          </div>
        </div>

        {/* Bento grid */}
        <div className="bento-grid">
          {/* Streaks - pinned to top */}
          <div className="bento-streaks">
            <StreakCard
              streaks={achievements?.streaks}
              displayDayIndex={displayDayIndex}
              loggingStreak={loggingStreak}
            />
          </div>

          {/* Ring + 4 stat cards in 2x2 */}
          <div className="bento-ring-stats">
            {/* Calorie ring spans 2 rows */}
            <div className="bento-ring">
              <div className="glass-card ring-card card-glow">
                <div className="ring-wrap">
                <ProgressRing
                  progress={calPercent}
                  size={200}
                  strokeWidth={12}
                  color="stroke-accent-emerald"
                  bgColor="stroke-white/[0.06]"
                  value={formatNumber(Math.round(totalCal))}
                  label="kcal"
                  valueClassName="font-heading text-4xl font-normal tracking-[0.03em] text-text-secondary"
                  labelClassName="font-body text-xs font-medium text-text-muted"
                />
                </div>
                <p className="text-center text-sm text-text-muted leading-relaxed font-body">
                  <span className="font-semibold text-text-secondary">
                    {formatNumber(Math.round(remaining))} remaining
                  </span>
                  <br />
                  of {formatNumber(targets.dailyCalories)} kcal goal
                </p>
              </div>
            </div>

            {/* Recent Badges */}
            <div className="bento-ring-badges min-h-0">
              <RecentBadges earnedBadges={earnedBadges} />
            </div>

            {/* Water Ring */}
            <div className="bento-water-ring">
              <WaterRingCard waterIntake={log?.waterIntake || 0} dailyWater={targets.dailyWater} />
            </div>

          </div>

          {/* Macros */}
          <div className="bento-macro">
            <MacroCard
              protein={log?.totalProtein || 0}
              carbs={log?.totalCarbs || 0}
              fat={log?.totalFat || 0}
              fiber={log?.totalFiber || 0}
              sugar={log?.totalSugar || 0}
              sodium={log?.totalSodium || 0}
              targets={targets}
            />
          </div>

          {/* All 8 stats in 4x2 grid */}
          <div className="bento-all-stats col-span-full grid grid-cols-4 gap-3">
            <StatMini
              icon={<Droplets className="h-6 w-6 text-text-secondary" strokeWidth={1.8} />}
              value={formatWater(log?.waterIntake || 0)}
              label="Water"
              sub="2.5 L target"
              valueColor="text-accent-cyan"
              labelClassName="text-text-secondary"
              iconBg=""
              compact
            />
            <StatMini
              icon={<Flame className="h-6 w-6 text-text-secondary" strokeWidth={1.8} />}
              value={formatNumber(Math.round(burned))}
              label="Burned"
              sub={`${log?.workouts?.length || 0} workouts`}
              valueColor="text-accent-rose"
              labelClassName="text-text-secondary"
              iconBg=""
              compact
            />
            <StatMini
              icon={<Utensils className="h-6 w-6 text-text-secondary" strokeWidth={1.8} />}
              value={String(meals.length)}
              label="Meals"
              sub={`${formatNumber(Math.round(totalCal))} kcal`}
              valueColor="text-accent-amber"
              labelClassName="text-text-secondary"
              iconBg=""
              compact
            />
            <StatMini
              icon={<Moon className="h-6 w-6 text-text-secondary" strokeWidth={1.8} />}
              value={log?.sleep ? `${log.sleep.duration.toFixed(1)}h` : '-'}
              label="Sleep"
              sub={log?.sleep ? `${log.sleep.quality}/5 quality` : '8h target'}
              valueColor="text-accent-violet"
              labelClassName="text-text-secondary"
              iconBg=""
              compact
            />
            <StatMini
              icon={<Footprints className="h-6 w-6 text-text-secondary" strokeWidth={1.8} />}
              value={wearableMetrics.steps != null ? formatNumber(wearableMetrics.steps) : '-'}
              label="Steps"
              sub={wearableMetrics.steps != null ? `of ${formatNumber(targets.dailySteps ?? 8000)} goal` : 'No device data'}
              valueColor="text-accent-emerald"
              labelClassName="text-text-secondary"
              iconBg=""
              compact
            />
            <StatMini
              icon={<HeartPulse className="h-6 w-6 text-text-secondary" strokeWidth={1.8} />}
              value={wearableMetrics.heartRate != null ? String(wearableMetrics.heartRate) : '-'}
              label="Heart Rate"
              sub={wearableMetrics.heartRate != null ? 'bpm' : 'No device data'}
              valueColor="text-accent-rose"
              labelClassName="text-text-secondary"
              iconBg=""
              compact
            />
            <StatMini
              icon={<Activity className="h-6 w-6 text-text-secondary" strokeWidth={1.8} />}
              value={wearableMetrics.activeCalories != null ? formatNumber(wearableMetrics.activeCalories) : '-'}
              label="Active Cal"
              sub={wearableMetrics.activeCalories != null ? 'kcal burned' : 'No device data'}
              valueColor="text-accent-amber"
              labelClassName="text-text-secondary"
              iconBg=""
              compact
            />
            <StatMini
              icon={<MapPin className="h-6 w-6 text-text-secondary" strokeWidth={1.8} />}
              value={wearableMetrics.distanceKm != null ? wearableMetrics.distanceKm.toFixed(1) : '-'}
              label="Distance"
              sub={wearableMetrics.distanceKm != null ? `of ${targets.idealDistance ?? 5} km goal` : 'No device data'}
              valueColor="text-accent-cyan"
              labelClassName="text-text-secondary"
              iconBg=""
              compact
            />
          </div>

        </div>
      </div>

      {/* ─── Mobile (design layout) ─── */}
      <div className="mobile-dash cards-stack-mobile lg:hidden">
        {/* Header - TopBar-style card */}
        <div className={cn('mobile-fade-up mobile-dash-px pt-0 pb-3')} style={{ animationDelay: '0ms' }}>
          <div
            className="card-glow relative w-full overflow-hidden rounded-[22px] px-5 pt-5 pb-[18px]"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
          >
            {/* Row 1: Greeting + Avatar - T centered with left text block */}
            <div className="flex justify-between items-center">
              <div className="min-w-0 flex-1">
                <p className="m-0 text-text-secondary text-[22px] font-extrabold leading-tight" style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>
                  {getGreeting()}
                </p>
                <p className="m-0 mt-0.5 text-text-secondary text-[22px] font-extrabold leading-tight" style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>
                  {userName || 'Guest'} 👋
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: M_COLORS.teal, boxShadow: `0 0 6px ${M_COLORS.teal}` }}
                  />
                  <span className="text-[9.5px] font-bold tracking-[0.14em]" style={{ color: M_COLORS.teal }}>
                    AROGYAMANDIRAM
                  </span>
                </div>
                <p className="mt-1 text-[11px]" style={{ color: '#3a4460' }}>
                  Stay steady today and your future self will thank you.
                </p>
              </div>

              {/* Avatar - larger, shifted slightly left */}
              <Link href="/settings" className="shrink-0 active:opacity-90 transition-opacity -translate-x-3" aria-label="Open settings">
                <div
                  className="w-[76px] h-[76px] rounded-full flex items-center justify-center text-[24px] font-black"
                  style={{ background: '#1a2035', color: '#a3a3a3' }}
                >
                  {(userName || 'Guest').charAt(0).toUpperCase()}
                </div>
              </Link>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/[0.06]" style={{ marginTop: 16, marginBottom: 14 }} />

            {/* XP Bar */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-[11px]" style={{ color: '#3a4460' }}>
                  {loggingStreak >= 7 ? 'Building momentum' : 'Getting started'}
                </span>
                <span className="text-[11px] font-bold" style={{ color: M_COLORS.teal }}>
                  {xpIntoLevel} / {xpForCurrentLevel || BASE_LEVEL_XP} XP
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${xpPercent}%`,
                    background: 'linear-gradient(90deg, #14dcb4, #00aaff)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Active Streaks – top of feed */}
        <div className={cn('mobile-fade-up mobile-dash-px')} style={{ animationDelay: '60ms' }}>
          <StreakCard
            streaks={achievements?.streaks}
            displayDayIndex={displayDayIndex}
            loggingStreak={loggingStreak}
          />
        </div>

        {/* Calorie ring card */}
        <div className={cn('mobile-fade-up mobile-dash-px')} style={{ animationDelay: '80ms' }}>
          <div className="m-calorie-card card-glow">
            <div className="m-calorie-inner">
              <div>
                <div className="text-[11px] font-semibold tracking-[0.1em] uppercase text-text-muted mb-2">
                  Today&apos;s Calories
                </div>
                <div
                  className="text-[52px] font-extrabold leading-none tracking-[-0.04em] text-text-secondary"
                  style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}
                >
                  {formatNumber(Math.round(totalCal))}
                </div>
                <div className="text-[13px] text-text-muted mt-1">kcal consumed</div>
                <div className="flex items-center gap-1.5 mt-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#a3a3a3' }} />
                  <span className="font-bold text-[15px]" style={{ color: '#a3a3a3' }}>
                    {formatNumber(Math.round(remaining))}
                  </span>
                  <span className="text-[13px] text-text-muted">kcal remaining</span>
                </div>
                <div className="text-[11.5px] text-text-muted mt-0.5">
                  of {formatNumber(targets.dailyCalories)} kcal goal
                </div>
              </div>
              <div className="m-calorie-ring-wrap">
                <MobileCalorieRing value={totalCal} max={targets.dailyCalories} size={120} strokeWidth={10} />
                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                  <span className="text-[13px] font-extrabold" style={{ color: '#a3a3a3' }}>
                    {Math.round(calPercent)}%
                  </span>
                </div>
              </div>
            </div>
            <div className="m-calorie-macros">
              <MacroBar label="Protein" value={log?.totalProtein ?? 0} max={targets.protein} color={M_COLORS.purple} unit="g" />
              <MacroBar label="Carbs" value={log?.totalCarbs ?? 0} max={targets.carbs} color={M_COLORS.orange} unit="g" />
              <MacroBar label="Fat" value={log?.totalFat ?? 0} max={targets.fat} color={M_COLORS.red} unit="g" />
              <MacroBar label="Sugar" value={log?.totalSugar ?? 0} max={50} color="#ff9f43" unit="g" />
              <MacroBar label="Sodium" value={log?.totalSodium ?? 0} max={2300} color="#54a0ff" unit="mg" />
            </div>
          </div>
        </div>

        {/* Quick stats 2x2 – two-line value + label on mobile (each with section shade) */}
        <div className={cn('mobile-fade-up mobile-dash-px')} style={{ animationDelay: '120ms' }}>
          <div className="m-stats-grid">
            <div className="stat-card-water">
              <StatMini
                icon={<Droplets className="h-8 w-8 text-text-secondary" strokeWidth={1.8} />}
                value={formatWater(log?.waterIntake || 0)}
                label="Water"
                sub="of 2.5 L target"
                valueColor="text-accent-cyan"
                labelClassName="text-text-secondary"
                iconBg=""
                stackLabel
              />
            </div>
            <div className="stat-card-burned">
              <StatMini
                icon={<Flame className="h-8 w-8 text-text-secondary" strokeWidth={1.8} />}
                value={formatNumber(Math.round(burned))}
                label="Burned"
                sub={`${log?.workouts?.length || 0} workouts`}
                valueColor="text-accent-rose"
                labelClassName="text-text-secondary"
                iconBg=""
                stackLabel
              />
            </div>
            <div className="stat-card-meals">
              <StatMini
                icon={<Utensils className="h-8 w-8 text-text-secondary" strokeWidth={1.8} />}
                value={String(meals.length)}
                label="Meals"
                sub={`${formatNumber(Math.round(totalCal))} kcal logged`}
                valueColor="text-accent-amber"
                labelClassName="text-text-secondary"
                iconBg=""
                stackLabel
              />
            </div>
            <div className="stat-card-sleep">
              <StatMini
                icon={<Moon className="h-8 w-8 text-text-secondary" strokeWidth={1.8} />}
                value={log?.sleep ? `${log.sleep.duration.toFixed(1)}h` : '-'}
                label="Sleep"
                sub="of 8h target"
                valueColor="text-accent-violet"
                labelClassName="text-text-secondary"
                iconBg=""
                stackLabel
              />
            </div>
          </div>
        </div>

        {/* Water Ring card – mobile (centered between the two stat grids) */}
        <div className={cn('mobile-fade-up mobile-dash-px')} style={{ animationDelay: '160ms' }}>
          <WaterRingCard waterIntake={log?.waterIntake || 0} dailyWater={targets.dailyWater} />
        </div>

        {/* Wearable metrics 2x2 – mobile */}
        <div className={cn('mobile-fade-up mobile-dash-px')} style={{ animationDelay: '200ms' }}>
          <div className="m-stats-grid">
            <div className="stat-card-water">
              <StatMini
                icon={<Footprints className="h-8 w-8 text-text-secondary" strokeWidth={1.8} />}
                value={wearableMetrics.steps != null ? formatNumber(wearableMetrics.steps) : '-'}
                label="Steps"
                sub={wearableMetrics.steps != null ? `of ${formatNumber(targets.dailySteps ?? 8000)}` : 'No data'}
                valueColor="text-accent-emerald"
                labelClassName="text-text-secondary"
                iconBg=""
                stackLabel
              />
            </div>
            <div className="stat-card-burned">
              <StatMini
                icon={<HeartPulse className="h-8 w-8 text-text-secondary" strokeWidth={1.8} />}
                value={wearableMetrics.heartRate != null ? String(wearableMetrics.heartRate) : '-'}
                label="Heart Rate"
                sub={wearableMetrics.heartRate != null ? 'bpm' : 'No data'}
                valueColor="text-accent-rose"
                labelClassName="text-text-secondary"
                iconBg=""
                stackLabel
              />
            </div>
            <div className="stat-card-meals">
              <StatMini
                icon={<Activity className="h-8 w-8 text-text-secondary" strokeWidth={1.8} />}
                value={wearableMetrics.activeCalories != null ? formatNumber(wearableMetrics.activeCalories) : '-'}
                label="Active Cal"
                sub={wearableMetrics.activeCalories != null ? 'kcal' : 'No data'}
                valueColor="text-accent-amber"
                labelClassName="text-text-secondary"
                iconBg=""
                stackLabel
              />
            </div>
            <div className="stat-card-sleep">
              <StatMini
                icon={<MapPin className="h-8 w-8 text-text-secondary" strokeWidth={1.8} />}
                value={wearableMetrics.distanceKm != null ? `${wearableMetrics.distanceKm.toFixed(1)}km` : '-'}
                label="Distance"
                sub={wearableMetrics.distanceKm != null ? `of ${targets.idealDistance ?? 5} km` : 'No data'}
                valueColor="text-accent-cyan"
                labelClassName="text-text-secondary"
                iconBg=""
                stackLabel
              />
            </div>
          </div>
        </div>

        {/* Recent Badges – same 5 BadgeCards as desktop/achievements */}
        <div className={cn('mobile-fade-up mobile-dash-px')} style={{ animationDelay: '240ms' }}>
          <RecentBadges earnedBadges={earnedBadges} />
        </div>

      </div>
    </div>
  );
}

function WaterRingCard({ waterIntake, dailyWater }: { waterIntake: number; dailyWater: number }) {
  const waterPercent = calcPercent(waterIntake, dailyWater);
  const remaining = Math.max(dailyWater - waterIntake, 0);
  const glowIntensity = Math.min(waterPercent / 100, 1);

  return (
    <div className="glass-card water-beaker-card card-glow">
      <div className="beaker-wrap">
        <WaterGlass
          percent={waterPercent}
          isPouring={false}
          size="compact"
          textColor="#22d3ee"
          labelColor="#67e8f9"
          glowIntensity={glowIntensity}
        />
      </div>
      <p className="text-center text-sm text-text-muted leading-relaxed font-body">
        <span className="font-semibold text-text-secondary">
          {formatWater(remaining)} remaining
        </span>
        <br />
        of {formatWater(dailyWater)} goal
      </p>
    </div>
  );
}

function MacroCard({
  protein,
  carbs,
  fat,
  fiber,
  sugar,
  sodium,
  targets,
}: {
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  targets: { protein: number; carbs: number; fat: number };
}) {
  const pctP = targets.protein > 0 ? Math.min(100, (protein / targets.protein) * 100) : 0;
  const pctC = targets.carbs > 0 ? Math.min(100, (carbs / targets.carbs) * 100) : 0;
  const pctF = targets.fat > 0 ? Math.min(100, (fat / targets.fat) * 100) : 0;
  const pctFib = 25 > 0 ? Math.min(100, (fiber / 25) * 100) : 0;
  const pctSug = 50 > 0 ? Math.min(100, (sugar / 50) * 100) : 0;
  const pctSod = 2300 > 0 ? Math.min(100, (sodium / 2300) * 100) : 0;

  return (
    <div className="macro-card card-glow">
      <div className="mb-4 flex items-center justify-between">
        <span className="macro-title">
          Today&apos;s Macros
        </span>
        <Link href="/food" className="font-body text-xs font-medium text-accent-emerald hover:underline">
          Details →
        </Link>
      </div>
      <div className="macro-scroll">
        <div className="macro-col">
          <MacroCol label="Protein" current={protein} target={targets.protein} pct={pctP} color="accent-violet" unit="g" />
        </div>
        <div className="macro-col">
          <MacroCol label="Carbs" current={carbs} target={targets.carbs} pct={pctC} color="accent-amber" unit="g" />
        </div>
        <div className="macro-col">
          <MacroCol label="Fat" current={fat} target={targets.fat} pct={pctF} color="accent-rose" unit="g" />
        </div>
        <div className="macro-col">
          <MacroCol label="Fiber" current={fiber} target={25} pct={pctFib} color="accent-emerald" unit="g" />
        </div>
        <div className="macro-col">
          <MacroCol label="Sugar" current={sugar} target={50} pct={pctSug} color="#f5a623" unit="g" />
        </div>
        <div className="macro-col">
          <MacroCol label="Sodium" current={sodium} target={2300} pct={pctSod} color="#3aabff" unit="mg" />
        </div>
      </div>
    </div>
  );
}

const MACRO_COLORS: Record<string, string> = {
  'accent-violet': 'linear-gradient(90deg,#8b5cf6,#4c1d95)',
  'accent-amber': 'linear-gradient(90deg,#e8a800,#ffc94a)',
  'accent-rose': 'linear-gradient(90deg,#d93a55,#ff4f6b)',
  'accent-emerald': 'linear-gradient(90deg,#10b981,#065f46)',
  '#f5a623': 'linear-gradient(90deg,#f5a623,#e89510)',
  '#3aabff': 'linear-gradient(90deg,#3aabff,#2a8bd9)',
};

function MacroCol({
  label,
  current,
  target,
  pct,
  color,
  unit = 'g',
}: {
  label: string;
  current: number;
  target: number;
  pct: number;
  color: string;
  unit?: string;
}) {
  const barBg = color.startsWith('#')
    ? color
    : (MACRO_COLORS[color] ?? MACRO_COLORS['accent-violet']);
  const displayTarget = unit === 'mg' ? `${Math.round(target)}mg` : `${Math.round(target)}g`;
  return (
    <div className="flex flex-col">
      <div className="mb-2 flex justify-between text-sm text-text-muted">
        <span className="font-body font-medium">{label}</span>
        <span className="font-heading text-sm tracking-[0.03em] text-text-secondary">
          {Math.round(current)}/{displayTarget}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: barBg }}
        />
      </div>
    </div>
  );
}

/** Recent Badges: 5 most recently earned, same size as achievement page badges (BadgeCard). */
function RecentBadges({ earnedBadges }: { earnedBadges: UserBadge[] }) {
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null);
  const recent = [...earnedBadges]
    .sort((a, b) => (b.earnedAt || '').localeCompare(a.earnedAt || ''))
    .slice(0, 5);
  const slots = Array.from({ length: 5 }, (_, index) => recent[index] ?? null);

  return (
    <div className="glass-card recent-badges-card card-glow flex h-full min-h-0 flex-col">
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <span className="font-body text-[11px] font-medium uppercase tracking-wider text-text-muted">
          Recent Badges
        </span>
        <Link href="/achievements" className="font-body text-xs font-medium text-accent-emerald hover:underline">
          View all →
        </Link>
      </div>
      <div className="recent-badges-grid min-h-0 flex-1">
        {slots.map((badge, index) =>
          badge ? (
            <BadgeCard
              key={badge.id}
              badge={badge}
              locked={false}
              onClick={() => setSelectedBadge(badge)}
            />
          ) : (
            <div
              key={`empty-slot-${index}`}
              className="recent-badge-empty-slot"
              aria-hidden="true"
            />
          )
        )}
      </div>
      {selectedBadge && (
        <BadgeDetailModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
      )}
    </div>
  );
}

const EMPTY_STREAKS: UserStreaks = {
  current: {
    logging: 0,
    healthy: 0,
    calories: 0,
    water: 0,
    workout: 0,
    sleep: 0,
    weight: 0,
    waterGoal: 0,
  },
  best: {
    logging: 0,
    healthy: 0,
    calories: 0,
    water: 0,
    workout: 0,
    sleep: 0,
    weight: 0,
    waterGoal: 0,
  },
};

function StreakCard({
  streaks,
  displayDayIndex,
  loggingStreak,
}: {
  streaks?: UserStreaks | null;
  displayDayIndex: number;
  loggingStreak: number;
}) {
  const s = streaks ?? EMPTY_STREAKS;
  const items = [
    { key: 'logging' as const, label: 'Active days' },
    { key: 'healthy' as const, label: 'Healthy days' },
    { key: 'calories' as const, label: 'Food' },
    { key: 'water' as const, label: 'Water' },
    { key: 'waterGoal' as const, label: 'Water' },
    { key: 'weight' as const, label: 'Weight' },
    { key: 'workout' as const, label: 'Workouts' },
    { key: 'sleep' as const, label: 'Sleep' },
    { key: 'steps' as const, label: 'Steps' },
  ];

  const activeItems = items.filter((item) => (s.current[item.key] ?? 0) > 0);
  const daysToSeven = Math.max(1, 7 - loggingStreak);

  return (
    <div className="streak-card card-glow flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
      {/* Label + hint - full width on mobile, fixed-width on desktop */}
      <div className="sm:shrink-0 sm:w-[220px]">
        <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted mb-1">
          Active Streaks
        </p>
        <p className="text-[12px] text-text-muted leading-relaxed">
          {loggingStreak >= 7
            ? 'Keep your streak alive to climb badge tiers.'
            : `${daysToSeven} day${daysToSeven === 1 ? '' : 's'} to your first 7-day badge.`}
        </p>
      </div>

      {/* Streak items or empty state */}
      <div className="flex-1 min-w-0 h-14 flex items-center overflow-hidden">
        {activeItems.length === 0 ? (
          <p className="text-sm text-text-muted/60 italic">Log today to start a streak.</p>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto hide-scrollbar w-full h-full items-center snap-x snap-mandatory sm:snap-none">
            {activeItems.map((item) => (
              <div
                key={item.key}
                className="w-[150px] sm:w-[160px] shrink-0 h-full snap-start"
              >
                <AchievementStreakCard
                  label={item.label}
                  current={s.current[item.key] ?? 0}
                  best={s.best[item.key] ?? 0}
                  variant={item.key === 'waterGoal' ? 'water' : 'default'}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Day dots - full-width row on mobile, shrunk column on desktop */}
      <div className="grid w-full grid-cols-7 gap-1.5 sm:flex sm:w-auto sm:shrink-0">
        {DAY_LABELS.map((lbl, i) => (
          <div key={i} className={`sdot !w-full sm:!w-9 ${i === displayDayIndex ? 'sdot-today' : ''}`}>
            {lbl}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Mobile-only components (design layout) ───

function MobileCalorieRing({
  value,
  max,
  size = 120,
  strokeWidth = 10,
}: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(pct), 100);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <svg width={size} height={size} className="rotate-[-90deg]" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="mobileRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a3a3a3" />
          <stop offset="100%" stopColor="#a3a3a3" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#mobileRingGrad)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - animated)}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  );
}

function MacroBar({ label, value, max, color, unit = 'g' }: { label: string; value: number; max: number; color: string; unit?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(pct), 200);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div className="mb-3.5">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[12px] font-medium tracking-[0.04em] uppercase text-text-muted">{label}</span>
        <span className="text-[12px] font-bold text-text-primary">
          <span style={{ color }}>{Math.round(value)}</span>
          <span className="text-text-muted"> / {Math.round(max)}{unit === 'mg' ? 'mg' : unit}</span>
        </span>
      </div>
      <div className="macro-bar-track">
        <div
          className="macro-bar-fill"
          style={{
            width: `${w}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}50`,
          }}
        />
      </div>
    </div>
  );
}
