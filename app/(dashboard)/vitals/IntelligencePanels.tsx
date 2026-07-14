'use client';

// ============================================
// Vitals › intelligence panels — Goal Score card + personal triggers
// ============================================
// Rendered from /api/intelligence (deterministic layer). The Goal Score card
// is tappable like every other score; triggers and correlations carry
// confidence chips from sample counts. Correlation ≠ causation phrasing.

import { useEffect, useState } from 'react';
import {
  Target, Waypoints, Repeat, Zap, History, Sparkles,
  CalendarClock, Gauge, BatteryWarning, BedDouble,
  HeartPulse, TriangleAlert,
} from 'lucide-react';
import api from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import ProgressRing from '@/components/ui/ProgressRing';
import type { ScoreAttribution } from '@/lib/scores';
import type { ScoreComponent } from '@/lib/scores/types';
import ScoreExplainModal, { ChangeArrow, ConfidenceChip } from './ScoreExplainModal';

interface FeatureInsightDto {
  featureKey: string;
  featureLabel: string;
  outcome: 'readiness' | 'sleep';
  delta: number;
  effectSize: number;
  sampleHigh: number;
  sampleLow: number;
  confidence: 'high' | 'medium' | 'low';
  text: string;
}

interface CompoundInsightDto {
  key: string;
  delta: number;
  confidence: 'high' | 'medium' | 'low';
  text: string;
  sampleWith: number;
  sampleWithout: number;
}

export interface IntelligenceDto {
  goal: string;
  goalScore: { score: number | null; components: ScoreComponent[] } | null;
  goalAttribution: ScoreAttribution | null;
  consistency: {
    workoutPct: number | null;
    proteinPct: number | null;
    hydrationPct: number | null;
    sleepPct: number | null;
    weighInPct: number | null;
    windowDays: number;
  };
  correlations: {
    insights: FeatureInsightDto[];
    triggers: FeatureInsightDto[];
    compound: CompoundInsightDto[];
  };
  priority: {
    key: string;
    title: string;
    detail: string;
    why: string;
  } | null;
  bodySummary: { text: string; aiGenerated: boolean } | null;
  timeline: Array<{
    date: string;
    scoreKey: 'readiness' | 'sleep';
    delta: number;
    reason: string | null;
  }>;
  predictions: {
    goalEta: { available: boolean; etaWeeks: number | null; etaDate: string | null; text: string };
    goalConfidence: { level: 'high' | 'medium' | 'low' | null; reason: string };
    burnoutRisk: { level: 'low' | 'moderate' | 'high' | null; factors: string[]; reason: string };
    recoveryForecast: { sleepNeedHours: number | null; text: string };
  } | null;
  anomalies: Array<{ key: string; label: string; note: string }>;
  healthScore: {
    score: number | null;
    monthlyDelta: number | null;
    daysOfData: number;
    components: ScoreComponent[];
  } | null;
  healthAttribution: ScoreAttribution | null;
}

export function useIntelligence() {
  const [data, setData] = useState<IntelligenceDto | null>(null);
  useEffect(() => {
    api.getIntelligence().then((res) => {
      if (res.success && res.data) setData(res.data as unknown as IntelligenceDto);
    }).catch(() => {});
  }, []);
  return data;
}

const GOAL_LABELS: Record<string, string> = {
  lose_fat: 'Lose Fat',
  build_muscle: 'Build Muscle',
  recomp: 'Recomposition',
  improve_fitness: 'Improve Fitness',
  maintain: 'Maintain',
};

