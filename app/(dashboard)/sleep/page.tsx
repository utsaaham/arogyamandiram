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
  Tooltip,
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
      <div className="space-y-6 bg-slate-950">
        <div className="h-10" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CardSkeleton className="h-80" />
          <CardSkeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="sleep-page cards-stack-desktop flex flex-col animate-fade-in bg-slate-950 max-lg:mobile-dash">
      <DashboardPageShell
        title="Sleep Tracker"
        subtitle={`Last night · ${formatDate(todayDate)}`}
        icon={Moon}
        iconClassName="text-emerald-400"
        mobileVariant="card"
      />

      <div className="sleep-tracker-cards mobile-fade-up mobile-dash-px lg:px-0" style={{ animationDelay: '80ms' }}>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-stretch">
          {/* Left: Progress + Logger */}
          <div className="space-y-3 lg:space-y-6">
            {/* Progress Ring + Sleep Score */}
            <div
              className={cn(
                'relative flex flex-col items-center justify-between rounded-3xl border border-slate-800 bg-slate-900/40',
                'p-6 backdrop-blur-xl transition-colors hover:border-emerald-500/50 hover:shadow-[0_0_35px_rgba(16,185,129,0.2)] sm:flex-row sm:items-center sm:justify-between md:p-7'
              )}
            >
              <ProgressRing
                progress={percent}
                size={140}
                strokeWidth={10}
                color={
                  percent >= 100
                    ? 'text-emerald-400 stroke-emerald-400'
                    : percent >= 70
                      ? 'text-emerald-300 stroke-emerald-300'
                      : 'text-amber-300 stroke-amber-300'
                }
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
                  <p className="text-sm font-medium text-slate-100">
                    {currentSleep.duration.toFixed(1)}h slept last night
                  </p>
                )}
                {!currentSleep && (
                  <p className="text-sm text-emerald-300">
                    {remaining > 0 ? `${remaining.toFixed(1)}h to target` : 'Log last night to see score'}
                  </p>
                )}
              </div>
            </div>

          {/* Sleep Logger */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-xl transition-colors hover:border-emerald-500/50 hover:shadow-[0_0_35px_rgba(16,185,129,0.2)] md:p-7">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-100">
              <BedDouble className="h-4 w-4 text-emerald-400" />
              Log Sleep
            </h2>
            <div className="space-y-4">
              <div className="grid min-w-0 grid-cols-1 gap-4 overflow-hidden sm:grid-cols-2">
                <div className="min-w-0 overflow-hidden">
                  <label className="text-xs font-medium text-emerald-300">Bedtime</label>
                  <input
                    type="time"
                    value={bedtime}
                    onChange={(e) => setBedtime(e.target.value)}
                    className="mt-1 max-w-full rounded-2xl border border-slate-800 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-100 shadow-[0_0_25px_rgba(2,6,23,0.9)] outline-none ring-0 placeholder:text-slate-500 focus-visible:border-emerald-500/70 focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                  />
                </div>
                <div className="min-w-0 overflow-hidden">
                  <label className="text-xs font-medium text-emerald-300">Wake time</label>
                  <input
                    type="time"
                    value={wakeTime}
                    onChange={(e) => setWakeTime(e.target.value)}
                    className="mt-1 max-w-full rounded-2xl border border-slate-800 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-100 shadow-[0_0_25px_rgba(2,6,23,0.9)] outline-none ring-0 placeholder:text-slate-500 focus-visible:border-emerald-500/70 focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                  />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-emerald-300">
                  Duration:{' '}
                  <span className="font-semibold text-slate-100">{durationHours.toFixed(1)} hours</span>
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-emerald-300">Quality (1–5)</label>
                <div className="mt-2 flex gap-1.5">
                  {([1, 2, 3, 4, 5] as const).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuality(q)}
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-2xl border text-xs transition-all',
                        quality === q
                          ? 'border-amber-300/70 bg-slate-900/60 text-amber-300 shadow-[0_0_16px_rgba(252,211,77,0.5)]'
                          : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:bg-slate-900/60'
                      )}
                    >
                      <Star className="h-4 w-4 fill-current drop-shadow-[0_0_8px_rgba(252,211,77,0.6)]" />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-emerald-300">Notes (optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Woke up once, had tea late"
                  className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-100 shadow-[0_0_25px_rgba(2,6,23,0.9)] outline-none ring-0 placeholder:text-slate-500 focus-visible:border-emerald-500/70 focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                />
              </div>
              <button
                onClick={handleLogSleep}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_18px_45px_rgba(6,95,70,0.75)] transition hover:bg-emerald-400 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-900" />
                ) : (
                  <>
                    <Moon className="h-4 w-4 text-slate-950" />
                    {currentSleep ? 'Update Sleep' : 'Log Sleep'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Chart + Recent (gap-3 on mobile to match grid, gap-6 on desktop) */}
        <div className="flex flex-col gap-3">
          {/* Weekly Sleep Chart – hidden on mobile */}
          <div className="hidden overflow-visible rounded-3xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-xl transition-colors hover:border-emerald-500/50 hover:shadow-[0_0_35px_rgba(16,185,129,0.2)] lg:block">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-100">
              <Sunrise className="h-4 w-4 text-emerald-400" />
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
                    fill="rgba(16, 185, 129, 0.45)"
                    stroke="rgba(16, 185, 129, 0.95)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex min-h-[220px] items-center justify-center text-sm text-slate-400">
                Log sleep to see your weekly trend
              </div>
            )}
          </div>

          {/* Recent Sleep Log */}
          <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-xl transition-colors hover:border-emerald-500/50 hover:shadow-[0_0_35px_rgba(16,185,129,0.2)]">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-100">
              <Clock className="h-4 w-4 text-slate-500" />
              Recent Sleep
            </h2>
            {history.filter((h) => h.sleep).length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">No sleep entries yet</p>
            ) : (
              <div className="hide-scrollbar min-h-0 flex-1 space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {history
                  .filter((h) => h.sleep)
                  .slice(-7)
                  .reverse()
                  .map((h) => (
                    <div
                      key={h.date}
                      className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2.5 transition-colors hover:border-emerald-500/50"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-100">
                          {h.sleep!.duration.toFixed(1)}h
                        </p>
                        <p className="text-[11px] text-slate-400">
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
                                  ? 'fill-amber-300 text-amber-300 drop-shadow-[0_0_10px_rgba(252,211,77,0.6)]'
                                  : 'text-slate-700'
                              )}
                            />
                          ))}
                        </span>
                        <span className="text-[11px] text-slate-500">{formatDate(h.date)}</span>
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
