'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Moon,
  Sunrise,
  BedDouble,
  Sparkles,
  Loader2,
  AlertCircle,
  Star,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import ProgressRing from '@/components/ui/ProgressRing';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { showToast } from '@/components/ui/Toast';
import { useDailyLog } from '@/hooks/useDailyLog';
import { useUser } from '@/hooks/useUser';
import api from '@/lib/apiClient';
import { cn, formatDate, getToday } from '@/lib/utils';
import type { SleepEntry as SleepEntryType } from '@/types';

interface SleepHistoryItem {
  date: string;
  sleep?: SleepEntryType;
}

interface AiSleepTip {
  title: string;
  description: string;
}

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = (timeStr || '0:0').split(':').map((x) => parseInt(x, 10) || 0);
  return h * 60 + m;
}

function computeDurationHours(bedtime: string, wakeTime: string): number {
  const bedMins = parseTimeToMinutes(bedtime);
  let wakeMins = parseTimeToMinutes(wakeTime);
  if (wakeMins <= bedMins) wakeMins += 24 * 60;
  return (wakeMins - bedMins) / 60;
}

function displayTime(t: string): string {
  if (!t) return '--:--';
  if (t.length > 8) return t.slice(11, 16);
  return t.slice(0, 5);
}

export default function SleepPage() {
  const { user, loading: userLoading } = useUser();
  const { log, loading: logLoading, refetch } = useDailyLog();
  const today = getToday();
  const targetHours = user?.targets?.sleepHours ?? 8;

  const [history, setHistory] = useState<SleepHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [bedtime, setBedtime] = useState('22:00');
  const [wakeTime, setWakeTime] = useState('06:00');
  const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiTips, setAiTips] = useState<AiSleepTip[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const currentSleep = log?.sleep;
  const durationHours = computeDurationHours(bedtime, wakeTime);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await api.getSleepHistory(7);
      if (res.success && res.data) {
        const data = res.data as { history: SleepHistoryItem[] };
        setHistory(data.history || []);
      }
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Pre-fill form from today's log
  useEffect(() => {
    if (currentSleep) {
      setBedtime(displayTime(currentSleep.bedtime));
      setWakeTime(displayTime(currentSleep.wakeTime));
      setQuality((currentSleep.quality as 1 | 2 | 3 | 4 | 5) || 3);
      setNotes(currentSleep.notes || '');
    }
  }, [currentSleep?.bedtime, currentSleep?.wakeTime, currentSleep?.quality, currentSleep?.notes]);

  const handleLogSleep = async () => {
    const dur = computeDurationHours(bedtime, wakeTime);
    if (dur <= 0 || dur > 24) {
      showToast('Please enter valid bedtime and wake time', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await api.logSleep(today, {
        bedtime,
        wakeTime,
        duration: Math.round(dur * 10) / 10,
        quality,
        notes: notes.trim() || undefined,
      });
      if (res.success) {
        showToast('Sleep logged successfully', 'success');
        refetch();
        fetchHistory();
      } else {
        showToast(res.error || 'Failed to log sleep', 'error');
      }
    } catch {
      showToast('Failed to log sleep', 'error');
    } finally {
      setSaving(false);
    }
  };

  const fetchAiTips = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await api.getSleepTips();
      if (res.success && res.data) {
        const data = res.data as { tips?: AiSleepTip[]; summary?: string };
        setAiTips(data.tips || []);
      } else {
        setAiError(res.error || 'Failed to load tips');
      }
    } catch {
      setAiError('Failed to load AI tips');
    } finally {
      setAiLoading(false);
    }
  };

  const displayHours = currentSleep?.duration ?? durationHours;
  const percent = targetHours > 0 ? Math.min((displayHours / targetHours) * 100, 150) : 0;
  const remaining = Math.max(targetHours - displayHours, 0);
  const sleepScore =
    currentSleep != null
      ? Math.round(
          (currentSleep.quality / 5) * 40 + Math.min(currentSleep.duration / targetHours, 1) * 60
        )
      : null;

  const chartData = history
    .filter((h) => h.sleep?.duration != null)
    .map((h) => ({
      date: h.date,
      value: h.sleep!.duration,
      label: `${h.sleep!.duration.toFixed(1)}h`,
    }))
    .slice(-7);

  const loading = userLoading || logLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CardSkeleton className="h-80" />
          <CardSkeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary">
          <Moon className="h-6 w-6 text-accent-violet" />
          Sleep Tracker
        </h1>
        <p className="text-sm text-text-muted">{formatDate(today)}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Progress + Logger */}
        <div className="space-y-6">
          {/* Progress Ring + Sleep Score */}
          <div className="glass-card flex flex-col items-center rounded-2xl p-6 sm:flex-row sm:justify-around">
            <ProgressRing
              progress={percent}
              size={140}
              strokeWidth={10}
              color={
                percent >= 100
                  ? 'stroke-accent-emerald'
                  : percent >= 70
                    ? 'stroke-accent-violet'
                    : 'stroke-accent-amber'
              }
              value={currentSleep ? `${currentSleep.duration.toFixed(1)}h` : '—'}
              label="slept"
              sublabel={`of ${targetHours}h goal`}
            />
            <div className="mt-4 flex flex-col items-center sm:mt-0">
              {sleepScore != null && (
                <div
                  className={cn(
                    'rounded-2xl border px-4 py-2',
                    sleepScore >= 70
                      ? 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald'
                      : sleepScore >= 50
                        ? 'border-accent-amber/30 bg-accent-amber/10 text-accent-amber'
                        : 'border-accent-rose/30 bg-accent-rose/10 text-accent-rose'
                  )}
                >
                  <p className="text-2xl font-bold">{(sleepScore as number)}</p>
                  <p className="text-xs font-medium opacity-90">Sleep Score</p>
                </div>
              )}
              {!currentSleep && (
                <p className="text-sm text-text-muted">
                  {remaining > 0 ? `${remaining.toFixed(1)}h to target` : 'Log last night to see score'}
                </p>
              )}
            </div>
          </div>

          {/* Sleep Logger */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-text-primary">
              <BedDouble className="h-4 w-4 text-accent-violet" />
              Log Sleep
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-text-muted">Bedtime</label>
                  <input
                    type="time"
                    value={bedtime}
                    onChange={(e) => setBedtime(e.target.value)}
                    className="glass-input mt-1 w-full rounded-xl px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted">Wake time</label>
                  <input
                    type="time"
                    value={wakeTime}
                    onChange={(e) => setWakeTime(e.target.value)}
                    className="glass-input mt-1 w-full rounded-xl px-3 py-2.5"
                  />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-text-muted">
                  Duration: <span className="font-semibold text-text-primary">{durationHours.toFixed(1)} hours</span>
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted">Quality (1–5)</label>
                <div className="mt-2 flex gap-1">
                  {([1, 2, 3, 4, 5] as const).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuality(q)}
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg transition-all',
                        quality === q
                          ? 'bg-accent-amber/20 text-accent-amber'
                          : 'bg-white/[0.04] text-text-muted hover:bg-white/[0.08]'
                      )}
                    >
                      <Star className="h-4 w-4 fill-current" />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted">Notes (optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Woke up once, had tea late"
                  className="glass-input mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
                />
              </div>
              <button
                onClick={handleLogSleep}
                disabled={saving}
                className="glass-button-primary flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Moon className="h-4 w-4" />
                    {currentSleep ? 'Update Sleep' : 'Log Sleep'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Chart + AI Tips + Recent */}
        <div className="space-y-6">
          {/* Weekly Sleep Chart */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-text-primary">
              <Sunrise className="h-4 w-4 text-accent-amber" />
              Last 7 Days
            </h2>
            {historyLoading ? (
              <div className="flex h-52 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-text-muted" />
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => {
                      const p = d.split('-');
                      return `${p[1]}/${p[2]}`;
                    }}
                    stroke="rgba(255,255,255,0.15)"
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 12]}
                    stroke="rgba(255,255,255,0.15)"
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}h`}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15, 15, 24, 0.95)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      fontSize: '12px',
                    }}
                    labelFormatter={(label) => formatDate(label)}
                    formatter={(value: number) => [`${value.toFixed(1)} hours`, 'Sleep']}
                  />
                  <Bar
                    dataKey="value"
                    fill="rgba(139, 92, 246, 0.5)"
                    stroke="rgba(139, 92, 246, 0.9)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-52 items-center justify-center text-sm text-text-muted">
                Log sleep to see your weekly trend
              </div>
            )}
          </div>

          {/* AI Sleep Tips */}
          <div className="glass-card rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary">
                <Sparkles className="h-4 w-4 text-accent-violet" />
                AI Sleep Coach
              </h2>
              <button
                onClick={fetchAiTips}
                disabled={aiLoading || !user?.hasOpenAiKey}
                className="glass-button-primary flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium disabled:opacity-50"
              >
                {aiLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {aiTips ? 'Refresh' : 'Get Tips'}
              </button>
            </div>
            {!user?.hasOpenAiKey && (
              <div className="flex items-start gap-2 rounded-xl border border-accent-amber/20 bg-accent-amber/5 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-amber" />
                <p className="text-xs text-text-muted">
                  Add your OpenAI API key in Settings to enable AI sleep tips.
                </p>
              </div>
            )}
            {aiError && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-accent-rose/20 bg-accent-rose/5 p-3 text-xs text-accent-rose">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {aiError}
              </div>
            )}
            {aiLoading ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-accent-violet" />
                <p className="text-xs text-text-muted">Analyzing your sleep patterns...</p>
              </div>
            ) : aiTips && aiTips.length > 0 ? (
              <div className="space-y-2">
                {aiTips.map((tip, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <p className="text-sm font-medium text-text-primary">{tip.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                      {tip.description}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-xs text-text-muted">
                Click &quot;Get Tips&quot; for personalized sleep advice based on your data.
              </p>
            )}
          </div>

          {/* Recent Sleep Log */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-text-primary">
              <Clock className="h-4 w-4 text-text-muted" />
              Recent Sleep
            </h2>
            {history.filter((h) => h.sleep).length === 0 ? (
              <p className="py-4 text-center text-xs text-text-muted">No sleep entries yet</p>
            ) : (
              <div className="space-y-2">
                {history
                  .filter((h) => h.sleep)
                  .slice(0, 5)
                  .map((h) => (
                    <div
                      key={h.date}
                      className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {h.sleep!.duration.toFixed(1)}h
                        </p>
                        <p className="text-[11px] text-text-muted">
                          {displayTime(h.sleep!.bedtime)} → {displayTime(h.sleep!.wakeTime)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((q) => (
                            <Star
                              key={q}
                              className={cn(
                                'h-3 w-3',
                                q <= (h.sleep!.quality || 0)
                                  ? 'fill-accent-amber text-accent-amber'
                                  : 'text-white/20'
                              )}
                            />
                          ))}
                        </span>
                        <span className="text-[11px] text-text-muted">{formatDate(h.date)}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
