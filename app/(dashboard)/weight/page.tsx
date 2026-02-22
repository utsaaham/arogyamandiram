'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Scale,
  TrendingDown,
  TrendingUp,
  Minus,
  Target,
  Calendar,
  ArrowDown,
  ArrowUp,
  Ruler,
  Plus,
} from 'lucide-react';
import MetricChart from '@/components/ui/MetricChart';
import StatCard from '@/components/ui/StatCard';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { showToast } from '@/components/ui/Toast';
import { useUser } from '@/hooks/useUser';
import api from '@/lib/apiClient';
import {
  cn,
  formatWeight,
  formatDate,
  getToday,
} from '@/lib/utils';

interface WeightEntry {
  date: string;
  weight: number;
}

const periodOptions = [
  { key: 7, label: '7D' },
  { key: 14, label: '2W' },
  { key: 30, label: '1M' },
  { key: 90, label: '3M' },
  { key: 180, label: '6M' },
  { key: 365, label: '1Y' },
];

export default function WeightPage() {
  const { user, loading: userLoading } = useUser();
  const [history, setHistory] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const today = getToday();

  const fetchHistory = useCallback(async (days: number) => {
    setLoading(true);
    try {
      const res = await api.getWeightHistory(days);
      if (res.success && res.data) {
        const data = res.data as { history: WeightEntry[] };
        setHistory(data.history || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(period);
  }, [period, fetchHistory]);

  // Pre-fill with today's weight if exists
  useEffect(() => {
    const todayEntry = history.find((e) => e.date === today);
    if (todayEntry) {
      setWeight(todayEntry.weight.toString());
    }
  }, [history, today]);

  const handleLogWeight = async () => {
    const val = parseFloat(weight);
    if (!val || val <= 0 || val > 500) {
      showToast('Please enter a valid weight', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await api.logWeight(today, val);
      if (res.success) {
        showToast(`Weight logged: ${formatWeight(val, user?.settings?.units)}`, 'success');
        fetchHistory(period);
      } else {
        showToast(res.error || 'Failed to log weight', 'error');
      }
    } catch {
      showToast('Failed to log weight', 'error');
    } finally {
      setSaving(false);
    }
  };

  const units = user?.settings?.units || 'metric';
  const targetWeight = user?.profile?.targetWeight;
  const currentWeight = history.length > 0 ? history[history.length - 1].weight : user?.profile?.weight;
  const startWeight = history.length > 0 ? history[0].weight : currentWeight;

  // Stats calculations
  const weightChange = currentWeight && startWeight ? currentWeight - startWeight : 0;
  const bmi = currentWeight && user?.profile?.height
    ? currentWeight / Math.pow(user.profile.height / 100, 2)
    : null;

  const lowestWeight = history.length > 0 ? Math.min(...history.map((e) => e.weight)) : null;
  const highestWeight = history.length > 0 ? Math.max(...history.map((e) => e.weight)) : null;

  // Chart data
  const chartData = history.map((e) => ({
    date: e.date,
    value: units === 'imperial' ? +(e.weight * 2.20462).toFixed(1) : e.weight,
  }));

  const chartTarget = targetWeight
    ? (units === 'imperial' ? +(targetWeight * 2.20462).toFixed(1) : targetWeight)
    : undefined;

  if (userLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <CardSkeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Weight Journal</h1>
        <p className="text-sm text-text-muted">{formatDate(today)}</p>
      </div>

      {/* Log Weight Card */}
      <div className="glass-card flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-end sm:gap-6">
        <div className="flex-1">
          <label className="text-xs font-medium text-text-muted">
            Today&apos;s Weight ({units === 'metric' ? 'kg' : 'lbs'})
          </label>
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={() => setWeight((prev) => {
                const v = parseFloat(prev) || 0;
                return Math.max(0.1, v - 0.1).toFixed(1);
              })}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-text-secondary hover:bg-white/[0.1]"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={units === 'metric' ? '72.5' : '160.0'}
              className="glass-input w-full rounded-xl px-4 py-2.5 text-center text-xl font-bold sm:max-w-[180px]"
              step={0.1}
              min={0}
            />
            <button
              onClick={() => setWeight((prev) => {
                const v = parseFloat(prev) || 0;
                return (v + 0.1).toFixed(1);
              })}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-text-secondary hover:bg-white/[0.1]"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <button
          onClick={handleLogWeight}
          disabled={saving || !weight}
          className="glass-button-primary flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {saving ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <Scale className="h-4 w-4" />
              Log Weight
            </>
          )}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={Scale}
          label="Current"
          value={currentWeight ? formatWeight(currentWeight, units) : '—'}
          iconColor="text-accent-violet"
        />
        <StatCard
          icon={weightChange <= 0 ? TrendingDown : TrendingUp}
          label={`Change (${periodOptions.find((p) => p.key === period)?.label})`}
          value={weightChange !== 0 ? `${weightChange > 0 ? '+' : ''}${formatWeight(Math.abs(weightChange), units).replace(' kg', '').replace(' lbs', '')}` : '0'}
          subtitle={units === 'metric' ? 'kg' : 'lbs'}
          iconColor={weightChange <= 0 ? 'text-accent-emerald' : 'text-accent-amber'}
        />
        <StatCard
          icon={Target}
          label="Target"
          value={targetWeight ? formatWeight(targetWeight, units) : '—'}
          subtitle={targetWeight && currentWeight ? `${formatWeight(Math.abs(currentWeight - targetWeight), units).replace(' kg', '').replace(' lbs', '')} to go` : undefined}
          iconColor="text-accent-cyan"
        />
        <StatCard
          icon={Ruler}
          label="BMI"
          value={bmi ? bmi.toFixed(1) : '—'}
          subtitle={
            bmi
              ? bmi < 18.5 ? 'Underweight'
              : bmi < 25 ? 'Normal'
              : bmi < 30 ? 'Overweight'
              : 'Obese'
              : undefined
          }
          iconColor="text-accent-amber"
        />
      </div>

      {/* Chart */}
      <div className="glass-card rounded-2xl p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-text-primary">Weight Trend</h2>
          <div className="flex gap-1.5">
            {periodOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setPeriod(opt.key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                  period === opt.key
                    ? 'bg-accent-violet/15 text-accent-violet ring-1 ring-accent-violet/30'
                    : 'bg-white/[0.04] text-text-muted hover:bg-white/[0.08]'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex h-56 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-violet border-t-transparent" />
          </div>
        ) : (
          <MetricChart
            data={chartData}
            color="#8b5cf6"
            gradientId="weightGrad"
            unit={units === 'metric' ? ' kg' : ' lbs'}
            height={240}
            targetValue={chartTarget}
            targetLabel={`Goal: ${chartTarget}${units === 'metric' ? ' kg' : ' lbs'}`}
          />
        )}
      </div>

      {/* History Table + Insights */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* History */}
        <div className="glass-card rounded-2xl p-6 lg:col-span-2">
          <h2 className="mb-4 text-base font-semibold text-text-primary">Weight History</h2>

          {history.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Scale className="h-8 w-8 text-text-muted" />
              <p className="text-sm text-text-muted">No weight entries yet</p>
              <p className="text-xs text-text-muted">Start logging your daily weight above</p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Header */}
              <div className="flex items-center gap-4 border-b border-white/[0.06] px-3 py-2 text-[11px] font-medium text-text-muted">
                <span className="w-28">Date</span>
                <span className="w-20 text-right">Weight</span>
                <span className="w-20 text-right">Change</span>
                <span className="flex-1 text-right">Trend</span>
              </div>

              {/* Rows - most recent first */}
              {[...history].reverse().slice(0, 20).map((entry, i, arr) => {
                const prev = arr[i + 1];
                const change = prev ? entry.weight - prev.weight : 0;
                const displayWeight = units === 'imperial' ? entry.weight * 2.20462 : entry.weight;
                const displayChange = units === 'imperial' ? change * 2.20462 : change;

                return (
                  <div
                    key={entry.date}
                    className="flex items-center gap-4 rounded-lg px-3 py-2 text-xs hover:bg-white/[0.03]"
                  >
                    <span className="w-28 text-text-secondary">{formatDate(entry.date)}</span>
                    <span className="w-20 text-right font-semibold text-text-primary">
                      {displayWeight.toFixed(1)}
                    </span>
                    <span className={cn(
                      'w-20 text-right font-medium',
                      change < 0 ? 'text-accent-emerald' : change > 0 ? 'text-accent-rose' : 'text-text-muted'
                    )}>
                      {change !== 0 ? `${change > 0 ? '+' : ''}${displayChange.toFixed(1)}` : '—'}
                    </span>
                    <span className="flex flex-1 items-center justify-end">
                      {change < 0 ? (
                        <ArrowDown className="h-3.5 w-3.5 text-accent-emerald" />
                      ) : change > 0 ? (
                        <ArrowUp className="h-3.5 w-3.5 text-accent-rose" />
                      ) : (
                        <Minus className="h-3.5 w-3.5 text-text-muted" />
                      )}
                    </span>
                  </div>
                );
              })}

              {history.length > 20 && (
                <p className="px-3 py-2 text-[11px] text-text-muted">
                  Showing most recent 20 of {history.length} entries
                </p>
              )}
            </div>
          )}
        </div>

        {/* Insights Sidebar */}
        <div className="space-y-4">
          {/* Range Card */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="mb-3 text-sm font-semibold text-text-primary">Range</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowDown className="h-3.5 w-3.5 text-accent-emerald" />
                  <span className="text-xs text-text-muted">Lowest</span>
                </div>
                <span className="text-sm font-semibold text-text-primary">
                  {lowestWeight ? formatWeight(lowestWeight, units) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowUp className="h-3.5 w-3.5 text-accent-rose" />
                  <span className="text-xs text-text-muted">Highest</span>
                </div>
                <span className="text-sm font-semibold text-text-primary">
                  {highestWeight ? formatWeight(highestWeight, units) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Minus className="h-3.5 w-3.5 text-accent-amber" />
                  <span className="text-xs text-text-muted">Spread</span>
                </div>
                <span className="text-sm font-semibold text-text-primary">
                  {lowestWeight && highestWeight
                    ? formatWeight(highestWeight - lowestWeight, units)
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* BMI Details */}
          {bmi && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="mb-3 text-sm font-semibold text-text-primary">BMI Details</h3>
              <div className="mb-3 text-center">
                <p className="text-3xl font-bold text-accent-violet">{bmi.toFixed(1)}</p>
                <p className={cn(
                  'text-sm font-medium',
                  bmi < 18.5 ? 'text-accent-cyan'
                    : bmi < 25 ? 'text-accent-emerald'
                    : bmi < 30 ? 'text-accent-amber'
                    : 'text-accent-rose'
                )}>
                  {bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal weight' : bmi < 30 ? 'Overweight' : 'Obese'}
                </p>
              </div>

              {/* BMI scale bar */}
              <div className="mt-3 space-y-1">
                <div className="flex h-2 overflow-hidden rounded-full">
                  <div className="w-[18%] bg-accent-cyan/50" />
                  <div className="w-[32%] bg-accent-emerald/50" />
                  <div className="w-[25%] bg-accent-amber/50" />
                  <div className="w-[25%] bg-accent-rose/50" />
                </div>
                <div className="relative h-3">
                  <div
                    className="absolute -translate-x-1/2"
                    style={{ left: `${Math.min(Math.max(((bmi - 14) / 26) * 100, 2), 98)}%` }}
                  >
                    <div className="h-2 w-0.5 bg-text-primary" />
                  </div>
                </div>
                <div className="flex justify-between text-[9px] text-text-muted">
                  <span>Under</span>
                  <span>Normal</span>
                  <span>Over</span>
                  <span>Obese</span>
                </div>
              </div>
            </div>
          )}

          {/* Entries count */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-accent-violet" />
              <div>
                <p className="text-lg font-bold text-text-primary">{history.length}</p>
                <p className="text-xs text-text-muted">weigh-ins recorded</p>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="mb-2 text-sm font-semibold text-text-primary">💡 Tip</h3>
            <p className="text-xs leading-relaxed text-text-muted">
              Weigh yourself at the same time each day, ideally in the morning before eating, for the most consistent readings. Daily fluctuations of 0.5–1 kg are normal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
