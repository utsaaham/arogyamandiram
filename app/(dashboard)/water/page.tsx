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
import DashboardPageShell from '@/components/layout/DashboardPageShell';
import WaterGlass from '@/components/water/WaterGlass';
import ProgressRing from '@/components/ui/ProgressRing';
import MetricChart from '@/components/ui/MetricChart';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { showToast } from '@/components/ui/Toast';
import { useDailyLog } from '@/hooks/useDailyLog';
import { useUser } from '@/hooks/useUser';
import api from '@/lib/apiClient';
import { getTargetsForUser } from '@/lib/health';
import {
  cn,
  formatWater,
  calcPercent,
  getToday,
  formatDate,
} from '@/lib/utils';
import WaterCard from '@/components/ui/water-card';

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
  const target = getTargetsForUser(user ?? undefined).dailyWater;
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
      const timer = setTimeout(() => setAnimateWave(false), 2000);
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
    <div className="water-page animate-fade-in flex flex-col max-lg:mobile-dash cards-stack-desktop">
      <DashboardPageShell
        title="Water Tracker"
        subtitle={formatDate(today)}
        icon={Droplets}
        iconClassName="text-[#A3A3A3]"
        titleClassName="text-[#A3A3A3]"
        subtitleClassName="text-[#94A3B8]"
        mobileVariant="card"
        mobileCardClassName="bg-[#0d161c]"
      />

      <div className="water-page-cards mobile-fade-up mobile-dash-px lg:px-0" style={{ animationDelay: '80ms' }}>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-stretch">
          {/* Left half: Beaker / Water Visualization */}
          <WaterCard className="flex h-full min-h-[420px] flex-col items-center justify-center p-6">
            <div className="mb-6">
              <WaterGlass
                percent={percent}
                isPouring={animateWave}
                amount={remaining > 0 ? Math.min(250, remaining) : 250}
              />
            </div>

            {/* Amount Display */}
            <div className="text-center">
              <p className="text-3xl font-semibold text-[#A3A3A3]">{formatWater(current)}</p>
              <p className="text-sm text-[#94A3B8]">of {formatWater(target)} goal</p>
              {remaining > 0 && (
                <p className="mt-1 text-xs text-[#94A3B8]">
                  {formatWater(remaining)} remaining
                </p>
              )}
              {percent >= 100 && (
                <div className="mt-2 inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-medium text-[#A3A3A3]">
                  🎉 Daily goal reached!
                </div>
              )}
            </div>

            {/* Quick Add Buttons – visible gap between each button */}
            <div className="mt-6 grid w-full grid-cols-4 gap-3">
              {quickAmounts.map((amt) => (
                <button
                  key={amt.value}
                  onClick={() => addWater(amt.value)}
                  disabled={adding}
                  className="flex flex-col items-center gap-1 rounded-xl bg-white/[0.03] px-2 py-3 text-xs font-medium text-[#94A3B8] transition-all hover:bg-white/[0.08] hover:text-[#A3A3A3] active:scale-95 disabled:opacity-50"
                >
                  <span className="text-lg">{amt.icon}</span>
                  <span>{amt.label}</span>
                </button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="mt-5 w-full">
              <button
                onClick={() => setShowCustom(!showCustom)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/[0.03] py-2 text-xs font-medium text-[#94A3B8] hover:bg-white/[0.06]"
              >
                {showCustom ? 'Hide Custom' : 'Custom Amount'}
              </button>

              {showCustom && (
                <div className="mt-3 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setCustomAmount((prev) => Math.max(50, prev - 50))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-[#94A3B8] hover:bg-white/[0.1]"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <div className="glass-input flex items-center gap-1 rounded-xl px-3 py-2">
                      <input
                        type="number"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-16 bg-transparent text-center text-lg font-bold text-[#A3A3A3] outline-none"
                        min={1}
                        step={50}
                      />
                      <span className="text-xs text-[#94A3B8]">ml</span>
                    </div>
                    <button
                      onClick={() => setCustomAmount((prev) => prev + 50)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-[#94A3B8] hover:bg-white/[0.1]"
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
                            ? 'bg-[#4FC3F7]/10 text-[#A3A3A3]'
                            : 'bg-white/[0.03] text-[#94A3B8] hover:bg-white/[0.08]'
                        )}
                      >
                        {amt}ml
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => addWater(customAmount)}
                    disabled={adding}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#1E293B,#020617)] py-2.5 text-sm font-medium text-white shadow-lg transition-all disabled:opacity-50"
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
          </WaterCard>

        {/* Right half: Stats (15 glasses, 100% goal, 2.5L, 0ml), Glass Tracker, Recent Water */}
        <div className="flex min-h-[420px] flex-col justify-center space-y-3 lg:h-full lg:min-h-0 lg:overflow-y-auto">
          {/* Stats Grid – on mobile show simpler stats, full set on larger screens */}
          <div className="grid grid-cols-2 gap-3">
            <WaterCard className="flex flex-col items-center justify-center p-4">
              <GlassWater className="h-5 w-5 text-[#A3A3A3]" />
              <p className="mt-1 text-2xl font-semibold text-[#A3A3A3]">{glasses}</p>
              <p className="text-xs text-[#94A3B8]">of {targetGlasses} glasses</p>
            </WaterCard>
            {/* Hide percent ring on mobile; keep on larger screens */}
            <WaterCard className="hidden flex-col items-center justify-center p-4 lg:flex">
              <ProgressRing
                progress={percent}
                size={80}
                strokeWidth={6}
                color="stroke-[#4FC3F7]"
                value={`${Math.round(percent)}%`}
                label="hydrated"
                valueClassName="text-lg font-bold text-[#A3A3A3]"
                labelClassName="text-[10px] font-medium text-[#A3A3A3]"
              />
            </WaterCard>
            <WaterCard className="flex flex-col items-center justify-center p-4">
              <Target className="h-5 w-5 text-[#A3A3A3]" />
              <p className="mt-1 text-lg font-semibold text-[#A3A3A3]">{formatWater(target)}</p>
              <p className="text-xs text-[#94A3B8]">daily goal</p>
            </WaterCard>
            {/* Hide remaining / exceeded card on mobile; keep on larger screens */}
            <WaterCard className="hidden flex-col items-center justify-center p-4 lg:flex">
              <TrendingUp className="h-5 w-5 text-[#A3A3A3]" />
              <p className="mt-1 text-lg font-semibold text-[#A3A3A3]">{formatWater(remaining)}</p>
              <p className="text-xs text-[#A3A3A3]">{percent >= 100 ? 'exceeded by' : 'remaining'}</p>
            </WaterCard>
          </div>

          {/* Glass Indicators – hide on mobile, keep on larger screens */}
          <WaterCard className="hidden p-4 lg:block">
            <h3 className="mb-3 text-sm font-semibold text-[#A3A3A3]">Glass Tracker</h3>
            <div className="flex flex-wrap justify-center gap-2">
              {Array.from({ length: targetGlasses }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-all duration-300',
                    i < glasses
                      ? 'bg-[#4FC3F7]/20 text-[#4FC3F7]'
                      : 'bg-white/[0.04] text-[#94A3B8]'
                  )}
                  style={{ transitionDelay: `${i * 30}ms` }}
                >
                  {i < glasses ? '💧' : i + 1}
                </div>
              ))}
            </div>
          </WaterCard>

          {/* Recent Water */}
          <WaterCard className="flex min-h-0 flex-1 flex-col p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#A3A3A3]">
              <GlassWater className="h-4 w-4 text-[#A3A3A3]" />
              Recent Water
            </h3>
            {historyLoading ? (
              <div className="flex flex-1 items-center justify-center text-xs text-[#94A3B8]">
                Loading history...
              </div>
            ) : waterHistory.length === 0 ? (
              <p className="py-4 text-xs text-[#94A3B8]">No water entries yet</p>
            ) : (
              <div className="hide-scrollbar w-full min-h-0 flex-1 space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {waterHistory
                  .slice(-7)
                  .reverse()
                  .map((entry) => {
                    const dayGlasses = Math.floor(entry.waterIntake / glassSize);
                    return (
                      <div
                        key={entry.date}
                        className="flex items-center justify-between rounded-xl bg-[#0B1015] px-3 py-2.5"
                      >
                        <div>
                          <p className="text-sm font-semibold text-[#A3A3A3]">
                            {formatWater(entry.waterIntake)}
                          </p>
                          <p className="text-[11px] text-[#94A3B8]">
                            {dayGlasses} glass{dayGlasses === 1 ? '' : 'es'}
                          </p>
                        </div>
                        <span className="text-[11px] text-[#94A3B8]">
                          {formatDate(entry.date)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </WaterCard>
        </div>
        </div>
      </div>

      {/* Water Intake History Chart – hide on mobile, show on larger screens */}
      <div className="mobile-fade-up mobile-dash-px lg:px-0" style={{ animationDelay: '160ms' }}>
      <WaterCard className="hidden p-6 lg:block">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#A3A3A3]" />
            <h2 className="text-base font-semibold text-[#A3A3A3]">Daily Water Intake</h2>
          </div>
          <div className="flex gap-1.5">
            {periodOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setPeriod(opt.key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                  period === opt.key
                    ? 'bg-white/[0.08] text-[#A3A3A3] ring-1 ring-white/20'
                    : 'bg-white/[0.02] text-[#94A3B8] hover:bg-white/[0.06]'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {historyLoading ? (
          <div className="flex h-56 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4FC3F7] border-t-transparent" />
          </div>
        ) : (
          <>
            <MetricChart
              data={waterHistory.map((e) => ({
                date: e.date,
                value: e.waterIntake,
              }))}
              color="#38bdf8"
              gradientId="waterGrad"
              gradientFrom="#1e293b"
              gradientTo="#020617"
              unit=" ml"
              height={240}
              targetValue={target}
              targetLabel={`Goal: ${formatWater(target)}`}
              formatY={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}L` : `${v}ml`)}
            />
            {waterHistory.length > 0 && (() => {
              const avg = Math.round(
                waterHistory.reduce((s, e) => s + e.waterIntake, 0) / waterHistory.length
              );
              const daysMetGoal = waterHistory.filter((e) => e.waterIntake >= target).length;
              const best = Math.max(...waterHistory.map((e) => e.waterIntake));
              return (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-[#0B1015] p-3 text-center shadow-lg">
                    <p className="text-lg font-semibold text-[#A3A3A3]">{formatWater(avg)}</p>
                    <p className="text-[11px] text-[#94A3B8]">Daily Average</p>
                  </div>
                  <div className="rounded-xl bg-[#0B1015] p-3 text-center shadow-lg">
                    <p className="text-lg font-semibold text-[#A3A3A3]">{`${daysMetGoal}/${waterHistory.length}`}</p>
                    <p className="text-[11px] text-[#94A3B8]">Days Goal Met</p>
                  </div>
                  <div className="rounded-xl bg-[#0B1015] p-3 text-center shadow-lg">
                    <p className="text-lg font-semibold text-[#A3A3A3]">{formatWater(best)}</p>
                    <p className="text-[11px] text-[#94A3B8]">Best Day</p>
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </WaterCard>
      </div>
    </div>
  );
}
