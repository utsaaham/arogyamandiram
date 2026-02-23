'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Droplets,
  Plus,
  GlassWater,
  Target,
  TrendingUp,
  Minus,
  BarChart3,
} from 'lucide-react';
import ProgressRing from '@/components/ui/ProgressRing';
import MetricChart from '@/components/ui/MetricChart';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { showToast } from '@/components/ui/Toast';
import { useDailyLog } from '@/hooks/useDailyLog';
import { useUser } from '@/hooks/useUser';
import api from '@/lib/apiClient';
import {
  cn,
  formatWater,
  calcPercent,
  getToday,
  formatDate,
} from '@/lib/utils';

const quickAmounts = [
  { label: '100 ml', value: 100, icon: '💧' },
  { label: '250 ml', value: 250, icon: '🥤' },
  { label: '500 ml', value: 500, icon: '🍶' },
  { label: '750 ml', value: 750, icon: '🧴' },
];

const customAmounts = [100, 150, 200, 250, 300, 350, 400, 500, 750, 1000];

interface WaterEntry {
  date: string;
  waterIntake: number;
}

const periodOptions = [
  { key: 7, label: '7D' },
  { key: 14, label: '2W' },
  { key: 30, label: '1M' },
  { key: 90, label: '3M' },
];

export default function WaterPage() {
  const { user, loading: userLoading } = useUser();
  const { log, loading: logLoading, refetch } = useDailyLog();

  const [adding, setAdding] = useState(false);
  const [customAmount, setCustomAmount] = useState(250);
  const [showCustom, setShowCustom] = useState(false);
  const [animateWave, setAnimateWave] = useState(false);

  const [waterHistory, setWaterHistory] = useState<WaterEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [period, setPeriod] = useState(14);

  const today = getToday();
  const target = user?.targets?.dailyWater ?? 2500;
  const current = log?.waterIntake || 0;
  const percent = calcPercent(current, target);
  const remaining = Math.max(target - current, 0);

  const fetchWaterHistory = useCallback(async (days: number) => {
    setHistoryLoading(true);
    try {
      const res = await api.getWaterHistory(days);
      if (res.success && res.data) {
        const data = res.data as { history: WaterEntry[] };
        setWaterHistory(data.history || []);
      }
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWaterHistory(period);
  }, [period, fetchWaterHistory]);

  // Trigger wave animation after adding
  useEffect(() => {
    if (animateWave) {
      const timer = setTimeout(() => setAnimateWave(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [animateWave]);

  const addWater = useCallback(async (amount: number) => {
    setAdding(true);
    try {
      const res = await api.addWater(today, amount);
      if (res.success) {
        setAnimateWave(true);
        showToast(`Added ${formatWater(amount)}`, 'success');
        refetch();
        fetchWaterHistory(period);
      } else {
        showToast(res.error || 'Failed to add water', 'error');
      }
    } catch {
      showToast('Failed to add water', 'error');
    } finally {
      setAdding(false);
    }
  }, [today, refetch, fetchWaterHistory, period]);

  const loading = userLoading || logLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CardSkeleton className="h-96" />
          <CardSkeleton className="h-96" />
        </div>
      </div>
    );
  }

  // Glass size for display (standard 250ml glass; target is from user profile)
  const glassSize = 250;
  const glasses = Math.floor(current / glassSize);
  const targetGlasses = Math.ceil(target / glassSize);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Water Tracker</h1>
        <p className="text-sm text-text-muted">{formatDate(today)}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Water Visualization */}
        <div className="glass-card flex flex-col items-center rounded-2xl p-6">
          {/* Animated Water Glass */}
          <div className="relative mb-6 h-64 w-40">
            {/* Glass outline */}
            <div className="absolute inset-0 rounded-b-3xl rounded-t-lg border-2 border-white/[0.08] bg-white/[0.02]">
              {/* Water fill */}
              <div
                className={cn(
                  'absolute bottom-0 left-0 right-0 rounded-b-[22px] transition-all duration-1000 ease-out',
                  animateWave && 'animate-water-fill'
                )}
                style={{
                  height: `${Math.min(percent, 100)}%`,
                  background: 'linear-gradient(180deg, rgba(34,211,238,0.25) 0%, rgba(34,211,238,0.45) 100%)',
                }}
              >
                {/* Wave effect */}
                <div className="absolute -top-2 left-0 right-0 h-4 overflow-hidden">
                  <svg
                    viewBox="0 0 160 16"
                    className={cn(
                      'w-full text-accent-cyan/30',
                      percent > 0 && 'animate-pulse-slow'
                    )}
                  >
                    <path
                      d="M0 8 Q20 2 40 8 Q60 14 80 8 Q100 2 120 8 Q140 14 160 8 V16 H0 Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>

                {/* Bubbles */}
                {percent > 10 && (
                  <>
                    <div className="absolute bottom-4 left-6 h-2 w-2 animate-bounce rounded-full bg-white/20" style={{ animationDelay: '0s', animationDuration: '3s' }} />
                    <div className="absolute bottom-8 right-8 h-1.5 w-1.5 animate-bounce rounded-full bg-white/15" style={{ animationDelay: '1s', animationDuration: '4s' }} />
                    <div className="absolute bottom-12 left-12 h-1 w-1 animate-bounce rounded-full bg-white/10" style={{ animationDelay: '2s', animationDuration: '3.5s' }} />
                  </>
                )}
              </div>

              {/* Target line */}
              <div
                className="absolute left-0 right-0 border-t border-dashed border-accent-cyan/30"
                style={{ bottom: '100%', transform: 'translateY(0)' }}
              />

              {/* Percentage text in center of glass */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-text-primary">{Math.round(percent)}%</span>
                <span className="text-xs text-text-muted">hydrated</span>
              </div>
            </div>
          </div>

          {/* Amount Display */}
          <div className="text-center">
            <p className="text-2xl font-bold text-accent-cyan">{formatWater(current)}</p>
            <p className="text-sm text-text-muted">of {formatWater(target)} goal</p>
            {remaining > 0 && (
              <p className="mt-1 text-xs text-text-muted">
                {formatWater(remaining)} remaining
              </p>
            )}
            {percent >= 100 && (
              <div className="mt-2 inline-flex items-center gap-1 rounded-lg bg-accent-emerald/10 px-3 py-1 text-xs font-medium text-accent-emerald">
                🎉 Daily goal reached!
              </div>
            )}
          </div>

          {/* Quick Add Buttons */}
          <div className="mt-6 grid w-full grid-cols-4 gap-2">
            {quickAmounts.map((amt) => (
              <button
                key={amt.value}
                onClick={() => addWater(amt.value)}
                disabled={adding}
                className="flex flex-col items-center gap-1 rounded-xl bg-white/[0.04] px-2 py-3 text-xs font-medium text-text-secondary transition-all hover:bg-accent-cyan/10 hover:text-accent-cyan active:scale-95 disabled:opacity-50"
              >
                <span className="text-lg">{amt.icon}</span>
                <span>{amt.label}</span>
              </button>
            ))}
          </div>

          {/* Custom Amount */}
          <div className="mt-4 w-full">
            <button
              onClick={() => setShowCustom(!showCustom)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/[0.03] py-2 text-xs font-medium text-text-muted hover:bg-white/[0.06]"
            >
              {showCustom ? 'Hide Custom' : 'Custom Amount'}
            </button>

            {showCustom && (
              <div className="mt-3 space-y-3 animate-fade-in">
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setCustomAmount((prev) => Math.max(50, prev - 50))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-text-secondary hover:bg-white/[0.1]"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="glass-input flex items-center gap-1 rounded-xl px-3 py-2">
                    <input
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-16 bg-transparent text-center text-lg font-bold text-text-primary outline-none"
                      min={1}
                      step={50}
                    />
                    <span className="text-xs text-text-muted">ml</span>
                  </div>
                  <button
                    onClick={() => setCustomAmount((prev) => prev + 50)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-text-secondary hover:bg-white/[0.1]"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Preset pills */}
                <div className="flex flex-wrap justify-center gap-1.5">
                  {customAmounts.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setCustomAmount(amt)}
                      className={cn(
                        'rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all',
                        customAmount === amt
                          ? 'bg-accent-cyan/15 text-accent-cyan'
                          : 'bg-white/[0.04] text-text-muted hover:bg-white/[0.08]'
                      )}
                    >
                      {amt}ml
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => addWater(customAmount)}
                  disabled={adding}
                  className="glass-button-primary flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
                >
                  {adding ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Droplets className="h-4 w-4" />
                      Add {formatWater(customAmount)}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Stats + History */}
        <div className="space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card flex flex-col items-center rounded-2xl p-4">
              <ProgressRing
                progress={percent}
                size={80}
                strokeWidth={6}
                color="stroke-accent-cyan"
                value={`${Math.round(percent)}%`}
                label="of goal"
              />
            </div>
            <div className="glass-card flex flex-col items-center justify-center rounded-2xl p-4">
              <GlassWater className="h-5 w-5 text-accent-cyan" />
              <p className="mt-1 text-2xl font-bold text-text-primary">{glasses}</p>
              <p className="text-xs text-text-muted">of {targetGlasses} glasses</p>
            </div>
            <div className="glass-card flex flex-col items-center justify-center rounded-2xl p-4">
              <Target className="h-5 w-5 text-accent-amber" />
              <p className="mt-1 text-lg font-bold text-text-primary">{formatWater(target)}</p>
              <p className="text-xs text-text-muted">daily goal</p>
            </div>
            <div className="glass-card flex flex-col items-center justify-center rounded-2xl p-4">
              <TrendingUp className="h-5 w-5 text-accent-emerald" />
              <p className="mt-1 text-lg font-bold text-text-primary">{formatWater(remaining)}</p>
              <p className="text-xs text-text-muted">{percent >= 100 ? 'exceeded by' : 'remaining'}</p>
            </div>
          </div>

          {/* Glass Indicators */}
          <div className="glass-card rounded-2xl p-4">
            <h3 className="mb-3 text-sm font-semibold text-text-primary">Glass Tracker</h3>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: targetGlasses }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-all duration-300',
                    i < glasses
                      ? 'bg-accent-cyan/20 text-accent-cyan'
                      : 'bg-white/[0.04] text-text-muted'
                  )}
                  style={{ transitionDelay: `${i * 30}ms` }}
                >
                  {i < glasses ? '💧' : (i + 1)}
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="glass-card rounded-2xl p-4">
            <h3 className="mb-2 text-sm font-semibold text-text-primary">💡 Hydration Tips</h3>
            <ul className="space-y-1.5 text-xs leading-relaxed text-text-muted">
              <li>
                • {percent < 25
                  ? "Start your day with a glass of warm water with lemon. It kickstarts your metabolism and helps with digestion."
                  : percent < 50
                  ? "Try keeping a water bottle at your desk. You're more likely to sip regularly when water is within reach."
                  : percent < 75
                  ? "Great progress! Having water before meals can help with portion control and aids digestion."
                  : percent < 100
                  ? "Almost there! The last few glasses matter most for maintaining energy levels through the evening."
                  : "Excellent hydration today! Consistent water intake helps with skin health, energy, and overall wellness."}
              </li>
              <li>• Even mild dehydration (1–2%) can impair focus, memory, and mood. Your brain is about 75% water — staying hydrated keeps you sharp throughout the day.</li>
              <li>• Drinking 500 ml of water can boost your metabolism by 24–30% for up to an hour. A glass 30 minutes before meals also aids digestion and helps with portion control.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Water Intake History Chart */}
      <div className="glass-card rounded-2xl p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-accent-cyan" />
            <h2 className="text-base font-semibold text-text-primary">Daily Water Intake</h2>
          </div>
          <div className="flex gap-1.5">
            {periodOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setPeriod(opt.key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                  period === opt.key
                    ? 'bg-accent-cyan/15 text-accent-cyan ring-1 ring-accent-cyan/30'
                    : 'bg-white/[0.04] text-text-muted hover:bg-white/[0.08]'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {historyLoading ? (
          <div className="flex h-56 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-cyan border-t-transparent" />
          </div>
        ) : (
          <>
            <MetricChart
              data={waterHistory.map((e) => ({
                date: e.date,
                value: e.waterIntake,
              }))}
              color="#22d3ee"
              gradientId="waterGrad"
              unit=" ml"
              height={240}
              targetValue={target}
              targetLabel={`Goal: ${formatWater(target)}`}
              formatY={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}L` : `${v}ml`}
            />
            {waterHistory.length > 0 && (() => {
              const avg = Math.round(waterHistory.reduce((s, e) => s + e.waterIntake, 0) / waterHistory.length);
              const daysMetGoal = waterHistory.filter((e) => e.waterIntake >= target).length;
              const best = Math.max(...waterHistory.map((e) => e.waterIntake));
              return (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-white/[0.03] p-3 text-center">
                    <p className="text-lg font-bold text-accent-cyan">{formatWater(avg)}</p>
                    <p className="text-[11px] text-text-muted">Daily Average</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] p-3 text-center">
                    <p className="text-lg font-bold text-accent-emerald">{daysMetGoal}/{waterHistory.length}</p>
                    <p className="text-[11px] text-text-muted">Days Goal Met</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] p-3 text-center">
                    <p className="text-lg font-bold text-accent-amber">{formatWater(best)}</p>
                    <p className="text-[11px] text-text-muted">Best Day</p>
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}
