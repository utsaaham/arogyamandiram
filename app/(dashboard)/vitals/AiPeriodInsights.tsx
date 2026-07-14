'use client';

// ============================================
// Vitals › Insights - AI period insights (yesterday / week / month / year)
// ============================================
// First UI for the existing /api/ai/recommendations type=insights endpoint;
// eligibility comes from /api/ai/insights-eligibility, and locked periods say
// plainly what unlocks them.

import { useCallback, useEffect, useState } from 'react';
import { Sparkles, Loader2, Lock } from 'lucide-react';
import api from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { showToast } from '@/components/ui/Toast';

type Period = 'yesterday' | 'week' | 'month' | 'year';

interface AiInsight {
  title?: string;
  description?: string;
  type?: 'success' | 'warning' | 'info' | 'tip';
  metric?: string;
  value?: string;
  priority?: 'high' | 'medium' | 'low';
}

const PERIODS: Array<{ key: Period; label: string; unlockNote: string }> = [
  { key: 'yesterday', label: 'Yesterday', unlockNote: 'Log something yesterday to unlock' },
  { key: 'week', label: 'Week', unlockNote: 'Unlocks after ~7 days of logging' },
  { key: 'month', label: 'Month', unlockNote: 'Unlocks after ~14 days of logging' },
  { key: 'year', label: 'Year', unlockNote: 'Unlocks after ~60 days of logging' },
];

const TYPE_STYLES: Record<string, string> = {
  success: 'border-emerald-500/30 bg-emerald-500/[0.05]',
  warning: 'border-amber-500/30 bg-amber-500/[0.05]',
  info: 'border-cyan-500/30 bg-cyan-500/[0.05]',
  tip: 'border-violet-500/30 bg-violet-500/[0.05]',
};

export default function AiPeriodInsights() {
  const [eligibility, setEligibility] = useState<Record<Period, boolean> | null>(null);
  const [period, setPeriod] = useState<Period>('yesterday');
  const [insights, setInsights] = useState<AiInsight[] | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    api.getInsightsEligibility().then((res) => {
      if (res.success && res.data) setEligibility(res.data as Record<Period, boolean>);
    }).catch(() => {});
  }, []);

  const generate = useCallback(async (p: Period) => {
    setGenerating(true);
    setInsights(null);
    try {
      const res = await api.getInsights({ period: p });
      if (res.success && res.data?.insights) {
        setInsights(res.data.insights as AiInsight[]);
      } else if (!res.success) {
        showToast(res.error || 'Could not generate insights', 'error');
      }
    } catch {
      showToast('Could not generate insights', 'error');
    } finally {
      setGenerating(false);
    }
  }, []);

  return (
    <div className="glass-card p-4 lg:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <span className="text-[13px] font-medium text-zinc-300">AI insights</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {PERIODS.map((p) => {
          const unlocked = eligibility?.[p.key] ?? false;
          return (
            <button
              key={p.key}
              type="button"
              disabled={!unlocked}
              title={unlocked ? undefined : p.unlockNote}
              onClick={() => setPeriod(p.key)}
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors',
                period === p.key && unlocked
                  ? 'bg-violet-500/15 text-violet-300'
                  : unlocked
                    ? 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200'
                    : 'cursor-not-allowed text-zinc-600'
              )}
            >
              {!unlocked && <Lock className="h-3 w-3" />}
              {p.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => generate(period)}
          disabled={generating || !(eligibility?.[period] ?? false)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-violet-500/15 px-3 py-1 text-[11px] font-semibold text-violet-300 transition-colors hover:bg-violet-500/25 disabled:opacity-50"
        >
          {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {generating ? 'Analyzing…' : 'Generate'}
        </button>
      </div>

      {eligibility && !eligibility.yesterday && !eligibility.week && !eligibility.month && !eligibility.year && (
        <p className="mt-3 text-[12px] text-zinc-500">
          Start logging food, water, sleep or workouts and insights unlock as your history grows.
        </p>
      )}

      {insights && (
        <div className="mt-3 space-y-2">
          {insights.length === 0 && (
            <p className="text-[12px] text-zinc-500">No insights came back for this period.</p>
          )}
          {insights.map((ins, i) => (
            <div key={i} className={cn('rounded-xl border px-3 py-2.5', TYPE_STYLES[ins.type ?? 'info'] ?? TYPE_STYLES.info)}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-zinc-100">{ins.title}</p>
                {ins.value && <p className="shrink-0 text-[11px] font-medium text-zinc-300">{ins.value}</p>}
              </div>
              {ins.description && <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{ins.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
