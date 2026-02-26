'use client';

import { useState, useEffect } from 'react';
import { Loader2, RefreshCw, Sparkles, Save } from 'lucide-react';
import { showToast } from '@/components/ui/Toast';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useUser } from '@/hooks/useUser';
import api from '@/lib/apiClient';
import { getTargetsForUser } from '@/lib/health';

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
        const data = res.data as { user?: { targets?: Record<string, number> }; explanations?: Record<string, string> };
        showToast('AI health plan updated', 'success');
        refetch();
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
        <CardSkeleton className="h-96 max-w-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-text-primary">Targets</h1>

      <div className="glass-card rounded-2xl p-6 max-w-3xl space-y-5">
        <h2 className="text-base font-semibold text-text-primary">Daily Targets</h2>
        <p className="text-xs text-text-muted">
          Targets are calculated from your profile using standard formulas (BMR/TDEE for calories, weight and activity
          for water, age for sleep). Updating your profile recalculates them automatically. You can recalculate now or
          adjust values below.
        </p>

        <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-white/[0.02] p-4">
          <p className="text-sm font-medium text-text-primary">Recalculate from profile</p>
          <p className="text-xs text-text-muted">
            Refresh all targets (calories, water, macros, ideal weight, workout, sleep) using current profile data and
            formulas.
          </p>
          <button
            type="button"
            onClick={recalculateTargetsFromProfile}
            disabled={recalculatingTargets}
            className="mt-1 flex w-fit items-center gap-2 rounded-xl border border-border bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-white/[0.06] disabled:opacity-50"
          >
            {recalculatingTargets ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Recalculate from profile
          </button>
        </div>

        {user?.hasOpenAiKey && (
          <div className="flex flex-col gap-2 rounded-xl border border-accent-violet/20 bg-accent-violet/5 p-4">
            <p className="text-sm font-medium text-text-primary">AI Health Plan</p>
            <p className="text-xs text-text-muted">
              Generate personalized targets (calories, water, macros, ideal weight, workout duration, sleep) based on
              your profile.
            </p>
            <button
              type="button"
              onClick={regenerateHealthPlan}
              disabled={regeneratingPlan}
              className="glass-button-primary mt-1 flex w-fit items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {regeneratingPlan ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Regenerate AI Health Plan
            </button>
          </div>
        )}

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
          <div>
            <label className="text-xs font-medium text-text-muted">Fat (g)</label>
            <input
              type="number"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
              className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
            />
          </div>
        </div>

        {user && (
          <div className="rounded-xl bg-white/[0.03] p-4">
            <p className="mb-2 text-xs font-medium text-text-muted">From your profile (formula-based)</p>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <span className="text-text-muted">Ideal weight</span>
                <p className="font-medium text-text-primary">{getTargetsForUser(user).idealWeight} kg</p>
              </div>
              <div>
                <span className="text-text-muted">Workout (min/day)</span>
                <p className="font-medium text-text-primary">{getTargetsForUser(user).dailyWorkoutMinutes}</p>
              </div>
              <div>
                <span className="text-text-muted">Calorie burn goal</span>
                <p className="font-medium text-text-primary">{getTargetsForUser(user).dailyCalorieBurn} kcal</p>
              </div>
              <div>
                <span className="text-text-muted">Sleep target</span>
                <p className="font-medium text-text-primary">{getTargetsForUser(user).sleepHours} h</p>
              </div>
            </div>
          </div>
        )}

        {protein && carbs && fat && (
          <div className="rounded-xl bg-white/[0.03] p-4">
            <p className="mb-2 text-xs font-medium text-text-muted">Macro Split</p>
            <div className="flex h-3 overflow-hidden rounded-full">
              {(() => {
                const total =
                  (parseInt(protein) || 0) * 4 + (parseInt(carbs) || 0) * 4 + (parseInt(fat) || 0) * 9;
                const pPct = total > 0 ? ((parseInt(protein) || 0) * 4 / total) * 100 : 33;
                const cPct = total > 0 ? ((parseInt(carbs) || 0) * 4 / total) * 100 : 33;
                const fPct = total > 0 ? ((parseInt(fat) || 0) * 9 / total) * 100 : 34;
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
                  ((parseInt(protein) || 0) * 4 /
                    ((parseInt(protein) || 0) * 4 + (parseInt(carbs) || 0) * 4 + (parseInt(fat) || 0) * 9)) *
                    100 || 0
                )}
                %
              </span>
              <span className="text-accent-amber">
                Carbs{' '}
                {Math.round(
                  ((parseInt(carbs) || 0) * 4 /
                    ((parseInt(protein) || 0) * 4 + (parseInt(carbs) || 0) * 4 + (parseInt(fat) || 0) * 9)) *
                    100 || 0
                )}
                %
              </span>
              <span className="text-accent-rose">
                Fat{' '}
                {Math.round(
                  ((parseInt(fat) || 0) * 9 /
                    ((parseInt(protein) || 0) * 4 + (parseInt(carbs) || 0) * 4 + (parseInt(fat) || 0) * 9)) *
                    100 || 0
                )}
                %
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-end border-t border-white/[0.06] pt-4">
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
  );
}