export function GoalScoreCard({ data }: { data: IntelligenceDto | null }) {
  const [open, setOpen] = useState(false);
  if (!data) return null;
  const score = data.goalScore?.score ?? null;
  const a = data.goalAttribution;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass-card h-full w-full p-4 text-left transition-colors hover:bg-white/[0.03]"
      >
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-emerald-400" />
          <span className="text-[13px] font-medium text-zinc-300">Goal Score</span>
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-zinc-400">
            {GOAL_LABELS[data.goal] ?? data.goal}
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <p className={cn('text-3xl font-bold', score === null ? 'text-zinc-500' : score >= 67 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-rose-400')}>
            {score ?? '--'}
          </p>
          {a && (
            <ChangeArrow direction={a.changeVsYesterday.direction} deltaPts={a.changeVsYesterday.totalDelta} />
          )}
        </div>
        {a?.vsBaseline.phrase && (
          <p className="mt-0.5 text-[10px] text-zinc-500">{a.vsBaseline.phrase}</p>
        )}
        <div className="mt-2 space-y-1">
          {(data.goalScore?.components ?? []).slice(0, 4).map((c) => (
            <p key={c.key} className="text-[11px] text-zinc-500">{c.note ?? c.label}</p>
          ))}
          {score === null && (
            <p className="text-[11px] text-zinc-500">Log food, water or a workout today and your goal alignment shows up here.</p>
          )}
        </div>
      </button>
      <ScoreExplainModal open={open} onClose={() => setOpen(false)} title="Goal Score" attribution={a} />
    </>
  );
}

export function ConsistencyStrip({ data }: { data: IntelligenceDto | null }) {
  if (!data) return null;
  const items = [
    { label: 'Workouts', pct: data.consistency.workoutPct },
    { label: 'Protein', pct: data.consistency.proteinPct },
    { label: 'Hydration', pct: data.consistency.hydrationPct },
    { label: 'Sleep 7h+', pct: data.consistency.sleepPct },
    { label: 'Weigh-ins', pct: data.consistency.weighInPct },
  ].filter((i) => i.pct !== null);
  if (items.length === 0) return null;

  return (
    <div className="glass-card p-5 lg:p-6">
      <div className="flex items-center gap-2">
        <Repeat className="h-4 w-4 text-cyan-400" />
        <span className="text-[13px] font-medium text-zinc-300">Consistency · last {data.consistency.windowDays} days</span>
      </div>
      <div className="mt-5 grid gap-x-10 gap-y-4 md:grid-cols-2">
        {items.map((i) => (
          <div key={i.label}>
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="font-medium text-zinc-300">{i.label}</span>
              <span className={cn('font-semibold', (i.pct ?? 0) >= 70 ? 'text-emerald-400' : (i.pct ?? 0) >= 40 ? 'text-amber-400' : 'text-zinc-400')}>
                {i.pct}%
              </span>
            </div>
            <progress
              value={i.pct ?? 0}
              max={100}
              className="mt-2 h-2 w-full overflow-hidden rounded-full accent-emerald-400"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function HealthScoreCard({ data }: { data: IntelligenceDto | null }) {
  const [open, setOpen] = useState(false);
  const hs = data?.healthScore;
  if (!hs || hs.score === null) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass-card h-full w-full p-4 text-left transition-colors hover:bg-white/[0.03]"
      >
        <div className="flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-rose-400" />
          <span className="text-[13px] font-medium text-zinc-300">Health Score</span>
          <span className="text-[10px] text-zinc-600">rolling 30 days</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <p className={cn('text-3xl font-bold', hs.score >= 67 ? 'text-emerald-400' : hs.score >= 40 ? 'text-amber-400' : 'text-rose-400')}>
            {hs.score}
            <span className="text-base font-semibold text-zinc-500">/100</span>
          </p>
          {hs.monthlyDelta !== null && hs.monthlyDelta !== 0 && (
            <span className={cn('text-xs font-semibold', hs.monthlyDelta > 0 ? 'text-emerald-400' : 'text-rose-400')}>
              {hs.monthlyDelta > 0 ? '+' : ''}{hs.monthlyDelta} this month
            </span>
          )}
        </div>
        <div className="mt-2 space-y-1">
          {hs.components.slice(0, 3).map((c) => (
            <p key={c.key} className="text-[11px] text-zinc-500">{c.note ?? c.label}</p>
          ))}
        </div>
        <p className="mt-2 text-[11px] font-medium text-emerald-400">Why this score? →</p>
      </button>
      <ScoreExplainModal open={open} onClose={() => setOpen(false)} title="Health Score" attribution={data?.healthAttribution ?? null} />
    </>
  );
}

export function AnomaliesCallout({ data }: { data: IntelligenceDto | null }) {
  const anomalies = data?.anomalies ?? [];
  if (anomalies.length === 0) return null;
  return (
    <div className="glass-card border border-amber-500/30 bg-amber-500/[0.05] p-4">
      <div className="flex items-center gap-2">
        <TriangleAlert className="h-4 w-4 text-amber-400" />
        <span className="text-[13px] font-semibold text-amber-300">Unusual today</span>
      </div>
      <ul className="mt-2 space-y-1">
        {anomalies.map((a) => (
          <li key={a.key} className="text-[12px] text-amber-100/80">{a.note}</li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] text-zinc-500">Far outside your usual range — a signal to notice, not a diagnosis.</p>
    </div>
  );
}

export function PriorityCard({ data }: { data: IntelligenceDto | null }) {
  const p = data?.priority;
  if (!p) return null;
  return (
    <div className="glass-card border border-emerald-500/20 bg-emerald-500/[0.04] p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-emerald-400" />
        <span className="text-[13px] font-semibold text-emerald-300">Today&apos;s best move · {p.title}</span>
      </div>
      <p className="mt-2 text-sm text-zinc-200">{p.detail}</p>
      <p className="mt-1 text-[11px] text-zinc-500">{p.why}</p>
    </div>
  );
}

export function BodySummaryLine({ data }: { data: IntelligenceDto | null }) {
  const s = data?.bodySummary;
  if (!s) return null;
  return (
    <div className="glass-card flex flex-1 flex-col justify-center p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-400" />
        <span className="text-[13px] font-medium text-zinc-300">Today&apos;s body summary</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-200">{s.text}</p>
    </div>
  );
}

export function TimelinePanel({ data }: { data: IntelligenceDto | null }) {
  const events = data?.timeline ?? [];
  if (events.length === 0) return null;
  return (
    <div className="glass-card p-5 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-cyan-400" />
          <span className="text-[13px] font-medium text-zinc-300">This week&apos;s story</span>
          <span className="text-[10px] text-zinc-600">what moved, and why</span>
        </div>
        <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-[10px] font-medium text-cyan-300">{events.length} score changes</span>
      </div>
      <ol className="mt-5 space-y-1">
        {[...events].reverse().map((e, i) => (
          <li key={`${e.date}-${e.scoreKey}-${i}`} className="grid grid-cols-[54px_14px_minmax(0,1fr)] gap-3 py-2">
            <span className="pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <span className={cn('mt-1.5 h-2 w-2 rounded-full', e.delta < 0 ? 'bg-rose-400' : 'bg-emerald-400')} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] font-semibold uppercase tracking-wide text-zinc-300">{e.scoreKey}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', e.delta < 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400')}>
                  {e.delta > 0 ? '↑' : '↓'} {Math.abs(e.delta)}
                </span>
              </div>
              {e.reason && <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{e.reason}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

const RISK_STYLES: Record<string, string> = {
  low: 'text-emerald-400',
  moderate: 'text-amber-400',
  high: 'text-rose-400',
};

export function PredictionsSection({ data }: { data: IntelligenceDto | null }) {
  const p = data?.predictions;
  if (!p) {
    return (
      <div className="glass-card p-4 lg:p-5">
        <p className="text-[12px] text-zinc-500">Predictions unlock as your logging history grows — usually around week 4.</p>
      </div>
    );
  }
  const confidenceColor = p.goalConfidence.level === 'high'
    ? 'text-emerald-400'
    : p.goalConfidence.level === 'medium'
      ? 'text-amber-400'
      : p.goalConfidence.level === 'low'
        ? 'text-rose-400'
        : 'text-zinc-500';
  const sleepNeed = p.recoveryForecast.sleepNeedHours;

  return (
    <div className="space-y-4">
      <section className="glass-card p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-emerald-400" />
          <h2 className="text-[13px] font-medium text-zinc-300">Goal outlook</h2>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="flex min-h-[190px] flex-col justify-center rounded-2xl bg-emerald-500/[0.035] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Goal ETA</p>
            {p.goalEta.available && p.goalEta.etaWeeks !== null ? (
              <p className="mt-3 text-4xl font-bold text-emerald-400">~{Math.round(p.goalEta.etaWeeks)} wk</p>
            ) : (
              <p className="mt-3 text-4xl font-bold text-zinc-500">— —</p>
            )}
            <p className="mt-3 text-[12px] leading-relaxed text-zinc-500">{p.goalEta.text}</p>
          </div>
          <div className="flex min-h-[190px] flex-col justify-center rounded-2xl bg-white/[0.025] p-5">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-cyan-400" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Goal confidence</p>
            </div>
            <p className={cn('mt-3 text-4xl font-bold capitalize', confidenceColor)}>{p.goalConfidence.level ?? '--'}</p>
            <p className="mt-3 text-[12px] leading-relaxed text-zinc-500">{p.goalConfidence.reason}</p>
          </div>
        </div>
      </section>

      <section className="glass-card p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <BedDouble className="h-4 w-4 text-indigo-400" />
          <h2 className="text-[13px] font-medium text-zinc-300">Recovery outlook</h2>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-[300px_minmax(0,1fr)]">
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl bg-indigo-500/[0.045] p-5 text-center">
            <ProgressRing
              progress={sleepNeed === null ? 0 : Math.min(100, Math.round((sleepNeed / 12) * 100))}
              size={168}
              strokeWidth={13}
              color="#818cf8"
              value={sleepNeed === null ? '--' : `${sleepNeed}h`}
              label="SLEEP NEED"
              valueClassName={cn('text-4xl font-extrabold', sleepNeed === null ? 'text-zinc-500' : 'text-indigo-400')}
              labelClassName="text-[10px] font-semibold tracking-[0.16em] text-zinc-500"
            />
            <p className="mt-4 max-w-[240px] text-[11px] leading-relaxed text-zinc-500">{p.recoveryForecast.text}</p>
          </div>
          <div className="flex min-h-[300px] flex-col justify-center rounded-2xl bg-white/[0.025] p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <BatteryWarning className="h-4 w-4 text-amber-400" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Burnout risk · estimate</p>
            </div>
            <p className={cn('mt-4 text-4xl font-bold capitalize', p.burnoutRisk.level ? RISK_STYLES[p.burnoutRisk.level] : 'text-zinc-500')}>
              {p.burnoutRisk.level ?? '--'} risk
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-zinc-400">{p.burnoutRisk.reason}</p>
            {p.burnoutRisk.factors.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {p.burnoutRisk.factors.map((factor) => (
                  <span key={factor} className="rounded-full bg-rose-500/[0.07] px-3 py-1.5 text-[10px] text-rose-300">{factor}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export function TriggersPanel({ data }: { data: IntelligenceDto | null }) {
  if (!data) return null;
  const { triggers, compound } = data.correlations;
  if (triggers.length === 0 && compound.length === 0) {
    return (
      <div className="glass-card p-4 lg:p-5">
        <div className="flex items-center gap-2">
          <Waypoints className="h-4 w-4 text-amber-400" />
          <span className="text-[13px] font-medium text-zinc-300">Personal triggers</span>
        </div>
        <p className="mt-3 text-[12px] text-zinc-500">
          Your triggers unlock around week 3 of logging: the engine needs at least 3 days on each side of a pattern before it says anything.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Waypoints className="h-4 w-4 text-amber-400" />
          <span className="text-[13px] font-medium text-zinc-300">Personal triggers</span>
          <span className="text-[10px] text-zinc-600">what moves your scores</span>
        </div>
        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-300">{triggers.length + compound.length} patterns found</span>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {triggers.map((t) => (
          <article key={`${t.featureKey}-${t.outcome}`} className="rounded-2xl bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{t.featureLabel}</p>
                <span className={cn('text-sm font-bold', t.delta < 0 ? 'text-rose-400' : 'text-emerald-400')}>
                  {t.delta > 0 ? '+' : ''}{t.delta} {t.outcome}
                </span>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-zinc-300">{t.text}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ConfidenceChip level={t.confidence} reason={`${t.sampleHigh + t.sampleLow} days compared`} />
                <span className="text-[10px] text-zinc-600">{t.sampleHigh + t.sampleLow} days · patterns, not causes</span>
              </div>
          </article>
        ))}
        {compound.map((c) => (
          <article key={c.key} className="rounded-2xl bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Combined pattern</p>
                <span className={cn('text-sm font-bold', c.delta < 0 ? 'text-rose-400' : 'text-emerald-400')}>
                  {c.delta > 0 ? '+' : ''}{c.delta} readiness
                </span>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-zinc-300">{c.text}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ConfidenceChip level={c.confidence} reason={`${c.sampleWith + c.sampleWithout} days compared`} />
                <span className="text-[10px] text-zinc-600">combined pattern</span>
              </div>
          </article>
        ))}
      </div>
    </div>
  );
}
