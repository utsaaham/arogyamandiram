'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Moon,
  Sunrise,
  BedDouble,
  Loader2,
  Star,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import DashboardPageShell from '@/components/layout/DashboardPageShell';
import ProgressRing from '@/components/ui/ProgressRing';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { showToast } from '@/components/ui/Toast';
import { useDailyLog } from '@/hooks/useDailyLog';
import { useUser } from '@/hooks/useUser';
import api from '@/lib/apiClient';
import { getTargetsForUser } from '@/lib/health';
import { cn, formatDate, getToday } from '@/lib/utils';
import type { SleepEntry as SleepEntryType } from '@/types';

interface SleepHistoryItem {
  date: string;
  sleep?: SleepEntryType;
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
  const todayDate = getToday();
  const { log, loading: logLoading, refetch } = useDailyLog(todayDate);
  const targetHours = getTargetsForUser(user ?? undefined).sleepHours;

  const [history, setHistory] = useState<SleepHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [bedtime, setBedtime] = useState('22:00');
  const [wakeTime, setWakeTime] = useState('06:00');
  const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

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
      const res = await api.logSleep(todayDate, {
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
    <div className="sleep-page cards-stack-desktop flex flex-col animate-fade-in max-lg:mobile-dash">
      <DashboardPageShell
        title="Sleep Tracker"
        subtitle={`Last night · ${formatDate(todayDate)}`}
        icon={Moon}
        iconClassName="text-accent-violet"
        mobileVariant="card"
      />

      <div className="sleep-tracker-cards mobile-fade-up mobile-dash-px lg:px-0" style={{ animationDelay: '80ms' }}>
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2 lg:items-stretch">
          {/* Left: Progress + Logger */}
          <div className="space-y-2.5 lg:space-y-3">
            {/* Progress Ring + Sleep Score – match card shape */}
            <div
              className={cn(
                'relative flex flex-col items-center justify-between rounded-2xl bg-gray-800/40',
                'p-6 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between md:p-7'
              )}
            >
              <ProgressRing
                progress={percent}
                size={140}
                strokeWidth={10}
                color="text-accent-violet stroke-accent-violet"
                value={currentSleep ? String(sleepScore ?? '—') : undefined}
                label={currentSleep ? 'Sleep score' : 'Log sleep'}
                sublabel={
                  currentSleep
                    ? `${currentSleep.duration.toFixed(1)}h slept · ${targetHours}h goal`
                    : 'to see score'
                }
              />
              <div className="mt-4 flex flex-col items-center sm:mt-0 sm:items-start">
                {currentSleep && (
                  <p className="text-sm font-medium text-text-primary">
                    {currentSleep.duration.toFixed(1)}h slept last night
                  </p>
                )}
                {!currentSleep && (
                  <p className="text-sm text-text-muted">
                    {remaining > 0 ? `${remaining.toFixed(1)}h to target` : 'Log last night to see score'}
                  </p>
                )}
              </div>
            </div>

          {/* Sleep Logger – styled similar to weight log card */}
          <div className="bg-gray-800/40 rounded-2xl p-5 shadow-2xl backdrop-blur-xl flex lg:min-h-[280px] flex-col gap-3 md:p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary">
              <BedDouble className="h-4 w-4 text-accent-violet" />
              Log Sleep
            </h2>
            <p className="mt-1 text-xs text-text-muted">
              Track last night&apos;s sleep so we can calculate your recovery and trends.
            </p>
            <div className="mt-3 space-y-3">
              <div className="grid min-w-0 grid-cols-1 gap-4 overflow-hidden sm:grid-cols-2">
                <div className="min-w-0 overflow-hidden">
                  <label className="block text-xs font-medium text-text-muted">Bedtime</label>
                  <input
                    type="time"
                    value={bedtime}
                    onChange={(e) => setBedtime(e.target.value)}
                    className="mt-2 max-w-full rounded-xl bg-black/40 px-3 py-2.5 text-sm text-white outline-none ring-0 placeholder:text-gray-500 focus:outline-none focus:ring-0"
                  />
                </div>
                <div className="min-w-0 overflow-hidden">
                  <label className="block text-xs font-medium text-text-muted">Wake time</label>
                  <input
                    type="time"
                    value={wakeTime}
                    onChange={(e) => setWakeTime(e.target.value)}
                    className="mt-2 max-w-full rounded-xl bg-black/40 px-3 py-2.5 text-sm text-white outline-none ring-0 placeholder:text-gray-500 focus:outline-none focus:ring-0"
                  />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-text-muted">
                  Duration:{' '}
                  <span className="font-semibold text-text-primary">{durationHours.toFixed(1)} hours</span>
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted">Quality (1–5)</label>
                <div className="mt-2 flex gap-1.5">
                  {([1, 2, 3, 4, 5] as const).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuality(q)}
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-xl border text-xs transition-all',
                        quality === q
                          ? 'border-amber-300/70 bg-white/[0.06] text-amber-300'
                          : 'border-white/[0.06] bg-black/40 text-text-muted hover:bg-white/[0.06]'
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
                  className="mt-1 w-full rounded-xl bg-black/40 px-3 py-2.5 text-sm text-white outline-none ring-0 placeholder:text-gray-500 focus:outline-none focus:ring-0"
                />
              </div>
              <button
                onClick={handleLogSleep}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-500 px-6 py-2.5 text-sm font-semibold text-white shadow-none transition-colors duration-200 hover:bg-purple-400 hover:shadow-none active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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

        {/* Right: Chart + Recent (match vertical gaps with left) */}
        <div className="flex flex-col gap-2.5">
          {/* Weekly Sleep Chart – hidden on mobile, match card shape */}
          <div className="hidden overflow-visible rounded-2xl bg-gray-800/40 p-6 shadow-2xl backdrop-blur-xl lg:block">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-text-primary">
              <Sunrise className="h-4 w-4 text-accent-violet" />
              Last 7 Days
            </h2>
            {historyLoading ? (
              <div className="flex min-h-[220px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
              </div>
            ) : chartData.length > 0 ? (
              <div className="min-h-[220px] w-full">
                <ResponsiveContainer width="100%" height={220} minHeight={220}>
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => {
                      const p = d.split('-');
                      return `${p[1]}/${p[2]}`;
                    }}
                    stroke="rgba(255,255,255,0.15)"
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 12]}
                    stroke="rgba(255,255,255,0.15)"
                    tick={{ fill: 'rgba(255,255,255,0.85)', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}h`}
                    width={36}
                    tickMargin={8}
                  />
                  <Bar
                    dataKey="value"
                    fill="rgba(139, 92, 246, 0.7)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex min-h-[220px] items-center justify-center text-sm text-text-muted">
                Log sleep to see your weekly trend
              </div>
            )}
          </div>

          {/* Recent Sleep Log – match card shape */}
          <div className="flex min-h-0 flex-1 flex-col rounded-2xl bg-gray-800/40 p-6 shadow-2xl backdrop-blur-xl">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-text-primary">
              <Clock className="h-4 w-4 text-accent-violet" />
              Recent Sleep
            </h2>
            {history.filter((h) => h.sleep).length === 0 ? (
              <p className="py-4 text-center text-xs text-text-muted">No sleep entries yet</p>
            ) : (
              <div className="hide-scrollbar min-h-0 flex-1 space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {history
                  .filter((h) => h.sleep)
                  .slice(-7)
                  .reverse()
                  .map((h) => (
                    <div
                      key={h.date}
                      className="flex items-center justify-between rounded-xl bg-black/40 px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-semibold text-text-primary">
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
                                  ? 'fill-amber-300 text-amber-300'
                                  : 'text-text-muted/40'
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
    </div>
  );
}
