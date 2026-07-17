'use client';

// ============================================
// Coach › Overview - WHOOP-style Daily Outlook
// ============================================
// Live score dials come straight from /api/scores; the AI briefing (outlook)
// comes from /api/ai/daily-plan/overview and reads the user's whole history.

import { useCallback, useState } from 'react';
import {
  Activity, Droplets, Dumbbell, Flame, Footprints, Loader2, Moon,
  Scale, Sparkles, TriangleAlert, Waves,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/useUser';
import { showToast } from '@/components/ui/Toast';
import ProgressRing from '@/components/ui/ProgressRing';
import { usePlanAutoRefresh } from '@/hooks/usePlanAutoRefresh';
import GoalReachedBanner from './GoalReachedBanner';
import WeeklyTab from './WeeklyTab';
import { PriorityCard, useIntelligence } from '@/app/(dashboard)/vitals/IntelligencePanels';
import type { VitalsResult } from '@/lib/scores';
import type { DailyPlanData } from '@/types';

type Outlook = NonNullable<DailyPlanData['outlook']>;

// ─── Shared score styling (mirrors /vitals) ──────────────────────────────────

const GUIDANCE_STYLES: Record<string, { label: string; className: string }> = {
  push: { label: 'Push today', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  maintain: { label: 'Maintain', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  recover: { label: 'Take it easier', className: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  rest: { label: 'Rest up', className: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
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

const STRESS_STYLES: Record<string, string> = {
  low: 'text-emerald-400',
  moderate: 'text-amber-400',
  high: 'text-rose-400',
};

const FOCUS_ICONS: Record<string, LucideIcon> = {
  sleep: Moon,
  food: Flame,
  water: Droplets,
  workout: Dumbbell,
  steps: Footprints,
  stress: Waves,
  weight: Scale,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function OverviewTab() {
  const { user } = useUser();
  const hasApiKey = user?.hasOpenAiKey;
  const intelligence = useIntelligence();

  const [vitals, setVitals] = useState<VitalsResult | null>(null);
  const [outlook, setOutlook] = useState<Outlook | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    try {
      const [scoresRes, outlookRes] = await Promise.all([
        fetch('/api/scores', { credentials: 'include' }),
        fetch('/api/ai/daily-plan/overview', { credentials: 'include' }),
      ]);
      const scoresJson: { success: boolean; data?: VitalsResult } = await scoresRes.json();
      const outlookJson: { success: boolean; data?: { outlook?: Outlook | null } } = await outlookRes.json();
      if (scoresJson.success && scoresJson.data) setVitals(scoresJson.data);
      if (outlookJson.success) setOutlook(outlookJson.data?.outlook ?? null);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  usePlanAutoRefresh(load);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/daily-plan/overview', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const json: { success: boolean; data?: { outlook?: Outlook }; error?: string } = await res.json();
      if (json.success) {
        if (json.data?.outlook) setOutlook(json.data.outlook);
        showToast('Your outlook is ready', 'success');
      } else {
        const msg = json.error ?? 'Failed to write your outlook';
        showToast(msg.toLowerCase().includes('api key') ? 'Add your OpenAI key in Settings.' : msg, 'error');
      }
    } catch {
      showToast('Failed to write your outlook', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const readiness = vitals?.readiness.score ?? null;
  const guidance = outlook?.today?.effort ?? vitals?.guidance.band ?? null;
  const guidanceStyle = guidance ? GUIDANCE_STYLES[guidance] : null;

  const dailyOutlook = outlook ? (
    <div className="dashboard-unified-card rounded-2xl border p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Daily Outlook</p>
        {hasApiKey && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors disabled:opacity-50"
          >
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {generating ? 'Writing…' : 'Regenerate'}
          </button>
        )}
      </div>

      {outlook.recoverySummary && (
        <p className="text-[15px] leading-relaxed text-zinc-200">{outlook.recoverySummary}</p>
      )}

      {outlook.today?.note && (
        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-semibold text-text-primary">Today</span>
            {outlook.today.bestWindow && (
              <span className="ml-auto text-xs text-zinc-500">{outlook.today.bestWindow}</span>
            )}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{outlook.today.note}</p>
          {Array.isArray(outlook.today.activities) && outlook.today.activities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {outlook.today.activities.map((activity, i) => (
                <span key={i} className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-xs font-medium text-emerald-300">
                  {activity}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {Array.isArray(outlook.watchOuts) && outlook.watchOuts.length > 0 && (
        <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 text-amber-400">
            <TriangleAlert className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Worth watching</span>
          </div>
          <ul className="mt-2 space-y-1">
            {outlook.watchOuts.map((w, i) => (
              <li key={i} className="flex gap-2 text-sm text-zinc-300">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(outlook.focus) && outlook.focus.length > 0 && (
        <div className="mt-3 space-y-3">
          {outlook.focus.map((entry, i) => {
            const Icon = FOCUS_ICONS[entry.metric ?? ''] ?? Activity;
            return (
              <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-emerald-400" />
                  {entry.headline && (
                    <span className="text-sm font-semibold text-text-primary">{entry.headline}</span>
                  )}
                </div>
                {entry.note && (
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{entry.note}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(outlook.tonight?.note || outlook.tonight?.sleepNeedHours) && (
        <div className="mt-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4">
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-indigo-300" />
            <span className="text-sm font-semibold text-text-primary">Tonight</span>
            <span className="ml-auto text-xs font-medium text-indigo-300">
              {outlook.tonight.sleepNeedHours ? `${outlook.tonight.sleepNeedHours} h` : ''}
              {outlook.tonight.bedtimeWindow ? ` · in bed ${outlook.tonight.bedtimeWindow}` : ''}
            </span>
          </div>
          {outlook.tonight.note && (
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{outlook.tonight.note}</p>
          )}
        </div>
      )}
    </div>
  ) : (
    !loading && (
      <div className="dashboard-unified-card rounded-2xl border p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between xl:flex-col xl:items-start 2xl:flex-row 2xl:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-200">Your Daily Outlook isn&apos;t written yet</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Ciel reads your recovery, sleep, training and food history, then briefs you on how to run today.
              </p>
            </div>
          </div>
          {hasApiKey && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-emerald-400 disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin text-black" /> : <Sparkles className="h-4 w-4 text-black" />}
              {generating ? 'Writing…' : 'Write my outlook'}
            </button>
          )}
        </div>
      </div>
    )
  );

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-4">
      {/* ── Target-reached nudge (suggest-only) ── */}
      <GoalReachedBanner />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)] xl:items-stretch">
        <WeeklyTab className="xl:h-full" />

        <div className="flex h-full flex-col gap-4">
          {/* ── Today's single best action ── */}
          <PriorityCard data={intelligence} />

          {/* ── Hero: readiness dial + guidance ── */}
          <div className="dashboard-unified-card flex flex-1 flex-col justify-center rounded-2xl border p-5 sm:p-7">
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-10 xl:flex-col xl:gap-5 2xl:flex-row 2xl:gap-8">
                <div className="shrink-0">
                  <ProgressRing
                    progress={readiness ?? 0}
                    size={176}
                    strokeWidth={13}
                    color={ringColor(readiness)}
                    bgColor="stroke-white/[0.05]"
                    value={readiness !== null ? String(Math.round(readiness)) : '––'}
                    label="READINESS"
                    valueClassName={cn('text-5xl font-extrabold tracking-tight', scoreTextColor(readiness))}
                    labelClassName="text-[10px] font-semibold tracking-[0.16em] text-zinc-500"
                  />
                </div>

                <div className="flex min-w-0 flex-1 flex-col items-center gap-3 text-center sm:items-start sm:text-left xl:items-center xl:text-center 2xl:items-start 2xl:text-left">
                  {guidanceStyle && (
                    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide', guidanceStyle.className)}>
                      {guidanceStyle.label}
                    </span>
                  )}
                  <h2 className="text-xl font-bold leading-snug text-text-primary sm:text-2xl">
                    {outlook?.headline || (readiness !== null
                      ? vitals?.guidance.reason ?? 'Your day, read from your recovery'
                      : 'Sync your health data to unlock your readiness')}
                  </h2>
                  {outlook?.headline && vitals?.guidance.reason && (
                    <p className="text-sm leading-relaxed text-zinc-400">{vitals.guidance.reason}</p>
                  )}
                  {!outlook && vitals?.readiness.drivers && vitals.readiness.drivers.length > 0 && (
                    <p className="text-sm leading-relaxed text-zinc-400">{vitals.readiness.drivers.join(' · ')}</p>
                  )}
                </div>
              </div>

              {/* Mini dials: strain / sleep / stress */}
              <div className="mt-6 grid grid-cols-3 divide-x divide-white/[0.06] border-t border-white/[0.06] pt-5">
                <div className="flex min-w-0 flex-col items-center gap-1.5 px-2 sm:px-4">
                  <ProgressRing
                    progress={vitals?.strain.score ?? 0} size={64} strokeWidth={6}
                    color="stroke-sky-400" bgColor="stroke-white/[0.05]"
                    value={typeof vitals?.strain.score === 'number' ? String(Math.round(vitals.strain.score)) : '––'}
                    valueClassName="text-sm font-bold text-sky-400"
                  />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Strain</p>
                </div>
                <div className="flex min-w-0 flex-col items-center gap-1.5 px-2 sm:px-4">
                  <ProgressRing
                    progress={vitals?.sleep.score ?? 0} size={64} strokeWidth={6}
                    color="stroke-indigo-400" bgColor="stroke-white/[0.05]"
                    value={typeof vitals?.sleep.score === 'number' ? String(Math.round(vitals.sleep.score)) : '––'}
                    valueClassName="text-sm font-bold text-indigo-400"
                  />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Sleep</p>
                </div>
                <div className="flex min-w-0 flex-col items-center justify-center gap-1.5 px-2 sm:px-4">
                  <p className={cn('flex h-16 items-center text-xl font-bold', vitals?.stress.level ? STRESS_STYLES[vitals.stress.level] : 'text-zinc-500')}>
                    {vitals?.stress.level ? vitals.stress.level.charAt(0).toUpperCase() + vitals.stress.level.slice(1) : '––'}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Stress</p>
                </div>
              </div>
          </div>
        </div>
      </div>

      {dailyOutlook}
    </div>
  );
}
