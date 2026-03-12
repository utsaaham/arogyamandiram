'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
  Lightbulb,
  Settings,
  Shield,
} from 'lucide-react';
import DashboardPageShell from '@/components/layout/DashboardPageShell';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useUser } from '@/hooks/useUser';
import api from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Insight {
  title: string;
  description: string;
  type: 'success' | 'warning' | 'info' | 'tip';
  metric?: string;
  value?: string;
}

type InsightPeriod = 'yesterday' | 'week' | 'month' | 'year';
type TabKey = InsightPeriod;

function insightsAgentForPeriod(period: InsightPeriod): 'yesterday' | 'weekly' | 'monthly' | 'yearly' {
  if (period === 'week') return 'weekly';
  if (period === 'month') return 'monthly';
  if (period === 'year') return 'yearly';
  return 'yesterday';
}

const tabs: { key: TabKey; label: string; icon: typeof Sparkles }[] = [
  { key: 'yesterday', label: "Yesterday's insights", icon: TrendingUp },
  { key: 'week', label: 'Week insights', icon: TrendingUp },
  { key: 'month', label: 'Month insights', icon: TrendingUp },
  { key: 'year', label: 'Year insights', icon: TrendingUp },
];

const insightIcons = {
  success: CheckCircle2,
  warning: AlertCircle,
  info: Info,
  tip: Lightbulb,
};

const insightColors = {
  success: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20',
  // Caution / under target
  warning: 'text-amber-400 bg-amber-500/5 border-amber-500/20',
  // Neutral informational insights
  info: 'text-zinc-300 bg-zinc-900/50 border-zinc-800',
  // Positive coaching / tips
  tip: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20',
};

