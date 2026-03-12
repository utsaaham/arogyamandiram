'use client';

import { useState, useEffect } from 'react';
import { Loader2, RefreshCw, Sparkles, Save, Target, Flame, Droplets, Drumstick, Cookie, ChefHat } from 'lucide-react';
import { showToast } from '@/components/ui/Toast';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useUser } from '@/hooks/useUser';
import api from '@/lib/apiClient';
import { getTargetsForUser } from '@/lib/health';
import DashboardPageShell from '@/components/layout/DashboardPageShell';
import StatCard from '@/components/ui/StatCard';

export default function TargetsPage() {
  const { user, loading, refetch } = useUser();
  const [saving, setSaving] = useState(false);
  const [regeneratingPlan, setRegeneratingPlan] = useState(false);
  const [recalculatingTargets, setRecalculatingTargets] = useState(false);

  const [dailyCalories, setDailyCalories] = useState('');
  const [dailyWater, setDailyWater] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  useEffect(() => {
    if (!user?.targets) return;
    const t = user.targets;
    setDailyCalories(t.dailyCalories?.toString() || '');
    setDailyWater(t.dailyWater?.toString() || '');
    setProtein(t.protein?.toString() || '');
    setCarbs(t.carbs?.toString() || '');
    setFat(t.fat?.toString() || '');
  }, [user]);

  const saveTargets = async () => {
    setSaving(true);
    try {
      const res = await api.updateTargets({
        dailyCalories: parseInt(dailyCalories),
        dailyWater: parseInt(dailyWater),
        protein: parseInt(protein),
        carbs: parseInt(carbs),
        fat: parseInt(fat),
      });
      if (res.success) {
        showToast('Targets updated', 'success');
        refetch();
      } else {
        showToast(res.error || 'Failed to save', 'error');
      }
    } catch {
      showToast('Failed to save targets', 'error');
    } finally {
      setSaving(false);
    }
  };

  const recalculateTargetsFromProfile = async () => {
    setRecalculatingTargets(true);
    try {
      const res = await api.recalculateTargets();
      if (res.success && res.data) {
        showToast('Targets recalculated from your profile', 'success');
        await refetch();
        const data = res.data as { targets?: Record<string, number> };
        const t = data?.targets;
        if (t) {
          setDailyCalories(String(t.dailyCalories ?? ''));
          setDailyWater(String(t.dailyWater ?? ''));
          setProtein(String(t.protein ?? ''));
          setCarbs(String(t.carbs ?? ''));
          setFat(String(t.fat ?? ''));
        }
      } else {
        showToast(res.error || 'Failed to recalculate targets', 'error');
      }
    } catch {
      showToast('Failed to recalculate targets', 'error');
    } finally {
      setRecalculatingTargets(false);
    }
  };

  const regenerateHealthPlan = async () => {
    setRegeneratingPlan(true);
    try {
      const res = await api.generateHealthPlan();
      if (res.success && res.data) {
        const data = res.data as {
          user?: { targets?: Record<string, number> };
          explanations?: Record<string, string>;
          debugLog?: unknown;
        };
        showToast('AI health plan updated', 'success');
        refetch();
        if (process.env.NEXT_PUBLIC_DEBUG_MODE === 'true' && data.debugLog != null) {
          fetch('/api/debug-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              page: 'targets',
              agent: 'health-plan',
              log: data.debugLog,
            }),
            credentials: 'include',
          }).catch(() => {});
        }
        if (data.explanations && Object.keys(data.explanations).length > 0) {
          const first = Object.entries(data.explanations)[0];
          showToast(first[1], 'info');
        }
      } else {
        showToast(res.error || 'Failed to generate health plan', 'error');
      }
    } catch {
      showToast('Failed to generate health plan', 'error');
    } finally {
      setRegeneratingPlan(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10" />
        <CardSkeleton className="h-96" />
      </div>
    );
  }

  const currentTargets = user?.targets;
  const formulaTargets = user ? getTargetsForUser(user) : null;

  return (
    <div className="animate-fade-in flex flex-col max-lg:mobile-dash cards-stack-desktop">
      <DashboardPageShell
        title="Targets"
        subtitle="Fine-tune daily goals for calories, water, and macros"
        icon={Target}
        iconClassName="text-accent-amber"
        mobileVariant="minimal"
      />

      {/* Summary + content */}
      <div className="mobile-fade-up mobile-dash-px lg:px-0" style={{ animationDelay: '80ms' }}>
      <div className="space-y-3 lg:space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 lg:gap-4">
        <StatCard
          icon={Flame}
          label="Calories"
          value={`${currentTargets?.dailyCalories ?? '—'}`}
          subtitle="kcal/day"
          iconColor="text-accent-amber"
        />
        <StatCard
          icon={Droplets}
          label="Water"
          value={`${currentTargets?.dailyWater ?? '—'}`}
          subtitle="ml/day"
          iconColor="text-accent-cyan"
        />
        <StatCard
          icon={Drumstick}
          label="Protein"
          value={`${currentTargets?.protein ?? '—'}`}
          subtitle="g/day"
          iconColor="text-accent-violet"
        />
        <StatCard
          icon={Cookie}
          label="Carbs"
          value={`${currentTargets?.carbs ?? '—'}`}
          subtitle="g/day"
          iconColor="text-accent-amber"
        />
        <StatCard
          icon={ChefHat}
          label="Fat"
          value={`${currentTargets?.fat ?? '—'}`}
          subtitle="g/day"
          iconColor="text-accent-rose"
        />
      </div>

      <div className="mobile-fade-up mobile-dash-px lg:px-0" style={{ animationDelay: '160ms' }}>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4 lg:items-stretch">
        {/* Left: actions + context */}
        <div className="flex flex-col gap-3 lg:min-h-0">
          <div className="glass-card rounded-2xl p-6 shrink-0">
            <p className="text-sm font-semibold text-text-primary">How targets work</p>
            <p className="mt-2 text-xs leading-relaxed text-text-muted">
              Targets are calculated from your profile using standard formulas (BMR/TDEE for calories, weight and
              activity for water, age for sleep). Updating your profile recalculates them automatically. You can
              recalculate now or adjust values manually.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 shrink-0">
            <p className="text-sm font-semibold text-text-primary">Recalculate from profile</p>
            <p className="mt-2 text-xs text-text-muted">
              Refresh calories, water, macros, ideal weight, workout, and sleep using your current profile data.
            </p>
            <button
              type="button"
              onClick={recalculateTargetsFromProfile}
              disabled={recalculatingTargets}
              className="mt-4 flex w-fit items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-white/[0.06] disabled:opacity-50"
            >
              {recalculatingTargets ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Recalculate
            </button>
          </div>

          {user?.hasOpenAiKey && (
            <div className="glass-card rounded-2xl border border-accent-violet/20 bg-accent-violet/5 p-6 shrink-0">
              <p className="text-sm font-semibold text-text-primary">AI Health Plan</p>
              <p className="mt-2 text-xs text-text-muted">
                Generate personalized targets (calories, water, macros, ideal weight, workout duration, sleep) based on
                your profile.
              </p>
              <button
                type="button"
                onClick={regenerateHealthPlan}
                disabled={regeneratingPlan}
                className="glass-button-primary mt-4 flex w-fit items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {regeneratingPlan ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Regenerate plan
              </button>
            </div>
          )}

          {formulaTargets && (
            <div className="glass-card rounded-2xl p-6 flex-1 min-h-0 flex flex-col">
              <p className="text-sm font-semibold text-text-primary">From your profile (formula-based)</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div className="rounded-xl bg-white/[0.03] p-3">
                  <span className="text-xs text-text-muted">Ideal weight</span>
                  <p className="mt-1 font-semibold text-text-primary">{formulaTargets.idealWeight} kg</p>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-3">
                  <span className="text-xs text-text-muted">Workout (min/day)</span>
                  <p className="mt-1 font-semibold text-text-primary">{formulaTargets.dailyWorkoutMinutes}</p>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-3">
                  <span className="text-xs text-text-muted">Calorie burn goal</span>
                  <p className="mt-1 font-semibold text-text-primary">{formulaTargets.dailyCalorieBurn} kcal</p>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-3">
                  <span className="text-xs text-text-muted">Sleep target</span>
                  <p className="mt-1 font-semibold text-text-primary">{formulaTargets.sleepHours} h</p>
                </div>
              </div>
            </div>
          )}
          {!formulaTargets && <div className="flex-1 min-h-0" />}
        </div>

        {/* Right: editable targets */}
        <div className="glass-card flex h-full flex-col rounded-2xl p-6 space-y-6 lg:min-h-0">
          <div>
            <p className="text-sm font-semibold text-text-primary">Daily targets</p>
            <p className="mt-1 text-xs text-text-muted">These values are used across your dashboard and trackers.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-text-muted">Daily Calories (kcal)</label>
              <input
                type="number"
                value={dailyCalories}
                onChange={(e) => setDailyCalories(e.target.value)}
                className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted">Daily Water (ml)</label>
              <input
                type="number"
                value={dailyWater}
                onChange={(e) => setDailyWater(e.target.value)}
                className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted">Protein (g)</label>
              <input
                type="number"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted">Carbs (g)</label>
              <input
                type="number"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-text-muted">Fat (g)</label>
              <input
                type="number"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </div>

          {protein && carbs && fat && (
            <div className="rounded-2xl bg-white/[0.02] p-4">
              <p className="text-xs font-semibold text-text-primary">Macro split</p>
              <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-white/[0.04]">
                {(() => {
                  const total =
                    (parseInt(protein) || 0) * 4 + (parseInt(carbs) || 0) * 4 + (parseInt(fat) || 0) * 9;
                  const pPct = total > 0 ? (((parseInt(protein) || 0) * 4) / total) * 100 : 33;
                  const cPct = total > 0 ? (((parseInt(carbs) || 0) * 4) / total) * 100 : 33;
                  const fPct = total > 0 ? (((parseInt(fat) || 0) * 9) / total) * 100 : 34;
                  return (
                    <>
                      <div className="bg-accent-violet" style={{ width: `${pPct}%` }} />
                      <div className="bg-accent-amber" style={{ width: `${cPct}%` }} />
                      <div className="bg-accent-rose" style={{ width: `${fPct}%` }} />
                    </>
                  );
                })()}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-text-muted">
                <span className="text-accent-violet">
                  Protein{' '}
                  {Math.round(
                    (((parseInt(protein) || 0) * 4) /
                      ((parseInt(protein) || 0) * 4 + (parseInt(carbs) || 0) * 4 + (parseInt(fat) || 0) * 9)) *
                      100 || 0
                  )}
                  %
                </span>
                <span className="text-accent-amber">
                  Carbs{' '}
                  {Math.round(
                    (((parseInt(carbs) || 0) * 4) /
                      ((parseInt(protein) || 0) * 4 + (parseInt(carbs) || 0) * 4 + (parseInt(fat) || 0) * 9)) *
                      100 || 0
                  )}
                  %
                </span>
                <span className="text-accent-rose">
                  Fat{' '}
                  {Math.round(
                    (((parseInt(fat) || 0) * 9) /
                      ((parseInt(protein) || 0) * 4 + (parseInt(carbs) || 0) * 4 + (parseInt(fat) || 0) * 9)) *
                      100 || 0
                  )}
                  %
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              onClick={saveTargets}
              disabled={saving}
              className="glass-button-primary flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </div>
      </div>
      </div>
      </div>
    </div>
  );
}
