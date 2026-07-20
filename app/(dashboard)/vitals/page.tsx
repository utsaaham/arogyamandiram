'use client';

// ============================================
// Vitals - personal health intelligence
// ============================================
// Six-section IA (Overview / Recovery / Performance / Insights / Trends, with
// Predictions arriving with its engine). Every score is tappable: the
// attribution engine explains exactly why the value is what it is, what
// changed since yesterday, and the fastest lever to move it.
// All values are wellness estimates from the user's own baselines.

import { Suspense, useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Activity,
  BookHeart,
  Brain,
  Flame,
  Hourglass,
  Moon,
  Sparkles,
  Utensils,
  Zap,
  LineChart,
  HeartPulse,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import DashboardPageShell from '@/components/layout/DashboardPageShell';
import MetricChart from '@/components/ui/MetricChart';
import ProgressRing from '@/components/ui/ProgressRing';
import VitalsIcon from '@/components/ui/VitalsIcon';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { usePlanAutoRefresh } from '@/hooks/usePlanAutoRefresh';
import api from '@/lib/apiClient';
import type { VitalsResult, ScoreAttribution } from '@/lib/scores';
import { cn, formatDate, getToday } from '@/lib/utils';
import { HABIT_LABELS, type HabitKey } from '@/types';
import ScoreExplainModal, { ChangeArrow, ConfidenceChip } from './ScoreExplainModal';
import {
  GoalScoreCard, ConsistencyStrip, TriggersPanel, PriorityCard,
  BodySummaryLine, TimelinePanel, PredictionsSection,
  HealthScoreCard, AnomaliesCallout, useIntelligence,
} from './IntelligencePanels';

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

type SectionKey = 'overview' | 'recovery' | 'performance' | 'insights' | 'predictions' | 'trends';

const SECTIONS: Array<{ key: SectionKey; label: string; icon: LucideIcon }> = [
  { key: 'overview', label: 'Overview', icon: Zap },
  { key: 'recovery', label: 'Recovery', icon: Moon },
  { key: 'performance', label: 'Performance', icon: Flame },
  { key: 'insights', label: 'Insights', icon: BookHeart },
  { key: 'predictions', label: 'Predictions', icon: HeartPulse },
  { key: 'trends', label: 'Trends', icon: LineChart },
];

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
  { key: 'vo2Max', label: 'VO₂ Max', color: '#38bdf8' },
  { key: 'respiratoryRate', label: 'Respiratory rate', color: '#a78bfa' },
  { key: 'wristTempC', label: 'Wrist temp (°C)', color: '#fbbf24' },
  { key: 'mood', label: 'Mood', color: '#f9a8d4' },
] as const;

type TrendKey = (typeof TREND_METRICS)[number]['key'];
type ScoreKey = 'readiness' | 'strain' | 'sleep' | 'stress';

const SCORE_TITLES: Record<ScoreKey, string> = {
  readiness: 'Readiness',
  strain: 'Strain',
  sleep: 'Sleep',
  stress: 'Stress',
};

function VitalsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab') as SectionKey | null;
  const [section, setSectionState] = useState<SectionKey>(
    rawTab && SECTIONS.some((s) => s.key === rawTab) ? rawTab : 'overview'
  );
  const setSection = (key: SectionKey) => {
    setSectionState(key);
    router.replace(`/vitals?tab=${key}`, { scroll: false });
  };

  const [vitals, setVitals] = useState<VitalsResult | null>(null);
  const intelligence = useIntelligence();
  const [loading, setLoading] = useState(true);
  const [trendDays, setTrendDays] = useState(7);
  const [trendMetric, setTrendMetric] = useState<TrendKey>('readiness');
  const [explain, setExplain] = useState<ScoreKey | null>(null);

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

  usePlanAutoRefresh(fetchScores);

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
  const attribution = vitals?.attribution ?? null;

  const explainAttribution: ScoreAttribution | null =
    explain && attribution ? attribution[explain] : null;

  /** Compact score header: value + What Changed arrow + baseline phrase + confidence. */
  const scoreMeta = (key: ScoreKey) => {
    const a = attribution?.[key];
    if (!a) return null;
    return (
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <ChangeArrow direction={a.changeVsYesterday.direction} deltaPts={a.changeVsYesterday.totalDelta} />
        {a.vsBaseline.phrase && <span className="text-[10px] text-zinc-500">{a.vsBaseline.phrase}</span>}
        <ConfidenceChip level={a.confidence.level} reason={a.confidence.reason} />
      </div>
    );
  };

  const whatChangedLine = (key: ScoreKey) => {
    const reason = attribution?.[key]?.changeVsYesterday.biggestReason;
    return reason ? <p className="mt-1 text-[11px] text-zinc-500">{reason}</p> : null;
  };

  // ── Cards (shared across sections) ─────────────────────────────────────────

  const readinessHero = (
    <div className="glass-card h-full p-5 sm:p-6 lg:p-7">
      <div className="flex h-full flex-col items-center justify-center gap-6 sm:flex-row sm:gap-8">
        <button type="button" onClick={() => setExplain('readiness')} className="shrink-0" title="Tap to see why">
          <ProgressRing
            progress={readinessScore ?? 0}
            size={176}
            strokeWidth={13}
            color={ringColor(readinessScore)}
            value={readinessScore !== null ? String(readinessScore) : '--'}
            label="READINESS"
            valueClassName={cn('text-5xl font-extrabold', scoreTextColor(readinessScore))}
            labelClassName="text-[10px] font-semibold tracking-[0.16em] text-zinc-500"
          />
        </button>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Today&apos;s capacity</p>
          {guidance && (
            <span
              className={cn(
                'mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold uppercase tracking-wide',
                guidance.className
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {guidance.label}
            </span>
          )}
          <h2 className="mt-3 text-xl font-bold leading-snug text-zinc-100 sm:text-2xl">
            {vitals?.guidance.reason ?? 'Sync your health data to see how ready your body is today'}
          </h2>
          <div className="mt-2 flex justify-center sm:justify-start">{scoreMeta('readiness')}</div>
          {readinessScore !== null && (vitals?.readiness.drivers.length ?? 0) > 0 && (
            <ul className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              {vitals!.readiness.drivers.map((d) => (
                <li key={d} className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-[11px] text-zinc-400 ring-1 ring-white/[0.05]">{d}</li>
              ))}
            </ul>
          )}
          {readinessScore === null && (
            <p className="mt-2 text-[12px] text-zinc-500">
              Sync a few days of health data from the ArogyaM iOS app and your readiness score will show up here.
            </p>
          )}
          {readinessScore !== null && (
            <button
              type="button"
              onClick={() => setExplain('readiness')}
              className="mt-4 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
            >
              Why this score? →
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const strainCard = (
    <button type="button" onClick={() => setExplain('strain')} className="glass-card h-full w-full p-4 text-left transition-colors hover:bg-white/[0.03]">
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4 text-orange-400" />
        <span className="text-[13px] font-medium text-zinc-300">Strain</span>
      </div>
      <p className={cn('mt-2 text-3xl font-bold', vitals?.strain.score !== null ? 'text-orange-400' : 'text-zinc-500')}>
        {vitals?.strain.score ?? '--'}
      </p>
      {scoreMeta('strain')}
      {whatChangedLine('strain')}
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
    </button>
  );

  const performanceStrainCard = (
    <div className="glass-card min-h-[280px] p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Flame className="h-5 w-5 text-orange-400" />
        <h2 className="text-sm font-semibold text-zinc-200">Strain</h2>
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-[300px_minmax(0,1fr)]">
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl bg-orange-500/[0.04] p-5 text-center">
          <ProgressRing
            progress={vitals?.strain.score ?? 0}
            size={168}
            strokeWidth={13}
            color="#fb923c"
            value={vitals?.strain.score !== null && vitals?.strain.score !== undefined ? String(vitals.strain.score) : '--'}
            label="STRAIN"
            valueClassName={cn('text-5xl font-extrabold', vitals?.strain.score !== null ? 'text-orange-400' : 'text-zinc-500')}
            labelClassName="text-[10px] font-semibold tracking-[0.16em] text-zinc-500"
          />
          <div className="mt-4">{scoreMeta('strain')}{whatChangedLine('strain')}</div>
        </div>

        <div className="rounded-2xl bg-white/[0.02] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-400">Good pointers</p>
          {attribution?.strain ? (
            <div className="mt-4 space-y-5">
              <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {[...attribution.strain.contributions, ...attribution.strain.penalties].map((point) => (
                  <div key={point.key} className="rounded-xl bg-white/[0.035] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[12px] font-medium text-zinc-200">{point.label}</span>
                      {point.contributionPts !== 0 && (
                        <span className={cn('shrink-0 text-[11px] font-semibold', point.contributionPts > 0 ? 'text-emerald-400' : 'text-rose-400')}>
                          {point.contributionPts} pts
                        </span>
                      )}
                    </div>
                    {point.note && <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{point.note}</p>}
                  </div>
                ))}
              </div>
              {attribution.strain.changeVsYesterday.byComponent.length > 0 && (
                <div className="rounded-xl bg-white/[0.035] px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Changes since yesterday</p>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
                    {attribution.strain.changeVsYesterday.byComponent.map((point) => (
                      <span key={point.key} className="text-[11px] text-zinc-400">
                        {point.label}{' '}
                        <strong className={point.deltaPts >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {point.deltaPts > 0 ? '+' : ''}{point.deltaPts} pts
                        </strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {attribution.strain.fastestLever && (
                <div className="rounded-xl bg-emerald-500/[0.05] px-4 py-3">
                  <span className="text-[12px] font-medium text-emerald-300">Fastest lever: {attribution.strain.fastestLever.label}</span>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{attribution.strain.fastestLever.note}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-[12px] text-zinc-500">Activity pointers will appear as your movement data comes in.</p>
          )}
        </div>
      </div>
    </div>
  );

  const sleepCard = (
    <button type="button" onClick={() => setExplain('sleep')} className="glass-card h-full w-full p-4 text-left transition-colors hover:bg-white/[0.03]">
      <div className="flex items-center gap-2">
        <Moon className="h-4 w-4 text-indigo-400" />
        <span className="text-[13px] font-medium text-zinc-300">Sleep</span>
      </div>
      <p className={cn('mt-2 text-3xl font-bold', vitals?.sleep.score !== null ? 'text-indigo-400' : 'text-zinc-500')}>
        {vitals?.sleep.score ?? '--'}
      </p>
      {scoreMeta('sleep')}
      {whatChangedLine('sleep')}
      <div className="mt-2 space-y-1">
        {(vitals?.sleep.components ?? []).map((c) => (
          <p key={c.key} className="text-[11px] text-zinc-500">{c.note ?? c.label}</p>
        ))}
        {vitals?.sleep.score === null && (
          <p className="text-[11px] text-zinc-500">No sleep recorded for last night.</p>
        )}
      </div>
    </button>
  );

  const stressCard = (
    <button type="button" onClick={() => setExplain('stress')} className="glass-card h-full w-full p-4 text-left transition-colors hover:bg-white/[0.03]">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-pink-400" />
        <span className="text-[13px] font-medium text-zinc-300">Stress</span>
        <span className="text-[10px] text-zinc-600">estimate</span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className={cn('text-3xl font-bold capitalize', vitals?.stress.level ? STRESS_STYLES[vitals.stress.level] : 'text-zinc-500')}>
          {vitals?.stress.level ?? '--'}
        </p>
        {vitals?.stress.score !== null && vitals?.stress.score !== undefined && (
          <p className="text-sm font-semibold text-zinc-500">{vitals.stress.score}/100</p>
        )}
      </div>
      {scoreMeta('stress')}
      {whatChangedLine('stress')}
      <div className="mt-2 space-y-1">
        {(vitals?.stress.components ?? []).map((c) => (
          <p key={c.key} className="text-[11px] text-zinc-500">{c.note ?? c.label}</p>
        ))}
        {vitals?.stress.level === null && (
          <p className="text-[11px] text-zinc-500">Needs a few days of heart data.</p>
        )}
      </div>
    </button>
  );

  const recoveryPointers = (key: 'sleep' | 'stress') => {
    const details = attribution?.[key];
    if (!details) {
      return <p className="mt-3 text-[12px] text-zinc-500">Pointers will appear as your recovery data comes in.</p>;
    }
    return (
      <div className="mt-4 space-y-5">
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {[...details.contributions, ...details.penalties].map((point) => (
            <div key={point.key} className="rounded-xl bg-white/[0.035] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] font-medium text-zinc-200">{point.label}</span>
                {point.contributionPts !== 0 && (
                  <span className={cn('shrink-0 text-[11px] font-semibold', point.contributionPts > 0 ? 'text-emerald-400' : 'text-rose-400')}>
                    {point.contributionPts} pts
                  </span>
                )}
              </div>
              {point.note && <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{point.note}</p>}
            </div>
          ))}
        </div>
        {details.changeVsYesterday.byComponent.length > 0 && (
          <div className="rounded-xl bg-white/[0.035] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Changes since yesterday</p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
              {details.changeVsYesterday.byComponent.map((point) => (
                <span key={point.key} className="text-[11px] text-zinc-400">
                  {point.label}{' '}
                  <strong className={point.deltaPts >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {point.deltaPts > 0 ? '+' : ''}{point.deltaPts} pts
                  </strong>
                </span>
              ))}
            </div>
          </div>
        )}
        {details.fastestLever && (
          <div className="rounded-xl bg-emerald-500/[0.05] px-4 py-3">
            <span className="text-[12px] font-medium text-emerald-300">Fastest lever: {details.fastestLever.label}</span>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{details.fastestLever.note}</p>
          </div>
        )}
      </div>
    );
  };

  const recoverySleepCard = (
    <div className="glass-card min-h-[280px] p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Moon className="h-5 w-5 text-indigo-400" />
        <h2 className="text-sm font-semibold text-zinc-200">Sleep</h2>
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-[300px_minmax(0,1fr)]">
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl bg-indigo-500/[0.045] p-5 text-center">
          <ProgressRing
            progress={vitals?.sleep.score ?? 0}
            size={168}
            strokeWidth={13}
            color="#818cf8"
            value={vitals?.sleep.score !== null && vitals?.sleep.score !== undefined ? String(vitals.sleep.score) : '--'}
            label="SLEEP"
            valueClassName={cn('text-5xl font-extrabold', vitals?.sleep.score !== null ? 'text-indigo-400' : 'text-zinc-500')}
            labelClassName="text-[10px] font-semibold tracking-[0.16em] text-zinc-500"
          />
          <div className="mt-4">{scoreMeta('sleep')}{whatChangedLine('sleep')}</div>
        </div>
        <div className="rounded-2xl bg-white/[0.02] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-400">Good pointers</p>
          {recoveryPointers('sleep')}
        </div>
      </div>
    </div>
  );

  const recoveryStressCard = (
    <div className="glass-card min-h-[280px] p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-pink-400" />
        <h2 className="text-sm font-semibold text-zinc-200">Stress</h2>
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_300px]">
        <div className="order-2 rounded-2xl bg-white/[0.02] p-5 md:order-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-400">Good pointers</p>
          {recoveryPointers('stress')}
        </div>
        <div className="order-1 flex min-h-[300px] flex-col items-center justify-center rounded-2xl bg-emerald-500/[0.035] p-5 text-center md:order-2">
          <ProgressRing
            progress={vitals?.stress.score ?? 0}
            size={168}
            strokeWidth={13}
            color={vitals?.stress.level === 'low' ? '#34d399' : vitals?.stress.level === 'moderate' ? '#fbbf24' : '#fb7185'}
            value={vitals?.stress.score !== null && vitals?.stress.score !== undefined ? String(vitals.stress.score) : '--'}
            label="STRESS"
            valueClassName={cn('text-5xl font-extrabold', vitals?.stress.level ? STRESS_STYLES[vitals.stress.level] : 'text-zinc-500')}
            labelClassName="text-[10px] font-semibold tracking-[0.16em] text-zinc-500"
          />
          <div className="mt-4">{scoreMeta('stress')}{whatChangedLine('stress')}</div>
        </div>
      </div>
    </div>
  );

  const performanceTrend = (metricKey: TrendKey, label: string, color: string) => {
    const data = (vitals?.trends ?? [])
      .slice(-14)
      .map((t) => ({ date: t.date, value: t[metricKey] }))
      .filter((p): p is { date: string; value: number } => p.value !== null);
    if (data.length < 2) return null;
    return (
      <section className="glass-card p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-4 w-4" style={{ color }} />
          <h3 className="text-[13px] font-medium text-zinc-300">{label} · 14 days</h3>
        </div>
        <div className="mt-4">
          <MetricChart
            data={data}
            color={color}
            gradientId={`vitals-performance-${metricKey}`}
            height={260}
            showGrid={false}
          />
        </div>
      </section>
    );
  };

  const arogyamAge = vitals?.arogyamAge ?? null;
  const ageDelta = arogyamAge?.delta ?? null;
  const ageAccent =
    ageDelta === null ? 'text-zinc-500'
    : ageDelta <= -1 ? 'text-emerald-400'
    : ageDelta < 1 ? 'text-amber-400'
    : 'text-rose-400';
  const agePhrase =
    arogyamAge?.age === null || ageDelta === null ? null
    : ageDelta <= -1 ? `${Math.abs(ageDelta)} years younger than your calendar age of ${arogyamAge!.chronologicalAge}`
    : ageDelta < 1 ? `right around your calendar age of ${arogyamAge!.chronologicalAge}`
    : `${ageDelta} years older than your calendar age of ${arogyamAge!.chronologicalAge}`;

  const arogyamAgeCard = (
    <div className="glass-card p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Hourglass className="h-5 w-5 text-emerald-400" />
        <h2 className="text-sm font-semibold text-zinc-200">ArogyaM Age</h2>
        <span className="text-[10px] text-zinc-600">estimate</span>
        {arogyamAge && arogyamAge.age !== null && (
          <span className="ml-auto rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium capitalize text-zinc-400">
            {arogyamAge.confidence} confidence
          </span>
        )}
      </div>
      {arogyamAge && arogyamAge.age !== null ? (
        <div className="mt-4 grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="flex flex-col items-center justify-center rounded-2xl bg-emerald-500/[0.04] p-5 text-center">
            <p className={cn('text-6xl font-extrabold tabular-nums', ageAccent)}>{arogyamAge.age}</p>
            <p className="mt-1 text-[10px] font-semibold tracking-[0.16em] text-zinc-500">AROGYAM AGE</p>
            {agePhrase && <p className="mt-3 text-[12px] leading-relaxed text-zinc-400">{agePhrase}</p>}
          </div>
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {arogyamAge.components.map((c) => (
                <div key={c.key} className="rounded-xl bg-white/[0.035] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12px] font-medium text-zinc-200">{c.label}</span>
                    {c.yearsDelta !== null && c.yearsDelta !== 0 && (
                      <span className={cn('shrink-0 text-[11px] font-semibold', c.yearsDelta < 0 ? 'text-emerald-400' : 'text-rose-400')}>
                        {c.yearsDelta > 0 ? '+' : ''}{c.yearsDelta} yrs
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{c.note}</p>
                </div>
              ))}
            </div>
            {arogyamAge.bestLever && (
              <div className="rounded-xl bg-emerald-500/[0.05] px-4 py-3">
                <span className="text-[12px] font-medium text-emerald-300">Fastest lever: {arogyamAge.bestLever.label}</span>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{arogyamAge.bestLever.note}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-[12px] text-zinc-500">
          {arogyamAge?.missingReason ?? 'ArogyaM Age needs a bit of profile and health data first.'}
        </p>
      )}
    </div>
  );

  const habitInsightsCard = (
    <div className="glass-card p-4 lg:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookHeart className="h-4 w-4 text-emerald-400" />
          <span className="text-[13px] font-medium text-zinc-300">Habit insights</span>
        </div>
        {(vitals?.insights.length ?? 0) > 0 && (
          <Link
            href="/food"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10"
          >
            <Utensils className="h-3 w-3" />
            Log habits on the Food page
          </Link>
        )}
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
              <span>
                {ins.text}{' '}
                <span className="text-[10px] text-zinc-600">({ins.sampleWith + ins.sampleWithout} days)</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center px-4 py-8 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
            <BookHeart className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="mt-3 text-[13px] font-medium text-zinc-300">Log habits consistently to uncover your personal patterns.</p>
          <p className="mt-1 max-w-md text-[11px] text-zinc-500">Give it a couple of weeks and we&apos;ll show how your habits relate to sleep and readiness.</p>
          <Link
            href="/food"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/15"
          >
            <Utensils className="h-3.5 w-3.5" />
            Log habits on Food
          </Link>
        </div>
      )}
    </div>
  );

  const trendsCard = (
    <div className="glass-card p-5 lg:p-6">
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
            height={360}
          />
        ) : (
          <p className="py-8 text-center text-[12px] text-zinc-500">
            Not enough data yet. Keep syncing and your {TREND_METRICS.find((m) => m.key === trendMetric)?.label.toLowerCase()} trend will fill in.
          </p>
        )}
      </div>
    </div>
  );

  return (
    <DashboardPageShell
      title="Vitals"
      subtitle={`How your body is doing today · ${formatDate(getToday())}`}
      icon={VitalsIcon}
    >
      {loading ? (
        <div className="mx-auto mt-4 w-full max-w-[1680px] space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="mx-auto mt-4 w-full max-w-[1680px] space-y-4 pb-8">
          {/* Section tab bar */}
          <div className="-mx-4 sm:mx-0">
            <div className="flex gap-2 overflow-x-auto hide-scrollbar px-4 sm:px-0 lg:flex-wrap lg:overflow-visible">
              {SECTIONS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSection(s.key)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-medium transition-colors',
                    section === s.key
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
                  )}
                >
                  <s.icon className="h-4 w-4" />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Overview ── */}
          {section === 'overview' && (
            <>
              <AnomaliesCallout data={intelligence} />
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)] xl:items-stretch">
                {readinessHero}
                <div className="flex h-full flex-col gap-4">
                  <PriorityCard data={intelligence} />
                  <BodySummaryLine data={intelligence} />
                </div>
              </div>
              {arogyamAgeCard}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <HealthScoreCard data={intelligence} />
                <GoalScoreCard data={intelligence} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {strainCard}
                {sleepCard}
                {stressCard}
              </div>
            </>
          )}

          {/* ── Recovery ── */}
          {section === 'recovery' && (
            <>
              {recoverySleepCard}
              {recoveryStressCard}
              {performanceTrend('hrvSdnnMs', 'HRV', '#2dd4bf')}
              {performanceTrend('restingHeartRate', 'Resting HR', '#f87171')}
              <p className="px-1 text-center text-[10px] text-zinc-600">
                Recovery trends sharpen with more history; wellness estimates only, not medical advice.
              </p>
            </>
          )}

          {/* ── Performance ── */}
          {section === 'performance' && (
            <>
              {performanceStrainCard}
              {performanceTrend('strain', 'Strain', '#fb923c')}
              {performanceTrend('vo2Max', 'VO₂ Max', '#38bdf8')}
              <p className="px-1 text-center text-[10px] text-zinc-600">
                Trends sharpen with more history; wellness estimates only, not medical advice.
              </p>
            </>
          )}

          {/* ── Insights ── */}
          {section === 'insights' && (
            <>
              <TriggersPanel data={intelligence} />
              <TimelinePanel data={intelligence} />
              <ConsistencyStrip data={intelligence} />
              {habitInsightsCard}
            </>
          )}

          {/* ── Predictions ── */}
          {section === 'predictions' && (
            <>
              <PredictionsSection data={intelligence} />
              <p className="px-1 text-center text-[10px] text-zinc-600">
                Predictions sharpen with more history and are wellness estimates, not medical advice.
              </p>
            </>
          )}

          {/* ── Trends ── */}
          {section === 'trends' && trendsCard}

          {section !== 'performance' && section !== 'recovery' && section !== 'predictions' && (
            <p className="px-1 text-center text-[10px] text-zinc-600">
              Vitals scores are wellness estimates based on your personal trends. They do not detect, diagnose, or treat any medical condition.
            </p>
          )}
        </div>
      )}

      <ScoreExplainModal
        open={explain !== null}
        onClose={() => setExplain(null)}
        title={explain ? SCORE_TITLES[explain] : ''}
        attribution={explainAttribution}
      />
    </DashboardPageShell>
  );
}

export default function VitalsPage() {
  return (
    <Suspense fallback={<div className="mt-4 space-y-4"><CardSkeleton /><CardSkeleton /></div>}>
      <VitalsPageInner />
    </Suspense>
  );
}