export default function AiInsightsPage() {
  const { user, loading: userLoading } = useUser();
  const [activeTab, setActiveTab] = useState<TabKey>('yesterday');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [insightsGeneratedAt, setInsightsGeneratedAt] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<{ yesterday: boolean; week: boolean; month: boolean; year: boolean } | null>(null);

  const hasApiKey = user?.hasOpenAiKey;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api.getInsightsEligibility().then((res) => {
      if (cancelled || !res.success || !res.data) return;
      const data = res.data as { yesterday: boolean; week: boolean; month: boolean; year: boolean };
      setEligibility({
        yesterday: data.yesterday ?? true,
        week: data.week ?? false,
        month: data.month ?? false,
        year: data.year ?? false,
      });
    });
    return () => { cancelled = true; };
  }, [user]);

  const insightPeriod: InsightPeriod = activeTab;

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getInsights({ period: insightPeriod });
      if (res.success && res.data) {
        const data = res.data as { insights?: unknown; generatedAt?: unknown; debugLog?: unknown };
        const parsedInsights = Array.isArray(data.insights) ? (data.insights as Insight[]) : [];
        setInsights(parsedInsights);
        setInsightsGeneratedAt(
          typeof data.generatedAt === 'string' ? data.generatedAt : new Date().toISOString()
        );
        if (process.env.NEXT_PUBLIC_DEBUG_MODE === 'true' && data.debugLog != null) {
          fetch('/api/debug-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              page: 'insights',
              agent: insightsAgentForPeriod(insightPeriod),
              log: data.debugLog,
            }),
            credentials: 'include',
          }).catch(() => {});
        }
      } else {
        const rawError = res.error || 'Failed to fetch insights';
        const normalized = rawError.toLowerCase();

        if (normalized.includes('openai api key required')) {
          setError('Connect your OpenAI API key in Settings → API Keys to generate insights.');
        } else if (
          normalized.includes('invalid') &&
          normalized.includes('api key')
        ) {
          setError('Your OpenAI API key looks invalid or expired. Update it in Settings → API Keys.');
        } else if (
          normalized.includes('unsupported state') ||
          normalized.includes('unable to authenticate') ||
          normalized.includes('unauthorized')
        ) {
          setError('OpenAI could not authenticate your key. Double-check the key in Settings → API Keys.');
        } else {
          setError(rawError);
        }
      }
    } catch {
      setError('Failed to fetch insights');
    } finally {
      setLoading(false);
    }
  };

  const canGenerateInsights =
    hasApiKey &&
    ((insightPeriod === 'yesterday' && (eligibility?.yesterday ?? false)) ||
      (insightPeriod === 'week' && (eligibility?.week ?? true)) ||
      (insightPeriod === 'month' && (eligibility?.month ?? false)) ||
      (insightPeriod === 'year' && (eligibility?.year ?? false)));

  const handleGenerate = () => {
    setError(null);
    fetchInsights();
  };

  const formatGeneratedDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  if (userLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10" />
        <CardSkeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="insights-page animate-fade-in flex flex-col max-lg:mobile-dash cards-stack-desktop">
      <DashboardPageShell
        title="Insights"
        subtitle="Yesterday, weekly, monthly, and yearly insights from your data"
        icon={Sparkles}
        iconClassName="text-emerald-400"
        mobileVariant="card"
      />

      {/* No API Key Warning */}
      {!hasApiKey && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          <div>
            <p className="text-sm font-medium text-text-primary">Connect your OpenAI API key</p>
            <p className="mt-1 text-xs text-text-muted">
              Insights and workout plans use your own OpenAI API key. Add a key in
              Settings to turn these cards on. Your key is encrypted and stored securely.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-black hover:bg-emerald-400"
              >
                <Settings className="h-3.5 w-3.5" />
                Open Settings
              </Link>
              <span className="text-[11px] text-text-muted">
                You can remove or rotate your key at any time.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs: Year / Month / Week / Yesterday insights */}
      <div className="mt-4 w-full">
        <div
          className="mobile-fade-up mobile-dash-px lg:px-0 w-full"
          style={{ animationDelay: '80ms' }}
        >
      <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-wrap gap-3">
        {tabs.map((tab) => {
          const isInsightPeriod = true;
          const isDisabled =
            isInsightPeriod &&
            ((tab.key === 'yesterday' && !eligibility?.yesterday) ||
              (tab.key === 'week' && !eligibility?.week) ||
              (tab.key === 'month' && !eligibility?.month) ||
              (tab.key === 'year' && !eligibility?.year));
          const tooltip =
            tab.key === 'yesterday' && !eligibility?.yesterday
              ? "Log something yesterday to see yesterday's insights"
              : tab.key === 'month' && !eligibility?.month
                ? 'Log for at least 14 days to unlock monthly insights'
                : tab.key === 'year' && !eligibility?.year
                  ? 'Log for at least 60 days to unlock yearly insights'
                  : tab.key === 'week' && !eligibility?.week
                    ? 'Log for at least 7 days to unlock weekly insights'
                    : undefined;
          return (
            <button
              key={tab.key}
              type="button"
              title={tooltip ?? undefined}
              onClick={() => { if (!isDisabled) { setActiveTab(tab.key); setError(null); } }}
              disabled={isDisabled}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : isDisabled
                    ? 'cursor-not-allowed bg-zinc-900/40 text-zinc-600 border border-transparent opacity-60'
                    : 'bg-zinc-900/50 text-zinc-400 border border-transparent hover:bg-zinc-800 hover:text-zinc-300'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="relative rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
        {/* Insights content (Year / Month / Week / Yesterday tabs) */}
        <div className="relative z-10">
            <p className="mb-4 flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-400 sm:rounded-xl sm:mb-3 sm:mx-0 mx-1.5">
              <Shield className="h-4 w-4 shrink-0 text-emerald-400" />
              Best of both worlds: we never send your name or email—only anonymized health metrics (e.g. weight, activity, targets). You get personalized insights with complete privacy.
            </p>
            <div className="mb-5 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="pr-1">
                <h2 className="text-base font-semibold text-text-primary">
                  {tabs.find((t) => t.key === activeTab)?.label ?? 'Insights'}
                </h2>
                {insightsGeneratedAt && (
                  <p className="mt-0.5 text-xs text-text-muted">
                    Generated on {formatGeneratedDate(insightsGeneratedAt)}
                  </p>
                )}
              </div>
              <button
                onClick={handleGenerate}
                disabled={loading || !canGenerateInsights}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto sm:justify-center"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-black" />
                ) : (
                  <Sparkles className="h-4 w-4 text-black" />
                )}
                {insights ? 'Refresh' : 'Generate'}
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center gap-3 py-16">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                <p className="text-sm text-text-muted">Analyzing your data...</p>
              </div>
            ) : insights ? (
              <div className="space-y-3">
                {insights.map((insight, i) => {
                  const Icon = insightIcons[insight.type] || Info;
                  const colorClass = insightColors[insight.type] || insightColors.info;
                  return (
                    <div
                      key={i}
                      className={cn('flex gap-3 rounded-xl border p-4', colorClass)}
                    >
                      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-text-primary">{insight.title}</p>
                          {insight.value && (
                            <span className="shrink-0 rounded-lg bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-text-secondary">
                              {insight.value}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-text-secondary">{insight.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : !hasApiKey ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Settings className="h-10 w-10 text-text-muted" />
                <p className="text-sm font-medium text-text-primary">Connect your OpenAI API key</p>
                <p className="text-xs text-text-muted">Add your key in Settings to generate insights.</p>
              </div>
            ) : !canGenerateInsights ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Info className="h-10 w-10 text-emerald-400" />
                <p className="text-sm font-medium text-text-primary">
                  {insightPeriod === 'yesterday'
                    ? "Log something yesterday (food, water, weight, sleep, or workout) to see yesterday's insights"
                    : insightPeriod === 'week'
                      ? 'Log for at least 7 days to generate weekly insights'
                      : insightPeriod === 'month'
                        ? 'Log for at least 14 days to unlock monthly insights'
                        : 'Log for at least 60 days to unlock yearly insights'}
                </p>
                <p className="text-xs text-text-muted">
                  {insightPeriod === 'yesterday' ? 'Yesterday had no logged data.' : 'Track food, water, weight, sleep, or workouts to build your history.'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <TrendingUp className="mb-4 h-12 w-12 text-zinc-600" />
                <p className="text-sm font-medium text-zinc-300">
                  Click Generate to get AI-powered insights
                </p>
                <p className="text-sm text-zinc-500">Based on your selected period</p>
              </div>
            )}
          </div>

        {/* Error */}
        {error && (
          <div className="relative z-10 mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <p className="text-xs text-text-secondary">{error}</p>
          </div>
        )}
      </div>
      </div>
        </div>
      </div>
    </div>
  );
}
