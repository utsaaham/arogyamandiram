'use client';

// ============================================
// Vitals — daily Readiness / Strain / Sleep / Stress scores
// ============================================
// One daily loop: readiness hero ring, Today's Guidance, score grid,
// habit journal, trends, and habit correlation insights.
// All values are wellness estimates from the user's own baselines.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  BookHeart,
  Brain,
  Flame,
  Moon,
  Sparkles,
  Utensils,
} from 'lucide-react';
import DashboardPageShell from '@/components/layout/DashboardPageShell';
import MetricChart from '@/components/ui/MetricChart';
import ProgressRing from '@/components/ui/ProgressRing';
import VitalsIcon from '@/components/ui/VitalsIcon';
import { CardSkeleton } from '@/components/ui/Skeleton';
import api from '@/lib/apiClient';
import type { VitalsResult } from '@/lib/scores';
import { cn, formatDate, getToday } from '@/lib/utils';
import { HABIT_LABELS, type HabitKey } from '@/types';

const GUIDANCE_STYLES: Record<string, { label: string; className: string }> = {
  push: { label: 'Push', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  maintain: { label: 'Maintain', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  recover: { label: 'Recover', className: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  rest: { label: 'Rest', className: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
};

const STRESS_STYLES: Record<string, string> = {
  low: 'text-emerald-400',
  moderate: 'text-amber-400',
  high: 'text-rose-400',
};

function ringColor(score: number | null): string {
  if (score === null) return 'stroke-white/20';
  if (score >= 67) return 'stroke-emerald-400';
  if (score >= 40) return 'stroke-amber-400';
  return 'stroke-rose-400';
}

function scoreTextColor(score: number | null): string {
  if (score === null) return 'text-zinc-500';
  if (score >= 67) return 'text-emerald-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-rose-400';
}

const TREND_OPTIONS = [
  { key: 7, label: '7D' },
  { key: 30, label: '1M' },
];

const TREND_METRICS = [
  { key: 'readiness', label: 'Readiness', color: '#34d399' },
  { key: 'strain', label: 'Strain', color: '#fb923c' },
  { key: 'sleep', label: 'Sleep', color: '#818cf8' },
  { key: 'stress', label: 'Stress', color: '#f472b6' },
  { key: 'hrvSdnnMs', label: 'HRV (ms)', color: '#2dd4bf' },
  { key: 'restingHeartRate', label: 'Resting HR (bpm)', color: '#f87171' },
] as const;

type TrendKey = (typeof TREND_METRICS)[number]['key'];

export default function VitalsPage() {
  const [vitals, setVitals] = useState<VitalsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendDays, setTrendDays] = useState(7);
  const [trendMetric, setTrendMetric] = useState<TrendKey>('readiness');

  const fetchScores = useCallback(async () => {
    try {
      const res = await api.getScores();
      if (res.success && res.data) {
        setVitals(res.data as unknown as VitalsResult);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  const trendData = useMemo(() => {
    if (!vitals) return [];
    return vitals.trends
      .slice(-trendDays)
      .map((t) => ({ date: t.date, value: t[trendMetric] }))
      .filter((p): p is { date: string; value: number } => p.value !== null);
  }, [vitals, trendDays, trendMetric]);

  const readinessScore = vitals?.readiness.score ?? null;
  const guidance = vitals ? GUIDANCE_STYLES[vitals.guidance.band] : null;
  const todaysHabits = (vitals?.journal.habits ?? []) as HabitKey[];

  return (
    <DashboardPageShell
      title="Vitals"
      subtitle={`How your body is doing today · ${formatDate(getToday())}`}
      icon={VitalsIcon}
    >
      {loading ? (
        <div className="mt-4 space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="mt-4 space-y-4 pb-8">
          {/* Hero: Readiness + Guidance */}
          <div className="glass-card p-5 lg:p-6">
            <div className="flex flex-col items-center gap-5 lg:flex-row lg:gap-8">
              <ProgressRing
                progress={readinessScore ?? 0}
                size={150}
                strokeWidth={10}
                color={ringColor(readinessScore)}
                value={readinessScore !== null ? String(readinessScore) : '--'}
                label="Readiness"
                valueClassName={cn('text-3xl font-bold', scoreTextColor(readinessScore))}
                labelClassName="text-[11px] font-medium text-zinc-400"
              />
              <div className="flex-1 text-center lg:text-left">
                {guidance && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold uppercase tracking-wide',
                      guidance.className
                    )}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {guidance.label}
                  </span>
                )}
                <p className="mt-2 text-[14px] text-zinc-300">{vitals?.guidance.reason}</p>
                {readinessScore !== null && (vitals?.readiness.drivers.length ?? 0) > 0 && (
                  <ul className="mt-3 space-y-1">
                    {vitals!.readiness.drivers.map((d) => (
                      <li key={d} className="text-[12px] text-zinc-500">
                        · {d}
                      </li>
                    ))}
                  </ul>
                )}
                {readinessScore === null && (
                  <p className="mt-2 text-[12px] text-zinc-500">
                    Sync a few days of health data from the ArogyaM iOS app and your readiness score will show up here.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Score grid: Strain / Sleep / Stress */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Strain */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-400" />
                <span className="text-[13px] font-medium text-zinc-300">Strain</span>
              </div>
              <p className={cn('mt-2 text-3xl font-bold', vitals?.strain.score !== null ? 'text-orange-400' : 'text-zinc-500')}>
                {vitals?.strain.score ?? '--'}
              </p>
              <div className="mt-2 space-y-1">
                {(vitals?.strain.components ?? []).map((c) => (
                  <p key={c.key} className="text-[11px] text-zinc-500">{c.note ?? c.label}</p>
                ))}
                {(vitals?.strain.zones.length ?? 0) > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {vitals!.strain.zones.map((z) => (
                      <span key={z.zone} className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-zinc-400">
                        {z.zone}: {z.minutes}m
                      </span>
                    ))}
                  </div>
                )}
                {vitals?.strain.score === null && (
                  <p className="text-[11px] text-zinc-500">No activity data yet today.</p>
                )}
              </div>
            </div>

            {/* Sleep */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-indigo-400" />
                <span className="text-[13px] font-medium text-zinc-300">Sleep</span>
              </div>
              <p className={cn('mt-2 text-3xl font-bold', vitals?.sleep.score !== null ? 'text-indigo-400' : 'text-zinc-500')}>
                {vitals?.sleep.score ?? '--'}
              </p>
              <div className="mt-2 space-y-1">
                {(vitals?.sleep.components ?? []).map((c) => (
                  <p key={c.key} className="text-[11px] text-zinc-500">{c.note ?? c.label}</p>
                ))}
                {vitals?.sleep.score === null && (
                  <p className="text-[11px] text-zinc-500">No sleep recorded for last night.</p>
                )}
              </div>
            </div>

            {/* Stress */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-pink-400" />
                <span className="text-[13px] font-medium text-zinc-300">Stress</span>
                <span className="text-[10px] text-zinc-600">estimate</span>
              </div>
              <p className={cn('mt-2 text-3xl font-bold capitalize', vitals?.stress.level ? STRESS_STYLES[vitals.stress.level] : 'text-zinc-500')}>
                {vitals?.stress.level ?? '--'}
              </p>
              <div className="mt-2 space-y-1">
                {(vitals?.stress.components ?? []).map((c) => (
                  <p key={c.key} className="text-[11px] text-zinc-500">{c.note ?? c.label}</p>
                ))}
                {vitals?.stress.level === null && (
                  <p className="text-[11px] text-zinc-500">Needs a few days of heart data.</p>
                )}
              </div>
            </div>
          </div>

          {/* Trends */}
          <div className="glass-card p-4 lg:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                <span className="text-[13px] font-medium text-zinc-300">Trends</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {TREND_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setTrendDays(opt.key)}
                      className={cn(
                        'rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors',
                        trendDays === opt.key
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-300'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {TREND_METRICS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setTrendMetric(m.key)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors',
                    trendMetric === m.key
                      ? 'bg-white/[0.08] text-zinc-100'
                      : 'text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-300'
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="mt-4">
              {trendData.length >= 2 ? (
                <MetricChart
                  data={trendData}
                  color={TREND_METRICS.find((m) => m.key === trendMetric)?.color}
                  gradientId={`vitals-${trendMetric}`}
                  height={200}
                />
              ) : (
                <p className="py-8 text-center text-[12px] text-zinc-500">
                  Not enough data yet. Keep syncing and your {TREND_METRICS.find((m) => m.key === trendMetric)?.label.toLowerCase()} trend will fill in.
                </p>
              )}
            </div>
          </div>

          {/* Habit insights */}
          <div className="glass-card p-4 lg:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BookHeart className="h-4 w-4 text-emerald-400" />
                <span className="text-[13px] font-medium text-zinc-300">Habit insights</span>
              </div>
              <Link
                href="/food"
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10"
              >
                <Utensils className="h-3 w-3" />
                Log habits on the Food page
              </Link>
            </div>
            {todaysHabits.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {todaysHabits.map((key) => (
                  <span
                    key={key}
                    className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300"
                  >
                    {HABIT_LABELS[key]}
                  </span>
                ))}
              </div>
            )}
            {(vitals?.insights.length ?? 0) > 0 ? (
              <ul className="mt-3 space-y-2">
                {vitals!.insights.map((ins) => (
                  <li key={`${ins.habit}-${ins.metric}`} className="flex items-start gap-2 text-[13px] text-zinc-300">
                    <span className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full', ins.delta < 0 ? 'bg-rose-400' : 'bg-emerald-400')} />
                    {ins.text}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[12px] text-zinc-500">
                Tick off your habits on the Food page each day. Give it a couple of weeks and we&apos;ll show you how they play with your sleep and readiness. Patterns, not diagnoses.
              </p>
            )}
          </div>

          <p className="px-1 text-center text-[10px] text-zinc-600">
            Vitals scores are wellness estimates based on your personal trends. They do not detect, diagnose, or treat any medical condition.
          </p>
        </div>
      )}
    </DashboardPageShell>
  );
}
