'use client';

// ============================================
// Coach › Weekly — rolling 7-day recap
// ============================================
// Stats come from /api/coach/weekly-summary (cached per week window):
// workouts done vs planned, weight delta, strongest-lift delta, protein
// days hit, and one coach-written line for next week.

import { useCallback, useEffect, useState } from 'react';
import {
  CalendarRange, Loader2, RefreshCw, Scale, TrendingUp, Drumstick, Lightbulb,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import api from '@/lib/apiClient';
import { showToast } from '@/components/ui/Toast';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

interface WeeklySummaryData {
  weekStart: string;
  weekEnd: string;
  stats: {
    workoutsPlanned: number;
    workoutsDone: number;
    adherencePct: number | null;
    startWeightKg: number | null;
    endWeightKg: number | null;
    weightDeltaKg: number | null;
    strongestLift: { exercise: string; fromKg: number; toKg: number; deltaKg: number } | null;
    proteinDaysHit: number;
    proteinDaysTracked: number;
  };
  nextWeekLine: string;
  generatedAt?: string;
}

function formatRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return `${start} – ${end}`;
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}`;
}

function StatCard({ icon: Icon, label, value, sub, tint }: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  tint: string;
}) {
  return (
    <div className="min-w-0 p-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${tint}`} />
        <p className="text-xs font-medium text-text-muted">{label}</p>
      </div>
      <p className="mt-2 text-xl font-bold text-text-primary">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-zinc-500">{sub}</p>}
    </div>
  );
}

export default function WeeklyTab({ className }: { className?: string } = {}) {
  const [summary, setSummary] = useState<WeeklySummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const res = await api.getWeeklySummary(refresh);
      if (res.success && res.data) {
        const data = res.data as { summary?: WeeklySummaryData };
        if (data.summary) setSummary(data.summary);
      } else if (!res.success) {
        showToast(res.error || 'Failed to load weekly summary', 'error');
      }
    } catch {
      showToast('Failed to load weekly summary', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className={cn('dashboard-unified-card rounded-2xl border p-6 text-center', className)}>
        <p className="text-sm text-zinc-400">No weekly summary yet. Log a few days of workouts, food and weight and check back.</p>
      </div>
    );
  }

  const { stats } = summary;
  const adherenceLabel = stats.adherencePct != null ? `${stats.adherencePct}% of planned` : 'No plans last week';
  const weightValue = stats.weightDeltaKg != null
    ? `${stats.weightDeltaKg > 0 ? '+' : ''}${stats.weightDeltaKg} kg`
    : '—';
  const weightSub = stats.startWeightKg != null && stats.endWeightKg != null
    ? `${stats.startWeightKg} → ${stats.endWeightKg} kg`
    : 'No weigh-ins last week';
  const liftValue = stats.strongestLift
    ? `${stats.strongestLift.deltaKg > 0 ? '+' : ''}${stats.strongestLift.deltaKg} kg`
    : '—';
  const liftSub = stats.strongestLift
    ? `${stats.strongestLift.exercise}: ${stats.strongestLift.fromKg} → ${stats.strongestLift.toKg} kg`
    : 'Log lift weights twice to see progress';
  const adherencePct = Math.max(0, Math.min(100, stats.adherencePct ?? 0));

  return (
    <div className={cn('dashboard-unified-card rounded-2xl border p-5 sm:p-6', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <CalendarRange className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">Weekly recap</p>
            <h2 className="mt-0.5 text-xl font-bold text-text-primary">Last 7 days</h2>
            <p className="text-xs text-text-muted">{formatRange(summary.weekStart, summary.weekEnd)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-xs text-zinc-400 ring-1 ring-white/10 transition-colors hover:text-zinc-200 disabled:opacity-50"
        >
          {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      <div className="mt-5 rounded-2xl bg-emerald-500/[0.04] p-4 ring-1 ring-emerald-500/10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <p className="text-xs font-medium text-emerald-300">Workouts completed</p>
            <p className="mt-1 text-4xl font-extrabold leading-none text-text-primary">
              {stats.workoutsDone}
              <span className="text-xl font-bold text-zinc-500">/{stats.workoutsPlanned}</span>
            </p>
          </div>
          <p className="text-sm font-semibold text-emerald-300 sm:text-right">{adherenceLabel}</p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-emerald-400" style={{ width: `${adherencePct}%` }} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 divide-y divide-white/[0.06] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <StatCard
          icon={Scale}
          label="Weight change"
          value={weightValue}
          sub={weightSub}
          tint="text-cyan-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Strongest lift"
          value={liftValue}
          sub={liftSub}
          tint="text-amber-400"
        />
        <StatCard
          icon={Drumstick}
          label="Protein days hit"
          value={`${stats.proteinDaysHit}/${stats.proteinDaysTracked}`}
          sub="Days at or above your protein target"
          tint="text-rose-400"
        />
      </div>

      {summary.nextWeekLine && (
        <div className="mt-3 flex items-start gap-3 rounded-2xl bg-emerald-500/[0.05] px-4 py-3 ring-1 ring-emerald-500/10">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-emerald-300">Next week</p>
            <p className="mt-0.5 text-sm leading-relaxed text-emerald-100/90">{summary.nextWeekLine}</p>
          </div>
        </div>
      )}
    </div>
  );
}
